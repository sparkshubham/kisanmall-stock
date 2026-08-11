function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, ' ');
}

function pickField(row, aliases) {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeHeader(key))) return value;
  }
  return undefined;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  return Number(value);
}

function normalizeBarcode(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return String(Math.trunc(value));
  }
  let text = String(value).trim();
  if (/e[+-]?\d+$/i.test(text)) {
    const n = Number(text);
    if (Number.isFinite(n)) return String(Math.trunc(n));
  }
  return text.replace(/\.0+$/, '');
}

export function parseSwilRows(rows) {
  const errors = [];
  const byBarcode = new Map();

  rows.forEach((row, index) => {
    const barcode = normalizeBarcode(
      pickField(row, ['barcode', 'bar code', 'sku', 'item code', 'itemcode', 'ean', 'ean code'])
    );
    const name = String(
      pickField(row, [
        'nametodisplay',
        'name to display',
        'name',
        'product',
        'product name',
        'item name',
        'itemname',
        'description',
        'item',
      ]) ?? ''
    ).trim();
    const mrpRaw = pickField(row, ['mrp', 'price', 'sale rate', 'salerate']);
    const unit =
      String(pickField(row, ['stockunit', 'stock unit', 'unit', 'unit1', 'unit2', 'uom']) ?? 'PCS').trim() ||
      'PCS';

    if (!barcode && !name) return;
    if (!barcode || !name) {
      errors.push(`Row ${index + 2}: barcode and product name are required`);
      return;
    }

    const quantity = toNumber(
      pickField(row, [
        'stock',
        'stock(unit1)',
        'quantity',
        'qty',
        'swil qty',
        'swil quantity',
        'closing stock',
        'balance',
      ])
    );
    if (Number.isNaN(quantity)) {
      errors.push(`Row ${index + 2}: invalid quantity`);
      return;
    }

    const existing = byBarcode.get(barcode);
    if (existing) {
      existing.quantity += quantity;
      if (name) existing.name = name;
      const mrp = toNumber(mrpRaw);
      if (mrp) existing.mrp = mrp;
      if (unit) existing.unit = unit;
      return;
    }

    byBarcode.set(barcode, {
      barcode,
      name: name.slice(0, 500),
      quantity,
      mrp: toNumber(mrpRaw) || 0,
      unit: unit.slice(0, 40),
    });
  });

  return {
    items: [...byBarcode.values()],
    errors,
    detectedHeaders: rows[0] ? Object.keys(rows[0]) : [],
  };
}

export async function parseSwilFile(file) {
  const XLSXNS = await import('xlsx');
  const XLSX = XLSXNS.default ?? XLSXNS;
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel file has no sheets');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: true });
  if (!rows.length) throw new Error('Excel file is empty');
  return parseSwilRows(rows);
}
