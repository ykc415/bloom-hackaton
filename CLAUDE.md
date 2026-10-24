# Bloom 해커톤 프로젝트

- 작업 전에 항상 `HACKATON.md`(해커톤 규칙·일정·심사 기준 요약)를 먼저 읽고 그 기준에 맞춰 판단할 것.
- 제출 전에는 `HACKATON.md`의 "심사 기준 체크리스트"로 프로젝트를 점검할 것.
- `HACKATON.md`는 Discord Bloom 서버 #ambition-for-korea 채널에서 Aside(`aside exec`)로 동기화한다. 새 공지는 "공지 업데이트 로그" 섹션에 날짜와 함께 추가한다.
- 슬라이드 작업은 `ambition-slide-kit/GUIDE.md`를 따른다.

## 커밋 규칙
- 기능 하나를 끝낼 때마다 바로 커밋한다. 여러 기능을 한 커밋에 섞지 않는다.
- 형식: `타입(범위): 한국어 설명`
  - 타입: feat, fix, docs, chore, ci, infra, refactor
  - 범위: web, server, db, vm 같은 폴더 이름
- 커밋 전에 빌드와 테스트를 돌리고, 통과했을 때만 커밋한다.
- 커밋한 다음 바로 main에 push한다.
- .env 같은 비밀값은 절대 커밋하지 않는다.
