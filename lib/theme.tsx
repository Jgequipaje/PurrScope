"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with "dark" for SSR to avoid hydration mismatch.
  // The blocking script in <head> has already painted the correct background.
  const [theme, setTheme] = useState<Theme>("dark");

  // mounted gates the render so styled-components never paints with wrong tokens.
  // The html/body background is already correct from the inline script, so the
  // user sees no flash — just a single correct paint once mounted is true.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const resolved: Theme = (saved === "light" || saved === "dark") ? saved : "dark";
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    setMounted(true);
    // Enable CSS transitions only after first correct paint
    document.body.classList.add("theme-ready");
  }, []);

  // Keep localStorage + data-theme in sync on every subsequent change
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme, mounted]);

  // Before mount: render children hidden — the html/body background from the
  // blocking script is already showing the correct color, so this is invisible.
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme, toggle: () => {} }}>
        <div style={{ visibility: "hidden" }}>{children}</div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => setTheme((t) => t === "light" ? "dark" : "light") }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Centralised token map — use these everywhere instead of raw hex values
// Primary accent: #7c3aed (violet-purple)
// Hover/active variant: #6d28d9
// Light accent bg: #ede9fe
export const tokens = {
  light: {
    bg: "#ffffff",
    bgSubtle: "#fafafa",
    bgMuted: "#f4f4f5",
    border: "#e4e4e7",
    text: "#09090b",
    textMuted: "#71717a",
    textFaint: "#a1a1aa",
    link: "#7c3aed",
    passText: "#16a34a",
    passBg: "#dcfce7",
    failText: "#dc2626",
    failBg: "#fee2e2",
    warnBg: "#fffbeb",
    warnText: "#92400e",
    warnBorder: "#fcd34d",
    successBg: "#f0fdf4",
    successText: "#16a34a",
    rowFail: "#fffbeb",        // soft amber wash for fail rows
    rowFailBorder: "#f59e0b",  // amber left border indicator
    rowOk: "#ffffff",
    headerBg: "#fafafa",
    toolbarPassBg: "#f0fdf4",
    toolbarFailBg: "#fffbeb",  // amber tint toolbar when failures exist
    btnActive: "#7c3aed",
    btnActiveTxt: "#ffffff",
    btnIdle: "#f4f4f5",
    btnIdleTxt: "#3f3f46",
    infoBg: "#ede9fe",
    infoBorder: "#c4b5fd",
    infoText: "#6d28d9",
    accent: "#7c3aed",
    accentText: "#ffffff",
  },
  dark: {
    bg: "#09090b",
    bgSubtle: "#111113",
    bgMuted: "#18181b",
    border: "#27272a",
    text: "#fafafa",
    textMuted: "#a1a1aa",
    textFaint: "#52525b",
    link: "#a78bfa",
    passText: "#4ade80",
    passBg: "#052e16",
    failText: "#f87171",
    failBg: "#450a0a",
    warnBg: "#1c1400",
    warnText: "#fbbf24",
    warnBorder: "#92400e",
    successBg: "#052e16",
    successText: "#4ade80",
    rowFail: "#1c1400",        // dark amber wash for fail rows
    rowFailBorder: "#d97706",  // amber left border indicator
    rowOk: "#09090b",
    headerBg: "#111113",
    toolbarPassBg: "#052e16",
    toolbarFailBg: "#1c1400",  // dark amber tint toolbar when failures exist
    btnActive: "#7c3aed",
    btnActiveTxt: "#ffffff",
    btnIdle: "#18181b",
    btnIdleTxt: "#d4d4d8",
    infoBg: "#1e1030",
    infoBorder: "#4c1d95",
    infoText: "#a78bfa",
    accent: "#7c3aed",
    accentText: "#ffffff",
  },
} as const;

export type Tokens = {
  [K in keyof typeof tokens.light]: string;
};