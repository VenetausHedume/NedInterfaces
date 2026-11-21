/* Ned marking — marks one saved answer against one mark-scheme answer. No AI, no network, no DOM.
   Browser: window.NedMark     Node: require('./marking/mark.js')

   NedMark.mark(ui, answer, value, question, opts) -> { score, max, status, detail }
     ui       the interface id that produced the value ('text', 'formula', 'mcq', ...)
     answer   the mark-scheme side (shapes documented above each marker below)
     value    exactly what the interface saved (or null)
     question { marks, config }
     opts     { exclude:[point indexes already credited elsewhere], synonyms:{word:[...]} }
   status: 'marked' | 'unsure' (free text below full marks: unusual wording may have been missed)
           | 'self_check' (long writing: keyword score is a floor) | 'unanswered' | 'no_answer_key'            */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(typeof require === 'function' ? (function () { try { return require('./synonyms.js'); } catch (e) { return {}; } })() : {},
    typeof require === 'function' ? (function () { try { return require('./reasoning.js'); } catch (e) { return null; } })() : null);
  else root.NedMark = factory(root.NedSynonyms || {}, root.NedReasoning || null);
})(typeof self !== 'undefined' ? self : this, function (DEFAULT_SYN, REASONING) {
  'use strict';

  /* ───────────── text clean-up ───────────── */
  const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };
  const SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  const CMD = { times: '×', cdot: '×', div: '/', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', pm: '±', rightarrow: '→', to: '→', longrightarrow: '→',
    rightleftharpoons: '⇌', leftrightarrow: '↔', degree: '°', circ: '°', pi: 'π', Omega: 'Ω', omega: 'ω', mu: 'µ', theta: 'θ', lambda: 'λ', Delta: 'Δ', alpha: 'α', beta: 'β', gamma: 'γ',
    approx: '≈', infty: '∞', lt: '<', gt: '>', '%': '%', '$': '$', '&': '&', '#': '#', '_': '_', '{': '(', '}': ')' };

  /* MathLive saves LaTeX ("refinery\;gas", "\frac{1}{2}mv^2"). Turn it into plain text the markers can read. */
  function latexToText(s) {
    if (s == null) return '';
    s = String(s);
    if (!/[\\{}^_]/.test(s)) return s;
    s = s.replace(/\\(?:text|mathrm|mathit|mathbf|operatorname|textbf|textit|mathsf)\s*\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\[,;:!]/g, ' ').replace(/\\(?:quad|qquad)(?![a-zA-Z])/g, ' ').replace(/\\(?:left|right|displaystyle)(?![a-zA-Z])/g, '');
    s = s.replace(/\\ /g, ' ').replace(/\\placeholder\s*(\{[^{}]*\})?/g, '');
    s = s.replace(/\\(d|t)?frac\s*(\d)\s*(\d)/g, '\\frac{$2}{$3}');
    s = s.replace(/(\d)\s*(?=\\(?:d|t)?frac\s*\{\d+\}\s*\{\d+\})/g, '$1 ');                         // mixed number 1\frac{1}{3} -> 1 1/3                 // \frac12
    for (let i = 0; i < 6 && /\\(?:d|t)?frac/.test(s); i++) s = s.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (m, a, b) => `${wrap(a)}/${/^(\d+(\.\d+)?|[A-Za-z])$/.test(b.trim()) ? b.trim() : '(' + b.trim() + ')'}`);
    for (let i = 0; i < 4 && /\\sqrt/.test(s); i++) s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)');
    s = s.replace(/\^\s*\{\s*\\circ\s*\}|\^\s*\\circ/g, '°');
    s = s.replace(/\^\s*\{([^{}]*)\}/g, (m, a) => '^' + wrap(a)).replace(/_\s*\{([^{}]*)\}/g, '$1').replace(/_([0-9a-zA-Z])/g, '$1');
    s = s.replace(/\\([a-zA-Z]+|[%$&#_{}])/g, (m, c) => (CMD[c] != null ? CMD[c] : c));
    s = s.replace(/[{}]/g, '').replace(/~/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
    function wrap(a) { a = a.trim(); return /^[\w.]+$/.test(a) ? a : '(' + a + ')'; }
  }
  const PHRASES = [[/\bcan['’]?t\b/g, 'cannot'], [/\b(\w+)n['’]t\b/g, '$1 not'], [/['’]s\b/g, 's'],
    [/\binfra[\s-]?red\b|\bir\b/g, 'infrared'], [/\bultra[\s-]?violet\b|\buv\b/g, 'ultraviolet'], [/\bcheck[\s-]sum\b/g, 'checksum'],
    [/\b(man|human)[\s-]made\b|\bmade by (people|humans|man)\b/g, 'manmade'], [/\bgift of nature\b|\bfrom nature\b/g, 'natural'],
    [/\bppt\b/g, 'precipitate'], [/\bsteering(?!\s*wheel)\b/g, 'steering wheel'], [/\b(front glass|front window|windshield)\b/g, 'windscreen'], [/\bsulph/g, 'sulf'], [/\baluminium\b/g, 'aluminum'], [/=\s*0(?![\d.])/g, ' is zero'],
    [/(?<![\d.])(\d+)\.(\d+)\.(\d+)((?:\.\d+)*)(?![\d.])/g, (m) => m.replace(/\./g, ',')]];   // 2.8.3 -> 2,8,3 (an electron arrangement, not a decimal)
  function norm(s) {
    let t = latexToText(s).toLowerCase();
    PHRASES.forEach(([re, to]) => { t = t.replace(re, to); });
    return t
      .replace(/[−–—]/g, '-').replace(/[×]/g, 'x').replace(/[‘’·]/g, "'")
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, m => '^' + [...m].map(c => SUP[c]).join(''))
      .replace(/[₀-₉]/g, c => SUBS[c])
      .replace(/\s+/g, ' ').trim();
  }
  const STOP = new Set(('a an the of to in on at for and or is are was be it its this that with by as from into than then so occur occurs happen happens take takes place ' +
    'their there they which when will can may would should has have had do does more most very each other some any because').split(' '));
  function stem(w) {
    if (w.length > 5) w = w.replace(/(isation|ization)$/, 'ise');
    if (w.length > 4) w = w.replace(/(ing|ed|ly)$/, '');
    if (w.length > 4 && /(ch|sh|ss|x)es$/.test(w)) w = w.slice(0, -2);
    else if (w.length > 3 && !/ss$/.test(w)) w = w.replace(/s$/, '');
    if (w.length > 5) w = w.replace(/(er|est)$/, '');
    if (w.length > 6) w = w.replace(/al$/, '');
    if (w.length >= 4) w = w.replace(/e$/, '');
    return w.replace(/z/g, 's');
  }
  function rawTokens(s) {
    return norm(s).replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9.\-^+ ]/g, ' ').split(' ').map(w => w.replace(/^[.\-]+|[.\-]+$/g, '')).filter(Boolean);
  }
  function tokens(s) { return rawTokens(s).filter(w => !STOP.has(w)).map(stem); }
  function lev1(a, b) {
    if (a === b) return true;
    if (a.length === b.length) { const d = [...a].map((c, i) => (c !== b[i] ? i : -1)).filter(i => i >= 0); if (d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]]) return true; }
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  function buildSyn(extra) {                      // stem -> Set(stems that mean the same)
    const map = {};
    const add = (obj) => { for (const k in obj || {}) { const group = [k].concat(obj[k]).map(w => tokens(w).join(' ')).filter(Boolean);
      group.forEach(a => { map[a] = map[a] || new Set(); group.forEach(b => map[a].add(b)); }); } };
    add(DEFAULT_SYN.general); add(extra);
    return map;
  }
  /* 'Spellings of syllabus terms must allow for clear and unambiguous separation from other syllabus terms with which they
     may be confused (e.g. ethane / ethene …)' — a one-letter slip is forgiven, but not when the other spelling is a
     different term: alkane/alkene, chlorine/chloride, sulfate/sulfite, absorb/adsorb, insulin/inulin … */
  const CONFUSE_END = [['an', 'en'], ['en', 'yn'], ['an', 'yn'], ['in', 'id'], ['at', 'it'], ['ol', 'al'], ['ic', 'ous'], ['on', 'en']];
  const CONFUSE = new Set(['absorb|adsorb', 'fusion|fission', 'afferent|efferent', 'ileum|ilium', 'insulin|inulin', 'ion|iron', 'mitosi|meiosi',
    'reflect|refract', 'ovary|ovule', 'anion|union', 'cation|caution', 'gene|gen', 'conductor|conduction', 'convector|convection']);
  function confusable(a, b) {
    if (CONFUSE.has(a + '|' + b) || CONFUSE.has(b + '|' + a)) return true;
    const root = (w, x, y) => w.slice(0, w.length - (w.endsWith(x) ? x.length : y.length));
    return CONFUSE_END.some(([x, y]) => ((a.endsWith(x) && b.endsWith(y)) || (a.endsWith(y) && b.endsWith(x))) && root(a, x, y) === root(b, x, y));
  }
  function hasTok(set, text, t, syn) {
    const cands = syn && syn[t] ? [...syn[t]] : [t];
    for (const c of cands) {
      if (c.includes(' ')) { if ((' ' + text + ' ').includes(' ' + c + ' ')) return true; continue; }
      if (set.has(c)) return true;
      if (c.length >= 5 && !/\d/.test(c)) for (const s of set) if (lev1(s, c) && !confusable(s, c)) return true;
      if (c.length === 4 && !/\d/.test(c)) for (const s of set) if (s.length === 4 && s !== c && lev1(s, c) && [...s].sort().join('') === [...c].sort().join('')) return true;   // vlave → valve
    }
    return false;
  }
  /* does the student's text contain this alternative?  all key words for short ones, most for long ones */
  // ion and formula symbols: 'Na +' in a key (the superscript lost in the PDF) is 'Na+', 'Na⁺' or 'Na +' in an answer
  const SUPC = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-' };
  const ionText = s => String(s).replace(/[₀-₉]/g, c => String(c.charCodeAt(0) - 8320)).replace(/[⁰-⁹⁺⁻¹²³]/g, c => SUPC[c] || c).replace(/[–−]/g, '-').replace(/([A-Za-z0-9)])\s+(?=\d*[+\-](?![A-Za-z0-9]))/g, '$1').replace(/\^\{?(\d*[+\-])\}?/g, '$1');
  const ION = /^(?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*)+\d*[+\-]$/;
  // a lone 'I' (iodide) or 'A' (a label) is not the pronoun 'I think …' or the article 'a gas' / 'A solid forms'
  const LABEL_NEXT = /^(?:is|are|was|were|and|or|has|have|ion|ions|only|then|because|gives|shows|represents|contains)$/;
  function letterHit(ctx, L) {
    const ws = String(ctx.orig || '').replace(/[^A-Za-z0-9+\-⁻]+/g, ' ').trim().split(' ');
    return ws.some((w, i) => { if (w.replace(/[+\-⁻]+$/, '') !== L) return false; if (w !== L) return true;
      const nx = ws[i + 1]; return !nx || !/^[a-z]/.test(nx) || LABEL_NEXT.test(nx); });
  }
  function matchAlt(ctx, alt) {
    if (/^\s*(?:and|or|&|also|plus)\s*$/i.test(String(alt))) return false;     // a connector the scheme printed between two points is not a point
    { const a = ionText(alt).replace(/\s+/g, '');
      if (ION.test(a) && a.length > 2) { const esc = a.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&'); if (new RegExp('(^|[^A-Za-z0-9])' + esc + '(?![A-Za-z0-9+\\-])').test(ionText(ctx.orig || ''))) return true; }
      if (/^\s*[AI]\s*$/.test(String(alt)) && ctx.orig != null) return letterHit(ctx, String(alt).trim()); }
    /* "quoted words" in a mark-scheme alternative must appear together, in that order ("collision rate", not "collide … rate") */
    const quoted = [...String(alt).matchAll(/"([^"]+)"/g)].map(m => tokens(m[1])).filter(t => t.length > 1);
    if (quoted.length) {
      const words = rawTokens(ctx.orig || ctx.text).map(stem);          // stop-words kept: "collide so the rate" is not "collision rate"
      const at = (w, i) => hasTok(new Set([words[i]]), words[i] || '', w, ctx.syn);
      if (!quoted.every(ph => words.some((_, i) => ph.every((w, k) => at(w, i + k))))) return false;
      alt = String(alt).replace(/"/g, '');
    }
    if (/^\s*\d+(\s*,\s*\d+)+\s*$/.test(alt)) { const a = alt.replace(/\s+/g, ''); return new RegExp('(^|[^\\d,])' + a + '($|[^\\d,])').test(ctx.compact); }
    let need = [...new Set(tokens(alt))];
    if (need.length >= 2 && ctx.q) { const own = need.filter(t => !ctx.q.has(t)); if (own.length) need = own; }   // words the question already says need not be repeated
    if (need.length === 1 && !/\s/.test(alt.trim()) && alt.trim().length >= 6 && ctx.compact.includes(norm(alt).replace(/\s+/g, ''))) return true;
    if (!need.length) {                                  // nothing but stop-words or symbols: a letter answer ("A"), "+2", "→"
      const rawNeed = rawTokens(alt);
      if (rawNeed.length) return rawNeed.every(w => ctx.raw.has(w));
      const a = norm(alt).replace(/\s+/g, ''); return !!a && ctx.compact.includes(a);
    }
    if (need.length === 1 && need[0].length <= 2) return ctx.raw.has(need[0]);       // single letters / "pH" must be whole words
    const hits = need.filter(t => hasTok(ctx.set, ctx.text, t, ctx.syn)).length;
    const frac = hits / need.length;
    return need.length <= 2 ? frac === 1 : need.length <= 4 ? frac >= 0.75 : frac >= 0.6;
  }
  const FORMULA = { CO2: 'carbon dioxide', H2O: 'water', O2: 'oxygen', H2: 'hydrogen', N2: 'nitrogen', CO: 'carbon monoxide', SO2: 'sulfur dioxide', CH4: 'methane',
    NaCl: 'sodium chloride', HCl: 'hydrochloric acid', NaOH: 'sodium hydroxide', H2SO4: 'sulfuric acid', NH3: 'ammonia', CaCO3: 'calcium carbonate', Cl2: 'chlorine', CaO: 'calcium oxide',
    C6H12O6: 'glucose', C2H5OH: 'ethanol', HNO3: 'nitric acid', NO2: 'nitrogen dioxide', Fe: 'iron', Cu: 'copper', Zn: 'zinc', Mg: 'magnesium', Na: 'sodium', K: 'potassium', Ca: 'calcium', Al: 'aluminum', Ag: 'silver', Pb: 'lead' };
  function withNames(text) {           // "CO2 and H2O" also reads as "carbon dioxide and water"
    const t = latexToText(text).replace(/[₀-₉]/g, c => SUBS[c]);
    const add = []; t.split(/[^A-Za-z0-9]+/).forEach(w => { if (FORMULA[w] && (/\d/.test(w) || /[A-Z].*[A-Z]|^[A-Z][a-z]$/.test(w))) add.push(FORMULA[w]); });
    return add.length ? text + ' ; ' + add.join(' ; ') : text;
  }
  function context(text, syn, question) {
    const orig = text; text = withNames(text);
    const toks = tokens(text);
    return { set: new Set(toks), text: toks.join(' '), raw: new Set(rawTokens(text)), compact: norm(text).replace(/\s+/g, ''), syn, orig, q: question && question.text ? new Set(tokens(question.text)) : null };
  }
  function wordPresent(ctx, w) { const t = tokens(w); return t.length ? t.every(x => hasTok(ctx.set, ctx.text, x, ctx.syn)) : ctx.compact.includes(norm(w).replace(/\s+/g, '')); }
  /* one mark-scheme point: { alts:[...], require:[word | [any of]], reject:[word] } */
  function pointHit(ctx, p) {
    if (!p || (!p.alts && !p.require)) return false;
    if ((p.reject || []).some(w => wordPresent(ctx, w))) return false;
    const reqWord = w => (caseMatters(w) ? caseHit(ctx.orig, w) || (FORMULA[w] && wordPresent(ctx, FORMULA[w])) : wordPresent(ctx, w));
    if (!(p.require || []).every(r => (Array.isArray(r) ? r : [r]).some(reqWord))) return false;
    if (!p.alts || !p.alts.length) return true;                  // a point made only of required words
    return p.alts.some(a => caseMatters(a, p) ? caseHit(ctx.orig, a) || (!!FORMULA[a] && matchAlt(ctx, FORMULA[a])) : matchAlt(ctx, a));
  }

  /* ───────────── "says the opposite" guard ─────────────
     Key words alone credit 'zinc is LESS reactive' for the point 'zinc is more reactive', and 'the line is NOT
     horizontal' for 'the line is horizontal'. For a point the key words found, look at the sentence(s) of the answer
     closest to it: if every one of them says the opposite direction (more/less, increase/decrease, same/different,
     complete/partial, absorb/reflect …) or puts 'not' in front of the key word, the point is not credited.
     Only a point with direction words (or a negated key word) can be refused; nothing else changes. */
  const OPP = {};
  [['increase', 'decrease'], ['increases', 'decreases'], ['increased', 'decreased'], ['increasing', 'decreasing'], ['rise', 'fall'], ['rises', 'falls'],
   ['higher', 'lower'], ['more', 'less'], ['more', 'fewer'], ['larger', 'smaller'], ['bigger', 'smaller'], ['strong', 'weak'], ['stronger', 'weaker'],
   ['same', 'different'], ['completely', 'partially'], ['complete', 'partial'], ['fully', 'partially'], ['absorbs', 'reflects'], ['absorb', 'reflect'],
   ['absorber', 'reflector'], ['absorbers', 'reflectors'], ['good', 'poor'], ['gain', 'lose'], ['gains', 'loses'], ['positive', 'negative'], ['above', 'below'],
   ['alternating', 'direct'], ['changing', 'constant'], ['attract', 'repel'], ['conductor', 'insulator'], ['soluble', 'insoluble'], ['faster', 'slower'],
   ['permanent', 'temporary'], ['permanently', 'temporarily'], ['volatile', 'non-volatile'], ['reduces', 'increases'], ['reduce', 'increase'],
   ['correct', 'incorrect'], ['certainty', 'uncertainty'], ['surplus', 'shortage'], ['affordable', 'unaffordable']]
    .forEach(([a, b]) => { (OPP[a] = OPP[a] || []).push(b); (OPP[b] = OPP[b] || []).push(a); });
  const oWords = s => (String(s).toLowerCase().match(/[a-z][a-z-]*'?[a-z]*/g) || []);
  const oStem = w => w.replace(/ies$/, 'y').replace(/(?<=[a-z]{3})(es|s)$/, '');
  const SHORT = /^(a|an|the|to|of|in|on|at|by|is|it|as|be|or|if|so|no|do|we|he|its|are|was|for|and|but|not|has|had|can|may|its|out|up|use|all|any|one|two|per|via|own|too|due|get|got|let|put|set|way)$/;
  const FILLER = /^(that|this|with|from|into|than|they|there|have|will|would|could|their|which|when|then|also)$/;
  const NEG = /^(not|no|never|cannot|can't|isn't|doesn't|aren't|don't|won't|without|unable|none)$/;
  function altState(alt, sents, pointNeg) {
    const aw = oWords(alt), pol = aw.filter(w => OPP[w]);
    // content words name what the statement is about; short ones count too ('Ca', 'Cl', 'RAM'), but not 'the', 'is' …
    const content = aw.filter(w => (w.length > 3 || (w.length >= 2 && !SHORT.test(w))) && !OPP[w] && !FILLER.test(w)).map(oStem);
    if (!content.length) return null;
    const ov = sents.map(s => { const sw = new Set(oWords(s).map(oStem)); return content.filter(w => sw.has(w)).length; });
    const best = Math.max(...ov); if (!best) return null;
    const near = sents.filter((s, i) => ov[i] === best);
    const altNeg = pointNeg || aw.some(w => NEG.test(w));
    const flip = s => { const sw = oWords(s), set = new Set(sw), st = sw.map(oStem);
      // direction words: 'higher concentration, less water' is the same claim as 'lower concentration, more water',
      // so with two or more direction words the claim is reversed only when an odd number of them are reversed
      const st2 = pol.map(w => (set.has(w) ? 1 : OPP[w].some(o => set.has(o) && !pol.includes(o)) ? -1 : 0));
      const opp = st2.filter(x => x < 0).length;
      if (pol.length === 1 ? opp === 1 : (opp % 2 === 1 && st2.every(x => x !== 0))) return true;
      return !altNeg && content.some(c => { const i = st.indexOf(c); return i > 0 && NEG.test(sw[i - 1]); }); };
    if (!pol.length && !near.some(flip)) return null;
    return near.every(flip) ? 'flip' : near.some(flip) ? 'both' : 'ok';
  }
  function saysOpposite(p, text, con) {
    if (!p || !p.alts || !p.alts.length) return false;
    const sents = String(text).split(/(?<=[.!?;])\s+|\n+/).map(x => x.trim()).filter(Boolean);
    if (!sents.length) return false;
    const pointNeg = p.alts.some(a => oWords(a).some(w => NEG.test(w)));      // the point itself is about 'not …'
    const st = p.alts.map(a => altState(a, sents, pointNeg));
    // con (sciences): 'the examiner should not choose between contradictory statements' — said one way and the
    // other way in the same answer earns nothing
    if (con && st.includes('both')) return true;
    return st.includes('flip') && !st.includes('ok') && !st.includes('both');
  }
  // a new statement starts after . ! ? ; only when the next word starts a sentence: 'The induced e.m.f. causes …',
  // 'the p.d. across it', 'e.g. oil' stay in one piece
  const sentencesOf = (t) => String(t).split(/(?<=[.!?])\s+(?=[A-Z0-9"'(“‘])|(?<=;)\s+|\n+/).map(x => x.trim()).filter(Boolean);

  /* ───────────── how examiners apply a mark scheme ─────────────
     (Cambridge 'Generic' and 'Science-Specific Marking Principles', printed at the front of every mark scheme)
     list rule: for 'State two …' only the first two answers are read; a wrong answer still uses up a place.
     chains: a '(1) … (1)' link that develops a point (the explanation) needs the point it develops.
     listMax: 'Listing … max 3' — answers that only list, with no point developed, are capped.
     levels: level-of-response questions ('Discuss …', 8 marks) are marked by level: a point only stated is
     level 1; points that are explained ('…, so …', '… because …') reach level 2; explained points on both
     sides reach level 3, and a judgement ('overall', 'it depends on …') takes it to the top. */
  const DEVELOP = /\b(because|so|therefore|thus|hence|as a result|since|due to|so that|leading to|leads? to|lead to|resulting in|results? in|caus(?:e|es|ing)|mean(?:s|ing)|which (?:will|would|could|may|might|can|means|leads|causes|reduces|increases|raises|lowers)|this (?:will|would|could|may|might|can|means|leads|causes|reduces|increases|raises|lowers))\b/i;
  const JUDGE = /\b(overall|on balance|in conclusion|to conclude|it depends|depends on|depend on|the extent|more likely|less likely|most likely|whether .{0,40} depends|in the (?:short|long) (?:run|term))\b/i;
  function responsesOf(value, boxes) {
    if (boxes.length > 1) return boxes;
    const t = boxes[0] || '';
    let parts = t.split(/\n+|;|(?:^|\s)(?:\d[.)]|[a-d][.)]|[•\-–])\s+/).map(x => x.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
    parts = t.split(/,|\band\b|\.\s+/).map(x => x.trim()).filter(Boolean);
    return parts.length > 1 && parts.every(x => x.split(/\s+/).length <= 8) ? parts : sentencesOf(t);
  }
  function listRule(answer, responses, syn, question, n) {
    const pts = answer.points || [], used = new Set(), awarded = [];
    let slots = n;
    for (const r of responses) {
      if (slots <= 0) break;
      const ctx = context(r, syn, question);
      // one written statement can hold two answers ('the dry weather and pests'); one with none still uses a place
      const hits = pts.map((p, k) => (!used.has(k) && (p.alts || p.require) && pointHit(ctx, p) && !saysOpposite(p, r) ? k : -1)).filter(k => k >= 0);
      if (!hits.length) { if (r.split(/\s+/).length >= 2) slots--; continue; }
      hits.slice(0, slots).forEach(k => { used.add(k); awarded.push(k); });
      slots -= Math.max(1, Math.min(hits.length, slots));
    }
    return awarded;
  }
  // 'Explain two reasons …' marked as reason (1) + explanation (1), twice: only two of the reasons count, the two
  // with the most credited links — four reasons named without explanation earn two marks, not four
  function applyChains(answer, awarded) {
    if (!answer.chains || !answer.pick) return awarded;
    const inChain = new Set([].concat(...answer.chains));
    const best = answer.chains.map(ch => ch.filter(i => awarded.includes(i))).filter(l => l.length).sort((a, b) => b.length - a.length).slice(0, answer.pick);
    return awarded.filter(i => !inChain.has(i) || best.some(l => l.includes(i)));
  }
  function developedLinks(answer, awarded) {
    return (answer.chains || []).some(ch => ch.filter(i => awarded.includes(i)).length >= 2);
  }
  function valueText(v) {
    if (v == null) return '';
    if (typeof v === 'string') return latexToText(v);
    return [v.latex, v.text, v.answer, v.working, v.formula].concat(v.points || [], [v.conclusion]).filter(Boolean).map(latexToText).join('\n');
  }

  /* ───────────── text / written points ─────────────
     answer: { points:[{alts,require?,reject?}], need }      value: { latex } | { text } | string */
  function markPoints(answer, value, max, opts, question) {
    if (answer.equation) return markEquation(answer, value, max);
    if (answer.logic) return markLogicText(answer, value, max);
    const text = valueText(value);
    if (!text.trim()) return { score: 0, max, status: 'unanswered', detail: {} };
    const ctx = context(text, buildSyn(Object.assign({}, answer.synonyms, opts && opts.synonyms)), question);
    const exclude = new Set((opts && opts.exclude) || []);
    let awarded = [];
    if (answer.list) awarded = listRule(answer, responsesOf(value, [text]), buildSyn(Object.assign({}, answer.synonyms, opts && opts.synonyms)), question, answer.list).filter(i => !exclude.has(i));
    else (answer.points || []).forEach((p, i) => { if ((!p.alts && !p.require) || exclude.has(i)) return; if (pointHit(ctx, p) && !saysOpposite(p, text, answer.con)) awarded.push(i); });
    awarded = applyChains(answer, awarded);
    const missed = (answer.points || []).map((p, i) => i).filter(i => (answer.points[i].alts || answer.points[i].require) && !awarded.includes(i) && !exclude.has(i));
    const need = Math.min(max, answer.need || max);
    let score = answer.scale ? ladder(awarded.length, max, answer.scale) : Math.min(need, awarded.length);
    if (answer.listMax && !developedLinks(answer, awarded)) score = Math.min(score, answer.listMax);
    return { score, max, status: score >= max ? 'marked' : 'unsure', detail: { awarded, missed } };
  }

  /* ───────────── long answer, one box per point ─────────────
     answer: { points:[...], groups?:[{title,max,points:[indexes]}], need? }   value: { points:[latex...], conclusion? }
     A box earns the points it contains (up to one per 6 words, so a list of keywords is not enough); each point is
     credited once; a group never earns more than its max. */
  function markProse(answer, value, max, opts, question) {
    const boxes = ((value && value.points) || []).concat(value && value.conclusion ? [value.conclusion] : []).map(latexToText).filter(b => b.trim());
    if (typeof value === 'string' && value.trim()) boxes.push(latexToText(value));
    if (!boxes.length) return { score: 0, max, status: 'unanswered', detail: {} };
    // economics explain / analyse / discuss: read as an examiner does — statements, chains of reasoning, levels
    // (marking/reasoning.js). The whole answer is read as one piece of prose, in the order it was written.
    if (answer.reasoning && REASONING) {
      const r = REASONING.mark(Object.assign({ marks: max }, answer.reasoning, { marks: Math.min(max, answer.reasoning.marks || max) }), boxes.map(b => (/[.!?]\s*$/.test(b) ? b : b + '.')).join(' '));
      const score = Math.max(0, Math.min(max, r.score));
      return { score, max, status: score >= max ? 'marked' : 'unsure', detail: Object.assign({ reasoning: answer.reasoning.kind }, r.detail || {}) };
    }
    // one full answer: read statement by statement, as an examiner reads a script
    if (value && value.format === 'full') boxes.splice(0, boxes.length, ...sentencesOf(boxes.join(' ')));
    const syn = buildSyn(Object.assign({}, answer.synonyms, opts && opts.synonyms));
    const pts = answer.points || [];
    const taken = new Set((opts && opts.exclude) || []);
    const perBox = [], extraHits = [];
    /* when the student sorted their points under headings, a point only counts under the heading it belongs to */
    const sideOf = value && value.sides && answer.groups ? value.sides : null;
    const allText = boxes.join('\n');
    // which point each box could earn, then the best pairing of boxes and points (a box that matches two points
    // should not take the one only a later box can earn)
    const can = boxes.map((b, bi) => {
      const ctx = context(b, syn, question);
      // -2: a definition box — it can earn a definition point, not one of the arguments on either side
      const allowed = !sideOf ? null : sideOf[bi] === -2 ? pts.map((p, i) => i).filter(i => !answer.groups.some(g => g.points.includes(i)))
        : answer.groups[sideOf[bi]] ? answer.groups[sideOf[bi]].points : null;
      return pts.map((p, i) => (p.alts || p.require) && !taken.has(i) && (!allowed || allowed.includes(i)) && pointHit(ctx, p) && !saysOpposite(p, b) && !(answer.con && saysOpposite(p, allText, true))).map((h, i) => (h ? i : -1)).filter(i => i >= 0);
    });
    // a box can hold more than one mark point when it is written out ('the minimum energy that colliding particles need
    // to react' is two points), but not a bare list of keywords: one point per sentence or per 6 words, at least one
    // ('Education: better access … improves earning potential' is a reason and its explanation: a label before a colon counts)
    // a clause is a sentence or part of one joined by ', which', ', so', 'because', 'and so', 'this means' …
    const clauses = (b) => b.split(/[.;!?\n]+|,\s*(?=which|so|and|this|meaning|leading|causing|because|as)\b|\s(?=because|so|this means|which means|and so|therefore|leading to)\b/).filter(x => x && x.trim().split(/\s+/).length >= 2).length;
    // a short list in one sentence ('the ions are Na+, Zn2+ and I-') holds one answer per item, as separate boxes would
    const listItems = (b) => b.split(/[.;!?\n]+/).reduce((n, sen) => { const it = sen.split(/,|\band\b/).map(x => x.trim()).filter(Boolean);
      return n + (it.length >= 2 && it.slice(1).every(x => x.split(/\s+/).length <= 4) ? it.length : 0); }, 0);
    // only where examiners credit a bare list (sciences, computer science); in economics 'more sales and more revenue' is one undeveloped point
    const LISTY = /^(0610|0620|0625|0478|0984|0653|0654|0970|0971|0972|0973|0438)/.test(String((question && question.id) || ''));
    const room = boxes.map(b => Math.max(1, clauses(b) + (b.match(/:\s*\S/g) || []).length, Math.floor(b.trim().split(/\s+/).length / 6), LISTY ? listItems(b) : 0));
    const owner = {}, load = boxes.map(() => []);
    function place(bi, seen) {
      for (const i of can[bi]) {
        if (seen.has(i)) continue; seen.add(i);
        if (owner[i] == null || place(owner[i], seen)) {
          if (owner[i] != null) load[owner[i]] = load[owner[i]].filter(x => x !== i);
          owner[i] = bi; load[bi].push(i); return true;
        }
      }
      return false;
    }
    boxes.forEach((b, bi) => { for (let k = 0; k < room[bi]; k++) { const before = load[bi].length; if (!place(bi, new Set(load[bi]))) break; if (load[bi].length === before) break; } });
    if (answer.list) {          // 'State two …': the first two answers are read, a wrong one uses up a place
      const got = listRule(answer, responsesOf(value, boxes), syn, question, answer.list);
      load.forEach((l, bi) => { l.length = 0; });
      got.forEach(i => { const bi = can.findIndex(c => c.includes(i)); if (bi >= 0) load[bi].push(i); });
    }
    load.forEach((l, bi) => { perBox.push(l.length ? l[0] : -1); extraHits.push(...l.slice(1)); l.forEach(i => taken.add(i)); });
    let awarded = applyChains(answer, perBox.filter(i => i >= 0).concat(extraHits));
    if (answer.levels) return markLevels(answer, boxes, load, awarded, max, value);
    let score = awarded.length;
    const groupScores = [];
    if (answer.groups && answer.groups.length) {
      score = 0;
      answer.groups.forEach(g => { const n = Math.min(g.max, awarded.filter(i => g.points.includes(i)).length); groupScores.push({ title: g.title, score: n, max: g.max }); score += n; });
      score += awarded.filter(i => !answer.groups.some(g => g.points.includes(i))).length;
    }
    score = Math.min(max, answer.need || max, score);
    if (answer.listMax && !developedLinks(answer, awarded)) score = Math.min(score, answer.listMax);
    // the score stands (it is saved and counts in totals); 'unsure' tells the page some marks may have been missed
    return { score, max, status: score >= max ? 'marked' : 'unsure', detail: { perBox, boxes: load, awarded, groups: groupScores, missed: pts.map((p, i) => i).filter(i => pts[i].alts && !awarded.includes(i)) } };
  }

  /* level-of-response marking (economics 'Discuss …'): the mark-scheme points show what is relevant; the level comes
     from how well they are used. A point counts as developed when its box explains it (a reasoning link such as
     'so', 'because', 'which leads to', and at least 9 words) or holds two linked points. */
  function markLevels(answer, boxes, load, awarded, max, value) {
    const L = answer.levels.slice().sort((a, b) => b.level - a.level);
    const lv = (n) => L.find(x => x.level === n) || { min: 0, max: 0 };
    const sideOfPoint = (i) => (answer.groups || []).findIndex(g => g.points.includes(i));
    const boxOf = (i) => load.findIndex(l => l.includes(i));
    const developed = awarded.filter(i => { const b = boxes[boxOf(i)] || ''; return (DEVELOP.test(b) && b.split(/\s+/).length >= 9) || (load[boxOf(i)] || []).length >= 2; });
    const sides = new Set(awarded.map(sideOfPoint).filter(k => k >= 0)), devSides = new Set(developed.map(sideOfPoint).filter(k => k >= 0));
    const twoSided = (answer.groups || []).length >= 2;
    const judged = boxes.some(b => JUDGE.test(b)) && (!twoSided || sides.size >= 2);
    let level, score;
    if (!awarded.length) { level = 0; score = 0; }
    else if (developed.length >= 3 && (!twoSided || devSides.size >= 2)) { level = 3; score = lv(3).min + (developed.length >= 4 ? 1 : 0) + (judged ? 1 : 0); }
    else if (developed.length >= 1) { level = 2; score = lv(2).min + Math.min(2, Math.max(0, developed.length - 1) + (twoSided && sides.size >= 2 ? 1 : 0)); }
    else { level = 1; score = lv(1).min + (awarded.length >= 2 ? 1 : 0); }
    if (level) score = Math.min(score, lv(level).max);
    score = Math.min(max, score);
    return { score, max, status: score >= max ? 'marked' : 'unsure', detail: { perBox: load.map(l => (l.length ? l[0] : -1)), boxes: load, awarded, developed, level, judged,
      levels: L, missed: (answer.points || []).map((p, i) => i).filter(i => answer.points[i].alts && !awarded.includes(i)) } };
  }

  /* ───────────── numbers ───────────── */
  function parseNumber(s) {
    s = norm(s).replace(/(?<![\d.])\d{1,3}(?:[ ,]\d{3})+\b/g, m => m.replace(/[ ,]/g, '')).replace(/^[a-z]\s*=\s*/, '').replace(/^[$£€]\s*/, '').replace(/^\+\s*(?=\d)/, '');
    let m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:x|\*)\s*10\s*\^?\s*\(?(-?\d+)\)?\s*(.*)$/);
    if (m) return { n: parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10)), unit: m[3], sig: sig(m[1]) };
    m = s.match(/^\s*(-?\d+(?:\.\d+)?)e(-?\d+)\s*(.*)$/);
    if (m) return { n: parseFloat(m[1] + 'e' + m[2]), unit: m[3], sig: sig(m[1]) };
    m = s.match(/^\s*(-?\d+)\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/);
    if (m && +m[3] !== 0) return { n: (m[1].startsWith('-') ? -1 : 1) * (Math.abs(+m[1]) + m[2] / m[3]), unit: m[4], sig: 9 };
    m = s.match(/^\s*\(?(-?\d+(?:\.\d+)?)\)?\s*\/\s*\(?(\d+(?:\.\d+)?)\)?(?![\d.])\s*(.*)$/);
    if (m && +m[2] !== 0) return { n: m[1] / m[2], unit: m[3], sig: 9 };
    m = s.match(/^\s*(-?\d*\.?\d+)\s*(.*)$/);
    if (m) return { n: parseFloat(m[1]), unit: m[2], sig: sig(m[1]) };
    return null;
  }
  function sig(d) { const t = d.replace('-', '').replace('.', '').replace(/^0+/, ''); return Math.max(1, t.length); }
  function unitNorm(u) {
    u = norm(u).trim().replace(/\^\((-?\d)\)/g, '^$1');
    if (/\s/.test(u) && /\^?-\d/.test(u)) {           // kg m s^-1 -> kg m/s
      const num = [], den = []; u.split(/\s+/).forEach(w => { const m = w.match(/^(.+?)\^?-(\d)$/); if (m) den.push(m[1] + (m[2] === '1' ? '' : m[2])); else num.push(w); });
      u = num.join('') + (den.length ? '/' + den.join('') : '');
    }
    return u.replace(/\s+/g, '').replace(/per/g, '/').replace(/[°º]/g, 'deg').replace(/\^/g, '').replace(/[.;,()]+/g, '')
      .replace(/^(newtons?)$/, 'n').replace(/^(joules?)$/, 'j').replace(/^(amps?|amperes?)$/, 'a').replace(/^(volts?)$/, 'v')
      .replace(/^(watts?)$/, 'w').replace(/^(ohms?|Ω|ω)$/, 'ohm').replace(/^(metres?|meters?)$/, 'm').replace(/^(seconds?|secs?)$/, 's')
      .replace(/^years?$/, 'year').replace(/^(percent|percentage)$/, '%').replace(/^(grams?)$/, 'g').replace(/^(moles?|mols)$/, 'mol');
  }
  const PRE = { k: 1e3, m: 1e-3, c: 1e-2, 'µ': 1e-6, 'μ': 1e-6 };
  const BASE = new Set(['n', 'j', 'w', 'v', 'a', 'm', 'g', 'pa', 'hz', 'ohm', 's', 'c', 'l', 'nm', 'mol']);
  function prefixFactor(su, eu) {
    const split = u => (u.length > 1 && PRE[u[0]] && BASE.has(u.slice(1))) ? [PRE[u[0]], u.slice(1)] : [1, u];
    const a = split(su), b = split(eu);
    return a[1] === b[1] && a[0] !== b[0] ? a[0] / b[0] : 0;
  }
  function numEqual(student, expected) {
    if (student.n === expected.n) return true;
    if (Math.abs(student.n - expected.n) <= Math.abs(expected.n) * 0.005) return true;       // 0.5 %
    const s = Math.min(student.sig, 3);
    return student.sig >= 2 && student.sig <= 3 && Number(student.n.toPrecision(s)) === Number(expected.n.toPrecision(s));
  }
  /* sf3 (maths): Cambridge wants 3 significant figures unless exact — 3.0574 counts for 3.06, 3.1 and 3.07 do not */
  function sf3Equal(student, expected) {
    if (Math.abs(student.n - expected.n) <= Math.abs(expected.n) * 1e-12) return true;
    const p = Math.min(15, Math.max(3, expected.sig || 3));
    return (student.sig || 0) >= p && Number(student.n.toPrecision(p)) === Number(expected.n.toPrecision(p));
  }
  function exprCanon(s) {
    s = norm(s).replace(/\s+/g, '').replace(/\*/g, '').replace(/^[a-z]=(?!=)/, '').replace(/×/g, '');
    return s.replace(/-/g, '+-').split('+').filter(Boolean).sort().join('+');
  }
  function numbersIn(s) { return (norm(s).replace(/(?<![\d.])\d{1,3}(?:[ ,]\d{3})+\b/g, m => m.replace(/[ ,]/g, '')).match(/\d+(?:\.\d+)?/g) || []).map(Number); }

  /* answer: { final:[{value,unit?,units?,abs?} | {lo,hi,unit?} | {expr}], method:[lines] }
     value : { formula?, working?, answer, unit } (latex or plain)  — or a bare string
     Full marks for a correct final answer. Otherwise 1 mark per method line whose numbers all appear in the working (max-1). */
  /* method lines: numbers joined by operations ('924/0.88', '1.2*15') must appear with the same operation in the working
     (× and * the same; a × b = b × a); a line with letters ('20w+12', 'y=k/x^2') must appear as written (spaces ignored);
     a single number ('197', '-2') must appear (with its sign). */
  const opNorm = t => latexToText(t).replace(/[×·∗]|(?<=[\d)]\s*)x(?=\s*[\d(])/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/\s+/g, '').replace(/[()]/g, '');
  function triples(t) { const out = []; const re = /(-?\d+(?:\.\d+)?)([*/+\-])(?=(-?\d+(?:\.\d+)?))/g; let m; while ((m = re.exec(t))) out.push([+m[1], m[2], +m[3]]); return out; }
  function methodShown(line, working) {
    const figs = line.match(/^\s*figs\s+(\d+)\s*$/i);
    if (figs) return (latexToText(working).replace(/[^\d.\s;×x*^]/g, ' ').match(/[\d.]+/g) || []).some(n => n.replace('.', '').replace(/^0+/, '').startsWith(figs[1]));
    const w = opNorm(working), l = opNorm(line);
    if (/[a-z]/i.test(l.replace(/sqrt/g, ''))) return w.toLowerCase().includes(l.toLowerCase());
    const lt = triples(l);
    if (!lt.length) { const n = l.match(/^-?\d+(?:\.\d+)?$/); return !!n && new RegExp('(^|[^\\d.])' + l.replace(/[.\-]/g, '\\$&') + '(?![\\d.])').test(w); }
    const wt = triples(w);
    const same = (a, b) => Math.abs(a - b) <= Math.abs(b) * 1e-9 + 1e-12 || (String(b).includes('.') && Math.abs(a - b) <= Math.abs(b) * 0.005);
    return lt.every(([a, op, b]) => wt.some(([c, op2, d]) => op === op2 && ((same(c, a) && same(d, b)) || (op === '*' && same(c, b) && same(d, a)))));
  }
  /* answer: { final:[{value,unit?,units?,abs?,exact?,strict?} | {lo,hi,unit?} | {expr,form?} | {text:[formulae]}], method:[lines] }
     value : { formula?, working?, answer, unit } (latex or plain)  — or a bare string
     Full marks for a correct final answer. A right number with a missing or wrong unit loses one mark (a unit list that
     includes '' makes the unit optional). exact:true = a fraction answer: rounded decimals do not count. sf:true = more precise answers that round to the value count. strict:true =
     "give your answer in km": no conversion from other units. Otherwise 1 mark per method line shown (max − 1). */
  /* sf:true — the scheme's number is rounded ("11 Ω" for 8.0/0.72 = 11.1…): a more precise answer counts when it rounds
     to the scheme's last significant place (11.1 -> 11), a different one does not (12, or 10.9 -> 11? yes; 10.4 -> no). */
  function sfHit(x, v, txt) {
    const t = txt.replace(/[\s,]/g, '').replace(/^-/, '');
    let place;
    if (/\./.test(t)) place = -(t.split('.')[1].length);
    else { const z = t.match(/0*$/)[0].length; place = z < t.length ? z : 0; }
    const k = Math.pow(10, place), r = Math.round(x / k) * k;
    return Math.abs(r - v) <= k * 1e-6;
  }
  function markNumeric(answer, value, max) {
    const v = typeof value === 'string' ? { answer: value } : (value || {});
    const raw = latexToText(v.answer != null ? v.answer : (v.latex || '')).trim();
    const working = latexToText([v.working, v.formula].filter(Boolean).join(' '));
    if (!raw && !working.trim()) return { score: 0, max, status: 'unanswered', detail: {} };
    let correct = false, unitWrong = false, partForm = false;
    const st0 = parseNumber(raw);
    for (const f of answer.final || []) {
      if (f.text != null) { if (raw && [].concat(f.text).some(t => caseHit(raw, t) && raw.replace(/[\s{}_]/g, '').length <= String(t).length + 2)) correct = true; continue; }
      if (f.expr != null) { if (raw && algebraSame(raw, f.expr, f.form)) correct = true;
        else if (raw && (f.form || shapeOf(f.expr)) === 'factorised' && /\(/.test(raw) && algebraSame(raw, f.expr, 'any')) partForm = true; continue; }
      if (!st0) continue;
      const su = unitNorm(latexToText(v.unit || '') || st0.unit);
      const listed = f.units || [f.unit || ''];
      const eus = listed.map(unitNorm).filter(Boolean), optional = !eus.length || listed.some(u => unitNorm(u) === '');
      let st = st0, unitOk = su ? (!eus.length || eus.includes(su)) : optional;
      let strictMiss = false;
      if (!unitOk && su) for (const eu of eus) { const k = prefixFactor(su, eu); if (k) { st = Object.assign({}, st0, { n: st0.n * k }); if (f.strict) strictMiss = true; else unitOk = true; break; } }   // strict: right amount in the wrong unit loses the unit mark
      if (f.abs) st = Object.assign({}, st, { n: Math.abs(st.n) });
      let hit;
      if (f.lo != null) { const lo = parseNumber(String(f.lo)), hi = parseNumber(String(f.hi));
        const rg = norm(raw).match(/^\s*(-?\d+(?:\.\d+)?)\s*(?:°?[a-z]*\s*)?(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(.*)$/);
        if (rg) { const a = +rg[1], b = +rg[2]; hit = lo && hi && a >= lo.n - 1e-9 && b <= hi.n + 1e-9; if (!unitOk && rg[3] && (eus.includes(unitNorm(rg[3])))) unitOk = true; }
        else hit = lo && hi && st.n >= lo.n - 1e-9 && st.n <= hi.n + 1e-9; }
      else { const exp = parseNumber(String(f.value)); const e2 = exp && (f.abs ? Object.assign({}, exp, { n: Math.abs(exp.n) }) : exp);
        hit = e2 && (f.exact ? Math.abs(st.n - e2.n) <= Math.abs(e2.n) * 1e-9 || (f.dec3 && st.sig >= 3 && st.sig < 9 && Number(st.n.toPrecision(3)) === Number(e2.n.toPrecision(3))) : f.sf3 ? sf3Equal(st, e2) : numEqual(st, e2) || (f.sf && sfHit(st.n, e2.n, String(f.value)))); }
      if (hit && f.mixed && !/^\s*[-−]?\d+\s+\d+\s*\/\s*\d+/.test(raw)) { partForm = true; continue; }   // 'give your answer as a mixed number': 22/3 is right but not in the form asked
      if (hit) { if (unitOk) correct = true; else unitWrong = true; }
    }
    if (correct) return { score: max, max, status: 'marked', detail: { final: true } };
    let method = 0;
    for (const line of answer.method || []) if (line.split(/\s+OR\s+|\s+or\s+/).some(alt => methodShown(alt, working + ' ; ' + raw))) method++;
    const cap = Math.max(0, max - 1);
    const score = partForm && max >= 2 ? cap : Math.min(cap, method + (unitWrong ? Math.max(0, cap - method) : 0));
    return { score, max, status: 'marked', detail: { final: false, method, unitWrong, partForm } };
  }

  /* how many marks for n right (minus wrong)?  scale: {"3":2,"2":1}; default 1 each, capped at max */
  function ladder(n, max, scale) {
    if (scale) { let best = 0; for (const k in scale) if (n >= +k) best = Math.max(best, scale[k]); return Math.min(max, best); }
    return Math.max(0, Math.min(max, n));
  }
  /* one small answer: text point(s), number, or exact string */
  function cellRight(spec, text, syn) {
    text = latexToText(text || '');
    if (!text.trim()) return false;
    if (typeof spec === 'string' || typeof spec === 'number') spec = { alts: [String(spec)], exact: typeof spec === 'number' || /^[-+]?[\d.]+$/.test(String(spec)) };
    if (spec.final) return markNumeric(spec, { answer: text }, 1).score === 1;
    if (spec.alts && spec.alts.some(x => caseMatters(x, spec))) {
      if (spec.alts.some(x => caseMatters(x, spec) && caseHit(text, x))) return true;
      spec = Object.assign({}, spec, { alts: spec.alts.filter(x => !caseMatters(x, spec)) });
      if (!spec.alts.length) return false;
    }
    if (spec.exact) {
      const a = norm(text).replace(/\s+/g, '').replace(/^0x(?=[0-9a-f]+$)/, '').replace(/(?<=^[0-9a-f]*[a-f][0-9a-f]*)(?:_?16|\(16\))$/, '').replace(/(?<=^[0-9a-f]+)(?:_16|\(16\))$/, '');   // '4F16' / '4F_16' (hex, subscript lost) — but 0816 is a time
      return spec.alts.some(x => { const b = norm(String(x)).replace(/\s+/g, ''); if (a === b) return true; const p = parseNumber(text), q = parseNumber(String(x)); return !!(p && q && !p.unit && !q.unit && p.n === q.n); });
    }
    return pointHit(context(text, syn), spec);
  }

  /* ───────────── symbols whose capitals carry meaning ─────────────
     Chemical formulae (CO2, NaCl, Co vs CO) and genotypes (Tt, tt, XHXh) are compared case-sensitively, so
     "tt" is never accepted for "Tt". A genotype may be written either way round ("tT" = "Tt").
     A spec can force it either way with case:true / case:false. */
  function caseMatters(a, spec) {
    if (spec && spec.case != null) return !!spec.case;
    a = latexToText(String(a)).replace(/[\^{}]/g, '').trim();
    if (!a || /\s/.test(a) || !/[A-Za-z]/.test(a)) return false;
    if (/^ph$/i.test(a)) return false;                           // pH: examiners accept PH, ph
    if (/^([A-Za-z])\1$/i.test(a)) return true;                 // TT, Tt, tt
    if (/[a-z][A-Z]/.test(a)) return true;                      // NaCl, CaCO3, XHXh
    if (/^(?:[A-Z][a-z]?\d*|\(|\)\d*)+(?:\d?[+\-])?$/.test(a) && (/[a-z\d]/.test(a) || a.length === 2)) return true;   // Co, CO, HCl, Fe2O3, SO4 2-
    if (/[A-Z]/.test(a) && /\d/.test(a)) return true;            // H2O, CO2, Fe2O3
    return false;
  }
  const SEXLINK = /^((?:X[A-Za-z]?)|Y)((?:X[A-Za-z]?)|Y)$/;
  function caseHit(text, alt) {
    const t = latexToText(text || '').replace(/[₀-₉]/g, c => SUBS[c]).replace(/\^([A-Za-z])/g, '$1').replace(/[{}]/g, '');
    const a = latexToText(String(alt)).replace(/\s+/g, '').replace(/\^([A-Za-z])/g, '$1').replace(/[{}]/g, '');
    const sl = a.match(SEXLINK);
    if (sl) return t.split(/[^A-Za-z]+/).filter(Boolean).some(w => { const m = w.match(SEXLINK); return w === a || (m && m[1] === sl[2] && m[2] === sl[1]); });
    const words = t.split(/[^A-Za-z0-9()^+\-]+/).filter(Boolean);
    if (t.replace(/\s+/g, '') === a) return true;
    if (/^([A-Za-z])\1$/i.test(a)) return words.some(w => w === a || (w.length === 2 && w[1] + w[0] === a));
    return words.some(w => w === a);
  }

  /* ───────────── algebra: same expression, and in the asked-for form ─────────────
     Two expressions are the same when they agree at several random values of their letters.
     The form follows the model answer unless spec.form says otherwise:
       model factorised  -> the student's must be a product of brackets   ("factorise")
       model has no brackets -> the student's must have none, and no more terms than the model ("expand", "simplify")
     so copying the question ("3(x+2)" for "expand 3(x+2)") never scores. */
  function toJs(s) {
    s = norm(s).replace(/\s+/g, '').replace(/^[a-z]=(?!=)/, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, '(pi)')
      .replace(/sqrt/g, 'q').replace(/\^/g, '**');
    if (/[^0-9a-z.+\-*/()]/.test(s)) return null;
    s = s.replace(/pi/g, 'P');
    // implicit multiplication: 2x, x(…), )(, )x, 2(…), xy
    s = s.replace(/(\d|\))(?=[a-zA-Z(])/g, '$1*').replace(/([a-zA-Z])(?=[a-zA-Z(\d])/g, (m, c, off, str) => c === 'q' && str[off + 1] === '(' ? c : c + '*');
    s = s.replace(/\)(?=\d)/g, ')*');
    return s;
  }
  function evalAt(js, vars) {
    try {
      const names = Object.keys(vars);
      // eslint-disable-next-line no-new-func
      return Function(...names, 'q', 'P', '"use strict"; return (' + js + ');')(...names.map(n => vars[n]), Math.sqrt, Math.PI);
    } catch (e) { return NaN; }
  }
  function topTerms(s) { let d = 0, n = 1; const t = norm(s).replace(/\s+/g, '').replace(/^[a-z]=(?!=)/, '');
    for (let i = 0; i < t.length; i++) { const c = t[i]; if (c === '(') d++; else if (c === ')') d--; else if (!d && (c === '+' || c === '-') && i > 0 && !/[e^*/(]/.test(t[i - 1])) n++; } return n; }
  function wraps(t) { if (t[0] !== '(' || t[t.length - 1] !== ')') return false; let d = 0; for (let i = 0; i < t.length; i++) { if (t[i] === '(') d++; else if (t[i] === ')') d--; if (!d && i < t.length - 1) return false; } return true; }
  function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }
  function fullyFactorised(t) {     // no bracket still holding a common number: 2(2x+6) is not finished
    return (t.match(/\(([^()]*)\)/g) || []).every(b => { const cs = (b.slice(1, -1).match(/(^|[+\-])\d*(?=[a-z]|$|[+\-])|(^|[+\-])\d+/g) || []).map(x => Math.abs(Number(x.replace(/[+\-]/, '')) || 1)); return cs.length < 2 || cs.reduce(gcd) === 1; });
  }
  function shapeOf(s) {
    let t = norm(s).replace(/\s+/g, '').replace(/^[a-z]=(?!=)/, '');
    while (wraps(t)) t = t.slice(1, -1);
    if (!/\(/.test(t)) return 'plain';
    let d = 0, slash = false; for (const c of t) { if (c === '(') d++; else if (c === ')') d--; else if (!d && c === '/') slash = true; }
    const product = /\)\(|\)[\da-z]|[\da-z]\(/.test(t);
    return !slash && product && fullyFactorised(t) && topTerms(t) === 1 && /\([^()]*[a-z][^()]*[+\-][^()]*\)/.test(t) ? 'factorised' : 'other';
  }
  function algebraSame(student, model, form) {
    if (exprCanon(student) === exprCanon(model)) return true;
    const a = toJs(student), b = toJs(model);
    if (!a || !b) return false;
    const letters = [...new Set((a + b).match(/[a-z]/g) || [])].filter(c => c !== 'q');
    if ((a.match(/[a-z]/g) || []).some(c => c !== 'q' && !letters.includes(c))) return false;
    for (let k = 0; k < 6; k++) {
      const vars = {}; letters.forEach((c, i) => { vars[c] = 0.37 + 1.13 * k + 0.71 * i + (k % 2 ? -3.1 : 0); });
      const x = evalAt(a, vars), y = evalAt(b, vars);
      if (!isFinite(x) || !isFinite(y) || Math.abs(x - y) > 1e-7 * Math.max(1, Math.abs(y))) return false;
    }
    if (form === 'any') return true;
    if (form === 'simplest') return norm(student).replace(/[\s()]/g, '').length <= norm(model).replace(/[\s()]/g, '').length + 2;
    const want = form || (shapeOf(model) === 'factorised' ? 'factorised' : null);
    if (want === 'factorised') return shapeOf(student) === 'factorised';
    if (want === 'plain' || want === 'expanded' || want === 'simplified') return shapeOf(student) === 'plain' && topTerms(student) <= topTerms(model);
    return true;
  }

  /* ───────────── chemical equations ─────────────
     answer: { equation:'2H2 + O2 → 2H2O', states?:true, marks?:{formulae,balance,states} }   value: text box
     Symbol equations: right species on each side (formulae, charges), then balanced (any multiple of the model's
     numbers), then state symbols if the question asks for them. Word equations: reactants, then products. */
  function eqSides(text) {
    let s = latexToText(text || '').replace(/[−–—]/g, '-').replace(/⟶|⇌|→|->|=+>?|⟹/g, '→');
    const parts = s.split('→');
    if (parts.length !== 2) return null;
    return parts.map(splitSpecies);
  }
  function splitSpecies(side) {
    const out = []; let cur = '', depth = 0;
    const s = side.trim();
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '(') depth++; if (c === ')') depth--;
      if (c === '+' && depth === 0 && s[i - 1] !== '^') {
        const rest = s.slice(i + 1).trimStart();
        if (rest && /^[A-Za-z0-9(½]/.test(rest) && cur.trim()) { out.push(cur.trim()); cur = ''; continue; }
      }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out.map(species);
  }
  function species(t) {
    let s = t.replace(/\s+/g, ' ').trim().replace(/\s+(\d?[+\-−])$/, '^($1)'), state = null, coef = 1;   // 'Cr2O7 2-' as mark schemes print it
    const st = s.match(/\(\s*(s|l|g|aq)\s*\)\s*$/i); if (st) { state = st[1].toLowerCase(); s = s.slice(0, st.index).trim(); }
    const c = s.match(/^(\d+(?:\.\d+)?|½)\s*(?=[A-Za-z(])/); if (c) { coef = c[1] === '½' ? 0.5 : Number(c[1]); s = s.slice(c[0].length); }
    let charge = '';
    const ch = s.match(/\^\(?(\d*)([+\-])\)?$/) || s.match(/(?<=[A-Za-z)\]])(\d?)([+\-])$/);
    if (ch) { charge = (ch[1] && ch[1] !== '1' ? ch[1] : '') + ch[2]; s = s.slice(0, ch.index); }
    const word = /\s/.test(s) || /^[a-z]{3,}/.test(s);
    return { f: word ? norm(s) : s.replace(/\s+/g, ''), charge, coef, state, word };
  }
  function atomCount(f) {           // H2SO4 -> {H:2,S:1,O:4}, Ca(OH)2 -> {Ca:1,O:2,H:2}
    const stack = [{}]; let m;
    const tokens = f.match(/[A-Z][a-z]?\d*|e\d*|\(|\)\d*|·|\d+/g) || [];
    for (const tk of tokens) {
      if (tk === '(') stack.push({});
      else if (tk[0] === ')') { const n = Number(tk.slice(1) || 1), top = stack.pop(); for (const k in top) stack[stack.length - 1][k] = (stack[stack.length - 1][k] || 0) + top[k] * n; }
      else if ((m = tk.match(/^([A-Z][a-z]?|e)(\d*)$/))) { if (m[1] === 'e') continue; stack[stack.length - 1][m[1]] = (stack[stack.length - 1][m[1]] || 0) + Number(m[2] || 1); }
    }
    return stack[0];
  }
  const key = sp => sp.f + (sp.charge ? '^' + sp.charge : '');
  function sameSet(a, b, ci) { const k = x => ci ? key(x).toLowerCase() : key(x); const A = a.map(k).sort().join('|'), B = b.map(k).sort().join('|'); return A === B; }
  function markEquation(answer, value, max) {
    const text = valueText(value);
    if (!text.trim()) return { score: 0, max, status: 'unanswered', detail: {} };
    const model = eqSides(answer.equation), got = eqSides(text);
    if (!model) return { score: 0, max, status: 'no_answer_key', detail: {} };
    if (!got) return { score: 0, max, status: 'marked', detail: { eq: { arrow: false } } };
    const word = model[0].concat(model[1]).some(s => s.word);
    const d = { arrow: true, word };
    if (word) {
      d.reactants = sameSet(got[0], model[0], true); d.products = sameSet(got[1], model[1], true);
      const n = (d.reactants ? 1 : 0) + (d.products ? 1 : 0);
      return { score: max >= 2 ? Math.min(max, n) : (n === 2 ? max : 0), max, status: 'marked', detail: { eq: d } };
    }
    d.formulae = sameSet(got[0], model[0]) && sameSet(got[1], model[1]);
    if (d.formulae) {
      const ratio = [];
      model.forEach((side, i) => side.forEach(sp => { const g = got[i].find(x => key(x) === key(sp)); ratio.push(g.coef / sp.coef); }));
      d.balanced = ratio.every(r => Math.abs(r - ratio[0]) < 1e-9);
      if (!d.balanced) {   // a different but still balanced set of numbers also counts
        const qOf = sp => sp.charge ? (sp.charge.endsWith('-') ? -1 : 1) * Number(sp.charge.slice(0, -1) || 1) : (sp.f === 'e' ? -1 : 0);
        const tally = side => { const t = { _q: 0 }; side.forEach(sp => { const a = atomCount(sp.f); for (const k in a) t[k] = (t[k] || 0) + a[k] * sp.coef; t._q += qOf(sp) * sp.coef; }); return t; };
        const L = tally(got[0]), R = tally(got[1]); const ks = new Set(Object.keys(L).concat(Object.keys(R)));
        d.balanced = [...ks].every(k => Math.abs((L[k] || 0) - (R[k] || 0)) < 1e-9);
      }
    }
    if (answer.states) {
      d.states = model.every((side, i) => side.every(sp => { const g = got[i].find(x => key(x) === key(sp)); return g && g.state === sp.state; }));
    }
    const parts = [d.formulae, d.formulae && d.balanced].concat(answer.states ? [d.states] : []);
    const n = parts.filter(Boolean).length;
    const score = max >= parts.length ? Math.min(max, n) : (n === parts.length ? max : Math.max(0, Math.min(max, n - (parts.length - max))));
    return { score, max, status: 'marked', detail: { eq: d } };
  }

  /* ───────────── a logic expression written as text ─────────────
     answer: { logic:'(A AND B) OR NOT C' }   full marks when the student's expression has the same truth table */
  function markLogicText(answer, value, max) {
    const text = valueText(value).replace(/^\s*[A-Z]\s*=\s*/, '');
    if (!text.trim()) return { score: 0, max, status: 'unanswered', detail: {} };
    let e, m;
    try { e = parseExpr(text); } catch (err) { return { score: 0, max, status: 'marked', detail: { logic: { error: 'Could not read the expression: ' + err.message } } }; }
    m = parseExpr(answer.logic);
    const vars = [...new Set([...exprVars(e), ...exprVars(m)])].sort();
    let bad = null;
    for (let r = 0; r < 1 << vars.length && !bad; r++) {
      const env = {}; vars.forEach((v, i) => { env[v] = (r >> (vars.length - 1 - i)) & 1; });
      if (evalExpr(e, env) !== evalExpr(m, env)) bad = env;
    }
    if (!bad) return { score: max, max, status: 'marked', detail: { logic: { same: true } } };
    // part marks: each bracketed part of the model (Cambridge: "A XOR B" 1 mark, "B AND NOT C" 1 mark, whole 1 mark)
    const sig = x => rows(vars).map(env => evalExpr(x, env)).join('');
    const mine = new Set(subExprs(e).map(sig));
    const parts = [m.a, m.b].filter(x => x && !x.v);
    const got = parts.filter(x => mine.has(sig(x))).length;
    return { score: Math.min(Math.max(0, max - 1), got), max, status: 'marked', detail: { logic: { same: false, row: bad, parts: parts.length, partsRight: got } } };
  }

  /* ───────────── mcq ─────────────
     answer: { key:'B' } or { keys:['A','C'], scale? }     value: { choice } | { choices:[...] }
     several: marks = (right ticks − wrong ticks), through the scale if given */
  function markMcq(answer, value, max) {
    const up = x => String(x).toUpperCase();
    if (answer.keys) {
      const ch = (value && value.choices) || (value && value.choice ? [value.choice] : []);
      if (!ch.length) return { score: 0, max, status: 'unanswered', detail: {} };
      const keys = new Set(answer.keys.map(up)), got = ch.map(up);
      const right = got.filter(k => keys.has(k)).length, wrong = got.length - right;
      return { score: ladder(right - wrong, max, answer.scale), max, status: 'marked', detail: { right, wrong, correct: answer.keys } };
    }
    const k = value && (value.choice || (value.choices && value.choices[0]));
    if (!k) return { score: 0, max, status: 'unanswered', detail: {} };
    return { score: up(k) === up(answer.key) ? max : 0, max, status: 'marked', detail: { correct: answer.key } };
  }

  /* ───────────── match list ─────────────  answer: { pairs:{leftId:rightId}, scale? }   value: { pairs:{...} } */
  function markMatch(answer, value, max) {
    const got = (value && value.pairs) || {};
    if (!Object.keys(got).length) return { score: 0, max, status: 'unanswered', detail: {} };
    const right = Object.keys(answer.pairs).filter(k => String(got[k]) === String(answer.pairs[k]));
    return { score: ladder(right.length, max, answer.scale), max, status: 'marked', detail: { right, total: Object.keys(answer.pairs).length } };
  }

  /* ───────────── keyed small answers: table cells, figure labels, spots, flowchart boxes ─────────────
     answer: { <field>:{ key: spec }, scheme?:'each'|'row', scale? }   spec = 'text' | number | {alts,...} | {final:[...]} | {exact:true,alts}
     scheme 'row' (tables): a row scores only if every answer cell in it is right.  */
  function markKeyed(field, answer, value, max, opts) {
    const got = (value && value[field]) || {};
    if (!Object.keys(got).some(k => latexToText(got[k] || '').trim())) return { score: 0, max, status: 'unanswered', detail: {} };
    const syn = buildSyn(Object.assign({}, answer.synonyms, opts && opts.synonyms));
    const spec = answer[field] || {};
    const right = [], wrong = [];
    /* sets: answers that may come in any order — [[ [r0c1], [r0c3] ]] for two roots, [[ [r0c1,r0c3], [r1c1,r1c3] ]] for two points.
       Each tuple of the student's boxes is matched to a different tuple of the key. */
    const inSet = new Set();
    (answer.sets || []).forEach(set => {
      const used = new Set(), rest = [];
      set.forEach(tup => {
        tup.forEach(k => inSet.add(k));
        const j = set.findIndex((kt, ji) => !used.has(ji) && kt.every((k, p) => cellRight(spec[k], got[tup[p]], syn)));
        if (j >= 0) { used.add(j); tup.forEach(k => right.push(k)); } else rest.push(tup);
      });
      // tuples with no whole match: each is paired with the unused key tuple it agrees with most, and scores the boxes that agree
      rest.forEach(tup => {
        let best = -1, bestHits = [];
        set.forEach((kt, ji) => {
          if (used.has(ji)) return;
          const hits = tup.filter((k, p) => cellRight(spec[kt[p]], got[k], syn));
          if (best < 0 || hits.length > bestHits.length) { best = ji; bestHits = hits; }
        });
        if (best >= 0) used.add(best);
        tup.forEach(k => (bestHits.includes(k) ? right : wrong).push(k));
      });
    });
    Object.keys(spec).forEach(k => { if (!inSet.has(k)) (cellRight(spec[k], got[k], syn) ? right : wrong).push(k); });
    let n = right.length;
    if (answer.scheme === 'row') {
      const rows = {};
      Object.keys(spec).forEach(k => { const r = (k.match(/^r(\d+)/) || [])[1]; (rows[r] = rows[r] || []).push(k); });
      n = Object.keys(rows).filter(r => rows[r].every(k => right.includes(k))).length;
    }
    return { score: ladder(n, max, answer.scale), max, status: 'marked', detail: { right, wrong, counted: n } };
  }

  /* ───────────── trace tables (and any table marked column by column) ─────────────
     answer: { mode:'trace', columns:{ <col index>:[values top to bottom] }, fixed?:{ rRcC:'value printed in the paper' },
               groups?:[{ cols:[…], marks, oneError? }] }
     value : { cells:{ rRcC:'…' } }
     A column is right when its values, read top to bottom, are the key's: blank cells are skipped and a value written
     again on the next row counts once (examiners accept both). Without groups each column is worth the same share. */
  function traceSame(a, b) {
    const n = x => latexToText(String(x)).replace(/[“”"'‘’″ꞌ]/g, '').replace(/[−–—]/g, '-').replace(/\s+/g, '').toLowerCase();
    const A = n(a), B = n(b);
    if (A === B) return true;
    const p = parseNumber(n(a)), q = parseNumber(n(b));
    return !!(p && q && !p.unit && !q.unit && Math.abs(p.n - q.n) < 1e-9);
  }
  function traceSeq(cells, c) {
    const rows = Object.keys(cells).map(k => k.match(/^r(\d+)c(\d+)$/)).filter(m => m && +m[2] === +c && latexToText(String(cells[m[0]] || '')).trim())
      .map(m => [+m[1], latexToText(String(cells[m[0]])).trim()]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
    return rows.filter((v, i) => i === 0 || !traceSame(v, rows[i - 1]));
  }
  function markTrace(answer, value, max) {
    const got = Object.assign({}, answer.fixed || {}, (value && value.cells) || {});
    if (!Object.keys((value && value.cells) || {}).some(k => latexToText(String(value.cells[k] || '')).trim())) return { score: 0, max, status: 'unanswered', detail: {} };
    const per = {};
    Object.keys(answer.columns || {}).forEach(c => {
      const want = (answer.columns[c] || []).filter((v, i, a) => i === 0 || !traceSame(v, a[i - 1]));
      const have = traceSeq(got, c);
      let wrong = Math.abs(want.length - have.length);
      for (let i = 0; i < Math.min(want.length, have.length); i++) if (!traceSame(want[i], have[i])) wrong++;
      per[c] = { ok: wrong === 0, wrong, want, have };
    });
    const cols = Object.keys(per);
    let score;
    if (answer.groups && answer.groups.length) {
      score = answer.groups.reduce((s, g) => {
        const w = g.cols.reduce((t, c) => t + (per[c] ? per[c].wrong : 0), 0);
        return s + (w === 0 ? g.marks : (g.oneError != null && w === 1 ? g.oneError : 0));
      }, 0);
    } else {
      const right = cols.filter(c => per[c].ok).length;
      score = cols.length === max ? right : right === cols.length ? max : Math.floor(right * max / Math.max(1, cols.length));
    }
    return { score: Math.min(max, score), max, status: 'marked', detail: { columns: per, right: cols.filter(c => per[c].ok).length, of: cols.length } };
  }

  /* ───────────── tick tables: one row per statement, tick the right column(s) ─────────────
     answer: { mode:'ticks', rows:{ "1":[2], "2":[1,2] }, scale? }   value: { cells:{ r1c2:'✓' } }
     A row scores when its ticks are exactly the key's (a row with an extra or missing tick does not). */
  function markTicks(answer, value, max) {
    const got = (value && value.cells) || {};
    const ticked = {};
    Object.keys(got).forEach(k => { const m = k.match(/^r(\d+)c(\d+)$/); if (m && String(got[k] || '').trim()) (ticked[m[1]] = ticked[m[1]] || []).push(+m[2]); });
    if (!Object.keys(ticked).length) return { score: 0, max, status: 'unanswered', detail: {} };
    const right = [], wrong = [];
    Object.keys(answer.rows || {}).forEach(r => { const want = answer.rows[r].slice().sort().join(','), have = (ticked[r] || []).sort().join(','); (want === have ? right : wrong).push(r); });
    return { score: ladder(right.length, max, answer.scale), max, status: 'marked', detail: { right, wrong } };
  }

  /* ───────────── find the errors: line number + correction ─────────────
     answer: { mode:'errors', errors:[{ line:'4', fixes:['IF Age > 18'] }] }   value: { cells:{ r1c1:'4', r1c2:'IF Age > 18 THEN' } }
     Each row scores when its line number is one of the errors (not already used) and the correction contains the
     corrected code (spaces, capitals and <- / = for ← ignored). */
  function codeNorm(x) { return latexToText(String(x || '')).replace(/<-|:=/g, '←').replace(/[“”″]/g, '"').replace(/[‘’ꞌ]/g, "'").replace(/[−–]/g, '-').replace(/\s+/g, '').toLowerCase(); }
  function markErrors(answer, value, max) {
    const got = (value && value.cells) || {};
    const rows = {};
    Object.keys(got).forEach(k => { const m = k.match(/^r(\d+)c(\d+)$/); if (m && latexToText(String(got[k] || '')).trim()) (rows[m[1]] = rows[m[1]] || {})[m[2]] = got[k]; });
    if (!Object.keys(rows).length) return { score: 0, max, status: 'unanswered', detail: {} };
    const used = new Set(), per = [];
    Object.keys(rows).sort((a, b) => a - b).forEach(r => {
      const line = parseInt(latexToText(String(rows[r][1] || '')).replace(/\D+/g, ' ').trim().split(' ')[0], 10), fix = codeNorm(rows[r][2]);
      const k = answer.errors.findIndex((e, i) => !used.has(i) && parseInt(e.line, 10) === line);
      const lineOk = k >= 0, fixOk = lineOk && fix && answer.errors[k].fixes.some(f => fix.includes(codeNorm(f)));
      if (fixOk) used.add(k);
      per.push({ row: +r, line: isNaN(line) ? null : line, lineOk, fixOk });
    });
    return { score: Math.min(max, used.size), max, status: 'marked', detail: { errors: per, found: used.size, of: answer.errors.length } };
  }

  /* ───────────── logic circuits ─────────────
     answer: { expr:'(A AND B) OR NOT C', output?:'Q' }
     value : { gates:[{id,gate}], inputs:[{id,label}], outputs:[{id,label}], wires:[{from:{id,pin},to:{id,pin}}] }
     Full marks when the circuit's truth table equals the expression's. Otherwise one mark for each gate of the
     expected expression whose output function appears somewhere in the student's circuit (max − 1). */
  const GATE = { AND: (a, b) => a & b, OR: (a, b) => a | b, XOR: (a, b) => a ^ b, NAND: (a, b) => 1 - (a & b), NOR: (a, b) => 1 - (a | b), NOT: a => 1 - a };
  function parseExpr(src) {
    const toks = String(src).replace(/[()]/g, ' $& ').replace(/[·.∧]/g, ' AND ').replace(/[+∨]/g, ' OR ').replace(/[⊕]/g, ' XOR ').replace(/[¬~!]/g, ' NOT ').trim().split(/\s+/).filter(Boolean);
    let i = 0;
    const peek = () => (toks[i] || '').toUpperCase();
    function prim() {
      const t = toks[i++];
      if (t === '(') { const e = or(); if (toks[i++] !== ')') throw new Error('missing )'); return e; }
      if (t.toUpperCase() === 'NOT') return { op: 'NOT', a: prim() };
      if (!/^[A-Za-z]\w*$/.test(t || '')) throw new Error('bad token ' + t);
      return { v: t.toUpperCase() };
    }
    function and() { let e = prim(); while (['AND', 'NAND'].includes(peek())) { const op = toks[i++].toUpperCase(); e = { op, a: e, b: prim() }; } return e; }
    function or() { let e = and(); while (['OR', 'NOR', 'XOR'].includes(peek())) { const op = toks[i++].toUpperCase(); e = { op, a: e, b: and() }; } return e; }
    const e = or(); if (i < toks.length) throw new Error('unexpected ' + toks[i]); return e;
  }
  function exprVars(e, out) { out = out || new Set(); if (e.v) out.add(e.v); else { exprVars(e.a, out); if (e.b) exprVars(e.b, out); } return out; }
  function evalExpr(e, env) { return e.v ? env[e.v] : e.op === 'NOT' ? GATE.NOT(evalExpr(e.a, env)) : GATE[e.op](evalExpr(e.a, env), evalExpr(e.b, env)); }
  function subExprs(e, out) { out = out || []; if (!e.v) { subExprs(e.a, out); if (e.b) subExprs(e.b, out); out.push(e); } return out; }
  function rows(vars) { const out = []; for (let m = 0; m < (1 << vars.length); m++) { const env = {}; vars.forEach((v, k) => { env[v] = (m >> (vars.length - 1 - k)) & 1; }); out.push(env); } return out; }
  function circuitTables(value, vars) {            // signature (truth-table string) at every gate output and at each output terminal
    const gates = {}; (value.gates || []).forEach(g => { gates[g.id] = g; });
    const ins = {}; (value.inputs || []).forEach(t => { ins[t.id] = String(t.label).toUpperCase(); });
    const feed = {}; (value.wires || []).forEach(w => { feed[w.to.id + ':' + w.to.pin] = w.from.id; });
    const envs = rows(vars), memo = {};
    function sigOf(id, depth) {
      if (id in memo) return memo[id];
      if (depth > 40) return null;                 // loop
      let r = null;
      if (id in ins) r = vars.includes(ins[id]) ? envs.map(e => e[ins[id]]) : null;
      else if (gates[id]) {
        const g = gates[id], n = g.gate === 'NOT' ? 1 : 2, args = [];
        for (let k = 0; k < n; k++) { const src = feed[id + ':in' + k]; const s = src == null ? null : sigOf(src, depth + 1); if (!s) { args.length = 0; break; } args.push(s); }
        if (args.length === n) r = envs.map((e, x) => (n === 1 ? GATE.NOT(args[0][x]) : GATE[g.gate](args[0][x], args[1][x])));
      }
      memo[id] = r; return r;
    }
    const gateSigs = Object.keys(gates).map(id => sigOf(id, 0)).filter(Boolean).map(s => s.join(''));
    const outs = (value.outputs || []).map(o => { const src = feed[o.id + ':in']; const s = src == null ? null : sigOf(src, 0); return { label: o.label, sig: s ? s.join('') : null }; });
    return { gateSigs, outs };
  }
  function markLogic(answer, value, max) {
    if (!value || !(value.gates || []).length) return { score: 0, max, status: 'unanswered', detail: {} };
    const e = answer.expr ? parseExpr(answer.expr) : null;
    const vars = e ? [...exprVars(e)].sort() : answer.table.vars.map(v => v.toUpperCase());
    const want = e ? rows(vars).map(env => evalExpr(e, env)).join('') : answer.table.out;
    const c = circuitTables(value, vars);
    const out = c.outs.find(o => !answer.output || String(o.label).toUpperCase() === String(answer.output).toUpperCase()) || c.outs[0];
    if (out && out.sig === want) return { score: max, max, status: 'marked', detail: { table: out.sig, expected: want, match: true } };
    if (!e) {                                     // only the truth table is known: part marks for the rows the circuit gets right,
      // and only for a real attempt: the output comes from a gate and every input is used
      const feeds = {}; (value.wires || []).forEach(w => { feeds[w.to.id + ':' + w.to.pin] = w.from.id; });
      const outSrc = out ? feeds[((value.outputs || []).find(o => o.label === out.label) || {}).id + ':in'] : null;
      const ins = (value.inputs || []).filter(t => vars.includes(String(t.label).toUpperCase()));
      const used = new Set((value.wires || []).map(w => w.from.id));
      const real = !!(outSrc && (value.gates || []).some(g => g.id === outSrc) && ins.length === vars.length && ins.every(t => used.has(t.id)));
      const right = real && out && out.sig ? [...want].filter((b, i) => b === out.sig[i]).length : 0, half = want.length / 2;
      return { score: Math.min(Math.max(0, max - 1), Math.floor(Math.max(0, max - 1) * Math.max(0, right - half) / half)), max, status: 'unsure',
        detail: { table: out ? out.sig : null, expected: want, match: false, rowsRight: right, outputWired: !!(out && out.sig) } };
    }
    const subs = subExprs(e).map(s => rows(vars).map(env => evalExpr(s, env)).join(''));
    const pool = c.gateSigs.slice();
    let credit = 0;
    subs.forEach(s => { const k = pool.indexOf(s); if (k >= 0) { credit++; pool.splice(k, 1); } });
    const perGate = max / Math.max(1, subs.length);
    return { score: Math.min(Math.max(0, max - 1), Math.floor(credit * perGate + 1e-9)), max, status: 'marked', detail: { table: out ? out.sig : null, expected: want, match: false, gatesRight: credit, gatesExpected: subs.length, outputWired: !!(out && out.sig) } };
  }

  /* ───────────── plotting ─────────────
     value : { axes:{xmin,xmax,ymin,ymax,xstep,ystep,chosen?}, points:[[x,y]], lines:[{p1,p2,label?}] }
     answer: { points?:{ list:[[x,y]], tol?:[tx,ty], marks, scale? },
               line?:  { gradient:[lo,hi], intercept:[lo,hi], marks } | { through:[[x,y],...], tol?, marks },
               segments?:{ list:[{label, shape:'up'|'down'|'flat', from?:[x,y], to?:[x,y], tol?}], marks, scale? },
               scale?: { data:{xmin,xmax,ymin,ymax}, marks } }       tol default = half the grid step (Cambridge: half a small square) */
  function markPlot(answer, value, max) {
    const v = value || {};
    const pts = v.points || [], lines = v.lines || [];
    if (!pts.length && !lines.length && !v.region) return { score: 0, max, status: 'unanswered', detail: {} };
    const ax = v.axes || {};
    const tol = (t) => t || [(ax.xstep || 1) / (ax.minor || 5) / 2, (ax.ystep || 1) / (ax.minor || 5) / 2];        // half a small square
    const detail = {}; let score = 0;
    if (answer.points) {
      const t = tol(answer.points.tol), used = new Set();
      const right = answer.points.list.filter(p => { const k = pts.findIndex((q, i) => !used.has(i) && Math.abs(q[0] - p[0]) <= t[0] + 1e-9 && Math.abs(q[1] - p[1]) <= t[1] + 1e-9); if (k >= 0) used.add(k); return k >= 0; }).length;
      const extra = pts.length - used.size;
      const m = answer.points.marks;
      const s = answer.points.scale ? ladder(right - extra, m, answer.points.scale) : Math.max(0, m - Math.max(answer.points.list.length - right, extra))        // a misplaced point is one error, not two;
      detail.points = { right, of: answer.points.list.length, extra, score: s }; score += s;
    }
    if (answer.line) {
      const L = answer.line; let ok = false, info = {};
      for (const ln of lines) {
        const dx = ln.p2[0] - ln.p1[0], dy = ln.p2[1] - ln.p1[1];
        if (Math.abs(dx) < 1e-9) continue;
        const g = dy / dx, c = ln.p1[1] - g * ln.p1[0];
        if (L.through) { const t = tol(L.tol); if (L.through.every(p => Math.abs(g * p[0] + c - p[1]) <= t[1] + 1e-9) && (!L.span || (Math.min(ln.p1[0], ln.p2[0]) <= L.span[0] + t[0] && Math.max(ln.p1[0], ln.p2[0]) >= L.span[1] - t[0]))) ok = true; }
        else if (g >= L.gradient[0] - 1e-9 && g <= L.gradient[1] + 1e-9 && (!L.intercept || (c >= L.intercept[0] - 1e-9 && c <= L.intercept[1] + 1e-9))) ok = true;
        info = { gradient: +g.toFixed(3), intercept: +c.toFixed(3) };
        if (ok) break;
      }
      detail.line = Object.assign({ ok }, info); if (ok) score += L.marks;
    }
    if (answer.segments) {
      const S = answer.segments; let right = 0; const per = [];
      const flatTol = ((ax.ymax - ax.ymin) || 10) * 0.03;
      S.list.forEach(sp => {
        const ln = lines.find(l => String(l.label || '').trim().toUpperCase() === String(sp.label).toUpperCase());
        let ok = false;
        if (ln) {
          const a = ln.p1[0] <= ln.p2[0] ? ln.p1 : ln.p2, b = ln.p1[0] <= ln.p2[0] ? ln.p2 : ln.p1, dy = b[1] - a[1];
          const shape = Math.abs(dy) <= flatTol ? 'flat' : dy > 0 ? 'up' : 'down';
          ok = shape === sp.shape && b[0] - a[0] > 1e-9;
          const t = tol(sp.tol);
          if (ok && sp.from) ok = Math.abs(a[0] - sp.from[0]) <= t[0] && Math.abs(a[1] - sp.from[1]) <= t[1];
          if (ok && sp.to) ok = Math.abs(b[0] - sp.to[0]) <= t[0] && Math.abs(b[1] - sp.to[1]) <= t[1];
          if (ok && sp.level != null) ok = Math.abs(a[1] - sp.level) <= t[1];
        }
        per.push({ label: sp.label, ok }); if (ok) right++;
      });
      const s = ladder(right, S.marks, S.scale); detail.segments = { per, score: s }; score += s;
    }
    if (answer.curve) {            // the curve is drawn through the student's own points, so it is credited once enough points are plotted
      const ok = pts.length >= (answer.curve.min || 3);
      detail.curve = { ok }; if (ok) score += answer.curve.marks;
    }
    if (answer.region) {           // inequalities: each boundary drawn (solid or broken as asked), and R in the wanted region
      const t = tol();
      const onLine = (q, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx / t[0], dy / t[1]); return Math.abs(((q[0] - a[0]) * dy - (q[1] - a[1]) * dx) / (t[0] * t[1])) / n <= 1.0001; };
      const sideOf = (q, a, b) => Math.sign((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]));
      const per = answer.region.lines.map(B => { const ln = lines.find(l => onLine(l.p1, B.through[0], B.through[1]) && onLine(l.p2, B.through[0], B.through[1]) && Math.hypot(l.p2[0] - l.p1[0], l.p2[1] - l.p1[1]) > 0);
        return { drawn: !!ln, style: !!ln && !!ln.dashed === !!B.strict }; });
      const R = v.region;
      const inside = !!R && answer.region.lines.every(B => sideOf(R, B.through[0], B.through[1]) === sideOf(B.keep, B.through[0], B.through[1]) && sideOf(R, B.through[0], B.through[1]) !== 0);
      const n = per.filter(p => p.drawn && (answer.region.style === false || p.style)).length + (inside ? 1 : 0);
      const s = ladder(n, answer.region.marks, answer.region.scale);
      detail.region = { per, inside, score: s }; score += s;
    }
    if (answer.scale) {
      const d = answer.scale.data;
      const fx = (d.xmax - d.xmin) / (ax.xmax - ax.xmin), fy = (d.ymax - d.ymin) / (ax.ymax - ax.ymin);
      const covers = ax.xmin <= d.xmin && ax.xmax >= d.xmax && ax.ymin <= d.ymin && ax.ymax >= d.ymax;
      const nice = s => { const m = s / Math.pow(10, Math.floor(Math.log10(s) + 1e-9)); return [1, 2, 5, 10].some(k => Math.abs(m - k) < 1e-6); };
      const ok = !!ax.chosen && covers && fx > 0.5 && fy > 0.5 && nice(ax.xstep) && nice(ax.ystep);
      detail.scale = { ok, covers, usesX: +fx.toFixed(2), usesY: +fy.toFixed(2) }; if (ok) score += answer.scale.marks;
    }
    return { score: Math.min(max, score), max, status: 'marked', detail };
  }

  /* ───────────── economics: adjust a ready diagram ─────────────
     value : { shifts:{D:'left'|'right', S:...}, equilibrium:'D1S' | null }     answer: { shifts:{D:'right'}, marks?:{shift,direction,equilibrium} }
     1 mark right curve(s) and no other, 1 mark direction, 1 mark new equilibrium marked at the right crossing. */
  function markEcon(answer, value, max) {
    const sh = (value && value.shifts) || {};
    if (!Object.keys(sh).length && !(value && value.equilibrium) && !(value && value.labels && Object.keys(value.labels).length)) return { score: 0, max, status: 'unanswered', detail: {} };
    const want = answer.shifts || {};
    const curveOk = Object.keys(want).length === Object.keys(sh).length && Object.keys(want).every(k => k in sh);
    const dirOk = curveOk && Object.keys(want).every(k => sh[k] === want[k]);
    const eqWant = (want.D ? 'D1' : 'D') + (want.S ? 'S1' : 'S');
    const eqOk = curveOk && !!value.equilibrium && value.equilibrium === eqWant;
    const m = Object.assign({ shift: 1, direction: 1, equilibrium: 1, labels: answer.labels ? 1 : 0 }, answer.marks);
    let labelsOk = null;
    if (answer.labels) { const L = (value && value.labels) || {}; labelsOk = Object.keys(answer.labels).every(k => L[k] === answer.labels[k]); }
    const score = (curveOk ? m.shift : 0) + (dirOk ? m.direction : 0) + (eqOk ? m.equilibrium : 0) + (labelsOk ? m.labels : 0);
    return { score: Math.min(max, score), max, status: 'marked', detail: { curveOk, dirOk, eqOk, labelsOk } };
  }

  const MARKERS = {
    text: markPoints, short: markPoints,
    prose: markProse,
    formula: markNumeric, numeric: markNumeric, math: markNumeric,
    mcq: markMcq, match: markMatch,
    table: (a, v, m, o) => (a.mode === 'trace' ? markTrace(a, v, m) : a.mode === 'errors' ? markErrors(a, v, m) : a.mode === 'ticks' ? markTicks(a, v, m) : markKeyed('cells', a, v, m, o)),
    cloze: (a, v, m, o) => markKeyed('blanks', a, v, m, o),
    label: (a, v, m, o) => markKeyed('labels', a, v, m, o),
    place: (a, v, m, o) => markKeyed('spots', a, v, m, o),
    flowfill: (a, v, m, o) => markKeyed('boxes', a, v, m, o),
    logic: markLogic, plot: markPlot, econ: markEcon,
  };
  function mark(ui, answer, value, question, opts) {
    const max = (question && question.marks) || 0;
    if (!answer) return { score: 0, max, status: 'no_answer_key', detail: {} };
    const fn = MARKERS[ui];
    if (!fn) return { score: 0, max, status: 'no_marker', detail: {} };
    if (value == null) return { score: 0, max, status: 'unanswered', detail: {} };
    // self-marked parts (long algorithms, levels-of-response): the student ticks the mark points they met, after seeing them
    if (answer.selfmark && (Array.isArray(value.ticks) || value.self != null)) return selfMark(answer, value, max);
    const r = fn(answer, value, max, opts || {}, question);
    if (answer.selfmark && r.status !== 'unanswered' && !(answer.tests || []).length && !(answer.auto && (answer.auto.tests || []).length)) r.status = 'self_check';
    return r;
  }
  /* answer.selfmark: true, answer.checklist: ['MP1 …', { text, marks }] ; value.ticks: [indexes] or value.self: a total
     A ticked point is worth its marks (default 1); the total never passes max. */
  function selfMark(answer, value, max) {
    const list = answer.checklist || [];
    let score;
    if (value.self != null && !Array.isArray(value.ticks)) score = Math.round(+value.self || 0);
    else score = [...new Set(value.ticks)].filter(i => Number.isInteger(i) && i >= 0 && i < list.length)
      .reduce((s, i) => s + ((list[i] && list[i].marks) || 1), 0);
    return { score: Math.max(0, Math.min(max, score)), max, status: 'self_marked', detail: { ticks: value.ticks || null, self: value.self != null ? +value.self : null } };
  }
  return { mark, latexToText, norm, tokens, parseNumber, exprCanon, parseExpr, markPoints, markProse, markNumeric, markMcq, markMatch, markKeyed, markLogic, markPlot, markEcon, MARKERS, algebraSame, markEquation, markLogicText, caseMatters, markTrace, traceSame, markErrors, markTicks };
});
