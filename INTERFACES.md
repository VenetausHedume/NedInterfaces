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
| `text` | types a short answer | `{ latex }` | `{ points:[{alts,require?,reject?}], need }`, or `{ equation }`, or `{ logic }` | keyword match per point; equations by species and balance; logic expressions by truth table |
| `formula` | working, answer, unit (unit always shown) | `{ formula, answer, unit }` | `{ final:[{value,unit,units?,abs?,exact?,strict?} \| {lo,hi} \| {expr,form?} \| {text}], method:[…] }` | number within 0.5 %, unit check, method marks; algebra by value and form |
| `mcq` | picks one / several / a picture | `{ choice }` or `{ choices:[…] }` | `{ key }` or `{ keys:[…], scale? }` | exact; several = right ticks − wrong ticks |
| `match` | picks a partner for each item | `{ pairs:{left:right} }` | `{ pairs:{…}, scale? }` | one per correct pair |
| `table` | fills blank cells | `{ cells:{ r1c2:"…" } }` | `{ cells:{ r1c2: spec }, scheme?:'row', scale? }` | each cell as text or number |
| `prose` | one box per point | `{ points:[…], conclusion? }` | `{ points:[…], groups?:[{title,max,points:[i]}] }` | one point per box, each point once, caps per group |
| `label` | types labels on a figure | `{ labels:{id:"…"} }` | `{ labels:{ id: spec } }` | each label as text |
| `place` | picks what goes at each spot | `{ spots:{id:"…"} }` | `{ spots:{ id: spec } }` | exact per spot |
| `logic` | builds a gate circuit | `{ gates, inputs, outputs, wires }` | `{ expr:"(A AND B) OR NOT C", output? }` | truth table; part marks per correct gate |
| `flowfill` | completes blank flowchart boxes | `{ boxes:{id:"…"} }` | `{ boxes:{ id: spec } }` | each box as text (exact if chosen from a list) |
| `order` | puts given lines of an algorithm in order, with indents (Parsons) | `{ order:[…], indent:[…] }` | `{ order:[…], indent? }` | longest run in the right order |
| `code` | writes Cambridge pseudocode **or Python**; **Run** runs it on inputs they type (and on `config.files`) | `{ code, lang? }` | `{ tests:[{input,expect,files?,expectFiles?}], features? }` | runs the program on each test; part marks for loop / selection / totalling … |
| `sql` | writes a query; the table is shown and **Run query** shows the result | `{ code }` | `{ query }` (tables in `config.tables`) | runs both queries and compares the rows (ORDER BY needed if the model sorts) |
| `flowchart` | builds a flowchart from shapes; **Run flowchart** steps through it | `{ nodes, edges }` | `{ tests, features? }` | runs the flowchart like a program; FDE-style diagrams use `config.run:false` |
| `circuit` | clicks components in (all syllabus symbols, incl. thermistor, LDR, diode, LED, fuse, heater, motor), then terminal to terminal to wire | `{ components, wires }` | `{ components, arrangement, meters? }` | parts present, series/parallel, meters placed right |
| `shells` | adds shells and electrons, nucleus and charge | `{ nucleus, charge, shells }` | `{ shells, charge? }` | electrons per shell, charge |
| `structure` | builds a molecule from atoms and bonds | `{ atoms, bonds }` | `{ model }` | same molecule (atom-and-bond fingerprint) |
| `lewis` | places dots and crosses around atoms; picks a charge to make an ion | `{ atoms }` | `{ bonds, lone }` or `{ ionic:true, ions, electrons }` | covalent: shared pairs, lone electrons; ionic: electrons, charges, gained electron shown |
| `nuclide` | fills mass number, proton number and symbol boxes for a decay equation | `{ left:[{A,Z,s}], right }` | full equation, same shape | each box filled; α = He, β = e; sums explained |

`spec` = a string or number, or `{ alts:[…], require?, reject?, exact? }`, or `{ final:[…] }` for a number with a unit.
`scale` = marks for a count, e.g. `{ 5:4, 4:3, 3:2, 2:1 }`.
`require` = words that must be present (an inner list means "any of"); `reject` = words that cancel the point.

**Capitals.** Chemical formulae and genotypes (`H2SO4`, `Co`, `NaCl`, `Tt`, `tt`) are compared with capitals, so `tt` never
scores for `Tt` and `CO` never scores for `Co`. Genotypes may be either way round (`tT` = `Tt`). Force it with `case:true|false`.

**Algebra.** `{ expr }` answers count when they have the same value as the model for any letters, **and** the same form:
a factorised model needs a full factorisation (`2(x+3)`, not `(2x+6)` or `x(2x+6)`); a model without brackets needs an
answer without brackets and no more terms (so copying the question, `3(x+2)` for "expand", scores nothing). `form` overrides.

**Numbers and units.** A right number with no unit, or the wrong unit, loses one mark (list `''` in `units` to make the
unit optional). Other SI prefixes convert (25 kN = 25 000 N) unless `strict:true` ("give your answer in km").
`exact:true` for fraction answers (0.18 does not score for 8/45). `{ text:['C3H4O4','C3O4H4'] }` for a formula answer.
Method marks need the operation, not just the numbers: `924/0.88` is not shown by `924 × 0.88`.

**Wording.** Typed answers forgive: contractions ("don't have" = "no"), one-letter typos and swapped letters in longer
words, formulae for names (CO₂ = carbon dioxide), "ppt", "infra-red"/"IR", "2.8.3" for 2,8,3, and words the question
already says. Capitals matter only for formulae and genotypes (pH is exempt; X^BX^b = X^bX^B).

**Equations.** `{ equation:'Zn(s) + 2HCl(aq) → ZnCl2(aq) + H2(g)', states?:true }`: one mark for the right formulae and
charges, one for balancing (any multiple), one for state symbols when asked. Ionic and half-equations work (`Cu2+ + 2e- → Cu`).
Word equations get one mark per side. Nuclide notation is not read from typed text: use the `nuclide` interface.

Typed boxes are MathLive fields (answers arrive as LaTeX; the markers convert it) with a plain-input fallback.

## Limits you should know

- Keyword marking cannot judge how well a point is argued and can miss a correct point in unusual wording. It never
  gives marks for a point that is not there, so scores are a safe floor.
- A typo is forgiven only in words of five letters or more.
- `logic` on a phone is cramped: the canvas pans, but building is easier on a wider screen.
- `flowfill` scrolls sideways inside its box on a phone.
- `code`/`flowchart` marks depend on good test cases in the mark scheme; a program that prints extra words still passes if the numbers match.
- `code` runs Cambridge pseudocode and Python (Skulpt, Python 3, in the browser; `npm i skulpt@1.2.0` for marking on a server). Java and Visual Basic are not run.

## Drawing interfaces (built, set aside until you decide)

In `drawing/`, not loaded by the lab unless you open `index.html?drawing=1` (or use the "Show drawing interfaces" link).
All are marked without AI; their markers live in `marking/mark.js` (plot) and `marking/builders.js` (the rest).
`NED_DRAWING=1 node tests/e2e.test.js` tests them through their real controls.

| id | Student does | Saves | Mark scheme (`answer`) | Marked by |
|---|---|---|---|---|
| `plot` | plots points, draws straight lines, may choose the scale | `{ axes, points, lines }` | `{ points?, line?, segments?, scale? }` | half a small square; gradient/intercept; segment shape + label |
| `econ` | shifts D or S, marks the new equilibrium; with `config.labelling` also names the axes and curves | `{ shifts:{D:'right'}, equilibrium, labels? }` | `{ shifts:{…}, labels? }` | curve, direction, equilibrium, labels |
| `plot` (more) | `config.curve`: smooth curve through the points, tangents with the line tool; `config.region`: broken/solid lines and R | `+ lines[].dashed, region` | `{ curve:{marks,min} }`, `{ region:{ lines:[{through,strict,keep}], marks } }` | curve once points are plotted; each boundary (and its style) + R in the right region |
| `transform` | clicks corners of a shape on a grid (reflection, rotation, enlargement, translation) | `{ shapes:[{pts}] }` | `{ shape:[[x,y]…] }` | exact corners; right shape in the wrong place = 1 |
| `numberline` | places ends, open/closed circles, join or arrow | `{ lo, hi }` | `{ lo:{v,closed}\|null, hi }` | each end |
| `venn` | shades regions, or types the number in each region | `{ shaded }` or `{ counts }` | same shape | exact regions (one out = marks − 1); counts box by box |
| `bars` | bar chart, histogram (frequency density), pyramid of numbers/biomass | `{ heights }` | `{ heights, tol? }` | each bar within half a small square |
| `construct` | ruler (shows length), compasses (shows radius), point (snaps to crossings), 180° protractor | `{ points, segments, arcs }` (cm) | `{ points, arcs, segments }` or `{ bearing }` | arcs present; point within 2 mm; lines; bearing ±2°, distance ±2 mm |
| `rays` | rays that bend at the lens/mirror, dashed traced-back rays, image arrow | `{ rays, image }` | `{ rays:n, image:{x,h} }` | any correct ray (leaves through the image tip) + image position |
| `arrows` | drags force arrows out of an object (45° steps) and names them | `{ arrows:[{dir,len,label}] }` | `{ arrows:[{label,dir}], compare? }` | each force; arrow lengths compared |
| `ppc` | shifts the PPC out/in, marks point X | `{ shift, point, where }` | `{ shift? , where? }` | shift; inside/on/beyond |
| `pricecontrol` | places a max/min price (or minimum wage) line and names the gap | `{ price, gap }` | `{ control:'max'\|'min' }` | right side of equilibrium; shortage/surplus |

Biology drawings of specimens stay out: a drawing's quality cannot be marked without AI. Food chains use `order`.

## Parked (no fair marking without AI)

`graph` (free-hand curves, in `drawing/` but not marked) and `photo` (photo of working). `math` is the on-screen maths keyboard, not a question type.

## Testing

```
npm install            # once, in ../vendor or anywhere: playwright, mathlive, konva (only needed for the tests)
node tests/mark.test.js       # 182 marking checks
node tests/builders.test.js   # 160 checks: pseudocode (incl. files), Python, SQL, flowchart, ordering, science builders, drawing
node tests/subjects.test.js   # 271 real 2017 questions from all six subjects, answered as students write
node tests/e2e.test.js        # 164 browser checks (247 with NED_DRAWING=1): every interface driven through its real controls
```

The test page (`index.html`) marks every sample live in the right-hand panel and has a "Reload saved answer" button
that rebuilds the interface from its saved value. Open `index.html?ui=table&sample=0` to jump to one sample.
