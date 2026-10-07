import { z } from "zod";
export const kinds = [
  "opportunity",
  "contact",
  "project",
  "test",
  "task",
  "block",
  "resource",
] as const;
export type Kind = (typeof kinds)[number];
export const categories = [
  "University research",
  "Tech internship",
  "Hackathon",
  "Competition",
  "Fellowship",
  "Ambassador",
  "Other",
];
export const stages = [
  "To apply",
  "Preparing",
  "Applied",
  "Test",
  "Interview",
  "Offer",
  "Rejected",
  "Closed",
];
export const zones = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Zurich",
  "Asia/Singapore",
  "Australia/Sydney",
];
export const documents = ["CV", "SOP", "LOR", "Transcript", "Portfolio"];
export const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const str = z.string().max(10000).optional();
const url = z
  .union([
    z.literal(""),
    z
      .string()
      .url()
      .refine((v) => /^https?:\/\//.test(v), "Use an http or https link"),
  ])
  .optional();
const date = z
  .union([z.literal(""), z.string().datetime({ offset: true })])
  .optional();
export const dataSchema = z
  .object({
    title: z.string().trim().min(1, "A title is required").max(180),
    sheet: z.string().max(100).optional(),
    recordType: z.literal("resource").optional(),
    customFields: z
      .record(z.string().max(100), z.string().max(10000))
      .optional(),
    category: str,
    organization: str,
    status: str,
    priority: z.enum(["High", "Medium", "Low"]).optional(),
    deadline: date,
    timezone: z
      .string()
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
    url,
    documentsUrl: url,
    location: str,
    stipend: str,
    eligibility: str,
    contactId: str,
    refereeId: str,
    nextStep: str,
    notes: str,
    requirements: z.array(z.string().max(100)).max(20).optional(),
    ready: z.array(z.string().max(100)).max(20).optional(),
    lorStatus: z
      .enum(["Not needed", "To request", "Requested", "Received"])
      .optional(),
    lorCount: z.number().int().min(0).max(10).optional(),
    appliedOn: date,
    completedOn: date,
    reminderAt: date,
    reminderDismissedFor: date,
    repeat: z.enum(["None", "Daily", "Weekly"]).optional(),
    subtasks: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(300),
          done: z.boolean(),
        }),
      )
      .max(100)
      .optional(),
    followupAt: date,
    email: z.union([z.literal(""), z.string().email()]).optional(),
    phone: str,
    research: str,
    role: str,
    progress: z.number().min(0).max(100).optional(),
    topics: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(300),
          done: z.boolean(),
        }),
      )
      .max(100)
      .optional(),
    linkedId: str,
    done: z.boolean().optional(),
    duration: z.number().min(0).max(1440).optional(),
    weekday: z.enum(weekdays as [string, ...string[]]).optional(),
    startTime: z
      .union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)])
      .optional(),
    endTime: z
      .union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)])
      .optional(),
  })
  .strict();
export const recordSchema = z
  .object({ kind: z.enum(kinds), data: dataSchema })
  .strict()
  .superRefine((v, ctx) => {
    if (
      v.kind === "task" &&
      v.data.repeat &&
      v.data.repeat !== "None" &&
      !v.data.deadline
    )
      ctx.addIssue({
        code: "custom",
        path: ["data", "deadline"],
        message: "Add a due date for a repeating task",
      });
    if (
      v.kind === "opportunity" &&
      v.data.status &&
      !stages.includes(v.data.status)
    )
      ctx.addIssue({
        code: "custom",
        path: ["data", "status"],
        message: "Choose a valid application stage",
      });
    if (
      v.kind === "block" &&
      (!v.data.weekday ||
        !v.data.startTime ||
        !v.data.endTime ||
        v.data.endTime <= v.data.startTime)
    )
      ctx.addIssue({
        code: "custom",
        path: ["data", "endTime"],
        message: "Choose a day and an end time after the start time",
      });
  });
export type Data = z.infer<typeof dataSchema>;
export type Item = {
  id: string;
  kind: Kind;
  data: Data;
  createdAt?: string;
  updatedAt?: string;
};
export const kindLabels: Record<Kind, string> = {
  opportunity: "opportunity",
  contact: "contact",
  project: "project",
  test: "test / preparation",
  task: "task",
  block: "timetable block",
  resource: "resource",
};
// Convert a wall-clock time in an IANA timezone to an absolute deadline.
export function wallTimeToISO(value: string, zone: string) {
  if (!value) return "";
  const target = Date.parse(value + ":00Z");
  if (!Number.isFinite(target)) throw new Error("Choose a valid date and time");
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const represented = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    const correction = target - represented;
    if (correction === 0) return new Date(instant).toISOString();
    instant += correction;
  }
  throw new Error(
    "This time does not exist in that timezone. Choose a different time.",
  );
}
export function isoToWallTime(value: string | undefined, zone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function dayKey(value: string | Date, zone = "Asia/Kolkata") {
  return isoToWallTime(
    typeof value === "string" ? value : value.toISOString(),
    zone,
  ).slice(0, 10);
}
export function isFinished(item: Item) {
  return (
    item.data.done ||
    ["Offer", "Rejected", "Closed", "Completed", "Done"].includes(
      item.data.status || "",
    )
  );
}
export function preparationProgress(item: Item) {
  const topics = item.data.topics || [];
  return topics.length
    ? Math.round((topics.filter((x) => x.done).length / topics.length) * 100)
    : item.data.status === "Prepared"
      ? 100
      : 0;
}

// A carried task keeps its original due date, so its lateness stays visible.
export function taskOnDay(data: Data, day: string, zone: string): boolean {
  if (!data.deadline) return false;
  const due = dayKey(data.deadline, zone);
  return (
    due === day ||
    (!data.done && due < day) ||
    (!!data.done &&
      !!data.completedOn &&
      dayKey(data.completedOn, zone) === day)
  );
}
export function taskInWeek(
  data: Data,
  start: string,
  end: string,
  zone: string,
): boolean {
  if (!data.deadline) return false;
  const due = dayKey(data.deadline, zone);
  const completed =
    data.done && data.completedOn ? dayKey(data.completedOn, zone) : "";
  return (
    (due >= start && due <= end) ||
    (!data.done && due < start) ||
    (!!completed && completed >= start && completed <= end)
  );
}
export function taskWeekDay(
  data: Data,
  start: string,
  end: string,
  today: string,
  zone: string,
): string {
  if (!data.deadline) return "";
  if (data.done && data.completedOn) return dayKey(data.completedOn, zone);
  const due = dayKey(data.deadline, zone);
  const carryDay = today < start ? start : today > end ? end : today;
  return !data.done && due < carryDay ? carryDay : due;
}

// Advance in the task's timezone, preserving its local clock time.
export function nextRepeatData(data: Data): Data | null {
  if (!data.done || !data.deadline || !data.repeat || data.repeat === "None")
    return null;
  const zone = data.timezone || "Asia/Kolkata";
  function advance(value: string) {
    const wall = isoToWallTime(value, zone);
    const date = new Date(wall.slice(0, 10) + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + (data.repeat === "Weekly" ? 7 : 1));
    return wallTimeToISO(
      date.toISOString().slice(0, 10) + wall.slice(10),
      zone,
    );
  }
  return {
    ...data,
    deadline: advance(data.deadline),
    reminderAt: data.reminderAt ? advance(data.reminderAt) : "",
    reminderDismissedFor: "",
    done: false,
    completedOn: "",
    subtasks: data.subtasks?.map((x) => ({ ...x, done: false })),
  };
}
export function reminderDays(
  item: Item,
  now: Date,
  zone: string,
): number | null {
  if (
    !item.data.deadline ||
    isFinished(item) ||
    (item.kind === "opportunity" &&
      !["To apply", "Preparing"].includes(item.data.status || "To apply"))
  )
    return null;
  const days = Math.round(
    (Date.parse(dayKey(item.data.deadline, zone)) -
      Date.parse(dayKey(now, zone))) /
      86400000,
  );
  return [1, 3].includes(days) ? days : null;
}

// Missed custom reminders remain visible until dismissed or the task is completed.
export function taskReminderDue(item: Item, now: Date): boolean {
  return (
    item.kind === "task" &&
    !isFinished(item) &&
    !!item.data.reminderAt &&
    item.data.reminderDismissedFor !== item.data.reminderAt &&
    Date.parse(item.data.reminderAt) <= now.getTime()
  );
}

// Resources use a marker in existing project storage. This avoids a database
// migration for installed workspaces; the UI always treats them as resources.
export function encodeRecord(kind: Kind, data: Data) {
  const entry = recordSchema.parse({ kind, data });
  return kind === "resource"
    ? {
        kind: "project" as const,
        data: { ...entry.data, recordType: "resource" as const },
      }
    : entry;
}
export function decodeRecord(kind: Kind, data: Data) {
  return recordSchema.parse({
    kind:
      kind === "project" && data.recordType === "resource" ? "resource" : kind,
    data,
  });
}
