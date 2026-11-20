import { NextRequest, NextResponse } from "next/server";
import { activeProvider, parseProblem } from "@/lib/ai";
import { parseProblemText } from "@/lib/textParser";

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ provider: activeProvider() });
}

/** { imageDataUrl?, text?, mode?: "ai" | "text" } */
export async function POST(req: NextRequest) {
  const { imageDataUrl, text, mode } = await req.json();
  try {
    if (mode === "text") {
      return NextResponse.json({ provider: "demo", result: parseProblemText(String(text ?? "")), notice: "규칙 기반 텍스트 파서로 구조화했습니다." });
    }
    const out = await parseProblem({ imageDataUrl, text });
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
