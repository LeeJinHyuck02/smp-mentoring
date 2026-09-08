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

// 타임 슬롯 생성 유틸리티 (start: '09:00', end: '21:00', step: 30분)
export function generateTimeSlots(start: string, end: string, stepMinutes = 30): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(":").map(Number);
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
