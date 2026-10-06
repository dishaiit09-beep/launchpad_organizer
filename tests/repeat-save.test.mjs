import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const rows = new Map();
const client = {
  auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
  from() {
    let id;
    return {
      upsert: async (row, options) => {
        assert.equal(options.ignoreDuplicates, true);
        if (!rows.has(row.id)) rows.set(row.id, structuredClone(row));
        return { error: null };
      },
      select() {
        return this;
      },
      eq(key, value) {
        if (key === "id") id = value;
        else assert.equal(value, "owner");
        return this;
      },
      single: async () => ({ data: rows.get(id), error: null }),
    };
  },
};
const recordModule = { exports: {} };
const compile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
new Function(
  "require",
  "module",
  "exports",
  compile(
    await readFile(new URL("../src/lib/records.ts", import.meta.url), "utf8"),
  ),
)(require, recordModule, recordModule.exports);
const backend = { exports: {} };
const source = (
  await readFile(new URL("../src/lib/backend.ts", import.meta.url), "utf8")
).replaceAll(
  "import.meta.env",
  '({ VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "public" })',
);
new Function("require", "module", "exports", compile(source))(
  (name) =>
    name === "@supabase/supabase-js"
      ? { createClient: () => client }
      : name === "./records"
        ? recordModule.exports
        : require(name),
  backend,
  backend.exports,
);
test("next recurring occurrence has stable ID and retries preserve already edited next task", async () => {
  const task = {
    id: "original",
    kind: "task",
    data: {
      title: "Daily practice",
      deadline: "2026-10-06T18:29:00.000Z",
      timezone: "Asia/Kolkata",
      repeat: "Daily",
      done: true,
      subtasks: [{ title: "Read", done: true }],
    },
  };
  const first = await backend.exports.ensureNextRepeat(task);
  assert.equal(first.data.deadline, "2026-10-07T18:29:00.000Z");
  assert.equal(first.data.done, false);
  assert.equal(first.data.subtasks[0].done, false);
  rows.get(first.id).data.notes = "Edited next occurrence";
  const again = await backend.exports.ensureNextRepeat(task);
  assert.equal(again.id, first.id);
  assert.equal(rows.size, 1);
  assert.equal(again.data.notes, "Edited next occurrence");
});
