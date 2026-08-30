const clean = (value, max) => String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

export function normalizeBulletinLead(input = {}) {
  return {
    firstNames: clean(input.firstNames, 80),
    lastNames: clean(input.lastNames, 100),
    medicalLicense: clean(input.medicalLicense, 30).toUpperCase(),
    specialty: clean(input.specialty, 100),
    phone: clean(input.phone, 16),
    email: clean(input.email, 160).toLowerCase(),
    consent: input.consent === true,
    website: clean(input.website, 120)
  };
}

export function validateBulletinLead(input) {
  const value = normalizeBulletinLead(input);
  if (value.website) return { valid: false, message: 'No se pudo procesar la solicitud.' };
  if (value.firstNames.length < 2 || value.lastNames.length < 2) return { valid: false, message: 'Ingresa tus nombres y apellidos.' };
  if (!/^[A-Z0-9 .-]{4,30}$/i.test(value.medicalLicense)) return { valid: false, message: 'Ingresa una colegiatura válida, por ejemplo CMP 12345.' };
  if (!/^\+?[0-9 ]{9,16}$/.test(value.phone)) return { valid: false, message: 'Ingresa un celular válido.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.email)) return { valid: false, message: 'Ingresa un correo válido.' };
  if (!value.consent) return { valid: false, message: 'Autoriza el contacto para poder enviar tus datos.' };
  return { valid: true, value };
}

export async function submitBulletinLead(client, input) {
  const validation = validateBulletinLead(input);
  if (!validation.valid) throw new Error(validation.message);
  const value = validation.value;
  const { error } = await client.from('bulletin_medical_leads').insert({
    first_names: value.firstNames,
    last_names: value.lastNames,
    medical_license: value.medicalLicense,
    specialty: value.specialty,
    phone: value.phone,
    email: value.email,
    consent: true,
    source: 'workshop-terapia-celular-2026'
  });
  if (error && error.code === '23505') return { alreadyRegistered: true, value };
  if (error) throw new Error('No pudimos guardar tus datos. Inténtalo nuevamente.');
  return { alreadyRegistered: false, value };
}

export async function fetchBulletinLeads(client) {
  const { data, error } = await client.from('bulletin_medical_leads')
    .select('id,first_names,last_names,medical_license,specialty,phone,email,status,commercial_notes,created_at,updated_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error('No se pudieron cargar los médicos interesados.');
  return data || [];
}

export async function updateBulletinLead(client, id, status, commercialNotes = '') {
  if (!['new', 'contacted', 'enrolled', 'closed'].includes(status)) throw new Error('Estado no válido.');
  const notes = clean(commercialNotes, 1000);
  const { data, error } = await client.from('bulletin_medical_leads')
    .update({ status, commercial_notes: notes })
    .eq('id', id)
    .select('id,first_names,last_names,medical_license,specialty,phone,email,status,commercial_notes,created_at,updated_at')
    .single();
  if (error) throw new Error('No se pudo actualizar el contacto.');
  return data;
}
