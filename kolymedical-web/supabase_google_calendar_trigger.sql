-- ============================================================================
-- KolyMedical — Sincronización con Google Calendar
-- Ejecuta este script en el editor SQL de Supabase (SQL Editor).
-- ============================================================================

-- 1) Agregar columna para almacenar el ID del evento de Google en la tabla appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id text;

-- 2) Instrucciones para activar el Webhook de base de datos desde el panel de Supabase:
--
-- Para que cada inserción, actualización o borrado en la tabla "appointments" invoque 
-- la Edge Function "google-calendar-sync" automáticamente:
--
-- A. Entra a tu Panel de Supabase (https://supabase.com).
-- B. Ve a "Database" (Base de datos) -> "Webhooks" en la barra lateral izquierda.
-- C. Haz clic en "Create Webhook" (Crear Webhook) y configura lo siguiente:
--    - Name: google-calendar-sync-trigger
--    - Table: appointments
--    - Events: Selecciona [INSERT], [UPDATE] y [DELETE]
--    - Type: "Supabase Edge Function"
--    - Edge Function: Selecciona "google-calendar-sync"
--    - Method: POST
--    - Timeout: 10000 ms
-- D. Guarda el Webhook. ¡Listo!
--
-- De esta forma, Supabase enviará los datos automáticamente en segundo plano cada vez que
-- se agende, modifique, cancele o borre una cita.
