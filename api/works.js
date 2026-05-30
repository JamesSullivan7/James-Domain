// Serverless API for The Vault — runs on Vercel, talks to Supabase.
//
// GET    /api/works            → list works (public; everyone sees these)
// POST   /api/works            → add a work   (requires curator password)
// DELETE /api/works?id=<id>    → remove a work (requires curator password)
//
// Required environment variables (set these in Vercel → Project → Settings → Environment Variables):
//   SUPABASE_URL                 e.g. https://abcdefgh.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    the service_role key (SECRET — server only, never in the page)
//   VAULT_ADMIN_PASSWORD         a password you choose, asked for when adding/removing works

import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN = process.env.VAULT_ADMIN_PASSWORD;

const supabase = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

const COLS = "id,name,type,url,summary,category,tech,status,reserve,created_at";
const STATUSES = ["live", "experiment", "archived", "wip"];

function clean(work = {}) {
  return {
    name:     String(work.name || "").trim().slice(0, 120),
    type:     work.type === "repo" ? "repo" : "site",
    url:      String(work.url || "").trim().slice(0, 500),
    summary:  String(work.summary || "").trim().slice(0, 600),
    category: (String(work.category || "").trim() || "Uncategorised").slice(0, 80),
    tech:     Array.isArray(work.tech) ? work.tech.slice(0, 12).map((t) => String(t).slice(0, 40)) : [],
    status:   STATUSES.includes(work.status) ? work.status : "live",
    reserve:  !!work.reserve,
  };
}

export default async function handler(req, res) {
  if (!supabase) {
    return res.status(503).json({ error: "Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." });
  }

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("works").select(COLS)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return res.status(200).json({ works: data || [] });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (!ADMIN || body.password !== ADMIN) {
        return res.status(401).json({ error: "Incorrect curator password." });
      }
      const row = clean(body.work);
      if (!row.name || !row.url) {
        return res.status(400).json({ error: "A name and a link are required." });
      }
      const { data, error } = await supabase.from("works").insert(row).select(COLS).single();
      if (error) throw error;
      return res.status(200).json({ work: data });
    }

    if (req.method === "DELETE") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const password = req.headers["x-curator-password"] || body.password;
      if (!ADMIN || password !== ADMIN) {
        return res.status(401).json({ error: "Incorrect curator password." });
      }
      const id = req.query.id || body.id;
      if (!id) return res.status(400).json({ error: "Missing id." });
      const { error } = await supabase.from("works").delete().eq("id", id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error." });
  }
}
