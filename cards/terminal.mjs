// Küçük terminal motoru: SVG + CSS keyframe üretir. JavaScript gerektirmez, GitHub <img> içinde çalışır.
// Pano: bir terminal alanı (tmux'ta her bölme ayrı Pano). Satırlar ya anında düşer ya harf harf yazılır.

export const R = { // ANSI paleti (koyu)
  fg: "#d7dae0", dim: "#5c6370", mid: "#9aa0ad", red: "#ff6b6b", green: "#a7e07c", yellow: "#ffcf5c",
  blue: "#7cc4ff", magenta: "#c7a6ff", cyan: "#6fd6d0", orange: "#ff7a59", white: "#f4efe6",
};
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const n3 = (x) => (+x).toFixed(3).replace(/\.?0+$/, "");
const len = (segs) => segs.reduce((a, s) => a + [...s[0]].length, 0);

export class Pano {
  constructor({ id, x, y, cols, rows, FS = 14, LH = 21, T }) {
    Object.assign(this, { id, x, y, cols, rows, FS, LH, T, CW: FS * 0.6 });
    this.lines = []; this.scene = 0; this.row = 0; this.sceneEnd = {};
  }
  // onek: anında görünen kısım (prompt), yazi: harf harf yazılan kısım. Bitiş zamanını döner.
  satir(t, onek = [], yazi = [], { hiz = 0.055, imlec = false } = {}) {
    const pre = len(onek), typ = len(yazi);
    const t1 = t + typ * hiz;
    this.lines.push({ scene: this.scene, row: this.row++, t0: t, t1, onek, yazi, pre, typ, imlec: imlec || typ > 0 });
    return t1;
  }
  cikti(t, satirlar, aralik = 0.045) { // birden çok çıktı satırı
    satirlar.forEach((s, i) => this.satir(t + i * aralik, s));
    return t + satirlar.length * aralik;
  }
  temizle(t) { this.sceneEnd[this.scene] = t; this.scene++; this.row = 0; }

  render() {
    const { id, x, y, rows, LH, CW, FS, T } = this;
    const P = (s) => n3(Math.max(0, Math.min(100, (s / T) * 100)));
    const E = 0.002, son = T - 0.45;
    let css = "", svg = "";
    const baz = (row) => (row + 1) * LH - 5;
    // sahneler
    const sahneler = [...new Set(this.lines.map((l) => l.scene))];
    const offAt = {}; // sahne -> [[t, off]]
    sahneler.forEach((sc) => {
      const L = this.lines.filter((l) => l.scene === sc).sort((a, b) => a.t0 - b.t0);
      const end = this.sceneEnd[sc] ?? son;
      let off = 0; const ev = [[0, 0]];
      L.forEach((l) => { const o = Math.max(0, l.row - rows + 1); if (o > off) { off = o; ev.push([l.t0, off]); } });
      offAt[sc] = ev;
      let kf = `@keyframes ${id}s${sc}{0%{transform:translateY(0)}`;
      ev.slice(1).forEach(([t, o], i) => { kf += `${P(t - E)}%{transform:translateY(${-ev[i][1] * LH}px)}${P(t)}%{transform:translateY(${-o * LH}px)}`; });
      kf += `100%{transform:translateY(${-off * LH}px)}}`;
      css += kf;
      let g = "";
      L.forEach((l, li) => {
        const k = `${id}l${sc}_${li}`, yy = baz(l.row);
        css += `@keyframes ${k}{0%,${P(l.t0 - E)}%{opacity:0}${P(l.t0)}%,${P(end - E)}%{opacity:1}${P(end)}%,100%{opacity:0}}`;
        const tsp = (segs) => segs.map(([s, c, b]) => `<tspan fill="${c || R.fg}"${b ? ' font-weight="700"' : ""}>${esc(s)}</tspan>`).join("");
        g += `<g class="tl" style="animation-name:${k}">`;
        if (l.pre) g += `<text x="0" y="${yy}" class="tx" xml:space="preserve">${tsp(l.onek)}</text>`;
        if (l.typ) {
          const ck = `${k}c`;
          css += `@keyframes ${ck}{0%,${P(l.t0)}%{width:0}${P(l.t1)}%,100%{width:${n3(l.typ * CW + 1)}px}}`;
          g += `<clipPath id="${ck}"><rect x="${n3(l.pre * CW)}" y="${yy - LH + 5}" height="${LH}" width="0" style="animation:${ck} ${T}s steps(${l.typ},end) infinite both"/></clipPath>`;
          g += `<text x="${n3(l.pre * CW)}" y="${yy}" class="tx" xml:space="preserve" clip-path="url(#${ck})">${tsp(l.yazi)}</text>`;
        }
        g += `</g>`;
      });
      svg += `<g class="sc" style="animation-name:${id}s${sc}">${g}</g>`;
    });
    // imleç
    const offOf = (sc, t) => { let o = 0; for (const [tt, oo] of offAt[sc]) if (tt <= t) o = oo; return o; };
    const L = [...this.lines].sort((a, b) => a.t0 - b.t0);
    let kf = `@keyframes ${id}cur{0%{opacity:0;transform:translate(0,0)}`;
    let prev = "opacity:0;transform:translate(0px,0px)";
    L.forEach((l) => {
      const vr = l.row - offOf(l.scene, l.t0);
      const st0 = l.imlec ? `opacity:1;transform:translate(${n3(l.pre * CW)}px,${vr * LH}px)` : `opacity:0;transform:translate(0px,${vr * LH}px)`;
      kf += `${P(l.t0 - E)}%{${prev}}${P(l.t0)}%{${st0}${l.typ ? `;animation-timing-function:steps(${l.typ},end)` : ""}}`;
      prev = st0;
      if (l.typ) { const st1 = `opacity:1;transform:translate(${n3((l.pre + l.typ) * CW)}px,${vr * LH}px)`; kf += `${P(l.t1)}%{${st1}}`; prev = st1; }
      const end = this.sceneEnd[l.scene];
      if (end !== undefined && L.filter((m) => m.scene === l.scene).at(-1) === l) { kf += `${P(end - E)}%{${prev}}${P(end)}%{opacity:0;transform:translate(0px,0px)}`; prev = "opacity:0;transform:translate(0px,0px)"; }
    });
    kf += `${P(son - E)}%{${prev}}${P(son)}%,100%{opacity:0;transform:translate(0px,0px)}}`;
    css += kf;
    const cur = `<g class="cu" style="animation-name:${id}cur"><rect x="0" y="${LH - 5 - FS + 1}" width="${n3(CW)}" height="${FS + 3}" fill="${R.fg}" class="bl"/></g>`;
    const out = `<clipPath id="${id}clip"><rect x="0" y="0" width="${n3(this.cols * CW)}" height="${rows * LH}"/></clipPath>
<g transform="translate(${x} ${y})" clip-path="url(#${id}clip)">${svg}${cur}</g>`;
    return { css, svg: out };
  }
}

export const tabanCss = (T, FS, MONO) => `
.tx{font:${FS}px ${MONO};white-space:pre}
.tl{opacity:0;animation:${T}s linear infinite both}
.sc{animation:${T}s linear infinite both}
.cu{opacity:0;animation:${T}s linear infinite both}
.bl{animation:blink 1.05s steps(1,end) infinite}
@keyframes blink{0%{opacity:1}50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.tl,.sc,.cu{animation:none}.tl{opacity:1}}`;

// Pencere çerçevesi (KDE Breeze'e yakın, kendi tasarımımız): başlık çubuğu + sağda üç düğme
export function pencere({ W, H, baslik, sekme, R: r = 12, MONO, SANS }) {
  return `<rect width="${W}" height="${H}" rx="${r}" fill="#0f1014"/>
<path d="M${r} 0H${W - r}A${r} ${r} 0 0 1 ${W} ${r}V38H0V${r}A${r} ${r} 0 0 1 ${r} 0Z" fill="#17191f"/>
<line x1="0" x2="${W}" y1="38.5" y2="38.5" stroke="#23262e"/>
<text x="18" y="24" style="font:600 12.5px ${MONO};fill:${R.orange}">&gt;_</text>
${sekme ? `<text x="44" y="24" style="font:12.5px ${MONO};fill:${R.mid}">${esc(sekme)}</text>` : ""}
<text x="${W / 2}" y="24" text-anchor="middle" style="font:13px ${SANS};fill:${R.mid}">${esc(baslik)}</text>
<g stroke="${R.mid}" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M${W - 88} 19.5h9"/><rect x="${W - 62}" y="15" width="9" height="9" rx="1"/><path d="M${W - 35} 15l9 9M${W - 26} 15l-9 9"/></g>`;
}
