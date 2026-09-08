import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 24시간 형식 ('09:00')을 읽기 쉬운 한국어 형식 ('오후 2:00')으로 변환
export function formatTimeKorean(timeStr: string): string {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${period} ${displayHour}:${minStr}`;
}

// '월', '화' 같은 요일 또는 '2026-09-15' 날짜를 한국어로 깔끔하게 변환
export function formatDayOrDateKorean(str: string): string {
  if (!str) return "";

  // 요일 형식인 경우 (월, 화, 수, 목, 금, 토, 일)
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  if (days.includes(str)) {
    return `${str}요일`;
  }

  // 날짜 형식인 경우 (YYYY-MM-DD)
  if (str.includes("-")) {
    const [year, month, day] = str.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    return `${month}월 ${day}일 (${dayNames[date.getDay()]})`;
  }

  return str;
}

// 타임 슬롯 생성 유틸리티 (13시 이전은 아예 노출되지 않도록 보정)
export function generateTimeSlots(start: string, end: string, stepMinutes = 30): string[] {
  // 13시 이전의 시간대는 아예 안보이도록 최소 시작 시간을 13:00으로 보정
  const effectiveStart = !start || start < "13:00" ? "13:00" : start;
  const slots: string[] = [];
  const [startH, startM] = effectiveStart.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const timeString = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push(timeString);
    currentMinutes += stepMinutes;
  }

  return slots;
}

// 멘토링 가능 시간 체크: 월요일·목요일 13:00~18:00은 멘토 불가 블락 (18:00 이후만 가능)
export function isMentorBlockedSlot(dayOrDate: string, time: string): boolean {
  if (!time) return false;
  const [hour, min] = time.split(":").map(Number);
  const totalMinutes = hour * 60 + min;

  // 13:00부터 18:00 이전 (즉 13:00 ~ 17:59 슬롯)
  const is13to18 = totalMinutes >= 13 * 60 && totalMinutes < 18 * 60;
  if (!is13to18) {
    return false;
  }

  const clean = dayOrDate.trim();

  // 요일 문자열 판별 (월, 목, Mon, Thu)
  if (
    clean.includes("월") ||
    clean.includes("목") ||
    clean.startsWith("Mon") ||
    clean.startsWith("Thu")
  ) {
    return true;
  }

  // YYYY-MM-DD 날짜 포맷인 경우 요일 확인
  if (clean.includes("-")) {
    try {
      const [year, month, day] = clean.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      const dayOfWeek = d.getDay();
      return dayOfWeek === 1 || dayOfWeek === 4; // 1 = 월, 4 = 목
    } catch {}
  }

  return false;
}
