import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { resolveCalendarOAuthConfig } from "../_shared/calendar-config.mjs";
import { decryptRefreshToken } from "../_shared/calendar-crypto.mjs";
import { buildDemoCalendarEvent, loadCenterCalendarConnection, resolveDemoCenterId } from "../_shared/demo-calendar.mjs";

const ALLOWED_ORIGINS = new Set([
  "https://kolytechdemo.kolymedical.lat",
  "https://kolymedical.lat"
]);
const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Origin"
};
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

function headersFor(request: Request): Headers {
  const headers = new Headers(JSON_HEADERS);
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type");
  }
  return headers;
}

function json(request: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: headersFor(request) });
}

function clientKey(request: Request): string {
  return (request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "unknown").split(",")[0].trim().slice(0, 80);
}

function isRateLimited(request: Request): boolean {
  const now = Date.now();
  const key = clientKey(request);
  const current = rateBuckets.get(key);
  if (!current || now - current.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validAppointment(input: unknown): input is Record<string, string> {
  if (!input || typeof input !== "object") return false;
  const item = input as Record<string, unknown>;
  const id = text(item.id, 80);
  const patientName = text(item.patientName, 120);
  const phone = text(item.patientPhone, 20);
  const service = text(item.service, 100);
  const date = text(item.date, 10);
  const time = text(item.time, 5);
  const modality = text(item.modality, 20);
  if (!/^demo-[A-Za-z0-9_-]{8,80}$/.test(id)) return false;
  if (patientName.length < 2 || patientName.length > 120) return false;
  if (!/^9\d{8}$/.test(phone)) return false;
  if (!["Consulta de Medicina Regenerativa", "Consulta de Nutrición Clínica", "Consulta de Psicología Clínica", "Consulta de Hematología Clínica"].includes(service)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false;
  if (!["Presencial", "Virtual"].includes(modality)) return false;
  const scheduled = new Date(`${date}T${time}:00-05:00`);
  if (Number.isNaN(scheduled.getTime())) return false;
  const oneYearFromNow = Date.now() + 366 * 24 * 60 * 60 * 1000;
  return scheduled.getTime() >= Date.now() - 60_000 && scheduled.getTime() <= oneYearFromNow;
}

function calendarOAuthConfig() {
  return resolveCalendarOAuthConfig({
    GOOGLE_OAUTH_CLIENT_ID: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),
    GOOGLE_CLIENT_ID: Deno.env.get("GOOGLE_CLIENT_ID"),
    GOOGLE_OAUTH_CLIENT_SECRET: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET"),
    GOOGLE_CLIENT_SECRET: Deno.env.get("GOOGLE_CLIENT_SECRET"),
    GOOGLE_CALENDAR_REDIRECT_URI: Deno.env.get("GOOGLE_CALENDAR_REDIRECT_URI"),
  });
}

async function accessToken(): Promise<{ accessToken: string; calendarId: string }> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("CENTER_CALENDAR_TOKEN_ENCRYPTION_KEY") || "";
  const { clientId, clientSecret } = calendarOAuthConfig();
  if (!url || !serviceKey || !encryptionKey || !clientId || !clientSecret) {
    throw new Error("center_calendar_configuration_missing");
  }
  const centerId = resolveDemoCenterId({ DEMO_CENTER_ID: Deno.env.get("DEMO_CENTER_ID") });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const centerConnection = await loadCenterCalendarConnection(admin, centerId);
  const refreshToken = await decryptRefreshToken({
    ciphertext: centerConnection.refresh_token_ciphertext,
    iv: centerConnection.refresh_token_iv,
  }, encryptionKey);
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error("google_token_exchange_failed");
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("google_access_token_missing");
  return { accessToken: payload.access_token, calendarId: centerConnection.calendar_id || "primary" };
}

async function createCalendarEvent(appointment: Record<string, string>): Promise<{ id: string; htmlLink?: string }> {
  const calendar = await accessToken();
  const event = buildDemoCalendarEvent(appointment);
  const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.calendarId)}/events?sendUpdates=none`;
  const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${calendar.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(event), signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error("google_calendar_create_failed");
  const payload = await response.json() as { id?: string; htmlLink?: string };
  if (!payload.id) throw new Error("google_calendar_event_missing");
  return { id: payload.id, htmlLink: payload.htmlLink };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json(request, { error: "Origen no autorizado." }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(request) });
  if (request.method !== "POST") return json(request, { error: "Método no permitido." }, 405);
  if (isRateLimited(request)) return json(request, { error: "Demasiadas solicitudes de demo. Intenta nuevamente más tarde." }, 429);

  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!contentType.toLowerCase().includes("application/json") || contentLength > 32_000) return json(request, { error: "Solicitud inválida." }, 400);

  try {
    const payload = await request.json() as { appointment?: unknown };
    if (!validAppointment(payload.appointment)) return json(request, { error: "Los datos de la cita no son válidos." }, 400);
    const appointment = payload.appointment as Record<string, string>;
    const event = await createCalendarEvent(appointment);
    return json(request, { success: true, demo: true, calendarEventId: event.id, eventHtmlLink: event.htmlLink || null });
  } catch (error) {
    console.error("demo_calendar_error", error instanceof Error ? error.message : "unknown");
    return json(request, { error: "No se pudo enviar la demo al calendario.", code: "calendar_unavailable" }, 502);
  }
});

