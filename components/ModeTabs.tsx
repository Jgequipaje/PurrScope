"use client";

import styled from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import type { Mode } from "@/lib/types";

type Props = { mode: Mode; onChange: (mode: Mode) => void; disabled?: boolean };

const LABELS: Record<Mode, string> = {
  manual: "Manual_URLs",
  sitemap: "Sitemap_Crawl",
  links: "Link_Checker",
};

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 1.25rem;

  @media (min-width: 480px) {
    flex-direction: row;
    gap: 6px;
  }
`;

const Tab = styled.button<{
  $active: boolean;
  $bg: string;
  $activeBg: string;
  $color: string;
  $activeColor: string;
  $border: string;
  $disabled: boolean;
}>`
  width: 100%;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-radius: 8px;
  border: 1px solid ${(p) => p.$border};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  background: ${(p) => (p.$active ? p.$activeBg : p.$bg)};
  color: ${(p) => (p.$active ? p.$activeColor : p.$color)};
  font-family: inherit;
  opacity: ${(p) => (p.$disabled && !p.$active ? 0.45 : 1)};
  transition:
    background 0.15s,
    opacity 0.15s,
    transform 0.1s;
  &:not([disabled]):hover {
    opacity: 0.85;
  }
  &:not([disabled]):active {
    transform: scale(0.97);
  }

  @media (min-width: 480px) {
    width: auto;
    /* padding: 6px 16px; */
    padding: 14px 16px;
  }
`;

export default function ModeTabs({ mode, onChange, disabled = false }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  return (
    <Wrap data-testid="mode-tabs">
      {(Object.keys(LABELS) as Mode[]).map((m) => (
        <Tab
          key={m}
          data-testid={`mode-tab-${m}`}
          className={`mode-tab ${mode === m ? "active" : ""}`}
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
