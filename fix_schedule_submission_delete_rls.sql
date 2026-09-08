-- ====================================================================
-- 시간 조율 제출 내역(스케줄) 삭제 권한(RLS) 추가 SQL
-- 적용 대상: Supabase 대시보드 -> SQL Editor
-- 설명:
--   멘티가 본인이 제출한 시간표를 이름 + 4자리 비밀번호(PIN) 인증 후
--   삭제할 수 있도록 schedule_submissions 테이블에 DELETE 정책을 추가합니다.
-- ====================================================================

-- 1. 기존 삭제 정책이 있다면 정리
drop policy if exists "누구나 스케줄 제출 삭제 가능" on public.schedule_submissions;
drop policy if exists "스케줄 제출 삭제 가능" on public.schedule_submissions;

-- 2. schedule_submissions 테이블에 DELETE 권한 추가
create policy "누구나 스케줄 제출 삭제 가능"
  on public.schedule_submissions for delete
  using (true);

-- (참고) schedule_submissions RLS 정책 요약:
-- SELECT: 누구나 조회 가능 (히트맵 생성용)
-- INSERT: 누구나 제출 가능
-- UPDATE: 누구나 수정 가능 (이름 기준 업데이트)
-- DELETE: 누구나 삭제 가능 (프론트엔드에서 이름 + PIN 검증 후 삭제 요청)

