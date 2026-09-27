import asyncio
import importlib.util
import logging
import os
import subprocess
import sys
import time
from contextlib import asynccontextmanager

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pymongo.errors import ConfigurationError, OperationFailure, ServerSelectionTimeoutError

from app.config import BACKEND_ROOT, settings
from app.db import mongo, mongo_host, redact
from app.main import app

SECRET = "Hunter2-n0t-a-real-pw"
USER = "chatnyc_app"
UNREACHABLE_URL = f"mongodb://{USER}:{SECRET}@127.0.0.1:1/chatnyc?authSource=admin"
MALFORMED_URL = f"mongodb://{USER}:{SECRET}@127.0.0.1:notaport/"
# TEST-NET-1 (RFC 5737) is never routed, so the connection times out instead of being refused on every OS.
BLACKHOLE_URL = f"mongodb://{USER}:{SECRET}@192.0.2.1:27017/"


@pytest.fixture(autouse=True)
def _fast_mongo(monkeypatch):
    monkeypatch.setattr(mongo, "SERVER_SELECTION_TIMEOUT_MS", 300)
    monkeypatch.setattr(mongo, "CONNECT_TIMEOUT_MS", 300)
    monkeypatch.setattr(mongo, "PING_TIMEOUT_SECONDS", 0.3)
    monkeypatch.setattr(settings, "mongodb_url", "")


@pytest.fixture
def start_app(monkeypatch):
    async def idle(stop) -> None:
        await stop.wait()

    monkeypatch.setattr("app.main.load", lambda: None)
    monkeypatch.setattr("app.routing.timetable.after_load", lambda: None)
    monkeypatch.setattr("app.main.live_store.poll_loop", idle)

    def start(url: str) -> TestClient:
        monkeypatch.setattr(settings, "mongodb_url", url)
        return TestClient(app)

    return start


def people_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(_app):
        await mongo.connect_mongo()
        yield
        await mongo.close_mongo()

    probe = FastAPI(lifespan=lifespan)

    @probe.get("/people")
    async def people(db=Depends(mongo.get_mongo_db)):
        return {"collections": await db.list_collection_names()}

    return probe


def load_check_script():
    spec = importlib.util.spec_from_file_location("check_mongo", BACKEND_ROOT / "scripts" / "check_mongo.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_unset_url_starts_and_health_says_not_configured(start_app):
    with start_app("") as client:
        health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["mongo"] == "not configured"
    assert "gtfs_loaded" in health.json()


def test_unreachable_mongo_health_says_unreachable_with_200(start_app):
    with start_app(UNREACHABLE_URL) as client:
        health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["mongo"] == "unreachable"


def test_malformed_url_does_not_break_startup(start_app):
    with start_app(MALFORMED_URL) as client:
        health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["mongo"] == "unreachable"


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("", "MongoDB is not configured"),
        (UNREACHABLE_URL, "cannot reach MongoDB"),
        (MALFORMED_URL, "not a valid connection string"),
    ],
)
def test_routes_that_need_mongo_get_503_with_readable_detail(monkeypatch, url, expected):
    monkeypatch.setattr(settings, "mongodb_url", url)
    with TestClient(people_app()) as client:
        response = client.get("/people")
    assert response.status_code == 503
    assert expected in response.json()["detail"]
    assert SECRET not in response.text


def test_connection_string_never_reaches_logs_or_output(start_app, caplog, capfd):
    caplog.set_level(logging.DEBUG)
    bodies = []
    for url in (UNREACHABLE_URL, MALFORMED_URL):
        with start_app(url) as client:
            bodies += [client.get("/health").text, client.get("/health").text]
        with TestClient(people_app()) as client:
            bodies.append(client.get("/people").text)
    out, err = capfd.readouterr()
    assert "MongoDB unreachable (host 127.0.0.1:1, database chatnyc)" in caplog.text
    assert "MONGODB_URL is not a valid MongoDB connection string" in caplog.text
    for output in (caplog.text, out, err, *bodies):
        assert SECRET not in output
        assert USER not in output


def test_driver_does_not_block_the_event_loop(monkeypatch):
    monkeypatch.setattr(mongo, "PING_TIMEOUT_SECONDS", 0.6)
    monkeypatch.setattr(settings, "mongodb_url", UNREACHABLE_URL)

    async def run():
        beats = []

        async def heartbeat() -> None:
            while True:
                beats.append(time.perf_counter())
                await asyncio.sleep(0.01)

        await mongo.connect_mongo()
        task = asyncio.create_task(heartbeat())
        await asyncio.sleep(0)
        try:
            status = await mongo.mongo_status()
            beats.append(time.perf_counter())
        finally:
            task.cancel()
            await mongo.close_mongo()
        return status, beats

    status, beats = asyncio.run(run())
    assert status == "unreachable"
    assert beats[-1] - beats[0] >= 0.5
    assert max(b - a for a, b in zip(beats, beats[1:])) < 0.25


@pytest.mark.parametrize(
    ("url", "host"),
    [
        (f"mongodb+srv://{USER}:{SECRET}@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority", "cluster0.ab1cd.mongodb.net"),
        (f"mongodb://{USER}:{SECRET}@h1:27017,h2:27018/chatnyc?replicaSet=rs0", "h1:27017,h2:27018"),
        ("mongodb://localhost:27017", "localhost:27017"),
        (f"mongodb://{USER}:p@ss/{SECRET}@db.example.com/", "db.example.com"),
        (f"mongodb://{USER}:{SECRET}", "(unparseable host)"),
        (f"mongodb://{USER}:{SECRET}@", "(unparseable host)"),
        (f"https://{USER}:{SECRET}@example.com", "(unrecognized URL)"),
    ],
)
def test_mongo_host_never_includes_credentials(url, host):
    assert mongo_host(url) == host


def test_redact_removes_url_and_credentials():
    url = f"mongodb+srv://{USER}:{SECRET}%40x@cluster0.ab1cd.mongodb.net/?appName=a@b"
    text = f"failed for {url}; user {USER}:{SECRET}@x; password {SECRET}%40x"
    cleaned = redact(text, url)
    assert SECRET not in cleaned
    assert USER not in cleaned
    assert redact("No servers found yet", url) == "No servers found yet"
    ambiguous = f"mongodb://{USER}:p@ss:{SECRET}@db.example.com/"
    message = "Username and password must be escaped according to RFC 3986"
    assert redact(message, ambiguous) == message


def test_check_script_reports_not_configured():
    result = subprocess.run(
        [sys.executable, "scripts/check_mongo.py"],
        cwd=BACKEND_ROOT,
        env={**os.environ, "MONGODB_URL": ""},
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 2
    assert "MongoDB is not configured" in result.stderr


@pytest.mark.parametrize(
    ("url", "code", "host"),
    [(BLACKHOLE_URL, 6, "192.0.2.1:27017"), (MALFORMED_URL, 3, "(unparseable host)")],
)
def test_check_script_diagnoses_failures_without_leaking(capsys, url, code, host):
    check_mongo = load_check_script()
    assert asyncio.run(check_mongo.check(url, "chatnyc", timeout_ms=500)) == code
    out, err = capsys.readouterr()
    assert f"host:     {host}" in err
    assert SECRET not in out + err
    assert USER not in out + err


@pytest.mark.parametrize(
    ("exc", "code", "phrase"),
    [
        (OperationFailure("bad auth : authentication failed", code=8000), 5, "username or password"),
        (OperationFailure("Authentication failed.", code=18), 5, "username or password"),
        (OperationFailure("not authorized on chatnyc to execute command", code=13), 5, "readWrite"),
        (ConfigurationError("The DNS query name does not exist: _mongodb._tcp.cluster0.nope.mongodb.net."), 4, "does not exist"),
        (ServerSelectionTimeoutError("db.nope.net:27017: [Errno 11001] getaddrinfo failed"), 4, "does not exist"),
        (ServerSelectionTimeoutError("localhost:27017: [Errno 111] Connection refused"), 4, "refused the connection"),
        (ConfigurationError("The resolution lifetime expired after 10.0 seconds"), 6, "DNS is not answering"),
        (ServerSelectionTimeoutError("SSL handshake failed: [SSL: CERTIFICATE_VERIFY_FAILED]"), 6, "TLS certificate"),
        (ServerSelectionTimeoutError("connection closed, Timeout: 10.0s"), 6, "Network Access"),
    ],
)
def test_check_script_distinguishes_failure_kinds(exc, code, phrase):
    check_mongo = load_check_script()
    result, message = check_mongo.diagnose(exc, "cluster0.nope.mongodb.net", "chatnyc", 10_000)
    assert result == code
    assert phrase in message
