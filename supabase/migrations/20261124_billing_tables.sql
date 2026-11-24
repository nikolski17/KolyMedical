-- ============================================================================
-- KOLYTECH / KOLYMEDICAL — TABLAS DE FACTURACIÓN ELECTRÓNICA (SUNAT / NUBEFACT)
-- ============================================================================

-- 1. Configuración pública del facturador (sin tokens secretos)
create table if not exists koly_billing_config (
  id uuid primary key default gen_random_uuid(),
  ruc varchar(11) not null,
  razon_social text not null,
  direccion_fiscal text,
  provider text default 'PSE_API', -- 'PSE_API' | 'SUNAT_DIRECTO' | 'SOLO_INTERNO'
  environment text default 'BETA', -- 'BETA' | 'PRODUCCION'
  serie_boleta varchar(4) default 'B001',
  correlativo_boleta int default 1,
  serie_factura varchar(4) default 'F001',
  correlativo_factura int default 1,
  igv_rate numeric(4,2) default 18.00,
  updated_at timestamptz default now()
);

-- 2. Historial de comprobantes emitidos
create table if not exists koly_invoices (
  id uuid primary key default gen_random_uuid(),
  doc_type varchar(10) not null, -- 'BOLETA' | 'FACTURA'
  series varchar(4) not null,
  correlative int not null,
  client_doc_type varchar(5) not null, -- 'DNI' | 'RUC'
  client_doc_number varchar(11) not null,
  client_name text not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  igv numeric(10,2) not null,
  total numeric(10,2) not null,
  sunat_status text default 'PENDIENTE', -- 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'BETA'
  pdf_url text,
  xml_url text,
  cdr_url text,
  sunat_response jsonb,
  created_at timestamptz default now()
);

-- Habilitar RLS (Row Level Security) según políticas de KolyTech
alter table koly_billing_config enable row level security;
alter table koly_invoices enable row level security;

-- Políticas de acceso para usuarios autenticados y servicio de API
create policy "Allow read billing config for authenticated users"
  on koly_billing_config for select
  using (true);

create policy "Allow modify billing config for authenticated users"
  on koly_billing_config for all
  using (true);

create policy "Allow all on invoices for authenticated users"
  on koly_invoices for all
  using (true);
