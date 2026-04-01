"use client";

import { RiInformationLine, RiCloseLine } from "react-icons/ri";
import styled, { keyframes } from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import {
  isValidUrl,
  urlValidationHint,
  getBaseUrlForSitemapCrawl,
} from "@/lib/urlValidation";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onScan: () => void;
  onCancel: () => void;
  loading: boolean;
  isScanning: boolean;
  onInputChange?: () => void;
};

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 4px;

  @media (min-width: 540px) {
    flex-direction: row;
  }
`;

const UrlInput = styled.input<{
  $border: string;
  $bg: string;
  $text: string;
  $invalid: boolean;
  $invalidBorder: string;
}>`
  flex: 1;
  width: 100%;
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
  width: 100%;
  font-family: inherit;
  opacity: ${(p) => (p.$disabled ? 0.65 : 1)};
  transition: background 0.15s, opacity 0.15s, transform 0.1s;

  &:not(:disabled):hover {
    background: #1d4ed8;
  }

  &:not(:disabled):active {
    transform: scale(0.97);
  }

  @media (min-width: 540px) {
    width: auto;
  }
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
  width: 100%;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: background 0.15s, transform 0.1s;

  &:hover {
    background: #fee2e2;
  }

  &:active {
    transform: scale(0.97);
  }

  @media (min-width: 540px) {
    width: auto;
  }
`;

const ValidationHint = styled.p<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin: 0 0 4px;
  min-height: 16px;
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

const Hint = styled.p<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin-top: 0;
  margin-bottom: 1.25rem;
`;

export default function SitemapInput({
  value,
  onChange,
  onScan,
  onCancel,
  loading,
  isScanning,
  onInputChange,
}: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const valid = isValidUrl(value);
  const disabled = loading || isScanning || !valid;
  const hint = value.trim() ? urlValidationHint(value) : null;
  const baseUrl = valid ? getBaseUrlForSitemapCrawl(value) : null;
  const hasPath =
    baseUrl !== null &&
    value.trim().replace(/\/$/, "") !== baseUrl.replace(/\/$/, "");

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

      <ValidationHint $color={t.failText}>{hint ?? ""}</ValidationHint>

      {hasPath && (
        <InfoCallout $bg={t.infoBg} $border={t.infoBorder}>
          <InfoIcon $color={t.infoText}>
            <RiInformationLine size={14} />
          </InfoIcon>
          <InfoText $color={t.infoText}>
            <strong>Sitemap crawl uses the site root:</strong>{" "}
            <span style={{ fontWeight: 500 }}>{baseUrl}</span>
          </InfoText>
        </InfoCallout>
      )}

      <Hint $color={t.textFaint}>
        PurrScope tries <code>/sitemap.xml</code> then{" "}
        <code>/sitemap_index.xml</code>. Once discovered, you can review the
        filtered pages before scanning.
      </Hint>
    </>
  );
}