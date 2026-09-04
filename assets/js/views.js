/* ============================================================
   SigortaOS — Modül ekranları (bölüm 1/2)
   ============================================================ */
(function (g) {
  "use strict";
  const A = g.App, DB = g.DB, C = g.Chart;
  const { esc, fmtTL, fmtTL2, fmtN, fmtDate, monthKey, monthLabel, badge, avatar, table, route, toast, modal, custName, staffName, comName, polPaid, IDX, insByPolicy, polByCustomer, insByCustomer } = A;
  const V = g.Views = {};
  const TODAY = DB.todayStr;
  const dd = (a, b) => DB.util.diffDays(a, b);

  /* ---------- Ortak hesaplar ---------- */
  function lastMonths(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = DB.util.addMonths(DB.today, -i);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return out;
  }
  function financeByMonth(months) {
    const inc = {}, exp = {};
    months.forEach(m => { inc[m] = 0; exp[m] = 0; });
    DB.finance.forEach(f => {
      const m = monthKey(f.date);
      if (!(m in inc)) return;
      if (f.kind === "Gelir") inc[m] += f.amount; else exp[m] += f.amount;
    });
    return { inc, exp };
  }
  const activePolicies = () => DB.policies.filter(p => p.status === "Aktif");
  const overdue = () => DB.installments.filter(t => t.status === "Gecikmiş");
  const upcoming = (days) => DB.installments.filter(t => t.status === "Bekliyor" && dd(t.due, TODAY) >= 0 && dd(t.due, TODAY) <= days);
  const expiring = (days) => DB.policies.filter(p => p.status === "Aktif" && dd(p.end, TODAY) >= 0 && dd(p.end, TODAY) <= days);

  function kpi(cls, title, value, desc) {
    return `<div class="kpi ${cls}"><div class="t">${title}</div><div class="v">${value}</div><div class="d">${desc}</div></div>`;
  }
  const card = (title, desc, right, body, tight) =>
    `<div class="card"><div class="card-h"><div><h3>${title}</h3>${desc ? `<div class="desc">${desc}</div>` : ""}</div>${right ? `<div class="right">${right}</div>` : ""}</div><div class="card-b ${tight ? "tight" : ""}">${body}</div></div>`;

  const linkCust = (id) => `<a href="#" data-cust="${esc(id)}" class="strong">${esc(custName(id))}</a>`;
  const linkPol = (id) => `<a href="#" data-pol="${esc(id)}" class="strong">${esc(IDX.pol[id] ? IDX.pol[id].no : id)}</a>`;
  const coTag = (cid) => {
    const c = IDX.com[cid];
    return `<span class="badge" style="background:${c.color}18;color:${c.color}"><i class="dot"></i>${esc(c.short)}</span>`;
  };
  const dueTag = (d) => {
    const k = dd(d, TODAY);
    if (k < 0) return `<span class="badge b-bad"><i class="dot"></i>${-k} gün gecikme</span>`;
    if (k === 0) return `<span class="badge b-warn"><i class="dot"></i>Bugün</span>`;
    if (k <= 7) return `<span class="badge b-warn"><i class="dot"></i>${k} gün kaldı</span>`;
    return `<span class="badge b-idle"><i class="dot"></i>${k} gün kaldı</span>`;
  };

  /* =========================================================
     1) KONTROL PANELİ
     ========================================================= */
  route("dashboard", {
    title: "Kontrol Paneli", sub: "4 Eylül 2026 · genel durum özeti",
    view() {
      const months = lastMonths(12);
      const { inc, exp } = financeByMonth(months);
      const curM = months[months.length - 1], prevM = months[months.length - 2];
      const incNow = inc[curM], incPrev = inc[prevM] || 1;
      const trend = Math.round(((incNow - incPrev) / incPrev) * 100);

      const act = activePolicies();
      const ov = overdue(), ovSum = ov.reduce((a, t) => a + t.amount, 0);
      const up30 = upcoming(30), up30Sum = up30.reduce((a, t) => a + t.amount, 0);
      const yearInc = months.reduce((a, m) => a + inc[m], 0);
      const yearExp = months.reduce((a, m) => a + exp[m], 0);
      const comTotal = act.reduce((a, p) => a + p.commission, 0);

      const kpis = `<div class="grid g-4 mb">
        ${kpi("", "Toplam Müşteri", fmtN(DB.customers.length), `<span class="trend up">+${DB.customers.filter(c => dd(TODAY, c.createdAt) < 30).length}</span> son 30 günde`)}
        ${kpi("ok", "Aktif Poliçe", fmtN(act.length), `${fmtN(DB.policies.length)} toplam kayıt · ${fmtN(expiring(30).length)} yakında bitiyor`)}
        ${kpi("bad", "Gecikmiş Tahsilat", fmtTL(ovSum), `${ov.length} taksit · ${new Set(ov.map(t => t.customerId)).size} müşteri`)}
        ${kpi("warn", "30 Günlük Vade", fmtTL(up30Sum), `${up30.length} taksit ödeme bekliyor`)}
      </div>
      <div class="grid g-4 mb">
        ${kpi("info", "Bu Ay Gelir", fmtTL(incNow), `<span class="trend ${trend >= 0 ? "up" : "down"}">${trend >= 0 ? "▲" : "▼"} %${Math.abs(trend)}</span> geçen aya göre`)}
        ${kpi("bad", "Bu Ay Gider", fmtTL(exp[curM]), `Net: <b style="color:${incNow - exp[curM] >= 0 ? "var(--ok)" : "var(--bad)"}">${fmtTL(incNow - exp[curM])}</b>`)}
        ${kpi("ok", "12 Aylık Net Kâr", fmtTL(yearInc - yearExp), `Gelir ${fmtTL(yearInc)} · Gider ${fmtTL(yearExp)}`)}
        ${kpi("", "Portföy Komisyonu", fmtTL(comTotal), `Aktif poliçelerin hak edişi`)}
      </div>`;

      // Gelir-gider grafiği
      const chart = C.line({
        height: 230, money: true, labels: months.map(monthLabel),
        series: [
          { name: "Gelir", data: months.map(m => inc[m]), color: "#0f9d58" },
          { name: "Gider", data: months.map(m => exp[m]), color: "#d33a3a" }
        ]
      });

      // Branş dağılımı
      const brMap = {};
      act.forEach(p => { brMap[p.branchName] = (brMap[p.branchName] || 0) + 1; });
      const brData = Object.keys(brMap).map(k => ({ label: k, value: brMap[k] })).sort((a, b) => b.value - a.value).slice(0, 6);

      // Personel performansı
      const perf = DB.staff.filter(s => s.comRate > 0).map(s => {
        const ps = act.filter(p => p.repId === s.id);
        return { label: s.name, value: ps.reduce((a, p) => a + p.gross, 0), extra: ps.length + " poliçe" };
      }).sort((a, b) => b.value - a.value).slice(0, 6);

      // Yaklaşan vadeler
      const soon = up30.slice().sort((a, b) => a.due.localeCompare(b.due)).slice(0, 7);
      const soonList = soon.map(t => `<div class="list-item"><div class="ico-box">${A.icon("card", 16)}</div>
        <div class="txt"><b>${esc(custName(t.customerId))}</b><span>${esc(IDX.pol[t.policyId].branchName)} · ${t.no}/${t.of}. taksit · ${fmtDate(t.due)}</span></div>
        <div class="right"><div class="strong num">${fmtTL(t.amount)}</div><div style="margin-top:3px">${dueTag(t.due)}</div></div></div>`).join("");

      // Biten poliçeler
      const exp30 = expiring(30).sort((a, b) => a.end.localeCompare(b.end)).slice(0, 7);
      const expList = exp30.map(p => `<div class="list-item"><div class="ico-box" style="background:var(--warn-bg);color:var(--warn)">${A.icon("file", 16)}</div>
        <div class="txt"><b>${esc(custName(p.customerId))}</b><span>${esc(p.branchName)} · ${esc(comName(p.companyId))} · ${esc(p.no)}</span></div>
        <div class="right"><div class="small muted">${fmtDate(p.end)}</div><div style="margin-top:3px">${dueTag(p.end)}</div></div></div>`).join("");

      // Entegrasyon durumu
      const integ = DB.integrations.map(i => {
        const c = IDX.com[i.companyId];
        return `<div class="list-item" data-integ="${i.companyId}" style="cursor:pointer">
          <div class="ico-box" style="background:${c.color}15;color:${c.color}">${A.icon("plug", 16)}</div>
          <div class="txt"><b>${esc(c.name)}</b><span>${esc(i.method)} · her ${esc(i.freq)} · ${fmtN(i.records)} poliçe</span></div>
          <div class="right">${badge(i.status)}<div class="small muted" style="margin-top:3px">${esc(i.lastRun.slice(11))}</div></div></div>`;
      }).join("");

      const tasksOpen = DB.tasks.filter(t => t.status !== "Tamamlandı");
      const taskList = tasksOpen.slice(0, 6).map(t => `<div class="list-item" data-task="${t.id}" style="cursor:pointer">
        ${avatar(staffName(t.assigneeId), 30)}
        <div class="txt"><b>${esc(t.title)}</b><span>${esc(staffName(t.assigneeId))}${t.customerId ? " · " + esc(custName(t.customerId)) : ""}</span></div>
        <div class="right">${badge(t.status)}<div class="small muted" style="margin-top:3px">${fmtDate(t.due)}</div></div></div>`).join("");

      return kpis +
        `<div class="grid g-23 mb">
          ${card("Gelir / Gider Trendi", "Son 12 ay", `<button class="btn btn-sm" data-go="finans">Detay</button>`, chart)}
          ${card("Branş Dağılımı", "Aktif poliçeler", "", C.donut({ data: brData, size: 170, centerValue: fmtN(act.length), centerLabel: "aktif poliçe" }))}
        </div>
        <div class="grid g-2 mb">
          ${card("Yaklaşan Vadeler", "Önümüzdeki 30 gün", `<button class="btn btn-sm" data-go="tahsilat">Tümü (${up30.length})</button>`, soonList || `<div class="empty">Yaklaşan vade yok</div>`, true)}
          ${card("Yenileme Zamanı Gelen Poliçeler", "30 gün içinde bitiyor", `<button class="btn btn-sm" data-go="policeler">Tümü (${expiring(30).length})</button>`, expList || `<div class="empty">Kayıt yok</div>`, true)}
        </div>
        <div class="grid g-2 mb">
          ${card("Personel Performansı", "Aktif poliçe üretimi (prim)", `<button class="btn btn-sm" data-go="komisyon">Komisyonlar</button>`, C.hbars({ data: perf, money: true }))}
          ${card("Sigorta Şirketi Entegrasyonları", "Otomatik veri aktarımı", `<button class="btn btn-sm" data-go="entegrasyon">Yönet</button>`, integ, true)}
        </div>
        ${card("Açık Görevler", `${tasksOpen.length} görev takipte`, `<button class="btn btn-sm" data-go="gorevler">Görev Panosu</button>`, taskList, true)}`;
    }
  });

  /* =========================================================
     2) ENTEGRASYONLAR
     ========================================================= */
  route("entegrasyon", {
    title: "Sigorta Şirketi Entegrasyonları", sub: "Otomatik veri aktarımı ve senkronizasyon durumu",
    view() {
      const ok = DB.integrations.filter(i => i.status === "Aktif").length;
      const err = DB.integrations.filter(i => i.status === "Hata" || i.status === "Uyarı").length;
      const auto = DB.policies.filter(p => p.source === "Entegrasyon").length;

      const kpis = `<div class="grid g-4 mb">
        ${kpi("ok", "Bağlı Şirket", `${ok} / ${DB.integrations.length}`, "Aktif çalışan entegrasyon")}
        ${kpi("bad", "Müdahale Gereken", String(err), "Hata veya uyarı veren bağlantı")}
        ${kpi("info", "Otomatik Gelen Poliçe", fmtN(auto), `Toplamın %${Math.round(auto / DB.policies.length * 100)}'i`)}
        ${kpi("warn", "Son 24 Saat", fmtN(DB.syncLog.filter(s => s.at.startsWith(TODAY)).length) + " çalışma", `${DB.syncLog.filter(s => s.result === "Hatalı" && s.at.startsWith(TODAY)).length} hatalı deneme`)}
      </div>`;

      const cards = DB.integrations.map(i => {
        const c = IDX.com[i.companyId];
        return `<div class="card" data-integ="${i.companyId}" style="cursor:pointer">
          <div class="card-b">
            <div class="row" style="gap:11px;margin-bottom:12px">
              <div class="ico-box" style="background:${c.color}15;color:${c.color};width:38px;height:38px;flex-basis:38px">${A.icon("plug", 18)}</div>
              <div style="min-width:0;flex:1">
                <b style="font-size:13.5px;display:block">${esc(c.name)}</b>
                <span class="small muted">${esc(i.method)}</span>
              </div>
              ${badge(i.status)}
            </div>
            <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;background:var(--surface-2);border-radius:9px;padding:10px 0;margin-bottom:11px">
              <div><div class="strong num">${fmtN(i.records)}</div><div class="small muted">poliçe</div></div>
              <div><div class="strong num" style="color:var(--ok)">+${i.newRec}</div><div class="small muted">yeni</div></div>
              <div><div class="strong num" style="color:${i.errors ? "var(--bad)" : "var(--muted)"}">${i.errors}</div><div class="small muted">hata</div></div>
            </div>
            <div class="small muted" style="line-height:1.5">${esc(i.message)}</div>
            <div class="sep" style="margin:11px 0"></div>
            <div class="row small muted" style="justify-content:space-between">
              <span>Sıklık: <b class="muted">${esc(i.freq)}</b></span>
              <span>Son: ${esc(i.lastRun.slice(5))}</span>
            </div>
          </div></div>`;
      }).join("");

      const logRows = table({
        id: "synclog", rows: DB.syncLog, perPage: 10, defaultSort: "at", defaultDir: "desc",
        search: (r, q) => (comName(r.companyId) + r.note).toLocaleLowerCase("tr").includes(q),
        searchPlaceholder: "Şirket veya mesaj ara…",
        filters: [
          { key: "res", label: "Tüm sonuçlar", options: ["Başarılı", "Hatalı"], apply: (r, v) => r.result === v },
          { key: "typ", label: "Tüm tetikleyiciler", options: ["Otomatik", "Manuel"], apply: (r, v) => r.type === v }
        ],
        columns: [
          { key: "at", label: "Zaman", render: r => `<span class="num">${esc(r.at)}</span>` },
          { key: "companyId", label: "Şirket", render: r => `${coTag(r.companyId)} <span class="small muted hide-sm">${esc(comName(r.companyId))}</span>` },
          { key: "type", label: "Tetikleyici", render: r => badge(r.type) },
          { key: "records", label: "Kayıt", cls: "num", render: r => fmtN(r.records) },
          { key: "result", label: "Sonuç", render: r => badge(r.result) },
          { key: "note", label: "Açıklama", cls: "hide-sm", render: r => `<span class="small muted">${esc(r.note)}</span>` }
        ]
      });

      return kpis +
        `<div class="hint mb">Entegrasyon önceliği: <b>1)</b> şirketin resmi API/Web Servisi → <b>2)</b> SFTP/CSV dosya aktarımı → <b>3)</b> yalnızca resmi yöntem yoksa, acentenin kendi yetkili kullanıcı bilgileriyle portal üzerinden dosya içe aktarımı. Yeni şirket eklemek, ortak veri şemasına bir "adaptör" yazmak demektir; çekirdek sistem değişmez.</div>
        <div class="grid g-3 mb">${cards}</div>
        ${card("Senkronizasyon Kayıtları", "Tüm çalışma geçmişi", `<button class="btn btn-sm" data-demo="Demoda dışa aktarma devre dışı.">CSV indir</button>`, logRows, true)}`;
    }
  });

  V.integrationModal = function (cid) {
    const c = IDX.com[cid], i = DB.integrations.find(x => x.companyId === cid);
    const pols = DB.policies.filter(p => p.companyId === cid);
    const prim = pols.reduce((a, p) => a + p.gross, 0);
    const com = pols.reduce((a, p) => a + p.commission, 0);
    const brMap = {};
    pols.forEach(p => { brMap[p.branchName] = (brMap[p.branchName] || 0) + 1; });
    const runs = DB.syncLog.filter(s => s.companyId === cid).slice(0, 8);

    modal({
      title: c.name, sub: `${esc(i.method)} · ${badge(i.status)}`,
      avatar: `<div class="ico-box" style="background:${c.color}15;color:${c.color};width:40px;height:40px;flex-basis:40px">${A.icon("plug", 20)}</div>`,
      body: `<div class="dl mb">
          <div><dt>Entegrasyon Yöntemi</dt><dd>${esc(i.method)}</dd></div>
          <div><dt>Çalışma Sıklığı</dt><dd>Her ${esc(i.freq)}</dd></div>
          <div><dt>Son Çalışma</dt><dd>${esc(i.lastRun)} (${esc(i.duration)})</dd></div>
          <div><dt>Kayıt Sayısı</dt><dd>${fmtN(i.records)} poliçe</dd></div>
          <div><dt>Toplam Prim</dt><dd>${fmtTL(prim)}</dd></div>
          <div><dt>Toplam Komisyon</dt><dd>${fmtTL(com)}</dd></div>
        </div>
        <div class="hint mb"><b>Durum mesajı:</b> ${esc(i.message)}</div>
        <h4 style="font-size:13px;margin-bottom:9px">Branş Dağılımı</h4>
        ${C.hbars({ data: Object.keys(brMap).map(k => ({ label: k, value: brMap[k] })).sort((a, b) => b.value - a.value) })}
        <div class="sep"></div>
        <h4 style="font-size:13px;margin-bottom:9px">Son Çalışmalar</h4>
        <div class="timeline">${runs.map(r => `<div class="tl-item"><div class="h">${badge(r.result)} <span style="font-weight:500">${fmtN(r.records)} kayıt işlendi</span></div><div class="m">${esc(r.at)} · ${esc(r.type)} · ${esc(r.note)}</div></div>`).join("")}</div>`,
      footer: `<button class="btn" data-demo="Ayar ekranı demoda yer almıyor.">Ayarlar</button><button class="btn btn-p" data-demo="${esc(c.name)} için manuel senkronizasyon kuyruğa alındı.">Şimdi Senkronize Et</button>`
    });
  };

  /* =========================================================
     3) MÜŞTERİLER
     ========================================================= */
  route("musteriler", {
    title: "Müşteri Yönetimi", sub: "Portföydeki tüm bireysel ve kurumsal müşteriler",
    view() {
      const cs = DB.customers;
      const kur = cs.filter(c => c.type === "Kurumsal").length;
      const vip = cs.filter(c => c.segment === "VIP").length;
      const risk = new Set(overdue().map(t => t.customerId)).size;

      const kpis = `<div class="grid g-4 mb">
        ${kpi("", "Toplam Müşteri", fmtN(cs.length), `${cs.length - kur} bireysel · ${kur} kurumsal`)}
        ${kpi("ok", "Poliçeli Müşteri", fmtN(Object.keys(polByCustomer).length), "En az bir aktif kaydı olan")}
        ${kpi("info", "VIP Segment", fmtN(vip), "Özel takip listesi")}
        ${kpi("bad", "Riskli Müşteri", fmtN(risk), "Gecikmiş ödemesi bulunan")}
      </div>`;

      const tbl = table({
        id: "cust", rows: cs, perPage: 12, defaultSort: "name", defaultDir: "asc",
        searchPlaceholder: "Ad, telefon, e-posta, şehir…",
        search: (r, q) => (r.name + r.phone + r.email + r.city + r.id).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "type", label: "Tüm tipler", options: ["Bireysel", "Kurumsal"], apply: (r, v) => r.type === v },
          { key: "seg", label: "Tüm segmentler", options: ["VIP", "Standart", "Potansiyel"], apply: (r, v) => r.segment === v },
          { key: "city", label: "Tüm şehirler", options: Array.from(new Set(cs.map(c => c.city))).sort(), apply: (r, v) => r.city === v },
          { key: "rep", label: "Tüm temsilciler", options: DB.staff.filter(s => s.comRate > 0).map(s => ({ value: s.id, label: s.name })), apply: (r, v) => r.rep === v }
        ],
        onRow: (id) => V.customerModal(id),
        columns: [
          {
            key: "name", label: "Müşteri", render: r => `<div class="who">${avatar(r.name)}<div><b>${esc(r.name)}</b><span class="sub">${esc(r.id)} · ${esc(r.tckn)}</span></div></div>`
          },
          { key: "type", label: "Tip", cls: "hide-sm", render: r => `${badge(r.type)} ${r.segment === "VIP" ? badge("VIP") : ""}` },
          { key: "city", label: "Şehir", cls: "hide-sm" },
          { key: "phone", label: "İletişim", cls: "hide-sm", render: r => `<div>${esc(r.phone)}</div><div class="sub">${esc(r.email)}</div>` },
          { key: "pols", label: "Poliçe", cls: "num", sortValue: r => (polByCustomer[r.id] || []).length, render: r => { const l = polByCustomer[r.id] || []; return `<b>${l.filter(p => p.status === "Aktif").length}</b><span class="sub"> / ${l.length}</span>`; } },
          { key: "prim", label: "Toplam Prim", cls: "num", sortValue: r => (polByCustomer[r.id] || []).reduce((a, p) => a + p.gross, 0), render: r => fmtTL((polByCustomer[r.id] || []).reduce((a, p) => a + p.gross, 0)) },
          {
            key: "durum", label: "Ödeme Durumu", sortable: false, render: r => {
              const l = insByCustomer[r.id] || [];
              if (l.some(t => t.status === "Gecikmiş")) return badge("Gecikmiş");
              if (l.some(t => t.status === "Bekliyor")) return badge("Bekliyor");
              return badge("Ödendi");
            }
          },
          { key: "act", label: "", sortable: false, cls: "right", render: r => `<button class="btn btn-sm" data-cust="${r.id}">Detay</button>` }
        ]
      });

      return kpis + card("Müşteri Listesi", "", `<button class="btn btn-sm" data-demo="Demoda kayıt ekleme kapalı.">CSV Aktar</button><button class="btn btn-sm btn-p" data-demo="Yeni müşteri formu demoda pasif.">+ Yeni Müşteri</button>`, tbl, true);
    }
  });

  V.customerModal = function (id) {
    const c = IDX.cus[id];
    if (!c) return;
    const pols = (polByCustomer[id] || []).slice().sort((a, b) => b.start.localeCompare(a.start));
    const ins = (insByCustomer[id] || []).slice().sort((a, b) => b.due.localeCompare(a.due));
    const paid = ins.filter(t => t.status === "Ödendi").reduce((a, t) => a + t.amount, 0);
    const debt = ins.filter(t => t.status === "Gecikmiş" || t.status === "Bekliyor").reduce((a, t) => a + t.amount, 0);

    const polRows = pols.map(p => {
      const pp = polPaid(p.id);
      return `<tr class="clickable" data-pol="${p.id}"><td><b>${esc(p.no)}</b><div class="sub">${esc(p.branchName)}</div></td>
        <td class="hide-sm">${coTag(p.companyId)}</td>
        <td class="hide-sm"><span class="small">${fmtDate(p.start)} → ${fmtDate(p.end)}</span></td>
        <td class="num">${fmtTL(p.gross)}</td>
        <td><div class="bar"><i class="${pp.overdue ? "bad" : pp.pct === 100 ? "ok" : ""}" style="width:${pp.pct}%"></i></div><span class="sub">%${pp.pct} ödendi</span></td>
        <td>${badge(p.status)}</td></tr>`;
    }).join("");

    const insRows = ins.slice(0, 18).map(t => `<tr><td>${fmtDate(t.due)}</td>
      <td class="hide-sm">${esc(IDX.pol[t.policyId].no)}<div class="sub">${esc(IDX.pol[t.policyId].branchName)}</div></td>
      <td>${t.no}/${t.of}</td><td class="num">${fmtTL2(t.amount)}</td>
      <td class="hide-sm">${t.method ? esc(t.method) : "-"}</td><td>${badge(t.status)}</td></tr>`).join("");

    const notes = c.notes.length ? `<div class="timeline">${c.notes.map(n => `<div class="tl-item"><div class="h">${esc(n.type)} — ${esc(n.text)}</div><div class="m">${fmtDate(n.date)} · ${esc(n.by)}</div></div>`).join("")}</div>`
      : `<div class="empty"><b>Kayıt yok</b>Bu müşteri için henüz not girilmemiş.</div>`;

    modal({
      title: c.name, avatar: avatar(c.name, 40),
      sub: `${badge(c.type)} ${c.segment === "VIP" ? badge("VIP") : ""} <span class="muted">${esc(c.id)} · Temsilci: ${esc(staffName(c.rep))}</span>`,
      body: `<div class="grid g-4 mb" style="gap:10px">
          ${kpi("", "Poliçe", `${pols.filter(p => p.status === "Aktif").length}/${pols.length}`, "aktif / toplam")}
          ${kpi("info", "Toplam Prim", fmtTL(pols.reduce((a, p) => a + p.gross, 0)), "tüm poliçeler")}
          ${kpi("ok", "Tahsil Edilen", fmtTL(paid), `${ins.filter(t => t.status === "Ödendi").length} taksit`)}
          ${kpi(debt ? "bad" : "", "Kalan Borç", fmtTL(debt), `${ins.filter(t => t.status === "Gecikmiş").length} gecikmiş taksit`)}
        </div>
        <div class="tabs" data-tabs>
          <button class="on" data-tab="bilgi">Bilgiler</button>
          <button data-tab="pol">Poliçeler (${pols.length})</button>
          <button data-tab="ode">Ödeme Geçmişi</button>
          <button data-tab="not">Notlar & İşlemler</button>
        </div>
        <div data-pane="bilgi">
          <div class="dl">
            <div><dt>Kimlik / Vergi No</dt><dd>${esc(c.tckn)}</dd></div>
            <div><dt>Doğum Tarihi</dt><dd>${fmtDate(c.birth)}</dd></div>
            <div><dt>Telefon</dt><dd>${esc(c.phone)}</dd></div>
            <div><dt>E-posta</dt><dd>${esc(c.email)}</dd></div>
            <div><dt>Şehir</dt><dd>${esc(c.city)}</dd></div>
            <div><dt>Adres</dt><dd>${esc(c.address)}</dd></div>
            <div><dt>Kayıt Tarihi</dt><dd>${fmtDate(c.createdAt)}</dd></div>
            <div><dt>Geliş Kanalı</dt><dd>${esc(c.source)}</dd></div>
            <div><dt>Müşteri Temsilcisi</dt><dd>${esc(staffName(c.rep))}</dd></div>
            <div><dt>KVKK Onayı</dt><dd>${c.kvkk ? badge("Aktif") : badge("Bekliyor")}</dd></div>
          </div>
        </div>
        <div data-pane="pol" hidden><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Poliçe</th><th class="hide-sm">Şirket</th><th class="hide-sm">Dönem</th><th class="num">Prim</th><th>Tahsilat</th><th>Durum</th></tr></thead><tbody>${polRows || `<tr><td colspan="6"><div class="empty">Poliçe yok</div></td></tr>`}</tbody></table></div></div>
        <div data-pane="ode" hidden><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vade</th><th class="hide-sm">Poliçe</th><th>Taksit</th><th class="num">Tutar</th><th class="hide-sm">Yöntem</th><th>Durum</th></tr></thead><tbody>${insRows}</tbody></table></div></div>
        <div data-pane="not" hidden>${notes}</div>`,
      footer: `<button class="btn" data-demo="Not ekleme demoda pasif.">+ Not Ekle</button><button class="btn btn-p" data-demo="Teklif ekranı demoda yer almıyor.">Yeni Poliçe Teklifi</button>`,
      onMount: bindTabs
    });
  };

  function bindTabs(host) {
    const tabs = host.querySelector("[data-tabs]");
    if (!tabs) return;
    tabs.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]"); if (!b) return;
      tabs.querySelectorAll("button").forEach(x => x.classList.remove("on"));
      b.classList.add("on");
      host.querySelectorAll("[data-pane]").forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
    });
  }
  V._bindTabs = bindTabs;

  /* =========================================================
     4) POLİÇELER
     ========================================================= */
  route("policeler", {
    title: "Poliçe Yönetimi", sub: "Hayat, BES, elementer — tüm branşlar tek listede",
    view() {
      const act = activePolicies();
      const prim = act.reduce((a, p) => a + p.gross, 0);
      const com = act.reduce((a, p) => a + p.commission, 0);
      const ex30 = expiring(30);

      const kpis = `<div class="grid g-4 mb">
        ${kpi("ok", "Aktif Poliçe", fmtN(act.length), `${fmtN(DB.policies.length)} toplam kayıt`)}
        ${kpi("", "Aktif Prim Üretimi", fmtTL(prim), `Ortalama ${fmtTL(prim / (act.length || 1))}`)}
        ${kpi("info", "Beklenen Komisyon", fmtTL(com), `Ortalama oran %${Math.round(com / prim * 100)}`)}
        ${kpi("warn", "30 Gün İçinde Bitiyor", fmtN(ex30.length), `${fmtTL(ex30.reduce((a, p) => a + p.gross, 0))} yenileme fırsatı`)}
      </div>`;

      const chips = ["Tümü", "Aktif", "Beklemede", "Süresi Doldu", "İptal"].map(s =>
        `<button class="chip ${(table.state.pol && table.state.pol.f.st) === (s === "Tümü" ? "" : s) ? "on" : ""}" data-chip="${s === "Tümü" ? "" : s}" data-chip-key="st" data-chip-table="pol">${s}</button>`).join("");

      const tbl = table({
        id: "pol", rows: DB.policies, perPage: 12, defaultSort: "start", defaultDir: "desc",
        searchPlaceholder: "Poliçe no, müşteri, plaka…",
        search: (r, q) => (r.no + custName(r.customerId) + (r.plate || "") + r.branchName).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "st", label: "Tüm durumlar", options: ["Aktif", "Beklemede", "Süresi Doldu", "İptal"], apply: (r, v) => r.status === v },
          { key: "br", label: "Tüm branşlar", options: DB.branches.map(b => ({ value: b.key, label: b.name })), apply: (r, v) => r.branch === v },
          { key: "co", label: "Tüm şirketler", options: DB.companies.map(c => ({ value: c.id, label: c.name })), apply: (r, v) => r.companyId === v },
          { key: "rep", label: "Tüm personel", options: DB.staff.filter(s => s.comRate > 0).map(s => ({ value: s.id, label: s.name })), apply: (r, v) => r.repId === v },
          { key: "vade", label: "Vade filtresi", options: [{ value: "30", label: "30 gün içinde bitenler" }, { value: "90", label: "90 gün içinde bitenler" }, { value: "gec", label: "Gecikmiş ödemesi olanlar" }], apply: (r, v) => v === "gec" ? polPaid(r.id).overdue : (dd(r.end, TODAY) >= 0 && dd(r.end, TODAY) <= +v) }
        ],
        onRow: (id) => V.policyModal(id),
        columns: [
          { key: "no", label: "Poliçe No", render: r => `<b>${esc(r.no)}</b><div class="sub">${esc(r.branchName)}${r.plate ? " · " + esc(r.plate) : ""}</div>` },
          { key: "customerId", label: "Müşteri", sortValue: r => custName(r.customerId), render: r => `<div class="who">${avatar(custName(r.customerId), 26)}<div><b>${esc(custName(r.customerId))}</b><span class="sub">${esc(IDX.cus[r.customerId].city)}</span></div></div>` },
          { key: "companyId", label: "Şirket", cls: "hide-sm", sortValue: r => comName(r.companyId), render: r => coTag(r.companyId) },
          { key: "end", label: "Bitiş", cls: "hide-sm", render: r => `${fmtDate(r.end)}<div class="sub">${dd(r.end, TODAY) >= 0 && r.status === "Aktif" ? dd(r.end, TODAY) + " gün" : "-"}</div>` },
          { key: "gross", label: "Prim", cls: "num", render: r => `${fmtTL(r.gross)}<div class="sub">${r.installments} taksit</div>` },
          { key: "commission", label: "Komisyon", cls: "num", render: r => `${fmtTL(r.commission)}<div class="sub">%${Math.round(r.comRate * 100)}</div>` },
          { key: "tah", label: "Tahsilat", sortable: false, render: r => { const p = polPaid(r.id); return `<div class="bar"><i class="${p.overdue ? "bad" : p.pct === 100 ? "ok" : ""}" style="width:${p.pct}%"></i></div><span class="sub">%${p.pct}</span>`; } },
          { key: "status", label: "Durum", render: r => badge(r.status) }
        ]
      });

      return kpis + `<div class="row mb"><div class="chips">${chips}</div></div>` +
        card("Poliçe Listesi", "", `<button class="btn btn-sm" data-demo="Demoda dışa aktarma kapalı.">Excel</button><button class="btn btn-sm btn-p" data-demo="Poliçe girişi demoda pasif.">+ Poliçe Ekle</button>`, tbl, true);
    }
  });

  V.policyModal = function (id) {
    const p = IDX.pol[id]; if (!p) return;
    const c = IDX.cus[p.customerId], co = IDX.com[p.companyId];
    const ins = (insByPolicy[id] || []).slice().sort((a, b) => a.due.localeCompare(b.due));
    const pp = polPaid(id);
    const rows = ins.map(t => `<tr><td>${t.no}/${t.of}</td><td>${fmtDate(t.due)}</td><td class="num">${fmtTL2(t.amount)}</td>
      <td class="hide-sm">${t.paidAt ? fmtDate(t.paidAt) : "-"}</td><td class="hide-sm">${t.method ? esc(t.method) : "-"}</td>
      <td>${badge(t.status)}</td>
      <td class="right">${t.status !== "Ödendi" && t.status !== "İptal" ? `<button class="btn btn-sm" data-demo="Tahsilat kaydı demoda işlenmez.">Tahsil Et</button>` : ""}</td></tr>`).join("");

    modal({
      title: p.no, avatar: `<div class="ico-box" style="background:${co.color}15;color:${co.color};width:40px;height:40px;flex-basis:40px">${A.icon("file", 20)}</div>`,
      sub: `${badge(p.status)} <span class="muted">${esc(co.name)} · ${esc(p.branchName)}</span>`,
      body: `<div class="grid g-4 mb" style="gap:10px">
          ${kpi("", "Brüt Prim", fmtTL(p.gross), `Net ${fmtTL(p.net)}`)}
          ${kpi("info", "Komisyon", fmtTL(p.commission), `Oran %${Math.round(p.comRate * 100)}`)}
          ${kpi(pp.overdue ? "bad" : "ok", "Tahsil Edilen", fmtTL(pp.paid), `%${pp.pct} · kalan ${fmtTL(pp.total - pp.paid)}`)}
          ${kpi("warn", "Kalan Gün", p.status === "Aktif" ? String(Math.max(0, dd(p.end, TODAY))) : "-", `Bitiş ${fmtDate(p.end)}`)}
        </div>
        <div class="dl mb">
          <div><dt>Müşteri</dt><dd>${linkCust(p.customerId)} <span class="muted small">(${esc(c.type)})</span></dd></div>
          <div><dt>Sigorta Şirketi</dt><dd>${esc(co.name)}</dd></div>
          <div><dt>Branş / Ürün</dt><dd>${esc(p.branchName)}</dd></div>
          <div><dt>Başlangıç - Bitiş</dt><dd>${fmtDate(p.start)} → ${fmtDate(p.end)}</dd></div>
          <div><dt>Taksit</dt><dd>${p.installments} taksit</dd></div>
          <div><dt>Üretim Personeli</dt><dd><a href="#" data-staff="${p.repId}">${esc(staffName(p.repId))}</a></dd></div>
          ${p.plate ? `<div><dt>Plaka</dt><dd>${esc(p.plate)}</dd></div>` : ""}
          <div><dt>Veri Kaynağı</dt><dd>${badge(p.source)} <span class="muted small">son eşitleme ${fmtDate(p.lastSync)}</span></dd></div>
        </div>
        ${p.renewalOf ? `<div class="hint mb">Bu poliçe <b>${esc(p.renewalOf)}</b> numaralı kaydın yenilemesidir.</div>` : ""}
        <h4 style="font-size:13px;margin-bottom:9px">Ödeme Planı</h4>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Taksit</th><th>Vade</th><th class="num">Tutar</th><th class="hide-sm">Ödeme</th><th class="hide-sm">Yöntem</th><th>Durum</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`,
      footer: `<button class="btn" data-demo="PDF çıktısı demoda pasif.">Poliçe PDF</button><button class="btn btn-p" data-demo="Yenileme teklifi demoda oluşturulmaz.">Yenileme Başlat</button>`
    });
  };

  /* =========================================================
     5) TAHSİLAT / VADE
     ========================================================= */
  route("tahsilat", {
    title: "Ödeme & Vade Takibi", sub: "Taksit bazında tahsilat durumu",
    view() {
      const ov = overdue(), up7 = upcoming(7), up30 = upcoming(30);
      const paidThisMonth = DB.installments.filter(t => t.paidAt && monthKey(t.paidAt) === monthKey(TODAY));
      const kpis = `<div class="grid g-4 mb">
        ${kpi("bad", "Gecikmiş", fmtTL(ov.reduce((a, t) => a + t.amount, 0)), `${ov.length} taksit · ${new Set(ov.map(t => t.customerId)).size} müşteri`)}
        ${kpi("warn", "7 Gün İçinde", fmtTL(up7.reduce((a, t) => a + t.amount, 0)), `${up7.length} taksit vadesi geliyor`)}
        ${kpi("info", "30 Gün İçinde", fmtTL(up30.reduce((a, t) => a + t.amount, 0)), `${up30.length} taksit`)}
        ${kpi("ok", "Bu Ay Tahsil", fmtTL(paidThisMonth.reduce((a, t) => a + t.amount, 0)), `${paidThisMonth.length} ödeme alındı`)}
      </div>`;

      const months = lastMonths(12);
      const coll = months.map(m => ({
        label: monthLabel(m), short: monthLabel(m).split(" ")[0],
        value: DB.installments.filter(t => t.paidAt && monthKey(t.paidAt) === m).reduce((a, t) => a + t.amount, 0)
      }));

      const stMap = {};
      DB.installments.forEach(t => { stMap[t.status] = (stMap[t.status] || 0) + 1; });
      const donutData = [
        { label: "Ödendi", value: stMap["Ödendi"] || 0, color: "#0f9d58" },
        { label: "Bekliyor", value: stMap["Bekliyor"] || 0, color: "#c47a08" },
        { label: "Gecikmiş", value: stMap["Gecikmiş"] || 0, color: "#d33a3a" },
        { label: "İptal", value: stMap["İptal"] || 0, color: "#94a3b8" }
      ];

      const tbl = table({
        id: "tah", rows: DB.installments, perPage: 14, defaultSort: "due", defaultDir: "asc",
        searchPlaceholder: "Müşteri veya poliçe no…",
        search: (r, q) => (custName(r.customerId) + IDX.pol[r.policyId].no).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "st", label: "Tüm durumlar", options: ["Ödendi", "Bekliyor", "Gecikmiş", "İptal"], apply: (r, v) => r.status === v },
          { key: "per", label: "Tüm vadeler", options: [{ value: "7", label: "7 gün içinde" }, { value: "30", label: "30 gün içinde" }, { value: "gec", label: "Gecikmişler" }], apply: (r, v) => v === "gec" ? r.status === "Gecikmiş" : (r.status === "Bekliyor" && dd(r.due, TODAY) >= 0 && dd(r.due, TODAY) <= +v) },
          { key: "co", label: "Tüm şirketler", options: DB.companies.map(c => ({ value: c.id, label: c.name })), apply: (r, v) => IDX.pol[r.policyId].companyId === v }
        ],
        columns: [
          { key: "due", label: "Vade", render: r => `<b>${fmtDate(r.due)}</b><div class="sub">${r.no}/${r.of}. taksit</div>` },
          { key: "customerId", label: "Müşteri", sortValue: r => custName(r.customerId), render: r => `<div class="who">${avatar(custName(r.customerId), 26)}<div><b>${esc(custName(r.customerId))}</b><span class="sub">${esc(IDX.cus[r.customerId].phone)}</span></div></div>` },
          { key: "policyId", label: "Poliçe", cls: "hide-sm", sortValue: r => IDX.pol[r.policyId].no, render: r => `${linkPol(r.policyId)}<div class="sub">${esc(IDX.pol[r.policyId].branchName)} · ${esc(comName(IDX.pol[r.policyId].companyId))}</div>` },
          { key: "amount", label: "Tutar", cls: "num", render: r => fmtTL2(r.amount) },
          { key: "status", label: "Durum", render: r => `${badge(r.status)}${r.status === "Bekliyor" || r.status === "Gecikmiş" ? `<div style="margin-top:4px">${dueTag(r.due)}</div>` : ""}` },
          { key: "method", label: "Yöntem", cls: "hide-sm", render: r => r.method ? esc(r.method) : `<span class="muted">-</span>` },
          { key: "act", label: "", sortable: false, cls: "right", render: r => r.status === "Ödendi" || r.status === "İptal" ? "" : `<button class="btn btn-sm btn-p" data-demo="Tahsilat kaydı demoda işlenmez.">Tahsil Et</button>` }
        ]
      });

      return kpis + `<div class="grid g-23 mb">
          ${card("Aylık Tahsilat", "Son 12 ay içinde tahsil edilen tutar", "", C.bars({ data: coll, money: true, color: "#0f9d58", height: 210 }))}
          ${card("Taksit Durum Dağılımı", `${fmtN(DB.installments.length)} taksit kaydı`, "", C.donut({ data: donutData, size: 165, centerValue: "%" + Math.round((stMap["Ödendi"] || 0) / DB.installments.length * 100), centerLabel: "tahsilat oranı" }))}
        </div>` +
        card("Taksit Listesi", "", `<button class="btn btn-sm" data-demo="Toplu SMS demoda gönderilmez.">Toplu Hatırlatma SMS</button>`, tbl, true);
    }
  });

  /* Bölüm 2 için ortak yardımcılar */
  V._h = { kpi, card, coTag, dueTag, lastMonths, financeByMonth, activePolicies, overdue, upcoming, expiring, linkCust, linkPol, dd };
})(window);

/* ============================================================
   SigortaOS — Modül ekranları (bölüm 2/2)
   ============================================================ */
(function (g) {
  "use strict";
  const A = g.App, DB = g.DB, C = g.Chart, V = g.Views;
  const { esc, fmtTL, fmtTL2, fmtN, fmtDate, monthKey, monthLabel, badge, avatar, table, route, modal, custName, staffName, comName, polPaid, IDX, insByPolicy, polByCustomer, insByCustomer } = A;
  const { kpi, card, coTag, dueTag, lastMonths, financeByMonth, activePolicies, overdue, upcoming, expiring, linkCust, linkPol, dd } = V._h;
  const TODAY = DB.todayStr;

  /* =========================================================
     6) PERSONEL
     ========================================================= */
  const staffPolicies = (sid) => DB.policies.filter(p => p.repId === sid);
  const staffCommission = (sid, from) => staffPolicies(sid)
    .filter(p => p.status !== "İptal" && (!from || p.start >= from))
    .reduce((a, p) => a + p.commission * IDX.stf[sid].comRate, 0);

  route("personel", {
    title: "Personel Yönetimi", sub: "Kadro, yetki, performans ve komisyon oranları",
    view() {
      const s = DB.staff;
      const aktif = s.filter(x => x.status === "Aktif").length;
      const maas = s.filter(x => x.status !== "Pasif").reduce((a, x) => a + x.salary, 0);
      const y = TODAY.slice(0, 4) + "-01-01";

      const kpis = `<div class="grid g-4 mb">
        ${kpi("", "Toplam Personel", fmtN(s.length), `${aktif} aktif · ${s.length - aktif} izinli/pasif`)}
        ${kpi("info", "Departman", String(DB.departments.length), DB.departments.join(", "))}
        ${kpi("warn", "Aylık Maaş Yükü", fmtTL(maas), "Brüt toplam (SGK hariç)")}
        ${kpi("ok", "Yıllık Komisyon Hak Edişi", fmtTL(s.reduce((a, x) => a + staffCommission(x.id, y), 0)), "2026 üretimi üzerinden")}
      </div>`;

      const cards = s.map(p => {
        const pol = staffPolicies(p.id).filter(x => x.status === "Aktif");
        const prim = pol.reduce((a, x) => a + x.gross, 0);
        const open = DB.tasks.filter(t => t.assigneeId === p.id && t.status !== "Tamamlandı").length;
        const zim = DB.assets.filter(a => a.holderId === p.id).length;
        return `<div class="card" data-staff="${p.id}" style="cursor:pointer"><div class="card-b">
          <div class="row" style="gap:11px;margin-bottom:12px">
            ${avatar(p.name, 42)}
            <div style="min-width:0;flex:1"><b style="font-size:13.5px;display:block">${esc(p.name)}</b><span class="small muted">${esc(p.unvan)} · ${esc(p.dep)}</span></div>
            ${badge(p.status)}
          </div>
          <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;background:var(--surface-2);border-radius:9px;padding:10px 0">
            <div><div class="strong num">${pol.length}</div><div class="small muted">poliçe</div></div>
            <div><div class="strong num">${zim}</div><div class="small muted">zimmet</div></div>
            <div><div class="strong num" style="color:${open ? "var(--warn)" : "var(--muted)"}">${open}</div><div class="small muted">görev</div></div>
          </div>
          <div class="sep" style="margin:11px 0"></div>
          <div class="row small" style="justify-content:space-between">
            <span class="muted">Üretim</span><b class="num">${fmtTL(prim)}</b>
          </div>
          <div class="row small" style="justify-content:space-between;margin-top:5px">
            <span class="muted">Komisyon oranı</span><b>%${Math.round(p.comRate * 100)}</b>
          </div>
        </div></div>`;
      }).join("");

      const tbl = table({
        id: "stf", rows: DB.staff, perPage: 12, defaultSort: "name", defaultDir: "asc",
        searchPlaceholder: "Ad, unvan, e-posta…",
        search: (r, q) => (r.name + r.unvan + r.email + r.dep).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "dep", label: "Tüm departmanlar", options: DB.departments, apply: (r, v) => r.dep === v },
          { key: "rol", label: "Tüm roller", options: DB.roles.map(x => ({ value: x.key, label: x.name })), apply: (r, v) => r.rol === v },
          { key: "st", label: "Tüm durumlar", options: ["Aktif", "İzinli", "Pasif"], apply: (r, v) => r.status === v }
        ],
        onRow: (id) => V.staffModal(id),
        columns: [
          { key: "name", label: "Personel", render: r => `<div class="who">${avatar(r.name)}<div><b>${esc(r.name)}</b><span class="sub">${esc(r.email)}</span></div></div>` },
          { key: "dep", label: "Departman", cls: "hide-sm", render: r => `${esc(r.dep)}<div class="sub">${esc(r.unvan)}</div>` },
          { key: "rol", label: "Yetki", cls: "hide-sm", sortValue: r => r.rol, render: r => badge((DB.roles.find(x => x.key === r.rol) || {}).name || r.rol) },
          { key: "hireDate", label: "İşe Giriş", cls: "hide-sm", render: r => fmtDate(r.hireDate) },
          { key: "pol", label: "Aktif Poliçe", cls: "num", sortValue: r => staffPolicies(r.id).filter(p => p.status === "Aktif").length, render: r => staffPolicies(r.id).filter(p => p.status === "Aktif").length },
          { key: "prim", label: "Üretim", cls: "num", sortValue: r => staffPolicies(r.id).reduce((a, p) => a + p.gross, 0), render: r => fmtTL(staffPolicies(r.id).reduce((a, p) => a + p.gross, 0)) },
          { key: "com", label: "Komisyon Hak Edişi", cls: "num", sortValue: r => staffCommission(r.id), render: r => `${fmtTL(staffCommission(r.id))}<div class="sub">oran %${Math.round(r.comRate * 100)}</div>` },
          { key: "status", label: "Durum", render: r => badge(r.status) }
        ]
      });

      return kpis + `<div class="grid g-4 mb">${cards}</div>` +
        card("Personel Listesi", "", `<button class="btn btn-sm btn-p" data-demo="Personel ekleme demoda pasif.">+ Personel Ekle</button>`, tbl, true);
    }
  });

  V.staffModal = function (id) {
    const p = IDX.stf[id]; if (!p) return;
    const pol = staffPolicies(id);
    const act = pol.filter(x => x.status === "Aktif");
    const months = lastMonths(12);
    const series = months.map(m => pol.filter(x => monthKey(x.start) === m).reduce((a, x) => a + x.gross, 0));
    const tasks = DB.tasks.filter(t => t.assigneeId === id);
    const zim = DB.assets.filter(a => a.holderId === id);
    const zimHist = DB.assignments.filter(z => z.staffId === id);
    const logs = DB.logs.filter(l => l.user === p.name).slice(0, 10);
    const role = DB.roles.find(r => r.key === p.rol) || {};

    modal({
      title: p.name, avatar: avatar(p.name, 40),
      sub: `${esc(p.unvan)} · ${esc(p.dep)} ${badge(p.status)}`,
      body: `<div class="grid g-4 mb" style="gap:10px">
          ${kpi("", "Aktif Poliçe", String(act.length), `${pol.length} toplam üretim`)}
          ${kpi("info", "Toplam Prim", fmtTL(pol.reduce((a, x) => a + x.gross, 0)), "tüm dönemler")}
          ${kpi("ok", "Komisyon Hak Edişi", fmtTL(staffCommission(id)), `oran %${Math.round(p.comRate * 100)}`)}
          ${kpi("warn", "Açık Görev", String(tasks.filter(t => t.status !== "Tamamlandı").length), `${tasks.filter(t => t.status === "Gecikti").length} gecikmiş`)}
        </div>
        <div class="tabs" data-tabs>
          <button class="on" data-tab="bilgi">Bilgiler</button>
          <button data-tab="perf">Performans</button>
          <button data-tab="zim">Zimmet (${zim.length})</button>
          <button data-tab="gor">Görevler (${tasks.length})</button>
          <button data-tab="log">İşlem Geçmişi</button>
        </div>
        <div data-pane="bilgi"><div class="dl">
          <div><dt>Personel No</dt><dd>${esc(p.id)}</dd></div>
          <div><dt>Departman / Görev</dt><dd>${esc(p.dep)} — ${esc(p.unvan)}</dd></div>
          <div><dt>E-posta</dt><dd>${esc(p.email)}</dd></div>
          <div><dt>Telefon</dt><dd>${esc(p.phone)}</dd></div>
          <div><dt>İşe Giriş</dt><dd>${fmtDate(p.hireDate)}</dd></div>
          <div><dt>Brüt Maaş</dt><dd>${fmtTL(p.salary)}</dd></div>
          <div><dt>Sistem Rolü</dt><dd>${esc(role.name || "-")}<div class="small muted">${esc(role.desc || "")}</div></dd></div>
          <div><dt>Komisyon Oranı</dt><dd>%${Math.round(p.comRate * 100)} <span class="small muted">(poliçe komisyonu üzerinden)</span></dd></div>
        </div></div>
        <div data-pane="perf" hidden>
          ${C.line({ height: 190, money: true, labels: months.map(monthLabel), series: [{ name: "Üretilen Prim", data: series, color: "#1b4dd8" }] })}
          <div class="sep"></div>
          <h4 style="font-size:13px;margin-bottom:9px">Branş Kırılımı</h4>
          ${(function () {
            const m = {}; pol.forEach(x => { m[x.branchName] = (m[x.branchName] || 0) + x.gross; });
            const d = Object.keys(m).map(k => ({ label: k, value: m[k] })).sort((a, b) => b.value - a.value);
            return d.length ? C.hbars({ data: d, money: true }) : `<div class="empty">Üretim kaydı yok</div>`;
          })()}
        </div>
        <div data-pane="zim" hidden>
          ${zim.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Demirbaş</th><th class="hide-sm">Seri No</th><th class="hide-sm">Zimmet Tarihi</th><th>Durum</th></tr></thead><tbody>
            ${zim.map(a => { const z = DB.assignments.find(x => x.assetId === a.id && !x.returnedAt); return `<tr class="clickable" data-asset="${a.id}"><td><b>${esc(a.type)}</b><div class="sub">${esc(a.model)}${a.plate ? " · " + esc(a.plate) : ""}</div></td><td class="hide-sm">${esc(a.serial)}</td><td class="hide-sm">${z ? fmtDate(z.givenAt) : "-"}</td><td>${badge(a.status)}</td></tr>`; }).join("")}
          </tbody></table></div>` : `<div class="empty"><b>Zimmet yok</b>Bu personele atanmış demirbaş bulunmuyor.</div>`}
          ${zimHist.length ? `<div class="sep"></div><h4 style="font-size:13px;margin-bottom:9px">Zimmet Geçmişi</h4><div class="timeline">${zimHist.map(z => { const a = IDX.ass[z.assetId]; return `<div class="tl-item"><div class="h">${esc(a.type)} — ${esc(a.model)}</div><div class="m">${fmtDate(z.givenAt)} → ${z.returnedAt ? fmtDate(z.returnedAt) + " (iade)" : "halen zimmetli"} · ${esc(z.note)}</div></div>`; }).join("")}</div>` : ""}
        </div>
        <div data-pane="gor" hidden>
          ${tasks.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Görev</th><th class="hide-sm">Müşteri</th><th>Termin</th><th>Öncelik</th><th>Durum</th></tr></thead><tbody>
            ${tasks.map(t => `<tr class="clickable" data-task="${t.id}"><td>${esc(t.title)}</td><td class="hide-sm">${t.customerId ? esc(custName(t.customerId)) : "-"}</td><td>${fmtDate(t.due)}</td><td>${badge(t.priority)}</td><td>${badge(t.status)}</td></tr>`).join("")}
          </tbody></table></div>` : `<div class="empty">Görev yok</div>`}
        </div>
        <div data-pane="log" hidden>
          ${logs.length ? `<div class="timeline">${logs.map(l => `<div class="tl-item"><div class="h">${esc(l.action)}</div><div class="m">${esc(l.at)} · ${esc(l.module)} · IP ${esc(l.ip)}</div></div>`).join("")}</div>` : `<div class="empty">Kayıt yok</div>`}
        </div>`,
      footer: `<button class="btn" data-demo="Yetki düzenleme demoda pasif.">Yetkileri Düzenle</button><button class="btn btn-p" data-demo="Komisyon raporu demoda üretilmiyor.">Komisyon Raporu</button>`,
      onMount: V._bindTabs
    });
  };

  /* =========================================================
     7) ZİMMET & DEMİRBAŞ
     ========================================================= */
  route("zimmet", {
    title: "Zimmet & Demirbaş Takibi", sub: "Ekipman envanteri ve personel zimmetleri",
    view() {
      const a = DB.assets;
      const zimli = a.filter(x => x.holderId).length;
      const deger = a.filter(x => x.status !== "Hurda").reduce((x, y) => x + y.price, 0);
      const ariza = a.filter(x => x.status === "Arızalı").length;

      const kpis = `<div class="grid g-4 mb">
        ${kpi("", "Toplam Demirbaş", fmtN(a.length), `${a.length - zimli} depoda bekliyor`)}
        ${kpi("ok", "Zimmetli", fmtN(zimli), `${new Set(a.filter(x => x.holderId).map(x => x.holderId)).size} personelde`)}
        ${kpi("info", "Envanter Değeri", fmtTL(deger), "Alış bedeli üzerinden")}
        ${kpi("bad", "Arızalı / Hurda", fmtN(ariza + a.filter(x => x.status === "Hurda").length), `${ariza} arızalı kayıt`)}
      </div>`;

      const tipMap = {};
      a.forEach(x => { tipMap[x.type] = (tipMap[x.type] || 0) + 1; });
      const donutD = Object.keys(tipMap).map(k => ({ label: k, value: tipMap[k] }));

      const perStaff = DB.staff.map(s => ({ label: s.name, value: a.filter(x => x.holderId === s.id).length }))
        .filter(x => x.value > 0).sort((x, y) => y.value - x.value);

      const tbl = table({
        id: "asset", rows: a, perPage: 12, defaultSort: "code", defaultDir: "asc",
        searchPlaceholder: "Kod, model, seri no, plaka…",
        search: (r, q) => (r.code + r.type + r.model + r.serial + (r.plate || "") + staffName(r.holderId)).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "type", label: "Tüm türler", options: Array.from(new Set(a.map(x => x.type))), apply: (r, v) => r.type === v },
          { key: "st", label: "Tüm durumlar", options: ["Kullanımda", "Arızalı", "Hurda"], apply: (r, v) => r.status === v },
          { key: "who", label: "Zimmet durumu", options: [{ value: "var", label: "Zimmetli" }, { value: "yok", label: "Depoda" }], apply: (r, v) => v === "var" ? !!r.holderId : !r.holderId }
        ],
        onRow: (id) => V.assetModal(id),
        columns: [
          { key: "code", label: "Demirbaş", render: r => `<b>${esc(r.code)}</b><div class="sub">${esc(r.type)}</div>` },
          { key: "model", label: "Model", render: r => `${esc(r.model)}<div class="sub">${esc(r.serial)}${r.plate ? " · " + esc(r.plate) : ""}</div>` },
          { key: "holderId", label: "Zimmetli Personel", sortValue: r => staffName(r.holderId), render: r => r.holderId ? `<div class="who">${avatar(staffName(r.holderId), 26)}<div><b>${esc(staffName(r.holderId))}</b><span class="sub">${esc(IDX.stf[r.holderId].dep)}</span></div></div>` : `<span class="muted">${esc(r.location)}</span>` },
          { key: "buyDate", label: "Alış", cls: "hide-sm", render: r => `${fmtDate(r.buyDate)}<div class="sub">${fmtTL(r.price)}</div>` },
          { key: "status", label: "Durum", render: r => badge(r.status) },
          { key: "act", label: "", sortable: false, cls: "right", render: r => `<button class="btn btn-sm" data-demo="${r.holderId ? "İade işlemi demoda kaydedilmez." : "Zimmet verme demoda pasif."}">${r.holderId ? "İade Al" : "Zimmetle"}</button>` }
        ]
      });

      const son = DB.assignments.slice(0, 8).map(z => {
        const as = IDX.ass[z.assetId];
        return `<div class="list-item" data-asset="${z.assetId}" style="cursor:pointer">
          <div class="ico-box" style="background:${z.returnedAt ? "var(--idle-bg)" : "var(--ok-bg)"};color:${z.returnedAt ? "var(--idle)" : "var(--ok)"}">${A.icon("box", 16)}</div>
          <div class="txt"><b>${esc(as.type)} — ${esc(as.model)}</b><span>${esc(staffName(z.staffId))} · ${fmtDate(z.givenAt)}${z.returnedAt ? " → " + fmtDate(z.returnedAt) : ""}</span></div>
          ${badge(z.returnedAt ? "Süresi Doldu" : "Kullanımda")}</div>`;
      }).join("");

      return kpis + `<div class="grid g-3 mb">
          ${card("Tür Dağılımı", "", "", C.donut({ data: donutD, size: 160, centerValue: fmtN(a.length), centerLabel: "demirbaş" }))}
          ${card("Personel Bazında Zimmet", "", "", C.hbars({ data: perStaff }))}
          ${card("Son Zimmet Hareketleri", "", "", son, true)}
        </div>` +
        card("Demirbaş Envanteri", "", `<button class="btn btn-sm" data-demo="Zimmet tutanağı demoda üretilmez.">Zimmet Tutanağı</button><button class="btn btn-sm btn-p" data-demo="Demirbaş ekleme demoda pasif.">+ Demirbaş Ekle</button>`, tbl, true);
    }
  });

  V.assetModal = function (id) {
    const a = IDX.ass[id]; if (!a) return;
    const hist = DB.assignments.filter(z => z.assetId === id).sort((x, y) => y.givenAt.localeCompare(x.givenAt));
    modal({
      title: `${a.type} — ${a.model}`, small: true,
      avatar: `<div class="ico-box" style="width:40px;height:40px;flex-basis:40px">${A.icon("box", 20)}</div>`,
      sub: `${esc(a.code)} ${badge(a.status)}`,
      body: `<div class="dl mb">
          <div><dt>Demirbaş Kodu</dt><dd>${esc(a.code)}</dd></div>
          <div><dt>Tür</dt><dd>${esc(a.type)}</dd></div>
          <div><dt>Marka / Model</dt><dd>${esc(a.model)}</dd></div>
          <div><dt>Seri No</dt><dd>${esc(a.serial)}</dd></div>
          ${a.plate ? `<div><dt>Plaka</dt><dd>${esc(a.plate)}</dd></div>` : ""}
          <div><dt>Alış Tarihi</dt><dd>${fmtDate(a.buyDate)}</dd></div>
          <div><dt>Alış Bedeli</dt><dd>${fmtTL(a.price)}</dd></div>
          <div><dt>Bulunduğu Yer</dt><dd>${esc(a.location)}</dd></div>
          <div><dt>Zimmetli Personel</dt><dd>${a.holderId ? `<a href="#" data-staff="${a.holderId}">${esc(staffName(a.holderId))}</a>` : `<span class="muted">Zimmetsiz</span>`}</dd></div>
          <div><dt>Durum</dt><dd>${badge(a.status)}</dd></div>
        </div>
        <h4 style="font-size:13px;margin-bottom:9px">Zimmet Geçmişi</h4>
        ${hist.length ? `<div class="timeline">${hist.map(z => `<div class="tl-item"><div class="h">${esc(staffName(z.staffId))}</div><div class="m">${fmtDate(z.givenAt)} → ${z.returnedAt ? fmtDate(z.returnedAt) + " (iade · " + esc(z.condition) + ")" : "halen zimmetli"}<br>${esc(z.note)}</div></div>`).join("")}</div>` : `<div class="empty">Hareket kaydı yok</div>`}`,
      footer: `<button class="btn btn-p" data-demo="Zimmet işlemi demoda kaydedilmez.">${a.holderId ? "İade Al" : "Personele Zimmetle"}</button>`
    });
  };

  /* =========================================================
     8) GÖREVLER
     ========================================================= */
  route("gorevler", {
    title: "Görev & İş Takibi", sub: "Personele atanan işler ve termin takibi",
    view() {
      const t = DB.tasks;
      const open = t.filter(x => x.status !== "Tamamlandı");
      const late = t.filter(x => x.status === "Gecikti");
      const done = t.filter(x => x.status === "Tamamlandı");

      const kpis = `<div class="grid g-4 mb">
        ${kpi("", "Toplam Görev", fmtN(t.length), `${open.length} açık · ${done.length} tamamlandı`)}
        ${kpi("bad", "Geciken", fmtN(late.length), "Termini geçmiş görevler")}
        ${kpi("warn", "Bu Hafta Termin", fmtN(t.filter(x => x.status !== "Tamamlandı" && dd(x.due, TODAY) >= 0 && dd(x.due, TODAY) <= 7).length), "7 gün içinde")}
        ${kpi("ok", "Tamamlanma Oranı", "%" + Math.round(done.length / t.length * 100), `${done.length}/${t.length} görev`)}
      </div>`;

      const COLS = [
        { key: "Yapılacak", color: "#64748b" },
        { key: "Devam Ediyor", color: "#c47a08" },
        { key: "Gecikti", color: "#d33a3a" },
        { key: "Tamamlandı", color: "#0f9d58" }
      ];
      const board = `<div class="grid g-4 mb" style="align-items:start">` + COLS.map(col => {
        const items = t.filter(x => x.status === col.key);
        return `<div class="card"><div class="card-h" style="padding:12px 15px">
            <div class="row" style="gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${col.color}"></span><h3 style="font-size:13px">${col.key}</h3></div>
            <div class="right"><span class="badge b-idle">${items.length}</span></div></div>
          <div class="card-b tight" style="max-height:420px;overflow-y:auto">
            ${items.length ? items.map(x => `<div class="list-item" data-task="${x.id}" style="cursor:pointer;padding:11px 14px;align-items:flex-start">
              <div class="txt"><b style="white-space:normal">${esc(x.title)}</b>
                <span>${esc(staffName(x.assigneeId))}${x.customerId ? " · " + esc(custName(x.customerId)) : ""}</span>
                <div class="row" style="gap:6px;margin-top:7px">${badge(x.priority)}<span class="small muted">${fmtDate(x.due)}</span></div>
              </div></div>`).join("") : `<div class="empty" style="padding:26px 12px">Görev yok</div>`}
          </div></div>`;
      }).join("") + `</div>`;

      const tbl = table({
        id: "task", rows: t, perPage: 12, defaultSort: "due", defaultDir: "asc",
        searchPlaceholder: "Görev veya personel ara…",
        search: (r, q) => (r.title + staffName(r.assigneeId) + (r.customerId ? custName(r.customerId) : "")).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "st", label: "Tüm durumlar", options: ["Yapılacak", "Devam Ediyor", "Gecikti", "Tamamlandı"], apply: (r, v) => r.status === v },
          { key: "pr", label: "Tüm öncelikler", options: ["Acil", "Yüksek", "Normal", "Düşük"], apply: (r, v) => r.priority === v },
          { key: "as", label: "Tüm personel", options: DB.staff.map(s => ({ value: s.id, label: s.name })), apply: (r, v) => r.assigneeId === v }
        ],
        onRow: (id) => V.taskModal(id),
        columns: [
          { key: "title", label: "Görev", render: r => `<b>${esc(r.title)}</b><div class="sub">${esc(r.id)} · oluşturma ${fmtDate(r.createdAt)}</div>` },
          { key: "assigneeId", label: "Atanan", sortValue: r => staffName(r.assigneeId), render: r => `<div class="who">${avatar(staffName(r.assigneeId), 26)}<b>${esc(staffName(r.assigneeId))}</b></div>` },
          { key: "customerId", label: "İlgili Müşteri", cls: "hide-sm", sortValue: r => r.customerId ? custName(r.customerId) : "", render: r => r.customerId ? linkCust(r.customerId) : `<span class="muted">-</span>` },
          { key: "due", label: "Termin", render: r => `${fmtDate(r.due)}${r.status !== "Tamamlandı" ? `<div style="margin-top:3px">${dueTag(r.due)}</div>` : ""}` },
          { key: "priority", label: "Öncelik", render: r => badge(r.priority) },
          { key: "status", label: "Durum", render: r => badge(r.status) }
        ]
      });

      return kpis + board + card("Tüm Görevler", "", `<button class="btn btn-sm btn-p" data-demo="Görev oluşturma demoda pasif.">+ Görev Oluştur</button>`, tbl, true);
    }
  });

  V.taskModal = function (id) {
    const t = DB.tasks.find(x => x.id === id); if (!t) return;
    modal({
      title: t.title, small: true, avatar: avatar(staffName(t.assigneeId), 40),
      sub: `${badge(t.status)} ${badge(t.priority)}`,
      body: `<div class="dl mb">
          <div><dt>Görev No</dt><dd>${esc(t.id)}</dd></div>
          <div><dt>Atanan Personel</dt><dd><a href="#" data-staff="${t.assigneeId}">${esc(staffName(t.assigneeId))}</a></dd></div>
          <div><dt>İlgili Müşteri</dt><dd>${t.customerId ? linkCust(t.customerId) : "-"}</dd></div>
          <div><dt>Oluşturma</dt><dd>${fmtDate(t.createdAt)}</dd></div>
          <div><dt>Son Teslim</dt><dd>${fmtDate(t.due)} ${t.status !== "Tamamlandı" ? dueTag(t.due) : ""}</dd></div>
          <div><dt>Tamamlanma</dt><dd>${t.completedAt ? fmtDate(t.completedAt) : "-"}</dd></div>
        </div>
        <div class="hint">${esc(t.desc)}</div>`,
      footer: `<button class="btn" data-demo="Yorum demoda kaydedilmez.">Yorum Ekle</button><button class="btn btn-p" data-demo="Durum değişikliği demoda kaydedilmez.">Tamamlandı İşaretle</button>`
    });
  };

  /* =========================================================
     9) GELİR - GİDER
     ========================================================= */
  route("finans", {
    title: "Gelir - Gider Yönetimi", sub: "İşletme finansallarının kategori bazlı takibi",
    view() {
      const months = lastMonths(12);
      const { inc, exp } = financeByMonth(months);
      const curM = monthKey(TODAY);
      const yInc = months.reduce((a, m) => a + inc[m], 0);
      const yExp = months.reduce((a, m) => a + exp[m], 0);
      const marj = Math.round(((yInc - yExp) / (yInc || 1)) * 100);

      const kpis = `<div class="grid g-4 mb">
        ${kpi("ok", "12 Aylık Gelir", fmtTL(yInc), `Bu ay ${fmtTL(inc[curM] || 0)}`)}
        ${kpi("bad", "12 Aylık Gider", fmtTL(yExp), `Bu ay ${fmtTL(exp[curM] || 0)}`)}
        ${kpi("", "Net Kâr", fmtTL(yInc - yExp), `Kâr marjı %${marj}`)}
        ${kpi("info", "Aylık Ortalama Gider", fmtTL(yExp / 12), `${DB.finance.filter(f => f.kind === "Gider").length} gider kaydı`)}
      </div>`;

      const chart = C.line({
        height: 240, money: true, labels: months.map(monthLabel),
        series: [
          { name: "Gelir", data: months.map(m => inc[m]), color: "#0f9d58" },
          { name: "Gider", data: months.map(m => exp[m]), color: "#d33a3a" },
          { name: "Net", data: months.map(m => inc[m] - exp[m]), color: "#1b4dd8", area: false }
        ]
      });

      const gMap = {}, iMap = {};
      DB.finance.forEach(f => {
        if (monthKey(f.date) < months[0]) return;
        if (f.kind === "Gider") gMap[f.category] = (gMap[f.category] || 0) + f.amount;
        else iMap[f.category] = (iMap[f.category] || 0) + f.amount;
      });
      const gArr = Object.keys(gMap).map(k => ({ label: k, value: gMap[k] })).sort((a, b) => b.value - a.value);
      const iArr = Object.keys(iMap).map(k => ({ label: k, value: iMap[k] })).sort((a, b) => b.value - a.value);

      const tbl = table({
        id: "fin", rows: DB.finance, perPage: 14, defaultSort: "date", defaultDir: "desc",
        searchPlaceholder: "Açıklama, kategori, belge no…",
        search: (r, q) => (r.desc + r.category + (r.doc || "")).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "kind", label: "Gelir + Gider", options: ["Gelir", "Gider"], apply: (r, v) => r.kind === v },
          { key: "cat", label: "Tüm kategoriler", options: Array.from(new Set(DB.finance.map(f => f.category))).sort(), apply: (r, v) => r.category === v },
          { key: "mon", label: "Tüm aylar", options: months.slice().reverse().map(m => ({ value: m, label: monthLabel(m) })), apply: (r, v) => monthKey(r.date) === v }
        ],
        columns: [
          { key: "date", label: "Tarih", render: r => fmtDate(r.date) },
          { key: "kind", label: "Tip", render: r => `<span class="badge ${r.kind === "Gelir" ? "b-ok" : "b-bad"}"><i class="dot"></i>${r.kind}</span>` },
          { key: "category", label: "Kategori", render: r => `<b>${esc(r.category)}</b><div class="sub">${esc(r.desc)}</div>` },
          { key: "staffId", label: "İlgili Personel", cls: "hide-sm", sortValue: r => r.staffId ? staffName(r.staffId) : "", render: r => r.staffId ? esc(staffName(r.staffId)) : `<span class="muted">-</span>` },
          { key: "method", label: "Yöntem", cls: "hide-sm" },
          { key: "doc", label: "Belge", cls: "hide-sm", render: r => r.doc ? esc(r.doc) : `<span class="muted">-</span>` },
          { key: "amount", label: "Tutar", cls: "num", render: r => `<b style="color:${r.kind === "Gelir" ? "var(--ok)" : "var(--bad)"}">${r.kind === "Gelir" ? "+" : "−"}${fmtTL(r.amount)}</b>` }
        ]
      });

      // aylık özet tablosu
      const summary = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dönem</th><th class="num">Gelir</th><th class="num">Gider</th><th class="num">Net</th><th>Marj</th></tr></thead><tbody>
        ${months.slice().reverse().map(m => {
          const net = inc[m] - exp[m], mj = Math.round((net / (inc[m] || 1)) * 100);
          return `<tr><td><b>${monthLabel(m)}</b></td><td class="num" style="color:var(--ok)">${fmtTL(inc[m])}</td>
            <td class="num" style="color:var(--bad)">${fmtTL(exp[m])}</td>
            <td class="num"><b>${fmtTL(net)}</b></td>
            <td><div class="bar"><i class="${net >= 0 ? "ok" : "bad"}" style="width:${Math.min(100, Math.abs(mj))}%"></i></div><span class="sub">%${mj}</span></td></tr>`;
        }).join("")}
      </tbody></table></div>`;

      return kpis +
        card("Gelir / Gider / Net Trend", "Son 12 ay", "", chart) +
        `<div class="grid g-2" style="margin:16px 0">
          ${card("Gider Kategorileri", "Son 12 ay toplamı", "", C.hbars({ data: gArr, money: true }))}
          ${card("Gelir Kategorileri", "Son 12 ay toplamı", "", C.hbars({ data: iArr, money: true, color: "#0f9d58" }))}
        </div>
        <div class="mb">${card("Aylık Özet", "", "", summary, true)}</div>` +
        card("Tüm Hareketler", "", `<button class="btn btn-sm" data-demo="Demoda dışa aktarma kapalı.">Excel</button><button class="btn btn-sm btn-p" data-demo="Kayıt ekleme demoda pasif.">+ Gelir / Gider Ekle</button>`, tbl, true);
    }
  });

  /* =========================================================
     10) KOMİSYON
     ========================================================= */
  route("komisyon", {
    title: "Komisyon Sistemi", sub: "Poliçe komisyonları ve personel hak edişleri",
    view() {
      const pols = DB.policies.filter(p => p.status !== "İptal");
      const totalCom = pols.reduce((a, p) => a + p.commission, 0);
      const staffCom = DB.staff.reduce((a, s) => a + staffPolicies(s.id).filter(p => p.status !== "İptal").reduce((x, p) => x + p.commission * s.comRate, 0), 0);
      const months = lastMonths(12);

      const kpis = `<div class="grid g-4 mb">
        ${kpi("", "Toplam Acente Komisyonu", fmtTL(totalCom), `${pols.length} poliçe üzerinden`)}
        ${kpi("warn", "Personel Hak Edişi", fmtTL(staffCom), `Acente komisyonunun %${Math.round(staffCom / totalCom * 100)}'i`)}
        ${kpi("ok", "Acentede Kalan", fmtTL(totalCom - staffCom), "Net acente payı")}
        ${kpi("info", "Ortalama Komisyon Oranı", "%" + Math.round(pols.reduce((a, p) => a + p.comRate, 0) / pols.length * 100), "Branş ağırlıklı")}
      </div>`;

      const rows = DB.staff.filter(s => s.comRate > 0).map(s => {
        const ps = staffPolicies(s.id).filter(p => p.status !== "İptal");
        const acente = ps.reduce((a, p) => a + p.commission, 0);
        const hak = acente * s.comRate;
        const odenen = hak * 0.72;
        return { s, ps, acente, hak, odenen };
      }).sort((a, b) => b.hak - a.hak);

      const tblStaff = `<div class="tbl-wrap"><table class="tbl"><thead><tr>
          <th>Personel</th><th class="num">Poliçe</th><th class="num">Üretim (Prim)</th>
          <th class="num">Acente Komisyonu</th><th class="num">Oran</th><th class="num">Hak Ediş</th><th>Ödeme Durumu</th><th></th>
        </tr></thead><tbody>
        ${rows.map(r => `<tr class="clickable" data-staff="${r.s.id}">
          <td><div class="who">${avatar(r.s.name)}<div><b>${esc(r.s.name)}</b><span class="sub">${esc(r.s.unvan)}</span></div></div></td>
          <td class="num">${r.ps.length}</td>
          <td class="num">${fmtTL(r.ps.reduce((a, p) => a + p.gross, 0))}</td>
          <td class="num">${fmtTL(r.acente)}</td>
          <td class="num"><b>%${Math.round(r.s.comRate * 100)}</b></td>
          <td class="num"><b>${fmtTL(r.hak)}</b></td>
          <td><div class="bar"><i class="ok" style="width:72%"></i></div><span class="sub">${fmtTL(r.odenen)} ödendi</span></td>
          <td class="right"><button class="btn btn-sm" data-demo="Ödeme kaydı demoda işlenmez.">Öde</button></td>
        </tr>`).join("")}
      </tbody></table></div>`;

      const brRows = DB.branches.map(b => {
        const ps = pols.filter(p => p.branch === b.key);
        return { label: b.name, value: ps.reduce((a, p) => a + p.commission, 0), extra: ps.length + " poliçe" };
      }).filter(x => x.value > 0).sort((a, b) => b.value - a.value);

      const coRows = DB.companies.map(c => {
        const ps = pols.filter(p => p.companyId === c.id);
        return { label: c.name, value: ps.reduce((a, p) => a + p.commission, 0), color: c.color, extra: ps.length + " poliçe" };
      }).sort((a, b) => b.value - a.value);

      const trend = C.bars({
        height: 200, money: true, color: "#1b4dd8",
        data: months.map(m => ({
          label: monthLabel(m), short: monthLabel(m).split(" ")[0],
          value: pols.filter(p => monthKey(p.start) === m).reduce((a, p) => a + p.commission, 0)
        }))
      });

      const oranTbl = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Branş</th><th class="num">Acente Komisyon Oranı</th><th class="num">Poliçe</th><th class="num">Üretim</th><th class="num">Komisyon</th></tr></thead><tbody>
        ${DB.branches.map(b => {
          const ps = pols.filter(p => p.branch === b.key);
          return `<tr><td><b>${esc(b.name)}</b></td><td class="num">%${Math.round(b.com * 100)}</td><td class="num">${ps.length}</td>
            <td class="num">${fmtTL(ps.reduce((a, p) => a + p.gross, 0))}</td><td class="num"><b>${fmtTL(ps.reduce((a, p) => a + p.commission, 0))}</b></td></tr>`;
        }).join("")}
      </tbody></table></div>`;

      return kpis +
        `<div class="hint mb">Hak ediş formülü: <b>Personel Komisyonu = Poliçe Net Primi × Branş Komisyon Oranı × Personel Payı</b>. Oranlar branş ve personel bazında ayrı ayrı tanımlanabilir; iptal olan poliçeler hesaplamadan otomatik düşülür.</div>` +
        card("Personel Komisyon Hak Edişleri", "Tüm dönemler", `<button class="btn btn-sm" data-demo="Bordro çıktısı demoda üretilmez.">Bordro Aktar</button>`, tblStaff, true) +
        `<div class="grid g-2" style="margin:16px 0">
          ${card("Branş Bazında Komisyon", "", "", C.hbars({ data: brRows, money: true }))}
          ${card("Şirket Bazında Komisyon", "", "", C.hbars({ data: coRows, money: true }))}
        </div>
        <div class="grid g-23">
          ${card("Aylık Komisyon Üretimi", "Poliçe başlangıç tarihine göre", "", trend)}
          ${card("Branş Komisyon Oranları", "Sistem tanımları", "", oranTbl, true)}
        </div>`;
    }
  });

  /* =========================================================
     11) RAPORLAR
     ========================================================= */
  route("raporlar", {
    title: "Raporlar", sub: "Yönetim raporları ve analizler",
    view() {
      const months = lastMonths(18);
      const { inc, exp } = financeByMonth(months);
      const act = activePolicies();

      const yeni = months.map(m => DB.customers.filter(c => monthKey(c.createdAt) === m).length);
      const uretim = months.map(m => DB.policies.filter(p => monthKey(p.start) === m).reduce((a, p) => a + p.gross, 0));

      const yenileme = DB.policies.filter(p => p.renewalOf).length;
      const yenOrani = Math.round(yenileme / DB.policies.length * 100);

      const sehir = {};
      DB.customers.forEach(c => { sehir[c.city] = (sehir[c.city] || 0) + 1; });
      const sehirD = Object.keys(sehir).map(k => ({ label: k, value: sehir[k] })).sort((a, b) => b.value - a.value).slice(0, 8);

      const kanal = {};
      DB.customers.forEach(c => { kanal[c.source] = (kanal[c.source] || 0) + 1; });

      const REPORTS = [
        ["Poliçe Üretim Raporu", "Branş, şirket ve personel kırılımlı üretim", "chart"],
        ["Tahsilat & Vade Raporu", "Gecikme yaşlandırma ve tahsilat performansı", "card"],
        ["Komisyon Mutabakat Raporu", "Şirket ekstresi ile sistem karşılaştırması", "percent"],
        ["Personel Performans Raporu", "Kişi bazlı üretim, hedef, komisyon", "badge"],
        ["Gelir-Gider Raporu", "Kategori ve dönem bazlı finansal tablo", "wallet"],
        ["Portföy Yenileme Raporu", "Yenilenen / kaybedilen poliçe analizi", "file"],
        ["Müşteri Segment Raporu", "Segment, şehir ve kanal dağılımı", "users"],
        ["Demirbaş & Zimmet Raporu", "Envanter durumu ve personel zimmetleri", "box"]
      ];
      const repCards = REPORTS.map(r => `<div class="card" data-demo="${esc(r[0])} demoda örnek veriyle üretilir." style="cursor:pointer"><div class="card-b">
        <div class="row" style="gap:11px">
          <div class="ico-box">${A.icon(r[2], 17)}</div>
          <div style="min-width:0;flex:1"><b style="font-size:13.5px;display:block">${esc(r[0])}</b><span class="small muted">${esc(r[1])}</span></div>
        </div>
        <div class="sep" style="margin:12px 0"></div>
        <div class="row" style="gap:7px"><button class="btn btn-sm">PDF</button><button class="btn btn-sm">Excel</button><button class="btn btn-sm btn-p" style="margin-left:auto">Görüntüle</button></div>
      </div></div>`).join("");

      return `<div class="grid g-2 mb">
          ${card("Prim Üretimi", "Son 18 ay", "", C.line({ height: 220, money: true, labels: months.map(monthLabel), series: [{ name: "Üretilen Prim", data: uretim, color: "#1b4dd8" }] }))}
          ${card("Yeni Müşteri Kazanımı", "Son 18 ay", "", C.bars({ height: 220, data: months.map((m, i) => ({ label: monthLabel(m), short: monthLabel(m).split(" ")[0], value: yeni[i] })), color: "#8e44ad" }))}
        </div>
        <div class="grid g-3 mb">
          ${card("Müşteri Şehir Dağılımı", "", "", C.hbars({ data: sehirD }))}
          ${card("Müşteri Geliş Kanalı", "", "", C.donut({ data: Object.keys(kanal).map(k => ({ label: k, value: kanal[k] })), size: 150, centerValue: fmtN(DB.customers.length), centerLabel: "müşteri" }))}
          ${card("Portföy Sağlığı", "", "", `<div class="stack">
            <div><div class="row" style="justify-content:space-between"><span class="small muted">Yenileme oranı</span><b>%${yenOrani}</b></div><div class="bar" style="margin-top:5px"><i class="ok" style="width:${yenOrani}%"></i></div></div>
            <div><div class="row" style="justify-content:space-between"><span class="small muted">Tahsilat oranı</span><b>%${Math.round(DB.installments.filter(t => t.status === "Ödendi").length / DB.installments.length * 100)}</b></div><div class="bar" style="margin-top:5px"><i class="ok" style="width:${Math.round(DB.installments.filter(t => t.status === "Ödendi").length / DB.installments.length * 100)}%"></i></div></div>
            <div><div class="row" style="justify-content:space-between"><span class="small muted">Müşteri başına poliçe</span><b>${(DB.policies.length / DB.customers.length).toFixed(1)}</b></div><div class="bar" style="margin-top:5px"><i style="width:${Math.min(100, (DB.policies.length / DB.customers.length) * 25)}%"></i></div></div>
            <div><div class="row" style="justify-content:space-between"><span class="small muted">Çapraz satış (2+ branş)</span><b>${Object.keys(polByCustomer).filter(k => new Set(polByCustomer[k].map(p => p.branch)).size > 1).length} müşteri</b></div></div>
            <div><div class="row" style="justify-content:space-between"><span class="small muted">Aktif poliçe ort. prim</span><b>${fmtTL(act.reduce((a, p) => a + p.gross, 0) / act.length)}</b></div></div>
          </div>`)}
        </div>
        ${card("Hazır Rapor Şablonları", "PDF / Excel çıktısı alınabilir", "", `<div class="grid g-4">${repCards}</div>`)}`;
    }
  });

  /* =========================================================
     12) YETKİ & KULLANICILAR
     ========================================================= */
  route("yonetim", {
    title: "Yetki & Kullanıcı Yönetimi", sub: "Roller, izinler ve sistem ayarları",
    view() {
      const MODULES = ["Müşteriler", "Poliçeler", "Tahsilat", "Personel", "Zimmet", "Gelir-Gider", "Komisyon", "Görevler", "Raporlar", "Ayarlar"];
      const PERM = {
        admin: MODULES.map(() => "full"),
        mudur: ["full", "full", "full", "full", "full", "full", "full", "full", "full", "read"],
        satis: ["full", "full", "read", "none", "read", "none", "own", "full", "read", "none"],
        operasyon: ["read", "full", "full", "none", "read", "none", "none", "full", "read", "none"],
        muhasebe: ["read", "read", "full", "read", "read", "full", "full", "read", "full", "none"]
      };
      const P = { full: `<span class="badge b-ok"><i class="dot"></i>Tam</span>`, read: `<span class="badge b-info"><i class="dot"></i>Görüntüleme</span>`, own: `<span class="badge b-warn"><i class="dot"></i>Kendi kaydı</span>`, none: `<span class="badge b-idle"><i class="dot"></i>Yok</span>` };

      const matrix = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Modül</th>${DB.roles.map(r => `<th>${esc(r.name)}</th>`).join("")}</tr></thead><tbody>
        ${MODULES.map((m, i) => `<tr><td><b>${esc(m)}</b></td>${DB.roles.map(r => `<td>${P[PERM[r.key][i]]}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div>`;

      const roleCards = DB.roles.map(r => {
        const n = DB.staff.filter(s => s.rol === r.key).length;
        return `<div class="card"><div class="card-b">
          <div class="row" style="gap:10px;margin-bottom:9px"><div class="ico-box">${A.icon("shield", 17)}</div>
          <div style="flex:1"><b style="display:block;font-size:13.5px">${esc(r.name)}</b><span class="small muted">${n} kullanıcı</span></div></div>
          <div class="small muted">${esc(r.desc)}</div>
          <div class="sep" style="margin:11px 0"></div>
          <button class="btn btn-sm" data-demo="Rol düzenleme demoda pasif.">İzinleri Düzenle</button>
        </div></div>`;
      }).join("");

      const users = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kullanıcı</th><th class="hide-sm">E-posta</th><th>Rol</th><th class="hide-sm">2FA</th><th class="hide-sm">Son Giriş</th><th>Durum</th><th></th></tr></thead><tbody>
        ${DB.staff.map((s, i) => `<tr class="clickable" data-staff="${s.id}">
          <td><div class="who">${avatar(s.name)}<div><b>${esc(s.name)}</b><span class="sub">${esc(s.dep)}</span></div></div></td>
          <td class="hide-sm">${esc(s.email)}</td>
          <td>${badge((DB.roles.find(r => r.key === s.rol) || {}).name || s.rol)}</td>
          <td class="hide-sm">${i % 3 === 0 ? badge("Aktif") : badge("Bekliyor")}</td>
          <td class="hide-sm"><span class="small muted">04.09.2026 ${String(7 + (i % 9)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}</span></td>
          <td>${badge(s.status)}</td>
          <td class="right"><button class="btn btn-sm" data-demo="Şifre sıfırlama demoda gönderilmez.">Şifre Sıfırla</button></td>
        </tr>`).join("")}
      </tbody></table></div>`;

      const settings = `<div class="stack">
        ${[["Oturum zaman aşımı", "30 dakika işlem yapılmazsa otomatik çıkış"],
           ["İki faktörlü doğrulama (2FA)", "Yönetici ve muhasebe rolleri için zorunlu"],
           ["Otomatik veritabanı yedeği", "Her gece 03:00 · 30 gün saklama · şifreli depolama"],
           ["İşlem logu saklama", "Tüm CRUD işlemleri 5 yıl boyunca saklanır"],
           ["IP kısıtlaması", "Ofis dışı erişim için 2FA + onay"],
           ["KVKK veri maskeleme", "TCKN ve iletişim bilgileri yetkisiz rollerde maskelenir"]
        ].map(x => `<div class="row" style="justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--line-2)">
          <div style="min-width:0"><b style="font-size:13px;display:block">${esc(x[0])}</b><span class="small muted">${esc(x[1])}</span></div>
          <span class="badge b-ok"><i class="dot"></i>Etkin</span></div>`).join("")}
      </div>`;

      return `<div class="grid g-3 mb" style="grid-template-columns:repeat(5,1fr)">${roleCards}</div>
        ${card("Yetki Matrisi", "Rol bazında modül erişimleri", "", matrix, true)}
        <div class="grid g-23" style="margin-top:16px">
          ${card("Kullanıcı Hesapları", `${DB.staff.length} hesap`, `<button class="btn btn-sm btn-p" data-demo="Kullanıcı ekleme demoda pasif.">+ Kullanıcı</button>`, users, true)}
          ${card("Güvenlik & Sistem Ayarları", "", "", settings)}
        </div>`;
    }
  });

  /* =========================================================
     13) LOGLAR
     ========================================================= */
  route("loglar", {
    title: "İşlem Kayıtları (Audit Log)", sub: "Sistemde yapılan tüm işlemlerin geçmişi",
    view() {
      const tbl = table({
        id: "log", rows: DB.logs, perPage: 16, defaultSort: "at", defaultDir: "desc",
        searchPlaceholder: "Kullanıcı, işlem, referans…",
        search: (r, q) => (r.user + r.action + r.module + r.ref + r.ip).toLocaleLowerCase("tr").includes(q),
        filters: [
          { key: "mod", label: "Tüm modüller", options: Array.from(new Set(DB.logs.map(l => l.module))).sort(), apply: (r, v) => r.module === v },
          { key: "usr", label: "Tüm kullanıcılar", options: Array.from(new Set(DB.logs.map(l => l.user))).sort(), apply: (r, v) => r.user === v }
        ],
        columns: [
          { key: "at", label: "Zaman", render: r => `<span class="num">${esc(r.at)}</span>` },
          { key: "user", label: "Kullanıcı", render: r => `<div class="who">${avatar(r.user, 26)}<b>${esc(r.user)}</b></div>` },
          { key: "module", label: "Modül", render: r => `<span class="badge b-idle"><i class="dot"></i>${esc(r.module)}</span>` },
          { key: "action", label: "İşlem" },
          { key: "ref", label: "Referans", cls: "hide-sm", render: r => `<span class="small muted">${esc(r.ref)}</span>` },
          { key: "ip", label: "IP", cls: "hide-sm", render: r => `<span class="small muted num">${esc(r.ip)}</span>` }
        ]
      });

      const modMap = {};
      DB.logs.forEach(l => { modMap[l.module] = (modMap[l.module] || 0) + 1; });

      return `<div class="grid g-4 mb">
          ${kpi("", "Toplam Kayıt", fmtN(DB.logs.length), "Son 7 gün gösteriliyor")}
          ${kpi("info", "Aktif Kullanıcı", String(new Set(DB.logs.map(l => l.user)).size), "İşlem yapan personel")}
          ${kpi("ok", "Son Yedekleme", "04.09.2026 03:00", "Otomatik · şifreli · 30 gün saklama")}
          ${kpi("warn", "Başarısız Giriş", "3", "Son 24 saatte")}
        </div>
        <div class="grid g-32 mb">
          ${card("Modül Bazında İşlem", "", "", C.hbars({ data: Object.keys(modMap).map(k => ({ label: k, value: modMap[k] })).sort((a, b) => b.value - a.value) }))}
          ${card("İşlem Kayıtları", "Değiştirilemez (append-only) log", `<button class="btn btn-sm" data-demo="Log dışa aktarma demoda kapalı.">Dışa Aktar</button>`, tbl, true)}
        </div>`;
    }
  });

  /* =========================================================
     Bildirimler & Global arama
     ========================================================= */
  V.notifications = function () {
    const ov = overdue().slice(0, 5);
    const ex = expiring(15).slice(0, 5);
    const err = DB.integrations.filter(i => i.status !== "Aktif");
    const late = DB.tasks.filter(t => t.status === "Gecikti").slice(0, 5);
    const item = (cls, t, s) => `<div class="list-item"><div class="ico-box" style="background:var(--${cls}-bg);color:var(--${cls})">${A.icon("check", 15)}</div><div class="txt"><b style="white-space:normal">${t}</b><span>${s}</span></div></div>`;
    modal({
      title: "Bildirimler", small: true, sub: `${ov.length + ex.length + err.length + late.length} yeni uyarı`,
      body: `<div class="list" style="margin:-20px">
        ${err.map(i => item("bad", `Entegrasyon sorunu: ${esc(comName(i.companyId))}`, esc(i.message))).join("")}
        ${ov.map(t => item("bad", `Gecikmiş tahsilat — ${esc(custName(t.customerId))}`, `${fmtTL(t.amount)} · vade ${fmtDate(t.due)}`)).join("")}
        ${ex.map(p => item("warn", `Poliçe bitiyor — ${esc(custName(p.customerId))}`, `${esc(p.branchName)} · ${fmtDate(p.end)}`)).join("")}
        ${late.map(t => item("warn", `Geciken görev — ${esc(t.title)}`, `${esc(staffName(t.assigneeId))} · termin ${fmtDate(t.due)}`)).join("")}
      </div>`
    });
  };

  V.globalSearch = function (q) {
    const s = q.toLocaleLowerCase("tr");
    const cs = DB.customers.filter(c => (c.name + c.phone + c.email + c.id).toLocaleLowerCase("tr").includes(s)).slice(0, 6);
    const ps = DB.policies.filter(p => (p.no + (p.plate || "")).toLocaleLowerCase("tr").includes(s)).slice(0, 6);
    const st = DB.staff.filter(x => x.name.toLocaleLowerCase("tr").includes(s)).slice(0, 4);
    const as = DB.assets.filter(x => (x.code + x.model + x.serial + (x.plate || "")).toLocaleLowerCase("tr").includes(s)).slice(0, 4);
    const total = cs.length + ps.length + st.length + as.length;

    const sec = (t, items) => items.length ? `<h4 style="font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px">${t}</h4><div class="list" style="border:1px solid var(--line-2);border-radius:10px;overflow:hidden">${items.join("")}</div>` : "";

    modal({
      title: `"${esc(q)}" için sonuçlar`, small: true, sub: `${total} kayıt bulundu`,
      body: total ? (
        sec("Müşteriler", cs.map(c => `<div class="list-item" data-cust="${c.id}" style="cursor:pointer">${avatar(c.name, 30)}<div class="txt"><b>${esc(c.name)}</b><span>${esc(c.type)} · ${esc(c.city)} · ${esc(c.phone)}</span></div></div>`)) +
        sec("Poliçeler", ps.map(p => `<div class="list-item" data-pol="${p.id}" style="cursor:pointer"><div class="ico-box">${A.icon("file", 15)}</div><div class="txt"><b>${esc(p.no)}</b><span>${esc(custName(p.customerId))} · ${esc(p.branchName)}${p.plate ? " · " + esc(p.plate) : ""}</span></div>${badge(p.status)}</div>`)) +
        sec("Personel", st.map(x => `<div class="list-item" data-staff="${x.id}" style="cursor:pointer">${avatar(x.name, 30)}<div class="txt"><b>${esc(x.name)}</b><span>${esc(x.unvan)} · ${esc(x.dep)}</span></div></div>`)) +
        sec("Demirbaş", as.map(x => `<div class="list-item" data-asset="${x.id}" style="cursor:pointer"><div class="ico-box">${A.icon("box", 15)}</div><div class="txt"><b>${esc(x.code)} — ${esc(x.model)}</b><span>${x.holderId ? esc(staffName(x.holderId)) : esc(x.location)}</span></div></div>`))
      ) : `<div class="empty"><b>Sonuç bulunamadı</b>Farklı bir anahtar kelime deneyin.</div>`
    });
  };
})(window);
