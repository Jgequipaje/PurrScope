"use client";

import styled from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import type { Mode } from "@/lib/types";

type Props = { mode: Mode; onChange: (mode: Mode) => void; disabled?: boolean };

const LABELS: Record<Mode, string> = {
  manual: "Manual URLs",
  sitemap: "Sitemap Crawl",
};

const Wrap = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 1.25rem;
`;

const Tab = styled.button<{ $active: boolean; $bg: string; $activeBg: string; $color: string; $activeColor: string; $border: string; $disabled: boolean }>`
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${(p) => p.$border};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  background: ${(p) => (p.$active ? p.$activeBg : p.$bg)};
  color: ${(p) => (p.$active ? p.$activeColor : p.$color)};
  font-family: inherit;
  opacity: ${(p) => (p.$disabled && !p.$active ? 0.45 : 1)};
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  &:not([disabled]):hover { opacity: 0.85; }
  &:not([disabled]):active { transform: scale(0.97); }
`;

export default function ModeTabs({ mode, onChange, disabled = false }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  return (
    <Wrap>
      {(Object.keys(LABELS) as Mode[]).map((m) => (
        <Tab
          key={m}
          onClick={() => !disabled && onChange(m)}
          $active={mode === m}
          $bg={t.btnIdle}
          $activeBg={t.btnActive}
          $color={t.btnIdleTxt}
          $activeColor={t.btnActiveTxt}
          $border={t.border}
          $disabled={disabled}
        >
          {LABELS[m]}
        </Tab>
      ))}
    </Wrap>
  );
}
