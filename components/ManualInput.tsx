"use client";

import styled from "styled-components";
import { RiCloseLine } from "react-icons/ri";
import { useTheme, tokens } from "@/lib/theme";

const MAX_URLS = 10;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onScan: () => void;
  onCancel: () => void;
  loading: boolean;
  isProcessing: boolean;
};

const Textarea = styled.textarea<{ $border: string; $bg: string; $text: string }>`
  width: 100%;
  padding: 0.65rem 0.9rem;
  font-size: 14px;
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  margin-bottom: 6px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$text};
  transition: opacity 0.15s;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    resize: none;
  }
`;

const Counter = styled.div<{ $warn: boolean; $warnColor: string; $mutedColor: string }>`
  font-size: 12px;
  margin-bottom: 1rem;
  color: ${(p) => (p.$warn ? p.$warnColor : p.$mutedColor)};
`;

const ScanButton = styled.button<{ $disabled: boolean }>`
  /* padding: 0.6rem 1.5rem; */
  padding: 1rem 2rem;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: monospace;
  background: ${(p) => (p.$disabled ? "#3f3f46" : "#7c3aed")};
  color: ${(p) => (p.$disabled ? "#71717a" : "#ffffff")};
  border: none;
  border-radius: 6px;
  cursor: ${(p) => (p.$disabled ? "not-allowed" : "pointer")};
  margin-bottom: 1.75rem;
  width: 100%;
  transition: opacity 0.15s;
  &:not(:disabled):hover { opacity: 0.85; }
  &:not(:disabled):active { opacity: 0.7; }

  @media (min-width: 540px) {
    width: auto;
  }
`;

const CancelButton = styled.button`
  padding: 0.6rem 1.1rem;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: monospace;
  background: transparent;
  color: #f0f0f0;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1.75rem;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: opacity 0.15s;
  &:hover { opacity: 0.7; }
  &:active { opacity: 0.5; }

  @media (min-width: 540px) {
    width: auto;
  }
`;

export default function ManualInput({ value, onChange, onScan, onCancel, loading, isProcessing }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const count = value.split("\n").map((u) => u.trim()).filter(Boolean).length;
  const atLimit = count > MAX_URLS;
  const disabled = loading || count === 0;

  return (
    <>
      <Textarea
        rows={5}
        placeholder={"https://example.com\nhttps://example.com/about\nhttps://example.com/contact"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isProcessing}
        $border={t.border}
        $bg={t.bg}
        $text={t.text}
      />
      <Counter $warn={atLimit} $warnColor={t.failText} $mutedColor={t.textFaint}>
        {count} / {MAX_URLS} URLs{atLimit && " — limit reached, remove a URL to add another"}
      </Counter>
      {loading ? (
        <CancelButton onClick={onCancel} type="button">
          <RiCloseLine size={15} /> Cancel Scan
        </CancelButton>
      ) : (
        <ScanButton onClick={onScan} disabled={disabled} $disabled={disabled}>
          Start Scan
        </ScanButton>
      )}
    </>
  );
}
