# Guía de Trabajo para Claude — Ecosistema KolyMedical

Esta guía está diseñada para que cualquier modelo de Inteligencia Artificial (especialmente **Claude 3.5 Sonnet / Fable / Opus**) pueda comprender de inmediato el estado actual del proyecto KolyMedical y realizar cambios con absoluta precisión sin romper el código ni la sincronización.

---

## 🛠️ Ficha Técnica del Proyecto
*   **Ruta del Proyecto:** `C:\Users\mendo\.gemini\antigravity\scratch\kolymedical-web`
*   **Tecnologías:** HTML5 (semántico), Vanilla CSS3 (sin frameworks como Tailwind, diseño responsivo nativo), Vanilla Javascript (ES6+).
*   **Base de Datos / Sincronización:** Supabase JS Client (v2) integrado mediante CDN. Cuenta con un sistema de fallback automático a `localStorage` para garantizar la operatividad sin conexión (Offline-first).
*   **Paleta de Colores:** Principal: Azul Acero Oscuro (`#3D5A73`), Secundario: Blanco (`#FFFFFF`), Acento: Verde Médico (`#00A896`).
*   **Tipografía:** Montserrat (importada desde Google Fonts).

---

## 📅 Últimos Cambios Implementados (¡Ya listos y funcionales!)

1.  **Unificación de Servicios y Tratamientos:**
    *   Sección unificada `#servicios` con **9 pestañas (tabs)** dinámicas con iconos SVG personalizados de alta calidad:
        1.  *Medicina Regenerativa (General)*
        2.  *Dolor de Rodilla*
        3.  *Dolor de Columna*
        4.  *Enfermedades Hepáticas* (Ícono de hígado premium)
        5.  *Enfermedades Pulmonares* (Ícono de pulmones)
        6.  *Oncológicas (Autovacunas)*
        7.  *Neurológicas (ELA, Parkinson)*
        8.  *Estudio FibroScan*
        9.  *Consultas de Soporte* (Nutrición con Lic. Amelia, Gastroenterología con Dr. Morales, ORL con Dr. Montes, y Psicología con Lic. Ricardo Melendes).
    *   Se eliminó el cajón flotante de tratamientos y se quitó el borde blanco de las imágenes pequeñas de las especialidades de soporte.
    *   Se incluyó la imagen `img/psicología.jpg` en la tarjeta de psicología.
2.  **Disponibilidad Horaria Dinámica:**
    *   Los especialistas tienen variables de disponibilidad en local storage (`workDays`, `workStart`, `workEnd`, `slotDuration`).
    *   Se agregó la pestaña **"Disponibilidad Médica"** en el panel administrativo (`admin.html`).
    *   Los administradores pueden editar los horarios de todos los especialistas; los médicos y especialistas solo pueden modificar los suyos propios.
    *   Los turnos (slots) disponibles se calculan en tiempo real para el formulario público y de comerciales, validando turnos ya ocupados.
3.  **Privacidad de Contactos y Bienvenida con Nombre:**
    *   Solo los roles de `Administrador` y `Comercial` pueden ver enlaces directos de WhatsApp o botones de recordatorios. Los especialistas solo ven el teléfono como texto para proteger datos sensibles.
    *   El título del dashboard muestra el nombre real del usuario conectado.

---

## 🤖 Cómo darle acceso a Claude a tu Teclado/Mouse o Terminal para editar el Código

Para que Claude pueda usar herramientas de lectura, edición y ejecución de comandos directamente en tu computadora:

1.  **Si estás usando un agente con soporte de herramientas (como Antigravity u otro agente con terminal/browser habilitados):**
    *   Indícale a la IA la **Ruta Absoluta** del proyecto: `C:\Users\mendo\.gemini\antigravity\scratch\kolymedical-web`.
    *   Pídele que comience leyendo el archivo `instructions_for_claude.md` usando sus herramientas de lectura de archivos.
2.  **Si estás usando un chat estándar (sin herramientas directas):**
    *   Puedes usar el **Prompt Maestro** que te proporcionamos abajo para inicializar el contexto y enviarle los archivos copiados.

---

## 💬 Prompt Maestro para copiar y pegar en Claude

Copia y pega el siguiente mensaje para que Claude continúe el trabajo sin alterar nada:

```markdown
Hola Claude. Estamos trabajando en el proyecto "KolyMedical Web Ecosystem". Es una aplicación web médica construida con HTML, Vanilla CSS y Vanilla JS, sincronizada en tiempo real mediante Supabase.

La ruta local de los archivos en mi sistema es:
C:\Users\mendo\.gemini\antigravity\scratch\kolymedical-web

Por favor, lee y analiza los siguientes archivos antes de realizar cualquier cambio:
- index.html (Página pública y Drawer de Pacientes)
- styles.css (Sistema de diseño premium con variables en :root)
- app.js (Gestión de base de datos Supabase, lógica de agendamientos y control de disponibilidad de médicos)
- admin.html (Barra lateral de administración, configuración de disponibilidad y listado de citas)

REGLAS CRÍTICAS DE CONTEXTO:
1. No uses Tailwind. Utiliza Vanilla CSS en styles.css.
2. Respeta las restricciones de seguridad: Los médicos NO deben ver botones ni links de contacto directo de WhatsApp de pacientes en el listado de citas. Solo el Administrador y los Comerciales tienen esa opción.
3. Los cambios en los horarios y la duración de las citas deben reflejarse en tiempo real cuando los comerciales agenden las citas.
4. El mensaje de bienvenida debe mostrar el nombre completo del usuario conectado.

La tarea que necesito que realices ahora es:
[Escribe aquí tu nueva tarea, por ejemplo: "Agregar una sección para descargar reportes en PDF" o "Modificar el formulario de contacto"]
```
