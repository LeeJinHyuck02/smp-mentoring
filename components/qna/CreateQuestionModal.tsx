"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Lock, User, Image as ImageIcon, X, Send, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

interface CreateQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  onSuccess: () => void;
}

export default function CreateQuestionModal({
  isOpen,
  onClose,
  sectionId,
  onSuccess,
}: CreateQuestionModalProps) {
  const [authorName, setAuthorName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smp_participant_name") || "";
    }
    return "";
  });
  const [pin, setPin] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 이미지 파일 선택 처리
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (imageFiles.length + filesArray.length > 3) {
        setError("이미지는 최대 3장까지 첨부할 수 있습니다.");
        return;
      }
      setImageFiles((prev) => [...prev, ...filesArray]);
      const newPreviews = filesArray.map((f) => URL.createObjectURL(f));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
      setError(null);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = authorName.trim();
    if (!trimmedName && !isAnonymous) {
      setError("작성자 이름을 입력해 주세요.");
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("4자리 숫자 비밀번호(PIN)를 입력해 주세요.");
      return;
    }

    if (!title.trim()) {
      setError("질문 제목을 입력해 주세요.");
      return;
    }

    if (!content.trim()) {
      setError("질문 내용을 작성해 주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. 브라우저 세션 게스트 토큰 확보
      let guestToken = localStorage.getItem("smp_guest_token");
      if (!guestToken) {
        guestToken = crypto.randomUUID();
        localStorage.setItem("smp_guest_token", guestToken);
      }

      // 2. 이미지 업로드 처리 (Supabase Storage)
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${sectionId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("qna-images")
          .upload(fileName, file);

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("qna-images")
            .getPublicUrl(uploadData.path);
          if (urlData?.publicUrl) {
            uploadedUrls.push(urlData.publicUrl);
          }
        }
      }

      // 3. 질문 레코드 DB 삽입
      const { error: insertError } = await supabase.from("questions").insert({
        section_id: sectionId,
        author_name: trimmedName || "익명 멘티",
        pin_hash: pin, // DB 검증 함수에서 crypt 또는 단순 비교 지원
        guest_token: guestToken,
        title: title.trim(),
        content: content.trim(),
        image_urls: uploadedUrls,
        is_secret: isSecret,
        is_anonymous: isAnonymous,
        status: "pending",
      });

      if (insertError) throw insertError;

      // 성공 시 로컬스토리지에 작성자 이름 및 본인 작성 질문 목록 저장
      if (trimmedName) {
        localStorage.setItem("smp_participant_name", trimmedName);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "질문 등록 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">새 질문 올리기</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 작성자 이름 & PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                작성자 이름 / 닉네임 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required={!isAnonymous}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="예: 홍길동"
                  maxLength={20}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  4자리 비밀번호 (PIN) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">비밀글/수정용</span>
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
                  placeholder="1234"
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm tracking-widest focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* 질문 제목 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              질문 제목 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="궁금한 내용을 요약해 주세요"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* 질문 내용 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              상세 내용 <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문제 상황, 시도해 본 코드나 풀이 등을 자유롭게 적어주세요."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs sm:text-sm focus:border-indigo-500 outline-none transition resize-none font-sans"
            />
          </div>

          {/* 사진 첨부 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              사진 첨부 (최대 3장)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={src} alt="미리보기" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-rose-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {imageFiles.length < 3 && (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition">
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                  <span className="text-[10px] text-slate-400 mt-0.5">추가</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 옵션 선택: 비밀글 & 익명 */}
          <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>🔒 비밀글로 작성 (멘토와 나만 보기)</span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <EyeOff className="w-4 h-4 text-slate-500" />
                <span>🕶️ 익명으로 올리기 (작성자명을 '익명 멘티'로 마스킹)</span>
              </div>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-600 font-medium border border-rose-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition active:scale-95"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isLoading ? "등록 중..." : "질문 등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

