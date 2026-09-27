# ChatNYC XRPL Testnet wallet

ChatNYC combines a built-in, simulated spending balance with genuine XRPL Testnet infrastructure. The two states are intentionally separate: Demo RLUSD powers the judge-facing Send and Split flows, while the XRPL section shows the configured public address, real Testnet balances, trustline, and actual ledger activity. Neither Demo RLUSD nor Testnet assets have real-world value.

## Manual setup

1. Create a demo XRPL wallet and fund it with Testnet XRP using the XRPL Testnet faucet. An account needs XRP to activate and keep enough XRP for reserves and transaction fees.
2. Configure the wallet's RLUSD trustline manually, following [Ripple's RLUSD on XRPL instructions](https://docs.ripple.com/products/stablecoin/developer-resources/rlusd-on-the-xrpl). The current issuer and the Testnet-only issuer/currency details are documented there; verify them again before setup.
3. Optionally obtain Testnet RLUSD through an appropriate compatible wallet workflow. ChatNYC does not require this for its built-in Demo RLUSD flow.
4. Set `XRPL_NETWORK=testnet`, `XRPL_RPC_URL`, `XRPL_RLUSD_ISSUER`, and `XRPL_WALLET_SEED` in the private backend environment. Set `DEMO_WALLET_INITIAL_BALANCE=50.00` to change the process-local demo starting balance. Never put the seed in a frontend variable or commit it.
5. Restart the FastAPI backend and check `GET /api/wallet` and `GET /api/wallet/transactions`. The wallet endpoint returns only the classic address, ledger balances, network, and trustline status.

`backend/.env.example` contains the official Testnet endpoint and current issuer as non-secret defaults; it intentionally leaves the seed blank.

## Wallet behavior

- Receiving only displays the configured public address.
- The default Send and Split actions debit server-managed Demo RLUSD, create explicitly simulated activity, and never create a transaction hash or ledger claim.
- `POST /api/wallet/send` remains available for the existing explicit real Testnet path. A result is called confirmed only after the transaction is validated successfully.
- Demo state is in memory and resets to `DEMO_WALLET_INITIAL_BALANCE` whenever the backend process restarts. Multiple backend workers do not share this state.
- The swap quote reads the Testnet order book and AMM and is indicative only. Swap execution is not implemented.
- Fiat conversion is an estimate based on daily public USD exchange rates, not a fiat transfer or redemption promise.
- No automatic trustline creation, Testnet funding, payment, or swap is performed on page load.

The balance and payment integration uses [xrpl-py](https://github.com/XRPLF/xrpl-py). Network operations stay server-side.
