-- ============================================================================
-- KolyMedical — Módulo Historia Clínica
-- Ejecuta este script UNA VEZ en el editor SQL de Supabase (SQL Editor).
-- Crea las tablas del expediente clínico y políticas RLS básicas.
-- El frontend funciona igual sin esto (cae a localStorage), pero para
-- sincronizar entre dispositivos/usuarios necesitas estas tablas.
-- ============================================================================

-- 1) Expediente clínico: una fila por paciente
-- NOTA: Si ya creaste esta tabla previamente en Supabase, ejecuta este comando en el editor SQL:
-- ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS dni text;
create table if not exists clinical_records (
  id text primary key,               -- ej. EXP-2026-0001
  patient_name text,
  patient_phone text,
  dni text,                          -- DNI / Cédula del paciente
  birth_date date,
  patient_age int,
  sex text,
  blood_type text,
  allergies text,
  family_history jsonb default '[]'::jsonb,   -- [{code, description}]
  personal_history jsonb default '[]'::jsonb, -- [{code, description}]
  created_at timestamptz default now()
);
create index if not exists idx_clinical_records_phone on clinical_records (patient_phone);

-- 2) Notas de evolución / consultas (una fila por visita)
create table if not exists evolution_notes (
  id text primary key,
  record_id text references clinical_records(id) on delete cascade,
  specialist_id text,
  appointment_id text,
  diagnosis_codes jsonb default '[]'::jsonb,  -- [{code, description}] CIE-10
  note text,
  vitals jsonb,                                -- {presion, peso, talla, ...} (opcional)
  created_at timestamptz default now()
);
create index if not exists idx_evolution_notes_record on evolution_notes (record_id);

-- 3) Recetas / órdenes emitidas
create table if not exists prescriptions (
  id text primary key,
  record_id text references clinical_records(id) on delete cascade,
  specialist_id text,
  diagnosis text,
  items jsonb default '[]'::jsonb,   -- [{tipo:'medicamento'|'estudio', ...}]
  indications text,
  created_at timestamptz default now()
);
create index if not exists idx_prescriptions_record on prescriptions (record_id);

-- 3b) Firmas digitales de los médicos (imagen base64 por especialista)
create table if not exists signatures (
  specialist_id text primary key,
  image_data text,               -- dataURL PNG en base64
  updated_at timestamptz default now()
);

-- 4) Metadata de archivos anexos (el binario va a Supabase Storage)
create table if not exists clinical_files (
  id text primary key,
  record_id text references clinical_records(id) on delete cascade,
  file_name text,
  storage_path text,
  uploaded_by text,
  created_at timestamptz default now()
);
create index if not exists idx_clinical_files_record on clinical_files (record_id);

-- ============================================================================
-- Row Level Security (RLS)
-- El frontend usa la clave anónima (anon). Para un MVP interno se permite el
-- acceso completo con la clave anon (igual que la tabla 'appointments' actual).
-- Endurece estas políticas cuando implementes autenticación real de Supabase.
-- ============================================================================
alter table clinical_records enable row level security;
alter table evolution_notes  enable row level security;
alter table prescriptions    enable row level security;
alter table signatures       enable row level security;
alter table clinical_files   enable row level security;

do $$
begin
  -- clinical_records
  if not exists (select 1 from pg_policies where tablename='clinical_records' and policyname='anon_all_clinical_records') then
    create policy anon_all_clinical_records on clinical_records for all using (true) with check (true);
  end if;
  -- evolution_notes
  if not exists (select 1 from pg_policies where tablename='evolution_notes' and policyname='anon_all_evolution_notes') then
    create policy anon_all_evolution_notes on evolution_notes for all using (true) with check (true);
  end if;
  -- prescriptions
  if not exists (select 1 from pg_policies where tablename='prescriptions' and policyname='anon_all_prescriptions') then
    create policy anon_all_prescriptions on prescriptions for all using (true) with check (true);
  end if;
  -- signatures
  if not exists (select 1 from pg_policies where tablename='signatures' and policyname='anon_all_signatures') then
    create policy anon_all_signatures on signatures for all using (true) with check (true);
  end if;
  -- clinical_files
  if not exists (select 1 from pg_policies where tablename='clinical_files' and policyname='anon_all_clinical_files') then
    create policy anon_all_clinical_files on clinical_files for all using (true) with check (true);
  end if;
end $$;

-- Realtime opcional (para sincronización en vivo):
-- alter publication supabase_realtime add table clinical_records, evolution_notes, prescriptions;
