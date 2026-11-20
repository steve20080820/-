import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tags = await prisma.tag.findMany({ include: { _count: { select: { problems: true } } }, orderBy: { name: "asc" } });
  return NextResponse.json(tags.map((t) => ({ name: t.name, count: t._count.problems })));
}
