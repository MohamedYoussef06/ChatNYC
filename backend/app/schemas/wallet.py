from decimal import Decimal, InvalidOperation
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class WalletSummary(BaseModel):
    network: Literal["testnet"] = "testnet"
    available: bool
    configured: bool
    address: str | None = None
    balances: dict[Literal["XRP", "RLUSD"], str | None]
    rlusd_configured: bool
    trustline_active: bool
    account_active: bool | None = None
    message: str | None = None


class WalletSendRequest(BaseModel):
    asset: Literal["RLUSD", "XRP"]
    amount: str = Field(min_length=1, max_length=80)
    destination: str = Field(min_length=25, max_length=35)
    destination_tag: int | None = Field(default=None, ge=0, le=4_294_967_295)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: str) -> str:
        try:
            amount = Decimal(value)
        except InvalidOperation as exc:
            raise ValueError("Amount must be a decimal number") from exc
        if not amount.is_finite() or amount <= 0:
            raise ValueError("Amount must be greater than zero")
        if len(amount.as_tuple().digits) > 16:
            raise ValueError("Amount has too many significant digits")
        if amount.adjusted() > 80 or amount.adjusted() < -80:
            raise ValueError("Amount is outside the supported range")
        if value.strip() != value:
            raise ValueError("Amount cannot contain surrounding whitespace")
        return value


class WalletSendResult(BaseModel):
    status: Literal["confirmed", "pending"]
    asset: Literal["RLUSD", "XRP"]
    amount: str
    destination: str
    transaction_hash: str | None = None
    ledger_index: int | None = None


class WalletTransaction(BaseModel):
    id: str
    hash: str
    type: Literal["payment"]
    direction: Literal["received", "sent"]
    asset: Literal["RLUSD", "XRP"]
    amount: str
    counterparty: str
    status: Literal["confirmed", "pending"]
    timestamp: str | None = None
    ledger_index: int | None = None


class WalletTransactions(BaseModel):
    available: bool
    transactions: list[WalletTransaction]
    message: str | None = None


class WalletFxEstimate(BaseModel):
    available: bool
    asset: Literal["RLUSD"] = "RLUSD"
    amount: str
    base_currency: Literal["USD"] = "USD"
    values: dict[str, str]
    rate_date: str | None = None
    source: str = "ExchangeRate-API"
    message: str | None = None


class WalletSwapQuoteRequest(BaseModel):
    from_asset: Literal["RLUSD", "XRP"] = Field(alias="from")
    to_asset: Literal["RLUSD", "XRP"] = Field(alias="to")
    amount: str = Field(min_length=1, max_length=80)

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, value: str) -> str:
        try:
            amount = Decimal(value)
        except InvalidOperation as exc:
            raise ValueError("Amount must be a decimal number") from exc
        if not amount.is_finite() or amount <= 0:
            raise ValueError("Amount must be greater than zero")
        if len(amount.as_tuple().digits) > 16:
            raise ValueError("Amount has too many significant digits")
        return value


class WalletSwapQuote(BaseModel):
    available: bool
    from_asset: Literal["RLUSD", "XRP"] = Field(alias="from")
    to_asset: Literal["RLUSD", "XRP"] = Field(alias="to")
    input_amount: str
    estimated_output: str | None = None
    source: str | None = None
    network: Literal["testnet"] = "testnet"
    ledger_index: int | None = None
    reason: str | None = None
