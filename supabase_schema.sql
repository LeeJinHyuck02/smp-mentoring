-- ====================================================================
-- SMP (Student Mentoring Program) Supabase 통합 데이터베이스 스키마
-- 작성일: 2026-09-08
-- 특징: 
--   1) 멘토(관리자 인증) + 멘티(무회원가입 게스트) 최적화
--   2) 로그인 없이도 비밀글/답변을 작성자 멘티와 멘토만 볼 수 있는 3중 보안 검증 체계
-- ====================================================================

-- 0. 필수 확장 모듈 활성화
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ====================================================================
-- 1. 테이블 생성
-- ====================================================================

-- 1.1 멘토 프로필 테이블 (Supabase auth.users와 1:1 연동)
create table if not exists public.mentor_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 멘토 회원가입 시 자동으로 mentor_profiles에 행을 생성하는 트리거 함수
create or replace function public.handle_new_mentor()
returns trigger as $$
begin
  insert into public.mentor_profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- 트리거 바인딩 (중복 방지)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_mentor();


-- 1.2 과목 (Courses) 테이블
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references public.mentor_profiles(id) on delete cascade not null,
  semester text not null, -- 예: '2026-1'
  title text not null,    -- 예: 'C프로그래밍', '자료구조'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 1.3 분반 (Sections) 테이블
create table if not exists public.sections (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  name text not null,        -- 예: '1분반 (월요일)', '야간반'
  slug text unique not null, -- URL 접속용 고유 코드 (예: 'c-prog-01', 'ds-sec2')
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 1.4 시간표 조율 투표 (Schedule Polls) 테이블
create table if not exists public.schedule_polls (
  id uuid default gen_random_uuid() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  title text not null,                       -- 예: '3주차 보강 일정 조율'
  dates jsonb not null,                      -- 선택 가능한 날짜 배열: ["2026-09-15", "2026-09-16", ...]
  start_time text not null default '09:00',  -- 시작 시간: '09:00'
  end_time text not null default '22:00',    -- 종료 시간: '22:00'
  slot_duration integer not null default 30, -- 타임슬롯 단위 (분 단위, 기본 30분)
  is_closed boolean not null default false,  -- 투표 마감 여부
  confirmed_slot jsonb,                      -- 확정된 최종 시간 정보
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 1.5 멘티 시간표 제출 (Schedule Submissions - 무회원가입) 테이블
create table if not exists public.schedule_submissions (
  id uuid default gen_random_uuid() primary key,
  poll_id uuid references public.schedule_polls(id) on delete cascade not null,
  participant_name text not null, -- 멘티 이름 (예: '홍길동')
  pin_hash text not null,         -- 4자리 PIN 해시값 (수정 및 보호용)
  guest_token text,               -- 브라우저 로컬 저장소 세션 식별 토큰
  available_slots jsonb not null, -- 가능한 시간 슬롯 배열: ["2026-09-15T09:00", "2026-09-15T09:30", ...]
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (poll_id, participant_name) -- 동일 투표 내 동일 이름은 1개만 유지 (업데이트 처리)
);


-- 1.6 질문 게시판 원본 테이블 (Questions)
create table if not exists public.questions (
  id uuid default gen_random_uuid() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  author_name text not null,                 -- 작성자 이름 또는 닉네임
  pin_hash text not null,                    -- 비밀글 해제 및 수정/삭제용 4자리 PIN 해시 (crypt 저장)
  guest_token text,                         -- 브라우저 로컬 세션 식별 토큰 (UUID)
  title text not null,                       -- 질문 제목
  content text not null,                     -- 질문 내용 (마크다운/코드/수식 지원)
  image_urls text[] not null default '{}',   -- 첨부 이미지 URL 배열
  is_secret boolean not null default false,  -- 비밀글 여부
  is_anonymous boolean not null default false, -- 익명 표시 여부
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- 1.7 질문 답변 및 댓글 (Answers) 테이블
create table if not exists public.answers (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references public.questions(id) on delete cascade not null,
  author_name text not null,                 -- 작성자 이름 (멘토 이름 또는 멘티 닉네임)
  is_mentor boolean not null default false,  -- 멘토 공식 답변 여부
  content text not null,                     -- 답변 내용
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);


-- ====================================================================
-- 2. 성능 최적화 인덱스 생성
-- ====================================================================

create index if not exists idx_sections_slug on public.sections(slug);
create index if not exists idx_questions_section_id on public.questions(section_id);
create index if not exists idx_questions_created_at on public.questions(created_at desc);
create index if not exists idx_schedule_polls_section_id on public.schedule_polls(section_id);
create index if not exists idx_schedule_submissions_poll_id on public.schedule_submissions(poll_id);
create index if not exists idx_answers_question_id on public.answers(question_id);


-- ====================================================================
-- 3. 이미지 스토리지 버킷 생성 (Q&A 첨부 사진용)
-- ====================================================================

insert into storage.buckets (id, name, public)
values ('qna-images', 'qna-images', true)
on conflict (id) do nothing;


-- ====================================================================
-- 4. 🔒 무회원가입 비밀글 보호 뷰 & 보안 RPC 함수 (핵심 보안 로직)
-- ====================================================================

-- 4.1 안전한 질문 목록 조회용 View (v_questions_board)
-- 제3자가 목록을 조회할 때 비밀글의 content와 image_urls는 DB 차원에서 완벽히 마스킹되어 유출 차단
create or replace view public.v_questions_board as
select 
  q.id,
  q.section_id,
  case 
    when q.is_anonymous then '익명 멘티'
    else q.author_name 
  end as display_author,
  q.title,
  case 
    when not q.is_secret then q.content
    when auth.uid() in (
      select c.mentor_id from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = q.section_id
    ) then q.content
    else '🔒 비밀글입니다. 작성자 본인과 멘토만 열람할 수 있습니다.'
  end as content,
  case 
    when not q.is_secret then q.image_urls
    when auth.uid() in (
      select c.mentor_id from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = q.section_id
    ) then q.image_urls
    else array[]::text[]
  end as image_urls,
  q.is_secret,
  q.is_anonymous,
  q.status,
  q.created_at
from public.questions q;


-- 4.2 비밀글 열람 및 답변 조회 전용 보안 함수 (unlock_secret_question)
-- 멘토 관리자 세션 OR 작성자 기기 토큰 OR 4자리 PIN 일치 시에만 원본 본문, 사진, 답변 반환
create or replace function public.unlock_secret_question(
  p_question_id uuid,
  p_pin text default null,
  p_guest_token text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_q public.questions%rowtype;
  v_is_mentor boolean := false;
  v_can_access boolean := false;
  v_answers jsonb;
begin
  -- 질문 조회
  select * into v_q from public.questions where id = p_question_id;
  if not found then
    return jsonb_build_object('success', false, 'message', '존재하지 않는 질문입니다.');
  end if;

  -- 1) 공개글인 경우 즉시 통과
  if not v_q.is_secret then
    v_can_access := true;
  end if;

  -- 2) 멘토 관리자인지 확인 (현재 로그인된 UID가 해당 과목의 멘토인지)
  if not v_can_access and auth.uid() is not null then
    select exists (
      select 1 from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = v_q.section_id and c.mentor_id = auth.uid()
    ) into v_is_mentor;

    if v_is_mentor then
      v_can_access := true;
    end if;
  end if;

  -- 3) 멘티의 작성 기기(guest_token)가 일치하는지 확인 (본인 폰 자동 통과)
  if not v_can_access and p_guest_token is not null and v_q.guest_token = p_guest_token then
    v_can_access := true;
  end if;

  -- 4) 4자리 PIN 비밀번호가 일치하는지 확인 (다른 기기 접속 시)
  if not v_can_access and p_pin is not null then
    if v_q.pin_hash = crypt(p_pin, v_q.pin_hash) or v_q.pin_hash = p_pin then
      v_can_access := true;
    end if;
  end if;

  -- 검증 실패 시 차단
  if not v_can_access then
    return jsonb_build_object('success', false, 'message', '비밀번호가 일치하지 않거나 열람 권한이 없습니다.');
  end if;

  -- 권한 통과 시에만 해당 질문의 답변/댓글 목록 추출
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'author_name', a.author_name,
      'is_mentor', a.is_mentor,
      'content', a.content,
      'created_at', a.created_at
    ) order by a.created_at asc
  ), '[]'::jsonb)
  into v_answers
  from public.answers a
  where a.question_id = p_question_id;

  -- 원본 질문 및 답변 일괄 반환
  return jsonb_build_object(
    'success', true,
    'question', jsonb_build_object(
      'id', v_q.id,
      'section_id', v_q.section_id,
      'author_name', case when v_q.is_anonymous and not v_is_mentor then '익명 멘티' else v_q.author_name end,
      'title', v_q.title,
      'content', v_q.content,
      'image_urls', v_q.image_urls,
      'is_secret', v_q.is_secret,
      'is_anonymous', v_q.is_anonymous,
      'status', v_q.status,
      'created_at', v_q.created_at
    ),
    'answers', v_answers
  );
end;
$$;


-- ====================================================================
-- 5. RLS (Row Level Security) 권한 정책 설정
-- ====================================================================

alter table public.mentor_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.schedule_polls enable row level security;
alter table public.schedule_submissions enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;

-- 5.1 mentor_profiles 정책
create policy "멘토 프로필 조회는 모두 가능"
  on public.mentor_profiles for select using (true);

create policy "본인 멘토 프로필만 수정 가능"
  on public.mentor_profiles for update using (auth.uid() = id);

-- 5.2 courses 정책
create policy "과목 조회는 누구나 가능"
  on public.courses for select using (true);

create policy "로그인된 멘토만 본인 과목 생성 가능"
  on public.courses for insert with check (auth.uid() = mentor_id);

create policy "멘토는 본인 과목 수정/삭제 가능"
  on public.courses for all using (auth.uid() = mentor_id);

-- 5.3 sections 정책
create policy "분반 조회는 누구나 가능 (링크 접속용)"
  on public.sections for select using (true);

create policy "과목 소유 멘토만 분반 관리 가능"
  on public.sections for all using (
    auth.uid() in (select mentor_id from public.courses where id = sections.course_id)
  );

-- 5.4 schedule_polls 정책
create policy "스케줄 투표 정보는 누구나 조회 가능"
  on public.schedule_polls for select using (true);

create policy "멘토만 스케줄 투표 생성 및 수정 가능"
  on public.schedule_polls for all using (
    auth.uid() in (
      select c.mentor_id from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = schedule_polls.section_id
    )
  );

-- 5.5 schedule_submissions 정책
create policy "스케줄 제출 현황은 누구나 조회 가능 (Heatmap)"
  on public.schedule_submissions for select using (true);

create policy "누구나 스케줄 제출 가능"
  on public.schedule_submissions for insert with check (true);

create policy "스케줄 수정 가능"
  on public.schedule_submissions for update using (true);

create policy "누구나 스케줄 제출 삭제 가능"
  on public.schedule_submissions for delete using (true);

-- 5.6 questions 정책 (비밀글 보호 강화)
-- 테이블 직접 SELECT 시: 공개글이거나 멘토인 경우만 원본 반환 (비회원 비밀글은 unlock 함수 이용)
create policy "공개 질문 또는 멘토의 전체 질문 조회"
  on public.questions for select using (
    not is_secret
    or auth.uid() in (
      select c.mentor_id from public.sections s
      join public.courses c on c.id = s.course_id
      where s.id = questions.section_id
    )
  );

create policy "누구나 질문 등록 가능"
  on public.questions for insert with check (true);

create policy "질문 수정/삭제 가능"
  on public.questions for update using (true);

create policy "질문 삭제 가능"
  on public.questions for delete using (true);

-- 5.7 answers 정책 (비밀 질문의 답변은 외부인 조회 불가)
create policy "공개 질문의 답변 또는 멘토의 답변 조회"
  on public.answers for select using (
    exists (
      select 1 from public.questions q
      where q.id = answers.question_id
      and (
        not q.is_secret
        or auth.uid() in (
          select c.mentor_id from public.sections s
          join public.courses c on c.id = s.course_id
          where s.id = q.section_id
        )
      )
    )
  );

create policy "답변/댓글 작성은 누구나 가능"
  on public.answers for insert with check (true);

create policy "답변 수정/삭제 가능"
  on public.answers for all using (true);

-- 5.8 Storage RLS 정책
create policy "누구나 이미지 업로드 가능"
  on storage.objects for insert with check (bucket_id = 'qna-images');

create policy "누구나 이미지 다운로드/조회 가능"
  on storage.objects for select using (bucket_id = 'qna-images');
