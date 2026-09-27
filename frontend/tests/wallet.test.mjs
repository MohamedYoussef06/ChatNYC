import assert from "node:assert/strict";
import test from "node:test";
import {
  getWalletSummary,
  getWalletTransactions,
  parseWalletFxEstimate,
  parseWalletSummary,
  parseWalletSwapQuote,
  payDemoSplit,
  sendDemoPayment,
  sendWalletPayment,
} from "../src/lib/wallet.ts";

const summaryPayload = {
  network: "testnet",
  available: true,
  configured: true,
  address: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
  balances: { XRP: "24.182", RLUSD: "10.125" },
  rlusd_configured: true,
  trustline_active: true,
  account_active: true,
  message: null,
  demo: { balance: "50.00", currency: "RLUSD", label: "Demo RLUSD", activity: [] },
};

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test("wallet summary parser preserves real ledger balance strings and public address only", () => {
  const parsed = parseWalletSummary(summaryPayload);
  assert.equal(parsed.address, summaryPayload.address);
  assert.deepEqual(parsed.balances, { XRP: "24.182", RLUSD: "10.125" });
  assert.equal(parsed.network, "testnet");
  assert.equal(parsed.demo.balance, "50.00");
  assert.equal("seed" in parsed, false);
});

test("demo send uses its dedicated simulated endpoint and never invents ledger metadata", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  try {
    globalThis.fetch = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return jsonResponse({
        status: "simulated", mode: "demo", simulated: true, asset: "RLUSD",
        amount: "8.00", balance: "42.00", transaction_hash: null, ledger_index: null,
        activity: {
          id: "demo_1", kind: "send", mode: "demo", simulated: true, asset: "RLUSD",
          amount: "8.00", direction: "sent", counterparty: "Museum", description: "Demo payment",
          timestamp: "2026-09-27T12:00:00Z", transaction_hash: null, ledger_index: null,
        },
      });
    };
    const result = await sendDemoPayment({ amount: "8.00", recipient: "Museum", idempotencyKey: "demo-send-001" });
    assert.match(request.url, /\/api\/wallet\/demo\/send$/);
    assert.deepEqual(request.body, { amount: "8.00", recipient: "Museum", note: null, idempotency_key: "demo-send-001" });
    assert.equal(result.balance, "42.00");
    assert.equal(result.simulated, true);
    assert.equal(result.transactionHash, null);
    assert.equal(result.ledgerIndex, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("demo split sends the total and participant count to the backend source of truth", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  try {
    globalThis.fetch = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return jsonResponse({
        status: "simulated", mode: "demo", simulated: true, asset: "RLUSD", amount: "16.00",
        balance: "34.00", total: "48.00", participant_count: 3, each: "16.00",
        transaction_hash: null, ledger_index: null,
        activity: {
          id: "demo_2", kind: "split", mode: "demo", simulated: true, asset: "RLUSD",
          amount: "16.00", direction: "sent", counterparty: "Restaurant",
          description: "Your share of Restaurant", timestamp: "2026-09-27T12:00:00Z",
          transaction_hash: null, ledger_index: null,
        },
      });
    };
    const result = await payDemoSplit({ total: "48.00", participantCount: 3, expense: "Restaurant", idempotencyKey: "demo-split-001" });
    assert.match(request.url, /\/api\/wallet\/demo\/split$/);
    assert.equal(request.body.participant_count, 3);
    assert.equal(result.each, "16.00");
    assert.equal(result.balance, "34.00");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summary API loading and unavailable errors are normalized without crashing", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => jsonResponse(summaryPayload);
    assert.equal((await getWalletSummary()).balances.RLUSD, "10.125");
    globalThis.fetch = async () => jsonResponse({ detail: "temporarily unavailable" }, 503);
    await assert.rejects(getWalletSummary(), /temporarily unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("transaction history parser keeps supported payment rows", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => jsonResponse({
      available: true,
      transactions: [{
        id: "ABC", hash: "ABC", type: "payment", direction: "received", asset: "RLUSD",
        amount: "10.00", counterparty: "rOther", status: "confirmed", timestamp: null, ledger_index: 12,
      }, {
        id: "bad", hash: "bad", type: "TrustSet", direction: "received", asset: "RLUSD",
        amount: "5", counterparty: "rOther", status: "confirmed",
      }],
      message: null,
    });
    const report = await getWalletTransactions();
    assert.equal(report.transactions.length, 1);
    assert.equal(report.transactions[0].direction, "received");
    assert.equal(report.transactions[0].ledgerIndex, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("send API submits only the reviewed payment fields and normalizes a confirmed result", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  try {
    globalThis.fetch = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return jsonResponse({
        status: "confirmed", asset: "RLUSD", amount: "2.00",
        destination: "rDestination", transaction_hash: "A".repeat(64), ledger_index: 22,
      });
    };
    const result = await sendWalletPayment({ asset: "RLUSD", amount: "2.00", destination: "rDestination", destinationTag: 7 });
    assert.equal(result.status, "confirmed");
    assert.equal(result.transactionHash, "A".repeat(64));
    assert.deepEqual(request.body, { asset: "RLUSD", amount: "2.00", destination: "rDestination", destination_tag: 7 });
    assert.equal(JSON.stringify(request).includes("seed"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("failed payment response stays a visible error and does not claim success", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => jsonResponse({ detail: "XRPL Testnet is temporarily unavailable." }, 503);
    await assert.rejects(sendWalletPayment({ asset: "XRP", amount: "1", destination: "rDestination" }), /temporarily unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fiat response is an estimate and Testnet swap unavailability is normalized", () => {
  const fx = parseWalletFxEstimate({
    available: true, asset: "RLUSD", amount: "10", base_currency: "USD",
    values: { USD: "10.00", EUR: "9.12", PEN: "37.00" }, rate_date: "2026-09-27",
    source: "ExchangeRate-API", message: null,
  });
  assert.equal(fx.available, true);
  assert.equal(fx.values.EUR, "9.12");
  const quote = parseWalletSwapQuote({
    available: false, from: "RLUSD", to: "XRP", input_amount: "5", estimated_output: null,
    source: null, network: "testnet", ledger_index: null, reason: "No reliable XRPL Testnet liquidity available.",
  });
  assert.equal(quote.available, false);
  assert.equal(quote.estimatedOutput, null);
});
