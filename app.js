(() => {
  const STORAGE_KEY = "isisa_modul6_reports_v2";
  const LEGACY_STORAGE_KEY = "isisa_modul6_reports_v1";
  const THEME_KEY = "isisa_theme_pref";
  const SECTORS = ["Industri", "Kilang", "Gudang", "Pusat Komersial", "Premis Berkaitan"];

  // State
  let records = loadLocalRecords();
  let editingId = null;
  let supabaseClient = null;
  let dbTable = "pelaporan_sisa";
  let isDbConnected = false;

  // DOM References
  const navLinks = document.querySelectorAll(".nav-link[data-view]");
  const jumpLinks = document.querySelectorAll(".nav-jump[data-jump-section]");
  const viewPanels = document.querySelectorAll(".view-panel");
  const navRecordCount = document.getElementById("nav-record-count");

  const menuToggleBtn = document.getElementById("menu-toggle-btn");
  const sidenav = document.getElementById("sidenav");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const heroNewBtn = document.getElementById("hero-new-btn");

  const form = document.getElementById("waste-report-form");
  const editModeBanner = document.getElementById("edit-mode-banner");
  const editRecordIdSpan = document.getElementById("edit-record-id");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const submitFormBtn = document.getElementById("submit-form-btn");
  const resetFormBtn = document.getElementById("reset-form-btn");
  const formErrorBox = document.getElementById("form-error-box");

  const scheduledPanel = document.getElementById("scheduled-waste-panel");
  const categoryRadios = document.querySelectorAll('input[name="kategoriSisa"]');
  const unitSelect = document.getElementById("unitKuantiti");
  const unitLabels = document.querySelectorAll(".unit-label");

  const qtyTotalInput = document.getElementById("kuantitiDijana");
  const qtyRecycleInput = document.getElementById("kuantitiKitarSemula");
  const qtyRecoverInput = document.getElementById("kuantitiPulih");
  const qtyDisposeInput = document.getElementById("kuantitiLupus");

  const balanceBox = document.getElementById("balance-box");
  const balanceStatusText = document.getElementById("balance-status-text");
  const allocatedTotalEl = document.getElementById("allocated-total");
  const balanceDiffEl = document.getElementById("balance-diff");
  const diversionRateEl = document.getElementById("diversion-rate");
  const barRecycle = document.getElementById("bar-recycle");
  const barRecover = document.getElementById("bar-recover");
  const barDispose = document.getElementById("bar-dispose");

  // Live Check Side Panel
  const liveSektor = document.getElementById("live-sektor");
  const liveKategori = document.getElementById("live-kategori");
  const liveDijana = document.getElementById("live-dijana");
  const liveStatus = document.getElementById("live-status");
  const liveDiversion = document.getElementById("live-diversion");
  const chk1 = document.getElementById("chk-1");
  const chk2 = document.getElementById("chk-2");
  const chk3 = document.getElementById("chk-3");
  const chk4 = document.getElementById("chk-4");

  // Records View
  const searchInput = document.getElementById("search-input");
  const filterSektor = document.getElementById("filter-sektor");
  const filterKategori = document.getElementById("filter-kategori");
  const recordsTbody = document.getElementById("records-tbody");
  const emptyRecordsEl = document.getElementById("empty-records");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const newReportBtn = document.getElementById("new-report-btn");

  // Modal & Toast
  const detailModal = document.getElementById("detail-modal");
  const modalBody = document.getElementById("modal-body");
  const modalTitle = document.getElementById("modal-title");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const closeModalFooterBtn = document.getElementById("close-modal-footer-btn");
  const printModalBtn = document.getElementById("print-modal-btn");
  const toastEl = document.getElementById("toast");

  // ==================== STORAGE & SUPABASE DB ====================
  function loadLocalRecords() {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {
      // ignore storage errors in restricted environments
    }
    return [];
  }

  function saveLocalRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (_) {
      // ignore storage errors in restricted environments
    }
  }

  function toDbRow(rec) {
    return {
      id: rec.id,
      sektor: rec.sektor,
      nama_premis: rec.namaPremis,
      no_pendaftaran: rec.noPendaftaran,
      negeri: rec.negeri,
      tarikh_laporan: rec.tarikhLaporan,
      tempoh_laporan: rec.tempohLaporan,
      pegawai_pelapor: rec.pegawaiPelapor,
      kategori_sisa: rec.kategoriSisa,
      kod_sw: rec.kodSW || "",
      no_eswis: rec.noESWIS || "",
      status_pematuhan: rec.statusPematuhan || "",
      jenis_sisa: rec.jenisSisa,
      kuantiti_dijana: rec.kuantitiDijana,
      unit_kuantiti: rec.unitKuantiti,
      kekerapan: rec.kekerapan,
      catatan_sisa: rec.catatanSisa || "",
      kuantiti_kitar_semula: rec.kuantitiKitarSemula,
      kuantiti_pulih: rec.kuantitiPulih,
      kuantiti_lupus: rec.kuantitiLupus,
      nama_fasiliti: rec.namaFasiliti,
      jenis_fasiliti: rec.jenisFasiliti,
      no_lesen_fasiliti: rec.noLesenFasiliti,
      tarikh_penerimaan: rec.tarikhPenerimaan,
      no_resit: rec.noResit,
      lokasi_fasiliti: rec.lokasiFasiliti
    };
  }

  function fromDbRow(row) {
    return {
      id: row.id,
      sektor: row.sektor,
      namaPremis: row.nama_premis,
      noPendaftaran: row.no_pendaftaran,
      negeri: row.negeri,
      tarikhLaporan: row.tarikh_laporan,
      tempohLaporan: row.tempoh_laporan,
      pegawaiPelapor: row.pegawai_pelapor,
      kategoriSisa: row.kategori_sisa,
      kodSW: row.kod_sw || "",
      noESWIS: row.no_eswis || "",
      statusPematuhan: row.status_pematuhan || "",
      jenisSisa: row.jenis_sisa,
      kuantitiDijana: Number(row.kuantiti_dijana) || 0,
      unitKuantiti: row.unit_kuantiti,
      kekerapan: row.kekerapan || "Bulanan",
      catatanSisa: row.catatan_sisa || "",
      kuantitiKitarSemula: Number(row.kuantiti_kitar_semula) || 0,
      kuantitiPulih: Number(row.kuantiti_pulih) || 0,
      kuantitiLupus: Number(row.kuantiti_lupus) || 0,
      namaFasiliti: row.nama_fasiliti,
      jenisFasiliti: row.jenis_fasiliti,
      noLesenFasiliti: row.no_lesen_fasiliti,
      tarikhPenerimaan: row.tarikh_penerimaan,
      noResit: row.no_resit,
      lokasiFasiliti: row.lokasi_fasiliti
    };
  }

  async function initSupabase() {
    const cfg = window.ISISA_SUPABASE_CONFIG || {};
    const url = (cfg.url || "").trim();
    const anonKey = (cfg.anonKey || "").trim();
    dbTable = (cfg.tableName || "pelaporan_sisa").trim();

    if (!url || !anonKey || !window.supabase) {
      isDbConnected = false;
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(url, anonKey);
      const { data, error } = await supabaseClient
        .from(dbTable)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      records = (data || []).map(fromDbRow);
      isDbConnected = true;
      updateNavCount();
      renderHeroSummary();
      renderRecordsTable();
      renderAnalytics();
    } catch (err) {
      isDbConnected = false;
      console.error("Supabase error:", err);
      showToast("Gagal menyambung ke Supabase. Semak URL, Anon Key & skrip SQL.");
    }
  }

  function toTons(value, unit) {
    const num = Number(value) || 0;
    return unit === "kg" ? num / 1000 : num;
  }

  function formatNum(num, decimals = 2) {
    return (Number(num) || 0).toLocaleString("ms-MY", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 3200);
  }

  function setDefaultDates() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    if (!document.getElementById("tarikhLaporan").value) {
      document.getElementById("tarikhLaporan").value = `${yyyy}-${mm}-${dd}`;
    }
    if (!document.getElementById("tempohLaporan").value) {
      document.getElementById("tempohLaporan").value = `${yyyy}-${mm}`;
    }
    if (!document.getElementById("tarikhPenerimaan").value) {
      document.getElementById("tarikhPenerimaan").value = `${yyyy}-${mm}-${dd}`;
    }
  }

  function switchView(viewId) {
    navLinks.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewId);
    });
    viewPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === viewId);
    });
    sidenav.classList.remove("open");
    if (viewId === "records-view") renderRecordsTable();
    if (viewId === "analytics-view") renderAnalytics();
  }

  // ==================== THEME & ACCESSIBILITY ====================
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const moon = themeToggleBtn.querySelector(".icon-moon");
    const sun = themeToggleBtn.querySelector(".icon-sun");
    moon.classList.toggle("hidden", theme === "dark");
    sun.classList.toggle("hidden", theme !== "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {}
  }

  function initTheme() {
    let saved = "light";
    try {
      const pref = localStorage.getItem(THEME_KEY);
      if (pref === "dark" || pref === "light") saved = pref;
    } catch (_) {}
    applyTheme(saved);
  }

  // ==================== HERO OVERVIEW ====================
  function renderHeroSummary() {
    let totalTon = 0;
    let recycleTon = 0;
    let recoverTon = 0;
    let disposeTon = 0;
    let schedTon = 0;

    records.forEach((rec) => {
      const t = toTons(rec.kuantitiDijana, rec.unitKuantiti);
      totalTon += t;
      recycleTon += toTons(rec.kuantitiKitarSemula, rec.unitKuantiti);
      recoverTon += toTons(rec.kuantitiPulih, rec.unitKuantiti);
      disposeTon += toTons(rec.kuantitiLupus, rec.unitKuantiti);
      if (rec.kategoriSisa === "Sisa Terjadual") schedTon += t;
    });

    const pct = (part) => (totalTon > 0 ? Math.round((part / totalTon) * 100) : 0);
    const diversionPct = pct(recycleTon + recoverTon);

    document.getElementById("hero-total-ton").innerHTML = `${formatNum(totalTon)} <small>t</small>`;
    document.getElementById("hero-total-rec").textContent = `${records.length} rekod`;
    document.getElementById("hero-recycle-ton").innerHTML = `${formatNum(recycleTon)} <small>t</small>`;
    document.getElementById("hero-recycle-pct").textContent = `${pct(recycleTon)}% bahagian`;
    document.getElementById("hero-recover-ton").innerHTML = `${formatNum(recoverTon)} <small>t</small>`;
    document.getElementById("hero-recover-pct").textContent = `${pct(recoverTon)}% bahagian`;
    document.getElementById("hero-dispose-ton").innerHTML = `${formatNum(disposeTon)} <small>t</small>`;
    document.getElementById("hero-dispose-pct").textContent = `${pct(disposeTon)}% bahagian`;
    document.getElementById("hero-diversion-pct").textContent = `${diversionPct}%`;
    document.getElementById("hero-sched-meta").textContent = `${formatNum(schedTon)} t terjadual`;
  }

  // ==================== FORM LOGIC & LIVE CHECK ====================
  function updateCategoryUI() {
    const selected = document.querySelector('input[name="kategoriSisa"]:checked')?.value || "Sisa Pepejal Biasa";
    const isScheduled = selected === "Sisa Terjadual";
    scheduledPanel.classList.toggle("hidden", !isScheduled);
    document.getElementById("kodSW").required = isScheduled;
    document.getElementById("noESWIS").required = isScheduled;
    document.getElementById("statusPematuhan").required = isScheduled;
    updateLiveSummary();
  }

  function updateUnitLabels() {
    const u = unitSelect.value === "kg" ? "kg" : "tan";
    unitLabels.forEach((el) => (el.textContent = u));
  }

  function updateBalanceUI() {
    const total = parseFloat(qtyTotalInput.value) || 0;
    const r = parseFloat(qtyRecycleInput.value) || 0;
    const p = parseFloat(qtyRecoverInput.value) || 0;
    const l = parseFloat(qtyDisposeInput.value) || 0;
    const allocated = r + p + l;
    const rawDiff = +(total - allocated).toFixed(4);
    const diff = Math.abs(rawDiff) < 0.0001 ? 0 : rawDiff;

    allocatedTotalEl.textContent = formatNum(allocated);
    balanceDiffEl.textContent = formatNum(diff);

    const diversion = total > 0 ? Math.min(100, ((r + p) / total) * 100) : 0;
    diversionRateEl.textContent = `${Math.round(diversion)}%`;

    balanceBox.classList.remove("balanced", "unbalanced");

    if (total <= 0) {
      balanceStatusText.textContent = "Masukkan jumlah kuantiti dijana terlebih dahulu";
      barRecycle.style.width = "0%";
      barRecover.style.width = "0%";
      barDispose.style.width = "0%";
      updateLiveSummary();
      return;
    }

    const base = Math.max(total, allocated);
    barRecycle.style.width = `${(r / base) * 100}%`;
    barRecover.style.width = `${(p / base) * 100}%`;
    barDispose.style.width = `${(l / base) * 100}%`;

    if (Math.abs(diff) <= 0.005) {
      balanceBox.classList.add("balanced");
      balanceStatusText.textContent = "Sepadan (100% diperuntukkan)";
    } else if (diff > 0) {
      balanceBox.classList.add("unbalanced");
      balanceStatusText.textContent = `Kurang ${formatNum(diff)} ${unitSelect.value} belum diperuntukkan`;
    } else {
      balanceBox.classList.add("unbalanced");
      balanceStatusText.textContent = `Melebihi kuantiti dijana sebanyak ${formatNum(Math.abs(diff))} ${unitSelect.value}`;
    }

    updateLiveSummary();
  }

  function updateLiveSummary() {
    const sektor = document.querySelector('input[name="sektor"]:checked')?.value || "";
    const kategori = document.querySelector('input[name="kategoriSisa"]:checked')?.value || "Sisa Pepejal Biasa";
    const isScheduled = kategori === "Sisa Terjadual";
    const total = parseFloat(qtyTotalInput.value) || 0;
    const r = parseFloat(qtyRecycleInput.value) || 0;
    const p = parseFloat(qtyRecoverInput.value) || 0;
    const l = parseFloat(qtyDisposeInput.value) || 0;
    const isBalanced = total > 0 && Math.abs(total - (r + p + l)) <= 0.005;
    const diversion = total > 0 ? Math.min(100, Math.round(((r + p) / total) * 100)) : 0;

    liveSektor.textContent = sektor || "Belum dipilih";
    liveKategori.textContent = kategori;
    liveDijana.textContent = `${formatNum(total)} ${unitSelect.value}`;
    liveStatus.textContent = total <= 0 ? "Menunggu input" : isBalanced ? "Sepadan (100%)" : "Tidak sepadan";
    liveDiversion.textContent = `${diversion}%`;

    const sec1Done =
      Boolean(sektor) &&
      document.getElementById("namaPremis").value.trim() !== "" &&
      document.getElementById("noPendaftaran").value.trim() !== "" &&
      document.getElementById("negeri").value !== "" &&
      document.getElementById("pegawaiPelapor").value.trim() !== "";

    const sec2Done =
      document.getElementById("jenisSisa").value !== "" &&
      total > 0 &&
      (!isScheduled ||
        (document.getElementById("kodSW").value !== "" &&
          document.getElementById("noESWIS").value.trim() !== ""));

    const sec3Done = isBalanced;

    const sec4Done =
      document.getElementById("namaFasiliti").value.trim() !== "" &&
      document.getElementById("jenisFasiliti").value !== "" &&
      document.getElementById("noLesenFasiliti").value.trim() !== "" &&
      document.getElementById("noResit").value.trim() !== "" &&
      document.getElementById("lokasiFasiliti").value.trim() !== "" &&
      document.getElementById("pengakuan").checked;

    chk1.classList.toggle("done", sec1Done);
    chk2.classList.toggle("done", sec2Done);
    chk3.classList.toggle("done", sec3Done);
    chk4.classList.toggle("done", sec4Done);
  }

  function showFormError(msg) {
    formErrorBox.textContent = msg;
    formErrorBox.classList.remove("hidden");
    formErrorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearFormError() {
    formErrorBox.textContent = "";
    formErrorBox.classList.add("hidden");
  }

  function resetFormState() {
    form.reset();
    editingId = null;
    editModeBanner.classList.add("hidden");
    submitFormBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l5 5L20 7"/></svg>
      Hantar &amp; Simpan Laporan
    `;
    clearFormError();
    setDefaultDates();
    updateCategoryUI();
    updateUnitLabels();
    updateBalanceUI();
    updateLiveSummary();
  }

  function generateReportId() {
    const year = new Date().getFullYear();
    const maxSeq = records.reduce((max, rec) => {
      const m = String(rec.id).match(/(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `SISA-${year}-${String(maxSeq + 1).padStart(3, "0")}`;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    clearFormError();

    const sektor = document.querySelector('input[name="sektor"]:checked')?.value;
    if (!sektor) {
      showFormError("Sila pilih sektor premis di Langkah 1.");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      showFormError("Sila lengkapkan semua medan wajib bertanda (*) sebelum menghantar laporan.");
      return;
    }

    const total = parseFloat(qtyTotalInput.value) || 0;
    const r = parseFloat(qtyRecycleInput.value) || 0;
    const p = parseFloat(qtyRecoverInput.value) || 0;
    const l = parseFloat(qtyDisposeInput.value) || 0;

    if (total <= 0) {
      showFormError("Jumlah kuantiti sisa dijana mestilah lebih besar daripada 0.");
      return;
    }

    if (Math.abs(total - (r + p + l)) > 0.005) {
      showFormError(
        `Jumlah pecahan kaedah pengurusan (${formatNum(r + p + l)} ${unitSelect.value}) tidak sepadan dengan jumlah kuantiti dijana (${formatNum(total)} ${unitSelect.value}). Sila laraskan di Langkah 3.`
      );
      return;
    }

    const kategoriSisa = document.querySelector('input[name="kategoriSisa"]:checked').value;
    const isScheduled = kategoriSisa === "Sisa Terjadual";

    const payload = {
      id: editingId || generateReportId(),
      sektor,
      namaPremis: document.getElementById("namaPremis").value.trim(),
      noPendaftaran: document.getElementById("noPendaftaran").value.trim(),
      negeri: document.getElementById("negeri").value,
      tarikhLaporan: document.getElementById("tarikhLaporan").value,
      tempohLaporan: document.getElementById("tempohLaporan").value,
      pegawaiPelapor: document.getElementById("pegawaiPelapor").value.trim(),
      kategoriSisa,
      kodSW: isScheduled ? document.getElementById("kodSW").value : "",
      noESWIS: isScheduled ? document.getElementById("noESWIS").value.trim() : "",
      statusPematuhan: isScheduled ? document.getElementById("statusPematuhan").value : "",
      jenisSisa: document.getElementById("jenisSisa").value,
      kuantitiDijana: total,
      unitKuantiti: unitSelect.value,
      kekerapan: document.getElementById("kekerapan").value,
      catatanSisa: document.getElementById("catatanSisa").value.trim(),
      kuantitiKitarSemula: r,
      kuantitiPulih: p,
      kuantitiLupus: l,
      namaFasiliti: document.getElementById("namaFasiliti").value.trim(),
      jenisFasiliti: document.getElementById("jenisFasiliti").value,
      noLesenFasiliti: document.getElementById("noLesenFasiliti").value.trim(),
      tarikhPenerimaan: document.getElementById("tarikhPenerimaan").value,
      noResit: document.getElementById("noResit").value.trim(),
      lokasiFasiliti: document.getElementById("lokasiFasiliti").value.trim()
    };

    const originalBtnHtml = submitFormBtn.innerHTML;
    submitFormBtn.disabled = true;
    submitFormBtn.textContent = "Menyimpan...";

    try {
      if (isDbConnected && supabaseClient) {
        const dbRow = toDbRow(payload);
        if (editingId) {
          const { error } = await supabaseClient
            .from(dbTable)
            .update(dbRow)
            .eq("id", editingId);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient.from(dbTable).insert([dbRow]);
          if (error) throw error;
        }
      }

      if (editingId) {
        const idx = records.findIndex((x) => x.id === editingId);
        if (idx !== -1) records[idx] = payload;
        showToast(`Rekod ${payload.id} berjaya dikemas kini.`);
      } else {
        records.unshift(payload);
        showToast(`Laporan baharu ${payload.id} berjaya disimpan.`);
      }

      if (!isDbConnected) saveLocalRecords();
      updateNavCount();
      renderHeroSummary();
      resetFormState();
      switchView("records-view");
    } catch (err) {
      console.error("Gagal simpan rekod:", err);
      showFormError(`Gagal menyimpan ke pangkalan data: ${err.message || "Ralat tidak diketahui"}`);
      submitFormBtn.innerHTML = originalBtnHtml;
    } finally {
      submitFormBtn.disabled = false;
    }
  }

  function loadRecordIntoForm(id) {
    const rec = records.find((r) => r.id === id);
    if (!rec) return;

    editingId = rec.id;
    editRecordIdSpan.textContent = rec.id;
    editModeBanner.classList.remove("hidden");
    submitFormBtn.textContent = "Kemas Kini Laporan";

    const sectorRadio = document.querySelector(`input[name="sektor"][value="${rec.sektor}"]`);
    if (sectorRadio) sectorRadio.checked = true;

    document.getElementById("namaPremis").value = rec.namaPremis;
    document.getElementById("noPendaftaran").value = rec.noPendaftaran;
    document.getElementById("negeri").value = rec.negeri;
    document.getElementById("tarikhLaporan").value = rec.tarikhLaporan;
    document.getElementById("tempohLaporan").value = rec.tempohLaporan;
    document.getElementById("pegawaiPelapor").value = rec.pegawaiPelapor;

    const catRadio = document.querySelector(`input[name="kategoriSisa"][value="${rec.kategoriSisa}"]`);
    if (catRadio) catRadio.checked = true;
    updateCategoryUI();

    document.getElementById("kodSW").value = rec.kodSW || "";
    document.getElementById("noESWIS").value = rec.noESWIS || "";
    document.getElementById("statusPematuhan").value = rec.statusPematuhan || "Patuh Penuh";

    document.getElementById("jenisSisa").value = rec.jenisSisa;
    qtyTotalInput.value = rec.kuantitiDijana;
    unitSelect.value = rec.unitKuantiti;
    updateUnitLabels();

    document.getElementById("kekerapan").value = rec.kekerapan;
    document.getElementById("catatanSisa").value = rec.catatanSisa || "";

    qtyRecycleInput.value = rec.kuantitiKitarSemula;
    qtyRecoverInput.value = rec.kuantitiPulih;
    qtyDisposeInput.value = rec.kuantitiLupus;
    updateBalanceUI();

    document.getElementById("namaFasiliti").value = rec.namaFasiliti;
    document.getElementById("jenisFasiliti").value = rec.jenisFasiliti;
    document.getElementById("noLesenFasiliti").value = rec.noLesenFasiliti;
    document.getElementById("tarikhPenerimaan").value = rec.tarikhPenerimaan;
    document.getElementById("noResit").value = rec.noResit;
    document.getElementById("lokasiFasiliti").value = rec.lokasiFasiliti;
    document.getElementById("pengakuan").checked = true;

    clearFormError();
    updateLiveSummary();
    switchView("form-view");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ==================== RECORDS TABLE ====================
  function updateNavCount() {
    navRecordCount.textContent = records.length;
  }

  function getFilteredRecords() {
    const q = searchInput.value.trim().toLowerCase();
    const sec = filterSektor.value;
    const cat = filterKategori.value;

    return records.filter((rec) => {
      if (sec !== "ALL" && rec.sektor !== sec) return false;
      if (cat !== "ALL" && rec.kategoriSisa !== cat) return false;
      if (q) {
        const hay = [
          rec.id,
          rec.namaPremis,
          rec.sektor,
          rec.jenisSisa,
          rec.kodSW,
          rec.noESWIS,
          rec.namaFasiliti,
          rec.negeri
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderRecordsTable() {
    const list = getFilteredRecords();
    recordsTbody.innerHTML = "";
    emptyRecordsEl.classList.toggle("hidden", list.length > 0);

    list.forEach((rec) => {
      const totalTon = toTons(rec.kuantitiDijana, rec.unitKuantiti);
      const rTon = toTons(rec.kuantitiKitarSemula, rec.unitKuantiti);
      const pTon = toTons(rec.kuantitiPulih, rec.unitKuantiti);
      const lTon = toTons(rec.kuantitiLupus, rec.unitKuantiti);
      const isSched = rec.kategoriSisa === "Sisa Terjadual";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div class="cell-primary">${escapeHtml(rec.id)}</div>
          <div class="cell-sub">${escapeHtml(rec.tarikhLaporan)}</div>
        </td>
        <td>
          <span class="pill pill-sector">${escapeHtml(rec.sektor)}</span>
          <div class="cell-primary" style="margin-top:4px;">${escapeHtml(rec.namaPremis)}</div>
          <div class="cell-sub">${escapeHtml(rec.negeri)}</div>
        </td>
        <td>
          <span class="pill ${isSched ? "pill-scheduled" : "pill-normal"}">
            ${isSched ? `Sisa Terjadual (${escapeHtml(rec.kodSW)})` : "Sisa Pepejal Biasa"}
          </span>
          <div class="cell-primary" style="margin-top:4px;">${escapeHtml(rec.jenisSisa)}</div>
          ${isSched ? `<div class="cell-sub">eSWIS: ${escapeHtml(rec.noESWIS)}</div>` : ""}
        </td>
        <td class="num">
          <strong>${formatNum(totalTon)}</strong>
          <div class="cell-sub">${formatNum(rec.kuantitiDijana)} ${escapeHtml(rec.unitKuantiti)}</div>
        </td>
        <td class="num">${formatNum(rTon)}</td>
        <td class="num">${formatNum(pTon)}</td>
        <td class="num">${formatNum(lTon)}</td>
        <td>
          <div class="cell-primary">${escapeHtml(rec.namaFasiliti)}</div>
          <div class="cell-sub">${escapeHtml(rec.noLesenFasiliti)}</div>
        </td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-icon" data-action="view" data-id="${escapeHtml(rec.id)}">Lihat</button>
            <button type="button" class="btn-icon" data-action="edit" data-id="${escapeHtml(rec.id)}">Sunting</button>
            <button type="button" class="btn-icon danger" data-action="delete" data-id="${escapeHtml(rec.id)}">Padam</button>
          </div>
        </td>
      `;
      recordsTbody.appendChild(tr);
    });
  }

  function openDetailModal(id) {
    const rec = records.find((r) => r.id === id);
    if (!rec) return;

    const isSched = rec.kategoriSisa === "Sisa Terjadual";
    const totalTon = toTons(rec.kuantitiDijana, rec.unitKuantiti);
    const diversion =
      rec.kuantitiDijana > 0
        ? Math.round(((rec.kuantitiKitarSemula + rec.kuantitiPulih) / rec.kuantitiDijana) * 100)
        : 0;

    modalTitle.textContent = `Butiran Laporan — ${rec.id}`;
    modalBody.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span>Sektor</span>
          <strong>${escapeHtml(rec.sektor)}</strong>
        </div>
        <div class="detail-item">
          <span>Tarikh &amp; Tempoh Pelaporan</span>
          <strong>${escapeHtml(rec.tarikhLaporan)} (Tempoh: ${escapeHtml(rec.tempohLaporan)})</strong>
        </div>
        <div class="detail-item detail-full">
          <span>Nama Premis / Syarikat</span>
          <strong>${escapeHtml(rec.namaPremis)} (${escapeHtml(rec.noPendaftaran)} · ${escapeHtml(rec.negeri)})</strong>
        </div>
        <div class="detail-item">
          <span>Kategori Pengasingan</span>
          <strong>${escapeHtml(rec.kategoriSisa)}</strong>
        </div>
        <div class="detail-item">
          <span>Jenis Sisa</span>
          <strong>${escapeHtml(rec.jenisSisa)}</strong>
        </div>
        ${
          isSched
            ? `
          <div class="detail-item">
            <span>Kod SW &amp; No. eSWIS</span>
            <strong>${escapeHtml(rec.kodSW)} · ${escapeHtml(rec.noESWIS)}</strong>
          </div>
          <div class="detail-item">
            <span>Status Pematuhan Perundangan</span>
            <strong>${escapeHtml(rec.statusPematuhan)}</strong>
          </div>
        `
            : ""
        }
        <div class="detail-item">
          <span>Jumlah Kuantiti Dijana</span>
          <strong>${formatNum(rec.kuantitiDijana)} ${escapeHtml(rec.unitKuantiti)} (${formatNum(totalTon)} tan metrik)</strong>
        </div>
        <div class="detail-item">
          <span>Kadar Pengalihan (Kitar Semula + Pulih)</span>
          <strong>${diversion}%</strong>
        </div>
        <div class="detail-item detail-full">
          <span>Pecahan Kaedah Pengurusan</span>
          <strong>
            Kitar Semula: ${formatNum(rec.kuantitiKitarSemula)} ${escapeHtml(rec.unitKuantiti)} &nbsp;|&nbsp;
            Pulih: ${formatNum(rec.kuantitiPulih)} ${escapeHtml(rec.unitKuantiti)} &nbsp;|&nbsp;
            Lupuskan: ${formatNum(rec.kuantitiLupus)} ${escapeHtml(rec.unitKuantiti)}
          </strong>
        </div>
        <div class="detail-item detail-full">
          <span>Fasiliti / Pengendali Penerima</span>
          <strong>${escapeHtml(rec.namaFasiliti)} — ${escapeHtml(rec.jenisFasiliti)}</strong>
        </div>
        <div class="detail-item">
          <span>No. Lesen / Permit Pengendali</span>
          <strong>${escapeHtml(rec.noLesenFasiliti)}</strong>
        </div>
        <div class="detail-item">
          <span>Tarikh Penerimaan &amp; No. Resit / DO</span>
          <strong>${escapeHtml(rec.tarikhPenerimaan)} · ${escapeHtml(rec.noResit)}</strong>
        </div>
        <div class="detail-item">
          <span>Lokasi Destinasi</span>
          <strong>${escapeHtml(rec.lokasiFasiliti)}</strong>
        </div>
        <div class="detail-item">
          <span>Pegawai Pelapor</span>
          <strong>${escapeHtml(rec.pegawaiPelapor)}</strong>
        </div>
        ${
          rec.catatanSisa
            ? `<div class="detail-item detail-full"><span>Catatan</span><strong>${escapeHtml(rec.catatanSisa)}</strong></div>`
            : ""
        }
      </div>
    `;
    detailModal.classList.remove("hidden");
  }

  function exportCSV() {
    const list = getFilteredRecords();
    if (!list.length) {
      showToast("Tiada rekod untuk dieksport.");
      return;
    }

    const headers = [
      "ID Laporan",
      "Tarikh Laporan",
      "Tempoh",
      "Sektor",
      "Nama Premis",
      "No Pendaftaran",
      "Negeri",
      "Pegawai Pelapor",
      "Kategori Sisa",
      "Kod SW",
      "No eSWIS",
      "Status Pematuhan",
      "Jenis Sisa",
      "Kuantiti Dijana",
      "Unit",
      "Kuantiti Dijana (Tan)",
      "Kitar Semula (Tan)",
      "Pulih (Tan)",
      "Lupuskan (Tan)",
      "Fasiliti Penerima",
      "Jenis Fasiliti",
      "No Lesen Fasiliti",
      "Tarikh Penerimaan",
      "No Resit",
      "Lokasi Fasiliti"
    ];

    const rows = list.map((r) => [
      r.id,
      r.tarikhLaporan,
      r.tempohLaporan,
      r.sektor,
      r.namaPremis,
      r.noPendaftaran,
      r.negeri,
      r.pegawaiPelapor,
      r.kategoriSisa,
      r.kodSW,
      r.noESWIS,
      r.statusPematuhan,
      r.jenisSisa,
      r.kuantitiDijana,
      r.unitKuantiti,
      toTons(r.kuantitiDijana, r.unitKuantiti).toFixed(3),
      toTons(r.kuantitiKitarSemula, r.unitKuantiti).toFixed(3),
      toTons(r.kuantitiPulih, r.unitKuantiti).toFixed(3),
      toTons(r.kuantitiLupus, r.unitKuantiti).toFixed(3),
      r.namaFasiliti,
      r.jenisFasiliti,
      r.noLesenFasiliti,
      r.tarikhPenerimaan,
      r.noResit,
      r.lokasiFasiliti
    ]);

    const csvLines = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
    );

    const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iSISA_Pelaporan_Sisa_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Fail CSV berjaya dimuat turun.");
  }

  // ==================== ANALYTICS ====================
  function renderAnalytics() {
    let totalTon = 0;
    let totalRecycle = 0;
    let totalRecover = 0;
    let totalDispose = 0;
    let scheduledTon = 0;
    let scheduledCount = 0;

    const bySector = {};
    SECTORS.forEach((s) => {
      bySector[s] = {
        count: 0,
        normal: 0,
        scheduled: 0,
        total: 0,
        recycle: 0,
        recover: 0,
        dispose: 0
      };
    });

    records.forEach((rec) => {
      const t = toTons(rec.kuantitiDijana, rec.unitKuantiti);
      const r = toTons(rec.kuantitiKitarSemula, rec.unitKuantiti);
      const p = toTons(rec.kuantitiPulih, rec.unitKuantiti);
      const l = toTons(rec.kuantitiLupus, rec.unitKuantiti);
      const isSched = rec.kategoriSisa === "Sisa Terjadual";

      totalTon += t;
      totalRecycle += r;
      totalRecover += p;
      totalDispose += l;
      if (isSched) {
        scheduledTon += t;
        scheduledCount += 1;
      }

      if (!bySector[rec.sektor]) {
        bySector[rec.sektor] = { count: 0, normal: 0, scheduled: 0, total: 0, recycle: 0, recover: 0, dispose: 0 };
      }
      const bucket = bySector[rec.sektor];
      bucket.count += 1;
      if (isSched) bucket.scheduled += t;
      else bucket.normal += t;
      bucket.total += t;
      bucket.recycle += r;
      bucket.recover += p;
      bucket.dispose += l;
    });

    const diverted = totalRecycle + totalRecover;
    const diversionPct = totalTon > 0 ? Math.round((diverted / totalTon) * 100) : 0;

    let topSector = "-";
    let topSectorVal = 0;
    Object.entries(bySector).forEach(([sec, d]) => {
      if (d.total > topSectorVal) {
        topSectorVal = d.total;
        topSector = sec;
      }
    });

    document.getElementById("kpi-total-ton").textContent = `${formatNum(totalTon)} tan`;
    document.getElementById("kpi-total-records").textContent = `${records.length} laporan direkodkan`;
    document.getElementById("kpi-diversion").textContent = `${diversionPct}%`;
    document.getElementById("kpi-diversion-ton").textContent = `${formatNum(diverted)} tan dialihkan daripada pelupusan`;
    document.getElementById("kpi-scheduled-ton").textContent = `${formatNum(scheduledTon)} tan`;
    document.getElementById("kpi-scheduled-count").textContent = `${scheduledCount} rekod diasingkan & patuh perundangan`;
    document.getElementById("kpi-top-sector").textContent = topSector;
    document.getElementById("kpi-top-sector-val").textContent = `${formatNum(topSectorVal)} tan metrik`;

    const maxSectorTon = Math.max(1, ...Object.values(bySector).map((d) => d.total));
    const sectorChartEl = document.getElementById("sector-chart");
    sectorChartEl.innerHTML = SECTORS.map((sec) => {
      const d = bySector[sec];
      const normalPct = (d.normal / maxSectorTon) * 100;
      const schedPct = (d.scheduled / maxSectorTon) * 100;
      return `
        <div class="bar-row">
          <div class="bar-label">${escapeHtml(sec)}</div>
          <div class="bar-track" title="${escapeHtml(sec)}: Biasa ${formatNum(d.normal)} tan, Terjadual ${formatNum(d.scheduled)} tan">
            <div class="bar-fill-normal" style="width:${normalPct}%"></div>
            <div class="bar-fill-scheduled" style="width:${schedPct}%"></div>
          </div>
          <div class="bar-val">${formatNum(d.total)} t</div>
        </div>
      `;
    }).join("");

    const donutWrap = document.getElementById("method-donut");
    const methodLegend = document.getElementById("method-legend");
    const methodSum = totalRecycle + totalRecover + totalDispose;
    const radius = 66;
    const circumference = 2 * Math.PI * radius;

    const segments = [
      { label: "Kitar Semula", value: totalRecycle, color: "#2E9E4F" },
      { label: "Pulih", value: totalRecover, color: "#1B6FC2" },
      { label: "Lupuskan", value: totalDispose, color: "#E07A26" }
    ];

    let offset = 0;
    const circles = segments
      .map((seg) => {
        const ratio = methodSum > 0 ? seg.value / methodSum : 0;
        const dash = ratio * circumference;
        const svgCircle = `
          <circle
            cx="90" cy="90" r="${radius}"
            fill="none"
            stroke="${seg.color}"
            stroke-width="24"
            stroke-dasharray="${dash} ${circumference - dash}"
            stroke-dashoffset="${-offset}"
            transform="rotate(-90 90 90)"
          />
        `;
        offset += dash;
        return svgCircle;
      })
      .join("");

    donutWrap.innerHTML = `
      <svg viewBox="0 0 180 180" width="185" height="185" aria-label="Carta Donat Kaedah Pengurusan">
        <circle cx="90" cy="90" r="${radius}" fill="none" stroke="rgba(148,163,184,0.22)" stroke-width="24" />
        ${circles}
        <text x="90" y="86" text-anchor="middle" fill="var(--ink)" font-size="22" font-weight="800">${diversionPct}%</text>
        <text x="90" y="106" text-anchor="middle" fill="var(--muted)" font-size="11" font-weight="700">DIALIHKAN</text>
      </svg>
    `;

    methodLegend.innerHTML = segments
      .map((seg) => {
        const pct = methodSum > 0 ? Math.round((seg.value / methodSum) * 100) : 0;
        return `
          <div class="legend-item">
            <div class="legend-left">
              <span class="dot" style="background:${seg.color}; margin-right:0;"></span>
              <span>${seg.label}</span>
            </div>
            <strong>${formatNum(seg.value)} t (${pct}%)</strong>
          </div>
        `;
      })
      .join("");

    const summaryTbody = document.getElementById("sector-summary-tbody");
    summaryTbody.innerHTML = SECTORS.map((sec) => {
      const d = bySector[sec];
      const divRate = d.total > 0 ? Math.round(((d.recycle + d.recover) / d.total) * 100) : 0;
      return `
        <tr>
          <td><strong>${escapeHtml(sec)}</strong></td>
          <td class="num">${d.count}</td>
          <td class="num">${formatNum(d.normal)}</td>
          <td class="num">${formatNum(d.scheduled)}</td>
          <td class="num"><strong>${formatNum(d.total)}</strong></td>
          <td class="num">${formatNum(d.recycle)}</td>
          <td class="num">${formatNum(d.recover)}</td>
          <td class="num">${formatNum(d.dispose)}</td>
          <td class="num"><span class="pill pill-normal">${divRate}%</span></td>
        </tr>
      `;
    }).join("");
  }

  // ==================== EVENT LISTENERS ====================
  navLinks.forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  jumpLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sec = btn.dataset.jumpSection;
      switchView("form-view");
      jumpLinks.forEach((el) => el.classList.toggle("active-step", el.dataset.jumpSection === sec));
      const target = document.getElementById(`section-${sec}`);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  menuToggleBtn.addEventListener("click", () => {
    sidenav.classList.toggle("open");
  });

  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
  });

  heroNewBtn.addEventListener("click", () => {
    resetFormState();
    switchView("form-view");
    document.getElementById("section-1")?.scrollIntoView({ behavior: "smooth" });
  });

  categoryRadios.forEach((radio) => {
    radio.addEventListener("change", updateCategoryUI);
  });

  unitSelect.addEventListener("change", () => {
    updateUnitLabels();
    updateBalanceUI();
  });

  [qtyTotalInput, qtyRecycleInput, qtyRecoverInput, qtyDisposeInput].forEach((input) => {
    input.addEventListener("input", updateBalanceUI);
  });

  form.addEventListener("input", updateLiveSummary);
  form.addEventListener("change", updateLiveSummary);

  document.querySelectorAll("[data-quick-assign]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const total = parseFloat(qtyTotalInput.value) || 0;
      if (total <= 0) {
        showToast("Sila masukkan Jumlah Kuantiti Dijana di Langkah 2 terlebih dahulu.");
        qtyTotalInput.focus();
        return;
      }
      const target = btn.dataset.quickAssign;
      qtyRecycleInput.value = target === "kitarSemula" ? total : 0;
      qtyRecoverInput.value = target === "pulih" ? total : 0;
      qtyDisposeInput.value = target === "lupus" ? total : 0;
      updateBalanceUI();
    });
  });

  form.addEventListener("submit", handleFormSubmit);
  resetFormBtn.addEventListener("click", resetFormState);
  cancelEditBtn.addEventListener("click", resetFormState);

  searchInput.addEventListener("input", renderRecordsTable);
  filterSektor.addEventListener("change", renderRecordsTable);
  filterKategori.addEventListener("change", renderRecordsTable);
  exportCsvBtn.addEventListener("click", exportCSV);
  newReportBtn.addEventListener("click", () => {
    resetFormState();
    switchView("form-view");
  });

  recordsTbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === "view") {
      openDetailModal(id);
    } else if (action === "edit") {
      loadRecordIntoForm(id);
    } else if (action === "delete") {
      if (confirm(`Adakah anda pasti mahu memadam laporan ${id}?`)) {
        try {
          if (isDbConnected && supabaseClient) {
            const { error } = await supabaseClient.from(dbTable).delete().eq("id", id);
            if (error) throw error;
          }
          records = records.filter((r) => r.id !== id);
          if (!isDbConnected) saveLocalRecords();
          updateNavCount();
          renderHeroSummary();
          renderRecordsTable();
          renderAnalytics();
          showToast(`Rekod ${id} telah dipadam.`);
        } catch (err) {
          console.error("Gagal padam rekod:", err);
          showToast(`Gagal memadam rekod: ${err.message || "Ralat pangkalan data"}`);
        }
      }
    }
  });

  function closeModal() {
    detailModal.classList.add("hidden");
  }

  closeModalBtn.addEventListener("click", closeModal);
  closeModalFooterBtn.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });
  printModalBtn.addEventListener("click", () => {
    document.body.classList.add("printing-modal");
    window.print();
  });
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("printing-modal");
  });

  // Highlight active workflow step in sidebar when user focuses inside any form section
  document.querySelectorAll(".form-section[data-section]").forEach((section) => {
    section.addEventListener("focusin", () => {
      const step = section.dataset.section;
      jumpLinks.forEach((el) => {
        el.classList.toggle("active-step", el.dataset.stepIndicator === step);
      });
    });
  });

  // ==================== INIT ====================
  initTheme();
  setDefaultDates();
  updateCategoryUI();
  updateUnitLabels();
  updateBalanceUI();
  updateLiveSummary();
  updateNavCount();
  renderHeroSummary();
  renderRecordsTable();
  renderAnalytics();
  initSupabase();
})();
