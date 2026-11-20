import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type RandomCondition = {
  unitMajor?: string;
  unitMiddle?: string;
  numMin?: number | null;
  numMax?: number | null;
  points?: number | null;
  type?: "" | "multiple" | "short";
  wrongOnly?: boolean;
  count: number;
};

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 조건부 랜덤 세트 생성: 조건마다 중복 없이 count개 추출 */
export async function POST(req: NextRequest) {
  const { conditions, sortBy = "number" } = (await req.json()) as { conditions: RandomCondition[]; sortBy?: string };
  const chosen = new Set<string>();
  const groups: { index: number; requested: number; picked: number; available: number }[] = [];
  const picked: { id: string; points: number; sourceNumber: number | null; group: number }[] = [];

  for (const [index, c] of (conditions ?? []).entries()) {
    const where: Prisma.ProblemWhereInput = {
      ...(c.unitMajor ? { unitMajor: c.unitMajor } : {}),
      ...(c.unitMiddle ? { unitMiddle: c.unitMiddle } : {}),
      ...(c.points ? { points: c.points } : {}),
      ...(c.type ? { type: c.type } : {}),
      ...(c.wrongOnly ? { wrongCount: { gt: 0 } } : {}),
      ...(c.numMin || c.numMax ? { sourceNumber: { gte: c.numMin || undefined, lte: c.numMax || undefined } } : {}),
      id: { notIn: Array.from(chosen) },
    };
    const pool = await prisma.problem.findMany({ where, select: { id: true, points: true, sourceNumber: true } });
    const take = shuffle(pool).slice(0, Math.max(0, c.count | 0));
    take.forEach((p) => {
      chosen.add(p.id);
      picked.push({ ...p, group: index });
    });
    groups.push({ index, requested: c.count, picked: take.length, available: pool.length });
  }

  if (sortBy === "number") {
    picked.sort((a, b) => (a.sourceNumber ?? 99) - (b.sourceNumber ?? 99) || a.points - b.points);
  } else if (sortBy === "points") {
    picked.sort((a, b) => a.points - b.points || (a.sourceNumber ?? 99) - (b.sourceNumber ?? 99));
  }
  return NextResponse.json({ ids: picked.map((p) => p.id), groups });
}
