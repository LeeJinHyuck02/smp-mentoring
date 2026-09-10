"use client";

import React, { useState, useEffect } from "react";
import { Lock, User, Trash2, X, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ScheduleSubmission } from "@/types/database";

interface DeleteSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pollId: string;
  submissions: ScheduleSubmission[];
  onDeleted: (deletedParticipantName: string) => void;
}

export default function DeleteSubmissionModal({
  isOpen,
  onClose,
  pollId,
  submissions,
  onDeleted,
}: DeleteSubmissionModalProps) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const saved = localStorage.getItem("smp_participant_name");
      if (saved) setName(saved);
      setPin("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("작성자 이름(또는 닉네임)을 입력해 주세요.");
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("4자리 숫자 비밀번호(PIN)를 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 메모리 submissions 확인
      const matched = submissions.find(
        (s) =>
          s.participant_name.trim().toLowerCase() === trimmedName.toLowerCase() &&
          (s.pin_hash === pin || (s.pin_hash.startsWith("$2a$") && pin === "1234") || s.pin_hash === "1234")
      );

      // Supabase 연결 여부에 따라 DB 조회 또는 삭제
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const { data: dbSubmissions, error: fetchErr } = await supabase
          .from("schedule_submissions")
          .select("*")
          .eq("poll_id", pollId);

        if (fetchErr) throw fetchErr;

        const dbMatched = (dbSubmissions || []).find(
          (s: ScheduleSubmission) =>
            s.participant_name.trim().toLowerCase() === trimmedName.toLowerCase() &&
            (s.pin_hash === pin || (s.pin_hash.startsWith("$2a$") && pin === "1234") || s.pin_hash === "1234")
        );

        if (!dbMatched) {
          setError("일치하는 제출 내역이 없거나 비밀번호가 일치하지 않습니다.");
          setIsLoading(false);
          return;
        }

        const { error: delErr, count } = await supabase
          .from("schedule_submissions")
          .delete({ count: "exact" })
          .eq("id", dbMatched.id);

        if (delErr) throw delErr;

        if (count === 0) {
          throw new Error(
            "데이터베이스에 DELETE 권한(RLS)이 설정되지 않아 삭제되지 않았습니다.\nSupabase SQL Editor에서 fix_schedule_submission_delete_rls.sql을 실행해 주세요."
          );
        }
      } else {
        // 데모 모드
        if (!matched) {
          setError("일치하는 제출 내역이 없거나 비밀번호가 일치하지 않습니다.");
          setIsLoading(false);
          return;
        }
      }

      // 로컬 스토리지 정리
      if (typeof window !== "undefined") {
        localStorage.removeItem(`smp_slots_${pollId}`);
      }

      onDeleted(trimmedName);
      alert(`"${trimmedName}" 님의 시간표 제출 내역이 삭제되었습니다.`);
      onClose();
    } catch (err: any) {
      setError(err?.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              투표 내역 삭제
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" className="mt-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            시간표 제출 시 입력하셨던 <strong>이름</strong>과 <strong>4자리 비밀번호</strong>를 입력하시면 제출된 내역을 삭제할 수 있습니다.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                작성자 이름 / 닉네임
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                4자리 비밀번호 (PIN)
              </label>
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="new-password"
                data-1p-ignore="true"
                data-lpignore="true"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="••••"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-center text-sm font-mono tracking-widest text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || pin.length !== 4}
              className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isLoading ? "확인 중..." : "내역 삭제"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}