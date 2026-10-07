import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
const require = createRequire(import.meta.url);
const module = { exports: {} };
const source = await readFile(
  new URL("../src/lib/records.ts", import.meta.url),
  "utf8",
);
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
const { encodeRecord, decodeRecord, recordSchema } = module.exports;
test("resources save in existing databases, remain separate from projects, and stay private", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-0000-0000-000000000001";
  const other = "00000000-0000-0000-0000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('${owner}'), ('${other}');`);
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub = '${owner}';`,
    );
    const entry = encodeRecord("resource", {
      title: "React docs",
      url: "https://react.dev/learn",
      category: "Web development",
      sheet: "Coding",
      status: "Pinned",
      notes: "Hooks guide",
      customFields: { Author: "React team" },
    });
    const saved = (
      await db.query(
        "insert into public.records(kind,data) values ($1,$2) returning *",
        [entry.kind, entry.data],
      )
    ).rows[0];
    const resource = decodeRecord(saved.kind, saved.data);
    assert.equal(resource.kind, "resource");
    assert.equal(resource.data.url, "https://react.dev/learn");
    assert.equal(resource.data.status, "Pinned");
    assert.equal(resource.data.customFields.Author, "React team");
    const project = encodeRecord("project", { title: "Original project" });
    assert.equal(decodeRecord(project.kind, project.data).kind, "project");
    await db.exec(`set request.jwt.claim.sub = '${other}';`);
    assert.equal(
      (await db.query("select * from public.records")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.records set data=$1 where id=$2 returning id",
          [{ ...entry.data, title: "Wrong owner" }, saved.id],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.records(id,owner_id,kind,data) values ($1,$2,$3,$4) on conflict(id) do update set data=excluded.data",
        [saved.id, other, entry.kind, entry.data],
      ),
      /row-level security/,
    );
  } finally {
    await db.close();
  }
});
test("resource links reject scripts and allow title-first autosave", () => {
  assert.equal(
    recordSchema.safeParse({
      kind: "resource",
      data: { title: "Course", url: "javascript:alert(1)" },
    }).success,
    false,
  );
  assert.equal(
    recordSchema.safeParse({ kind: "resource", data: { title: "Course" } })
      .success,
    true,
  );
});
