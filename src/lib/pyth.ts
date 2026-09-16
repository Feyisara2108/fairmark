// Client access to the Pyth reference prices served by /api/pyth. Everything
// here is optional: when no Pyth Pro token is configured the snapshot reports
// `available: false` and the UI simply omits the Pyth elements.

export interface PythPrice {
  price: number;
  conf: number;
  publishTime: number;
}

export interface PythSnapshot {
  available: boolean;
  reason?: string;
  prices?: {
    sol: PythPrice | null;
    openai: PythPrice | null;
  };
}

export async function fetchPyth(): Promise<PythSnapshot> {
  try {
    const res = await fetch("/api/pyth", { headers: { accept: "application/json" } });
    if (!res.ok) return { available: false, reason: `HTTP ${res.status}` };
    return (await res.json()) as PythSnapshot;
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : String(e) };
  }
}
