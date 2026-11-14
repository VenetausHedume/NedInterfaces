# Ned Interfaces — Reference

The tools a student uses to answer on screen. Each one saves the answer as **structured data** (never a picture),
so marking is a comparison against the mark scheme. No AI and no API key is used anywhere.

## The contract

```
Ned.register(id, meta, factory)
factory(container, { question, value, onChange })  →  { update(value), clear(), destroy() }
```

- `question` is `{ text, marks, config }`; `config` is interface-specific.
- `value` is the saved answer or `null`; `onChange(value)` is called on every change.
- **Empty is `null`**, never an empty shape.
- Saved in the database as `{ "ui": "<id>", "value": { … }, "meta": {} }`.

## Marking

```
NedMark.mark(ui, answer, value, question, opts)  →  { score, max, status, detail }
```

`answer` is the mark-scheme side for that question. `status` is `marked`, `unsure` (keyword-marked text below full
marks: unusual wording may have been missed), `self_check` (long writing: the score is a floor), or `unanswered`.
Files: `marking/mark.js` (core markers), `marking/builders.js` (code, sql, flowchart, order and the science builders),
`marking/pseudo.js` (pseudocode and flowchart runner), `marking/sql.js` (small SQL engine), `marking/synonyms.js` (starter list).

`NedMark.explain(ui, answer, value, result, question)` turns a result into lines a student can read
("Gradient: right.", "Test 2 printed 7, expected 9."), shown under the score so a wrong answer still teaches something.

## Phase 1 interfaces (used by the question bank)

| id | Student does | Saves | Mark scheme (`answer`) | Marked by |
|---|---|---|---|---|
| `text` | types a short answer | `{ latex }` | `{ points:[{alts,require?,reject?}], need }` | keyword match per point |
| `formula` | working, answer, unit (unit always shown) | `{ formula, answer, unit }` | `{ final:[{value,unit,units?,abs?} \| {lo,hi} \| {expr}], method:[…] }` | number within 0.5 %, unit check, method marks |
| `mcq` | picks one / several / a picture | `{ choice }` or `{ choices:[…] }` | `{ key }` or `{ keys:[…], scale? }` | exact; several = right ticks − wrong ticks |
| `match` | picks a partner for each item | `{ pairs:{left:right} }` | `{ pairs:{…}, scale? }` | one per correct pair |
| `table` | fills blank cells | `{ cells:{ r1c2:"…" } }` | `{ cells:{ r1c2: spec }, scheme?:'row', scale? }` | each cell as text or number |
| `prose` | one box per point | `{ points:[…], conclusion? }` | `{ points:[…], groups?:[{title,max,points:[i]}] }` | one point per box, each point once, caps per group |
| `label` | types labels on a figure | `{ labels:{id:"…"} }` | `{ labels:{ id: spec } }` | each label as text |
| `place` | picks what goes at each spot | `{ spots:{id:"…"} }` | `{ spots:{ id: spec } }` | exact per spot |
| `logic` | builds a gate circuit | `{ gates, inputs, outputs, wires }` | `{ expr:"(A AND B) OR NOT C", output? }` | truth table; part marks per correct gate |
| `flowfill` | completes blank flowchart boxes | `{ boxes:{id:"…"} }` | `{ boxes:{ id: spec } }` | each box as text (exact if chosen from a list) |
| `order` | puts given lines of an algorithm in order, with indents (Parsons) | `{ order:[…], indent:[…] }` | `{ order:[…], indent? }` | longest run in the right order |
| `code` | writes Cambridge pseudocode; **Run** button runs it on inputs they type | `{ code }` | `{ tests:[{input,expect}], features? }` | runs the program on each test; part marks for loop / selection / totalling … |
| `sql` | writes a query; the table is shown and **Run query** shows the result | `{ code }` | `{ model, tables }` | runs both queries and compares the rows (ORDER BY needed if the model sorts) |
| `flowchart` | builds a flowchart from shapes; **Run flowchart** steps through it | `{ nodes, edges }` | `{ tests, features? }` | runs the flowchart like a program; FDE-style diagrams use `config.run:false` |
| `circuit` | clicks components in, then terminal to terminal to wire | `{ components, wires }` | `{ components, arrangement, meters? }` | parts present, series/parallel, meters placed right |
| `shells` | adds shells and electrons, nucleus and charge | `{ nucleus, charge, shells }` | `{ shells, charge? }` | electrons per shell, charge |
| `structure` | builds a molecule from atoms and bonds | `{ atoms, bonds }` | `{ model }` | same molecule (atom-and-bond fingerprint) |
| `lewis` | places dots and crosses around atoms | `{ atoms }` | `{ … }` | shared pairs, lone electrons, full shells |

`spec` = a string or number, or `{ alts:[…], require?, reject?, exact? }`, or `{ final:[…] }` for a number with a unit.
`scale` = marks for a count, e.g. `{ 5:4, 4:3, 3:2, 2:1 }`.
`require` = words that must be present (an inner list means "any of"); `reject` = words that cancel the point.

Typed boxes are MathLive fields (answers arrive as LaTeX; the markers convert it) with a plain-input fallback.

## Limits you should know

- Keyword marking cannot judge how well a point is argued and can miss a correct point in unusual wording. It never
  gives marks for a point that is not there, so scores are a safe floor.
- A typo is forgiven only in words of five letters or more.
- `logic` on a phone is cramped: the canvas pans, but building is easier on a wider screen.
- `flowfill` scrolls sideways inside its box on a phone.
- `code`/`flowchart` marks depend on good test cases in the mark scheme; a program that prints extra words still passes if the numbers match.

## Set aside for now: graph interfaces

In `parked/`, not loaded by the lab. Open `index.html?parked=1` to use them; `NED_GRAPHS=1 node tests/e2e.test.js` tests them.
Their marking stays in `marking/mark.js`.

| id | Student does | Saves | Mark scheme (`answer`) | Marked by |
|---|---|---|---|---|
| `plot` | plots points, draws straight lines, may choose the scale | `{ axes, points, lines }` | `{ points?, line?, segments?, scale? }` | half a small square; gradient/intercept; segment shape + label |
| `econ` | shifts D or S, marks the new equilibrium; with `config.labelling` also names the axes and curves | `{ shifts:{D:'right'}, equilibrium, labels? }` | `{ shifts:{…}, labels? }` | curve, direction, equilibrium, labels |

## Parked (no fair marking without AI)

`graph` (free-hand curves, also in `parked/`) and `photo` (photo of working). `math` is the on-screen maths keyboard, not a question type.

## Testing

```
npm install            # once, in ../vendor or anywhere: playwright, mathlive, konva (only needed for the tests)
node tests/mark.test.js       # 150 marking checks
node tests/builders.test.js   # 108 checks: pseudocode, SQL, flowchart, ordering, science builders
node tests/e2e.test.js        # 140 browser checks (181 with NED_GRAPHS=1): every interface driven through its real controls
```

The test page (`index.html`) marks every sample live in the right-hand panel and has a "Reload saved answer" button
that rebuilds the interface from its saved value. Open `index.html?ui=table&sample=0` to jump to one sample.
