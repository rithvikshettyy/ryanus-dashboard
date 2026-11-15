/**
 * Tiny retrieval engine for the support chatbot. No external API and no model:
 * the site's own data is turned into short text "chunks", indexed with BM25 (a classic
 * keyword-ranking formula), and the best-matching chunks are returned as the answer.
 */
export interface Chunk {
  id: string;
  title: string; // "Coal Dumper 03", "WO-2411", ...
  text: string; // one or two plain sentences with the facts
  href: string; // page where the user can see it
  keywords?: string; // extra words that should find this chunk
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "of", "to", "in", "on", "for", "and", "or", "what", "which", "who",
  "how", "do", "does", "did", "i", "me", "my", "we", "can", "show", "tell", "give", "please", "there", "with", "at",
  "by", "from", "it", "this", "that", "be", "as", "now", "currently", "right", "many", "much", "any", "all", "list",
  "about", "need", "want", "get", "has", "have", "s",
]);

// Query-side synonyms: users say "temp", the data says "temperature".
const SYNONYMS: Record<string, string[]> = {
  temp: ["temperature"],
  temperature: ["temp"],
  ob: ["overburden"],
  overburden: ["ob"],
  driver: ["operator"],
  operator: ["driver"],
  diesel: ["fuel"],
  late: ["delayed"],
  delay: ["delayed"],
  broken: ["breakdown"],
  repair: ["maintenance"],
  service: ["maintenance"],
  speeding: ["overspeed"],
  speed: ["overspeed"],
  gps: ["telematics", "signal"],
  location: ["gps"],
  offline: ["signal", "lost"],
  critical: ["urgent"],
  unread: ["active"],
  unacknowledged: ["active"],
  efficiency: ["utilisation", "fuel"],
  cost: ["price"],
  tonne: ["payload"],
  tonnes: ["payload"],
};

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9₹.\s-]/g, " ")
    .split(/[\s-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean)
    .map((t) => (/^\d$/.test(t) ? `0${t}` : t)) // "3" matches vehicle number "03"
    .map(stem)
    .filter((t) => !STOP.has(t));
}

function stem(t: string): string {
  if (t.length > 4 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") && !t.endsWith("us")) return t.slice(0, -1);
  return t;
}

export interface Index {
  chunks: Chunk[];
  docs: { tf: Map<string, number>; len: number }[];
  idf: Map<string, number>;
  avgLen: number;
}

export function buildIndex(chunks: Chunk[]): Index {
  const docs = chunks.map((c) => {
    // title words count double: a match on the name matters more than one in the body
    const toks = [...tokenize(c.title), ...tokenize(c.title), ...tokenize(c.text), ...tokenize(c.keywords ?? "")];
    const tf = new Map<string, number>();
    toks.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    return { tf, len: toks.length };
  });
  const df = new Map<string, number>();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const n = chunks.length;
  const idf = new Map<string, number>();
  df.forEach((f, t) => idf.set(t, Math.log(1 + (n - f + 0.5) / (f + 0.5))));
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(n, 1);
  return { chunks, docs, idf, avgLen };
}

const K1 = 1.4;
const B = 0.7;
const MIN_SCORE = 2.2;

export function search(index: Index, query: string, limit = 3): Hit[] {
  const base = tokenize(query);
  if (base.length === 0) return [];
  const expanded = [...base];
  base.forEach((t) => SYNONYMS[t]?.forEach((s) => expanded.push(stem(s))));
  const q = query.toLowerCase();

  const scored: Hit[] = index.chunks.map((chunk, i) => {
    const d = index.docs[i];
    let score = 0;
    for (const t of new Set(expanded)) {
      const f = d.tf.get(t);
      if (!f) continue;
      const w = base.includes(t) ? 1 : 0.5; // synonyms count half
      score += w * (index.idf.get(t) ?? 0) * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.len) / index.avgLen)));
    }
    // asking for "Coal Dumper 03" by name should beat everything that merely mentions coal
    if (q.includes(chunk.title.toLowerCase())) score += 8;
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top || top.score < MIN_SCORE) return [];
  return scored.filter((h) => h.score >= top.score * 0.6 && h.score >= MIN_SCORE).slice(0, limit);
}
