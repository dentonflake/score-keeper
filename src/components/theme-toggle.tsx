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
      className="inline-flex items-center justify-center rounded-md bg-[var(--surface-1)] px-4 py-3 text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path
            fill="currentColor"
            d="M12 17.25a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5ZM12 1.5l1.6 3.1h-3.2L12 1.5Zm0 21l-1.6-3.1h3.2L12 22.5Zm-10.5-10.5 3.1-1.6v3.2L1.5 12Zm21 0-3.1 1.6v-3.2L22.5 12ZM4.2 4.2 7 5.6 5.6 7 4.2 4.2Zm15.6 15.6-2.8-1.4 1.4-1.4 1.4 2.8ZM19.8 4.2 18.4 7 17 5.6 19.8 4.2ZM4.2 19.8 5.6 17 7 18.4 4.2 19.8Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
          <path
            fill="currentColor"
            d="M21.5 14.3A8.9 8.9 0 1 1 9.7 2.5a.9.9 0 0 1 .98 1.32 7 7 0 0 0 9.2 9.2.9.9 0 0 1 1.32.98Z"
          />
        </svg>
      )}
    </button>
  );
}
