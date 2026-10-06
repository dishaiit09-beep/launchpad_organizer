// CSV quoting supports commas, embedded newlines, and Excel's escaped quotes.
export function parseCSV(text: string, separator = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || !cell) quoted = !quoted;
      else cell += c;
    } else if (!quoted && c === separator) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("CSV has an unclosed quoted cell.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
export async function readTableFile(file: File): Promise<string[][]> {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Use a file smaller than 5 MB.");
  if (/\.xlsx$/i.test(file.name)) {
    const Excel = await import("exceljs");
    const workbook = new Excel.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("Workbook has no worksheet.");
    if (sheet.rowCount > 501 || sheet.columnCount > 100)
      throw new Error(
        "Maximum 500 entries and 100 columns. Import one worksheet at a time.",
      );
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const cells: string[] = [];
      for (let i = 1; i <= sheet.columnCount; i++) {
        const cell = row.getCell(i);
        cells.push(
          cell.value instanceof Date
            ? cell.value.toISOString().slice(0, 16)
            : cell.text,
        );
      }
      rows.push(cells);
    });
    return rows;
  }
  if (!/\.(csv|tsv)$/i.test(file.name))
    throw new Error(
      "Choose a CSV, TSV or XLSX file. Save older XLS files as XLSX first.",
    );
  return parseCSV(await file.text(), /\.tsv$/i.test(file.name) ? "\t" : ",");
}
export async function downloadTable(
  table: string[][],
  name: string,
  format: "csv" | "xlsx",
) {
  let blob: Blob;
  if (format === "xlsx") {
    const Excel = await import("exceljs");
    const book = new Excel.Workbook();
    const sheet = book.addWorksheet("Launchpad");
    table.forEach((row) => sheet.addRow(row));
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    blob = new Blob([await book.xlsx.writeBuffer()], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  } else {
    // Prevent spreadsheet programs from interpreting user-entered text as formulas.
    const quote = (cell: string) =>
      '"' +
      (/^[=+@\-\t\r]/.test(cell) ? "'" + cell : cell).replace(/"/g, '""') +
      '"';
    blob = new Blob(
      ["\uFEFF" + table.map((row) => row.map(quote).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name.replace(/[^a-z0-9_-]/gi, "-") + "." + format;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
