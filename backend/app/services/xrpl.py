"""Server-side XRPL Testnet adapter for the single configured demo wallet."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation, ROUND_DOWN
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlparse

from app.config import settings

RLUSD_CURRENCY = "524C555344000000000000000000000000000000"
RIPPLE_EPOCH = datetime(2000, 1, 1, tzinfo=timezone.utc)


class XRPLConfigurationError(Exception):
    """XRPL is missing required safe Testnet configuration."""


class XRPLProviderError(Exception):
    """The XRPL provider could not safely answer the request."""


class WalletRequestError(Exception):
    """A wallet operation is invalid for the configured ledger state."""


def _load_sdk() -> SimpleNamespace:
    try:
        from xrpl.clients import JsonRpcClient
        from xrpl.core.addresscodec import is_valid_classic_address
        from xrpl.models.currencies import IssuedCurrency, XRP
        from xrpl.models.requests import AMMInfo, AccountInfo, AccountLines, AccountTx, BookOffers
        from xrpl.models.transactions import Payment
        from xrpl.transaction import submit_and_wait
        from xrpl.wallet import Wallet
    except ImportError as exc:
        raise XRPLProviderError("XRPL support is unavailable on this server.") from exc
    return SimpleNamespace(
        JsonRpcClient=JsonRpcClient,
        Wallet=Wallet,
        AccountInfo=AccountInfo,
        AccountLines=AccountLines,
        AccountTx=AccountTx,
        BookOffers=BookOffers,
        AMMInfo=AMMInfo,
        Payment=Payment,
        submit_and_wait=submit_and_wait,
        is_valid_classic_address=is_valid_classic_address,
        IssuedCurrency=IssuedCurrency,
        XRP=XRP,
    )


def _ensure_testnet() -> None:
    if settings.xrpl_network.strip().lower() != "testnet":
        raise XRPLConfigurationError("XRPL is configured for a non-Testnet network.")
    parsed = urlparse(settings.xrpl_rpc_url)
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or hostname != "s.altnet.rippletest.net":
        raise XRPLConfigurationError("XRPL RPC must use an HTTPS Testnet endpoint.")


def _client(sdk: SimpleNamespace | None = None) -> Any:
    _ensure_testnet()
    sdk = sdk or _load_sdk()
    try:
        return sdk.JsonRpcClient(settings.xrpl_rpc_url)
    except Exception as exc:
        raise XRPLProviderError("XRPL Testnet is temporarily unavailable.") from exc


def _configured_wallet(sdk: SimpleNamespace) -> Any:
    seed = settings.xrpl_wallet_seed.strip()
    if not seed:
        raise XRPLConfigurationError("The demo XRPL wallet is not configured.")
    try:
        return sdk.Wallet.from_seed(seed)
    except Exception as exc:
        raise XRPLConfigurationError("The configured XRPL wallet seed is invalid.") from exc


def _result(response: Any) -> dict[str, Any]:
    if hasattr(response, "is_successful") and not response.is_successful():
        raise XRPLProviderError("XRPL Testnet could not complete the request.")
    result = getattr(response, "result", response)
    if not isinstance(result, dict):
        raise XRPLProviderError("XRPL Testnet returned an invalid response.")
    if result.get("status") == "error" or result.get("error"):
        raise XRPLProviderError("XRPL Testnet could not complete the request.")
    return result


def _request(client: Any, request: Any) -> dict[str, Any]:
    try:
        return _result(client.request(request))
    except (XRPLConfigurationError, XRPLProviderError):
        raise
    except Exception as exc:
        raise XRPLProviderError("XRPL Testnet is temporarily unavailable.") from exc


def _close(client: Any) -> None:
    close = getattr(client, "close", None)
    if callable(close):
        try:
            close()
        except Exception:
            pass


def _decimal(value: Any) -> Decimal | None:
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return number if number.is_finite() else None


def decimal_text(value: Decimal, *, places: int | None = None) -> str:
    if places is not None:
        quantum = Decimal(1).scaleb(-places)
        value = value.quantize(quantum, rounding=ROUND_DOWN)
    text = format(value, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def _is_rlusd_currency(currency: Any) -> bool:
    value = str(currency or "").strip()
    return value.upper() == "RLUSD" or value.upper() == RLUSD_CURRENCY


def _valid_issuer(sdk: SimpleNamespace) -> str | None:
    issuer = settings.xrpl_rlusd_issuer.strip()
    if not issuer:
        return None
    try:
        return issuer if sdk.is_valid_classic_address(issuer) else None
    except Exception:
        return None


def _account_address(wallet: Any) -> str:
    address = getattr(wallet, "classic_address", None) or getattr(wallet, "address", None)
    if not isinstance(address, str) or not address:
        raise XRPLConfigurationError("The configured XRPL wallet has no classic address.")
    return address


def _account_info(client: Any, sdk: SimpleNamespace, address: str) -> dict[str, Any] | None:
    try:
        response = client.request(sdk.AccountInfo(account=address, ledger_index="validated"))
        raw = getattr(response, "result", response)
        if isinstance(raw, dict) and raw.get("error") == "actNotFound":
            return None
        return _result(response)
    except XRPLProviderError:
        raise
    except Exception as exc:
        raise XRPLProviderError("XRPL Testnet is temporarily unavailable.") from exc


def _read_lines(client: Any, sdk: SimpleNamespace, address: str, issuer: str) -> list[dict[str, Any]]:
    result = _request(client, sdk.AccountLines(account=address, peer=issuer, ledger_index="validated", limit=400))
    rows = result.get("lines", [])
    return [row for row in rows if isinstance(row, dict)] if isinstance(rows, list) else []


def _rlusd_line(lines: list[dict[str, Any]], issuer: str) -> dict[str, Any] | None:
    for line in lines:
        if line.get("account") == issuer and _is_rlusd_currency(line.get("currency")):
            return line
    return None


def wallet_summary() -> dict[str, Any]:
    _ensure_testnet()
    seed = settings.xrpl_wallet_seed.strip()
    if not seed:
        return {
            "network": "testnet", "available": False, "configured": False, "address": None,
            "balances": {"XRP": None, "RLUSD": None}, "rlusd_configured": bool(settings.xrpl_rlusd_issuer.strip()),
            "trustline_active": False, "account_active": None,
            "message": "Configure the server-side Testnet wallet to load ledger balances.",
        }
    sdk = _load_sdk()
    issuer = _valid_issuer(sdk)
    wallet = _configured_wallet(sdk)
    address = _account_address(wallet)
    client = _client(sdk)
    try:
        info = _account_info(client, sdk, address)
        if info is None:
            return {
                "network": "testnet", "available": True, "configured": True, "address": address,
                "balances": {"XRP": None, "RLUSD": None}, "rlusd_configured": bool(issuer),
                "trustline_active": False, "account_active": False,
                "message": "This Testnet account is not active yet. Fund it with Testnet XRP first.",
            }
        account_data = info.get("account_data") if isinstance(info.get("account_data"), dict) else info
        drops = _decimal(account_data.get("Balance"))
        if drops is None or drops < 0:
            raise XRPLProviderError("XRPL Testnet returned an invalid XRP balance.")
        xrp_balance = decimal_text(drops / Decimal(1_000_000), places=6)
        rlusd_balance: str | None = None
        trustline_active = False
        if issuer:
            lines = _read_lines(client, sdk, address, issuer)
            line = _rlusd_line(lines, issuer)
            trustline_active = line is not None
            rlusd_balance = decimal_text(_decimal(line.get("balance")) or Decimal(0)) if line else "0"
        return {
            "network": "testnet", "available": True, "configured": True, "address": address,
            "balances": {"XRP": xrp_balance, "RLUSD": rlusd_balance},
            "rlusd_configured": bool(issuer), "trustline_active": trustline_active,
            "account_active": True, "message": None,
        }
    finally:
        _close(client)


def _classic_address(sdk: SimpleNamespace, value: str) -> bool:
    try:
        return bool(sdk.is_valid_classic_address(value))
    except Exception:
        return False


def _issued_amount(value: Decimal, issuer: str) -> dict[str, str]:
    return {"currency": RLUSD_CURRENCY, "issuer": issuer, "value": decimal_text(value)}


def send_payment(request: Any) -> dict[str, Any]:
    _ensure_testnet()
    sdk = _load_sdk()
    wallet = _configured_wallet(sdk)
    source = _account_address(wallet)
    if not _classic_address(sdk, request.destination):
        raise WalletRequestError("Enter a valid XRPL classic address.")
    amount = _decimal(request.amount)
    if amount is None or amount <= 0 or len(amount.as_tuple().digits) > 16:
        raise WalletRequestError("Enter a valid positive amount.")

    issuer = _valid_issuer(sdk)
    if request.asset == "RLUSD" and not issuer:
        raise WalletRequestError("RLUSD Testnet issuer is not configured.")

    client = _client(sdk)
    try:
        info = _account_info(client, sdk, source)
        if info is None:
            raise WalletRequestError("The configured Testnet account is not active.")
        account_data = info.get("account_data") if isinstance(info.get("account_data"), dict) else info

        if request.asset == "RLUSD":
            lines = _read_lines(client, sdk, source, issuer)
            line = _rlusd_line(lines, issuer)
            if line is None:
                raise WalletRequestError("The demo wallet needs the RLUSD Testnet trustline before sending RLUSD.")
            balance = _decimal(line.get("balance")) or Decimal(0)
            if balance < amount:
                raise WalletRequestError("The demo wallet does not have enough RLUSD for this payment.")
            payment_amount: str | dict[str, str] = _issued_amount(amount, issuer)
        else:
            drops = amount * Decimal(1_000_000)
            if drops != drops.to_integral_value():
                raise WalletRequestError("XRP amounts support at most six decimal places.")
            available_drops = _decimal(account_data.get("Balance")) or Decimal(0)
            if available_drops < drops:
                raise WalletRequestError("The demo wallet does not have enough XRP for this payment.")
            payment_amount = str(int(drops))

        tx_fields: dict[str, Any] = {
            "account": source,
            "destination": request.destination,
            "amount": payment_amount,
        }
        if request.destination_tag is not None:
            tx_fields["destination_tag"] = request.destination_tag
        payment = sdk.Payment(**tx_fields)
        try:
            response = sdk.submit_and_wait(payment, client, wallet)
        except Exception as exc:
            result = getattr(getattr(exc, "response", None), "result", {})
            if isinstance(result, dict) and result.get("validated") is True:
                meta = result.get("meta") or result.get("metaData") or {}
                if isinstance(meta, dict) and meta.get("TransactionResult") != "tesSUCCESS":
                    raise WalletRequestError("XRPL Testnet rejected this payment in a validated ledger.") from None
            raise XRPLProviderError("XRPL Testnet could not confirm the payment. Check transaction history before retrying.") from None

        result = _result(response)
        meta = result.get("meta") or result.get("metaData") or {}
        validated = result.get("validated") is True
        tx_result = meta.get("TransactionResult") if isinstance(meta, dict) else None
        if validated and tx_result != "tesSUCCESS":
            raise WalletRequestError("XRPL Testnet rejected this payment in a validated ledger.")
        return {
            "status": "confirmed" if validated and tx_result == "tesSUCCESS" else "pending",
            "asset": request.asset,
            "amount": decimal_text(amount),
            "destination": request.destination,
            "transaction_hash": result.get("hash"),
            "ledger_index": result.get("ledger_index"),
        }
    finally:
        _close(client)


def _normalise_payment_amount(value: Any, issuer: str | None) -> tuple[str, str] | None:
    if isinstance(value, str):
        drops = _decimal(value)
        if drops is None or drops < 0:
            return None
        return "XRP", decimal_text(drops / Decimal(1_000_000), places=6)
    if not isinstance(value, dict) or not issuer:
        return None
    if value.get("issuer") != issuer or not _is_rlusd_currency(value.get("currency")):
        return None
    amount = _decimal(value.get("value"))
    if amount is None or amount < 0:
        return None
    return "RLUSD", decimal_text(amount)


def transaction_history(limit: int = 25) -> dict[str, Any]:
    _ensure_testnet()
    if not settings.xrpl_wallet_seed.strip():
        return {"available": False, "transactions": [], "message": "Configure the server-side Testnet wallet to load transaction history."}
    sdk = _load_sdk()
    wallet = _configured_wallet(sdk)
    address = _account_address(wallet)
    issuer = _valid_issuer(sdk)
    client = _client(sdk)
    try:
        response = _request(client, sdk.AccountTx(account=address, ledger_index_min=-1, ledger_index_max=-1, limit=max(1, min(limit, 50)), forward=False))
        rows = response.get("transactions", [])
        transactions: list[dict[str, Any]] = []
        if not isinstance(rows, list):
            rows = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            tx = row.get("tx_json") or row.get("tx")
            if not isinstance(tx, dict) or tx.get("TransactionType") != "Payment":
                continue
            source, destination = tx.get("Account"), tx.get("Destination")
            if source == address:
                direction, counterparty = "sent", destination
            elif destination == address:
                direction, counterparty = "received", source
            else:
                continue
            if not isinstance(counterparty, str):
                continue
            meta = row.get("meta") or row.get("metaData") or {}
            delivered = meta.get("delivered_amount") if isinstance(meta, dict) else None
            if delivered == "unavailable":
                delivered = None
            raw_amount = delivered if delivered is not None else tx.get("Amount") or tx.get("DeliverMax")
            asset_amount = _normalise_payment_amount(raw_amount, issuer)
            if asset_amount is None:
                continue
            asset, amount = asset_amount
            tx_hash = row.get("hash") or tx.get("hash")
            if not isinstance(tx_hash, str) or not tx_hash:
                continue
            timestamp = None
            if isinstance(tx.get("date"), int):
                timestamp = (RIPPLE_EPOCH + timedelta(seconds=tx["date"])).isoformat().replace("+00:00", "Z")
            transactions.append({
                "id": tx_hash, "hash": tx_hash, "type": "payment", "direction": direction,
                "asset": asset, "amount": amount, "counterparty": counterparty,
                "status": "confirmed" if row.get("validated") is True else "pending",
                "timestamp": timestamp, "ledger_index": row.get("ledger_index"),
            })
        return {"available": True, "transactions": transactions, "message": None}
    finally:
        _close(client)


def _asset_amount(value: Any, *, native: bool) -> Decimal | None:
    if native:
        drops = _decimal(value)
        return drops / Decimal(1_000_000) if drops is not None else None
    if isinstance(value, dict):
        return _decimal(value.get("value"))
    return None


def _offer_output(offers: list[dict[str, Any]], amount_in: Decimal) -> Decimal | None:
    remaining = amount_in
    output = Decimal(0)
    for offer in offers:
        pays = offer.get("taker_pays_funded") or offer.get("TakerPaysFunded") or offer.get("TakerPays")
        gets = offer.get("taker_gets_funded") or offer.get("TakerGetsFunded") or offer.get("TakerGets")
        pay_amount = _asset_amount(pays, native=False)
        get_amount = _asset_amount(gets, native=True)
        if pay_amount is None or get_amount is None or pay_amount <= 0 or get_amount < 0:
            continue
        fill = min(remaining, pay_amount)
        output += fill * get_amount / pay_amount
        remaining -= fill
        if remaining <= 0:
            return output
    return None


def _amm_output(amm: dict[str, Any], amount_in: Decimal) -> Decimal | None:
    # Request order is RLUSD then XRP, so amount/amount2 follow that order.
    reserve_in = _asset_amount(amm.get("amount"), native=False)
    reserve_out = _asset_amount(amm.get("amount2"), native=True)
    fee_raw = _decimal(amm.get("trading_fee") or amm.get("TradingFee") or 0)
    if reserve_in is None or reserve_out is None or reserve_in <= 0 or reserve_out <= 0 or fee_raw is None:
        return None
    fee_fraction = fee_raw / Decimal(100_000)
    if fee_fraction < 0 or fee_fraction >= 1:
        return None
    effective_in = amount_in * (Decimal(1) - fee_fraction)
    return reserve_out * effective_in / (reserve_in + effective_in)


def quote_swap(from_asset: str, to_asset: str, raw_amount: str) -> dict[str, Any]:
    amount = _decimal(raw_amount)
    unavailable = {
        "available": False, "from": from_asset, "to": to_asset,
        "input_amount": raw_amount, "estimated_output": None, "source": None,
        "network": "testnet", "ledger_index": None,
        "reason": "No reliable XRPL Testnet liquidity available.",
    }
    if amount is None or amount <= 0 or from_asset == to_asset:
        return unavailable
    if (from_asset, to_asset) != ("RLUSD", "XRP"):
        return unavailable
    _ensure_testnet()
    sdk = _load_sdk()
    issuer = _valid_issuer(sdk)
    if not issuer:
        return unavailable
    client = _client(sdk)
    try:
        rlusd = sdk.IssuedCurrency(currency=RLUSD_CURRENCY, issuer=issuer)
        xrp = sdk.XRP()
        book = _request(client, sdk.BookOffers(taker_gets=xrp, taker_pays=rlusd, limit=50))
        amm_result = _request(client, sdk.AMMInfo(asset=rlusd, asset2=xrp))
        book_output = _offer_output(book.get("offers", []), amount) if isinstance(book.get("offers"), list) else None
        amm = amm_result.get("amm") if isinstance(amm_result.get("amm"), dict) else None
        amm_output = _amm_output(amm, amount) if amm else None
        candidates = [candidate for candidate in (book_output, amm_output) if candidate is not None and candidate > 0]
        if not candidates:
            return unavailable
        output = max(candidates)
        ledger = book.get("ledger_current_index") or book.get("ledger_index") or amm_result.get("ledger_current_index")
        return {
            "available": True, "from": from_asset, "to": to_asset,
            "input_amount": decimal_text(amount), "estimated_output": decimal_text(output, places=6),
            "source": "XRPL Testnet DEX/AMM", "network": "testnet",
            "ledger_index": ledger if isinstance(ledger, int) else None, "reason": None,
        }
    finally:
        _close(client)
