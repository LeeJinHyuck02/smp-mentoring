"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Survey, SurveyQuestion } from "@/types/database";
import {
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertCircle,
  Star,
  ShieldCheck,
  Send,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function MenteeSurveyPage({
  params,
}: {
  params: Promise<{ slug: string; surveyId: string }>;
}) {
  const resolvedParams = use(params);
  const { slug, surveyId } = resolvedParams;

  const [sectionData, setSectionData] = useState<any>(null);
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // 답변 상태 관리: questionId -> 값
  const [answers, setAnswers] = useState<
    Record<
      string,
      {
        selected_options: string[];
        text_answer: string;
        rating_value: number;
      }
    >
  >({});

  const [respondentName, setRespondentName] = useState("");

  // 1. 설문 데이터 로드
  useEffect(() => {
    async function loadSurveyData() {
      setIsLoading(true);
      try {
        // 분반 및 과목 정보 조회
        const { data: sec } = await supabase
          .from("sections")
          .select("*, courses(*)")
          .eq("slug", slug)
          .single();

        if (sec) {
          setSectionData(sec);
        }

        // 설문 정보 조회
        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("*")
          .eq("id", surveyId)
          .single();

        if (surveyError || !surveyData) {
          setNotFound(true);
          return;
        }

        setSurvey(surveyData);

        // 설문 문항 조회
        const { data: questionsData } = await supabase
          .from("survey_questions")
          .select("*")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });

        if (questionsData) {
          setQuestions(questionsData);

          // 초기 답변 맵 구성
          const initialAnswers: typeof answers = {};
          questionsData.forEach((q) => {
            initialAnswers[q.id] = {
              selected_options: [],
              text_answer: "",
              rating_value: 0,
            };
          });
          setAnswers(initialAnswers);
        }
      } catch (err) {
        console.error("설문 로드 오류:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadSurveyData();
  }, [slug, surveyId]);

  // 단일 선택 변경
  const handleSingleSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_options: [option],
      },
    }));
  };

  // 복수 선택 변경
  const handleMultipleSelect = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]?.selected_options || [];
      const updated = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];

      return {
        ...prev,
        [questionId]: {
          ...prev[questionId],
          selected_options: updated,
        },
      };
    });
  };

  // 별점 평가 변경
  const handleRatingChange = (questionId: string, rating: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        rating_value: rating,
      },
    }));
  };

  // 주관식 텍스트 변경
  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text_answer: text,
      },
    }));
  };

  // 설문 제출 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    // 필수 문항 검증
    for (const q of questions) {
      if (!q.is_required) continue;
      const ans = answers[q.id];

      if (q.question_type === "single_choice" && (!ans || ans.selected_options.length === 0)) {
        alert(`'${q.question_text}' 문항을 선택해 주세요.`);
        return;
      }
      if (q.question_type === "multiple_choice" && (!ans || ans.selected_options.length === 0)) {
        alert(`'${q.question_text}' 문항을 하나 이상 선택해 주세요.`);
        return;
      }
      if (q.question_type === "rating" && (!ans || ans.rating_value === 0)) {
        alert(`'${q.question_text}' 별점을 선택해 주세요.`);
        return;
      }
      if (q.question_type === "text" && (!ans || !ans.text_answer.trim())) {
        alert(`'${q.question_text}' 답변을 입력해 주세요.`);
        return;
      }
    }

    if (!survey.is_anonymous && !respondentName.trim()) {
      alert("이름 또는 닉네임을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. 로컬 게스트 세션 토큰 취득/생성
      let guestToken = typeof window !== "undefined" ? localStorage.getItem("smp_guest_token") : null;
      if (!guestToken) {
        guestToken = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        if (typeof window !== "undefined") {
          localStorage.setItem("smp_guest_token", guestToken);
        }
      }

      // 2. survey_responses 세션 생성
      const { data: resData, error: resError } = await supabase
        .from("survey_responses")
        .insert({
          survey_id: survey.id,
          respondent_name: survey.is_anonymous ? "익명" : respondentName.trim(),
          guest_token: guestToken,
        })
        .select("id")
        .single();

      if (resError || !resData) {
        throw resError || new Error("응답 세션 생성 실패");
      }

      // 3. survey_answers 개별 문항별 답변 저장
      const answersToInsert = questions.map((q) => {
        const ans = answers[q.id];
        return {
          response_id: resData.id,
          question_id: q.id,
          selected_options: ans?.selected_options || [],
          text_answer: ans?.text_answer || null,
          rating_value: ans?.rating_value || null,
        };
      });

      const { error: ansError } = await supabase
        .from("survey_answers")
        .insert(answersToInsert);

      if (ansError) {
        throw ansError;
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error("설문 제출 오류:", err);
      alert("설문 제출 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    const resetAnswers: typeof answers = {};
    questions.forEach((q) => {
      resetAnswers[q.id] = {
        selected_options: [],
        text_answer: "",
        rating_value: 0,
      };
    });
    setAnswers(resetAnswers);
    setRespondentName("");
    setIsSubmitted(false);
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 404 처리
  if (notFound && !isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-xl border border-slate-100 dark:border-slate-800 max-w-sm w-full">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white mb-1">
            존재하지 않는 설문입니다
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            요청하신 주소에 해당하는 설문조사를 찾을 수 없습니다.
          </p>
          <Link
            href={`/s/${slug}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>분반 홈으로 이동</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 상단 글로벌 헤더 (대안 1 규격 적용: [←] 과목 / 분반) */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/s/${slug}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs transition active:scale-95"
              title="분반 홈으로 돌아가기"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
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
                  <span className="hidden sm:inline">링크 공유</span>
                </>
              )}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 본문 컨테이너 */}
      <div className="mx-auto max-w-2xl px-4 pt-5 sm:pt-6 sm:px-6">
        {isLoading ? (
          <div className="space-y-4 py-6">
            <div className="h-24 rounded-3xl bg-white dark:bg-slate-900 animate-pulse" />
            <div className="h-44 rounded-3xl bg-white dark:bg-slate-900 animate-pulse" />
            <div className="h-44 rounded-3xl bg-white dark:bg-slate-900 animate-pulse" />
          </div>
        ) : isSubmitted ? (
          /* 제출 완료 화면 */
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm my-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mb-2">
              설문 제출이 완료되었습니다!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto mb-6">
              소중한 의견을 제출해 주셔서 감사합니다.<br />
              멘토링 프로그램 개선에 적극 반영하겠습니다.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleResetForm}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>새로 응답 작성하기</span>
              </button>
              <Link
                href={`/s/${slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 dark:shadow-none transition active:scale-95"
              >
                <span>분반 홈으로 돌아가기</span>
              </Link>
            </div>
          </div>
        ) : survey?.is_closed ? (
          /* 설문 마감 상태 */
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm my-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mx-auto mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
              마감된 설문조사입니다
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              이 설문조사는 참여 기간이 종료되었습니다.
            </p>
            <Link
              href={`/s/${slug}`}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-800 dark:bg-slate-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-900 dark:hover:bg-slate-600"
            >
              <span>분반 홈으로 돌아가기</span>
            </Link>
          </div>
        ) : (
          /* 설문 참여 폼 */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 상단 설문 제목 및 설명 카드 */}
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  {survey?.is_anonymous ? "익명 설문조사" : "설문조사"}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {survey?.title}
              </h2>
              {survey?.description && (
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {survey.description}
                </p>
              )}
            </div>

            {/* 실명 설문인 경우 이름 입력 필드 */}
            {survey && !survey.is_anonymous && (
              <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  작성자 이름 / 닉네임 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  placeholder="본인의 이름을 입력해 주세요"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                  required
                />
              </div>
            )}

            {/* 문항 목록 */}
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const ans = answers[q.id];

                return (
                  <div
                    key={q.id}
                    className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-3"
                  >
                    {/* 문항 질문 */}
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                        Q{idx + 1}.
                      </span>
                      <div className="flex-1">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {q.question_text}
                          {q.is_required && (
                            <span className="text-rose-500 ml-1 font-bold">*</span>
                          )}
                        </h3>
                      </div>
                    </div>

                    {/* 문항 유형별 입력 컴포넌트 */}
                    <div className="pt-2">
                      {/* 1. 객관식 단일 선택 (Radio) */}
                      {q.question_type === "single_choice" && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = ans?.selected_options?.includes(opt);
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSingleSelect(q.id, opt)}
                                className={`w-full flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs sm:text-sm font-semibold transition active:scale-[0.99] ${
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600/30 font-bold"
                                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span>{opt}</span>
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-600 text-white"
                                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 2. 객관식 복수 선택 (Checkbox) */}
                      {q.question_type === "multiple_choice" && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = ans?.selected_options?.includes(opt);
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleMultipleSelect(q.id, opt)}
                                className={`w-full flex items-center justify-between rounded-2xl border p-3.5 text-left text-xs sm:text-sm font-semibold transition active:scale-[0.99] ${
                                  isSelected
                                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600/30 font-bold"
                                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800"
                                }`}
                              >
                                <span>{opt}</span>
                                <div
                                  className={`flex h-4 w-4 items-center justify-center rounded-md border transition ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-600 text-white"
                                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                  }`}
                                >
                                  {isSelected && (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. 5점 척도 별점 평가 (Rating) */}
                      {q.question_type === "rating" && (
                        <div className="flex items-center justify-center gap-2 py-3">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const currentRating = ans?.rating_value || 0;
                            const isFilled = star <= currentRating;

                            return (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleRatingChange(q.id, star)}
                                className="flex flex-col items-center gap-1 p-2 transition active:scale-90 group"
                              >
                                <Star
                                  className={`h-8 w-8 transition ${
                                    isFilled
                                      ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                                      : "text-slate-300 dark:text-slate-600 group-hover:text-amber-200"
                                  }`}
                                />
                                <span
                                  className={`text-[11px] font-bold ${
                                    isFilled ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"
                                  }`}
                                >
                                  {star}점
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* 4. 주관식 서술형 (Text) */}
                      {q.question_type === "text" && (
                        <textarea
                          rows={3}
                          value={ans?.text_answer || ""}
                          onChange={(e) => handleTextChange(q.id, e.target.value)}
                          placeholder="의견을 자유롭게 입력해 주세요"
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 하단 제출 버튼 */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-md shadow-indigo-100 transition active:scale-[0.99] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "설문 제출 중..." : "설문 제출하기"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

