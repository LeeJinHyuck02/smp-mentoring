"use server";

/**
 * 멘토 관리자 마스터 비밀번호 서버 검증
 * 브라우저 클라이언트 JS에 비밀번호가 노출되지 않도록 서버 측에서 안전하게 검증합니다.
 */
export async function verifyMentorPassword(inputPassword: string): Promise<boolean> {
  const masterPassword =
    process.env.MENTOR_PASSWORD ||
    process.env.NEXT_PUBLIC_MENTOR_PASSWORD ||
    "smp1234";

  return inputPassword.trim() === masterPassword.trim();
}

