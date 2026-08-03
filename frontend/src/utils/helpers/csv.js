/**
 * CSV generation and download helpers — pure DOM/Blob utilities, no React.
 */

const UTF8_BOM = "\uFEFF";

/**
 * Escapes a single cell value for RFC 4180-style CSV output.
 *
 * @param {string|number|null|undefined} value
 * @returns {string}
 */
export function escapeCsvValue(value) {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV string from headers and row data. Prepends a UTF-8 BOM so Excel
 * opens the file with the correct encoding.
 *
 * @param {string[]} headers
 * @param {Array<Array<string|number|null|undefined>>} rows
 * @returns {string}
 */
export function buildCsvString(headers, rows) {
  const csvRows = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  return UTF8_BOM + csvRows.join("\n");
}

/**
 * Triggers a browser download of a CSV file.
 *
 * @param {string} filename
 * @param {string} csvString
 */
export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
