import { createClient } from "@supabase/supabase-js";
import {
  nextRepeatData,
  encodeRecord,
  decodeRecord,
  type Data,
  type Item,
  type Kind,
} from "./records";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

// The publishable key is designed for browser apps. Data protection is enforced
// by the database policies in supabase/schema.sql, not by hiding this key.
function configurationError(): string | null {
  if (
    !url ||
    !key ||
    url.includes("your-project") ||
    key.includes("replace-me")
  ) {
    return "Google sign-in is not connected yet. The website owner needs to finish the setup guide.";
  }
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      parsed.hostname !== "localhost" &&
      parsed.hostname !== "127.0.0.1"
    ) {
      return "The database URL must use HTTPS.";
    }
  } catch {
    return "The database URL is invalid.";
  }
  if (key.startsWith("sb_secret_"))
    return "Use the Supabase publishable key, not a secret key.";
  try {
    const payload = key.split(".")[1];
    if (
      payload &&
      JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))).role ===
        "service_role"
    ) {
      return "Use the Supabase publishable key, not a service-role key.";
    }
  } catch {
    /* Publishable keys are not JWTs. */
  }
  return null;
}
export const setupError = configurationError();
export const supabase = setupError
  ? null
  : createClient(url!, key!, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

function client() {
  if (!supabase)
    throw new Error(setupError || "Finish the website setup first.");
  return supabase;
}
async function currentUser() {
  const { data, error } = await client().auth.getUser();
  if (error || !data.user)
    throw new Error("Please sign in with Google to save your work.");
  return data.user;
}
export async function signInWithGoogle() {
  const { error } = await client().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw new Error(error.message);
}
export async function signOut() {
  const { error } = await client().auth.signOut({ scope: "local" });
  if (error) throw new Error(error.message);
}

type Row = {
  id: string;
  kind: Kind;
  data: Data;
  created_at: string;
  updated_at: string;
};
const columns = "id, kind, data, created_at, updated_at";
function decode(row: Row): Item {
  const entry = decodeRecord(row.kind, row.data);
  return {
    id: row.id,
    ...entry,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function explain(error: { message: string; code?: string }): Error {
  if (["42P01", "PGRST205"].includes(error.code || ""))
    return new Error(
      "The database is not ready. The website owner needs to run supabase/schema.sql.",
    );
  if (error.code === "PGRST116")
    return new Error("This entry no longer exists in your workspace.");
  if (error.code === "42501")
    return new Error(
      "You cannot access this entry. Sign in again, or check the database setup.",
    );
  return new Error(error.message || "Could not save. Please try again.");
}
export async function listRecords(): Promise<Item[]> {
  const user = await currentUser();
  const records: Item[] = [];
  // Supabase returns at most 1,000 rows per page. Collect every page so old
  // projects and daily tasks remain available as the workspace grows.
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client()
      .from("records")
      .select(columns)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .order("id")
      .range(start, start + 999);
    if (error) throw explain(error);
    const rows = data as Row[];
    records.push(...rows.map(decode));
    if (rows.length < 1000) return records;
  }
}
export async function saveRecord(
  kind: Kind,
  data: Data,
  id?: string,
): Promise<Item> {
  const entry = encodeRecord(kind, data);
  const user = await currentUser();
  const table = client().from("records");
  const operation = id
    ? table.update(entry).eq("id", id).eq("owner_id", user.id)
    : table.insert({ ...entry, owner_id: user.id });
  const { data: row, error } = await operation.select(columns).single();
  if (error) throw explain(error);
  return decode(row as Row);
}
export async function deleteRecord(id: string): Promise<void> {
  const user = await currentUser();
  const { data, error } = await client()
    .from("records")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .single();
  if (error) throw explain(error);
  if (!data) throw new Error("The entry was not found in your workspace.");
}

// Limit large Excel pastes to four database requests at a time.
let sheetRequests = 0;
const sheetWaiters: (() => void)[] = [];
async function acquireSheetSlot() {
  if (sheetRequests < 4) {
    sheetRequests++;
    return;
  }
  await new Promise<void>((resolve) => sheetWaiters.push(resolve));
}
function releaseSheetSlot() {
  const next = sheetWaiters.shift();
  if (next) next();
  else sheetRequests--;
}
// Spreadsheet rows use a stable ID, so a retry cannot create duplicates.
export async function saveSheetRecord(
  data: Data,
  id: string,
  kind: Extract<
    Kind,
    "opportunity" | "project" | "task" | "resource"
  > = "opportunity",
): Promise<Item> {
  const entry = encodeRecord(kind, data);
  await acquireSheetSlot();
  try {
    const user = await currentUser();
    const { data: row, error } = await client()
      .from("records")
      .upsert({ id, ...entry, owner_id: user.id }, { onConflict: "id" })
      .select(columns)
      .single();
    if (error) throw explain(error);
    return decode(row as Row);
  } finally {
    releaseSheetSlot();
  }
}

type SheetKind = Extract<Kind, "opportunity" | "project" | "task" | "resource">;
function sheetPreferenceField(kind: SheetKind) {
  return kind === "opportunity"
    ? "launchpadSheets"
    : kind === "project"
      ? "launchpadProjectSheets"
      : kind === "resource"
        ? "launchpadResourceSheets"
        : "launchpadTaskSheets";
}
export async function loadSheetPreferences(
  kind: SheetKind = "opportunity",
): Promise<Record<string, string[]> | null> {
  const user = await currentUser();
  const value = user.user_metadata[sheetPreferenceField(kind)];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, cols]) =>
        key.length <= 100 &&
        Array.isArray(cols) &&
        cols.length <= 50 &&
        cols.every((c) => typeof c === "string" && c.length <= 100),
    ),
  ) as Record<string, string[]>;
}
export async function saveSheetPreferences(
  sheets: Record<string, string[]>,
  kind: SheetKind = "opportunity",
): Promise<void> {
  const { error } = await client().auth.updateUser({
    data: { [sheetPreferenceField(kind)]: sheets },
  });
  if (error) throw new Error(error.message);
}

// A deterministic ID prevents duplicate next occurrences after retries or reopening.
export async function ensureNextRepeat(item: Item): Promise<Item | null> {
  if (item.kind !== "task") return null;
  const data = nextRepeatData(item.data);
  if (!data) return null;
  const digest = new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(item.id + ":" + data.deadline),
    ),
  );
  digest[6] = (digest[6] & 15) | 80;
  digest[8] = (digest[8] & 63) | 128;
  const hex = [...digest.slice(0, 16)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const user = await currentUser();
  const { error } = await client()
    .from("records")
    .upsert(
      { id, owner_id: user.id, kind: "task", data },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (error) throw explain(error);
  const result = await client()
    .from("records")
    .select(columns)
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();
  if (result.error) throw explain(result.error);
  return decode(result.data as Row);
}
