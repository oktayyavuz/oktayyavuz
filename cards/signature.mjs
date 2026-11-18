// "OktayYavuz" el yazısı: kalem vuruşları Catmull-Rom eğrileri, ince ızgaraya rasterleştirilir.
// Her piksel, kalemin ona en yakın geçtiği anın zamanını taşır; böylece yazı gerçekten yazılıyormuş gibi açılır.

// Birimler: taban çizgisi y=0, küçük harf yüksekliği 1, büyük harf 2. y yukarı.
const VURUSLAR = [
  // O
  [[1.25, 1.75], [0.75, 2.02], [0.25, 1.65], [0.02, 0.95], [0.18, 0.25], [0.6, 0.0], [1.08, 0.2], [1.38, 0.85], [1.35, 1.55], [1.0, 1.98], [0.55, 1.9], [0.42, 1.55]],
  // ktay
  [[1.55, 0.05], [1.95, 1.05], [2.25, 1.85], [2.12, 2.18], [1.92, 1.95], [1.85, 1.0], [1.8, 0.0], [1.9, 0.55], [2.25, 0.95], [2.45, 0.82], [2.18, 0.5], [2.35, 0.12], [2.65, 0.02],
    [2.95, 0.55], [3.18, 1.75], [3.05, 0.55], [3.12, 0.06], [3.45, 0.12],
    [3.75, 0.7], [4.05, 0.92], [3.72, 0.98], [3.45, 0.58], [3.6, 0.06], [3.98, 0.42], [4.12, 0.95], [4.08, 0.3], [4.3, 0.0],
    [4.48, 0.92], [4.42, 0.3], [4.68, 0.0], [4.98, 0.5], [5.08, 0.95], [4.98, 0.05], [4.78, -0.72], [4.52, -0.82], [4.6, -0.45], [5.15, 0.08]],
  // t çizgisi
  [[2.82, 1.2], [3.5, 1.28]],
  // Y
  [[5.55, 1.55], [5.78, 2.02], [5.98, 1.55], [6.05, 1.05], [6.35, 0.98], [6.62, 1.55], [6.75, 2.02], [6.55, 0.55], [6.28, -0.35], [5.95, -0.84], [5.72, -0.66], [5.92, -0.28], [6.55, 0.05],
    // avuz
    [6.95, 0.75], [7.25, 0.96], [6.85, 1.0], [6.55, 0.6], [6.62, 0.12], [6.95, 0.06], [7.22, 0.5], [7.28, 0.98], [7.22, 0.35], [7.3, 0.05], [7.48, 0.02],
    [7.64, 0.86], [7.74, 0.5], [7.86, 0.0], [7.96, 0.02], [8.2, 0.66], [8.24, 0.98], [8.13, 0.86], [8.44, 0.82],
    [8.54, 0.95], [8.47, 0.25], [8.72, 0.0], [9.0, 0.5], [9.1, 0.95], [9.05, 0.3], [9.25, 0.0],
    [9.45, 0.82], [9.85, 0.95], [9.55, 0.52], [9.45, 0.45], [9.78, 0.36], [9.82, 0.0], [9.66, -0.6], [9.45, -0.8], [9.55, -0.48], [10.2, 0.12]],
];

const catmull = (pts, adim = 14) => {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < adim; s++) {
      const t = s / adim, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts.at(-1));
  return out;
};

// cols×rows ince ızgara için pikseller: [{c, r, seviye(1-4), t(0-1)}], kalem yolu: [{x, y, t, kalk}]
export function imza(cols, rows, { egim = 0.24, genis = 1.72, kalin = 1.0 } = {}) {
  const yMin = -0.9, yMax = 2.2;
  const sy = (rows - 2) / (yMax - yMin), sx = sy * genis;
  const xMax = 10.3 + egim * yMax;
  const ox = (cols - xMax * sx) / 2;
  const P = ([x, y]) => [ox + (x + egim * y) * sx, 1 + (yMax - y) * sy];
  const vuruslar = VURUSLAR.map((v) => catmull(v).map(P));
  // yay uzunluğu + kalem kaldırma molası
  const MOLA = 6; // piksel cinsinden eşdeğer süre
  let L = 0; const ornek = [];
  vuruslar.forEach((v, vi) => {
    if (vi) L += MOLA;
    v.forEach((p, i) => { if (i) L += Math.hypot(p[0] - v[i - 1][0], p[1] - v[i - 1][1]); ornek.push({ x: p[0], y: p[1], L, kalk: i === 0 && vi > 0 }); });
  });
  // yoğun örnek (0.3 px aralık)
  const yogun = [];
  vuruslar.forEach((v) => { for (let i = 0; i < v.length - 1; i++) { const [a, b] = [v[i], v[i + 1]], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.3)); for (let k = 0; k < n; k++) yogun.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } });
  // yoğun örneklere zaman: en yakın kaba örneğin L'si
  const zaman = (x, y) => { let m = 1e9, z = 0; for (const o of ornek) { const d = (o.x - x) ** 2 + (o.y - y) ** 2; if (d < m) { m = d; z = o.L; } } return z; };
  const yz = yogun.map(([x, y]) => [x, y, zaman(x, y)]);
  const pikseller = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const px = c + 0.5, py = r + 0.5;
    let m = 1e9, z = 0;
    for (const [x, y, t] of yz) { const d = (x - px) ** 2 + (y - py) ** 2; if (d < m) { m = d; z = t; } }
    const d = Math.sqrt(m) / kalin;
    const seviye = d <= 0.62 ? 4 : d <= 1.0 ? 3 : d <= 1.35 ? 2 : d <= 1.65 ? 1 : 0;
    if (seviye) pikseller.push({ c, r, seviye, t: z / L });
  }
  return { pikseller, kalem: ornek.map((o) => ({ x: o.x, y: o.y, t: o.L / L, kalk: o.kalk })) };
}
