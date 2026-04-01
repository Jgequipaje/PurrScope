"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  // Persist and apply to <html> element
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

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
    btnActive: "#2563eb",
    btnActiveTxt: "#ffffff",
    btnIdle: "#f3f4f6",
    btnIdleTxt: "#374151",
    infoBg: "#eff6ff",
    infoBorder: "#bfdbfe",
    infoText: "#1d4ed8",
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
    btnActive: "#3b82f6",
    btnActiveTxt: "#ffffff",
    btnIdle: "#2e2e2e",
    btnIdleTxt: "#d1d5db",
    infoBg: "#1e2a3a",
    infoBorder: "#2d4a6e",
    infoText: "#93c5fd",
  },
} as const;

export type Tokens = {
  [K in keyof typeof tokens.light]: string;
};
