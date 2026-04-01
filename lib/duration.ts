/**
 * Formats a duration in milliseconds into a human-readable string.
 * - < 60s  → "1.4s"
 * - >= 60s → "1m 12s"
 * - <= 0   → "0.0s"
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "0.0s";
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export type ProcessStatus = "completed" | "failed" | "cancelled";

export type TimerState = {
  duration: number | null;   // ms, null if not yet stopped
  status: ProcessStatus | null;
};

/** Returns the label text for an Execution_Badge given a status and formatted duration. */
export function executionLabel(
  status: ProcessStatus,
  formattedDuration: string,
  processName: "Crawled" | "Scanned"
): string {
  if (status === "completed") return `${processName} in ${formattedDuration}`;
  if (status === "failed") return `Failed after ${formattedDuration}`;
  return `Stopped after ${formattedDuration}`;
}
