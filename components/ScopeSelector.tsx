"use client";

import styled from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import ExclusionDropdown from "@/components/ExclusionDropdown";
import type { ScanScope } from "@/lib/types";
import type { DynamicGroup } from "@/lib/sitemapGroups";

type Props = {
  scope: ScanScope;
  onScopeChange: (s: ScanScope) => void;
  disabled?: boolean;
  dynamicGroups?: DynamicGroup[];
  selectedGroups?: string[];
  onSelectedGroupsChange?: (urls: string[]) => void;
};

const SCOPE_OPTIONS: { value: ScanScope; label: string; description: string }[] = [
  { value: "all",     label: "All Pages",         description: "Scan every URL discovered in the sitemap (sitemap-static.xml + all -dpages.xml files)." },
  { value: "static",  label: "Static Pages Only",  description: "Include only URLs from sitemap-static.xml." },
  { value: "dynamic", label: "Dynamic Pages",      description: "Include only URLs from sitemaps ending in -dpages.xml." },
];

const Wrap = styled.div` margin-bottom: 1.25rem; `;

const Label = styled.label<{ $color: string }>`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.$color};
  margin-bottom: 6px;
`;

const Select = styled.select<{ $border: string; $bg: string; $text: string }>`
  width: 100%;
  padding: 0.55rem 0.8rem;
  font-size: 14px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  margin-bottom: 6px;
  font-family: inherit;
  transition: opacity 0.15s;
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const Hint = styled.p<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin: 0 0 12px;
`;

const DropdownWrap = styled.div` margin-top: 4px; `;

export default function ScopeSelector({
  scope, onScopeChange, disabled = false,
  dynamicGroups = [], selectedGroups = [], onSelectedGroupsChange,
}: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  return (
    <Wrap>
      <Label $color={t.text}>Scan Scope</Label>
      <Select
        value={scope}
        onChange={(e) => onScopeChange(e.target.value as ScanScope)}
        disabled={disabled}
        $border={t.border}
        $bg={t.bgSubtle}
        $text={t.text}
      >
        {SCOPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Hint $color={t.textMuted}>
        {SCOPE_OPTIONS.find((o) => o.value === scope)?.description}
      </Hint>

      {scope === "dynamic" && dynamicGroups.length > 0 && (
        <DropdownWrap>
          <ExclusionDropdown
            groups={dynamicGroups}
            selected={selectedGroups}
            onChange={onSelectedGroupsChange ?? (() => {})}
            disabled={disabled}
          />
        </DropdownWrap>
      )}
    </Wrap>
  );
}
