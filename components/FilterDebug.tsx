"use client";

import { useState } from "react";
import styled from "styled-components";
import { RiArrowDownSLine, RiArrowUpSLine } from "react-icons/ri";
import { useTheme, tokens } from "@/lib/theme";
import type { FilterResult } from "@/lib/types";

const PREVIEW_LIMIT = 20;
type Props = { filter: FilterResult };

// ── Styled primitives ─────────────────────────────────────────────────────────

const Wrapper = styled.div<{ $border: string }>`
  border: 1px solid ${(p) => p.$border};
  border-radius: 8px;
  overflow: hidden;
  margin-top: 12px;
`;

const StatsGrid = styled.div<{ $gap: string }>`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: ${(p) => p.$gap};
`;

const StatCell = styled.div<{ $bg: string }>`
  background: ${(p) => p.$bg};
  padding: 10px 14px;
  text-align: center;
`;

const StatValue = styled.div<{ $color: string }>`
  font-size: 20px;
  font-weight: 700;
  color: ${(p) => p.$color};
`;

const StatLabel = styled.div<{ $color: string }>`
  font-size: 11px;
  color: ${(p) => p.$color};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SectionWrap = styled.div<{ $border: string }>`
  border-top: 1px solid ${(p) => p.$border};
`;

const SectionToggle = styled.button<{ $bg: string; $color: string }>`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: ${(p) => p.$bg};
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  color: ${(p) => p.$color};
  font-family: inherit;
`;

const SectionChevron = styled.span<{ $color: string }>`
  font-size: 11px;
  color: ${(p) => p.$color};
`;

const SectionBody = styled.div<{ $bg: string }>`
  padding: 10px 16px 14px;
  background: ${(p) => p.$bg};
`;

const UrlOl = styled.ol`
  margin: 0;
  padding: 0 0 0 1.4rem;
  line-height: 1.9;
`;

const UrlLink = styled.a<{ $color: string }>`
  color: ${(p) => p.$color};
  word-break: break-all;
  text-decoration: none;
  font-size: 13px;
`;

const More = styled.div<{ $color: string }>`
  color: ${(p) => p.$color};
  font-size: 12px;
  margin-top: 6px;
  font-style: italic;
`;

const PatternCode = styled.code<{ $bg: string; $color: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  background: ${(p) => p.$bg};
  color: ${(p) => p.$color};
  font-family: inherit;
`;

const TagsWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const { theme } = useTheme();
  const t = tokens[theme];
  const [open, setOpen] = useState(defaultOpen);

  return (
    <SectionWrap $border={t.border}>
      <SectionToggle onClick={() => setOpen((v) => !v)} $bg={t.bgSubtle} $color={t.text}>
        <span>{title}</span>
        <SectionChevron $color={t.textFaint}>
          {open ? <RiArrowUpSLine size={16} /> : <RiArrowDownSLine size={16} />}
        </SectionChevron>
      </SectionToggle>
      {open && <SectionBody $bg={t.bg}>{children}</SectionBody>}
    </SectionWrap>
  );
}

function UrlList({ urls }: { urls: string[] }) {
  const { theme } = useTheme();
  const t = tokens[theme];
  return (
    <UrlOl>
      {urls.map((u) => (
        <li key={u}>
          <UrlLink href={u} target="_blank" rel="noreferrer" $color={t.link}>
            {u}
          </UrlLink>
        </li>
      ))}
    </UrlOl>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FilterDebug({ filter }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  return (
    <Wrapper $border={t.border}>
      <StatsGrid $gap={t.border}>
        {[
          { label: "Discovered", value: filter.totalDiscovered },
          { label: "After Filter", value: filter.totalAfterFiltering },
          { label: "Excluded", value: filter.excludedUrls.length },
        ].map(({ label, value }) => (
          <StatCell key={label} $bg={t.bgSubtle}>
            <StatValue $color={t.text}>{value}</StatValue>
            <StatLabel $color={t.textMuted}>{label}</StatLabel>
          </StatCell>
        ))}
      </StatsGrid>

      <Section
        title={`Included URLs — first ${Math.min(PREVIEW_LIMIT, filter.includedUrls.length)} of ${filter.totalAfterFiltering}`}
        defaultOpen
      >
        <UrlList urls={filter.includedUrls.slice(0, PREVIEW_LIMIT)} />
        {filter.includedUrls.length > PREVIEW_LIMIT && (
          <More $color={t.textFaint}>… and {filter.includedUrls.length - PREVIEW_LIMIT} more</More>
        )}
      </Section>

      {filter.excludedUrls.length > 0 && (
        <Section
          title={`Excluded URLs — first ${Math.min(PREVIEW_LIMIT, filter.excludedUrls.length)} of ${filter.excludedUrls.length}`}
        >
          <UrlList urls={filter.excludedUrls.slice(0, PREVIEW_LIMIT)} />
          {filter.excludedUrls.length > PREVIEW_LIMIT && (
            <More $color={t.textFaint}>
              … and {filter.excludedUrls.length - PREVIEW_LIMIT} more
            </More>
          )}
        </Section>
      )}

      {filter.excludedPatterns.length > 0 && (
        <Section title={`Active Exclude Patterns (${filter.excludedPatterns.length})`}>
          <TagsWrap>
            {filter.excludedPatterns.map((p) => (
              <PatternCode key={p} $bg={t.bgMuted} $color={t.text}>
                {p}
              </PatternCode>
            ))}
          </TagsWrap>
        </Section>
      )}
    </Wrapper>
  );
}
