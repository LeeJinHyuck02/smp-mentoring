"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Calendar, Clock, Plus, X, Trash2, Sparkles } from "lucide-react";
import { formatDateKorean } from "@/lib/utils";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName: string;
  sectionSlug: string;
  onSuccess: () => void;
}

export default function CreatePollModal({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  sectionSlug,
  onSuccess,
}: CreatePollModalProps) {
  const [title, setTitle] = useState("멘토링 시간 조율");
  const [dates, setDates] = useState<string[]>(() => {
    // 기본값: 내일부터 3일간
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d1 = tomorrow.toISOString().split("T")[0];
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d2 = tomorrow.toISOString().split("T")[0];
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d3 = tomorrow.toISOString().split("T")[0];
    return [d1, d2, d3];
  });
  const [newDateInput, setNewDateInput] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("20:00");
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddDate = () => {
    if (!newDateInput) return;
    if (dates.includes(newDateInput)) {
      setError("이미 추가된 날짜입니다.");
      return;
    }
    const updated = [...dates, newDateInput].sort();
    setDates(updated);
    setNewDateInput("");
    setError(null);
  };

  const handleRemoveDate = (targetDate: string) => {
    if (dates.length <= 1) {
      setError("최소 1개 이상의 날짜가 필요합니다.");
      return;
    }
    setDates(dates.filter((d) => d !== targetDate));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (dates.length === 0) {
      setError("최소 1개 이상의 날짜를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("schedule_polls")
        .insert({
          section_id: sectionId,
          title: title.trim(),
          dates: dates,
          start_time: startTime,
          end_time: endTime,
          slot_duration: slotDuration,
          is_closed: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "스케줄 투표 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 block leading-tight">
              [{sectionName}]
            </span>
            <h3 className="text-base font-bold text-slate-900">새 시간표 조율 투표 개설</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 투표 제목 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              투표 제목 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 3주차 보강 일정 조율"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>

          {/* 조율 대상 날짜 목록 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              조율할 날짜 목록 <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {dates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100"
                >
                  {formatDateKorean(d)}
                  <button
                    type="button"
                    onClick={() => handleRemoveDate(d)}
                    className="text-indigo-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* 날짜 추가 인풋 */}
            <div className="flex gap-2">
              <input
                type="date"
                value={newDateInput}
                onChange={(e) => setNewDateInput(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddDate}
                className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition active:scale-95"
              >
                + 날짜 추가
              </button>
            </div>
          </div>

          {/* 시간대 범위 & 슬롯 단위 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs text-slate-700 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                종료 시간
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs text-slate-700 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                간격 단위
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs text-slate-700 focus:border-indigo-500 outline-none bg-white"
              >
                <option value={30}>30분</option>
                <option value={60}>60분 (1시간)</option>
              </select>
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
              <Sparkles className="w-4 h-4" />
              {isLoading ? "개설 중..." : "투표 개설하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

