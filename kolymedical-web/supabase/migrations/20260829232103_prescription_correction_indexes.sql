create index if not exists prescriptions_voided_by_idx
  on public.prescriptions (voided_by)
  where voided_by is not null;

create index if not exists prescriptions_updated_by_idx
  on public.prescriptions (updated_by)
  where updated_by is not null;
