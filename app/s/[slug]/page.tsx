"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase/client";
import { SchedulePoll, ScheduleSubmission } from "@/types/database";
import ScheduleGrid from "@/components/schedule/ScheduleGrid";
import ScheduleHeatmap from "@/components/schedule/ScheduleHeatmap";
import SubmissionModal from "@/components/schedule/SubmissionModal";
import QuestionBoard from "@/components/qna/QuestionBoard";
import {
  Calendar,
  MessageSquare,
  Sparkles,
  BarChart3,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Share2,
} from "lucide-react";

export default function MenteeSectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;

  // 네비게이션 메인 탭: 'schedule' (시간 조율) vs 'qna' (질의응답)
  const [activeMainTab, setActiveMainTab] = useState<"schedule" | "qna">("schedule");

  // 스케줄러 서브 탭: 'input' (내 시간 입력) vs 'heatmap' (실시간 취합 결과)
  const [activeScheduleSubTab, setActiveScheduleSubTab] = useState<"input" | "heatmap">("input");

  // 데이터 상태
  const [sectionData, setSectionData] = useState<any>(null);
  const [poll, setPoll] = useState<SchedulePoll | null>(null);
  const [submissions, setSubmissions] = useState<ScheduleSubmission[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 모달 및 상태
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. 해당 슬러그의 분반 정보 및 스케줄 투표 로드 (타 분반 접근 원천 차단)
  useEffect(() => {
    async function loadSectionInfo() {
      setIsLoading(true);
      try {
        // 1) 분반 정보 및 과목 정보 단일 조회
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

        // 2) 이 분반의 최신 시간 조율 투표 조회
        const { data: pollsData } = await supabase
          .from("schedule_polls")
          .select("*")
          .eq("section_id", sec.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (pollsData && pollsData.length > 0) {
          const currentPoll = pollsData[0];
          setPoll(currentPoll);

          // 이 투표에 제출된 시간표들 조회
          const { data: subsData } = await supabase
            .from("schedule_submissions")
            .select("*")
            .eq("poll_id", currentPoll.id);

          if (subsData) {
            setSubmissions(subsData);
          }

          // 로컬스토리지에서 이 사용자의 이전 제출 시간표 복원
          if (typeof window !== "undefined") {
            const savedSlots = localStorage.getItem(`smp_slots_${currentPoll.id}`);
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
        }
      } catch (err) {
        console.error("데이터 로드 오류:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadSectionInfo();
  }, [slug]);

  // 시간표 제출 처리
  const handleScheduleSubmit = async ({
    participantName,
    pin,
    guestToken,
  }: {
    participantName: string;
    pin: string;
    guestToken: string;
  }) => {
    if (!poll) return;

    // Supabase에 시간표 저장 (동일 이름 시 업데이트)
    const { error } = await supabase.from("schedule_submissions").upsert(
      {
        poll_id: poll.id,
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

    // 로컬 상태 즉시 갱신
    const updatedSub: ScheduleSubmission = {
      id: `sub-${Date.now()}`,
      poll_id: poll.id,
      participant_name: participantName,
      pin_hash: pin,
      guest_token: guestToken,
      available_slots: selectedSlots,
      updated_at: new Date().toISOString(),
    };

    setSubmissions((prev) => {
      const filtered = prev.filter((s) => s.participant_name !== participantName);
      return [...filtered, updatedSub];
    });

    localStorage.setItem(`smp_slots_${poll.id}`, JSON.stringify(selectedSlots));
    setIsSubmitted(true);
    setActiveScheduleSubTab("heatmap"); // 제출 즉시 취합 결과로 전환
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 분반이 존재하지 않는 경우 (잘못된 URL 접근 차단)
  if (notFound && !isLoading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-xl border border-slate-100 max-w-sm w-full">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
          <h2 className="text-lg font-black text-slate-900 mb-1">
            존재하지 않는 분반입니다
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            요청하신 주소(<code>/s/{slug}</code>)에 해당하는 분반이 없습니다.<br />
            멘토에게 전달받은 단톡방 링크를 다시 확인해 주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* 1. 상단 분반 전용 헤더 (타 분반 탐색 불가 - 완벽한 격리) */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-sm shadow-sm">
              SMP
            </span>
            <div>
              <span className="text-[11px] font-bold text-indigo-600 block leading-tight">
                {sectionData?.courses?.title || "멘토링 과목"}
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                {sectionData?.name || "분반 페이지"}
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
                <span className="text-emerald-600 font-bold">링크 복사됨!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">링크 복사</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-5 sm:px-6">
        {/* 2. 메인 2대 탭: 🕒 시간 조율 vs 💬 Q&A 게시판 */}
        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-200/80 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveMainTab("schedule")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-extrabold transition-all ${
              activeMainTab === "schedule"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. 멘토링 시간 조율</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab("qna")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-extrabold transition-all ${
              activeMainTab === "qna"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>2. 질문 게시판 (Q&A)</span>
          </button>
        </div>

        {/* 3. 탭 1 내용: 시간 조율 */}
        {activeMainTab === "schedule" && (
          <div>
            {!poll && !isLoading ? (
              <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center my-6">
                <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-800">
                  아직 등록된 시간 조율 투표가 없습니다.
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  멘토가 시간을 개설하면 이곳에서 참석 가능한 시간을 선택할 수 있습니다.
                </p>
              </div>
            ) : poll ? (
              <div>
                {/* 시간 조율 서브 탭 (내 시간 선택 vs 히트맵 결과) */}
                <div className="mb-5 flex rounded-xl bg-indigo-50/70 p-1 border border-indigo-100">
                  <button
                    type="button"
                    onClick={() => setActiveScheduleSubTab("input")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                      activeScheduleSubTab === "input"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-indigo-600/70 hover:text-indigo-900"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    내 참석 가능 시간 칠하기
                    {selectedSlots.length > 0 && (
                      <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] text-white font-bold">
                        {selectedSlots.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveScheduleSubTab("heatmap")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                      activeScheduleSubTab === "heatmap"
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-indigo-600/70 hover:text-indigo-900"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    실시간 취합 결과 (히트맵)
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                      {submissions.length}명
                    </span>
                  </button>
                </div>

                {activeScheduleSubTab === "input" ? (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                          {poll.title}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          참석 가능한 요일과 시간대를 터치하거나 드래그하여 선택하세요.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsSubmitModalOpen(true)}
                        disabled={selectedSlots.length === 0}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 disabled:opacity-40 flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isSubmitted ? "시간표 수정 완료" : "시간표 제출하기"}
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

                    {/* 모바일용 플로팅 제출 버튼 */}
                    <div className="fixed bottom-4 left-4 right-4 z-20 sm:hidden">
                      <button
                        type="button"
                        onClick={() => setIsSubmitModalOpen(true)}
                        disabled={selectedSlots.length === 0}
                        className="w-full rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-xl hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {selectedSlots.length > 0
                          ? `${selectedSlots.length}개 선택 (${isSubmitted ? "수정하기" : "제출하기"})`
                          : "참석 가능한 시간을 선택해주세요"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                        {poll.title} - 취합 현황
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        초록색이 짙을수록 더 많은 멘티가 참석 가능한 시간대입니다.
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
            ) : null}
          </div>
        )}

        {/* 4. 탭 2 내용: 질의응답 (Q&A) 게시판 */}
        {activeMainTab === "qna" && sectionData && (
          <QuestionBoard sectionId={sectionData.id} isMentor={false} />
        )}
      </div>

      {/* 무회원가입 시간표 제출 모달 */}
      <SubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleScheduleSubmit}
        selectedCount={selectedSlots.length}
        isEditMode={isSubmitted}
      />
    </main>
  );
}

