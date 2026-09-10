-- ====================================================================
-- SMP (Student Mentoring Program) 단일 멘토 모드 전환 & 목업 데이터 SQL
-- 적용 대상: Supabase SQL Editor
-- 내용:
--   1. 멘토 회원가입 불필요 지원 (auth.users 종속성 해제 및 RLS 완화)
--   2. 요일 기반(월화수목금) 정기 멘토링 목업 데이터 생성
--   3. 멘티 4명의 실제 시간표 제출 데이터 및 Q&A 목업 등록
-- ====================================================================

-- 1. 멘토 회원가입 불필요 지원을 위한 스키마 및 RLS 조정
alter table public.mentor_profiles drop constraint if exists mentor_profiles_id_fkey;
alter table public.mentor_profiles alter column email drop not null;

-- 과목 및 분반 관리 권한을 로그인 없이도 가능하도록 RLS 정책 업데이트
drop policy if exists "로그인된 멘토만 본인 과목 생성 가능" on public.courses;
drop policy if exists "멘토는 본인 과목 수정/삭제 가능" on public.courses;
create policy "누구나 과목 관리 가능 (단일 멘토 모드)"
  on public.courses for all using (true) with check (true);

drop policy if exists "과목 소유 멘토만 분반 관리 가능" on public.sections;
create policy "누구나 분반 관리 가능 (단일 멘토 모드)"
  on public.sections for all using (true) with check (true);

drop policy if exists "멘토만 스케줄 투표 생성 및 수정 가능" on public.schedule_polls;
create policy "누구나 스케줄 투표 관리 가능 (단일 멘토 모드)"
  on public.schedule_polls for all using (true) with check (true);

drop policy if exists "누구나 스케줄 제출 삭제 가능" on public.schedule_submissions;
drop policy if exists "스케줄 제출 삭제 가능" on public.schedule_submissions;
create policy "누구나 스케줄 제출 삭제 가능"
  on public.schedule_submissions for delete using (true);

drop policy if exists "공개 질문 또는 멘토의 전체 질문 조회" on public.questions;
drop policy if exists "누구나 질문 조회 가능" on public.questions;
create policy "누구나 질문 조회 가능"
  on public.questions for select using (true);

drop policy if exists "공개 질문의 답변 조회" on public.answers;
drop policy if exists "누구나 답변 조회 가능" on public.answers;
create policy "누구나 답변 조회 가능"
  on public.answers for select using (true);


-- 2. 고정 멘토 프로필 생성 (회원가입 없이 즉시 사용하는 기본 멘토)
insert into public.mentor_profiles (id, email, full_name)
values (
  '00000000-0000-0000-0000-000000000001',
  'mentor@smp.local',
  '이진혁'
)
on conflict (id) do update set
  full_name = excluded.full_name;


-- 3. 목업 과목 2건 생성
insert into public.courses (id, mentor_id, semester, title)
values 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', '2026-1학기', 'C프로그래밍 기초 및 실습'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', '2026-1학기', '자료구조 알고리즘')
on conflict (id) do nothing;


-- 4. 목업 분반 2건 생성 (URL 접속 슬러그: c-prog-01, c-prog-02)
insert into public.sections (id, course_id, name, slug)
values 
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', '1분반 (월 정기반)', 'c-prog-01'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', '2분반 (수 정기반)', 'c-prog-02')
on conflict (id) do nothing;


-- 5. 정기 멘토링 시간 조율 투표 1건 생성 (월화수목금 주간 단위)
insert into public.schedule_polls (id, section_id, title, dates, start_time, end_time, slot_duration, is_closed)
values (
  '44444444-4444-4444-4444-444444444441',
  '33333333-3333-3333-3333-333333333331',
  '1분반 정기 멘토링 시간 결정 (주 1회)',
  '["월", "화", "수", "목", "금"]'::jsonb,
  '13:00',
  '22:00',
  30,
  false
)
on conflict (id) do nothing;


-- 6. 멘티 4명의 시간표 제출 데이터 생성 (월요일 19:00~20:30이 전원 참석 가능한 황금 시간대!)
insert into public.schedule_submissions (poll_id, participant_name, pin_hash, available_slots)
values
  (
    '44444444-4444-4444-4444-444444444441',
    '김민수',
    crypt('1234', gen_salt('bf')),
    '["월T19:00", "월T19:30", "월T20:00", "월T20:30", "수T19:00", "수T19:30", "금T14:00"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444441',
    '이영희',
    crypt('1234', gen_salt('bf')),
    '["월T19:00", "월T19:30", "월T20:00", "화T19:00", "화T19:30", "목T19:00", "목T19:30"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444441',
    '박지성',
    crypt('1234', gen_salt('bf')),
    '["월T19:00", "월T19:30", "월T20:00", "월T20:30", "수T19:00", "금T15:00", "금T15:30"]'::jsonb
  ),
  (
    '44444444-4444-4444-4444-444444444441',
    '최진수',
    crypt('1234', gen_salt('bf')),
    '["월T18:30", "월T19:00", "월T19:30", "월T20:00", "금T14:00", "금T14:30"]'::jsonb
  )
on conflict (poll_id, participant_name) do update set
  available_slots = excluded.available_slots;


-- 7. Q&A 목업 질문 및 멘토 답변 생성
insert into public.questions (id, section_id, author_name, pin_hash, title, content, is_secret, is_anonymous, status)
values 
  (
    '55555555-5555-5555-5555-555555555551',
    '33333333-3333-3333-3333-333333333331',
    '김민수',
    crypt('1234', gen_salt('bf')),
    '포인터 변수와 주소 연산자 관련 질문입니다!',
    '포인터 선언 시의 * 기호와 역참조할 때의 * 기호의 차이가 헷갈립니다. 멘토님 설명 부탁드려요!',
    false,
    false,
    'resolved'
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '33333333-3333-3333-3333-333333333331',
    '비공개 멘티',
    crypt('1234', gen_salt('bf')),
    '🔒 과제 제출 전 코드 검토 부탁드립니다 (비밀글)',
    '멘토님, 제가 작성한 반복문 로직에서 무한 루프가 도는 이유를 잘 모르겠습니다. (비밀번호: 1234)',
    true,
    true,
    'pending'
  )
on conflict (id) do nothing;

-- 멘토의 공식 답변 등록
insert into public.answers (question_id, author_name, is_mentor, content)
values (
  '55555555-5555-5555-5555-555555555551',
  'SMP 멘토',
  true,
  '좋은 질문입니다! 포인터 변수 선언 시 `int *p;`의 `*`는 "이 변수가 주소를 담는 포인터다"라는 타입 지정의 의미이고, 실행 코드에서 `*p = 10;`의 `*`는 해당 주소가 가리키는 메모리 방의 실제 값에 접근하는 "역참조 연산자"입니다. 다음 멘토링 시간에 그림으로 더 자세히 짚어드릴게요!'
)
on conflict (id) do nothing;

