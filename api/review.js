// Serverless API: review a link with AI and draft a catalog entry.
//
// POST /api/review  { url, password, categories?: string[] }
//   → { work: { name, type, summary, category, tech[], status } }
//
// For a GitHub repo URL it pulls the repo's description, language, topics and
// README from the GitHub REST API; for any other URL it reads the page title
// and meta description. It then asks Claude (Haiku 4.5) to draft the entry.
//
// Required environment variables (Vercel → Settings → Environment Variables):
//   ANTHROPIC_API_KEY      your Anthropic API key (console.anthropic.com)
//   VAULT_ADMIN_PASSWORD   the same curator password used to add works
// Optional:
//   GITHUB_TOKEN           a GitHub token for higher rate limits / private repos
//   CLAUDE_MODEL           override the model (defaults to claude-haiku-4-5)

import Anthropic from "@anthropic-ai/sdk";

const ADMIN = process.env.VAULT_ADMIN_PASSWORD;
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5";
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const SYSTEM = `You are the curator of a personal portfolio called "The Vault".
You catalog software projects. Given details about a project (a GitHub repository
or a website), write a single clean catalog entry. Be accurate and concise; do
not invent facts that aren't supported by the provided details.

Guidance for each field:
- name: a clean, human-friendly title for the project (Title Case; not the raw slug).
- type: "repo" for a code repository, "site" for a live website/web app.
- summary: one or two plain-English sentences — what it is and why it exists.
- category: the heading to file it under. PREFER reusing one of the existing
  categories when it genuinely fits; otherwise invent a short, sensible category.
- tech: the main languages/frameworks/tools, as short tags. [] if unknown.
- status: "live" (shipped/working), "experiment" (a toy/rough), "archived"
  (old, kept for posterity), or "wip" (in development).`;

// Strict JSON shape the model must return.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name:     { type: "string" },
    type:     { type: "string", enum: ["site", "repo"] },
    summary:  { type: "string" },
    category: { type: "string" },
    tech:     { type: "array", items: { type: "string" } },
    status:   { type: "string", enum: ["live", "experiment", "archived", "wip"] },
  },
  required: ["name", "type", "summary", "category", "tech", "status"],
};

function parseGitHub(url) {
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : "https://" + url);
    if (!/(^|\.)github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/i, "") };
  } catch { return null; }
}

const GH_HEADERS = () => {
  const h = { "Accept": "application/vnd.github+json", "User-Agent": "the-vault" };
  if (process.env.GITHUB_TOKEN) h.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
  return h;
};

async function gatherGitHub({ owner, repo }) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const metaRes = await fetch(base, { headers: GH_HEADERS() });
  if (metaRes.status === 404) throw new Error("That GitHub repository couldn't be found (is it private?).");
  if (metaRes.status === 403) throw new Error("GitHub rate limit hit. Add a GITHUB_TOKEN env var, or try again later.");
  if (!metaRes.ok) throw new Error("Couldn't read that repository from GitHub.");
  const meta = await metaRes.json();

  let readme = "";
  const rmRes = await fetch(base + "/readme", { headers: GH_HEADERS() });
  if (rmRes.ok) {
    const rm = await rmRes.json();
    if (rm.content) readme = Buffer.from(rm.content, "base64").toString("utf8").slice(0, 6000);
  }

  return {
    kind: "repo",
    facts: {
      full_name: meta.full_name,
      description: meta.description || "",
      language: meta.language || "",
      topics: meta.topics || [],
      homepage: meta.homepage || "",
      archived: !!meta.archived,
      readme_excerpt: readme,
    },
  };
}

async function gatherSite(url) {
  const link = /^https?:\/\//i.test(url) ? url : "https://" + url;
  let title = "", description = "";
  try {
    const res = await fetch(link, { headers: { "User-Agent": "the-vault" } });
    const html = (await res.text()).slice(0, 200000);
    title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || "";
    description =
      (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] ||
      (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || "";
  } catch { /* a fetch failure is fine — the model can still draft from the URL */ }
  return { kind: "site", facts: { url: link, title: title.trim(), description: description.trim() } };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!client) return res.status(503).json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!ADMIN || body.password !== ADMIN) {
    return res.status(401).json({ error: "Incorrect curator password." });
  }
  const url = (body.url || "").trim();
  if (!url) return res.status(400).json({ error: "Please provide a link to review." });
  const categories = Array.isArray(body.categories) ? body.categories.slice(0, 40) : [];

  try {
    const gh = parseGitHub(url);
    const gathered = gh ? await gatherGitHub(gh) : await gatherSite(url);

    const userText =
      `Existing categories (reuse one if it fits): ${categories.length ? categories.join(", ") : "(none yet)"}\n\n` +
      `This is a ${gathered.kind === "repo" ? "GitHub repository" : "website"}.\n` +
      `URL: ${url}\n` +
      `Details:\n${JSON.stringify(gathered.facts, null, 2)}\n\n` +
      `Draft the catalog entry as JSON.`;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: userText }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const draft = JSON.parse(textBlock.text);

    // normalise / clamp before returning
    const work = {
      name: String(draft.name || "").slice(0, 120),
      type: draft.type === "repo" ? "repo" : (gh ? "repo" : "site"),
      summary: String(draft.summary || "").slice(0, 600),
      category: String(draft.category || "Uncategorised").slice(0, 80),
      tech: Array.isArray(draft.tech) ? draft.tech.slice(0, 12).map((t) => String(t).slice(0, 40)) : [],
      status: ["live", "experiment", "archived", "wip"].includes(draft.status) ? draft.status : "live",
      url,
    };
    return res.status(200).json({ work });
  } catch (e) {
    return res.status(500).json({ error: e.message || "The AI review failed." });
  }
}
