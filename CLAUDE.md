# CLAUDE.md - Saehan AI Project Rules

## Project Overview
새한프라텍 생산 인력 자동 배치 시스템. 생산계획 입력 -> 필요인원 자동 산출 -> 인력 자동 배치를 하나의 플로우로 통합하는 웹/모바일 시스템.

## Tech Stack
- **Framework**: Next.js 15 (App Router, TypeScript, Server Components 우선)
- **UI**: shadcn/ui + Tailwind CSS 4 + Radix UI
- **DB/Auth/Realtime**: Supabase (PostgreSQL + RLS + Realtime + Edge Functions)
- **Deploy**: Vercel (icn1 리전)
- **State**: TanStack Query (서버 상태), Zustand (클라이언트 상태 최소화)
- **Test**: Vitest (단위) + Playwright (E2E)
- **Package Manager**: pnpm

## Project Structure
```
saehan-ai/
├── CLAUDE.md              # 이 파일 (프로젝트 규칙)
├── task.md                # 구현 로드맵 및 진행 추적
├── PRD.md                 # 제품 요구사항 문서
├── docs/                  # 추가 문서
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # 로그인/인증 레이아웃
│   │   ├── (dashboard)/   # 관리자 대시보드 레이아웃
│   │   ├── (mobile)/      # 모바일 전용 레이아웃
│   │   └── api/           # API Routes
│   ├── components/        # React 컴포넌트
│   │   ├── ui/            # shadcn/ui 기본 컴포넌트
│   │   ├── production/    # 생산계획 관련
│   │   ├── staffing/      # 인원산출/배치 관련
│   │   └── schedule/      # 근무 스케줄 관련
│   ├── lib/               # 라이브러리/유틸
│   │   ├── supabase/      # Supabase 클라이언트
│   │   ├── staffing-engine/ # 인원산출 규칙 엔진 (핵심 비즈니스 로직)
│   │   ├── shift-pattern/ # 3조 교대 패턴 생성기
│   │   └── utils/         # 유틸리티
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript 타입 정의
├── supabase/
│   ├── migrations/        # DB 마이그레이션 (순서 보장)
│   ├── seed/              # 시드 데이터 (실제 Excel 기반)
│   └── functions/         # Edge Functions
├── tests/
│   ├── unit/              # Vitest 단위 테스트
│   │   └── staffing-engine/ # 인원산출 규칙 테스트 (핵심)
│   ├── e2e/               # Playwright E2E 테스트
│   └── fixtures/          # 테스트 데이터 (harness)
└── data/                  # 원본 Excel/분석 데이터 (git-ignored)
```

## Coding Conventions

### TypeScript
- strict 모드 필수
- `any` 사용 금지. 불가피하면 `unknown` + 타입 가드 사용
- 모든 함수에 반환 타입 명시 (화살표 함수 포함)
- 인터페이스보다 `type` 선호 (union/intersection 유연성)

### React / Next.js
- Server Components 기본, 클라이언트 상태 필요 시에만 `'use client'`
- 파일명: kebab-case (`production-plan.tsx`)
- 컴포넌트명: PascalCase (`ProductionPlan`)
- 훅명: camelCase (`useProductionPlan`)
- Server Actions 적극 활용 (form 처리, mutation)
- `loading.tsx`, `error.tsx` 반드시 구현

### Supabase
- 모든 테이블에 RLS 활성화
- 마이그레이션 파일명: `YYYYMMDDHHMMSS_description.sql`
- DB 타입은 `supabase gen types` 로 자동 생성 -> `src/types/database.ts`
- 클라이언트: `createBrowserClient()` / 서버: `createServerClient()`

### 스타일링
- Tailwind CSS 유틸리티 클래스 직접 사용
- 커스텀 CSS 최소화
- 한국어 UI: `font-pretendard` 기본 (Pretendard 폰트)
- 반응형: mobile-first (`sm:`, `md:`, `lg:`)

### 테스트
- 인원산출 규칙: 반드시 단위 테스트 작성 후 구현 (TDD)
- 테스트 파일: `*.test.ts` (같은 디렉토리 또는 tests/)
- 테스트 설명: 한국어로 작성 (`it('08, 09호기 세트 가동 시 1명 배정')`)

## Business Domain Rules (핵심)

### 3조 교대제
- A조/B조/C조 순환: 4일 근무 -> 2일 휴무 -> 교대 전환(주간<->야간)
- 매일 2개 조 근무(주간 1조 + 야간 1조), 1개 조 휴무
- 주간: 06:00~18:00 / 야간: 18:00~06:00

### 인원 소속
- 정규직(새한) + 파견직(세영, 다연, 피너) 구분 필수
- 파견직도 동일하게 조 배정 및 교대 순환

### 크로스배치
- PE <-> PET 간 인력 이동 가능
- 1팀 <-> 2팀 간 인력 이동 가능
- 표기: (pe), (대), (2) 등으로 원래 소속 추적

### 인원산출 규칙 우선순위
1. 설비별 기본 인원 (1공장 12개 규칙 + 2공장 8개 규칙)
2. 포장박스 기반 추가 인원 (1공장만)
3. 설비 가동 조합 추가 인원 (2공장 9-1, 9-2, 9-3)

### 배치표 양식
- 3종: 평일 / 주말 / 월요일
- 부서 -> 성별 -> 역할 -> PE/PET 구분 순서
- 총인원, 부서별 소계 자동 집계

## Git Conventions
- 브랜치: `feature/기능명`, `fix/버그명`, `refactor/대상`
- 커밋: 한국어 가능. 타입 접두사 사용 (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`)
- main 브랜치 직접 push 금지

## 작업 진행 규칙
1. task.md의 현재 태스크를 확인하고 순서대로 진행
2. 태스크 시작 시 task.md 상태를 `[진행중]`으로 업데이트
3. 태스크 완료 시 `[완료]`로 업데이트
4. 코드 변경 후 관련 테스트 실행하여 통과 확인
5. 큰 변경은 사용자 확인 후 진행

## 주의사항
- .env 파일은 절대 커밋하지 않음
- data/ 디렉토리(원본 Excel)는 git-ignore
- 하드코딩된 비즈니스 규칙은 DB(saehan_staffing_rules)로 관리
- 모든 날짜/시간은 Asia/Seoul 타임존 기준
