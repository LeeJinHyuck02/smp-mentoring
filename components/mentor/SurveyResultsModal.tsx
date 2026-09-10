"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { Survey, SurveyQuestion } from "@/types/database";
import {
  ClipboardList,
  Users,
  X,
  Star,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

interface SurveyResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  sectionName: string;
  onUpdated: () => void;
}

export default function SurveyResultsModal({
  isOpen,
  onClose,
  surveyId,
  sectionName,
  onUpdated,
}: SurveyResultsModalProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [responsesCount, setResponsesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !surveyId) return;

    async function loadStats() {
      setIsLoading(true);
      try {
        // 1. 설문 기본 정보
        const { data: sData } = await supabase
          .from("surveys")
          .select("*")
          .eq("id", surveyId)
          .single();

        if (sData) setSurvey(sData);

        // 2. 문항 목록
        const { data: qData } = await supabase
          .from("survey_questions")
          .select("*")
          .eq("survey_id", surveyId)
          .order("order_index", { ascending: true });

        if (qData) setQuestions(qData);

        // 3. 총 응답자 수
        const { data: rData } = await supabase
          .from("survey_responses")
          .select("id, respondent_name, created_at")
          .eq("survey_id", surveyId);

        const rList = rData || [];
        setResponsesCount(rList.length);

        // 4. 모든 문항 답변
        if (rList.length > 0) {
          const responseIds = rList.map((r) => r.id);
          const { data: aData } = await supabase
            .from("survey_answers")
            .select("*, survey_responses(respondent_name, created_at)")
            .in("response_id", responseIds);

          if (aData) {
            setAnswers(aData);
          }
        } else {
          setAnswers([]);
        }
      } catch (err) {
        console.error("통계 로드 오류:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [isOpen, surveyId]);

  if (!isOpen) return null;

  // 마감 / 재개 토글
  const handleToggleClose = async () => {
    if (!survey) return;
    setIsActionLoading(true);
    try {
      const nextClosed = !survey.is_closed;
      await supabase
        .from("surveys")
        .update({ is_closed: nextClosed })
        .eq("id", survey.id);

      setSurvey((prev) => (prev ? { ...prev, is_closed: nextClosed } : null));
      onUpdated();
    } catch (err) {
      console.error("마감 토글 실패:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 설문 삭제
  const handleDeleteSurvey = async () => {
    if (!survey) return;
    if (!confirm("정말 이 설문조사를 삭제하시겠습니까? (제출된 모든 응답도 함께 삭제됩니다)")) {
      return;
    }

    setIsActionLoading(true);
    try {
      await supabase.from("surveys").delete().eq("id", survey.id);
      onUpdated();
      onClose();
    } catch (err) {
      console.error("설문 삭제 실패:", err);
      alert("설문 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block leading-tight">
                [{sectionName}]
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                설문 응답 결과 분석
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 통계 스크롤 */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
          {isLoading ? (
            <div className="space-y-4 py-8">
              <div className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          ) : !survey ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
              설문 정보를 찾을 수 없습니다.
            </div>
          ) : (
            <>
              {/* 설문 요약 카드 */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {survey.is_closed ? (
                      <span className="rounded-md bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        마감됨
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                        진행 중
                      </span>
                    )}
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {survey.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    총 참여자: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{responsesCount}명</strong>
                  </p>
                </div>

                {/* 관리 버튼군 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleClose}
                    disabled={isActionLoading}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                      survey.is_closed
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                    }`}
                  >
                    {survey.is_closed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{survey.is_closed ? "설문 재개" : "설문 마감"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteSurvey}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 px-3 py-1.5 text-xs font-bold transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>삭제</span>
                  </button>
                </div>
              </div>

              {/* 응답 없을 때 */}
              {responsesCount === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 p-8 text-center">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    아직 제출된 응답이 없습니다.
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    멘티가 설문에 응답하면 이곳에 통계가 표시됩니다.
                  </p>
                </div>
              ) : (
                /* 문항별 집계 통계 */
                <div className="space-y-4 pt-1">
                  {questions.map((q, idx) => {
                    const qAnswers = answers.filter((a) => a.question_id === q.id);

                    return (
                      <div
                        key={q.id}
                        className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 sm:p-5 shadow-xs space-y-3"
                      >
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                            Q{idx + 1}.
                          </span>
                          <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {q.question_text}
                          </h5>
                        </div>

                        {/* 1. 객관식 문항 백분율 막대 그래프 */}
                        {(q.question_type === "single_choice" ||
                          q.question_type === "multiple_choice") && (
                          <div className="space-y-2 pt-1">
                            {(q.options || []).map((opt, optIdx) => {
                              // 이 선택지를 고른 응답 수 계산
                              const pickedCount = qAnswers.filter((a) =>
                                Array.isArray(a.selected_options) &&
                                a.selected_options.includes(opt)
                              ).length;
                              const percentage =
                                responsesCount > 0
                                  ? Math.round((pickedCount / responsesCount) * 100)
                                  : 0;

                              return (
                                <div key={optIdx} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-slate-800 dark:text-slate-200 font-semibold">{opt}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                      {pickedCount}명 ({percentage}%)
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. 별점 평가 집계 */}
                        {q.question_type === "rating" && (
                          <div className="space-y-3 pt-1">
                            {(() => {
                              const ratings = qAnswers
                                .map((a) => a.rating_value)
                                .filter((v) => typeof v === "number" && v > 0);
                              const avg =
                                ratings.length > 0
                                  ? (
                                      ratings.reduce((acc, cur) => acc + cur, 0) /
                                      ratings.length
                                    ).toFixed(1)
                                  : "0.0";

                              return (
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl font-black text-amber-500 flex items-center gap-1">
                                      <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                                      {avg}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                      / 5.0 (총 {ratings.length}명 평가)
                                    </span>
                                  </div>

                                  {/* 1~5점 별도 분포 */}
                                  <div className="space-y-1.5">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                      const starCount = ratings.filter((r) => r === star).length;
                                      const starPercent =
                                        ratings.length > 0
                                          ? Math.round((starCount / ratings.length) * 100)
                                          : 0;

                                      return (
                                        <div key={star} className="flex items-center gap-2 text-xs">
                                          <span className="w-7 text-[11px] font-bold text-slate-600 dark:text-slate-300 text-right">
                                            {star}점
                                          </span>
                                          <div className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                            <div
                                              className="h-full rounded-full bg-amber-400"
                                              style={{ width: `${starPercent}%` }}
                                            />
                                          </div>
                                          <span className="w-10 text-[10px] text-slate-400 dark:text-slate-500 text-right">
                                            {starCount}명
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* 3. 주관식 서술형 답변 목록 */}
                        {q.question_type === "text" && (
                          <div className="pt-1">
                            {(() => {
                              const textList = qAnswers
                                .filter((a) => a.text_answer && a.text_answer.trim())
                                .map((a) => ({
                                  text: a.text_answer,
                                  author: a.survey_responses?.respondent_name || "익명",
                                  time: a.created_at,
                                }));

                              if (textList.length === 0) {
                                return (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                    작성된 서술형 답변이 없습니다.
                                  </p>
                                );
                              }

                              return (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                  {textList.map((item, tIdx) => (
                                    <div
                                      key={tIdx}
                                      className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-100 dark:border-slate-800 text-xs"
                                    >
                                      <p className="text-slate-800 dark:text-slate-200 font-medium whitespace-pre-line leading-relaxed mb-1">
                                        {item.text}
                                      </p>
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        작성자: {item.author}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 닫기 버튼 */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 px-5 py-2.5 text-xs font-bold text-white transition active:scale-95"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

