"use client";

// PerformanceModeSelector — segmented button control for the Improved Process.
// Only affects the Improved pipeline. Previous Process is unaffected.
//
// To remove this component later:
//   1. Delete this file.
//   2. Remove performanceMode state and props from SitemapDebug and app/page.tsx.

import styled from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import { PERFORMANCE_CONFIGS } from "@/scan/types";
import type { PerformanceMode } from "@/scan/types";

type Props = {
  value: PerformanceMode;
  onChange: (mode: PerformanceMode) => void;
  disabled?: boolean;
};

const MODES: PerformanceMode[] = ["safe", "balanced", "fast"];

// ── Styled ────────────────────────────────────────────────────────────────────

const Wrap = styled.div` margin-top: 10px; `;

const Label = styled.div<{ $color: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => p.$color};
  margin-bottom: 6px;
`;

const ButtonGroup = styled.div<{ $border: string }>`
  display: inline-flex;
  border: 1px solid ${(p) => p.$border};
  border-radius: 7px;
  overflow: hidden;
`;

const ModeBtn = styled.button<{
  $active: boolean;
  $activeBg: string;
  $activeTxt: string;
  $idleBg: string;
  $idleTxt: string;
  $border: string;
  $disabled: boolean;
}>`
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  border: none;
  border-right: 1px solid ${(p) => p.$border};
  background: ${(p) => p.$active ? p.$activeBg : p.$idleBg};
  color: ${(p) => p.$active ? p.$activeTxt : p.$idleTxt};
  cursor: ${(p) => p.$disabled ? "not-allowed" : "pointer"};
  opacity: ${(p) => p.$disabled ? 0.55 : 1};
  transition: background 0.12s, color 0.12s;
  &:last-child { border-right: none; }
`;

const HelperText = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${(p) => p.$color};
  margin-top: 5px;
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerformanceModeSelector({ value, onChange, disabled = false }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];
  const cfg = PERFORMANCE_CONFIGS[value];

  return (
    <Wrap>
      <Label $color={t.textMuted}>Performance Mode (Improved Process only)</Label>
      <ButtonGroup $border={t.border}>
        {MODES.map((mode) => (
          <ModeBtn
            key={mode}
            type="button"
            onClick={() => { if (!disabled) onChange(mode); }}
            $active={value === mode}
            $activeBg={t.btnActive}
            $activeTxt={t.btnActiveTxt}
            $idleBg={t.btnIdle}
            $idleTxt={t.btnIdleTxt}
            $border={t.border}
            $disabled={disabled}
          >
            {PERFORMANCE_CONFIGS[mode].label}
          </ModeBtn>
        ))}
      </ButtonGroup>
      <HelperText $color={t.textFaint}>
        {cfg.description} · {cfg.concurrency} worker{cfg.concurrency > 1 ? "s" : ""}
      </HelperText>
    </Wrap>
  );
}
