// PreToolUse guard for Bash: enforces docs/CONTRIBUTING.md for every Claude session.
// The owner can bypass any rule by setting BD_OVERRIDE=1; merges are limited to owner + backend-integration.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const cmd = String(input.tool_input?.command ?? "");
if (!/\b(git|gh)\s/.test(cmd)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const roles = Object.fromEntries(
  readFileSync(join(root, ".github/ROLES"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split(":").map((s) => s.trim())),
);

let login;
const whoami = () => {
  if (login === undefined) {
    try {
      login = execSync("gh api user --jq .login", { stdio: ["ignore", "pipe", "ignore"], timeout: 8000 }).toString().trim();
    } catch {
      login = "";
    }
  }
  return login;
};

const deny = (reason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: `${reason} (docs/CONTRIBUTING.md)` },
  }));
  process.exit(0);
};

// Only real command lines count: a heredoc or quoted doc text mentioning these flags is not a push.
const lines = cmd.split(/\r?\n/).map((l) => l.replace(/'[^']*'|"[^"]*"/g, "''")).filter((l) => /^\s*(\S+=\S+\s+)*(git|gh)\s/.test(l) || /(&&|\|\||;)\s*(git|gh)\s/.test(l));
const args = (re) => lines.map((l) => l.match(re)?.[1]).filter((a) => a !== undefined);
const pushArgs = args(/\bgit\s+push\b([^|;&]*)/);
const rules = [
  [pushArgs.some((a) => /\s(--force(-with-lease)?|-f)(\s|$)|\s\+\S/.test(a)), "Force pushes are not allowed. Merge dev into your branch instead of rebasing."],
  [pushArgs.some((a) => /\s([^\s:]+:)?(refs\/heads\/)?(main|dev)(\s|$)/.test(a)), "Direct pushes to main or dev are not allowed. Push a task branch and run /ship to open a PR."],
  [args(/\bgit\s+(?:push|commit|merge)\b([^|;&]*)/).some((a) => /--no-verify\b/.test(a)), "--no-verify skips the push guard and is not allowed."],
  [args(/\bgit\s+config\b([^|;&]*)/).some((a) => /core\.hooksPath/.test(a) && !/core\.hooksPath\s+\.githooks\s*$/.test(a)), "core.hooksPath may only be set to .githooks (the push guard)."],
];

const owner = roles.owner;
const overriding = process.env.BD_OVERRIDE === "1";
for (const [hit, reason] of rules) {
  if (hit && !(overriding && whoami() === owner)) deny(reason);
}

if (lines.some((l) => /\bgh\s+pr\s+(merge\b|review\b[^|;&]*--approve)/.test(l))) {
  const allowed = [owner, roles["backend-integration"]].filter(Boolean);
  if (!allowed.includes(whoami())) {
    deny(`Only the Backend & Integration session (${roles["backend-integration"] || "unassigned"}) or the owner (${owner}) reviews and merges. Run /ship and add the needs-review label instead.`);
  }
}
process.exit(0);
