import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { prisma, tagConnect } from "@/lib/db";
import { BUCKETS, DATA_DIR, listFiles, resolveFile } from "@/lib/storage";

export const maxDuration = 120;

/** 전체 백업: ZIP(data.json + uploads/ + fonts/) 또는 ?format=json */
export async function GET(req: NextRequest) {
  const [problems, solveLogs, exams, fonts, settings] = await Promise.all([
    prisma.problem.findMany({ include: { tags: true } }),
    prisma.solveLog.findMany(),
    prisma.examPaper.findMany({ include: { items: { orderBy: { order: "asc" } } } }),
    prisma.customFont.findMany(),
    prisma.setting.findMany(),
  ]);
  const data = {
    app: "suneung-math-archive",
    version: 1,
    exportedAt: new Date().toISOString(),
    problems: problems.map(({ tags, ...p }) => ({ ...p, tags: tags.map((t) => t.name) })),
    solveLogs,
    exams,
    fonts,
    settings,
  };
  const stamp = new Date().toISOString().slice(0, 10);

  if (req.nextUrl.searchParams.get("format") === "json") {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="suneung-archive-${stamp}.json"`,
      },
    });
  }

  const zip = new JSZip();
  zip.file("data.json", JSON.stringify(data, null, 2));
  for (const b of BUCKETS) {
    for (const name of await listFiles(b)) {
      const p = resolveFile(b, name);
      if (p) zip.file(`${b}/${name}`, await fs.readFile(p));
    }
  }
  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="suneung-archive-${stamp}.zip"`,
    },
  });
}

type Backup = {
  problems?: (Record<string, unknown> & { id: string; tags?: string[] })[];
  solveLogs?: (Record<string, unknown> & { id: string })[];
  exams?: (Record<string, unknown> & { id: string; items?: Record<string, unknown>[] })[];
  fonts?: { family: string; fileName: string; format: string }[];
  settings?: { key: string; value: string }[];
};

const date = (v: unknown) => (v ? new Date(String(v)) : null);

/** 복원: multipart(file=.zip|.json, mode=merge|replace) */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const mode = form.get("mode") === "replace" ? "replace" : "merge";
  if (!(file instanceof File)) return NextResponse.json({ error: "백업 파일을 선택하세요." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let data: Backup;
  let fileCount = 0;
  try {
    if (file.name.toLowerCase().endsWith(".json")) {
      data = JSON.parse(buf.toString("utf8"));
    } else {
      const zip = await JSZip.loadAsync(buf);
      const json = zip.file("data.json");
      if (!json) throw new Error("ZIP 안에 data.json 이 없습니다.");
      data = JSON.parse(await json.async("string"));
      for (const b of BUCKETS) {
        await fs.mkdir(path.join(DATA_DIR, b), { recursive: true });
        const entries = Object.values(zip.files).filter((f) => !f.dir && f.name.startsWith(`${b}/`));
        for (const entry of entries) {
          const target = resolveFile(b, entry.name.slice(b.length + 1));
          if (!target) continue;
          await fs.writeFile(target, await entry.async("nodebuffer"));
          fileCount++;
        }
      }
    }
  } catch (e) {
    return NextResponse.json({ error: `백업 파일을 읽을 수 없습니다: ${e instanceof Error ? e.message : e}` }, { status: 400 });
  }

  if (mode === "replace") {
    await prisma.$transaction([
      prisma.examItem.deleteMany(),
      prisma.examPaper.deleteMany(),
      prisma.solveLog.deleteMany(),
      prisma.problem.deleteMany(),
      prisma.tag.deleteMany(),
    ]);
  }

  let pCount = 0;
  for (const raw of data.problems ?? []) {
    const { tags = [], id, createdAt, updatedAt, lastSolvedAt, ...rest } = raw;
    const fields = {
      ...(rest as Record<string, unknown>),
      lastSolvedAt: date(lastSolvedAt),
      createdAt: date(createdAt) ?? new Date(),
    } as Parameters<typeof prisma.problem.create>[0]["data"];
    void updatedAt;
    await prisma.problem.upsert({
      where: { id },
      create: { ...fields, id, tags: { connectOrCreate: tagConnect(tags) } },
      update: { ...fields, tags: { set: [], connectOrCreate: tagConnect(tags) } },
    });
    pCount++;
  }

  const existing = new Set((await prisma.problem.findMany({ select: { id: true } })).map((p) => p.id));
  for (const l of data.solveLogs ?? []) {
    if (!existing.has(String(l.problemId))) continue;
    const row = {
      problemId: String(l.problemId),
      correct: Boolean(l.correct),
      timeSec: (l.timeSec as number | null) ?? null,
      note: (l.note as string | null) ?? null,
      solvedAt: date(l.solvedAt) ?? new Date(),
    };
    await prisma.solveLog.upsert({ where: { id: l.id }, create: { id: l.id, ...row }, update: row });
  }

  for (const e of data.exams ?? []) {
    const { items = [], id, createdAt, updatedAt, ...rest } = e;
    void createdAt;
    void updatedAt;
    const fields = rest as Parameters<typeof prisma.examPaper.create>[0]["data"];
    await prisma.examPaper.upsert({ where: { id }, create: { ...fields, id }, update: fields });
    await prisma.examItem.deleteMany({ where: { examId: id } });
    const valid = items.filter((it) => existing.has(String(it.problemId)));
    await prisma.examItem.createMany({
      data: valid.map((it, i) => ({
        examId: id,
        problemId: String(it.problemId),
        order: i,
        spacing: Number(it.spacing ?? 40),
        breakBefore: String(it.breakBefore ?? "none"),
      })),
    });
  }

  for (const f of data.fonts ?? []) {
    await prisma.customFont.upsert({
      where: { family: f.family },
      create: { family: f.family, fileName: f.fileName, format: f.format },
      update: { fileName: f.fileName, format: f.format },
    });
  }
  for (const s of data.settings ?? []) {
    await prisma.setting.upsert({ where: { key: s.key }, create: s, update: { value: s.value } });
  }

  return NextResponse.json({
    ok: true,
    mode,
    problems: pCount,
    exams: data.exams?.length ?? 0,
    files: fileCount,
  });
}
