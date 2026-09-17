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
  result?: { value?: { uiAmount: number | null; decimals: number } };
  error?: { code?: number };
}

// The public mainnet-beta RPC rate-limits bursts of getTokenSupply (429), so we
// query mints one at a time with a small gap rather than one big batch. A single
// dedicated RPC (SOLANA_RPC_URL) would tolerate a batch, but spacing keeps the
// default endpoint reliable too.
const GAP_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOne(mint: string): Promise<OnchainSupply | null> {
  const res = await fetch("/api/solana", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "1",
      method: "getTokenSupply",
      params: [mint],
    }),
  });
  if (!res.ok) return null;
  const row = (await res.json()) as RpcTokenSupplyResult;
  const value = row.result?.value;
  if (!value || value.uiAmount == null) return null;
  return { supply: value.uiAmount, decimals: value.decimals };
}

/**
 * Fetch on-chain supply for a set of mint addresses. Queries sequentially to
 * respect public-RPC rate limits and invokes `onResolve` as each mint verifies,
 * so badges appear progressively. Returns the full map once every mint settles;
 * mints that fail to resolve are simply absent.
 */
export async function fetchOnchainSupply(
  mints: string[],
  onResolve?: (mint: string, supply: OnchainSupply) => void,
): Promise<Record<string, OnchainSupply>> {
  const out: Record<string, OnchainSupply> = {};
  for (let i = 0; i < mints.length; i++) {
    const mint = mints[i];
    try {
      const supply = await fetchOne(mint);
      if (supply) {
        out[mint] = supply;
        onResolve?.(mint, supply);
      }
    } catch {
      // best-effort — skip this mint
    }
    if (i < mints.length - 1) await sleep(GAP_MS);
  }
  return out;
}
