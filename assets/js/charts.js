/* ============================================================
   SigortaOS — Bağımlılıksız SVG grafik yardımcıları
   ============================================================ */
(function (g) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const PAL = ["#1b4dd8", "#0f9d58", "#c47a08", "#8e44ad", "#0b7285", "#d33a3a", "#2b6cb0", "#be185d", "#059669", "#7c3aed", "#ea580c", "#0891b2"];

  function fmtShort(n) {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace(".0", "") + " Mr";
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + " M";
    if (a >= 1e3) return Math.round(n / 1e3) + " B";
    return String(Math.round(n));
  }

  /* --- Çizgi / alan grafiği (çoklu seri) --- */
  function line(opts) {
    const w = 100, h = opts.height || 220, pl = 8, pr = 2, pt = 6, pb = 14;
    const labels = opts.labels, series = opts.series;
    const all = series.reduce((a, s) => a.concat(s.data), []);
    let max = Math.max.apply(null, all.concat([1]));
    max = max * 1.12;
    const n = labels.length;
    const x = (i) => pl + (i * (w - pl - pr)) / Math.max(1, n - 1);
    const y = (v) => pt + (1 - v / max) * (h - pt - pb);

    let out = `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px">`;
    // grid
    for (let i = 0; i <= 4; i++) {
      const yy = pt + (i * (h - pt - pb)) / 4;
      out += `<line x1="${pl}" y1="${yy}" x2="${w - pr}" y2="${yy}" stroke="#e9edf5" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    }
    series.forEach((s, si) => {
      const col = s.color || PAL[si % PAL.length];
      const pts = s.data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      if (s.area !== false) {
        out += `<polygon points="${pl},${h - pb} ${pts} ${x(n - 1)},${h - pb}" fill="${col}" opacity=".08"/>`;
      }
      out += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
      // nokta işaretleri: yatay eziliyor diye daire yerine ince dikey işaret + hover alanı
      s.data.forEach((v, i) => {
        out += `<line x1="${x(i)}" y1="${y(v) - 2.5}" x2="${x(i)}" y2="${y(v) + 2.5}" stroke="${col}" stroke-width="2.5" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".9"><title>${esc(labels[i])} — ${esc(s.name)}: ${opts.money ? g.fmtTL(v) : fmtShort(v)}</title></line>`;
      });
    });
    out += `</svg>`;

    // eksen etiketleri (ayrı, ölçeklenmesin diye HTML)
    const step = n > 12 ? Math.ceil(n / 8) : 1;
    let ax = `<div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--faint);margin-top:4px">`;
    labels.forEach((l, i) => { ax += `<span style="${i % step ? "opacity:0" : ""}">${esc(l)}</span>`; });
    ax += `</div>`;

    let leg = `<div class="legend">`;
    series.forEach((s, si) => {
      const tot = s.data.reduce((a, b) => a + b, 0);
      leg += `<span><i style="background:${s.color || PAL[si % PAL.length]}"></i>${esc(s.name)}<b>${opts.money ? g.fmtTL(tot) : fmtShort(tot)}</b></span>`;
    });
    leg += `</div>`;
    return out + ax + (opts.legend === false ? "" : leg);
  }

  /* --- Dikey sütun grafiği --- */
  function bars(opts) {
    const h = opts.height || 220, w = 100, pt = 6, pb = 14;
    const d = opts.data, n = d.length;
    const max = Math.max.apply(null, d.map(x => x.value).concat([1])) * 1.12;
    const bw = (w / n) * 0.56, gap = (w / n);
    let out = `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px">`;
    for (let i = 0; i <= 4; i++) {
      const yy = pt + (i * (h - pt - pb)) / 4;
      out += `<line x1="0" y1="${yy}" x2="${w}" y2="${yy}" stroke="#e9edf5" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    }
    d.forEach((it, i) => {
      const bh = (it.value / max) * (h - pt - pb);
      const x = i * gap + (gap - bw) / 2;
      out += `<rect x="${x}" y="${h - pb - bh}" width="${bw}" height="${Math.max(bh, 0.6)}" rx="1.4" fill="${it.color || opts.color || "#1b4dd8"}"><title>${esc(it.label)}: ${opts.money ? g.fmtTL(it.value) : it.value}</title></rect>`;
    });
    out += `</svg><div style="display:flex;font-size:10.5px;color:var(--faint);margin-top:4px">`;
    d.forEach(it => { out += `<span style="flex:1;text-align:center;overflow:hidden;white-space:nowrap">${esc(it.short || it.label)}</span>`; });
    return out + `</div>`;
  }

  /* --- Yatay bar listesi --- */
  function hbars(opts) {
    const d = opts.data;
    const max = Math.max.apply(null, d.map(x => x.value).concat([1]));
    let out = `<div class="stack" style="gap:11px">`;
    d.forEach((it, i) => {
      const pct = Math.round((it.value / max) * 100);
      out += `<div>
        <div class="row" style="justify-content:space-between;gap:8px;margin-bottom:5px">
          <span style="font-size:12.5px;font-weight:550;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.label)}</span>
          <span class="small muted num nowrap">${opts.money ? g.fmtTL(it.value) : it.value}${it.extra ? " · " + esc(it.extra) : ""}</span>
        </div>
        <div class="bar"><i style="width:${pct}%;background:${it.color || PAL[i % PAL.length]}"></i></div>
      </div>`;
    });
    return out + `</div>`;
  }

  /* --- Donut --- */
  function donut(opts) {
    const d = opts.data.filter(x => x.value > 0);
    const total = d.reduce((a, b) => a + b.value, 0) || 1;
    const size = opts.size || 190, r = 62, cx = 80, cy = 80, sw = 22;
    let a0 = -Math.PI / 2, out = `<svg viewBox="0 0 160 160" style="width:${size}px;height:${size}px;max-width:100%">`;
    d.forEach((it, i) => {
      const frac = it.value / total, a1 = a0 + frac * Math.PI * 2;
      const large = frac > 0.5 ? 1 : 0;
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const col = it.color || PAL[i % PAL.length];
      if (frac > 0.999) {
        out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
      } else {
        out += `<path d="M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="butt"><title>${esc(it.label)}: ${Math.round(frac * 100)}%</title></path>`;
      }
      a0 = a1;
    });
    out += `<text x="80" y="76" text-anchor="middle" font-size="20" font-weight="700" fill="#131a2a">${esc(opts.centerValue || total)}</text>`;
    out += `<text x="80" y="93" text-anchor="middle" font-size="9" fill="#6b7793">${esc(opts.centerLabel || "")}</text></svg>`;

    let leg = `<div class="legend" style="flex-direction:column;gap:7px">`;
    d.forEach((it, i) => {
      leg += `<span><i style="background:${it.color || PAL[i % PAL.length]}"></i>${esc(it.label)}<b>${opts.money ? g.fmtTL(it.value) : it.value}</b> <span class="muted">(${Math.round(it.value / total * 100)}%)</span></span>`;
    });
    leg += `</div>`;
    return `<div class="row" style="gap:20px;align-items:center;justify-content:center">${out}<div style="flex:1;min-width:150px">${leg}</div></div>`;
  }

  /* --- Sparkline --- */
  function spark(data, color) {
    const w = 100, h = 28, max = Math.max.apply(null, data.concat([1])), min = Math.min.apply(null, data);
    const rng = (max - min) || 1;
    const pts = data.map((v, i) => `${(i * w) / (data.length - 1)},${h - 3 - ((v - min) / rng) * (h - 6)}`).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px">
      <polygon points="0,${h} ${pts} ${w},${h}" fill="${color || "#1b4dd8"}" opacity=".1"/>
      <polyline points="${pts}" fill="none" stroke="${color || "#1b4dd8"}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
  }

  g.Chart = { line, bars, hbars, donut, spark, PAL, fmtShort };
})(window);
