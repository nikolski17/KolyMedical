import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS Headers para permitir llamadas HTTP directas si es necesario
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Diccionario de Especialidades Médicas para formatear el título del evento
const SPECIALTIES: Record<string, string> = {
  med_reg: "MEDICINA REGENERATIVA",
  fibroscan: "FIBROSCAN",
  nutricion: "NUTRICION",
  otorrino: "OTORRINOLARINGOLOGIA",
  curacion_heridas: "CURACION DE HERIDAS",
  sueroterapia: "SUEROTERAPIA",
  psicologia: "PSICOLOGIA",
  ginecologia: "GINECOLOGIA",
  ecografia: "ECOGRAFIA"
};

serve(async (req) => {
  // Manejar solicitudes preflight OPTIONS de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Obtener variables de entorno configuradas en Supabase
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const googleRefreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!googleClientId || !googleClientSecret || !googleRefreshToken) {
      throw new Error("Faltan configurar las variables de entorno de Google OAuth en Supabase.");
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan configurar las variables de entorno de Supabase.");
    }

    // Inicializar cliente Supabase con privilegios Service Role para bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Leer payload del webhook de la base de datos
    const payload = await req.json();
    const { type, record, old_record } = payload;
    console.log(`Google Calendar Sync - Evento recibido: ${type}`, record || old_record);

    // 3. Obtener un Access Token fresco usando el Refresh Token corporativo
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: googleRefreshToken,
        grant_type: "refresh_token",
      }),
    });
    
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(`Error al refrescar Access Token de Google: ${errText}`);
    }
    
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 4. Procesar según la acción de la Base de Datos (INSERT, UPDATE, DELETE)
    if (type === "INSERT") {
      if (record.time === "Por coordinar") {
        console.log("Cita programada 'Por coordinar'. Se omitirá la sincronización hasta que se fije hora.");
        return new Response(JSON.stringify({ success: true, message: "Omitido: Cita por coordinar." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Crear evento en Google Calendar
      const eventBody = buildGoogleEvent(record);
      const calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1";
      
      const createRes = await fetch(calendarUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Error al crear evento en Google Calendar: ${errText}`);
      }

      const eventData = await createRes.json();
      console.log(`Evento creado en Google Calendar. ID: ${eventData.id}`);

      // Extraer enlace de Google Meet directamente desde hangoutLink
      const meetingLink = eventData.hangoutLink || "";

      // Actualizar la cita en la base de datos con el ID del evento de Google y el link de Meet
      const { error: patchError } = await supabase
        .from("appointments")
        .update({
          google_event_id: eventData.id,
          meeting_link: meetingLink || record.meeting_link,
        })
        .eq("id", record.id);

      if (patchError) {
        console.error("Error al guardar google_event_id en la tabla appointments:", patchError);
      }

      return new Response(JSON.stringify({ success: true, googleEventId: eventData.id, meetingLink }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } 
    
    else if (type === "UPDATE") {
      // Si la cita fue cancelada
      if (record.status === "cancelada") {
        const eventId = record.google_event_id || old_record?.google_event_id;
        if (eventId) {
          await deleteGoogleEvent(eventId, accessToken);
          // Limpiar campo de evento en DB
          await supabase.from("appointments").update({ google_event_id: null }).eq("id", record.id);
        }
        return new Response(JSON.stringify({ success: true, message: "Evento eliminado por cancelación." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Si no tiene hora asignada
      if (record.time === "Por coordinar") {
        const eventId = record.google_event_id || old_record?.google_event_id;
        if (eventId) {
          // Si antes tenía hora y se cambió a por coordinar, borramos el evento
          await deleteGoogleEvent(eventId, accessToken);
          await supabase.from("appointments").update({ google_event_id: null, meeting_link: null }).eq("id", record.id);
        }
        return new Response(JSON.stringify({ success: true, message: "Evento eliminado (cita movida a por coordinar)." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Si cambió el horario o se asignó horario a una cita que estaba "Por coordinar"
      const eventId = record.google_event_id;
      if (!eventId) {
        // Si no tenía evento de Google (estaba por coordinar), la creamos como nueva
        const eventBody = buildGoogleEvent(record);
        const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        });

        if (createRes.ok) {
          const eventData = await createRes.json();
          const meetingLink = eventData.hangoutLink || "";
          await supabase.from("appointments").update({
            google_event_id: eventData.id,
            meeting_link: meetingLink || record.meeting_link
          }).eq("id", record.id);
        }
      } else {
        // Si ya tenía evento, actualizamos los detalles en Google Calendar
        const eventBody = buildGoogleEvent(record);
        const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1`;
        
        const updateRes = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        });

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          console.warn(`No se pudo actualizar el evento en Google. Es posible que haya sido eliminado directamente de Google Calendar: ${errText}`);
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Evento actualizado en Google Calendar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } 
    
    else if (type === "DELETE") {
      const eventId = old_record?.google_event_id;
      if (eventId) {
        await deleteGoogleEvent(eventId, accessToken);
      }
      return new Response(JSON.stringify({ success: true, message: "Evento eliminado por borrado físico en DB." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Acción no manejada." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error crítico en Edge Function:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Función para construir la estructura de evento de la Calendar API
function buildGoogleEvent(record: any) {
  // Configurar horario de inicio y fin
  const startIso = `${record.date}T${record.time}:00`;
  const startDate = new Date(startIso);
  
  // Duración en horas (procedimientos: 2h, 4h, 6h; consultas normales: 1h)
  const durationHours = record.duration_hours || 1;
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

  // Formatear el Título según la especialidad y el paciente
  const specName = SPECIALTIES[record.service_id] || "CONSULTA GENERAL";
  const typeText = record.modality === "Virtual" ? "CONSULTA VIRTUAL" : "CITA PRESENCIAL";
  const summaryText = `${typeText} - ${specName} - ${record.patient_name.toUpperCase()}`;

  const event: any = {
    summary: summaryText,
    description: `Detalles de la Cita:\n` +
                 `- Paciente: ${record.patient_name} (${record.patient_age} años)\n` +
                 `- DNI: ${record.patient_dni || 'No registrado'}\n` +
                 `- Teléfono: ${record.patient_phone}\n` +
                 `- Modalidad: ${record.modality}\n` +
                 `- Canalizado por: ${record.tracked_by || 'Sin asignar'}\n` +
                 `- Motivo: ${record.motivo_consulta || 'No especificado'}\n` +
                 `- Estado: ${record.status.toUpperCase()}\n\n` +
                 `Administrado por el Portal de Gestión Médica KolyMedical.`,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "America/Lima",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "America/Lima",
    },
  };

  // Si la modalidad es Virtual, solicitar la creación de Google Meet
  if (record.modality === "Virtual") {
    event.conferenceData = {
      createRequest: {
        requestId: `meet-${record.id}-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  return event;
}

// Función auxiliar para eliminar evento de Google
async function deleteGoogleEvent(eventId: string, accessToken: string) {
  const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const delRes = await fetch(deleteUrl, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (delRes.status === 410 || delRes.status === 404) {
    console.log(`El evento ${eventId} ya no existía en Google Calendar.`);
  } else if (!delRes.ok) {
    const errText = await delRes.text();
    console.error(`Error al borrar evento de Google Calendar: ${errText}`);
  } else {
    console.log(`Evento ${eventId} borrado de Google Calendar.`);
  }
}
