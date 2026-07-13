/**
 * KolyMedical — Lógica de la Aplicación y Gestión de Citas (Local Storage & Adaptable a Supabase)
 */

// 1. Base de Datos de Configuración Inicial (Mock Data)
let SPECIALISTS = [];
const INITIAL_SPECIALISTS = [
  { id: 'pedraza', name: 'Dr. Pedraza', specialty: 'Medicina Regenerativa', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '12:00', slotDuration: 60 },
  { id: 'amelia', name: 'Lic. Amelia', specialty: 'Nutrición Clínica', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '16:30', slotDuration: 30 },
  { id: 'morales', name: 'Dr. Joel Morales', specialty: 'Gastroenterología', workDays: [1, 2, 3, 4, 5, 6], workStart: '10:00', workEnd: '17:00', slotDuration: 30 },
  { id: 'ruslan', name: 'Dr. Ruslan Golovliov', specialty: 'Estudio FibroScan', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '17:00', slotDuration: 30 },
  { id: 'montes', name: 'Dr. Guido Montes', specialty: 'Otorrinolaringología', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '16:30', slotDuration: 60 },
  { id: 'melendes', name: 'Lic. Ricardo Melendes', specialty: 'Psicología Clínica', workDays: [1, 2, 3, 4, 5, 6], workStart: '09:00', workEnd: '16:00', slotDuration: 45 }
];

const SERVICES = [
  { id: 'med_reg', name: 'Consulta — Medicina Regenerativa', price: 100, specialistId: 'pedraza', duration: 60 },
  { id: 'nutricion', name: 'Consulta — Nutrición Clínica', price: 150, specialistId: 'amelia', duration: 30 },
  { id: 'gastro', name: 'Consulta — Gastroenterología', price: 100, specialistId: 'morales', duration: 60 },
  { id: 'otorrino', name: 'Consulta — Otorrinolaringología', price: 100, specialistId: 'montes', duration: 60 },
  { id: 'fibroscan', name: 'Estudio — FibroScan', price: 650, specialistId: 'ruslan', duration: 30 },
  { id: 'curacion_heridas', name: 'Curación de Heridas Crónicas (A Domicilio)', price: 150, specialistId: 'pedraza', duration: 60 },
  { id: 'psicologia', name: 'Consulta — Psicología Clínica', price: 100, specialistId: 'melendes', duration: 60 }
];

const AGENT_CONTACTS = {
  'Brayan': { name: 'Brayan García', phone: '927942988' },
  'Andrea': { name: 'Andrea Mendoza', phone: '988776655' }
};

function sendWhatsAppReminder(apt) {
  const service = SERVICES.find(s => s.id === apt.serviceId);
  const doctor = SPECIALISTS.find(d => d.id === apt.specialistId);
  const dateStr = apt.date;
  const timeStr = apt.time;
  const modality = apt.modality;

  const msg = `Hola ${apt.patientName}, te saludamos de KolyMedical. Le recordamos que tiene una cita programada para mañana ${dateStr} a las ${timeStr} (${modality}) con el ${doctor ? doctor.name : ''}. Por favor, confirme su asistencia respondiendo a este de WhatsApp. ¡Gracias!`;

  const encodedMsg = encodeURIComponent(msg);
  const url = `https://wa.me/51${apt.patientPhone}?text=${encodedMsg}`;
  window.open(url, '_blank');
}

const INITIAL_APPOINTMENTS = [
  { id: 'apt-1', patientName: 'Carlos Mendoza', patientAge: 45, patientPhone: '987654321', serviceId: 'med_reg', specialistId: 'pedraza', date: getRelativeDate(0), time: '10:00', modality: 'Presencial', status: 'confirmada', trackedBy: 'Brayan' },
  { id: 'apt-2', patientName: 'María Rodríguez', patientAge: 52, patientPhone: '912345678', serviceId: 'fibroscan', specialistId: 'ruslan', date: getRelativeDate(1), time: '11:00', modality: 'Presencial', status: 'pendiente', trackedBy: 'Andrea' },
  { id: 'apt-3', patientName: 'Juan Pérez', patientAge: 38, patientPhone: '955443322', serviceId: 'nutricion', specialistId: 'amelia', date: getRelativeDate(0), time: '15:00', modality: 'Virtual', status: 'realizada', trackedBy: 'Brayan' },
  { id: 'apt-4', patientName: 'Lucía Torres', patientAge: 60, patientPhone: '998877665', serviceId: 'otorrino', specialistId: 'montes', date: getRelativeDate(2), time: '09:00', modality: 'Virtual', status: 'confirmada', trackedBy: 'Andrea' }
];

const INITIAL_USERS = [
  { username: 'admin', fullname: 'Super Administrador', password: 'admin123', role: 'Administrador' },
  { username: 'brayan', fullname: 'Brayan García', password: 'com123', role: 'Comercial', trackedBy: 'Brayan' },
  { username: 'andrea', fullname: 'Andrea Mendoza', password: 'com123', role: 'Comercial', trackedBy: 'Andrea' },
  { username: 'drpedraza', fullname: 'Dr. Pedraza', password: 'doc123', role: 'Médico', specialistId: 'pedraza' },
  { username: 'licamelia', fullname: 'Lic. Amelia', password: 'doc123', role: 'Nutricionista', specialistId: 'amelia' },
  { username: 'drmorales', fullname: 'Dr. Joel Morales', password: 'doc123', role: 'Médico', specialistId: 'morales' },
  { username: 'drruslan', fullname: 'Dr. Ruslan Golovliov', password: 'doc123', role: 'Médico', specialistId: 'ruslan' },
  { username: 'drguido', fullname: 'Dr. Guido Montes', password: 'doc123', role: 'Médico', specialistId: 'montes' },
  { username: 'licmelendes', fullname: 'Lic. Ricardo Melendes', password: 'doc123', role: 'Psicólogo', specialistId: 'melendes' }
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

// Inicializar caché local desde LocalStorage para soporte offline
try {
  const cachedApts = safeLocalStorage.getItem('kolymedical_appointments');
  localAppointmentsCache = cachedApts ? JSON.parse(cachedApts) : INITIAL_APPOINTMENTS;

  const cachedUsers = safeLocalStorage.getItem('kolymedical_users');
  localUsersCache = cachedUsers ? JSON.parse(cachedUsers) : INITIAL_USERS;

  const cachedSpecialists = safeLocalStorage.getItem('kolymedical_specialists');
  SPECIALISTS = cachedSpecialists ? JSON.parse(cachedSpecialists) : INITIAL_SPECIALISTS;
} catch (e) {
  localAppointmentsCache = INITIAL_APPOINTMENTS;
  localUsersCache = INITIAL_USERS;
  SPECIALISTS = INITIAL_SPECIALISTS;
}

// Funciones de Mapeo de datos (PostgreSQL snake_case <-> Frontend camelCase)
function mapAptToDb(apt) {
  return {
    id: apt.id,
    patient_name: apt.patientName,
    patient_age: apt.patientAge,
    patient_phone: apt.patientPhone,
    service_id: apt.serviceId,
    specialist_id: apt.specialistId,
    date: apt.date,
    time: apt.time,
    modality: apt.modality,
    status: apt.status,
    tracked_by: apt.trackedBy
  };
}

function mapAptFromDb(dbApt) {
  return {
    id: dbApt.id,
    patientName: dbApt.patient_name,
    patientAge: dbApt.patient_age,
    patientPhone: dbApt.patient_phone,
    serviceId: dbApt.service_id,
    specialistId: dbApt.specialist_id,
    date: dbApt.date,
    time: dbApt.time,
    modality: dbApt.modality,
    status: dbApt.status,
    trackedBy: dbApt.tracked_by
  };
}

function mapUserToDb(u) {
  return {
    username: u.username,
    fullname: u.fullname,
    password: u.password,
    role: u.role,
    tracked_by: u.trackedBy || null,
    specialist_id: u.specialistId || null
  };
}

function mapUserFromDb(dbU) {
  return {
    username: dbU.username,
    fullname: dbU.fullname,
    password: dbU.password,
    role: dbU.role,
    trackedBy: dbU.tracked_by || undefined,
    specialistId: dbU.specialist_id || undefined
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
  SERVICES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} — S/ ${s.price}`;
    selectService.appendChild(opt);
  });

  // Evento al cambiar de servicio para autoseleccionar doctor y validar modalidad
  selectService.addEventListener('change', () => {
    const serviceVal = selectService.value;
    const selectDoctor = document.getElementById('booking-doctor');
    const selectModality = document.getElementById('booking-modality');
    const modalityNote = document.getElementById('booking-modality-note');

    selectDoctor.innerHTML = '<option value="">-- Selecciona Especialista --</option>';

    if (serviceVal) {
      const service = SERVICES.find(s => s.id === serviceVal);
      const doc = SPECIALISTS.find(d => d.id === service.specialistId);
      if (doc) {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.name;
        opt.selected = true;
        selectDoctor.appendChild(opt);
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
        modalityNote.textContent = '⚠️ El estudio FibroScan se realiza únicamente de forma presencial por el Dr. Ruslan Golovliov.';
        modalityNote.style.display = 'block';
      } else if (serviceVal === 'curacion_heridas') {
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
        modalityNote.textContent = '🏡 Servicio coordinado a domicilio. La enfermera/médico asistirá a la dirección provista.';
        modalityNote.style.display = 'block';
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
    } else {
      selectModality.disabled = false;
      modalityNote.style.display = 'none';
    }
  });

  // Generador de horarios cuando cambia fecha o doctor
  const inputDate = document.getElementById('booking-date');
  // Bloquear fechas pasadas
  const today = new Date().toISOString().split('T')[0];
  inputDate.min = today;
  inputDate.addEventListener('change', generateTimeSlots);
  selectService.addEventListener('change', generateTimeSlots);

  function generateTimeSlots() {
    const dateVal = inputDate.value;
    const serviceVal = selectService.value;
    const timeGrid = document.getElementById('time-slots-grid');
    timeGrid.innerHTML = '';

    if (!dateVal || !serviceVal) return;

    const service = SERVICES.find(s => s.id === serviceVal);
    const doctor = SPECIALISTS.find(d => d.id === service.specialistId);

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

  btnNext.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      if (currentStep < formSteps.length - 1) {
        currentStep++;
        updateSteps();
      } else {
        // Enviar Reserva
        savePatientBooking();
      }
    }
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      updateSteps();
    }
  });

  function validateStep(step) {
    if (step === 0) {
      const service = document.getElementById('booking-service').value;
      const doctor = document.getElementById('booking-doctor').value;
      const modality = document.getElementById('booking-modality').value;
      if (!service || !doctor || !modality) {
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
    const patientAge = parseInt(document.getElementById('booking-age').value);
    const patientPhone = document.getElementById('booking-phone').value.trim();

    const trackers = ['Brayan', 'Andrea'];
    const randomTracker = trackers[Math.floor(Math.random() * trackers.length)];

    const newApt = {
      patientName,
      patientAge,
      patientPhone,
      serviceId,
      specialistId,
      date,
      time,
      modality,
      status: 'pendiente',
      trackedBy: randomTracker
    };

    DB.saveAppointment(newApt);

    // Generar link de confirmación de WhatsApp
    const service = SERVICES.find(s => s.id === serviceId);
    const doctor = SPECIALISTS.find(d => d.id === specialistId);
    const textMsg = encodeURIComponent(
      `*Nueva Reserva KolyMedical*\n\n` +
      `Hola KolyMedical, deseo confirmar mi cita:\n` +
      `- *Paciente:* ${patientName} (${patientAge} años)\n` +
      `- *Servicio:* ${service.name}\n` +
      `- *Especialista:* ${doctor.name}\n` +
      `- *Fecha:* ${date}\n` +
      `- *Hora:* ${time}\n` +
      `- *Modalidad:* ${modality}\n` +
      `- *Teléfono:* ${patientPhone}`
    );
    const wsUrl = `https://wa.me/51987346934?text=${textMsg}`; // Colocar el número de WhatsApp oficial

    // Reemplazar contenido por éxito
    const modalBody = document.querySelector('.modal-content');
    modalBody.innerHTML = `
      <div style="padding: 3rem 2rem; text-align: center;">
        <span style="font-size: 4rem; color: var(--color-accent); display: block; margin-bottom: 1.5rem;">🎉</span>
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
  }

  function resetBookingForm() {
    document.getElementById('booking-service').value = '';
    document.getElementById('booking-doctor').innerHTML = '<option value="">-- Selecciona Especialista --</option>';
    document.getElementById('booking-modality').value = 'Presencial';
    document.getElementById('booking-modality').disabled = false;
    document.getElementById('booking-modality-note').style.display = 'none';
    document.getElementById('booking-date').value = '';
    document.getElementById('booking-selected-time').value = '';
    document.getElementById('time-slots-grid').innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.85rem; padding: 0.5rem; grid-column: span 4;">Selecciona una especialidad y fecha primero.</p>';
    document.getElementById('booking-name').value = '';
    document.getElementById('booking-age').value = '';
    document.getElementById('booking-phone').value = '';
    currentStep = 0;
    updateSteps();
  }
}

/* ==========================================================================
   👥 PANEL DE ADMINISTRACIÓN / TRABAJADORES (admin.html)
   ========================================================================== */
let calendarCurrentDate = new Date();

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
          .select('*');
        if (error) {
          console.error('Error al consultar usuarios en Supabase:', error);
          return;
        }

        if (data) {
          localUsersCache = data.map(mapUserFromDb);
          safeLocalStorage.setItem('kolymedical_users', JSON.stringify(localUsersCache));
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const userVal = document.getElementById('login-user').value.trim().toLowerCase();
    const passVal = document.getElementById('login-pass').value;

    const users = DB_Users.getUsers();
    const matched = users.find(u => u.username.toLowerCase() === userVal && u.password === passVal);

    if (matched) {
      safeSessionStorage.setItem('kolymedical_logged', 'true');
      safeSessionStorage.setItem('kolymedical_user', JSON.stringify(matched));
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('dashboard-section').style.display = 'grid';
      renderDashboard();
    } else {
      alert('Credenciales incorrectas. Pruebe con admin / admin123');
    }
  });
}

function renderDashboard() {
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  const menuUsers = document.getElementById('menu-users');
  const menuAvailability = document.getElementById('menu-availability');
  const roleText = document.getElementById('sidebar-user-role');

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
  if (currentUser && currentUser.role === 'Administrador') {
    if (menuUsers) menuUsers.style.display = 'block';
    if (menuAvailability) menuAvailability.style.display = 'block';
  } else if (currentUser && currentUser.specialistId) {
    if (menuUsers) menuUsers.style.display = 'none';
    if (menuAvailability) menuAvailability.style.display = 'block';
  } else {
    if (menuUsers) menuUsers.style.display = 'none';
    if (menuAvailability) menuAvailability.style.display = 'none';
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

  // Renderizar Vista Inicial (Estadísticas y Citas)
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
  if (!currentUser) return;

  const selectDoc = document.getElementById('availability-doctor-select');
  const containerSelect = document.getElementById('availability-doctor-select-container');
  if (!selectDoc) return;

  selectDoc.innerHTML = '';

  if (currentUser.role === 'Administrador') {
    if (containerSelect) containerSelect.style.display = 'block';
    SPECIALISTS.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${d.name} (${d.specialty})`;
      selectDoc.appendChild(opt);
    });
  } else if (currentUser.specialistId) {
    if (containerSelect) containerSelect.style.display = 'none';
    const opt = document.createElement('option');
    opt.value = currentUser.specialistId;
    opt.textContent = currentUser.fullname;
    selectDoc.appendChild(opt);
  }

  loadDoctorAvailabilityIntoForm();
}

function loadDoctorAvailabilityIntoForm() {
  const selectDoc = document.getElementById('availability-doctor-select');
  if (!selectDoc) return;
  const docId = selectDoc.value;
  if (!docId) return;

  const doctor = SPECIALISTS.find(d => d.id === docId);
  if (!doctor) return;

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
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const docId = selectDoc.value;
      if (!docId) return;

      const doctorIndex = SPECIALISTS.findIndex(d => d.id === docId);
      if (doctorIndex === -1) return;

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

      safeLocalStorage.setItem('kolymedical_specialists', JSON.stringify(SPECIALISTS));
      alert('Configuración de disponibilidad guardada correctamente.');
    });
  }
}

// -----------------------------------------------------
// 👥 VISTA: GESTIÓN DE PERSONAL (Super Admin)
// -----------------------------------------------------
function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const users = DB_Users.getUsers();
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.username}</strong></td>
      <td>${u.fullname}</td>
      <td><span class="status-badge ${u.role === 'Administrador' ? 'status-realizada' : 'status-confirmada'}">${u.role}</span></td>
      <td><code>••••••</code></td>
      <td>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-secondary btn-edit-user" data-username="${u.username}" style="padding:0.2rem 0.5rem; font-size:0.8rem;">✏️</button>
          <button class="btn btn-secondary btn-delete-user" data-username="${u.username}" style="padding:0.2rem 0.5rem; font-size:0.8rem; color:var(--color-danger); border-color:var(--color-danger);" ${u.username === 'admin' ? 'disabled' : ''}>🗑️</button>
        </div>
      </td>
    `;

    // Botones de acción
    tr.querySelector('.btn-edit-user').addEventListener('click', () => editUserAccount(u));
    tr.querySelector('.btn-delete-user').addEventListener('click', () => {
      if (confirm(`¿Está seguro de eliminar la cuenta del trabajador ${u.fullname}?`)) {
        DB_Users.deleteUser(u.username);
        renderUsersTable();
      }
    });

    tbody.appendChild(tr);
  });
}

function initUserManagementForm() {
  const form = document.getElementById('admin-user-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('user-username').value.trim();
    const fullname = document.getElementById('user-fullname').value.trim();
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const editId = document.getElementById('user-edit-id').value;

    const newUser = {
      username,
      fullname,
      password,
      role
    };

    // Si estamos editando y cambiamos de usuario
    if (editId && editId !== username) {
      DB_Users.deleteUser(editId); // Eliminar el viejo para evitar duplicados si cambia de login
    }

    DB_Users.saveUser(newUser);
    alert('Usuario guardado con éxito.');
    resetUserForm();
    renderUsersTable();
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
  document.getElementById('btn-cancel-user-edit').style.display = 'block';
}

function resetUserForm() {
  document.getElementById('user-form-title').textContent = 'Registrar Nuevo Trabajador';
  document.getElementById('user-edit-id').value = '';
  document.getElementById('admin-user-form').reset();
  document.getElementById('btn-cancel-user-edit').style.display = 'none';
}

// Actualizar Tarjetas de Estadísticas
function updateStats() {
  let appointments = DB.getAppointments();

  // Filtrar citas si el usuario es Médico / Especialista o Comercial
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (currentUser) {
    if (currentUser.specialistId) {
      appointments = appointments.filter(a => a.specialistId === currentUser.specialistId);
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
}

// 📅 Renderizar Calendario Visual Interactivo
function renderCalendarWidget() {
  const container = document.getElementById('calendar-widget-container');
  container.innerHTML = '';

  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();

  // Nombre de los meses
  const monthsNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Estructura del Widget
  const header = document.createElement('div');
  header.className = 'calendar-header';
  header.innerHTML = `
    <button class="calendar-nav-btn" id="cal-btn-prev">◀ Anterior</button>
    <h3 style="font-weight:700; color:var(--color-primary);">${monthsNames[month]} ${year}</h3>
    <button class="calendar-nav-btn" id="cal-btn-next">Siguiente ▶</button>
  `;
  container.appendChild(header);

  // Registrar eventos de navegación de meses
  document.getElementById('cal-btn-prev').addEventListener('click', () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
    renderCalendarWidget();
  });
  document.getElementById('cal-btn-next').addEventListener('click', () => {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
    renderCalendarWidget();
  });

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Días de la semana cabecera
  const daysHeader = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  daysHeader.forEach(day => {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-header';
    cell.textContent = day;
    grid.appendChild(cell);
  });

  // Obtener primer día del mes y número total de días
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo, 1 = Lunes...
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Adaptar index para que comience en Lunes (0 = Lunes, 6 = Domingo)
  let startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  // Celdas del mes anterior (grisáceas)
  for (let i = startOffset; i > 0; i--) {
    const day = prevMonthTotalDays - i + 1;
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    cell.innerHTML = `<div class="calendar-cell-date">${day}</div>`;
    grid.appendChild(cell);
  }

  // Celdas del mes actual
  let appointments = DB.getAppointments();

  // Filtrar citas si el usuario es Médico / Especialista o Comercial
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (currentUser) {
    if (currentUser.specialistId) {
      appointments = appointments.filter(a => a.specialistId === currentUser.specialistId);
    } else if (currentUser.role === 'Comercial' && currentUser.trackedBy) {
      appointments = appointments.filter(a => a.trackedBy === currentUser.trackedBy);
    }
  }

  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    const formattedDay = day < 10 ? '0' + day : day;
    const formattedMonth = (month + 1) < 10 ? '0' + (month + 1) : (month + 1);
    const dateString = `${year}-${formattedMonth}-${formattedDay}`;

    // Dibujar número del día
    const dateHeader = document.createElement('div');
    dateHeader.className = 'calendar-cell-date';
    dateHeader.textContent = day;
    cell.appendChild(dateHeader);

    // Listar citas para este día
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

  // Celdas del mes siguiente para rellenar la grilla (hasta 42 celdas total)
  const totalCellsRendered = startOffset + totalDays;
  const remainingCells = 42 - totalCellsRendered;
  for (let day = 1; day <= remainingCells; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    cell.innerHTML = `<div class="calendar-cell-date">${day}</div>`;
    grid.appendChild(cell);
  }

  container.appendChild(grid);
}

// 🔐 Regla de seguridad #2: Solo Administrador y Comercial pueden ver enlaces
// directos de WhatsApp / recordatorios de pacientes. Los especialistas
// (Médico, Nutricionista, Psicólogo, etc.) ven el teléfono solo como texto.
function canViewPatientWhatsApp() {
  try {
    const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
    return !!currentUser && (currentUser.role === 'Administrador' || currentUser.role === 'Comercial');
  } catch (e) {
    return false;
  }
}

// Mostrar Detalle de Cita en un Modal flotante simple
function showAppointmentDetail(apt) {
  const service = SERVICES.find(s => s.id === apt.serviceId);
  const doctor = SPECIALISTS.find(d => d.id === apt.specialistId);
  const agentInfo = AGENT_CONTACTS[apt.trackedBy] ? `${AGENT_CONTACTS[apt.trackedBy].name} (Cel: ${AGENT_CONTACTS[apt.trackedBy].phone})` : (apt.trackedBy || 'Sin asignar');

  // Teléfono: enlace de WhatsApp solo para Administrador/Comercial; texto plano para especialistas.
  const phoneDetailHtml = canViewPatientWhatsApp()
    ? `<a href="https://wa.me/51${apt.patientPhone}" target="_blank" style="color:var(--color-accent); font-weight:600;">${apt.patientPhone} 💬</a>`
    : `<span style="font-weight:600; color:var(--color-primary-dark);">${apt.patientPhone}</span>`;

  // Crear modal de detalle dinámicamente
  const detailModal = document.createElement('div');
  detailModal.className = 'modal active';
  detailModal.style.zIndex = '3000';
  detailModal.innerHTML = `
    <div class="modal-content" style="max-width: 450px; padding: 2rem;">
      <h3 style="color:var(--color-primary); font-weight:700; margin-bottom:1.5rem; border-bottom:1px solid var(--color-border); padding-bottom:0.5rem;">Detalle de la Cita</h3>
      <p style="margin-bottom:0.8rem;"><strong>Paciente:</strong> ${apt.patientName} (${apt.patientAge} años)</p>
      <p style="margin-bottom:0.8rem;"><strong>Teléfono:</strong> ${phoneDetailHtml}</p>
      <p style="margin-bottom:0.8rem;"><strong>Agente/Comercial:</strong> ${agentInfo}</p>
      <p style="margin-bottom:0.8rem;"><strong>Servicio:</strong> ${service ? service.name : 'N/A'}</p>
      <p style="margin-bottom:0.8rem;"><strong>Especialista:</strong> ${doctor ? doctor.name : 'N/A'}</p>
      <p style="margin-bottom:0.8rem;"><strong>Fecha y Hora:</strong> ${apt.date} a las ${apt.time}</p>
      <p style="margin-bottom:1.5rem;"><strong>Modalidad:</strong> ${apt.modality}</p>
      <div class="form-group">
        <label>Estado de Cita:</label>
        <select class="form-control" id="detail-apt-status">
          <option value="pendiente" ${apt.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
          <option value="confirmada" ${apt.status === 'confirmada' ? 'selected' : ''}>Confirmada</option>
          <option value="realizada" ${apt.status === 'realizada' ? 'selected' : ''}>Realizada</option>
          <option value="cancelada" ${apt.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
        </select>
      </div>
      <div style="display:flex; gap:1rem; margin-top:2rem; justify-content:flex-end;">
        <button class="btn btn-secondary" id="detail-close-btn">Cerrar</button>
        <button class="btn btn-primary" id="detail-save-btn">Guardar Estado</button>
      </div>
    </div>
  `;
  document.body.appendChild(detailModal);

  document.getElementById('detail-close-btn').addEventListener('click', () => {
    detailModal.remove();
  });

  document.getElementById('detail-save-btn').addEventListener('click', () => {
    const newStatus = document.getElementById('detail-apt-status').value;
    DB.updateAppointmentStatus(apt.id, newStatus);
    detailModal.remove();
    updateStats();
    renderCalendarWidget();
    renderAppointmentsTable();
  });
}

// 📋 Renderizar Listado de Citas en Tabla
function renderAppointmentsTable() {
  const tbody = document.getElementById('appointments-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';
  let appointments = DB.getAppointments();

  // Filtrar citas si el usuario es Médico / Especialista o Comercial
  const currentUser = JSON.parse(safeSessionStorage.getItem('kolymedical_user'));
  if (currentUser) {
    if (currentUser.specialistId) {
      appointments = appointments.filter(a => a.specialistId === currentUser.specialistId);
    } else if (currentUser.role === 'Comercial' && currentUser.trackedBy) {
      appointments = appointments.filter(a => a.trackedBy === currentUser.trackedBy);
    }
  }

  // Filtrar
  const searchQuery = document.getElementById('admin-search').value.toLowerCase();
  const filterDoc = document.getElementById('admin-filter-doctor').value;

  const filteredApts = appointments.filter(apt => {
    const matchesSearch = apt.patientName.toLowerCase().includes(searchQuery) || apt.patientPhone.includes(searchQuery);
    const matchesDoctor = !filterDoc || apt.specialistId === filterDoc;
    return matchesSearch && matchesDoctor;
  });

  // Ordenar por fecha y hora (más recientes primero)
  filteredApts.sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));

  if (filteredApts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--color-text-muted);">No se encontraron citas registradas.</td></tr>';
    return;
  }

  // Permiso de contacto directo (Regla #2): solo Administrador/Comercial.
  const canViewWA = canViewPatientWhatsApp();

  filteredApts.forEach(apt => {
    const service = SERVICES.find(s => s.id === apt.serviceId);
    const doctor = SPECIALISTS.find(d => d.id === apt.specialistId);

    // Celda de teléfono: enlace + recordatorio de WhatsApp solo si el rol lo permite.
    const phoneCellHtml = canViewWA
      ? `<div style="display:flex; flex-direction:column; gap:0.25rem;">
          <a href="https://wa.me/51${apt.patientPhone}" target="_blank" style="color:var(--color-accent); font-weight:600;">${apt.patientPhone} 💬</a>
          <button class="btn btn-secondary btn-reminder-wa" data-id="${apt.id}" style="padding:0.15rem 0.3rem; font-size:0.7rem; border-color:var(--color-accent); color:var(--color-accent); width:fit-content; height:fit-content; margin-top:0.1rem;">🔔 Recordar</button>
        </div>`
      : `<span style="font-weight:600; color:var(--color-primary-dark);">${apt.patientPhone}</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${apt.patientName}</strong><br><span style="font-size:0.75rem; color:var(--color-text-muted);">${apt.patientAge} años | Seg: ${apt.trackedBy || 'Sin asignar'}</span></td>
      <td>
        ${phoneCellHtml}
      </td>
      <td>${service ? service.name : 'N/A'}</td>
      <td>${doctor ? doctor.name : 'N/A'}</td>
      <td>${apt.date}<br><span style="font-weight:600; color:var(--color-primary-dark);">${apt.time}</span></td>
      <td><span class="status-badge status-${apt.modality === 'Virtual' ? 'confirmada' : 'realizada'}">${apt.modality}</span></td>
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

  // Llenar selectores del form
  SERVICES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} — S/ ${s.price}`;
    selectService.appendChild(opt);
  });

  if (adminDateInput) {
    const today = new Date().toISOString().split('T')[0];
    adminDateInput.min = today;

    adminDateInput.addEventListener('change', generateAdminTimeSlots);
    selectService.addEventListener('change', generateAdminTimeSlots);
  }

  function generateAdminTimeSlots() {
    const dateVal = adminDateInput.value;
    const serviceVal = selectService.value;
    const timeGrid = document.getElementById('admin-time-slots-grid');
    if (!timeGrid) return;
    timeGrid.innerHTML = '';

    if (!dateVal || !serviceVal) return;

    const service = SERVICES.find(s => s.id === serviceVal);
    const doctor = SPECIALISTS.find(d => d.id === service.specialistId);

    const availableHours = getDoctorAvailableSlots(doctor, dateVal);
    if (availableHours.length === 0) {
      timeGrid.innerHTML = '<p style="color: var(--color-danger); font-size: 0.8rem; padding: 0.25rem; grid-column: span 4;">El especialista no tiene disponibilidad para esta fecha.</p>';
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
  }

  selectService.addEventListener('change', () => {
    const serviceVal = selectService.value;
    const selectModality = document.getElementById('admin-booking-modality');
    selectDoctor.innerHTML = '<option value="">-- Selecciona Especialista --</option>';
    if (serviceVal) {
      const service = SERVICES.find(s => s.id === serviceVal);
      const doc = SPECIALISTS.find(d => d.id === service.specialistId);
      if (doc) {
        const opt = document.createElement('option');
        opt.value = doc.id;
        opt.textContent = doc.name;
        opt.selected = true;
        selectDoctor.appendChild(opt);
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
    }
  });

  const btnAdd = document.getElementById('btn-admin-add-apt');
  btnAdd.addEventListener('click', () => {
    const serviceId = selectService.value;
    const specialistId = selectDoctor.value;
    const date = document.getElementById('admin-booking-date').value;
    const time = document.getElementById('admin-booking-time').value;
    const patientName = document.getElementById('admin-booking-name').value.trim();
    const patientAge = parseInt(document.getElementById('admin-booking-age').value);
    const patientPhone = document.getElementById('admin-booking-phone').value.trim();
    const modality = document.getElementById('admin-booking-modality').value;
    const tracker = document.getElementById('admin-booking-tracker').value;

    if (!serviceId || !specialistId || !date || !time || !patientName || !patientAge || !patientPhone) {
      alert('Por favor complete todos los campos del agendamiento.');
      return;
    }

    const newApt = {
      patientName,
      patientAge,
      patientPhone,
      serviceId,
      specialistId,
      date,
      time,
      modality,
      status: 'confirmada', // Por defecto confirmada ya que la agendó el personal
      trackedBy: tracker
    };

    DB.saveAppointment(newApt);
    alert('Cita interna agendada con éxito.');

    // Resetear formulario
    document.getElementById('admin-booking-form-el').reset();
    selectDoctor.innerHTML = '<option value="">-- Selecciona Especialista --</option>';
    document.getElementById('admin-time-slots-grid').innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.8rem; padding: 0.25rem; grid-column: span 4;">Selecciona servicio y fecha primero.</p>';

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
DB_Users.syncWithCloud();
