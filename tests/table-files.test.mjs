import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const source = await readFile(
  new URL("../src/lib/tableFiles.ts", import.meta.url),
  "utf8",
);
const module = { exports: {} };
new Function(
  "require",
  "module",
  "exports",
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(require, module, module.exports);
const { parseCSV, readTableFile } = module.exports;
test("CSV handles BOM, quoted commas, multiline notes, escaped quotes and TSV", () => {
  assert.deepEqual(
    parseCSV('\uFEFFTitle,Notes\r\n"Task, one","Line 1\nLine ""2"""\r\n'),
    [
      ["Title", "Notes"],
      ["Task, one", 'Line 1\nLine "2"'],
    ],
  );
  assert.deepEqual(parseCSV("Title\tNotes\nTask\tHi", "\t"), [
    ["Title", "Notes"],
    ["Task", "Hi"],
  ]);
  assert.throws(() => parseCSV('"unfinished'), /unclosed/);
});
test("Excel imports actual cell strings and dates", async () => {
  const Excel = require("exceljs");
  const book = new Excel.Workbook();
  const sheet = book.addWorksheet("Tasks");
  sheet.addRow(["Task", "Due date"]);
  sheet.addRow(["Practice", new Date("2026-10-07T09:00:00Z")]);
  const buffer = await book.xlsx.writeBuffer();
  const rows = await readTableFile({
    name: "tasks.xlsx",
    size: buffer.length,
    arrayBuffer: async () =>
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ),
  });
  assert.deepEqual(rows, [
    ["Task", "Due date"],
    ["Practice", "2026-10-07T09:00"],
  ]);
});
