# THE VAULT — Project Design Brief

> A reference describing the whole project, its screens, components, data, and
> current styling — so design ideas can be discussed with full context.

---

## 1. The concept in one line

**A personal "vault" website at `jamesdomain.org` that acts as a portal to all
of the owner's other web projects.** You arrive at a locked safe, enter a code
on a keypad, and the vault opens to reveal a curated collection of links — each
project framed as a valuable item inside the vault. There is also a *hidden
inner vault* (a second code) holding unfinished, in-development projects.

The guiding metaphor: **a vault, and the links inside are the treasure.** Every
design decision should make the contents feel valuable, curated, and a little
exclusive.

---

## 2. Purpose & audience

- Primarily a **private share** — the owner sends the link (and code) to specific
  people. May grow into something more public later.
- It is a **directory / link hub**, not a host. It *links out* to projects that
  live elsewhere (mostly on Vercel). It does not contain or proxy them.
- Tone wanted: **premium, heavy, intentional** — the opposite of a flimsy
  startup landing page. Think bank vault, museum vault, treasure room.

---

## 3. Tech (so design suggestions stay realistic)

- **One single static file**: `index.html` (HTML + CSS + JS all inline). No
  framework, no build step, no dependencies.
- Deploys to **Vercel** as a static site (zero config).
- All styling is plain CSS driven by **CSS variables** at the top (`:root`), so
  the whole theme can be reskinned by changing a handful of values.
- Sound is generated in-browser via the WebAudio API (no audio files).
- This means: anything is possible design-wise, but it's currently hand-written
  CSS, not a component library. Rich 3D, video, or heavy animation would be new
  additions, not free.

---

## 4. The four screens / states

The whole experience is a sequence of states inside one page:

### State 1 — Locked Entry (the landing screen)
What every visitor sees first.
- Centered vertically.
- Small kicker text: `jamesdomain.org`
- Big title: **THE VAULT** ("VAULT" has a brass metallic gradient).
- Below it, **the safe**: a metal-looking rounded panel containing:
  - a row of 6 round "bolt" dots across the top,
  - a digital **readout** screen (amber, shows entered digits as dots),
  - a status line ("ENTER ACCESS CODE"),
  - a **3×4 numeric keypad** (1–9, CLR, 0, ✓),
  - a demo-code hint (removed before going public).
- Entering the correct code → green "ACCESS GRANTED", a heavy clunk sound, and
  the whole lock screen fades/scales/blurs away.

### State 2 — Vault Interior (the collection)
Revealed after the first code.
- Centered header block:
  - kicker `ACCESS GRANTED`,
  - big title **THE VAULT**,
  - subtitle: "A curated collection. The links inside are the value.",
  - a short brass divider line.
- A **responsive grid of project cards** (auto-fills, ~300px min per card).
- Each card ("item") shows:
  - item number (`VAULT NO. 001`),
  - a status tag (Live / Experiment / Archived),
  - project name (heading),
  - one-line description,
  - an "Open →" affordance.
  - Hover: card lifts, brass border glow, a light "glint" sweeps across it.
  - The whole card is a link that opens the project in a new tab.
- After the normal cards, a special **Restricted door** card (striped, dashed
  crimson border, 🔒 icon) — the entrance to the hidden vault.
- Footer line: item count • "vault established 2026" • jamesdomain.org.

### State 3 — Inner Vault Keypad (overlay)
Appears when the Restricted door is clicked.
- A dark, blurred full-screen overlay drops over the vault.
- Centered: a crimson-accented version of the same safe/keypad, labeled
  "⚠ Inner Vault · Restricted".
- An ✕ in the top-right (or clicking the dim background) closes it.
- Correct inner code → reveals State 4.

### State 4 — The Inner Vault / Hidden Chamber
Revealed after the second code.
- A crimson divider labeled "The Inner Vault · In Development" separates it
  from the public collection (it appears below the main grid).
- Another grid of cards, same shape as the public ones but crimson-accented and
  numbered `CLASSIFIED NO. 001`, tagged "In Development". These are the owner's
  unfinished projects.

---

## 5. Component inventory

These are the reusable pieces, if you want to redesign any individually:

1. **Brand/title block** — kicker + big "THE VAULT" wordmark.
2. **The Safe** — the metal housing (used for both keypads).
3. **The Keypad** — readout screen + status line + 3×4 buttons.
4. **Project Card ("item")** — number, tag, name, description, open affordance.
5. **Status Tag** — small pill (Live / Experiment / Archived / In Development).
6. **The Door** — striped card that opens the inner vault.
7. **Inner Overlay** — dim/blur backdrop + crimson safe.
8. **Section headers / dividers** — vault header, crimson chamber divider.
9. **Footer** — small metadata line.

---

## 6. Current visual style (what to change)

- **Palette:** near-black background (`#0a0a0b`), steel grays for the safe,
  **brass/gold** (`#d4af37`) as the primary accent, **amber** for the readout,
  **crimson** (`#c8503c`) for the restricted/inner-vault parts. Green/red/gray
  for status.
- **Type:** system sans (Helvetica/Arial) for everything, plus a monospace font
  for "machine" elements (readout, numbers, tags, footer). No custom/brand fonts
  yet — a likely upgrade.
- **Texture/depth:** a very faint grid pattern over the background; soft shadows;
  subtle inner highlights on the safe. Fairly restrained right now.
- **Motion:** cards rise/fade in on reveal; hover lift + glint sweep; keypad
  shake on wrong code; lock screen blur-out on success.
- **Sound:** keypad beeps, a clunk on unlock, a buzz on wrong code.

**Honest assessment of why it feels "basic":** flat dark background, generic
system fonts, simple rectangular cards, and restrained texture. It reads as
"clean dark theme" more than "a vault you opened." The metaphor is in the
*structure* (keypad, codes, chambers) more than the *visuals* yet.

---

## 7. Directions the design could go (conversation starters)

These are open ideas, not decisions — good things to react to:

- **More physical / 3D vault.** An actual round vault door that swings or
  rotates open; the keypad on a real-looking safe face; metal materials,
  rivets, brushed-steel reflections, depth.
- **Richer materials & lighting.** Real textures (brushed metal, leather,
  velvet-lined boxes), dramatic spotlighting on items like a museum case,
  ambient glow.
- **Cards as artifacts.** Instead of flat rectangles, present each link like an
  item under glass / on a pedestal / in a numbered safety-deposit box.
- **Typography with character.** A strong display typeface for "THE VAULT", a
  distinctive number/mono font for the machine bits.
- **Atmosphere.** Background ambiance (vault hum), particles/dust motes, a
  vignette, subtle camera moves between states.
- **A real "entering" moment.** Right now the lock screen just fades; it could
  feel like the camera moves *into* the vault.
- **Theming the chambers.** The inner vault could feel genuinely different —
  darker, colder, "restricted area" signage.

### Constraints to keep in mind when brainstorming
- It should stay **fast and lightweight** (it's a link hub; people come to
  leave). Heavy 3D/video is possible but has a cost.
- It must stay **easy for the owner to edit** — adding a project should remain
  "add one line to a list."
- The keypad codes are **theater, not security** — fun gate only.
- Must work on **mobile** (a lot of sharing happens via phone links).

---

## 8. Data model (how content is defined today)

In the script, near the top:

```js
const VAULT_CODE = "0007";   // opens the main vault
const INNER_CODE = "1342";   // opens the inner vault

// public projects — tag: "live" | "exp" | "arch"
const projects = [
  { name, url, desc, tag },
  ...
];

// unfinished projects, behind the second code
const hiddenProjects = [
  { name, url, desc },
  ...
];
```

Adding/removing a project = editing these lists. The page builds all the cards
from them automatically.
