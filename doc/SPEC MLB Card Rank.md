**"실시간 MLB Sports Card Ranking Platform"**으로 기획하는 것이 좋습니다. 특히 Playwright와 GPT를 결합하면 "현재 eBay에서 가장 인기 있는 MLB 카드"를 자동으로 수집하고 AI가 분석하여 랭킹을 제공하는 형태로 발전시킬 수 있습니다.

아래는 **Cursor / Claude Code / Codex에서 바로 구현 가능한 수준**의 기술명세서입니다.

---

# MLB Card Rank

## eBay 인기 스포츠 카드 랭킹 서비스 기술명세서 (v1.0)

## 1. 프로젝트 개요

### 프로젝트명

**MLB Card Rank**

### 목표

eBay MLB Sports Card 카테고리에서 인기 상품을 자동으로 수집하여

* 인기순 TOP20
* 선수별 랭킹
* 브랜드별 랭킹
* Rookie Card 현황
* 가격 추이

등을 제공하는 AI 기반 스포츠 카드 랭킹 서비스 구축

---

# 2. 핵심 제안가치

사용자는 별도의 검색 없이

> "현재 eBay에서 가장 인기 있는 MLB 카드"

를 한눈에 확인할 수 있다.

AI는 수집된 데이터를 기반으로

* Rookie Card 여부
* 인기 선수
* 가격 수준
* 희소성

등을 자동 분석한다.

---

# 3. 사용자

### 일반 사용자

* MLB 팬

* 카드 수집가

* 투자자

---

### 전문가

* 카드 판매자

* 카드 쇼핑몰

* 유튜브 콘텐츠 제작자

---

# 4. 기술 스택

## Frontend

* React 19
* Vite
* TypeScript
* TailwindCSS
* TanStack Query
* React Router

---

## Backend

Node.js

Express

또는

Vercel Serverless Functions

---

## 데이터 스크래퍼

Playwright

사용 이유

* eBay 동적 페이지 대응

* Bot Detection 최소화

* Headless 지원

* 안정적 DOM 추출

---

## AI

OpenAI GPT API

사용 목적

* 카드 제목 분석

* Rookie Card 분류

* 브랜드 분류

* 선수명 추출

* 카드 시리즈 추출

* 투자 포인트 생성

---

## DB

SQLite (MVP)

↓

Neon PostgreSQL

또는

Supabase PostgreSQL

---

# 5. 시스템 아키텍처

```
React

      │

API Server

      │

Playwright

      │

eBay

      │

상품 수집

      │

SQLite

      │

GPT 분석

      │

Ranking API

      │

Frontend
```

---

# 6. 데이터 수집 흐름

```
매일 새벽

↓

Playwright 실행

↓

eBay 접속

↓

MLB Card 검색

↓

Best Match

↓

인기순

↓

20개 수집

↓

DB 저장

↓

GPT 분석

↓

랭킹 생성
```

---

# 7. 검색 URL

예시

```
https://www.ebay.com/

Search:

MLB Sports Card
```

또는

```
Shohei Ohtani Card

Aaron Judge Card

Paul Skenes Card

Topps MLB Card
```

---

# 8. 수집 데이터

## 상품 기본정보

* 상품명

* 가격

* 통화

* 배송비

* 이미지

* 판매자

* 평점

* 판매자 리뷰 수

* 상품 URL

---

## 상품 메타정보

AI 분석

* 선수명

* 팀명

* 브랜드

* 연도

* Rookie Card 여부

* Auto 여부

* Patch 여부

* PSA 여부

* 카드 번호

* Parallel 종류

---

예시

```
Shohei Ohtani

2025 Topps Chrome

RC

PSA 10

Gold Refractor

/50
```

---

# 9. 데이터 모델

## Card

```
id

title

player

team

brand

year

price

shipping

seller

sellerRating

reviewCount

image

url

scrapedAt
```

---

## AIAnalysis

```
cardId

rookie

autograph

patch

serialNumber

grading

investmentScore

summary
```

---

# 10. GPT 분석 예시

입력

```
2025 Topps Chrome
Shohei Ohtani Gold Refractor
PSA 10
```

GPT 출력

```
Player

Shohei Ohtani

Brand

Topps

Year

2025

Parallel

Gold

Serial

Unknown

Rookie

No

Investment Score

94

Summary

Topps Chrome의 Gold Parallel이며
PSA 10 등급으로 높은 수집 가치를 가진다.
```

---

# 11. 랭킹 알고리즘

MVP

```
Ranking Score

=

Watchers

+

Seller Rating

+

Review Count

+

Sponsored Weight

+

AI Popularity
```

추후

```
최근 판매가격

+

최근 검색량

+

거래량

+

희소성

+

PSA 등급
```

추가

---

# 12. 메인 화면

## Hero

```
Today's MLB Card Ranking
```

---

## TOP20

| Rank | Card          | Price |
| ---- | ------------- | ----- |
| 1    | Shohei Ohtani | $199  |
| 2    | Aaron Judge   | $145  |
| 3    | Paul Skenes   | $132  |

---

## 필터

* Player

* Team

* Brand

* Year

* Price

* Rookie

* PSA

---

# 13. 카드 상세

이미지

↓

가격

↓

판매자

↓

AI 요약

↓

투자 포인트

↓

eBay 이동

---

# 14. 관리자 기능

Playwright 실행

↓

즉시 스크래핑

↓

DB 업데이트

↓

GPT 재분석

↓

CSV 다운로드

---

# 15. API 설계

```
GET

/api/cards
```

TOP20

---

```
GET

/api/card/:id
```

상세

---

```
GET

/api/ranking
```

랭킹

---

```
POST

/api/scrape
```

Playwright 실행

---

```
POST

/api/analyze
```

GPT 분석

---

# 16. 프로젝트 구조

```
src/

 api/

 components/

 pages/

 hooks/

 store/

 utils/

 types/

 scraper/

     ebay.ts

 services/

     ranking.ts

     gpt.ts

 database/

     sqlite.ts

api/

 scrape.ts

 analyze.ts

 ranking.ts
```

---

# 17. 환경변수

```
OPENAI_API_KEY=

DATABASE_URL=

PLAYWRIGHT_HEADLESS=true

SCRAPE_LIMIT=20

SCRAPE_INTERVAL=24h
```

---

# 18. 향후 확장 로드맵

### Phase 2

* eBay 실시간 인기 급상승 카드(Trending) 탐지
* 최근 낙찰(Auction) 완료 상품과 현재 판매 상품 비교
* 선수별 가격 히트맵 및 변동률 차트
* 즐겨찾기 및 관심 카드 가격 알림

### Phase 3

* PSA, Beckett(BGS), SGC 등급 카드 통합 비교
* COMC, Goldin, Fanatics Collect 등 다른 마켓플레이스 데이터 연계
* AI 기반 예상 적정가(Fair Value) 및 투자 위험도 분석
* 개인 포트폴리오 및 수익률 추적

## MVP 구현 우선순위

바이브코딩 관점에서는 처음부터 모든 기능을 구현하기보다 아래 순서를 추천합니다.

1. **Playwright**로 eBay에서 MLB 인기 카드 TOP20 스크래핑
2. **SQLite**에 데이터 저장
3. **React + Vite**로 랭킹 UI 구현
4. **OpenAI GPT API**로 카드 정보 자동 분석 및 요약
5. **일일 자동 스크래핑(CRON 또는 Vercel Cron)**으로 데이터 갱신

이 구성만으로도 약 **1~2주 내에 공개 가능한 MVP**를 만들 수 있으며, 이후 AI 분석과 투자 기능을 단계적으로 추가하는 것이 가장 효율적인 개발 전략입니다.
