import * as XLSX from 'xlsx';

function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function safeName(value, fallback = 'export') {
  const text = String(value || fallback)
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return text.slice(0, 60) || fallback;
}

function triggerDownload(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function fileStampName(prefix, ext) {
  return `${safeName(prefix)}_${stamp()}.${ext}`;
}

export async function fetchAllPages(loadPage) {
  const first = await loadPage(1);
  const rows = [...(first.rows || [])];
  const totalPages = Number(first.totalPages) || 1;
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await loadPage(page);
    rows.push(...(next.rows || []));
  }
  return rows;
}

export function downloadCsv(filename, rows) {
  if (!rows?.length) throw new Error('No rows to export');
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(',')),
  ];
  const blob = new Blob(['\ufeff', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  triggerDownload(filename, blob);
}

export function downloadXlsx(filename, rows, sheetName = 'Sheet1') {
  if (!rows?.length) throw new Error('No rows to export');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
}
