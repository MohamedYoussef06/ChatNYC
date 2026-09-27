from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.wallet import router
from app.config import settings
from app.schemas.wallet import WalletSendRequest
from app.services import xrpl

WALLET_ADDRESS = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
OTHER_ADDRESS = "rJ9k7fQ4x3Gf4W6w4F4J6v6B6z6g6b6b6"
ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV"
SEED = "sFakeTestOnlySeedForUnitTests"


class Request:
    def __init__(self, kind, **fields):
        self.kind = kind
        self.fields = fields


class FakeWallet:
    classic_address = WALLET_ADDRESS

    @classmethod
    def from_seed(cls, _seed):
        return cls()


class FakePayment:
    def __init__(self, **fields):
        self.fields = fields


class FakeClient:
    def __init__(self, replies):
        self.replies = replies
        self.seen = []

    def request(self, request):
        self.seen.append(request)
        value = self.replies[request.kind]
        if isinstance(value, Exception):
            raise value
        return value

    def close(self):
        pass


def make_sdk(client, submit=None):
    def request_type(name):
        return lambda **fields: Request(name, **fields)

    def issued_currency(**fields):
        return fields

    def xrp():
        return {"currency": "XRP"}

    return SimpleNamespace(
        JsonRpcClient=lambda *_args, **_kwargs: client,
        Wallet=FakeWallet,
        AccountInfo=request_type("account_info"),
        AccountLines=request_type("account_lines"),
        AccountTx=request_type("account_tx"),
        BookOffers=request_type("book_offers"),
        AMMInfo=request_type("amm_info"),
        Payment=FakePayment,
        submit_and_wait=submit or (lambda *_args: {}),
        is_valid_classic_address=lambda value: isinstance(value, str) and value.startswith("r") and 25 <= len(value) <= 35,
        IssuedCurrency=issued_currency,
        XRP=xrp,
    )


def configure(monkeypatch, *, seed=SEED, issuer=ISSUER):
    monkeypatch.setattr(settings, "xrpl_network", "testnet")
    monkeypatch.setattr(settings, "xrpl_rpc_url", "https://s.altnet.rippletest.net:51234/")
    monkeypatch.setattr(settings, "xrpl_wallet_seed", seed)
    monkeypatch.setattr(settings, "xrpl_rlusd_issuer", issuer)


def wallet_client():
    app = FastAPI()
    app.include_router(router, prefix="/api")
    return TestClient(app)


def test_wallet_unconfigured_response_never_contains_seed(monkeypatch):
    configure(monkeypatch, seed="")
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: pytest.fail("SDK should not load for an unconfigured wallet"))
    body = wallet_client().get("/api/wallet").json()
    assert body["network"] == "testnet"
    assert body["configured"] is False
    assert body["balances"] == {"XRP": None, "RLUSD": None}
    assert "seed" not in str(body).lower()
    assert SEED not in str(body)


def test_wallet_rejects_nonofficial_testnet_rpc_host(monkeypatch):
    configure(monkeypatch)
    monkeypatch.setattr(settings, "xrpl_rpc_url", "https://evil-testnet.example/rpc")
    with pytest.raises(xrpl.XRPLConfigurationError, match="HTTPS Testnet endpoint"):
        xrpl.wallet_summary()


def test_summary_reads_xrp_and_only_the_configured_rlusd_issuer(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({
        "account_info": {"account_data": {"Balance": "24182000"}},
        "account_lines": {"lines": [
            {"account": "rWrongIssuer", "currency": "RLUSD", "balance": "999"},
            {"account": ISSUER, "currency": xrpl.RLUSD_CURRENCY, "balance": "10.125"},
        ]},
    })
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client))
    body = xrpl.wallet_summary()
    assert body["address"] == WALLET_ADDRESS
    assert body["balances"] == {"XRP": "24.182", "RLUSD": "10.125"}
    assert body["trustline_active"] is True
    assert all(request.fields.get("ledger_index") == "validated" for request in client.seen)


def test_missing_rlusd_trustline_is_not_an_error_or_fake_balance(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({
        "account_info": {"account_data": {"Balance": "10000000"}},
        "account_lines": {"lines": [{"account": "rOther", "currency": "RLUSD", "balance": "50"}]},
    })
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client))
    body = xrpl.wallet_summary()
    assert body["balances"] == {"XRP": "10", "RLUSD": "0"}
    assert body["rlusd_configured"] is True
    assert body["trustline_active"] is False


@pytest.mark.parametrize("amount", ["0", "-1", "NaN", "Infinity", "1.12345678901234567"])
def test_send_rejects_nonpositive_or_unsupported_decimal_amounts(amount):
    with pytest.raises(ValidationError):
        WalletSendRequest(asset="RLUSD", amount=amount, destination=WALLET_ADDRESS)


def test_send_rejects_invalid_classic_address(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({})
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client))
    with pytest.raises(xrpl.WalletRequestError, match="classic address"):
        xrpl.send_payment(SimpleNamespace(asset="RLUSD", amount="1", destination="not-an-address", destination_tag=None))
    assert client.seen == []


def test_rlusd_send_builds_issued_payment_and_waits_for_validation(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({
        "account_info": {"account_data": {"Balance": "20000000"}},
        "account_lines": {"lines": [{"account": ISSUER, "currency": "RLUSD", "balance": "8.00"}]},
    })
    captured = {}

    def submit(payment, _client, _wallet):
        captured["payment"] = payment.fields
        return {"validated": True, "meta": {"TransactionResult": "tesSUCCESS"}, "hash": "A" * 64, "ledger_index": 312}

    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client, submit))
    request = SimpleNamespace(asset="RLUSD", amount="2.00", destination=OTHER_ADDRESS, destination_tag=81)
    result = xrpl.send_payment(request)
    assert captured["payment"] == {
        "account": WALLET_ADDRESS,
        "destination": OTHER_ADDRESS,
        "amount": {"currency": xrpl.RLUSD_CURRENCY, "issuer": ISSUER, "value": "2"},
        "destination_tag": 81,
    }
    assert result == {
        "status": "confirmed", "asset": "RLUSD", "amount": "2",
        "destination": OTHER_ADDRESS, "transaction_hash": "A" * 64, "ledger_index": 312,
    }
    assert SEED not in str(result)


def test_unvalidated_payment_is_never_reported_as_confirmed(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({
        "account_info": {"account_data": {"Balance": "20000000"}},
        "account_lines": {"lines": [{"account": ISSUER, "currency": "RLUSD", "balance": "8"}]},
    })
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client, lambda *_args: {"validated": False, "hash": "B" * 64}))
    result = xrpl.send_payment(SimpleNamespace(asset="RLUSD", amount="2", destination=OTHER_ADDRESS, destination_tag=None))
    assert result["status"] == "pending"


def test_transaction_history_normalizes_only_recognized_xrp_and_rlusd_payments(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({
        "account_tx": {"transactions": [
            {"hash": "1", "validated": True, "ledger_index": 10, "tx_json": {
                "TransactionType": "Payment", "Account": OTHER_ADDRESS, "Destination": WALLET_ADDRESS,
                "Amount": "1250000", "date": 1,
            }},
            {"hash": "2", "validated": True, "tx_json": {
                "TransactionType": "Payment", "Account": WALLET_ADDRESS, "Destination": OTHER_ADDRESS,
                "Amount": {"currency": "RLUSD", "issuer": ISSUER, "value": "3.75"},
            }},
            {"hash": "3", "validated": True, "tx_json": {
                "TransactionType": "Payment", "Account": OTHER_ADDRESS, "Destination": WALLET_ADDRESS,
                "Amount": {"currency": "RLUSD", "issuer": "rOtherIssuer", "value": "900"},
            }},
            {"hash": "4", "validated": True, "tx_json": {"TransactionType": "TrustSet"}},
        ]},
    })
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client))
    report = xrpl.transaction_history()
    assert [(row["asset"], row["direction"], row["amount"]) for row in report["transactions"]] == [
        ("XRP", "received", "1.25"), ("RLUSD", "sent", "3.75"),
    ]
    assert report["transactions"][0]["timestamp"] == "2000-01-01T00:00:01Z"


def test_swap_quote_unavailable_when_testnet_has_no_depth(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({
        "book_offers": {"offers": [], "ledger_current_index": 50},
        "amm_info": {"amm": None},
    })
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client))
    quote = xrpl.quote_swap("RLUSD", "XRP", "5")
    assert quote["available"] is False
    assert quote["estimated_output"] is None
    assert quote["reason"] == "No reliable XRPL Testnet liquidity available."
    assert client.seen[1].fields["asset2"] == {"currency": "XRP"}


def test_swap_quote_uses_real_orderbook_depth_and_decimal_output(monkeypatch):
    configure(monkeypatch)
    client = FakeClient({
        "book_offers": {
            "ledger_current_index": 52,
            "offers": [{
                "taker_pays_funded": {"currency": "RLUSD", "issuer": ISSUER, "value": "5"},
                "taker_gets_funded": "12500000",
            }],
        },
        "amm_info": {"amm": None},
    })
    monkeypatch.setattr(xrpl, "_load_sdk", lambda: make_sdk(client))
    quote = xrpl.quote_swap("RLUSD", "XRP", "2")
    assert quote["available"] is True
    assert quote["input_amount"] == "2"
    assert quote["estimated_output"] == "5"
    assert quote["ledger_index"] == 52


def test_wallet_api_does_not_surface_provider_exception_text(monkeypatch):
    def fail():
        raise xrpl.XRPLProviderError("private request details")

    monkeypatch.setattr(xrpl, "wallet_summary", fail)
    response = wallet_client().get("/api/wallet")
    assert response.status_code == 503
    assert "private request details" not in response.text
