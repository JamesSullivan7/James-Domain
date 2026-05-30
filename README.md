# THE VAULT — jamesdomain.org

A personal link vault. The landing screen is a safe keypad; punch in the code
and a searchable, categorised catalog of project links is revealed inside.

Works you add through the site are stored in a **Supabase database** via a small
serverless API, so they're **visible to every visitor** — no code edits, no
redeploy. (If the database isn't configured yet, the site quietly falls back to
saving in your own browser so it still works.)

## How it fits together

```
index.html        the whole front-end (keypad, catalog, search, add-a-work form)
api/works.js      Vercel serverless function: GET / POST / DELETE works
package.json      declares @supabase/supabase-js for the function
supabase/schema.sql   the table to create in Supabase (run once)
```

- **Reads** (`GET /api/works`) are public — that's how everyone sees the links.
- **Writes** (`POST` to add, `DELETE` to remove) require the **curator password**.
- The Supabase **service-role key** lives only in Vercel env vars (server-side),
  never in the page.

## One-time setup (connect Supabase)

**1. Create the table.** In your Supabase project → **SQL Editor** → New query →
paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.

**2. Grab your keys.** Supabase → **Project Settings → API**:
   - `Project URL`  → used as `SUPABASE_URL`
   - `service_role` secret key → used as `SUPABASE_SERVICE_ROLE_KEY`
     (this is secret — never commit it or put it in the page)

**3. Add env vars in Vercel.** Vercel → your project → **Settings → Environment
   Variables** → add three (Production + Preview):

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | your Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service_role key |
   | `VAULT_ADMIN_PASSWORD` | any password you choose, for adding/removing works |

**4. Redeploy.** Vercel → Deployments → redeploy the latest (so the new env vars
   and the `api/` function take effect).

That's it. Open the site, enter the vault code, and you'll see
**"Connected — added works are live for everyone."**

## Adding works

Inside the vault, click **＋ Add a Work**, fill in:

- **Name** and **Link** (a bare domain like `oniven.com` is fine — it's
  auto-prefixed with `https://`)
- **Type** — *Live Site* or *Repository* (changes the badge & call-to-action)
- **Status** — Live / Experiment / Archived / In Development
- **Category** — free text; reuse a name to group works under one heading
- **Summary** and **Tech tags** (optional; tech tags are searchable)
- **Curator password** — asked once per visit; publishes the work for everyone

Hover a card and click the **✕** to remove it (also password-protected).

The catalog auto-builds category sections, the search box, and the filter chips
from whatever is in the database.

## The access codes

Near the top of the `<script>` in `index.html`:

```js
const VAULT_CODE = "6426";   // opens the collection
const INNER_CODE = "4815";   // opens the Private Reserve door
```

> ⚠️ **These codes are theater, not security** — they live in the page source.
> They keep casual visitors out, nothing more. Real protection is the curator
> password (a server-side env var) which gates all writes, and Supabase RLS
> which blocks any direct database access.

## Preview locally

Open `index.html` directly and it runs in **offline mode** (adds save to your
browser only). To exercise the real database path locally you'd run it behind
the Vercel CLI (`vercel dev`) with the env vars set.

## Deploying to Vercel

Zero-config aside from the env vars above:

1. Push to GitHub.
2. Vercel **Add New → Project**, import the repo. Framework preset: **Other**.
3. Add the three env vars, deploy.
4. Add the domain `jamesdomain.org` under **Domains** and follow the DNS steps.

## Ideas parked for later

- Make the Private Reserve database-backed too (the `reserve` column already exists)
- Live status dots (is each linked site up?)
- "Last updated" stamps per item
- Drag-to-reorder within a category
