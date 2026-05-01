"use client";

import styled from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import type { DynamicGroup } from "@/lib/sitemapGroups";
import type { PageEntry } from "@/lib/types";

type PageScope = "all" | "static" | "dynamic";

type Props = {
  pageEntries: PageEntry[];
  dynamicGroups: DynamicGroup[];
  selectedScope: PageScope;
  selectedGroups: string[];
  onScopeChange: (scope: PageScope) => void;
  onGroupsChange: (groups: string[]) => void;
  disabled?: boolean;
};

const SCOPE_OPTIONS: { value: PageScope; label: string; description: string }[] = [
  {
    value: "all",
    label: "All Pages",
    description: "Scan every URL discovered in the sitemap for links.",
  },
  {
    value: "static",
    label: "Static Pages Only",
    description: "Include only URLs from sitemap-static.xml.",
  },
  {
    value: "dynamic",
    label: "Dynamic Pages Only",
    description: "Include only URLs from sitemaps ending in -dpages.xml.",
  },
];

const Wrap = styled.div`
  margin-bottom: 1.25rem;
`;

const Label = styled.label<{ $color: string }>`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.$color};
  margin-bottom: 6px;
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 6px;
`;

const RadioOption = styled.label<{
  $border: string;
  $bg: string;
  $text: string;
  $disabled: boolean;
}>`
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.$disabled ? 0.55 : 1)};
  transition:
    opacity 0.15s,
    border-color 0.15s;

  &:hover {
    opacity: ${(p) => (p.$disabled ? 0.55 : 0.9)};
  }
`;

const RadioInput = styled.input`
  margin-right: 10px;
  margin-top: 2px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
`;

const RadioContent = styled.div`
  flex: 1;
`;

const RadioLabel = styled.div<{ $color: string }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(p) => p.$color};
  margin-bottom: 4px;
`;

const RadioDescription = styled.div<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
`;

const CountBadge = styled.span<{ $bg: string; $text: string }>`
  display: inline-block;
  padding: 2px 8px;
  margin-left: 8px;
  font-size: 11px;
  font-weight: 600;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  border-radius: 12px;
`;

const GroupCheckboxes = styled.div<{ $border: string; $bg: string }>`
  margin-top: 12px;
  padding: 12px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  background: ${(p) => p.$bg};
`;

const GroupLabel = styled.div<{ $color: string }>`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => p.$color};
  margin-bottom: 8px;
`;

const GroupCheckboxLabel = styled.label<{ $text: string; $disabled: boolean }>`
  display: flex;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
  color: ${(p) => p.$text};
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  opacity: ${(p) => (p.$disabled ? 0.55 : 1)};

  &:hover {
    opacity: ${(p) => (p.$disabled ? 0.55 : 0.8)};
  }
`;

const CheckboxInput = styled.input`
  margin-right: 8px;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
  }
`;

const ValidationMessage = styled.div<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin-top: 8px;
  font-weight: 500;
`;

export default function PageSelector({
  pageEntries,
  dynamicGroups,
  selectedScope,
  selectedGroups,
  onScopeChange,
  onGroupsChange,
  disabled = false,
}: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  // Helper functions to identify sitemap types (matching lib/filter.ts logic)
  const isDPagesSitemap = (sitemapUrl: string): boolean => {
    try {
      const path = new URL(sitemapUrl).pathname;
      return path.endsWith("-dpages.xml");
    } catch {
      return sitemapUrl.endsWith("-dpages.xml");
    }
  };

  const isStaticSitemap = (sitemapUrl: string): boolean => {
    try {
      const path = new URL(sitemapUrl).pathname;
      return path.endsWith("sitemap-static.xml");
    } catch {
      return sitemapUrl.endsWith("sitemap-static.xml");
    }
  };

  // Calculate page counts for each scope
  const staticPageEntries = pageEntries.filter((entry) => isStaticSitemap(entry.sourceSitemap));

  const dynamicPageEntries = pageEntries.filter((entry) => isDPagesSitemap(entry.sourceSitemap));

  const getPageCount = (scope: PageScope): number => {
    switch (scope) {
      case "all":
        return pageEntries.length;
      case "static":
        return staticPageEntries.length;
      case "dynamic":
        if (selectedGroups.length === 0) {
          return dynamicPageEntries.length;
        }
        // Count pages from selected groups only
        const selectedSitemapUrls = new Set(selectedGroups);
        return pageEntries.filter((entry) => selectedSitemapUrls.has(entry.sourceSitemap)).length;
      default:
        return 0;
    }
  };

  const selectedCount = getPageCount(selectedScope);
  const isValid = selectedCount > 0;

  const handleGroupToggle = (groupUrl: string) => {
    if (disabled) return;

    const newGroups = selectedGroups.includes(groupUrl)
      ? selectedGroups.filter((g) => g !== groupUrl)
      : [...selectedGroups, groupUrl];

    onGroupsChange(newGroups);
  };

  return (
    <Wrap data-testid="page-selector">
      <Label $color={t.text}>Select Pages to Scan</Label>
      <RadioGroup>
        {SCOPE_OPTIONS.map((option) => {
          const count = getPageCount(option.value);
          return (
            <RadioOption
              key={option.value}
              $border={t.border}
              $bg={t.bgSubtle}
              $text={t.text}
              $disabled={disabled}
            >
              <RadioInput
                type="radio"
                name="page-scope"
                value={option.value}
                checked={selectedScope === option.value}
                onChange={(e) => onScopeChange(e.target.value as PageScope)}
                disabled={disabled}
                data-testid={`page-scope-${option.value}`}
              />
              <RadioContent>
                <RadioLabel $color={t.text}>
                  {option.label}
                  <CountBadge $bg={t.border} $text={t.textMuted}>
                    {count}
                  </CountBadge>
                </RadioLabel>
                <RadioDescription $color={t.textMuted}>{option.description}</RadioDescription>
              </RadioContent>
            </RadioOption>
          );
        })}
      </RadioGroup>

      {selectedScope === "dynamic" && dynamicGroups.length > 0 && (
        <GroupCheckboxes $border={t.border} $bg={t.bgSubtle}>
          <GroupLabel $color={t.text}>Select Dynamic Page Groups</GroupLabel>
          {dynamicGroups.map((group) => (
            <GroupCheckboxLabel key={group.sitemapUrl} $text={t.text} $disabled={disabled}>
              <CheckboxInput
                type="checkbox"
                checked={selectedGroups.includes(group.sitemapUrl)}
                onChange={() => handleGroupToggle(group.sitemapUrl)}
                disabled={disabled}
                data-testid={`group-checkbox-${group.label}`}
              />
              {group.label}
            </GroupCheckboxLabel>
          ))}
        </GroupCheckboxes>
      )}

      {!isValid && (
        <ValidationMessage $color={t.warnText} data-testid="validation-message">
          ⚠ At least one page must be selected
        </ValidationMessage>
      )}

      {isValid && (
        <ValidationMessage $color={t.passText} data-testid="selected-count">
          ✓ {selectedCount} page{selectedCount !== 1 ? "s" : ""} selected for scanning
        </ValidationMessage>
      )}
    </Wrap>
  );
}
