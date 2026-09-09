"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { formatTimeKorean, formatDayOrDateKorean, generateTimeSlots, isMentorBlockedSlot, cn } from "@/lib/utils";
import { Check, Clock } from "lucide-react";

interface ScheduleGridProps {
  dates: string[]; // e.g. ["2026-09-15", "2026-09-16", ...]
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "21:00"
  slotDuration?: number; // 30
  selectedSlots: string[]; // ["2026-09-15T09:00", ...]
  onChange: (slots: string[]) => void;
  isReadOnly?: boolean;
  headerAction?: React.ReactNode;
}

export default function ScheduleGrid({
  dates,
  startTime,
  endTime,
  slotDuration = 30,
  selectedSlots,
  onChange,
  isReadOnly = false,
  headerAction,
}: ScheduleGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const gridRef = useRef<HTMLDivElement>(null);

  // 모바일 터치 후 브라우저 가상 마우스 이벤트(synthetic mousedown) 중복 방지 및 드래그 중복 방지용 ref
  const lastTouchTime = useRef(0);
  const lastHandledSlotRef = useRef<string | null>(null);

  // 부모 상태 비동기 갱신 중에도 드래그 누적 선택이 정확히 유지되도록 ref 동기화
  const selectedSlotsRef = useRef(selectedSlots);
  useEffect(() => {
    selectedSlotsRef.current = selectedSlots;
  }, [selectedSlots]);

  const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);
  const selectedSet = new Set(selectedSlots);

  // 셀 토글 처리 (멘토 불가 슬롯은 원천 차단)
  const toggleSlot = useCallback(
    (slotKey: string, targetMode?: "select" | "deselect") => {
      if (isReadOnly) return;
      const [day, time] = slotKey.split("T");
      if (isMentorBlockedSlot(day, time)) return;

      const currentSet = new Set(selectedSlotsRef.current);
      const isCurrentlySelected = currentSet.has(slotKey);
      const mode = targetMode ?? (isCurrentlySelected ? "deselect" : "select");

      if (mode === "select") {
        currentSet.add(slotKey);
      } else {
        currentSet.delete(slotKey);
      }

      const nextSlots = Array.from(currentSet);
      selectedSlotsRef.current = nextSlots;
      onChange(nextSlots);
    },
    [isReadOnly, onChange]
  );

  // 마우스 드래그 시작 (PC 전용: 모바일 터치 후 생성되는 가상 mousedown 무시)
  const handleMouseDown = (slotKey: string) => {
    if (isReadOnly) return;
    if (Date.now() - lastTouchTime.current < 700) return;

    const [day, time] = slotKey.split("T");
    if (isMentorBlockedSlot(day, time)) return;

    const isCurrentlySelected = selectedSlotsRef.current.includes(slotKey);
    const mode = isCurrentlySelected ? "deselect" : "select";
    setDragMode(mode);
    setIsDragging(true);
    lastHandledSlotRef.current = slotKey;
    toggleSlot(slotKey, mode);
  };

  // 마우스 진입 (PC 드래그 중)
  const handleMouseEnter = (slotKey: string) => {
    if (!isDragging || isReadOnly) return;
    if (Date.now() - lastTouchTime.current < 700) return;

    const [day, time] = slotKey.split("T");
    if (isMentorBlockedSlot(day, time)) return;

    if (slotKey !== lastHandledSlotRef.current) {
      lastHandledSlotRef.current = slotKey;
      toggleSlot(slotKey, dragMode);
    }
  };

  // 마우스 업 (전역)
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
      lastHandledSlotRef.current = null;
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // 모바일 터치 드래그 지원
  const handleTouchStart = (e: React.TouchEvent, slotKey: string) => {
    if (isReadOnly) return;
    lastTouchTime.current = Date.now();

    const [day, time] = slotKey.split("T");
    if (isMentorBlockedSlot(day, time)) {
      setIsDragging(false);
      return;
    }

    const isCurrentlySelected = selectedSlotsRef.current.includes(slotKey);
    const mode = isCurrentlySelected ? "deselect" : "select";
    setDragMode(mode);
    setIsDragging(true);
    lastHandledSlotRef.current = slotKey;
    toggleSlot(slotKey, mode);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isReadOnly) return;
    lastTouchTime.current = Date.now();

    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    if (targetElement) {
      const slotEl = targetElement.closest("[data-slot]");
      const slotKey = slotEl?.getAttribute("data-slot");
      if (slotKey && slotKey !== lastHandledSlotRef.current) {
        lastHandledSlotRef.current = slotKey;
        const [day, time] = slotKey.split("T");
        if (!isMentorBlockedSlot(day, time)) {
          toggleSlot(slotKey, dragMode);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    lastTouchTime.current = Date.now();
    lastHandledSlotRef.current = null;
    setIsDragging(false);
  };

  const toggleFullDay = (date: string) => {
    if (isReadOnly) return;
    const availableDaySlots = timeSlots
      .filter((t) => !isMentorBlockedSlot(date, t))
      .map((t) => `${date}T${t}`);

    if (availableDaySlots.length === 0) return;

    const isAllSelected = availableDaySlots.every((s) => selectedSet.has(s));
    const newSet = new Set(selectedSet);

    if (isAllSelected) {
      availableDaySlots.forEach((s) => newSet.delete(s));
    } else {
      availableDaySlots.forEach((s) => newSet.add(s));
    }
    onChange(Array.from(newSet));
  };

  const finalEndTimeStr = React.useMemo(() => {
    if (endTime) return endTime;
    if (!timeSlots || timeSlots.length === 0) return "";
    const last = timeSlots[timeSlots.length - 1];
    const [h, m] = last.split(":").map(Number);
    const total = h * 60 + m + (slotDuration || 30);
    const endH = Math.floor(total / 60);
    const endM = total % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }, [endTime, timeSlots, slotDuration]);

  return (
    <div className="w-full select-none" ref={gridRef}>
      {/* 멘토 일정 안내 & 범례 */}
      <div className="mb-3 rounded-xl bg-slate-100/90 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-600 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium">
          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            <strong>월~목 18시 이후</strong> · <strong>금 13시 이후</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300 inline-block" />
            멘토 불가
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
            내 선택
          </span>
          {headerAction && <div className="ml-1 shrink-0">{headerAction}</div>}
        </div>
      </div>

      {/* 반응형 가로 스크롤 컨테이너 (모바일 5일 기준 가로 스크롤 없이 쏙 들어감) */}
      <div className="overflow-x-auto pb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-fit sm:min-w-full p-2 sm:p-3">
          {/* 테이블 헤더: 요일 */}
          <div className="flex border-b border-slate-200 pb-2 touch-pan-y">
            <div className="w-14 sm:w-20 shrink-0 text-center text-xs font-semibold text-slate-400 py-1">
              시간
            </div>
            {dates.map((dayOrDate) => (
              <div key={dayOrDate} className="flex-1 min-w-[50px] sm:min-w-[96px] text-center px-0.5 sm:px-1">
                <div className="font-extrabold text-[11px] sm:text-sm text-slate-800">
                  {formatDayOrDateKorean(dayOrDate)}
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => toggleFullDay(dayOrDate)}
                    className="mt-1 text-[10px] sm:text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline font-medium block mx-auto active:scale-95"
                  >
                    하루 전체
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 시간표 매트릭스 그리드: 전체 컨테이너는 touch-pan-y로 상하 스크롤을 허용하고, 선택 가능 셀에만 touch-none을 적용 */}
          <div
            className="pt-3.5 pb-2 text-xs touch-pan-y"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {timeSlots.map((time) => {
              const isHour = time.endsWith(":00");
              return (
                <div
                  key={time}
                  className="relative flex items-stretch h-10"
                >
                  {/* 시간 라벨 */}
                  <div className="w-14 sm:w-20 shrink-0 relative select-none pointer-events-none touch-pan-y">
                    <span className="absolute -top-2.5 right-1.5 sm:right-3 text-[10px] sm:text-xs font-medium text-slate-500 whitespace-nowrap bg-white px-0.5 sm:px-1 z-10">
                      {formatTimeKorean(time)}
                    </span>
                  </div>

                  {/* 날짜별 셀 */}
                  {dates.map((date) => {
                    const slotKey = `${date}T${time}`;
                    const isSelected = selectedSet.has(slotKey);
                    const isBlocked = isMentorBlockedSlot(date, time);

                    return (
                      <div
                        key={slotKey}
                        data-slot={slotKey}
                        onMouseDown={() => handleMouseDown(slotKey)}
                        onMouseEnter={() => handleMouseEnter(slotKey)}
                        onTouchStart={(e) => handleTouchStart(e, slotKey)}
                        className={cn(
                          "flex-1 min-w-[50px] sm:min-w-[96px] h-full border-r border-slate-200/80 last:border-r-0 border-t flex items-center justify-center select-none transition-colors duration-75",
                          isHour ? "border-t-slate-300" : "border-t-slate-200/60",
                          isBlocked || isReadOnly ? "touch-pan-y" : "touch-none",
                          isBlocked
                            ? "bg-slate-100/90 text-slate-400 cursor-not-allowed text-[9px] sm:text-[10px] font-semibold"
                            : isSelected
                            ? "bg-emerald-500 text-white font-bold cursor-pointer"
                            : "bg-white hover:bg-emerald-50/70 text-slate-400 cursor-pointer",
                          isReadOnly && !isBlocked && "cursor-default hover:bg-transparent"
                        )}
                        title={isBlocked ? "멘토 불가 (월~목 18시 이후 가능)" : undefined}
                      >
                        {isBlocked ? null : isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[3] pointer-events-none" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* 마지막 블록 바닥 모서리에 종료 시각 라벨 및 마감선 표시 */}
            {finalEndTimeStr && (
              <div className="relative flex items-start h-4 touch-pan-y">
                <div className="w-14 sm:w-20 shrink-0 relative select-none pointer-events-none touch-pan-y">
                  <span className="absolute -top-2.5 right-1.5 sm:right-3 text-[10px] sm:text-xs font-medium text-slate-400 whitespace-nowrap bg-white px-0.5 sm:px-1 z-10">
                    {formatTimeKorean(finalEndTimeStr)}
                  </span>
                </div>
                {dates.map((date) => (
                  <div
                    key={date}
                    className="flex-1 min-w-[50px] sm:min-w-[96px] border-t border-slate-300 border-r border-slate-200/80 last:border-r-0"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 선택된 총 시간 요약 */}
      {!isReadOnly && (
        <div className="mt-3 flex items-center justify-between text-xs sm:text-sm text-slate-600 font-medium px-1">
          <span>
            선택된 시간:{" "}
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

