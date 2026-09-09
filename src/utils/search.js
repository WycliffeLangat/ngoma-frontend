// Bounded edit distance — walks off early past `max` so a long mismatched
// pair (e.g. a query word against an unrelated field) doesn't cost a full O(n*m) pass.
const boundedLevenshtein = (a, b, max) => {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (!al) return bl;
  if (!bl) return al;
  let prev = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[bl];
};
// Score one query token against one text token: exact/prefix/substring first,
// falling back to typo-tolerant edit distance scaled to the token's length.
const fuzzyTokenScore = (word, q) => {
  if (!word || !q) return 0;
  if (word === q) return 100;
  if (word.startsWith(q)) return 88;
  if (word.includes(q)) return 74;
  // Typo tolerance only kicks in past 3 characters — below that, a single
  // edit distance is too large a fraction of the token and just adds noise.
  if (q.length <= 3) return 0;
  const maxDist = q.length <= 6 ? 1 : q.length <= 9 ? 2 : 3;
  const dist = boundedLevenshtein(word, q, maxDist);
  if (dist > maxDist) return 0;
  return 60 - dist * 14;
};
// Explorative + typo-tolerant match: query tokens each need a decent match
// against some word in the (already-lowercased) search text; score sums the
// best per-token matches so closer/more-complete matches rank higher.
export const fuzzyMatchScore = (searchText, query) => {
  searchText=String(searchText||"").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  query=String(query||"").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  if (!searchText || !query) return 0;
  if (searchText === query) return 200;
  if (searchText.includes(query)) return 100 + query.length;
  const words = searchText.split(/\s+/).filter(Boolean);
  const qTokens = query.split(/\s+/).filter(Boolean);
  let total = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const w of words) {
      const s = fuzzyTokenScore(w, qt);
      if (s > best) best = s;
      if (best === 100) break;
    }
    if (best === 0) return 0;
    total += best;
  }
  return total / qTokens.length;
};
