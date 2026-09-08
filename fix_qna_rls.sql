-- ====================================================================
-- Q&A 게시판 비밀글 및 익명 질문 조회 권한(RLS) 수정 SQL
-- 적용 대상: Supabase 대시보드 -> SQL Editor
-- 설명:
--   단일 멘토 제로 인증(Zero-Auth) 모드 환경에서
--   '비밀글(is_secret = true)' 옵션으로 등록된 질문과 답변이
--   게시판 목록 및 멘토 관리 화면에 정상적으로 표시되도록
--   RLS SELECT 정책을 개방합니다.
--   (실제 비밀글 본문 마스킹 및 PIN 해제는 프론트엔드/뷰 로직에서 제어)
-- ====================================================================

-- 1. questions 테이블의 기존 RLS 정책 삭제 및 새 정책 적용
drop policy if exists "공개 질문 또는 멘토의 전체 질문 조회" on public.questions;
drop policy if exists "누구나 질문 조회 가능" on public.questions;

create policy "누구나 질문 조회 가능"
  on public.questions for select
  using (true);

-- 2. answers 테이블의 기존 RLS 정책 삭제 및 새 정책 적용
drop policy if exists "공개 질문의 답변 조회" on public.answers;
drop policy if exists "누구나 답변 조회 가능" on public.answers;

create policy "누구나 답변 조회 가능"
  on public.answers for select
  using (true);

