"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "score-keeper.theme";
type Theme = "dark" | "light";

const setDocumentTheme = (theme: Theme) => {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
};

const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") return "dark";
  if (window.matchMedia?.("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const nextTheme = stored === "light" || stored === "dark" ? stored : getPreferredTheme();
    setTheme(nextTheme);
    setDocumentTheme(nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    setDocumentTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      className="rounded-md bg-[var(--surface-1)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
