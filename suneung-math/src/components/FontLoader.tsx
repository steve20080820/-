"use client";
import { useEffect } from "react";

export type FontInfo = { id: string; family: string; fileName: string; format: string; url: string };

export const BUILTIN_FONTS = [
  { family: "KoPubWorldBatang", label: "KoPubWorld 바탕 (로컬 설치 시)" },
  { family: "Noto Serif KR", label: "Noto Serif KR (기본 웹폰트)" },
  { family: "Batang", label: "바탕 (시스템)" },
];

const STYLE_ID = "sn-custom-fonts";

/** 업로드된 커스텀 폰트를 @font-face로 주입하고, 선택된 시험지 폰트를 --paper-font 변수에 반영 */
export async function applyFonts() {
  try {
    const [fontsRes, settingsRes] = await Promise.all([fetch("/api/fonts"), fetch("/api/settings")]);
    const fonts: FontInfo[] = fontsRes.ok ? await fontsRes.json() : [];
    const settings: Record<string, string> = settingsRes.ok ? await settingsRes.json() : {};
    const css = fonts
      .map(
        (f) =>
          `@font-face{font-family:"${f.family}";src:url("${f.url}") format("${f.format}");font-display:swap;}`,
      )
      .join("\n");
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
    const family = settings.paperFont;
    const stack = `${family ? `"${family}", ` : ""}"KoPubWorldBatang", "Noto Serif KR", "Batang", serif`;
    document.documentElement.style.setProperty("--paper-font", stack);
    await document.fonts?.ready;
    window.dispatchEvent(new Event("sn-fonts-changed"));
  } catch {
    /* 오프라인 등 – 기본 폰트 유지 */
  }
}

export function FontLoader() {
  useEffect(() => {
    applyFonts();
  }, []);
  return null;
}
