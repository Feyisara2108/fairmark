// Reads each token's live supply directly from its SPL mint on Solana, via the
// /api/solana JSON-RPC proxy. This lets FairMark show that every token it lists
// is a real on-chain asset — a "verified on-chain" signal — rather than trusting
// the issuer API alone. Non-blocking and best-effort: any failure just means the
// verification badge is omitted, never a broken page.

export interface OnchainSupply {
  supply: number; // ui amount (already scaled by decimals)
  decimals: number;
}

interface RpcTokenSupplyResult {
  id: string;
  result?: { value?: { uiAmount: number | null; decimals: number } };
}

/**
 * Fetch on-chain supply for a set of mint addresses in one JSON-RPC batch.
 * Returns a map keyed by mint; mints that fail to resolve are simply absent.
 */
export async function fetchOnchainSupply(
  mints: string[],
): Promise<Record<string, OnchainSupply>> {
  if (mints.length === 0) return {};

  const batch = mints.map((mint, i) => ({
    jsonrpc: "2.0",
    id: String(i),
    method: "getTokenSupply",
    params: [mint],
  }));

  const res = await fetch("/api/solana", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(batch),
  });
  if (!res.ok) throw new Error(`Solana proxy returned ${res.status}`);

  const rows = (await res.json()) as RpcTokenSupplyResult[];
  const out: Record<string, OnchainSupply> = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const idx = Number(row.id);
    const mint = mints[idx];
    const value = row.result?.value;
    if (!mint || !value || value.uiAmount == null) continue;
    out[mint] = { supply: value.uiAmount, decimals: value.decimals };
  }
  return out;
}
