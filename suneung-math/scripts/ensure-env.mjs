// .env 가 없으면 .env.example 을 복사합니다. (Windows/Mac/Linux 공통 — cp 명령 불필요)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = path.join(root, ".env");
const example = path.join(root, ".env.example");

if (!fs.existsSync(env)) {
  if (fs.existsSync(example)) fs.copyFileSync(example, env);
  else fs.writeFileSync(env, 'DATABASE_URL="file:./dev.db"\n');
  console.log("✔ .env 파일을 생성했습니다.");
}
