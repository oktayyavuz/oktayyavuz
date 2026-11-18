// Saatlik veri çekimi. Önceki çalıştırmanın özeti previous.json'a taşınır; kart, değişen değerleri editörde yeniden yazar.
// Yerelde: GH_TOKEN=$(gh auth token) node fetch-data.mjs   ·   Actions'ta GITHUB_TOKEN yeterli.
import { writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KULLANICI = process.env.PROFIL_KULLANICI || "oktayyavuz";
const D = dirname(fileURLToPath(import.meta.url));
const V = join(D, "data");
mkdirSync(V, { recursive: true });
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";

async function gh(yol, ham = false) {
  const r = await fetch(`https://api.github.com/${yol}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "profile-cards", ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }) },
  });
  if (r.status === 404 || r.status === 409) return null;
  if (!r.ok) throw new Error(`${yol} → ${r.status} ${await r.text()}`);
  return ham ? r : r.json();
}
async function commitBilgisi(repo) {
  const r = await gh(`repos/${KULLANICI}/${repo}/commits?per_page=1`, true);
  if (!r) return { sayi: 0, son: null };
  const m = (r.headers.get("link") || "").match(/[?&]page=(\d+)>;\s*rel="last"/);
  const j = await r.json();
  return { sayi: m ? +m[1] : j.length, son: j[0] ? { sha: j[0].sha.slice(0, 7), tarih: j[0].commit.author?.date } : null };
}

const kullanici = await gh(`users/${KULLANICI}`);
const tum = [];
for (let s = 1; ; s++) { const j = await gh(`users/${KULLANICI}/repos?per_page=100&page=${s}&type=owner`); tum.push(...j); if (j.length < 100) break; }
const kendi = tum.filter((r) => !r.fork && r.name !== KULLANICI);

const repolar = await Promise.all(kendi.map(async (r) => {
  const [dil, cm] = await Promise.all([gh(`repos/${KULLANICI}/${r.name}/languages`), commitBilgisi(r.name)]);
  return { ad: r.name, dil: r.language, diller: dil || {}, yildiz: r.stargazers_count, olusturma: r.created_at, push: r.pushed_at, commit: cm.sayi, son: cm.son };
}));
writeFileSync(join(V, "repos.json"), JSON.stringify(repolar, null, 2));

// Takvim: profil sayfasındaki tablonun kendisi. API takvimi saat dilimi yüzünden günleri kaydırabiliyor.
const SEVIYE = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];
let takvimTamam = false;
try {
  const html = await (await fetch(`https://github.com/users/${KULLANICI}/contributions`, { headers: { "User-Agent": "Mozilla/5.0 (profile-cards)" } })).text();
  const ipucu = {};
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) ipucu[m[1]] = m[2];
  const gunler = [];
  for (const m of html.matchAll(/<td\b[^>]*class="ContributionCalendar-day"[^>]*>/g)) {
    const a = (k) => m[0].match(new RegExp(`\\b${k}="([^"]*)"`))?.[1];
    const id = a("id"), tarih = a("data-date"), seviye = +a("data-level");
    if (!id || !tarih) continue;
    const [, satir, sutun] = id.match(/-(\d+)-(\d+)$/).map(Number);
    const say = parseInt((ipucu[id] || "").replace(/,/g, ""), 10) || 0;
    gunler.push({ date: tarih, contributionCount: say, contributionLevel: SEVIYE[seviye] || "NONE", col: sutun, row: satir });
  }
  const toplam = parseInt((html.match(/([\d,]+)\s+contributions?\s+in the last year/) || [])[1]?.replace(/,/g, "") || "0", 10);
  if (gunler.length > 300) {
    gunler.sort((x, y) => x.date.localeCompare(y.date));
    writeFileSync(join(V, "calendar.json"), JSON.stringify({ kaynak: "profile", toplam, gunler }));
    takvimTamam = true;
  }
} catch (e) { console.warn("profil takvimi okunamadı, API'ye dönülüyor:", e.message); }

if (TOKEN && !takvimTamam) {
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-cards" },
    body: JSON.stringify({ query: `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`, variables: { u: KULLANICI } }),
  });
  const j = await r.json();
  const cal = j.data?.user?.contributionsCollection?.contributionCalendar;
  if (cal) writeFileSync(join(V, "calendar.json"), JSON.stringify({ toplam: cal.totalContributions, gunler: cal.weeks.flatMap((w) => w.contributionDays) }));
}

const saat = new Date(); saat.setUTCMinutes(0, 0, 0);
const sonPush = [...repolar].sort((a, b) => b.push.localeCompare(a.push))[0];
const ozet = {
  uretildi: saat.toISOString(),
  hesap: kullanici.created_at,
  public_repo: kullanici.public_repos,
  takipci: kullanici.followers,
  yildiz: repolar.reduce((a, r) => a + r.yildiz, 0),
  commit: repolar.reduce((a, r) => a + r.commit, 0),
  dil: new Set(repolar.flatMap((r) => Object.keys(r.diller))).size,
  son_push: sonPush?.ad || "",
};
const yol = join(V, "summary.json");
if (existsSync(yol)) copyFileSync(yol, join(V, "previous.json"));
writeFileSync(yol, JSON.stringify(ozet, null, 2));
console.log(`veri: ${repolar.length} repo, ${ozet.commit} commit, ${ozet.yildiz} yıldız, saat ${ozet.uretildi}`);
