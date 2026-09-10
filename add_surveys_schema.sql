-- ====================================================================
-- SMP 설문(Survey) 기능 테이블 및 RLS 보안 정책
-- ====================================================================

-- 1. 설문 마스터 테이블
create table if not exists public.surveys (
  id uuid default gen_random_uuid() primary key,
  section_id uuid references public.sections(id) on delete cascade not null,
  title text not null,
  description text,
  is_closed boolean not null default false,
  is_anonymous boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. 설문 문항 테이블
create table if not exists public.survey_questions (
  id uuid default gen_random_uuid() primary key,
  survey_id uuid references public.surveys(id) on delete cascade not null,
  question_text text not null,
  question_type text not null check (question_type in ('single_choice', 'multiple_choice', 'text', 'rating')),
  options jsonb not null default '[]'::jsonb, -- 객관식 선택지 배열: ["옵션1", "옵션2", ...]
  is_required boolean not null default true,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. 설문 응답 제출 세션 테이블 (무회원가입 지원)
create table if not exists public.survey_responses (
  id uuid default gen_random_uuid() primary key,
  survey_id uuid references public.surveys(id) on delete cascade not null,
  respondent_name text not null default '익명',
  guest_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. 설문 개별 문항 응답 테이블
create table if not exists public.survey_answers (
  id uuid default gen_random_uuid() primary key,
  response_id uuid references public.survey_responses(id) on delete cascade not null,
  question_id uuid references public.survey_questions(id) on delete cascade not null,
  selected_options jsonb not null default '[]'::jsonb, -- 객관식 선택 결과 배열
  text_answer text,                                    -- 주관식 답변
  rating_value integer,                                -- 1~5점 별점 평가값
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 성능 최적화 인덱스
create index if not exists idx_surveys_section_id on public.surveys(section_id);
create index if not exists idx_survey_questions_survey_id on public.survey_questions(survey_id);
create index if not exists idx_survey_responses_survey_id on public.survey_responses(survey_id);
create index if not exists idx_survey_answers_response_id on public.survey_answers(response_id);

-- RLS 활성화
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_answers enable row level security;

-- 무회원가입 게스트 및 멘토 접근 정책 (데모 및 실서비스 공용)
create policy "Allow all users to view surveys" on public.surveys for select using (true);
create policy "Allow all users to manage surveys" on public.surveys for all using (true);

create policy "Allow all users to view survey questions" on public.survey_questions for select using (true);
create policy "Allow all users to manage survey questions" on public.survey_questions for all using (true);

create policy "Allow all users to submit survey responses" on public.survey_responses for insert with check (true);
create policy "Allow all users to view survey responses" on public.survey_responses for select using (true);

create policy "Allow all users to submit survey answers" on public.survey_answers for insert with check (true);
create policy "Allow all users to view survey answers" on public.survey_answers for select using (true);

