import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import * as z from "zod/v4";
import { FloorPlanError, type ImageType } from "./floorPlanAi.ts";
import { FLOOR_PLAN_PROMPT, FloorPlanReadingSchema, type FloorPlanReading } from "./floorPlanSchema.ts";

/**
 * Reading a floor plan with the Codex CLI on this machine, signed in with the
 * user's own ChatGPT account: no API key. Each plan runs one non-interactive
 * `codex exec` in a scratch folder, read-only, with the image attached and
 * the answer held to the reading's JSON schema.
 */

const TIMEOUT_MS = Number(process.env.FLOOR_PLAN_TIMEOUT_MS) || 5 * 60_000;
const EXE = process.platform === "win32" ? ["codex.exe", "codex.cmd", "codex"] : ["codex"];

/**
 * The codex executable: CODEX_PATH, then PATH, then the one bundled with the
 * OpenAI extension for VS Code or Cursor (newest version first).
 */
export function findCodex(): string | null {
  if (process.env.CODEX_PATH) return existsSync(process.env.CODEX_PATH) ? process.env.CODEX_PATH : null;
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    for (const name of EXE) if (dir && existsSync(path.join(dir, name))) return path.join(dir, name);
  }
  const platformDir = process.platform === "win32" ? "windows-x86_64"
    : process.platform === "darwin" ? (process.arch === "arm64" ? "macos-aarch64" : "macos-x86_64")
    : process.arch === "arm64" ? "linux-aarch64" : "linux-x86_64";
  for (const root of [".vscode", ".cursor", ".vscode-insiders"].map((d) => path.join(homedir(), d, "extensions"))) {
    if (!existsSync(root)) continue;
    const extensions = readdirSync(root).filter((d) => d.startsWith("openai.chatgpt-")).sort().reverse();
    for (const ext of extensions) {
      for (const name of EXE) {
        const exe = path.join(root, ext, "bin", platformDir, name);
        if (existsSync(exe)) return exe;
      }
    }
  }
  return null;
}

/** The reading's JSON Schema in the strict form structured outputs ask for: every object closed, every field required. */
function strictSchema(): unknown {
  const close = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(close);
    if (!node || typeof node !== "object") return node;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) if (key !== "$schema") out[key] = close(value);
    if (out.type === "object" && out.properties && typeof out.properties === "object") {
      out.additionalProperties = false;
      out.required = Object.keys(out.properties);
    }
    return out;
  };
  return close(z.toJSONSchema(FloorPlanReadingSchema));
}

const CODEX_PROMPT = `${FLOOR_PLAN_PROMPT}

The floor plan is the attached image. Answer from the image itself: don't run commands, open files or browse. Reply with the JSON object only.`;

function run(exe: string, args: string[], input: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    // npm installs a .cmd shim on Windows, which only runs through the shell.
    const shim = /\.cmd$/i.test(exe);
    const child = spawn(shim ? `"${exe}"` : exe, shim ? args.map((a) => `"${a}"`) : args,
      { shell: shim, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    const timer = setTimeout(() => {
      child.kill();
      reject(new FloorPlanError(`Codex took longer than ${Math.round(TIMEOUT_MS / 60000)} minutes.`, 504, "timeout"));
    }, TIMEOUT_MS);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, output }); });
    child.stdin.end(input);
  });
}

export async function readFloorPlanWithCodex(image: string, mediaType: ImageType): Promise<FloorPlanReading> {
  const exe = findCodex();
  if (!exe) throw new FloorPlanError("Codex isn't installed here. Install the Codex CLI or the OpenAI extension for VS Code, or set CODEX_PATH.", 503, "codex-missing");

  const dir = await mkdtemp(path.join(tmpdir(), "room-atelier-plan-"));
  try {
    const ext = mediaType === "image/png" ? "png" : mediaType === "image/webp" ? "webp" : "jpg";
    const imagePath = path.join(dir, `plan.${ext}`), schemaPath = path.join(dir, "schema.json"), outPath = path.join(dir, "reading.json");
    await writeFile(imagePath, Buffer.from(image, "base64"));
    await writeFile(schemaPath, JSON.stringify(strictSchema()));
    const model = process.env.FLOOR_PLAN_CODEX_MODEL;
    const { code, output } = await run(exe, [
      "exec", "--skip-git-repo-check", "--ephemeral", "--color", "never", "-s", "read-only", "-C", dir,
      "-i", imagePath, "--output-schema", schemaPath, "-o", outPath, ...(model ? ["-m", model] : []), "-",
    ], CODEX_PROMPT);

    if (code !== 0) {
      if (/log ?in|logged in|unauthori[sz]ed|401|auth/i.test(output)) {
        throw new FloorPlanError("Codex isn't signed in. Run `codex login` (or sign in from the VS Code extension).", 503, "codex-login");
      }
      throw new FloorPlanError(`Codex stopped with an error: ${output.trim().split(/\r?\n/).slice(-3).join(" ").slice(0, 300)}`, 502, "codex-error");
    }
    const text = await readFile(outPath, "utf8").catch(() => "");
    let answer: unknown = null;
    try {
      answer = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    } catch {
      // Falls through to the format error below.
    }
    const parsed = FloorPlanReadingSchema.safeParse(answer);
    if (!parsed.success) throw new FloorPlanError("Codex's answer didn't match the expected format.", 502, "codex-format");
    return parsed.data;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
