/**
 * Lightweight, dependency-free CSV exporter.
 * Handles quoting, BOM (for Excel UTF-8), and timestamped filenames.
 */

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Quote when the field contains a delimiter, quote, newline, or leading/trailing whitespace
  if (/[",\r\n]|^\s|\s$/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn<T> {
  key: string;
  label: string;
  /** Optional value extractor; defaults to row[key]. */
  accessor?: (row: T) => unknown;
}

/**
 * Convert rows + column metadata to a CSV string.
 */
export function rowsToCsv<T extends Record<string, any>>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const body = rows
    .map((row) =>
      columns
        .map((c) => escapeCell(c.accessor ? c.accessor(row) : row[c.key]))
        .join(',')
    )
    .join('\r\n');
  return `${header}\r\n${body}`;
}

/**
 * Trigger a browser download of `rows` as a CSV file.
 * Prepends a UTF-8 BOM so Excel renders accents correctly.
 */
export function downloadCsv<T extends Record<string, any>>(
  filenameBase: string,
  rows: T[],
  columns: CsvColumn<T>[]
): void {
  if (typeof window === 'undefined') return;
  const csv = '\uFEFF' + rowsToCsv(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenameBase}_${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke to next tick so Safari finishes the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
