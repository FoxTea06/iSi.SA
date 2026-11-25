(() => {
  const LS_KEYS = {
    kontraktor: "isisa_paksi_kontraktor_v1",
    industri: "isisa_paksi_industri_v1",
    rekodSisa: "isisa_paksi_rekod_sisa_v1",
    theme: "isisa_theme_pref"
  };

  // Senarai Rasmi Seksyen MBSA Shah Alam (Seksyen 1–36 & U1–U20)
  const SEKSYEN_LIST = [
    ...Array.from({ length: 36 }, (_, i) => `Seksyen ${i + 1}`),
    ...Array.from({ length: 20 }, (_, i) => `Seksyen U${i + 1}`)
  ];

  // State
  let kontraktorList = loadLocal(LS_KEYS.kontraktor);
  let industriList = loadLocal(LS_KEYS.industri);
  let rekodSisaList = loadLocal(LS_KEYS.rekodSisa);

  let currentRole = "mbsa"; // "mbsa" | "kontraktor"
  let activeContractorId = "";
  let activeDashTab = "kontraktor"; // "kontraktor" | "industri" | "sisa"

  let editingSisaId = null;
  let currentSijilFile = { name: "", data: "" };
  let receiptDrafts = [];
  let selectedRecordIds = new Set();
  let modalActiveRecordId = null;

  let supabaseClient = null;
  let isDbConnected = false;
  let dbTables = {
    kontraktor: "kontraktor_paksi",
    industri: "industri_paksi",
    rekodSisa: "rekod_sisa_industri"
  };

  // DOM References
  const navLinks = document.querySelectorAll(".nav-link[data-view]");
  const navBorangBtn = document.getElementById("nav-borang-btn");
  const borangSubmenu = document.getElementById("borang-submenu");
  const jumpLinks = document.querySelectorAll(".nav-jump[data-jump-section]");
  const viewPanels = document.querySelectorAll(".view-panel");
  const menuToggleBtn = document.getElementById("menu-toggle-btn");
  const sidenav = document.getElementById("sidenav");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  const roleSelect = document.getElementById("role-select");
  const roleAvatar = document.getElementById("role-avatar");
  const contractorPickWrap = document.getElementById("contractor-pick-wrap");
  const activeContractorSelect = document.getElementById("active-contractor-select");
  const sideAccessBox = document.getElementById("side-access-box");
  const sideAccessTitle = document.getElementById("side-access-title");
  const sideAccessDesc = document.getElementById("side-access-desc");
  const navRecordCount = document.getElementById("nav-record-count");

  // Dashboard DOM
  const dashPanels = document.querySelectorAll(".dash-panel[data-dash-tab]");
  const dashKontraktorCount = document.getElementById("dash-kontraktor-count");
  const dashIndustriCount = document.getElementById("dash-industri-count");
  const dashSisaTotal = document.getElementById("dash-sisa-total");
  const dashListTitle = document.getElementById("dash-list-title");
  const dashListSub = document.getElementById("dash-list-sub");
  const dashSortSelect = document.getElementById("dash-sort-select");
  const dashListAddBtn = document.getElementById("dash-list-add-btn");
  const dashListThead = document.getElementById("dash-list-thead");
  const dashListTbody = document.getElementById("dash-list-tbody");
  const dashListEmpty = document.getElementById("dash-list-empty");
  const dashQuickFormBtn = document.getElementById("dash-quick-form-btn");

  // Unified Form DOM
  const unifiedForm = document.getElementById("paksi-unified-form");
  const editSisaBanner = document.getElementById("edit-sisa-banner");
  const editSisaIdEl = document.getElementById("edit-sisa-id");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const submitFormBtn = document.getElementById("submit-form-btn");
  const resetFormBtn = document.getElementById("reset-form-btn");
  const formErrorBox = document.getElementById("form-error-box");

  const fKontraktorPick = document.getElementById("fKontraktorPick");
  const fIndustriPick = document.getElementById("fIndustriPick");
  const iNamaInput = document.getElementById("iNama");
  const industriDupWarning = document.getElementById("industri-dup-warning");
  const industriDupMsg = document.getElementById("industri-dup-msg");
  const useExistingIndustriBtn = document.getElementById("use-existing-industri-btn");
  let detectedDuplicateIndustri = null;
  const kSijilFileInput = document.getElementById("kSijilFile");
  const kSijilHint = document.getElementById("kSijilHint");
  const plateSlotsContainer = document.getElementById("plate-slots-container");
  const addPlateBtn = document.getElementById("add-plate-btn");

  const sJenisSisaSelect = document.getElementById("sJenisSisa");
  const sJenisSisaLainWrap = document.getElementById("sJenisSisaLainWrap");
  const sJenisSisaLainInput = document.getElementById("sJenisSisaLain");
  const receiptSlotsContainer = document.getElementById("receipt-slots-container");
  const addReceiptBtn = document.getElementById("add-receipt-btn");

  // Rekod Laporan DOM
  const recordsAccessSub = document.getElementById("records-access-sub");
  const searchInput = document.getElementById("search-input");
  const filterSeksyen = document.getElementById("filter-seksyen");
  const sortRecordsSelect = document.getElementById("sort-records");
  const thCheckAll = document.getElementById("th-check-all");
  const selectAllCheckbox = document.getElementById("select-all-records");
  const downloadMultiReceiptsBtn = document.getElementById("download-multi-receipts-btn");
  const selectedReceiptCountEl = document.getElementById("selected-receipt-count");
  const exportPdfBtn = document.getElementById("export-pdf-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const newReportBtn = document.getElementById("new-report-btn");
  const recordsTbody = document.getElementById("records-tbody");
  const emptyRecordsEl = document.getElementById("empty-records");

  // Modal & Toast
  const detailModal = document.getElementById("detail-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody = document.getElementById("modal-body");
  const modalReceiptPdfBtn = document.getElementById("modal-receipt-pdf-btn");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const closeModalFooterBtn = document.getElementById("close-modal-footer-btn");
  const toastEl = document.getElementById("toast");

  // ==================== HELPERS ====================
  function loadLocal(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  function saveLocal(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (_) {}
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatNum(n, dec = 2) {
    return (Number(n) || 0).toLocaleString("ms-MY", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.add("hidden"), 3200);
  }

  function seksyenRank(seksyen) {
    const idx = SEKSYEN_LIST.indexOf(seksyen);
    return idx === -1 ? 999 : idx;
  }

  function sortByOption(arr, mode, dateField = "tarikhLaporan", qtyField = "kuantitiTan") {
    const copy = [...arr];
    if (mode === "seksyen-asc") {
      copy.sort((a, b) => seksyenRank(a.seksyen) - seksyenRank(b.seksyen));
    } else if (mode === "seksyen-desc") {
      copy.sort((a, b) => seksyenRank(b.seksyen) - seksyenRank(a.seksyen));
    } else if (mode === "kuantiti-desc") {
      copy.sort((a, b) => (Number(b[qtyField]) || 0) - (Number(a[qtyField]) || 0));
    } else if (mode === "tarikh-desc" || mode === "latest") {
      copy.sort((a, b) => String(b[dateField] || b.createdAt || "").localeCompare(String(a[dateField] || a.createdAt || "")));
    }
    return copy;
  }

  function generateId(prefix, list) {
    const year = new Date().getFullYear();
    const maxSeq = list.reduce((max, item) => {
      const m = String(item.id).match(/(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `${prefix}-${year}-${String(maxSeq + 1).padStart(3, "0")}`;
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function getKontraktorById(id) {
    return kontraktorList.find((k) => k.id === id) || null;
  }

  function getIndustriById(id) {
    return industriList.find((i) => i.id === id) || null;
  }

  function getJenisSisaLabel(rec) {
    return rec.jenisSisa === "Lain-lain" && rec.jenisSisaLain
      ? `Lain-lain (${rec.jenisSisaLain})`
      : rec.jenisSisa;
  }

  // ==================== ROLE-BASED DATA SCOPING ====================
  function getVisibleKontraktor() {
    if (currentRole === "mbsa") return kontraktorList;
    if (!activeContractorId) return [];
    return kontraktorList.filter((k) => k.id === activeContractorId);
  }

  function getVisibleIndustri() {
    if (currentRole === "mbsa") return industriList;
    if (!activeContractorId) return [];
    return industriList.filter((i) => i.kontraktorId === activeContractorId);
  }

  function getVisibleRekodSisa() {
    if (currentRole === "mbsa") return rekodSisaList;
    if (!activeContractorId) return [];
    return rekodSisaList.filter((r) => r.kontraktorId === activeContractorId);
  }

  // ==================== DROPDOWNS & PREFILL ====================
  function populateSeksyenDropdowns() {
    const optionsHtml =
      '<option value="">-- Pilih Seksyen --</option>' +
      SEKSYEN_LIST.map((s) => `<option value="${s}">${s}</option>`).join("");

    document.querySelectorAll(".seksyen-select").forEach((sel) => {
      const prev = sel.value;
      sel.innerHTML = optionsHtml;
      if (prev) sel.value = prev;
    });

    const prevFilter = filterSeksyen.value || "ALL";
    filterSeksyen.innerHTML =
      '<option value="ALL">Semua Seksyen</option>' +
      SEKSYEN_LIST.map((s) => `<option value="${s}">${s}</option>`).join("");
    filterSeksyen.value = prevFilter;
  }

  function populateActiveContractorPicker() {
    if (!kontraktorList.length) {
      activeContractorSelect.innerHTML = '<option value="">Tiada Kontraktor Berdaftar</option>';
      activeContractorId = "";
      return;
    }
    if (!activeContractorId || !kontraktorList.some((k) => k.id === activeContractorId)) {
      activeContractorId = kontraktorList[0].id;
    }
    activeContractorSelect.innerHTML = kontraktorList
      .map((k) => `<option value="${escapeHtml(k.id)}">${escapeHtml(k.namaKontraktor)}</option>`)
      .join("");
    activeContractorSelect.value = activeContractorId;
  }

  function populateFormKontraktorPicker() {
    const list = currentRole === "kontraktor" ? getVisibleKontraktor() : kontraktorList;
    const prev = fKontraktorPick.value || "__NEW__";

    fKontraktorPick.innerHTML =
      '<option value="__NEW__">+ Daftar Kontraktor Baharu</option>' +
      list
        .map((k) => `<option value="${escapeHtml(k.id)}">${escapeHtml(k.namaKontraktor)} (${escapeHtml(k.seksyen)})</option>`)
        .join("");

    if (currentRole === "kontraktor" && activeContractorId) {
      fKontraktorPick.value = activeContractorId;
      fillKontraktorFields(getKontraktorById(activeContractorId));
    } else if (prev !== "__NEW__" && list.some((k) => k.id === prev)) {
      fKontraktorPick.value = prev;
    } else {
      fKontraktorPick.value = "__NEW__";
    }

    populateFormIndustriPicker();
  }

  function populateFormIndustriPicker() {
    const kId = fKontraktorPick.value;
    const prev = fIndustriPick.value || "__NEW__";
    const list = kId && kId !== "__NEW__" ? industriList.filter((i) => i.kontraktorId === kId) : [];

    fIndustriPick.innerHTML =
      '<option value="__NEW__">+ Daftar Industri Baharu</option>' +
      list
        .map((i) => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.namaIndustri)} (${escapeHtml(i.seksyen)})</option>`)
        .join("");

    if (prev !== "__NEW__" && list.some((i) => i.id === prev)) {
      fIndustriPick.value = prev;
    } else {
      fIndustriPick.value = "__NEW__";
    }
  }

  function fillKontraktorFields(k) {
    if (!k) {
      document.getElementById("kNama").value = "";
      document.getElementById("kSeksyen").value = "";
      document.getElementById("kAlamat").value = "";
      document.getElementById("kTarikhLantikan").value = todayISO();
      currentSijilFile = { name: "", data: "" };
      kSijilFileInput.value = "";
      kSijilHint.textContent = "Tiada fail dilampirkan (pilihan).";
      document.getElementById("kNoFail").value = "";
      document.getElementById("kNoLesenIndustri").value = "";
      document.getElementById("kNoLesenSampah").value = "";
      document.getElementById("kNoSSM").value = "";
      document.getElementById("kBilLori").value = 1;
      document.getElementById("kBilKilang").value = 0;
      document.getElementById("kPegawai").value = "";
      document.getElementById("kTelefon").value = "";
      renderPlateSlots([""]);
      return;
    }

    document.getElementById("kNama").value = k.namaKontraktor;
    document.getElementById("kSeksyen").value = k.seksyen;
    document.getElementById("kAlamat").value = k.alamat;
    document.getElementById("kTarikhLantikan").value = k.tarikhLantikan;
    currentSijilFile = { name: k.sijilNama || "", data: k.sijilData || "" };
    kSijilFileInput.value = "";
    kSijilHint.textContent = k.sijilNama ? `Fail semasa: ${k.sijilNama}` : "Tiada fail dilampirkan (pilihan).";
    document.getElementById("kNoFail").value = k.noPendaftaranFail;
    document.getElementById("kNoLesenIndustri").value = k.noLesenIndustri;
    document.getElementById("kNoLesenSampah").value = k.noLesenBuangSampah;
    document.getElementById("kNoSSM").value = k.noSSM;
    document.getElementById("kBilLori").value = k.bilLori;
    document.getElementById("kBilKilang").value = k.bilKilang;
    document.getElementById("kPegawai").value = k.namaPegawai;
    document.getElementById("kTelefon").value = k.noTelefonPegawai;
    renderPlateSlots(k.noPlatLori && k.noPlatLori.length ? k.noPlatLori : [""]);
  }

  function fillIndustriFields(ind) {
    if (!ind) {
      document.getElementById("iNama").value = "";
      document.getElementById("iSeksyen").value = "";
      document.getElementById("iAlamat").value = "";
      document.getElementById("iTarikhPelaporan").value = todayISO();
      document.getElementById("iJenisPerniagaan").value = "";
      return;
    }
    document.getElementById("iNama").value = ind.namaIndustri;
    document.getElementById("iSeksyen").value = ind.seksyen;
    document.getElementById("iAlamat").value = ind.alamat;
    document.getElementById("iTarikhPelaporan").value = ind.tarikhPelaporan;
    document.getElementById("iJenisPerniagaan").value = ind.jenisPerniagaan;
  }

  // ==================== ROLE SWITCHER UI ====================
  function applyRoleUI() {
    const isMbsa = currentRole === "mbsa";
    roleAvatar.textContent = isMbsa ? "MB" : "KT";
    roleAvatar.classList.toggle("is-kontraktor", !isMbsa);
    contractorPickWrap.classList.toggle("hidden", isMbsa);

    sideAccessBox.classList.toggle("mode-kontraktor", !isMbsa);
    if (isMbsa) {
      sideAccessTitle.textContent = "Akses: Staff MBSA";
      sideAccessDesc.textContent =
        "Anda boleh melihat semua kontraktor, industri, rekod sisa serta memuat turun pelbagai resit PDF.";
      recordsAccessSub.textContent =
        "Paparan penuh MBSA: tapis & susun mengikut Seksyen, eksport PDF/CSV, dan muat turun pelbagai resit.";
    } else {
      const k = getKontraktorById(activeContractorId);
      sideAccessTitle.textContent = "Akses: Kontraktor PAKSI";
      sideAccessDesc.textContent = k
        ? `Memaparkan rekod milik ${k.namaKontraktor} sahaja.`
        : "Tiada profil kontraktor dipilih. Isi Borang Pelaporan untuk mendaftar kontraktor anda.";
      recordsAccessSub.textContent =
        "Paparan Kontraktor: hanya rekod pelaporan sisa milik syarikat anda dipaparkan.";
    }

    downloadMultiReceiptsBtn.classList.toggle("hidden", !isMbsa);
    thCheckAll.classList.toggle("hidden", !isMbsa);
    selectedRecordIds.clear();
    updateMultiReceiptBtn();

    populateActiveContractorPicker();
    populateFormKontraktorPicker();
    refreshAllViews();
  }

  // ==================== NAVIGATION & THEME ====================
  function switchView(viewId) {
    navLinks.forEach((btn) => btn.classList.toggle("active", btn.dataset.view === viewId));
    viewPanels.forEach((panel) => panel.classList.toggle("active", panel.id === viewId));
    const isBorang = viewId === "borang-view";
    borangSubmenu.classList.toggle("open", isBorang);
    navBorangBtn.setAttribute("aria-expanded", String(isBorang));
    sidenav.classList.remove("open");
    refreshAllViews();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const moon = themeToggleBtn.querySelector(".icon-moon");
    const sun = themeToggleBtn.querySelector(".icon-sun");
    moon.classList.toggle("hidden", theme === "dark");
    sun.classList.toggle("hidden", theme !== "dark");
    try {
      localStorage.setItem(LS_KEYS.theme, theme);
    } catch (_) {}
  }

  function initTheme() {
    let saved = "light";
    try {
      const pref = localStorage.getItem(LS_KEYS.theme);
      if (pref === "dark" || pref === "light") saved = pref;
    } catch (_) {}
    applyTheme(saved);
  }

  // ==================== SUPABASE INTEGRATION ====================
  function kontraktorToDb(k) {
    return {
      id: k.id,
      nama_kontraktor: k.namaKontraktor,
      alamat: k.alamat,
      seksyen: k.seksyen,
      tarikh_lantikan_paksi: k.tarikhLantikan,
      sijil_nama: k.sijilNama || "",
      sijil_data: k.sijilData || "",
      no_pendaftaran_fail: k.noPendaftaranFail,
      no_lesen_industri: k.noLesenIndustri,
      no_lesen_buang_sampah: k.noLesenBuangSampah,
      no_ssm: k.noSSM,
      bil_lori: k.bilLori,
      no_plat_lori: k.noPlatLori || [],
      nama_pegawai: k.namaPegawai,
      no_telefon_pegawai: k.noTelefonPegawai,
      bil_kilang: k.bilKilang
    };
  }

  function kontraktorFromDb(r) {
    return {
      id: r.id,
      namaKontraktor: r.nama_kontraktor,
      alamat: r.alamat,
      seksyen: r.seksyen,
      tarikhLantikan: r.tarikh_lantikan_paksi,
      sijilNama: r.sijil_nama || "",
      sijilData: r.sijil_data || "",
      noPendaftaranFail: r.no_pendaftaran_fail,
      noLesenIndustri: r.no_lesen_industri,
      noLesenBuangSampah: r.no_lesen_buang_sampah,
      noSSM: r.no_ssm,
      bilLori: Number(r.bil_lori) || 0,
      noPlatLori: Array.isArray(r.no_plat_lori) ? r.no_plat_lori : [],
      namaPegawai: r.nama_pegawai,
      noTelefonPegawai: r.no_telefon_pegawai,
      bilKilang: Number(r.bil_kilang) || 0,
      createdAt: r.created_at || ""
    };
  }

  function industriToDb(i) {
    return {
      id: i.id,
      nama_industri: i.namaIndustri,
      alamat: i.alamat,
      seksyen: i.seksyen,
      tarikh_pelaporan: i.tarikhPelaporan,
      jenis_perniagaan: i.jenisPerniagaan,
      kontraktor_id: i.kontraktorId
    };
  }

  function industriFromDb(r) {
    return {
      id: r.id,
      namaIndustri: r.nama_industri,
      alamat: r.alamat,
      seksyen: r.seksyen,
      tarikhPelaporan: r.tarikh_pelaporan,
      jenisPerniagaan: r.jenis_perniagaan,
      kontraktorId: r.kontraktor_id,
      createdAt: r.created_at || ""
    };
  }

  function sisaToDb(s) {
    return {
      id: s.id,
      kontraktor_id: s.kontraktorId,
      industri_id: s.industriId,
      seksyen: s.seksyen,
      tarikh_laporan: s.tarikhLaporan,
      jenis_sisa: s.jenisSisa,
      jenis_sisa_lain: s.jenisSisaLain || "",
      kuantiti_tan: s.kuantitiTan,
      kekerapan_kutipan: s.kekerapanKutipan,
      nama_tapak_pelupusan: s.namaTapakPelupusan,
      alamat_tapak_pelupusan: s.alamatTapakPelupusan,
      resit_list: s.resitList || [],
      catatan: s.catatan || ""
    };
  }

  function sisaFromDb(r) {
    return {
      id: r.id,
      kontraktorId: r.kontraktor_id,
      industriId: r.industri_id,
      seksyen: r.seksyen,
      tarikhLaporan: r.tarikh_laporan,
      jenisSisa: r.jenis_sisa,
      jenisSisaLain: r.jenis_sisa_lain || "",
      kuantitiTan: Number(r.kuantiti_tan) || 0,
      kekerapanKutipan: r.kekerapan_kutipan,
      namaTapakPelupusan: r.nama_tapak_pelupusan,
      alamatTapakPelupusan: r.alamat_tapak_pelupusan,
      resitList: Array.isArray(r.resit_list) ? r.resit_list : [],
      catatan: r.catatan || "",
      createdAt: r.created_at || ""
    };
  }

  async function initSupabase() {
    const cfg = window.ISISA_SUPABASE_CONFIG || {};
    const url = (cfg.url || "").trim();
    const anonKey = (cfg.anonKey || "").trim();
    if (cfg.tables) dbTables = { ...dbTables, ...cfg.tables };

    if (!url || !anonKey || !window.supabase) {
      isDbConnected = false;
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(url, anonKey);
      const [kRes, iRes, sRes] = await Promise.all([
        supabaseClient.from(dbTables.kontraktor).select("*").order("created_at", { ascending: false }),
        supabaseClient.from(dbTables.industri).select("*").order("created_at", { ascending: false }),
        supabaseClient.from(dbTables.rekodSisa).select("*").order("created_at", { ascending: false })
      ]);

      if (kRes.error || iRes.error || sRes.error) {
        throw kRes.error || iRes.error || sRes.error;
      }

      kontraktorList = (kRes.data || []).map(kontraktorFromDb);
      industriList = (iRes.data || []).map(industriFromDb);
      rekodSisaList = (sRes.data || []).map(sisaFromDb);
      isDbConnected = true;

      populateActiveContractorPicker();
      populateFormKontraktorPicker();
      refreshAllViews();
    } catch (err) {
      isDbConnected = false;
      console.warn("Mod tempatan digunakan:", err?.message || err);
    }
  }

  // ==================== DASHBOARD (INTERAKTIF) ====================
  function renderDashboard() {
    const visK = getVisibleKontraktor();
    const visI = getVisibleIndustri();
    const visS = getVisibleRekodSisa();
    const totalTan = visS.reduce((sum, r) => sum + (Number(r.kuantitiTan) || 0), 0);

    dashKontraktorCount.textContent = visK.length;
    dashIndustriCount.textContent = visI.length;
    dashSisaTotal.innerHTML = `${formatNum(totalTan)} <small>tan</small>`;

    dashPanels.forEach((p) => {
      const isActive = p.dataset.dashTab === activeDashTab;
      p.classList.toggle("active", isActive);
      p.setAttribute("aria-selected", String(isActive));
    });

    const sortMode = dashSortSelect.value;
    dashListTbody.innerHTML = "";

    if (activeDashTab === "kontraktor") {
      dashListTitle.textContent = "Senarai Panel Kontraktor Sisa Industri (PAKSI)";
      dashListSub.textContent = "Klik 'Lihat' untuk butiran penuh lesen, nombor plat lori, dan sijil lantikan PAKSI.";
      dashListThead.innerHTML = `
        <tr>
          <th>Nama Kontraktor &amp; SSM</th>
          <th>Seksyen &amp; Alamat</th>
          <th>Tarikh Lantikan PAKSI</th>
          <th>Bil. Lori &amp; Plat</th>
          <th>Pegawai Pelapor</th>
          <th class="num">Bil. Kilang</th>
          <th>Tindakan</th>
        </tr>
      `;
      const sorted = sortByOption(visK, sortMode, "tarikhLantikan");
      dashListEmpty.classList.toggle("hidden", sorted.length > 0);
      sorted.forEach((k) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <div class="cell-primary">${escapeHtml(k.namaKontraktor)}</div>
            <div class="cell-sub">SSM: ${escapeHtml(k.noSSM)}</div>
          </td>
          <td>
            <span class="pill pill-blue">${escapeHtml(k.seksyen)}</span>
            <div class="cell-sub">${escapeHtml(k.alamat)}</div>
          </td>
          <td>${escapeHtml(k.tarikhLantikan)}</td>
          <td>
            <div class="cell-primary">${k.bilLori} lori</div>
            <div class="cell-sub">${escapeHtml((k.noPlatLori || []).join(", "))}</div>
          </td>
          <td>
            <div class="cell-primary">${escapeHtml(k.namaPegawai)}</div>
            <div class="cell-sub">${escapeHtml(k.noTelefonPegawai)}</div>
          </td>
          <td class="num"><strong>${k.bilKilang}</strong></td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-icon" data-dash-view="kontraktor" data-id="${escapeHtml(k.id)}">Lihat</button>
              <button type="button" class="btn-icon primary" data-dash-use-k="${escapeHtml(k.id)}">Isi Laporan</button>
            </div>
          </td>
        `;
        dashListTbody.appendChild(tr);
      });
    } else if (activeDashTab === "industri") {
      dashListTitle.textContent = "Senarai Industri di bawah Perkhidmatan PAKSI";
      dashListSub.textContent = "Premis industri yang berdaftar di bawah Panel Kontraktor Sisa Industri.";
      dashListThead.innerHTML = `
        <tr>
          <th>Nama Industri</th>
          <th>Seksyen &amp; Alamat</th>
          <th>Jenis Perniagaan / Aktiviti</th>
          <th>Panel Kontraktor PAKSI</th>
          <th>Tarikh Pelaporan</th>
          <th>Tindakan</th>
        </tr>
      `;
      const sorted = sortByOption(visI, sortMode, "tarikhPelaporan");
      dashListEmpty.classList.toggle("hidden", sorted.length > 0);
      sorted.forEach((ind) => {
        const k = getKontraktorById(ind.kontraktorId);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><div class="cell-primary">${escapeHtml(ind.namaIndustri)}</div></td>
          <td>
            <span class="pill pill-blue">${escapeHtml(ind.seksyen)}</span>
            <div class="cell-sub">${escapeHtml(ind.alamat)}</div>
          </td>
          <td>${escapeHtml(ind.jenisPerniagaan)}</td>
          <td><div class="cell-primary">${escapeHtml(k ? k.namaKontraktor : "-")}</div></td>
          <td>${escapeHtml(ind.tarikhPelaporan)}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-icon primary" data-dash-use-i="${escapeHtml(ind.id)}">Isi Laporan</button>
            </div>
          </td>
        `;
        dashListTbody.appendChild(tr);
      });
    } else {
      dashListTitle.textContent = "Senarai Rekod Sisa Industri";
      dashListSub.textContent = "Ringkasan kutipan sisa industri dalam Tan Metrik beserta resit pelupusan.";
      dashListThead.innerHTML = `
        <tr>
          <th>ID &amp; Tarikh</th>
          <th>Seksyen</th>
          <th>Industri &amp; Kontraktor</th>
          <th>Jenis Sisa &amp; Kutipan</th>
          <th class="num">Kuantiti (Tan)</th>
          <th>Tapak Pelupusan</th>
          <th>Tindakan</th>
        </tr>
      `;
      const sorted = sortByOption(visS, sortMode, "tarikhLaporan");
      dashListEmpty.classList.toggle("hidden", sorted.length > 0);
      sorted.forEach((rec) => {
        const k = getKontraktorById(rec.kontraktorId);
        const ind = getIndustriById(rec.industriId);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <div class="cell-primary">${escapeHtml(rec.id)}</div>
            <div class="cell-sub">${escapeHtml(rec.tarikhLaporan)}</div>
          </td>
          <td><span class="pill pill-blue">${escapeHtml(rec.seksyen)}</span></td>
          <td>
            <div class="cell-primary">${escapeHtml(ind ? ind.namaIndustri : "-")}</div>
            <div class="cell-sub">${escapeHtml(k ? k.namaKontraktor : "-")}</div>
          </td>
          <td>
            <div class="cell-primary">${escapeHtml(getJenisSisaLabel(rec))}</div>
            <div class="cell-sub">${escapeHtml(rec.kekerapanKutipan)}</div>
          </td>
          <td class="num"><strong>${formatNum(rec.kuantitiTan)}</strong></td>
          <td>${escapeHtml(rec.namaTapakPelupusan)}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn-icon" data-dash-view="sisa" data-id="${escapeHtml(rec.id)}">Lihat</button>
              <button type="button" class="btn-icon primary" data-dash-receipt="${escapeHtml(rec.id)}">Resit PDF</button>
            </div>
          </td>
        `;
        dashListTbody.appendChild(tr);
      });
    }
  }

  // ==================== DYNAMIC SLOTS: NO. PLAT LORI ====================
  function renderPlateSlots(plates = [""]) {
    const list = plates.length ? plates : [""];
    plateSlotsContainer.innerHTML = "";
    list.forEach((val, idx) => {
      const div = document.createElement("div");
      div.className = "plate-slot";
      div.innerHTML = `
        <input type="text" class="plate-input" placeholder="cth: WXY ${1234 + idx}" value="${escapeHtml(val)}" required />
        ${list.length > 1 ? `<button type="button" class="btn-remove-slot" data-remove-plate="${idx}" aria-label="Buang slot">&times;</button>` : ""}
      `;
      plateSlotsContainer.appendChild(div);
    });
  }

  function readPlateSlots() {
    return Array.from(plateSlotsContainer.querySelectorAll(".plate-input"))
      .map((inp) => inp.value.trim().toUpperCase())
      .filter(Boolean);
  }

  // ==================== DYNAMIC SLOTS: RESIT PELUPUSAN ====================
  function renderReceiptSlots() {
    if (!receiptDrafts.length) {
      receiptDrafts = [{ noResit: "", tarikh: todayISO(), fileName: "", fileData: "" }];
    }
    receiptSlotsContainer.innerHTML = "";
    receiptDrafts.forEach((r, idx) => {
      const row = document.createElement("div");
      row.className = "receipt-slot";
      row.innerHTML = `
        <div class="field">
          <label>No. Resit ${idx + 1} <span class="req">*</span></label>
          <input type="text" data-r-field="noResit" data-r-idx="${idx}" value="${escapeHtml(r.noResit)}" placeholder="cth: RST-2026-0091" required />
        </div>
        <div class="field">
          <label>Tarikh Resit <span class="req">*</span></label>
          <input type="date" data-r-field="tarikh" data-r-idx="${idx}" value="${escapeHtml(r.tarikh || todayISO())}" required />
        </div>
        <div class="field">
          <label>Lampiran Resit (Pilihan)</label>
          <input type="file" data-r-file="${idx}" accept=".pdf,image/*" />
          <small class="field-hint">${r.fileName ? `Fail: ${escapeHtml(r.fileName)}` : "Tiada fail dipilih"}</small>
        </div>
        <div>
          ${receiptDrafts.length > 1 ? `<button type="button" class="btn-remove-slot" data-remove-receipt="${idx}">Buang</button>` : ""}
        </div>
      `;
      receiptSlotsContainer.appendChild(row);
    });
  }

  // ==================== UNIFIED FORM LOGIC ====================
  function findDuplicateIndustri() {
    if (fIndustriPick.value !== "__NEW__") return null;
    const typedName = iNamaInput.value.trim().toLowerCase();
    if (!typedName) return null;

    const kId = fKontraktorPick.value;
    if (!kId || kId === "__NEW__") return null;

    return (
      industriList.find(
        (ind) =>
          ind.kontraktorId === kId &&
          String(ind.namaIndustri || "").trim().toLowerCase() === typedName
      ) || null
    );
  }

  function updateIndustriDuplicateWarning() {
    detectedDuplicateIndustri = findDuplicateIndustri();
    if (detectedDuplicateIndustri) {
      industriDupMsg.innerHTML = `<strong>Amaran:</strong> Kilang <strong>${escapeHtml(detectedDuplicateIndustri.namaIndustri)}</strong> (${escapeHtml(detectedDuplicateIndustri.seksyen)}) sudah direkodkan di bawah kontraktor ini. Sila pilih daripada senarai sedia ada untuk mengelakkan rekod duplikat.`;
      industriDupWarning.classList.remove("hidden");
    } else {
      industriDupWarning.classList.add("hidden");
    }
  }

  function updateJenisSisaLainUI() {
    const isOther = sJenisSisaSelect.value === "Lain-lain";
    sJenisSisaLainWrap.classList.toggle("hidden", !isOther);
    sJenisSisaLainInput.required = isOther;
    if (!isOther) sJenisSisaLainInput.value = "";
  }

  function resetUnifiedForm() {
    unifiedForm.reset();
    editingSisaId = null;
    editSisaBanner.classList.add("hidden");
    submitFormBtn.textContent = "Hantar & Simpan Pelaporan";
    formErrorBox.classList.add("hidden");

    populateFormKontraktorPicker();
    if (currentRole === "kontraktor" && activeContractorId) {
      fKontraktorPick.value = activeContractorId;
      fillKontraktorFields(getKontraktorById(activeContractorId));
    } else {
      fKontraktorPick.value = "__NEW__";
      fillKontraktorFields(null);
    }

    populateFormIndustriPicker();
    fIndustriPick.value = "__NEW__";
    fillIndustriFields(null);
    updateIndustriDuplicateWarning();

    updateJenisSisaLainUI();
    receiptDrafts = [{ noResit: "", tarikh: todayISO(), fileName: "", fileData: "" }];
    renderReceiptSlots();
  }

  async function handleUnifiedSubmit(e) {
    e.preventDefault();
    formErrorBox.classList.add("hidden");

    const dupIndustri = findDuplicateIndustri();
    if (dupIndustri) {
      updateIndustriDuplicateWarning();
      formErrorBox.textContent = `Amaran: Kilang "${dupIndustri.namaIndustri}" sudah direkodkan di bawah kontraktor ini. Sila pilih kilang tersebut daripada senarai sedia ada di Bahagian 2 (atau klik "Guna Rekod Sedia Ada") supaya tidak berlaku rekod duplikat.`;
      formErrorBox.classList.remove("hidden");
      industriDupWarning.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!unifiedForm.checkValidity()) {
      unifiedForm.reportValidity();
      formErrorBox.textContent = "Sila lengkapkan semua medan wajib bertanda (*) pada Bahagian 1, 2 dan 3.";
      formErrorBox.classList.remove("hidden");
      formErrorBox.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const plates = readPlateSlots();
    if (!plates.length) {
      formErrorBox.textContent = "Sila masukkan sekurang-kurangnya satu No. Plat Lori di Bahagian 1.";
      formErrorBox.classList.remove("hidden");
      return;
    }

    const validReceipts = receiptDrafts.filter((r) => r.noResit.trim() !== "" && r.tarikh !== "");
    if (!validReceipts.length) {
      formErrorBox.textContent = "Sila masukkan sekurang-kurangnya satu No. Resit dan Tarikh Resit di Bahagian 3.";
      formErrorBox.classList.remove("hidden");
      return;
    }

    // 1. Bina objek Kontraktor (Bahagian 1)
    const isNewK = fKontraktorPick.value === "__NEW__";
    const kontraktorId = isNewK ? generateId("PKSI", kontraktorList) : fKontraktorPick.value;
    const kontraktorObj = {
      id: kontraktorId,
      namaKontraktor: document.getElementById("kNama").value.trim(),
      seksyen: document.getElementById("kSeksyen").value,
      alamat: document.getElementById("kAlamat").value.trim(),
      tarikhLantikan: document.getElementById("kTarikhLantikan").value,
      sijilNama: currentSijilFile.name,
      sijilData: currentSijilFile.data,
      noPendaftaranFail: document.getElementById("kNoFail").value.trim(),
      noLesenIndustri: document.getElementById("kNoLesenIndustri").value.trim(),
      noLesenBuangSampah: document.getElementById("kNoLesenSampah").value.trim(),
      noSSM: document.getElementById("kNoSSM").value.trim(),
      bilLori: parseInt(document.getElementById("kBilLori").value, 10) || plates.length,
      noPlatLori: plates,
      namaPegawai: document.getElementById("kPegawai").value.trim(),
      noTelefonPegawai: document.getElementById("kTelefon").value.trim(),
      bilKilang: parseInt(document.getElementById("kBilKilang").value, 10) || 0,
      createdAt: new Date().toISOString()
    };

    // 2. Bina objek Industri (Bahagian 2)
    const isNewI = fIndustriPick.value === "__NEW__";
    const industriId = isNewI ? generateId("IND", industriList) : fIndustriPick.value;
    const tarikhPelaporan = document.getElementById("iTarikhPelaporan").value;
    const seksyenIndustri = document.getElementById("iSeksyen").value;
    const industriObj = {
      id: industriId,
      namaIndustri: document.getElementById("iNama").value.trim(),
      seksyen: seksyenIndustri,
      alamat: document.getElementById("iAlamat").value.trim(),
      tarikhPelaporan,
      jenisPerniagaan: document.getElementById("iJenisPerniagaan").value,
      kontraktorId,
      createdAt: new Date().toISOString()
    };

    // 3. Bina objek Rekod Sisa Industri (Bahagian 3)
    const sisaObj = {
      id: editingSisaId || generateId("SISA", rekodSisaList),
      kontraktorId,
      industriId,
      seksyen: seksyenIndustri,
      tarikhLaporan: tarikhPelaporan,
      jenisSisa: sJenisSisaSelect.value,
      jenisSisaLain: sJenisSisaSelect.value === "Lain-lain" ? sJenisSisaLainInput.value.trim() : "",
      kuantitiTan: parseFloat(document.getElementById("sKuantitiTan").value) || 0,
      kekerapanKutipan: document.getElementById("sKekerapanKutipan").value,
      namaTapakPelupusan: document.getElementById("sNamaTapak").value.trim(),
      alamatTapakPelupusan: document.getElementById("sAlamatTapak").value.trim(),
      resitList: validReceipts.map((r) => ({
        noResit: r.noResit.trim(),
        tarikh: r.tarikh,
        fileName: r.fileName || "",
        fileData: r.fileData || ""
      })),
      catatan: document.getElementById("sCatatan").value.trim(),
      createdAt: new Date().toISOString()
    };

    submitFormBtn.disabled = true;
    submitFormBtn.textContent = "Menyimpan...";

    try {
      if (isDbConnected && supabaseClient) {
        const { error: kErr } = await supabaseClient
          .from(dbTables.kontraktor)
          .upsert([kontraktorToDb(kontraktorObj)], { onConflict: "id" });
        if (kErr) throw kErr;

        const { error: iErr } = await supabaseClient
          .from(dbTables.industri)
          .upsert([industriToDb(industriObj)], { onConflict: "id" });
        if (iErr) throw iErr;

        const { error: sErr } = await supabaseClient
          .from(dbTables.rekodSisa)
          .upsert([sisaToDb(sisaObj)], { onConflict: "id" });
        if (sErr) throw sErr;
      }

      // Kemas kini senarai tempatan
      const kIdx = kontraktorList.findIndex((k) => k.id === kontraktorId);
      if (kIdx !== -1) kontraktorList[kIdx] = kontraktorObj;
      else kontraktorList.unshift(kontraktorObj);

      const iIdx = industriList.findIndex((i) => i.id === industriId);
      if (iIdx !== -1) industriList[iIdx] = industriObj;
      else industriList.unshift(industriObj);

      const sIdx = rekodSisaList.findIndex((s) => s.id === sisaObj.id);
      if (sIdx !== -1) rekodSisaList[sIdx] = sisaObj;
      else rekodSisaList.unshift(sisaObj);

      if (currentRole === "kontraktor" && !activeContractorId) {
        activeContractorId = kontraktorId;
      }

      if (!isDbConnected) {
        saveLocal(LS_KEYS.kontraktor, kontraktorList);
        saveLocal(LS_KEYS.industri, industriList);
        saveLocal(LS_KEYS.rekodSisa, rekodSisaList);
      }

      showToast(
        editingSisaId
          ? `Rekod ${sisaObj.id} berjaya dikemas kini.`
          : `Pelaporan lengkap ${sisaObj.id} berjaya disimpan.`
      );

      populateActiveContractorPicker();
      resetUnifiedForm();
      refreshAllViews();
      switchView("records-view");
    } catch (err) {
      formErrorBox.textContent = `Gagal menyimpan pelaporan: ${err.message || err}`;
      formErrorBox.classList.remove("hidden");
      submitFormBtn.textContent = editingSisaId ? "Kemas Kini Pelaporan" : "Hantar & Simpan Pelaporan";
    } finally {
      submitFormBtn.disabled = false;
    }
  }

  function loadRecordIntoUnifiedForm(sisaId) {
    const rec = rekodSisaList.find((r) => r.id === sisaId);
    if (!rec) return;

    editingSisaId = rec.id;
    editSisaIdEl.textContent = rec.id;
    editSisaBanner.classList.remove("hidden");
    submitFormBtn.textContent = "Kemas Kini Pelaporan";

    populateFormKontraktorPicker();
    fKontraktorPick.value = rec.kontraktorId;
    fillKontraktorFields(getKontraktorById(rec.kontraktorId));

    populateFormIndustriPicker();
    fIndustriPick.value = rec.industriId;
    fillIndustriFields(getIndustriById(rec.industriId));

    sJenisSisaSelect.value = rec.jenisSisa;
    updateJenisSisaLainUI();
    sJenisSisaLainInput.value = rec.jenisSisaLain || "";
    document.getElementById("sKuantitiTan").value = rec.kuantitiTan;
    document.getElementById("sKekerapanKutipan").value = rec.kekerapanKutipan;
    document.getElementById("sNamaTapak").value = rec.namaTapakPelupusan;
    document.getElementById("sAlamatTapak").value = rec.alamatTapakPelupusan;
    document.getElementById("sCatatan").value = rec.catatan || "";

    receiptDrafts = (rec.resitList || []).length
      ? rec.resitList.map((r) => ({ ...r }))
      : [{ noResit: "", tarikh: todayISO(), fileName: "", fileData: "" }];
    renderReceiptSlots();

    formErrorBox.classList.add("hidden");
    switchView("borang-view");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ==================== REKOD LAPORAN TABLE ====================
  function getFilteredSortedRecords() {
    const q = searchInput.value.trim().toLowerCase();
    const sec = filterSeksyen.value;
    const base = getVisibleRekodSisa().filter((rec) => {
      if (sec !== "ALL" && rec.seksyen !== sec) return false;
      if (q) {
        const k = getKontraktorById(rec.kontraktorId);
        const ind = getIndustriById(rec.industriId);
        const receiptNums = (rec.resitList || []).map((r) => r.noResit).join(" ");
        const hay = [
          rec.id,
          rec.seksyen,
          getJenisSisaLabel(rec),
          rec.namaTapakPelupusan,
          k ? k.namaKontraktor : "",
          ind ? ind.namaIndustri : "",
          receiptNums
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return sortByOption(base, sortRecordsSelect.value, "tarikhLaporan", "kuantitiTan");
  }

  function updateMultiReceiptBtn() {
    selectedReceiptCountEl.textContent = selectedRecordIds.size;
    downloadMultiReceiptsBtn.disabled = selectedRecordIds.size === 0;
  }

  function renderRecordsTable() {
    const list = getFilteredSortedRecords();
    const isMbsa = currentRole === "mbsa";
    recordsTbody.innerHTML = "";
    emptyRecordsEl.classList.toggle("hidden", list.length > 0);

    list.forEach((rec) => {
      const k = getKontraktorById(rec.kontraktorId);
      const ind = getIndustriById(rec.industriId);
      const resitCount = (rec.resitList || []).length;
      const firstNo = resitCount ? rec.resitList[0].noResit : "-";
      const checked = selectedRecordIds.has(rec.id) ? "checked" : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-check ${isMbsa ? "" : "hidden"}">
          <input type="checkbox" class="rec-checkbox" data-rec-id="${escapeHtml(rec.id)}" ${checked} aria-label="Pilih rekod ${escapeHtml(rec.id)}" />
        </td>
        <td>
          <div class="cell-primary">${escapeHtml(rec.id)}</div>
          <div class="cell-sub">${escapeHtml(rec.tarikhLaporan)}</div>
        </td>
        <td><span class="pill pill-blue">${escapeHtml(rec.seksyen)}</span></td>
        <td>
          <div class="cell-primary">${escapeHtml(ind ? ind.namaIndustri : "-")}</div>
          <div class="cell-sub">${escapeHtml(k ? k.namaKontraktor : "-")}</div>
        </td>
        <td>
          <div class="cell-primary">${escapeHtml(getJenisSisaLabel(rec))}</div>
          <div class="cell-sub">Kutipan: ${escapeHtml(rec.kekerapanKutipan)}</div>
        </td>
        <td class="num"><strong>${formatNum(rec.kuantitiTan)}</strong></td>
        <td>
          <div class="cell-primary">${escapeHtml(rec.namaTapakPelupusan)}</div>
          <div class="cell-sub">${escapeHtml(rec.alamatTapakPelupusan)}</div>
        </td>
        <td>
          <span class="pill pill-green">${resitCount} resit</span>
          <div class="cell-sub">${escapeHtml(firstNo)}${resitCount > 1 ? ` +${resitCount - 1}` : ""}</div>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-icon" data-r-action="view" data-id="${escapeHtml(rec.id)}">Lihat</button>
            <button type="button" class="btn-icon primary" data-r-action="receipt" data-id="${escapeHtml(rec.id)}">Resit PDF</button>
            <button type="button" class="btn-icon" data-r-action="edit" data-id="${escapeHtml(rec.id)}">Sunting</button>
            <button type="button" class="btn-icon danger" data-r-action="delete" data-id="${escapeHtml(rec.id)}">Padam</button>
          </div>
        </td>
      `;
      recordsTbody.appendChild(tr);
    });

    if (isMbsa) {
      selectAllCheckbox.checked = list.length > 0 && list.every((r) => selectedRecordIds.has(r.id));
    }
  }

  // ==================== OFFICIAL PDF GENERATION ====================
  function generateOfficialReceiptsPDF(recordArray) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast("Pustaka PDF sedang dimuatkan. Sila cuba sebentar lagi.");
      return;
    }
    if (!recordArray.length) {
      showToast("Tiada rekod dipilih untuk menjana resit.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    let isFirstPage = true;

    recordArray.forEach((rec) => {
      const k = getKontraktorById(rec.kontraktorId);
      const ind = getIndustriById(rec.industriId);
      const receipts = rec.resitList && rec.resitList.length
        ? rec.resitList
        : [{ noResit: rec.id, tarikh: rec.tarikhLaporan, fileName: "" }];

      receipts.forEach((resit, idx) => {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        doc.setFillColor(11, 42, 85);
        doc.rect(0, 0, 210, 34, "F");
        doc.setFillColor(76, 175, 58);
        doc.rect(0, 34, 210, 3, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("MAJLIS BANDARAYA SHAH ALAM (MBSA)", 16, 14);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Jabatan Kebersihan Awam & Kelestarian Sisa (JKAKS) · Sistem iSi.SA (PAKSI)", 16, 21);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("RESIT RASMI PELAPORAN SISA INDUSTRI", 16, 29);

        doc.setTextColor(11, 18, 32);
        doc.setFillColor(244, 247, 245);
        doc.roundedRect(16, 44, 178, 22, 3, 3, "F");
        doc.setDrawColor(225, 230, 234);
        doc.roundedRect(16, 44, 178, 22, 3, 3, "S");

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("NO. RESIT:", 22, 52);
        doc.text("TARIKH RESIT:", 95, 52);
        doc.text("ID LAPORAN:", 150, 52);

        doc.setFontSize(11);
        doc.setTextColor(30, 122, 52);
        doc.text(String(resit.noResit || "-"), 22, 60);
        doc.setTextColor(11, 18, 32);
        doc.text(String(resit.tarikh || rec.tarikhLaporan), 95, 60);
        doc.text(String(rec.id), 150, 60);

        const rows = [
          ["Panel Kontraktor PAKSI", k ? `${k.namaKontraktor} (SSM: ${k.noSSM})` : "-"],
          ["No. Lesen Industri / Sampah", k ? `${k.noLesenIndustri} / ${k.noLesenBuangSampah}` : "-"],
          ["Pegawai Pelapor Kontraktor", k ? `${k.namaPegawai} (${k.noTelefonPegawai})` : "-"],
          ["Nama Industri", ind ? ind.namaIndustri : "-"],
          ["Seksyen & Alamat Industri", `${rec.seksyen} — ${ind ? ind.alamat : "-"}`],
          ["Jenis Perniagaan / Aktiviti", ind ? ind.jenisPerniagaan : "-"],
          ["Jenis Sisa Industri", getJenisSisaLabel(rec)],
          ["Jumlah Kuantiti Sisa", `${formatNum(rec.kuantitiTan)} Tan Metrik`],
          ["Kekerapan Kutipan", rec.kekerapanKutipan],
          ["Nama Tapak Pelupusan", rec.namaTapakPelupusan],
          ["Alamat Tapak Pelupusan", rec.alamatTapakPelupusan],
          ["Lampiran Asal Direkod", resit.fileName ? resit.fileName : "Dijana secara digital melalui iSi.SA"],
          ["Catatan", rec.catatan || "-"]
        ];

        doc.autoTable({
          startY: 74,
          margin: { left: 16, right: 16 },
          head: [["PERKARA", "MAKLUMAT PELAPORAN"]],
          body: rows,
          theme: "grid",
          headStyles: { fillColor: [11, 42, 85], textColor: [255, 255, 255], fontStyle: "bold" },
          columnStyles: {
            0: { cellWidth: 62, fontStyle: "bold", fillColor: [247, 249, 248] },
            1: { cellWidth: 116 }
          },
          styles: { fontSize: 9.5, cellPadding: 3.5, textColor: [11, 18, 32] }
        });

        const finalY = doc.lastAutoTable.finalY + 14;
        doc.setFontSize(8.5);
        doc.setTextColor(86, 96, 112);
        doc.text(
          `Resit ${idx + 1} daripada ${receipts.length} bagi rekod ${rec.id}. Dokumen ini dijana secara automatik oleh Sistem iSi.SA (MBSA · JKAKS).`,
          16,
          Math.min(finalY, 272)
        );
        doc.text(`Tarikh Cetakan: ${new Date().toLocaleString("ms-MY")}`, 16, Math.min(finalY + 6, 278));
      });
    });

    const filename =
      recordArray.length === 1
        ? `Resit_PAKSI_${recordArray[0].id}.pdf`
        : `Resit_PAKSI_Terpilih_${recordArray.length}_Rekod_${todayISO()}.pdf`;
    doc.save(filename);
    showToast(`Resit PDF (${filename}) berjaya dijana dan dimuat turun.`);
  }

  function exportRecordsPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      showToast("Pustaka PDF sedang dimuatkan. Sila cuba sebentar lagi.");
      return;
    }
    const list = getFilteredSortedRecords();
    if (!list.length) {
      showToast("Tiada rekod untuk dieksport ke PDF.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const totalTan = list.reduce((sum, r) => sum + (Number(r.kuantitiTan) || 0), 0);

    doc.setFillColor(11, 42, 85);
    doc.rect(0, 0, 297, 26, "F");
    doc.setFillColor(76, 175, 58);
    doc.rect(0, 26, 297, 2.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN REKOD SISA INDUSTRI (PAKSI) — iSi.SA MBSA", 14, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(
      `Jumlah Rekod: ${list.length}  |  Jumlah Sisa: ${formatNum(totalTan)} Tan Metrik  |  Tarikh Eksport: ${new Date().toLocaleDateString("ms-MY")}`,
      14,
      20
    );

    const body = list.map((rec, i) => {
      const k = getKontraktorById(rec.kontraktorId);
      const ind = getIndustriById(rec.industriId);
      const resitNums = (rec.resitList || []).map((r) => r.noResit).join(", ");
      return [
        i + 1,
        rec.id,
        rec.tarikhLaporan,
        rec.seksyen,
        ind ? ind.namaIndustri : "-",
        k ? k.namaKontraktor : "-",
        getJenisSisaLabel(rec),
        rec.kekerapanKutipan,
        formatNum(rec.kuantitiTan),
        rec.namaTapakPelupusan,
        resitNums || "-"
      ];
    });

    doc.autoTable({
      startY: 34,
      margin: { left: 10, right: 10 },
      head: [
        [
          "Bil",
          "ID",
          "Tarikh",
          "Seksyen",
          "Nama Industri",
          "Kontraktor PAKSI",
          "Jenis Sisa",
          "Kutipan",
          "Tan",
          "Tapak Pelupusan",
          "No. Resit"
        ]
      ],
      body,
      theme: "striped",
      headStyles: { fillColor: [11, 42, 85], textColor: [255, 255, 255], fontSize: 8.5 },
      styles: { fontSize: 8, cellPadding: 2.5 }
    });

    doc.save(`iSiSA_Laporan_Sisa_Industri_${todayISO()}.pdf`);
    showToast("Laporan PDF berjaya dimuat turun.");
  }

  function exportRecordsCSV() {
    const list = getFilteredSortedRecords();
    if (!list.length) {
      showToast("Tiada rekod untuk dieksport ke CSV.");
      return;
    }

    const headers = [
      "ID",
      "Tarikh Laporan",
      "Seksyen",
      "Nama Industri",
      "Panel Kontraktor PAKSI",
      "Jenis Sisa",
      "Kekerapan Kutipan",
      "Kuantiti (Tan Metrik)",
      "Nama Tapak Pelupusan",
      "Alamat Tapak Pelupusan",
      "No. Resit"
    ];

    const rows = list.map((rec) => {
      const k = getKontraktorById(rec.kontraktorId);
      const ind = getIndustriById(rec.industriId);
      return [
        rec.id,
        rec.tarikhLaporan,
        rec.seksyen,
        ind ? ind.namaIndustri : "",
        k ? k.namaKontraktor : "",
        getJenisSisaLabel(rec),
        rec.kekerapanKutipan,
        rec.kuantitiTan,
        rec.namaTapakPelupusan,
        rec.alamatTapakPelupusan,
        (rec.resitList || []).map((r) => `${r.noResit} (${r.tarikh})`).join("; ")
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iSiSA_Rekod_Sisa_Industri_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Fail CSV berjaya dimuat turun.");
  }

  // ==================== DETAIL MODALS ====================
  function openKontraktorModal(id) {
    const k = getKontraktorById(id);
    if (!k) return;
    modalActiveRecordId = null;
    modalReceiptPdfBtn.classList.add("hidden");
    modalTitle.textContent = `Profil Kontraktor PAKSI — ${k.namaKontraktor}`;
    modalBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><span>ID Kontraktor</span><strong>${escapeHtml(k.id)}</strong></div>
        <div class="detail-item"><span>No. SSM</span><strong>${escapeHtml(k.noSSM)}</strong></div>
        <div class="detail-item detail-full"><span>Alamat &amp; Seksyen</span><strong>${escapeHtml(k.seksyen)} — ${escapeHtml(k.alamat)}</strong></div>
        <div class="detail-item"><span>Tarikh Lantikan PAKSI</span><strong>${escapeHtml(k.tarikhLantikan)}</strong></div>
        <div class="detail-item"><span>No. Pendaftaran Fail</span><strong>${escapeHtml(k.noPendaftaranFail)}</strong></div>
        <div class="detail-item"><span>No. Lesen Industri</span><strong>${escapeHtml(k.noLesenIndustri)}</strong></div>
        <div class="detail-item"><span>No. Lesen Buang Sampah</span><strong>${escapeHtml(k.noLesenBuangSampah)}</strong></div>
        <div class="detail-item"><span>Bil. Lori</span><strong>${k.bilLori} unit</strong></div>
        <div class="detail-item"><span>Bil. Kilang di bawah Perkhidmatan</span><strong>${k.bilKilang} kilang</strong></div>
        <div class="detail-item detail-full"><span>No. Plat Lori</span><strong>${escapeHtml((k.noPlatLori || []).join(", "))}</strong></div>
        <div class="detail-item"><span>Pegawai Pelapor</span><strong>${escapeHtml(k.namaPegawai)}</strong></div>
        <div class="detail-item"><span>No. Telefon Pegawai</span><strong>${escapeHtml(k.noTelefonPegawai)}</strong></div>
        <div class="detail-item detail-full">
          <span>Sijil Lantikan PAKSI</span>
          <strong>${
            k.sijilData
              ? `<a href="${k.sijilData}" download="${escapeHtml(k.sijilNama || "sijil-paksi")}">Muat Turun: ${escapeHtml(k.sijilNama)}</a>`
              : "Tiada sijil dilampirkan"
          }</strong>
        </div>
      </div>
    `;
    detailModal.classList.remove("hidden");
  }

  function openSisaModal(id) {
    const rec = rekodSisaList.find((r) => r.id === id);
    if (!rec) return;
    const k = getKontraktorById(rec.kontraktorId);
    const ind = getIndustriById(rec.industriId);
    modalActiveRecordId = rec.id;
    modalReceiptPdfBtn.classList.remove("hidden");
    modalTitle.textContent = `Butiran Laporan Sisa — ${rec.id}`;

    const receiptsHtml = (rec.resitList || [])
      .map(
        (r, i) => `
        <div style="padding:6px 0; border-bottom:1px solid var(--line);">
          <strong>${i + 1}. ${escapeHtml(r.noResit)}</strong> (${escapeHtml(r.tarikh)})
          ${
            r.fileData
              ? ` — <a href="${r.fileData}" download="${escapeHtml(r.fileName || "resit")}">Muat Turun Lampiran (${escapeHtml(r.fileName)})</a>`
              : " — Tiada lampiran asal"
          }
        </div>`
      )
      .join("");

    modalBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><span>Tarikh Pelaporan</span><strong>${escapeHtml(rec.tarikhLaporan)}</strong></div>
        <div class="detail-item"><span>Seksyen</span><strong>${escapeHtml(rec.seksyen)}</strong></div>
        <div class="detail-item detail-full"><span>Nama Industri</span><strong>${escapeHtml(ind ? ind.namaIndustri : "-")}</strong></div>
        <div class="detail-item detail-full"><span>Panel Kontraktor PAKSI</span><strong>${escapeHtml(k ? k.namaKontraktor : "-")}</strong></div>
        <div class="detail-item"><span>Jenis Sisa Industri</span><strong>${escapeHtml(getJenisSisaLabel(rec))}</strong></div>
        <div class="detail-item"><span>Kuantiti &amp; Kekerapan Kutipan</span><strong>${formatNum(rec.kuantitiTan)} Tan Metrik (${escapeHtml(rec.kekerapanKutipan)})</strong></div>
        <div class="detail-item detail-full"><span>Tapak Pelupusan</span><strong>${escapeHtml(rec.namaTapakPelupusan)} — ${escapeHtml(rec.alamatTapakPelupusan)}</strong></div>
        <div class="detail-item detail-full"><span>Senarai Resit (${(rec.resitList || []).length})</span>${receiptsHtml || "<strong>-</strong>"}</div>
        ${rec.catatan ? `<div class="detail-item detail-full"><span>Catatan</span><strong>${escapeHtml(rec.catatan)}</strong></div>` : ""}
      </div>
    `;
    detailModal.classList.remove("hidden");
  }

  // ==================== REFRESH ALL ====================
  function refreshAllViews() {
    navRecordCount.textContent = getVisibleRekodSisa().length;
    renderDashboard();
    renderRecordsTable();
  }

  // ==================== EVENT LISTENERS ====================
  navLinks.forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));

  jumpLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = btn.dataset.jumpSection;
      switchView("borang-view");
      jumpLinks.forEach((el) => el.classList.toggle("active-step", el.dataset.jumpSection === sec));
      document.getElementById(`form-section-${sec}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".form-section[data-section]").forEach((section) => {
    section.addEventListener("focusin", () => {
      const step = section.dataset.section;
      jumpLinks.forEach((el) => el.classList.toggle("active-step", el.dataset.stepIndicator === step));
    });
  });

  menuToggleBtn.addEventListener("click", () => sidenav.classList.toggle("open"));

  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
  });

  roleSelect.addEventListener("change", () => {
    currentRole = roleSelect.value;
    applyRoleUI();
    showToast(
      currentRole === "mbsa"
        ? "Bertukar kepada akaun Staff MBSA (Semua Rekod)."
        : "Bertukar kepada akaun Kontraktor PAKSI (Rekod Sendiri)."
    );
  });

  activeContractorSelect.addEventListener("change", () => {
    activeContractorId = activeContractorSelect.value;
    applyRoleUI();
  });

  // Dashboard Interactive Panels
  dashPanels.forEach((panel) => {
    panel.addEventListener("click", () => {
      activeDashTab = panel.dataset.dashTab;
      renderDashboard();
      document.getElementById("dash-list-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  dashSortSelect.addEventListener("change", renderDashboard);

  dashQuickFormBtn.addEventListener("click", () => {
    resetUnifiedForm();
    switchView("borang-view");
  });

  dashListAddBtn.addEventListener("click", () => {
    resetUnifiedForm();
    switchView("borang-view");
  });

  dashListTbody.addEventListener("click", (e) => {
    const viewBtn = e.target.closest("button[data-dash-view]");
    if (viewBtn) {
      if (viewBtn.dataset.dashView === "kontraktor") openKontraktorModal(viewBtn.dataset.id);
      if (viewBtn.dataset.dashView === "sisa") openSisaModal(viewBtn.dataset.id);
      return;
    }
    const useK = e.target.closest("button[data-dash-use-k]");
    if (useK) {
      resetUnifiedForm();
      fKontraktorPick.value = useK.dataset.dashUseK;
      fillKontraktorFields(getKontraktorById(useK.dataset.dashUseK));
      populateFormIndustriPicker();
      switchView("borang-view");
      document.getElementById("form-section-2")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const useI = e.target.closest("button[data-dash-use-i]");
    if (useI) {
      const ind = getIndustriById(useI.dataset.dashUseI);
      if (!ind) return;
      resetUnifiedForm();
      fKontraktorPick.value = ind.kontraktorId;
      fillKontraktorFields(getKontraktorById(ind.kontraktorId));
      populateFormIndustriPicker();
      fIndustriPick.value = ind.id;
      fillIndustriFields(ind);
      switchView("borang-view");
      document.getElementById("form-section-3")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const receiptBtn = e.target.closest("button[data-dash-receipt]");
    if (receiptBtn) {
      const rec = rekodSisaList.find((r) => r.id === receiptBtn.dataset.dashReceipt);
      if (rec) generateOfficialReceiptsPDF([rec]);
    }
  });

  // Unified Form Prefill Pickers
  fKontraktorPick.addEventListener("change", () => {
    const val = fKontraktorPick.value;
    fillKontraktorFields(val === "__NEW__" ? null : getKontraktorById(val));
    populateFormIndustriPicker();
    fillIndustriFields(null);
    updateIndustriDuplicateWarning();
  });

  fIndustriPick.addEventListener("change", () => {
    const val = fIndustriPick.value;
    fillIndustriFields(val === "__NEW__" ? null : getIndustriById(val));
    updateIndustriDuplicateWarning();
  });

  iNamaInput.addEventListener("input", updateIndustriDuplicateWarning);

  useExistingIndustriBtn.addEventListener("click", () => {
    if (!detectedDuplicateIndustri) return;
    fIndustriPick.value = detectedDuplicateIndustri.id;
    fillIndustriFields(detectedDuplicateIndustri);
    updateIndustriDuplicateWarning();
    formErrorBox.classList.add("hidden");
    showToast(`Rekod sedia ada "${detectedDuplicateIndustri.namaIndustri}" telah dipilih.`);
  });

  kSijilFileInput.addEventListener("change", async () => {
    const file = kSijilFileInput.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast("Saiz fail sijil melebihi had 3MB.");
      kSijilFileInput.value = "";
      return;
    }
    currentSijilFile = { name: file.name, data: await readFileAsDataURL(file) };
    kSijilHint.textContent = `Fail dipilih: ${file.name}`;
  });

  addPlateBtn.addEventListener("click", () => {
    const current = Array.from(plateSlotsContainer.querySelectorAll(".plate-input")).map((i) => i.value);
    current.push("");
    renderPlateSlots(current);
  });

  plateSlotsContainer.addEventListener("click", (e) => {
    const rm = e.target.closest("button[data-remove-plate]");
    if (!rm) return;
    const idx = parseInt(rm.dataset.removePlate, 10);
    const current = Array.from(plateSlotsContainer.querySelectorAll(".plate-input")).map((i) => i.value);
    current.splice(idx, 1);
    renderPlateSlots(current);
  });

  sJenisSisaSelect.addEventListener("change", updateJenisSisaLainUI);

  addReceiptBtn.addEventListener("click", () => {
    receiptDrafts.push({ noResit: "", tarikh: todayISO(), fileName: "", fileData: "" });
    renderReceiptSlots();
  });

  receiptSlotsContainer.addEventListener("input", (e) => {
    const field = e.target.dataset.rField;
    if (!field) return;
    const idx = parseInt(e.target.dataset.rIdx, 10);
    if (receiptDrafts[idx]) receiptDrafts[idx][field] = e.target.value;
  });

  receiptSlotsContainer.addEventListener("change", async (e) => {
    if (e.target.dataset.rFile !== undefined) {
      const idx = parseInt(e.target.dataset.rFile, 10);
      const file = e.target.files?.[0];
      if (!file || !receiptDrafts[idx]) return;
      if (file.size > 3 * 1024 * 1024) {
        showToast("Saiz lampiran resit melebihi had 3MB.");
        e.target.value = "";
        return;
      }
      receiptDrafts[idx].fileName = file.name;
      receiptDrafts[idx].fileData = await readFileAsDataURL(file);
      renderReceiptSlots();
    }
  });

  receiptSlotsContainer.addEventListener("click", (e) => {
    const rm = e.target.closest("button[data-remove-receipt]");
    if (!rm) return;
    const idx = parseInt(rm.dataset.removeReceipt, 10);
    receiptDrafts.splice(idx, 1);
    renderReceiptSlots();
  });

  unifiedForm.addEventListener("submit", handleUnifiedSubmit);
  resetFormBtn.addEventListener("click", resetUnifiedForm);
  cancelEditBtn.addEventListener("click", resetUnifiedForm);

  // Records Table Events
  searchInput.addEventListener("input", renderRecordsTable);
  filterSeksyen.addEventListener("change", renderRecordsTable);
  sortRecordsSelect.addEventListener("change", renderRecordsTable);

  selectAllCheckbox.addEventListener("change", () => {
    const list = getFilteredSortedRecords();
    if (selectAllCheckbox.checked) list.forEach((r) => selectedRecordIds.add(r.id));
    else list.forEach((r) => selectedRecordIds.delete(r.id));
    updateMultiReceiptBtn();
    renderRecordsTable();
  });

  recordsTbody.addEventListener("change", (e) => {
    if (!e.target.classList.contains("rec-checkbox")) return;
    const id = e.target.dataset.recId;
    if (e.target.checked) selectedRecordIds.add(id);
    else selectedRecordIds.delete(id);
    updateMultiReceiptBtn();
  });

  downloadMultiReceiptsBtn.addEventListener("click", () => {
    const selected = getFilteredSortedRecords().filter((r) => selectedRecordIds.has(r.id));
    generateOfficialReceiptsPDF(selected);
  });

  exportPdfBtn.addEventListener("click", exportRecordsPDF);
  exportCsvBtn.addEventListener("click", exportRecordsCSV);
  newReportBtn.addEventListener("click", () => {
    resetUnifiedForm();
    switchView("borang-view");
  });

  recordsTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-r-action]");
    if (!btn) return;
    const { rAction, id } = btn.dataset;
    if (rAction === "view") {
      openSisaModal(id);
    } else if (rAction === "receipt") {
      const rec = rekodSisaList.find((r) => r.id === id);
      if (rec) generateOfficialReceiptsPDF([rec]);
    } else if (rAction === "edit") {
      loadRecordIntoUnifiedForm(id);
    } else if (rAction === "delete") {
      if (!confirm(`Adakah anda pasti mahu memadam laporan ${id}?`)) return;
      try {
        if (isDbConnected && supabaseClient) {
          const { error } = await supabaseClient.from(dbTables.rekodSisa).delete().eq("id", id);
          if (error) throw error;
        }
        rekodSisaList = rekodSisaList.filter((r) => r.id !== id);
        selectedRecordIds.delete(id);
        updateMultiReceiptBtn();
        if (!isDbConnected) saveLocal(LS_KEYS.rekodSisa, rekodSisaList);
        refreshAllViews();
        showToast(`Rekod ${id} telah dipadam.`);
      } catch (err) {
        showToast(`Gagal padam rekod: ${err.message || err}`);
      }
    }
  });

  // Modal Events
  function closeModal() {
    detailModal.classList.add("hidden");
  }
  closeModalBtn.addEventListener("click", closeModal);
  closeModalFooterBtn.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });
  modalReceiptPdfBtn.addEventListener("click", () => {
    const rec = rekodSisaList.find((r) => r.id === modalActiveRecordId);
    if (rec) generateOfficialReceiptsPDF([rec]);
  });

  // ==================== INIT ====================
  initTheme();
  populateSeksyenDropdowns();
  applyRoleUI();
  resetUnifiedForm();
  initSupabase();
})();
