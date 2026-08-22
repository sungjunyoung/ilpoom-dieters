# 일품 다이어터 — DESIGN.md

일품 다이어터 추적기의 디자인 시스템 문서입니다. **Toss Design System(TDS)** 의 시각 언어를 차용하되, 금융 도메인 개념은 가져오지 않고 모임 기록 앱에 맞게 축소·조정했습니다. 구현체는 `src/client/index.css` 의 CSS custom property이며, 이 문서와 그 파일이 항상 일치해야 합니다.

## 1. 원칙

1. **모바일 전용.** 최대 폭 480px 단일 컬럼입니다. 다중 컬럼 레이아웃과 PC 전용 레이아웃은 만들지 않습니다.
2. **화면당 강조색 하나.** 파란색(`--blue-500`)은 그 화면에서 가장 중요한 액션 하나에만 사용합니다. 보조 액션은 회색 표면 또는 ghost 변형으로 분리합니다.
3. **평면이 기본.** 배경은 단색이고, 그림자는 떠 있는 표면(토스트·다이얼로그)에만 씁니다. 그라디언트는 프로그레스 바 하나만 예외로 허용합니다.
4. **차가운 회색 위의 파랑.** 순수 검정을 쓰지 않고 푸른 기가 도는 `--grey-900` 을 본문 색으로 씁니다.
5. **숫자는 tabular.** 몸무게·날짜 등 자릿수가 흔들리면 안 되는 값은 `font-variant-numeric: tabular-nums` 를 적용합니다.

### TDS와 의도적으로 다른 점

| 항목 | TDS | 일품 다이어터 | 이유 |
| --- | --- | --- | --- |
| 문체 | 해요체 | **합니다체(하십시오체)** | 운영 수칙이 있는 내기 성격의 모임이라 공지문에 가까운 어조를 사용합니다 |
| 이모지 | product 카피에 inline 금지 | 동일하게 금지 | 카피는 문장으로만 말합니다 |
| 아이콘 세트 | TDS Icon sprite | 사용하지 않음 | 텍스트 라벨과 색 위계만으로 충분한 규모입니다 |

## 2. 색

라이트 모드 단일 팔레트입니다. base 팔레트를 컴포넌트에서 직접 참조하지 않고 아래 시맨틱 별칭으로만 호출합니다.

### Base

```css
--blue-500: #3182f6;  /* 브랜드 파랑, 화면당 하나의 primary 액션 */
--blue-600: #2272eb;  /* pressed */
--blue-50:  #e8f3ff;  /* brand-weak 배경 */

--grey-900: #191f28;  /* 본문 텍스트, 순수 검정 아님 */
--grey-700: #4e5968;  /* 보조 텍스트 */
--grey-600: #6b7684;
--grey-500: #8b95a1;  /* placeholder */
--grey-400: #b0b8c1;  /* disabled */
--grey-300: #d1d6db;
--grey-200: #e5e8eb;  /* 기본 헤어라인 */
--grey-100: #f2f4f6;  /* 보조 표면 */
--grey-50:  #f9fafb;  /* 페이지 배경 */

--red-500:   #f04452;  /* 위험·증가 */
--green-500: #02a26a;  /* 성공·목표·감량 */
```

### Semantic alias

```css
--bg-page: var(--grey-50);
--bg-surface: #ffffff;         /* 카드 */
--bg-secondary: var(--grey-100);
--bg-brand: var(--blue-500);
--bg-brand-weak: var(--blue-50);

--fg-primary: var(--grey-900);
--fg-secondary: var(--grey-700);
--fg-tertiary: var(--grey-500);
--fg-inverse: #ffffff;
--fg-brand: var(--blue-500);
--fg-danger: var(--red-500);
--fg-success: var(--green-500);

--line-default: var(--grey-200);
--line-strong: var(--grey-300);

--press-overlay: rgba(0, 0, 0, 0.06);
--disabled-opacity: 0.3;
```

### 의미 규칙

- 몸무게가 **줄면** `--fg-success`, **늘면** `--fg-danger` 입니다. 목표선과 달성 배지도 success 색을 씁니다.
- 삭제·초기화 등 되돌리기 어려운 액션의 라벨만 `--fg-danger` 입니다. 배경까지 빨강으로 채우지 않습니다.

## 3. 타이포그래피

Pretendard를 1순위로, 실패 시 시스템 한글 고딕으로 폴백합니다.

```css
--font-sans: "Pretendard Variable", Pretendard, -apple-system,
  BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
```

### 타입 스케일

모바일 화면에서 읽는 것만 전제로 한 **8단 사다리**입니다. 본문 15px을 기준선으로 위아래 두 단계씩 벌어지며, 각 단계마다 line-height가 짝으로 정의되어 있습니다. 크기를 직접 px로 쓰지 않고 반드시 토큰으로 호출합니다.

| 토큰 | size / line-height | weight | 사용처 |
| --- | --- | --- | --- |
| `--fs-display` | 28 / 1.3 | 700 | 로그인·온보딩 타이틀 |
| `--fs-h1` | 22 / 1.35 | 700 | 프로필 이름, 데드라인 숫자, PIN 입력 |
| `--fs-h2` | 18 / 1.4 | 700 | 헤더 로고, 카드 제목, 섹션 제목, 현재 몸무게 |
| `--fs-title` | 16 / 1.45 | 600~700 | 멤버 이름, 수칙 제목, 통계 수치, 유저 선택 버튼 |
| `--fs-body` | 15 / 1.55 | 400~600 | 본문, 버튼 라벨, 기록 표, 멘트 |
| `--fs-sub` | 14 / 1.5 | 400~600 | 리스트 보조 정보, 수정 내역, 칩 링크 |
| `--fs-caption` | 13 / 1.45 | 500~600 | 도움말, 타임스탬프, 인라인 링크, 에러 |
| `--fs-badge` | 12 / 1.35 | 600 | 배지, D-day, 통계 라벨 |
| `--fs-input` | 16 | 400 | 모든 입력 필드(하한값) |

읽기 규칙:

- **12px 미만을 쓰지 않습니다.** 12px은 배지·라벨 등 한두 단어짜리 표시에만 허용하고, 문장은 13px부터 시작합니다.
- **입력 필드는 16px 미만으로 내리지 않습니다.** iOS Safari가 15px 이하 입력에 포커스하면 화면을 자동 확대합니다.
- 본문 line-height는 1.5 이상입니다. 한글은 받침 때문에 라틴 문자보다 넉넉한 행간이 필요합니다.
- 자간은 크기에 반비례합니다 — 18px 이상은 `--tracking-tight`(-0.02em)/`--tracking-snug`(-0.01em), 본문 이하는 `--tracking-base`(-0.003em)입니다.
- 한글 줄바꿈은 `word-break: keep-all` 로 단어 단위를 유지합니다.
- 수치 표시는 `tabular-nums`, 강조 수치(현재 몸무게 등)는 700 weight를 씁니다.

## 4. 간격 · 라운드 · 그림자 · 모션

```css
/* 4px 배수 */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;

/* 라운드는 크기와 페어로 */
--radius-s: 8px;    /* 배지 */
--radius-m: 12px;   /* 입력, 중간 버튼 */
--radius-l: 14px;   /* 큰 버튼 */
--radius-xl: 16px;  /* 카드 */
--radius-2xl: 20px; /* 시트 */
--radius-full: 999px; /* 칩, 알약 */

--shadow-1: 0 1px 2px rgba(25, 31, 40, 0.04);
--shadow-2: 0 4px 12px rgba(25, 31, 40, 0.06), 0 1px 2px rgba(25, 31, 40, 0.04);

--ease: cubic-bezier(0.22, 0.61, 0.36, 1);
--dur-fast: 120ms;  /* press */
--dur-base: 200ms;  /* toggle */
--dur-slow: 320ms;  /* 진행 바 */
```

화면 바깥 여백은 20px, 카드 내부 패딩은 16~20px, 라벨과 입력 사이는 8px입니다. 바운스·패럴랙스·스켈레톤 시머는 쓰지 않습니다.

## 5. 컴포넌트 규칙

- **버튼**: 큰 버튼 48px + `--radius-l`, 중간 40px + `--radius-m`. primary는 파란 배경 + 흰 글자, secondary는 `--bg-secondary` + `--fg-primary`, ghost는 배경 없이 `--fg-brand` 라벨입니다. pressed는 `--press-overlay` 를 덧씌우고, disabled는 노드 전체에 `--disabled-opacity` 를 적용합니다(부분 회색 처리 금지).
- **입력**: 48px 높이, `--radius-m`, 평상시 `--bg-secondary` + 1px `--line-default`, 포커스 시 흰 배경 + 1.5px `--blue-500`. 폰트 크기는 iOS 자동 확대를 막기 위해 16px 이상입니다.
- **카드**: 흰 배경, 1px `--line-default`, `--radius-xl`. 그림자는 쓰지 않습니다.
- **리스트 행**: 행 전체가 터치 영역이며 최소 44px 높이를 보장합니다.
- **프로그레스**: 8px 높이 `--radius-full` 트랙(`--grey-200`) 위에 파랑 fill. 유일하게 허용된 그라디언트입니다.
- **푸터**: 모든 화면 하단에 운영 수칙 링크를 고정 노출합니다.

## 6. 카피 규칙

- 종결어미는 **`~합니다`**, 지시는 **`~하십시오`**, 확인은 **`~하시겠습니까?`** 입니다. `~해요` · `~아요` · `~할까요?` 는 쓰지 않습니다.
- 버튼 라벨은 일어날 일을 그대로 씁니다(`기록`, `저장`, `등록`, `로그인`). "여기를 눌러 주세요" 같은 지시형 라벨은 쓰지 않습니다.
- 카피에 이모지를 넣지 않습니다. 느낌표는 쓰지 않습니다.
- 단위는 숫자에 붙여 씁니다(`75.0kg`, `10만 원`).
- 에러 메시지는 사용자를 멈춰 세우지 않고 다음 행동을 알려 줍니다(`몸무게는 20~300kg 사이 숫자로 입력해 주십시오.`).

## 7. 출처

시각 언어의 원본은 Toss Design System 공개 자료입니다.

1. https://toss.tech/article/toss-design-system — TDS 개요, 컴포넌트 설계 원칙
2. https://toss.tech/article/tds-color-system-update — 4계층 컬러 토큰 구조(base → semantic → component)
3. https://toss.im/tossfeed/article/beginning-of-tps — Toss Product Sans, tabular/proportional 숫자 분리
4. https://toss.tech/article/introducing-toss-error-message-system — Navigating error 원칙
5. https://developers-apps-in-toss.toss.im/design/miniapp-branding-guide.html — 미니앱 브랜딩 가이드

Toss Product Sans는 외부 재배포가 금지되어 있어 메트릭이 가장 가까운 무료 대체 서체인 Pretendard를 사용합니다.
