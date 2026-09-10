"use client";

import React from "react";
import Link from "next/link";
import { Survey } from "@/types/database";
import {
  ClipboardList,
  Users,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export interface SurveyWithResponsesCount extends Survey {
  responses_count?: number;
}

interface SurveyListCardProps {
  slug: string;
  surveys: SurveyWithResponsesCount[];
  isLoading: boolean;
}

export default function SurveyListCard({
  slug,
  surveys,
  isLoading,
}: SurveyListCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
      {/* 카드 상단 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              설문 조사
            </h2>
          </div>
        </div>
      </div>

      {/* 카드 본문: 로딩 / 빈 상태 / 설문 목록 */}
      <div className="pt-4">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : surveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-2">
              <ClipboardList className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
              현재 진행 중인 설문조사가 없습니다
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              멘토가 설문을 등록하면 이곳에 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => {
              const surveyUrl = `/s/${slug}/survey/${survey.id}`;

              return (
                <Link
                  key={survey.id}
                  href={surveyUrl}
                  className="group block rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30 hover:shadow-xs active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 상단 태그 */}
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {survey.is_closed ? (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            마감 완료
                          </span>
                        ) : null}

                        {survey.is_anonymous && (
                          <span className="inline-flex items-center gap-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                            <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            익명 설문
                          </span>
                        )}
                      </div>

                      {/* 설문 제목 */}
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                        {survey.title}
                      </h3>

                      {/* 설명 또는 참여자 수 */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                        {survey.description && (
                          <span className="truncate max-w-xs text-slate-500 dark:text-slate-400">
                            {survey.description}
                          </span>
                        )}

                        {survey.description && <span className="text-slate-300 dark:text-slate-700">•</span>}

                        <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                          <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                          참여 {survey.responses_count ?? 0}명
                        </span>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:border-indigo-300 dark:group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0 mt-2">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

