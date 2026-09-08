import Link from "next/link";
import { Calendar, MessageSquare, Shield, Smartphone, Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
      {/* 네비게이션 */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-black text-white shadow-md">
              SMP
            </span>
            <div>
              <span className="text-sm font-extrabold text-slate-900 tracking-tight">
                Student Mentoring Program
              </span>
              <span className="hidden sm:inline-block ml-2 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                무회원가입 지원
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/s/demo-class/schedule/demo-poll"
              className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition active:scale-95"
            >
              스케줄러 바로가기
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 mb-6 border border-indigo-100">
          <Sparkles className="w-3.5 h-3.5" />
          대학생 멘토와 멘티를 위한 초간편 전용 플랫폼
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight sm:leading-tight">
          멘티 회원가입 0초.<br className="sm:hidden" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
            {" "}시간표 취합과 Q&A를 한 번에.
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed">
          카카오톡 단톡방에 링크 하나만 공유하세요. 멘티들은 회원가입 없이 바로 시간표를 터치하고,
          익명/비밀 질문을 사진과 함께 편하게 남길 수 있습니다.
        </p>

        {/* 메인 액션 버튼 */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/s/demo-class/schedule/demo-poll"
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            시간표 조율 체험하기
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 핵심 기능 안내 카드 */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">
              When2meet 스타일 스케줄러
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              모바일 터치 및 PC 드래그로 가능한 시간대를 간편 선택. 실시간 참여 인원 히트맵과 최적의 시간대 Top 3를 자동 분석합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">
              비밀글 & 익명 Q&A 게시판
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              문제집 사진 첨부, 4자리 PIN 기반 비밀글 잠금 해제, 익명 질문을 완벽 지원하여 멘티의 질문 참여율을 극대화합니다.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">
              다중 분반 & 멘토 통합 관리
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              한 학기에 여러 과목, 여러 분반을 맡아도 링크 하나씩만 분배하면 끝! 멘토는 하나의 관리자 대시보드에서 모든 분반을 통제합니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

