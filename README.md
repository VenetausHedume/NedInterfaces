# Ned Interfaces

The **lab** for Ned's exam-writing interfaces. Build each interface here, test
it on the preview page, then copy the finished file into the main **Ned**
project. Plain static site — no build step, no framework. Deploys to Vercel
as-is.

See **INTERFACES.md** for what each interface is, its config, and the value it
saves.

## Layout

```
index.html          preview page (this is what deploys)
app.js              testbench: lists interfaces, mounts one, shows saved JSON
styles.css
INTERFACES.md       the reference doc
interfaces/
  _contract.js      the factory contract + registry  (load first — do not edit)
  text.js           ┐
  prose.js          │
  table.js          │  one file per interface — all stubs for now.
  formula.js        │  paste the built code into each as we go.
  graph.js          │
  circuit.js        │
  econ.js           │
  photo.js          ┘
```

Every interface file is already **registered as a stub**, so the preview page
lists all of them from day one — each just says "not built yet" until you paste
its code in.

## How we work through them

1. We build one interface at a time (in the order in INTERFACES.md).
2. You paste the code into that interface's file, replacing the factory body.
3. Save → it appears live on the preview page. Test empty / partial / full and
   watch the **Saved value** panel — that JSON is exactly what gets stored.
4. When it behaves, copy the file into **Ned** and add its `<script>` line
   there.

## Run locally

- **VS Code + Live Server** → right-click `index.html` → *Open with Live
  Server*. Reloads on save.
- or `npx serve .`
- or just open `index.html` (no auto-reload).

## Deploy to Vercel

1. Push to a new GitHub repo named `NedInterfaces`.
2. vercel.com → **Add New → Project** → import it.
3. Framework: **Other**. Build command / output dir: *empty*. Root: `./`.
4. Deploy. Every `git push` redeploys in ~20s.
