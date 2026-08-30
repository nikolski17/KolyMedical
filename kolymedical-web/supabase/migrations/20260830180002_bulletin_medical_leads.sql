create table public.bulletin_medical_leads (
  id uuid primary key default gen_random_uuid(),
  first_names text not null check (char_length(btrim(first_names)) between 2 and 80),
  last_names text not null check (char_length(btrim(last_names)) between 2 and 100),
  medical_license text not null check (medical_license ~ '^[A-Za-z0-9 .-]{4,30}$'),
  specialty text not null default '' check (char_length(specialty) <= 100),
  phone text not null check (phone ~ '^\+?[0-9 ]{9,16}$'),
  email text not null check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' and char_length(email) <= 160),
  consent boolean not null check (consent),
  source text not null default 'workshop-terapia-celular-2026' check (source = 'workshop-terapia-celular-2026'),
  status text not null default 'new' check (status in ('new', 'contacted', 'enrolled', 'closed')),
  commercial_notes text not null default '' check (char_length(commercial_notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bulletin_medical_leads enable row level security;

create unique index bulletin_medical_leads_open_email_idx
  on public.bulletin_medical_leads (lower(email), source)
  where status in ('new', 'contacted', 'enrolled');
create index bulletin_medical_leads_status_created_idx
  on public.bulletin_medical_leads (status, created_at desc);

create policy "bulletin_medical_leads_public_insert"
on public.bulletin_medical_leads for insert
to anon
with check (
  consent = true
  and status = 'new'
  and commercial_notes = ''
  and source = 'workshop-terapia-celular-2026'
);

create policy "bulletin_medical_leads_staff_select"
on public.bulletin_medical_leads for select
to authenticated
using (private.current_profile_role() in ('Administrador', 'Comercial'));

create policy "bulletin_medical_leads_staff_update"
on public.bulletin_medical_leads for update
to authenticated
using (private.current_profile_role() in ('Administrador', 'Comercial'))
with check (private.current_profile_role() in ('Administrador', 'Comercial'));

revoke all on table public.bulletin_medical_leads from anon, authenticated;
grant insert (first_names, last_names, medical_license, specialty, phone, email, consent, source)
  on table public.bulletin_medical_leads to anon;
grant select on table public.bulletin_medical_leads to authenticated;
grant update (status, commercial_notes) on table public.bulletin_medical_leads to authenticated;
revoke delete on table public.bulletin_medical_leads from anon, authenticated;

create or replace function private.set_bulletin_medical_lead_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function private.set_bulletin_medical_lead_updated_at() from public, anon, authenticated;

create trigger bulletin_medical_leads_set_updated_at
before update on public.bulletin_medical_leads
for each row execute function private.set_bulletin_medical_lead_updated_at();
