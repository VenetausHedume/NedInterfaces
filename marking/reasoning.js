/* NedReasoning — marking a written answer the way an examiner reads it (economics 'explain', 'analyse', 'discuss').
   Browser: window.NedReasoning      Node: require('./marking/reasoning.js')

   1. The answer is split into statements: sentences, then clauses joined by 'so', 'which', 'because', 'this means' …
   2. Each statement gets a role: definition · point · explanation (continues the statement before it) · counter ·
      example · judgement.
   3. A statement SAYS a mark-scheme link when it has the link's economic CONCEPTS (with their everyday wordings:
      jobs = employment = workforce) moving the same DIRECTION (up / down). Words from the question itself do not
      count, and hedges ('may', 'likely', 'this') carry no meaning.
   4. Mark-scheme formats:
      chains  'Up to 3 marks for: cut in income tax (1) more disposable income (1) more incentive to work (1)'.
              The first link credited is the point; a later link is the explanation and only counts when it is
              JOINED to an earlier credited link of the same chain (same sentence, or the next statements carrying
              on from it). Chain caps, side caps, 'maximum N for a list-like response', total.
      pairs   'Explain two reasons': 1 mark per reason identified + 1 per reason explained (explanation joined to
              its reason; the scheme's explanations are examples, so a developed explanation joined to a valid
              reason also counts); the best N reasons.
      levels  2023+ 'Discuss' 8-markers marked by level. Each indicative point found is measured by DEPTH: the
              number of reasoning steps joined to it, each bringing in a new economic idea.
              Level 1 (1–2) points only stated · Level 2 (3–5) some development, or one side only ·
              Level 3 (6–8) both sides developed with a chain of reasoning (depth 2+) on at least one; +1 when
              both sides have chains, +1 for a reasoned judgement ('depends on …').
      points  '1 mark for …' statements.
   Measured against 54 real economics scripts with Cambridge examiners' marks (Example Candidate Responses):
   see tests/reasoning.test.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NedReasoning = factory();
})(typeof self !== 'undefined' ? self : this, function () {
const GROUPS = [
  ['employment', 'employ', 'employed', 'employs', 'employing', 'jobs', 'job', 'workforce', 'hire', 'hiring', 'hired', 'recruit', 'take on', 'labour force', 'work force', 'in work', 'more workers', 'employees'],
  ['unemployment', 'unemployed', 'jobless', 'out of work', 'redundant', 'redundancies', 'lay off', 'laid off', 'layoffs'],
  ['output', 'production', 'produce', 'produced', 'producing', 'gdp', 'goods and services produced', 'total output', 'productive potential', 'economic growth', 'growth', 'supply'],
  ['income', 'incomes', 'earnings', 'earn', 'earning', 'wage', 'wages', 'pay', 'paid', 'salary', 'salaries', 'disposable income', 'purchasing power', 'spending power'],
  ['spending', 'spend', 'spends', 'consumption', 'consume', 'purchase', 'purchases', 'buy', 'buying', 'expenditure'],
  ['demand', 'aggregate demand', 'total demand', 'demanded'],
  ['price', 'prices', 'price level', 'expensive', 'cheaper', 'cheap', 'costly'],
  ['cost', 'costs', 'costs of production', 'production costs', 'average cost', 'average costs', 'unit cost'],
  ['firm', 'firms', 'business', 'businesses', 'company', 'companies', 'producer', 'producers', 'enterprise', 'enterprises', 'industry', 'industries'],
  ['tax revenue', 'tax revenues', 'government revenue', 'revenue from tax', 'tax income', 'this revenue', 'the revenue', 'extra revenue'],
  ['tax', 'taxes', 'taxation', 'income tax', 'indirect tax', 'indirect taxes', 'corporation tax', 'vat'],
  ['poverty', 'poor', 'poorer', 'living standards', 'standard of living', 'standards of living', 'quality of life'],
  ['productivity', 'productive', 'efficiency', 'efficient', 'output per worker'],
  ['profit', 'profits', 'profitable'],
  ['health', 'health care', 'healthcare', 'hospitals', 'medical', 'healthy', 'sick', 'illness', 'ill', 'disease', 'diseases'],
  ['education', 'schools', 'school', 'training', 'trained', 'skills', 'skilled', 'skill', 'qualifications', 'qualified', 'educated', 'literacy', 'illiterate'],
  ['benefits', 'state benefits', 'welfare', 'transfer payments', 'pensions', 'subsidies'],
  ['capital', 'machinery', 'machines', 'equipment', 'technology', 'capital equipment'],
  ['invest', 'investment', 'investing', 'invests', 'expand', 'expansion', 'expanding', 'grow the business'],
  ['inflation', 'inflationary', 'rising prices', 'price rises', 'demand-pull', 'cost-push'],
  ['imports', 'import', 'imported'],
  ['exports', 'export', 'exported'],
  ['exchange rate', 'currency', 'value of the currency', 'appreciation', 'depreciation', 'appreciates', 'depreciates'],
  ['interest', 'interest rate', 'interest rates'],
  ['save', 'saving', 'savings', 'savers'],
  ['confidence', 'confident', 'optimistic', 'pessimistic', 'uncertain', 'uncertainty', 'certainty'],
  ['incentive', 'incentives', 'disincentive', 'disincentives', 'motivated', 'motivation', 'willing', 'willingness'],
  ['competitive', 'competitiveness', 'competition', 'uncompetitive', 'compete'],
  ['unevenly', 'unequal', 'inequality', 'distribution', 'distributed', 'gap between rich and poor', 'not everyone', 'only few', 'few people'],
  ['population', 'birth rate', 'death rate', 'life expectancy', 'dependency ratio', 'ageing'],
  ['opportunity cost', 'next best alternative', 'forgone', 'foregone', 'trade-off'],
  ['debt', 'borrow', 'borrowing', 'loan', 'loans'],
  ['current account', 'balance of payments', 'trade balance', 'deficit', 'surplus'],
  ['external cost', 'external costs', 'third party', 'third parties', 'externality', 'externalities', 'negative externalities'],
  ['social cost', 'social costs', 'social benefit', 'social benefits'],
  ['private cost', 'private costs', 'private benefit', 'private benefits'],
  ['shareholders', 'dividends', 'owners'],
  ['market share', 'monopoly', 'dominate', 'larger', 'size', 'grow', 'growth of the firm'],
  ['supply of labour', 'supply of workers', 'few workers', 'shortage of workers', 'limited supply', 'low supply', 'scarce', 'shortage'],
  ['bargaining power', 'trade union', 'trade unions', 'union', 'unions', 'collective bargaining'],
  ['experience', 'experienced'],
  ['elastic', 'elasticity', 'price elastic', 'responsive', 'responsiveness'],
  ['inelastic', 'price inelastic', 'unresponsive'],
  ['substitutes', 'substitute', 'alternatives', 'alternative', 'other products', 'switch'],
  ['luxury', 'luxuries'],
  ['necessity', 'necessities', 'necessary', 'basic', 'essential', 'essentials', 'needs', 'basic necessities', 'daily necessities'],
  ['regressive', 'poor pay a higher proportion', 'harm the poor'],
  ['demerit', 'harmful', 'cigarettes', 'alcohol', 'drugs'],
  ['innovation', 'innovations', 'new ideas', 'new technology', 'advanced technology', 'research and development'],
  ['government spending', 'public spending', 'public expenditure', 'government expenditure', 'spend more on'],
  ['public services', 'public goods', 'infrastructure', 'roads'],
  ['abroad', 'other countries', 'foreign', 'overseas', 'home country'],
];
const UP = /\b(high|increase[sd]?|increasing|rise[sn]?|rising|rose|raise[sd]?|raising|higher|more|greater|grow[sn]?|growing|boost[sed]*|improve[sd]?|improving|expand[sed]*|gain[sed]*|up|larger|bigger|extra|additional|encourage[sd]?|stimulat\w*)\b/;
const DOWN = /\b(low|fallen|lowered|lowering|decrease[sd]?|decreasing|fall[sn]?|falling|fell|reduce[sd]?|reducing|reduction|lower|less|fewer|cut[s]?|drop[sp]?\w*|decline[sd]?|declining|worse|worsen\w*|smaller|lose|loses|loss|discourage[sd]?|harm\w*|damage\w*|weaken\w*)\b/;
const NEG = /\b(not|no|never|cannot|can't|won't|doesn't|don't|isn't|aren't|without|unable|nor)\b/;
const HEDGE = new Set('may might will would could can should likely possibly probably perhaps so this that these those which it they there then also e g eg i e to the a an of in on at by for with as and or be is are was were been being has have had its their his her up from into than such some any if when while e.g. i.e.'.split(' '));

const norm = s => ' ' + String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
const IDX = GROUPS.map(g => g.slice().sort((a, b) => b.length - a.length));

function concepts(text) {
  const t = norm(text), out = [];
  IDX.forEach((g, gi) => { for (const w of g) { const i = t.indexOf(' ' + w + ' '); if (i >= 0) { out.push({ c: gi, at: i, len: w.length }); break; } } });
  return out;
}
// the words not covered by any concept, minus hedges: they must mostly appear too
const stem = w => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/e$/, '');
function rest(text, cs) {
  let t = norm(text);
  IDX.forEach(g => g.forEach(w => { t = t.split(' ' + w + ' ').join('   '); }));
  return t.split(' ').filter(w => w.length > 3 && !HEDGE.has(w) && !UP.test(w) && !DOWN.test(w) && !NEG.test(w)).map(stem);
}
// direction of a concept: the nearest direction word in the same clause
function dirAt(text, c) {
  const t = norm(text);
  const win = t.slice(Math.max(0, c.at - 40), c.at + c.len + 40);
  const up = UP.test(win), down = DOWN.test(win);
  let d = up && !down ? 1 : down && !up ? -1 : 0;
  if (NEG.test(win)) d = -d;
  return d;
}

// question: concepts named in the question itself ('GDP', 'poverty') do not tell one link from another
function same(stmt, link, question) {
  const Q = new Set(question ? concepts(question).map(x => x.c) : []);
  const Lall = concepts(link), S = concepts(stmt);
  // the topic of the question and the subject of the sentence ('firms', often just 'they') do not tell links apart
  let L = Lall.filter(l => !Q.has(l.c)).length ? Lall.filter(l => !Q.has(l.c)) : Lall;
  if (L.some(l => !SUBJECT.has(l.c))) L = L.filter(l => !SUBJECT.has(l.c));
  const qr = new Set(question ? rest(question) : []);
  const lr = rest(link).filter(w => !qr.has(w)), sr = new Set(rest(stmt));
  if (!L.length && !lr.length) {        // a link that is only a direction ('has fallen'): the same direction said
    const d = t => (UP.test(norm(t)) ? 1 : 0) - (DOWN.test(norm(t)) ? 1 : 0);
    return d(link) !== 0 && d(stmt) === d(link);
  }
  const have = L.filter(l => S.some(s => s.c === l.c));
  for (const l of Lall.filter(l => S.some(s => s.c === l.c))) {
    const s = S.find(x => x.c === l.c), dl = dirAt(link, l), ds = dirAt(stmt, s);
    if (dl && ds && dl !== ds) return false;
  }
  const restHit = lr.filter(w => sr.has(w) || [...sr].some(x => x.length > 4 && w.length > 4 && (x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5))))).length;
  if (L.length && !have.length) return false;
  const onlyTopic = Lall.length && Lall.every(l => Q.has(l.c));
  if (onlyTopic && lr.length) return restHit / lr.length >= 0.5;   // 'real GDP …': 'real' must be there
  return (have.length + restHit) / (L.length + lr.length) >= 0.5;
}

const _concepts = concepts;
const SUBJECT = new Set(GROUPS.map((g, i) => (g[0] === 'firm' ? i : -1)).filter(i => i >= 0));
const CONNECT = /^(as|raising|reducing|increasing|lowering|allowing|enabling|creating|giving|helping|so|so that|therefore|thus|hence|as a result|consequently|this|these|that|which|leading to|resulting in|meaning|causing|because|since|as|due to|then|in turn|and so|and this|and therefore|which means|this means|this leads|this will|this would|this could|this may|this can|making)\b/i;
const SPLIT = /\s*(?:;|\s(?=(?:which|if|unless)\s)|\s(?=as (?:it|they|there|the|a|an|this|these|people|firms|workers)\s)|,\s*(?=(?:as|raising|reducing|increasing|lowering|allowing|enabling|creating|giving|helping)\b)|,\s*(?=(?:so|which|therefore|thus|hence|leading|resulting|meaning|causing|making|this|as a result|and so|and this|because)\b)|\s(?=(?:so that|so|therefore|thus|hence|because|as a result|which means|this means|leading to|resulting in|and so|and therefore|and this)\b\s))/i;
const COUNTER = /^(however|on the other hand|but|although|though|whereas|in contrast|nevertheless|yet|alternatively|despite|on the contrary)\b|\b(may not|might not|could not|would not|will not|does not|do not|doesn't|won't|wouldn't|not necessarily|not always)\b/i;
const JUDGE = /^(overall|in conclusion|to conclude|all in all|on balance|in summary|therefore,? (?:it|whether)|whether .* depends|it depends)\b|\b(depends on|it depends|the extent|to some extent|more likely|less likely|in the (?:short|long)[- ](?:run|term))\b/i;
const EXAMPLE = /\b(e\.g|for example|for instance|such as|like)\b/i;
const DEFN = /^(?:an?\s+|the\s+)?[\w\s'’-]{2,40}?\s+(?:is|are|means|refers to|is defined as|is when|occurs when)\s+(?:the|a|an|when|where|how)\b/i;

function statements(text) {
  const out = [];
  const sents = String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z(])/).map(s => s.trim()).filter(Boolean);
  sents.forEach((s, si) => {
    let parts = s.split(SPLIT).map(x => x.trim()).filter(Boolean);
    // a fragment of one or two words ('In long-term,') belongs to the clause after it
    parts = parts.reduce((a, p, i) => { if (a.carry) { p = a.carry + ' ' + p; a.carry = ''; } if (p.split(/\s+/).length <= 2 && i < parts.length - 1) a.carry = p; else a.out.push(p); return a; }, { out: [], carry: '' }).out;
    parts.forEach((p, pi) => {
      const t = p.replace(/^[,;\s]+/, '');
      const kind = pi === 0 && si === 0 && DEFN.test(t) ? 'definition'
        : JUDGE.test(t) && (pi === 0) ? 'judgement'
        : (pi > 0 || CONNECT.test(t)) ? 'explanation'
        : /^(however|on the other hand|but|although|whereas|in contrast|nevertheless|alternatively)\b/i.test(t) ? 'counter'
        : EXAMPLE.test(t) && t.split(/\s+/).length < 12 ? 'example'
        : DEFN.test(t) && si < 2 ? 'definition' : 'point';
      out.push({ text: t, sent: si, part: pi, kind, joined: pi > 0 || CONNECT.test(t) });
    });
  });
  return out;
}

// does one statement say this mark-scheme link? (any of its '/' alternatives, by concepts)
let QTEXT = '';
const cache = new Map();
// 'reduce/degrade the fertility of land / kill off crops': ' / ' separates answers, 'a/b' inside one is either word
function alternatives(link) {
  const out = [];
  const grow = (t) => { if (out.length > 12) return; const m = t.match(/([\w'()-]+)\/([\w'()-]+)/); if (!m) { out.push(t); return; }
    grow(t.slice(0, m.index) + m[1] + t.slice(m.index + m[0].length)); grow(t.slice(0, m.index) + m[2] + t.slice(m.index + m[0].length)); };
  String(link).split(/\s+\/\s+|\s*;\s*/).forEach(a => grow(a.trim()));
  // and the plain pieces between slashes ('high GDP may increase average incomes' / 'living standards'), but not a
  // lone word cut from a longer link ('reduce' from 'reduce/degrade the fertility of land')
  const long = String(link).trim().split(/\s+/).length > 3;
  String(link).split(/\s*\/\s*/).forEach(p => { if (!long || p.trim().split(/\s+/).length >= 2) out.push(p.trim()); });
  return [...new Set(out)].filter(x => x.replace(/[^a-z]/gi, '').length > 2);
}
function says(stmt, link) {
  const k = stmt + '\u0000' + link + '\u0000' + QTEXT;
  if (!cache.has(k)) { if (cache.size > 20000) cache.clear(); cache.set(k, alternatives(link).some(alt => same(stmt, alt, QTEXT))); }
  return cache.get(k);
}

// statement j continues statement i: same sentence, or every statement between them (and j) is joined to the one before
const OPENER = /^(in addition|additionally|also|another|secondly|thirdly|firstly|first|second|third|finally|lastly|moreover|furthermore|however|on the other hand|but|although|in contrast|alternatively|whereas|on the contrary|overall|in conclusion|to conclude|all in all)\b/i;
const _CON = concepts;
// statement k carries on from k-1: joined by a connective, or (a new sentence that is not a new point) picking up
// an economic idea from the statement before it — the way a paragraph develops one point
function linked(S, k) {
  if (S[k].sent === S[k - 1].sent || S[k].joined) return true;
  if (OPENER.test(S[k].text)) return false;
  const q = new Set(QTEXT ? _CON(QTEXT).map(x => x.c) : []);
  const a = new Set(_CON(S[k - 1].text).map(x => x.c).filter(c => !q.has(c)));
  return _CON(S[k].text).some(x => a.has(x.c) && !q.has(x.c));
}
// statement j continues statement i: same sentence, or every statement between them is linked to the one before
function continues(S, i, j) {
  if (j <= i) return false;
  if (S[j].sent === S[i].sent) return true;
  if (S[j].sent - S[i].sent > 3) return false;
  for (let k = i + 1; k <= j; k++) if (!linked(S, k)) return false;
  return true;
}

function markChainsKey(key, text) {
  const S = statements(text);
  const used = new Set();                       // a statement earns at most one link
  const detail = { statements: S.map(s => ({ text: s.text, kind: s.kind })), credited: [] };
  let total = 0, developed = 0;
  const sideScores = [];
  // which side is the candidate arguing? The answer runs in blocks, a new block starting at 'However', 'On the
  // other hand', 'But' …; each block is put on the side of the mark scheme most of its statements match.
  let b = 0; const block = S.map((s, i) => (i && /^(however|on the other hand|but|although|in contrast|alternatively|whereas|nevertheless|on the contrary)\b/i.test(s.text) && s.part === 0 ? ++b : b));
  const sideOfBlock = {};
  if (key.sides.length === 2) {
    for (let k = 0; k <= b; k++) {
      const n = key.sides.map(sd => S.filter((s, i) => block[i] === k && s.kind !== 'definition' && sd.chains.some(ch => ch.links.some(l => says(s.text, l)))).length);
      sideOfBlock[k] = n[0] === n[1] ? -1 : n[0] > n[1] ? 0 : 1;
    }
  }
  const onSide = (i, si) => true || sideOfBlock[block[i]] === -1 || sideOfBlock[block[i]] === si || S[i].kind === 'judgement';
  // Every chain is matched against the answer: its links may be written in any order, each statement earns at most
  // one link, and the links credited must be joined together (one statement carrying on from another). Chains
  // that the answer supports best take their statements first, so a weak match cannot steal a statement that
  // belongs to a fuller chain.
  const defQ = /^\s*(define|state what is meant|what is meant|explain what is meant|explain the meaning)\b/i.test(QTEXT);
  const joinedTo = (a, b) => a === b || continues(S, Math.min(a, b), Math.max(a, b));
  // a statement holds one link, or two when it joins two ideas with 'and' ('so they expand and take on more workers')
  const cap = S.map(x => ((x.text.split(/\s+/).length >= 8 && /\b(and|that|so that|in order to)\b|,\s*\w+ing\b/.test(x.text)) || (x.text.split(/\s+/).length >= 4 && /\b(so|because|which|therefore|leading to|resulting in)\b/i.test(x.text)) ? 2 : 1));
  const usedN = S.map(() => 0);
  const free = (i, at) => usedN[i] + at.filter(a => a === i).length < cap[i];
  const all = [];
  key.sides.forEach((side, si) => side.chains.forEach((ch, ci) => all.push({ si, ci, ch,
    hits: ch.links.map(l => S.map((s, i) => ((s.kind !== 'definition' || defQ || /\bmeans?\b|meaning|is defined|refers to/i.test(l)) && onSide(i, si) && says(s.text, l) ? i : -1)).filter(i => i >= 0)) })));
  function best(c) {
    let top = { got: [], at: [] };
    c.hits.forEach((h0, j0) => h0.filter(i => free(i, [])).forEach(a0 => {
      const got = [j0], at = [a0];
      for (let grew = true; grew;) {
        grew = false;
        for (let j = 0; j < c.ch.links.length; j++) {
          if (got.includes(j)) continue;
          const ok = c.hits[j].find(i => free(i, at) && at.some(a => joinedTo(a, i)));
          if (ok != null) { got.push(j); at.push(ok); grew = true; }
        }
      }
      if (got.length > top.got.length) top = { got, at };
    }));
    return top;
  }
  const sideScore = key.sides.map(() => 0), done = new Set();
  for (;;) {
    let pick = null;
    all.forEach((c, k) => { if (done.has(k)) return; const b = best(c); const sc = Math.min(c.ch.max, b.got.length);
      if (sc && (!pick || sc > pick.sc)) pick = { k, c, b, sc }; });
    if (!pick) break;
    done.add(pick.k); pick.b.at.forEach(i => { used.add(i); usedN[i]++; });
    const { c, b, sc } = pick, order = b.got.map((j, n) => [j, b.at[n]]).sort((x, y) => x[0] - y[0]);
    if (b.got.length >= 2) developed++;
    detail.credited.push({ side: key.sides[c.si].title, links: order.map(x => c.ch.links[x[0]]), at: order.map(x => x[1]), marks: sc, developed: b.got.length >= 2 });
    sideScore[c.si] += sc;
  }
  key.sides.forEach((side, si) => sideScores.push(Math.min(side.max, sideScore[si])));
  total = sideScores.reduce((a, b) => a + b, 0);
  if (key.defn && key.defn.length && S.some(s => s.kind === 'definition')) total += 1;
  total = Math.min(key.marks, total);
  detail.listCapped = !!(key.listMax && !developed && total > key.listMax);
  if (key.listMax && !developed) total = Math.min(total, key.listMax);
  detail.sides = key.sides.map((sd, i) => ({ title: sd.title, max: sd.max, score: sideScores[i] }));
  return { score: total, detail };
}

function markPairs(key, text) {
  const S = statements(text);
  const n = key.pairs.n, R = [];
  const eg = key.pairs.eg !== false;              // the scheme's explanations are examples ('e.g.')
  const reasonAt = new Set();
  key.pairs.ids.forEach((id, k) => {
    const idAt = S.map((s, i) => (says(s.text, id) ? i : -1)).filter(i => i >= 0);
    const ex = key.pairs.expl[k];
    const exAt = ex ? S.map((s, i) => (says(s.text, ex) ? i : -1)).filter(i => i >= 0) : [];
    // an explanation joined to its reason; an explained reason is also identified
    let explained = exAt.find(e => !idAt.length || idAt.some(a => (e === a && S[e].text.split(/\s+/).length >= 8) || (e !== a && continues(S, a, e))));
    // the listed explanations are only examples: a developed explanation joined to the reason also counts
    if (explained == null && eg) explained = idAt.map(a => S.findIndex((s, j) => j > a && continues(S, a, j) && s.joined && s.text.split(/\s+/).length >= 6)).find(j => j >= 0);
    if (explained != null && explained >= 0) explained = explained; else explained = null;
    const at = idAt.length ? idAt[0] : explained;
    if (at != null && reasonAt.has(at) && !(explained != null && !reasonAt.has(explained))) { R.push(0); return; }   // same statement, same reason
    if (at != null) reasonAt.add(at);
    R.push((idAt.length || explained != null ? 1 : 0) + (explained != null ? 1 : 0));
  });
  let s = R.sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0);
  if (key.defn && key.defn.length && S.some(x => x.kind === 'definition')) s += 1;
  return { score: Math.min(key.marks, s), detail: { statements: S.map(x => ({ text: x.text, kind: x.kind })) } };
}

function markPointsKey(key, text) {
  const S = statements(text);
  const got = key.points.filter(p => S.some(s => says(s.text, p)));
  return { score: Math.min(key.marks, got.length), detail: { statements: S.map(x => ({ text: x.text, kind: x.kind })) } };
}

function markEconText(key, text) {
  QTEXT = key.q || '';
  return key.kind === 'chains' ? markChainsKey(key, text) : key.kind === 'pairs' ? markPairs(key, text) : markPointsKey(key, text);
}

/* ───────── level-of-response marking (the 2023+ 'Discuss' 8-markers) ─────────
   Indicative content gives the POINTS on each side. What decides the level is how far each point is DEVELOPED:
   the number of reasoning steps joined to it ('…, so …', 'This means …', 'which leads to …'), each step bringing
   in a NEW economic idea (a step that only repeats the point is not analysis).
     depth 0  point stated                      depth 1  one reason / consequence
     depth 2+ a chain of reasoning (clear and logical analysis)
   Level 1 (1–2): points stated only. Level 2 (3–5): some development, or only one side developed in depth.
   Level 3 (6–8): both sides developed, at least one side as a chain (depth 2+); a reasoned judgement tops it. */
const CON = concepts;
const EVAL = /^(?:however,?\s+|but\s+|so\s+|therefore,?\s+|thus,?\s+)?(?:overall|in conclusion|to conclude|on balance|ultimately|in summary|all in all|to sum up)\b|\b(it depends|depends (?:on|upon)|depend (?:on|upon)|will depend|the extent to which|outweighs?|outweighed|more important than|most important|in the (?:short|long)[- ](?:run|term)\b.{0,80}\b(?:but|however|whereas|while)\b.{0,60}\bin the (?:short|long)[- ](?:run|term)|whether .{0,80}\b(?:depends|will depend))\b/i;
function depthOf(S, i) {
  const seen = new Set(CON(S[i].text).map(c => c.c)); let d = 0;
  for (let j = i + 1; j < S.length && continues(S, i, j); j++) {
    const nc = CON(S[j].text).map(c => c.c).filter(c => !seen.has(c));
    if (nc.length && S[j].text.split(/\s+/).length >= 4) d++;
    nc.forEach(c => seen.add(c));
  }
  return d;
}
function markLevelsText(key, text) {
  QTEXT = key.q || '';
  const S = statements(text);
  const used = new Set(), pts = [];
  key.sides.forEach((side, si) => side.points.forEach((p, pi) => {
    const alts = [].concat(p);
    const at = S.findIndex((s, i) => !used.has(i) && s.kind !== 'definition' && alts.some(a => says(s.text, a)));
    if (at >= 0) { used.add(at); for (let j = at + 1; j < S.length && continues(S, at, j); j++) used.add(j); pts.push({ side: si, point: alts[0], at, depth: depthOf(S, at) }); }
  }));
  const dev = pts.filter(p => p.depth >= 1), deep = pts.filter(p => p.depth >= 2);
  const sidesDev = new Set(dev.map(p => p.side)), sidesDeep = new Set(deep.map(p => p.side));
  // evaluation: a weighing of the two sides or a judgement on what the outcome depends on. Conditions inside the
  // analysis ('especially if demand is inelastic') are not evaluation: examiners hold such answers at Level 2.
  const judged = S.some(s => EVAL.test(s.text));
  let level = 0, score = 0;
  if (!pts.length) level = 0;
  else if (!dev.length) { level = 1; score = pts.length >= 2 ? 2 : 1; }
  else if (key.sides.length >= 2 && sidesDev.size >= 2 && sidesDeep.size >= 1 && judged) {
    level = 3; score = 6 + (sidesDeep.size >= 2 ? 1 : 0) + (deep.length >= 3 ? 1 : 0);
  } else {
    // Level 2: 3 for some explanation; 4 when both sides are explained or one side in depth; 5 needs both sides
    // developed in chains AND a judgement that falls short of Level 3
    level = 2; score = 3 + ((sidesDev.size >= 2 || deep.length >= 1) && dev.length >= 2 ? 1 : 0) + (judged && sidesDeep.size >= 1 && sidesDev.size >= 2 ? 1 : 0);
  }
  return { score: Math.min(key.marks, score), level, points: pts, judged, statements: S,
    detail: { level, judged, levels: key.levels, points: pts.map(p => ({ side: key.sides[p.side].title, point: p.point, at: p.at, depth: p.depth })), statements: S.map(x => ({ text: x.text, kind: x.kind })) } };
}

function mark(key, text) {
  QTEXT = key.q || '';
  const r = key.kind === 'levels' ? markLevelsText(key, text) : markEconText(key, text);
  return r;
}
  return { mark, statements, concepts, same, alternatives, says: (s, l, q) => { QTEXT = q || ''; return says(s, l); } };
});
