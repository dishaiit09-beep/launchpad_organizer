"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  categories,
  stages,
  zones,
  documents,
  weekdays,
  kindLabels,
  recordSchema,
  isoToWallTime,
  wallTimeToISO,
  type Item,
  type Data,
  type Kind,
} from "@/lib/records";
export function Choice({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: (
    | string
    | {
        value: string;
        label: string;
      }
  )[];
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? "" : v)}
    >
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue placeholder="Choose" />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((option) => {
          const v = typeof option === "string" ? option : option.value;
          return (
            <SelectItem key={v || "none"} value={v || "none"}>
              {typeof option === "string" ? option : option.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
export function Editor({
  item,
  kind,
  items,
  zone,
  defaults,
  onClose,
  onSave,
}: {
  item?: Item;
  defaults?: Partial<Data>;
  kind: Kind;
  items: Item[];
  zone: string;
  onClose: () => void;
  onSave: (kind: Kind, data: Data, id?: string) => Promise<void>;
}) {
  const [data, setData] = useState<Data>(
    item?.data || {
      title: "",
      timezone: zone,
      priority: "Medium",
      status:
        kind === "opportunity"
          ? "To apply"
          : kind === "test"
            ? "Have to prepare"
            : kind === "contact"
              ? "Not contacted"
              : "Not started",
      category: kind === "opportunity" ? categories[0] : undefined,
      lorStatus: "Not needed",
      requirements: [],
      ready: [],
      topics: [],
      done: false,
      weekday: "Monday",
      startTime: "09:00",
      endTime: "10:00",
      ...defaults,
    },
  );
  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      ["deadline", "followupAt", "appliedOn", "reminderAt"].map((key) => [
        key,
        isoToWallTime(
          (item?.data || defaults)?.[key as keyof Data] as string,
          item?.data.timezone || zone,
        ),
      ]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("basics");
  function set(key: keyof Data, value: unknown) {
    setData((prev) => ({ ...prev, [key]: value }));
  }
  function field(
    key: keyof Data,
    label: string,
    type = "text",
    placeholder = "",
    required = false,
  ) {
    return (
      <label className="field" key={key}>
        <span>
          {label}
          {required && " *"}
        </span>
        <Input
          type={type}
          value={String(data[key] ?? "")}
          required={required}
          maxLength={key === "title" ? 180 : undefined}
          placeholder={placeholder}
          onChange={(e) =>
            set(
              key,
              type === "number"
                ? e.target.value === ""
                  ? undefined
                  : Number(e.target.value)
                : e.target.value,
            )
          }
        />
      </label>
    );
  }
  function choice(
    key: keyof Data,
    label: string,
    options: (
      | string
      | {
          value: string;
          label: string;
        }
    )[],
  ) {
    return (
      <label className="field" key={key}>
        <span>{label}</span>
        <Choice
          label={label}
          value={String(data[key] ?? "")}
          options={options}
          onChange={(v) => set(key, v)}
        />
      </label>
    );
  }
  function text(key: keyof Data, label: string, placeholder = "") {
    return (
      <label className="field full" key={key}>
        <span>{label}</span>
        <Textarea
          value={String(data[key] ?? "")}
          placeholder={placeholder}
          onChange={(e) => set(key, e.target.value)}
          rows={3}
        />
      </label>
    );
  }
  function date(key: string, label: string) {
    return (
      <label className="field" key={key}>
        <span>{label}</span>
        <Input
          type="datetime-local"
          value={dates[key] || ""}
          onChange={(e) =>
            setDates((prev) => ({ ...prev, [key]: e.target.value }))
          }
        />
      </label>
    );
  }
  const contacts = [
    { value: "", label: "None selected" },
    ...items
      .filter((x) => x.kind === "contact")
      .map((x) => ({ value: x.id, label: x.data.title })),
  ];
  const linked = [
    { value: "", label: "None selected" },
    ...items
      .filter(
        (x) =>
          ["opportunity", "project", "test"].includes(x.kind) &&
          x.id !== item?.id,
      )
      .map((x) => ({ value: x.id, label: x.data.title })),
  ];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const finalData = { ...data };
      for (const key of [
        "deadline",
        "followupAt",
        "appliedOn",
        "reminderAt",
      ] as const)
        finalData[key] = wallTimeToISO(dates[key] || "", data.timezone || zone);
      if (kind === "task" && finalData.reminderAt !== item?.data.reminderAt)
        finalData.reminderDismissedFor = "";
      const valid = recordSchema.safeParse({ kind, data: finalData });
      if (!valid.success) throw new Error(valid.error.issues[0].message);
      await onSave(kind, valid.data.data, item?.id);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const basics = (
    <div className="form-grid">
      <div className="full">
        {field(
          "title",
          kind === "contact" ? "Name" : "Title",
          "text",
          kind === "opportunity" ? "e.g. Summer research internship" : "",
          true,
        )}
      </div>
      {kind === "opportunity" &&
        choice("category", "Opportunity type", categories)}
      {["opportunity", "contact", "project", "test"].includes(kind) &&
        field(
          "organization",
          kind === "contact"
            ? "University / organisation"
            : "Organisation / university",
        )}
      {kind !== "contact" &&
        kind !== "block" &&
        choice("priority", "Priority", ["High", "Medium", "Low"])}
      {kind === "opportunity" && choice("status", "Application stage", stages)}
      {kind === "project" &&
        choice("status", "Project status", [
          "Not started",
          "In progress",
          "On hold",
          "Completed",
        ])}
      {kind === "test" &&
        choice("status", "Preparation status", [
          "Have to prepare",
          "Preparing",
          "Prepared",
          "Completed",
        ])}
      {kind === "contact" &&
        choice("role", "Contact type", [
          "Professor",
          "POC",
          "Mentor",
          "LOR writer",
          "Recruiter",
          "Other",
        ])}
      {kind === "contact" && field("email", "Email", "email")}
      {kind === "contact" && field("phone", "Phone")}
      {kind !== "block" &&
        date(
          kind === "contact" ? "followupAt" : "deadline",
          kind === "test"
            ? "Test / interview date"
            : kind === "contact"
              ? "Follow-up date"
              : "Deadline / due date",
        )}
      {kind === "task" && (
        <div className="field full">
          {date("reminderAt", "Remind me at (optional)")}
          <small>
            Choose your reminder date and time. Default reminders 3 days and 1
            day before the deadline stay enabled.
          </small>
        </div>
      )}
      {kind !== "block" && choice("timezone", "Date and time timezone", zones)}
      {kind === "block" && choice("weekday", "Day", weekdays)}
      {kind === "block" && field("startTime", "Start time", "time")}
      {kind === "block" && field("endTime", "End time", "time")}
      {["task", "test", "block"].includes(kind) &&
        choice("linkedId", "Link to opportunity, project or prep", linked)}
      {kind === "task" && field("duration", "Estimated minutes", "number")}
      {kind === "task" &&
        choice("repeat", "Repeat task", ["None", "Daily", "Weekly"])}
      {kind === "task" && (
        <label className="field full">
          <span>Subtasks — one per line</span>
          <Textarea
            value={(data.subtasks || []).map((x) => x.title).join("\n")}
            onChange={(e) =>
              set(
                "subtasks",
                e.target.value
                  .split("\n")
                  .filter((x) => x.trim())
                  .map((title) => ({
                    title: title.trim(),
                    done:
                      data.subtasks?.find((x) => x.title === title.trim())
                        ?.done || false,
                  })),
              )
            }
          />
        </label>
      )}
      {kind === "project" && field("progress", "Progress (%)", "number")}
      {kind !== "task" &&
        kind !== "block" &&
        field(
          "url",
          kind === "contact"
            ? "Profile / lab link"
            : kind === "project"
              ? "Repository / project link"
              : "Application / information link",
          "url",
          "https://",
        )}
      {kind === "opportunity" &&
        field("nextStep", "Next action", "text", "e.g. Finish SOP draft")}
      {kind === "block" && field("location", "Room / location")}
    </div>
  );
  const details = (
    <div className="form-grid">
      {kind === "opportunity" && field("location", "Location / remote")}
      {kind === "opportunity" && field("stipend", "Stipend / funding")}
      {kind === "opportunity" &&
        text("eligibility", "Eligibility and requirements")}
      {["opportunity", "project"].includes(kind) &&
        choice("contactId", "Professor / point of contact", contacts)}
      {kind === "opportunity" && date("appliedOn", "Applied on")}
      {kind === "opportunity" && date("followupAt", "Follow-up on")}
      {kind === "contact" && text("research", "Research interests / area")}
      {kind === "contact" &&
        choice("status", "Contact status", [
          "Not contacted",
          "Email sent",
          "Replied",
          "Meeting planned",
          "Closed",
        ])}
      {kind === "project" && field("nextStep", "Next milestone")}
      {kind === "test" && (
        <label className="field full">
          <span>Syllabus — one topic per line</span>
          <Textarea
            rows={7}
            placeholder={"Arrays and strings\nProbability\nSQL"}
            value={(data.topics || []).map((x) => x.title).join("\n")}
            onChange={(e) =>
              set(
                "topics",
                e.target.value
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .map((title) => ({
                    title,
                    done:
                      (data.topics || []).find((x) => x.title === title)
                        ?.done || false,
                  })),
              )
            }
          />
        </label>
      )}
      {kind === "test" &&
        field("duration", "Test duration (minutes)", "number")}
      {kind !== "block" &&
        field(
          "documentsUrl",
          "Documents / study resources link",
          "url",
          "https://",
        )}
      {text(
        "notes",
        "Notes",
        kind === "contact"
          ? "Email history, meeting notes, and reminders"
          : "Details you want to remember",
      )}
      {["task", "block"].includes(kind) &&
        choice("contactId", "Related contact", contacts)}
    </div>
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="editor-dialog">
        <DialogHeader>
          <DialogTitle>
            {item ? "Edit" : "Add"} {kindLabels[kind]}
          </DialogTitle>
          <DialogDescription>
            {kind === "opportunity"
              ? "Keep the deadline, next action, and application details together."
              : "Optional fields can be filled in later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="editor-tabs">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="details">
                {kind === "test" ? "Syllabus & notes" : "Details & notes"}
              </TabsTrigger>
              {kind === "opportunity" && (
                <TabsTrigger value="documents">Documents & LOR</TabsTrigger>
              )}
            </TabsList>
            <div className="editor-scroll">
              <TabsContent value="basics" forceMount hidden={tab !== "basics"}>
                {basics}
              </TabsContent>
              <TabsContent
                value="details"
                forceMount
                hidden={tab !== "details"}
              >
                {details}
              </TabsContent>
              {kind === "opportunity" && (
                <TabsContent
                  value="documents"
                  forceMount
                  hidden={tab !== "documents"}
                >
                  <div className="checklist-form">
                    <p>Select required documents, then mark what is ready.</p>
                    {documents.map((doc) => (
                      <div className="document-row" key={doc}>
                        <label>
                          <Checkbox
                            checked={data.requirements?.includes(doc) || false}
                            onCheckedChange={(checked) => {
                              set(
                                "requirements",
                                checked
                                  ? [...(data.requirements || []), doc]
                                  : (data.requirements || []).filter(
                                      (x) => x !== doc,
                                    ),
                              );
                              if (!checked)
                                set(
                                  "ready",
                                  (data.ready || []).filter((x) => x !== doc),
                                );
                            }}
                          />
                          {doc}
                        </label>
                        <label>
                          <Checkbox
                            disabled={!data.requirements?.includes(doc)}
                            checked={data.ready?.includes(doc) || false}
                            onCheckedChange={(checked) =>
                              set(
                                "ready",
                                checked
                                  ? [...(data.ready || []), doc]
                                  : (data.ready || []).filter((x) => x !== doc),
                              )
                            }
                          />
                          Ready
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="form-grid">
                    {choice("lorStatus", "LOR status", [
                      "Not needed",
                      "To request",
                      "Requested",
                      "Received",
                    ])}
                    {field("lorCount", "Number of LORs needed", "number")}
                    {choice("refereeId", "LOR writer", contacts)}
                    {field(
                      "documentsUrl",
                      "Documents folder link",
                      "url",
                      "https://",
                    )}
                  </div>
                  <p className="field-help">
                    Add professors and POCs in Contacts to link them here.
                  </p>
                </TabsContent>
              )}
            </div>
          </Tabs>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-footer">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : item ? "Save changes" : "Add to workspace"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
