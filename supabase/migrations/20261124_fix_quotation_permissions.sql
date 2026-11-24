-- ============================================================================
-- KOLYTECH / SUPABASE — CORRECCIÓN DE PERMISOS PARA quotation_catalog
-- Soluciona el error: 42501 permission denied for table quotation_catalog
-- ============================================================================

-- 1. Otorgar permisos de lectura a los roles de la API de Supabase
GRANT SELECT ON public.quotation_catalog TO anon, authenticated, service_role;

-- 2. Asegurar que RLS esté habilitado y permita lectura pública
ALTER TABLE public.quotation_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on quotation_catalog" ON public.quotation_catalog;

CREATE POLICY "Allow public read on quotation_catalog"
  ON public.quotation_catalog FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Otorgar permisos a service_catalog si también es consultado
GRANT SELECT ON public.service_catalog TO anon, authenticated, service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on service_catalog" ON public.service_catalog;
CREATE POLICY "Allow public read on service_catalog"
  ON public.service_catalog FOR SELECT
  TO anon, authenticated
  USING (true);
