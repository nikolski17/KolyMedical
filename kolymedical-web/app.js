/**
 * KolyMedical — Lógica de la Aplicación y Gestión de Citas (Local Storage & Adaptable a Supabase)
 */

// 1. Base de Datos de Configuración Inicial (Mock Data)
let SPECIALISTS = [];
const INITIAL_SPECIALISTS = [
  { id: 'pedraza', name: 'Dr. Pedraza', specialty: 'Medicina Regenerativa', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '12:00', slotDuration: 60, coordinarSolo: true },
  { id: 'licamelia', name: 'Lic. Amelia', specialty: 'Nutrición Clínica', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '16:30', slotDuration: 30 },
  { id: 'morales', name: 'Dr. Joel Morales', specialty: 'Gastroenterología', workDays: [1, 2, 3, 4, 5, 6], workStart: '10:00', workEnd: '17:00', slotDuration: 30 },
  { id: 'ruslan', name: 'Dr. Ruslan Golovliov', specialty: 'Estudio FibroScan', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '17:00', slotDuration: 30 },
  { id: 'montes', name: 'Dr. Guido Montes', specialty: 'Otorrinolaringología', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '16:30', slotDuration: 60 },
  { id: 'licmelendez', name: 'Lic. Ricardo Meléndez', specialty: 'Psicología Clínica', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '16:00', slotDuration: 45 }
];

let SERVICES = [];
const INITIAL_SERVICES = [
  { id: 'med_reg', name: 'Consulta — Medicina Regenerativa', price: 100, specialistId: 'pedraza', duration: 60 },
  { id: 'nutricion', name: 'Consulta — Nutrición Clínica', price: 150, specialistId: 'licamelia', duration: 30 },
  { id: 'gastro', name: 'Consulta — Gastroenterología', price: 100, specialistId: 'morales', duration: 60 },
  { id: 'otorrino', name: 'Consulta — Otorrinolaringología', price: 100, specialistId: 'montes', duration: 60 },
  { id: 'fibroscan', name: 'Estudio — FibroScan', price: 650, specialistId: 'ruslan', duration: 30 },
  { id: 'curacion_heridas', name: 'Curación de Heridas Crónicas (A Domicilio)', price: 350, specialistId: null, duration: 60 },
  { id: 'psicologia', name: 'Consulta — Psicología Clínica', price: 100, specialistId: 'licmelendez', duration: 60 }
];

const AGENT_CONTACTS = {
  'Brayan': { name: 'Brayan García', phone: '927942988' },
  'Andrea': { name: 'Andrea Mendoza', phone: '988776655' }
};

function formatWhatsAppPhone(phoneStr) {
  if (!phoneStr) return '';
  const clean = phoneStr.replace(/\D/g, ''); // Deja solo dígitos
  if (clean.length === 9) {
    return '51' + clean;
  }
  return clean;
}

function sendWhatsAppReminder(apt) {
  const service = SERVICES.find(s => s.id === apt.serviceId);
  const doctor = SPECIALISTS.find(d => d.id === apt.specialistId);
  const dateStr = apt.date;
  const timeStr = apt.time;
  const modality = apt.modality;

  const msg = `Hola ${apt.patientName}, te saludamos de KolyMedical. Le recordamos que tiene una cita programada para mañana ${dateStr} a las ${timeStr} (${modality}) con el ${doctor ? doctor.name : ''}. Por favor, confirme su asistencia respondiendo a este de WhatsApp. ¡Gracias!`;

  const encodedMsg = encodeURIComponent(msg);
  const cleanPhone = formatWhatsAppPhone(apt.patientPhone);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  window.open(url, '_blank');
}

// ⚠️ Citas iniciales vacías para registrar sólo datos reales
const INITIAL_APPOINTMENTS = [];

const INITIAL_USERS = [
  { username: 'admin', fullname: 'Super Administrador', password: 'admin123', role: 'Administrador' },
  { username: 'brayan', fullname: 'Brayan García', password: 'com123', role: 'Comercial', trackedBy: 'Brayan' },
  { username: 'andrea', fullname: 'Andrea Mendoza', password: 'com123', role: 'Comercial', trackedBy: 'Andrea' },
  { username: 'drpedraza', fullname: 'Dr. Pedraza', password: 'doc123', role: 'Médico', specialistId: 'pedraza', specialty: 'Medicina Regenerativa' },
  { username: 'licamelia', fullname: 'Lic. Amelia Tenorio', password: 'doc123', role: 'Nutricionista', specialistId: 'licamelia', specialty: 'Nutrición Clínica' },
  { username: 'drmorales', fullname: 'Dr. Joel Morales', password: 'doc123', role: 'Médico', specialistId: 'morales', specialty: 'Gastroenterología' },
  { username: 'drruslan', fullname: 'Dr. Ruslan Golovliov', password: 'doc123', role: 'Médico', specialistId: 'ruslan', specialty: 'Estudio FibroScan' },
  { username: 'drguido', fullname: 'Dr. Guido Montes', password: 'doc123', role: 'Médico', specialistId: 'montes', specialty: 'Otorrinolaringología' },
  { username: 'licmelendez', fullname: 'Lic. Ricardo Meléndez', password: 'doc123', role: 'Psicólogo', specialistId: 'licmelendez', specialty: 'Psicología Clínica' }
];

// Helper para generar fechas relativas a hoy
function getRelativeDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// 2. Conectividad y Adaptador de Base de Datos (Supabase con fallback Offline)
const SUPABASE_URL = "https://tounxohlvyjcwcyeddlg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdW54b2hsdnlqY3djeWVkZGxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3OTMzNTAsImV4cCI6MjA5OTM2OTM1MH0.IZtNzjH7gF4fW27dGy1R6vy-uIEFV8iOwduXYRGY03M";

let supabaseClient = null;
if (window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (err) {
    console.error("Error al inicializar el cliente de Supabase:", err);
  }
}

// Safe storage wrapper to prevent crashes in private windows / Brave Shields
const safeLocalStorage = {
  getItem: function (key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: function (key, value) {
    try { localStorage.setItem(key, value); } catch (e) { }
  },
  removeItem: function (key) {
    try { localStorage.removeItem(key); } catch (e) { }
  }
};
window.safeLocalStorage = safeLocalStorage;

const safeSessionStorage = {
  getItem: function (key) {
    try { return sessionStorage.getItem(key); } catch (e) { return this[key] || null; }
  },
  setItem: function (key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { this[key] = value; }
  },
  removeItem: function (key) {
    try { sessionStorage.removeItem(key); } catch (e) { delete this[key]; }
  }
};
window.safeSessionStorage = safeSessionStorage;

// Memoria caché local para consultas sincrónicas instantáneas
let localAppointmentsCache = [];
let localUsersCache = [];
// Módulo Historia Clínica: cachés locales (offline-first, se sincronizan con Supabase)
let localRecordsCache = [];      // clinical_records
let localNotesCache = [];        // evolution_notes
let localPrescriptionsCache = []; // prescriptions

// Inicializar caché local desde LocalStorage para soporte offline
try {
  const cachedApts = safeLocalStorage.getItem('kolymedical_appointments');
  localAppointmentsCache = cachedApts ? JSON.parse(cachedApts) : INITIAL_APPOINTMENTS;
  // Filtrar citas de prueba antiguas si existieran
  localAppointmentsCache = localAppointmentsCache.filter(a => !['apt-1', 'apt-2', 'apt-3', 'apt-4'].includes(a.id));
  safeLocalStorage.setItem('kolymedical_appointments', JSON.stringify(localAppointmentsCache));

  const cachedUsers = safeLocalStorage.getItem('kolymedical_users');
  localUsersCache = cachedUsers ? JSON.parse(cachedUsers) : INITIAL_USERS;

  const cachedSpecialists = safeLocalStorage.getItem('kolymedical_specialists');
  SPECIALISTS = cachedSpecialists ? JSON.parse(cachedSpecialists) : INITIAL_SPECIALISTS;

  // Asegurar compatibilidad para Dr. Pedraza (coordinarSolo) en perfiles de caché existentes
  const pedrazaObj = SPECIALISTS.find(d => d.id === 'pedraza');
  if (pedrazaObj && pedrazaObj.coordinarSolo === undefined) {
    pedrazaObj.coordinarSolo = true;
    safeLocalStorage.setItem('kolymedical_specialists', JSON.stringify(SPECIALISTS));
  }

  const cachedServices = safeLocalStorage.getItem('kolymedical_services');
  SERVICES = cachedServices ? JSON.parse(cachedServices) : INITIAL_SERVICES;

  // Limpieza de servicios duplicados y corrección de nombres genéricos
  if (SERVICES && SERVICES.length > 0) {
    SERVICES = SERVICES.filter(s => {
      // Eliminar el servicio antiguo predefinido si existe el nuevo autogenerado/actualizado por el sistema
      if (s.id === 'nutricion' && SERVICES.some(x => x.id === 'service_amelia')) return false;
      if (s.id === 'med_reg' && SERVICES.some(x => x.id === 'service_pedraza')) return false;
      if (s.id === 'gastro' && SERVICES.some(x => x.id === 'service_morales')) return false;
      if (s.id === 'otorrino' && SERVICES.some(x => x.id === 'service_montes')) return false;
      if (s.id === 'fibroscan' && SERVICES.some(x => x.id === 'service_ruslan')) return false;
      if (s.id === 'psicologia' && SERVICES.some(x => x.id === 'service_melendes')) return false;
      return true;
    });

    SERVICES.forEach(s => {
      if (s.id.startsWith('service_')) {
        const doc = SPECIALISTS.find(d => d.id === s.specialistId);
        if (doc) {
          // Usar acentos correctos al normalizar nombres autogenerados
          let specName = doc.specialty || 'Medicina General';
          if (specName.toLowerCase() === 'nutricionista clinica' || specName.toLowerCase() === 'nutricion clinica') {
            specName = 'Nutrición Clínica';
          }
          s.name = `Consulta — ${specName}`;
        }
      }
    });

    safeLocalStorage.setItem('kolymedical_services', JSON.stringify(SERVICES));
  }
} catch (e) {
  localAppointmentsCache = INITIAL_APPOINTMENTS;
  localUsersCache = INITIAL_USERS;
  SPECIALISTS = INITIAL_SPECIALISTS;
  SERVICES = INITIAL_SERVICES;
}

// Inicializar cachés del módulo clínico por separado (no deben tumbar los datos base si fallan)
try {
  const cachedRecords = safeLocalStorage.getItem('kolymedical_clinical_records');
  localRecordsCache = cachedRecords ? JSON.parse(cachedRecords) : [];
  const cachedNotes = safeLocalStorage.getItem('kolymedical_evolution_notes');
  localNotesCache = cachedNotes ? JSON.parse(cachedNotes) : [];
  const cachedPrescriptions = safeLocalStorage.getItem('kolymedical_prescriptions');
  localPrescriptionsCache = cachedPrescriptions ? JSON.parse(cachedPrescriptions) : [];
} catch (e) {
  localRecordsCache = [];
  localNotesCache = [];
  localPrescriptionsCache = [];
}

// Funciones de Mapeo de datos (PostgreSQL snake_case <-> Frontend camelCase)
function mapAptToDb(apt) {
  return {
    id: apt.id,
    patient_name: apt.patientName,
    patient_age: apt.patientAge,
    patient_phone: apt.patientPhone,
    patient_dni: apt.patientDni || null,
    service_id: apt.serviceId,
    specialist_id: apt.specialistId,
    date: apt.date,
    time: apt.time,
    modality: apt.modality,
    motivo_consulta: apt.motivoConsulta || null,
    meeting_link: apt.meetingLink || null,
    status: apt.status,
    tracked_by: apt.trackedBy,
    clinical_notes: apt.clinicalNotes || null,
    is_procedure: apt.isProcedure || false,
    duration_hours: apt.durationHours || 1
  };
}

function mapAptFromDb(dbApt) {
  return {
    id: dbApt.id,
    patientName: dbApt.patient_name,
    patientAge: dbApt.patient_age,
    patientPhone: dbApt.patient_phone,
    patientDni: dbApt.patient_dni || '',
    serviceId: dbApt.service_id,
    specialistId: dbApt.specialist_id,
    date: dbApt.date,
    time: dbApt.time,
    modality: dbApt.modality,
    motivoConsulta: dbApt.motivo_consulta || '',
    meetingLink: dbApt.meeting_link || '',
    status: dbApt.status,
    trackedBy: dbApt.tracked_by,
    clinicalNotes: dbApt.clinical_notes || null,
    isProcedure: dbApt.is_procedure || false,
    durationHours: dbApt.duration_hours || 1
  };
}

function mapUserToDb(u) {
  return {
    username: u.username,
    fullname: u.fullname,
    password: u.password,
    role: u.role,
    tracked_by: u.trackedBy || null,
    specialist_id: u.specialistId || null,
    specialty: u.specialty || null,
    work_days: u.workDays || null,
    work_start: u.workStart || null,
    work_end: u.workEnd || null,
    slot_duration: u.slotDuration || null,
    coordinar_solo: u.coordinarSolo !== undefined ? u.coordinarSolo : null
  };
}

function mapUserFromDb(dbU) {
  return {
    username: dbU.username,
    fullname: dbU.fullname,
    password: dbU.password,
    role: dbU.role,
    trackedBy: dbU.tracked_by || undefined,
    specialistId: dbU.specialist_id || undefined,
    specialty: dbU.specialty || undefined,
    workDays: dbU.work_days || undefined,
    workStart: dbU.work_start || undefined,
    workEnd: dbU.work_end || undefined,
    slotDuration: dbU.slot_duration || undefined,
    coordinarSolo: dbU.coordinar_solo !== undefined ? dbU.coordinar_solo : undefined
  };
}

const DB = {
  getAppointments: function () {
    return localAppointmentsCache;
  },

  saveAppointment: async function (apt) {
    apt.id = 'apt-' + Date.now();

    // Guardar en caché local inmediatamente
    localAppointmentsCache.push(apt);
    safeLocalStorage.setItem('kolymedical_appointments', JSON.stringify(localAppointmentsCache));

    // Subir a Supabase
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('appointments')
          .insert([mapAptToDb(apt)]);
        if (error) console.error('Error al insertar cita en Supabase:', error);
      } catch (err) {
        console.error('Error de red al conectar con Supabase:', err);
      }
    }
    return apt;
  },

  updateAppointmentStatus: async function (id, status) {
    if (status === 'cancelada') {
      return this.deleteAppointment(id);
    }

    // Actualizar caché local
    const index = localAppointmentsCache.findIndex(a => a.id === id);
    if (index !== -1) {
      localAppointmentsCache[index].status = status;
      safeLocalStorage.setItem('kolymedical_appointments', JSON.stringify(localAppointmentsCache));

      // Actualizar en Supabase
      if (supabaseClient) {
        try {
          const { error } = await supabaseClient
            .from('appointments')
            .update({ status: status })
            .eq('id', id);
          if (error) console.error('Error al actualizar estado en Supabase:', error);
        } catch (err) {
          console.error('Error de red al conectar con Supabase:', err);
        }
      }
      return true;
    }
    return false;
  },

  deleteAppointment: async function (id) {
    // Eliminar de caché local
    localAppointmentsCache = localAppointmentsCache.filter(a => a.id !== id);
    safeLocalStorage.setItem('kolymedical_appointments', JSON.stringify(localAppointmentsCache));

    // Eliminar en Supabase
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('appointments')
          .delete()
          .eq('id', id);
        if (error) console.error('Error al eliminar cita de Supabase:', error);
      } catch (err) {
        console.error('Error de red al conectar con Supabase:', err);
      }
    }
    return true;
  },

  updateAppointmentNotes: async function (id, notes) {
    const index = localAppointmentsCache.findIndex(a => a.id === id);
    if (index !== -1) {
      localAppointmentsCache[index].clinicalNotes = notes;
      safeLocalStorage.setItem('kolymedical_appointments', JSON.stringify(localAppointmentsCache));
      
      if (supabaseClient) {
        try {
          const { error } = await supabaseClient
            .from('appointments')
            .update({ clinical_notes: notes })
            .eq('id', id);
          if (error) console.error('Error al actualizar notas en Supabase:', error);
        } catch (err) {
          console.error('Error de red al conectar con Supabase:', err);
        }
      }
      return true;
    }
    return false;
  },

  updateAppointmentDetails: async function (id, updatedFields) {
    const index = localAppointmentsCache.findIndex(a => a.id === id);
    if (index !== -1) {
      localAppointmentsCache[index] = { ...localAppointmentsCache[index], ...updatedFields };
      safeLocalStorage.setItem('kolymedical_appointments', JSON.stringify(localAppointmentsCache));
      
      if (supabaseClient) {
        try {
          const dbData = {};
          if (updatedFields.patientName !== undefined) dbData.patient_name = updatedFields.patientName;
          if (updatedFields.patientDni !== undefined) dbData.patient_dni = updatedFields.patientDni;
          if (updatedFields.patientAge !== undefined) dbData.patient_age = updatedFields.patientAge;
          if (updatedFields.patientPhone !== undefined) dbData.patient_phone = updatedFields.patientPhone;
          if (updatedFields.modality !== undefined) dbData.modality = updatedFields.modality;
          if (updatedFields.serviceId !== undefined) dbData.service_id = updatedFields.serviceId;
          if (updatedFields.specialistId !== undefined) dbData.specialist_id = updatedFields.specialistId;
          if (updatedFields.date !== undefined) dbData.date = updatedFields.date;
          if (updatedFields.time !== undefined) dbData.time = updatedFields.time;
          if (updatedFields.trackedBy !== undefined) dbData.tracked_by = updatedFields.trackedBy;
          if (updatedFields.meetingLink !== undefined) dbData.meeting_link = updatedFields.meetingLink;
          if (updatedFields.motivoConsulta !== undefined) dbData.motivo_consulta = updatedFields.motivoConsulta;
          if (updatedFields.status !== undefined) dbData.status = updatedFields.status;
          if (updatedFields.isProcedure !== undefined) dbData.is_procedure = updatedFields.isProcedure;
          if (updatedFields.durationHours !== undefined) dbData.duration_hours = updatedFields.durationHours;
          if (updatedFields.clinicalNotes !== undefined) dbData.clinical_notes = updatedFields.clinicalNotes;

          const { error } = await supabaseClient
            .from('appointments')
            .update(dbData)
            .eq('id', id);
          if (error) console.error('Error al actualizar detalles de cita en Supabase:', error);
        } catch (err) {
          console.error('Error de red al conectar con Supabase:', err);
        }
      }
      return true;
    }
    return false;
  },

  saveSuggestion: function(name, text) {
    let stored = safeLocalStorage.getItem('kolymedical_suggestions');
    let suggestions = stored ? JSON.parse(stored) : [];
    suggestions.push({
      id: 'sug-' + Date.now(),
      name: name,
      text: text,
      date: new Date().toISOString().split('T')[0]
    });
    safeLocalStorage.setItem('kolymedical_suggestions', JSON.stringify(suggestions));
  },

  getSuggestions: function() {
    let stored = safeLocalStorage.getItem('kolymedical_suggestions');
    return stored ? JSON.parse(stored) : [];
  },

  deleteSuggestion: function(id) {
    let stored = safeLocalStorage.getItem('kolymedical_suggestions');
    if (stored) {
      let suggestions = JSON.parse(stored);
      suggestions = suggestions.filter(s => s.id !== id);
      safeLocalStorage.setItem('kolymedical_suggestions', JSON.stringify(suggestions));
    }
  },

  syncWithCloud: async function (callback) {
    if (!supabaseClient) {
      if (callback) callback();
      return;
    }

    const fetchAndMerge = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('appointments')
          .select('*');
        if (error) {
          console.error('Error al consultar citas de Supabase:', error);
          return;
        }

        if (data) {
          localAppointmentsCache = data.map(mapAptFromDb);
          safeLocalStorage.setItem('kolymedical_appointments', JSON.stringify(localAppointmentsCache));
          if (callback) callback();
        }
      } catch (err) {
        console.error('Error de conexión al sincronizar con Supabase:', err);
      }
    };

    // Consulta inicial
    await fetchAndMerge();

    // Escucha de cambios en tiempo real
    supabaseClient
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAndMerge();
        }
      )
      .subscribe();
  }
};

/* ==========================================================================
   🩺 MÓDULO HISTORIA CLÍNICA — Capa de datos (Supabase-primero → localStorage)
   Tablas Supabase asociadas: clinical_records, evolution_notes, prescriptions.
   Todas las operaciones actualizan primero la caché local (respuesta instantánea)
   y luego intentan persistir en Supabase; si falla, el dato queda offline.
   ========================================================================== */

// Normaliza texto para búsquedas/coincidencias (minúsculas, sin tildes).
function normalizeText(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Mapeos snake_case (Postgres) <-> camelCase (frontend)
function mapRecordToDb(r) {
  return {
    id: r.id,
    patient_name: r.patientName,
    patient_phone: r.patientPhone,
    dni: r.dni || null,
    birth_date: r.birthDate || null,
    patient_age: r.patientAge || null,
    sex: r.sex || null,
    blood_type: r.bloodType || null,
    allergies: r.allergies || null,
    family_history: r.familyHistory || [],
    personal_history: r.personalHistory || [],
    created_at: r.createdAt || new Date().toISOString()
  };
}
function mapRecordFromDb(d) {
  return {
    id: d.id,
    patientName: d.patient_name,
    patientPhone: d.patient_phone,
    dni: d.dni || '',
    birthDate: d.birth_date || '',
    patientAge: d.patient_age || '',
    sex: d.sex || '',
    bloodType: d.blood_type || '',
    allergies: d.allergies || '',
    familyHistory: d.family_history || [],
    personalHistory: d.personal_history || [],
    createdAt: d.created_at
  };
}
function mapNoteToDb(n) {
  return {
    id: n.id,
    record_id: n.recordId,
    specialist_id: n.specialistId || null,
    appointment_id: n.appointmentId || null,
    diagnosis_codes: n.diagnosisCodes || [],
    note: n.note || '',
    vitals: n.vitals || null,
    created_at: n.createdAt || new Date().toISOString()
  };
}
function mapNoteFromDb(d) {
  return {
    id: d.id,
    recordId: d.record_id,
    specialistId: d.specialist_id || '',
    appointmentId: d.appointment_id || '',
    diagnosisCodes: d.diagnosis_codes || [],
    note: d.note || '',
    vitals: d.vitals || null,
    createdAt: d.created_at
  };
}
function mapPrescriptionToDb(p) {
  return {
    id: p.id,
    record_id: p.recordId,
    specialist_id: p.specialistId || null,
    diagnosis: p.diagnosis || '',
    items: p.items || [],
    indications: p.indications || '',
    created_at: p.createdAt || new Date().toISOString()
  };
}
function mapPrescriptionFromDb(d) {
  return {
    id: d.id,
    recordId: d.record_id,
    specialistId: d.specialist_id || '',
    diagnosis: d.diagnosis || '',
    items: d.items || [],
    indications: d.indications || '',
    createdAt: d.created_at
  };
}

const ClinicalDB = {
  // ---------- Expedientes (clinical_records) ----------
  getRecords: function () {
    return localRecordsCache;
  },

  // Busca el expediente de un paciente por teléfono (identificador natural) o nombre.
  getRecordByPatient: function (patientPhone, patientName) {
    const phone = (patientPhone || '').trim();
    const name = normalizeText(patientName);
    return localRecordsCache.find(r =>
      (phone && r.patientPhone === phone) ||
      (name && normalizeText(r.patientName) === name)
    ) || null;
  },

  getRecordById: function (id) {
    return localRecordsCache.find(r => r.id === id) || null;
  },

  // Genera un número de expediente legible: EXP-AAAA-NNNN
  generateRecordId: function () {
    const year = new Date().getFullYear();
    const countThisYear = localRecordsCache.filter(r => (r.id || '').indexOf('EXP-' + year) === 0).length;
    const seq = (countThisYear + 1).toString().padStart(4, '0');
    return `EXP-${year}-${seq}`;
  },

  saveRecord: async function (record) {
    if (!record.id) record.id = this.generateRecordId();
    if (!record.createdAt) record.createdAt = new Date().toISOString();

    const index = localRecordsCache.findIndex(r => r.id === record.id);
    if (index !== -1) {
      localRecordsCache[index] = record;
    } else {
      localRecordsCache.push(record);
    }
    safeLocalStorage.setItem('kolymedical_clinical_records', JSON.stringify(localRecordsCache));

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('clinical_records')
          .upsert([mapRecordToDb(record)]);
        if (error) console.error('Error al guardar expediente en Supabase:', error);
      } catch (err) {
        console.error('Error de red al guardar expediente:', err);
      }
    }
    return record;
  },

  deleteRecord: async function (id) {
    localRecordsCache = localRecordsCache.filter(r => r.id !== id);
    safeLocalStorage.setItem('kolymedical_clinical_records', JSON.stringify(localRecordsCache));
    
    localNotesCache = localNotesCache.filter(n => n.recordId !== id);
    safeLocalStorage.setItem('kolymedical_evolution_notes', JSON.stringify(localNotesCache));
    
    localPrescriptionsCache = localPrescriptionsCache.filter(p => p.recordId !== id);
    safeLocalStorage.setItem('kolymedical_prescriptions', JSON.stringify(localPrescriptionsCache));

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('clinical_records')
          .delete()
          .eq('id', id);
        if (error) console.error('Error al borrar expediente de Supabase:', error);
      } catch (err) {
        console.error('Error de red al borrar expediente de Supabase:', err);
      }
    }
  },

  // Crea el expediente base a partir de los datos de una cita, si aún no existe.
  ensureRecordFromAppointment: async function (apt) {
    let record = this.getRecordByPatient(apt.patientPhone, apt.patientName);
    let isNew = false;
    if (!record) {
      isNew = true;
      record = {
        id: this.generateRecordId(),
        patientName: apt.patientName,
        patientPhone: apt.patientPhone,
        dni: apt.patientDni || '',
        birthDate: '',
        patientAge: apt.patientAge || '',
        sex: '',
        bloodType: '',
        allergies: '',
        familyHistory: [],
        personalHistory: [],
        createdAt: new Date().toISOString()
      };
    } else {
      let changed = false;
      if (apt.patientDni && record.dni !== apt.patientDni) {
        record.dni = apt.patientDni;
        changed = true;
      }
      if (apt.patientName && record.patientName !== apt.patientName) {
        record.patientName = apt.patientName;
        changed = true;
      }
      if (apt.patientAge && record.patientAge !== apt.patientAge) {
        record.patientAge = apt.patientAge;
        changed = true;
      }
      if (changed) {
        await this.saveRecord(record);
      }
    }
    if (isNew) {
      await this.saveRecord(record);
    }
    return record;
  },

  // ---------- Notas de evolución (evolution_notes) ----------
  getNotesByRecord: function (recordId) {
    return localNotesCache
      .filter(n => n.recordId === recordId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // más reciente arriba
  },

  saveEvolutionNote: async function (note) {
    if (!note.id) note.id = 'note-' + Date.now();
    if (!note.createdAt) note.createdAt = new Date().toISOString();

    localNotesCache.push(note);
    safeLocalStorage.setItem('kolymedical_evolution_notes', JSON.stringify(localNotesCache));

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('evolution_notes')
          .insert([mapNoteToDb(note)]);
        if (error) console.error('Error al guardar nota de evolución en Supabase:', error);
      } catch (err) {
        console.error('Error de red al guardar nota de evolución:', err);
      }
    }
    return note;
  },

  // ---------- Recetas / órdenes (prescriptions) ----------
  getPrescriptions: function () {
    return localPrescriptionsCache;
  },

  getPrescriptionsByRecord: function (recordId) {
    return localPrescriptionsCache
      .filter(p => p.recordId === recordId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  getPrescriptionById: function (id) {
    return localPrescriptionsCache.find(p => p.id === id) || null;
  },

  savePrescription: async function (prescription) {
    if (!prescription.id) prescription.id = 'presc-' + Date.now();
    if (!prescription.createdAt) prescription.createdAt = new Date().toISOString();

    localPrescriptionsCache.push(prescription);
    safeLocalStorage.setItem('kolymedical_prescriptions', JSON.stringify(localPrescriptionsCache));

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('prescriptions')
          .insert([mapPrescriptionToDb(prescription)]);
        if (error) console.error('Error al guardar receta en Supabase:', error);
      } catch (err) {
        console.error('Error de red al guardar receta:', err);
      }
    }
    return prescription;
  },

  // ---------- Sincronización con la nube ----------
  syncWithCloud: async function (callback) {
    if (!supabaseClient) {
      if (callback) callback();
      return;
    }
    try {
      const [recRes, noteRes, prescRes] = await Promise.all([
        supabaseClient.from('clinical_records').select('*'),
        supabaseClient.from('evolution_notes').select('*'),
        supabaseClient.from('prescriptions').select('*')
      ]);
      if (recRes.data) {
        localRecordsCache = recRes.data.map(mapRecordFromDb);
        safeLocalStorage.setItem('kolymedical_clinical_records', JSON.stringify(localRecordsCache));
      }
      if (noteRes.data) {
        localNotesCache = noteRes.data.map(mapNoteFromDb);
        safeLocalStorage.setItem('kolymedical_evolution_notes', JSON.stringify(localNotesCache));
      }
      if (prescRes.data) {
        localPrescriptionsCache = prescRes.data.map(mapPrescriptionFromDb);
        safeLocalStorage.setItem('kolymedical_prescriptions', JSON.stringify(localPrescriptionsCache));
      }
      if (callback) callback();
    } catch (err) {
      console.error('Error al sincronizar el módulo clínico con Supabase:', err);
    }
  }
};
window.ClinicalDB = ClinicalDB;

/* ==========================================================================
   ✍️ FIRMAS DE MÉDICOS — administradas por el Super Administrador.
   Se guardan como imagen (dataURL base64) por specialistId. Persisten en
   localStorage y, si Supabase está configurado, en la tabla 'signatures'.
   El PDF de receta las embebe automáticamente sobre la línea de firma.
   ========================================================================== */
let localSignaturesCache = {};
try {
  const cachedSig = safeLocalStorage.getItem('kolymedical_signatures');
  localSignaturesCache = cachedSig ? JSON.parse(cachedSig) : {};
} catch (e) {
  localSignaturesCache = {};
}

const SignatureDB = {
  get: function (specialistId) {
    if (!specialistId) return null;
    return localSignaturesCache[specialistId] || null;
  },

  has: function (specialistId) {
    return !!(specialistId && localSignaturesCache[specialistId]);
  },

  save: async function (specialistId, dataUrl) {
    if (!specialistId) return false;
    localSignaturesCache[specialistId] = dataUrl;
    safeLocalStorage.setItem('kolymedical_signatures', JSON.stringify(localSignaturesCache));
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('signatures')
          .upsert([{ specialist_id: specialistId, image_data: dataUrl, updated_at: new Date().toISOString() }]);
        if (error) {
          console.error('Error al guardar firma en Supabase:', error);
          alert('Error al guardar firma en Supabase (Base de Datos): ' + (error.message || JSON.stringify(error)));
        }
      } catch (err) {
        console.error('Error de red al guardar firma:', err);
        alert('Error de red al conectar con Supabase para guardar firma: ' + err.message);
      }
    }
    return true;
  },

  remove: async function (specialistId) {
    if (!specialistId) return false;
    delete localSignaturesCache[specialistId];
    safeLocalStorage.setItem('kolymedical_signatures', JSON.stringify(localSignaturesCache));
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('signatures').delete().eq('specialist_id', specialistId);
        if (error) {
          console.error('Error al eliminar firma en Supabase:', error);
        }
      } catch (err) {
        console.error('Error de red al eliminar firma:', err);
      }
    }
    return true;
  },

  syncWithCloud: async function (callback) {
    if (!supabaseClient) {
      if (callback) callback();
      return;
    }

    const fetchSignatures = async () => {
      try {
        const { data, error } = await supabaseClient.from('signatures').select('*');
        if (error) {
          console.error('Error al consultar firmas en Supabase:', error);
          return;
        }
        if (data) {
          data.forEach(row => { localSignaturesCache[row.specialist_id] = row.image_data; });
          safeLocalStorage.setItem('kolymedical_signatures', JSON.stringify(localSignaturesCache));
          if (callback) callback();
        }
      } catch (err) {
        console.error('Error de conexión al sincronizar firmas:', err);
      }
    };

    await fetchSignatures();

    // Suscribirse a cambios en tiempo real en la tabla de firmas
    supabaseClient
      .channel('signatures-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signatures' },
        () => {
          fetchSignatures();
        }
      )
      .subscribe();
  }
};
window.SignatureDB = SignatureDB;

/* ==========================================================================
   📚 CATÁLOGOS ESTÁTICOS (CIE-10, medicamentos, estudios) con carga diferida
   No se cargan al iniciar la app: sólo la primera vez que el médico abre el
   selector correspondiente. Se conservan en memoria durante la sesión y se
   apoya en la caché HTTP del navegador para visitas posteriores.
   ========================================================================== */
const Catalogs = {
  cie10: null,
  medicamentos: null,
  estudios: null,
  _loading: {},

  _load: async function (key, url) {
    if (this[key]) return this[key];
    if (this._loading[key]) return this._loading[key];
    this._loading[key] = (async () => {
      try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        this[key] = data;
        return data;
      } catch (err) {
        console.error('No se pudo cargar el catálogo ' + key + ' (' + url + '):', err);
        this[key] = (key === 'estudios') ? {} : [];
        return this[key];
      } finally {
        this._loading[key] = null;
      }
    })();
    return this._loading[key];
  },

  loadCie10: function () { return this._load('cie10', 'data/cie10.json'); },
  loadMedicamentos: function () { return this._load('medicamentos', 'data/medicamentos.json'); },
  loadEstudios: function () { return this._load('estudios', 'data/estudios.json'); },

  // Búsqueda liviana en cliente (Array.filter). Devuelve máx `limit` resultados.
  searchCie10: function (query, limit) {
    limit = limit || 30;
    const q = normalizeText(query).trim();
    if (!q || !this.cie10) return [];
    const results = [];
    for (let i = 0; i < this.cie10.length; i++) {
      const item = this.cie10[i];
      if (normalizeText(item.code).includes(q) || normalizeText(item.description).includes(q)) {
        results.push(item);
        if (results.length >= limit) break;
      }
    }
    return results;
  },

  searchMedicamentos: function (query, limit) {
    limit = limit || 30;
    const q = normalizeText(query).trim();
    if (!q || !this.medicamentos) return [];
    const results = [];
    for (let i = 0; i < this.medicamentos.length; i++) {
      const m = this.medicamentos[i];
      const hay = normalizeText(m.nombre_comercial + ' ' + m.nombre_generico + ' ' + m.concentracion);
      if (hay.includes(q)) {
        results.push(m);
        if (results.length >= limit) break;
      }
    }
    return results;
  },

  // Busca estudios agrupados por categoría; devuelve [{categoria, nombre}], máx `limit`.
  searchEstudios: function (query, limit) {
    limit = limit || 40;
    const q = normalizeText(query).trim();
    if (!this.estudios) return [];
    const results = [];
    for (const categoria in this.estudios) {
      for (const nombre of this.estudios[categoria]) {
        if (!q || normalizeText(nombre).includes(q) || normalizeText(categoria).includes(q)) {
          results.push({ categoria: categoria, nombre: nombre });
          if (results.length >= limit) return results;
        }
      }
    }
    return results;
  }
};
window.Catalogs = Catalogs;

// Funciones auxiliares para disponibilidad dinámica
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTimeString(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function getDoctorAvailableSlots(doctor, dateVal) {
  if (!doctor || !doctor.workDays || !doctor.workStart || !doctor.workEnd || !doctor.slotDuration) {
    return [];
  }

  // selectedDay: 0 = domingo, 1 = lunes, ..., 6 = sábado
  const selectedDay = new Date(dateVal + 'T00:00:00').getDay();
  if (!doctor.workDays.includes(selectedDay)) {
    return []; // No labora este día
  }

  const startMins = parseTimeToMinutes(doctor.workStart);
  const endMins = parseTimeToMinutes(doctor.workEnd);
  const duration = parseInt(doctor.slotDuration);

  if (duration <= 0 || startMins >= endMins) return [];

  const slots = [];
  for (let mins = startMins; mins + duration <= endMins; mins += duration) {
    slots.push(minutesToTimeString(mins));
  }
  return slots;
}

// 3. Inicialización General según la Página
document.addEventListener('DOMContentLoaded', () => {
  // Inicialización en la Página Pública (index.html)
  if (document.getElementById('public-web')) {
    initPublicWeb();
    initGalleryCarousel();
  }

  // Inicialización en el Panel de Administración (admin.html)
  if (document.getElementById('admin-dashboard')) {
    initAdminDashboard();
    initAdminThemeToggle();
    initLoginParticles();
  }

  // Inicializar iconos de Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// =============================================
// 🖼️ CARRUSEL DE GALERÍA AUTO-SCROLL
// =============================================
function initGalleryCarousel() {
  const track = document.getElementById('gallery-carousel-track');
  const dotsContainer = document.getElementById('carousel-dots');
  const btnPrev = document.getElementById('carousel-prev');
  const btnNext = document.getElementById('carousel-next');

  if (!track || !dotsContainer) return;

  const slides = track.querySelectorAll('.carousel-slide');
  if (slides.length === 0) return;

  let currentIndex = 0;
  let autoplayInterval = null;

  // Crear dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  function goToSlide(index) {
    currentIndex = index;
    const slide = slides[index];
    if (slide) {
      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: 'smooth'
      });
    }

    // Actualizar dots
    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  function nextSlide() {
    goToSlide((currentIndex + 1) % slides.length);
  }

  function prevSlide() {
    goToSlide((currentIndex - 1 + slides.length) % slides.length);
  }

  // Botones de navegación
  if (btnNext) btnNext.addEventListener('click', () => { nextSlide(); resetAutoplay(); });
  if (btnPrev) btnPrev.addEventListener('click', () => { prevSlide(); resetAutoplay(); });

  // Autoplay cada 2 segundos
  function startAutoplay() {
    autoplayInterval = setInterval(nextSlide, 2000);
  }

  function resetAutoplay() {
    clearInterval(autoplayInterval);
    startAutoplay();
  }

  startAutoplay();

  // Pausar al hacer hover sobre el carrusel
  const wrapper = track.closest('.carousel-wrapper');
  if (wrapper) {
    wrapper.addEventListener('mouseenter', () => clearInterval(autoplayInterval));
    wrapper.addEventListener('mouseleave', startAutoplay);
  }
}

/* ==========================================================================
   🌐 PÁGINA PÚBLICA & FORMULARIO DE RESERVA DE PACIENTES
   ========================================================================== */
function initPublicWeb() {
  // Acordeón de Enfermedades
  const accordionTitles = document.querySelectorAll('.accordion-title');
  accordionTitles.forEach(title => {
    title.addEventListener('click', () => {
      const content = title.nextElementSibling;
      const isVisible = content.style.display === 'block';

      // Cerrar otros
      document.querySelectorAll('.accordion-content').forEach(c => c.style.display = 'none');
      document.querySelectorAll('.accordion-title span').forEach(s => s.textContent = '▼');

      if (!isVisible) {
        content.style.display = 'block';
        title.querySelector('span').textContent = '▲';
      }
    });
  });

  // Modal de Reservas
  const modal = document.getElementById('booking-modal');
  const openModalBtns = document.querySelectorAll('.open-booking-modal');
  const closeModalBtn = document.querySelector('.modal-close');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('active');
      resetBookingForm();
    });
  });

  closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });

  // Lógica del Cajón de Tratamientos unificada en la sección principal.

  // Lógica del Formulario por Pasos
  const formSteps = document.querySelectorAll('.form-step');
  const stepDots = document.querySelectorAll('.step-dot');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  let currentStep = 0;

  // Llenar selectores del paso 1
  const selectService = document.getElementById('booking-service');
  const selectDoctor = document.getElementById('booking-doctor');
  const renderedServiceNames = new Set();
  SERVICES.forEach(s => {
    // Normalizar a minúsculas y sin acentos para evitar duplicados por variaciones de tildes
    const normalizedName = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!renderedServiceNames.has(normalizedName)) {
      renderedServiceNames.add(normalizedName);
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} — S/ ${s.price}`;
      selectService.appendChild(opt);
    }
  });

  // Evento al cambiar de servicio para autoseleccionar doctor y validar modalidad
  selectService.addEventListener('change', () => {
    const serviceVal = selectService.value;
    const selectModality = document.getElementById('booking-modality');
    const modalityNote = document.getElementById('booking-modality-note');

    selectDoctor.innerHTML = '<option value="">-- Selecciona Especialista --</option>';
    const addressGroup = document.getElementById('booking-address-group');
    if (addressGroup) addressGroup.style.display = 'none';

    if (serviceVal) {
      const service = SERVICES.find(s => s.id === serviceVal);
      let matchingDocs = [];
      if (service && service.specialistId) {
        const baseDoc = SPECIALISTS.find(d => d.id === service.specialistId);
        if (baseDoc) {
          matchingDocs = SPECIALISTS.filter(d => d.specialty === baseDoc.specialty);
        } else {
          const directDoc = SPECIALISTS.find(d => d.id === service.specialistId);
          if (directDoc) matchingDocs.push(directDoc);
        }
      }

      if (matchingDocs.length > 0) {
        matchingDocs.forEach(doc => {
          const opt = document.createElement('option');
          opt.value = doc.id;
          opt.textContent = doc.name;
          if (matchingDocs.length === 1) opt.selected = true;
          selectDoctor.appendChild(opt);
        });
        selectDoctor.disabled = (matchingDocs.length <= 1);
      } else {
        selectDoctor.disabled = true;
      }

      // Si es Fibroscan, obligar presencial por el Dr. Ruslan Golovliov
      if (serviceVal === 'fibroscan') {
        // Limpiar opción temporal si existía
        for (let i = 0; i < selectModality.options.length; i++) {
          if (selectModality.options[i].value === 'A Domicilio') {
            selectModality.remove(i);
            break;
          }
        }
        selectModality.value = 'Presencial';
        selectModality.disabled = true;
        modalityNote.innerHTML = '<i data-lucide="alert-triangle" class="icon-inline mr-1" style="color:var(--color-warning);"></i> El estudio FibroScan se realiza únicamente de forma presencial por el Dr. Ruslan Golovliov.';
        modalityNote.style.display = 'block';
      } else if (serviceVal === 'curacion_heridas') {
        // Servicio a domicilio: no cuenta con médico a cargo
        selectDoctor.innerHTML = '<option value="">No requiere médico asignado</option>';
        selectDoctor.disabled = true;
        // Asegurar que exista opción "A Domicilio"
        let hasDomicilio = false;
        for (let i = 0; i < selectModality.options.length; i++) {
          if (selectModality.options[i].value === 'A Domicilio') hasDomicilio = true;
        }
        if (!hasDomicilio) {
          const opt = document.createElement('option');
          opt.value = 'A Domicilio';
          opt.textContent = 'A Domicilio';
          selectModality.appendChild(opt);
        }
        selectModality.value = 'A Domicilio';
        selectModality.disabled = true;
        modalityNote.innerHTML = '<i data-lucide="home" class="icon-inline mr-1"></i> Servicio a domicilio (S/ 350). No cuenta con médico asignado. Indica tu dirección exacta; la reserva se coordina <strong>únicamente por WhatsApp</strong>.';
        modalityNote.style.display = 'block';
        if (addressGroup) addressGroup.style.display = 'block';
      } else {
        // Quitar opción temporal
        for (let i = 0; i < selectModality.options.length; i++) {
          if (selectModality.options[i].value === 'A Domicilio') {
            selectModality.remove(i);
            break;
          }
        }
        selectModality.disabled = false;
        modalityNote.style.display = 'none';
      }
      if (window.lucide) window.lucide.createIcons();
    } else {
      selectModality.disabled = false;
      modalityNote.style.display = 'none';
      selectDoctor.disabled = true;
    }
  });

  // Generador de horarios cuando cambia fecha o doctor
  const inputDate = document.getElementById('booking-date');
  // Bloquear fechas pasadas
  const today = new Date().toISOString().split('T')[0];
  inputDate.min = today;
  inputDate.addEventListener('change', generateTimeSlots);
  selectService.addEventListener('change', generateTimeSlots);
  selectDoctor.addEventListener('change', generateTimeSlots);

  function generateTimeSlots() {
    const dateVal = inputDate.value;
    const serviceVal = selectService.value;
    const timeGrid = document.getElementById('time-slots-grid');
    if (!timeGrid) {
      const selTimeInput = document.getElementById('booking-selected-time');
      if (selTimeInput) {
        selTimeInput.value = 'Por coordinar (Sujeto a disponibilidad de agenda)';
      }
      return;
    }
    timeGrid.innerHTML = '';

    if (!dateVal || !serviceVal) return;

    const service = SERVICES.find(s => s.id === serviceVal);
    const selectedDoctorId = selectDoctor.value || (service ? service.specialistId : null);
    const doctor = SPECIALISTS.find(d => d.id === selectedDoctorId);

    if (serviceVal === 'fibroscan' || serviceVal === 'med_reg' || (doctor && doctor.coordinarSolo)) {
      const msg = serviceVal === 'fibroscan'
        ? 'El estudio se programa solo para el día seleccionado. El asesor comercial se comunicará contigo para coordinar la hora exacta.'
        : `La consulta con el ${doctor ? doctor.name : 'especialista'} se agenda como fecha probable. Debido a la alta demanda de su agenda, nuestro equipo se comunicará contigo para coordinar la hora exacta de la cita.`;
      timeGrid.innerHTML = `<p style="color: var(--color-primary-light); font-size: 0.85rem; padding: 0.5rem; grid-column: span 4;">${msg}</p>`;
      document.getElementById('booking-selected-time').value = 'Por coordinar';
      return;
    }

    if (!doctor) {
      timeGrid.innerHTML = '<p style="color: var(--color-primary-light); font-size: 0.85rem; padding: 0.5rem; grid-column: span 4;">Este servicio se coordina por WhatsApp y no requiere selección de horario.</p>';
      return;
    }

    const availableHours = getDoctorAvailableSlots(doctor, dateVal);
    if (availableHours.length === 0) {
      timeGrid.innerHTML = '<p style="color: var(--color-danger); font-size: 0.85rem; padding: 0.5rem; grid-column: span 4;">El especialista no tiene disponibilidad para esta fecha.</p>';
      return;
    }

    // Obtener citas ya agendadas en esta fecha
    const appointments = DB.getAppointments();
    const busyTimes = appointments
      .filter(a => a.date === dateVal && a.specialistId === doctor.id && a.status !== 'cancelada')
      .map(a => a.time);

    // Renderizar horas disponibles del doctor
    availableHours.forEach(hour => {
      const isBusy = busyTimes.includes(hour);
      const slot = document.createElement('div');
      slot.className = `time-slot ${isBusy ? 'disabled' : ''}`;
      slot.textContent = hour;

      if (!isBusy) {
        slot.addEventListener('click', () => {
          document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
          slot.classList.add('selected');
          document.getElementById('booking-selected-time').value = hour;
        });
      }
      timeGrid.appendChild(slot);
    });

    // Agregar slot extra de "Horario según disponibilidad de agenda"
    const extraSlot = document.createElement('div');
    extraSlot.className = 'time-slot';
    extraSlot.textContent = 'Por coordinar (Sujeto a disponibilidad de agenda)';
    extraSlot.style.gridColumn = 'span 4';
    extraSlot.style.fontSize = '0.78rem';
    extraSlot.style.padding = '0.75rem';
    extraSlot.style.marginTop = '0.5rem';
    extraSlot.addEventListener('click', () => {
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      extraSlot.classList.add('selected');
      document.getElementById('booking-selected-time').value = 'Por coordinar (Sujeto a disponibilidad de agenda)';
    });
    timeGrid.appendChild(extraSlot);
  }

  // Navegación de Pasos
  function updateSteps() {
    formSteps.forEach((step, idx) => {
      step.classList.toggle('active', idx === currentStep);
    });
    stepDots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === currentStep);
      dot.classList.toggle('completed', idx < currentStep);
    });

    btnPrev.style.display = currentStep === 0 ? 'none' : 'block';

    if (currentStep === formSteps.length - 1) {
      btnNext.innerHTML = 'Confirmar Reserva';
      btnNext.className = 'btn btn-accent';
    } else {
      btnNext.innerHTML = 'Siguiente';
      btnNext.className = 'btn btn-primary';
    }
  }

  function isHomeCareBooking() {
    return document.getElementById('booking-service').value === 'curacion_heridas';
  }

  btnNext.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    const lastStep = formSteps.length - 1;
    if (currentStep < lastStep) {
      // Curación a domicilio: se omite el paso de fecha/hora (solo WhatsApp)
      if (isHomeCareBooking() && currentStep === 0) {
        currentStep = 2;
      } else {
        currentStep++;
      }
      updateSteps();
    } else {
      if (isHomeCareBooking()) {
        sendHomeCareWhatsApp();
      } else {
        savePatientBooking();
      }
    }
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep > 0) {
      // Regreso simétrico: si venimos del contacto en curación, volver al paso 1
      if (isHomeCareBooking() && currentStep === 2) {
        currentStep = 0;
      } else {
        currentStep--;
      }
      updateSteps();
    }
  });

  function validateStep(step) {
    if (step === 0) {
      const service = document.getElementById('booking-service').value;
      const doctor = document.getElementById('booking-doctor').value;
      const modality = document.getElementById('booking-modality').value;
      const homeCare = service === 'curacion_heridas';
      if (!service || (!homeCare && !doctor) || !modality) {
        alert('Por favor complete todos los datos del paso 1.');
        return false;
      }
    } else if (step === 1) {
      const date = document.getElementById('booking-date').value;
      const time = document.getElementById('booking-selected-time').value;
      if (!date || !time) {
        alert('Por favor elija una fecha y hora disponible.');
        return false;
      }
    } else if (step === 2) {
      const name = document.getElementById('booking-name').value.trim();
      const age = document.getElementById('booking-age').value;
      const phone = document.getElementById('booking-phone').value.trim();
      if (!name || !age || !phone) {
        alert('Por favor ingrese sus datos personales de contacto.');
        return false;
      }
      if (isHomeCareBooking()) {
        const address = document.getElementById('booking-address').value.trim();
        if (!address) {
          alert('Para el servicio a domicilio, ingrese su dirección exacta.');
          return false;
        }
      }
    }
    return true;
  }

  function savePatientBooking() {
    const serviceId = document.getElementById('booking-service').value;
    const specialistId = document.getElementById('booking-doctor').value;
    const modality = document.getElementById('booking-modality').value;
    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-selected-time').value;
    const patientName = document.getElementById('booking-name').value.trim();
    const patientDni = (document.getElementById('booking-dni').value || '').trim();
    const patientAge = parseInt(document.getElementById('booking-age').value);
    const patientPhone = document.getElementById('booking-phone').value.trim();
    const motivoConsulta = (document.getElementById('booking-motivo').value || '').trim();

    let assignedTracker = 'Brayan'; // Default fallback
    const trackers = DB_Users.getUsers().filter(u => u.role === 'Comercial' && u.trackedBy).map(u => u.trackedBy);
    const uniqueTrackers = [...new Set(trackers)];
    if (uniqueTrackers.length > 0) {
      const allApts = DB.getAppointments();
      let minTracker = uniqueTrackers[0];
      let minCount = Infinity;
      uniqueTrackers.forEach(t => {
        const count = allApts.filter(a => a.trackedBy === t).length;
        if (count < minCount) {
          minCount = count;
          minTracker = t;
        }
      });
      assignedTracker = minTracker;
    }

    const newApt = {
      patientName,
      patientDni,
      patientAge,
      patientPhone,
      serviceId,
      specialistId,
      date,
      time,
      modality,
      motivoConsulta,
      status: 'pendiente',
      trackedBy: assignedTracker
    };

    DB.saveAppointment(newApt);

    // Declarar ANTES del evento GA4 para evitar el ReferenceError (Temporal Dead Zone)
    const service = SERVICES.find(s => s.id === serviceId);
    const doctor = SPECIALISTS.find(d => d.id === specialistId);

    // Enviar evento de conversión a Google Analytics GA4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', {
        event_category: 'Reserva',
        event_label: service ? service.name : serviceId,
        value: service ? service.price : 100
      });
    }

    // Generar link de confirmación de WhatsApp
    let msgBody = `*Nueva Reserva KolyMedical*\n\n` +
      `Hola KolyMedical, deseo confirmar mi cita:\n` +
      `- *Paciente:* ${patientName} (${patientAge} años)\n`;
    if (patientDni) {
      msgBody += `- *DNI:* ${patientDni}\n`;
    }
    msgBody += `- *Servicio:* ${service.name}\n` +
      `- *Especialista:* ${doctor.name}\n` +
      `- *Fecha:* ${date}\n` +
      `- *Hora:* ${time}\n` +
      `- *Modalidad:* ${modality}\n` +
      `- *Teléfono:* ${patientPhone}\n`;
    if (motivoConsulta) {
      msgBody += `- *Motivo:* ${motivoConsulta}\n`;
    }
    const textMsg = encodeURIComponent(msgBody);
    const wsUrl = `https://wa.me/51987346934?text=${textMsg}`; // Colocar el número de WhatsApp oficial

    // Reemplazar contenido por éxito
    const modalBody = document.querySelector('.modal-content');
    modalBody.innerHTML = `
      <div style="padding: 3rem 2rem; text-align: center;">
        <div style="color: var(--color-accent); display: flex; justify-content: center; margin-bottom: 1.5rem;"><i data-lucide="check-circle" style="width: 60px; height: 60px;"></i></div>
        <h2 style="color: var(--color-primary); font-weight: 700; margin-bottom: 1rem;">¡Cita Reservada con Éxito!</h2>
        <p style="color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 2rem; max-width: 450px; margin-left: auto; margin-right: auto;">
          Tu solicitud ha sido guardada en nuestro sistema. Para agilizar el proceso y recibir recordatorios automáticos, confirma tu reserva directamente por WhatsApp.
        </p>
        <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
          <a href="${wsUrl}" target="_blank" class="btn btn-accent" style="width: 100%; max-width: 320px;">
             Confirmar por WhatsApp
          </a>
          <button onclick="location.reload()" class="btn btn-secondary" style="width: 100%; max-width: 320px;">
            Regresar a la Página
          </button>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }

  // Curación de heridas a domicilio: la web solo permite coordinar por WhatsApp.
  function sendHomeCareWhatsApp() {
    const patientName = document.getElementById('booking-name').value.trim();
    const patientDni = (document.getElementById('booking-dni').value || '').trim();
    const patientAge = parseInt(document.getElementById('booking-age').value);
    const patientPhone = document.getElementById('booking-phone').value.trim();
    const address = document.getElementById('booking-address').value.trim();
    const motivoConsulta = (document.getElementById('booking-motivo').value || '').trim();
    const service = SERVICES.find(s => s.id === 'curacion_heridas');

    const textMsg = encodeURIComponent(
      `*Solicitud de Curación de Heridas a Domicilio - KolyMedical*\n\n` +
      `Hola KolyMedical, deseo coordinar el servicio a domicilio:\n` +
      `- *Paciente:* ${patientName} (${patientAge} años)\n` +
      (patientDni ? `- *DNI:* ${patientDni}\n` : '') +
      `- *Servicio:* ${service.name}\n` +
      `- *Costo:* S/ ${service.price}\n` +
      `- *Dirección exacta:* ${address}\n` +
      `- *Teléfono:* ${patientPhone}\n` +
      (motivoConsulta ? `- *Motivo/Descripción:* ${motivoConsulta}\n` : '')
    );
    const wsUrl = `https://wa.me/51987346934?text=${textMsg}`;

    const modalBody = document.querySelector('.modal-content');
    modalBody.innerHTML = `
      <div style="padding: 3rem 2rem; text-align: center;">
        <span style="font-size: 4rem; color: var(--color-accent); display: block; margin-bottom: 1.5rem;">🏡</span>
        <h2 style="color: var(--color-primary); font-weight: 700; margin-bottom: 1rem;">Coordina tu servicio a domicilio</h2>
        <p style="color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 2rem; max-width: 450px; margin-left: auto; margin-right: auto;">
          Este servicio se coordina únicamente por WhatsApp. Envíanos tu solicitud con tu dirección exacta y un asesor confirmará la disponibilidad y el horario de la visita.
        </p>
        <div style="display: flex; flex-direction: column; gap: 1rem; align-items: center;">
          <a href="${wsUrl}" target="_blank" class="btn btn-accent" style="width: 100%; max-width: 320px;">
             Enviar solicitud por WhatsApp
          </a>
          <button onclick="location.reload()" class="btn btn-secondary" style="width: 100%; max-width: 320px;">
            Regresar a la Página
          </button>
        </div>
      </div>
    `;
  }

  function resetBookingForm() {
    document.getElementById('booking-service').value = '';
    document.getElementById('booking-doctor').innerHTML = '<option value="">-- Selecciona Especialista --</option>';
    document.getElementById('booking-modality').value = 'Presencial';
    document.getElementById('booking-modality').disabled = false;
    document.getElementById('booking-modality-note').style.display = 'none';
    document.getElementById('booking-date').value = '';
    
    const timeGridEl = document.getElementById('time-slots-grid');
    document.getElementById('booking-selected-time').value = timeGridEl ? '' : 'Por coordinar (Sujeto a disponibilidad de agenda)';
    if (timeGridEl) {
      timeGridEl.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem; padding: 0.5rem; grid-column: span 4;">Selecciona una especialidad y fecha primero.</p>';
    }

    document.getElementById('booking-name').value = '';
    document.getElementById('booking-dni').value = '';
    document.getElementById('booking-age').value = '';
    document.getElementById('booking-phone').value = '';
    document.getElementById('booking-motivo').value = '';
    const addressField = document.getElementById('booking-address');
    if (addressField) addressField.value = '';
    const addressGroupReset = document.getElementById('booking-address-group');
    if (addressGroupReset) addressGroupReset.style.display = 'none';
    currentStep = 0;
    updateSteps();
  }
}

/* ==========================================================================
   👥 PANEL DE ADMINISTRACIÓN / TRABAJADORES (admin.html)
   ========================================================================== */
let calendarCurrentDate = new Date();
let calendarViewMode = localStorage.getItem('kolymedical_calendar_view') || 'month';

// -----------------------------------------------------
// 👥 GESTIÓN DE USUARIOS / TRABAJADORES (Super Admin)
// ----------------------------------------------------- 
// (INITIAL_USERS está definido arriba del archivo, junto a INITIAL_APPOINTMENTS)

const DB_Users = {
  getUsers: function () {
    return localUsersCache;
  },

  saveUser: async function (userObj) {
    const index = localUsersCache.findIndex(u => u.username.toLowerCase() === userObj.username.toLowerCase());
    if (index !== -1) {
      localUsersCache[index] = userObj;
    } else {
      localUsersCache.push(userObj);
    }
    safeLocalStorage.setItem('kolymedical_users', JSON.stringify(localUsersCache));

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('users')
          .upsert([mapUserToDb(userObj)]);
        if (error) console.error('Error al guardar usuario en Supabase:', error);
      } catch (err) {
        console.error('Error de red al conectar con Supabase:', err);
      }
    }
    return true;
  },

  deleteUser: async function (username) {
    localUsersCache = localUsersCache.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    safeLocalStorage.setItem('kolymedical_users', JSON.stringify(localUsersCache));

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('users')
          .delete()
          .eq('username', username);
        if (error) console.error('Error al eliminar usuario en Supabase:', error);
      } catch (err) {
        console.error('Error de red al conectar con Supabase:', err);
      }
    }
    return true;
  },

  syncWithCloud: async function (callback) {
    if (!supabaseClient) {
      if (callback) callback();
      return;
    }

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .select('username, fullname, role, tracked_by, specialist_id, specialty, work_days, work_start, work_end, slot_duration, coordinar_solo');
        if (error) {
          console.error('Error al consultar usuarios en Supabase:', error);
          return;
        }

        if (data) {
          localUsersCache = data.map(mapUserFromDb);
          safeLocalStorage.setItem('kolymedical_users', JSON.stringify(localUsersCache));
          syncSpecialistsFromUsers();
          if (callback) callback();
        }
      } catch (err) {
        console.error('Error de conexión al sincronizar usuarios con Supabase:', err);
      }
    };

    await fetchUsers();

    supabaseClient
      .channel('users-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchUsers();
        }
      )
      .subscribe();
  }
};

function syncSpecialistsFromUsers() {
  const users = DB_Users.getUsers();
  users.forEach(u => {
    if (isSpecialistRole(u.role) || u.specialistId) {
      const specId = u.specialistId || generateSpecialistId(u.username);
      u.specialistId = specId;

      const specIndex = SPECIALISTS.findIndex(s => s.id === specId);
      const existingSpec = specIndex !== -1 ? SPECIALISTS[specIndex] : null;
      const realSpecialty = u.specialty || (existingSpec && existingSpec.specialty ? existingSpec.specialty : u.role);

      const specObj = {
        id: specId,
        name: u.fullname,
        specialty: realSpecialty,
        workDays: u.workDays || (existingSpec ? existingSpec.workDays : [1, 2, 3, 4, 5, 6]),
        workStart: u.workStart || (existingSpec ? existingSpec.workStart : '09:00'),
        workEnd: u.workEnd || (existingSpec ? existingSpec.workEnd : '17:00'),
        slotDuration: u.slotDuration || (existingSpec ? existingSpec.slotDuration : 30),
        coordinarSolo: u.coordinarSolo !== undefined ? u.coordinarSolo : (existingSpec ? existingSpec.coordinarSolo : (specId === 'pedraza'))
      };

      if (specIndex !== -1) {
        SPECIALISTS[specIndex] = { ...SPECIALISTS[specIndex], ...specObj };
      } else {
        SPECIALISTS.push(specObj);
      }

      // Servicio
      const serviceId = (specId === 'amelia' || specId === 'licamelia') ? 'nutricion' : ((specId === 'melendez' || specId === 'melendes' || specId === 'licmelendez') ? 'psicologia' : `service_${specId}`);
      const serviceIndex = SERVICES.findIndex(s => s.specialistId === specId || s.id === serviceId);
      const serviceObj = {
        id: serviceId,
        name: `Consulta — ${realSpecialty}`,
        price: 100,
        specialistId: specId,
        duration: u.slotDuration || 30
      };
      if (serviceIndex !== -1) {
        SERVICES[serviceIndex] = { ...SERVICES[serviceIndex], ...serviceObj };
      } else {
        SERVICES.push(serviceObj);
      }
    }
  });

  safeLocalStorage.setItem('kolymedical_specialists', JSON.stringify(SPECIALISTS));
  safeLocalStorage.setItem('kolymedical_services', JSON.stringify(SERVICES));
}

const CLINIC_QUOTES = [
  "«La medicina es el arte de acompañar al paciente en su recuperación.»",
  "«El Método KOLY: Evaluación, Diagnóstico, Plan Personalizado y Seguimiento.»",
  "«Calidad científica y empatía humana: el núcleo de nuestro cuidado.»",
  "«La medicina regenerativa abre el camino hacia la restauración biológica.»",
  "«El diagnóstico preciso guía cada paso hacia el bienestar duradero.»",
  "«Cuidar de tu salud hoy es asegurar tu bienestar del mañana.»",
  "«En KolyMedical organizamos y optimizamos tu evolución médica.»"
];

function initAdminDashboard() {
  const isLogged = safeSessionStorage.getItem('kolymedical_logged');
  const loginSection = document.getElementById('login-section');
  const dashboardSection = document.getElementById('dashboard-section');

  if (isLogged === 'true') {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'grid';
    renderDashboard();
  } else {
    loginSection.style.display = 'flex';
    dashboardSection.style.display = 'none';
    initLoginForm();
  }
}

function initLoginForm() {
  const form = document.getElementById('login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('login-user').value.trim().toLowerCase();
    const passVal = document.getElementById('login-pass').value;

    let matched = null;

    // 1) Verificación segura en el servidor (la contraseña se valida en Supabase, nunca viaja el hash)
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.rpc('verify_login', {
          p_username: userVal,
          p_password: passVal
        });
        if (!error && data && data.length > 0) {
          matched = mapUserFromDb(data[0]);
        }
      } catch (err) {
        console.error('Error al verificar login en Supabase:', err);
      }
    }

    // 2) Respaldo offline (solo si un usuario ya inició sesión antes en este equipo)
    if (!matched) {
      const users = DB_Users.getUsers();
      matched = users.find(u => u.username.toLowerCase() === userVal && u.password && u.password === passVal) || null;
    }

    if (matched) {
      safeSessionStorage.setItem('kolymedical_logged', 'true');
      safeSessionStorage.setItem('kolymedical_user', JSON.stringify(matched));
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('dashboard-section').style.display = 'grid';
      renderDashboard();
    } else {
      alert('Credenciales incorrectas.');
    }
  });
}

function renderDashboard() {
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  const menuUsers = document.getElementById('menu-users');
  const menuAvailability = document.getElementById('menu-availability');
  const roleText = document.getElementById('sidebar-user-role');

  // Dinamizar menú lateral según el rol (Comercial vs Historias Clínicas)
  const listMenuItem = document.querySelector('.sidebar-item[data-view="list"]');
  if (listMenuItem) {
    const isCommercial = currentUser && currentUser.role === 'Comercial';
    listMenuItem.style.display = isCommercial ? 'none' : 'block';
    const svgIcon = listMenuItem.querySelector('svg');
    listMenuItem.innerHTML = '';
    if (svgIcon) listMenuItem.appendChild(svgIcon);
    listMenuItem.appendChild(document.createTextNode(' Historias Clínicas'));
  }

  // Dinamizar el selector de agentes del agendamiento interno
  const trackerSelect = document.getElementById('admin-booking-tracker');
  if (trackerSelect) {
    const trackers = DB_Users.getUsers().filter(u => u.role === 'Comercial' && u.trackedBy).map(u => u.trackedBy);
    const uniqueTrackers = [...new Set(trackers)];
    if (uniqueTrackers.length > 0) {
      trackerSelect.innerHTML = uniqueTrackers.map(t => `<option value="${t}">${t}</option>`).join('');
    } else {
      trackerSelect.innerHTML = '<option value="Brayan">Brayan</option><option value="Andrea">Andrea</option>';
    }
  }

  // Mostrar rol dinámicamente arriba del menú
  if (roleText && currentUser) {
    roleText.textContent = currentUser.role === 'Médico' ? 'MÉDICO' : currentUser.role.toUpperCase();
  }

  // Mensaje de bienvenida con nombre real del usuario conectado
  const adminHeaderP = document.querySelector('.admin-header p');
  if (adminHeaderP && currentUser) {
    adminHeaderP.innerHTML = `Bienvenido, <strong>${currentUser.fullname}</strong> | Rol: <strong>${currentUser.role}</strong>`;
  }

  // Tareas de roles:
  const menuSuggestions = document.getElementById('menu-suggestions');
  const menuPrescriptions = document.getElementById('menu-prescriptions');
  if (currentUser && currentUser.role === 'Administrador') {
    if (menuUsers) menuUsers.style.display = 'block';
    if (menuAvailability) menuAvailability.style.display = 'block';
    if (menuSuggestions) menuSuggestions.style.display = 'block';
    if (menuPrescriptions) menuPrescriptions.style.display = 'block';
  } else if (currentUser && currentUser.specialistId) {
    if (menuUsers) menuUsers.style.display = 'none';
    if (menuAvailability) menuAvailability.style.display = 'none';
    if (menuSuggestions) menuSuggestions.style.display = 'none';
    if (menuPrescriptions) menuPrescriptions.style.display = 'none';
  } else if (currentUser && currentUser.role === 'Comercial') {
    if (menuUsers) menuUsers.style.display = 'none';
    if (menuAvailability) menuAvailability.style.display = 'none';
    if (menuSuggestions) menuSuggestions.style.display = 'block';
    if (menuPrescriptions) menuPrescriptions.style.display = 'block';
  } else {
    if (menuUsers) menuUsers.style.display = 'none';
    if (menuAvailability) menuAvailability.style.display = 'none';
    if (menuSuggestions) menuSuggestions.style.display = 'none';
    if (menuPrescriptions) menuPrescriptions.style.display = 'none';
  }

  // 🔒 "Ingresos Proyectados" y "Agendar Cita Interna" solo para Administrador y Comercial.
  // Los médicos/especialistas no ven estos módulos.
  const canManageBusiness = isAdminOrCommercial();
  const incomeCard = document.getElementById('stat-card-income');
  if (incomeCard) {
    incomeCard.style.display = canManageBusiness ? '' : 'none';
  }
  const bookingCard = document.getElementById('admin-booking-card');
  if (bookingCard) {
    bookingCard.style.display = canManageBusiness ? '' : 'none';
    // Si se oculta el agendamiento, la tabla "Últimas Citas" ocupa todo el ancho.
    const bookingGrid = bookingCard.parentElement;
    if (bookingGrid) {
      bookingGrid.style.gridTemplateColumns = canManageBusiness ? '1.2fr 0.8fr' : '1fr';
    }
  }
  const perfCard = document.getElementById('commercial-performance-card');
  if (perfCard) {
    perfCard.style.display = canManageBusiness ? 'block' : 'none';
  }

  // Vincular engranaje de perfil al lado del nombre de la marca
  const btnProfile = document.getElementById('btn-sidebar-profile');
  if (btnProfile) {
    btnProfile.addEventListener('click', () => {
      // Remover activas del menú lateral
      document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

      // Mostrar vista de perfil y ocultar otras
      document.querySelectorAll('.dashboard-view').forEach(sec => {
        sec.style.display = sec.id === 'view-profile' ? 'block' : 'none';
      });
      renderProfileView();
    });
  }

  // Cargar frase del día sutil en el sidebar
  const quoteBox = document.getElementById('sidebar-quote-box');
  if (quoteBox) {
    const randomQuote = CLINIC_QUOTES[Math.floor(Math.random() * CLINIC_QUOTES.length)];
    quoteBox.textContent = randomQuote;
  }

  // Navegación Sidebar
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const contentSections = document.querySelectorAll('.dashboard-view');

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const viewName = item.getAttribute('data-view');
      contentSections.forEach(sec => {
        sec.style.display = sec.id === `view-${viewName}` ? 'block' : 'none';
      });

      if (viewName === 'calendar') {
        renderCalendarWidget();
      } else if (viewName === 'list') {
        renderAppointmentsTable();
      } else if (viewName === 'users') {
        renderUsersTable();
      } else if (viewName === 'profile') {
        renderProfileView();
      } else if (viewName === 'availability') {
        renderAvailabilityView();
      } else if (viewName === 'suggestions') {
        renderSuggestionsTable();
      } else if (viewName === 'prescriptions') {
        renderAllPrescriptionsTable();
      }
    });
  });

  // Cerrar Sesión
  document.getElementById('btn-logout').addEventListener('click', () => {
    safeSessionStorage.removeItem('kolymedical_logged');
    safeSessionStorage.removeItem('kolymedical_user');
    location.reload();
  });

  // Inicializar Formularios de admin
  initAdminBookingForm();
  initUserManagementForm();
  initProfileForm();
  initAvailabilityManagement();

  // Renderizar Vista Inicial (Estadísticas, Citas y Notificaciones)
  initNotificationsHandler();
  updateStats();
  renderCalendarWidget();
  renderAppointmentsTable();
}

// -----------------------------------------------------
// 👤 VISTA: MI PERFIL (Cambiar Contraseña)
// -----------------------------------------------------
function renderProfileView() {
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (currentUser) {
    document.getElementById('profile-username').value = currentUser.username;
    document.getElementById('profile-new-password').value = '';
  }
}

function initProfileForm() {
  const form = document.getElementById('profile-password-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPass = document.getElementById('profile-new-password').value;
    const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));

    if (currentUser && newPass) {
      currentUser.password = newPass;
      DB_Users.saveUser(currentUser);
      safeSessionStorage.setItem('kolymedical_user', JSON.stringify(currentUser));
      alert('Contraseña actualizada con éxito.');
      document.getElementById('profile-new-password').value = '';
    }
  });
}

// -----------------------------------------------------
// ⏰ VISTA: DISPONIBILIDAD MÉDICA
// -----------------------------------------------------
function renderAvailabilityView() {
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (!currentUser || currentUser.role !== 'Administrador') return;

  const selectDoc = document.getElementById('availability-doctor-select');
  const containerSelect = document.getElementById('availability-doctor-select-container');
  if (!selectDoc) return;

  selectDoc.innerHTML = '';

  if (containerSelect) containerSelect.style.display = 'block';
  SPECIALISTS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name} (${d.specialty})`;
    selectDoc.appendChild(opt);
  });

  loadDoctorAvailabilityIntoForm();
}

function loadDoctorAvailabilityIntoForm() {
  const selectDoc = document.getElementById('availability-doctor-select');
  if (!selectDoc) return;
  const docId = selectDoc.value;
  if (!docId) return;

  const doctor = SPECIALISTS.find(d => d.id === docId);
  if (!doctor) return;

  const chkCoordinar = document.getElementById('avail-coordinar');
  if (chkCoordinar) {
    chkCoordinar.checked = !!doctor.coordinarSolo;
    const isCoordinar = chkCoordinar.checked;
    document.querySelectorAll('input[name="workday"]').forEach(chk => chk.disabled = isCoordinar);
    document.getElementById('avail-start').disabled = isCoordinar;
    document.getElementById('avail-end').disabled = isCoordinar;
    document.getElementById('avail-duration').disabled = isCoordinar;
  }

  const dayChecks = document.querySelectorAll('input[name="workday"]');
  dayChecks.forEach(chk => {
    chk.checked = doctor.workDays && doctor.workDays.includes(parseInt(chk.value));
  });

  document.getElementById('avail-start').value = doctor.workStart || '09:00';
  document.getElementById('avail-end').value = doctor.workEnd || '17:00';
  document.getElementById('avail-duration').value = doctor.slotDuration || '30';
}

function initAvailabilityManagement() {
  const selectDoc = document.getElementById('availability-doctor-select');
  const form = document.getElementById('availability-form');

  if (selectDoc) {
    selectDoc.addEventListener('change', loadDoctorAvailabilityIntoForm);
  }

  if (form) {
    const chkCoordinar = document.getElementById('avail-coordinar');
    if (chkCoordinar) {
      chkCoordinar.addEventListener('change', () => {
        const isCoordinar = chkCoordinar.checked;
        document.querySelectorAll('input[name="workday"]').forEach(chk => chk.disabled = isCoordinar);
        document.getElementById('avail-start').disabled = isCoordinar;
        document.getElementById('avail-end').disabled = isCoordinar;
        document.getElementById('avail-duration').disabled = isCoordinar;
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const docId = selectDoc.value;
      if (!docId) return;

      const doctorIndex = SPECIALISTS.findIndex(d => d.id === docId);
      if (doctorIndex === -1) return;

      const isCoordinar = chkCoordinar ? chkCoordinar.checked : false;

      if (isCoordinar) {
        SPECIALISTS[doctorIndex].coordinarSolo = true;
        // Valores por defecto seguros para que no rompa consultas internas
        SPECIALISTS[doctorIndex].workDays = [1, 2, 3, 4, 5, 6];
        SPECIALISTS[doctorIndex].workStart = '09:00';
        SPECIALISTS[doctorIndex].workEnd = '17:00';
        SPECIALISTS[doctorIndex].slotDuration = 60;
      } else {
        SPECIALISTS[doctorIndex].coordinarSolo = false;

        const selectedDays = [];
        const dayChecks = document.querySelectorAll('input[name="workday"]');
        dayChecks.forEach(chk => {
          if (chk.checked) {
            selectedDays.push(parseInt(chk.value));
          }
        });

        const workStart = document.getElementById('avail-start').value;
        const workEnd = document.getElementById('avail-end').value;
        const slotDuration = parseInt(document.getElementById('avail-duration').value);

        if (selectedDays.length === 0) {
          alert('Por favor, seleccione al menos un día laborable.');
          return;
        }

        if (parseTimeToMinutes(workStart) >= parseTimeToMinutes(workEnd)) {
          alert('La hora de inicio debe ser anterior a la hora de cierre.');
          return;
        }

        SPECIALISTS[doctorIndex].workDays = selectedDays;
        SPECIALISTS[doctorIndex].workStart = workStart;
        SPECIALISTS[doctorIndex].workEnd = workEnd;
        SPECIALISTS[doctorIndex].slotDuration = slotDuration;
      }

      safeLocalStorage.setItem('kolymedical_specialists', JSON.stringify(SPECIALISTS));

      // Sincronizar también en el objeto de usuario y guardar en Supabase
      const allUsers = DB_Users.getUsers();
      const userMatch = allUsers.find(u => u.specialistId === docId);
      if (userMatch) {
        userMatch.workDays = SPECIALISTS[doctorIndex].workDays;
        userMatch.workStart = SPECIALISTS[doctorIndex].workStart;
        userMatch.workEnd = SPECIALISTS[doctorIndex].workEnd;
        userMatch.slotDuration = SPECIALISTS[doctorIndex].slotDuration;
        userMatch.coordinarSolo = SPECIALISTS[doctorIndex].coordinarSolo;
        DB_Users.saveUser(userMatch);
      }

      alert('Configuración de disponibilidad guardada y sincronizada correctamente.');
    });
  }
}

// -----------------------------------------------------
// 👥 VISTA: GESTIÓN DE PERSONAL (Super Admin)
// -----------------------------------------------------
// ¿El rol corresponde a un especialista (con etiqueta, disponibilidad y firma)?
function isSpecialistRole(role) {
  return !!role && role !== 'Administrador' && role !== 'Comercial' && role !== 'Recepcionista';
}

// Genera una etiqueta (specialistId) única a partir del nombre de usuario.
function generateSpecialistId(username, excludeId) {
  let base = (username || 'medico').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  if (!base) base = 'medico';
  let candidate = base;
  let n = 1;
  while (SPECIALISTS.some(s => s.id === candidate && candidate !== excludeId)) {
    candidate = base + (++n);
  }
  return candidate;
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = DB_Users.getUsers();
  users.forEach(u => {
    const spec = u.specialistId ? SPECIALISTS.find(s => s.id === u.specialistId) : null;
    const roleLabel = spec && spec.specialty ? `${u.role} · ${spec.specialty}` : u.role;

    // Celda de firma: solo aplica a especialistas; muestra estado y botón de carga.
    let firmaCell = '<span style="color:var(--color-text-muted); font-size:0.8rem;">—</span>';
    if (u.specialistId) {
      const hasSig = SignatureDB.has(u.specialistId);
      firmaCell = `
        <div style="display:flex; align-items:center; gap:0.4rem;">
          <span title="${hasSig ? 'Firma cargada' : 'Sin firma'}" style="display: inline-flex; align-items: center;">
            ${hasSig ? '<i data-lucide="check" class="icon-inline" style="color:var(--color-accent); width:16px; height:16px; top:0;"></i>' : '<i data-lucide="x" class="icon-inline" style="color:var(--color-danger); width:16px; height:16px; top:0;"></i>'}
          </span>
          <button class="btn btn-secondary btn-sign-user align-icon-text" data-username="${u.username}" style="padding:0.2rem 0.5rem; font-size:0.75rem;">
            <i data-lucide="pen-tool" class="icon-inline" style="width:12px; height:12px; top:0;"></i> Firma
          </button>
        </div>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.username}</strong>${u.specialistId ? `<br><code style="font-size:0.7rem; color:var(--color-text-muted);">${u.specialistId}</code>` : ''}</td>
      <td>${u.fullname}</td>
      <td><span class="status-badge ${u.role === 'Administrador' ? 'status-realizada' : 'status-confirmada'}">${roleLabel}</span></td>
      <td>${firmaCell}</td>
      <td>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary btn-edit-user align-icon-text" data-username="${u.username}" style="padding:0.2rem 0.5rem; font-size:0.8rem; justify-content:center;">
            <i data-lucide="edit" class="icon-inline" style="width:14px; height:14px; top:0;"></i>
          </button>
          <button class="btn btn-secondary btn-delete-user align-icon-text" data-username="${u.username}" style="padding:0.2rem 0.5rem; font-size:0.8rem; color:var(--color-danger); border-color:var(--color-danger); justify-content:center;" ${u.username === 'admin' ? 'disabled' : ''}>
            <i data-lucide="trash-2" class="icon-inline" style="width:14px; height:14px; top:0;"></i>
          </button>
        </div>
      </td>
    `;

    tr.querySelector('.btn-edit-user').addEventListener('click', () => editUserAccount(u));
    tr.querySelector('.btn-delete-user').addEventListener('click', () => {
      if (confirm(`¿Está seguro de eliminar la cuenta del trabajador ${u.fullname}?`)) {
        if (u.specialistId) {
          SPECIALISTS = SPECIALISTS.filter(s => s.id !== u.specialistId);
          SERVICES = SERVICES.filter(s => s.specialistId !== u.specialistId);
          safeLocalStorage.setItem('kolymedical_specialists', JSON.stringify(SPECIALISTS));
          safeLocalStorage.setItem('kolymedical_services', JSON.stringify(SERVICES));

          const filterDocSelect = document.getElementById('admin-filter-doctor');
          if (filterDocSelect) {
            filterDocSelect.innerHTML = '<option value="">-- Filtrar por Especialista (Todos) --</option>';
            SPECIALISTS.forEach(d => {
              const opt = document.createElement('option');
              opt.value = d.id;
              opt.textContent = d.name;
              filterDocSelect.appendChild(opt);
            });
          }

          const adminBookingService = document.getElementById('admin-booking-service');
          if (adminBookingService) {
            adminBookingService.innerHTML = '<option value="">-- Selecciona Servicio --</option>';
            const adminRenderedServiceNames = new Set();
            SERVICES.forEach(s => {
              const normalizedName = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
              if (!adminRenderedServiceNames.has(normalizedName)) {
                adminRenderedServiceNames.add(normalizedName);
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.name} — S/ ${s.price}`;
                adminBookingService.appendChild(opt);
              }
            });
          }

          if (typeof renderAvailabilityView === 'function') {
            renderAvailabilityView();
          }
        }
        DB_Users.deleteUser(u.username);
        renderUsersTable();
      }
    });
    const signBtn = tr.querySelector('.btn-sign-user');
    if (signBtn) {
      signBtn.addEventListener('click', () => openSignatureManager(u));
    }

    tbody.appendChild(tr);
  });
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Modal para cargar / previsualizar / quitar la firma de un médico (solo Super Admin).
function openSignatureManager(user) {
  if (!user.specialistId) {
    alert('Este usuario no es un especialista con etiqueta, no puede tener firma.');
    return;
  }
  const prev = document.getElementById('signature-modal');
  if (prev) prev.remove();

  const existing = SignatureDB.get(user.specialistId);
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'signature-modal';
  modal.style.zIndex = '4200';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:480px; width:94%; padding:1.5rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3 style="color:var(--color-primary); font-weight:700; margin:0; font-size:1.1rem;">Firma de ${user.fullname}</h3>
        <button id="sig-close" style="font-size:1.5rem; line-height:1; color:var(--color-text-muted);">&times;</button>
      </div>
      <p style="font-size:0.82rem; color:var(--color-text-muted); margin-bottom:1rem;">Etiqueta: <code>${user.specialistId}</code>. Sube una imagen PNG/JPG de la firma (fondo transparente recomendado). Aparecerá en las recetas y órdenes de este médico.</p>
      <div id="sig-preview" style="border:1px dashed var(--color-border); border-radius:var(--border-radius-sm); padding:1rem; text-align:center; margin-bottom:1rem; min-height:90px; display:flex; align-items:center; justify-content:center; background:#fff;">
        ${existing ? `<img src="${existing}" alt="Firma" style="max-height:120px; max-width:100%;">` : '<span style="color:var(--color-text-muted); font-size:0.85rem;">Sin firma cargada.</span>'}
      </div>
      <input type="file" id="sig-file" accept="image/png,image/jpeg" style="font-size:0.85rem; margin-bottom:1rem;">
      <div style="display:flex; justify-content:space-between; gap:0.75rem;">
        <button class="btn btn-secondary" id="sig-remove" ${existing ? '' : 'disabled'} style="color:var(--color-danger); border-color:var(--color-danger);">Quitar firma</button>
        <button class="btn btn-accent" id="sig-save" disabled>Guardar firma</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let pendingDataUrl = null;
  const fileInput = modal.querySelector('#sig-file');
  const saveBtn = modal.querySelector('#sig-save');
  const preview = modal.querySelector('#sig-preview');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('La imagen es muy grande (máx. 1 MB). Usa una firma más ligera.');
      fileInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingDataUrl = reader.result;
      preview.innerHTML = `<img src="${pendingDataUrl}" alt="Firma" style="max-height:120px; max-width:100%;">`;
      saveBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });

  modal.querySelector('#sig-close').addEventListener('click', () => modal.remove());
  saveBtn.addEventListener('click', async () => {
    if (!pendingDataUrl) return;
    await SignatureDB.save(user.specialistId, pendingDataUrl);
    modal.remove();
    renderUsersTable();
    alert('Firma guardada. Se incluirá en las próximas recetas de este médico.');
  });
  modal.querySelector('#sig-remove').addEventListener('click', async () => {
    if (confirm('¿Quitar la firma de este médico?')) {
      await SignatureDB.remove(user.specialistId);
      modal.remove();
      renderUsersTable();
    }
  });
}

function renderSuggestionsTable() {
  const tbody = document.getElementById('suggestions-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const suggestions = DB.getSuggestions();
  if (suggestions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--color-text-muted); padding:2rem;">No hay sugerencias en el buzón.</td></tr>';
    return;
  }

  suggestions.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.date}</td>
      <td><strong>${s.name}</strong></td>
      <td>${s.text}</td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-delete-suggestion" data-id="${s.id}" style="padding:0.2rem 0.5rem; font-size:0.8rem; color:var(--color-danger); border-color:var(--color-danger);">🗑️</button>
      </td>
    `;

    tr.querySelector('.btn-delete-suggestion').addEventListener('click', () => {
      if (confirm('¿Está seguro de eliminar esta sugerencia permanentemente?')) {
        DB.deleteSuggestion(s.id);
        renderSuggestionsTable();
      }
    });

    tbody.appendChild(tr);
  });
}

function initUserManagementForm() {
  const form = document.getElementById('admin-user-form');
  if (!form) return;

  const roleSelect = document.getElementById('user-role');
  const usernameInput = document.getElementById('user-username');
  const specGroup = document.getElementById('user-specialty-group');
  const priceGroup = document.getElementById('user-price-group');
  const etiquetaGroup = document.getElementById('user-etiqueta-group');
  const etiquetaInput = document.getElementById('user-etiqueta');

  function updateVisibility() {
    const role = roleSelect.value;
    const username = usernameInput.value.trim();
    const editId = document.getElementById('user-edit-id').value;

    if (isSpecialistRole(role)) {
      specGroup.style.display = 'block';
      etiquetaGroup.style.display = 'block';
      if (priceGroup) priceGroup.style.display = 'block';
      if (!etiquetaInput.value || !editId) {
        etiquetaInput.value = generateSpecialistId(username, editId);
      }
    } else {
      specGroup.style.display = 'none';
      etiquetaGroup.style.display = 'none';
      if (priceGroup) priceGroup.style.display = 'none';
      document.getElementById('user-specialty').value = '';
      if (priceGroup) document.getElementById('user-price').value = '';
      etiquetaInput.value = '';
    }
  }

  roleSelect.addEventListener('change', updateVisibility);
  usernameInput.addEventListener('input', () => {
    const role = roleSelect.value;
    const editId = document.getElementById('user-edit-id').value;
    if (isSpecialistRole(role)) {
      etiquetaInput.value = generateSpecialistId(usernameInput.value.trim(), editId);
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const fullname = document.getElementById('user-fullname').value.trim();
    const password = document.getElementById('user-password').value;
    const role = roleSelect.value;
    const editId = document.getElementById('user-edit-id').value;
    const specialty = document.getElementById('user-specialty').value.trim();
    const specialistId = etiquetaInput.value.trim();
    const priceVal = priceGroup ? parseInt(document.getElementById('user-price').value, 10) : 100;

    const newUser = {
      username,
      fullname,
      password,
      role
    };

    // Si estamos editando y cambiamos de usuario
    if (editId && editId !== username) {
      const oldUser = DB_Users.getUsers().find(u => u.username === editId);
      // Eliminar el viejo de los especialistas y servicios si era especialista
      if (oldUser && oldUser.specialistId) {
        SPECIALISTS = SPECIALISTS.filter(s => s.id !== oldUser.specialistId);
        SERVICES = SERVICES.filter(s => s.specialistId !== oldUser.specialistId);
      }
      DB_Users.deleteUser(editId); // Eliminar el viejo para evitar duplicados si cambia de login
    }

    if (isSpecialistRole(role)) {
      const specId = specialistId || generateSpecialistId(username, editId);
      newUser.specialistId = specId;
      newUser.specialty = specialty || role;

      // Registrar o actualizar en SPECIALISTS
      const specIndex = SPECIALISTS.findIndex(s => s.id === specId);
      if (specIndex !== -1) {
        SPECIALISTS[specIndex].name = fullname;
        SPECIALISTS[specIndex].specialty = specialty || role;
      } else {
        SPECIALISTS.push({
          id: specId,
          name: fullname,
          specialty: specialty || role,
          workDays: [1, 2, 3, 4, 5, 6],
          workStart: '09:00',
          workEnd: '17:00',
          slotDuration: 30
        });
      }
      safeLocalStorage.setItem('kolymedical_specialists', JSON.stringify(SPECIALISTS));

      // Registrar o actualizar en SERVICES
      const serviceId = `service_${specId}`;
      const serviceIndex = SERVICES.findIndex(s => s.specialistId === specId);
      const servicePrice = isNaN(priceVal) ? 100 : priceVal;
      if (serviceIndex !== -1) {
        SERVICES[serviceIndex].name = `Consulta — ${fullname} (${specialty || role})`;
        SERVICES[serviceIndex].price = servicePrice;
      } else {
        SERVICES.push({
          id: serviceId,
          name: `Consulta — ${fullname} (${specialty || role})`,
          price: servicePrice,
          specialistId: specId,
          duration: 30
        });
      }
      safeLocalStorage.setItem('kolymedical_services', JSON.stringify(SERVICES));
    } else {
      // Si se editó y se cambió de rol especialista a no especialista, remover de los recursos
      if (editId) {
        const oldUser = DB_Users.getUsers().find(u => u.username === editId);
        if (oldUser && oldUser.specialistId) {
          SPECIALISTS = SPECIALISTS.filter(s => s.id !== oldUser.specialistId);
          SERVICES = SERVICES.filter(s => s.specialistId !== oldUser.specialistId);
          safeLocalStorage.setItem('kolymedical_specialists', JSON.stringify(SPECIALISTS));
          safeLocalStorage.setItem('kolymedical_services', JSON.stringify(SERVICES));
        }
      }
    }

    DB_Users.saveUser(newUser);
    alert('Usuario guardado con éxito.');
    resetUserForm();
    renderUsersTable();
    
    // Refrescar selectores de la UI
    const filterDocSelect = document.getElementById('admin-filter-doctor');
    if (filterDocSelect) {
      filterDocSelect.innerHTML = '<option value="">-- Filtrar por Especialista (Todos) --</option>';
      SPECIALISTS.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        filterDocSelect.appendChild(opt);
      });
    }

    const adminBookingService = document.getElementById('admin-booking-service');
    if (adminBookingService) {
      adminBookingService.innerHTML = '<option value="">-- Selecciona Servicio --</option>';
      const adminRenderedServiceNames = new Set();
      SERVICES.forEach(s => {
        const normalizedName = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if (!adminRenderedServiceNames.has(normalizedName)) {
          adminRenderedServiceNames.add(normalizedName);
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.name} — S/ ${s.price}`;
          adminBookingService.appendChild(opt);
        }
      });
    }

    if (typeof renderAvailabilityView === 'function') {
      renderAvailabilityView();
    }
  });

  document.getElementById('btn-cancel-user-edit').addEventListener('click', resetUserForm);
}

function editUserAccount(user) {
  document.getElementById('user-form-title').textContent = 'Editar Trabajador';
  document.getElementById('user-edit-id').value = user.username;
  document.getElementById('user-username').value = user.username;
  document.getElementById('user-fullname').value = user.fullname;
  document.getElementById('user-password').value = user.password;
  document.getElementById('user-role').value = user.role;

  const specGroup = document.getElementById('user-specialty-group');
  const priceGroup = document.getElementById('user-price-group');
  const etiquetaGroup = document.getElementById('user-etiqueta-group');
  const spec = user.specialistId ? SPECIALISTS.find(s => s.id === user.specialistId) : null;

  if (isSpecialistRole(user.role)) {
    specGroup.style.display = 'block';
    etiquetaGroup.style.display = 'block';
    if (priceGroup) priceGroup.style.display = 'block';
    document.getElementById('user-specialty').value = spec ? spec.specialty : '';
    document.getElementById('user-etiqueta').value = user.specialistId || '';
    
    // Rellenar precio
    const service = SERVICES.find(s => s.specialistId === user.specialistId);
    if (priceGroup && service) {
      document.getElementById('user-price').value = service.price;
    }
  } else {
    specGroup.style.display = 'none';
    etiquetaGroup.style.display = 'none';
    if (priceGroup) priceGroup.style.display = 'none';
    document.getElementById('user-specialty').value = '';
    document.getElementById('user-etiqueta').value = '';
    if (priceGroup) document.getElementById('user-price').value = '';
  }

  document.getElementById('btn-cancel-user-edit').style.display = 'block';
}

function resetUserForm() {
  document.getElementById('user-form-title').textContent = 'Registrar Nuevo Trabajador';
  document.getElementById('user-edit-id').value = '';
  document.getElementById('admin-user-form').reset();
  document.getElementById('user-specialty-group').style.display = 'none';
  if (document.getElementById('user-price-group')) {
    document.getElementById('user-price-group').style.display = 'none';
  }
  document.getElementById('user-etiqueta-group').style.display = 'none';
  document.getElementById('btn-cancel-user-edit').style.display = 'none';
}

// Actualizar Tarjetas de Estadísticas
function updateStats() {
  let appointments = DB.getAppointments();

  // Filtrar citas si el usuario es Médico / Especialista o Comercial
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (currentUser) {
    if (currentUser.specialistId) {
      appointments = appointments.filter(a => a.specialistId === currentUser.specialistId && a.serviceId !== 'curacion_heridas');
    } else if (currentUser.role === 'Comercial' && currentUser.trackedBy) {
      appointments = appointments.filter(a => a.trackedBy === currentUser.trackedBy);
    }
  }

  const total = appointments.length;
  const pendientes = appointments.filter(a => a.status === 'pendiente').length;
  const realizadas = appointments.filter(a => a.status === 'realizada').length;

  // Calcular Ingresos generados basados en las citas confirmadas o realizadas
  const ingresos = appointments
    .filter(a => a.status === 'realizada' || a.status === 'confirmada')
    .reduce((sum, a) => {
      const service = SERVICES.find(s => s.id === a.serviceId);
      return sum + (service ? service.price : 0);
    }, 0);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-pending').textContent = pendientes;
  document.getElementById('stat-completed').textContent = realizadas;
  document.getElementById('stat-income').textContent = `S/ ${ingresos}`;

  // Conteo de rendimiento comercial dinámico
  const allAppointments = DB.getAppointments();
  const trackers = DB_Users.getUsers().filter(u => u.role === 'Comercial' && u.trackedBy);
  const container = document.getElementById('commercial-performance-container');
  if (container) {
    container.innerHTML = trackers.map(u => {
      const count = allAppointments.filter(a => a.trackedBy === u.trackedBy).length;
      return `
        <div style="background: rgba(61, 90, 115, 0.05); padding: 1.25rem; border-radius: var(--border-radius-sm); text-align: center; border: 1px solid rgba(61,90,115,0.08);">
          <h4 style="color: var(--color-primary-dark); font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600;">${u.fullname}</h4>
          <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-primary);">${count} cita${count === 1 ? '' : 's'}</div>
        </div>
      `;
    }).join('');
  }

  // Actualizar bandeja de notificaciones en la cabecera
  renderNotifications();
}

function renderNotifications() {
  const dropdownContainer = document.getElementById('notifications-dropdown-container');
  if (!dropdownContainer) return;

  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (!currentUser || (currentUser.role !== 'Administrador' && currentUser.role !== 'Comercial')) {
    dropdownContainer.style.display = 'none';
    return;
  }
  dropdownContainer.style.display = 'inline-block';

  let appointments = DB.getAppointments();
  if (currentUser.role === 'Comercial' && currentUser.trackedBy) {
    appointments = appointments.filter(a => a.trackedBy === currentUser.trackedBy);
  }

  // Notificaciones: solicitudes pendientes o con hora "Por coordinar"
  const pendingApts = appointments.filter(a => a.status === 'pendiente' || a.time === 'Por coordinar' || (a.time && a.time.includes('Por coordinar')));

  const badge = document.getElementById('notifications-badge');
  const list = document.getElementById('notifications-list');

  if (badge) {
    if (pendingApts.length > 0) {
      badge.textContent = pendingApts.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  if (list) {
    if (pendingApts.length === 0) {
      list.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--color-text-muted); font-size: 0.8rem; margin: 0;">No hay notificaciones nuevas.</p>';
    } else {
      list.innerHTML = '';
      pendingApts.forEach(apt => {
        const service = SERVICES.find(s => s.id === apt.serviceId);
        const item = document.createElement('div');
        item.style.cssText = 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--color-border); cursor: pointer; transition: var(--transition-fast);';
        item.className = 'notification-item';
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.25rem;">
            <strong style="font-size:0.85rem; color:var(--color-primary-dark);">${apt.patientName}</strong>
            <span class="status-badge status-pendiente" style="font-size:0.65rem; padding:0.1rem 0.35rem;">NUEVA</span>
          </div>
          <p style="margin:0 0 0.4rem 0; font-size:0.78rem; color:var(--color-text-muted); line-height: 1.3;">
            ${service ? service.name : 'Consulta'}<br>
            Teléfono: <strong style="color:var(--color-accent);">${apt.patientPhone}</strong><br>
            Fecha: ${apt.date} | ${apt.time}
          </p>
          <button class="btn btn-accent btn-notify-action" style="padding:0.25rem 0.5rem; font-size:0.72rem; width:100%; text-align:center; height:auto;">
            Coordinar / Editar Cita
          </button>
        `;
        item.addEventListener('click', () => {
          const menu = document.getElementById('notifications-menu');
          if (menu) menu.style.display = 'none';
          showAppointmentDetail(apt);
        });
        list.appendChild(item);
      });
    }
  }
}

function initNotificationsHandler() {
  const toggleBtn = document.getElementById('btn-notifications-toggle');
  const menu = document.getElementById('notifications-menu');
  const clearBtn = document.getElementById('btn-clear-notifications');

  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (menu && !menu.contains(e.target) && e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
        menu.style.display = 'none';
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const badge = document.getElementById('notifications-badge');
      if (badge) badge.style.display = 'none';
      if (menu) menu.style.display = 'none';
    });
  }
}

// 📅 Renderizar Calendario Visual Interactivo
function timeToMinutesOffset(timeStr) {
  if (!timeStr) return 0;
  if (timeStr === 'Por coordinar') return -1; // Señal especial para citas sin hora fija
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return -1; // Protección contra formatos inesperados
  const totalMin = hours * 60 + minutes;
  return totalMin - 480; // Minutos transcurridos desde las 08:00 (480 minutos)
}

function renderCalendarWidget() {
  const container = document.getElementById('calendar-widget-container');
  if (!container) return;
  container.innerHTML = '';

  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();

  const monthsNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // A. CABECERA: TÍTULO, BOTONES DE NAVEGACIÓN Y ALTERNANCIA DE VISTA
  const header = document.createElement('div');
  header.className = 'calendar-header';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.flexWrap = 'wrap';
  header.style.gap = '1rem';
  header.style.marginBottom = '1.5rem';

  // Lado izquierdo: Navegación y título
  const navGroup = document.createElement('div');
  navGroup.style.display = 'flex';
  navGroup.style.alignItems = 'center';
  navGroup.style.gap = '1rem';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'calendar-nav-btn';
  prevBtn.id = 'cal-btn-prev';
  prevBtn.textContent = '◀ Anterior';

  // Título dinámico
  const title = document.createElement('h3');
  title.style.fontWeight = '700';
  title.style.margin = '0';
  title.style.fontSize = '1.15rem';

  let headerText = '';
  if (calendarViewMode === 'month') {
    headerText = `${monthsNames[month]} ${year}`;
  } else if (calendarViewMode === 'week') {
    const currentDay = calendarCurrentDate.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const mon = new Date(calendarCurrentDate);
    mon.setDate(calendarCurrentDate.getDate() + distanceToMonday);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    
    const formatLabel = (d) => `${d.getDate()} de ${monthsNames[d.getMonth()]}`;
    headerText = `Semana del ${formatLabel(mon)} al ${formatLabel(sun)}, ${sun.getFullYear()}`;
  } else if (calendarViewMode === 'day') {
    const dayOfWeekNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    headerText = `${dayOfWeekNames[calendarCurrentDate.getDay()]} ${calendarCurrentDate.getDate()} de ${monthsNames[month]}, ${year}`;
  }
  title.textContent = headerText;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'calendar-nav-btn';
  nextBtn.id = 'cal-btn-next';
  nextBtn.textContent = 'Siguiente ▶';

  navGroup.appendChild(prevBtn);
  navGroup.appendChild(title);
  navGroup.appendChild(nextBtn);

  // Lado derecho: Selector de vista (Mes, Semana, Día)
  const toggles = document.createElement('div');
  toggles.className = 'calendar-view-toggles';
  toggles.innerHTML = `
    <button class="cal-view-btn ${calendarViewMode === 'month' ? 'active' : ''}" id="cal-view-month">Mes</button>
    <button class="cal-view-btn ${calendarViewMode === 'week' ? 'active' : ''}" id="cal-view-week">Semana</button>
    <button class="cal-view-btn ${calendarViewMode === 'day' ? 'active' : ''}" id="cal-view-day">Día</button>
  `;

  header.appendChild(navGroup);
  header.appendChild(toggles);
  container.appendChild(header);

  // Registrar eventos de navegación según modo de vista
  prevBtn.addEventListener('click', () => {
    if (calendarViewMode === 'month') {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
    } else if (calendarViewMode === 'week') {
      calendarCurrentDate.setDate(calendarCurrentDate.getDate() - 7);
    } else if (calendarViewMode === 'day') {
      calendarCurrentDate.setDate(calendarCurrentDate.getDate() - 1);
    }
    renderCalendarWidget();
  });

  nextBtn.addEventListener('click', () => {
    if (calendarViewMode === 'month') {
      calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
    } else if (calendarViewMode === 'week') {
      calendarCurrentDate.setDate(calendarCurrentDate.getDate() + 7);
    } else if (calendarViewMode === 'day') {
      calendarCurrentDate.setDate(calendarCurrentDate.getDate() + 1);
    }
    renderCalendarWidget();
  });

  // Registrar eventos de cambio de vista
  toggles.querySelector('#cal-view-month').addEventListener('click', () => {
    calendarViewMode = 'month';
    localStorage.setItem('kolymedical_calendar_view', 'month');
    renderCalendarWidget();
  });
  toggles.querySelector('#cal-view-week').addEventListener('click', () => {
    calendarViewMode = 'week';
    localStorage.setItem('kolymedical_calendar_view', 'week');
    renderCalendarWidget();
  });
  toggles.querySelector('#cal-view-day').addEventListener('click', () => {
    calendarViewMode = 'day';
    localStorage.setItem('kolymedical_calendar_view', 'day');
    renderCalendarWidget();
  });

  // B. OBTENER Y FILTRAR CITAS
  let appointments = DB.getAppointments();
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (currentUser) {
    if (currentUser.specialistId) {
      appointments = appointments.filter(a => a.specialistId === currentUser.specialistId && a.serviceId !== 'curacion_heridas');
    } else if (currentUser.role === 'Comercial' && currentUser.trackedBy) {
      appointments = appointments.filter(a => a.trackedBy === currentUser.trackedBy);
    }
  }

  // C. DIBUJAR LA VISTA DE ACUERDO AL MODO ACTIVO
  if (calendarViewMode === 'month') {
    // ------------------ VISTA MENSUAL ------------------
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';

    const daysHeader = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    daysHeader.forEach(day => {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-header';
      cell.textContent = day;
      grid.appendChild(cell);
    });

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    let startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Mes anterior
    for (let i = startOffset; i > 0; i--) {
      const day = prevMonthTotalDays - i + 1;
      const cell = document.createElement('div');
      cell.className = 'calendar-cell other-month';
      cell.innerHTML = `<div class="calendar-cell-date">${day}</div>`;
      grid.appendChild(cell);
    }

    // Mes actual
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';

      const formattedDay = day < 10 ? '0' + day : day;
      const formattedMonth = (month + 1) < 10 ? '0' + (month + 1) : (month + 1);
      const dateString = `${year}-${formattedMonth}-${formattedDay}`;

      const dateHeader = document.createElement('div');
      dateHeader.className = 'calendar-cell-date';
      dateHeader.textContent = day;
      cell.appendChild(dateHeader);

      const dayApts = appointments.filter(a => a.date === dateString && a.status !== 'cancelada');
      if (dayApts.length > 0) {
        const aptsContainer = document.createElement('div');
        aptsContainer.className = 'calendar-appointments';

        dayApts.forEach(apt => {
          const badge = document.createElement('div');
          const doc = SPECIALISTS.find(d => d.id === apt.specialistId);
          badge.className = `calendar-apt-badge ${apt.modality === 'Virtual' ? 'badge-virtual' : 'badge-presencial'}`;
          badge.title = `${apt.time} - ${apt.patientName} (${doc ? doc.name : ''})`;
          badge.textContent = `${apt.time} ${apt.patientName}`;
          badge.addEventListener('click', (e) => {
            e.stopPropagation();
            showAppointmentDetail(apt);
          });
          aptsContainer.appendChild(badge);
        });
        cell.appendChild(aptsContainer);
      }
      grid.appendChild(cell);
    }

    // Mes siguiente
    const totalCellsRendered = startOffset + totalDays;
    const remainingCells = 42 - totalCellsRendered;
    for (let day = 1; day <= remainingCells; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell other-month';
      cell.innerHTML = `<div class="calendar-cell-date">${day}</div>`;
      grid.appendChild(cell);
    }

    container.appendChild(grid);

  } else if (calendarViewMode === 'week') {
    // ------------------ VISTA SEMANAL ------------------
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';

    // 1. Cabecera con los 7 días
    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header';
    timelineHeader.style.gridTemplateColumns = '80px repeat(7, 1fr)';

    // Esquina izquierda (vacía para columna de horas)
    const corner = document.createElement('div');
    corner.className = 'timeline-header-cell';
    corner.innerHTML = '<span style="font-size:0.65rem;opacity:0.6;">GMT-05</span>';
    timelineHeader.appendChild(corner);

    // Calcular fechas de la semana
    const currentDay = calendarCurrentDate.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(calendarCurrentDate);
    monday.setDate(calendarCurrentDate.getDate() + distanceToMonday);

    const weekDays = [];
    const daysHeader = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
    const todayStr = new Date().toDateString();

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      weekDays.push(dayDate);

      const headerCell = document.createElement('div');
      headerCell.className = 'timeline-header-cell';
      const isToday = dayDate.toDateString() === todayStr;
      if (isToday) {
        headerCell.classList.add('today');
      }

      headerCell.innerHTML = `
        <span style="font-size:0.72rem;opacity:0.8;">${daysHeader[i]}</span>
        <div class="day-number-circle">${dayDate.getDate()}</div>
      `;
      timelineHeader.appendChild(headerCell);
    }
    timelineContainer.appendChild(timelineHeader);

    // 2. Grilla con escala de horas y tarjetas (8 AM a 10 PM = 14 horas = 840 minutos)
    const timelineGrid = document.createElement('div');
    timelineGrid.className = 'timeline-grid';
    timelineGrid.style.gridTemplateColumns = '80px repeat(7, 1fr)';

    const startHour = 8;
    const endHour = 22;

    for (let h = startHour; h <= endHour; h++) {
      const hourIndex = h - startHour;
      const rowStart = hourIndex * 60 + 1;

      // Línea divisoria
      const line = document.createElement('div');
      line.className = 'timeline-hour-line';
      line.style.gridRow = `${rowStart} / span 1`;
      timelineGrid.appendChild(line);

      // Etiqueta de la hora (columna 1)
      const label = document.createElement('div');
      label.className = 'timeline-hour-label';
      label.style.gridRow = `${rowStart} / span 30`; // Ajustar tamaño de celda de texto
      
      const formatHour = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
      label.textContent = formatHour;
      timelineGrid.appendChild(label);
    }

    // Inyectar citas en las columnas correspondientes (columnas 2 a 8)
    weekDays.forEach((dayDate, dayIdx) => {
      const colIndex = dayIdx + 2; // Columna 1 es la etiqueta de horas
      const formattedDay = dayDate.getDate() < 10 ? '0' + dayDate.getDate() : dayDate.getDate();
      const formattedMonth = (dayDate.getMonth() + 1) < 10 ? '0' + (dayDate.getMonth() + 1) : (dayDate.getMonth() + 1);
      const dateString = `${dayDate.getFullYear()}-${formattedMonth}-${formattedDay}`;

      const dayApts = appointments.filter(a => a.date === dateString && a.status !== 'cancelada');

      dayApts.forEach(apt => {
        let startRow = timeToMinutesOffset(apt.time);
        const isPorCoordinar = startRow === -1;
        if (isPorCoordinar) startRow = 0; // Posicionar al inicio del día (08:00)
        let endRow = startRow + (apt.isProcedure ? (apt.durationHours * 60) : 60);

        if (startRow < 0) startRow = 0;
        if (endRow > 840) endRow = 840;
        if (startRow >= 840) return;

        const doc = SPECIALISTS.find(d => d.id === apt.specialistId);
        const card = document.createElement('div');
        card.className = `timeline-apt-card ${apt.modality === 'Virtual' ? 'modality-virtual' : 'modality-presencial'}`;
        if (isPorCoordinar) card.style.border = '2px dashed var(--color-accent)';
        card.style.gridColumn = colIndex;
        card.style.gridRow = `${startRow + 1} / ${endRow + 1}`;
        card.innerHTML = `
          <div style="font-weight: 700;">${isPorCoordinar ? '🕐 Por coordinar' : apt.time}</div>
          <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${apt.patientName}</div>
          <div style="font-size: 0.65rem; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${doc ? doc.name : ''}</div>
        `;

        card.addEventListener('click', () => {
          showAppointmentDetail(apt);
        });

        timelineGrid.appendChild(card);
      });
    });

    // Inyectar línea roja indicadora de la hora actual (si pertenece a la semana activa)
    const now = new Date();
    const activeWeekStart = weekDays[0];
    const activeWeekEnd = weekDays[6];
    const isThisWeek = now >= activeWeekStart && now <= new Date(activeWeekEnd.getTime() + 24 * 60 * 60 * 1000);

    if (isThisWeek) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const currentOffset = nowMin - 480; // Offset desde las 08:00
      if (currentOffset >= 0 && currentOffset <= 840) {
        const todayDayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const redLine = document.createElement('div');
        redLine.className = 'timeline-current-time-line';
        redLine.style.gridColumn = `${todayDayIdx + 2} / span 1`;
        redLine.style.gridRow = `${currentOffset + 1} / span 1`;
        timelineGrid.appendChild(redLine);
      }
    }

    timelineContainer.appendChild(timelineGrid);
    container.appendChild(timelineContainer);

  } else if (calendarViewMode === 'day') {
    // ------------------ VISTA DIARIA ------------------
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';

    // 1. Cabecera con el día único
    const timelineHeader = document.createElement('div');
    timelineHeader.className = 'timeline-header';
    timelineHeader.style.gridTemplateColumns = '80px 1fr';

    const corner = document.createElement('div');
    corner.className = 'timeline-header-cell';
    corner.innerHTML = '<span style="font-size:0.65rem;opacity:0.6;">GMT-05</span>';
    timelineHeader.appendChild(corner);

    const headerCell = document.createElement('div');
    headerCell.className = 'timeline-header-cell';
    const isToday = calendarCurrentDate.toDateString() === new Date().toDateString();
    if (isToday) {
      headerCell.classList.add('today');
    }

    const dayOfWeekNamesShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    headerCell.innerHTML = `
      <span style="font-size:0.75rem;opacity:0.8;">${dayOfWeekNamesShort[calendarCurrentDate.getDay()]}</span>
      <div class="day-number-circle">${calendarCurrentDate.getDate()}</div>
    `;
    timelineHeader.appendChild(headerCell);
    timelineContainer.appendChild(timelineHeader);

    // 2. Grilla con escala de horas y tarjetas (8 AM a 10 PM)
    const timelineGrid = document.createElement('div');
    timelineGrid.className = 'timeline-grid';
    timelineGrid.style.gridTemplateColumns = '80px 1fr';

    const startHour = 8;
    const endHour = 22;

    for (let h = startHour; h <= endHour; h++) {
      const hourIndex = h - startHour;
      const rowStart = hourIndex * 60 + 1;

      // Línea divisoria
      const line = document.createElement('div');
      line.className = 'timeline-hour-line';
      line.style.gridRow = `${rowStart} / span 1`;
      timelineGrid.appendChild(line);

      // Etiqueta de la hora
      const label = document.createElement('div');
      label.className = 'timeline-hour-label';
      label.style.gridRow = `${rowStart} / span 30`;
      
      const formatHour = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
      label.textContent = formatHour;
      timelineGrid.appendChild(label);
    }

    // Filtrar citas del día seleccionado
    const formattedDay = calendarCurrentDate.getDate() < 10 ? '0' + calendarCurrentDate.getDate() : calendarCurrentDate.getDate();
    const formattedMonth = (calendarCurrentDate.getMonth() + 1) < 10 ? '0' + (calendarCurrentDate.getMonth() + 1) : (calendarCurrentDate.getMonth() + 1);
    const dateString = `${calendarCurrentDate.getFullYear()}-${formattedMonth}-${formattedDay}`;

    const dayApts = appointments.filter(a => a.date === dateString && a.status !== 'cancelada');

    dayApts.forEach(apt => {
      let startRow = timeToMinutesOffset(apt.time);
      const isPorCoordinar = startRow === -1;
      if (isPorCoordinar) startRow = 0;
      let endRow = startRow + (apt.isProcedure ? (apt.durationHours * 60) : 60);

      if (startRow < 0) startRow = 0;
      if (endRow > 840) endRow = 840;
      if (startRow >= 840) return;

      const doc = SPECIALISTS.find(d => d.id === apt.specialistId);
      const card = document.createElement('div');
      card.className = `timeline-apt-card ${apt.modality === 'Virtual' ? 'modality-virtual' : 'modality-presencial'}`;
      if (isPorCoordinar) card.style.border = '2px dashed var(--color-accent)';
      card.style.gridColumn = 2; // Columna única de contenido
      card.style.gridRow = `${startRow + 1} / ${endRow + 1}`;
      card.innerHTML = `
        <div style="font-weight: 700; font-size: 0.78rem;">${isPorCoordinar ? '🕐 Por coordinar' : apt.time}</div>
        <div style="font-size: 0.78rem; font-weight: 700; margin-bottom: 2px;">${apt.patientName}</div>
        <div style="font-size: 0.68rem; opacity: 0.9;">Especialista: ${doc ? doc.name : 'No asignado'}</div>
      `;

      card.addEventListener('click', () => {
        showAppointmentDetail(apt);
      });

      timelineGrid.appendChild(card);
    });

    // Inyectar línea roja indicadora de la hora actual (si el día seleccionado es hoy)
    if (isToday) {
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const currentOffset = nowMin - 480;
      if (currentOffset >= 0 && currentOffset <= 720) {
        const redLine = document.createElement('div');
        redLine.className = 'timeline-current-time-line';
        redLine.style.gridColumn = '2 / span 1';
        redLine.style.gridRow = `${currentOffset + 1} / span 1`;
        timelineGrid.appendChild(redLine);
      }
    }

    timelineContainer.appendChild(timelineGrid);
    container.appendChild(timelineContainer);
  }
}

// 🔐 Roles con permiso de gestión comercial/administrativa (Administrador y Comercial).
// Los especialistas (Médico, Nutricionista, Psicólogo, etc.) quedan excluidos.
function isAdminOrCommercial() {
  try {
    const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
    return !!currentUser && (currentUser.role === 'Administrador' || currentUser.role === 'Comercial');
  } catch (e) {
    return false;
  }
}

// Regla de seguridad #2: solo Administrador/Comercial ven enlaces directos de
// WhatsApp / recordatorios de pacientes. Los especialistas ven el teléfono como texto.
function canViewPatientWhatsApp() {
  return isAdminOrCommercial();
}

// Mostrar Detalle de Cita en un Modal flotante simple
// Mostrar Detalle de Cita en un Modal flotante simple con Historia Clínica
function showAppointmentDetail(apt) {
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  const isEditAllowed = currentUser && (currentUser.role === 'Administrador' || currentUser.role === 'Comercial');
  const hasHistoryAccess = currentUser && currentUser.role !== 'Comercial';

  // Crear modal de detalle dinámicamente
  const detailModal = document.createElement('div');
  detailModal.className = 'modal active';
  detailModal.style.zIndex = '3000';
  document.body.appendChild(detailModal);

  function renderReadOnlyView() {
    // Buscar datos actualizados de la cita en memoria por si se editó
    const currentApt = DB.getAppointments().find(a => a.id === apt.id) || apt;
    const service = SERVICES.find(s => s.id === currentApt.serviceId);
    const doctor = (currentApt.serviceId === 'curacion_heridas' || !currentApt.specialistId) ? null : SPECIALISTS.find(d => d.id === currentApt.specialistId);
    const agentInfo = AGENT_CONTACTS[currentApt.trackedBy] ? `${AGENT_CONTACTS[currentApt.trackedBy].name} (Cel: ${AGENT_CONTACTS[currentApt.trackedBy].phone})` : (currentApt.trackedBy || 'Sin asignar');
    
    const phoneDetailHtml = canViewPatientWhatsApp()
      ? `<a href="https://wa.me/${formatWhatsAppPhone(currentApt.patientPhone)}" target="_blank" style="color:var(--color-accent); font-weight:600;">${currentApt.patientPhone} 💬</a>`
      : `<span style="font-weight:600; color:var(--color-primary-dark);">${currentApt.patientPhone}</span>`;

    // Historial clínico de consultas previas
    const allApts = DB.getAppointments();
    const patientHistory = allApts.filter(a =>
      a.id !== currentApt.id &&
      (a.patientPhone === currentApt.patientPhone || a.patientName.toLowerCase() === currentApt.patientName.toLowerCase()) &&
      a.clinicalNotes
    );

    let historyHtml = '';
    if (patientHistory.length > 0) {
      historyHtml += `
        <div style="margin-top: 1.25rem; border-top: 1px dashed var(--color-border); padding-top: 0.8rem;">
          <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.85rem; display:block; margin-bottom:0.4rem;">Consultas Previas con Notas:</label>
          <div style="max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
      `;
      patientHistory.forEach(h => {
        const spec = SPECIALISTS.find(d => d.id === h.specialistId);
        historyHtml += `
          <div style="background: rgba(61,90,115,0.03); border:1px solid rgba(61,90,115,0.08); padding:0.5rem; border-radius:var(--border-radius-sm);">
            <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--color-accent); font-weight:600; margin-bottom:0.2rem;">
              <span>${spec ? spec.name : 'Especialista'}</span>
              <span>${h.date}</span>
            </div>
            <p style="font-size:0.78rem; margin:0; color:var(--color-text-dark); white-space:pre-line; line-height: 1.3;">${h.clinicalNotes}</p>
          </div>
        `;
      });
      historyHtml += `</div></div>`;
    }

    detailModal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; padding: 2rem; max-height: 90vh; overflow-y: auto;">
        <h3 style="color:var(--color-primary); font-weight:700; margin-bottom:1.5rem; border-bottom:1px solid var(--color-border); padding-bottom:0.5rem;">Detalle de la Cita</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1rem; font-size: 0.88rem;">
          <p style="margin:0;"><strong>Paciente:</strong> <br>${currentApt.patientName} (${currentApt.patientAge} años)</p>
          <p style="margin:0;"><strong>DNI / Cédula:</strong> <br>${currentApt.patientDni || '<em>No registrado</em>'}</p>
          <p style="margin:0;"><strong>Teléfono:</strong> <br>${phoneDetailHtml}</p>
          <p style="margin:0;"><strong>Comercial:</strong> <br>${agentInfo}</p>
          <p style="margin:0;"><strong>Modalidad:</strong> <br>${currentApt.modality}</p>
          <p style="margin:0;"><strong>Estado:</strong> <br><span class="status-badge status-${currentApt.status}" style="margin-top:2px;">${currentApt.status.toUpperCase()}</span></p>
          <p style="margin:0;"><strong>Servicio:</strong> <br>${getServiceName(currentApt)}</p>
          <p style="margin:0;"><strong>Especialista:</strong> <br>${doctor ? doctor.name : 'N/A'}</p>
          <p style="margin:0; grid-column: span 2;"><strong>Fecha y Hora:</strong> <br>${currentApt.date} a las ${currentApt.time}</p>
          ${currentApt.modality === 'Virtual' ? `
          <p style="margin:0; grid-column: span 2;">
            <strong>Enlace de Reunión (Virtual):</strong> <br>
            ${currentApt.meetingLink 
              ? `<a href="${currentApt.meetingLink}" target="_blank" class="btn btn-accent" style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; padding: 0.4rem 0.8rem; margin-top: 0.25rem;"><i data-lucide="video" class="icon-inline"></i> Unirse a Reunión</a>`
              : '<em>No asignado / Generando...</em>'
            }
          </p>
          ` : ''}
        </div>

        ${currentApt.motivoConsulta ? `
        <div style="background: rgba(0, 168, 150, 0.04); border: 1px solid rgba(0, 168, 150, 0.15); padding: 0.75rem; border-radius: var(--border-radius-sm); margin-bottom: 1rem; font-size: 0.88rem;">
          <strong>Motivo de Consulta:</strong>
          <p style="margin: 0.25rem 0 0; color: var(--color-text-dark);">${currentApt.motivoConsulta}</p>
        </div>
        ` : ''}

        <div class="form-group" style="margin-top: 1rem;">
          <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.85rem;">Notas Clínicas (Evolución Médica):</label>
          <div style="background:#f8fafb; padding:0.75rem; border-radius:var(--border-radius-sm); border:1px solid var(--color-border); font-size:0.88rem; color:var(--color-text-dark); max-height:100px; overflow-y:auto; white-space:pre-line;">
            ${currentApt.clinicalNotes || '<em>Sin notas registradas por el especialista.</em>'}
          </div>
        </div>

        ${historyHtml}

        <div style="display:flex; gap:0.8rem; margin-top:2rem; justify-content:space-between; flex-wrap:wrap; align-items:center;">
          ${hasHistoryAccess ? `
          <button class="btn btn-accent align-icon-text" id="detail-open-record-btn" style="font-size:0.85rem; padding:0.5rem 1rem;">
            <i data-lucide="clipboard-list" class="icon-inline"></i> Abrir expediente clínico
          </button>
          ` : '<div></div>'}
          <div style="display:flex; gap:0.6rem;">
            <button class="btn btn-secondary" id="detail-close-btn" style="padding:0.5rem 1rem;">Cerrar</button>
            ${isEditAllowed ? `
            <button class="btn btn-primary align-icon-text" id="detail-edit-btn" style="padding:0.5rem 1rem;">
              <i data-lucide="edit" class="icon-inline"></i> Editar Cita
            </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Event listeners
    const openRecordBtn = document.getElementById('detail-open-record-btn');
    if (openRecordBtn) {
      openRecordBtn.addEventListener('click', async () => {
        detailModal.remove();
        const record = await ClinicalDB.ensureRecordFromAppointment(currentApt);
        openClinicalRecord(record.id, { appointmentId: currentApt.id, focusNote: !!(currentUser && currentUser.specialistId) });
      });
    }

    document.getElementById('detail-close-btn').addEventListener('click', () => {
      detailModal.remove();
    });

    const editBtn = document.getElementById('detail-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        renderEditView(currentApt);
      });
    }
  }

  function renderEditView(currentApt) {
    const servicesOpts = SERVICES.map(s => `<option value="${s.id}" ${s.id === currentApt.serviceId ? 'selected' : ''}>${s.name}</option>`).join('');
    const specialistOpts = SPECIALISTS.map(d => `<option value="${d.id}" ${d.id === currentApt.specialistId ? 'selected' : ''}>${d.name}</option>`).join('');
    const agentsOpts = `
      <option value="Brayan" ${currentApt.trackedBy === 'Brayan' ? 'selected' : ''}>Brayan</option>
      <option value="Andrea" ${currentApt.trackedBy === 'Andrea' ? 'selected' : ''}>Andrea</option>
    `;

    detailModal.innerHTML = `
      <div class="modal-content" style="max-width: 500px; padding: 2rem; max-height: 90vh; overflow-y: auto;">
        <h3 style="color:var(--color-primary); font-weight:700; margin-bottom:1.5rem; border-bottom:1px solid var(--color-border); padding-bottom:0.5rem;">Editar Datos de la Cita</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1.25rem; font-size: 0.85rem;">
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Paciente:</label>
            <input type="text" id="detail-apt-name" class="form-control" value="${currentApt.patientName}" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px;">
          </div>
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">DNI / Cédula:</label>
            <input type="text" id="detail-apt-dni" class="form-control" value="${currentApt.patientDni || ''}" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px;">
          </div>
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Edad:</label>
            <input type="number" id="detail-apt-age" class="form-control" value="${currentApt.patientAge}" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px;">
          </div>
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Teléfono (WhatsApp):</label>
            <input type="text" id="detail-apt-phone" class="form-control" value="${currentApt.patientPhone}" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px;">
          </div>
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Asesor Comercial:</label>
            <select id="detail-apt-tracker" class="form-control" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px; width:100%;">
              ${agentsOpts}
            </select>
          </div>
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Modalidad:</label>
            <select id="detail-apt-modality" class="form-control" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px; width:100%;">
              <option value="Presencial" ${currentApt.modality === 'Presencial' ? 'selected' : ''}>Presencial</option>
              <option value="Virtual" ${currentApt.modality === 'Virtual' ? 'selected' : ''}>Virtual</option>
            </select>
          </div>
          <div style="grid-column: span 2;">
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Servicio:</label>
            <select id="detail-apt-service" class="form-control" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px; width:100%;">
              ${servicesOpts}
            </select>
          </div>
          <div style="grid-column: span 2;">
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Médico Especialista:</label>
            <select id="detail-apt-doctor" class="form-control" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px; width:100%;">
              ${specialistOpts}
            </select>
          </div>
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Fecha:</label>
            <input type="date" id="detail-apt-date" class="form-control" value="${currentApt.date}" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px;">
          </div>
          <div>
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Hora:</label>
            <input type="text" id="detail-apt-time" class="form-control" value="${currentApt.time}" style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px;">
          </div>
          <div style="grid-column: span 2;">
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Enlace de Reunión (Virtual):</label>
            <input type="url" id="detail-apt-meetlink" class="form-control" value="${currentApt.meetingLink || ''}" placeholder="https://meet.google.com/..." style="font-size:0.85rem; padding:0.25rem 0.5rem; height:32px;">
          </div>
          <div style="grid-column: span 2;">
            <label style="font-weight:600; color:var(--color-primary-dark); font-size:0.8rem;">Motivo de Consulta:</label>
            <textarea id="detail-apt-motivo" class="form-control" rows="2" style="font-size:0.85rem; padding:0.25rem 0.5rem;">${currentApt.motivoConsulta || ''}</textarea>
          </div>
        </div>

        <div style="display:flex; gap:1rem; margin-top:2rem; justify-content:flex-end;">
          <button class="btn btn-secondary" id="detail-edit-cancel-btn">Cancelar</button>
          <button class="btn btn-primary align-icon-text" id="detail-edit-save-btn">
            <i data-lucide="save" class="icon-inline"></i> Guardar Cambios
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    document.getElementById('detail-edit-cancel-btn').addEventListener('click', () => {
      renderReadOnlyView();
    });

    document.getElementById('detail-edit-save-btn').addEventListener('click', async () => {
      const patientName = document.getElementById('detail-apt-name').value.trim();
      const patientDni = document.getElementById('detail-apt-dni').value.trim();
      const patientAge = parseInt(document.getElementById('detail-apt-age').value) || 0;
      const patientPhone = document.getElementById('detail-apt-phone').value.trim();
      const trackedBy = document.getElementById('detail-apt-tracker').value;
      const modality = document.getElementById('detail-apt-modality').value;
      const serviceId = document.getElementById('detail-apt-service').value;
      const specialistId = document.getElementById('detail-apt-doctor').value;
      const date = document.getElementById('detail-apt-date').value;
      const time = document.getElementById('detail-apt-time').value.trim();
      const meetingLink = document.getElementById('detail-apt-meetlink').value.trim();
      const motivoConsulta = document.getElementById('detail-apt-motivo').value.trim();

      await DB.updateAppointmentDetails(currentApt.id, {
        patientName,
        patientDni,
        patientAge,
        patientPhone,
        trackedBy,
        modality,
        serviceId,
        specialistId,
        date,
        time,
        meetingLink,
        motivoConsulta,
        status: currentApt.status // Mantener el estado original de la cita
      });

      alert('Cita actualizada correctamente.');
      detailModal.remove();
      updateStats();
      renderCalendarWidget();
      renderAppointmentsTable();
    });
  }

  // Carga inicial de la vista de solo lectura
  renderReadOnlyView();
}

function getServiceName(apt) {
  if (!apt) return 'Consulta Médica';
  let service = SERVICES.find(s => s.id === apt.serviceId);
  if (!service && apt.specialistId) {
    service = SERVICES.find(s => s.specialistId === apt.specialistId);
  }
  if (service && service.name) {
    return service.name;
  }
  if (apt.serviceName) {
    return apt.serviceName;
  }
  const doc = SPECIALISTS.find(d => d.id === apt.specialistId);
  if (doc) {
    return `Consulta — ${doc.specialty || doc.name}`;
  }
  return 'Consulta Médica';
}

// 📋 Renderizar Listado de Citas en Tabla
function renderAppointmentsTable() {
  const tbody = document.getElementById('appointments-table-body');
  if (!tbody) return;

  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));

  // 🩺 Rol Médico / Especialista: la tabla del panel muestra "Próximas Consultas"
  // (sólo citas futuras y no canceladas, orden ascendente) con acceso al expediente.
  if (currentUser && currentUser.specialistId) {
    renderUpcomingConsultations();
    return;
  }

  // Admin / Comercial: restaurar título y cabecera estándar por si venían del rol médico.
  const titleEl = document.getElementById('dashboard-apts-title');
  if (titleEl) titleEl.textContent = 'Últimas Citas Agendadas';
  const headEl = document.getElementById('appointments-table-head');
  if (headEl) {
    headEl.innerHTML = '<tr><th>Paciente</th><th>Teléfono</th><th>Servicio</th><th>Especialista</th><th>Fecha / Hora</th><th>Modalidad</th><th>Estado</th></tr>';
  }

  tbody.innerHTML = '';
  let appointments = DB.getAppointments();

  // Filtrar citas si el usuario es Comercial
  if (currentUser) {
    if (currentUser.role === 'Comercial' && currentUser.trackedBy) {
      appointments = appointments.filter(a => a.trackedBy === currentUser.trackedBy);
    }
  }

  // Filtrar
  const searchQuery = document.getElementById('admin-search').value.toLowerCase();
  const filterDoc = document.getElementById('admin-filter-doctor').value;

  const filteredApts = appointments.filter(apt => {
    const record = ClinicalDB.getRecordByPatient(apt.patientPhone, apt.patientName);
    const matchesDni = record && record.dni && record.dni.toLowerCase().includes(searchQuery);
    const matchesAptDni = apt.patientDni && apt.patientDni.toLowerCase().includes(searchQuery);
    const matchesSearch = apt.patientName.toLowerCase().includes(searchQuery) || apt.patientPhone.includes(searchQuery) || matchesDni || matchesAptDni;
    const matchesDoctor = !filterDoc || apt.specialistId === filterDoc;
    return matchesSearch && matchesDoctor;
  });

  // Ordenar por proximidad: primero las citas próximas (Hoy, Mañana...) por orden ascendente, luego las pasadas.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  filteredApts.sort((a, b) => {
    const dtA = appointmentDateTime(a);
    const dtB = appointmentDateTime(b);
    const isAUpcoming = dtA >= todayStart && a.status !== 'cancelada' && a.status !== 'realizada';
    const isBUpcoming = dtB >= todayStart && b.status !== 'cancelada' && b.status !== 'realizada';

    if (isAUpcoming && !isBUpcoming) return -1;
    if (!isAUpcoming && isBUpcoming) return 1;

    if (isAUpcoming && isBUpcoming) {
      return dtA - dtB; // Próximas citas: la más cercana primero (ej. Hoy 14:00 antes que Hoy 16:00)
    }

    return dtB - dtA; // Pasadas/Realizadas: la más reciente primero
  });

  if (filteredApts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--color-text-muted);">No se encontraron citas registradas.</td></tr>';
    return;
  }

  // Permiso de contacto directo (Regla #2): solo Administrador/Comercial.
  const canViewWA = canViewPatientWhatsApp();

  filteredApts.forEach(apt => {
    const doctor = (apt.serviceId === 'curacion_heridas' || !apt.specialistId) ? null : SPECIALISTS.find(d => d.id === apt.specialistId);

    // Celda de teléfono: enlace + recordatorio de WhatsApp solo si el rol lo permite.
    const phoneCellHtml = canViewWA
      ? `<div style="display:flex; flex-direction:column; gap:0.25rem;">
          <a href="https://wa.me/${formatWhatsAppPhone(apt.patientPhone)}" target="_blank" style="color:var(--color-accent); font-weight:600; display:inline-flex; align-items:center;">
            ${apt.patientPhone}
            <i data-lucide="message-square" class="icon-inline ml-2" style="width:14px; height:14px; color:#25D366; top:0;"></i>
          </a>
          <button class="btn btn-secondary btn-reminder-wa align-icon-text" data-id="${apt.id}" style="padding:0.15rem 0.3rem; font-size:0.7rem; border-color:var(--color-accent); color:var(--color-accent); width:fit-content; height:fit-content; margin-top:0.1rem;">
            <i data-lucide="bell" class="icon-inline" style="width:12px; height:12px; top:0;"></i> Recordar
          </button>
        </div>`
      : `<span style="font-weight:600; color:var(--color-primary-dark);">${apt.patientPhone}</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${apt.patientName}</strong><br>
        <span style="font-size:0.75rem; color:var(--color-text-muted);">
          ${apt.patientAge} años | DNI: ${apt.patientDni || '—'}<br>
          Seg: ${apt.trackedBy || 'Sin asignar'}
          ${apt.motivoConsulta ? `<br><em style="color:var(--color-primary-light);">Motivo: ${apt.motivoConsulta}</em>` : ''}
        </span>
      </td>
      <td>
        ${phoneCellHtml}
      </td>
      <td>${getServiceName(apt)}</td>
      <td>${doctor ? doctor.name : 'N/A'}</td>
      <td>${apt.date}<br><span style="font-weight:600; color:var(--color-primary-dark);">${apt.time}</span></td>
      <td>
        <span class="status-badge status-${apt.modality === 'Virtual' ? 'confirmada' : 'realizada'}">${apt.modality}</span>
        ${apt.modality === 'Virtual' && apt.meetingLink ? `<br><a href="${apt.meetingLink}" target="_blank" style="color:var(--color-accent); font-size:0.7rem; font-weight:600; display:inline-flex; align-items:center; gap:0.2rem; margin-top:2px;"><i data-lucide="video" style="width:11px; height:11px;"></i> Reunión</a>` : ''}
      </td>
      <td>
        <select class="form-control status-select" data-id="${apt.id}" style="padding: 0.3rem 0.5rem; font-size:0.85rem; width:130px;">
          <option value="pendiente" ${apt.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="confirmada" ${apt.status === 'confirmada' ? 'selected' : ''}>Confirmada</option>
          <option value="realizada" ${apt.status === 'realizada' ? 'selected' : ''}>Realizada</option>
          <option value="cancelada" ${apt.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
        </select>
      </td>
    `;

    // Cambiar estado directo
    tr.querySelector('.status-select').addEventListener('change', (e) => {
      const newStatus = e.target.value;
      DB.updateAppointmentStatus(apt.id, newStatus);
      updateStats();
      renderCalendarWidget();
      renderAppointmentsTable();
    });

    // Recordatorio de WhatsApp (solo existe para Administrador/Comercial)
    const reminderBtn = tr.querySelector('.btn-reminder-wa');
    if (reminderBtn) {
      reminderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendWhatsAppReminder(apt);
      });
    }

    tbody.appendChild(tr);
  });
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   🩺 PANEL MÉDICO — PRÓXIMAS CONSULTAS + EXPEDIENTE CLÍNICO
   ========================================================================== */

// Devuelve un objeto Date de la cita (fecha + hora).
function appointmentDateTime(apt) {
  const timeVal = (apt.time && apt.time !== 'Por coordinar') ? apt.time : '00:00';
  return new Date(`${apt.date}T${timeVal}`);
}

// Reemplaza la tabla del panel del médico por las "Próximas Consultas".
function renderUpcomingConsultations() {
  const tbody = document.getElementById('appointments-table-body');
  if (!tbody) return;
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (!currentUser || !currentUser.specialistId) return;

  // Título y cabecera propios del médico (sin columna Teléfono/WhatsApp).
  const titleEl = document.getElementById('dashboard-apts-title');
  if (titleEl) titleEl.textContent = 'Próximas Consultas';
  const headEl = document.getElementById('appointments-table-head');
  if (headEl) {
    headEl.innerHTML = '<tr><th>Paciente</th><th>Servicio</th><th>Motivo / Modalidad</th><th>Fecha / Hora</th><th>Estado</th><th style="text-align:center;">Expediente</th></tr>';
  }

  const now = new Date();
  let apts = DB.getAppointments()
    .filter(a => a.specialistId === currentUser.specialistId && a.serviceId !== 'curacion_heridas')
    .filter(a => a.status !== 'cancelada')
    .filter(a => appointmentDateTime(a) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) // hoy o futuro
    .sort((a, b) => appointmentDateTime(a) - appointmentDateTime(b)); // ascendente: más próxima primero

  // Paginación simple "Ver más"
  const shown = window.__upcomingShown || 10;
  const pageApts = apts.slice(0, shown);

  tbody.innerHTML = '';
  if (pageApts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--color-text-muted); padding:1.5rem;">No tienes consultas próximas programadas.</td></tr>';
    return;
  }

  pageApts.forEach(apt => {
    const dt = appointmentDateTime(apt);
    const isToday = dt.toDateString() === now.toDateString();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${apt.patientName}</strong><br>
        <span style="font-size:0.75rem; color:var(--color-text-muted);">
          ${apt.patientAge || '—'} años | DNI: ${apt.patientDni || '—'}
        </span>
      </td>
      <td>${getServiceName(apt)}</td>
      <td>
        <strong>${apt.modality}</strong>
        ${apt.modality === 'Virtual' && apt.meetingLink ? `<br><a href="${apt.meetingLink}" target="_blank" style="color:var(--color-accent); font-size:0.72rem; font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;"><i data-lucide="video" style="width:12px; height:12px;"></i> Unirse</a>` : ''}
        ${apt.motivoConsulta ? `<br><span style="font-size:0.72rem; color:var(--color-text-muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; max-width:180px;" title="${apt.motivoConsulta}">${apt.motivoConsulta}</span>` : ''}
      </td>
      <td>${isToday ? '<span style="color:var(--color-accent); font-weight:700;">Hoy</span>' : apt.date}<br><span style="font-weight:600; color:var(--color-primary-dark);">${apt.time}</span></td>
      <td><span class="status-badge status-${apt.status === 'confirmada' ? 'confirmada' : apt.status === 'realizada' ? 'realizada' : 'confirmada'}">${apt.status}</span></td>
      <td style="text-align:center;">
        <button class="btn btn-accent btn-open-record align-icon-text" data-id="${apt.id}" title="Abrir historia clínica" style="padding:0.35rem 0.6rem; font-size:0.8rem; justify-content:center;">
          <i data-lucide="clipboard-list" class="icon-inline" style="width:14px; height:14px; top:0;"></i> Expediente
        </button>
      </td>
    `;
    tr.querySelector('.btn-open-record').addEventListener('click', () => openRecordFromAppointment(apt));
    tbody.appendChild(tr);
  });

  // Fila "Ver más" si hay más consultas
  if (apts.length > shown) {
    const trMore = document.createElement('tr');
    trMore.innerHTML = `<td colspan="6" style="text-align:center; padding:0.75rem;">
      <button class="btn btn-secondary" id="btn-upcoming-more" style="font-size:0.8rem;">Ver más (${apts.length - shown} restantes)</button>
    </td>`;
    trMore.querySelector('#btn-upcoming-more').addEventListener('click', () => {
      window.__upcomingShown = shown + 10;
      renderUpcomingConsultations();
    });
    tbody.appendChild(trMore);
  }
}

// Abre (o crea) el expediente del paciente de una cita y enfoca la nueva nota.
async function openRecordFromAppointment(apt) {
  const record = await ClinicalDB.ensureRecordFromAppointment(apt);
  openClinicalRecord(record.id, { appointmentId: apt.id, focusNote: true });
}

// -----------------------------------------------------
// 📋 EXPEDIENTE CLÍNICO (modal a pantalla completa)
// -----------------------------------------------------
function calcAge(record) {
  if (record.birthDate) {
    const b = new Date(record.birthDate + 'T00:00:00');
    if (!isNaN(b)) {
      const now = new Date();
      let age = now.getFullYear() - b.getFullYear();
      const m = now.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
      return age;
    }
  }
  return record.patientAge || '—';
}

function historyChipsHtml(list, kind, canEdit) {
  let html = '<div class="cr-chips" style="display:flex; flex-wrap:wrap; gap:0.4rem; margin-top:0.4rem;">';
  if (!list || list.length === 0) {
    html += '<span style="color:var(--color-text-muted); font-size:0.85rem; font-style:italic;">Sin antecedentes registrados.</span>';
  } else {
    list.forEach((item, idx) => {
      html += `<span class="cr-chip" style="display:inline-flex; align-items:center; gap:0.35rem; background:rgba(0,168,150,0.1); color:var(--color-primary-dark); border:1px solid rgba(0,168,150,0.3); border-radius:20px; padding:0.25rem 0.6rem; font-size:0.8rem;">
        <strong>${item.code}</strong> ${item.description}
        ${canEdit ? `<button class="cr-chip-del" data-kind="${kind}" data-idx="${idx}" style="color:var(--color-danger); font-weight:700; line-height:1; padding:0 0.2rem;">×</button>` : ''}
      </span>`;
    });
  }
  html += '</div>';
  return html;
}

function openClinicalRecord(recordId, opts) {
  opts = opts || {};
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  const record = ClinicalDB.getRecordById(recordId);
  if (!record) {
    alert('No se encontró el expediente solicitado.');
    return;
  }

  const isDoctor = !!(currentUser && currentUser.specialistId);
  const isAdminComm = isAdminOrCommercial();
  const canViewWA = canViewPatientWhatsApp(); // Admin/Comercial ven WhatsApp; médicos no.
  const canEditClinical = !!(currentUser && (currentUser.specialistId || currentUser.role === 'Administrador'));

  // Guardar de dónde veníamos para el botón de volver
  const activeSidebarItem = document.querySelector('.sidebar-item.active');
  if (activeSidebarItem) {
    window.__crPrevView = activeSidebarItem.getAttribute('data-view');
  } else if (!window.__crPrevView) {
    window.__crPrevView = 'list';
  }

  // Ocultar todas las vistas del dashboard y mostrar la de expediente clínico a pantalla completa
  document.querySelectorAll('.dashboard-view').forEach(sec => {
    sec.style.display = 'none';
  });
  const viewCr = document.getElementById('view-clinical-record');
  if (viewCr) {
    viewCr.style.display = 'block';
  }

  // Actualizar cabecera del expediente
  const nameEl = document.getElementById('cr-full-patient-name');
  if (nameEl) nameEl.textContent = record.patientName;
  const idEl = document.getElementById('cr-full-record-id');
  if (idEl) idEl.innerHTML = `Expediente <strong>${record.id}</strong>`;

  const phoneHtml = canViewWA
    ? `<a href="https://wa.me/${formatWhatsAppPhone(record.patientPhone)}" target="_blank" style="color:var(--color-accent); font-weight:600; display:inline-flex; align-items:center;">
        ${record.patientPhone}
        <i data-lucide="message-square" class="icon-inline ml-1" style="width:14px; height:14px; color:#25D366; top:0;"></i>
       </a>`
    : (isDoctor ? '<span style="color:var(--color-text-muted); font-style:italic;">Oculto (uso comercial)</span>'
                : `<span style="font-weight:600;">${record.patientPhone || '—'}</span>`);

  const container = document.getElementById('cr-full-content');
  if (!container) return;

  container.innerHTML = `
      <!-- Filiación -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; background:var(--color-bg-light); padding:1rem; border-radius:var(--border-radius-sm); margin-bottom:1.5rem;">
        <div><label style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase;">DNI / Cédula</label><div id="cr-dni-view" style="font-weight:600;">${record.dni || '—'}</div></div>
        <div><label style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase;">Edad</label><div style="font-weight:600;">${calcAge(record)} años</div></div>
        <div><label style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase;">Sexo</label><div id="cr-sex-view" style="font-weight:600;">${record.sex || '—'}</div></div>
        <div><label style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase;">Tipo de sangre</label><div id="cr-blood-view" style="font-weight:600;">${record.bloodType || '—'}</div></div>
        <div><label style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase;">Teléfono</label><div>${phoneHtml}</div></div>
        <div style="grid-column:1/-1;"><label style="font-size:0.7rem; color:var(--color-text-muted); text-transform:uppercase;">Alergias</label><div id="cr-allergies-view" style="font-weight:600; color:var(--color-danger);">${record.allergies || 'Ninguna registrada'}</div></div>
      </div>

      ${canEditClinical ? `
      <details style="margin-bottom:1.5rem;">
        <summary style="cursor:pointer; font-weight:600; color:var(--color-primary); font-size:0.9rem; display:inline-flex; align-items:center;">
          <i data-lucide="edit" class="icon-inline mr-2"></i> Editar datos de filiación
        </summary>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:0.75rem;">
          <div><label style="font-size:0.8rem;">DNI / Cédula</label><input type="text" id="cr-dni" class="form-control" value="${record.dni || ''}" placeholder="DNI del paciente"></div>
          <div><label style="font-size:0.8rem;">Fecha de nacimiento</label><input type="date" id="cr-birthdate" class="form-control" value="${record.birthDate || ''}"></div>
          <div><label style="font-size:0.8rem;">Sexo</label>
            <select id="cr-sex" class="form-control">
              <option value="" ${!record.sex ? 'selected' : ''}>—</option>
              <option value="Masculino" ${record.sex === 'Masculino' ? 'selected' : ''}>Masculino</option>
              <option value="Femenino" ${record.sex === 'Femenino' ? 'selected' : ''}>Femenino</option>
            </select>
          </div>
          <div><label style="font-size:0.8rem;">Tipo de sangre</label><input type="text" id="cr-blood" class="form-control" value="${record.bloodType || ''}" placeholder="O+"></div>
          <div style="grid-column: span 2;"><label style="font-size:0.8rem;">Alergias</label><input type="text" id="cr-allergies" class="form-control" value="${record.allergies || ''}" placeholder="Penicilina, AINEs..."></div>
        </div>
        <button class="btn btn-secondary" id="cr-save-filiacion" style="margin-top:0.75rem; font-size:0.8rem;">Guardar filiación</button>
      </details>` : ''}
 
      ${isDoctor || currentUser.role === 'Administrador' ? `
      <!-- Antecedentes -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
        <div>
          <h4 style="color:var(--color-primary); font-size:0.95rem; margin-bottom:0.25rem;">Antecedentes heredofamiliares</h4>
          <div id="cr-family-chips">${historyChipsHtml(record.familyHistory, 'family', canEditClinical)}</div>
          ${canEditClinical ? '<button class="btn btn-secondary cr-add-history" data-kind="family" style="margin-top:0.5rem; font-size:0.75rem;">+ Agregar (CIE-10)</button>' : ''}
        </div>
        <div>
          <h4 style="color:var(--color-primary); font-size:0.95rem; margin-bottom:0.25rem;">Antecedentes personales</h4>
          <div id="cr-personal-chips">${historyChipsHtml(record.personalHistory, 'personal', canEditClinical)}</div>
          ${canEditClinical ? '<button class="btn btn-secondary cr-add-history" data-kind="personal" style="margin-top:0.5rem; font-size:0.75rem;">+ Agregar (CIE-10)</button>' : ''}
        </div>
      </div>` : ''}
 
      ${isDoctor || currentUser.role === 'Administrador' ? `
      <!-- Nueva nota de evolución -->
      <div id="cr-new-note-box" style="border:2px solid var(--color-accent); border-radius:var(--border-radius-sm); padding:1rem; margin-bottom:1.5rem; background:rgba(0,168,150,0.03);">
        <h4 style="color:var(--color-primary); font-size:0.95rem; margin-bottom:0.75rem; display:inline-flex; align-items:center;">
          <i data-lucide="pen-tool" class="icon-inline mr-2"></i> Nueva nota de evolución
        </h4>
        <div style="margin-bottom:0.75rem;">
          <label style="font-size:0.8rem; font-weight:600;">Diagnóstico(s) CIE-10</label>
          <div id="cr-note-diag-chips">${historyChipsHtml([], 'diag', true)}</div>
          <button class="btn btn-secondary cr-add-diag" style="margin-top:0.5rem; font-size:0.75rem;">+ Agregar diagnóstico (CIE-10)</button>
        </div>
        <textarea id="cr-note-text" class="form-control" rows="4" placeholder="Motivo de consulta, examen físico, evolución, plan de tratamiento..." style="font-size:0.9rem;"></textarea>
        <button class="btn btn-accent align-icon-text" id="cr-save-note" style="margin-top:0.75rem;">
          <i data-lucide="save" class="icon-inline"></i> Guardar nota
        </button>
      </div>` : ''}
 
      <!-- Historial de consultas -->
      <h4 style="color:var(--color-primary); font-size:0.95rem; margin-bottom:0.5rem;">Historial de consultas</h4>
      <div id="cr-notes-timeline" style="margin-bottom:1.5rem;"></div>
 
      ${isDoctor || currentUser.role === 'Administrador' ? `
      <!-- Recetas / órdenes -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
        <h4 style="color:var(--color-primary); font-size:0.95rem; margin:0;">Recetas y órdenes médicas</h4>
        <button class="btn btn-primary" id="cr-new-prescription" style="font-size:0.8rem;">+ Nueva receta / orden</button>
      </div>
      <div id="cr-prescriptions-list" style="margin-bottom:1rem;"></div>` : ''}
 
      ${isAdminComm ? `
      <!-- Ventas / pagos (solo Admin/Comercial) -->
      <details style="margin-top:1rem;">
        <summary style="cursor:pointer; font-weight:600; color:var(--color-primary); font-size:0.9rem; display:inline-flex; align-items:center;">
          <i data-lucide="dollar-sign" class="icon-inline mr-2"></i> Ventas y pagos (uso administrativo)
        </summary>
        <p style="font-size:0.85rem; color:var(--color-text-muted); margin-top:0.5rem;">La gestión de ventas y pagos del paciente se administra desde el listado de citas. Total de consultas registradas para este paciente: <strong>${DB.getAppointments().filter(a => a.patientPhone === record.patientPhone).length}</strong>.</p>
      </details>` : ''}

      ${isDoctor ? `
      <div style="margin-top: 2rem; border-top: 2px solid var(--color-accent); padding-top: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem;">
        <button class="btn btn-accent align-icon-text" id="cr-finish-appointment-btn" style="padding: 0.6rem 1.2rem; font-weight: 700; font-size: 0.95rem; justify-content: center; box-shadow: 0 4px 6px rgba(0, 168, 150, 0.2);">
          <i data-lucide="check-circle-2" class="icon-inline" style="width:18px; height:18px;"></i> Finalizar Consulta y Cerrar Expediente
        </button>
      </div>` : ''}
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Estado temporal para la nota nueva (diagnósticos seleccionados)
  const noteDiagnoses = [];

  // Configurar botón Volver
  const backBtn = document.getElementById('cr-back-btn');
  if (backBtn) {
    backBtn.onclick = () => {
      viewCr.style.display = 'none';
      const prevView = window.__crPrevView || 'list';
      const sec = document.getElementById(`view-${prevView}`);
      if (sec) sec.style.display = 'block';
      // Activar menú lateral correcto
      document.querySelectorAll('.sidebar-item').forEach(i => {
        if (i.getAttribute('data-view') === prevView) {
          i.classList.add('active');
        } else {
          i.classList.remove('active');
        }
      });
    };
  }

  // Guardar filiación
  const saveFiliacion = container.querySelector('#cr-save-filiacion');
  if (saveFiliacion) {
    saveFiliacion.addEventListener('click', async () => {
      record.dni = container.querySelector('#cr-dni').value.trim();
      record.birthDate = container.querySelector('#cr-birthdate').value;
      record.sex = container.querySelector('#cr-sex').value;
      record.bloodType = container.querySelector('#cr-blood').value.trim();
      record.allergies = container.querySelector('#cr-allergies').value.trim();
      await ClinicalDB.saveRecord(record);
      openClinicalRecord(record.id, opts); // re-render
    });
  }

  // Agregar antecedentes vía selector CIE-10
  container.querySelectorAll('.cr-add-history').forEach(btn => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-kind');
      openCie10Picker(async (sel) => {
        const target = kind === 'family' ? 'familyHistory' : 'personalHistory';
        record[target] = record[target] || [];
        if (!record[target].some(x => x.code === sel.code)) {
          record[target].push({ code: sel.code, description: sel.description });
          await ClinicalDB.saveRecord(record);
          openClinicalRecord(record.id, opts);
        }
      });
    });
  });

  // Eliminar chips de antecedentes
  container.querySelectorAll('.cr-chip-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const kind = btn.getAttribute('data-kind');
      const idx = parseInt(btn.getAttribute('data-idx'));
      if (kind === 'family') record.familyHistory.splice(idx, 1);
      else if (kind === 'personal') record.personalHistory.splice(idx, 1);
      else if (kind === 'diag') { noteDiagnoses.splice(idx, 1); refreshNoteDiagChips(); return; }
      await ClinicalDB.saveRecord(record);
      openClinicalRecord(record.id, opts);
    });
  });

  // Diagnósticos de la nueva nota
  function refreshNoteDiagChips() {
    const box = container.querySelector('#cr-note-diag-chips');
    if (!box) return;
    box.innerHTML = historyChipsHtml(noteDiagnoses, 'diag', true);
    box.querySelectorAll('.cr-chip-del').forEach(b => {
      b.addEventListener('click', () => {
        noteDiagnoses.splice(parseInt(b.getAttribute('data-idx')), 1);
        refreshNoteDiagChips();
      });
    });
  }
  const addDiagBtn = container.querySelector('.cr-add-diag');
  if (addDiagBtn) {
    addDiagBtn.addEventListener('click', () => {
      openCie10Picker((sel) => {
        if (!noteDiagnoses.some(x => x.code === sel.code)) {
          noteDiagnoses.push({ code: sel.code, description: sel.description });
          refreshNoteDiagChips();
        }
      });
    });
  }

  // Guardar nota de evolución
  const saveNoteBtn = container.querySelector('#cr-save-note');
  if (saveNoteBtn) {
    saveNoteBtn.addEventListener('click', async () => {
      const text = container.querySelector('#cr-note-text').value.trim();
      if (!text && noteDiagnoses.length === 0) {
        alert('Escribe la nota de evolución o agrega al menos un diagnóstico.');
        return;
      }
      await ClinicalDB.saveEvolutionNote({
        recordId: record.id,
        specialistId: currentUser.specialistId || '',
        appointmentId: opts.appointmentId || '',
        diagnosisCodes: noteDiagnoses.slice(),
        note: text
      });
      openClinicalRecord(record.id, opts);
    });
  }

  // Nueva receta
  const newPrescBtn = container.querySelector('#cr-new-prescription');
  if (newPrescBtn) {
    newPrescBtn.addEventListener('click', () => openPrescriptionBuilder(record, noteDiagnoses));
  }

  // Render timeline de notas y lista de recetas
  renderNotesTimeline(record.id);
  renderPrescriptionsList(record.id);

  // Finalizar Consulta y Cerrar Expediente (para Médicos)
  const finishAptBtn = container.querySelector('#cr-finish-appointment-btn');
  if (finishAptBtn) {
    finishAptBtn.addEventListener('click', async () => {
      // 1. Guardar filiación automáticamente
      const dniInput = container.querySelector('#cr-dni');
      if (dniInput) {
        record.dni = dniInput.value.trim();
        record.birthDate = container.querySelector('#cr-birthdate').value;
        record.sex = container.querySelector('#cr-sex').value;
        record.bloodType = container.querySelector('#cr-blood').value.trim();
        record.allergies = container.querySelector('#cr-allergies').value.trim();
        await ClinicalDB.saveRecord(record);
      }
      
      // 2. Si tiene appointmentId, marcar la cita como realizada
      if (opts && opts.appointmentId) {
        await DB.updateAppointmentStatus(opts.appointmentId, 'realizada');
      }
      
      alert('Consulta finalizada con éxito. El estado de la cita se ha actualizado a Realizada.');
      
      // 3. Retornar al dashboard
      viewCr.style.display = 'none';
      const prevView = window.__crPrevView || 'list';
      const sec = document.getElementById(`view-${prevView}`);
      if (sec) sec.style.display = 'block';
      // Activar menú lateral correcto
      document.querySelectorAll('.sidebar-item').forEach(i => {
        if (i.getAttribute('data-view') === prevView) {
          i.classList.add('active');
        } else {
          i.classList.remove('active');
        }
      });

      // Refrescar vistas
      updateStats();
      renderCalendarWidget();
      renderAppointmentsTable();
    });
  }

  // Enfocar la nueva nota si se pidió
  if (opts.focusNote) {
    const noteBox = container.querySelector('#cr-new-note-box');
    const noteText = container.querySelector('#cr-note-text');
    if (noteBox) noteBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (noteText) setTimeout(() => noteText.focus(), 300);
  }
}

function renderNotesTimeline(recordId) {
  const container = document.getElementById('cr-notes-timeline');
  if (!container) return;
  const notes = ClinicalDB.getNotesByRecord(recordId);
  if (notes.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-muted); font-size:0.85rem; font-style:italic;">Aún no hay notas de evolución registradas.</p>';
    return;
  }
  container.innerHTML = notes.map(n => {
    const spec = SPECIALISTS.find(d => d.id === n.specialistId);
    const dateStr = new Date(n.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    const diagHtml = (n.diagnosisCodes || []).map(d => `<span style="background:rgba(61,90,115,0.08); border-radius:12px; padding:0.1rem 0.5rem; font-size:0.75rem; margin-right:0.3rem;"><strong>${d.code}</strong> ${d.description}</span>`).join('');
    return `
      <div style="border-left:3px solid var(--color-accent); padding:0.5rem 0.75rem 0.75rem; margin-bottom:0.75rem; background:rgba(61,90,115,0.02);">
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-accent); font-weight:600;">
          <span>${spec ? spec.name : 'Especialista'}</span><span>${dateStr}</span>
        </div>
        ${diagHtml ? `<div style="margin:0.4rem 0;">${diagHtml}</div>` : ''}
        <p style="font-size:0.88rem; margin:0.25rem 0 0; white-space:pre-line; color:var(--color-text-dark);">${n.note || ''}</p>
      </div>`;
  }).join('');
}

function renderPrescriptionsList(recordId) {
  const container = document.getElementById('cr-prescriptions-list');
  if (!container) return;
  const list = ClinicalDB.getPrescriptionsByRecord(recordId);
  if (list.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-muted); font-size:0.85rem; font-style:italic;">No hay recetas emitidas.</p>';
    return;
  }
  container.innerHTML = '';
  list.forEach(p => {
    const dateStr = new Date(p.createdAt).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    const meds = (p.items || []).filter(i => i.tipo === 'medicamento').length;
    const studies = (p.items || []).filter(i => i.tipo === 'estudio').length;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border:1px solid var(--color-border); border-radius:var(--border-radius-sm); padding:0.5rem 0.75rem; margin-bottom:0.5rem;';
    row.innerHTML = `
      <div style="font-size:0.85rem;">
        <strong>${dateStr}</strong><br>
        <span style="color:var(--color-text-muted);">${meds} medicamento(s), ${studies} estudio(s)</span>
      </div>
      <button class="btn btn-secondary cr-redownload" style="font-size:0.78rem;">⬇️ PDF</button>
    `;
    row.querySelector('.cr-redownload').addEventListener('click', () => {
      const record = ClinicalDB.getRecordById(recordId);
      generatePrescriptionPDF(record, p);
    });
    container.appendChild(row);
  });
}

// Inicializar filtros de lista (solo existe en admin.html)
const adminSearchEl = document.getElementById('admin-search');
const adminFilterDocEl = document.getElementById('admin-filter-doctor');

if (adminSearchEl) {
  adminSearchEl.addEventListener('input', renderAppointmentsTable);
}
if (adminFilterDocEl) {
  adminFilterDocEl.addEventListener('change', renderAppointmentsTable);
}

// Llenar selectores iniciales de filtros
const filterDocSelect = document.getElementById('admin-filter-doctor');
if (filterDocSelect) {
  SPECIALISTS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    filterDocSelect.appendChild(opt);
  });
}

// 📅 Agendamiento de Citas Manual por el Personal (Admin Direct Booker)
// 📅 Agendamiento de Citas Manual por el Personal (Admin Direct Booker)
function initAdminBookingForm() {
  const selectService = document.getElementById('admin-booking-service');
  const selectDoctor = document.getElementById('admin-booking-doctor');
  const adminDateInput = document.getElementById('admin-booking-date');

  // Auto-completar datos del paciente en base a registros previos (DNI o Nombre)
  const inputDni = document.getElementById('admin-booking-dni');
  const inputName = document.getElementById('admin-booking-name');
  const inputAge = document.getElementById('admin-booking-age');
  const inputPhone = document.getElementById('admin-booking-phone');

  if (inputDni && inputName && inputAge && inputPhone) {
    const autofillFromRecord = (record) => {
      if (!record) return;
      if (record.patientName && !inputName.value.trim()) inputName.value = record.patientName;
      if (record.patientAge && !inputAge.value.trim()) inputAge.value = record.patientAge;
      if (record.patientPhone && !inputPhone.value.trim()) inputPhone.value = record.patientPhone;
      if (record.dni && !inputDni.value.trim()) inputDni.value = record.dni;
    };

    inputDni.addEventListener('blur', () => {
      const dniVal = inputDni.value.trim();
      if (!dniVal) return;
      const records = ClinicalDB.getRecords();
      const match = records.find(r => r.dni && r.dni.trim() === dniVal);
      if (match) {
        autofillFromRecord(match);
      }
    });

    inputName.addEventListener('blur', () => {
      const nameVal = inputName.value.trim().toLowerCase();
      if (!nameVal || nameVal.length < 3) return;
      const records = ClinicalDB.getRecords();
      const match = records.find(r => r.patientName && r.patientName.trim().toLowerCase() === nameVal);
      if (match) {
        autofillFromRecord(match);
      }
    });
  }

  // Llenar selectores del form
  const adminRenderedServiceNames = new Set();
  SERVICES.forEach(s => {
    const normalizedName = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (!adminRenderedServiceNames.has(normalizedName)) {
      adminRenderedServiceNames.add(normalizedName);
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} — S/ ${s.price}`;
      selectService.appendChild(opt);
    }
  });

  if (adminDateInput) {
    const today = new Date().toISOString().split('T')[0];
    adminDateInput.min = today;

    adminDateInput.addEventListener('change', generateAdminTimeSlots);
    selectService.addEventListener('change', generateAdminTimeSlots);
    selectDoctor.addEventListener('change', generateAdminTimeSlots);
  }

  function checkBusyTime(hourStr, dateVal, doctorId, slotDurationMins) {
    const slotStart = parseTimeToMinutes(hourStr);
    const slotEnd = slotStart + slotDurationMins;
    
    const appointments = DB.getAppointments();
    const dayApts = appointments.filter(a => a.date === dateVal && a.specialistId === doctorId && a.status !== 'cancelada');
    
    for (const apt of dayApts) {
      if (apt.time === 'Por coordinar') continue;
      const aptStart = parseTimeToMinutes(apt.time);
      const aptDuration = apt.isProcedure ? (apt.durationHours * 60) : 60;
      const aptEnd = aptStart + aptDuration;
      
      if (slotStart < aptEnd && slotEnd > aptStart) {
        return true;
      }
    }
    return false;
  }

  function generateAdminTimeSlots() {
    const dateVal = adminDateInput.value;
    const serviceVal = selectService.value;
    const timeGrid = document.getElementById('admin-time-slots-grid');
    if (!timeGrid) return;
    timeGrid.innerHTML = '';

    if (!dateVal || !serviceVal) return;

    const service = SERVICES.find(s => s.id === serviceVal);
    const selectedDoctorId = selectDoctor.value || (service ? service.specialistId : null);
    const doctor = SPECIALISTS.find(d => d.id === selectedDoctorId);

    if (serviceVal === 'fibroscan') {
      const msg = 'El estudio se programa solo para el día seleccionado. El asesor comercial coordinará la hora exacta con el paciente.';
      timeGrid.innerHTML = `<p style="color: var(--color-primary-light); font-size: 0.8rem; padding: 0.25rem; grid-column: span 4;">${msg}</p>`;
      document.getElementById('admin-booking-time').value = 'Por coordinar';
      return;
    }

    if (!doctor) {
      timeGrid.innerHTML = '<p style="color: var(--color-primary-light); font-size: 0.8rem; padding: 0.25rem; grid-column: span 4;">Servicio a domicilio: se coordina por WhatsApp, no requiere horario ni médico.</p>';
      return;
    }

    const availableHours = getDoctorAvailableSlots(doctor, dateVal);
    if (availableHours.length === 0) {
      timeGrid.innerHTML = '<p style="color: var(--color-danger); font-size: 0.8rem; padding: 0.25rem; grid-column: span 4;">El especialista no tiene disponibilidad para esta fecha.</p>';
      return;
    }

    // Calcular duración en minutos solicitada para esta cita
    const radioProcedimiento = document.querySelector('input[name="admin-booking-type"][value="procedimiento"]');
    const isProcedure = radioProcedimiento ? radioProcedimiento.checked : false;
    let slotDurationMins = parseInt(doctor.slotDuration) || 60;
    if (isProcedure) {
      const durationVal = document.getElementById('admin-booking-duration').value;
      slotDurationMins = parseInt(durationVal) * 60;
    }

    // Renderizar horas disponibles del doctor
    availableHours.forEach(hour => {
      // Un slot de inicio es ocupado si durante su transcurso (slotDurationMins) hay colisión
      const isBusy = checkBusyTime(hour, dateVal, doctor.id, slotDurationMins);
      const slot = document.createElement('div');
      slot.className = `time-slot ${isBusy ? 'disabled' : ''}`;
      slot.textContent = hour;
      slot.style.padding = '0.3rem';
      slot.style.fontSize = '0.8rem';
      slot.style.border = '1px solid var(--color-border)';
      slot.style.borderRadius = '4px';
      slot.style.textAlign = 'center';
      slot.style.cursor = isBusy ? 'not-allowed' : 'pointer';
      slot.style.backgroundColor = isBusy ? '#eceff1' : 'transparent';
      slot.style.color = isBusy ? '#90a4ae' : 'var(--color-primary-dark)';

      if (!isBusy) {
        slot.addEventListener('click', () => {
          timeGrid.querySelectorAll('.time-slot').forEach(s => {
            if (!s.classList.contains('disabled')) {
              s.style.backgroundColor = 'transparent';
              s.style.color = 'var(--color-primary-dark)';
            }
          });
          slot.style.backgroundColor = 'var(--color-accent)';
          slot.style.color = '#fff';
          document.getElementById('admin-booking-time').value = hour;
        });
      }
      timeGrid.appendChild(slot);
    });

    // Agregar slot extra de "Horario según disponibilidad de agenda" en el panel administrativo
    const extraSlot = document.createElement('div');
    extraSlot.className = 'time-slot';
    extraSlot.textContent = 'Por coordinar (Sujeto a disponibilidad de agenda)';
    extraSlot.style.gridColumn = 'span 4';
    extraSlot.style.padding = '0.5rem';
    extraSlot.style.fontSize = '0.78rem';
    extraSlot.style.border = '1px solid var(--color-border)';
    extraSlot.style.borderRadius = '4px';
    extraSlot.style.textAlign = 'center';
    extraSlot.style.cursor = 'pointer';
    extraSlot.style.backgroundColor = 'transparent';
    extraSlot.style.color = 'var(--color-primary-dark)';

    extraSlot.addEventListener('click', () => {
      timeGrid.querySelectorAll('.time-slot').forEach(s => {
        if (!s.classList.contains('disabled')) {
          s.style.backgroundColor = 'transparent';
          s.style.color = 'var(--color-primary-dark)';
        }
      });
      extraSlot.style.backgroundColor = 'var(--color-accent)';
      extraSlot.style.color = '#fff';
      document.getElementById('admin-booking-time').value = 'Por coordinar (Sujeto a disponibilidad de agenda)';
    });
    timeGrid.appendChild(extraSlot);
  }

  selectService.addEventListener('change', () => {
    const serviceVal = selectService.value;
    const selectModality = document.getElementById('admin-booking-modality');
    selectDoctor.innerHTML = '<option value="">-- Selecciona Especialista --</option>';
    if (serviceVal) {
      const service = SERVICES.find(s => s.id === serviceVal);
      let matchingDocs = [];
      if (service && service.specialistId) {
        const baseDoc = SPECIALISTS.find(d => d.id === service.specialistId);
        if (baseDoc) {
          matchingDocs = SPECIALISTS.filter(d => d.specialty === baseDoc.specialty);
        } else {
          const directDoc = SPECIALISTS.find(d => d.id === service.specialistId);
          if (directDoc) matchingDocs.push(directDoc);
        }
      }

      if (matchingDocs.length > 0) {
        matchingDocs.forEach(doc => {
          const opt = document.createElement('option');
          opt.value = doc.id;
          opt.textContent = doc.name;
          if (matchingDocs.length === 1) opt.selected = true;
          selectDoctor.appendChild(opt);
        });
        selectDoctor.disabled = (matchingDocs.length <= 1);
      } else {
        selectDoctor.disabled = true;
      }

      if (serviceVal === 'fibroscan') {
        for (let i = 0; i < selectModality.options.length; i++) {
          if (selectModality.options[i].value === 'A Domicilio') {
            selectModality.remove(i);
            break;
          }
        }
        selectModality.value = 'Presencial';
        selectModality.disabled = true;
      } else if (serviceVal === 'curacion_heridas') {
        selectDoctor.innerHTML = '<option value="">No requiere médico asignado</option>';
        selectDoctor.disabled = true;
        let hasDomicilio = false;
        for (let i = 0; i < selectModality.options.length; i++) {
          if (selectModality.options[i].value === 'A Domicilio') hasDomicilio = true;
        }
        if (!hasDomicilio) {
          const opt = document.createElement('option');
          opt.value = 'A Domicilio';
          opt.textContent = 'A Domicilio';
          selectModality.appendChild(opt);
        }
        selectModality.value = 'A Domicilio';
        selectModality.disabled = true;
      } else {
        for (let i = 0; i < selectModality.options.length; i++) {
          if (selectModality.options[i].value === 'A Domicilio') {
            selectModality.remove(i);
            break;
          }
        }
        selectModality.disabled = false;
      }
    } else {
      selectModality.disabled = false;
      selectDoctor.disabled = true;
    }
  });

  // Toggle del campo de link de reunión al cambiar modalidad
  const selectModalityAdmin = document.getElementById('admin-booking-modality');
  const meetlinkGroup = document.getElementById('admin-booking-meetlink-group');
  if (selectModalityAdmin && meetlinkGroup) {
    selectModalityAdmin.addEventListener('change', () => {
      meetlinkGroup.style.display = selectModalityAdmin.value === 'Virtual' ? 'block' : 'none';
      if (selectModalityAdmin.value !== 'Virtual') {
        document.getElementById('admin-booking-meetlink').value = '';
      }
    });
  }

  // Manejar el cambio de tipo de registro (Consulta vs Procedimiento)
  const radioConsulta = document.querySelector('input[name="admin-booking-type"][value="consulta"]');
  const radioProcedimiento = document.querySelector('input[name="admin-booking-type"][value="procedimiento"]');
  const durationGroup = document.getElementById('admin-booking-duration-group');
  const durationSelect = document.getElementById('admin-booking-duration');

  if (radioConsulta && radioProcedimiento && durationGroup) {
    const handleTypeChange = () => {
      const isProc = radioProcedimiento.checked;
      durationGroup.style.display = isProc ? 'block' : 'none';
      generateAdminTimeSlots();
    };
    radioConsulta.addEventListener('change', handleTypeChange);
    radioProcedimiento.addEventListener('change', handleTypeChange);
  }
  if (durationSelect) {
    durationSelect.addEventListener('change', generateAdminTimeSlots);
  }

  const btnAdd = document.getElementById('btn-admin-add-apt');
  btnAdd.addEventListener('click', () => {
    const serviceId = selectService.value;
    const specialistId = selectDoctor.value;
    const date = document.getElementById('admin-booking-date').value;
    const time = document.getElementById('admin-booking-time').value;
    const patientName = document.getElementById('admin-booking-name').value.trim();
    const patientDni = (document.getElementById('admin-booking-dni').value || '').trim();
    const patientAge = parseInt(document.getElementById('admin-booking-age').value);
    const patientPhone = document.getElementById('admin-booking-phone').value.trim();
    const modality = document.getElementById('admin-booking-modality').value;
    const tracker = document.getElementById('admin-booking-tracker').value;
    const motivoConsulta = (document.getElementById('admin-booking-motivo').value || '').trim();
    const meetingLink = (document.getElementById('admin-booking-meetlink').value || '').trim();

    const bookingType = document.querySelector('input[name="admin-booking-type"]:checked') ? document.querySelector('input[name="admin-booking-type"]:checked').value : 'consulta';
    const isProcedure = bookingType === 'procedimiento';
    const durationHours = isProcedure ? parseInt(durationSelect.value) : 1;

    if (serviceId === 'curacion_heridas') {
      alert('La "Curación de Heridas a Domicilio" es un servicio sin médico ni horario que se coordina por WhatsApp. Contacte al paciente directamente para acordar la visita a domicilio.');
      return;
    }

    if (!serviceId || !specialistId || !date || !time || !patientName || !patientAge || !patientPhone) {
      alert('Por favor complete todos los campos del agendamiento.');
      return;
    }

    const newApt = {
      patientName,
      patientDni,
      patientAge,
      patientPhone,
      serviceId,
      specialistId,
      date,
      time,
      modality,
      motivoConsulta,
      meetingLink: modality === 'Virtual' ? meetingLink : '',
      status: 'confirmada', // Por defecto confirmada ya que la agendó el personal
      trackedBy: tracker,
      isProcedure,
      durationHours
    };

    DB.saveAppointment(newApt);
    alert('Cita interna agendada con éxito.');

    // Resetear formulario
    document.getElementById('admin-booking-form-el').reset();
    if (durationGroup) durationGroup.style.display = 'none';
    selectDoctor.innerHTML = '<option value="">-- Selecciona Especialista --</option>';
    document.getElementById('admin-time-slots-grid').innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.8rem; padding: 0.25rem; grid-column: span 4;">Selecciona servicio y fecha primero.</p>';
    if (meetlinkGroup) meetlinkGroup.style.display = 'none';

    // Actualizar Vistas
    updateStats();
    renderCalendarWidget();
    renderAppointmentsTable();
  });
}

// 🌐 Función de refresco de interfaz ante actualizaciones de datos
function handleSyncUpdate() {
  if (document.getElementById('admin-dashboard')) {
    updateStats();
    renderCalendarWidget();
    renderAppointmentsTable();
    if (typeof renderDetailedTable === 'function') {
      renderDetailedTable();
    }
  } else if (document.getElementById('public-web')) {
    const timeGrid = document.getElementById('time-slots-grid');
    const inputDate = document.getElementById('booking-date');
    if (timeGrid && inputDate && inputDate.value) {
      inputDate.dispatchEvent(new Event('change'));
    }
  }
}

// 🔄 Inicialización de Sincronización en Tiempo Real con Supabase (Citas y Personal)
DB.syncWithCloud(handleSyncUpdate);
DB_Users.syncWithCloud(() => {
  if (document.getElementById('admin-dashboard')) {
    renderUsersTable();
  }
});
// Sincronizar el módulo clínico (expedientes, notas, recetas) al iniciar.
if (typeof ClinicalDB !== 'undefined') {
  ClinicalDB.syncWithCloud();
}
// Sincronizar firmas de médicos.
if (typeof SignatureDB !== 'undefined') {
  SignatureDB.syncWithCloud(() => {
    if (document.getElementById('admin-dashboard')) {
      renderUsersTable();
    }
  });
}

// ==========================================================================
// 🌗 SISTEMA DE TEMAS (CLARO/OSCURO) Y PARTICULAS PARA EL PANEL MEDICO
// ==========================================================================
let adminParticleAnimationId = null;

function initAdminThemeToggle() {
  const toggleBtn = document.getElementById('btn-theme-toggle');
  const dashboard = document.getElementById('dashboard-section');
  const sunIcon = document.getElementById('theme-toggle-icon-sun');
  const moonIcon = document.getElementById('theme-toggle-icon-moon');
  const toggleText = document.getElementById('theme-toggle-text');

  if (!toggleBtn || !dashboard) return;

  // Cargar preferencia guardada (por defecto es claro)
  let activeTheme = localStorage.getItem('kolymedical_admin_theme') || 'light';

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      dashboard.classList.add('dark-theme');
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
      if (toggleText) toggleText.textContent = 'Modo Claro';
      startAdminParticles();
    } else {
      dashboard.classList.remove('dark-theme');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
      if (toggleText) toggleText.textContent = 'Modo Oscuro';
      stopAdminParticles();
    }
  };

  applyTheme(activeTheme);

  toggleBtn.addEventListener('click', () => {
    activeTheme = activeTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('kolymedical_admin_theme', activeTheme);
    applyTheme(activeTheme);
  });
}

function startAdminParticles() {
  const canvas = document.getElementById('canvas-particles-admin');
  const section = document.getElementById('admin-dashboard');
  if (!canvas || !section) return;

  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = section.offsetWidth;
  let height = canvas.height = section.offsetHeight;

  const particles = [];
  const particleCount = 30; // 30 partículas es muy fluido y elegante

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.15;
      this.radius = Math.random() * 2 + 1;
      this.alpha = Math.random() * 0.4 + 0.1;
      this.growth = Math.random() > 0.5 ? 0.002 : -0.002;
      this.color = Math.random() > 0.4 ? '126, 168, 216' : '0, 168, 150'; // Steel Blue / Teal
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha += this.growth;

      if (this.alpha <= 0.1 || this.alpha >= 0.5) {
        this.growth = -this.growth;
      }

      if (this.x < 0 || this.x > width) this.vx = -this.vx;
      if (this.y < 0 || this.y > height) this.vy = -this.vy;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  if (adminParticleAnimationId) {
    cancelAnimationFrame(adminParticleAnimationId);
  }

  function animate() {
    const dashboard = document.getElementById('dashboard-section');
    if (!dashboard || !dashboard.classList.contains('dark-theme')) {
      ctx.clearRect(0, 0, width, height);
      canvas.style.display = 'none';
      return;
    }

    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    adminParticleAnimationId = requestAnimationFrame(animate);
  }

  // Escuchar el tamaño dinámico de la sección administrativa con ResizeObserver
  if (!window.adminResizeObserver) {
    window.adminResizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        width = canvas.width = entry.contentRect.width;
        height = canvas.height = entry.contentRect.height;
      }
    });
    window.adminResizeObserver.observe(section);
  }

  animate();
}

function stopAdminParticles() {
  const canvas = document.getElementById('canvas-particles-admin');
  if (canvas) {
    canvas.style.display = 'none';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (adminParticleAnimationId) {
    cancelAnimationFrame(adminParticleAnimationId);
    adminParticleAnimationId = null;
  }
}

let loginParticleAnimationId = null;

function initLoginParticles() {
  const canvas = document.getElementById('canvas-particles-login');
  const section = document.getElementById('login-section');
  if (!canvas || !section) return;

  const ctx = canvas.getContext('2d');
  let width = canvas.width = section.offsetWidth;
  let height = canvas.height = section.offsetHeight;

  const particles = [];
  const particleCount = 35; // sutil y elegante

  class Particle {
    constructor() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.15;
      this.radius = Math.random() * 2 + 1;
      this.alpha = Math.random() * 0.4 + 0.1;
      this.growth = Math.random() > 0.5 ? 0.002 : -0.002;
      this.color = Math.random() > 0.4 ? '126, 168, 216' : '0, 168, 150'; // Steel Blue o Teal
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha += this.growth;

      if (this.alpha <= 0.1 || this.alpha >= 0.5) {
        this.growth = -this.growth;
      }

      if (this.x < 0 || this.x > width) this.vx = -this.vx;
      if (this.y < 0 || this.y > height) this.vy = -this.vy;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }

  if (loginParticleAnimationId) {
    cancelAnimationFrame(loginParticleAnimationId);
  }

  function animate() {
    // Si la pantalla de login ya está oculta (el usuario ingresó), detener el loop
    if (section.style.display === 'none') {
      ctx.clearRect(0, 0, width, height);
      loginParticleAnimationId = null;
      return;
    }

    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    loginParticleAnimationId = requestAnimationFrame(animate);
  }

  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      width = canvas.width = entry.contentRect.width;
      height = canvas.height = entry.contentRect.height;
    }
  });
  resizeObserver.observe(section);

  animate();
}

/* ==========================================================================
   🔎 BUSCADOR / SELECTOR GENÉRICO (CIE-10, medicamentos, estudios)
   Carga diferida del catálogo, búsqueda con debounce y máx N resultados.
   Selección obligatoria desde el catálogo (sin texto libre).
   ========================================================================== */
function debounce(fn, wait) {
  let t = null;
  return function () {
    const args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(ctx, args), wait);
  };
}

// Abre un modal de búsqueda. loadFn(): Promise que asegura el catálogo cargado.
// searchFn(query): [] resultados. renderItem(item): HTML de la fila. onSelect(item).
function openSearchPicker(config) {
  const prev = document.getElementById('search-picker-modal');
  if (prev) prev.remove();

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'search-picker-modal';
  modal.style.zIndex = '4000';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:560px; width:94%; padding:1.25rem; max-height:80vh; display:flex; flex-direction:column;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <h3 style="color:var(--color-primary); font-weight:700; margin:0; font-size:1.1rem;">${config.title}</h3>
        <button id="sp-close" style="font-size:1.4rem; line-height:1; color:var(--color-text-muted);">&times;</button>
      </div>
      <input type="text" id="sp-input" class="form-control" placeholder="${config.placeholder || 'Escribe para buscar...'}" autocomplete="off" style="margin-bottom:0.75rem;">
      <div id="sp-results" style="overflow-y:auto; flex:1; border:1px solid var(--color-border); border-radius:var(--border-radius-sm);">
        <p style="padding:1rem; color:var(--color-text-muted); font-size:0.85rem; text-align:center;">Cargando catálogo…</p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector('#sp-input');
  const resultsBox = modal.querySelector('#sp-results');
  modal.querySelector('#sp-close').addEventListener('click', () => modal.remove());

  function renderResults(items) {
    if (!items || items.length === 0) {
      resultsBox.innerHTML = '<p style="padding:1rem; color:var(--color-text-muted); font-size:0.85rem; text-align:center;">Sin resultados. Prueba con otro término.</p>';
      return;
    }
    resultsBox.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'sp-result-row';
      row.style.cssText = 'padding:0.55rem 0.75rem; border-bottom:1px solid var(--color-border); cursor:pointer; font-size:0.87rem;';
      row.innerHTML = config.renderItem(item);
      row.addEventListener('mouseenter', () => row.style.background = 'rgba(0,168,150,0.08)');
      row.addEventListener('mouseleave', () => row.style.background = 'transparent');
      row.addEventListener('click', () => {
        config.onSelect(item);
        modal.remove();
      });
      resultsBox.appendChild(row);
    });
  }

  const doSearch = debounce(() => {
    const q = input.value.trim();
    if (q.length < 2) {
      resultsBox.innerHTML = '<p style="padding:1rem; color:var(--color-text-muted); font-size:0.85rem; text-align:center;">Escribe al menos 2 caracteres.</p>';
      return;
    }
    renderResults(config.searchFn(q));
  }, 250);

  input.addEventListener('input', doSearch);

  // Carga diferida del catálogo, luego habilita búsqueda
  config.loadFn().then(() => {
    resultsBox.innerHTML = '<p style="padding:1rem; color:var(--color-text-muted); font-size:0.85rem; text-align:center;">Escribe para buscar en el catálogo.</p>';
    if (config.showAllOnOpen) renderResults(config.searchFn(''));
    input.focus();
  });
}

// Selector CIE-10 (antecedentes y diagnósticos). onSelect({code, description}).
function openCie10Picker(onSelect) {
  openSearchPicker({
    title: 'Buscar diagnóstico CIE-10',
    placeholder: 'Ej. hipertension, diabetes, J45...',
    loadFn: () => Catalogs.loadCie10(),
    searchFn: (q) => Catalogs.searchCie10(q, 30),
    renderItem: (item) => `<strong style="color:var(--color-accent);">${item.code}</strong> — ${item.description}`,
    onSelect: onSelect
  });
}

// Selector de medicamentos. onSelect(medObj).
function openMedicamentoPicker(onSelect) {
  openSearchPicker({
    title: 'Buscar medicamento',
    placeholder: 'Ej. paracetamol, omeprazol...',
    loadFn: () => Catalogs.loadMedicamentos(),
    searchFn: (q) => Catalogs.searchMedicamentos(q, 30),
    renderItem: (m) => `<strong>${m.nombre_comercial}</strong> <span style="color:var(--color-text-muted);">(${m.nombre_generico})</span><br><span style="font-size:0.78rem; color:var(--color-primary-light);">${m.presentacion} · ${m.concentracion}</span>`,
    onSelect: onSelect
  });
}

// Selector de estudios (agrupado por categoría). onSelect({categoria, nombre}).
function openEstudioPicker(onSelect) {
  openSearchPicker({
    title: 'Buscar estudio / orden médica',
    placeholder: 'Ej. ecografía, fibroscan, tomografía...',
    loadFn: () => Catalogs.loadEstudios(),
    searchFn: (q) => Catalogs.searchEstudios(q, 60),
    renderItem: (e) => `<strong>${e.nombre}</strong><br><span style="font-size:0.78rem; color:var(--color-primary-light);">${e.categoria}</span>`,
    onSelect: onSelect,
    showAllOnOpen: true
  });
}

/* ==========================================================================
   💊 GENERADOR DE RECETAS / ÓRDENES + PDF (pdf-lib, 100% en el navegador)
   ========================================================================== */
function openPrescriptionBuilder(record, currentNoteDiagnoses) {
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  const prev = document.getElementById('prescription-modal');
  if (prev) prev.remove();

  // Diagnóstico sugerido: primero de la nota activa si existe, si no, de las anteriores.
  let suggestedDiag = '';
  if (currentNoteDiagnoses && currentNoteDiagnoses.length) {
    suggestedDiag = currentNoteDiagnoses.map(d => `${d.code} ${d.description}`).join('; ');
  } else {
    const notes = ClinicalDB.getNotesByRecord(record.id);
    for (const n of notes) {
      if (n.diagnosisCodes && n.diagnosisCodes.length) {
        suggestedDiag = n.diagnosisCodes.map(d => `${d.code} ${d.description}`).join('; ');
        break;
      }
    }
  }

  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'prescription-modal';
  modal.style.zIndex = '3800';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:720px; width:96%; padding:1.5rem; max-height:90vh; overflow-y:auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3 style="color:var(--color-primary); font-weight:700; margin:0;">Nueva receta / orden médica</h3>
        <button id="pr-close" style="font-size:1.5rem; line-height:1; color:var(--color-text-muted);">&times;</button>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:1rem;">
        <div><label style="font-size:0.8rem; font-weight:600;">Paciente</label><input type="text" class="form-control" value="${record.patientName}" readonly style="background:#f0f3f4;"></div>
        <div><label style="font-size:0.8rem; font-weight:600;">DNI</label><input type="text" id="pr-dni" class="form-control" placeholder="Documento (opcional)"></div>
        <div style="grid-column:1/-1;"><label style="font-size:0.8rem; font-weight:600;">Diagnóstico</label><input type="text" id="pr-diagnosis" class="form-control" value="${suggestedDiag}" placeholder="Diagnóstico clínico"></div>
      </div>

      <label style="font-size:0.85rem; font-weight:600; color:var(--color-primary);">Ítems (medicamentos / estudios)</label>
      <div id="pr-items" style="margin:0.5rem 0;"></div>
      <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
        <button class="btn btn-secondary" id="pr-add-med" style="font-size:0.8rem;">+ Medicamento</button>
        <button class="btn btn-secondary" id="pr-add-study" style="font-size:0.8rem;">+ Estudio</button>
      </div>

      <label style="font-size:0.85rem; font-weight:600; color:var(--color-primary);">Indicaciones generales</label>
      <textarea id="pr-indications" class="form-control" rows="3" placeholder="Reposo, dieta, recomendaciones..." style="margin:0.4rem 0 1rem; font-size:0.9rem;"></textarea>

      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button class="btn btn-secondary" id="pr-cancel">Cancelar</button>
        <button class="btn btn-accent align-icon-text" id="pr-generate">
          <i data-lucide="file-text" class="icon-inline"></i> Generar PDF
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  if (window.lucide) {
    window.lucide.createIcons();
  }

  const itemsBox = modal.querySelector('#pr-items');
  const rows = []; // {tipo, data, el}

  function renderRow(row) {
    const el = document.createElement('div');
    el.style.cssText = 'border:1px solid var(--color-border); border-radius:var(--border-radius-sm); padding:0.6rem; margin-bottom:0.5rem;';
    if (row.tipo === 'medicamento') {
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-accent); text-transform:uppercase; display:inline-flex; align-items:center;">
            <i data-lucide="pill" class="icon-inline mr-1" style="width: 14px; height: 14px; top:0;"></i> Medicamento
          </span>
          <button class="pr-remove" style="color:var(--color-danger); font-weight:700;">Quitar</button>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
          <button class="btn btn-secondary pr-pick-med" style="font-size:0.75rem; white-space:nowrap; padding:0.3rem 0.5rem; height:auto;">Buscar en catálogo</button>
          <span style="font-size:0.8rem; color:var(--color-text-muted);">o escribe:</span>
          <input type="text" class="form-control pr-custom-med-name" placeholder="Medicamento personalizado (Nombre, concentración...)" style="font-size:0.8rem; flex-grow:1; padding:0.25rem 0.5rem; height:auto;">
        </div>
        <div class="pr-med-display" style="font-size:0.85rem; margin-bottom:0.4rem; color:var(--color-text-muted); font-style:italic;">Ninguno seleccionado del catálogo.</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:0.4rem;">
          <input type="text" class="form-control pr-dosis" placeholder="Dosis (1 tab)" style="font-size:0.8rem;">
          <input type="text" class="form-control pr-freq" placeholder="Frecuencia (c/8h)" style="font-size:0.8rem;">
          <input type="text" class="form-control pr-dur" placeholder="Duración (7 días)" style="font-size:0.8rem;">
        </div>`;
    } else {
      el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
          <span style="font-size:0.75rem; font-weight:700; color:var(--color-primary); text-transform:uppercase; display:inline-flex; align-items:center;">
            <i data-lucide="microscope" class="icon-inline mr-1" style="width: 14px; height: 14px; top:0;"></i> Estudio / Examen de Laboratorio
          </span>
          <button class="pr-remove" style="color:var(--color-danger); font-weight:700;">Quitar</button>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
          <button class="btn btn-secondary pr-pick-study" style="font-size:0.75rem; white-space:nowrap; padding:0.3rem 0.5rem; height:auto;">Buscar en Catálogo</button>
          <span style="font-size:0.8rem; color:var(--color-text-muted);">o escribe:</span>
          <input type="text" class="form-control pr-custom-study-name" placeholder="Examen o estudio personalizado..." style="font-size:0.8rem; flex-grow:1; padding:0.25rem 0.5rem; height:auto;">
        </div>
        <div class="pr-study-display" style="font-size:0.85rem; margin-bottom:0.4rem; color:var(--color-text-muted); font-style:italic;">Ningún estudio seleccionado del catálogo.</div>
        <input type="text" class="form-control pr-study-note" placeholder="Indicación clínica (opcional: en ayunas, orina 24h...)" style="font-size:0.8rem;">`;
    }
    itemsBox.appendChild(el);
    if (window.lucide) {
      window.lucide.createIcons();
    }
    row.el = el;

    el.querySelector('.pr-remove').addEventListener('click', () => {
      const i = rows.indexOf(row);
      if (i !== -1) rows.splice(i, 1);
      el.remove();
    });

    if (row.tipo === 'medicamento') {
      const customInput = el.querySelector('.pr-custom-med-name');
      customInput.addEventListener('input', () => {
        if (customInput.value.trim() !== '') {
          row.data = null;
          el.querySelector('.pr-med-display').innerHTML = '<span style="color:var(--color-accent); font-weight:600;">Usando medicamento escrito a mano.</span>';
        } else {
          el.querySelector('.pr-med-display').innerHTML = 'Ninguno seleccionado del catálogo.';
          el.querySelector('.pr-med-display').style.color = 'var(--color-text-muted)';
        }
      });

      el.querySelector('.pr-pick-med').addEventListener('click', () => {
        openMedicamentoPicker((m) => {
          row.data = m;
          customInput.value = '';
          el.querySelector('.pr-med-display').innerHTML = `<strong>${m.nombre_comercial}</strong> (${m.nombre_generico}) — ${m.presentacion} ${m.concentracion}`;
          el.querySelector('.pr-med-display').style.color = 'var(--color-text-dark)';
        });
      });
    } else {
      const customStudyInput = el.querySelector('.pr-custom-study-name');
      customStudyInput.addEventListener('input', () => {
        if (customStudyInput.value.trim() !== '') {
          row.data = { nombre: customStudyInput.value.trim(), categoria: 'Laboratorio' };
          el.querySelector('.pr-study-display').innerHTML = '<span style="color:var(--color-accent); font-weight:600;">Usando examen escrito a mano.</span>';
        } else {
          row.data = null;
          el.querySelector('.pr-study-display').innerHTML = 'Ningún estudio seleccionado del catálogo.';
          el.querySelector('.pr-study-display').style.color = 'var(--color-text-muted)';
        }
      });

      el.querySelector('.pr-pick-study').addEventListener('click', () => {
        openEstudioPicker((e) => {
          row.data = e;
          customStudyInput.value = '';
          el.querySelector('.pr-study-display').innerHTML = `<strong>${e.nombre}</strong> <span style="color:var(--color-text-muted);">(${e.categoria})</span>`;
          el.querySelector('.pr-study-display').style.color = 'var(--color-text-dark)';
        });
      });
    }
  }

  modal.querySelector('#pr-add-med').addEventListener('click', () => {
    const row = { tipo: 'medicamento', data: null };
    rows.push(row); renderRow(row);
  });
  modal.querySelector('#pr-add-study').addEventListener('click', () => {
    const row = { tipo: 'estudio', data: null };
    rows.push(row); renderRow(row);
  });

  modal.querySelector('#pr-close').addEventListener('click', () => modal.remove());
  modal.querySelector('#pr-cancel').addEventListener('click', () => modal.remove());

  modal.querySelector('#pr-generate').addEventListener('click', async () => {
    // Recolectar ítems
    const items = [];
    rows.forEach(row => {
      if (row.tipo === 'medicamento') {
        const customName = row.el.querySelector('.pr-custom-med-name').value.trim();
        if (customName) {
          items.push({
            tipo: 'medicamento',
            nombre: customName,
            generico: '',
            presentacion: '',
            concentracion: '',
            dosis: row.el.querySelector('.pr-dosis').value.trim(),
            frecuencia: row.el.querySelector('.pr-freq').value.trim(),
            duracion: row.el.querySelector('.pr-dur').value.trim()
          });
        } else if (row.data) {
          items.push({
            tipo: 'medicamento',
            nombre: row.data.nombre_comercial,
            generico: row.data.nombre_generico,
            presentacion: row.data.presentacion,
            concentracion: row.data.concentracion,
            dosis: row.el.querySelector('.pr-dosis').value.trim(),
            frecuencia: row.el.querySelector('.pr-freq').value.trim(),
            duracion: row.el.querySelector('.pr-dur').value.trim()
          });
        }
      } else if (row.tipo === 'estudio' && row.data) {
        items.push({
          tipo: 'estudio',
          nombre: row.data.nombre,
          categoria: row.data.categoria,
          indicacion: row.el.querySelector('.pr-study-note').value.trim()
        });
      }
    });

    if (items.length === 0) {
      alert('Agrega al menos un medicamento (seleccionado o escrito) o un estudio.');
      return;
    }

    const prescription = {
      recordId: record.id,
      specialistId: currentUser.specialistId || '',
      diagnosis: modal.querySelector('#pr-diagnosis').value.trim(),
      dni: modal.querySelector('#pr-dni').value.trim(),
      indications: modal.querySelector('#pr-indications').value.trim(),
      items: items
    };

    await ClinicalDB.savePrescription(prescription);
    await generatePrescriptionPDF(record, prescription);
    modal.remove();

    // Refrescar la lista de recetas del expediente si sigue abierto
    renderPrescriptionsList(record.id);
  });
}

// Cache de bytes del logo para no re-descargarlo por cada PDF.
let _logoBytesCache = null;
async function getLogoBytes() {
  if (_logoBytesCache) return _logoBytesCache;
  try {
    const res = await fetch('Koly_MEDICAL_banner_cropped.png', { cache: 'force-cache' });
    const buf = await res.arrayBuffer();
    _logoBytesCache = new Uint8Array(buf);
    return _logoBytesCache;
  } catch (e) {
    console.warn('No se pudo cargar el logo para el PDF:', e);
    return null;
  }
}

// Genera y descarga el PDF de la receta/orden con el membrete de KolyMedical.
async function generatePrescriptionPDF(record, prescription) {
  if (!window.PDFLib) {
    alert('La librería de PDF no está disponible. Verifica tu conexión e inténtalo de nuevo.');
    return;
  }
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 vertical
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontObl = await doc.embedFont(StandardFonts.HelveticaOblique);

  const primary = rgb(0.239, 0.353, 0.451);   // #3D5A73
  const accent = rgb(0, 0.659, 0.588);         // #00A896
  const dark = rgb(0.2, 0.2, 0.2);
  const muted = rgb(0.45, 0.45, 0.45);

  const M = 48; // margen
  let y = height - 50;

  // ---- Cabecera / membrete ----
  const logoBytes = await getLogoBytes();
  if (logoBytes) {
    try {
      const logo = await doc.embedPng(logoBytes);
      const lw = 220; // Banner width
      const lh = (logo.height / logo.width) * lw; // maintaining aspect ratio
      page.drawImage(logo, { x: M, y: height - 40 - lh, width: lw, height: lh });
    } catch (e) { /* si falla, seguimos sin logo */ }
  }

  // Fecha (arriba derecha)
  const fecha = new Date(prescription.createdAt || Date.now()).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  page.drawText('FECHA:', { x: width - M - 150, y: height - 58, size: 9, font: fontBold, color: muted });
  page.drawText(fecha, { x: width - M - 105, y: height - 58, size: 9, font: font, color: dark });

  // Línea divisoria bajo el membrete
  y = height - 96;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 1.5, color: accent });

  // ---- Datos del paciente ----
  y -= 26;
  const edad = calcAge(record);
  function field(label, value, x, yy, maxWidth) {
    page.drawText(label, { x, y: yy, size: 9, font: fontBold, color: primary });
    const lw = fontBold.widthOfTextAtSize(label, 9);
    page.drawText(pdfSafe(value) || '-', { x: x + lw + 5, y: yy, size: 10, font, color: dark, maxWidth: maxWidth });
  }
  field('PACIENTE:', record.patientName, M, y, 300);
  field('EDAD:', edad + ' años', width - M - 130, y, 120);
  y -= 20;
  field('DNI:', record.dni || '—', M, y, 200);
  y -= 20;
  // Diagnóstico (puede envolver)
  page.drawText('DIAGNÓSTICO:', { x: M, y, size: 9, font: fontBold, color: primary });
  const diagLines = wrapText(prescription.diagnosis || '—', font, 10, width - 2 * M - 90);
  diagLines.forEach((ln, i) => {
    page.drawText(ln, { x: M + 90, y: y - i * 13, size: 10, font, color: dark });
  });
  y -= Math.max(diagLines.length * 13, 13) + 12;

  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.5, color: rgb(0.8, 0.85, 0.85) });
  y -= 24;

  // ---- Dos columnas: RECETA (izq) e INDICACIONES (der) ----
  const colGap = 24;
  const colWidth = (width - 2 * M - colGap) / 2;
  const leftX = M;
  const rightX = M + colWidth + colGap;
  const topY = y;

  page.drawText('RECETA', { x: leftX, y: topY, size: 12, font: fontBold, color: accent });
  page.drawText('INDICACIONES', { x: rightX, y: topY, size: 12, font: fontBold, color: accent });

  // Contenido RECETA (medicamentos)
  const meds = (prescription.items || []).filter(i => i.tipo === 'medicamento');
  let ly = topY - 20;
  if (meds.length === 0) {
    page.drawText('-', { x: leftX, y: ly, size: 10, font, color: muted });
  } else {
    meds.forEach((m, idx) => {
      const title = `${idx + 1}. ${m.nombre} ${m.concentracion || ''}`.trim();
      wrapText(title, fontBold, 10, colWidth).forEach(ln => {
        page.drawText(ln, { x: leftX, y: ly, size: 10, font: fontBold, color: dark });
        ly -= 13;
      });
      const poso = [m.dosis, m.frecuencia, m.duracion].filter(Boolean).join('  ·  ');
      if (poso) {
        wrapText(poso, font, 9, colWidth).forEach(ln => {
          page.drawText(ln, { x: leftX + 8, y: ly, size: 9, font: fontObl, color: muted });
          ly -= 12;
        });
      }
      ly -= 6;
    });
  }

  // Contenido INDICACIONES (texto libre + estudios "Se solicita:")
  const studies = (prescription.items || []).filter(i => i.tipo === 'estudio');
  let ry = topY - 20;
  if (prescription.indications) {
    wrapText(prescription.indications, font, 10, colWidth).forEach(ln => {
      page.drawText(ln, { x: rightX, y: ry, size: 10, font, color: dark });
      ry -= 13;
    });
    ry -= 6;
  }
  studies.forEach(s => {
    const line = `Se solicita: ${s.nombre}` + (s.indicacion ? ` (${s.indicacion})` : '');
    wrapText(line, font, 10, colWidth).forEach((ln, i) => {
      page.drawText(ln, { x: rightX, y: ry, size: 10, font: i === 0 ? fontBold : font, color: i === 0 ? primary : dark });
      ry -= 13;
    });
    ry -= 5;
  });
  if (!prescription.indications && studies.length === 0) {
    page.drawText('-', { x: rightX, y: ry, size: 10, font, color: muted });
  }

  // ---- Firma y pie ----
  const spec = SPECIALISTS.find(d => d.id === prescription.specialistId);
  const footY = 120;

  // Cargar firma (desde DB o de la carpeta física firmas/)
  let signatureDataUrl = SignatureDB.get(prescription.specialistId);
  if (!signatureDataUrl && prescription.specialistId) {
    try {
      const res = await fetch(`firmas/${prescription.specialistId}.png`);
      if (res.ok) {
        const blob = await res.blob();
        signatureDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      console.warn(`No se pudo cargar la firma de fallback firmas/${prescription.specialistId}.png:`, e);
    }
  }

  let drawnSignature = false;
  // Dibujar la firma si existe
  if (signatureDataUrl) {
    try {
      const parts = signatureDataUrl.split(',');
      if (parts.length === 2) {
        const base64Data = parts[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const sigBytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          sigBytes[i] = binaryString.charCodeAt(i);
        }

        let embeddedImage;
        if (signatureDataUrl.includes('image/jpeg') || signatureDataUrl.includes('image/jpg')) {
          embeddedImage = await doc.embedJpg(sigBytes);
        } else {
          embeddedImage = await doc.embedPng(sigBytes);
        }

        const sigWidth = 160; // Larger signature width
        let sigHeight = (embeddedImage.height / embeddedImage.width) * sigWidth;
        const maxSigHeight = 75; // Larger max height
        let finalW = sigWidth;
        let finalH = sigHeight;
        if (sigHeight > maxSigHeight) {
          finalH = maxSigHeight;
          finalW = (embeddedImage.width / embeddedImage.height) * finalH;
        }

        page.drawImage(embeddedImage, {
          x: width / 2 - finalW / 2,
          y: footY + 10, // Adjusted vertical position
          width: finalW,
          height: finalH
        });
        drawnSignature = true;
      }
    } catch (err) {
      console.error('Error al incrustar la firma en el PDF:', err);
    }
  }

  // Dibujar línea y textos solo si NO se pudo dibujar la firma digital
  if (!drawnSignature) {
    page.drawLine({ start: { x: width / 2 - 90, y: footY + 22 }, end: { x: width / 2 + 90, y: footY + 22 }, thickness: 0.8, color: dark });
    const specName = spec ? spec.name : 'Especialista';
    page.drawText(specName, { x: width / 2 - font.widthOfTextAtSize(specName, 10) / 2, y: footY + 8, size: 10, font: fontBold, color: primary });
    if (spec && spec.specialty) {
      page.drawText(spec.specialty, { x: width / 2 - font.widthOfTextAtSize(spec.specialty, 9) / 2, y: footY - 4, size: 9, font, color: muted });
    }
  }

  page.drawLine({ start: { x: M, y: 70 }, end: { x: width - M, y: 70 }, thickness: 1, color: accent });
  const footer1 = 'KolyMedical  ·  Innovation - Precision - Care';
  page.drawText(footer1, { x: width / 2 - font.widthOfTextAtSize(footer1, 8) / 2, y: 56, size: 8, font, color: primary });
  const footer2 = 'WhatsApp: +51 987 346 934   ·   @kolymedical';
  page.drawText(footer2, { x: width / 2 - font.widthOfTextAtSize(footer2, 8) / 2, y: 44, size: 8, font, color: muted });

  // Descargar
  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (record.patientName || 'paciente').replace(/[^a-z0-9]/gi, '_');
  a.href = url;
  a.download = `Receta_${safeName}_${fecha.replace(/\//g, '-')}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Sanea texto para las fuentes estándar de pdf-lib (WinAnsi): reemplaza
// puntuación Unicode común y descarta caracteres fuera de rango para evitar
// que la generación del PDF falle con descripciones CIE-10 poco comunes.
function pdfSafe(str) {
  return String(str == null ? '' : str)
    .replace(/[–—]/g, '-')   // en/em dash
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^ -ÿ]/g, '');  // fuera de latin-1 → se descarta
}

// Envuelve texto a un ancho máximo (en puntos) para pdf-lib.
function wrapText(text, font, size, maxWidth) {
  const words = pdfSafe(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(w => {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ['—'];
}

function renderAllPrescriptionsTable() {
  const tbody = document.getElementById('prescriptions-table-body-detailed');
  if (!tbody) return;

  tbody.innerHTML = '';

  const searchEl = document.getElementById('prescriptions-search');
  const searchQuery = searchEl ? searchEl.value.toLowerCase().trim() : '';

  const prescriptions = ClinicalDB.getPrescriptions() || [];
  
  const filtered = prescriptions.filter(p => {
    const record = ClinicalDB.getRecordById(p.recordId);
    if (!record) return false;

    const patientName = (record.patientName || '').toLowerCase();
    const patientDni = (record.dni || '').toLowerCase();
    const formattedDate = new Date(p.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
    const diagnosis = (p.diagnosis || '').toLowerCase();

    const matchesSearch = 
      patientName.includes(searchQuery) ||
      patientDni.includes(searchQuery) ||
      formattedDate.includes(searchQuery) ||
      diagnosis.includes(searchQuery);

    return matchesSearch;
  });

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--color-text-muted); padding:2rem;">No se encontraron recetas médicas en el repositorio.</td></tr>';
    return;
  }

  filtered.forEach(p => {
    const record = ClinicalDB.getRecordById(p.recordId);
    const doctor = SPECIALISTS.find(d => d.id === p.specialistId);
    const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${record ? record.patientName : 'Paciente Desconocido'}</strong><br><span style="font-size:0.75rem; color:var(--color-text-muted);">${record ? record.patientPhone : ''}</span></td>
      <td>${record && record.dni ? record.dni : '—'}</td>
      <td>${p.diagnosis || '—'}</td>
      <td>${dateStr}</td>
      <td>${doctor ? doctor.name : '—'}</td>
      <td style="text-align:center;">
        <button class="btn btn-secondary btn-download-pdf-general align-icon-text" style="padding:0.3rem 0.6rem; font-size:0.8rem;" title="Descargar receta PDF">
          <i data-lucide="file-text" class="icon-inline" style="width:14px; height:14px;"></i> PDF
        </button>
      </td>
    `;

    tr.querySelector('.btn-download-pdf-general').addEventListener('click', () => {
      if (record) {
        generatePrescriptionPDF(record, p);
      } else {
        alert('No se pudo encontrar el expediente de este paciente para generar la receta.');
      }
    });

    tbody.appendChild(tr);
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Inicializar buscador de recetas
document.addEventListener('DOMContentLoaded', () => {
  const prescriptionsSearch = document.getElementById('prescriptions-search');
  if (prescriptionsSearch) {
    prescriptionsSearch.addEventListener('input', renderAllPrescriptionsTable);
  }
  const clearSearchBtn = document.getElementById('btn-clear-prescriptions-search');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (prescriptionsSearch) prescriptionsSearch.value = '';
      renderAllPrescriptionsTable();
    });
  }
});