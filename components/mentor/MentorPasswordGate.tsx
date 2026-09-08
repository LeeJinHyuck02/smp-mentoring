"use client";

import React, { useState, useEffect } from "react";
import MentorDashboard from "@/components/mentor/MentorDashboard";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { verifyMentorPassword } from "@/app/mentor/actions";

export default function MentorPasswordGate() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 세션 스토리지에서 이전 인증 상태 복원
  useEffect(() => {
    if (typeof window !== "undefined") {
      const authed = sessionStorage.getItem("smp_mentor_authed");
      if (authed === "true") {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!password.trim()) {
      setErrorMsg("비밀번호를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const isValid = await verifyMentorPassword(password);

      if (isValid) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("smp_mentor_authed", "true");
        }
        setIsAuthenticated(true);
      } else {
        setErrorMsg("비밀번호가 올바르지 않습니다. 다시 확인해 주세요.");
      }
    } catch {
      setErrorMsg("인증 확인 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("smp_mentor_authed");
    }
    setIsAuthenticated(false);
    setPassword("");
    setErrorMsg("");
  };

  // 인증 상태 로딩 중 (초기 깜빡임 방지)
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  // 이미 인증된 경우 멘토 대시보드 렌더링
  if (isAuthenticated) {
    return <MentorDashboard onLogout={handleLogout} />;
  }

  // 비밀번호 입력 화면
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* 상단 락 아이콘 및 헤더 */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-400/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            SMP 멘토 전용 보안 공간
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            멘토 관리자 인증
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            과목 개설, 분반 링크 관리 및 멘토링 시간 조율을 위해<br />
            설정된 마스터 비밀번호를 입력해 주세요.
          </p>
        </div>

        {/* 비밀번호 입력 폼 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                placeholder="마스터 비밀번호 입력"
                autoFocus
                className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3.5 pr-11 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                title={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>워크스페이스 입장</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}

