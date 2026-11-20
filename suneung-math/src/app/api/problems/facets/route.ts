import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 사이드바 필터용 집계 */
export async function GET() {
  const [units, numbers, years, points, wrong] = await Promise.all([
    prisma.problem.groupBy({ by: ["curriculum", "unitMajor", "unitMiddle"], _count: { _all: true } }),
    prisma.problem.groupBy({ by: ["sourceNumber"], _count: { _all: true } }),
    prisma.problem.groupBy({ by: ["sourceYear"], _count: { _all: true }, orderBy: { sourceYear: "desc" } }),
    prisma.problem.groupBy({ by: ["points"], _count: { _all: true } }),
    prisma.problem.count({ where: { wrongCount: { gt: 0 } } }),
  ]);
  return NextResponse.json({
    units: units.map((u) => ({ curriculum: u.curriculum, major: u.unitMajor, middle: u.unitMiddle, count: u._count._all })),
    numbers: Object.fromEntries(numbers.filter((n) => n.sourceNumber != null).map((n) => [n.sourceNumber, n._count._all])),
    years: years.filter((y) => y.sourceYear != null).map((y) => ({ year: y.sourceYear, count: y._count._all })),
    points: Object.fromEntries(points.map((p) => [p.points, p._count._all])),
    wrong,
  });
}
