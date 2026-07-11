/**
 * KolyMedical — Lógica de la Aplicación y Gestión de Citas (Local Storage & Adaptable a Supabase)
 */

// 1. Base de Datos de Configuración Inicial (Mock Data)
const SPECIALISTS = [
  { id: 'pedraza', name: 'Dr. Pedraza', specialty: 'Medicina Regenerativa', hours: ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00'] },
  { id: 'amelia', name: 'Lic. Amelia', specialty: 'Nutrición Clínica', hours: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '15:00', '15:30', '16:00', '16:30'] },
  { id: 'morales', name: 'Dr. Joel Morales', specialty: 'Gastroenterología', hours: ['10:00', '11:00', '12:00', '16:00', '17:00'] },
  { id: 'ruslan', name: 'Dr. Ruslan Golovliov', specialty: 'Estudio FibroScan', hours: ['09:00', '10:00', '11:00', '12:00', '15:00', '16:00', '17:00'] },
  { id: 'montes', name: 'Dr. Guido Montes', specialty: 'Otorrinolaringología', hours: ['09:00', '10:30', '12:00', '15:00', '16:30'] }
];

const SERVICES = [
  { id: 'med_reg', name: 'Consulta — Medicina Regenerativa', price: 100, specialistId: 'pedraza', duration: 60 },
  { id: 'nutricion', name: 'Consulta — Nutrición Clínica', price: 150, specialistId: 'amelia', duration: 30 },
  { id: 'gastro', name: 'Consulta — Gastroenterología', price: 100, specialistId: 'morales', duration: 60 },
  { id: 'otorrino', name: 'Consulta — Otorrinolaringología', price: 100, specialistId: 'montes', duration: 60 },
  { id: 'fibroscan', name: 'Estudio — FibroScan', price: 650, specialistId: 'ruslan', duration: 30 },
  { id: 'curacion_heridas', name: 'Curación de Heridas Crónicas (A Domicilio)', price: 150, specialistId: 'pedraza', duration: 60 }
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

// Helper para generar fechas relativas a hoy
function getRelativeDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// 2. Control de Base de Datos Local (Adaptador LocalStorage)
// 2. Control de Base de Datos Local (Adaptador LocalStorage & Cloud Sync)
const CLOUD_DB_URL = 'https://jsonblob.com/api/jsonBlob/019f4e63-d14b-7026-8a56-ea90e4bbbf45';

const DB = {
  getAppointments: function() {
    let data = localStorage.getItem('kolymedical_appointments');
    if (!data) {
      localStorage.setItem('kolymedical_appointments', JSON.stringify(INITIAL_APPOINTMENTS));
      return INITIAL_APPOINTMENTS;
    }
    const list = JSON.parse(data);
    let updated = false;
    list.forEach(a => {
      if (a.trackedBy === 'Juanito') {
        a.trackedBy = 'Brayan';
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('kolymedical_appointments', JSON.stringify(list));
    }
    return list;
  },
  
  saveAppointment: function(apt) {
    const appointments = this.getAppointments();
    apt.id = 'apt-' + Date.now();
    appointments.push(apt);
    this.saveAll(appointments);
    return apt;
  },

  updateAppointmentStatus: function(id, status) {
    if (status === 'cancelada') {
      return this.deleteAppointment(id);
    }
    const appointments = this.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index].status = status;
      this.saveAll(appointments);
      return true;
    }
    return false;
  },

  deleteAppointment: function(id) {
    let appointments = this.getAppointments();
    appointments = appointments.filter(a => a.id !== id);
    this.saveAll(appointments);
    return true;
  },

  saveAll: function(list) {
    localStorage.setItem('kolymedical_appointments', JSON.stringify(list));
    // Sincronizar asincrónicamente con la nube (JSONBlob)
    fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    }).catch(err => console.log('Error al escribir en la base de datos cloud:', err));
  },

  syncWithCloud: function(callback) {
    fetch(CLOUD_DB_URL)
      .then(res => {
        if (res.status === 404 || res.status === 410) {
          // Si el blob expiró o no existe, lo resubimos
          this.saveAll(this.getAppointments());
          return null;
        }
        return res.json();
      })
      .then(cloudList => {
        if (cloudList && Array.isArray(cloudList)) {
          const localList = this.getAppointments();
          
          // Filtrar para asegurarnos de tener solo objetos válidos de cita
          const validCloudList = cloudList.filter(a => a && typeof a === 'object' && a.id);
          
          // Si la nube está vacía pero localmente tenemos citas, las subimos
          if (validCloudList.length === 0 && localList.length > 0) {
            this.saveAll(localList);
            return;
          }
          
          // Combinar listas de forma bidireccional segura para evitar borrar citas de otros dispositivos
          let merged = [...localList];
          let changed = false;
          
          validCloudList.forEach(cApt => {
            const idx = merged.findIndex(lApt => lApt.id === cApt.id);
            if (idx === -1) {
              merged.push(cApt);
              changed = true;
            } else {
              // Si ya existía, pero el estado en la nube es más reciente/diferente
              if (JSON.stringify(merged[idx]) !== JSON.stringify(cApt)) {
                merged[idx] = cApt;
                changed = true;
              }
            }
          });
          
          // Subir citas locales nuevas que falten en la nube
          let needsUpload = false;
          localList.forEach(lApt => {
            const existsInCloud = validCloudList.some(cApt => cApt.id === lApt.id);
            if (!existsInCloud) {
              needsUpload = true;
            }
          });

          if (changed || needsUpload) {
            localStorage.setItem('kolymedical_appointments', JSON.stringify(merged));
            if (needsUpload) {
              this.saveAll(merged); // Sube los locales nuevos combinados
            }
            if (callback) callback();
          }
        }
      })
      .catch(err => console.log('Error al sincronizar desde la base de datos cloud:', err));
  }
};

// 3. Inicialización General según la Página
document.addEventListener('DOMContentLoaded', () => {
  // Inicialización en la Página Pública (index.html)
  if (document.getElementById('public-web')) {
    initPublicWeb();
  }
  
  // Inicialización en el Panel de Administración (admin.html)
  if (document.getElementById('admin-dashboard')) {
    initAdminDashboard();
  }
});

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

  // Control del Cajón de Tratamientos Premium
  const treatmentsDrawer = document.getElementById('treatments-drawer');
  const btnOpenTreatments = document.getElementById('btn-open-treatments');
  const btnHeroTreatments = document.getElementById('btn-hero-treatments');
  const btnCloseTreatments = document.getElementById('btn-close-treatments');
  
  if (btnOpenTreatments) {
    btnOpenTreatments.addEventListener('click', (e) => {
      e.preventDefault();
      treatmentsDrawer.classList.add('active');
    });
  }
  
  if (btnHeroTreatments) {
    btnHeroTreatments.addEventListener('click', (e) => {
      e.preventDefault();
      treatmentsDrawer.classList.add('active');
    });
  }
  
  if (btnCloseTreatments) {
    btnCloseTreatments.addEventListener('click', () => {
      treatmentsDrawer.classList.remove('active');
    });
  }
  
  if (treatmentsDrawer) {
    treatmentsDrawer.addEventListener('click', (e) => {
      if (e.target === treatmentsDrawer) {
        treatmentsDrawer.classList.remove('active');
      }
    });
  }
  
  // Control de las pestañas del Cajón
  const tabButtons = document.querySelectorAll('.drawer-tab-btn');
  const tabPanes = document.querySelectorAll('.drawer-tab-pane');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

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
  
  function generateTimeSlots() {
    const dateVal = inputDate.value;
    const serviceVal = selectService.value;
    const timeGrid = document.getElementById('time-slots-grid');
    timeGrid.innerHTML = '';

    if (!dateVal || !serviceVal) return;

    // Verificar si es domingo (0 = Domingo)
    const selectedDay = new Date(dateVal + 'T00:00:00').getDay();
    if (selectedDay === 0) {
      timeGrid.innerHTML = '<p style="color: var(--color-danger); font-size: 0.85rem; padding: 0.5rem; grid-column: span 4;">Los domingos la clínica se encuentra cerrada.</p>';
      return;
    }

    const service = SERVICES.find(s => s.id === serviceVal);
    const doctor = SPECIALISTS.find(d => d.id === service.specialistId);
    
    // Obtener citas ya agendadas en esta fecha
    const appointments = DB.getAppointments();
    const busyTimes = appointments
      .filter(a => a.date === dateVal && a.specialistId === doctor.id && a.status !== 'cancelada')
      .map(a => a.time);

    // Renderizar horas disponibles del doctor
    doctor.hours.forEach(hour => {
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
const INITIAL_USERS = [
  { username: 'admin', fullname: 'Super Administrador', password: 'admin123', role: 'Administrador' },
  { username: 'brayan', fullname: 'Brayan García', password: 'com123', role: 'Comercial', trackedBy: 'Brayan' },
  { username: 'andrea', fullname: 'Andrea Mendoza', password: 'com123', role: 'Comercial', trackedBy: 'Andrea' },
  { username: 'drpedraza', fullname: 'Dr. Pedraza', password: 'doc123', role: 'Médico', specialistId: 'pedraza' },
  { username: 'licamelia', fullname: 'Lic. Amelia', password: 'doc123', role: 'Nutricionista', specialistId: 'amelia' },
  { username: 'drmorales', fullname: 'Dr. Joel Morales', password: 'doc123', role: 'Médico', specialistId: 'morales' },
  { username: 'drruslan', fullname: 'Dr. Ruslan Golovliov', password: 'doc123', role: 'Médico', specialistId: 'ruslan' },
  { username: 'drguido', fullname: 'Dr. Guido Montes', password: 'doc123', role: 'Médico', specialistId: 'montes' }
];

const DB_Users = {
  getUsers: function() {
    let data = localStorage.getItem('kolymedical_users');
    if (!data) {
      localStorage.setItem('kolymedical_users', JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const list = JSON.parse(data);
    const hasBrayan = list.some(u => u.username === 'brayan');
    if (!hasBrayan) {
      localStorage.setItem('kolymedical_users', JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return list;
  },
  saveUser: function(userObj) {
    const users = this.getUsers();
    const index = users.findIndex(u => u.username.toLowerCase() === userObj.username.toLowerCase());
    if (index !== -1) {
      users[index] = userObj;
    } else {
      users.push(userObj);
    }
    localStorage.setItem('kolymedical_users', JSON.stringify(users));
    return true;
  },
  deleteUser: function(username) {
    let users = this.getUsers();
    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem('kolymedical_users', JSON.stringify(users));
    return true;
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
  const isLogged = sessionStorage.getItem('kolymedical_logged');
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
      sessionStorage.setItem('kolymedical_logged', 'true');
      sessionStorage.setItem('kolymedical_user', JSON.stringify(matched));
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('dashboard-section').style.display = 'grid';
      renderDashboard();
    } else {
      alert('Credenciales incorrectas. Pruebe con admin / admin123');
    }
  });
}

function renderDashboard() {
  const currentUser = JSON.parse(sessionStorage.getItem('kolymedical_user'));
  const menuUsers = document.getElementById('menu-users');
  const roleText = document.getElementById('sidebar-user-role');
  
  // Mostrar rol dinámicamente arriba del menú
  if (roleText && currentUser) {
    roleText.textContent = currentUser.role === 'Médico' ? 'MÉDICO' : currentUser.role.toUpperCase();
  }

  // Tareas de roles: Solo admin Super Administrador puede ver el panel de usuarios
  if (currentUser && currentUser.role === 'Administrador') {
    menuUsers.style.display = 'block';
  } else {
    menuUsers.style.display = 'none';
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
      }
    });
  });

  // Cerrar Sesión
  document.getElementById('btn-logout').addEventListener('click', () => {
    sessionStorage.removeItem('kolymedical_logged');
    sessionStorage.removeItem('kolymedical_user');
    location.reload();
  });

  // Inicializar Formularios de admin
  initAdminBookingForm();
  initUserManagementForm();
  initProfileForm();
  
  // Renderizar Vista Inicial (Estadísticas y Citas)
  updateStats();
  renderCalendarWidget();
  renderAppointmentsTable();
}

// -----------------------------------------------------
// 👤 VISTA: MI PERFIL (Cambiar Contraseña)
// -----------------------------------------------------
function renderProfileView() {
  const currentUser = JSON.parse(sessionStorage.getItem('kolymedical_user'));
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
    const currentUser = JSON.parse(sessionStorage.getItem('kolymedical_user'));

    if (currentUser && newPass) {
      currentUser.password = newPass;
      DB_Users.saveUser(currentUser);
      sessionStorage.setItem('kolymedical_user', JSON.stringify(currentUser));
      alert('Contraseña actualizada con éxito.');
      document.getElementById('profile-new-password').value = '';
    }
  });
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
  const currentUser = JSON.parse(sessionStorage.getItem('kolymedical_user'));
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
  const currentUser = JSON.parse(sessionStorage.getItem('kolymedical_user'));
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

// Mostrar Detalle de Cita en un Modal flotante simple
function showAppointmentDetail(apt) {
  const service = SERVICES.find(s => s.id === apt.serviceId);
  const doctor = SPECIALISTS.find(d => d.id === apt.specialistId);
  const agentInfo = AGENT_CONTACTS[apt.trackedBy] ? `${AGENT_CONTACTS[apt.trackedBy].name} (Cel: ${AGENT_CONTACTS[apt.trackedBy].phone})` : (apt.trackedBy || 'Sin asignar');

  // Crear modal de detalle dinámicamente
  const detailModal = document.createElement('div');
  detailModal.className = 'modal active';
  detailModal.style.zIndex = '3000';
  detailModal.innerHTML = `
    <div class="modal-content" style="max-width: 450px; padding: 2rem;">
      <h3 style="color:var(--color-primary); font-weight:700; margin-bottom:1.5rem; border-bottom:1px solid var(--color-border); padding-bottom:0.5rem;">Detalle de la Cita</h3>
      <p style="margin-bottom:0.8rem;"><strong>Paciente:</strong> ${apt.patientName} (${apt.patientAge} años)</p>
      <p style="margin-bottom:0.8rem;"><strong>Teléfono:</strong> <a href="https://wa.me/51${apt.patientPhone}" target="_blank" style="color:var(--color-accent); font-weight:600;">${apt.patientPhone} 💬</a></p>
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
  const currentUser = JSON.parse(sessionStorage.getItem('kolymedical_user'));
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

  filteredApts.forEach(apt => {
    const service = SERVICES.find(s => s.id === apt.serviceId);
    const doctor = SPECIALISTS.find(d => d.id === apt.specialistId);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${apt.patientName}</strong><br><span style="font-size:0.75rem; color:var(--color-text-muted);">${apt.patientAge} años | Seg: ${apt.trackedBy || 'Sin asignar'}</span></td>
      <td>
        <div style="display:flex; flex-direction:column; gap:0.25rem;">
          <a href="https://wa.me/51${apt.patientPhone}" target="_blank" style="color:var(--color-accent); font-weight:600;">${apt.patientPhone} 💬</a>
          <button class="btn btn-secondary btn-reminder-wa" data-id="${apt.id}" style="padding:0.15rem 0.3rem; font-size:0.7rem; border-color:var(--color-accent); color:var(--color-accent); width:fit-content; height:fit-content; margin-top:0.1rem;">🔔 Recordar</button>
        </div>
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

    // Recordatorio de WhatsApp
    tr.querySelector('.btn-reminder-wa').addEventListener('click', (e) => {
      e.preventDefault();
      sendWhatsAppReminder(apt);
    });

    tbody.appendChild(tr);
  });
}

// Inicializar filtros de lista
document.getElementById('admin-search').addEventListener('input', renderAppointmentsTable);
document.getElementById('admin-filter-doctor').addEventListener('change', renderAppointmentsTable);

// Llenar selectores iniciales de filtros
const filterDocSelect = document.getElementById('admin-filter-doctor');
SPECIALISTS.forEach(d => {
  const opt = document.createElement('option');
  opt.value = d.id;
  opt.textContent = d.name;
  filterDocSelect.appendChild(opt);
});

// 📅 Agendamiento de Citas Manual por el Personal (Admin Direct Booker)
function initAdminBookingForm() {
  const selectService = document.getElementById('admin-booking-service');
  const selectDoctor = document.getElementById('admin-booking-doctor');
  
  // Llenar selectores del form
  SERVICES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.name} — S/ ${s.price}`;
    selectService.appendChild(opt);
  });

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
    
    // Actualizar Vistas
    updateStats();
    renderCalendarWidget();
    renderAppointmentsTable();
  });
}

// 🔄 Sincronización en tiempo real entre pestañas del navegador
window.addEventListener('storage', (e) => {
  if (e.key === 'kolymedical_appointments') {
    if (document.getElementById('admin-dashboard')) {
      updateStats();
      renderCalendarWidget();
      renderAppointmentsTable();
      if (typeof renderDetailedTable === 'function') {
        renderDetailedTable();
      }
    }
  }
});

// 🌐 Sincronización automática con la base de datos en la nube (JSONBlob) cada 8 segundos
function handleSyncUpdate() {
  if (document.getElementById('admin-dashboard')) {
    updateStats();
    renderCalendarWidget();
    renderAppointmentsTable();
    if (typeof renderDetailedTable === 'function') {
      renderDetailedTable();
    }
  } else if (document.getElementById('public-web')) {
    // Si el paciente está en el formulario, refrescar los horarios ocupados
    const timeGrid = document.getElementById('time-slots-grid');
    const inputDate = document.getElementById('booking-date');
    if (timeGrid && inputDate && inputDate.value) {
      // Gatillar evento change para regenerar slots
      inputDate.dispatchEvent(new Event('change'));
    }
  }
}

DB.syncWithCloud(handleSyncUpdate);

setInterval(() => {
  DB.syncWithCloud(handleSyncUpdate);
}, 8000);

