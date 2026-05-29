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
// The combination (theater, not real security)
const VAULT_CODE = "0007";

// Your links
const projects = [
  { name: "Project Name", url: "https://...", desc: "One line.", tag: "live" },
  // tag: "live" | "exp" | "arch" | "locked"
];
```

- `live`  — a shipped, working project (green)
- `exp`   — an experiment / rough edges (amber)
- `arch`  — kept for posterity (gray)
- `locked`— "Classified", shown but not clickable (teaser for a future hidden chamber)

Before going public, remove the `DEMO CODE` hint line in the lock screen markup.

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
