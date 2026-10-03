
/**
 * Byte order mark, U+FEFF.
 *
 * Built with String.fromCharCode rather than written as a literal character, so
 * it is visible in the source. A raw BOM typed into a string is invisible in
 * every editor, which makes it trivial to delete by accident while tidying
 * nearby code — and the only symptom would be Excel mangling accented farm
 * names, with nothing in the diff to explain why.
 */
const UTF8_BOM = String.fromCharCode(0xfeff);

/**
 * Escape one CSV value.
 *
 * A farm name containing a comma ("Farm 101, North") would otherwise
 * split into two columns and silently shift every following column by one. The
 * CSV convention is to wrap such a value in double quotes and to double any
 * quote already inside it.
 */
function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Build the CSV text and hand it to the browser as a download.
 *
 * @param headers   Column headings, in the same order as each row's values.
 * @param rows      One array of cell values per row, already formatted for
 *                  display. Pass formatted strings, not raw numbers, so the
 *                  file matches what the user saw on screen.
 * @param fileName  Suggested filename, including the .csv extension.
 */
export function downloadCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  fileName: string,
): void {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const bodyLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  const csvContent = [headerLine, ...bodyLines].join("\n");

  /*
   * UTF8_BOM must lead the file. Without it Excel opens a UTF-8 CSV using the
   * local codepage, and any non-ASCII character in a farm or region name
   * renders as mojibake. Every other spreadsheet tool ignores the mark, so it
   * is safe to always include.
   */
  const blob = new Blob([UTF8_BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export function csvFileName(base: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${base}-${today}.csv`;
}
