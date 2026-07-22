# MLB Card Rank

eBay에서 인기 있는 MLB 스포츠 카드를 자동으로 수집하고, GPT로 분석하여 랭킹을 보여주는 서비스입니다. 상세 기획은 [doc/SPEC MLB Card Rank.md](doc/SPEC%20MLB%20Card%20Rank.md)를 참고하세요.

![Today's MLB Card Ranking](doc/Todays%20MLB%20Card%20Ranking.jpg)

## 이번 작업 요약 (UI 개선)

테이블 기반 랭킹 화면을 **3열 카드 그리드**로 바꾸고, Card / Team / Brand / Year / Price 기준 **정렬**을 추가했습니다.

1. `RankingTable` / `CardRow` 제거 → `RankingGrid` / `CardItem`으로 교체
2. 반응형 그리드: 모바일 1열 · 태블릿 2열 · 데스크톱 3열
3. 정렬 버튼: Rank, Card, Team, Brand, Year, Price (같은 버튼 재클릭 시 오름/내림차순 전환)
4. 카드 카드에 이미지, 랭크 뱃지, Team/Brand/Year/Price, RC·등급·Auto·Patch 태그 표시
5. 레이아웃 최대 너비를 `max-w-6xl`로 확대해 3열 카드가 여유 있게 보이도록 조정

### 이 세션에서 정리·수정한 사항

- **미사용 테이블 컴포넌트 정리**: 그리드 UI로 전환하며 `RankingTable.tsx`, `CardRow.tsx`를 삭제해 dead code를 제거.
- **정렬 시 null 값 처리**: Team/Brand/Year 등이 비어 있는 카드는 정렬 방향과 관계없이 항상 목록 뒤로 보내도록 비교 로직을 보정 (내림차순에서 null이 앞으로 오는 문제 방지).
- **뱃지 스타일 오타**: `CardItem`의 amber 뱃지 클래스 `bg:amber-100` → `bg-amber-100` 수정.
- **HMR 주의**: 삭제된 컴포넌트를 Vite가 잠시 추적하면 콘솔에 reload 실패가 날 수 있음. 브라우저 새로고침으로 해소.

### 랭킹이 “시장 인기 선수”와 다를 수 있는 이유 (참고)

현재 수집은 eBay 검색어 **`MLB Sports Card`** 결과의 상위 N개(기본 20)만 대상으로 합니다. 선수별 검색(예: Shohei Ohtani)이 아니므로, 시장에서 유명한 선수 카드라도 Best Match TOP20에 없으면 목록에 나타나지 않습니다. 이후 `#Rank`는 그 수집분 안에서의 `rankingScore` 상대 순위입니다.

## 이전 작업 요약 (MVP 구현)

스펙의 "MVP 구현 우선순위"를 따라 아래 파이프라인을 처음부터 구현했습니다.

1. Playwright로 eBay MLB Sports Card 검색 결과 TOP20 스크래핑
2. Turso(libSQL)에 저장
3. OpenAI GPT(gpt-4o-mini, structured output)로 선수명/브랜드/연도/Rookie 여부/등급/투자 포인트 분석
4. 랭킹 스코어 계산 후 React + Vite UI로 노출
5. Vercel Cron으로 매일 자동 재수집

### 스펙과 달라진 부분 (의도적 변경)

| 스펙 | 실제 구현 | 이유 |
| --- | --- | --- |
| Node.js/Express 또는 Vercel Serverless | **Vercel Serverless Functions** | 사용자 선택 |
| SQLite (MVP) | **Turso (libSQL)** | Vercel 서버리스는 파일시스템이 요청마다 초기화되어 로컬 `.db` 파일이 유지되지 않음. Turso는 SQLite 호환 API를 네트워크로 제공해 서버리스에서도 영속성 확보 |
| Playwright (풀 패키지) | **playwright-core + @sparticuz/chromium** (배포용) / 풀 `playwright` (로컬 개발용) | Vercel 함수에 브라우저 바이너리를 통째로 번들링할 수 없어 Lambda/Vercel 최적화 Chromium 바이너리 사용 |
| Ranking Score에 Watchers 포함 | Watchers 있으면 사용, 없으면 eBay Best Match 순위로 대체 | eBay 검색결과 페이지에 watchers 수가 일부 리스팅에만 노출됨을 실제 스크래핑으로 확인 |

## 개발 중 발견 및 해결한 문제 (MVP)

- **eBay 403 차단**: `/sch/i.html` 검색 URL에 곧바로 접속(curl, Playwright 모두)하면 봇 탐지로 403이 반환됨. eBay 홈페이지 접속 → 검색창에 입력 → 검색 버튼 클릭의 실제 사용자 흐름을 그대로 재현하는 방식(`navigateToMlbCardSearch`, `src/server/scraper/ebay.ts`)으로 우회.
- **"Sponsored" 라벨 난독화**: eBay가 스폰서 배지를 실제로는 숨겨진 `<span>`에 텍스트를 역순으로 넣고, 화면에는 base64 SVG 이미지로 렌더링. 스크래퍼에서는 숨겨진 텍스트를 다시 뒤집어 비교하는 방식으로 감지.
- **통화 불일치**: 스크래핑 서버의 접속 위치(IP 지역)에 따라 eBay가 가격을 다른 통화(KRW 등)로 표시. 통화 기호/코드를 함께 파싱해 `currency` 필드로 저장하도록 처리 (Vercel 배포 후에는 리전에 따라 USD로 보일 가능성 높음).
- **`@sparticuz/chromium`은 Linux 전용 바이너리**: macOS 로컬에서 `ENOEXEC` 에러 발생. `runScrape()`에 브라우저 런처를 주입 가능하게 만들어, 로컬에서는 `scripts/dev-full-scrape.ts`로 풀 `playwright`를 사용해 전체 파이프라인(스크래핑→DB→GPT 분석)을 검증.
- **`vercel dev` 재귀 호출 에러**: `package.json`의 `dev` 스크립트를 `vercel dev`로 설정하면 자기 자신을 재귀 호출한다는 에러 발생. `dev`는 순수 `vite`로 되돌리고, 전체 스택 로컬 실행용으로 `dev:full`(`vercel dev`) 스크립트를 별도로 분리.
- **Tailwind v4 설정 방식 변경**: 기존 `tailwind.config.js` + PostCSS 대신 `@tailwindcss/vite` 플러그인과 `src/index.css`의 `@import "tailwindcss";` 한 줄로 구성.
- **API/서버 코드 타입체크 분리**: `api/`와 `src/server/`는 Node 환경(process.env, node:fs 등)과 브라우저 DOM 평가 코드(Playwright `page.evaluate`)가 섞여 있어, 프론트엔드용 `tsconfig.app.json`과 별도로 `tsconfig.server.json`(Node 타입 + DOM lib)을 분리.

## 프로젝트 구조

```
api/                    Vercel Serverless Functions (요청/응답 처리만)
  cards.ts              GET  /api/cards    TOP20
  card/[id].ts           GET  /api/card/:id 상세
  ranking.ts             GET  /api/ranking  (MVP: cards.ts와 동일)
  scrape.ts              POST /api/scrape   스크래핑 + DB 저장 + 분석 트리거
  analyze.ts             POST /api/analyze  미분석 카드 GPT 분석

src/
  pages/HomePage.tsx      Hero + TOP20 카드 그리드
  components/             RankingGrid, CardItem, LoadingState, ErrorState
  hooks/useCards.ts        TanStack Query 훅
  types/card.ts            공유 타입
  server/
    scraper/               ebay.ts(스크래핑 로직), browser.ts(Chromium launch)
    services/               db.ts, gpt.ts, ranking.ts, analyze.ts, scrape.ts
    db/                      schema.sql, migrate.ts

scripts/
  dev-scrape.ts            로컬에서 스크래퍼만 빠르게 검증 (풀 playwright)
  dev-full-scrape.ts        스크래핑→DB→GPT 분석 전체 파이프라인 로컬 검증
```

## 시작하기

```bash
npm install
cp .env.example .env   # OPENAI_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN 채우기
npm run db:migrate     # Turso에 스키마 생성
npm run dev            # 프론트엔드만 (Vite)
npm run dev:full       # 프론트엔드 + API 라우트 (vercel dev)
```

### 환경 변수

```
OPENAI_API_KEY=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
SCRAPE_LIMIT=20
```

## 알려진 제약 사항 (다음 단계)

- `@sparticuz/chromium`은 Linux 전용이라 `/api/scrape`의 실제 프로덕션 경로는 Vercel에 배포한 뒤에만 검증 가능합니다 (로컬은 `scripts/dev-full-scrape.ts`로 대체 검증).
- Vercel Cron(`vercel.json`)도 배포 후 대시보드에서 실제 실행 여부를 확인해야 합니다.
- 관리자 페이지, CSV 다운로드, 카드 상세 페이지 UI는 스펙에 정의되어 있으나 MVP 범위에서 제외했습니다.
- UI 정렬(Rank/Card/Team/Brand/Year/Price)은 추가됐지만, 값 선택형 **필터**(특정 Team만 보기 등)와 Rookie/PSA 필터는 아직 없습니다.
- 수집 키워드가 `MLB Sports Card` 고정이라 선수별(예: Ohtani) 인기 카드가 TOP20에 없으면 랭킹에 나타나지 않을 수 있습니다.
