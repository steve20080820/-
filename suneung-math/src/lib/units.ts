// 2028학년도 수능 수학 출제 범위(대수 · 미적분Ⅰ · 확률과 통계) 단원 트리
// + 2015 개정 교육과정(수학Ⅰ·Ⅱ, 미적분, 기하 등) 호환 트리

export type UnitNode = { name: string; children?: UnitNode[] };

export const UNITS_2028: UnitNode[] = [
  {
    name: "대수",
    children: [
      {
        name: "지수함수와 로그함수",
        children: [
          { name: "지수와 로그" },
          { name: "지수함수와 로그함수의 그래프" },
          { name: "지수·로그 방정식과 부등식" },
        ],
      },
      {
        name: "삼각함수",
        children: [
          { name: "삼각함수의 정의" },
          { name: "삼각함수의 그래프" },
          { name: "삼각방정식과 부등식" },
          { name: "사인법칙과 코사인법칙" },
        ],
      },
      {
        name: "수열",
        children: [
          { name: "등차수열과 등비수열" },
          { name: "수열의 합(∑)" },
          { name: "수학적 귀납법·귀납적 정의" },
        ],
      },
    ],
  },
  {
    name: "미적분Ⅰ",
    children: [
      {
        name: "함수의 극한과 연속",
        children: [{ name: "함수의 극한" }, { name: "함수의 연속" }],
      },
      {
        name: "다항함수의 미분법",
        children: [
          { name: "미분계수와 도함수" },
          { name: "접선의 방정식" },
          { name: "함수의 증가·감소와 극대·극소" },
          { name: "그래프와 방정식·부등식" },
          { name: "속도와 가속도" },
        ],
      },
      {
        name: "다항함수의 적분법",
        children: [
          { name: "부정적분" },
          { name: "정적분" },
          { name: "정적분으로 정의된 함수" },
          { name: "넓이와 속도·거리" },
        ],
      },
    ],
  },
  {
    name: "확률과 통계",
    children: [
      {
        name: "경우의 수",
        children: [{ name: "순열과 조합" }, { name: "중복순열·중복조합" }, { name: "이항정리" }],
      },
      {
        name: "확률",
        children: [{ name: "확률의 뜻과 활용" }, { name: "조건부확률" }, { name: "독립시행" }],
      },
      {
        name: "통계",
        children: [{ name: "확률분포" }, { name: "이항분포·정규분포" }, { name: "통계적 추정" }],
      },
    ],
  },
];

export const UNITS_2015: UnitNode[] = [
  {
    name: "수학Ⅰ",
    children: [
      { name: "지수함수와 로그함수" },
      { name: "삼각함수" },
      { name: "수열" },
    ],
  },
  {
    name: "수학Ⅱ",
    children: [
      { name: "함수의 극한과 연속" },
      { name: "미분" },
      { name: "적분" },
    ],
  },
  {
    name: "미적분Ⅱ(2015 미적분)",
    children: [{ name: "수열의 극한" }, { name: "미분법" }, { name: "적분법" }],
  },
  {
    name: "기하",
    children: [{ name: "이차곡선" }, { name: "평면벡터" }, { name: "공간도형과 공간좌표" }],
  },
  {
    name: "확률과 통계(2015)",
    children: [{ name: "경우의 수" }, { name: "확률" }, { name: "통계" }],
  },
];

export function unitTree(curriculum: string): UnitNode[] {
  return curriculum === "2015" ? UNITS_2015 : UNITS_2028;
}

export function middlesOf(curriculum: string, major: string): UnitNode[] {
  return unitTree(curriculum).find((u) => u.name === major)?.children ?? [];
}

export function detailsOf(curriculum: string, major: string, middle: string): UnitNode[] {
  return middlesOf(curriculum, major).find((u) => u.name === middle)?.children ?? [];
}

/** 원 출처 번호 구간 태그 — 2028 수능 체제: 1~21번 5지선다, 22~30번 단답형 (21·30번 최고난도로 가정)
 *  구간 경계는 여기서만 바꾸면 사이드바·대시보드·랜덤 생성기에 모두 반영됩니다. */
export type NumberBucket = { key: string; label: string; min: number; max: number };

export const NUMBER_BUCKETS: NumberBucket[] = [
  { key: "m1", label: "객관식 기본", min: 1, max: 8 },
  { key: "m2", label: "객관식 중난도", min: 9, max: 15 },
  { key: "m3", label: "객관식 준킬러", min: 16, max: 20 },
  { key: "m4", label: "객관식 최고난도", min: 21, max: 21 },
  { key: "s1", label: "단답형 기본", min: 22, max: 26 },
  { key: "s2", label: "단답형 준킬러", min: 27, max: 29 },
  { key: "s3", label: "단답형 최고난도", min: 30, max: 30 },
];

/** 2015 개정 수능(공통 1~22 + 선택 23~30) 문항용 구간 */
export const NUMBER_BUCKETS_2015: NumberBucket[] = [
  { key: "o1", label: "공통 객관식 기본", min: 1, max: 8 },
  { key: "o2", label: "공통 객관식 준킬러", min: 9, max: 13 },
  { key: "o3", label: "공통 객관식 킬러", min: 14, max: 15 },
  { key: "o4", label: "공통 단답형 기본", min: 16, max: 19 },
  { key: "o5", label: "공통 단답형 준킬러·킬러", min: 20, max: 22 },
  { key: "o6", label: "선택과목", min: 23, max: 30 },
];

/** 2028 체제 기본 문항 유형 (1~21 객관식, 22~30 단답형) */
export const SHORT_ANSWER_FROM = 22;

export function bucketsFor(curriculum?: string | null) {
  return curriculum === "2015" ? NUMBER_BUCKETS_2015 : NUMBER_BUCKETS;
}

export function bucketOf(n?: number | null, curriculum?: string | null) {
  if (!n) return null;
  return bucketsFor(curriculum).find((b) => n >= b.min && n <= b.max) ?? null;
}

export const SOURCE_ORGS = ["평가원", "교육청", "사설", "자작", "기타"] as const;

/** 키워드 기반 단원/태그 추천 (AI 키가 없을 때의 데모 태거, AI 결과 보정에도 사용) */
const RULES: { re: RegExp; major: string; middle: string; detail?: string; tag: string }[] = [
  { re: /\\log|로그/, major: "대수", middle: "지수함수와 로그함수", tag: "로그" },
  { re: /\^\{?-|\^\{?\\d?frac|지수/, major: "대수", middle: "지수함수와 로그함수", detail: "지수와 로그", tag: "지수법칙" },
  { re: /\\(sin|cos|tan)|삼각/, major: "대수", middle: "삼각함수", tag: "삼각함수" },
  { re: /사인법칙|코사인법칙|외접원/, major: "대수", middle: "삼각함수", detail: "사인법칙과 코사인법칙", tag: "사인법칙_코사인법칙" },
  { re: /\\sum|a_\{?n|수열|등차|등비/, major: "대수", middle: "수열", tag: "수열" },
  { re: /\\lim|극한|연속/, major: "미적분Ⅰ", middle: "함수의 극한과 연속", tag: "함수의_극한" },
  { re: /f'\(|f\^\{?\\prime|미분|극댓값|극솟값|접선|도함수/, major: "미적분Ⅰ", middle: "다항함수의 미분법", tag: "미분" },
  { re: /\\int|적분|넓이/, major: "미적분Ⅰ", middle: "다항함수의 적분법", tag: "정적분" },
  { re: /\\int_\{?[^}]*\}?\^\{?x|\\int_\{?a\}?\^\{?x/, major: "미적분Ⅰ", middle: "다항함수의 적분법", detail: "정적분으로 정의된 함수", tag: "정적분으로_정의된_함수" },
  { re: /경우의 수|순열|조합|\\mathrm\{?C|_\{?n\}?\\mathrm/, major: "확률과 통계", middle: "경우의 수", tag: "경우의_수" },
  { re: /확률|P\(/, major: "확률과 통계", middle: "확률", tag: "확률" },
  { re: /조건부/, major: "확률과 통계", middle: "확률", detail: "조건부확률", tag: "조건부확률" },
  { re: /평균|분산|표준편차|정규분포|이항분포|E\(X\)|V\(X\)/, major: "확률과 통계", middle: "통계", tag: "확률분포" },
];

export function suggestUnits(text: string) {
  const hits = RULES.filter((r) => r.re.test(text));
  const tags = Array.from(new Set(hits.map((h) => h.tag)));
  // 가장 구체적인(마지막) 규칙 우선이 아니라, 처음 걸린 대단원 기준으로 추천
  const first = hits[hits.length - 1] ?? null;
  return {
    unitMajor: first?.major ?? "",
    unitMiddle: first?.middle ?? "",
    unitDetail: first?.detail ?? "",
    tags,
  };
}
