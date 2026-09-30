import { invalidateReads } from './pagination.ts';

const pending = new Map<string, { id: string; time: number }>();
/** Reuse an operation ID after an ambiguous network error; never replay partial writes. */
export async function mutate(client: { rpc: (name: string, args: any) => any }, name: string, args: Record<string, unknown>) {
  const key = JSON.stringify([name, args]);
  for (const [k,v] of pending) if (Date.now() - v.time > 30 * 60_000) pending.delete(k);
  let operation = pending.get(key);
  if (!operation) {
    // This is an idempotency identifier, not a credential. Compatible with native Expo.
    operation = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`, time: Date.now() };
    pending.set(key, operation);
  }
  invalidateReads();
  try {
    const result = await client.rpc(name, { ...args, p_request_id: operation.id });
    if (!result.error || result.error.code?.startsWith('P') || result.error.code?.startsWith('22')) pending.delete(key);
    return result;
  } finally { invalidateReads(); }
}
