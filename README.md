# 🎓 SMP (Student Mentoring Program) 웹 플랫폼

> **대학생 멘토링을 위한 멘티 무회원가입(Zero-Signup) 기반 시간 조율 & 질의응답 올인원 플랫폼**  
> 카카오톡 단톡방 링크 클릭 한 번으로 질문 작성과 멘토링 시간표 제출까지 30초 안에 끝냅니다.

---

## 🌟 핵심 특징 (Key Features)

- 🚫 **멘티 무회원가입 (Zero-Signup)**: 멘티는 회원가입이나 로그인 없이 멘토가 공유한 단톡방 링크(`/s/[slug]`)로 즉시 접속합니다.
- 🔒 **이름 + 4자리 PIN 간이 인증**: 비회원 상태에서도 본인 질문 열람, 비밀글 보호, 시간표 수정 및 삭제가 안전하게 작동합니다.
- 🔑 **단일 멘토 마스터 게이트**: 멘토는 복잡한 계정 관리 없이 마스터 패스워드 입력만으로 대시보드(`/mentor`)를 관리합니다.
- 📱 **모바일 퍼스트 반응형 UX**: 카카오톡 인앱 브라우저와 스마트폰 터치/드래그 환경에 완벽 최적화되어 있습니다.
- ⚡ **실시간 취합 & 분석**: 제출된 시간표를 직관적인 히트맵(Heatmap)으로 시각화하여 최적의 멘토링 시간을 한눈에 파악합니다.

---

## 🖥️ 주요 기능 소개

### 1. 멘티 전용 분반 페이지 (`/s/[slug]`)
각 분반별로 고유한 URL 슬러그가 부여되어 타 분반과의 데이터가 철저히 격리됩니다.

#### 💬 1. 질의응답 (Q&A) 게시판 (첫 화면)
- **질문 등록**: 제목, 내용, 작성자 이름/닉네임, 4자리 비밀번호(PIN), 문제 사진/캡처 이미지 첨부 지원
- **비밀글 보호**: 비밀글 옵션 체크 시 작성자(이름+PIN 일치) 및 멘토만 본문을 열람할 수 있도록 안전하게 보호
- **내 질문 찾기**: 이름과 4자리 PIN을 입력하여 본인이 작성한 질문들만 즉시 모아보고 잠금 해제
- **댓글 소통 & 접기/펼치기**:
  - 멘토의 공식 답변 및 멘티 간 댓글 등록/삭제 (이름+PIN 검증)
  - 댓글이 3개 이상일 경우 기본 2개만 보여주고 `[댓글 N개 더보기 ∨]` / `[댓글 접기 ∧]` 토글 지원

#### 🕒 2. 멘토링 시간 조율 (When2meet 스타일)
- **시간표 입력 (Grid)**:
  - 평일(월~금) 13:00 ~ 21:00 타임테이블
  - 학부 정규 수업 시간(월/목 13:00~18:00) 자동 비활성화로 멘토링 시간 충돌 방지
  - 터치 및 마우스 드래그로 가능한 시간대를 자유롭게 선택 및 `[선택 초기화]`
- **취합 결과 (Heatmap)**:
  - 참석 가능 인원 수에 따라 색상이 짙어지는 직관적인 히트맵 시각화
  - 멘토가 확정한 최종 멘토링 시간대 하이라이트 표시
- **내 제출 내역 삭제**:
  - 취합 결과 탭에서 `[내 제출 내역 삭제]` 버튼 클릭 후 **[작성자 이름 + 4자리 PIN]** 검증을 거쳐 본인 데이터만 안전하게 삭제

---

### 2. 멘토 관리자 대시보드 (`/mentor`)
- **마스터 패스워드 인증**: 단일 패스워드로 로그인하여 관리 권한 획득
- **과목 및 분반 관리**: 과목 추가, 분반 개설, 분반 접속 링크 원클릭 복사
- **시간 조율 투표 관리**:
  - 분반별 시간 조율 투표 개설 및 삭제
  - 실시간 제출 현황(히트맵) 모니터링 및 최적 시간대 원클릭 확정
- **Q&A 통합 관리**:
  - 모든 학생의 공개/비밀 질문 열람
  - 공식 멘토 답변 작성 및 관리

---

## 🛠️ 기술 스택 (Tech Stack)

| 레이어 | 기술 | 설명 |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15.2 (App Router)** | 모바일 브라우저 빠른 로딩, SSR & 정적 최적화 |
| **Frontend** | **React 19, TypeScript** | 최신 React 19 컴포넌트 아키텍처 및 엄격한 타입 안정성 |
| **Styling** | **Tailwind CSS, Lucide React** | 유틸리티 퍼스트 반응형 스타일링 및 경량 아이콘 세트 |
| **Database & Auth** | **Supabase (PostgreSQL)** | RLS(Row Level Security) 기반 데이터 보호, BaaS |
| **Storage** | **Supabase Storage** | 질문 첨부 이미지(`qna-images` 버킷) 안전 업로드 |
| **Deploy** | **Vercel** | Git 연동 무중단 자동 배포 |

---

## 📁 프로젝트 구조 (Project Structure)

```text
SMP/
├── app/
│   ├── layout.tsx                    # 글로벌 루트 레이아웃
│   ├── page.tsx                      # 인덱스 홈 (멘토 대시보드 링크 제공)
│   ├── mentor/
│   │   └── page.tsx                  # 멘토 관리자 대시보드 게이트
│   └── s/
│       └── [slug]/
│           ├── page.tsx              # 멘티 분반 페이지 (Q&A 게시판 + 시간 조율)
│           └── schedule/[pollId]/
│               └── page.tsx          # 시간 조율 단독 페이지
├── components/
│   ├── mentor/
│   │   ├── MentorDashboard.tsx       # 멘토 대시보드 메인 컴포넌트
│   │   └── CreatePollModal.tsx       # 스케줄 투표 생성 모달
│   ├── qna/
│   │   ├── QuestionBoard.tsx         # Q&A 게시판 메인 (질문, 답변, 댓글, 필터)
│   │   └── CreateQuestionModal.tsx   # 질문 등록 모달 (이미지 업로드 포함)
│   └── schedule/
│       ├── ScheduleGrid.tsx          # 시간표 드래그/터치 선택 그리드
│       ├── ScheduleHeatmap.tsx       # 참석 현황 실시간 취합 히트맵
│       ├── SubmissionModal.tsx       # 이름 + PIN 입력 시간표 제출 모달
│       └── DeleteSubmissionModal.tsx # 이름 + PIN 검증 제출 내역 삭제 모달
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # 브라우저용 Supabase 클라이언트
│   │   └── server.ts                 # 서버용 Supabase 클라이언트
│   └── utils.ts                      # 유틸리티 함수 (클래스 머지 등)
├── types/
│   └── database.ts                   # 데이터베이스 스키마 TypeScript 정의
├── supabase_schema.sql               # 전체 Supabase 테이블 & RLS 정의
├── mock_data_and_schema_update.sql   # 초기 목업 데이터 및 권한 설정
├── fix_schedule_submission_delete_rls.sql # 시간표 삭제 RLS 권한 패치
└── package.json
```

---

## 🚀 시작하기 (Getting Started)

### 1. 저장소 클론 및 패키지 설치

```bash
git clone https://github.com/your-repo/smp-platform.git
cd smp-platform
npm install
```

### 2. 환경 변수 설정 (`.env.local`)

프로젝트 루트에 `.env.local` 파일을 생성하고 Supabase 프로젝트의 API 키와 멘토 마스터 비밀번호를 설정합니다:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 멘토 관리자 마스터 비밀번호 (원하는 비밀번호로 변경 가능)
MENTOR_PASSWORD=smp1234
```

### 3. 데이터베이스 초기화 (Supabase SQL Editor)

1. [Supabase 콘솔](https://supabase.com/dashboard)에 접속하여 프로젝트를 생성합니다.
2. **SQL Editor**로 이동하여 다음 파일들을 순서대로 실행합니다:
   1. [`supabase_schema.sql`](./supabase_schema.sql) : 전체 테이블 및 RLS 기초 스키마 생성
   2. [`mock_data_and_schema_update.sql`](./mock_data_and_schema_update.sql) : 단일 멘토 모드 권한 및 초기 목업 생성
   3. [`fix_schedule_submission_delete_rls.sql`](./fix_schedule_submission_delete_rls.sql) : 시간표 제출 내역 삭제 RLS 적용
3. **Storage** 메뉴에서 `qna-images` 버킷을 생성하고 **Public**으로 설정합니다.

### 4. 로컬 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 확인합니다.
- **멘토 대시보드**: `http://localhost:3000/mentor` (초기 비밀번호: `smp1234`)
- **멘티 분반 페이지 (목업 1분반)**: `http://localhost:3000/s/c-prog-01`
- **멘티 분반 페이지 (목업 2분반)**: `http://localhost:3000/s/c-prog-02`

---

## 🔒 보안 아키텍처 (Security Architecture)

- **Row Level Security (RLS)**:
  - `questions` & `answers`: 누구나 질문과 답변을 등록할 수 있으나, 비밀글은 프론트엔드 및 함수 인증을 거쳐야만 내용이 노출됩니다.
  - `schedule_submissions`: 시간표 현황은 익명 히트맵으로 누구나 조회할 수 있으며, 수정/삭제는 본인의 이름 및 4자리 PIN 확인을 통해서만 처리됩니다.
- **분반 격리(Multi-tenant by Section)**:
  - 멘티는 전달받은 URL 슬러그(`s/[slug]`)에 종속되어 타 분반의 질문이나 시간표에 접근할 수 없습니다.

---

## 📦 프로덕션 빌드 & 배포 (Build & Deploy)

```bash
npm run build
npm run start
```

Vercel을 통해 원클릭으로 손쉽게 배포할 수 있으며, 환경 변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MENTOR_PASSWORD`)를 Vercel 프로젝트 대시보드에 등록하면 즉시 상용 서비스가 가능합니다.

---

## 📄 라이선스 (License)

본 프로젝트는 개인 및 교육용 목적으로 자유롭게 수정하고 활용할 수 있습니다.

