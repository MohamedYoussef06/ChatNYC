"""In-memory spending state for the hackathon's simulated RLUSD experience.

This module never submits transactions to XRPL. Ledger-backed wallet operations
remain in :mod:`app.services.xrpl` and are deliberately kept separate.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from threading import Lock
from typing import Any
from uuid import uuid4

from app.config import settings

_CENTS = Decimal("0.01")
_lock = Lock()
_balance: Decimal | None = None
_activity: list[dict[str, Any]] = []
_idempotency_results: dict[str, dict[str, Any]] = {}


class DemoWalletError(Exception):
    """A simulated wallet operation cannot be completed."""


def _money(value: Decimal) -> str:
    return format(value.quantize(_CENTS, rounding=ROUND_HALF_UP), "f")


def _initial_balance() -> Decimal:
    try:
        value = Decimal(settings.demo_wallet_initial_balance)
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise DemoWalletError("Demo wallet balance is not configured correctly.") from exc
    if not value.is_finite() or value < 0:
        raise DemoWalletError("Demo wallet balance is not configured correctly.")
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


def _current_balance() -> Decimal:
    global _balance
    if _balance is None:
        _balance = _initial_balance()
    return _balance


def state(*, activity_limit: int = 25) -> dict[str, Any]:
    with _lock:
        return {
            "balance": _money(_current_balance()),
            "currency": "RLUSD",
            "label": "Demo RLUSD",
            "activity": [dict(item) for item in _activity[:activity_limit]],
        }


def _debit(*, amount: Decimal, kind: str, counterparty: str, description: str, idempotency_key: str | None) -> dict[str, Any]:
    global _balance
    with _lock:
        if idempotency_key and idempotency_key in _idempotency_results:
            return dict(_idempotency_results[idempotency_key])
        balance = _current_balance()
        if amount > balance:
            raise DemoWalletError("Insufficient Demo RLUSD balance.")
        _balance = balance - amount
        activity = {
            "id": f"demo_{uuid4().hex}",
            "kind": kind,
            "mode": "demo",
            "simulated": True,
            "asset": "RLUSD",
            "amount": _money(amount),
            "direction": "sent",
            "counterparty": counterparty,
            "description": description,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "transaction_hash": None,
            "ledger_index": None,
        }
        _activity.insert(0, activity)
        result = {
            "status": "simulated",
            "mode": "demo",
            "simulated": True,
            "asset": "RLUSD",
            "amount": _money(amount),
            "balance": _money(_balance),
            "activity": dict(activity),
            "transaction_hash": None,
            "ledger_index": None,
        }
        if idempotency_key:
            _idempotency_results[idempotency_key] = dict(result)
        return result


def send(*, amount: Decimal, recipient: str, note: str | None, idempotency_key: str | None) -> dict[str, Any]:
    description = note.strip() if note and note.strip() else "Demo payment"
    return _debit(
        amount=amount,
        kind="send",
        counterparty=recipient.strip(),
        description=description,
        idempotency_key=idempotency_key,
    )


def split(*, total: Decimal, participant_count: int, expense: str, idempotency_key: str | None) -> dict[str, Any]:
    share = (total / participant_count).quantize(_CENTS, rounding=ROUND_HALF_UP)
    if share <= 0:
        raise DemoWalletError("Each person's Demo RLUSD share must be at least 0.01.")
    result = _debit(
        amount=share,
        kind="split",
        counterparty=expense.strip(),
        description=f"Your share of {expense.strip()}",
        idempotency_key=idempotency_key,
    )
    return {**result, "total": _money(total), "participant_count": participant_count, "each": _money(share)}


def reset_for_tests() -> None:
    """Reset process-local state. Intended only for isolated automated tests."""
    global _balance
    with _lock:
        _balance = None
        _activity.clear()
        _idempotency_results.clear()
