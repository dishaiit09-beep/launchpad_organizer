import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const source = await readFile(
  new URL("../src/lib/records.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", compiled)(
  require,
  module,
  module.exports,
);
const { taskOnDay, taskInWeek, taskWeekDay } = module.exports;
const zone = "Asia/Kolkata";
const task = {
  title: "Finish lab",
  deadline: "2026-10-05T18:29:00.000Z",
  done: false,
};
test("unfinished tasks carry forward without changing their original deadline", () => {
  assert.equal(taskOnDay(task, "2026-10-05", zone), true);
  assert.equal(taskOnDay(task, "2026-10-06", zone), true);
  assert.equal(taskOnDay(task, "2026-10-07", zone), true);
  assert.equal(taskOnDay(task, "2026-10-04", zone), false);
  assert.equal(task.deadline, "2026-10-05T18:29:00.000Z");
  assert.equal(taskOnDay({ ...task, done: true }, "2026-10-06", zone), false);
});
test("weekly tables filter dates and carry unfinished tasks into the selected week", () => {
  assert.equal(taskInWeek(task, "2026-10-12", "2026-10-18", zone), true);
  assert.equal(
    taskInWeek({ ...task, done: true }, "2026-10-12", "2026-10-18", zone),
    false,
  );
  assert.equal(
    taskWeekDay(task, "2026-10-05", "2026-10-11", "2026-10-06", zone),
    "2026-10-06",
  );
  assert.equal(
    taskWeekDay(task, "2026-10-12", "2026-10-18", "2026-10-06", zone),
    "2026-10-12",
  );
  assert.equal(
    taskInWeek(
      { ...task, deadline: "2026-10-20T18:29:00.000Z" },
      "2026-10-12",
      "2026-10-18",
      zone,
    ),
    false,
  );
});
test("completing a carried task keeps it green on its completion day and stops future carryover", () => {
  const completed = {
    ...task,
    done: true,
    completedOn: "2026-10-06T04:30:00.000Z",
  };
  assert.equal(taskOnDay(completed, "2026-10-06", zone), true);
  assert.equal(taskOnDay(completed, "2026-10-07", zone), false);
  assert.equal(
    taskWeekDay(completed, "2026-10-05", "2026-10-11", "2026-10-06", zone),
    "2026-10-06",
  );
});
test("date filters use the display timezone at midnight", () => {
  const boundary = {
    title: "Read paper",
    deadline: "2026-10-05T19:00:00.000Z",
    done: false,
  };
  assert.equal(taskOnDay(boundary, "2026-10-05", zone), false);
  assert.equal(taskOnDay(boundary, "2026-10-06", zone), true);
  assert.equal(taskOnDay({ title: "Undated" }, "2026-10-06", zone), false);
});
