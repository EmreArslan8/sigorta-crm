/* ============================================================
   SigortaOS — Çekirdek: router, yardımcılar, tablo bileşeni
   ============================================================ */
(function (g) {
  "use strict";
  const DB = g.DB;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Biçimlendirme ---------- */
  const nfTL = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
  const nfTL2 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
  const nfN = new Intl.NumberFormat("tr-TR");
  const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  g.fmtTL = (n) => nfTL.format(n || 0);
  const fmtTL2 = (n) => nfTL2.format(n || 0);
  const fmtN = (n) => nfN.format(n || 0);
  function fmtDate(s) { if (!s || s === "-") return "-"; const p = s.split("-"); return `${p[2]}.${p[1]}.${p[0]}`; }
  function monthKey(s) { return s.slice(0, 7); }
  function monthLabel(k) { const p = k.split("-"); return `${AYLAR[+p[1] - 1]} ${p[0].slice(2)}`; }

  /* ---------- İndeksler ---------- */
  const byId = (arr) => arr.reduce((m, x) => (m[x.id] = x, m), {});
  const IDX = {
    cus: byId(DB.customers),
    pol: byId(DB.policies),
    stf: byId(DB.staff),
    com: DB.companies.reduce((m, c) => (m[c.id] = c, m), {}),
    ass: byId(DB.assets)
  };
  const custName = (id) => (IDX.cus[id] ? IDX.cus[id].name : "—");
  const staffName = (id) => (IDX.stf[id] ? IDX.stf[id].name : "—");
  const comName = (id) => (IDX.com[id] ? IDX.com[id].name : "—");

  /* poliçe -> taksitler */
  const insByPolicy = {};
  DB.installments.forEach(t => { (insByPolicy[t.policyId] = insByPolicy[t.policyId] || []).push(t); });
  const polByCustomer = {};
  DB.policies.forEach(p => { (polByCustomer[p.customerId] = polByCustomer[p.customerId] || []).push(p); });
  const insByCustomer = {};
  DB.installments.forEach(t => { (insByCustomer[t.customerId] = insByCustomer[t.customerId] || []).push(t); });

  function polPaid(pid) {
    const l = insByPolicy[pid] || [];
    const paid = l.filter(t => t.status === "Ödendi").reduce((a, t) => a + t.amount, 0);
    const total = l.reduce((a, t) => a + t.amount, 0) || 1;
    return { paid, total, pct: Math.round((paid / total) * 100), overdue: l.some(t => t.status === "Gecikmiş") };
  }

  /* ---------- Renk / rozet ---------- */
  const AV_COLORS = ["#1b4dd8", "#0f9d58", "#c47a08", "#8e44ad", "#0b7285", "#d33a3a", "#be185d", "#059669", "#7c3aed", "#ea580c"];
  function avatar(name, size) {
    const ini = String(name).trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toLocaleUpperCase("tr");
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const c = AV_COLORS[h % AV_COLORS.length];
    const s = size ? `width:${size}px;height:${size}px;flex-basis:${size}px;font-size:${Math.round(size / 2.6)}px` : "";
    return `<div class="avatar" style="background:${c};${s}">${esc(ini)}</div>`;
  }
  const BADGE = {
    "Aktif": "b-ok", "Ödendi": "b-ok", "Tamamlandı": "b-ok", "Başarılı": "b-ok", "Kullanımda": "b-ok", "Sağlam": "b-ok",
    "Bekliyor": "b-warn", "Beklemede": "b-warn", "Uyarı": "b-warn", "Devam Ediyor": "b-warn", "İzinli": "b-warn", "Arızalı": "b-warn", "Kurulum Bekliyor": "b-warn",
    "Gecikmiş": "b-bad", "Gecikti": "b-bad", "İptal": "b-bad", "Hata": "b-bad", "Hatalı": "b-bad", "Pasif": "b-bad", "Acil": "b-bad",
    "Süresi Doldu": "b-idle", "Hurda": "b-idle", "Yapılacak": "b-idle", "Düşük": "b-idle", "Normal": "b-idle",
    "Yüksek": "b-warn", "VIP": "b-brand", "Kurumsal": "b-info", "Bireysel": "b-idle", "Manuel": "b-idle", "Otomatik": "b-info", "Entegrasyon": "b-info"
  };
  const badge = (t) => `<span class="badge ${BADGE[t] || "b-idle"}"><i class="dot"></i>${esc(t)}</span>`;

  /* ---------- Toast ---------- */
  function toast(msg, ms) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<i class="dot"></i><span>${esc(msg)}</span>`;
    $("#toasts").appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; el.style.transition = ".25s"; setTimeout(() => el.remove(), 260); }, ms || 2800);
  }

  /* ---------- Modal ---------- */
  function modal(opts) {
    const host = $("#modalHost");
    host.innerHTML = `<div class="modal ${opts.small ? "sm" : ""}">
      <div class="modal-h">
        <div>${opts.avatar || ""}</div>
        <div style="min-width:0"><h3>${esc(opts.title)}</h3>${opts.sub ? `<div class="sub">${opts.sub}</div>` : ""}</div>
        <button class="btn btn-icon btn-ghost x" data-close><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="modal-b">${opts.body}</div>
      <div class="modal-f">
        ${opts.footer || ""}
        <button class="btn" data-close>Kapat</button>
      </div></div>`;
    $("#overlay").classList.add("on");
    document.body.style.overflow = "hidden";
    if (opts.onMount) opts.onMount(host);
  }
  function closeModal() { $("#overlay").classList.remove("on"); $("#modalHost").innerHTML = ""; document.body.style.overflow = ""; }
  g.closeModal = closeModal;

  /* ---------- DataTable bileşeni ----------
     cfg: { id, rows, columns:[{key,label,sortable,cls,render(row)}],
            search(row,q), filters:[{key,label,options:[],apply(row,val)}],
            perPage, onRow(row), empty }
  -------------------------------------------------------- */
  const TSTATE = {};
  function table(cfg) {
    const st = TSTATE[cfg.id] = TSTATE[cfg.id] || { q: "", page: 1, sort: cfg.defaultSort || null, dir: cfg.defaultDir || "desc", f: {} };
    st._cfg = cfg;
    const per = cfg.perPage || 12;

    let rows = cfg.rows.slice();
    if (st.q && cfg.search) rows = rows.filter(r => cfg.search(r, st.q.toLocaleLowerCase("tr")));
    (cfg.filters || []).forEach(f => { const v = st.f[f.key]; if (v) rows = rows.filter(r => f.apply(r, v)); });
    if (st.sort) {
      const col = cfg.columns.find(c => c.key === st.sort);
      const val = (r) => (col && col.sortValue ? col.sortValue(r) : r[st.sort]);
      rows.sort((a, b) => {
        const x = val(a), y = val(b);
        if (typeof x === "number" && typeof y === "number") return st.dir === "asc" ? x - y : y - x;
        return st.dir === "asc" ? String(x).localeCompare(String(y), "tr") : String(y).localeCompare(String(x), "tr");
      });
    }
    const total = rows.length, pages = Math.max(1, Math.ceil(total / per));
    if (st.page > pages) st.page = pages;
    const page = rows.slice((st.page - 1) * per, st.page * per);

    let ctrl = "";
    if (cfg.search || (cfg.filters || []).length) {
      ctrl += `<div class="filters" style="padding:13px 16px;border-bottom:1px solid var(--line-2)">`;
      if (cfg.search) ctrl += `<input type="search" data-tq placeholder="${esc(cfg.searchPlaceholder || "Ara…")}" value="${esc(st.q)}">`;
      (cfg.filters || []).forEach(f => {
        ctrl += `<select data-tf="${esc(f.key)}"><option value="">${esc(f.label)}</option>` +
          f.options.map(o => {
            const v = typeof o === "string" ? o : o.value, l = typeof o === "string" ? o : o.label;
            return `<option value="${esc(v)}" ${st.f[f.key] === String(v) ? "selected" : ""}>${esc(l)}</option>`;
          }).join("") + `</select>`;
      });
      if (st.q || Object.keys(st.f).some(k => st.f[k])) ctrl += `<button class="btn btn-sm" data-treset>Temizle</button>`;
      ctrl += `<span class="small muted" style="margin-left:auto">${fmtN(total)} kayıt</span></div>`;
    }

    const head = cfg.columns.map(c =>
      `<th class="${c.cls || ""} ${c.sortable === false ? "" : "sortable"}" ${c.sortable === false ? "" : `data-tsort="${esc(c.key)}"`}>${esc(c.label)}${st.sort === c.key ? `<span class="ar">${st.dir === "asc" ? "▲" : "▼"}</span>` : ""}</th>`).join("");

    const body = page.length ? page.map(r =>
      `<tr class="${cfg.onRow ? "clickable" : ""}" data-trow="${esc(r.id)}">` +
      cfg.columns.map(c => `<td class="${c.cls || ""}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join("") + `</tr>`).join("")
      : `<tr><td colspan="${cfg.columns.length}"><div class="empty"><b>Kayıt bulunamadı</b>Filtreleri değiştirip tekrar deneyin.</div></td></tr>`;

    let pager = "";
    if (pages > 1) {
      let btns = `<button ${st.page === 1 ? "disabled" : ""} data-tpage="${st.page - 1}">‹</button>`;
      const from = Math.max(1, st.page - 2), to = Math.min(pages, from + 4);
      for (let i = from; i <= to; i++) btns += `<button class="${i === st.page ? "on" : ""}" data-tpage="${i}">${i}</button>`;
      btns += `<button ${st.page === pages ? "disabled" : ""} data-tpage="${st.page + 1}">›</button>`;
      pager = `<div class="pager"><span>${(st.page - 1) * per + 1}–${Math.min(st.page * per, total)} / ${fmtN(total)}</span><div class="pg">${btns}</div></div>`;
    }

    return `<div data-table="${esc(cfg.id)}">${ctrl}<div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${pager}</div>`;
  }
  table.state = TSTATE;

  /* ---------- Router ---------- */
  const ROUTES = [];
  function route(key, def) { ROUTES.push(Object.assign({ key }, def)); }

  const NAV = [
    { group: "Genel" },
    { key: "dashboard", label: "Kontrol Paneli", icon: "grid" },
    { key: "entegrasyon", label: "Şirket Entegrasyonları", icon: "plug", count: () => DB.integrations.filter(i => i.status !== "Aktif").length },
    { group: "Portföy" },
    { key: "musteriler", label: "Müşteriler", icon: "users", count: () => DB.customers.length },
    { key: "policeler", label: "Poliçeler", icon: "file", count: () => DB.policies.filter(p => p.status === "Aktif").length },
    { key: "tahsilat", label: "Ödeme & Vade Takibi", icon: "card", count: () => DB.installments.filter(t => t.status === "Gecikmiş").length },
    { group: "Ekip" },
    { key: "personel", label: "Personel", icon: "badge", count: () => DB.staff.length },
    { key: "zimmet", label: "Zimmet & Demirbaş", icon: "box", count: () => DB.assets.length },
    { key: "gorevler", label: "Görev & İş Takibi", icon: "check", count: () => DB.tasks.filter(t => t.status !== "Tamamlandı").length },
    { group: "Finans" },
    { key: "finans", label: "Gelir - Gider", icon: "wallet" },
    { key: "komisyon", label: "Komisyon Sistemi", icon: "percent" },
    { key: "raporlar", label: "Raporlar", icon: "chart" },
    { group: "Sistem" },
    { key: "yonetim", label: "Yetki & Kullanıcılar", icon: "shield" },
    { key: "loglar", label: "İşlem Kayıtları", icon: "list" }
  ];

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M9 11h3"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    badge: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    box: '<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
  };
  const icon = (k, s) => `<svg class="ic" width="${s || 18}" height="${s || 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.grid}</svg>`;

  function renderNav() {
    const cur = current();
    $("#nav").innerHTML = NAV.map(n => {
      if (n.group) return `<div class="nav-group">${esc(n.group)}</div>`;
      const c = n.count ? n.count() : null;
      return `<a href="#/${n.key}" class="${cur === n.key ? "active" : ""}">${icon(n.icon)}<span>${esc(n.label)}</span>${c ? `<span class="cnt">${c}</span>` : ""}</a>`;
    }).join("");
  }

  function current() { return (location.hash.replace(/^#\/?/, "").split("?")[0]) || "dashboard"; }
  function go(key) { location.hash = "#/" + key; }
  g.go = go;

  function render() {
    const key = current();
    const r = ROUTES.find(x => x.key === key) || ROUTES[0];
    $("#pageTitle").textContent = r.title;
    $("#pageSub").textContent = r.sub || "";
    closeModal();
    $("#view").innerHTML = r.view();
    if (r.mount) r.mount();
    renderNav();
    document.body.classList.remove("nav-open");
    window.scrollTo(0, 0);
  }
  g.rerender = render;

  /* Aynı sayfayı yeniden çiz (tablo state korunur) */
  function refresh() { const r = ROUTES.find(x => x.key === current()) || ROUTES[0]; $("#view").innerHTML = r.view(); if (r.mount) r.mount(); }
  g.refresh = refresh;

  /* ---------- Global olaylar ---------- */
  function wire() {
    window.addEventListener("hashchange", render);
    /* Mobil menü: delegasyonla bağlanır, böylece DOM yeniden çizilse de çalışır */
    document.addEventListener("click", (e) => {
      if (e.target.closest("#burger")) { e.preventDefault(); document.body.classList.toggle("nav-open"); return; }
      if (e.target.closest("#scrim")) { document.body.classList.remove("nav-open"); return; }
      if (e.target.closest("#nav a")) { document.body.classList.remove("nav-open"); }
    }, true);
    $("#overlay").onclick = (e) => { if (e.target.id === "overlay") closeModal(); };
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); document.body.classList.remove("nav-open"); } });

    $("#btnSync").onclick = function () {
      const b = this; b.disabled = true; b.style.opacity = ".7";
      toast("Senkronizasyon başlatıldı — 12 şirket sorgulanıyor…");
      setTimeout(() => { toast("Anadolu Sigorta: 14 yeni, 63 güncellenen kayıt"); }, 900);
      setTimeout(() => { toast("Allianz + AXA + Türkiye Sigorta tamamlandı"); }, 1700);
      setTimeout(() => {
        toast("Senkronizasyon bitti · 1 şirkette hata var (Ray Sigorta)");
        b.disabled = false; b.style.opacity = "";
      }, 2600);
    };
    $("#btnNotif").onclick = () => g.Views.notifications();

    $("#globalSearch").addEventListener("input", function () {
      const q = this.value.trim();
      if (q.length < 2) return;
      clearTimeout(this._t);
      this._t = setTimeout(() => g.Views.globalSearch(q), 320);
    });

    /* Delegasyon */
    document.addEventListener("click", (e) => {
      const cl = e.target.closest("[data-close]"); if (cl) { closeModal(); return; }

      const go_ = e.target.closest("[data-go]"); if (go_) { e.preventDefault(); closeModal(); go(go_.dataset.go); return; }
      const oc = e.target.closest("[data-cust]"); if (oc) { e.preventDefault(); g.Views.customerModal(oc.dataset.cust); return; }
      const op = e.target.closest("[data-pol]"); if (op) { e.preventDefault(); g.Views.policyModal(op.dataset.pol); return; }
      const os = e.target.closest("[data-staff]"); if (os) { e.preventDefault(); g.Views.staffModal(os.dataset.staff); return; }
      const oa = e.target.closest("[data-asset]"); if (oa) { e.preventDefault(); g.Views.assetModal(oa.dataset.asset); return; }
      const oi = e.target.closest("[data-integ]"); if (oi) { e.preventDefault(); g.Views.integrationModal(oi.dataset.integ); return; }
      const ot = e.target.closest("[data-task]"); if (ot) { e.preventDefault(); g.Views.taskModal(ot.dataset.task); return; }

      const demo = e.target.closest("[data-demo]"); if (demo) { e.preventDefault(); toast(demo.dataset.demo); return; }

      /* tablo etkileşimleri */
      const wrap = e.target.closest("[data-table]");
      if (wrap) {
        const st = TSTATE[wrap.dataset.table];
        const so = e.target.closest("[data-tsort]");
        if (so) { const k = so.dataset.tsort; if (st.sort === k) st.dir = st.dir === "asc" ? "desc" : "asc"; else { st.sort = k; st.dir = "asc"; } refresh(); return; }
        const pg = e.target.closest("[data-tpage]"); if (pg) { st.page = +pg.dataset.tpage; refresh(); return; }
        const rs = e.target.closest("[data-treset]"); if (rs) { st.q = ""; st.f = {}; st.page = 1; refresh(); return; }
        const tr = e.target.closest("[data-trow]");
        if (tr && !e.target.closest("button,a")) {
          const cfg = TSTATE[wrap.dataset.table]._cfg;
          if (cfg && cfg.onRow) cfg.onRow(tr.dataset.trow);
          return;
        }
      }

      /* chip filtreleri */
      const chip = e.target.closest("[data-chip]");
      if (chip) {
        const tId = chip.dataset.chipTable, k = chip.dataset.chipKey, v = chip.dataset.chip;
        const st = TSTATE[tId]; if (!st) return;
        st.f[k] = st.f[k] === v ? "" : v; st.page = 1; refresh(); return;
      }
    });

    document.addEventListener("input", (e) => {
      const wrap = e.target.closest("[data-table]"); if (!wrap) return;
      const st = TSTATE[wrap.dataset.table];
      if (e.target.matches("[data-tq]")) {
        st.q = e.target.value; st.page = 1;
        clearTimeout(g._tq); g._tq = setTimeout(() => {
          refresh();
          const el = document.querySelector(`[data-table="${wrap.dataset.table}"] [data-tq]`);
          if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        }, 220);
      }
    });
    document.addEventListener("change", (e) => {
      const wrap = e.target.closest("[data-table]"); if (!wrap) return;
      const st = TSTATE[wrap.dataset.table];
      if (e.target.matches("[data-tf]")) { st.f[e.target.dataset.tf] = e.target.value; st.page = 1; refresh(); }
    });
  }

  /* ---------- Dışa aktar ---------- */
  g.App = {
    $, esc, fmtTL: g.fmtTL, fmtTL2, fmtN, fmtDate, monthKey, monthLabel, AYLAR,
    DB, IDX, insByPolicy, polByCustomer, insByCustomer, polPaid,
    custName, staffName, comName, avatar, badge, toast, modal, closeModal,
    table, route, icon, go, refresh,
    start() { wire(); render(); toast("Demo veri yüklendi · 84 müşteri, 230 poliçe"); }
  };
})(window);
