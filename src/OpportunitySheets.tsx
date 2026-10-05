import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "./components/ui/button";
import {
  saveSheetRecord,
  loadSheetPreferences,
  saveSheetPreferences,
} from "./lib/backend";
import {
  categories,
  stages,
  recordSchema,
  wallTimeToISO,
  isoToWallTime,
  type Data,
  type Item,
} from "./lib/records";
import "./sheets.css";

type Column = { key: string; label: string; type?: string; options?: string[] };
const baseColumns: Column[] = [
  { key: "title", label: "Opportunity" },
  { key: "organization", label: "Organisation" },
  { key: "category", label: "Category", options: categories },
  { key: "deadline", label: "Deadline", type: "datetime-local" },
  { key: "status", label: "Status", options: stages },
  { key: "url", label: "Application link" },
  { key: "nextStep", label: "Next action" },
  { key: "notes", label: "Notes / POC / LOR" },
];
type Row = {
  id: string;
  data: Data;
  saved: string;
  busy: boolean;
  error: string;
  version: number;
};
const fingerprint = (data: Data) => JSON.stringify(data);
const rowFromItem = (item: Item): Row => ({
  id: item.id,
  data: item.data,
  saved: fingerprint(item.data),
  busy: false,
  error: "",
  version: 0,
});

// Keep one save in flight per row. Edits made during a request are saved next.
// A stable UUID makes retrying a new row safe, even after a lost response.
export function OpportunitySheets({
  items,
  zone,
  account,
  onSaved,
  onOpen,
}: {
  items: Item[];
  zone: string;
  account: string;
  onSaved: (item: Item) => void;
  onOpen: (id: string) => void;
}) {
  const preferenceKey = `launchpad-sheets:${account}`;
  const readPreferences = (): Record<string, string[]> => {
    try {
      const value = JSON.parse(
        localStorage.getItem(preferenceKey) || '{"General":[]}',
      );
      if (!value || typeof value !== "object" || Array.isArray(value))
        return { General: [] };
      return Object.fromEntries(
        Object.entries(value).filter(
          ([name, cols]) =>
            name.length <= 100 &&
            Array.isArray(cols) &&
            cols.every((c) => typeof c === "string" && c.length <= 100),
        ),
      ) as Record<string, string[]>;
    } catch {
      return { General: [] };
    }
  };
  const [preferences, setPreferences] = useState(readPreferences);
  const [settingsStatus, setSettingsStatus] = useState("");
  const preferenceQueue = useRef(Promise.resolve());
  const settingsPending = useRef(0);
  const preferencesEdited = useRef(false);
  const [active, setActive] = useState("General");
  const [sheetName, setSheetName] = useState("");
  const [columnName, setColumnName] = useState("");
  const [rows, setRows] = useState<Row[]>(() => items.map(rowFromItem));
  const rowsRef = useRef(rows);
  const savedCallback = useRef(onSaved);
  savedCallback.current = onSaved;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mounted = useRef(true);
  function replace(fn: (previous: Row[]) => Row[]) {
    rowsRef.current = fn(rowsRef.current);
    if (mounted.current) setRows(rowsRef.current);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);
  useEffect(() => {
    void loadSheetPreferences()
      .then((saved) => {
        if (saved && !preferencesEdited.current && mounted.current) {
          setPreferences(saved);
          try {
            localStorage.setItem(preferenceKey, JSON.stringify(saved));
          } catch {}
        }
      })
      .catch(() => {
        if (mounted.current)
          setSettingsStatus(
            "Could not load sheet settings. Your saved opportunities are still available.",
          );
      });
  }, []);
  useEffect(() => {
    replace((previous) => {
      const incoming = new Map(items.map((item) => [item.id, item]));
      const result = previous.flatMap((old) => {
        const item = incoming.get(old.id);
        incoming.delete(old.id);
        if (item)
          return [
            old.busy || old.saved !== fingerprint(old.data)
              ? old
              : rowFromItem(item),
          ];
        return old.saved === "" ||
          old.busy ||
          old.saved !== fingerprint(old.data)
          ? [old]
          : [];
      });
      // Saving a new row must not move it to the top while someone is typing.
      return [...result, ...[...incoming.values()].map(rowFromItem)];
    });
  }, [items]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        settingsPending.current > 0 ||
        rowsRef.current.some(
          (r) =>
            r.busy ||
            (r.saved !== fingerprint(r.data) &&
              (r.data.title.trim() || r.version > 0)),
        )
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function remember(next: Record<string, string[]>) {
    preferencesEdited.current = true;
    setPreferences(next);
    settingsPending.current++;
    setSettingsStatus("Saving sheet settings…");
    preferenceQueue.current = preferenceQueue.current
      .catch(() => {})
      .then(async () => {
        try {
          await saveSheetPreferences(next);
          if (mounted.current) setSettingsStatus("Sheet settings saved");
        } catch (error) {
          if (mounted.current)
            setSettingsStatus(
              error instanceof Error
                ? error.message
                : "Could not save sheet settings",
            );
        } finally {
          settingsPending.current--;
        }
      });
    try {
      localStorage.setItem(preferenceKey, JSON.stringify(next));
    } catch {
      /* Cloud records still save. */
    }
  }
  function queue(id: string, delay = 900) {
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        void persist(id);
      }, delay),
    );
  }
  async function persist(id: string) {
    const row = rowsRef.current.find((r) => r.id === id);
    if (!row || row.busy || row.saved === fingerprint(row.data)) return;
    if (!row.data.title.trim()) {
      if (row.version)
        replace((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, error: "Add an opportunity name to save this row." }
              : r,
          ),
        );
      return;
    }
    const checked = recordSchema.safeParse({
      kind: "opportunity",
      data: row.data,
    });
    if (!checked.success) {
      replace((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, error: checked.error.issues[0].message } : r,
        ),
      );
      return;
    }
    const snapshot = row.data;
    const version = row.version;
    replace((prev) =>
      prev.map((r) => (r.id === id ? { ...r, busy: true, error: "" } : r)),
    );
    try {
      const item = await saveSheetRecord(snapshot, id);
      replace((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, busy: false, saved: fingerprint(snapshot) } : r,
        ),
      );
      savedCallback.current(item);
      const latest = rowsRef.current.find((r) => r.id === id);
      if (latest && latest.version !== version) queue(id, 0);
    } catch (error) {
      replace((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                busy: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Could not save. Retry.",
              }
            : r,
        ),
      );
    }
  }
  const sheetNames = [
    ...new Set([
      "General",
      ...Object.keys(preferences),
      ...rows.map((r) => r.data.sheet || "General"),
    ]),
  ];
  const visibleRows = rows.filter(
    (r) => (r.data.sheet || "General") === active,
  );
  const extraColumns = [
    ...new Set([
      ...(preferences[active] || []),
      ...visibleRows.flatMap((r) => Object.keys(r.data.customFields || {})),
    ]),
  ];
  const columns: Column[] = [
    ...baseColumns,
    ...extraColumns.map((key) => ({ key: `custom:${key}`, label: key })),
  ];
  function renameSheet() {
    const next = window.prompt("New sheet name", active)?.trim();
    if (
      !next ||
      next === active ||
      next.length > 100 ||
      sheetNames.includes(next)
    )
      return;
    const updated = { ...preferences, [next]: extraColumns };
    delete updated[active];
    remember(updated);
    visibleRows.forEach((row) =>
      edit(row.id, { key: "sheet", label: "Sheet" }, next),
    );
    setActive(next);
  }
  function renameColumn(old: string) {
    const next = window.prompt("New column name", old)?.trim();
    if (
      !next ||
      next === old ||
      next.length > 100 ||
      extraColumns.includes(next)
    )
      return;
    remember({
      ...preferences,
      [active]: extraColumns.map((c) => (c === old ? next : c)),
    });
    visibleRows.forEach((row) => {
      replace((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                data: {
                  ...r.data,
                  customFields: Object.fromEntries(
                    Object.entries(r.data.customFields || {}).map(
                      ([key, value]) => [key === old ? next : key, value],
                    ),
                  ),
                },
                version: r.version + 1,
                error: "",
              }
            : r,
        ),
      );
      queue(row.id);
    });
  }
  function blank(): Row {
    return {
      id: crypto.randomUUID(),
      data: {
        title: "",
        sheet: active,
        category: "Other",
        status: "To apply",
        timezone: zone,
        customFields: Object.fromEntries(extraColumns.map((c) => [c, ""])),
      },
      saved: "",
      busy: false,
      error: "",
      version: 0,
    };
  }
  function addRow() {
    const row = blank();
    replace((prev) => [...prev, row]);
    setTimeout(() => document.getElementById(`sheet-${row.id}-0`)?.focus(), 0);
    return row;
  }
  function value(row: Row, column: Column) {
    if (column.key.startsWith("custom:"))
      return row.data.customFields?.[column.key.slice(7)] || "";
    if (column.key === "deadline")
      return isoToWallTime(row.data.deadline, row.data.timezone || zone);
    return String(row.data[column.key as keyof Data] || "");
  }
  function apply(data: Data, column: Column, text: string): Data {
    if (column.key.startsWith("custom:"))
      return {
        ...data,
        customFields: { ...data.customFields, [column.key.slice(7)]: text },
      };
    if (column.key === "deadline") {
      const wall = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T23:59` : text;
      return {
        ...data,
        deadline: wallTimeToISO(wall, data.timezone || zone),
        timezone: data.timezone || zone,
      };
    }
    return {
      ...data,
      [column.key]: text,
      ...(column.key === "status" && text === "Applied" && !data.appliedOn
        ? { appliedOn: new Date().toISOString() }
        : {}),
    };
  }
  function edit(id: string, column: Column, text: string) {
    try {
      replace((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                data: apply(r.data, column, text),
                version: r.version + 1,
                error: "",
              }
            : r,
        ),
      );
      queue(id);
    } catch (error) {
      replace((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                error: error instanceof Error ? error.message : "Invalid value",
              }
            : r,
        ),
      );
    }
  }
  function paste(
    event: React.ClipboardEvent,
    startRow: number,
    startColumn: number,
  ) {
    const text = event.clipboardData.getData("text/plain");
    if (!/[\t\n]/.test(text)) return;
    event.preventDefault();
    const grid = text
      .replace(/\r/g, "")
      .replace(/\n$/, "")
      .split("\n")
      .map((line) => line.split("\t"));
    if (grid.length > 500) {
      alert("Paste up to 500 rows at a time.");
      return;
    }
    const changed: Row[] = [];
    for (let index = 0; index < grid.length; index++) {
      const old = visibleRows[startRow + index] || blank();
      let data = old.data;
      try {
        grid[index].forEach((cell, offset) => {
          const column = columns[startColumn + offset];
          if (column) data = apply(data, column, cell.trim());
        });
        changed.push({ ...old, data, version: old.version + 1, error: "" });
      } catch (error) {
        // Keep the original pasted text in a visible error instead of silently dropping a row.
        changed.push({
          ...old,
          data,
          error: `Paste row ${index + 1}: ${error instanceof Error ? error.message : "Invalid date"}. Use YYYY-MM-DD for dates.`,
          version: old.version + 1,
        });
      }
    }
    replace((prev) => {
      const patches = new Map(changed.map((r) => [r.id, r]));
      const result = prev.map((r) => {
        const update = patches.get(r.id);
        patches.delete(r.id);
        return update || r;
      });
      return [...result, ...patches.values()];
    });
    changed.filter((r) => !r.error).forEach((r) => queue(r.id));
  }
  return (
    <section className="panel opportunity-sheets">
      <div className="sheet-heading">
        <div>
          <h2>Your opportunity sheets</h2>
          <p>
            Type directly. Changes save after a short pause. Deadlines appear in
            your calendar.
          </p>
        </div>
      </div>
      <div
        className="sheet-tabs"
        role="tablist"
        aria-label="Opportunity sheets"
      >
        {sheetNames.map((name) => (
          <button
            role="tab"
            aria-selected={name === active}
            key={name}
            onClick={() => setActive(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="sheet-tools">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = sheetName.trim();
            if (!name || name.length > 100) return;
            remember({ ...preferences, [name]: preferences[name] || [] });
            setActive(name);
            setSheetName("");
          }}
        >
          <input
            aria-label="New sheet name"
            placeholder="New sheet name"
            maxLength={100}
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
          />
          <Button variant="outline" type="submit">
            + Sheet
          </Button>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = columnName.trim();
            if (
              !name ||
              extraColumns.includes(name) ||
              extraColumns.length >= 50
            )
              return;
            remember({ ...preferences, [active]: [...extraColumns, name] });
            visibleRows.forEach((row) =>
              edit(row.id, { key: `custom:${name}`, label: name }, ""),
            );
            setColumnName("");
          }}
        >
          <input
            aria-label="New column name"
            placeholder="Extra column: POC, Email, LOR…"
            maxLength={100}
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
          />
          <Button variant="outline" type="submit">
            + Column
          </Button>
        </form>
        <Button variant="outline" onClick={renameSheet}>
          Rename sheet
        </Button>
        <Button onClick={addRow}>
          <Plus size={15} /> Add row
        </Button>
      </div>
      <p className="sheet-hint">
        Tab moves between cells · Enter moves down · Paste Excel rows directly ·
        Deadline times use each row’s timezone (new rows: {zone}). Sheets and
        saved rows sync across your devices.
      </p>
      {settingsStatus && (
        <p className="sheet-hint" role="status">
          {settingsStatus}
          {!settingsStatus.includes("saved") &&
            !settingsStatus.includes("Saving") && (
              <button
                className="sheet-rename"
                onClick={() => remember(preferences)}
              >
                Retry settings
              </button>
            )}
        </p>
      )}
      <div className="sheet-scroll">
        <table className="sheet-table">
          <thead>
            <tr>
              <th>#</th>
              {columns.map((c) => (
                <th key={c.key}>
                  {c.label}
                  {c.key.startsWith("custom:") && (
                    <button
                      aria-label={`Rename ${c.label} column`}
                      className="sheet-rename"
                      onClick={() => renameColumn(c.label)}
                    >
                      ✎
                    </button>
                  )}
                </th>
              ))}
              <th>Sheet</th>
              <th>Save status</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={row.id}>
                <td>{rowIndex + 1}</td>
                {columns.map((column, columnIndex) => (
                  <td key={column.key}>
                    {column.options ? (
                      <select
                        id={`sheet-${row.id}-${columnIndex}`}
                        aria-label={`${column.label}, row ${rowIndex + 1}`}
                        value={value(row, column)}
                        onChange={(e) => edit(row.id, column, e.target.value)}
                      >
                        <option value="">Select</option>
                        {column.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`sheet-${row.id}-${columnIndex}`}
                        aria-label={`${column.label}, row ${rowIndex + 1}`}
                        type={column.type || "text"}
                        maxLength={column.key === "title" ? 180 : 10000}
                        value={value(row, column)}
                        onChange={(e) => edit(row.id, column, e.target.value)}
                        onPaste={(e) => paste(e, rowIndex, columnIndex)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void persist(row.id);
                            const next = visibleRows[rowIndex + 1] || addRow();
                            setTimeout(
                              () =>
                                document
                                  .getElementById(
                                    `sheet-${next.id}-${columnIndex}`,
                                  )
                                  ?.focus(),
                              0,
                            );
                          }
                        }}
                      />
                    )}
                  </td>
                ))}
                <td>
                  <select
                    aria-label={`Sheet for row ${rowIndex + 1}`}
                    value={row.data.sheet || "General"}
                    onChange={(e) =>
                      edit(
                        row.id,
                        { key: "sheet", label: "Sheet" },
                        e.target.value,
                      )
                    }
                  >
                    {sheetNames.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </td>
                <td className="sheet-save" aria-live="polite">
                  {row.busy ? (
                    "Saving…"
                  ) : row.error ? (
                    <>
                      <span className="red-text">{row.error}</span>
                      <button
                        onClick={() => {
                          replace((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, error: "" } : r,
                            ),
                          );
                          void persist(row.id);
                        }}
                      >
                        Retry
                      </button>
                    </>
                  ) : row.saved === fingerprint(row.data) ? (
                    <>
                      <span>✓ Saved</span>
                      <button onClick={() => onOpen(row.id)}>Details</button>
                    </>
                  ) : row.data.title.trim() ? (
                    "Waiting to save…"
                  ) : (
                    "Add a name"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visibleRows.length && (
        <div className="sheet-empty">
          This sheet is empty. Add a row to start typing or paste your Excel
          list.
        </div>
      )}
      <div className="sheet-bottom">
        <Button variant="outline" onClick={addRow}>
          <Plus size={15} /> Add another row
        </Button>
        <span>
          Wait for “✓ Saved” before closing. Invalid rows stay visible for
          correction.
        </span>
      </div>
    </section>
  );
}
