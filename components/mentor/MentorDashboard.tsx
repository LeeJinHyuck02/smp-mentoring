"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Course, Section, SchedulePoll, Survey } from "@/types/database";
import CreateCourseModal from "@/components/mentor/CreateCourseModal";
import CreateSectionModal from "@/components/mentor/CreateSectionModal";
import CreatePollModal from "@/components/mentor/CreatePollModal";
import CreateSurveyModal from "@/components/mentor/CreateSurveyModal";
import SurveyResultsModal from "@/components/mentor/SurveyResultsModal";
import MentorSectionCard from "@/components/mentor/MentorSectionCard";
import QuestionBoard from "@/components/qna/QuestionBoard";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Share2,
  ExternalLink,
  Users,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  MessageSquare,
  ClipboardList,
  X,
  Lock,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

export const DEFAULT_MENTOR_ID = "00000000-0000-0000-0000-000000000001";

interface MentorDashboardProps {
  onLogout?: () => void;
}

export default function MentorDashboard({ onLogout }: MentorDashboardProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Record<string, Section[]>>({});
  const [polls, setPolls] = useState<Record<string, SchedulePoll[]>>({});
  const [surveys, setSurveys] = useState<Record<string, Survey[]>>({});
  const [questionStats, setQuestionStats] = useState<
    Record<string, { total: number; unresolved: number }>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [sectionModalTarget, setSectionModalTarget] = useState<{ id: string; title: string } | null>(null);
  const [pollModalTarget, setPollModalTarget] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [createSurveyTarget, setCreateSurveyTarget] = useState<{ id: string; name: string } | null>(null);
  const [surveyResultsTarget, setSurveyResultsTarget] = useState<{ id: string; sectionName: string } | null>(null);
  const [qnaModalTarget, setQnaModalTarget] = useState<{ id: string; name: string } | null>(null);


  // 1. 과목/분반/투표 데이터 로드 (회원가입 없이 즉시 조회)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 멘토가 소유한 과목 조회 (단일 멘토 전용: 전체 과목 로드)
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (courseData) {
        setCourses(courseData);

        // 각 과목별 분반 조회
        const courseIds = courseData.map((c) => c.id);
        if (courseIds.length > 0) {
          const { data: secData } = await supabase
            .from("sections")
            .select("*")
            .in("course_id", courseIds)
            .order("created_at", { ascending: true });

          if (secData) {
            const secMap: Record<string, Section[]> = {};
            secData.forEach((sec) => {
              if (!secMap[sec.course_id]) secMap[sec.course_id] = [];
              secMap[sec.course_id].push(sec);
            });
            setSections(secMap);

            // 각 분반별 스케줄 투표 조회
            const secIds = secData.map((s) => s.id);
            if (secIds.length > 0) {
              const { data: pollData } = await supabase
                .from("schedule_polls")
                .select("*")
                .in("section_id", secIds)
                .order("created_at", { ascending: false });

              if (pollData) {
                const pollMap: Record<string, SchedulePoll[]> = {};
                pollData.forEach((poll) => {
                  if (!pollMap[poll.section_id]) pollMap[poll.section_id] = [];
                  pollMap[poll.section_id].push(poll);
                });
                setPolls(pollMap);
              }

              // 각 분반별 설문조사 조회
              const { data: surveyData } = await supabase
                .from("surveys")
                .select("*")
                .in("section_id", secIds)
                .order("created_at", { ascending: false });

              if (surveyData) {
                const surveyMap: Record<string, Survey[]> = {};
                surveyData.forEach((srv) => {
                  if (!surveyMap[srv.section_id]) surveyMap[srv.section_id] = [];
                  surveyMap[srv.section_id].push(srv);
                });
                setSurveys(surveyMap);
              }

              // 각 분반별 질문 통계 (전체 / 미답변) 조회
              const { data: qData } = await supabase
                .from("questions")
                .select("section_id, status")
                .in("section_id", secIds);

              if (qData) {
                const qMap: Record<string, { total: number; unresolved: number }> = {};
                qData.forEach((q: any) => {
                  if (!qMap[q.section_id]) {
                    qMap[q.section_id] = { total: 0, unresolved: 0 };
                  }
                  qMap[q.section_id].total += 1;
                  if (q.status !== "resolved") {
                    qMap[q.section_id].unresolved += 1;
                  }
                });
                setQuestionStats(qMap);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("데이터 로드 오류:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  // 멘토링 시간 조율 ON/OFF 상태 토글
  const handleTogglePoll = async (pollId: string, currentIsClosed: boolean) => {
    const nextClosed = !currentIsClosed;

    // 즉각적인 UI 반영 (낙관적 갱신)
    setPolls((prev) => {
      const nextMap = { ...prev };
      for (const secId in nextMap) {
        nextMap[secId] = nextMap[secId].map((p) =>
          p.id === pollId ? { ...p, is_closed: nextClosed } : p
        );
      }
      return nextMap;
    });

    try {
      const { error } = await supabase
        .from("schedule_polls")
        .update({ is_closed: nextClosed })
        .eq("id", pollId);

      if (error) {
        console.error("시간 조율 상태 변경 실패:", error);
        loadData();
      }
    } catch (err) {
      console.error("시간 조율 상태 변경 오류:", err);
      loadData();
    }
  };

  // 시간 조율 투표 삭제 핸들러
  const handleDeletePoll = async (pollId: string, pollTitle: string) => {
    if (
      !window.confirm(
        `"${pollTitle}" 시간 조율 투표를 정말 삭제하시겠습니까?\n제출된 학생들의 시간표 데이터도 함께 영구 삭제됩니다.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("schedule_polls").delete().eq("id", pollId);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert("시간 조율 삭제 중 오류가 발생했습니다: " + err.message);
    }
  };

  // 설문조사 삭제 핸들러
  const handleDeleteSurvey = async (surveyId: string, surveyTitle: string) => {
    if (
      !window.confirm(
        `"${surveyTitle}" 설문조사를 정말 삭제하시겠습니까?\n제출된 학생들의 모든 응답 데이터도 함께 영구 삭제됩니다.`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("surveys").delete().eq("id", surveyId);
      if (error) throw error;
      loadData();
    } catch (err: any) {
      alert("설문조사 삭제 중 오류가 발생했습니다: " + err.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-base shadow-sm">
              SMP
            </span>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                멘토 워크스페이스
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(true)}
              className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              과목 개설
            </button>
            <button
              type="button"
              onClick={loadData}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 flex items-center gap-1"
              title="데이터 새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">새로고침</span>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition active:scale-95 flex items-center gap-1.5"
                title="멘토 워크스페이스 잠금"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>잠금</span>
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        {/* 로딩 인디케이터 */}
        {isLoading && courses.length === 0 && (
          <div className="flex flex-col justify-center items-center py-20 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-xs font-bold text-slate-600">Supabase 데이터를 불러오는 중입니다...</p>
          </div>
        )}

        {/* 과목 목록 영역 */}
        {courses.length === 0 && !isLoading ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center my-8">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              아직 개설된 멘토링 과목이 없습니다.
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              담당하시는 과목(예: C프로그래밍, 자료구조)을 먼저 등록해 주세요.
            </p>
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />첫 과목 개설하기
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {courses.map((course) => {
              const courseSections = sections[course.id] || [];

              return (
                <div
                  key={course.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm"
                >
                  {/* 과목 헤더 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mr-2">
                        {course.semester}
                      </span>
                      <h2 className="inline text-lg font-black text-slate-900 dark:text-white align-middle">
                        {course.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSectionModalTarget({ id: course.id, title: course.title })
                      }
                      className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition active:scale-95 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      분반 추가
                    </button>
                  </div>

                  {/* 분반 목록 */}
                  {courseSections.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                      등록된 분반이 없습니다. [분반 추가] 버튼을 눌러 분반을 만들어주세요.
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courseSections.map((sec) => {
                        const secPolls = polls[sec.id] || [];
                        const secSurveys = surveys[sec.id] || [];
                        const secQStats = questionStats[sec.id] || { total: 0, unresolved: 0 };

                        return (
                          <MentorSectionCard
                            key={sec.id}
                            section={sec}
                            polls={secPolls}
                            surveys={secSurveys}
                            questionStats={secQStats}
                            onOpenCreatePoll={() =>
                              setPollModalTarget({
                                id: sec.id,
                                name: sec.name,
                                slug: sec.slug,
                              })
                            }
                            onOpenCreateSurvey={() =>
                              setCreateSurveyTarget({
                                id: sec.id,
                                name: sec.name,
                              })
                            }
                            onOpenSurveyResults={(surveyId) =>
                              setSurveyResultsTarget({
                                id: surveyId,
                                sectionName: sec.name,
                              })
                            }
                            onOpenQna={() =>
                              setQnaModalTarget({
                                id: sec.id,
                                name: sec.name,
                              })
                            }
                            onDeletePoll={handleDeletePoll}
                            onDeleteSurvey={handleDeleteSurvey}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 모달 창 모음 */}
      <CreateCourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        mentorId={DEFAULT_MENTOR_ID}
        onSuccess={loadData}
      />

      {sectionModalTarget && (
        <CreateSectionModal
          isOpen={!!sectionModalTarget}
          onClose={() => setSectionModalTarget(null)}
          courseId={sectionModalTarget.id}
          courseTitle={sectionModalTarget.title}
          onSuccess={loadData}
        />
      )}

      {pollModalTarget && (
        <CreatePollModal
          isOpen={!!pollModalTarget}
          onClose={() => setPollModalTarget(null)}
          sectionId={pollModalTarget.id}
          sectionName={pollModalTarget.name}
          sectionSlug={pollModalTarget.slug}
          onSuccess={loadData}
        />
      )}

      {createSurveyTarget && (
        <CreateSurveyModal
          isOpen={!!createSurveyTarget}
          onClose={() => setCreateSurveyTarget(null)}
          sectionId={createSurveyTarget.id}
          sectionName={createSurveyTarget.name}
          onSuccess={loadData}
        />
      )}

      {surveyResultsTarget && (
        <SurveyResultsModal
          isOpen={!!surveyResultsTarget}
          onClose={() => setSurveyResultsTarget(null)}
          surveyId={surveyResultsTarget.id}
          sectionName={surveyResultsTarget.sectionName}
          onUpdated={loadData}
        />
      )}

      {/* 멘토 전용 Q&A 답변 및 관리 모달 */}
      {qnaModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
                  [{qnaModalTarget.name}]
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  분반 질의응답 (멘토 관리 모드)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQnaModalTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QuestionBoard sectionId={qnaModalTarget.id} isMentor={true} />
          </div>
        </div>
      )}
    </main>
  );
}
