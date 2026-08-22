# 일품 다이어터 추적기

'일품' 모임의 다이어트 추적기. **2026-12-12 데드라인**까지 함께 몸무게를 기록하고 응원하는 모바일 웹앱.

## 스택

- **Cloudflare Workers** + **Static Assets** (SPA) — 단일 Worker 배포
- **Cloudflare D1** (SQLite) — 데이터 저장
- **Hono** — API 라우팅 (`src/worker/`)
- **React 19 + Vite 7 + @cloudflare/vite-plugin** — 프론트엔드 (`src/client/`)
- **recharts** — 몸무게 변화 그래프
- **Nix flake + direnv** — 개발 환경 (node 24, pnpm, sqlite)

## 개발 환경

```sh
direnv allow        # flake dev shell 자동 진입
pnpm install
pnpm db:migrate:local   # 로컬 D1에 마이그레이션 적용
pnpm dev                # http://localhost:5173
```

## 기능

- 최초에 어드민 유저(관리자)만 존재. 초기 패스워드 `0000`, 최초 로그인 시 변경 강제
- 어드민만 유저 생성 가능 (초기 PIN `0000` 발급), PIN 초기화 가능
- 유저는 최초 로그인 시 PIN 재설정 + 시작/목표 몸무게(kg, 소수점) 기록
- 날짜별 몸무게 기록 (언제든), 수정 시 수정 내역 공개, 삭제 가능
- 앞뒤 기록과 비교해 **하루 1kg을 초과하는 감량**이 계산되면 저장·수정 차단 (운영 수칙 3번)
- 프로필에 몸무게 변화 그래프 (목표선 포함), 목표 미만 달성 시 배지 표시 (운영 수칙 1번)
- 유저 프로필에 멘트 남기기 — 전체 공개, 누가 누구에게 보냈는지 표시
- 운영 수칙 페이지(`/rules`) — 모든 화면 하단에서 언제든 접근 가능

UI 규칙은 [DESIGN.md](DESIGN.md)에 정리되어 있습니다.

## 배포

```sh
npx wrangler login
npx wrangler d1 create ilpoom-dieters
# 출력된 database_id를 wrangler.jsonc의 d1_databases[0].database_id에 넣기
pnpm db:migrate:remote
pnpm deploy
```

## 계정 규칙

| 계정 | 초기 자격증명 | 비고 |
| --- | --- | --- |
| 관리자 | `0000` | 최초 로그인 시 새 패스워드 설정 |
| 일반 유저 | PIN `0000` | 최초 로그인 시 PIN(숫자 4자리) 재설정 + 몸무게 입력 |
