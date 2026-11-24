const HEADER_ALIASES = {
  code: ['codigo', 'codigoestudio', 'codigodelestudio', 'cod', 'code'],
  provider_code: ['codigodeempresa', 'codigoproveedor', 'codempresa', 'codproveedor', 'providercode'],
  provider_name: ['empresa', 'proveedor', 'laboratorio', 'centro', 'clinic', 'provider', 'providername'],
  item_type: ['tipo', 'tipoestudio', 'tipoexamen', 'itemtype'],
  category_code: ['codigocategoria', 'codcategoria', 'categorycode'],
  category: ['categoria', 'area', 'especialidad', 'category'],
  name: ['nombre', 'nombredelestudio', 'nombredelexamen', 'nombredeconcepto', 'estudio', 'examen', 'servicio', 'servicioestudio', 'estudiooservicio', 'concepto', 'descripcion', 'descripciondelexamen', 'descripciondelservicio', 'detalle', 'name', 'description'],
  variant: ['variante', 'modalidad', 'version', 'variant'],
  currency: ['moneda', 'divisa', 'currency'],
  supplier_cost: ['costoproveedor', 'costoprov', 'costocompra', 'costobase', 'suppliercost'],
  permanent_price: ['preciopermanente', 'precioventa', 'preciodeventa', 'preciocliente', 'preciopaciente', 'preciofinal', 'preciolista', 'precioreferencial', 'preciousd', 'preciopen', 'precio', 'tarifa', 'importe', 'monto', 'valorunitario', 'pvp', 'costo', 'price', 'permanentprice'],
  material_or_term: ['plazo', 'material', 'condiciones', 'materialorterm'],
  notes: ['notas', 'observaciones', 'notes'],
};

const normalizeHeader = (value) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  let clean = String(value ?? '').trim().replace(/(?:PEN|USD|S\/\.?|US\$|\$|Soles?|D[oó]lares?)/gi, '').replace(/\s/g, '');
  if (!clean) return NaN;
  clean = clean.replace(/[^0-9,.-]/g, '');
  if (!clean || !/\d/.test(clean)) return NaN;
  const comma = clean.lastIndexOf(',');
  const dot = clean.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    clean = clean.split(thousands).join('');
    if (decimal === ',') clean = clean.replace(',', '.');
  } else if (comma >= 0) {
    const decimals = clean.length - comma - 1;
    clean = decimals > 0 && decimals <= 2 ? clean.replace(',', '.') : clean.replace(/,/g, '');
  } else if (dot >= 0 && clean.length - dot - 1 === 3) {
    clean = clean.replace('.', '');
  }
  const amount = Number(clean);
  return Number.isFinite(amount) ? amount : NaN;
}

function headerFields(row) {
  const fields = {};
  row.forEach((cell, index) => {
    const header = normalizeHeader(cell);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (fields[field] === undefined && aliases.includes(header)) fields[field] = index;
    }
  });
  return fields;
}

function detectHeader(rows) {
  const scan = rows.slice(0, 10);
  let best = null;
  scan.forEach((row, index) => {
    const fields = headerFields(Array.isArray(row) ? row : []);
    const score = Object.keys(fields).length + (fields.name !== undefined ? 3 : 0) + (fields.permanent_price !== undefined ? 3 : 0);
    if (fields.name !== undefined && fields.permanent_price !== undefined && (!best || score > best.score)) {
      best = { index, fields, score };
    }
  });
  return best;
}

function fieldValue(row, fields, key) {
  const index = fields[key];
  return index === undefined ? '' : String(row[index] ?? '').trim();
}

function normalizeCurrency(value, fallback) {
  const normalized = normalizeHeader(value);
  if (normalized.includes('usd') || normalized.includes('dolar') || String(value).includes('$')) return 'USD';
  if (normalized.includes('pen') || normalized.includes('sol') || String(value).toUpperCase().includes('S/')) return 'PEN';
  return fallback === 'USD' ? 'USD' : 'PEN';
}

export function parseCatalogSheet(grid, options = {}) {
  const rows = Array.isArray(grid) ? grid : [];
  const detected = detectHeader(rows);
  if (!detected) return { headerRow: null, records: [], error: 'No encontré columnas reconocibles de nombre y precio.' };
  const defaults = options.defaults || {};
  const records = rows.slice(detected.index + 1).map((row, offset) => {
    const sourceRow = detected.index + offset + 2;
    if (!Array.isArray(row) || row.every((cell) => String(cell ?? '').trim() === '')) return null;
    const providerName = fieldValue(row, detected.fields, 'provider_name') || String(defaults.providerName || 'Centro de salud').trim();
    const category = fieldValue(row, detected.fields, 'category') || String(defaults.category || 'General').trim();
    const priceRaw = fieldValue(row, detected.fields, 'permanent_price');
    const currencyRaw = fieldValue(row, detected.fields, 'currency');
    const price = parseMoney(row[detected.fields.permanent_price]);
    const supplierRaw = fieldValue(row, detected.fields, 'supplier_cost');
    const supplierCost = supplierRaw ? parseMoney(row[detected.fields.supplier_cost]) : null;
    const item = {
      source_code: fieldValue(row, detected.fields, 'code'),
      provider_code: fieldValue(row, detected.fields, 'provider_code'),
      provider_name: providerName,
      item_type: fieldValue(row, detected.fields, 'item_type') || 'Estudio',
      category_code: fieldValue(row, detected.fields, 'category_code'),
      category,
      name: fieldValue(row, detected.fields, 'name'),
      variant: fieldValue(row, detected.fields, 'variant'),
      currency: normalizeCurrency(currencyRaw || priceRaw, defaults.currency),
      permanent_price: price,
      supplier_cost: supplierCost,
      material_or_term: fieldValue(row, detected.fields, 'material_or_term'),
      notes: fieldValue(row, detected.fields, 'notes'),
    };
    const errors = [];
    if (item.name.length < 2 || item.name.length > 240 || /[<>]/.test(item.name)) errors.push('Falta el nombre del estudio o servicio o tiene caracteres no permitidos.');
    if (!priceRaw || !Number.isFinite(price) || price < 0 || price > 10000000) errors.push('El precio no es válido.');
    if (supplierRaw && (!Number.isFinite(supplierCost) || supplierCost < 0 || supplierCost > 10000000)) errors.push('El costo del proveedor no es válido.');
    if (providerName.length < 2 || providerName.length > 160) errors.push('El nombre de la empresa no es válido.');
    if (category.length < 2 || category.length > 120) errors.push('La categoría no es válida.');
    if (item.item_type.length < 2 || item.item_type.length > 80) errors.push('El tipo de concepto no es válido.');
    if (item.variant.length > 160 || /[<>]/.test(item.variant)) errors.push('La variante supera el límite o contiene caracteres no permitidos.');
    if (item.material_or_term.length > 240 || /[<>]/.test(item.material_or_term)) errors.push('El plazo o material no es válido.');
    if (item.notes.length > 1000 || /[<>]/.test(item.notes)) errors.push('Las notas superan el límite o contienen caracteres no permitidos.');
    const explicitFields = Object.keys(detected.fields).filter((key) => fieldValue(row, detected.fields, key) !== '');
    const currencyProvided = Boolean(currencyRaw || /(?:\bUSD\b|\bPEN\b|US\$|\$|S\/|soles?|d[oó]lares?)/i.test(priceRaw));
    return { sourceRow, item, errors, explicitFields, currencyProvided };
  }).filter(Boolean);
  const seenIdentities = new Set();
  const seenCodes = new Set();
  for (const record of records) {
    if (record.errors.length) continue;
    const identity = identityOf(record.item);
    if (seenIdentities.has(identity)) record.errors.push('Esta fila repite un concepto de la misma lista.');
    seenIdentities.add(identity);
    const code = record.item.source_code.toUpperCase();
    if (/^[A-Z0-9]{3}-[A-Z0-9]{3}-\d{3}$/.test(code)) {
      if (seenCodes.has(code)) record.errors.push('El código se repite en el archivo.');
      seenCodes.add(code);
    }
  }
  return { headerRow: detected.index + 1, records };
}

const compactCode = (value, length = 3) => {
  const result = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (result + 'XXX').slice(0, length);
};

const cleanToken = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const identityOf = (item) => [item.provider_name, item.category, item.name, item.variant].map(cleanToken).join('|');
const providerNameIdentityOf = (item) => [item.provider_name, item.name].map(cleanToken).join('|');

export function completeCatalogImport(records, existingItems, centerId) {
  const existing = Array.isArray(existingItems) ? existingItems : [];
  const byCode = new Map(existing.map((item) => [String(item.code || '').toUpperCase(), item]));
  const byIdentity = new Map(existing.map((item) => [identityOf(item), item]));
  const byProviderAndName = new Map();
  existing.forEach((item) => {
    const key = providerNameIdentityOf(item);
    byProviderAndName.set(key, [...(byProviderAndName.get(key) || []), item]);
  });
  const usedCodes = new Set(existing.map((item) => String(item.code || '').toUpperCase()));
  const output = [];

  for (const record of records || []) {
    if (record.errors?.length) continue;
    const raw = record.item;
    const providerCode = /^[A-Z0-9]{3,8}$/.test(String(raw.provider_code || '').toUpperCase())
      ? String(raw.provider_code).toUpperCase()
      : compactCode(raw.provider_name, 3);
    const categoryCode = /^[A-Z0-9]{2,8}$/.test(String(raw.category_code || '').toUpperCase())
      ? String(raw.category_code).toUpperCase()
      : compactCode(raw.category, 3);
    const explicit = new Set(record.explicitFields || []);
    const identityCandidate = { ...raw, provider_code: providerCode, category_code: categoryCode };
    const exactMatch = (raw.source_code && /^[A-Z0-9]{3}-[A-Z0-9]{3}-\d{3}$/.test(raw.source_code.toUpperCase())
      ? byCode.get(raw.source_code.toUpperCase())
      : null) || byIdentity.get(identityOf(identityCandidate));
    const partialMatches = byProviderAndName.get(providerNameIdentityOf(identityCandidate)) || [];
    const matched = exactMatch || (partialMatches.length === 1 ? partialMatches[0] : null);
    let code = matched?.code || (raw.source_code && /^[A-Z0-9]{3}-[A-Z0-9]{3}-\d{3}$/.test(raw.source_code.toUpperCase())
      ? raw.source_code.toUpperCase()
      : '');
    if (!code) {
      for (let sequence = 1; sequence <= 999; sequence += 1) {
        const candidate = `${compactCode(providerCode, 3)}-${compactCode(categoryCode, 3)}-${String(sequence).padStart(3, '0')}`;
        if (!usedCodes.has(candidate)) { code = candidate; usedCodes.add(candidate); break; }
      }
    }
    if (!code) continue;
    const finalProviderName = explicit.has('provider_name') ? raw.provider_name : (matched?.provider_name || raw.provider_name);
    const finalCategory = explicit.has('category') ? raw.category : (matched?.category || raw.category);
    const finalProviderCode = explicit.has('provider_code') ? providerCode : (matched?.provider_code || providerCode);
    const finalCategoryCode = explicit.has('category_code') ? categoryCode : (matched?.category_code || categoryCode);
    const finalItemType = explicit.has('item_type') ? raw.item_type : (matched?.item_type || raw.item_type || 'Estudio');
    const finalVariant = explicit.has('variant') ? raw.variant : (matched?.variant || raw.variant || '');
    const finalCurrency = record.currencyProvided ? raw.currency : (matched?.currency || raw.currency || 'PEN');
    output.push({
      import_source_row: record.sourceRow,
      ...(matched ? { id: matched.id } : {}),
      center_id: centerId,
      code,
      provider_code: finalProviderCode,
      provider_name: finalProviderName,
      item_type: finalItemType,
      category_code: finalCategoryCode,
      category: finalCategory,
      name: raw.name,
      variant: finalVariant,
      currency: finalCurrency,
      permanent_price: raw.permanent_price,
      supplier_cost: raw.supplier_cost,
      material_or_term: raw.material_or_term || matched?.material_or_term || '',
      notes: raw.source_code && !/^\s*[A-Z0-9]{3}-[A-Z0-9]{3}-\d{3}\s*$/i.test(raw.source_code) && !/[<>]/.test(raw.source_code)
        ? [raw.notes || matched?.notes, `Código de origen: ${raw.source_code}`].filter(Boolean).join(' · ').slice(0, 1000)
        : raw.notes || matched?.notes || '',
      source_label: 'Importación de lista revisada por el administrador',
      requires_confirmation: matched?.requires_confirmation ?? false,
      active: matched?.active ?? true,
    });
  }
  return output;
}
