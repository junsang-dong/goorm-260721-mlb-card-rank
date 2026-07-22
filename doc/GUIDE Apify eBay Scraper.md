Apify eBay Scraper를 이용한 데이터 스크래핑

Playwright는 직접 브라우저를 제어하고 DOM을 분석해야 하지만, Apify의 eBay Scraper Actor는 이미 eBay 구조를 분석해 놓았기 때문에 **몇 줄의 API 호출만으로 JSON 데이터를 받을 수 있습니다.** 따라서 React + Vite 프로젝트에서는 **"Apify = 데이터 수집 서비스", "웹앱 = 데이터 분석 및 시각화"**로 역할을 분리하는 것이 유지보수 측면에서도 유리합니다.

---

# 목표

React 기반 웹앱에서

```text
사용자

↓

MLB Card Ranking

↓

Vercel Serverless API

↓

Apify eBay Scraper Actor

↓

eBay

↓

JSON

↓

Neon DB 저장

↓

React Ranking UI
```

---

# 전체 아키텍처

```text
React + Vite

      │

TanStack Query

      │

Vercel API

      │

Apify Client

      │

eBay Scraper Actor

      │

eBay

      │

JSON

      │

GPT 분석

      │

Neon PostgreSQL

      │

Ranking Dashboard
```

---

# 기술 스택

### Frontend

* React 19
* Vite
* TypeScript
* Tailwind CSS
* TanStack Query

### Backend

* Vercel Serverless Functions

### 데이터 수집

* Apify eBay Scraper Actor

### AI

* OpenAI GPT API

### Database

* Neon PostgreSQL

---

# 구현 단계

## 1단계. Apify 계정 생성

* Apify 가입
* API Token 발급
* eBay Scraper Actor 선택

환경변수 예시

```env
APIFY_TOKEN=xxxxxxxxxxxxxxxx
APIFY_ACTOR_ID=xxxxxxxx
OPENAI_API_KEY=xxxxxxxx
DATABASE_URL=xxxxxxxx
```

---

## 2단계. Actor 실행

웹앱에서는 직접 eBay를 스크래핑하지 않고 Apify Actor를 실행합니다.

입력 예시

```json
{
  "search": "MLB sports card",
  "maxItems": 20,
  "sort": "BestMatch"
}
```

또는 특정 선수만 조회할 수도 있습니다.

```json
{
  "search": "Shohei Ohtani Topps Chrome",
  "maxItems": 20
}
```

---

## 3단계. Actor 결과(JSON)

Apify는 구조화된 데이터를 반환합니다.

예시

```json
{
  "title": "2025 Topps Chrome Shohei Ohtani",
  "price": 129.99,
  "currency": "USD",
  "seller": "sportscards88",
  "rating": "99.8%",
  "shipping": "Free",
  "image": "...",
  "url": "...",
  "condition": "New",
  "watchers": 34
}
```

Playwright에서는 직접 DOM을 분석해야 하지만, Apify는 이미 필요한 필드를 대부분 제공합니다.

---

# 4단계. 데이터 정규화

여러 마켓플레이스를 함께 사용할 수 있도록 공통 모델을 정의합니다.

```typescript
Product

id

marketplace

title

player

brand

team

price

currency

shipping

seller

rating

reviewCount

image

url

scrapedAt
```

이 구조를 사용하면 eBay뿐 아니라 쿠팡, 스마트스토어, 아마존 데이터도 같은 형식으로 저장할 수 있습니다.

---

# 5단계. GPT 분석

상품 제목만으로 다양한 정보를 추출할 수 있습니다.

입력

```
2025 Topps Chrome Shohei Ohtani Gold Refractor PSA 10
```

출력

```json
{
  "player": "Shohei Ohtani",
  "brand": "Topps",
  "year": 2025,
  "parallel": "Gold Refractor",
  "grading": "PSA 10",
  "rookie": false,
  "investmentScore": 94
}
```

---

# 6단계. 랭킹 계산

예시 점수

```
Ranking Score

=

Watchers × 5

+

Seller Rating

+

Review Count

+

AI Investment Score

+

Recency Score
```

향후 실제 거래 완료 데이터나 가격 변동성을 추가해 더욱 정교하게 발전시킬 수 있습니다.

---

# 7단계. React 화면

### 메인

```
Today's MLB Card Ranking
```

* TOP20 카드
* 선수 필터
* 브랜드 필터
* 가격순
* 인기순
* Rookie Card만 보기

---

### 카드 상세

* 이미지
* 가격
* 판매자
* AI 요약
* 투자 점수
* eBay 바로가기

---

# API 설계

```
GET

/api/ranking
```

TOP20 반환

```
POST

/api/scrape
```

Apify Actor 실행

```
POST

/api/analyze
```

GPT 분석

```
GET

/api/player/ohtani
```

오타니 카드만 조회

```
GET

/api/trending
```

급상승 카드 조회

---

# 자동화(CRON)

```
매일 새벽 2시

↓

Apify Actor 실행

↓

Neon 저장

↓

GPT 분석

↓

랭킹 계산

↓

웹앱 자동 업데이트
```

Vercel Cron이나 GitHub Actions를 사용하면 별도의 서버를 운영하지 않고도 자동 갱신이 가능합니다.