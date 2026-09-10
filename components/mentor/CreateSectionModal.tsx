"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, X, Plus, Hash } from "lucide-react";

interface CreateSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  onSuccess: () => void;
}

export default function CreateSectionModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onSuccess,
}: CreateSectionModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateAutoSlug = (inputName: string) => {
    // 자동 영문 슬러그 생성 (랜덤 4자리 접미사 포함)
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `sec-${randomSuffix}`;
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug) {
      setSlug(generateAutoSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    const finalSlug = slug.trim() || generateAutoSlug(name);

    try {
      const { error: insertError } = await supabase.from("sections").insert({
        course_id: courseId,
        name: name.trim(),
        slug: finalSlug,
      });

      if (insertError) throw insertError;

      setName("");
      setSlug("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "분반 생성 중 오류가 발생했습니다. (슬러그 중복 등)");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block leading-tight">
              [{courseTitle}]
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">새 분반 개설</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              분반 이름 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="예: 1분반 (월 14시), 화목 야간반"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              URL 접속 코드 (Slug) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                placeholder="예: c-prog-01"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition font-mono"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              멘티가 접속할 주소: <code>/s/{slug || "code"}</code>
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs text-rose-600 dark:text-rose-400 font-medium border border-rose-100 dark:border-rose-900/40">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isLoading ? "생성 중..." : "분반 생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

