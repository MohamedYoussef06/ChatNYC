from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.schemas.wallet import (
    WalletFxEstimate,
    WalletSendRequest,
    WalletSendResult,
    WalletSummary,
    WalletSwapQuote,
    WalletSwapQuoteRequest,
    WalletTransactions,
)
from app.services import xrpl

router = APIRouter()
FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD"
FX_CURRENCIES = ("USD", "EUR", "GBP", "CAD", "MXN", "PEN", "JPY")
FX_ATTRIBUTION_URL = "https://www.exchangerate-api.com"


@router.get("/wallet", response_model=WalletSummary)
def get_wallet() -> dict:
    try:
        return xrpl.wallet_summary()
    except xrpl.XRPLConfigurationError:
        raise HTTPException(503, "ChatNYC Wallet is configured for XRPL Testnet only.") from None
    except xrpl.XRPLProviderError:
        raise HTTPException(503, "XRPL Testnet is temporarily unavailable. Balances could not be loaded.") from None


@router.get("/wallet/transactions", response_model=WalletTransactions)
def get_wallet_transactions(limit: int = Query(default=25, ge=1, le=50)) -> dict:
    try:
        return xrpl.transaction_history(limit)
    except xrpl.XRPLConfigurationError:
        raise HTTPException(503, "ChatNYC Wallet is configured for XRPL Testnet only.") from None
    except xrpl.XRPLProviderError:
        raise HTTPException(503, "XRPL Testnet transaction history is temporarily unavailable.") from None


@router.post("/wallet/send", response_model=WalletSendResult)
def send_wallet_payment(body: WalletSendRequest) -> dict:
    try:
        return xrpl.send_payment(body)
    except xrpl.WalletRequestError as exc:
        raise HTTPException(422, str(exc)) from None
    except xrpl.XRPLConfigurationError:
        raise HTTPException(503, "ChatNYC Wallet is not configured for XRPL Testnet payments.") from None
    except xrpl.XRPLProviderError as exc:
        raise HTTPException(503, str(exc)) from None


@router.get("/wallet/fx", response_model=WalletFxEstimate)
async def estimate_wallet_fiat_value(
    amount: str = Query(min_length=1, max_length=80),
) -> dict:
    try:
        value = Decimal(amount)
    except InvalidOperation:
        raise HTTPException(422, "Amount must be a decimal number.") from None
    if not value.is_finite() or value < 0:
        raise HTTPException(422, "Amount must be zero or greater.")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(FX_ENDPOINT)
            response.raise_for_status()
            payload = response.json()
        if payload.get("result") != "success" or not isinstance(payload.get("rates"), dict):
            raise ValueError("Invalid exchange-rate response")
        rates = payload["rates"]
        values: dict[str, str] = {"USD": format(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP), "f")}
        for currency in FX_CURRENCIES[1:]:
            rate = Decimal(str(rates[currency]))
            converted = (value * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            values[currency] = format(converted, "f")
        return {
            "available": True,
            "asset": "RLUSD",
            "amount": format(value, "f"),
            "base_currency": "USD",
            "values": values,
            "rate_date": payload.get("time_last_update_utc"),
            "source": "ExchangeRate-API",
            "message": None,
        }
    except (httpx.HTTPError, KeyError, TypeError, ValueError, InvalidOperation):
        return {
            "available": False,
            "asset": "RLUSD",
            "amount": format(value, "f"),
            "base_currency": "USD",
            "values": {},
            "rate_date": None,
            "source": "ExchangeRate-API",
            "message": "Exchange rates are temporarily unavailable.",
        }


@router.post("/wallet/swap/quote", response_model=WalletSwapQuote)
def quote_wallet_swap(body: WalletSwapQuoteRequest) -> dict:
    try:
        return xrpl.quote_swap(body.from_asset, body.to_asset, body.amount)
    except (xrpl.XRPLConfigurationError, xrpl.XRPLProviderError):
        return {
            "available": False,
            "from": body.from_asset,
            "to": body.to_asset,
            "input_amount": body.amount,
            "estimated_output": None,
            "source": None,
            "network": "testnet",
            "ledger_index": None,
            "reason": "No reliable XRPL Testnet quote is currently available.",
        }
