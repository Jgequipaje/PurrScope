"use client";

import { RiInformationLine, RiCloseLine } from "react-icons/ri";
import styled, { keyframes } from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import { isValidUrl, urlValidationHint, getBaseUrlForSitemapCrawl } from "@/lib/urlValidation";
import ScopeSelector from "@/components/ScopeSelector";
import type { ScanScope } from "@/lib/types";
import type { DynamicGroup } from "@/lib/sitemapGroups";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onScan: () => void;
  onCancel: () => void;
  loading: boolean;
  isScanning: boolean;  // scan in progress — lock the crawl button
  scope: ScanScope;
  onScopeChange: (s: ScanScope) => void;
  dynamicGroups?: DynamicGroup[];
  selectedGroups?: string[];
  onSelectedGroupsChange?: (urls: string[]) => void;
  onInputChange?: () => void;
};

const Row = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
`;

const UrlInput = styled.input<{ $border: string; $bg: string; $text: string; $invalid: boolean; $invalidBorder: string }>`
  flex: 1;
  padding: 0.6rem 0.9rem;
  font-size: 15px;
  border: 1px solid ${(p) => (p.$invalid ? p.$invalidBorder : p.$border)};
  border-radius: 8px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, opacity 0.15s;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const CrawlButton = styled.button<{ $disabled: boolean }>`
  padding: 0.6rem 1.4rem;
  font-size: 15px;
  font-weight: 600;
  background: ${(p) => (p.$disabled ? "#9ca3af" : "#2563eb")};
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  white-space: nowrap;
  font-family: inherit;
  opacity: ${(p) => (p.$disabled ? 0.65 : 1)};
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  &:not(:disabled):hover { background: #1d4ed8; }
  &:not(:disabled):active { transform: scale(0.97); }
`;

const CancelButton = styled.button`
  padding: 0.6rem 1.1rem;
  font-size: 14px;
  font-weight: 600;
  background: transparent;
  color: #b91c1c;
  border: 1px solid #b91c1c;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: background 0.15s, transform 0.1s;
  &:hover { background: #fee2e2; }
  &:active { transform: scale(0.97); }
`;

const ValidationHint = styled.p<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin: 0 0 4px;
  min-height: 16px;
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-3px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const InfoCallout = styled.div<{ $bg: string; $border: string }>`
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 7px 11px;
  margin: 0 0 10px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 7px;
  background: ${(p) => p.$bg};
  animation: ${fadeIn} 0.18s ease;
`;

const InfoIcon = styled.span<{ $color: string }>`
  flex-shrink: 0;
  color: ${(p) => p.$color};
  margin-top: 1px;
  display: flex;
`;

const InfoText = styled.span<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  line-height: 1.5;
`;

const InfoLabel = styled.span`
  font-weight: 600;
`;

const InfoUrl = styled.span`
  font-weight: 500;
`;

const Hint = styled.p<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin-top: 0;
  margin-bottom: 1.25rem;
`;

export default function SitemapInput({
  value, onChange, onScan, onCancel, loading, isScanning,
  scope, onScopeChange,
  dynamicGroups, selectedGroups, onSelectedGroupsChange,
  onInputChange,
}: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const valid = isValidUrl(value);
  // Disabled when: crawling, scanning (another process active), or URL invalid
  const disabled = loading || isScanning || !valid;
  const hint = value.trim() ? urlValidationHint(value) : null;

  const baseUrl = valid ? getBaseUrlForSitemapCrawl(value) : null;
  const hasPath = baseUrl !== null && value.trim().replace(/\/$/, "") !== baseUrl.replace(/\/$/, "");
  const rootNote = hasPath ? true : false;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    onInputChange?.();
  }

  return (
    <>
      <Row>
        <UrlInput
          type="text"
          placeholder="https://example.com"
          value={value}
          onChange={handleChange}
          onKeyDown={(e) => e.key === "Enter" && !disabled && onScan()}
          disabled={loading || isScanning}
          $border={t.border}
          $bg={t.bg}
          $text={t.text}
          $invalid={!!hint}
          $invalidBorder={t.failText}
        />
        {loading ? (
          <CancelButton onClick={onCancel} type="button">
            <RiCloseLine size={15} /> Cancel
          </CancelButton>
        ) : (
          <CrawlButton onClick={onScan} disabled={disabled} $disabled={disabled}>
            Crawl Sitemap
          </CrawlButton>
        )}
      </Row>

      {/* Inline validation hint — only shown when input is non-empty and invalid */}
      <ValidationHint $color={t.failText}>
        {hint ?? ""}
      </ValidationHint>

      {/* Root note — shown when user pasted a page URL with a path */}
      {rootNote && (
        <InfoCallout $bg={t.infoBg} $border={t.infoBorder}>
          <InfoIcon $color={t.infoText}><RiInformationLine size={14} /></InfoIcon>
          <InfoText $color={t.infoText}>
            <InfoLabel>Sitemap crawl uses the site root:</InfoLabel>{" "}
            <InfoUrl>{baseUrl}</InfoUrl>
          </InfoText>
        </InfoCallout>
      )}

      <Hint $color={t.textFaint}>
        Tries <code>/sitemap.xml</code> then <code>/sitemap_index.xml</code>.
        After discovery you can review the filtered pages before scanning.
      </Hint>

      <ScopeSelector
        scope={scope}
        onScopeChange={(s) => { onScopeChange(s); onInputChange?.(); }}
        dynamicGroups={dynamicGroups}
        selectedGroups={selectedGroups}
        onSelectedGroupsChange={onSelectedGroupsChange}
        disabled={loading || isScanning}
      />
    </>
  );
}
