"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { formatTimeKorean, formatDateKorean, generateTimeSlots, cn } from "@/lib/utils";
import { Check, Sparkles, RotateCcw, Clock } from "lucide-react";

interface ScheduleGridProps {
  dates: string[]; // e.g. ["2026-09-15", "2026-09-16", ...]
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "21:00"
  slotDuration?: number; // 30
  selectedSlots: string[]; // ["2026-09-15T09:00", ...]
  onChange: (slots: string[]) => void;
  isReadOnly?: boolean;
}

export default function ScheduleGrid({
  dates,
  startTime,
  endTime,
  slotDuration = 30,
  selectedSlots,
  onChange,
  isReadOnly = false,
}: ScheduleGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const gridRef = useRef<HTMLDivElement>(null);

  const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);
  const selectedSet = new Set(selectedSlots);

  // 셀 토글 처리
  const toggleSlot = useCallback((slotKey: string, targetMode?: "select" | "deselect") => {
    if (isReadOnly) return;
    const isCurrentlySelected = selectedSet.has(slotKey);
    const mode = targetMode ?? (isCurrentlySelected ? "deselect" : "select");

    const newSet = new Set(selectedSet);
    if (mode === "select") {
      newSet.add(slotKey);
    } else {
      newSet.delete(slotKey);
    }
    onChange(Array.from(newSet));
  }, [isReadOnly, selectedSet, onChange]);

  // 마우스 드래그 시작 (PC)
  const handleMouseDown = (slotKey: string) => {
    if (isReadOnly) return;
    const mode = selectedSet.has(slotKey) ? "deselect" : "select";
    setDragMode(mode);
    setIsDragging(true);
    toggleSlot(slotKey, mode);
  };

  // 마우스 진입 (PC 드래그 중)
  const handleMouseEnter = (slotKey: string) => {
    if (!isDragging || isReadOnly) return;
    toggleSlot(slotKey, dragMode);
  };

  // 마우스 업 (전역)
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // 모바일 터치 드래그 지원
  const handleTouchStart = (e: React.TouchEvent, slotKey: string) => {
    if (isReadOnly) return;
    const mode = selectedSet.has(slotKey) ? "deselect" : "select";
    setDragMode(mode);
    setIsDragging(true);
    toggleSlot(slotKey, mode);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isReadOnly) return;
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    if (targetElement) {
      const slotKey = targetElement.getAttribute("data-slot");
      if (slotKey) {
        toggleSlot(slotKey, dragMode);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 빠른 선택 프리셋 (멘티 편의 기능)
  const selectRangeForDate = (date: string, startH: number, endH: number) => {
    if (isReadOnly) return;
    const newSet = new Set(selectedSet);
    timeSlots.forEach((time) => {
      const [h] = time.split(":").map(Number);
      if (h >= startH && h < endH) {
        newSet.add(`${date}T${time}`);
      }
    });
    onChange(Array.from(newSet));
  };

  const toggleFullDay = (date: string) => {
    if (isReadOnly) return;
    const daySlots = timeSlots.map((t) => `${date}T${t}`);
    const isAllSelected = daySlots.every((s) => selectedSet.has(s));
    const newSet = new Set(selectedSet);

    if (isAllSelected) {
      daySlots.forEach((s) => newSet.delete(s));
    } else {
      daySlots.forEach((s) => newSet.add(s));
    }
    onChange(Array.from(newSet));
  };

  const clearAll = () => {
    if (isReadOnly) return;
    onChange([]);
  };

  return (
    <div className="w-full select-none" ref={gridRef}>
      {/* 멘티 빠른 프리셋 버튼 모음 (모바일 친화) */}
      {!isReadOnly && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-indigo-50/70 p-3 border border-indigo-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 mr-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            빠른 선택:
          </div>
          <button
            type="button"
            onClick={() => {
              dates.forEach((d) => selectRangeForDate(d, 13, 18));
            }}
            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition active:scale-95"
          >
            오후 (13~18시) 전체 선택
          </button>
          <button
            type="button"
            onClick={() => {
              dates.forEach((d) => selectRangeForDate(d, 18, 22));
            }}
            className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50 transition active:scale-95"
          >
            야간 (18~22시) 전체 선택
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            전체 비우기
          </button>
        </div>
      )}

      {/* 조율 안내 팁 */}
      {!isReadOnly && (
        <p className="mb-3 text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>가능한 시간대를 <strong>클릭</strong>하거나 <strong>손가락으로 드래그</strong>하여 칠해주세요. (다시 누르면 취소)</span>
        </p>
      )}

      {/* 반응형 가로 스크롤 컨테이너 */}
      <div className="overflow-x-auto pb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-fit p-3">
          {/* 테이블 헤더: 날짜 */}
          <div className="flex border-b border-slate-200 pb-2">
            <div className="w-16 sm:w-20 shrink-0 text-center text-xs font-semibold text-slate-400 py-1">
              시간
            </div>
            {dates.map((date) => (
              <div key={date} className="flex-1 min-w-[76px] sm:min-w-[96px] text-center px-1">
                <div className="font-bold text-xs sm:text-sm text-slate-800">
                  {formatDateKorean(date)}
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => toggleFullDay(date)}
                    className="mt-1 text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-medium block mx-auto active:scale-95"
                  >
                    하루 전체
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 시간표 매트릭스 그리드 */}
          <div
            className="divide-y divide-slate-100 text-xs"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {timeSlots.map((time, idx) => {
              const isHour = time.endsWith(":00");
              return (
                <div
                  key={time}
                  className={cn(
                    "flex items-center",
                    isHour ? "bg-slate-50/50" : "bg-white"
                  )}
                >
                  {/* 시간 라벨 */}
                  <div className="w-16 sm:w-20 shrink-0 text-right pr-2 sm:pr-3 py-2 text-[11px] sm:text-xs font-medium text-slate-500">
                    {formatTimeKorean(time)}
                  </div>

                  {/* 날짜별 셀 */}
                  {dates.map((date) => {
                    const slotKey = `${date}T${time}`;
                    const isSelected = selectedSet.has(slotKey);

                    return (
                      <div
                        key={slotKey}
                        data-slot={slotKey}
                        onMouseDown={() => handleMouseDown(slotKey)}
                        onMouseEnter={() => handleMouseEnter(slotKey)}
                        onTouchStart={(e) => handleTouchStart(e, slotKey)}
                        className={cn(
                          "flex-1 min-w-[76px] sm:min-w-[96px] h-9 mx-0.5 my-0.5 rounded transition-all duration-75 flex items-center justify-center cursor-pointer border select-none",
                          isSelected
                            ? "bg-emerald-500 border-emerald-600 text-white shadow-sm font-semibold scale-[0.98]"
                            : "bg-slate-50/80 border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-300 text-slate-400",
                          isReadOnly && "cursor-default hover:bg-transparent"
                        )}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 선택된 총 시간 요약 */}
      {!isReadOnly && (
        <div className="mt-3 flex items-center justify-between text-xs sm:text-sm text-slate-600 font-medium px-1">
          <span>
            선택된 타임슬롯:{" "}
            <strong className="text-emerald-600 text-base">
              {selectedSlots.length}개
            </strong>{" "}
            ({((selectedSlots.length * slotDuration) / 60).toFixed(1)}시간)
          </span>
        </div>
      )}
    </div>
  );
}

