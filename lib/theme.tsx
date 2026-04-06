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
export const tokens = {
  light: {
    bg: "#ffffff",
    bgSubtle: "#f9fafb",
    bgMuted: "#f3f4f6",
    border: "#e5e7eb",
    text: "#111827",
    textMuted: "#6b7280",
    textFaint: "#9ca3af",
    link: "#2563eb",
    passText: "#15803d",
    passBg: "#dcfce7",
    failText: "#b91c1c",
    failBg: "#fee2e2",
    warnBg: "#fffbeb",
    warnText: "#92400e",
    successBg: "#f0fdf4",
    successText: "#15803d",
    rowFail: "#fffbeb",
    rowOk: "#ffffff",
    headerBg: "#f9fafb",
    toolbarPassBg: "#f0fdf4",
    toolbarFailBg: "#fff7ed",
    btnActive: "#e8441a",
    btnActiveTxt: "#111827",
    btnIdle: "#f3f4f6",
    btnIdleTxt: "#374151",
    infoBg: "#fdece8",
    infoBorder: "#bfdbfe",
    infoText: "#1d4ed8",
    accent: "#e8441a",
    accentText: "#1a1a1a",
  },
  dark: {
    bg: "#1a1a1a",
    bgSubtle: "#242424",
    bgMuted: "#2e2e2e",
    border: "#3a3a3a",
    text: "#f0f0f0",
    textMuted: "#a0a0a0",
    textFaint: "#6b6b6b",
    link: "#60a5fa",
    passText: "#4ade80",
    passBg: "#14532d",
    failText: "#f87171",
    failBg: "#450a0a",
    warnBg: "#292218",
    warnText: "#fbbf24",
    successBg: "#0f2318",
    successText: "#4ade80",
    rowFail: "#1f1a10",
    rowOk: "#1a1a1a",
    headerBg: "#242424",
    toolbarPassBg: "#0f2318",
    toolbarFailBg: "#1f1a10",
    btnActive: "#e8441a",
    btnActiveTxt: "#111827",
    btnIdle: "#2e2e2e",
    btnIdleTxt: "#d1d5db",
    infoBg: "#2e0e05",
    infoBorder: "#2d4a6e",
    infoText: "#93c5fd",
    accent: "#e8441a",
    accentText: "#0d0d0d",
  },
} as const;

export type Tokens = {
  [K in keyof typeof tokens.light]: string;
};