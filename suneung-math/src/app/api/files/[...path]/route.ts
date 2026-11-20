import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { mimeOf, resolveFile } from "@/lib/storage";

export async function GET(_: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length !== 2) return new NextResponse("not found", { status: 404 });
  const file = resolveFile(path[0], path[1]);
  if (!file) return new NextResponse("not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": mimeOf(file),
        "cache-control": "public, max-age=31536000, immutable",
        ...(mimeOf(file) === "image/svg+xml" ? { "content-security-policy": "script-src 'none'" } : {}),
      },
    });
  } catch {
    return new NextResponse("not found", { status: 404 });
  }
}
