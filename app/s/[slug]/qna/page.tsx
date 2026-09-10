"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import QuestionBoard from "@/components/qna/QuestionBoard";
import {
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function MenteeQnaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;

  const [sectionData, setSectionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadSection() {
      setIsLoading(true);
      try {
        const { data: sec, error: secError } = await supabase
          .from("sections")
          .select("*, courses(*, mentor_profiles(*))")
          .eq("slug", slug)
          .single();

        if (secError || !sec) {
          setNotFound(true);
          return;
        }

        setSectionData(sec);
      } catch (err) {
        console.error("Q&A 페이지 로드 오류:", err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadSection();
  }, [slug]);

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
            존재하지 않는 분반입니다
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            요청하신 주소(<code>/s/{slug}/qna</code>)에 해당하는 분반이 없습니다.
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
      {/* 상단 네비게이션 헤더 */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
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
                  <span className="hidden sm:inline">Q&A 링크 복사</span>
                </>
              )}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 본문: QuestionBoard 컴포넌트 */}
      <div className="mx-auto max-w-4xl px-4 pt-5 sm:px-6">
        {sectionData ? (
          <QuestionBoard
            sectionId={sectionData.id}
            isMentor={false}
            mentorName={sectionData.courses?.mentor_profiles?.full_name}
          />
        ) : (
          <div className="space-y-4 py-8">
            <div className="h-14 rounded-2xl bg-white dark:bg-slate-900 animate-pulse" />
            <div className="h-40 rounded-2xl bg-white dark:bg-slate-900 animate-pulse" />
          </div>
        )}
      </div>
    </main>
  );
}

