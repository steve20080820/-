# 수능 수학 문제 아카이브 & 시험지 빌더

업로드한 수학 문제(이미지·캡처·텍스트)를 **2028학년도 수능 예시문항 수학** 시험지 스타일로 조판해 보관하고,
문항을 골라 **B4/A4 2단 시험지**와 **정답·해설지**를 만들어 인쇄(PDF 저장)하는 로컬 웹앱입니다.

- Next.js 15 (App Router) · TypeScript · Tailwind CSS
- KaTeX 수식 렌더링 (`$…$`, `$$…$$`, `[box]…[/box]` 조건 박스)
- Prisma + SQLite (별도 DB 서버 불필요, PostgreSQL/Supabase로 전환 가능)
- Claude Vision / OpenAI Vision OCR (키가 없으면 규칙 기반 데모 파서로 동작)

## 빠른 시작

```bash
cd suneung-math
npm install                 # .env 자동 생성(.env.example 복사) + prisma generate
npm run setup               # SQLite DB 생성(prisma db push) + 샘플 문제 5개·샘플 시험지 시드
npm run dev                 # http://localhost:3000
```

> AI OCR을 쓰려면 생성된 `.env`에 `ANTHROPIC_API_KEY` 또는 `OPENAI_API_KEY`를 넣고 서버를 재시작하세요.
> Windows/Mac 모두 같은 명령으로 동작합니다(`cp` 불필요).

| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build && npm start` | 프로덕션 빌드/실행 |
| `npm run seed` | 샘플 데이터 (문제가 이미 있으면 건너뜀, `-- --force`로 강제 추가) |
| `npm run db:reset` | DB 초기화 후 다시 시드 (**모든 데이터 삭제**) |
| `npm run typecheck` | 타입 검사 |

## 실행 후 확인 방법 (체크리스트)

1. **대시보드 `/`** – 샘플 5문항이 단원별·번호 구간별로 집계되어 보입니다.
2. **문제 아카이브 `/problems`** – 왼쪽 필터에서 `14`번 버튼, `20~22 준킬러·킬러 단답형` 칩, `4점`, `✕ 틀린 문제만`, 검색창에 `\int` 등을 눌러 즉시 필터링되는지 확인합니다. 카드의 `○/✕`로 풀이 기록, `+ 시험지에 담기`로 장바구니 추가.
3. **문제 업로드 `/problems/new`**
   - 문제 캡처 이미지를 끌어다 놓거나 `Ctrl+V` → `✦ AI 자동 변환` (API 키 필요).
   - 키가 없으면 오른쪽 아래 *텍스트 / LaTeX 붙여넣기* 에 예)
     `9. 옳은 것만을 <보기>에서 있는 대로 고른 것은? [4점] <보기> ㄱ. … ㄴ. … ㄷ. … ① ㄱ ② ㄴ ③ ㄱ, ㄴ ④ ㄴ, ㄷ ⑤ ㄱ, ㄴ, ㄷ`
     를 붙여넣고 `텍스트 파싱` → 번호·배점·〈보기〉·선지·단원·태그가 자동으로 채워지고 ③ 프리뷰에 수능 스타일로 조판됩니다.
   - `✂ 도형 크롭`으로 그래프 영역을 드래그 → 고대비 흑백 필터 적용 후 첨부.
4. **시험지 빌더 `/exams/<id>`** (내 시험지 → 샘플 시험지) – 문항 드래그로 순서 변경 시 번호 자동 리넘버링, 문항별 `풀이공간` 슬라이더, `앞에서 단/쪽 넘김`, B4↔A4 전환이 오른쪽 실제 비율 미리보기에 바로 반영되고 자동 저장됩니다.
5. **인쇄** – `🖨 문제지 인쇄 / PDF` → 인쇄 대화상자에서 *여백 없음 · 배율 100% · 머리글/바닥글 해제* → PDF로 저장. `정답·해설지 PDF`는 빠른 정답표 + 문항별 해설·메모·손글씨 풀이를 A4로 출력합니다.
6. **랜덤 모의고사 `/random`** – 프리셋 `미적분Ⅰ 4점 5개 + 대수 15번급 2개` → 생성 → 조건별 부족 개수 경고 확인 → `시험지로 만들기`.
7. **설정 `/settings`** – `.ttf/.otf/.woff2` 폰트를 업로드하면 즉시 시험지 폰트로 적용, ZIP/JSON 백업 다운로드 및 병합/교체 복원.

## 디렉토리 구조

```
suneung-math/
├─ prisma/
│  ├─ schema.prisma        # Problem, Tag, ExamPaper, ExamItem, SolveLog (+ CustomFont, Setting)
│  └─ seed.ts              # 2028 예시문항 스타일 샘플 5문항(객관식·〈보기〉·단답형·조건박스·그래프) + 샘플 시험지
├─ data/                   # (gitignore) 업로드 이미지 data/uploads, 폰트 data/fonts → /api/files/* 로 서빙
└─ src/
   ├─ app/
   │  ├─ (main)/           # 사이드바 레이아웃 화면
   │  │  ├─ page.tsx                 대시보드
   │  │  ├─ problems/                아카이브 · new(업로드/변환) · [id](편집+오답관리)
   │  │  ├─ cart/  exams/  exams/[id](시험지 빌더)  random/  settings/
   │  ├─ print/exam/[id]   # 문제지 인쇄 전용 (B4/A4 @page)
   │  ├─ print/answers/[id]# 정답표·해설지 (A4)
   │  └─ api/              # problems, problems/[id]/{solve,similar}, problems/facets, tags,
   │                       # upload, files, parse(AI), exams, random, fonts, settings, backup
   ├─ components/
   │  ├─ ProblemView.tsx   # 수능 문항 조판 (번호·배점·〈보 기〉박스·선지 1행/3+2/세로 자동)
   │  ├─ ExamPaperView.tsx # 2단 시험지 자동 페이지 분할(높이 측정 → 단/쪽 배치), 머리말·쪽번호
   │  ├─ editor/           # ProblemEditor(원본|편집|프리뷰 3분할), CropTool, UnitSelect, TagInput
   │  ├─ builder/          # ExamBuilder (dnd-kit 정렬, 문항별 여백, 자동 저장)
   │  ├─ archive/          # ArchiveView (단원 트리·번호·배점·출처·오답·태그 필터)
   │  └─ print/            # PrintExam, PrintAnswers
   └─ lib/
      ├─ units.ts          # 2028 단원 트리(대수/미적분Ⅰ/확률과 통계) + 2015 호환 트리, 번호 구간, 키워드 단원 추천
      ├─ ai.ts             # Claude / OpenAI Vision 호출 → JSON 정규화
      ├─ textParser.ts     # 규칙 기반 파서 (번호, [n점], 〈보기〉 ㄱㄴㄷ, ①~⑤)
      ├─ math.ts           # 텍스트+LaTeX → KaTeX HTML
      └─ db.ts, exam.ts, problemQuery.ts, storage.ts, cart.ts, client.ts
```

## 데이터 모델 요약

- **Problem** – 본문(LaTeX), 유형(5지선다/단답형), 선지·〈보기〉(JSON), 선지 레이아웃, 배점, 정답·해설·메모, 출처(번호/연도/월/기관/시험명), 단원(교육과정/대·중·세부), 원본·도형·손글씨 이미지, 난이도·중요도, 풀이/오답 횟수, 마지막 풀이일, 태그(N:M)
- **Tag** – 개념 태그 (`#삼각함수_그래프` 등)
- **ExamPaper / ExamItem** – 제목·교시·영역·용지·여백 균등분배·안내문 / 문항 순서·풀이 공간(mm)·단/쪽 넘김
- **SolveLog** – 풀이 시각, 정오, 소요 시간, 메모 (회독 트래킹)

## AI 설정

`.env`에 키를 넣고 서버를 재시작합니다. 둘 다 있으면 Anthropic이 우선입니다.

```
ANTHROPIC_API_KEY=...   ANTHROPIC_MODEL=claude-sonnet-5-5
OPENAI_API_KEY=...      OPENAI_MODEL=gpt-4o
```

## 번호 구간 (2028 체제)

1~21번 5지선다, 22~30번 단답형. 21·30번을 최고난도로 가정한 구간입니다. 경계는 `src/lib/units.ts`의 `NUMBER_BUCKETS`에서 바꿀 수 있습니다.

| 구간 | 1~8 | 9~15 | 16~20 | 21 | 22~26 | 27~29 | 30 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 분류 | 객관식 기본 | 객관식 중난도 | 객관식 준킬러 | 객관식 최고난도 | 단답형 기본 | 단답형 준킬러 | 단답형 최고난도 |

2015 개정(공통 1~22 + 선택 23~30) 문항은 아카이브에서 `2015 개정`을 켜면 기존 구간으로 분류됩니다.

## 문제 일괄 가져오기 (JSON)

설정 → 백업 & 복원에서 아래 형식의 `.json`을 **병합**으로 복원하면 새 문항으로 추가됩니다.

```json
{ "problems": [
  { "body": "함수 $f(x)=x^3-3x$ 의 극댓값은?", "type": "multiple",
    "choices": ["1","2","3","4","5"], "points": 3, "answer": "2",
    "sourceNumber": 21, "sourceOrg": "사설", "sourceName": "OO 모의고사 1회",
    "unitMajor": "미적분Ⅰ", "unitMiddle": "다항함수의 미분법", "tags": ["극값"],
    "explanation": "..." }
] }
```

## PostgreSQL / Supabase 로 옮기기

`prisma/schema.prisma`의 `provider = "postgresql"`, `.env`의 `DATABASE_URL`을 바꾸고 `npx prisma db push`.
기존 데이터는 설정 → ZIP 백업 후 새 DB에서 복원하면 됩니다.

## 참고

- 시드 문항은 이 앱의 데모용으로 새로 작성한 문항입니다.
- 커스텀 폰트는 사용 권한이 있는 파일만 업로드하세요(로컬 `data/fonts`에만 저장).
