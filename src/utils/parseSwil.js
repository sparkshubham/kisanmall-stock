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
    const mrpRaw = pickField(row, ['mrp', 'max retail price', 'printed mrp', 'm.r.p']);
    const saleRaw = pickField(row, [
      'sale rate',
      'salerate',
      'sale price',
      'saleprice',
      'selling price',
      'rate',
      'rsp',
      'sprice',
      'net rate',
    ]);
    const discountRaw = pickField(row, ['discount', 'disc', 'discount amt', 'disc amt']);
    const unit =
      String(pickField(row, ['stockunit', 'stock unit', 'unit', 'unit1', 'unit2', 'uom']) ?? 'PCS').trim() ||
      'PCS';

    if (!barcode && !name) return;
    if (!name) {
      errors.push(`Row ${index + 2}: product name is required`);
      return;
    }

    const purchaseQty = toNumber(
      pickField(row, ['purchaseqty', 'purchase qty', 'purchase', 'pur qty', 'purchased qty'])
    );
    const salesQty = toNumber(
      pickField(row, ['salesqty', 'sales qty', 'sale qty', 'sold qty', 'sales', 'saleqty'])
    );
    const closingQty = toNumber(
      pickField(row, [
        'cl.stock as on',
        'cl stock as on',
        'cl.stock',
        'closing qty',
        'closing stock',
        'closing',
        'cl stock',
      ])
    );
    const stockQty = toNumber(
      pickField(row, ['stock', 'stock(unit1)', 'quantity', 'qty', 'swil qty', 'swil quantity', 'balance'])
    );
    const quantity = closingQty || stockQty;
    if (Number.isNaN(quantity)) {
      errors.push(`Row ${index + 2}: invalid quantity`);
      return;
    }

    const mrp = toNumber(mrpRaw) || 0;
    let salePrice = toNumber(saleRaw) || 0;
    const discountAmt = toNumber(discountRaw) || 0;
    if (!salePrice && mrp && discountAmt) salePrice = Math.max(0, mrp - discountAmt);
    if (!salePrice) salePrice = mrp;

    const key = barcode || name.slice(0, 500).toLowerCase();
    const existing = byBarcode.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.purchaseQty += purchaseQty;
      existing.salesQty += salesQty;
      existing.closingQty += closingQty || quantity;
      if (name) existing.name = name;
      if (mrp) existing.mrp = mrp;
      if (salePrice) existing.salePrice = salePrice;
      if (unit) existing.unit = unit;
      return;
    }

    byBarcode.set(key, {
      barcode,
      name: name.slice(0, 500),
      quantity,
      purchaseQty,
      salesQty,
      closingQty: closingQty || quantity,
      mrp,
      salePrice,
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
