import katex from "katex";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const cache = new Map<string, string>();

function tex(src: string, display: boolean) {
  const key = (display ? "D:" : "I:") + src;
  const hit = cache.get(key);
  if (hit) return hit;
  const html = katex.renderToString(src, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
    trust: false,
    macros: {
      "\\dlim": "\\displaystyle\\lim",
      "\\dsum": "\\displaystyle\\sum",
      "\\dint": "\\displaystyle\\int",
    },
  });
  if (cache.size > 2000) cache.clear();
  cache.set(key, html);
  return html;
}

/** 텍스트 + $..$ / $$..$$ 수식 → HTML (줄바꿈, 이스케이프 \$ 지원) */
function inlineToHtml(src: string): string {
  let out = "";
  let i = 0;
  let buf = "";
  const flush = () => {
    out += esc(buf).replace(/\n/g, "<br/>");
    buf = "";
  };
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\" && src[i + 1] === "$") {
      buf += "$";
      i += 2;
      continue;
    }
    if (ch === "$") {
      const display = src[i + 1] === "$";
      const open = display ? 2 : 1;
      const close = display ? "$$" : "$";
      let j = i + open;
      while (j < src.length) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src.startsWith(close, j)) break;
        j++;
      }
      if (j >= src.length) {
        buf += src.slice(i);
        break;
      }
      if (display) buf = buf.replace(/[ \t]*\n[ \t]*$/, "");
      flush();
      const body = src.slice(i + open, j);
      out += display ? `<span class="math-block">${tex(body, true)}</span>` : tex(body, false);
      i = j + close.length;
      if (display) {
        const m = /^[ \t]*\n/.exec(src.slice(i));
        if (m) i += m[0].length;
      }
      continue;
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

/** [box]...[/box] 조건 박스와 일반 텍스트를 처리 */
export function renderMath(src: string): string {
  if (!src) return "";
  const parts = src.split(/\[box\]([\s\S]*?)\[\/box\]/g);
  return parts
    .map((p, idx) => {
      if (idx % 2 === 1) {
        return `<div class="cond-box">${inlineToHtml(p.trim())}</div>`;
      }
      // 박스 직전/직후 줄바꿈 하나는 제거
      return inlineToHtml(p.replace(/^\n/, "").replace(/\n$/, ""));
    })
    .join("");
}

/** 선지 길이 추정 (레이아웃 자동 결정용) – LaTeX 명령을 대충 걷어낸 시각적 길이 */
export function visualLength(s: string): number {
  const stripped = s
    .replace(/\\(dfrac|frac)\{([^{}]*)\}\{([^{}]*)\}/g, (_, __, a: string, b: string) => (a.length > b.length ? a : b))
    .replace(/\\[a-zA-Z]+/g, "x")
    .replace(/[{}$^_\\]/g, "")
    .replace(/\s+/g, " ");
  let len = 0;
  for (const ch of stripped) len += /[가-힣ㄱ-ㅎ]/.test(ch) ? 1.7 : 1;
  return len;
}
