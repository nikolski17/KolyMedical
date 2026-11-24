-- ============================================================================
-- KOLYTECH / KOLYMEDICAL — TABLAS DE FACTURACIÓN ELECTRÓNICA (SUNAT / NUBEFACT)
-- ============================================================================

-- 1. Configuración pública del facturador (sin tokens secretos)
create table if not exists koly_billing_config (
  id uuid primary key default gen_random_uuid(),
  ruc varchar(11) not null,
  razon_social text not null,
  direccion_fiscal text,
  provider text default 'SOLO_INTERNO', -- 'SOLO_INTERNO' | 'PSE_API' | 'SUNAT_DIRECTO'
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
  sunat_status text default 'BETA', -- 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'BETA'
  pdf_url text,
  xml_url text,
  cdr_url text,
  sunat_response jsonb,
  created_at timestamptz default now()
);

-- Habilitar RLS (Row Level Security)
alter table koly_billing_config enable row level security;
alter table koly_invoices enable row level security;

-- Eliminar políticas previas si existían
drop policy if exists "Allow read billing config for authenticated users" on koly_billing_config;
drop policy if exists "Allow modify billing config for authenticated users" on koly_billing_config;
drop policy if exists "Allow all on invoices for authenticated users" on koly_invoices;
drop policy if exists "Allow public read billing config" on koly_billing_config;
drop policy if exists "Allow public modify billing config" on koly_billing_config;
drop policy if exists "Allow public all on invoices" on koly_invoices;

-- Permitir lectura y escritura tanto para anon (cliente web) como para usuarios autenticados
create policy "Allow public read billing config"
  on koly_billing_config for select
  to anon, authenticated
  using (true);

create policy "Allow public modify billing config"
  on koly_billing_config for all
  to anon, authenticated
  using (true);

create policy "Allow public all on invoices"
  on koly_invoices for all
  to anon, authenticated
  using (true);
