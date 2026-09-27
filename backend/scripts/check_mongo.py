"""Check the MongoDB connection configured in backend/.env.

Run from backend/:

    python scripts/check_mongo.py

Pings the server and prints its version, the host, the database name, and the
collections that already exist. Never prints the connection string or the
credentials in it.

Exit codes: 0 ok, 1 unexpected error, 2 not configured, 3 malformed setting,
4 wrong host, 5 bad credentials or permissions, 6 network or IP allowlist.
"""

import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pymongo import AsyncMongoClient  # noqa: E402
from pymongo.errors import ConfigurationError, ConnectionFailure, InvalidName, OperationFailure  # noqa: E402

from app.config import settings  # noqa: E402
from app.db.mongo import mongo_host, redact  # noqa: E402

TIMEOUT_MS = 10_000

OK, UNEXPECTED, NOT_CONFIGURED, MALFORMED, WRONG_HOST, BAD_CREDENTIALS, NETWORK = range(7)

_DNS_MISSING = (
    "getaddrinfo failed",
    "name or service not known",
    "nodename nor servname",
    "no address associated",
    "dns query name does not exist",
    "nxdomain",
)
_DNS_UNAVAILABLE = (
    "temporary failure in name resolution",
    "dns operation timed out",
    "resolution lifetime expired",
    "all nameservers failed",
)
_TLS = ("certificate_verify_failed", "certificate verify failed")

NOT_CONFIGURED_MESSAGE = """\
MongoDB is not configured: MONGODB_URL is empty.

That is fine for guests and local development. The backend runs without it;
only account features (profiles, preferences) stay off.

To enable it, set MONGODB_URL in backend/.env (see backend/.env.example), e.g.
  MONGODB_URL=mongodb+srv://<user>:<password>@<cluster-host>/?retryWrites=true&w=majority
then run this script again."""

MALFORMED_URL_MESSAGE = (
    "MONGODB_URL is not a valid MongoDB connection string. It must start with mongodb:// "
    "or mongodb+srv://, and special characters in the username or password must be "
    "percent-encoded (for example @ becomes %40, : becomes %3A, / becomes %2F)."
)


def diagnose(exc: Exception, host: str, db_name: str, timeout_ms: int) -> tuple[int, str]:
    text = str(exc).lower()
    if isinstance(exc, InvalidName):
        return MALFORMED, f"MONGODB_DB_NAME '{db_name}' is not a valid database name. Use letters, digits, '-' or '_'."
    if isinstance(exc, OperationFailure):
        if exc.code == 13 or "not authorized" in text:
            return BAD_CREDENTIALS, (
                f"Logged in, but this database user is not allowed to read database '{db_name}'. "
                "Give the user the readWrite role on it (Atlas: Security > Database Access > Edit)."
            )
        if exc.code in (18, 8000) or "auth" in text:
            return BAD_CREDENTIALS, (
                "Authentication failed: the username or password in MONGODB_URL is wrong. Use a database "
                "user from Atlas (Security > Database Access), not your Atlas login, and percent-encode "
                "special characters in the password."
            )
        return UNEXPECTED, "MongoDB rejected the check command."
    if any(marker in text for marker in _TLS):
        return NETWORK, (
            "Reached the server, but Python could not verify its TLS certificate. On macOS, run "
            "'Install Certificates.command' from your Python install folder. Otherwise check for a "
            "network proxy that intercepts TLS."
        )
    if any(marker in text for marker in _DNS_UNAVAILABLE):
        return NETWORK, f"Could not look up '{host}': DNS is not answering. Check your internet connection or VPN, then retry."
    if any(marker in text for marker in _DNS_MISSING):
        return WRONG_HOST, (
            f"Host '{host}' does not exist. Copy the connection string again from Atlas "
            "(Connect > Drivers) and check the cluster name."
        )
    if "refused" in text:
        return WRONG_HOST, (
            f"'{host}' refused the connection: nothing is accepting MongoDB connections there. "
            "Check the host and port in MONGODB_URL, or start your local mongod."
        )
    if isinstance(exc, ConfigurationError):
        return MALFORMED, "MONGODB_URL has an invalid host or option. See the detail below."
    if isinstance(exc, ConnectionFailure):
        return NETWORK, (
            f"Could not reach MongoDB at '{host}' within {timeout_ms // 1000}s. Usual causes:\n"
            "  - this machine's IP address is not on the Atlas allowlist "
            "(Security > Network Access > Add Current IP Address)\n"
            "  - a VPN, firewall, or campus/guest Wi-Fi blocking outbound port 27017\n"
            "  - the cluster is paused or still starting"
        )
    return UNEXPECTED, "Unexpected error while checking MongoDB."


def _detail(exc: Exception, url: str) -> str:
    text = re.split(r", (?:Timeout:|full error:)", redact(str(exc), url), maxsplit=1)[0].strip()
    if len(text) > 240:
        text = text[:237] + "..."
    return f"{type(exc).__name__}: {text}" if text else type(exc).__name__


def _fail(code: int, message: str, host: str, db_name: str, exc: Exception, url: str) -> int:
    print(f"\nFAILED: {message}\n", file=sys.stderr)
    print(f"  host:     {host}", file=sys.stderr)
    print(f"  database: {db_name}", file=sys.stderr)
    print(f"  detail:   {_detail(exc, url)}", file=sys.stderr)
    return code


async def check(url: str, db_name: str, timeout_ms: int = TIMEOUT_MS) -> int:
    host = mongo_host(url)
    print(f"Checking MongoDB at host {host}, database {db_name} ...", flush=True)
    try:
        client = AsyncMongoClient(url, serverSelectionTimeoutMS=timeout_ms, connectTimeoutMS=timeout_ms)
    except Exception as exc:
        return _fail(MALFORMED, MALFORMED_URL_MESSAGE, host, db_name, exc, url)
    try:
        info = await client.server_info()
        names = sorted(await client[db_name].list_collection_names())
    except Exception as exc:
        code, message = diagnose(exc, host, db_name, timeout_ms)
        return _fail(code, message, host, db_name, exc, url)
    finally:
        await client.close()
    print("\nMongoDB OK")
    print(f"  host:        {host}")
    print(f"  database:    {db_name}")
    print(f"  server:      MongoDB {info.get('version', 'unknown')}")
    print(f"  collections: {', '.join(names) if names else '(none yet)'}")
    return OK


def main() -> int:
    url = settings.mongodb_url.strip()
    if not url:
        print(NOT_CONFIGURED_MESSAGE, file=sys.stderr)
        return NOT_CONFIGURED
    try:
        return asyncio.run(check(url, settings.mongodb_db_name))
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
