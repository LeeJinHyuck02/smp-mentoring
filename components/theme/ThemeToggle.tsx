"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, Theme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const options: { value: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      value: "light",
      label: "라이트 모드",
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      desc: "밝은 화면 유지",
    },
    {
      value: "dark",
      label: "다크 모드",
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
      desc: "어두운 화면 유지",
    },
    {
      value: "system",
      label: "시스템 설정",
      icon: <Monitor className="w-4 h-4 text-slate-500 dark:text-slate-400" />,
      desc: "디바이스 설정 연동",
    },
  ];

  if (!mounted) {
    // SSR 단계 깜빡임 방지용 플레이스홀더
    return (
      <div
        className={`h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 ${className}`}
        aria-hidden="true"
      />
    );
  }

  // 버튼에 노출될 현재 아이콘
  const getCurrentIcon = () => {
    if (theme === "system") {
      return (
        <Monitor className="w-4 h-4 text-slate-600 dark:text-slate-300" />
      );
    }
    if (resolvedTheme === "dark") {
      return <Moon className="w-4 h-4 text-indigo-400" />;
    }
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        title="테마 설정 (라이트 / 다크 / 시스템)"
        aria-label="테마 설정"
        aria-expanded={isOpen}
      >
        {getCurrentIcon()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl ring-1 ring-black/5 dark:ring-white/10 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              테마 선택
            </span>
          </div>

          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center">
                      {opt.icon}
                    </span>
                    <div className="text-left leading-tight">
                      <div>{opt.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        {opt.desc}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

