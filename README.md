# magent · (주)마젠트 · Ambition for Korea 해커톤

**Shopping that already knows you.** magent는 Gmail의 주문 메일에서 브랜드·사이즈·예산·스타일을 학습해, 모든 카테고리의 상품을 내 취향에 맞춰 추천하고 판매처별 최저가로 연결하는 개인 쇼핑 AI 에이전트입니다.

- **데모:** https://magent-ai.vercel.app
- **미션:** BASS Ventures · 1년 안에 전 세계 1억 명이 쓰는 컨슈머 AI
- **타깃:** 미국 온라인 쇼핑 고객 중 개인화된 상품을 찾는 사람 (영어 · USD)
- **해커톤:** Ambition for Korea (2026-10-24, 서울 AI 허브). 규칙과 일정은 [HACKATON.md](HACKATON.md)

## 데모 사용법

1. **Connect Gmail**을 누르고 Google 계정을 고릅니다. "Google에서 확인하지 않은 앱" 화면이 나오면 **고급 → magent(으)로 이동**을 누르고 권한을 허용합니다.
2. magent가 최근 12개월 주문 메일을 읽고 취향 프로필을 만든 뒤 맞춤 추천을 바로 보여 줍니다.
3. 아래 입력창에서 무엇이든 물어보세요(예: "A carry-on suitcase under $200"). Gmail 없이 대화만으로도 쓸 수 있습니다.

## 동작 방식

| 단계 | 하는 일 | 모델 · API |
|---|---|---|
| Gmail 연결 | OAuth(`gmail.readonly`). refresh token은 암호화한 httpOnly 쿠키에만 저장(서버 DB 없음) | Google OAuth |
| 주문 메일 수집 | 최근 12개월 구매 관련 메일 최대 50통. 다시 열 때는 새 메일만 확인 | Gmail API |
| 메일별 추출 | 상품·브랜드·카테고리·사이즈·가격(USD 환산). 민감 구매(의약품 등)와 광고는 제외 | Claude Haiku 5.5 (병렬) |
| 프로필 종합 | 브랜드·사이즈·예산·스타일·관심사 항목과 근거. 사용자가 직접 말한 사실이 항상 우선 | Claude Opus 5.5 |
| 대화형 추천 | 상품 검색 → 3~6개 추천 카드(개인화 이유, 판매처별 가격 비교) → 짧은 설명. 대화 중 말한 사실은 프로필에 저장 | Claude Opus 5.5 + Channel3 |

개인정보: 원본 메일은 저장하지 않고, 프로필은 사용자 브라우저(localStorage)에만 남습니다. 자세한 내용은 [/privacy](https://magent-ai.vercel.app/privacy).

## 로컬 실행

```sh
npm install
# .env.local: ANTHROPIC_API_KEY, CHANNEL3_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET
npm run dev   # http://localhost:3000
```

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · Anthropic TypeScript SDK · Zod · Vercel

## 오픈소스 출처

해커톤 시작(10:00) 이후 이 레포에서 새로 작성했습니다. 가져다 쓴 코드나 템플릿은 없고, 아래 오픈소스 패키지를 의존성으로만 사용합니다.

- [Next.js](https://github.com/vercel/next.js) (MIT), [React](https://github.com/facebook/react) (MIT)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) (MIT)
- [Zod](https://github.com/colinhacks/zod) (MIT)
- [Lucide](https://github.com/lucide-icons/lucide) 아이콘 (ISC)
