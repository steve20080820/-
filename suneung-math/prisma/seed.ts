/* 2028 수능 예시문항 스타일 샘플 문항 5개 + 샘플 시험지
 * 실행: npm run seed   (npm run setup 은 DB 생성 + 시드를 한 번에 수행)
 * ※ 아래 문항은 이 앱의 데모용으로 새로 작성한 문항입니다. */
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();
const DATA_DIR = path.resolve(process.cwd(), process.env.DATA_DIR || "./data");

/** y = 2sin x + 1 (0 ≤ x ≤ 2π) 그래프 SVG */
function sineFigure() {
  const ox = 34, oy = 120, sx = 42, sy = 28; // 원점, 1rad당 px, 1단위당 px
  const X = (x: number) => ox + x * sx;
  const Y = (y: number) => oy - y * sy;
  const pts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const x = (Math.PI * 2 * i) / 160;
    pts.push(`${X(x).toFixed(1)},${Y(2 * Math.sin(x) + 1).toFixed(1)}`);
  }
  const t = (x: number, y: number, s: string, extra = "", size = 15) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Times New Roman, serif" font-size="${size}" ${extra}>${s}</text>`;
  const W = Math.round(X(2 * Math.PI) + 30);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Y(-1) + 30}" viewBox="0 0 ${W} ${Y(-1) + 30}">
  <rect width="100%" height="100%" fill="#fff"/>
  <g stroke="#000" stroke-width="1" fill="none">
    <line x1="${ox - 20}" y1="${oy}" x2="${W - 8}" y2="${oy}"/>
    <line x1="${ox}" y1="${Y(-1) + 22}" x2="${ox}" y2="8"/>
    <polyline points="${pts.join(" ")}" stroke-width="1.6"/>
    <g stroke-dasharray="3 3" stroke-width="0.8">
      <line x1="${ox}" y1="${Y(3)}" x2="${X(Math.PI / 2)}" y2="${Y(3)}"/>
      <line x1="${X(Math.PI / 2)}" y1="${Y(3)}" x2="${X(Math.PI / 2)}" y2="${oy}"/>
      <line x1="${ox}" y1="${Y(-1)}" x2="${X((3 * Math.PI) / 2)}" y2="${Y(-1)}"/>
      <line x1="${X((3 * Math.PI) / 2)}" y1="${Y(-1)}" x2="${X((3 * Math.PI) / 2)}" y2="${oy}"/>
    </g>
  </g>
  <path d="M ${W - 8} ${oy} l -7 -3.5 v 7 z M ${ox} 8 l -3.5 7 h 7 z" fill="#000"/>
  ${t(W - 12, oy + 18, "x", 'font-style="italic"')}
  ${t(ox + 6, 18, "y", 'font-style="italic"')}
  ${t(ox - 16, oy + 16, "O", 'font-style="italic"')}
  ${t(ox - 14, Y(3) + 5, "3")}
  ${t(ox - 22, Y(-1) + 5, "−1")}
  ${t(ox - 14, Y(1) + 5, "1")}
  ${t(X(Math.PI) - 5, oy + 18, "π", 'font-style="italic"')}
  ${t(X(2 * Math.PI) - 8, oy + 18, "2π", 'font-style="italic"')}
  ${t(X(Math.PI / 2) + 6, Y(3) - 6, "y = f(x)", 'font-style="italic"', 14)}
</svg>`;
}

const S = String.raw;

const problems = [
  {
    key: "p1",
    body: S`$\left(\dfrac{1}{4}\right)^{-\frac{1}{2}} \times 8^{\frac{2}{3}}$ 의 값은?`,
    type: "multiple",
    choices: ["2", "4", "6", "8", "16"],
    points: 2,
    answer: "4",
    explanation: S`$\left(\dfrac{1}{4}\right)^{-\frac{1}{2}} = \left(2^{-2}\right)^{-\frac{1}{2}} = 2$, $\;8^{\frac{2}{3}} = \left(2^{3}\right)^{\frac{2}{3}} = 4$ 이므로 구하는 값은 $2 \times 4 = 8$ 이다.`,
    sourceNumber: 1,
    unitMajor: "대수",
    unitMiddle: "지수함수와 로그함수",
    unitDetail: "지수와 로그",
    tags: ["지수법칙", "계산"],
    difficulty: 1,
  },
  {
    key: "p2",
    body: S`두 사건 $A$, $B$ 에 대하여
$$P(A)=\dfrac{1}{2}, \quad P(B)=\dfrac{1}{3}, \quad P(A \cup B)=\dfrac{2}{3}$$
일 때, $P(A \cap B)$ 의 값은?`,
    type: "multiple",
    choices: [S`$\dfrac{1}{12}$`, S`$\dfrac{1}{6}$`, S`$\dfrac{1}{4}$`, S`$\dfrac{1}{3}$`, S`$\dfrac{5}{12}$`],
    points: 3,
    answer: "2",
    explanation: S`확률의 덧셈정리에 의하여 $P(A\cap B) = P(A)+P(B)-P(A\cup B) = \dfrac{1}{2}+\dfrac{1}{3}-\dfrac{2}{3} = \dfrac{1}{6}$`,
    sourceNumber: 4,
    unitMajor: "확률과 통계",
    unitMiddle: "확률",
    unitDetail: "확률의 뜻과 활용",
    tags: ["확률의_덧셈정리"],
    difficulty: 1,
  },
  {
    key: "p3",
    body: S`닫힌구간 $[0,\,2\pi]$ 에서 정의된 함수 $f(x) = 2\sin x + 1$ 의 그래프가 그림과 같다. 옳은 것만을 〈보기〉에서 있는 대로 고른 것은?`,
    type: "multiple",
    choices: ["ㄱ", "ㄴ", "ㄱ, ㄴ", "ㄱ, ㄷ", "ㄱ, ㄴ, ㄷ"],
    choiceLayout: "row",
    bogi: [
      S`함수 $f(x)$ 의 최댓값은 $3$ 이다.`,
      S`방정식 $f(x) = 0$ 의 서로 다른 실근의 개수는 $1$ 이다.`,
      S`방정식 $f(x) = k$ 의 서로 다른 실근의 개수가 $3$ 이 되도록 하는 실수 $k$ 의 값은 $1$ 이다.`,
    ],
    points: 4,
    answer: "4",
    explanation: S`ㄱ. $-1 \le \sin x \le 1$ 이므로 최댓값은 $x=\dfrac{\pi}{2}$ 일 때 $3$ 이다. (참)
ㄴ. $\sin x = -\dfrac{1}{2}$ 의 해는 $x = \dfrac{7}{6}\pi,\ \dfrac{11}{6}\pi$ 로 $2$ 개이다. (거짓)
ㄷ. 직선 $y=k$ 와 그래프의 교점이 $3$ 개인 경우는 양 끝점 $x=0,\ 2\pi$ 를 지나는 $k=1$ 뿐이다. (참)
따라서 옳은 것은 ㄱ, ㄷ 이다.`,
    sourceNumber: 14,
    unitMajor: "대수",
    unitMiddle: "삼각함수",
    unitDetail: "삼각함수의 그래프",
    tags: ["삼각함수_그래프", "보기_진위판정", "그래프와_교점"],
    difficulty: 4,
    importance: 5,
    figure: true,
    figureWidth: 72,
  },
  {
    key: "p4",
    body: S`수열 $\{a_n\}$ 이
$$\sum_{k=1}^{10} \left(2a_k + 3\right) = 70, \qquad \sum_{k=1}^{10} {a_k}^{2} = 40$$
을 만족시킬 때, $\displaystyle\sum_{k=1}^{10} \left(a_k + 1\right)^{2}$ 의 값을 구하시오.`,
    type: "short",
    choices: [],
    points: 3,
    answer: "90",
    explanation: S`$\displaystyle\sum_{k=1}^{10}(2a_k+3) = 2\sum_{k=1}^{10}a_k + 30 = 70$ 에서 $\displaystyle\sum_{k=1}^{10}a_k = 20$.
$\displaystyle\sum_{k=1}^{10}(a_k+1)^2 = \sum_{k=1}^{10}{a_k}^2 + 2\sum_{k=1}^{10}a_k + 10 = 40 + 40 + 10 = 90$`,
    sourceNumber: 23,
    unitMajor: "대수",
    unitMiddle: "수열",
    unitDetail: "수열의 합(∑)",
    tags: ["시그마의_성질"],
    difficulty: 2,
  },
  {
    key: "p5",
    body: S`다항함수 $f(x)$ 가 모든 실수 $x$ 에 대하여
[box]
$\displaystyle\int_{1}^{x} f(t)\,dt = x^{3} - ax^{2} + bx$
[/box]
를 만족시킨다. 함수 $f(x)$ 가 $x = 2$ 에서 극솟값을 가질 때, $f(3) + a + b$ 의 값을 구하시오. (단, $a$, $b$ 는 상수이다.)`,
    type: "short",
    choices: [],
    points: 4,
    answer: "7",
    explanation: S`양변에 $x=1$ 을 대입하면 $0 = 1 - a + b$ 이므로 $b = a - 1$ 이다.
양변을 $x$ 에 대하여 미분하면 $f(x) = 3x^{2} - 2ax + b$ 이고 $f'(x) = 6x - 2a$ 이다.
$f'(2) = 0$ 에서 $a = 6$, $b = 5$ 이므로 $f(x) = 3x^{2} - 12x + 5$.
따라서 $f(3) + a + b = -4 + 6 + 5 = 7$`,
    sourceNumber: 28,
    unitMajor: "미적분Ⅰ",
    unitMiddle: "다항함수의 적분법",
    unitDetail: "정적분으로 정의된 함수",
    tags: ["정적분으로_정의된_함수", "극값"],
    difficulty: 4,
    importance: 5,
  },
];

async function main() {
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
  const figName = "seed-sine-graph.svg";
  fs.writeFileSync(path.join(DATA_DIR, "uploads", figName), sineFigure());

  const existing = await prisma.problem.count();
  if (existing > 0 && !process.argv.includes("--force")) {
    console.log(`이미 ${existing}개의 문제가 있어 시드를 건너뜁니다. (강제로 추가하려면: npm run seed -- --force)`);
    return;
  }

  const ids: string[] = [];
  for (const p of problems) {
    const row = await prisma.problem.create({
      data: {
        body: p.body,
        type: p.type,
        choices: JSON.stringify(p.choices),
        choiceLayout: p.choiceLayout ?? "auto",
        bogi: JSON.stringify(p.bogi ?? []),
        points: p.points,
        answer: p.answer,
        explanation: p.explanation,
        sourceNumber: p.sourceNumber,
        sourceYear: 2028,
        sourceOrg: "자작",
        sourceName: "예시문항 스타일 샘플",
        curriculum: "2028",
        unitMajor: p.unitMajor,
        unitMiddle: p.unitMiddle,
        unitDetail: p.unitDetail,
        difficulty: p.difficulty ?? 3,
        importance: p.importance ?? 3,
        figureImage: p.figure ? `/api/files/uploads/${figName}` : null,
        figureWidth: p.figureWidth ?? 60,
        tags: { connectOrCreate: p.tags.map((name) => ({ where: { name }, create: { name } })) },
      },
    });
    ids.push(row.id);
  }

  // 오답 관리 데모: 14번은 한 번 틀리고 한 번 맞음
  const day = 86400000;
  await prisma.solveLog.createMany({
    data: [
      { problemId: ids[2], correct: false, timeSec: 420, note: "ㄷ에서 양 끝점 놓침", solvedAt: new Date(Date.now() - 3 * day) },
      { problemId: ids[2], correct: true, timeSec: 260, solvedAt: new Date(Date.now() - day) },
      { problemId: ids[4], correct: false, timeSec: 600, note: "x=1 대입 조건을 안 씀", solvedAt: new Date(Date.now() - 2 * day) },
    ],
  });
  await prisma.problem.update({ where: { id: ids[2] }, data: { solveCount: 2, wrongCount: 1, lastSolvedAt: new Date(Date.now() - day), memo: "끝점 포함 여부 체크!" } });
  await prisma.problem.update({ where: { id: ids[4] }, data: { solveCount: 1, wrongCount: 1, lastSolvedAt: new Date(Date.now() - 2 * day) } });

  const spacing = [30, 40, 70, 45, 75];
  await prisma.examPaper.create({
    data: {
      title: "2028학년도 대비 나만의 모의고사",
      items: { create: ids.map((problemId, order) => ({ problemId, order, spacing: spacing[order] })) },
    },
  });

  console.log(`✔ 샘플 문제 ${ids.length}개와 샘플 시험지 1개를 생성했습니다.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
