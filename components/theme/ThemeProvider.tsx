"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ANTI_FOUC_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('smp_theme');
    var isDark = false;
    if (stored === 'dark') {
      isDark = true;
    } else if (stored === 'light') {
      isDark = false;
    } else {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // 1. 초기 테마 복원 및 시스템 감지
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("smp_theme") as Theme | null;
      const initialTheme: Theme =
        stored === "light" || stored === "dark" || stored === "system"
          ? stored
          : "system";
      setThemeState(initialTheme);

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const isSystemDark = mediaQuery.matches;
      const isDark =
        initialTheme === "dark" || (initialTheme === "system" && isSystemDark);

      setResolvedTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    } catch {
      // localStorage 불가 환경 fallback
    }
  }, []);

  // 2. 테마 변경 및 시스템 환경 변화 리스너 등록
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = () => {
      const isSystemDark = mediaQuery.matches;
      const isDark =
        theme === "dark" || (theme === "system" && isSystemDark);

      setResolvedTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    };

    updateTheme();

    const handleSystemChange = () => {
      if (theme === "system") {
        updateTheme();
      }
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [theme, mounted]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("smp_theme", newTheme);
    } catch {
      // ignore
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

