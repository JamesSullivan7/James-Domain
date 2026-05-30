// Serverless API: review a link OR a file with AI and draft a catalog entry.
//
// POST /api/review
//   { url, password, categories?: [] }                       → review a link
//   { file: {name, type, data(base64)}, password, categories } → review a file
//   → { work: { name, type, summary, category, tech[], status, url } }
//
// Links: pulls GitHub repo metadata + README, or a page's title/description.
// Files: PDFs and images are read directly by Claude; text/markdown is read as
// text. The file is stored in Supabase Storage and the card links to it.
//
// Required environment variables (Vercel → Settings → Environment Variables):
//   ANTHROPIC_API_KEY      your Anthropic API key (console.anthropic.com)
//   VAULT_ADMIN_PASSWORD   the same curator password used to add works
//   SUPABASE_URL           (for storing uploaded files)
//   SUPABASE_SERVICE_ROLE_KEY
// Optional:
//   GITHUB_TOKEN           higher GitHub rate limits / private repos
//   CLAUDE_MODEL           override the model (defaults to claude-haiku-4-5)

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const ADMIN = process.env.VAULT_ADMIN_PASSWORD;
const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-4-5";
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
const BUCKET = "vault-uploads";

const SYSTEM = `You are the curator of a personal portfolio called "The Vault".
You catalog software projects and documents. Given details about a project — a
GitHub repository, a website, or an uploaded file (PDF, image, or text) — write a
single clean catalog entry. Be accurate and concise; do not invent facts that
aren't supported by the provided material.

Guidance for each field:
- name: a clean, human-friendly title (Title Case; not a raw slug or filename).
- type: "repo" for a code repository, "site" for a live website/web app,
  "doc" for an uploaded document/file (PDF, image, paper, deck, etc.).
- summary: one or two plain-English sentences — what it is and why it matters.
- category: the heading to file it under. PREFER reusing one of the existing
  categories when it genuinely fits; otherwise invent a short, sensible category.
- tech: the main languages/frameworks/tools/topics, as short tags. [] if unknown.
- status: "live" (shipped/working/published), "experiment" (a toy/rough),
  "archived" (old, kept for posterity), or "wip" (in development/draft).`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name:     { type: "string" },
    type:     { type: "string", enum: ["site", "repo", "doc"] },
    summary:  { type: "string" },
    category: { type: "string" },
    tech:     { type: "array", items: { type: "string" } },
    status:   { type: "string", enum: ["live", "experiment", "archived", "wip"] },
  },
  required: ["name", "type", "summary", "category", "tech", "status"],
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024;

/* ---------- link sources ---------- */
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
  return { kind: "repo", facts: {
    full_name: meta.full_name, description: meta.description || "", language: meta.language || "",
    topics: meta.topics || [], homepage: meta.homepage || "", archived: !!meta.archived, readme_excerpt: readme,
  }};
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
  } catch { /* ok — model can still draft from the URL */ }
  return { kind: "site", facts: { url: link, title: title.trim(), description: description.trim() } };
}

/* ---------- file source ---------- */
function safeName(name) {
  return (name || "file").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
}
async function storeFile(buffer, name, contentType) {
  if (!supabase) return "";
  // make sure the public bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets || !buckets.find(b => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName(name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false });
  if (error) throw new Error("Couldn't store the file: " + error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed." }); }
  if (!client) return res.status(503).json({ error: "AI is not configured. Set ANTHROPIC_API_KEY." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!ADMIN || body.password !== ADMIN) return res.status(401).json({ error: "Incorrect curator password." });

  const categories = Array.isArray(body.categories) ? body.categories.slice(0, 40) : [];
  const catLine = `Existing categories (reuse one if it fits): ${categories.length ? categories.join(", ") : "(none yet)"}`;

  try {
    let content;          // the user-turn content for Claude
    let resultUrl = "";   // what the card will link to
    let defaultType = "site";

    if (body.file && body.file.data) {
      // ---- FILE PATH ----
      const f = body.file;
      const mime = (f.type || "").toLowerCase();
      const buffer = Buffer.from(f.data, "base64");
      if (buffer.length > MAX_BYTES) return res.status(413).json({ error: "File too large (max ~3–4 MB). Add larger files by link instead." });

      defaultType = "doc";
      resultUrl = await storeFile(buffer, f.name, mime || "application/octet-stream");

      const parts = [];
      if (mime === "application/pdf" || /\.pdf$/i.test(f.name)) {
        parts.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } });
      } else if (IMAGE_TYPES.includes(mime)) {
        parts.push({ type: "image", source: { type: "base64", media_type: mime, data: f.data } });
      } else {
        // treat as text
        const text = buffer.toString("utf8").slice(0, 12000);
        parts.push({ type: "text", text: "File contents:\n\n" + text });
      }
      parts.push({ type: "text", text:
        `${catLine}\n\nThis is an uploaded file named "${f.name || "file"}". ` +
        `Read it and draft the catalog entry as JSON. Set type to "doc".` });
      content = parts;
    } else {
      // ---- LINK PATH ----
      const url = (body.url || "").trim();
      if (!url) return res.status(400).json({ error: "Provide a link or a file to review." });
      const gh = parseGitHub(url);
      const gathered = gh ? await gatherGitHub(gh) : await gatherSite(url);
      resultUrl = /^https?:\/\//i.test(url) ? url : "https://" + url;
      defaultType = gh ? "repo" : "site";
      content = [{ type: "text", text:
        `${catLine}\n\nThis is a ${gathered.kind === "repo" ? "GitHub repository" : "website"}.\n` +
        `URL: ${url}\nDetails:\n${JSON.stringify(gathered.facts, null, 2)}\n\nDraft the catalog entry as JSON.` }];
    }

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const draft = JSON.parse(textBlock.text);

    const work = {
      name: String(draft.name || "").slice(0, 120),
      type: ["site", "repo", "doc"].includes(draft.type) ? draft.type : defaultType,
      summary: String(draft.summary || "").slice(0, 600),
      category: String(draft.category || "Uncategorised").slice(0, 80),
      tech: Array.isArray(draft.tech) ? draft.tech.slice(0, 12).map((t) => String(t).slice(0, 40)) : [],
      status: ["live", "experiment", "archived", "wip"].includes(draft.status) ? draft.status : "live",
      url: resultUrl,
    };
    return res.status(200).json({ work });
  } catch (e) {
    return res.status(500).json({ error: e.message || "The AI review failed." });
  }
}
