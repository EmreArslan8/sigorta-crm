/* ============================================================
   SigortaOS — Demo Mock Veri Üreteci
   Seed'li rastgele üretim: her açılışta aynı veri gelir.
   ============================================================ */
(function (global) {
  "use strict";

  /* --- Seeded RNG (mulberry32) --- */
  let _s = 20260904;
  function rnd() {
    _s |= 0; _s = (_s + 0x6D2B79F5) | 0;
    let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const ri = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  const round2 = (n) => Math.round(n * 100) / 100;

  /* --- Sabitler --- */
  const TODAY = new Date(2026, 8, 4); // 4 Eylül 2026

  const COMPANIES = [
    { id: "C01", name: "Anadolu Sigorta",        short: "ANS", method: "API (REST)",      color: "#1f6feb" },
    { id: "C02", name: "Allianz Sigorta",        short: "ALZ", method: "API (REST)",      color: "#0b7285" },
    { id: "C03", name: "AXA Sigorta",            short: "AXA", method: "Web Service",     color: "#8e44ad" },
    { id: "C04", name: "Türkiye Sigorta",        short: "TRS", method: "API (REST)",      color: "#c0392b" },
    { id: "C05", name: "Sompo Sigorta",          short: "SMP", method: "SFTP + CSV",      color: "#d97706" },
    { id: "C06", name: "HDI Sigorta",            short: "HDI", method: "Web Service",     color: "#2f855a" },
    { id: "C07", name: "Ak Sigorta",             short: "AKS", method: "API (REST)",      color: "#b7791f" },
    { id: "C08", name: "Ray Sigorta",            short: "RAY", method: "Portal / Excel",  color: "#4c51bf" },
    { id: "C09", name: "Neova Katılım",          short: "NVA", method: "API (REST)",      color: "#0f766e" },
    { id: "C10", name: "Anadolu Hayat Emeklilik",short: "AHE", method: "Web Service",     color: "#be185d" },
    { id: "C11", name: "Allianz Yaşam ve Emeklilik", short: "AYE", method: "API (REST)",  color: "#065f46" },
    { id: "C12", name: "Quick Sigorta",          short: "QCK", method: "Portal / Excel",  color: "#7c2d12" }
  ];

  const BRANCHES = [
    { key: "kasko",   name: "Kasko",         com: 0.14 },
    { key: "trafik",  name: "Trafik",        com: 0.10 },
    { key: "dask",    name: "DASK",          com: 0.09 },
    { key: "konut",   name: "Konut",         com: 0.16 },
    { key: "saglik",  name: "Sağlık",        com: 0.13 },
    { key: "hayat",   name: "Hayat",         com: 0.22 },
    { key: "bes",     name: "BES",           com: 0.18 },
    { key: "isyeri",  name: "İşyeri",        com: 0.17 },
    { key: "fka",     name: "Ferdi Kaza",    com: 0.20 },
    { key: "nakliyat",name: "Nakliyat",      com: 0.15 },
    { key: "seyahat", name: "Seyahat Sağlık",com: 0.19 }
  ];

  const AD = ["Ahmet","Mehmet","Mustafa","Ali","Hüseyin","Hasan","İbrahim","Emre","Burak","Serkan","Kadir","Onur","Barış","Cem","Tolga","Yusuf","Kerem","Deniz","Umut","Selim",
    "Ayşe","Fatma","Emine","Hatice","Zeynep","Elif","Merve","Büşra","Seda","Ceren","Gamze","Pınar","Sibel","Duygu","Melis","Ebru","Esra","Nihan","Damla","İrem"];
  const SOYAD = ["Yılmaz","Kaya","Demir","Şahin","Çelik","Yıldız","Yıldırım","Öztürk","Aydın","Özdemir","Arslan","Doğan","Kılıç","Aslan","Çetin","Kara","Koç","Kurt","Özkan","Şimşek",
    "Polat","Erdoğan","Güneş","Bulut","Taş","Aksoy","Turan","Bozkurt","Sarı","Uysal"];
  const FIRMA = ["Öz Anadolu Nakliyat A.Ş.","Beta Tekstil San. Tic. Ltd. Şti.","Marmara Lojistik A.Ş.","Kent Yapı İnşaat Ltd. Şti.","Ege Gıda Sanayi A.Ş.",
    "Delta Bilişim Ltd. Şti.","Anadolu Makine A.Ş.","Yıldız Metal Sanayi Ltd. Şti.","Pusula Danışmanlık A.Ş.","Akdeniz Turizm Ltd. Şti.",
    "Nova Enerji A.Ş.","Star Otomotiv Ltd. Şti."];
  const SEHIR = ["İstanbul","Ankara","İzmir","Bursa","Antalya","Eskişehir","Konya","Kocaeli","Adana","Kayseri","Samsun","Denizli"];
  const MAHALLE = ["Cumhuriyet Mah.","Atatürk Bul.","Fatih Cad.","İstiklal Sok.","Yeni Mah.","Bahçelievler","Yıldırım Mah.","Barbaros Bul."];

  const DEPARTMANLAR = ["Satış","Operasyon","Hasar","Muhasebe","Yönetim","Müşteri İlişkileri"];
  const ROLLER = [
    { key: "admin",    name: "Yönetici",        desc: "Tüm modüllere tam erişim" },
    { key: "mudur",    name: "Müdür",           desc: "Finans + personel görüntüleme, onay yetkisi" },
    { key: "satis",    name: "Satış Personeli", desc: "Müşteri & poliçe işlemleri, kendi komisyonu" },
    { key: "operasyon",name: "Operasyon",       desc: "Poliçe/vade takibi, tahsilat kaydı" },
    { key: "muhasebe", name: "Muhasebe",        desc: "Gelir-gider, komisyon, raporlar" }
  ];

  /* --- Yardımcılar --- */
  function dstr(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
  function diffDays(a, b) { return Math.round((new Date(a) - new Date(b)) / 86400000); }

  function tcknMask() { return `${ri(10, 59)}*******${ri(10, 99)}`; }
  function phone() { return `0${pick(["532","533","535","542","505","506","555","541"])} ${ri(100,999)} ${ri(10,99)} ${ri(10,99)}`; }
  function plaka() { return `${ri(1,81).toString().padStart(2,"0")} ${pick(["AB","CD","EF","KL","MN","TR","ZY"])} ${ri(100,999)}`; }

  /* --- Personel --- */
  const STAFF_SEED = [
    ["Emre Arslan","Yönetim","Acente Müdürü","admin",0.00],
    ["Selin Kaya","Satış","Satış Uzmanı","satis",0.25],
    ["Burak Demir","Satış","Satış Uzmanı","satis",0.22],
    ["Merve Yıldız","Satış","Kıdemli Satış Uzmanı","satis",0.30],
    ["Onur Çelik","Satış","Satış Temsilcisi","satis",0.18],
    ["Ceren Şahin","Operasyon","Operasyon Sorumlusu","operasyon",0.10],
    ["Kadir Aydın","Operasyon","Operasyon Uzmanı","operasyon",0.08],
    ["Pınar Öztürk","Muhasebe","Muhasebe Sorumlusu","muhasebe",0.00],
    ["Tolga Kılıç","Hasar","Hasar Uzmanı","operasyon",0.05],
    ["Duygu Arslan","Müşteri İlişkileri","Müşteri Temsilcisi","satis",0.15],
    ["Barış Koç","Satış","Kurumsal Satış","satis",0.28],
    ["Esra Turan","Müşteri İlişkileri","Çağrı Merkezi","operasyon",0.06]
  ];

  const staff = STAFF_SEED.map((s, i) => {
    const [name, dep, unvan, rol, oran] = s;
    const slug = name.toLocaleLowerCase("tr").replace(/ /g, ".")
      .replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ç/g,"c");
    return {
      id: "P" + String(i + 1).padStart(3, "0"),
      name, dep, unvan, rol,
      comRate: oran,
      email: slug + "@demoacente.com",
      phone: phone(),
      hireDate: dstr(addDays(TODAY, -ri(200, 2600))),
      salary: ri(38, 95) * 1000,
      status: i === 11 ? "İzinli" : (i === 8 ? "Pasif" : "Aktif"),
      initials: name.split(" ").map(x => x[0]).join("")
    };
  });
  const salesStaff = staff.filter(s => s.comRate > 0);

  /* --- Müşteriler --- */
  const customers = [];
  for (let i = 0; i < 84; i++) {
    const kurumsal = chance(0.22);
    const name = kurumsal ? pick(FIRMA) + (chance(0.3) ? " " + ri(2, 9) : "") : `${pick(AD)} ${pick(SOYAD)}`;
    const created = addDays(TODAY, -ri(20, 1500));
    customers.push({
      id: "M" + String(1000 + i),
      name,
      type: kurumsal ? "Kurumsal" : "Bireysel",
      tckn: kurumsal ? `VKN ${ri(1000000000, 9999999999)}` : tcknMask(),
      birth: kurumsal ? "-" : dstr(new Date(ri(1958, 2004), ri(0, 11), ri(1, 28))),
      phone: phone(),
      email: (kurumsal ? "info@" + name.toLocaleLowerCase("tr").replace(/[^a-z0-9]/g, "").slice(0, 12) + ".com.tr"
                      : name.toLocaleLowerCase("tr").replace(/[^a-z]/g, "") + ri(10, 99) + "@mail.com"),
      city: pick(SEHIR),
      address: `${pick(MAHALLE)} No:${ri(1, 120)} D:${ri(1, 20)}`,
      rep: pick(salesStaff).id,
      segment: pick(["VIP", "Standart", "Standart", "Standart", "Potansiyel"]),
      source: pick(["Referans", "Web", "Telefon", "Şube", "Sosyal Medya"]),
      createdAt: dstr(created),
      kvkk: chance(0.9),
      notes: []
    });
  }

  /* --- Poliçeler + Taksitler --- */
  const policies = [];
  const installments = [];
  let polSeq = 0, insSeq = 0;

  customers.forEach((cus) => {
    const n = ri(1, 4);
    for (let k = 0; k < n; k++) {
      polSeq++;
      const co = pick(COMPANIES);
      const br = (co.short === "AHE" || co.short === "AYE")
        ? pick(BRANCHES.filter(b => b.key === "hayat" || b.key === "bes"))
        : pick(BRANCHES.filter(b => b.key !== "bes"));
      const start = addDays(TODAY, -ri(-40, 400));
      const end = addMonths(start, br.key === "bes" ? 120 : 12);
      const gross = br.key === "kasko" ? ri(9, 42) * 1000
        : br.key === "trafik" ? ri(4, 14) * 1000
        : br.key === "saglik" ? ri(12, 60) * 1000
        : br.key === "hayat" ? ri(3, 18) * 1000
        : br.key === "bes" ? ri(1, 6) * 1000
        : br.key === "dask" ? ri(900, 3200)
        : ri(2, 22) * 1000;
      const taksit = pick([1, 1, 2, 3, 4, 6, 8, 12]);
      const isFuture = start > TODAY;
      const iptal = chance(0.05);
      const status = iptal ? "İptal" : (isFuture ? "Beklemede" : (end < TODAY ? "Süresi Doldu" : "Aktif"));
      const rep = pick(salesStaff);
      const pol = {
        id: "POL" + String(20000 + polSeq),
        no: `${co.short}-${ri(2024, 2026)}-${ri(100000, 999999)}`,
        customerId: cus.id,
        companyId: co.id,
        branch: br.key,
        branchName: br.name,
        start: dstr(start),
        end: dstr(end),
        gross,
        net: round2(gross * 0.82),
        comRate: br.com,
        commission: round2(gross * 0.82 * br.com),
        installments: taksit,
        status,
        repId: rep.id,
        renewalOf: chance(0.35) ? "POL" + String(20000 + Math.max(1, polSeq - ri(20, 60))) : null,
        plate: (br.key === "kasko" || br.key === "trafik") ? plaka() : null,
        source: pick(["Entegrasyon", "Entegrasyon", "Entegrasyon", "Manuel"]),
        lastSync: dstr(addDays(TODAY, -ri(0, 3)))
      };
      policies.push(pol);

      const per = round2(gross / taksit);
      for (let t = 0; t < taksit; t++) {
        insSeq++;
        const due = addMonths(start, t);
        let st;
        if (iptal) st = t === 0 ? "Ödendi" : "İptal";
        else if (due < addDays(TODAY, -3)) st = chance(0.88) ? "Ödendi" : "Gecikmiş";
        else if (due <= addDays(TODAY, 30)) st = chance(0.25) ? "Ödendi" : "Bekliyor";
        else st = "Bekliyor";
        installments.push({
          id: "T" + String(90000 + insSeq),
          policyId: pol.id,
          customerId: cus.id,
          no: t + 1,
          of: taksit,
          due: dstr(due),
          amount: per,
          status: st,
          paidAt: st === "Ödendi" ? dstr(addDays(due, ri(-4, 5))) : null,
          method: st === "Ödendi" ? pick(["Kredi Kartı", "Havale/EFT", "Nakit", "Otomatik Ödeme"]) : null
        });
      }
    }
  });

  /* --- Müşteri notları / işlem geçmişi --- */
  const NOT_TIPLERI = [
    ["Telefon", "Yenileme teklifi iletildi, müşteri değerlendirecek."],
    ["Görüşme", "Ofis ziyareti yapıldı, sağlık ürünü sunuldu."],
    ["E-posta", "Poliçe kopyası ve ödeme planı gönderildi."],
    ["Hasar", "Hasar dosyası açıldı, eksper yönlendirildi."],
    ["Tahsilat", "Gecikmiş taksit için hatırlatma yapıldı."],
    ["Not", "Müşteri araç değişikliği planlıyor, Ekim'de aranacak."]
  ];
  customers.forEach(c => {
    const n = ri(0, 4);
    for (let i = 0; i < n; i++) {
      const t = pick(NOT_TIPLERI);
      c.notes.push({
        date: dstr(addDays(TODAY, -ri(1, 300))),
        type: t[0], text: t[1], by: pick(staff).name
      });
    }
    c.notes.sort((a, b) => b.date.localeCompare(a.date));
  });

  /* --- Demirbaş / Zimmet --- */
  const ASSET_TYPES = [
    ["Dizüstü Bilgisayar", ["Lenovo ThinkPad E14","HP ProBook 450","MacBook Air M2","Dell Latitude 5440"], 28000, 62000],
    ["Masaüstü Bilgisayar", ["Dell OptiPlex 7010","HP EliteDesk 800","Casper Nirvana"], 18000, 40000],
    ["Cep Telefonu", ["iPhone 14","Samsung A54","Xiaomi Redmi Note 13"], 12000, 55000],
    ["Monitör", ["Dell P2422H","LG 24MK600","Philips 243V7"], 4000, 11000],
    ["Yazıcı", ["HP LaserJet M428","Brother DCP-L2540","Canon i-SENSYS"], 6000, 22000],
    ["Araç", ["Fiat Egea 1.4","Renault Clio 1.0","Ford Courier","Peugeot 301"], 750000, 1450000],
    ["Ofis Mobilyası", ["Yönetici Masası","Toplantı Masası","Ofis Koltuğu"], 3000, 25000],
    ["Diğer Ekipman", ["Projeksiyon","Barkod Okuyucu","POS Cihazı","Klima"], 5000, 45000]
  ];
  const assets = [];
  const assignments = [];
  let asSeq = 0, agSeq = 0;
  for (let i = 0; i < 34; i++) {
    asSeq++;
    const t = pick(ASSET_TYPES);
    const buy = addDays(TODAY, -ri(60, 1800));
    const durum = chance(0.08) ? "Arızalı" : (chance(0.06) ? "Hurda" : "Kullanımda");
    const assigned = durum === "Kullanımda" ? (chance(0.78) ? pick(staff) : null) : null;
    const a = {
      id: "D" + String(500 + asSeq),
      code: `DBS-${String(500 + asSeq)}`,
      type: t[0],
      model: pick(t[1]),
      serial: `SN${ri(100000, 999999)}${pick(["A","B","C","X"])}`,
      plate: t[0] === "Araç" ? plaka() : null,
      buyDate: dstr(buy),
      price: ri(t[2], t[3]),
      status: durum,
      holderId: assigned ? assigned.id : null,
      location: assigned ? "Personel Zimmeti" : pick(["Ana Ofis Depo", "Şube - Kadıköy", "Ana Ofis"])
    };
    assets.push(a);

    // zimmet geçmişi
    const hist = ri(0, 2);
    for (let h = 0; h < hist; h++) {
      agSeq++;
      const p = pick(staff);
      const ver = addDays(buy, ri(5, 400) + h * 200);
      if (ver > TODAY) break;
      const iade = addDays(ver, ri(60, 400));
      assignments.push({
        id: "Z" + String(700 + agSeq),
        assetId: a.id, staffId: p.id,
        givenAt: dstr(ver),
        returnedAt: iade < TODAY ? dstr(iade) : null,
        note: pick(["Zimmet tutanağı imzalandı.", "Görev değişikliği nedeniyle devredildi.", "Yeni personel teslimi.", "Bakım sonrası teslim."]),
        condition: pick(["Sağlam", "Sağlam", "Sağlam", "Çizik/Yıpranmış"])
      });
    }
    if (a.holderId) {
      agSeq++;
      assignments.push({
        id: "Z" + String(700 + agSeq),
        assetId: a.id, staffId: a.holderId,
        givenAt: dstr(addDays(TODAY, -ri(10, 400))),
        returnedAt: null,
        note: "Aktif zimmet.", condition: "Sağlam"
      });
    }
  }
  assignments.sort((a, b) => b.givenAt.localeCompare(a.givenAt));

  /* --- Gelir / Gider --- */
  const EXPENSE_CATS = [
    ["Kira", 65000, 65000, "monthly"],
    ["Personel Maaş", 380000, 460000, "monthly"],
    ["SGK / Vergi", 95000, 130000, "monthly"],
    ["Elektrik/Su/Doğalgaz", 6000, 18000, "monthly"],
    ["İnternet & Telefon", 4500, 7000, "monthly"],
    ["Yazılım / Lisans", 8000, 24000, "monthly"],
    ["Araç Gideri (Yakıt/Bakım)", 12000, 38000, "random"],
    ["Reklam & Pazarlama", 15000, 70000, "random"],
    ["Kırtasiye & Ofis", 2000, 9000, "random"],
    ["Muhasebe & Danışmanlık", 12000, 20000, "monthly"],
    ["Demirbaş Alımı", 15000, 120000, "random"],
    ["Temsil & Ağırlama", 3000, 22000, "random"]
  ];
  const INCOME_CATS = ["Poliçe Komisyonu", "Yenileme Komisyonu", "Hizmet Bedeli", "Prodüksiyon Primi", "Diğer Gelir"];

  const finance = [];
  let finSeq = 0;
  for (let m = 17; m >= 0; m--) {
    const base = addMonths(TODAY, -m);
    const isCur = (m === 0);
    const maxDay = isCur ? TODAY.getDate() : 28;
    const mk = (d) => new Date(base.getFullYear(), base.getMonth(), d);

    // --- Giderler ---
    let monthExp = 0;
    EXPENSE_CATS.forEach(c => {
      const times = c[3] === "monthly" ? 1 : ri(0, 3);
      for (let i = 0; i < times; i++) {
        const d = mk(ri(1, maxDay));
        finSeq++;
        const amount = ri(c[1], c[2]);
        monthExp += amount;
        finance.push({
          id: "F" + String(3000 + finSeq), kind: "Gider", category: c[0],
          date: dstr(d), amount,
          desc: `${c[0]} - ${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`,
          method: pick(["Havale/EFT", "Kredi Kartı", "Nakit", "Otomatik Ödeme"]),
          staffId: c[0] === "Personel Maaş" ? null : (chance(0.3) ? pick(staff).id : null),
          doc: chance(0.75) ? `FTR-${ri(100000, 999999)}` : null
        });
      }
    });

    // --- Gelirler: giderin 1.18–1.46 katı hedeflenir (sağlıklı kâr marjı) ---
    const target = Math.round(monthExp * (1.18 + rnd() * 0.28));
    const main = Math.round(target * (0.55 + rnd() * 0.15));
    finSeq++;
    finance.push({
      id: "F" + String(3000 + finSeq), kind: "Gelir", category: "Poliçe Komisyonu",
      date: dstr(mk(ri(1, Math.min(10, maxDay)))), amount: main,
      desc: "Sigorta şirketleri komisyon tahakkuku",
      method: "Havale/EFT",
      staffId: null, doc: `DKT-${ri(100000, 999999)}`
    });
    let kalan = target - main;
    const n = ri(3, 5);
    for (let i = 0; i < n; i++) {
      const amount = i === n - 1 ? Math.max(1000, kalan) : Math.round(kalan / (n - i) * (0.7 + rnd() * 0.6));
      kalan -= amount;
      if (amount <= 0) continue;
      finSeq++;
      const cat = pick(INCOME_CATS.filter(c => c !== "Poliçe Komisyonu"));
      finance.push({
        id: "F" + String(3000 + finSeq), kind: "Gelir", category: cat,
        date: dstr(mk(ri(1, maxDay))), amount,
        desc: `${cat} tahakkuku`,
        method: pick(["Havale/EFT", "Havale/EFT", "Kredi Kartı"]),
        staffId: chance(0.55) ? pick(salesStaff).id : null,
        doc: chance(0.6) ? `DKT-${ri(100000, 999999)}` : null
      });
    }
  }
  finance.sort((a, b) => b.date.localeCompare(a.date));

  /* --- Görevler --- */
  const TASK_TPL = [
    "Yaklaşan vade için müşteri araması",
    "Kasko yenileme teklifi hazırla",
    "Gecikmiş taksit tahsilat takibi",
    "Yeni müşteri evrak toplama",
    "Hasar dosyası eksper takibi",
    "BES katkı payı bilgilendirmesi",
    "Kurumsal müşteri ziyareti",
    "Şirket entegrasyon mutabakatı",
    "Aylık komisyon mutabakatı",
    "Poliçe iptali işlemi",
    "Sağlık ürünü çapraz satış görüşmesi",
    "KVKK onay formu tamamlanacak"
  ];
  const tasks = [];
  for (let i = 0; i < 34; i++) {
    const due = addDays(TODAY, ri(-25, 30));
    const assignee = pick(staff);
    const cus = chance(0.7) ? pick(customers) : null;
    let st;
    if (due < TODAY) st = chance(0.62) ? "Tamamlandı" : "Gecikti";
    else st = pick(["Yapılacak", "Devam Ediyor", "Yapılacak"]);
    tasks.push({
      id: "G" + String(400 + i),
      title: pick(TASK_TPL),
      assigneeId: assignee.id,
      customerId: cus ? cus.id : null,
      priority: pick(["Düşük", "Normal", "Normal", "Yüksek", "Acil"]),
      due: dstr(due),
      createdAt: dstr(addDays(due, -ri(2, 20))),
      status: st,
      completedAt: st === "Tamamlandı" ? dstr(addDays(due, -ri(0, 3))) : null,
      desc: "Demo kayıt — görev detay açıklaması bu alanda tutulur."
    });
  }
  tasks.sort((a, b) => a.due.localeCompare(b.due));

  /* --- Entegrasyon durumu --- */
  const integrations = COMPANIES.map((c, i) => {
    const pols = policies.filter(p => p.companyId === c.id);
    const durum = i === 7 ? "Hata" : (i === 11 ? "Kurulum Bekliyor" : (i === 4 ? "Uyarı" : "Aktif"));
    return {
      companyId: c.id,
      method: c.method,
      status: durum,
      freq: c.method.indexOf("API") === 0 ? "15 dakika" : (c.method.indexOf("Web") === 0 ? "1 saat" : "Günde 1 kez"),
      lastRun: `2026-09-04 ${String(ri(0, 8)).padStart(2, "0")}:${String(ri(0, 59)).padStart(2, "0")}`,
      duration: ri(4, 180) + " sn",
      records: pols.length,
      newRec: ri(0, 24),
      updated: ri(0, 90),
      errors: durum === "Hata" ? ri(3, 18) : (durum === "Uyarı" ? ri(1, 4) : 0),
      message: durum === "Hata" ? "Kimlik doğrulama başarısız (401) — servis şifresi yenilenmeli."
        : durum === "Uyarı" ? "SFTP dosyasında 3 kayıt eşleşmedi, manuel kontrol gerekiyor."
        : durum === "Kurulum Bekliyor" ? "Şirketten servis kullanıcı bilgileri bekleniyor."
        : "Son senkronizasyon başarıyla tamamlandı."
    };
  });

  const syncLog = [];
  for (let i = 0; i < 40; i++) {
    const c = pick(COMPANIES);
    const d = addDays(TODAY, -Math.floor(i / 6));
    const ok = chance(0.82);
    syncLog.push({
      id: "S" + (900 + i),
      companyId: c.id,
      at: `${dstr(d)} ${String(ri(0, 23)).padStart(2, "0")}:${String(ri(0, 59)).padStart(2, "0")}`,
      type: pick(["Otomatik", "Otomatik", "Manuel"]),
      result: ok ? "Başarılı" : "Hatalı",
      records: ri(0, 180),
      note: ok ? "Poliçe ve tahsilat verileri güncellendi." : "Zaman aşımı — yeniden denenecek."
    });
  }
  syncLog.sort((a, b) => b.at.localeCompare(a.at));

  /* --- Sistem logları --- */
  const LOG_ACTS = [
    ["Giriş", "Sisteme giriş yapıldı"],
    ["Poliçe", "Poliçe kaydı güncellendi"],
    ["Müşteri", "Yeni müşteri oluşturuldu"],
    ["Tahsilat", "Taksit ödemesi işlendi"],
    ["Yetki", "Kullanıcı rolü değiştirildi"],
    ["Zimmet", "Demirbaş zimmeti verildi"],
    ["Finans", "Gider kaydı silindi"],
    ["Entegrasyon", "Manuel senkronizasyon başlatıldı"],
    ["Yedek", "Otomatik veritabanı yedeği alındı"],
    ["Rapor", "Komisyon raporu dışa aktarıldı"]
  ];
  const logs = [];
  for (let i = 0; i < 60; i++) {
    const a = pick(LOG_ACTS);
    const d = addDays(TODAY, -Math.floor(i / 9));
    logs.push({
      id: "L" + (10000 + i),
      at: `${dstr(d)} ${String(ri(0, 23)).padStart(2, "0")}:${String(ri(0, 59)).padStart(2, "0")}:${String(ri(0, 59)).padStart(2, "0")}`,
      user: pick(staff).name,
      module: a[0],
      action: a[1],
      ip: `88.${ri(1, 250)}.${ri(1, 250)}.${ri(1, 250)}`,
      ref: chance(0.6) ? pick(policies).no : "-"
    });
  }
  logs.sort((a, b) => b.at.localeCompare(a.at));

  /* --- Export --- */
  global.DB = {
    today: TODAY,
    todayStr: dstr(TODAY),
    companies: COMPANIES,
    branches: BRANCHES,
    roles: ROLLER,
    departments: DEPARTMANLAR,
    staff, customers, policies, installments,
    assets, assignments, finance, tasks,
    integrations, syncLog, logs,
    util: { dstr, addDays, addMonths, diffDays, ri, pick, rnd }
  };
})(window);
