"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import ScheduleGrid from "@/components/schedule/ScheduleGrid";
import ScheduleHeatmap from "@/components/schedule/ScheduleHeatmap";
import SubmissionModal from "@/components/schedule/SubmissionModal";
import DeleteSubmissionModal from "@/components/schedule/DeleteSubmissionModal";
import { SchedulePoll, ScheduleSubmission } from "@/types/database";
import { Calendar, Users, BarChart3, CheckCircle2, Share2, Sparkles, Lock, AlertCircle, Trash2, ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string; pollId: string }>;
}) {
  const resolvedParams = use(params);
  const { slug, pollId } = resolvedParams;

  const [activeTab, setActiveTab] = useState<"input" | "heatmap">("input");
  const [poll, setPoll] = useState<SchedulePoll | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<ScheduleSubmission[]>([]);
  const [sectionData, setSectionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteSubmissionModalOpen, setIsDeleteSubmissionModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  // 로컬 스토리지에 저장된 사용자 제출 정보 복원
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSlots = localStorage.getItem(`smp_slots_${pollId}`);
      if (savedSlots) {
        try {
          const parsed = JSON.parse(savedSlots);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedSlots(parsed);
            setIsSubmitted(true);
          }
        } catch {}
      }
    }
  }, [pollId]);

  // Supabase 데이터 로드
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // 1. 분반 및 과목 정보 조회
        const { data: sec } = await supabase
          .from("sections")
          .select("*, courses(*)")
          .eq("slug", slug)
          .single();

        if (sec) {
          setSectionData(sec);
        }

        // 2. 투표 정보 조회
        const { data: pollData, error: pollError } = await supabase
          .from("schedule_polls")
          .select("*")
          .eq("id", pollId)
          .single();

        if (pollError || !pollData) {
          setNotFound(true);
          return;
        }

        setPoll(pollData);
        if (pollData.is_closed) {
          setActiveTab("heatmap");
        }

        // 제출된 전체 시간표 조회
        const { data: subsData } = await supabase
          .from("schedule_submissions")
          .select("*")
          .eq("poll_id", pollId);

        setSubmissions(subsData || []);
      } catch (err) {
        console.error("데이터 로드 오류:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [slug, pollId]);

  // 멘티 시간표 제출 핸들러 (무회원가입)
  const handleFormSubmit = async ({
    participantName,
    pin,
    guestToken,
  }: {
    participantName: string;
    pin: string;
    guestToken: string;
  }) => {
    // 1. Supabase 연결 시 DB에 직접 Upsert
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const { error } = await supabase.from("schedule_submissions").upsert(
        {
          poll_id: pollId,
          participant_name: participantName,
          pin_hash: pin,
          guest_token: guestToken,
          available_slots: selectedSlots,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "poll_id,participant_name" }
      );

      if (error) {
        console.error("제출 에러:", error);
      }
    }

    // 2. 로컬 상태 업데이트
    const newSubmission: ScheduleSubmission = {
      id: `sub-${Date.now()}`,
      poll_id: pollId,
      participant_name: participantName,
      pin_hash: pin,
      guest_token: guestToken,
      available_slots: selectedSlots,
      updated_at: new Date().toISOString(),
    };

    setSubmissions((prev) => {
      const filtered = prev.filter((s) => s.participant_name !== participantName);
      return [...filtered, newSubmission];
    });

    localStorage.setItem(`smp_slots_${pollId}`, JSON.stringify(selectedSlots));
    setIsSubmitted(true);
    setActiveTab("heatmap"); // 제출 완료 후 즉시 히트맵 결과로 전환
  };

  // 시간 조율 제출 내역 삭제 모달 오픈 (이름 + PIN 확인 필수)
  const handleDeleteSubmission = () => {
    setIsDeleteSubmissionModalOpen(true);
  };

  // 시간 조율 투표 삭제 (멘토 대시보드 전용 안내)
  const handleDeletePoll = () => {
    alert("시간 조율 투표 삭제는 멘토 대시보드에서만 가능합니다.");
  };

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
            존재하지 않는 시간 투표입니다
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            요청하신 주소에 해당하는 시간 조율 투표를 찾을 수 없습니다.
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
    <main className="min-h-screen pb-16 bg-slate-50 dark:bg-slate-950">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
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

      {isLoading || !poll ? (
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6 space-y-4">
          <div className="h-8 w-48 rounded-2xl bg-white dark:bg-slate-900 animate-pulse" />
          <div className="h-12 rounded-2xl bg-white dark:bg-slate-900 animate-pulse" />
          <div className="h-96 rounded-3xl bg-white dark:bg-slate-900 animate-pulse" />
        </div>
      ) : (
        <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
          {/* 투표 제목 */}
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              {poll.title}
            </h2>
          </div>

        {/* 2. 탭 전환 바 (내 시간표 입력 vs 전체 취합 히트맵) */}
        <div className="mb-6 flex rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "input"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>내 가능 시간 선택</span>
            {selectedSlots.length > 0 && (
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                {selectedSlots.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("heatmap")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "heatmap"
                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>취합 결과 (히트맵)</span>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {submissions.length}명 제출
            </span>
          </button>
        </div>

        {/* 3. 탭 1: 시간 선택 화면 */}
        {activeTab === "input" && (
          <div>
            <ScheduleGrid
              dates={poll.dates}
              startTime={poll.start_time}
              endTime={poll.end_time}
              slotDuration={poll.slot_duration}
              selectedSlots={selectedSlots}
              onChange={poll.is_closed ? () => {} : setSelectedSlots}
              headerAction={
                selectedSlots.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSlots([])}
                    className="rounded-lg border border-slate-300 bg-white hover:bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition active:scale-95 flex items-center gap-0.5 whitespace-nowrap"
                  >
                    <span>선택 초기화</span>
                  </button>
                ) : null
              }
            />

            {/* 데스크톱용 하단 제출 버튼 */}
            {!poll.is_closed && (
              <div className="hidden sm:flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={selectedSlots.length === 0}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSubmitted ? "내 시간표 수정 완료" : "내 시간표 제출하기"}
                </button>
              </div>
            )}

            {/* 하단 고정 제출 플로팅 버튼 (모바일 전용, 진행 중일 때만 표시) */}
            {!poll.is_closed && (
              <div className="fixed bottom-4 left-4 right-4 z-20 sm:hidden">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={selectedSlots.length === 0}
                  className="w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-xl hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {selectedSlots.length > 0
                    ? `${selectedSlots.length}개 선택 완료 (${isSubmitted ? "수정하기" : "제출하기"})`
                    : "가능한 시간을 선택해주세요"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. 탭 2: 취합 히트맵 결과 화면 */}
        {activeTab === "heatmap" && (
          <div>
            <ScheduleHeatmap
              dates={poll.dates}
              startTime={poll.start_time}
              endTime={poll.end_time}
              slotDuration={poll.slot_duration}
              submissions={submissions}
              confirmedSlot={poll.confirmed_slot}
              headerAction={
                <button
                  type="button"
                  onClick={() => setIsDeleteSubmissionModalOpen(true)}
                  className="rounded-xl border border-rose-200 bg-white hover:bg-rose-50 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-rose-600 transition active:scale-95 flex items-center gap-1 shadow-2xs whitespace-nowrap"
                  title="내 제출 내역 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>내 제출 내역 삭제</span>
                </button>
              }
            />
          </div>
        )}
      </div>
    )}

      {/* 무회원가입 제출 모달 */}
      <SubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        selectedCount={selectedSlots.length}
        isEditMode={isSubmitted}
      />

      {/* 투표 내역 삭제 (이름 + PIN 확인 필수) 모달 */}
      <DeleteSubmissionModal
        isOpen={isDeleteSubmissionModalOpen}
        onClose={() => setIsDeleteSubmissionModalOpen(false)}
        pollId={pollId}
        submissions={submissions}
        onDeleted={(deletedName) => {
          setSubmissions((prev) =>
            prev.filter(
              (s) =>
                s.participant_name.trim().toLowerCase() !==
                deletedName.toLowerCase()
            )
          );
          const savedName =
            typeof window !== "undefined"
              ? localStorage.getItem("smp_participant_name")
              : "";
          if (
            savedName &&
            savedName.trim().toLowerCase() === deletedName.toLowerCase()
          ) {
            setSelectedSlots([]);
            setIsSubmitted(false);
          }
        }}
      />
    </main>
  );
}

