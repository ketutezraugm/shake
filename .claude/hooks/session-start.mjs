// SessionStart: tells Claude who is at the keyboard, what's waiting for them, and whether setup is incomplete.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const sh = (c) => {
  try {
    return execSync(c, { cwd: root, stdio: ["ignore", "pipe", "ignore"], timeout: 8000 }).toString().trim();
  } catch {
    return "";
  }
};

let roles = {};
try {
  roles = Object.fromEntries(
    readFileSync(join(root, ".github/ROLES"), "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => l.split(":").map((s) => s.trim())),
  );
} catch {}

const labelOf = { "contracts-tee": "to:ct", "backend-integration": "to:bi", frontend: "to:fe", "design-packaging": "to:dp", owner: "to:lead" };
const login = sh("gh api user --jq .login");
const mine = Object.keys(roles).filter((r) => roles[r] && roles[r] === login);
const out = [];

if (!login) out.push("GitHub CLI is not logged in. Ask the user to run `gh auth login`, then /onboard.");
else if (!mine.length) out.push(`GitHub login ${login} is not in .github/ROLES. Ask Ezra (owner) to add it before building.`);
else {
  out.push(`User: ${login}, role(s): ${mine.join(", ")}.`);
  const counts = mine
    .map((r) => [labelOf[r], sh(`gh issue list --state open --label ${labelOf[r]} --json number --jq length`)])
    .filter(([, n]) => n && n !== "0")
    .map(([l, n]) => `${n} open ${l} message(s)`);
  if (mine.includes("backend-integration") || mine.includes("owner")) {
    const n = sh("gh pr list --label needs-review --json number --jq length");
    if (n && n !== "0") counts.push(`${n} PR(s) waiting for /review-pr`);
  }
  out.push(counts.length ? `Waiting: ${counts.join("; ")}.` : "Nothing waiting in GitHub.");
}
if (sh("git config core.hooksPath") !== ".githooks") out.push("Push guard is off on this clone: run /onboard.");
out.push("Routine: /inbox to start (first time on this machine: /onboard), /ship to finish a task, /handoff before ending the session.");

process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: out.join("\n") } }));
