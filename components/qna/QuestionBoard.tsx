"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Question, Answer } from "@/types/database";
import CreateQuestionModal from "@/components/qna/CreateQuestionModal";
import {
  MessageSquare,
  Lock,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  ShieldAlert,
  User,
  Image as ImageIcon,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionBoardProps {
  sectionId: string;
  isMentor?: boolean;
}

export default function QuestionBoard({ sectionId, isMentor = false }: QuestionBoardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answersMap, setAnswersMap] = useState<Record<string, Answer[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // 모달 및 잠금 해제 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [unlockedQuestionIds, setUnlockedQuestionIds] = useState<Set<string>>(new Set());
  const [pinModalTarget, setPinModalTarget] = useState<Question | null>(null);
  const [inputPin, setInputPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // 멘토 답변 입력 상태
  const [replyContentMap, setReplyContentMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // 1. 질문 및 답변 목록 로드
  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      // 해당 분반의 질문만 로드
      const { data: qData, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("section_id", sectionId)
        .order("created_at", { ascending: false });

      if (qData) {
        setQuestions(qData);

        // 질문에 달린 모든 답변 로드
        const qIds = qData.map((q) => q.id);
        if (qIds.length > 0) {
          const { data: aData } = await supabase
            .from("answers")
            .select("*")
            .in("question_id", qIds)
            .order("created_at", { ascending: true });

          if (aData) {
            const aMap: Record<string, Answer[]> = {};
            aData.forEach((ans) => {
              if (!aMap[ans.question_id]) aMap[ans.question_id] = [];
              aMap[ans.question_id].push(ans);
            });
            setAnswersMap(aMap);
          }
        }
      }
    } catch (err) {
      console.error("질문 로드 실패:", err);
    } finally {
      setIsLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // 비밀글 열람 가능 여부 판별
  const canViewSecret = (q: Question) => {
    if (!q.is_secret) return true;
    if (isMentor) return true;
    if (unlockedQuestionIds.has(q.id)) return true;

    // 본인 작성 기기 자동 인증 (localStorage의 guest_token과 일치하는지)
    if (typeof window !== "undefined") {
      const myToken = localStorage.getItem("smp_guest_token");
      if (myToken && q.guest_token === myToken) {
        return true;
      }
    }

    return false;
  };

  // 4자리 PIN 입력으로 비밀글 잠금 해제
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!pinModalTarget) return;

    // pin_hash와 단순 비교 또는 crypt 지원
    if (pinModalTarget.pin_hash === inputPin || pinModalTarget.pin_hash.length === 4 && pinModalTarget.pin_hash === inputPin) {
      setUnlockedQuestionIds((prev) => new Set(prev).add(pinModalTarget.id));
      setPinModalTarget(null);
      setInputPin("");
    } else {
      setPinError("비밀번호가 일치하지 않습니다.");
    }
  };

  // 멘토 답변 등록 핸들러
  const handleAddAnswer = async (questionId: string) => {
    const text = replyContentMap[questionId]?.trim();
    if (!text) return;

    setSubmittingReplyId(questionId);
    try {
      const { error: ansError } = await supabase.from("answers").insert({
        question_id: questionId,
        author_name: "SMP 전담 멘토",
        is_mentor: true,
        content: text,
      });

      if (ansError) throw ansError;

      // 질문 상태를 'resolved'로 업데이트
      await supabase
        .from("questions")
        .update({ status: "resolved" })
        .eq("id", questionId);

      setReplyContentMap((prev) => ({ ...prev, [questionId]: "" }));
      loadQuestions();
    } catch (err: any) {
      alert("답변 등록 중 오류가 발생했습니다: " + err.message);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  return (
    <div className="w-full">
      {/* 상단 액션 바 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            분반 질의응답 (Q&A)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            질문은 익명 또는 비밀글로 남길 수 있으며, 사진 첨부가 가능합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          질문하기
        </button>
      </div>

      {/* 질문 목록 */}
      {questions.length === 0 && !isLoading ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center my-6">
          <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            아직 등록된 질문이 없습니다.
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            강의 내용, 과제, 시험 관련 질문을 자유롭게 남겨보세요!
          </p>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> 첫 질문 작성하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const hasAccess = canViewSecret(q);
            const answers = answersMap[q.id] || [];
            const isResolved = q.status === "resolved";

            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm transition hover:border-slate-300"
              >
                {/* 상단 메타 바 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    {/* 답변 상태 뱃지 */}
                    {isResolved ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> 멘토 답변 완료
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" /> 답변 대기
                      </span>
                    )}

                    {/* 비밀글 & 익명 태그 */}
                    {q.is_secret && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        <Lock className="w-3 h-3" /> 비밀글
                      </span>
                    )}

                    {q.is_anonymous && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        익명
                      </span>
                    )}
                  </div>

                  <div className="text-slate-400 text-[11px]">
                    작성자: <strong className="text-slate-700">{q.is_anonymous && !isMentor ? "익명 멘티" : q.author_name}</strong>
                  </div>
                </div>

                {/* 질문 제목 */}
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 mt-3 mb-2 flex items-center gap-1.5">
                  {q.is_secret && <Lock className="w-4 h-4 text-slate-400 shrink-0" />}
                  <span>{q.title}</span>
                </h3>

                {/* 본문 영역: 권한 검증에 따라 분기 */}
                {hasAccess ? (
                  <div>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {q.content}
                    </p>

                    {/* 첨부 이미지 목록 */}
                    {q.image_urls && q.image_urls.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {q.image_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-24 w-24 sm:h-28 sm:w-28 rounded-xl overflow-hidden border border-slate-200 hover:opacity-90 transition shadow-2xs"
                          >
                            <img src={url} alt="첨부 이미지" className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* 비밀글 잠금 상태 안내 */
                  <div className="my-2 rounded-xl bg-slate-50 p-4 text-center border border-slate-200/80">
                    <Lock className="mx-auto h-6 w-6 text-slate-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-600">
                      🔒 작성자와 멘토만 볼 수 있는 비밀글입니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPinModalTarget(q);
                        setInputPin("");
                        setPinError(null);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition active:scale-95"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      4자리 비밀번호 입력하고 열람하기
                    </button>
                  </div>
                )}

                {/* 답변 목록 (열람 권한 있을 때만 노출) */}
                {hasAccess && answers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                    {answers.map((ans) => (
                      <div
                        key={ans.id}
                        className="rounded-xl bg-indigo-50/60 p-3.5 border border-indigo-100"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            {ans.author_name}
                          </span>
                          <span className="text-[10px] text-indigo-400">
                            {new Date(ans.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {ans.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 멘토 전용: 공식 답변 작성 폼 */}
                {isMentor && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyContentMap[q.id] || ""}
                        onChange={(e) =>
                          setReplyContentMap((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder="멘토 답변을 작성해 주세요..."
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        disabled={submittingReplyId === q.id || !replyContentMap[q.id]?.trim()}
                        onClick={() => handleAddAnswer(q.id)}
                        className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        답변 등록
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 질문 작성 모달 */}
      <CreateQuestionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        sectionId={sectionId}
        onSuccess={loadQuestions}
      />

      {/* 비밀글 잠금 해제 PIN 입력 모달 */}
      {pinModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              비밀글 비밀번호 입력
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              글 작성 시 설정했던 4자리 비밀번호(PIN)를 입력해 주세요.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                autoFocus
                value={inputPin}
                onChange={(e) => setInputPin(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="4자리 숫자"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm tracking-widest focus:border-indigo-500 outline-none font-mono"
              />

              {pinError && (
                <div className="text-[11px] font-bold text-rose-600 text-center">
                  {pinError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPinModalTarget(null)}
                  className="flex-1 rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  확인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

