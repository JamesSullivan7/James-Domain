// Serverless API: hand back a short-lived signed link to a stored file.
//
// GET /api/file?path=<object path>
//   → 302 redirect to a fresh signed Supabase Storage URL (expires in 1 hour)
//
// Files live in a PRIVATE bucket, so there's no permanent public URL. Each time
// a Document card is opened, this endpoint generates a new signed link that
// expires shortly after — nothing stays openable forever.
//
// Required environment variables:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
const BUCKET = "vault-uploads";
const EXPIRES = 3600; // seconds

export default async function handler(req, res) {
  if (!supabase) return res.status(503).json({ error: "Storage not configured." });

  const path = (req.query && req.query.path) || "";
  // our upload paths are flat filenames — reject anything with a slash or traversal
  if (!path || path.includes("/") || path.includes("..")) {
    return res.status(400).json({ error: "Invalid file path." });
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, EXPIRES);
  if (error || !data || !data.signedUrl) {
    return res.status(404).json({ error: "File not found." });
  }

  res.writeHead(302, { Location: data.signedUrl });
  res.end();
}
