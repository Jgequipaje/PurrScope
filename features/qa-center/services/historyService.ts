// Stub — history feature not yet implemented
export function sortHistory<T extends { timestamp: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.timestamp - a.timestamp);
}
