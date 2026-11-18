// Bugün (Türkiye saatiyle) profildeki katkı tablosunda bugünün karesi boşsa daily.json'u günceller
// ve Actions'a "gerekli=true" der. Katkı varsa hiçbir şey yazmaz.
// Önce profil sayfasındaki tabloya bakar (ziyaretçinin gördüğü), okuyamazsa GraphQL'e döner.
// Yerelde deneme: GH_TOKEN=$(gh auth token) node daily-mark.mjs
import { writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KULLANICI = process.env.PROFIL_KULLANICI || "oktayyavuz";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const D = dirname(fileURLToPath(import.meta.url));
const TR = 3 * 3600e3;

const simdi = new Date();
const bugun = new Date(simdi.getTime() + TR).toISOString().slice(0, 10);

async function profildenOku() {
  const html = await (await fetch(`https://github.com/users/${KULLANICI}/contributions`, { headers: { "User-Agent": "Mozilla/5.0 (profile-cards)" } })).text();
  const td = html.match(new RegExp(`<td\\b[^>]*data-date="${bugun}"[^>]*>`))?.[0];
  if (!td) return null;
  const id = td.match(/\bid="([^"]+)"/)?.[1];
  const ipucu = html.match(new RegExp(`<tool-tip[^>]*\\bfor="${id}"[^>]*>([^<]*)</tool-tip>`))?.[1] || "";
  const seviye = +(td.match(/\bdata-level="(\d)"/)?.[1] || 0);
  return { sayi: parseInt(ipucu.replace(/,/g, ""), 10) || 0, seviye, kaynak: "profil" };
}

async function apidenOku() {
  const bas = new Date(Date.parse(`${bugun}T00:00:00Z`) - TR).toISOString();
  const r = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-cards" },
    body: JSON.stringify({
      query: `query($u:String!,$from:DateTime!,$to:DateTime!){user(login:$u){contributionsCollection(from:$from,to:$to){contributionCalendar{totalContributions}}}}`,
      variables: { u: KULLANICI, from: bas, to: simdi.toISOString() },
    }),
  });
  const j = await r.json();
  const sayi = j.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions;
  if (sayi === undefined) throw new Error("katkı sayısı okunamadı: " + JSON.stringify(j.errors || j));
  return { sayi, seviye: sayi ? 1 : 0, kaynak: "api" };
}

let sonuc = null;
try { sonuc = await profildenOku(); } catch (e) { console.warn("profil okunamadı:", e.message); }
if (!sonuc) sonuc = await apidenOku();

const gerekli = sonuc.sayi === 0 && sonuc.seviye === 0;
console.log(`${bugun}: ${sonuc.sayi} katkı (${sonuc.kaynak}) → ${gerekli ? "günlük commit atılacak" : "gerek yok"}`);
if (gerekli) writeFileSync(join(D, "data", "daily.json"), JSON.stringify({ date: bugun, checked_at: simdi.toISOString() }, null, 2) + "\n");
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `gerekli=${gerekli}\ntarih=${bugun}\n`);
