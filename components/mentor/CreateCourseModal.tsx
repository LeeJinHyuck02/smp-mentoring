"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { BookOpen, X, Plus } from "lucide-react";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentorId: string;
  onSuccess: () => void;
}

export default function CreateCourseModal({
  isOpen,
  onClose,
  mentorId,
  onSuccess,
}: CreateCourseModalProps) {
  const [semester, setSemester] = useState("2026-1");
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("courses").insert({
        mentor_id: mentorId,
        semester: semester.trim(),
        title: title.trim(),
      });

      if (insertError) throw insertError;

      setTitle("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "과목 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">새 멘토링 과목 개설</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              학기 (예: 2026-1)
            </label>
            <input
              type="text"
              required
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="2026-1"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              과목명 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: C프로그래밍 기초, 자료구조"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isLoading ? "생성 중..." : "과목 생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

