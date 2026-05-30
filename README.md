# THE VAULT — jamesdomain.org

A personal link vault. The landing screen is a safe keypad; punch in the code
and the collection of project links is revealed inside.

This is an early **prototype** filled with placeholder links so the experience
can be felt before the real links are added.

## Preview locally

It's a single static file — just open `index.html` in a browser. No build step,
no dependencies.

## Editing your collection

Everything you change day-to-day lives at the top of the `<script>` in
`index.html`:

```js
const VAULT_CODE = "0007";   // opens the main vault
const INNER_CODE = "1342";   // opens the inner (work-in-progress) vault

// Public collection. tag: "live" | "exp" | "arch"
const projects = [
  { name: "Project Name", url: "https://...", desc: "One line.", tag: "live" },
];

// Inner vault — unfinished work behind the second code
const hiddenProjects = [
  { name: "Half-built thing", url: "https://...", desc: "One line." },
];
```

- `live` — a shipped, working project (green)
- `exp`  — an experiment / rough edges (amber)
- `arch` — kept for posterity (gray)
- inner-vault items are tagged "In Development" (crimson) automatically

The on-screen demo-code hints have been removed. To show a hint again during
testing, add a `<div class="hint">…</div>` inside a console.

## The hidden chamber (inner vault)

Inside the main vault there's a **Restricted** door. Clicking it opens a second
keypad; entering `INNER_CODE` reveals the `hiddenProjects` — meant for projects
you haven't finished yet.

> ⚠️ **Important — this is theater, not real security.** Both codes and all
> links live in the page source, so anyone who opens "view source" can read
> them. It keeps casual visitors out, nothing more. If any hidden project is
> genuinely sensitive, protect the deployment server-side instead — e.g.
> Vercel's built-in password protection, or move the hidden list behind a
> serverless function gated by an env-var password.

## Deploying to Vercel

It's a static site, so it's zero-config:

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Framework preset: **Other** (no build command needed).
4. After it deploys, add the domain `jamesdomain.org` under the project's
   **Domains** settings and follow the DNS instructions.

## Ideas parked for later

- Real password-protected "hidden chamber" for private/unfinished projects
- Chambers / categories once the collection grows
- Live status dots (is each linked site up?)
- "Last updated" stamps per item
- Auto-pulling the list from the Vercel API instead of editing by hand
