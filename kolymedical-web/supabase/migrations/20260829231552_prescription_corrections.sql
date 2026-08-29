alter table public.prescriptions
  add column if not exists is_voided boolean not null default false,
  add column if not exists void_reason text,
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id);

alter table public.prescriptions
  drop constraint if exists prescriptions_void_state_check,
  add constraint prescriptions_void_state_check check (
    (not is_voided and void_reason is null and voided_at is null and voided_by is null)
    or
    (is_voided and char_length(btrim(void_reason)) between 5 and 500
      and voided_at is not null and voided_by is not null)
  ),
  drop constraint if exists prescriptions_items_array_check,
  add constraint prescriptions_items_array_check check (
    jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50
  ),
  drop constraint if exists prescriptions_text_limits_check,
  add constraint prescriptions_text_limits_check check (
    char_length(diagnosis) between 1 and 2000
    and char_length(indications) <= 5000
  );

create table if not exists private.prescription_audit (
  id bigint generated always as identity primary key,
  prescription_id text not null,
  action text not null check (action in ('updated', 'voided')),
  actor_id uuid not null,
  actor_role text,
  before_data jsonb not null,
  after_data jsonb not null,
  occurred_at timestamptz not null default statement_timestamp()
);

alter table private.prescription_audit enable row level security;
revoke all on table private.prescription_audit from public, anon, authenticated;

create or replace function private.audit_prescription_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  action_name text := 'updated';
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  -- Immutable prescription identity and provenance.
  if new.id is distinct from old.id
     or new.record_id is distinct from old.record_id
     or new.specialist_id is distinct from old.specialist_id
     or new.created_at is distinct from old.created_at then
    raise exception 'record_id cannot be changed; immutable prescription identity';
  end if;

  if old.is_voided then
    raise exception 'An annulled prescription cannot be modified';
  end if;

  if new.is_voided then
    if char_length(btrim(coalesce(new.void_reason, ''))) not between 5 and 500 then
      raise exception 'A void reason between 5 and 500 characters is required';
    end if;
    new.void_reason := btrim(new.void_reason);
    new.voided_at := statement_timestamp();
    new.voided_by := auth.uid();
    action_name := 'voided';
  else
    new.void_reason := null;
    new.voided_at := null;
    new.voided_by := null;
  end if;

  new.updated_at := statement_timestamp();
  new.updated_by := auth.uid();

  insert into private.prescription_audit
    (prescription_id, action, actor_id, actor_role, before_data, after_data)
  values
    (old.id, action_name, auth.uid(), private.current_profile_role(), to_jsonb(old), to_jsonb(new));

  return new;
end;
$$;

revoke all on function private.audit_prescription_change() from public, anon, authenticated;

drop trigger if exists prescriptions_audit_changes on public.prescriptions;
create trigger prescriptions_audit_changes
before update on public.prescriptions
for each row execute function private.audit_prescription_change();

drop policy if exists "prescriptions_admin_delete" on public.prescriptions;
revoke delete on table public.prescriptions from authenticated;
