import type { Prisma } from "@prisma/client";

const list = (v: string | null) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);
const num = (v: string | null) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : undefined;
};

/** URL 검색 파라미터 → Prisma where */
export function buildProblemWhere(sp: URLSearchParams): Prisma.ProblemWhereInput {
  const and: Prisma.ProblemWhereInput[] = [];

  const ids = list(sp.get("ids"));
  if (ids.length) and.push({ id: { in: ids } });

  const q = sp.get("q")?.trim();
  if (q) {
    for (const word of q.split(/\s+/)) {
      const w = word.replace(/^#/, "");
      and.push({
        OR: [
          { body: { contains: w } },
          { title: { contains: w } },
          { explanation: { contains: w } },
          { memo: { contains: w } },
          { sourceName: { contains: w } },
          { bogi: { contains: w } },
          { choices: { contains: w } },
          { unitDetail: { contains: w } },
          { tags: { some: { name: { contains: w } } } },
        ],
      });
    }
  }

  const curriculum = sp.get("curriculum");
  if (curriculum) and.push({ curriculum });
  const major = sp.get("unitMajor");
  if (major) and.push({ unitMajor: major });
  const middle = sp.get("unitMiddle");
  if (middle) and.push({ unitMiddle: middle });
  const detail = sp.get("unitDetail");
  if (detail) and.push({ unitDetail: detail });

  const numbers = list(sp.get("numbers")).map((n) => parseInt(n, 10)).filter(Number.isFinite);
  if (numbers.length) and.push({ sourceNumber: { in: numbers } });
  const nMin = num(sp.get("numMin"));
  const nMax = num(sp.get("numMax"));
  if (nMin !== undefined || nMax !== undefined) and.push({ sourceNumber: { gte: nMin, lte: nMax } });

  const points = list(sp.get("points")).map((n) => parseInt(n, 10)).filter(Number.isFinite);
  if (points.length) and.push({ points: { in: points } });

  const orgs = list(sp.get("sourceOrg"));
  if (orgs.length) and.push({ sourceOrg: { in: orgs } });
  const year = num(sp.get("year"));
  if (year) and.push({ sourceYear: year });
  const month = num(sp.get("month"));
  if (month) and.push({ sourceMonth: month });

  const type = sp.get("type");
  if (type === "multiple" || type === "short") and.push({ type });

  if (sp.get("wrongOnly") === "1") and.push({ wrongCount: { gt: 0 } });
  if (sp.get("unsolved") === "1") and.push({ solveCount: 0 });
  if (sp.get("hasBogi") === "1") and.push({ NOT: { bogi: "[]" } });

  const tags = list(sp.get("tags"));
  for (const t of tags) and.push({ tags: { some: { name: t } } });

  const minDiff = num(sp.get("minDifficulty"));
  if (minDiff) and.push({ difficulty: { gte: minDiff } });

  return and.length ? { AND: and } : {};
}

export function buildOrder(sort: string | null): Prisma.ProblemOrderByWithRelationInput[] {
  switch (sort) {
    case "number":
      return [{ sourceNumber: "asc" }, { createdAt: "desc" }];
    case "wrong":
      return [{ wrongCount: "desc" }, { lastSolvedAt: "asc" }];
    case "difficulty":
      return [{ difficulty: "desc" }, { sourceNumber: "desc" }];
    case "stale":
      return [{ lastSolvedAt: "asc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}
