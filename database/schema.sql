-- ============================================================================
-- iSi.SA — Sistem Pelaporan Sisa Industri (PAKSI · MBSA)
-- Skrip Pangkalan Data PostgreSQL / Supabase
--
-- Cara guna:
-- 1. Buka Supabase Dashboard -> SQL Editor -> New query
-- 2. Tampal keseluruhan skrip ini dan klik "Run"
-- ============================================================================

-- 1. Jadual Panel Kontraktor Sisa Industri (PAKSI)
CREATE TABLE IF NOT EXISTS public.kontraktor_paksi (
  id TEXT PRIMARY KEY,
  nama_kontraktor TEXT NOT NULL,
  alamat TEXT NOT NULL,
  seksyen TEXT NOT NULL,
  tarikh_lantikan_paksi DATE NOT NULL,
  sijil_nama TEXT DEFAULT '',
  sijil_data TEXT DEFAULT '',
  no_pendaftaran_fail TEXT NOT NULL,
  no_lesen_industri TEXT NOT NULL,
  no_lesen_buang_sampah TEXT NOT NULL,
  no_ssm TEXT NOT NULL,
  bil_lori INTEGER NOT NULL DEFAULT 1 CHECK (bil_lori >= 0),
  no_plat_lori TEXT[] NOT NULL DEFAULT '{}',
  nama_pegawai TEXT NOT NULL,
  no_telefon_pegawai TEXT NOT NULL,
  bil_kilang INTEGER NOT NULL DEFAULT 0 CHECK (bil_kilang >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Jadual Maklumat Industri di bawah Perkhidmatan PAKSI
CREATE TABLE IF NOT EXISTS public.industri_paksi (
  id TEXT PRIMARY KEY,
  nama_industri TEXT NOT NULL,
  alamat TEXT NOT NULL,
  seksyen TEXT NOT NULL,
  tarikh_pelaporan DATE NOT NULL,
  jenis_perniagaan TEXT NOT NULL,
  kontraktor_id TEXT NOT NULL REFERENCES public.kontraktor_paksi(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Jadual Rekod Jenis & Kuantiti Sisa Industri
CREATE TABLE IF NOT EXISTS public.rekod_sisa_industri (
  id TEXT PRIMARY KEY,
  kontraktor_id TEXT NOT NULL REFERENCES public.kontraktor_paksi(id) ON DELETE CASCADE,
  industri_id TEXT NOT NULL REFERENCES public.industri_paksi(id) ON DELETE CASCADE,
  seksyen TEXT NOT NULL,
  tarikh_laporan DATE NOT NULL,
  jenis_sisa TEXT NOT NULL,
  jenis_sisa_lain TEXT DEFAULT '',
  kuantiti_tan NUMERIC(12, 3) NOT NULL CHECK (kuantiti_tan > 0),
  kekerapan_kutipan TEXT NOT NULL,
  nama_tapak_pelupusan TEXT NOT NULL,
  alamat_tapak_pelupusan TEXT NOT NULL,
  resit_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  catatan TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indeks Carian & Penapisan Seksyen
CREATE INDEX IF NOT EXISTS idx_kontraktor_seksyen ON public.kontraktor_paksi (seksyen);
CREATE INDEX IF NOT EXISTS idx_industri_seksyen ON public.industri_paksi (seksyen);
CREATE INDEX IF NOT EXISTS idx_industri_kontraktor ON public.industri_paksi (kontraktor_id);
CREATE INDEX IF NOT EXISTS idx_rekod_sisa_seksyen ON public.rekod_sisa_industri (seksyen);
CREATE INDEX IF NOT EXISTS idx_rekod_sisa_kontraktor ON public.rekod_sisa_industri (kontraktor_id);
CREATE INDEX IF NOT EXISTS idx_rekod_sisa_industri ON public.rekod_sisa_industri (industri_id);
CREATE INDEX IF NOT EXISTS idx_rekod_sisa_tarikh ON public.rekod_sisa_industri (tarikh_laporan DESC);

-- 5. Trigger Kemas Kini Automatik updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kontraktor_updated_at ON public.kontraktor_paksi;
CREATE TRIGGER trg_kontraktor_updated_at
BEFORE UPDATE ON public.kontraktor_paksi
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_industri_updated_at ON public.industri_paksi;
CREATE TRIGGER trg_industri_updated_at
BEFORE UPDATE ON public.industri_paksi
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_rekod_sisa_updated_at ON public.rekod_sisa_industri;
CREATE TRIGGER trg_rekod_sisa_updated_at
BEFORE UPDATE ON public.rekod_sisa_industri
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Paparan (View) Ringkasan Dashboard PAKSI
CREATE OR REPLACE VIEW public.v_dashboard_paksi AS
SELECT
  (SELECT COUNT(*) FROM public.kontraktor_paksi) AS jumlah_kontraktor,
  (SELECT COUNT(*) FROM public.industri_paksi) AS jumlah_industri,
  (SELECT COALESCE(SUM(kuantiti_tan), 0) FROM public.rekod_sisa_industri) AS jumlah_sisa_tan;

-- 7. Row Level Security (RLS) untuk Sambungan Supabase
ALTER TABLE public.kontraktor_paksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industri_paksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rekod_sisa_industri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh kontraktor_paksi" ON public.kontraktor_paksi;
CREATE POLICY "Akses penuh kontraktor_paksi"
ON public.kontraktor_paksi FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses penuh industri_paksi" ON public.industri_paksi;
CREATE POLICY "Akses penuh industri_paksi"
ON public.industri_paksi FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses penuh rekod_sisa_industri" ON public.rekod_sisa_industri;
CREATE POLICY "Akses penuh rekod_sisa_industri"
ON public.rekod_sisa_industri FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);
