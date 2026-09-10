"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Section, SchedulePoll, Survey } from "@/types/database";
import {
  Calendar,
  ClipboardList,
  MessageSquare,
  Plus,
  CheckCircle2,
  Copy,
  ExternalLink,
  Trash2,
} from "lucide-react";

interface MentorSectionCardProps {
  section: Section;
  polls: SchedulePoll[];
  surveys: Survey[];
  questionStats?: {
    total: number;
    unresolved: number;
  };
  onOpenCreatePoll: () => void;
  onOpenCreateSurvey: () => void;
  onOpenSurveyResults: (surveyId: string) => void;
  onOpenQna: () => void;
  onDeletePoll: (pollId: string, title: string) => void;
  onDeleteSurvey: (surveyId: string, title: string) => void;
}

export default function MentorSectionCard({
  section,
  polls,
  surveys,
  questionStats = { total: 0, unresolved: 0 },
  onOpenCreatePoll,
  onOpenCreateSurvey,
  onOpenSurveyResults,
  onOpenQna,
  onDeletePoll,
  onDeleteSurvey,
}: MentorSectionCardProps) {
  const [activeTab, setActiveTab] = useState<"qna" | "poll" | "survey">("qna");
  const [copied, setCopied] = useState(false);

  const sectionUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${section.slug}`
      : `/s/${section.slug}`;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(sectionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between">
      <div>
        {/* 1. 분반 헤더: 분반명 + 슬러그 링크 복사 칩 + 탭별 동적 액션 버튼 */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight truncate">
              {section.name}
            </h3>

            {/* 슬러그 & 원클릭 복사 칩 */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition active:scale-95"
              title="멘티 접속 링크 복사"
            >
              <span>/s/{section.slug}</span>
              {copied ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400">
                    복사됨!
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-[10px] font-sans font-semibold text-slate-500 dark:text-slate-400">
                    복사
                  </span>
                </>
              )}
            </button>
          </div>

          {/* 현재 활성화된 탭에 맞춘 단일 Primary 액션 버튼 (신규 등록 액션) */}
          <div className="shrink-0 min-h-[30px] flex items-center">
            {activeTab === "poll" && (
              <button
                type="button"
                onClick={onOpenCreatePoll}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>투표</span>
              </button>
            )}
            {activeTab === "survey" && (
              <button
                type="button"
                onClick={onOpenCreateSurvey}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>설문</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. 세그먼트 탭 내비게이션 바 (Q&A를 가장 처음에 노출) */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 p-1 mb-3.5">
          <button
            type="button"
            onClick={() => setActiveTab("qna")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
              activeTab === "qna"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Q&A</span>
            {questionStats.unresolved > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full leading-tight bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold">
                {questionStats.unresolved}
              </span>
            ) : (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full leading-tight font-extrabold ${
                  activeTab === "qna"
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                    : "bg-slate-200/80 dark:bg-slate-600 text-slate-500 dark:text-slate-300"
                }`}
              >
                {questionStats.total}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("poll")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
              activeTab === "poll"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>시간 조율</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full leading-tight font-extrabold ${
                activeTab === "poll"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                  : "bg-slate-200/80 dark:bg-slate-600 text-slate-500 dark:text-slate-300"
              }`}
            >
              {polls.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("survey")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
              activeTab === "survey"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span>설문조사</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full leading-tight font-extrabold ${
                activeTab === "survey"
                  ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                  : "bg-slate-200/80 dark:bg-slate-600 text-slate-500 dark:text-slate-300"
              }`}
            >
              {surveys.length}
            </span>
          </button>
        </div>

        {/* 3. 탭별 상세 본문 패널 */}
        <div className="min-h-[120px]">
          {/* [Tab 1] Q&A 패널 (가장 처음에 노출) */}
          {/* [Tab 1] Q&A 패널 (가장 처음에 노출) */}
          {activeTab === "qna" && (
            <div className="rounded-xl bg-slate-50/80 dark:bg-slate-800/50 p-3.5 border border-slate-200/70 dark:border-slate-700/80 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    질의응답 현황
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    멘티들의 실시간 질문에 답변을 남겨보세요.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs shrink-0 flex-wrap justify-end">
                  {questionStats.unresolved > 0 ? (
                    <span className="inline-flex items-center rounded-lg bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-600/20 dark:ring-amber-500/30">
                      답변 대기 {questionStats.unresolved}건
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/20 dark:ring-emerald-500/30">
                      답변 완료
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-lg bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    전체 {questionStats.total}건
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenQna}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2 px-3 text-xs font-bold text-white shadow-2xs transition active:scale-[0.99]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>질문 확인 및 답변 작성하기</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
              </button>
            </div>
          )}

          {/* [Tab 2] 시간 조율 투표 목록 */}
          {activeTab === "poll" && (
            <div>
              {polls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-7 text-center rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                  <Calendar className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                    개설된 시간 조율 투표가 없습니다
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
                    멘티들에게 가능한 시간을 투표받아보세요.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenCreatePoll}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                  >
                    + 새 투표 개설하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {polls.map((poll) => {
                    const pollUrl = `/s/${section.slug}/schedule/${poll.id}`;

                    return (
                      <div
                        key={poll.id}
                        className="rounded-xl bg-slate-50/80 dark:bg-slate-800/50 p-3 border border-slate-200/70 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30 transition flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {poll.title}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{poll.dates.join(", ")}요일</span>
                            <span>•</span>
                            <span>
                              {poll.start_time || "13:00"} ~ {poll.end_time}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Link
                            href={pollUrl}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition active:scale-95"
                          >
                            <span>히트맵</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => onDeletePoll(poll.id, poll.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition active:scale-95"
                            title="시간 조율 투표 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* [Tab 3] 설문조사 목록 (시간 조율과 완전히 동일한 UI 구조 및 삭제 버튼 탑재) */}
          {activeTab === "survey" && (
            <div>
              {surveys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-7 text-center rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700">
                  <ClipboardList className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-0.5">
                    개설된 설문조사가 없습니다
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">
                    멘티들의 만족도나 의견을 수렴해보세요.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenCreateSurvey}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
                  >
                    + 새 설문 개설하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {surveys.map((srv) => (
                    <div
                      key={srv.id}
                      className="rounded-xl bg-slate-50/80 dark:bg-slate-800/50 p-3 border border-slate-200/70 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30 transition flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {srv.title}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {srv.description || "등록된 설문조사"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenSurveyResults(srv.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition active:scale-95"
                        >
                          <span>응답 분석</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSurvey(srv.id, srv.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition active:scale-95"
                          title="설문조사 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

