"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase/client";
import QnaPreviewCard, {
  QuestionWithAnswerCount,
} from "@/components/mentee/QnaPreviewCard";
import PollListCard, {
  PollWithSubmissionsCount,
} from "@/components/mentee/PollListCard";
import SurveyListCard, {
  SurveyWithResponsesCount,
} from "@/components/mentee/SurveyListCard";
import {
  Share2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function MenteeHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;

  const [sectionData, setSectionData] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswerCount[]>([]);
  const [polls, setPolls] = useState<PollWithSubmissionsCount[]>([]);
  const [surveys, setSurveys] = useState<SurveyWithResponsesCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadHubData() {
      setIsLoading(true);
      try {
        // 1. 분반 및 과목 정보 조회
        const { data: sec, error: secError } = await supabase
          .from("sections")
          .select("*, courses(*)")
          .eq("slug", slug)
          .single();

        if (secError || !sec) {
          setNotFound(true);
          return;
        }

        setSectionData(sec);

        // 2. Q&A 최신 질문 (최신 4건 및 답변 수) 조회
        const { data: qData, error: qError } = await supabase
          .from("questions")
          .select("*, answers(count)")
          .eq("section_id", sec.id)
          .order("created_at", { ascending: false })
          .limit(4);

        if (!qError && qData) {
          const mappedQuestions: QuestionWithAnswerCount[] = qData.map((q: any) => {
            let count = 0;
            if (Array.isArray(q.answers)) {
              if (q.answers.length > 0 && typeof q.answers[0]?.count === "number") {
                count = q.answers[0].count;
              } else {
                count = q.answers.length;
              }
            }
            return {
              ...q,
              answers_count: count,
            };
          });
          setQuestions(mappedQuestions);
        }

        // 3. 해당 분반의 전체 시간 조율 투표 조회
        const { data: pollData, error: pollError } = await supabase
          .from("schedule_polls")
          .select("*")
          .eq("section_id", sec.id)
          .order("created_at", { ascending: false });

        if (!pollError && pollData) {
          // 각 투표별 제출자 수 취합
          const pollIds = pollData.map((p) => p.id);
          let countMap: Record<string, number> = {};

          if (pollIds.length > 0) {
            const { data: subsData } = await supabase
              .from("schedule_submissions")
              .select("poll_id")
              .in("poll_id", pollIds);

            if (subsData) {
              subsData.forEach((s: any) => {
                countMap[s.poll_id] = (countMap[s.poll_id] || 0) + 1;
              });
            }
          }

          const mappedPolls: PollWithSubmissionsCount[] = pollData.map((p) => ({
            ...p,
            submissions_count: countMap[p.id] || 0,
          }));

          setPolls(mappedPolls);
        }

        // 4. 해당 분반의 설문조사 목록 조회
        const { data: surveyData } = await supabase
          .from("surveys")
          .select("*")
          .eq("section_id", sec.id)
          .order("created_at", { ascending: false });

        if (surveyData) {
          const surveyIds = surveyData.map((s) => s.id);
          let surveyCountMap: Record<string, number> = {};

          if (surveyIds.length > 0) {
            const { data: resData } = await supabase
              .from("survey_responses")
              .select("survey_id")
              .in("survey_id", surveyIds);

            if (resData) {
              resData.forEach((r: any) => {
                surveyCountMap[r.survey_id] = (surveyCountMap[r.survey_id] || 0) + 1;
              });
            }
          }

          const mappedSurveys: SurveyWithResponsesCount[] = surveyData.map((s) => ({
            ...s,
            responses_count: surveyCountMap[s.id] || 0,
          }));

          setSurveys(mappedSurveys);
        }
      } catch (err) {
        console.error("데이터 로드 오류:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadHubData();
  }, [slug]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (notFound && !isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-xl border border-slate-100 dark:border-slate-800 max-w-sm w-full">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
            존재하지 않는 분반입니다
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            요청하신 주소(<code>/s/{slug}</code>)에 해당하는 분반이 없습니다.<br />
            멘토에게 전달받은 링크를 다시 확인해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 1. 상단 분반 전용 헤더 */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-sm shadow-sm">
              SMP
            </span>
            {sectionData ? (
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block leading-tight">
                  {sectionData.courses?.title || ""}
                </span>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                  {sectionData.name || ""}
                </h1>
              </div>
            ) : (
              <div className="space-y-1.5 py-0.5">
                <div className="h-2.5 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                <div className="h-3.5 w-14 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">링크 복사됨!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline">링크 복사</span>
                </>
              )}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. 대시보드 본문 (와이어프레임 구조) */}
      <div className="mx-auto max-w-2xl px-4 pt-5 sm:pt-6 sm:px-6 space-y-5">
        {/* [Card 1] Q&A 최신글 카드 */}
        <QnaPreviewCard
          slug={slug}
          questions={questions}
          isLoading={isLoading}
        />

        {/* [Card 2] 투표 리스트 카드 */}
        <PollListCard
          slug={slug}
          polls={polls}
          isLoading={isLoading}
        />

        {/* [Card 3] 설문조사 리스트 카드 */}
        <SurveyListCard
          slug={slug}
          surveys={surveys}
          isLoading={isLoading}
        />

        {/* 추후 기능 추가를 위한 모듈형 확장 영역 (공지사항, 자료실 등 추가 가능) */}
      </div>
    </main>
  );
}
