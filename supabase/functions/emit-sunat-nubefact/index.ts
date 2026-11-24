import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const NUBEFACT_API_URL = Deno.env.get("NUBEFACT_API_URL");
    const NUBEFACT_API_TOKEN = Deno.env.get("NUBEFACT_API_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!NUBEFACT_API_URL || !NUBEFACT_API_TOKEN) {
      throw new Error("Faltan configurar los secretos NUBEFACT_API_URL o NUBEFACT_API_TOKEN en Supabase.");
    }

    const body = await req.json();
    const isFactura = body.doc_type === "FACTURA";
    const isGravado = body.is_gravado !== false;
    const today = new Date().toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, "-");

    // Formato oficial JSON de Nubefact (operación: generar_comprobante)
    const nubefactPayload = {
      operacion: "generar_comprobante",
      tipo_de_comprobante: isFactura ? 1 : 2, // 1 = Factura, 2 = Boleta
      serie: body.series,
      numero: body.correlative,
      sunat_transaction: 1, // Venta interna
      cliente_tipo_de_documento: body.client_doc_type === "RUC" ? 6 : 1, // 6 = RUC, 1 = DNI
      cliente_numero_de_documento: body.client_doc_number,
      cliente_denominacion: body.client_name,
      cliente_direccion: "-",
      fecha_de_emision: today,
      moneda: 1, // 1 = Soles
      porcentaje_de_igv: 18.0,
      total_gravada: isGravado ? body.subtotal : "",
      total_exonerada: !isGravado ? body.subtotal : "",
      total_igv: isGravado ? body.igv : "",
      total: body.total,
      enviar_automaticamente_a_la_sunat: true,
      enviar_automaticamente_al_cliente: false,
      items: body.items.map((item: any, idx: number) => ({
        unidad_de_medida: "ZZ", // ZZ = Servicios
        codigo: `SRV-${idx + 1}`,
        descripcion: item.description,
        cantidad: item.quantity || 1,
        valor_unitario: item.subtotal,
        precio_unitario: item.total,
        subtotal: item.subtotal,
        tipo_de_igv: isGravado ? 1 : 8, // 1 = Gravado Operación Onerosa, 8 = Exonerado
        igv: isGravado ? item.igv : 0,
        total: item.total,
      })),
    };

    const nfResponse = await fetch(NUBEFACT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": NUBEFACT_API_TOKEN,
      },
      body: JSON.stringify(nubefactPayload),
    });

    const nfData = await nfResponse.json();
    if (!nfResponse.ok || nfData.errors) {
      throw new Error(nfData.errors || "Error devuelto por Nubefact");
    }

    // Guardar registro oficial en Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("koly_invoices").insert({
      doc_type: body.doc_type,
      series: body.series,
      correlative: body.correlative,
      client_doc_type: body.client_doc_type,
      client_doc_number: body.client_doc_number,
      client_name: body.client_name,
      items: body.items,
      subtotal: body.subtotal,
      igv: body.igv,
      total: body.total,
      sunat_status: nfData.aceptada_por_sunat ? "ACEPTADO" : "PENDIENTE",
      pdf_url: nfData.enlace_del_pdf || null,
      xml_url: nfData.enlace_del_xml || null,
      cdr_url: nfData.enlace_del_cdr || null,
      sunat_response: nfData,
    });

    return new Response(JSON.stringify(nfData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
