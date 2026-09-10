"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Calendar, Clock, Plus, X, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName: string;
  sectionSlug: string;
  onSuccess: () => void;
}

const ALL_WEEKDAYS = ["월", "화", "수", "목", "금"];

export default function CreatePollModal({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  sectionSlug,
  onSuccess,
}: CreatePollModalProps) {
  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["월", "화", "수", "목", "금"]);
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("22:00");
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length <= 1) {
        setError("최소 1개 이상의 요일을 선택해야 합니다.");
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      // 월화수목금 순서 유지
      const order = ["월", "화", "수", "목", "금"];
      const newDays = [...selectedDays, day].sort(
        (a, b) => order.indexOf(a) - order.indexOf(b)
      );
      setSelectedDays(newDays);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (selectedDays.length === 0) {
      setError("최소 1개 이상의 요일을 선택해주세요.");
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
          dates: selectedDays, // ['월', '화', '수', '목', '금']
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
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block leading-tight">
              [{sectionName}]
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">정기 멘토링 시간 조율 개설</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 투표 제목 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              투표 제목 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 정기 멘토링 시간 결정"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition"
            />
          </div>

          {/* 요일 선택 (월~금) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                조율할 요일 (기본: 월~금) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">클릭하여 선택/해제</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {ALL_WEEKDAYS.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "py-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1",
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm scale-[1.02]"
                        : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {day}요일
                  </button>
                );
              })}
            </div>
          </div>

          {/* 시간대 범위 & 슬롯 단위 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                min="13:00"
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-xs text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                종료 시간
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-xs text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                단위 간격
              </label>
              <select
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-2 text-xs text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none"
              >
                <option value={30}>30분</option>
                <option value={60}>60분 (1시간)</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            💡 13시 이전은 노출되지 않으며, 월·목요일은 18시 이전이 자동으로 선택 불가 처리됩니다.
          </p>

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
              <Sparkles className="w-4 h-4" />
              {isLoading ? "개설 중..." : "투표 개설하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
