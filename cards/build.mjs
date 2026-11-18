// Tek kart, üç perde: edit → ship → dash. node fetch-data.mjs && node build.mjs → story.svg
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pano, R, esc, tabanCss, pencere } from "./terminal.mjs";
import { imza } from "./signature.mjs";

const D = dirname(fileURLToPath(import.meta.url));
const V = join(D, "data");
const b64 = (f) => readFileSync(join(D, "fonts", f)).toString("base64");
const FONT = `@font-face{font-family:'OYM';src:url(data:font/woff;base64,${b64("AdwaitaMono-Regular.woff")}) format('woff')}@font-face{font-family:'OYS';src:url(data:font/woff;base64,${b64("FiraSans-Regular.woff")}) format('woff')}`;
const MONO = "'OYM',ui-monospace,monospace", SANS = "'OYS',system-ui,sans-serif";

/* ---------------------------------------------------------------- veri */
const oz = JSON.parse(readFileSync(join(V, "summary.json"), "utf8"));
const onceki = existsSync(join(V, "previous.json")) ? JSON.parse(readFileSync(join(V, "previous.json"), "utf8")) : {};
const repolar = JSON.parse(readFileSync(join(V, "repos.json"), "utf8")).sort((a, b) => b.push.localeCompare(a.push));
const dilBayt = {};
repolar.forEach((r) => Object.entries(r.diller || {}).forEach(([k, v]) => (dilBayt[k] = (dilBayt[k] || 0) + v)));
const dilSira = Object.entries(dilBayt).sort((a, b) => b[1] - a[1]);
const dilTop = dilSira.reduce((a, [, v]) => a + v, 0);

const simdi = new Date(oz.uretildi);
const yerel = (d) => new Date(new Date(d).getTime() + 3 * 3600e3);
const saatDamga = (d) => { const t = yerel(d); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")} ${String(t.getUTCHours()).padStart(2, "0")}:00`; };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const barSaat = (() => { const t = yerel(simdi); return `${MON[t.getUTCMonth()]} ${t.getUTCDate()} ${String(t.getUTCHours()).padStart(2, "0")}:00`; })();
const ago = (iso) => { const g = Math.floor((simdi - new Date(iso)) / 864e5); return g <= 0 ? "today" : g === 1 ? "yesterday" : g < 30 ? `${g} days ago` : g < 60 ? "a month ago" : g < 365 ? `${Math.floor(g / 30)} months ago` : g < 730 ? "a year ago" : `${Math.floor(g / 365)} years ago`; };
const kes = (s, n) => ([...s].length > n ? [...s].slice(0, n - 1).join("") + "…" : s);
const pad = (s, n) => s + " ".repeat(Math.max(0, n - [...s].length));
const DILRENK = { JavaScript: R.yellow, TypeScript: R.blue, Python: R.cyan, Rust: R.orange, Dart: R.cyan, HTML: R.red, CSS: R.magenta, "C#": R.green, EJS: R.red, Shell: R.green };

const yeni = { public_repos: oz.public_repo, commits: oz.commit, stars: oz.yildiz, last_push: oz.son_push || repolar[0].ad, updated_at: saatDamga(simdi) };
let eskiSaat = onceki.uretildi ? saatDamga(onceki.uretildi) : null;
if (!eskiSaat || eskiSaat === yeni.updated_at) eskiSaat = saatDamga(new Date(simdi.getTime() - 3600e3));
const eski = {
  public_repos: onceki.public_repo ?? yeni.public_repos, commits: onceki.commit ?? yeni.commits, stars: onceki.yildiz ?? yeni.stars,
  last_push: onceki.son_push || yeni.last_push, updated_at: eskiSaat,
};

/* ---------------------------------------------------------------- yardımcılar */
const W = 1000, H = 620, FS = 13, LH = 18, CW = FS * 0.6, Y0 = 46, X0 = 22;
let tSon = 0; // en son belirlenir
let T = 30;
const P = (s) => (+Math.max(0, Math.min(100, (s / T) * 100))).toFixed(3);
const KW = new Set(["struct", "fn", "let", "mod", "impl", "use", "pub"]);
const vurgula = (s) => {
  const out = []; const re = /("(?:[^"\\]|\\.)*")|(\b\d+\b)|([A-Za-z_][\w]*!?)|('static)|(\s+)|(.)/gu; let m;
  while ((m = re.exec(s))) {
    const [x, str, num, kel, lt, bos] = m;
    if (str) out.push([x, R.green]); else if (num) out.push([x, R.yellow]); else if (lt) out.push([x, R.magenta]);
    else if (kel) out.push([x, kel.endsWith("!") ? R.magenta : KW.has(kel) ? R.orange : /^[A-Z]|^(u32|str)$/.test(kel) ? R.blue : R.fg]);
    else if (bos) out.push([x, R.fg]); else out.push([x, R.mid]);
  }
  return out;
};
const tsp = (segs) => segs.map(([s, c, b]) => `<tspan fill="${c || R.fg}"${b ? ' font-weight="700"' : ""}>${esc(s)}</tspan>`).join("");
const L = (s) => [...s].length;

/* ---------------------------------------------------------------- perde 1: edit (nvim) */
const stack = ["Next.js", "Prisma", "Tauri", "Rust", "discord.js"];
const alanlar = { public_repos: "num", commits: "num", stars: "num", last_push: "str", updated_at: "str" };
const kod = [
  "mod card;", "",
  "struct Developer {",
  "    name: &'static str,", "    based_in: &'static str,", `    stack: [&'static str; ${stack.length}],`,
  "    public_repos: u32,", "    commits: u32,", "    stars: u32,", "    last_push: &'static str,", "    updated_at: &'static str,",
  "}", "",
  "fn main() {",
  "    let oktay = Developer {",
  '        name: "Oktay Yavuz",', '        based_in: "Türkiye",',
  `        stack: [${stack.map((s) => `"${s}"`).join(", ")}],`,
  ...Object.entries(alanlar).map(([k, tip]) => `        ${k}: @${k}@,`),
  "    };",
  "    card::render(&oktay);",
  "}",
];
const G = 5; // oluk: "  1  "
const yKod = (i) => Y0 + (i + 1) * LH - 4;
const duzenler = []; // {satir, onekCol, eski, yeni, tip}
let t = 0.9;
let nvim = "", css = "";
const imlecDur = []; // [t, x, y, timing?]
imlecDur.push([0.2, G * CW, yKod(0)]);
kod.forEach((k, i) => {
  const no = `<tspan fill="${R.dim}">${String(i + 1).padStart(3)}  </tspan>`;
  const m = k.match(/^(\s*)(\w+): @(\w+)@,$/);
  if (!m) { nvim += `<text x="0" y="${yKod(i)}" class="tx" xml:space="preserve">${no}${tsp(vurgula(k))}</text>`; return; }
  const [, ind, ad] = m, tip = alanlar[ad];
  const q = tip === "str" ? '"' : "";
  const onek = `${ind}${ad}: ${q}`, ev = String(eski[ad]), yv = String(yeni[ad]);
  const onekSeg = [...vurgula(`${ind}${ad}: `), ...(q ? [[q, R.green]] : [])];
  const renk = tip === "str" ? R.green : R.yellow;
  const sonek = [...(q ? [[q, R.green]] : []), [",", R.mid]];
  const x0 = (G + L(onek)) * CW, y = yKod(i);
  nvim += `<text x="0" y="${y}" class="tx" xml:space="preserve">${no}${tsp(onekSeg)}</text>`;
  if (ev === yv && ad !== "updated_at") {
    nvim += `<text x="${x0}" y="${y}" class="tx" xml:space="preserve">${tsp([[yv, renk], ...sonek])}</text>`;
    return;
  }
  const tm = t, td0 = tm + 0.45, td1 = td0 + L(ev) * 0.04, td2 = td1 + 0.15 + L(yv) * 0.085;
  const id = `d${i}`;
  css += `@keyframes ${id}o{0%,${P(td0)}%{width:${(L(ev) * CW + 1).toFixed(1)}px}${P(td1)}%,100%{width:0}}`;
  css += `@keyframes ${id}n{0%,${P(td1 + 0.15)}%{width:0}${P(td2)}%,100%{width:${(L(yv) * CW + 1).toFixed(1)}px}}`;
  css += `@keyframes ${id}s{0%,${P(td0)}%{transform:translateX(0);animation-timing-function:steps(${L(ev)},end)}${P(td1)}%{transform:translateX(${(-L(ev) * CW).toFixed(1)}px)}${P(td1 + 0.15)}%{transform:translateX(${(-L(ev) * CW).toFixed(1)}px);animation-timing-function:steps(${L(yv)},end)}${P(td2)}%,100%{transform:translateX(${((L(yv) - L(ev)) * CW).toFixed(1)}px)}}`;
  nvim += `<clipPath id="${id}oc"><rect x="${x0}" y="${y - LH + 4}" height="${LH}" style="animation:${id}o ${T}s steps(${L(ev)},end) infinite both"/></clipPath>`;
  nvim += `<clipPath id="${id}nc"><rect x="${x0}" y="${y - LH + 4}" height="${LH}" width="0" style="animation:${id}n ${T}s steps(${L(yv)},end) infinite both"/></clipPath>`;
  nvim += `<text x="${x0}" y="${y}" class="tx" xml:space="preserve" clip-path="url(#${id}oc)">${tsp([[ev, renk]])}</text>`;
  nvim += `<text x="${x0}" y="${y}" class="tx" xml:space="preserve" clip-path="url(#${id}nc)">${tsp([[yv, renk]])}</text>`;
  nvim += `<text x="${x0 + L(ev) * CW}" y="${y}" class="tx" xml:space="preserve" style="animation:${id}s ${T}s linear infinite both">${tsp(sonek)}</text>`;
  imlecDur.push([tm, x0 + L(ev) * CW, y, `steps(1,end)`], [td0, x0 + L(ev) * CW, y, `steps(${L(ev)},end)`], [td1, x0, y, "steps(1,end)"], [td1 + 0.15, x0, y, `steps(${L(yv)},end)`], [td2, x0 + L(yv) * CW, y]);
  duzenler.push({ satir: i + 1, onek, ev, yv, sonekStr: `${q},`, td0, td2 });
  t = td2 + 0.5;
});
// :wq
const yCmd = Y0 + kod.length * LH + 34;
const tC0 = t + 0.2, tW = tC0 + 3 * 0.16;
css += `@keyframes wq{0%,${P(tC0)}%{width:0}${P(tW)}%,100%{width:${(3 * CW + 1).toFixed(1)}px}}`;
nvim += `<clipPath id="wqc"><rect x="0" y="${yCmd - LH + 4}" height="${LH}" width="0" style="animation:wq ${T}s steps(3,end) infinite both"/></clipPath><text x="0" y="${yCmd}" class="tx" clip-path="url(#wqc)">${tsp([[":wq", R.fg]])}</text>`;
imlecDur.push([tC0, 0, yCmd, "steps(3,end)"], [tW, 3 * CW, yCmd]);
const tShip = tW + 0.55;
// mod çubuğu
const ins = duzenler.map((d) => [d.td0 - 0.05, d.td2 + 0.1]);
const yBar = Y0 + kod.length * LH + 8;
let insKf = `@keyframes ins{0%{opacity:0}`; ins.forEach(([a, b]) => (insKf += `${P(a - 0.01)}%{opacity:0}${P(a)}%{opacity:1}${P(b)}%{opacity:1}${P(b + 0.01)}%{opacity:0}`)); insKf += `100%{opacity:0}}`;
css += insKf;
nvim += `<rect x="0" y="${yBar}" width="${W - 2 * X0}" height="20" fill="#17191f"/>
<rect x="0" y="${yBar}" width="72" height="20" fill="${R.blue}"/><text x="10" y="${yBar + 14.5}" style="font:700 11.5px ${MONO};fill:#0f1014">NORMAL</text>
<g style="animation:ins ${T}s linear infinite both"><rect x="0" y="${yBar}" width="72" height="20" fill="${R.green}"/><text x="10" y="${yBar + 14.5}" style="font:700 11.5px ${MONO};fill:#0f1014">INSERT</text></g>
<text x="84" y="${yBar + 14.5}" class="tx" style="font-size:12px" xml:space="preserve">${tsp([["src/main.rs", R.fg]])}</text>
<text x="${W - 2 * X0 - 10}" y="${yBar + 14.5}" text-anchor="end" class="tx" style="font-size:12px" xml:space="preserve">${tsp([["utf-8  rust", R.mid]])}</text>`;
// nvim imleci
let ck = `@keyframes nc{0%{opacity:0;transform:translate(0px,${yKod(0)}px)}`;
imlecDur.forEach(([tt, x, y, tf], i) => {
  const prev = i ? imlecDur[i - 1] : null;
  if (prev && !prev[3]?.startsWith("steps(1")) ck += `${P(tt - 0.002)}%{opacity:1;transform:translate(${prev[1].toFixed(1)}px,${prev[2] - LH + 4}px)}`;
  ck += `${P(tt)}%{opacity:1;transform:translate(${x.toFixed(1)}px,${y - LH + 4}px)${tf ? `;animation-timing-function:${tf}` : ""}}`;
});
const sonI = imlecDur.at(-1);
ck += `${P(tShip - 0.002)}%{opacity:1;transform:translate(${sonI[1].toFixed(1)}px,${sonI[2] - LH + 4}px)}${P(tShip)}%,100%{opacity:0;transform:translate(0px,0px)}}`;
css += ck;
nvim += `<g style="animation:nc ${T}s linear infinite both"><rect x="0" y="2" width="${CW}" height="${LH - 3}" fill="${R.fg}" class="bl"/></g>`;

/* ---------------------------------------------------------------- perde 2: ship (git) */
const gp = new Pano({ id: "g", x: X0, y: Y0, cols: 120, rows: 29, FS, LH, T: 0 });
const prompt = (yol) => [["oktay", R.green, 1], ["@", R.mid], ["cachyos", R.blue, 1], [" " + yol, R.cyan], ["> ", R.fg]];
let g = tShip + 0.25;
g = gp.satir(g, prompt("~/profile"), [["git diff -U0", R.fg]], { hiz: 0.06 });
g += 0.25;
const diff = [
  [["diff --git a/src/main.rs b/src/main.rs", R.white, 1]],
  [["--- a/src/main.rs", R.white, 1]],
  [["+++ b/src/main.rs", R.white, 1]],
];
duzenler.forEach((d) => {
  diff.push([[`@@ -${d.satir} +${d.satir} @@`, R.cyan], [" fn main() {", R.mid]]);
  diff.push([[`-${d.onek}${d.ev}${d.sonekStr}`, R.red]]);
  diff.push([[`+${d.onek}${d.yv}${d.sonekStr}`, R.green]]);
});
g = gp.cikti(g, diff, 0.06);
gp.satir(g + 0.1, []);
g = gp.satir(g + 0.45, prompt("~/profile"), [["git commit -qam \"chore: hourly refresh\"", R.fg]], { hiz: 0.045 });
g = gp.satir(g + 0.35, prompt("~/profile"), [["git push -q", R.fg]], { hiz: 0.06 });
g += 0.7;
const tDash = g + 0.2;
gp.temizle(tDash);

/* ---------------------------------------------------------------- perde 3: dash (üç bölme) */
const lp = new Pano({ id: "l", x: X0, y: Y0, cols: 72, rows: 29, FS, LH, T: 0 });
const rt = new Pano({ id: "r", x: 604, y: Y0, cols: 48, rows: 13, FS, LH, T: 0 });
const rb = new Pano({ id: "b", x: 604, y: Y0 + 14 * LH + 8, cols: 48, rows: 15, FS, LH, T: 0 });
let a = lp.satir(tDash + 0.3, prompt("~/profile"), [["cargo run -q", R.fg]], { hiz: 0.07 });
a += 0.4;
const IW = 62;
const satir = (etiket, deger, renk = R.fg) => [["│ ", R.dim], [pad(etiket, 9), R.orange, 1], [pad(kes(deger, IW - 11), IW - 10), renk], ["│", R.dim]];
const kutu = [
  [["╭─ ", R.dim], ["oktay", R.green, 1], [" " + "─".repeat(IW - 8) + "╮", R.dim]],
  [["│ ", R.dim], [pad("Oktay Yavuz", IW - 1), R.white, 1], ["│", R.dim]],
  [["│ ", R.dim], [pad("full-stack developer · based in Türkiye", IW - 1), R.mid], ["│", R.dim]],
  [["│", R.dim], [" ".repeat(IW), R.fg], ["│", R.dim]],
  satir("stack", stack.join(" · "), R.cyan),
  satir("github", `${yeni.public_repos} repos · ${yeni.commits} commits · ★ ${yeni.stars}`),
  satir("langs", dilSira.slice(0, 4).map(([k]) => k).join(" · ")),
  satir("latest", `${yeni.last_push} · ${ago(repolar[0].push)}`, R.yellow),
  satir("updated", yeni.updated_at, R.mid),
  [["╰" + "─".repeat(IW) + "╯", R.dim]],
];
a = lp.cikti(a, kutu, 0.07);
const tk = existsSync(join(V, "calendar.json")) ? JSON.parse(readFileSync(join(V, "calendar.json"), "utf8")) : null;
if (tk) {
  const g = tk.gunler, yil = g.slice(-365);
  let enUzun = 0, seri = 0;
  g.forEach((d) => { seri = d.contributionCount > 0 ? seri + 1 : 0; enUzun = Math.max(enUzun, seri); });
  let simdiki = 0;
  for (let i = g.length - 1 - (g.at(-1).contributionCount ? 0 : 1); i >= 0 && g[i].contributionCount > 0; i--) simdiki++;
  const enYogun = yil.reduce((m, d) => (d.contributionCount > m.contributionCount ? d : m), yil[0]);
  const ed = new Date(enYogun.date + "T00:00:00Z");
  const gun = (n) => `${n} day${n === 1 ? "" : "s"}`;
  lp.satir(a + 0.2, []);
  a = lp.satir(a + 0.5, prompt("~/profile"), [["streak", R.fg]], { hiz: 0.07 });
  a = lp.cikti(a + 0.3, [
    [[pad("current streak", 17), R.orange, 1], [gun(simdiki), R.fg]],
    [[pad("longest streak", 17), R.orange, 1], [gun(enUzun), R.fg]],
    [[pad("active days", 17), R.orange, 1], [`${yil.filter((d) => d.contributionCount > 0).length} / 365`, R.fg]],
    [[pad("busiest day", 17), R.orange, 1], [`${MON[ed.getUTCMonth()]} ${ed.getUTCDate()} · ${enYogun.contributionCount} contributions`, R.fg]],
    [[pad("past year", 17), R.orange, 1], [`${tk.toplam} contributions`, R.green]],
  ], 0.08);
}
lp.satir(a + 0.3, prompt("~/profile"), [], { imlec: true });
let u = rt.satir(tDash + 0.9, [["~", R.cyan], ["> ", R.fg]], [["langs --bytes", R.fg]], { hiz: 0.06 });
u += 0.3;
dilSira.slice(0, 8).forEach(([k, v]) => {
  const n = Math.max(1, Math.round((v / dilSira[0][1]) * 25));
  u = rt.satir(u + 0.04, [[pad(k, 11), DILRENK[k] || R.fg]], [["█".repeat(n), DILRENK[k] || R.fg], [" " + ((v / dilTop) * 100).toFixed(1) + "%", R.mid]], { hiz: 0.022 });
});
let w = rb.satir(tDash + 1.5, [["~/code", R.cyan], ["> ", R.fg]], [["recent-pushes", R.fg]], { hiz: 0.06 });
w = rb.cikti(w + 0.3, repolar.slice(0, 12).map((r) => [
  [pad(r.son?.sha || "-------", 9), R.yellow], [pad(kes(r.ad, 21), 23), DILRENK[r.dil] || R.blue], [ago(r.push), R.dim],
]), 0.07);
/* ---------------------------------------------------------------- perde 4: graph (GitHub katkı tablosu, lazer) */
const tGraph = Math.max(a, u, w) + 4.5;
[lp, rt, rb].forEach((p) => p.temizle(tGraph));
const cp = new Pano({ id: "c", x: X0, y: Y0, cols: 120, rows: 2, FS, LH, T: 0 });
const tGrid = cp.satir(tGraph + 0.3, prompt("~/profile"), [["gh contrib --year", R.fg]], { hiz: 0.06 }) + 0.35;
const tA0 = tGrid + 0.6, tA1 = tA0 + 3.0, tB0 = tA1 + 0.4, tB1 = tB0 + 2.2, tW0 = tB1 + 0.35, tW1 = tW0 + 4.4;
T = Math.ceil(tW1 + 4);
[gp, lp, rt, rb, cp].forEach((p) => (p.T = T));

const graf = (() => {
  if (!tk) return { css: "", svg: "" };
  const Pg = (s) => ((s / T) * 100).toFixed(3);
  const N = 53, KAT = 4;
  const haftalar = [];
  if (tk.gunler.every((d) => d.col !== undefined)) {
    tk.gunler.forEach((d) => { while (haftalar.length <= d.col) haftalar.push(Array(7).fill(null)); haftalar[d.col][d.row] = d; });
  } else {
    tk.gunler.forEach((d, i) => { const gd = new Date(d.date + "T00:00:00Z").getUTCDay(); if (i === 0 || gd === 0) haftalar.push(Array(7).fill(null)); haftalar.at(-1)[gd] = d; });
  }
  const H53 = haftalar.slice(-N);
  while (H53.length < N) H53.unshift(Array(7).fill(null));
  const SEV = { NONE: "#161b22", FIRST_QUARTILE: "#0e4429", SECOND_QUARTILE: "#006d32", THIRD_QUARTILE: "#26a641", FOURTH_QUARTILE: "#39d353" };
  const SEVS = Object.values(SEV);
  const LZ = "#ff5f56";
  const bx = 30, bw = W - 60, by = 196, pd = 16, dayW = 34;
  const p = (bw - 2 * pd - dayW) / N, cell = p - 3.2, q = p / KAT;
  const gx = bx + pd + dayW, gy = by + 34, gw = N * p, gh = 7 * p;
  const cx = (c) => gx + c * p, cy = (r) => gy + r * p;
  let s = "", css = "";
  const gunler = tk.gunler.slice(-365), aktif = gunler.filter((d) => d.contributionCount > 0).length;
  const enIyi = gunler.reduce((m, d) => (d.contributionCount > m.contributionCount ? d : m), gunler[0]);
  const eiT = new Date(enIyi.date + "T00:00:00Z");
  css += `@keyframes bas1{0%,${Pg(tA1)}%{opacity:1}${Pg(tA1 + 0.01)}%,100%{opacity:0}}@keyframes bas2{0%,${Pg(tA1)}%{opacity:0}${Pg(tA1 + 0.01)}%,${Pg(T - 0.5)}%{opacity:1}${Pg(T - 0.45)}%,100%{opacity:0}}`;
  s += `<text x="${bx}" y="${by - 14}" style="font:15px ${SANS};fill:#9198a1;animation:bas1 ${T}s linear infinite both">Scanning contributions…</text>`;
  s += `<text x="${bx}" y="${by - 14}" style="font:15px ${SANS};fill:#f0f6fc;opacity:0;animation:bas2 ${T}s linear infinite both">${tk.toplam} contributions in the last year</text>`;
  css += `@keyframes ozt{0%,${Pg(tA1)}%{opacity:0}${Pg(tA1 + 0.3)}%,${Pg(T - 0.5)}%{opacity:1}${Pg(T - 0.45)}%,100%{opacity:0}}`;
  s += `<text x="${bx + bw}" y="${by - 14}" text-anchor="end" style="font:12.5px ${MONO};fill:${LZ};opacity:0;animation:ozt ${T}s linear infinite both" xml:space="preserve">scan complete · ${aktif} active days · peak ${MON[eiT.getUTCMonth()]} ${eiT.getUTCDate()}</text>`;
  s += `<rect x="${bx + 0.5}" y="${by + 0.5}" width="${bw - 1}" height="${gh + 82}" rx="6" fill="#0d1117" stroke="#3d444d"/>`;
  // ay etiketleri ve ay aralıkları (lazerin üstündeki etiket için)
  let onceki = -1, sonEtiket = -9;
  const aySutun = [];
  H53.forEach((h, c) => {
    const ilk = h.find(Boolean); if (!ilk) return;
    const dt = new Date(ilk.date + "T00:00:00Z"), ay = dt.getUTCMonth();
    if (ay !== onceki) { aySutun.push([c, `${MON[ay].toUpperCase()} ${dt.getUTCFullYear()}`]); if (c - sonEtiket >= 3) { s += `<text x="${cx(c).toFixed(1)}" y="${gy - 9}" style="font:12px ${SANS};fill:#9198a1">${MON[ay]}</text>`; sonEtiket = c; } onceki = ay; }
  });
  [[1, "Mon"], [3, "Wed"], [5, "Fri"]].forEach(([r, n]) => (s += `<text x="${bx + pd}" y="${(cy(r) + cell - 1.5).toFixed(1)}" style="font:12px ${SANS};fill:#9198a1">${n}</text>`));
  H53.forEach((h, c) => h.forEach((d, r) => { if (d) s += `<rect x="${cx(c).toFixed(1)}" y="${cy(r).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="2.5" fill="${SEV.NONE}" stroke="#ffffff0d"/>`; }));
  const fy = gy + gh + 30;
  s += `<text x="${gx}" y="${fy}" style="font:12px ${SANS};fill:#9198a1">Learn how we count contributions</text>`;
  const lx = bx + bw - pd - 5 * (cell + 4) - 34;
  s += `<text x="${lx - 8}" y="${fy}" text-anchor="end" style="font:12px ${SANS};fill:#9198a1">Less</text>`;
  SEVS.forEach((rk, i) => (s += `<rect x="${(lx + i * (cell + 4)).toFixed(1)}" y="${(fy - cell + 2).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="2.5" fill="${rk}" stroke="#ffffff0d"/>`));
  s += `<text x="${(lx + 5 * (cell + 4) + 4).toFixed(1)}" y="${fy}" style="font:12px ${SANS};fill:#9198a1">More</text>`;

  // 1. geçiş: soldan sağa okuma. Işının geçtiği kareler kırmızı yanıp söner, iz bırakarak sönümlenir.
  const L0 = gx - 12, L1 = gx + gw + 9;
  const xZ = (x, a0, a1, ters) => a0 + (ters ? (L1 - x) : (x - L0)) / (L1 - L0) * (a1 - a0);
  H53.forEach((h, c) => {
    const tc = xZ(cx(c) + cell / 2, tA0, tA1, false);
    const renkli = h.map((d, r) => (d && d.contributionLevel !== "NONE" ? `<rect x="${cx(c).toFixed(1)}" y="${cy(r).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="2.5" fill="${SEV[d.contributionLevel] || SEV.NONE}" stroke="#ffffff0d"/>` : "")).join("");
    if (renkli) {
      css += `@keyframes v${c}{0%,${Pg(tc)}%{opacity:0}${Pg(tc + 0.12)}%,${Pg(T - 0.5)}%{opacity:1}${Pg(T - 0.45)}%,100%{opacity:0}}`;
      s += `<g style="opacity:0;animation:v${c} ${T}s linear infinite both">${renkli}</g>`;
    }
    css += `@keyframes f${c}{0%,${Pg(tc - 0.03)}%{opacity:0}${Pg(tc)}%{opacity:.75}${Pg(tc + 0.7)}%,100%{opacity:0}}`;
    s += `<g style="opacity:0;animation:f${c} ${T}s ease-out infinite both">${h.map((d, r) => (d ? `<rect x="${cx(c).toFixed(1)}" y="${cy(r).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="2.5" fill="none" stroke="${LZ}" stroke-width="1.4"/>` : "")).join("")}</g>`;
  });
  // 2. geçiş: sağdan sola. Arkasında kareler 4×4 ince piksele bölünür.
  css += `@keyframes bol{0%,${Pg(tB0)}%{transform:translateX(0)}${Pg(tB1)}%,100%{transform:translateX(${(-(L1 - L0)).toFixed(1)}px)}}`;
  s += `<defs><pattern id="ince" x="${gx}" y="${gy}" width="${q.toFixed(3)}" height="${q.toFixed(3)}" patternUnits="userSpaceOnUse"><rect width="${(q - 0.9).toFixed(2)}" height="${(q - 0.9).toFixed(2)}" rx=".6" fill="#161b22"/></pattern>
<clipPath id="bolc"><rect x="${L1}" y="${gy - 4}" width="${(L1 - L0).toFixed(1)}" height="${gh + 8}" style="animation:bol ${T}s linear infinite both"/></clipPath></defs>`;
  css += `@keyframes ibas{0%,${Pg(tB0 - 0.01)}%{opacity:0}${Pg(tB0)}%,${Pg(T - 0.5)}%{opacity:1}${Pg(T - 0.45)}%,100%{opacity:0}}`;
  s += `<g clip-path="url(#bolc)" style="opacity:0;animation:ibas ${T}s linear infinite both"><rect x="${gx - 2}" y="${gy - 2}" width="${gw + 2}" height="${gh + 2}" fill="#0d1117"/><rect x="${gx}" y="${gy}" width="${(N * KAT * q).toFixed(1)}" height="${(7 * KAT * q).toFixed(1)}" fill="url(#ince)"/></g>`;

  // 3. kalem: ışın bir noktaya döner ve OktayYavuz'u yazar
  const { pikseller, kalem } = imza(N * KAT, 7 * KAT);
  const KOVA = 90, kova = new Map();
  pikseller.forEach((px) => { const k = Math.min(KOVA - 1, Math.floor(px.t * KOVA)); if (!kova.has(k)) kova.set(k, []); kova.get(k).push(px); });
  [...kova.entries()].forEach(([k, list]) => {
    const tk0 = tW0 + (k / KOVA) * (tW1 - tW0);
    css += `@keyframes w${k}k{0%,${Pg(tk0)}%{opacity:0}${Pg(tk0 + 0.12)}%,${Pg(T - 0.5)}%{opacity:1}${Pg(T - 0.45)}%,100%{opacity:0}}`;
    s += `<g style="opacity:0;animation:w${k}k ${T}s linear infinite both">${list.map((px) => `<rect x="${(gx + px.c * q).toFixed(1)}" y="${(gy + px.r * q).toFixed(1)}" width="${(q - 0.9).toFixed(2)}" height="${(q - 0.9).toFixed(2)}" rx=".6" fill="${SEVS[px.seviye]}"/>`).join("")}</g>`;
  });
  const kAd = kalem.filter((_, i) => i % 3 === 0 || kalem[i].kalk);
  let pk = `@keyframes kalem{0%,${Pg(tW0 - 0.2)}%{opacity:0;transform:translate(${(gx + kAd[0].x * q).toFixed(1)}px,${(gy + kAd[0].y * q).toFixed(1)}px)}`;
  kAd.forEach((o) => { pk += `${Pg(tW0 + o.t * (tW1 - tW0))}%{opacity:1;transform:translate(${(gx + o.x * q).toFixed(1)}px,${(gy + o.y * q).toFixed(1)}px)}`; });
  const son = kAd.at(-1);
  pk += `${Pg(tW1 + 0.4)}%,100%{opacity:0;transform:translate(${(gx + son.x * q).toFixed(1)}px,${(gy + son.y * q).toFixed(1)}px)}}`;
  css += pk;
  s += `<g style="opacity:0;animation:kalem ${T}s linear infinite both"><circle r="5" fill="${LZ}" fill-opacity=".25"/><circle r="2.6" fill="${LZ}"/><circle r="1.1" fill="#fff"/></g>`;

  // lazer ışını
  css += `@keyframes lazer{0%,${Pg(tA0 - 0.25)}%{opacity:0;transform:translateX(${L0}px)}${Pg(tA0)}%{opacity:1;transform:translateX(${L0}px)}${Pg(tA1)}%,${Pg(tB0)}%{opacity:1;transform:translateX(${L1}px)}${Pg(tB1)}%{opacity:1;transform:translateX(${L0}px)}${Pg(tB1 + 0.25)}%,100%{opacity:0;transform:translateX(${L0}px)}}`;
  css += `@keyframes izA{0%,${Pg(tA0)}%{opacity:0}${Pg(tA0 + 0.2)}%,${Pg(tA1 - 0.1)}%{opacity:1}${Pg(tA1 + 0.1)}%,100%{opacity:0}}@keyframes izB{0%,${Pg(tB0)}%{opacity:0}${Pg(tB0 + 0.2)}%,${Pg(tB1 - 0.1)}%{opacity:1}${Pg(tB1 + 0.1)}%,100%{opacity:0}}`;
  const y0 = gy - 14, y1 = gy + gh + 8;
  s += `<defs><linearGradient id="izsol" x1="0" x2="1"><stop offset="0" stop-color="${LZ}" stop-opacity="0"/><stop offset="1" stop-color="${LZ}" stop-opacity=".28"/></linearGradient><linearGradient id="izsag" x1="1" x2="0"><stop offset="0" stop-color="${LZ}" stop-opacity="0"/><stop offset="1" stop-color="${LZ}" stop-opacity=".28"/></linearGradient></defs>`;
  // ay etiketi, ışınla birlikte gider (yalnız 1. geçişte)
  let etiket = "";
  aySutun.forEach(([c, ad], i) => {
    const a0 = xZ(cx(c), tA0, tA1, false), a1 = i + 1 < aySutun.length ? xZ(cx(aySutun[i + 1][0]), tA0, tA1, false) : tA1;
    css += `@keyframes ay${i}{0%,${Pg(a0)}%{opacity:0}${Pg(a0 + 0.01)}%,${Pg(a1)}%{opacity:1}${Pg(a1 + 0.01)}%,100%{opacity:0}}`;
    etiket += `<text x="8" y="${y0 - 6}" style="font:11px ${MONO};fill:${LZ};opacity:0;animation:ay${i} ${T}s linear infinite both">${ad}</text>`;
  });
  s += `<g style="opacity:0;animation:lazer ${T}s linear infinite both">
<rect x="-70" y="${y0}" width="70" height="${y1 - y0}" fill="url(#izsol)" style="opacity:0;animation:izA ${T}s linear infinite both"/>
<rect x="0" y="${y0}" width="70" height="${y1 - y0}" fill="url(#izsag)" style="opacity:0;animation:izB ${T}s linear infinite both"/>
<rect x="-3.5" y="${y0}" width="7" height="${y1 - y0}" fill="${LZ}" fill-opacity=".35"/>
<rect x="-1" y="${y0}" width="2" height="${y1 - y0}" fill="#fff"/>
<path d="M-6 ${y0 - 7}h12l-6 7z M-6 ${y1 + 7}h12l-6 -7z" fill="${LZ}"/>${etiket}</g>`;
  return { css, svg: `<g style="animation:gr ${T}s linear infinite both;opacity:0">${s}</g>` };
})();

/* ---------------------------------------------------------------- birleştir */
// T artık belli: nvim tarafındaki yüzdeleri yeniden üretmek için css'teki saniyeleri ölçekle
const oran = 30 / T;
const olcekle = (s) => s.replace(/(\d+(?:\.\d+)?)%/g, (m, n) => (+n === 100 ? m : `${(+n * oran).toFixed(3)}%`)).replace(/ 30s /g, ` ${T}s `);
css = olcekle(css); nvim = olcekle(nvim);
const pr = [gp, lp, rt, rb, cp].map((p) => p.render());
const vis = (ad, a0, a1) => `@keyframes ${ad}{0%,${((a0 / T) * 100).toFixed(3)}%{opacity:0}${(((a0 + 0.01) / T) * 100).toFixed(3)}%,${((a1 / T) * 100).toFixed(3)}%{opacity:1}${(((a1 + 0.01) / T) * 100).toFixed(3)}%,100%{opacity:0}}`;
const winCss = vis("w1", 0, tShip) + vis("w2", tShip, tDash) + vis("w3", tDash, tGraph) + vis("w4", tGraph, T - 0.45) + vis("gr", tGrid + 0.1, T - 0.45) + vis("nv", 0.15, tShip);
const pencereler = (aktif) => {
  const ad = ["1:edit", "2:ship", "3:dash", "4:graph"];
  return ad.map((n, i) => `<tspan fill="${i === aktif ? R.green : R.mid}"${i === aktif ? ' font-weight="700"' : ""}>${n}${i === aktif ? "*" : " "}</tspan>`).join("<tspan> </tspan>");
};
const yS = H - 34;
const durum = `<rect x="0" y="${yS}" width="${W}" height="24" fill="#17191f"/><rect x="0" y="${yS}" width="74" height="24" fill="${R.green}"/>
<text x="12" y="${yS + 16.5}" style="font:700 12px ${MONO};fill:#0f1014">[oktay]</text>
${[0, 1, 2, 3].map((i) => `<text x="88" y="${yS + 16.5}" style="font:12px ${MONO};animation:w${i + 1} ${T}s linear infinite both;opacity:0" xml:space="preserve">${pencereler(i)}</text>`).join("")}
<text x="${W - 16}" y="${yS + 16.5}" text-anchor="end" style="font:12px ${MONO};fill:${R.mid}" xml:space="preserve">cachyos  <tspan fill="${R.fg}">${barSaat}</tspan></text>`;
const bolme = `<g style="animation:w3 ${T}s linear infinite both;opacity:0"><line x1="592" x2="592" y1="${Y0 - 2}" y2="${yS - 6}" stroke="#2a2e37"/><line x1="592" x2="${W - 16}" y1="${Y0 + 14 * LH}" y2="${Y0 + 14 * LH}" stroke="#2a2e37"/></g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="tmux story: main.rs is updated in nvim, shipped with git, then the dashboard shows ${yeni.public_repos} repos, ${yeni.commits} commits, ${yeni.stars} stars. Updated ${yeni.updated_at}.">
<style>${FONT}${tabanCss(T, FS, MONO)}${winCss}${css}${pr.map((x) => x.css).join("")}${graf.css}</style>
${pencere({ W, H, baslik: "tmux — oktay@cachyos", sekme: "~/profile", MONO, SANS })}
<g transform="translate(${X0} 0)" style="animation:nv ${T}s linear infinite both;opacity:0">${nvim}</g>
${pr.map((x) => x.svg).join("")}
${graf.svg}
${bolme}
${durum}
</svg>`;
writeFileSync(join(D, "story.svg"), svg);
console.log(`tamam · T=${T}s · düzenleme: ${duzenler.map((d) => d.satir).join(",")} · ship ${tShip.toFixed(1)}s · dash ${tDash.toFixed(1)}s`);
