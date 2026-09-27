from decimal import Decimal, InvalidOperation
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DemoActivity(BaseModel):
    id: str
    kind: Literal["send", "split"]
    mode: Literal["demo"] = "demo"
    simulated: Literal[True] = True
    asset: Literal["RLUSD"] = "RLUSD"
    amount: str
    direction: Literal["sent"] = "sent"
    counterparty: str
    description: str
    timestamp: str
    transaction_hash: None = None
    ledger_index: None = None


class DemoWalletState(BaseModel):
    balance: str
    currency: Literal["RLUSD"] = "RLUSD"
    label: Literal["Demo RLUSD"] = "Demo RLUSD"
    activity: list[DemoActivity]


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
    demo: DemoWalletState


class DemoPaymentRequest(BaseModel):
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    recipient: str = Field(min_length=1, max_length=80)
    note: str | None = Field(default=None, max_length=160)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=80)

    @field_validator("recipient")
    @classmethod
    def validate_recipient(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Recipient is required")
        return value.strip()


class DemoSplitRequest(BaseModel):
    total: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    participant_count: int = Field(ge=2, le=20)
    expense: str = Field(min_length=1, max_length=80)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=80)

    @field_validator("expense")
    @classmethod
    def validate_expense(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Expense is required")
        return value.strip()


class DemoPaymentResult(BaseModel):
    status: Literal["simulated"] = "simulated"
    mode: Literal["demo"] = "demo"
    simulated: Literal[True] = True
    asset: Literal["RLUSD"] = "RLUSD"
    amount: str
    balance: str
    activity: DemoActivity
    transaction_hash: None = None
    ledger_index: None = None


class DemoSplitResult(DemoPaymentResult):
    total: str
    participant_count: int
    each: str


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
    mode: Literal["xrpl"] = "xrpl"
    simulated: Literal[False] = False


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
