import { execFile } from "node:child_process";

/**
 * Real client for the OpenClaw Gateway, confirmed against the locally
 * installed `openclaw` CLI (`openclaw --help` / `openclaw agent --help`)
 * and the actual running Gateway process on this machine — not invented.
 *
 * Why a CLI subprocess and not a raw WebSocket client: the Gateway's wire
 * protocol (device identity, connect-challenge handshake, HelloOk, event
 * frames — see `packages/gateway-client` inside the `openclaw` package) is
 * internal and not exported for third-party use. `openclaw agent` is the
 * officially documented, stable surface for "run an agent turn via the
 * Gateway", and it is what we drive here via `execFile` (argv array, no
 * shell, so the user's message can never be interpreted as shell syntax).
 *
 * Auth: the Gateway uses `gateway.auth.mode = "token"`. `openclaw agent`
 * has no --url/--token flags of its own; it resolves credentials
 * ambiently. If SANAI's own OPENCLAW_GATEWAY_URL / OPENCLAW_GATEWAY_TOKEN
 * env vars are set, we forward them to the child process env (confirmed
 * real env vars — see the OpenClaw dotenv allow-list) so a remote/override
 * Gateway can be targeted later without code changes. If they are not
 * set, the CLI falls back to the token already stored in this machine's
 * `~/.openclaw/openclaw.json` — still entirely server-side, never sent to
 * the browser, and never read or logged by this module.
 */

export type OpenClawFailureKind = "unavailable" | "timeout" | "agent_error" | "empty_reply" | "misconfigured";

export type OpenClawOutcome =
  | { ok: true; reply: string; runId?: string }
  | { ok: false; kind: OpenClawFailureKind; detail: string };

export interface AskOpenClawOptions {
  /** Extra context prepended to the message (e.g. selected project name). */
  contextHint?: string;
  timeoutMs?: number;
  /**
   * Overrides the default agent id for this call. Used by `task-runner.ts`
   * to route real code edits to the sandboxed "developer" agent (see
   * `sandbox-service.ts`) instead of the default, unsandboxed one — every
   * other caller (plain chat/analysis) keeps using the default.
   */
  agentId?: string;
}

const DEFAULT_TIMEOUT_MS = 45_000;
const CLI_BIN = process.env.OPENCLAW_CLI_PATH || "openclaw";
const DEFAULT_AGENT_ID = process.env.OPENCLAW_AGENT_ID || "main";
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

interface CliResult {
  stdout: string;
  stderr: string;
  error: (Error & { code?: string | number; killed?: boolean; signal?: NodeJS.Signals | null }) | null;
}

function runOpenClawCli(args: string[], env: NodeJS.ProcessEnv, timeoutMs: number): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      /* turbopackIgnore: true */ CLI_BIN,
      args,
      { env, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        // execFile's callback receives `error` on a non-zero exit code, on
        // our own timeout, AND on spawn failure (e.g. binary missing) — but
        // OpenClaw still writes a structured JSON envelope to stdout even
        // when it reports ok:false, so we always resolve with everything we
        // got and let the caller decide from the parsed payload first.
        resolve({ stdout, stderr, error: error as CliResult["error"] });
      },
    );
  });
}

/**
 * Extracts the assistant reply text from a successful agent-turn JSON
 * envelope. Both shapes below are confirmed live against this machine's
 * Gateway, running `openclaw agent --agent main --message ... --json`
 * through github-copilot/claude-sonnet-5 — not guessed:
 *
 * Failure: `{ ok: false, runId, origin, error: { type, message } }`
 * Success: `{ runId, status: "ok", summary, result: { payloads: [{ text }],
 *            finalAssistantVisibleText, finalAssistantRawText, meta } }`
 *
 * Note the success envelope has no top-level `ok` field at all — `status`
 * is the discriminator on success, `ok` on failure.
 */
function extractReplyText(payload: Record<string, unknown>): string | null {
  const result = payload.result as Record<string, unknown> | undefined;
  const firstPayloadText = Array.isArray(result?.payloads)
    ? (result?.payloads as Array<Record<string, unknown>>).find((p) => typeof p.text === "string" && p.text.trim())
        ?.text
    : undefined;

  const candidates: unknown[] = [
    result?.finalAssistantVisibleText,
    result?.finalAssistantRawText,
    firstPayloadText,
    // Fallbacks in case a future OpenClaw version shapes this differently.
    payload.reply,
    payload.replyText,
    payload.message,
    payload.text,
    result?.reply,
    result?.replyText,
    result?.text,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}

export async function askOpenClaw(message: string, options: AskOpenClawOptions = {}): Promise<OpenClawOutcome> {
  // OpenClaw's own env-override contract (confirmed by its real error text)
  // is explicit: a Gateway URL override is only honored together with a
  // credential (token or password) — "config credentials are intentionally
  // not reused" once a URL override is present. So an OPENCLAW_GATEWAY_URL
  // without a non-empty OPENCLAW_GATEWAY_TOKEN can never work; fail fast
  // with a clear configuration error instead of spawning the CLI and
  // surfacing OpenClaw's more cryptic rejection.
  if (GATEWAY_URL && !GATEWAY_TOKEN) {
    console.error(
      "[openclaw-client] configuración incompleta: OPENCLAW_GATEWAY_URL está definido pero OPENCLAW_GATEWAY_TOKEN falta o está vacío.",
    );
    return {
      ok: false,
      kind: "misconfigured",
      detail:
        "Falta configurar OPENCLAW_GATEWAY_TOKEN en el servidor (en .env.local). OPENCLAW_GATEWAY_URL está definido, pero sin un token no puede autenticarse contra ese Gateway.",
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSeconds = Math.max(1, Math.round(timeoutMs / 1000));
  const prompt = options.contextHint ? `${options.contextHint}\n\n${message}` : message;

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (GATEWAY_URL) env.OPENCLAW_GATEWAY_URL = GATEWAY_URL;
  if (GATEWAY_TOKEN) env.OPENCLAW_GATEWAY_TOKEN = GATEWAY_TOKEN;

  const agentId = options.agentId || DEFAULT_AGENT_ID;
  const args = ["agent", "--agent", agentId, "--message", prompt, "--json", "--timeout", String(timeoutSeconds)];

  // Give the wrapper a little more room than the CLI's own --timeout so the
  // CLI gets a chance to produce its own structured timeout response first.
  const { stdout, stderr, error } = await runOpenClawCli(args, env, timeoutMs + 5_000);

  let payload: Record<string, unknown> | null = null;
  try {
    payload = stdout.trim() ? (JSON.parse(stdout) as Record<string, unknown>) : null;
  } catch {
    payload = null;
  }

  if (payload && payload.ok === false) {
    const errorPayload = payload.error as Record<string, unknown> | undefined;
    const detail = typeof errorPayload?.message === "string" ? errorPayload.message : "OpenClaw reportó un error sin detalle.";
    console.error("[openclaw-client] OpenClaw respondió ok:false —", detail);
    return { ok: false, kind: "agent_error", detail };
  }

  if (payload && payload.status === "ok") {
    const reply = extractReplyText(payload);
    if (reply) {
      return { ok: true, reply, runId: typeof payload.runId === "string" ? payload.runId : undefined };
    }
    console.error(
      "[openclaw-client] respuesta status:ok sin un campo de texto reconocible. Claves recibidas:",
      Object.keys((payload.result as Record<string, unknown> | undefined) ?? payload),
    );
    return {
      ok: false,
      kind: "empty_reply",
      detail: "OpenClaw respondió, pero SANAI no reconoció el formato de la respuesta.",
    };
  }

  // No parseable JSON came back at all — we could not really talk to
  // OpenClaw (wrong binary, Gateway down, malformed output, etc.).
  if (error?.killed) {
    console.error("[openclaw-client] la llamada a OpenClaw excedió el tiempo de espera.");
    return { ok: false, kind: "timeout", detail: "OpenClaw no respondió a tiempo." };
  }

  console.error(
    "[openclaw-client] no se obtuvo una respuesta válida de OpenClaw.",
    "code:", error?.code ?? "n/a",
    "stderr:", stderr ? stderr.slice(0, 300) : "(vacío)",
  );
  return { ok: false, kind: "unavailable", detail: "No se pudo conectar con el Gateway de OpenClaw." };
}
