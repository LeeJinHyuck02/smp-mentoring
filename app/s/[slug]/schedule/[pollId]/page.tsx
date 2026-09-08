"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase/client";
import ScheduleGrid from "@/components/schedule/ScheduleGrid";
import ScheduleHeatmap from "@/components/schedule/ScheduleHeatmap";
import SubmissionModal from "@/components/schedule/SubmissionModal";
import { SchedulePoll, ScheduleSubmission } from "@/types/database";
import { Calendar, Users, BarChart3, CheckCircle2, Share2, Sparkles } from "lucide-react";

// 데모용 기본 스케줄 데이터 (Supabase 연결 전에도 즉시 체험 가능)
const DEMO_POLL: SchedulePoll = {
  id: "demo-poll-01",
  section_id: "demo-sec-01",
  title: "3주차 멘토링 보강 일정 조율",
  dates: ["2026-09-15", "2026-09-16", "2026-09-17"],
  start_time: "10:00",
  end_time: "20:00",
  slot_duration: 30,
  is_closed: false,
  confirmed_slot: null,
  created_at: new Date().toISOString(),
};

const INITIAL_DEMO_SUBMISSIONS: ScheduleSubmission[] = [
  {
    id: "sub-1",
    poll_id: "demo-poll-01",
    participant_name: "김민수",
    pin_hash: "1234",
    available_slots: [
      "2026-09-15T14:00", "2026-09-15T14:30", "2026-09-15T15:00", "2026-09-15T15:30",
      "2026-09-16T15:00", "2026-09-16T15:30", "2026-09-16T16:00"
    ],
    updated_at: new Date().toISOString(),
  },
  {
    id: "sub-2",
    poll_id: "demo-poll-01",
    participant_name: "이영희",
    pin_hash: "1234",
    available_slots: [
      "2026-09-15T14:00", "2026-09-15T14:30", "2026-09-15T15:00",
      "2026-09-17T13:00", "2026-09-17T13:30"
    ],
    updated_at: new Date().toISOString(),
  },
  {
    id: "sub-3",
    poll_id: "demo-poll-01",
    participant_name: "박지성",
    pin_hash: "1234",
    available_slots: [
      "2026-09-15T14:00", "2026-09-15T14:30", "2026-09-15T15:00", "2026-09-15T15:30",
      "2026-09-16T15:00", "2026-09-16T15:30"
    ],
    updated_at: new Date().toISOString(),
  }
];

export default function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string; pollId: string }>;
}) {
  const resolvedParams = use(params);
  const { slug, pollId } = resolvedParams;

  const [activeTab, setActiveTab] = useState<"input" | "heatmap">("input");
  const [poll, setPoll] = useState<SchedulePoll>(DEMO_POLL);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<ScheduleSubmission[]>(INITIAL_DEMO_SUBMISSIONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Supabase 데이터 로드 (환경변수 설정 시 실제 DB 조회)
  useEffect(() => {
    async function loadData() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

      try {
        // 투표 정보 조회
        const { data: pollData } = await supabase
          .from("schedule_polls")
          .select("*")
          .eq("id", pollId)
          .single();

        if (pollData) {
          setPoll(pollData);
        }

        // 제출된 전체 시간표 조회
        const { data: subsData } = await supabase
          .from("schedule_submissions")
          .select("*")
          .eq("poll_id", pollId);

        if (subsData && subsData.length > 0) {
          setSubmissions(subsData);
        }
      } catch (err) {
        console.warn("Supabase 데이터 로드 중 오류 (데모 모드 유지):", err);
      }
    }

    loadData();
  }, [pollId]);

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

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="min-h-screen pb-16 bg-slate-50">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm">
              SMP
            </span>
            <div>
              <span className="text-[11px] font-bold text-indigo-600 tracking-wide uppercase block leading-none">
                분반 코드: {slug}
              </span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {poll.title}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-95"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">링크 복사됨!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">링크 공유</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 sm:pt-6">
        {/* 2. 탭 전환 바 (내 시간표 입력 vs 전체 취합 히트맵) */}
        <div className="mb-6 flex rounded-2xl bg-slate-200/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("input")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "input"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. 내 가능 시간 선택</span>
            {selectedSlots.length > 0 && (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                {selectedSlots.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("heatmap")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeTab === "heatmap"
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>2. 실시간 취합 결과 (히트맵)</span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              {submissions.length}명 제출
            </span>
          </button>
        </div>

        {/* 3. 탭 1: 시간 선택 화면 */}
        {activeTab === "input" && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  내가 참석 가능한 시간을 선택하세요
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  초록색으로 칠해진 시간이 내가 제출할 시간입니다. (회원가입 필요 없음)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={selectedSlots.length === 0}
                className="w-full sm:w-auto rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                {isSubmitted ? "내 시간표 수정 완료" : "내 시간표 제출하기"}
              </button>
            </div>

            <ScheduleGrid
              dates={poll.dates}
              startTime={poll.start_time}
              endTime={poll.end_time}
              slotDuration={poll.slot_duration}
              selectedSlots={selectedSlots}
              onChange={setSelectedSlots}
            />

            {/* 하단 고정 제출 플로팅 버튼 (모바일 전용) */}
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
          </div>
        )}

        {/* 4. 탭 2: 취합 히트맵 결과 화면 */}
        {activeTab === "heatmap" && (
          <div>
            <div className="mb-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                멘토링 참여 가능 시간 종합 현황
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                색이 짙을수록 더 많은 멘티가 참석 가능한 황금 시간대입니다.
              </p>
            </div>

            <ScheduleHeatmap
              dates={poll.dates}
              startTime={poll.start_time}
              endTime={poll.end_time}
              slotDuration={poll.slot_duration}
              submissions={submissions}
              confirmedSlot={poll.confirmed_slot}
            />
          </div>
        )}
      </div>

      {/* 무회원가입 제출 모달 */}
      <SubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        selectedCount={selectedSlots.length}
        isEditMode={isSubmitted}
      />
    </main>
  );
}

