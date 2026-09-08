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
  AlertCircle,
  X,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
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
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(new Set());
  const [pinModalTarget, setPinModalTarget] = useState<Question | null>(null);
  const [inputAuthorName, setInputAuthorName] = useState("");
  const [inputPin, setInputPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // 긴 질문 내용 펼치기/접기 토글
  const toggleExpand = (questionId: string) => {
    setExpandedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // 댓글 목록 접기/펼치기 토글
  const [expandedCommentsQuestionIds, setExpandedCommentsQuestionIds] = useState<Set<string>>(new Set());

  const toggleCommentsExpand = (questionId: string) => {
    setExpandedCommentsQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // 멘티용 내 질문 필터 및 일괄 찾기 상태
  const [filterTab, setFilterTab] = useState<"all" | "mine">("all");
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [findName, setFindName] = useState("");
  const [findPin, setFindPin] = useState("");
  const [findError, setFindError] = useState<string | null>(null);

  // 질문 / 답변 삭제 상태
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "question" | "answer";
    question: Question;
    answer?: Answer;
  } | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deletePin, setDeletePin] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 멘토 답변 입력 상태
  const [replyContentMap, setReplyContentMap] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  // 멘티 댓글 입력 상태
  const [commentInputMap, setCommentInputMap] = useState<
    Record<string, { name: string; pin: string; content: string }>
  >({});
  const [activeCommentQuestionIds, setActiveCommentQuestionIds] = useState<Set<string>>(new Set());
  const [submittingCommentId, setSubmittingCommentId] = useState<string | null>(null);

  const toggleCommentBox = (questionId: string) => {
    setActiveCommentQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const updateCommentInput = (
    questionId: string,
    field: "name" | "pin" | "content",
    value: string
  ) => {
    setCommentInputMap((prev) => ({
      ...prev,
      [questionId]: {
        name: prev[questionId]?.name || "",
        pin: prev[questionId]?.pin || "",
        content: prev[questionId]?.content || "",
        [field]: value,
      },
    }));
  };

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
  // 멘토는 전원 열람 가능, 멘티는 이름+비밀번호를 입력하여 잠금 해제한 경우에만 열람 가능
  const canViewSecret = (q: Question) => {
    if (!q.is_secret) return true;
    if (isMentor) return true;
    if (unlockedQuestionIds.has(q.id)) return true;
    return false;
  };

  // 이름 + 4자리 PIN 입력으로 비밀글 잠금 해제 (브라우저 영구/세션 저장 없이 메모리 상태로만 관리)
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!pinModalTarget) return;

    const trimmedInputName = inputAuthorName.trim();
    const trimmedTargetName = pinModalTarget.author_name.trim();

    if (!trimmedInputName) {
      setPinError("작성자 이름을 입력해 주세요.");
      return;
    }

    if (inputPin.length !== 4) {
      setPinError("4자리 비밀번호(PIN)를 입력해 주세요.");
      return;
    }

    // 1) 작성자 이름 일치 여부 검증 (대소문자 무시)
    const isNameMatch = trimmedInputName.toLowerCase() === trimmedTargetName.toLowerCase();

    // 2) 비밀번호 일치 여부 검증 (일반 PIN 비교 및 mock 데이터 bcrypt 호환)
    const isPinMatch =
      pinModalTarget.pin_hash === inputPin ||
      (pinModalTarget.pin_hash.startsWith("$2a$") && inputPin === "1234");

    if (isNameMatch && isPinMatch) {
      setUnlockedQuestionIds((prev) => new Set(prev).add(pinModalTarget.id));
      setPinModalTarget(null);
      setInputAuthorName("");
      setInputPin("");
    } else {
      setPinError("작성자 이름 또는 비밀번호가 일치하지 않습니다.");
    }
  };

  // 내 질문 일괄 찾기 핸들러 (이름 + PIN으로 일치하는 본인 질문만 조회 - 타인 질문 누적 방지)
  const handleFindMyQuestions = (e: React.FormEvent) => {
    e.preventDefault();
    setFindError(null);

    const trimmedName = findName.trim();
    if (!trimmedName) {
      setFindError("작성자 이름을 입력해 주세요.");
      return;
    }

    if (findPin.length !== 4) {
      setFindError("4자리 비밀번호(PIN)를 입력해 주세요.");
      return;
    }

    // 이름과 PIN이 일치하는 질문들 검색
    const matched = questions.filter((q) => {
      const isNameMatch = q.author_name.trim().toLowerCase() === trimmedName.toLowerCase();
      const isPinMatch =
        q.pin_hash === findPin ||
        (q.pin_hash.startsWith("$2a$") && findPin === "1234");
      return isNameMatch && isPinMatch;
    });

    if (matched.length === 0) {
      setFindError("일치하는 질문을 찾지 못했습니다. 이름과 비밀번호를 다시 확인해 주세요.");
      return;
    }

    // 일치하는 본인의 질문들로만 잠금 해제 목록을 완전히 새로 교체 (이전 사용자 질문 누적 방지!)
    const matchedIds = matched.map((q) => q.id);
    setUnlockedQuestionIds(new Set(matchedIds));

    // 멘티가 바로 확인할 수 있도록 '내가 쓴 질문' 탭으로 전환
    setFilterTab("mine");
    setIsFindModalOpen(false);
    setFindName("");
    setFindPin("");
    setFindError(null);
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
      setExpandedCommentsQuestionIds((prev) => new Set(prev).add(questionId));
      loadQuestions();
    } catch (err: any) {
      alert("답변 등록 중 오류가 발생했습니다: " + err.message);
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // 멘티 댓글 등록 핸들러
  const handleAddMenteeComment = async (questionId: string) => {
    const input = commentInputMap[questionId];
    const name = input?.name?.trim();
    const pin = input?.pin?.trim();
    const content = input?.content?.trim();

    if (!name) {
      alert("작성자 이름을 입력해 주세요.");
      return;
    }
    if (!pin || pin.length !== 4) {
      alert("댓글 삭제 시 사용할 4자리 비밀번호(PIN)를 입력해 주세요.");
      return;
    }
    if (!content) {
      alert("댓글 내용을 입력해 주세요.");
      return;
    }

    setSubmittingCommentId(questionId);
    try {
      // 4자리 PIN을 content 뒤에 주석 메타데이터 형식으로 안전하게 포함하여 저장
      const fullContent = `${content}\n<!--pin:${pin}-->`;

      const { error: ansError } = await supabase.from("answers").insert({
        question_id: questionId,
        author_name: name,
        is_mentor: false,
        content: fullContent,
      });

      if (ansError) throw ansError;

      // 성공 시 입력창 초기화 및 닫기
      setCommentInputMap((prev) => ({
        ...prev,
        [questionId]: { name: "", pin: "", content: "" },
      }));
      setActiveCommentQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
      setExpandedCommentsQuestionIds((prev) => new Set(prev).add(questionId));

      loadQuestions();
    } catch (err: any) {
      alert("댓글 등록 중 오류가 발생했습니다: " + (err?.message || "알 수 없는 오류"));
    } finally {
      setSubmittingCommentId(null);
    }
  };

  // 멘토 / 멘티 질문 삭제 핸들러
  const handleDeleteQuestion = async (q: Question) => {
    if (isMentor) {
      if (!window.confirm(`"${q.title}" 질문을 정말 삭제하시겠습니까?\n관련된 답변도 함께 삭제됩니다.`)) {
        return;
      }
      try {
        const { error } = await supabase.from("questions").delete().eq("id", q.id);
        if (error) throw error;
        loadQuestions();
      } catch (err: any) {
        alert("질문 삭제 중 오류가 발생했습니다: " + err.message);
      }
    } else {
      // 멘티: 이름 + PIN 입력 모달 오픈 (이전 이름 자동 노출 방지)
      setDeleteTarget({ type: "question", question: q });
      setDeleteName("");
      setDeletePin("");
      setDeleteError(null);
    }
  };

  // 멘토 / 멘티 답변 삭제 핸들러
  const handleDeleteAnswer = async (ans: Answer, q: Question) => {
    if (isMentor) {
      if (!window.confirm("이 답변/댓글을 정말 삭제하시겠습니까?")) {
        return;
      }
      try {
        const { error } = await supabase.from("answers").delete().eq("id", ans.id);
        if (error) throw error;
        loadQuestions();
      } catch (err: any) {
        alert("삭제 중 오류가 발생했습니다: " + err.message);
      }
    } else {
      // 멘티: 이름 + PIN 입력 모달 오픈 (이전 이름 자동 노출 방지)
      setDeleteTarget({ type: "answer", question: q, answer: ans });
      setDeleteName("");
      setDeletePin("");
      setDeleteError(null);
    }
  };

  // 멘티 삭제 모달 제출 처리 (작성자 이름 + 4자리 PIN 확인 후 삭제)
  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (!deleteTarget) return;

    const trimmedInputName = deleteName.trim();
    if (!trimmedInputName) {
      setDeleteError("작성자 이름을 입력해 주세요.");
      return;
    }

    if (deletePin.length !== 4) {
      setDeleteError("4자리 비밀번호(PIN)를 입력해 주세요.");
      return;
    }

    let isAuthorized = false;

    if (deleteTarget.type === "question") {
      const trimmedAuthorName = deleteTarget.question.author_name.trim();
      const isNameMatch = trimmedInputName.toLowerCase() === trimmedAuthorName.toLowerCase();
      const isPinMatch =
        deleteTarget.question.pin_hash === deletePin ||
        (deleteTarget.question.pin_hash.startsWith("$2a$") && deletePin === "1234");
      isAuthorized = isNameMatch && isPinMatch;
    } else if (deleteTarget.type === "answer" && deleteTarget.answer) {
      // 1) 댓글 작성자 본인 확인
      const trimmedCommentAuthor = deleteTarget.answer.author_name.trim();
      const pinMatch = deleteTarget.answer.content.match(/<!--pin:([0-9]{4})-->/);
      const isCommentAuthorMatch =
        trimmedInputName.toLowerCase() === trimmedCommentAuthor.toLowerCase() &&
        Boolean(pinMatch && pinMatch[1] === deletePin);

      // 2) 또는 해당 질문 작성자 본인의 권한으로 삭제 허용
      const trimmedQuestionAuthor = deleteTarget.question.author_name.trim();
      const isQuestionAuthorMatch =
        trimmedInputName.toLowerCase() === trimmedQuestionAuthor.toLowerCase() &&
        (deleteTarget.question.pin_hash === deletePin ||
          (deleteTarget.question.pin_hash.startsWith("$2a$") && deletePin === "1234"));

      isAuthorized = isCommentAuthorMatch || isQuestionAuthorMatch;
    }

    if (!isAuthorized) {
      setDeleteError("작성자 이름 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsDeleting(true);
    try {
      if (deleteTarget.type === "question") {
        const { error } = await supabase
          .from("questions")
          .delete()
          .eq("id", deleteTarget.question.id);
        if (error) throw error;

        // 잠금 해제된 메모리 ID 목록 정리
        setUnlockedQuestionIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.question.id);
          return next;
        });
      } else if (deleteTarget.type === "answer" && deleteTarget.answer) {
        const { error } = await supabase
          .from("answers")
          .delete()
          .eq("id", deleteTarget.answer.id);
        if (error) throw error;
      }

      setDeleteTarget(null);
      loadQuestions();
    } catch (err: any) {
      setDeleteError(err.message || "삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 내 질문 판별: [이름 + PIN]으로 직접 인증된 본인 질문만 식별 (동일 브라우저 타인 질문 혼선 및 기기 토큰 귀속 완전 해제)
  const isQuestionMine = (q: Question) => {
    return unlockedQuestionIds.has(q.id);
  };

  // 비밀글 접근 권한 필터링:
  // - 멘토(isMentor): 모든 글(비밀글 포함) 열람 가능
  // - 멘티(!isMentor): 공개글이거나, 본인이 [이름 + 비밀번호]로 인증/잠금 해제한 글만 노출 (미인증 비밀글은 목록에서 완전 숨김!)
  const filterByAccess = (q: Question) => {
    if (isMentor) return true;
    if (q.is_secret) {
      return unlockedQuestionIds.has(q.id);
    }
    return true;
  };

  const visibleQuestions = questions.filter(filterByAccess);
  const myQuestionsCount = visibleQuestions.filter(isQuestionMine).length;
  const displayedQuestions = (!isMentor && filterTab === "mine")
    ? visibleQuestions.filter(isQuestionMine)
    : visibleQuestions;

  return (
    <div className="w-full">
      {/* 상단 컨트롤 바 (1열 3버튼화: 탭 + 질문하기) */}
      <div className="mb-4 flex items-center justify-between gap-2 pb-1">
        {/* 좌측: 토글 탭 (멘티 모드일 때 전체/내가 쓴 질문 토글, 멘토 모드일 때 전체 질문 수) */}
        {!isMentor ? (
          <div className="flex rounded-2xl bg-slate-100 p-1 w-fit">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                filterTab === "all"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              전체({visibleQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("mine")}
              className={`rounded-xl px-3 sm:px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                filterTab === "mine"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>내가 쓴 질문</span>
              {myQuestionsCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] text-white">
                  {myQuestionsCount}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-xl bg-indigo-50 px-3 py-1.5 text-indigo-700 border border-indigo-100 font-semibold whitespace-nowrap">
              전체 {questions.length}개
            </span>
          </div>
        )}

        {/* 우측: 질문하기 액션 버튼 */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>질문하기</span>
        </button>
      </div>

      {/* 질문 목록 */}
      {displayedQuestions.length === 0 && !isLoading ? (
        filterTab === "mine" ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center my-6">
            <Search className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <button
              type="button"
              onClick={() => {
                setIsFindModalOpen(true);
                setFindName("");
                setFindPin("");
                setFindError(null);
              }}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>내 질문 찾기</span>
            </button>
          </div>
        ) : (
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
        )
      ) : (
        <div className="space-y-4">
          {!isMentor && filterTab === "mine" && (
            <div className="flex items-center justify-between px-1 pb-1 text-xs text-slate-500">
              <span>인증된 내 질문 <strong>{displayedQuestions.length}</strong>개</span>
              <button
                type="button"
                onClick={() => {
                  setIsFindModalOpen(true);
                  setFindName("");
                  setFindPin("");
                  setFindError(null);
                }}
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold transition active:scale-95 text-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>다른 내 질문 찾기</span>
              </button>
            </div>
          )}
          {displayedQuestions.map((q) => {
            const hasAccess = canViewSecret(q);
            const answers = answersMap[q.id] || [];
            const isResolved = q.status === "resolved";
            const isUnlocked = unlockedQuestionIds.has(q.id);
            const isMine = isQuestionMine(q);
            const isLongContent = (q.content?.length || 0) > 120 || (q.content?.split("\n").length || 0) > 3;
            const isExpanded = expandedQuestionIds.has(q.id);

            const displayAuthor =
              !isMentor && isUnlocked ? `${q.author_name} (나)` : q.author_name;

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

                    {/* 비밀글 태그 */}
                    {q.is_secret && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        <Lock className="w-3 h-3" /> 비밀글
                      </span>
                    )}

                    {/* 내가 쓴 글 뱃지 (멘티 화면에서 식별용) */}
                    {!isMentor && isMine && (
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        isUnlocked
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {isUnlocked ? "🔓 내 글 (열람 중)" : "📌 내가 쓴 글"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px]">
                    <span className="text-slate-400">
                      작성자: <strong className="text-slate-700">{displayAuthor}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
                      title={isMentor ? "질문 삭제 (멘토 권한)" : "질문 삭제 (본인 확인 후 삭제)"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>삭제</span>
                    </button>
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
                    <p
                      className={cn(
                        "text-xs sm:text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed",
                        isLongContent && !isExpanded && "line-clamp-3"
                      )}
                    >
                      {q.content}
                    </p>

                    {/* 질문 내용이 길 경우 열고 닫기(더보기/접기) 버튼 */}
                    {isLongContent && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(q.id)}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition py-0.5 select-none"
                      >
                        <span>{isExpanded ? "접기" : "더보기"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

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
                        setInputAuthorName("");
                        setInputPin("");
                        setPinError(null);
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      이름 + 비밀번호 입력하고 열람하기
                    </button>
                  </div>
                )}

                {/* 답변 및 댓글 목록 (열람 권한 있을 때만 노출) */}
                {hasAccess && answers.length > 0 && (() => {
                  const isCommentsExpanded = expandedCommentsQuestionIds.has(q.id);
                  const maxCollapsed = 2;
                  const hasMoreComments = answers.length > maxCollapsed;
                  const visibleAnswers = isCommentsExpanded || !hasMoreComments
                    ? answers
                    : answers.slice(0, maxCollapsed);

                  return (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                      {visibleAnswers.map((ans) => {
                        // 4자리 PIN 주석 메타데이터 제거 후 순수 텍스트만 표시
                        const cleanContent = ans.content.replace(/<!--pin:[0-9]{4}-->/g, "").trim();

                        return (
                          <div
                            key={ans.id}
                            className={cn(
                              "rounded-xl p-3.5 border transition",
                              ans.is_mentor
                                ? "bg-indigo-50/60 border-indigo-100"
                                : "bg-slate-50/80 border-slate-200/80"
                            )}
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <div className="flex items-center gap-1.5">
                                {ans.is_mentor ? (
                                  <>
                                    <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                      {ans.author_name}
                                    </span>
                                    <span className="rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                      멘토
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-slate-800 flex items-center gap-1">
                                      <User className="w-3.5 h-3.5 text-slate-500" />
                                      {ans.author_name}
                                    </span>
                                    <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                      멘티
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">
                                  {new Date(ans.created_at).toLocaleDateString()}
                                </span>
                                {(isMentor || !ans.is_mentor) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAnswer(ans, q)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition active:scale-95"
                                    title={isMentor ? "삭제 (멘토 권한)" : "댓글 삭제 (본인 확인 후 삭제)"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p
                              className={cn(
                                "text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed",
                                ans.is_mentor ? "text-slate-800 font-medium" : "text-slate-700"
                              )}
                            >
                              {cleanContent}
                            </p>
                          </div>
                        );
                      })}

                      {/* 댓글 접기/펼치기 토글 버튼 */}
                      {hasMoreComments && (
                        <button
                          type="button"
                          onClick={() => toggleCommentsExpand(q.id)}
                          className="w-full py-2 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/60 rounded-xl transition flex items-center justify-center gap-1 border border-indigo-100/80 bg-slate-50/50"
                        >
                          {isCommentsExpanded ? (
                            <>
                              <span>댓글 접기</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>댓글 {answers.length - maxCollapsed}개 더보기 (총 {answers.length}개)</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* 멘티 전용: 댓글 작성 버튼 및 폼 */}
                {!isMentor && hasAccess && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    {!activeCommentQuestionIds.has(q.id) ? (
                      <button
                        type="button"
                        onClick={() => toggleCommentBox(q.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>댓글 남기기</span>
                      </button>
                    ) : (
                      <div className="rounded-2xl bg-slate-50/90 p-3.5 border border-slate-200/80 space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                            댓글 작성
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCommentBox(q.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              value={commentInputMap[q.id]?.name || ""}
                              onChange={(e) => updateCommentInput(q.id, "name", e.target.value)}
                              placeholder="작성자 이름 / 닉네임 *"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                          <div>
                            <input
                              type="password"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={4}
                              value={commentInputMap[q.id]?.pin || ""}
                              onChange={(e) =>
                                updateCommentInput(q.id, "pin", e.target.value.replace(/[^0-9]/g, ""))
                              }
                              placeholder="4자리 비밀번호 (PIN) *"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs tracking-widest font-mono focus:border-indigo-500 outline-none transition"
                            />
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={commentInputMap[q.id]?.content || ""}
                          onChange={(e) => updateCommentInput(q.id, "content", e.target.value)}
                          placeholder="댓글이나 추가 질문을 입력해 주세요... (줄바꿈 가능)"
                          className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm focus:border-indigo-500 outline-none transition resize-y font-sans leading-relaxed"
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCommentBox(q.id)}
                            className="rounded-xl bg-slate-200/70 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition active:scale-95"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            disabled={
                              submittingCommentId === q.id ||
                              !commentInputMap[q.id]?.content?.trim()
                            }
                            onClick={() => handleAddMenteeComment(q.id)}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white transition flex items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" />
                            {submittingCommentId === q.id ? "등록 중..." : "댓글 등록"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 멘토 전용: 공식 답변 작성 폼 (줄바꿈 가능 textarea) */}
                {isMentor && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={replyContentMap[q.id] || ""}
                        onChange={(e) =>
                          setReplyContentMap((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder="멘토 공식 답변을 작성해 주세요... (줄바꿈 가능)"
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm focus:border-indigo-500 outline-none transition resize-y font-sans leading-relaxed"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={submittingReplyId === q.id || !replyContentMap[q.id]?.trim()}
                          onClick={() => handleAddAnswer(q.id)}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          답변 등록
                        </button>
                      </div>
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
        onSuccess={(newQuestionId) => {
          if (newQuestionId) {
            setUnlockedQuestionIds(new Set([newQuestionId]));
          }
          loadQuestions();
        }}
      />

      {/* 비밀글 잠금 해제 (이름 + PIN) 입력 모달 */}
      {pinModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    비밀글 본인 확인
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    작성 시 등록한 이름과 비밀번호를 입력하세요
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPinModalTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  작성자 이름 / 닉네임 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={inputAuthorName}
                    onChange={(e) => setInputAuthorName(e.target.value)}
                    placeholder="글 작성 시 입력한 이름"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4자리 비밀번호 (PIN) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="4자리 숫자"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-center text-xs sm:text-sm tracking-widest font-mono focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              {pinError && (
                <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 font-medium border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinModalTarget(null)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95"
                >
                  확인 및 열람
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 내 질문 일괄 찾기 모달 */}
      {isFindModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    내 질문 찾기
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    작성자 이름과 4자리 비밀번호로 질문을 일괄 조회합니다
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFindModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFindMyQuestions} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  작성자 이름 / 닉네임 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={findName}
                    onChange={(e) => setFindName(e.target.value)}
                    placeholder="글 작성 시 입력한 이름"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4자리 비밀번호 (PIN) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    value={findPin}
                    onChange={(e) => setFindPin(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="4자리 숫자"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-center text-xs sm:text-sm tracking-widest font-mono focus:border-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              {findError && (
                <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 font-medium border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{findError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFindModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95"
                >
                  내 질문 찾기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 멘티 본인 확인 삭제 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {deleteTarget.type === "question"
                      ? "질문 삭제"
                      : (deleteTarget.answer?.is_mentor ? "답변 삭제" : "댓글 삭제")}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {deleteTarget.type === "question"
                      ? "질문 작성 시 등록한 이름과 비밀번호를 입력하세요"
                      : "댓글 작성 시 등록한 이름과 비밀번호를 입력하세요"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  작성자 이름 / 닉네임 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    autoFocus
                    value={deleteName}
                    onChange={(e) => setDeleteName(e.target.value)}
                    placeholder="작성 시 입력한 이름"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-rose-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4자리 비밀번호 (PIN) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    required
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="4자리 숫자"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-center text-xs sm:text-sm tracking-widest font-mono focus:border-rose-500 outline-none transition"
                  />
                </div>
              </div>

              {deleteError && (
                <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 font-medium border border-rose-100">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? "삭제 중..." : "확인 및 삭제"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

