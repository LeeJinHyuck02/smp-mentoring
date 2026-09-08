import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    // 개발 모드에서 키가 비어있을 때 알림
    if (typeof window !== "undefined") {
      console.warn("Supabase 환경 변수가 설정되지 않았습니다. .env.local을 확인해주세요.");
    }
  }

  return createBrowserClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-anon-key"
  );
}

export const supabase = createClient();

