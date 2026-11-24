export const IMAGING_MODALITIES = Object.freeze([
  'Ecografía',
  'Mamografía',
  'Tomografía',
  'Rayos X',
  'Histerosalpingografía',
  'Resonancia magnética',
  'Densitometría',
  'Medicina nuclear',
]);

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'es', { sensitivity: 'base' });
}

export function sortCatalogItems(items, order = 'name') {
  const rows = Array.isArray(items) ? [...items] : [];
  if (order === 'price-asc' || order === 'price-desc') {
    const direction = order === 'price-asc' ? 1 : -1;
    return rows.sort((a, b) => {
      const currencyOrder = compareText(a.currency || '', b.currency || '');
      if (currencyOrder) return currencyOrder;
      const aPrice = Number(a.permanent_price);
      const bPrice = Number(b.permanent_price);
      const aValid = Number.isFinite(aPrice);
      const bValid = Number.isFinite(bPrice);
      if (aValid !== bValid) return aValid ? -1 : 1;
      if (aValid && aPrice !== bPrice) return direction * (aPrice - bPrice);
      return compareText(a.name || a.code, b.name || b.code);
    });
  }
  return rows.sort((a, b) => compareText(a.name || a.code, b.name || b.code));
}
