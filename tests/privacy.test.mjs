import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("database isolates accounts, blocks ownership transfers and anonymous access", async () => {
  const db = new PGlite();
  const a = "00000000-0000-0000-0000-000000000001";
  const b = "00000000-0000-0000-0000-000000000002";
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      insert into auth.users values ('${a}'), ('${b}');`);
    const schema = await readFile(
      new URL("../supabase/schema.sql", import.meta.url),
      "utf8",
    );
    await db.exec(schema);
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub = '${a}';`,
    );
    const row = await db.query(
      `insert into public.records(kind,data) values ('task','{"title":"Private task"}') returning id`,
    );
    const id = row.rows[0].id;
    await assert.rejects(
      db.query(
        `insert into public.records(owner_id,kind,data) values ($1,'task','{"title":"Spoof"}')`,
        [b],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query("update public.records set owner_id=$1 where id=$2", [b, id]),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        `insert into public.records(kind,data) values ('task','{"title":" "}')`,
      ),
      /check constraint/,
    );
    await db.exec(`set request.jwt.claim.sub = '${b}';`);
    assert.equal(
      (await db.query("select * from public.records")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.records set data=$1 where id=$2 returning id",
          [{ title: "Changed" }, id],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query("delete from public.records where id=$1 returning id", [
          id,
        ])
      ).rows.length,
      0,
    );
    await db.exec(`set request.jwt.claim.sub = '${a}';`);
    assert.equal(
      (await db.query("select * from public.records")).rows.length,
      1,
    );
    await db.exec("reset role;");
    await db.exec(schema); // Setup can run again without erasing records.
    await db.exec(
      `set role authenticated; set request.jwt.claim.sub = '${a}';`,
    );
    assert.equal(
      (
        await db.query("delete from public.records where id=$1 returning id", [
          id,
        ])
      ).rows.length,
      1,
    );
    await db.exec("reset role; set role anon;");
    await assert.rejects(
      db.query("select * from public.records"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        `insert into public.records(kind,data) values ('task','{"title":"Anon"}')`,
      ),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
