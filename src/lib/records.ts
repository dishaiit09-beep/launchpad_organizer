import { z } from "zod";
export const kinds = [
  "opportunity",
  "contact",
  "project",
  "test",
  "task",
  "block",
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
