"use client";

import { useRef, useEffect, useState } from "react";
import styled from "styled-components";
import { RiCheckLine, RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import { useTheme, tokens } from "@/lib/theme";
import type { DynamicGroup } from "@/lib/sitemapGroups";

type Props = {
  groups: DynamicGroup[];
  selected: string[]; // selected sitemapUrls
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

// ── Styled ────────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  position: relative;
`;

const FieldLabel = styled.label<{ $color: string }>`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.$color};
  margin-bottom: 6px;
`;

const Trigger = styled.button<{ $border: string; $bg: string; $text: string; $disabled: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.8rem;
  font-size: 14px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.$disabled ? 0.55 : 1)};
  font-family: inherit;
  text-align: left;
  gap: 8px;
`;

const TriggerText = styled.span<{ $muted: boolean; $color: string; $mutedColor: string }>`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${(p) => (p.$muted ? p.$mutedColor : p.$color)};
`;

const Popover = styled.div<{ $border: string; $bg: string }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  background: ${(p) => p.$bg};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  overflow: hidden;
`;

const OptionRow = styled.button<{ $border: string; $bg: string; $hoverBg: string; $color: string }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  font-size: 13px;
  font-family: inherit;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  border: none;
  border-bottom: 1px solid ${(p) => p.$border};
  cursor: pointer;
  text-align: left;
  &:last-child {
    border-bottom: none;
  }
  &:hover {
    background: ${(p) => p.$hoverBg};
  }
`;

const CheckWrap = styled.span<{ $visible: boolean; $color: string }>`
  flex-shrink: 0;
  width: 16px;
  color: ${(p) => p.$color};
  opacity: ${(p) => (p.$visible ? 1 : 0)};
`;

const HelperText = styled.p<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin: 4px 0 0;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function triggerLabel(
  groups: DynamicGroup[],
  selected: string[]
): { text: string; muted: boolean } {
  if (selected.length === 0) return { text: "None — include all dynamic pages", muted: true };
  const selectedGroups = groups.filter((g) => selected.includes(g.sitemapUrl));
  if (selectedGroups.length <= 2)
    return { text: selectedGroups.map((g) => g.label).join(", "), muted: false };
  return { text: `${selectedGroups.length} selected`, muted: false };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExclusionDropdown({ groups, selected, onChange, disabled = false }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function toggleGroup(sitemapUrl: string) {
    if (selected.includes(sitemapUrl)) {
      onChange(selected.filter((u) => u !== sitemapUrl));
    } else {
      onChange([...selected, sitemapUrl]);
    }
  }

  const { text, muted } = triggerLabel(groups, selected);

  return (
    <Wrap data-testid="exclusion-dropdown" ref={wrapRef}>
      <FieldLabel $color={t.text}>Exclude Dynamic Page Types</FieldLabel>
      <Trigger
        data-testid="exclusion-dropdown-trigger"
        className="exclusion-dropdown-trigger"
        type="button"
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        disabled={disabled}
        $disabled={disabled}
        $border={t.border}
        $bg={t.bgSubtle}
        $text={t.text}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <TriggerText $muted={muted} $color={t.text} $mutedColor={t.textFaint}>
          {text}
        </TriggerText>
        {open ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
      </Trigger>

      {open && (
        <Popover
          data-testid="exclusion-dropdown-popover"
          $border={t.border}
          $bg={t.bg}
          role="listbox"
          aria-multiselectable="true"
        >
          {groups.map((g) => {
            const isSelected = selected.includes(g.sitemapUrl);
            return (
              <OptionRow
                key={g.sitemapUrl}
                data-testid={`exclusion-option-${g.label}`}
                className={`exclusion-option ${isSelected ? "selected" : ""}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleGroup(g.sitemapUrl)}
                $border={t.border}
                $bg={t.bg}
                $hoverBg={t.bgSubtle}
                $color={t.text}
              >
                <CheckWrap $visible={isSelected} $color={t.passText}>
                  <RiCheckLine size={14} />
                </CheckWrap>
                {g.label}
              </OptionRow>
            );
          })}
        </Popover>
      )}

      <HelperText data-testid="exclusion-helper-text" $color={t.textFaint}>
        Choose dynamic sitemap groups to exclude from scan.
      </HelperText>
    </Wrap>
  );
}
