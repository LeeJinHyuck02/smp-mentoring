"use client";

import React from "react";
import Link from "next/link";
import { Question } from "@/types/database";
import {
  MessageSquare,
  Lock,
  ChevronRight,
  ArrowRight,
  Clock,
  Sparkles,
  MessageCircle,
} from "lucide-react";

export interface QuestionWithAnswerCount extends Question {
  answers_count?: number;
}

interface QnaPreviewCardProps {
  slug: string;
  questions: QuestionWithAnswerCount[];
  isLoading: boolean;
}

// 시간 포맷팅 헬퍼
function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "방금 전";
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function QnaPreviewCard({
  slug,
  questions,
  isLoading,
}: QnaPreviewCardProps) {
  const qnaUrl = `/s/${slug}/qna`;

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all">
      {/* 카드 상단 헤더 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              Q&A
            </h2>
          </div>
        </div>
      </div>

      {/* 카드 본문: 로딩 / 빈 상태 / 질문 목록 */}
      <div className="pt-4">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <Link
            href={qnaUrl}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 py-8 text-center hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 transition group"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition mb-2">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
              아직 등록된 질문이 없습니다
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              궁금한 점이 있다면 첫 번째 질문을 남겨보세요!
            </p>
          </Link>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {questions.map((q) => (
              <Link
                key={q.id}
                href={qnaUrl}
                className="group block py-3 first:pt-1 last:pb-1 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-xl px-2 -mx-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {/* 상태 배지 */}
                      {q.status === "resolved" ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/20 dark:ring-emerald-500/30">
                          답변 완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-600/20 dark:ring-amber-500/30">
                          답변 대기
                        </span>
                      )}

                      {/* 비밀글 배지 */}
                      {q.is_secret && (
                        <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                          <Lock className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                          비밀글
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium ml-auto flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(q.created_at)}
                      </span>
                    </div>

                    {/* 제목 */}
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                      {q.is_secret ? "비밀 질문입니다 🔒" : q.title}
                    </h3>

                    {/* 하단 작성자 정보 & 댓글 수 */}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>{q.is_anonymous ? "익명 멘티" : q.author_name}</span>
                      {typeof q.answers_count === "number" && q.answers_count > 0 && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-bold">
                            <MessageCircle className="w-3 h-3" />
                            답변/댓글 {q.answers_count}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0 mt-3" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 하단 세션 바로가기 CTA 버튼 */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Link
            href={qnaUrl}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-indigo-100 dark:shadow-none transition active:scale-[0.99]"
          >
            <span>Q&A 세션으로 이동하기</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

