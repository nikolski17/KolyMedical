-- ============================================================================
-- KolyMedical — Parche para la tabla 'users' en Supabase
-- Ejecuta este script en el editor SQL de Supabase (SQL Editor) para habilitar
-- la persistencia de especialidades médicas y disponibilidad horaria.
-- ============================================================================

-- Agregar columnas de especialidad y disponibilidad horaria
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_days int[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_start text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_end text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slot_duration int;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coordinar_solo boolean;

-- Actualizar el RLS si es necesario para asegurar acceso completo de lectura y escritura
-- (para simplificar el MVP con la clave anon)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='anon_all_users') THEN
    CREATE POLICY anon_all_users ON users FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
