import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("sheet retries update the same private record and preserve extra columns", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-0000-0000-000000000001";
  const other = "00000000-0000-0000-0000-000000000002";
  const id = "00000000-0000-0000-0000-000000000003";
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
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
    const upsert = `insert into public.records(id,owner_id,kind,data) values ($1,$2,$3,$4)
      on conflict(id) do update set data=excluded.data,owner_id=excluded.owner_id returning *`;
    const data = {
      title: "Research internship",
      sheet: "Winter",
      status: "To apply",
      deadline: "2030-01-01T18:29:00.000Z",
      timezone: "Asia/Kolkata",
      customFields: { "POC email": "prof@example.com", LOR: "Requested" },
    };
    const first = (await db.query(upsert, [id, owner, "opportunity", data]))
      .rows[0];
    await db.query(upsert, [
      id,
      owner,
      "opportunity",
      { ...data, organization: "IITB" },
    ]);
    const rows = (await db.query("select * from public.records")).rows;
    assert.equal(rows.length, 1, "retry must not duplicate the opportunity");
    assert.equal(
      new Date(rows[0].created_at).getTime(),
      new Date(first.created_at).getTime(),
    );
    assert.equal(rows[0].data.customFields["POC email"], "prof@example.com");
    assert.equal(rows[0].data.deadline, data.deadline);
    for (const [kind, suffix] of [
      ["project", "4"],
      ["task", "5"],
    ]) {
      const recordId = `00000000-0000-0000-0000-00000000000${suffix}`;
      const completed = {
        title: `${kind} sheet entry`,
        sheet: "Weekly",
        ...(kind === "task"
          ? { done: true }
          : { status: "Completed", progress: 100 }),
      };
      await db.query(upsert, [recordId, owner, kind, completed]);
      await db.query(upsert, [recordId, owner, kind, completed]);
      const saved = (
        await db.query("select * from public.records where id=$1", [recordId])
      ).rows;
      assert.equal(saved.length, 1);
      assert.equal(saved[0].kind, kind);
      assert.equal(
        kind === "task"
          ? saved[0].data.done
          : saved[0].data.status === "Completed",
        true,
      );
      const reopened = {
        ...completed,
        ...(kind === "task"
          ? { done: false }
          : { status: "In progress", progress: 0 }),
      };
      await db.query(upsert, [recordId, owner, kind, reopened]);
      const row = (
        await db.query("select data from public.records where id=$1", [
          recordId,
        ])
      ).rows[0];
      assert.equal(
        kind === "task" ? row.data.done : row.data.status === "Completed",
        false,
      );
    }
    await db.exec(`set request.jwt.claim.sub = '${other}';`);
    await assert.rejects(
      db.query(upsert, [id, other, "opportunity", data]),
      /row-level security/,
    );
    assert.equal(
      (await db.query("select * from public.records")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
