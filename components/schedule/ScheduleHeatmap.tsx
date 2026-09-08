"use client";

import React, { useState, useMemo } from "react";
import { formatTimeKorean, formatDayOrDateKorean, generateTimeSlots, isMentorBlockedSlot, cn } from "@/lib/utils";
import { ScheduleSubmission } from "@/types/database";
import { Users, Trophy, CheckCircle, Info, Sparkles } from "lucide-react";

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

  // 최적의 추천 시간대 (Top 3) 계산 (멘토 불가 시간은 원천 제외)
  const topSlots = useMemo(() => {
    if (totalCount === 0) return [];
    const scoredSlots: { slotKey: string; count: number; date: string; time: string; names: string[] }[] = [];

    slotMap.forEach((names, slotKey) => {
      const [date, time] = slotKey.split("T");
      // 월/목 13:00~18:00 등 멘토 불가 시간대는 추천에서 제외
      if (isMentorBlockedSlot(date, time)) return;

      if (names.length > 0) {
        scoredSlots.push({
          slotKey,
          count: names.length,
          date,
          time,
          names,
        });
      }
    });

    // 참가자 수 많은 순 -> 날짜 빠른 순 정렬
    scoredSlots.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.slotKey.localeCompare(b.slotKey);
    });

    return scoredSlots.slice(0, 3);
  }, [slotMap, totalCount]);

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
      {/* 1. 최적 시간 추천 Top 3 배너 */}
      {topSlots.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4 sm:p-5 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Trophy className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              추천 멘토링 시간대 (Top 3)
            </h3>
            <span className="ml-auto text-xs font-medium text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> 총 {totalCount}명 제출
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {topSlots.map((item, index) => {
              const isAll = item.count === totalCount;
              return (
                <div
                  key={item.slotKey}
                  onClick={() => setActiveSlot(item.slotKey)}
                  className={cn(
                    "cursor-pointer rounded-xl p-3 border transition-all hover:shadow-md active:scale-95 relative overflow-hidden",
                    index === 0
                      ? "bg-white border-emerald-300 ring-2 ring-emerald-500/20"
                      : "bg-white/80 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={cn(
                      "font-extrabold px-1.5 py-0.5 rounded text-[11px]",
                      index === 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                    )}>
                      #{index + 1}위
                    </span>
                    <span className={cn(
                      "font-bold text-xs",
                      isAll ? "text-emerald-600 flex items-center gap-0.5" : "text-slate-600"
                    )}>
                      {isAll && <Sparkles className="w-3 h-3 text-emerald-500" />}
                      {item.count}/{totalCount}명 가능
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 mt-1">
                    {formatDayOrDateKorean(item.date)}
                  </div>
                  <div className="text-xs text-indigo-600 font-semibold mt-0.5">
                    {formatTimeKorean(item.time)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. 히트맵 범례 및 가이드 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>셀을 클릭하거나 마우스를 올리면 <strong>누가 가능한지</strong> 볼 수 있습니다.</span>
        </div>
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

          {/* 행 */}
          <div className="divide-y divide-slate-100 text-xs">
            {timeSlots.map((time) => {
              const isHour = time.endsWith(":00");
              return (
                <div
                  key={time}
                  className={cn("flex items-center", isHour ? "bg-slate-50/50" : "bg-white")}
                >
                  <div className="w-16 sm:w-20 shrink-0 text-right pr-2 sm:pr-3 py-2 text-[11px] sm:text-xs font-medium text-slate-500">
                    {formatTimeKorean(time)}
                  </div>

                  {dates.map((date) => {
                    const slotKey = `${date}T${time}`;
                    const isBlocked = isMentorBlockedSlot(date, time);

                    if (isBlocked) {
                      return (
                        <div
                          key={slotKey}
                          className="flex-1 min-w-[76px] sm:min-w-[96px] h-9 mx-0.5 my-0.5 rounded border border-slate-200/80 bg-slate-100/90 text-slate-400 flex items-center justify-center cursor-not-allowed select-none text-[10px] font-semibold"
                          title="멘토 불가능 시간 (월·목은 18시 이후 가능)"
                        >
                          멘토 불가
                        </div>
                      );
                    }

                    const count = slotMap.get(slotKey)?.length || 0;
                    const isActive = activeSlot === slotKey;
                    const isConfirmed = confirmedSlot?.date === date && confirmedSlot?.start === time;

                    return (
                      <div
                        key={slotKey}
                        onClick={() => setActiveSlot(slotKey)}
                        onMouseEnter={() => setActiveSlot(slotKey)}
                        className={cn(
                          "flex-1 min-w-[76px] sm:min-w-[96px] h-9 mx-0.5 my-0.5 rounded transition-all duration-100 flex items-center justify-center cursor-pointer border select-none text-[11px]",
                          getCellColor(count),
                          isActive && "ring-2 ring-indigo-500 ring-offset-1 z-10 scale-105",
                          isConfirmed && "ring-2 ring-amber-500 bg-amber-500 text-white font-extrabold"
                        )}
                      >
                        {isConfirmed ? (
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
                이 시간으로 최종 확정
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* 가능자 명단 */}
            <div className="rounded-lg bg-white p-3 border border-emerald-100">
              <div className="font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                가능한 멘티 ({activeDetails.available.length}명)
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
                <span className="text-slate-400">가능한 인원이 없습니다.</span>
              )}
            </div>

            {/* 불가능자 명단 */}
            <div className="rounded-lg bg-white p-3 border border-rose-100">
              <div className="font-bold text-rose-800 mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                불가능한 멘티 ({activeDetails.unavailable.length}명)
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

