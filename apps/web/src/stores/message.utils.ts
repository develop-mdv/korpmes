export interface OrderedMessage {
  id: string;
  seq: number;
}

export const compareBySeq = (a: OrderedMessage, b: OrderedMessage): number =>
  a.seq - b.seq;

export function mergeMessages<T extends OrderedMessage>(
  existing: T[],
  incoming: T[],
): T[] {
  if (incoming.length === 0) return existing;
  const byId = new Map<string, T>();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, m); // incoming wins (handles edits)
  return Array.from(byId.values()).sort(compareBySeq);
}

export function lastSeq<T extends OrderedMessage>(messages: T[]): number {
  let max = 0;
  for (const m of messages) if (m.seq > max) max = m.seq;
  return max;
}
