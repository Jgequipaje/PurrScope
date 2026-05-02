"use client";

import styled from "styled-components";
import { useTheme, tokens } from "@/lib/theme";
import type { LinkScope } from "@/lib/types";

type Props = {
  scope: LinkScope;
  onChange: (scope: LinkScope) => void;
  disabled?: boolean;
  linkCount?: { internal: number; all: number };
};

const SCOPE_OPTIONS: { value: LinkScope; label: string; description: string }[] = [
  {
    value: "internal",
    label: "Internal Links Only",
    description: "Validate only links pointing to the same domain.",
  },
  {
    value: "all",
    label: "All Links",
    description: "Validate both internal and external links.",
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

const ValidationMessage = styled.div<{ $color: string }>`
  font-size: 12px;
  color: ${(p) => p.$color};
  margin-top: 8px;
  font-weight: 500;
`;

export default function LinkScopeSelector({ scope, onChange, disabled = false, linkCount }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const getCount = (scopeValue: LinkScope): number | undefined => {
    if (!linkCount) return undefined;
    return scopeValue === "internal" ? linkCount.internal : linkCount.all;
  };

  const selectedCount = getCount(scope);

  return (
    <Wrap data-testid="link-scope-selector">
      <Label $color={t.text}>Link Scope</Label>
      <RadioGroup>
        {SCOPE_OPTIONS.map((option) => {
          const count = getCount(option.value);
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
                name="link-scope"
                value={option.value}
                checked={scope === option.value}
                onChange={(e) => onChange(e.target.value as LinkScope)}
                disabled={disabled}
                data-testid={`link-scope-${option.value}`}
              />
              <RadioContent>
                <RadioLabel $color={t.text}>
                  {option.label}
                  {count !== undefined && (
                    <CountBadge $bg={t.border} $text={t.textMuted}>
                      {count}
                    </CountBadge>
                  )}
                </RadioLabel>
                <RadioDescription $color={t.textMuted}>{option.description}</RadioDescription>
              </RadioContent>
            </RadioOption>
          );
        })}
      </RadioGroup>

      {selectedCount !== undefined && (
        <ValidationMessage $color={t.passText} data-testid="selected-link-count">
          ✓ {selectedCount} link{selectedCount !== 1 ? "s" : ""} selected for validation
        </ValidationMessage>
      )}
    </Wrap>
  );
}
