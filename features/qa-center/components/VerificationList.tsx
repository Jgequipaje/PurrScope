"use client";

import type { VerificationEvent } from "../types";
import VerificationCard from "./VerificationCard";
import EmptyState from "./EmptyState";

type Props = {
  events: VerificationEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** When true the list is empty because showPassed is off and there are no failures */
  allClear?: boolean;
};

export default function VerificationList({ events, selectedId, onSelect, allClear }: Props) {
  if (events.length === 0) {
    if (allClear) {
      return (
        <EmptyState
          message="No active failures"
          sub="All checks are passing. Enable 'Show Passed' to see passing events."
        />
      );
    }
    return (
      <EmptyState
        message="No verification events"
        sub="Run a scan or test suite to see results here."
      />
    );
  }

  return (
    <div style={{ overflowY: "auto", flex: 1 }}>
      {events.map((e) => (
        <VerificationCard
          key={e.id}
          event={e}
          selected={selectedId === e.id}
          onClick={() => onSelect(e.id)}
        />
      ))}
    </div>
  );
}
