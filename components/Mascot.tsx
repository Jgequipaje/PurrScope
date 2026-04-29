"use client";

import styled, { keyframes, css } from "styled-components";
import { useTheme, tokens } from "@/lib/theme";

export type MascotState = "idle" | "scanning" | "pass" | "fail";

type Props = {
  state: MascotState;
  size?: number;
};

// ── Animations ────────────────────────────────────────────────────────────────

const idleBounce = keyframes`
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
`;

const scanSwing = keyframes`
  0%   { transform: rotate(-12deg); }
  50%  { transform: rotate(12deg); }
  100% { transform: rotate(-12deg); }
`;

const passPopIn = keyframes`
  0%   { transform: scale(0.85); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
`;

const failShake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-5px); }
  40%       { transform: translateX(5px); }
  60%       { transform: translateX(-4px); }
  80%       { transform: translateX(4px); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 18px 4px rgba(124, 58, 237, 0.25); }
  50%       { box-shadow: 0 0 32px 10px rgba(124, 58, 237, 0.45); }
`;

// ── Styled ────────────────────────────────────────────────────────────────────

const Wrap = styled.div<{ $state: MascotState; $size: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  user-select: none;

  ${(p) =>
    p.$state === "idle" &&
    css`
      animation: ${idleBounce} 3s ease-in-out infinite;
    `}
  ${(p) =>
    p.$state === "scanning" &&
    css`
      animation: ${scanSwing} 1.2s ease-in-out infinite;
      transform-origin: bottom center;
    `}
  ${(p) =>
    p.$state === "pass" &&
    css`
      animation: ${passPopIn} 0.5s ease both;
    `}
  ${(p) =>
    p.$state === "fail" &&
    css`
      animation: ${failShake} 0.6s ease both;
    `}
`;

const ImageWrap = styled.div<{ $state: MascotState; $size: number }>`
  width: ${(p) => p.$size}px;
  height: ${(p) => p.$size}px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  background: ${(p) =>
    p.$state === "idle" || p.$state === "scanning" ? "rgba(124, 58, 237, 0.3)" : "transparent"};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;

  ${(p) =>
    (p.$state === "idle" || p.$state === "scanning") &&
    css`
      animation: ${glowPulse} 2.5s ease-in-out infinite;
    `}

  img {
    width: 88%;
    height: 88%;
    object-fit: contain;
    display: block;
    filter: ${(p) =>
      p.$state === "pass"
        ? "drop-shadow(0 0 8px rgba(74, 222, 128, 0.6))"
        : p.$state === "fail"
          ? "drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))"
          : p.$state === "scanning"
            ? "drop-shadow(0 0 10px rgba(124, 58, 237, 0.5))"
            : "drop-shadow(0 0 6px rgba(124, 58, 237, 0.3))"};
  }
`;

const Bubble = styled.div<{ $bg: string; $border: string; $color: string }>`
  background: ${(p) => p.$bg};
  border: 1px solid ${(p) => p.$border};
  border-radius: 16px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: ${(p) => p.$color};
  white-space: nowrap;
  position: relative;

  /* Speech bubble tail */
  &::before {
    content: "";
    position: absolute;
    top: -7px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 7px solid ${(p) => p.$border};
  }
  &::after {
    content: "";
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 6px solid ${(p) => p.$bg};
  }
`;

// ── Messages ──────────────────────────────────────────────────────────────────

const MESSAGES: Record<MascotState, string> = {
  idle: "Ready to sniff out SEO issues 🔍",
  scanning: "Crawling & scanning pages…",
  pass: "All pages look great! ✅",
  fail: "Found some issues to fix ⚠️",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Mascot({ state, size = 100 }: Props) {
  const { theme } = useTheme();
  const t = tokens[theme];

  const bubbleBg =
    state === "pass"
      ? t.successBg
      : state === "fail"
        ? t.warnBg
        : state === "scanning"
          ? t.infoBg
          : t.bgSubtle;

  const bubbleBorder =
    state === "pass"
      ? t.passText
      : state === "fail"
        ? t.warnBorder
        : state === "scanning"
          ? t.infoBorder
          : t.border;

  const bubbleColor =
    state === "pass"
      ? t.successText
      : state === "fail"
        ? t.warnText
        : state === "scanning"
          ? t.infoText
          : t.textMuted;

  return (
    <Wrap $state={state} $size={size}>
      <ImageWrap $state={state} $size={size}>
        <img src="/mascot.png" alt="PurrScope mascot" />
      </ImageWrap>
      <Bubble $bg={bubbleBg} $border={bubbleBorder} $color={bubbleColor}>
        {MESSAGES[state]}
      </Bubble>
    </Wrap>
  );
}
