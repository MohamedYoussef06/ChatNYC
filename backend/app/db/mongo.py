"""MongoDB connection for people data.

This project has two databases, split by what they describe:

- Tiger Cloud (Postgres, ``app.db.database``) stores city data: trips,
  meetings, places.
- MongoDB (this module) stores people data: profiles, preferences,
  conversations.

THE RULE: each database stores only opaque ID strings that refer to the
other. A Postgres row may carry a ``user_id`` string. A Mongo document may
carry trip or place ID strings. Neither may store a copy of the other's data:
no user names or emails in Postgres, no place or trip details in Mongo.
Combine the two in application code, by ID.

Mongo is optional. Guests use the app without accounts and most developers
won't have a connection string, so nothing here connects at import time and
nothing here raises during startup. Routes that need Mongo depend on
``get_mongo_db``, which turns "not configured" and "unreachable" into HTTP 503.

The connection string contains the database password. Never log, print, or
put it in an exception message. Identify the server with ``mongo_host`` (host
names only) and the database name instead.
"""

import asyncio
import logging
import re
from collections.abc import AsyncIterator
from contextlib import suppress
from urllib.parse import unquote_plus

import pymongo
from fastapi import HTTPException
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import ConfigurationError, ConnectionFailure, InvalidName, OperationFailure

from app.config import settings

logger = logging.getLogger(__name__)

CONNECTED = "connected"
NOT_CONFIGURED = "not configured"
UNREACHABLE = "unreachable"

SERVER_SELECTION_TIMEOUT_MS = 5000
CONNECT_TIMEOUT_MS = 5000
PING_TIMEOUT_SECONDS = 2.0

# AuthenticationFailed, Unauthorized, and Atlas's generic code for "bad auth" / missing privileges.
_ACCESS_ERROR_CODES = {13, 18, 8000}

_HOST = re.compile(r"(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9._-]+)(:\d{1,5})?")

_client: AsyncMongoClient | None = None
_probe: asyncio.Task | None = None
_last_status: str | None = None


def mongo_configured() -> bool:
    return bool(settings.mongodb_url.strip())


def mongo_host(url: str) -> str:
    """The host list of a MongoDB URL, without credentials, path, or options."""
    scheme, sep, rest = url.strip().partition("://")
    if not sep or scheme not in ("mongodb", "mongodb+srv"):
        return "(unrecognized URL)"
    hosts = re.split(r"[/?]", rest.rpartition("@")[2], maxsplit=1)[0]
    if not hosts or not all(_HOST.fullmatch(host) for host in hosts.split(",")):
        return "(unparseable host)"
    return hosts


def redact(text: str, url: str) -> str:
    """Remove a MongoDB URL and anything that could be its credentials from text."""
    secrets = {url, url.strip()}
    rest = url.partition("://")[2]
    if "@" in rest:
        # Unescaped '@' in a password or query makes the userinfo boundary ambiguous; redact both readings.
        for userinfo in (rest.partition("@")[0], rest.rpartition("@")[0]):
            password = userinfo.partition(":")[2]
            secrets |= {userinfo, unquote_plus(userinfo), password, unquote_plus(password)}
    for secret in sorted(filter(None, secrets), key=len, reverse=True):
        text = re.sub(rf"(?<![A-Za-z0-9]){re.escape(secret)}(?![A-Za-z0-9])", "***", text)
    return text


def _target() -> str:
    return f"host {mongo_host(settings.mongodb_url)}, database {settings.mongodb_db_name}"


def _record(status: str, exc: BaseException | None = None) -> None:
    global _last_status
    if status == _last_status:
        return
    _last_status = status
    if status == CONNECTED:
        logger.info("MongoDB connected (%s)", _target())
    else:
        logger.warning(
            "MongoDB unreachable (%s): %s. Account features return 503 until it recovers; "
            "run scripts/check_mongo.py for a diagnosis.",
            _target(),
            type(exc).__name__ if exc is not None else "no client",
        )


async def connect_mongo() -> None:
    """Create the client on startup. Never raises; the driver connects on first use."""
    global _client, _probe
    if not mongo_configured():
        logger.info("MongoDB not configured (MONGODB_URL is empty); account features are disabled")
        return
    try:
        _client = AsyncMongoClient(
            settings.mongodb_url.strip(),
            serverSelectionTimeoutMS=SERVER_SELECTION_TIMEOUT_MS,
            connectTimeoutMS=CONNECT_TIMEOUT_MS,
        )
    except Exception as exc:
        logger.warning(
            "MONGODB_URL is not a valid MongoDB connection string (%s); account features are disabled. "
            "Run scripts/check_mongo.py for a diagnosis.",
            type(exc).__name__,
        )
        return
    _probe = asyncio.create_task(mongo_status())


async def close_mongo() -> None:
    global _client, _probe, _last_status
    if _probe is not None:
        _probe.cancel()
        with suppress(asyncio.CancelledError):
            await _probe
    if _client is not None:
        await _client.close()
    _client, _probe, _last_status = None, None, None


async def mongo_status() -> str:
    """One of CONNECTED, NOT_CONFIGURED, UNREACHABLE. Never raises."""
    if not mongo_configured():
        return NOT_CONFIGURED
    if _client is None:
        _record(UNREACHABLE)
        return UNREACHABLE
    try:
        with pymongo.timeout(PING_TIMEOUT_SECONDS):
            await _client.admin.command("ping")
    except Exception as exc:
        _record(UNREACHABLE, exc)
        return UNREACHABLE
    _record(CONNECTED)
    return CONNECTED


async def get_mongo_db() -> AsyncIterator[AsyncDatabase]:
    """FastAPI dependency for routes that need people data."""
    if not mongo_configured():
        raise HTTPException(
            503,
            "Accounts are not available on this server: MongoDB is not configured. "
            "Add MONGODB_URL to backend/.env and restart the backend.",
        )
    if _client is None:
        raise HTTPException(
            503,
            "Accounts are not available on this server: MONGODB_URL is not a valid connection string. "
            "Run scripts/check_mongo.py in backend/ for details.",
        )
    try:
        db = _client[settings.mongodb_db_name]
    except InvalidName:
        raise HTTPException(
            503,
            "Accounts are not available on this server: MONGODB_DB_NAME is not a valid database name.",
        ) from None
    try:
        yield db
    except (ConnectionFailure, ConfigurationError) as exc:
        _record(UNREACHABLE, exc)
        raise HTTPException(503, "Accounts are temporarily unavailable: cannot reach MongoDB. Try again shortly.") from None
    except OperationFailure as exc:
        if exc.code not in _ACCESS_ERROR_CODES:
            raise
        _record(UNREACHABLE, exc)
        raise HTTPException(
            503,
            "Accounts are temporarily unavailable: MongoDB rejected the server's credentials. "
            "Run scripts/check_mongo.py in backend/ for details.",
        ) from None
