"use client";

import React, { useState, useMemo } from "react";
import { formatTimeKorean, formatDayOrDateKorean, generateTimeSlots, isMentorBlockedSlot, cn } from "@/lib/utils";
import { ScheduleSubmission } from "@/types/database";
import { CheckCircle, Info } from "lucide-react";

interface ScheduleHeatmapProps {
  dates: string[];
  startTime: string;
  endTime: string;
  slotDuration?: number;
  submissions: ScheduleSubmission[];
  confirmedSlot?: { date: string; start: string; end?: string } | null;
  onConfirmSlot?: (date: string, time: string) => void;
  isMentor?: boolean;
}

export default function ScheduleHeatmap({
  dates,
  startTime,
  endTime,
  slotDuration = 30,
  submissions,
  confirmedSlot,
  onConfirmSlot,
  isMentor = false,
}: ScheduleHeatmapProps) {
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);
  const totalCount = submissions.length;

  const finalEndTimeStr = useMemo(() => {
    if (endTime) return endTime;
    if (!timeSlots || timeSlots.length === 0) return "";
    const last = timeSlots[timeSlots.length - 1];
    const [h, m] = last.split(":").map(Number);
    const total = h * 60 + m + (slotDuration || 30);
    const endH = Math.floor(total / 60);
    const endM = total % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }, [endTime, timeSlots, slotDuration]);

  // 슬롯별 참가 가능자 집계 맵
  const slotMap = useMemo(() => {
    const map = new Map<string, string[]>();

    dates.forEach((date) => {
      timeSlots.forEach((time) => {
        map.set(`${date}T${time}`, []);
      });
    });

    submissions.forEach((sub) => {
      if (Array.isArray(sub.available_slots)) {
        sub.available_slots.forEach((slotKey) => {
          if (map.has(slotKey)) {
            map.get(slotKey)!.push(sub.participant_name);
          }
        });
      }
    });

    return map;
  }, [dates, timeSlots, submissions]);

  // 히트맵 색상 단계 계산 (초록색 농도)
  const getCellColor = (count: number) => {
    if (totalCount === 0 || count === 0) return "bg-slate-50 text-slate-400 border-slate-200/80";
    const ratio = count / totalCount;

    if (ratio === 1) return "bg-emerald-600 text-white font-bold border-emerald-700 shadow-sm";
    if (ratio >= 0.75) return "bg-emerald-500 text-white font-semibold border-emerald-600";
    if (ratio >= 0.5) return "bg-emerald-400 text-emerald-950 font-medium border-emerald-500";
    if (ratio >= 0.25) return "bg-emerald-200 text-emerald-900 border-emerald-300";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  // 현재 선택/호버된 슬롯의 상세 정보
  const activeDetails = useMemo(() => {
    if (!activeSlot) return null;
    const [date, time] = activeSlot.split("T");
    const available = slotMap.get(activeSlot) || [];
    const availableSet = new Set(available);
    const unavailable = submissions
      .map((s) => s.participant_name)
      .filter((name) => !availableSet.has(name));

    return {
      date,
      time,
      available,
      unavailable,
      isAll: totalCount > 0 && available.length === totalCount,
    };
  }, [activeSlot, slotMap, submissions, totalCount]);

  return (
    <div className="w-full">
      {/* 히트맵 범례 및 가이드 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mr-1.5">
            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 inline-block" />
            멘토 불가
          </span>
          <span className="text-[11px] text-slate-400">적음</span>
          <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200"></span>
          <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-200"></span>
          <span className="w-3.5 h-3.5 rounded bg-emerald-300 border border-emerald-400"></span>
          <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600"></span>
          <span className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-700"></span>
          <span className="text-[11px] text-emerald-700 font-bold">전원 가능</span>
        </div>
      </div>

      {/* 3. 메인 히트맵 그리드 */}
      <div className="overflow-x-auto pb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="min-w-fit p-3">
          {/* 헤더 */}
          <div className="flex border-b border-slate-200 pb-2">
            <div className="w-16 sm:w-20 shrink-0 text-center text-xs font-semibold text-slate-400 py-1">
              시간
            </div>
            {dates.map((dayOrDate) => (
              <div key={dayOrDate} className="flex-1 min-w-[76px] sm:min-w-[96px] text-center px-1">
                <div className="font-extrabold text-xs sm:text-sm text-slate-800">
                  {formatDayOrDateKorean(dayOrDate)}
                </div>
              </div>
            ))}
          </div>

          {/* 행 (시간 라벨이 30분 블록의 상단 모서리에 위치) */}
          <div className="pt-3.5 pb-2 text-xs">
            {timeSlots.map((time) => {
              const isHour = time.endsWith(":00");
              return (
                <div
                  key={time}
                  className="relative flex items-stretch h-10"
                >
                  {/* 시간 라벨: 줄이 글자를 가리지 않도록 시간 축 영역 분리 & bg-white 적용 */}
                  <div className="w-16 sm:w-20 shrink-0 relative select-none pointer-events-none">
                    <span className="absolute -top-2.5 right-2 sm:right-3 text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap bg-white px-1 z-10">
                      {formatTimeKorean(time)}
                    </span>
                  </div>

                  {/* 날짜별 셀: 상단 경계선(border-t)이 시간의 눈금선이 되며 30분 블록을 빈틈없이 채움 */}
                  {dates.map((date) => {
                    const slotKey = `${date}T${time}`;
                    const isBlocked = isMentorBlockedSlot(date, time);
                    const count = slotMap.get(slotKey)?.length || 0;
                    const isActive = activeSlot === slotKey;
                    const isConfirmed = confirmedSlot?.date === date && confirmedSlot?.start === time;

                    return (
                      <div
                        key={slotKey}
                        onClick={() => setActiveSlot(slotKey)}
                        onMouseEnter={() => setActiveSlot(slotKey)}
                        className={cn(
                          "flex-1 min-w-[76px] sm:min-w-[96px] h-full border-r border-slate-200/80 last:border-r-0 border-t flex items-center justify-center select-none text-[11px] transition-colors duration-100",
                          isHour ? "border-t-slate-300" : "border-t-slate-200/60",
                          isBlocked
                            ? "bg-slate-100/90 text-slate-400 cursor-not-allowed font-semibold text-[10px]"
                            : cn("cursor-pointer", getCellColor(count)),
                          isActive && "ring-2 ring-indigo-500 ring-inset z-10 font-bold",
                          isConfirmed && "bg-amber-500 text-white font-extrabold"
                        )}
                        title={isBlocked ? "멘토 불가능 시간 (월·화·수·목은 18시 이후 가능)" : undefined}
                      >
                        {isBlocked ? (
                          "멘토 불가"
                        ) : isConfirmed ? (
                          <span className="flex items-center gap-0.5 text-[10px]">
                            <CheckCircle className="w-3 h-3" /> 확정
                          </span>
                        ) : count > 0 ? (
                          `${count}명`
                        ) : (
                          ""
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* 마지막 블록 바닥 모서리에 종료 시각 라벨 및 마감선 표시 */}
            {finalEndTimeStr && (
              <div className="relative flex items-start h-4">
                <div className="w-16 sm:w-20 shrink-0 relative select-none pointer-events-none">
                  <span className="absolute -top-2.5 right-2 sm:right-3 text-[11px] sm:text-xs font-medium text-slate-400 whitespace-nowrap bg-white px-1 z-10">
                    {formatTimeKorean(finalEndTimeStr)}
                  </span>
                </div>
                {dates.map((date) => (
                  <div
                    key={date}
                    className="flex-1 min-w-[76px] sm:min-w-[96px] border-t border-slate-300 border-r border-slate-200/80 last:border-r-0"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. 활성화된 슬롯 상세 팝업 / 바텀 시트 */}
      {activeDetails && (
        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100">
            <div>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base mr-2">
                {formatDayOrDateKorean(activeDetails.date)} {formatTimeKorean(activeDetails.time)}
              </span>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-bold",
                activeDetails.isAll ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
              )}>
                {activeDetails.available.length} / {totalCount}명 가능
              </span>
            </div>

            {/* 멘토 전용: 이 시간으로 확정하기 버튼 */}
            {isMentor && onConfirmSlot && (
              <button
                type="button"
                onClick={() => onConfirmSlot(activeDetails.date, activeDetails.time)}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                이 시간으로 확정
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* 가능자 명단 */}
            <div className="rounded-lg bg-white p-3 border border-emerald-100">
              <div className="font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                참여 가능 ({activeDetails.available.length}명)
              </div>
              {activeDetails.available.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeDetails.available.map((name) => (
                    <span
                      key={name}
                      className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800 border border-emerald-200/80"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400">가능한 인원 없음</span>
              )}
            </div>

            {/* 불가능자 명단 */}
            <div className="rounded-lg bg-white p-3 border border-rose-100">
              <div className="font-bold text-rose-800 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                참여 불가 ({activeDetails.unavailable.length}명)
              </div>
              {activeDetails.unavailable.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {activeDetails.unavailable.map((name) => (
                    <span
                      key={name}
                      className="rounded-md bg-rose-50 px-2 py-0.5 font-medium text-rose-700 border border-rose-200/80"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-emerald-600 font-semibold">전원 참석 가능! 🎉</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

