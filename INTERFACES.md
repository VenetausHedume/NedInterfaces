# Ned Interfaces — Reference

The tools a student uses to *write* the exam on screen. Each one captures the
answer as **structured data** — not a picture — so that marking later is a
comparison against the mark scheme, not an interpretation.

This repo (**NedInterfaces**) is the lab: build an interface, test it on the
preview page, and only once it works copy it into the main **Ned** project.

---

## The one rule

Every interface saves the *smallest structured thing* that captures the
answer. A typed formula is stored as text, not an image of the formula. A
plotted graph is stored as its points, not a screenshot. If an interface can't
capture something structurally, it falls back to a photo — never a dead end.

## The contract

Every interface is a factory with the same signature:

```
createX(container, { question, value, onChange })  →  { update, clear, destroy }
```

- **container** — the DOM node to render into.
- **question** — `{ text, marks, config }`. `config` is interface-specific.
- **value** — the previously saved value, or `null` (used to restore).
- **onChange(value)** — call whenever the answer changes. Emit **only the
  value**; the wrapper adds `ui` and `meta`.

Returned object:
- **update(value)** — reload a saved value.
- **clear()** — reset to empty.
- **destroy()** — tear down.

Two rules that hold for all of them:
- **Empty is `null`**, never an empty shape like `{ text: "" }`. "Skipped" and
  "answered blank" must be distinguishable.
- **The component never sees timing, scores, or the envelope.** It only knows
  its question and its value.

Saved to the database, a value looks like:

```json
{ "ui": "text", "value": { "text": "36 g" }, "meta": {} }
```

---

## The set

| id | Interface | What the student does | Status |
|----|-----------|-----------------------|--------|
| `text`    | Text box            | Types a value, term, or a few lines | stub |
| `prose`   | Structured prose    | Writes point-by-point, optional conclusion | stub |
| `table`   | Table entry         | Fills the editable cells of a table | stub |
| `formula` | Formula / answer / unit | Enters working, final answer, unit | stub |
| `graph`   | Graph (draw)        | Plots points / shades regions on a grid | stub |
| `circuit` | Circuit (build)     | Places components on a grid and wires them | stub |
| `econ`    | Economics diagram   | Picks a figure, shifts curves, shades an area | stub |
| `photo`   | Photo upload        | Photographs a drawing, tags the question | stub |

We build these roughly in that order — the top ones unlock the most marks for
the least work.

---

## Each interface

Config keys and saved shapes below are the **starting point** — we'll firm
each one up as we build it. Nothing here is locked.

### `text` — Text box
The workhorse: single values, chemical names, short explanations.
- **config** — `{ multiline, size }`  ·  size = `"short" | "medium" | "long"`
- **saves** — `{ text }`  ·  or `null`
- **note** — a symbol bar for `₂ ³ ⁺ → ⇌ °` etc. Store exactly what's typed;
  let the marker normalise `H2SO4` → `H₂SO₄`.

### `prose` — Structured prose
For multi-mark written answers (chains of reasoning, 6+ mark questions).
- **config** — `{ conclusion }` — show a conclusion box (for longer answers)
- **saves** — `{ points: ["…", "…"], conclusion }`  ·  or `null`
- **note** — start with one empty point visible; "add point" for more.

### `table` — Table entry
Completing a given table (results tables, trace tables).
- **config** — `{ table }` — a 2D array; a `null` cell is editable, a string is
  a fixed label.
- **saves** — `{ cells: { "r0c2": "36" } }` keyed by position  ·  or `null`
- **note** — cap trace tables around 20 rows.

### `formula` — Formula / answer / unit
Calculations where working and units matter.
- **config** — `{ requireUnit }`
- **saves** — `{ formula, answer, unit }` (only the filled keys)  ·  or `null`
- **note** — the unit field is **always visible**; showing it only when
  required would leak the mark scheme.

### `graph` — Graph (draw)
A coordinate grid. For now: **plot points and shade cells** (curves and
transforms come later).
- **config** — `{ xRange, yRange, mode }`  ·  mode = `"plot" | "shade" | "both"`
- **saves** — `{ points: [[x,y]], cells: [[cx,cy]] }` (used keys only)  ·  or `null`

### `circuit` — Circuit (build)
- **config** — `{ cols, rows }`
- **saves** — `{ components: [{ id, type, pos }], wires: [...] }`  ·  or `null`
- **note** — stores the *connection graph*; marked on topology, not neatness.

### `econ` — Economics diagram
A picker, not a freehand tool: choose a base figure, then adjust it.
- **config** — `{ diagram }` — which parametric figure (supply/demand, etc.)
- **saves** — `{ diagram, shifts, shaded }`  ·  or `null`

### `photo` — Photo upload
The catch-all so nothing is ever unanswerable.
- **config** — `{}`
- **saves** — `{ image, tagged: true }`  ·  or `null`
- **note** — the **student tags which question** it answers; marks show as
  **provisional** (a vision model reads structure but miscounts).

---

## Later (not in the first pass)

Deliberately deferred so the first pass stays light: symbol/atom canvas,
flowchart builder, code editor (with a sandboxed Run button), transformation
form, key-features form, and graph curve-drawing/transforms. Added once the
core set is sittable.

---

## Build & test workflow

1. Open `interfaces/<id>.js` — the stub is already registered.
2. Paste the built version in (we go through them one at a time).
3. Test on the preview page (`index.html`): pick the interface, try empty /
   partial / full, watch the **Saved value** panel.
4. When it behaves, copy the file into the **Ned** project and add its
   `<script>` line there.
