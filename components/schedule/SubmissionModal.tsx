"use client";

import React, { useState, useEffect } from "react";
import { Lock, User, Check, X, ShieldAlert } from "lucide-react";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { participantName: string; pin: string; guestToken: string }) => Promise<void>;
  selectedCount: number;
  initialName?: string;
  isEditMode?: boolean;
}

export default function SubmissionModal({
  isOpen,
  onClose,
  onSubmit,
  selectedCount,
  initialName = "",
  isEditMode = false,
}: SubmissionModalProps) {
  const [name, setName] = useState(initialName);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 로컬스토리지에서 멘티 정보 및 게스트 토큰 자동 로드
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("smp_participant_name");
      if (savedName && !initialName) {
        setName(savedName);
      }
    }
  }, [initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("이름(또는 닉네임)을 입력해 주세요.");
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("비밀번호는 숫자 4자리로 입력해 주세요.");
      return;
    }

    // 게스트 토큰 확보 (브라우저 식별용 UUID)
    let guestToken = localStorage.getItem("smp_guest_token");
    if (!guestToken) {
      guestToken = crypto.randomUUID();
      localStorage.setItem("smp_guest_token", guestToken);
    }

    setIsLoading(true);
    try {
      await onSubmit({
        participantName: trimmedName,
        pin,
        guestToken,
      });
      // 성공 시 로컬스토리지에 이름 저장
      localStorage.setItem("smp_participant_name", trimmedName);
      onClose();
    } catch (err: any) {
      setError(err?.message || "저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {isEditMode ? "시간표 수정하기" : "내 시간표 제출하기"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-900 border border-indigo-100">
            총 <strong className="text-indigo-700 font-bold">{selectedCount}개</strong>의 타임슬롯을 선택하셨습니다.
            회원가입 없이 이름과 4자리 비밀번호만으로 즉시 저장됩니다.
          </div>

          {/* 이름 입력 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              이름 또는 닉네임 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 홍길동"
                maxLength={20}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
          </div>

          {/* 4자리 PIN 입력 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                4자리 비밀번호 (PIN) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">숫자 4자리</span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="예: 1234 (전화번호 뒷자리 등)"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm tracking-widest focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              💡 나중에 시간표를 수정하거나 본인 확인 시 사용됩니다.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-2.5 text-xs font-medium text-rose-600 border border-rose-100">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isLoading ? "저장 중..." : "제출 완료"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

