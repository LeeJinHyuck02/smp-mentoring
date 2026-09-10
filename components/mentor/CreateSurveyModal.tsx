"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { SurveyQuestionType } from "@/types/database";
import {
  ClipboardList,
  Plus,
  Trash2,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ListPlus,
  GripVertical,
  Copy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface CreateSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName: string;
  onSuccess: () => void;
}

interface TempQuestion {
  id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  options: string[];
  is_required: boolean;
}

const DEFAULT_QUESTIONS: TempQuestion[] = [
  {
    id: "q-1",
    question_text: "",
    question_type: "single_choice",
    options: ["", ""],
    is_required: true,
  },
];

export default function CreateSurveyModal({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  onSuccess,
}: CreateSurveyModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [questions, setQuestions] = useState<TempQuestion[]>(DEFAULT_QUESTIONS);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 문항 추가 (특정 인덱스 또는 맨 끝)
  const handleInsertQuestion = (atIndex?: number) => {
    const newQ: TempQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question_text: "",
      question_type: "single_choice",
      options: ["", ""],
      is_required: true,
    };
    if (typeof atIndex === "number") {
      setQuestions((prev) => [
        ...prev.slice(0, atIndex),
        newQ,
        ...prev.slice(atIndex),
      ]);
    } else {
      setQuestions((prev) => [...prev, newQ]);
    }
  };

  // 문항 복제
  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const duplicated: TempQuestion = {
      ...target,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      options: [...target.options],
    };
    setQuestions((prev) => [
      ...prev.slice(0, idx + 1),
      duplicated,
      ...prev.slice(idx + 1),
    ]);
  };

  // 문항 순서 이동
  const handleMoveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length || fromIdx === toIdx) return;
    setQuestions((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  // 문항 삭제
  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert("최소 1개 이상의 문항이 필요합니다.");
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // 문항 텍스트 변경
  const handleQuestionTextChange = (id: string, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, question_text: text } : q))
    );
  };

  // 문항 유형 변경
  const handleTypeChange = (id: string, type: SurveyQuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        let newOptions: string[] = [];
        if (type === "single_choice" || type === "multiple_choice") {
          newOptions = q.options.length > 0 ? q.options : ["", ""];
        }
        return {
          ...q,
          question_type: type,
          options: newOptions,
        };
      })
    );
  };

  // 선택지 추가
  const handleAddOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: [...q.options, ""],
        };
      })
    );
  };

  // 선택지 변경
  const handleOptionChange = (questionId: string, optIdx: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        const newOpts = [...q.options];
        newOpts[optIdx] = val;
        return { ...q, options: newOpts };
      })
    );
  };

  // 선택지 삭제
  const handleDeleteOption = (questionId: string, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId) return q;
        if (q.options.length <= 2) {
          alert("객관식 문항은 최소 2개 이상의 선택지가 필요합니다.");
          return q;
        }
        return {
          ...q,
          options: q.options.filter((_, idx) => idx !== optIdx),
        };
      })
    );
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("설문 제목을 입력해 주세요.");
      return;
    }

    // 문항 내용 검증
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setError(`문항 ${i + 1}번의 질문 내용을 입력해 주세요.`);
        return;
      }
      if (
        (q.question_type === "single_choice" || q.question_type === "multiple_choice") &&
        q.options.some((opt) => !opt.trim())
      ) {
        setError(`문항 ${i + 1}번의 선택지 내용을 모두 채워주세요.`);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. surveys 마스터 테이블 생성
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .insert({
          section_id: sectionId,
          title: title.trim(),
          description: description.trim() || null,
          is_anonymous: isAnonymous,
          is_closed: false,
        })
        .select("id")
        .single();

      if (surveyError || !surveyData) {
        throw surveyError || new Error("설문 생성 실패");
      }

      // 2. survey_questions 문항들 삽입
      const questionsToInsert = questions.map((q, idx) => ({
        survey_id: surveyData.id,
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options:
          q.question_type === "single_choice" || q.question_type === "multiple_choice"
            ? q.options.map((o) => o.trim())
            : [],
        is_required: q.is_required,
        order_index: idx,
      }));

      const { error: questionsError } = await supabase
        .from("survey_questions")
        .insert(questionsToInsert);

      if (questionsError) {
        throw questionsError;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("설문 등록 오류:", err);
      setError(err?.message || "설문 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden">
        {/* 모달 헤더 (고정) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block leading-tight">
                [{sectionName}]
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                새 설문조사 등록
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

        {/* 모달 폼 (스크롤 영역 + 고정 푸터) */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
            {error && (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
                {error}
              </div>
            )}

            {/* 설문 기본 정보: 제목, 설명, 익명 체크 */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  설문 제목 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 1차 멘토링 만족도 및 피드백 조사"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  설문 설명
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="예: 멘티 여러분의 솔직한 피드백은 멘토링 운영에 큰 도움이 됩니다. (선택)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* 익명 설문 토글 (컴팩트 인라인 바) */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50/80 dark:bg-slate-800/60 px-3.5 py-2 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    익명 설문으로 진행
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    (이름을 수집하지 않고 익명으로 제출받습니다)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                />
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1" />

            {/* 설문 문항 구성 */}
            <div>
              <div className="mb-2">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                  설문 문항 구성 ({questions.length}개)
                </span>
              </div>

              <div className="space-y-2">
                {questions.map((q, idx) => (
                  <React.Fragment key={q.id}>
                    <div
                      draggable
                      onDragStart={(e) => {
                        setDraggedIdx(idx);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragOverIdx !== idx) setDragOverIdx(idx);
                      }}
                      onDragLeave={() => {
                        if (dragOverIdx === idx) setDragOverIdx(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIdx !== null && draggedIdx !== idx) {
                          handleMoveQuestion(draggedIdx, idx);
                        }
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      className={`rounded-2xl border p-3.5 space-y-2.5 transition-all ${
                        dragOverIdx === idx
                          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-200 dark:ring-indigo-800"
                          : draggedIdx === idx
                          ? "opacity-50 border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50"
                          : "border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {/* 드래그 핸들 */}
                          <span
                            className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition shrink-0"
                            title="드래그하여 순서 변경"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>

                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0">
                            Q{idx + 1}.
                          </span>

                          {/* 문항 유형 드롭다운 */}
                          <select
                            value={q.question_type}
                            onChange={(e) =>
                              handleTypeChange(q.id, e.target.value as SurveyQuestionType)
                            }
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                          >
                            <option value="rating">5점 척도 (별점 평가)</option>
                            <option value="text">주관식 (서술형 답변)</option>
                            <option value="single_choice">객관식 (단일 선택)</option>
                            <option value="multiple_choice">객관식 (복수 선택)</option>
                          </select>

                          {/* 필수 문항 여부 체크 */}
                          <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 ml-1">
                            <input
                              type="checkbox"
                              checked={q.is_required}
                              onChange={(e) =>
                                setQuestions((prev) =>
                                  prev.map((item) =>
                                    item.id === q.id ? { ...item, is_required: e.target.checked } : item
                                  )
                                )
                              }
                              className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
                            />
                            <span>필수</span>
                          </label>
                        </div>

                        {/* 우측 액션: [▲] [▼] 순서이동, [📋 복제], [🗑 삭제] */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, idx - 1)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-lg transition"
                            title="위로 이동"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, idx + 1)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-lg transition"
                            title="아래로 이동"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(idx)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition"
                            title="문항 복제"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                            title="문항 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 질문 내용 입력 */}
                      <input
                        type="text"
                        value={q.question_text}
                        onChange={(e) => handleQuestionTextChange(q.id, e.target.value)}
                        placeholder="질문 내용을 입력하세요"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-hidden"
                        required
                      />

                      {/* 객관식인 경우 선택지 목록 */}
                      {(q.question_type === "single_choice" ||
                        q.question_type === "multiple_choice") && (
                        <div className="pl-2 space-y-1.5 border-l-2 border-indigo-200 dark:border-indigo-800 pt-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                            선택지 목록
                          </span>
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 w-4 text-center">
                                {optIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) =>
                                  handleOptionChange(q.id, optIdx, e.target.value)
                                }
                                placeholder={`선택지 ${optIdx + 1}`}
                                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-hidden"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteOption(q.id, optIdx)}
                                className="text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition p-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-0.5 pt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>선택지 추가</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 문항과 문항 사이 인라인 추가 버튼 */}
                    {idx < questions.length - 1 && (
                      <div className="relative flex items-center justify-center my-1 group/divider">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-800 group-hover/divider:border-indigo-300 dark:group-hover/divider:border-indigo-700 transition" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInsertQuestion(idx + 1)}
                          className="relative z-10 inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition active:scale-95 opacity-60 group-hover/divider:opacity-100"
                        >
                          <Plus className="w-3 h-3" />
                          <span>문항 추가</span>
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {/* 문항 목록 맨 끝 추가 버튼 (사이에 문항 추가와 완전히 동일한 스타일) */}
                <div className="relative flex items-center justify-center my-1.5 group/divider">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-800 group-hover/divider:border-indigo-300 dark:group-hover/divider:border-indigo-700 transition" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInsertQuestion(questions.length)}
                    className="relative z-10 inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition active:scale-95 opacity-60 group-hover/divider:opacity-100"
                  >
                    <Plus className="w-3 h-3" />
                    <span>문항 추가</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 모달 하단 버튼 (항상 고정된 Pinned Footer) */}
          <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-100 dark:shadow-none transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? "등록 중..." : "설문 등록 완료"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

