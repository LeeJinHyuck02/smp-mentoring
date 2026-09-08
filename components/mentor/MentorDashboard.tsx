"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Course, Section, SchedulePoll } from "@/types/database";
import AuthModal from "@/components/mentor/AuthModal";
import CreateCourseModal from "@/components/mentor/CreateCourseModal";
import CreateSectionModal from "@/components/mentor/CreateSectionModal";
import CreatePollModal from "@/components/mentor/CreatePollModal";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Share2,
  ExternalLink,
  Users,
  LogOut,
  LogIn,
  CheckCircle2,
} from "lucide-react";

export default function MentorDashboard() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sections, setSections] = useState<Record<string, Section[]>>({});
  const [polls, setPolls] = useState<Record<string, SchedulePoll[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [sectionModalTarget, setSectionModalTarget] = useState<{ id: string; title: string } | null>(null);
  const [pollModalTarget, setPollModalTarget] = useState<{ id: string; name: string; slug: string } | null>(null);

  // 복사 피드백 상태
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 1. 세션 확인 및 데이터 로드
  const loadData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // 멘토가 소유한 과목 조회
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("mentor_id", userId)
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      if (session?.user) {
        loadData(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (session?.user) {
        loadData(session.user.id);
      } else {
        setCourses([]);
        setSections({});
        setPolls({});
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCopy = (id: string, url: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // 로그인하지 않은 경우 보여줄 관리자 로그인 진입 화면
  if (!sessionUser) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-slate-100 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-md mb-5">
            SMP
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            SMP 멘토 관리 센터
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
            한 계정으로 담당 과목과 분반을 손쉽게 개설하고,<br />
            멘티들이 올린 시간표와 질의응답을 통합 관리하세요.
          </p>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              멘토 로그인 / 가입하기
            </button>

            {/* 데모 체험 링크 */}
            <Link
              href="/s/demo-class/schedule/demo-poll"
              className="block w-full rounded-2xl bg-slate-100 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition active:scale-95"
            >
              스케줄러 멘티 화면 먼저 둘러보기 ↗
            </Link>
          </div>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            supabase.auth.getUser().then(({ data }) => {
              if (data?.user) {
                setSessionUser(data.user);
                loadData(data.user.id);
              }
            });
          }}
        />
      </main>
    );
  }

  // 로그인된 멘토 메인 대시보드
  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* 1. 상단 글로벌 헤더 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-black text-white text-base shadow-sm">
              SMP
            </span>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                멘토 워크스페이스
              </h1>
              <span className="text-[11px] font-medium text-slate-500">
                {sessionUser?.email}
              </span>
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
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition active:scale-95 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
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
                  className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm"
                >
                  {/* 과목 헤더 */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 mr-2">
                        {course.semester}
                      </span>
                      <h2 className="inline text-lg font-black text-slate-900 align-middle">
                        {course.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSectionModalTarget({ id: course.id, title: course.title })
                      }
                      className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition active:scale-95 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      분반 추가
                    </button>
                  </div>

                  {/* 분반 목록 */}
                  {courseSections.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      등록된 분반이 없습니다. [분반 추가] 버튼을 눌러 분반을 만들어주세요.
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courseSections.map((sec) => {
                        const secPolls = polls[sec.id] || [];
                        const sectionUrl = typeof window !== "undefined"
                          ? `${window.location.origin}/s/${sec.slug}`
                          : `/s/${sec.slug}`;

                        return (
                          <div
                            key={sec.id}
                            className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 hover:border-slate-300 transition shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <span className="text-xs font-mono font-bold text-slate-400 block leading-none mb-1">
                                  /s/{sec.slug}
                                </span>
                                <h3 className="font-extrabold text-slate-900 text-base">
                                  {sec.name}
                                </h3>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setPollModalTarget({
                                    id: sec.id,
                                    name: sec.name,
                                    slug: sec.slug,
                                  })
                                }
                                className="rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition active:scale-95 flex items-center gap-1 shadow-sm"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                + 시간 투표
                              </button>
                            </div>

                            {/* 단톡방 공유 링크 복사 바 */}
                            <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 border border-slate-200/80 text-xs">
                              <span className="truncate text-slate-500 font-mono text-[11px]">
                                {sectionUrl}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(sec.id, sectionUrl)}
                                className="shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700 transition active:scale-95 flex items-center gap-1"
                              >
                                {copiedId === sec.id ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">복사됨!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3 h-3 text-slate-500" />
                                    <span>단톡방 링크 복사</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* 이 분반의 스케줄 투표 목록 */}
                            <div>
                              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                진행 중인 시간 조율 ({secPolls.length}개)
                              </div>

                              {secPolls.length === 0 ? (
                                <div className="rounded-xl bg-white/60 p-3 text-center text-[11px] text-slate-400 border border-slate-100">
                                  개설된 투표가 없습니다. [+ 시간 투표]를 눌러 멘티들에게 시간을 받아보세요!
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {secPolls.map((poll) => {
                                    const pollUrl = `/s/${sec.slug}/schedule/${poll.id}`;

                                    return (
                                      <div
                                        key={poll.id}
                                        className="rounded-xl bg-white p-3 border border-slate-200 shadow-sm flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="font-bold text-xs text-slate-800 truncate">
                                            {poll.title}
                                          </div>
                                          <div className="text-[11px] text-slate-400 mt-0.5">
                                            {poll.dates.length}일간 ({poll.start_time} ~ {poll.end_time})
                                          </div>
                                        </div>

                                        <Link
                                          href={pollUrl}
                                          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition active:scale-95"
                                        >
                                          <span>히트맵 보기</span>
                                          <ExternalLink className="w-3 h-3" />
                                        </Link>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
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
        mentorId={sessionUser?.id}
        onSuccess={() => sessionUser && loadData(sessionUser.id)}
      />

      {sectionModalTarget && (
        <CreateSectionModal
          isOpen={!!sectionModalTarget}
          onClose={() => setSectionModalTarget(null)}
          courseId={sectionModalTarget.id}
          courseTitle={sectionModalTarget.title}
          onSuccess={() => sessionUser && loadData(sessionUser.id)}
        />
      )}

      {pollModalTarget && (
        <CreatePollModal
          isOpen={!!pollModalTarget}
          onClose={() => setPollModalTarget(null)}
          sectionId={pollModalTarget.id}
          sectionName={pollModalTarget.name}
          sectionSlug={pollModalTarget.slug}
          onSuccess={() => sessionUser && loadData(sessionUser.id)}
        />
      )}
    </main>
  );
}
