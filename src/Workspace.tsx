"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  Telescope,
  Send,
  FolderKanban,
  BookOpen,
  CalendarDays,
  UsersRound,
  ListTodo,
  Plus,
  Search,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Check,
  Pencil,
  Trash2,
  CircleHelp,
  Mail,
  ShieldCheck,
  Loader2,
  X,
  GraduationCap,
  BriefcaseBusiness,
  Trophy,
  Code2,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { OpportunitySheets } from "./OpportunitySheets";
import { Editor, Choice } from "./Editor";
import {
  categories,
  stages,
  zones,
  kinds,
  weekdays,
  kindLabels,
  wallTimeToISO,
  dayKey,
  isFinished,
  preparationProgress,
  recordSchema,
  type Item,
  type Kind,
  type Data,
} from "@/lib/records";
import { listRecords, saveRecord, deleteRecord } from "@/lib/backend";
type View =
  | "overview"
  | "opportunities"
  | "applications"
  | "projects"
  | "prep"
  | "planner"
  | "calendar"
  | "contacts";
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "opportunities", label: "Opportunities", icon: Telescope },
  { id: "applications", label: "Applications", icon: Send },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "prep", label: "Tests & preparation", icon: BookOpen },
  { id: "planner", label: "Daily & weekly plan", icon: ListTodo },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "contacts", label: "Contacts & professors", icon: UsersRound },
] as const;
const viewCopy: Record<
  View,
  {
    title: string;
    subtitle: string;
  }
> = {
  overview: {
    title: "Your next chapter, organised.",
    subtitle: "Deadlines, applications, and a little more headspace.",
  },
  opportunities: {
    title: "Opportunities",
    subtitle: "Find it. Save it. Make your next move.",
  },
  applications: {
    title: "Application pipeline",
    subtitle: "From a promising idea to an offer.",
  },
  projects: {
    title: "Projects",
    subtitle: "Keep the work moving, one milestone at a time.",
  },
  prep: {
    title: "Tests & preparation",
    subtitle: "Your syllabus, progress, and upcoming assessments.",
  },
  planner: {
    title: "Make room for what matters.",
    subtitle: "A daily list and a weekly rhythm that work together.",
  },
  calendar: {
    title: "Deadline calendar",
    subtitle: "Applications, follow-ups, tests, and tasks in one place.",
  },
  contacts: {
    title: "People to keep in touch with",
    subtitle: "Professors, POCs, recruiters, and LOR writers.",
  },
};
const categoryIcons: Record<string, typeof Telescope> = {
  "University research": GraduationCap,
  "Tech internship": BriefcaseBusiness,
  Hackathon: Code2,
  Competition: Trophy,
};
const datePlus = (key: string, days: number) => {
  const d = new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
function dateLabel(value: string | undefined, zone: string, withTime = false) {
  if (!value) return "No date set";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: zone,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}
function urgency(value: string | undefined, zone: string) {
  if (!value) return "No deadline";
  const diff = Math.round(
    (Date.parse(dayKey(value, zone) + "T00:00:00Z") -
      Date.parse(dayKey(new Date(), zone) + "T00:00:00Z")) /
      86400000,
  );
  return diff < 0
    ? `${-diff}d overdue`
    : diff === 0
      ? "Due today"
      : diff === 1
        ? "Tomorrow"
        : `In ${diff} days`;
}
function colour(status: string | undefined) {
  return status === "High" || status === "Have to prepare"
    ? "rose"
    : status === "Applied" ||
        status === "Prepared" ||
        status === "Completed" ||
        status === "Offer"
      ? "teal"
      : status === "Preparing" ||
          status === "In progress" ||
          status === "Interview"
        ? "violet"
        : "slate";
}
function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      <span>
        launchpad<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function Nav({
  view,
  onNavigate,
  count,
  user,
  onInstall,
}: {
  view: View;
  onNavigate: (v: View) => void;
  count: number;
  user: {
    name: string;
    email: string;
  } | null;
  onInstall: () => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <Sidebar className="launch-sidebar">
      <SidebarHeader>
        <Brand />
        <div className="workspace-label">
          MY WORKSPACE <span>PERSONAL</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>PLAN YOUR NEXT MOVE</SidebarGroupLabel>
          <SidebarMenu>
            {navigation.map(({ id, label, icon: Icon }) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuButton
                  isActive={view === id}
                  onClick={() => {
                    onNavigate(id);
                    setOpenMobile(false);
                  }}
                  tooltip={label}
                >
                  <Icon />
                  <span>{label}</span>
                  {id === "opportunities" && (
                    <span className="nav-count">{count}</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <div className="sidebar-note">
          <span className="tiny-label">ONE STEP AT A TIME</span>
          <p>Big plans start with a small next action.</p>
          <div className="note-line" />
        </div>
      </SidebarContent>
      <SidebarFooter>
        <button className="install-link" onClick={onInstall}>
          <Download size={17} />
          Install on desktop
        </button>
        <div className="user-card">
          <div className="avatar">
            {user ? user.name.slice(0, 2).toUpperCase() : "LP"}
          </div>
          <div>
            <strong>{user?.name || "Your workspace"}</strong>
            <span>{user ? "Private to you" : "Sign in to get started"}</span>
          </div>
          <ShieldCheck size={17} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export default function Workspace({
  user,
  onSignIn,
  onSignOut,
}: {
  user: {
    name: string;
    email: string;
  } | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [items, setItems] = useState<Item[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("overview"),
    [query, setQuery] = useState("");
  const [zone, setZone] = useState("Asia/Kolkata"),
    [editor, setEditor] = useState<{
      kind: Kind;
      item?: Item;
      defaults?: Partial<Data>;
    } | null>(null),
    [detailId, setDetailId] = useState<string | null>(null),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const [help, setHelp] = useState(false),
    [install, setInstall] = useState(false),
    [deleting, setDeleting] = useState(false),
    [pending, setPending] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("All types"),
    [stage, setStage] = useState("All stages"),
    [sort, setSort] = useState("Soonest deadline");
  const [plannerDate, setPlannerDate] = useState(() => dayKey(new Date())),
    [plannerTab, setPlannerTab] = useState("daily"),
    [taskFilter, setTaskFilter] = useState("Open");
  const [month, setMonth] = useState(() => dayKey(new Date()).slice(0, 7)),
    [calendarDay, setCalendarDay] = useState<string | null>(null);
  const installEvent = useRef<
    | (Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{
          outcome: string;
        }>;
      })
    | null
  >(null);
  const pendingIds = useRef(new Set<string>());
  const signedOut = !user;
  const detail = items.find((x) => x.id === detailId);
  const today = dayKey(new Date(), zone);
  const navigate = (v: View) => {
    setView(v);
    setQuery("");
  };
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(user ? await listRecords() : []);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load your workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, [user?.email]);
  useEffect(() => {
    void load();
    const saved = localStorage.getItem("launchpad-timezone");
    if (saved && zones.includes(saved)) setZone(saved);
  }, [load]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const handler = (e: Event) => {
      e.preventDefault();
      installEvent.current = e as typeof installEvent.current;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  const sheetSaved = useCallback((record: Item) => {
    setItems((previous) =>
      previous.some((item) => item.id === record.id)
        ? previous.map((item) => (item.id === record.id ? record : item))
        : [record, ...previous],
    );
  }, []);
  async function save(kind: Kind, data: Data, id?: string) {
    const parsed = recordSchema.safeParse({ kind, data });
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    if (!user) throw new Error("Sign in with Google to save your work.");
    const record = await saveRecord(kind, parsed.data.data, id);
    setItems((prev) =>
      id ? prev.map((x) => (x.id === id ? record : x)) : [record, ...prev],
    );
    toast.success(id ? "Changes saved" : "Added to your workspace");
  }
  async function update(item: Item, patch: Partial<Data>) {
    if (pendingIds.current.has(item.id)) return;
    pendingIds.current.add(item.id);
    setPending(new Set(pendingIds.current));
    try {
      await save(item.kind, { ...item.data, ...patch }, item.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      pendingIds.current.delete(item.id);
      setPending(new Set(pendingIds.current));
    }
  }
  async function remove() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteRecord(deleteId);
      setItems((prev) => prev.filter((x) => x.id !== deleteId));
      if (detailId === deleteId) setDetailId(null);
      setDeleteId(null);
      toast.success("Entry deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }
  const opportunities = items.filter((x) => x.kind === "opportunity"),
    tasks = items.filter((x) => x.kind === "task"),
    tests = items.filter((x) => x.kind === "test"),
    projects = items.filter((x) => x.kind === "project"),
    contacts = items.filter((x) => x.kind === "contact");
  const events = useMemo(
    () =>
      items
        .flatMap((item) => {
          if (isFinished(item)) return [];
          const result: {
            item: Item;
            date: string;
            label: string;
          }[] = [];
          if (
            item.data.deadline &&
            (item.kind !== "opportunity" ||
              ["To apply", "Preparing"].includes(
                item.data.status || "To apply",
              ))
          )
            result.push({
              item,
              date: item.data.deadline,
              label:
                item.kind === "test"
                  ? "Test"
                  : item.kind === "task"
                    ? "Task"
                    : "Deadline",
            });
          if (item.data.followupAt)
            result.push({
              item,
              date: item.data.followupAt,
              label: "Follow-up",
            });
          return result;
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [items],
  );
  const weekEnd = datePlus(today, 7),
    soon = events.filter(
      (x) => dayKey(x.date, zone) >= today && dayKey(x.date, zone) <= weekEnd,
    ),
    overdue = events.filter((x) => new Date(x.date) < new Date());
  const waitingDocs = opportunities.filter(
    (x) =>
      ["To apply", "Preparing"].includes(x.data.status || "") &&
      ((x.data.requirements || []).some((r) => !x.data.ready?.includes(r)) ||
        ["Requested", "To request"].includes(x.data.lorStatus || "")),
  );
  const filtered = opportunities
    .filter(
      (x) =>
        (category === "All types" || x.data.category === category) &&
        (stage === "All stages" || x.data.status === stage),
    )
    .sort((a, b) =>
      sort === "Priority"
        ? ["High", "Medium", "Low"].indexOf(a.data.priority || "Medium") -
          ["High", "Medium", "Low"].indexOf(b.data.priority || "Medium")
        : sort === "Recently added"
          ? (b.createdAt || "").localeCompare(a.createdAt || "")
          : (a.data.deadline || "9999").localeCompare(
              b.data.deadline || "9999",
            ),
    );
  const searchResults = items.filter((x) =>
    JSON.stringify(x.data).toLowerCase().includes(query.toLowerCase()),
  );
  function add(kind: Kind) {
    if (!user) {
      void onSignIn();
      return;
    }
    setEditor({
      kind,
      defaults:
        kind === "task" && (view === "planner" || view === "overview")
          ? {
              deadline: wallTimeToISO(
                `${view === "planner" ? plannerDate : today}T23:59`,
                zone,
              ),
            }
          : undefined,
    });
  }
  function empty(title: string, description: string, kind?: Kind) {
    return (
      <Empty className="empty-state">
        <EmptyHeader>
          <div className="empty-icon">
            <Sparkles />
          </div>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {kind && (
          <Button onClick={() => add(kind)}>
            <Plus size={16} />
            Add {kindLabels[kind]}
          </Button>
        )}
      </Empty>
    );
  }
  function itemIcon(item: Item) {
    const Icon =
      categoryIcons[item.data.category || ""] ||
      (
        {
          project: FolderKanban,
          contact: UsersRound,
          test: BookOpen,
          task: ListTodo,
          block: Clock3,
        } as Record<string, typeof Telescope>
      )[item.kind] ||
      Telescope;
    return (
      <div className={`item-icon ${colour(item.data.status)}`}>
        <Icon size={19} />
      </div>
    );
  }
  function row(item: Item, label?: string, date?: string) {
    return (
      <button
        key={item.id + (label || "")}
        className="deadline-row"
        onClick={() => setDetailId(item.id)}
      >
        {itemIcon(item)}
        <span className="grow">
          <strong>{item.data.title}</strong>
          <small>
            {label || item.data.category || kindLabels[item.kind]}
            {item.data.organization ? ` · ${item.data.organization}` : ""}
          </small>
        </span>
        <span className="date-stack">
          <strong>{dateLabel(date || item.data.deadline, zone)}</strong>
          <small
            className={
              new Date(date || item.data.deadline || "9999") < new Date()
                ? "red-text"
                : ""
            }
          >
            {urgency(date || item.data.deadline, zone)}
          </small>
        </span>
      </button>
    );
  }
  function taskRows(list: Item[]) {
    return list.length ? (
      <div className="task-list">
        {list.map((item) => (
          <div
            className={`task-row ${item.data.done ? "completed" : ""}`}
            key={item.id}
          >
            <Checkbox
              aria-label={`Complete ${item.data.title}`}
              checked={item.data.done || false}
              disabled={pending.has(item.id)}
              onCheckedChange={(v) => void update(item, { done: !!v })}
            />
            <button
              className="grow task-title"
              onClick={() => setDetailId(item.id)}
            >
              <strong>{item.data.title}</strong>
              <small>
                {items.find((x) => x.id === item.data.linkedId)?.data.title ||
                  "Personal task"}
                {item.data.duration ? ` · ${item.data.duration} min` : ""}
              </small>
            </button>
            <Badge tone={colour(item.data.priority)}>
              {item.data.priority || "Medium"}
            </Badge>
          </div>
        ))}
      </div>
    ) : (
      empty(
        "A little breathing room",
        "Add a task and give it a time in your day.",
        "task",
      )
    );
  }
  function cards(list: Item[], kind: Kind) {
    return list.length ? (
      <div className="cards-grid">
        {list.map((item) => (
          <button
            className="entry-card"
            key={item.id}
            onClick={() => setDetailId(item.id)}
          >
            <div className="card-top">
              {itemIcon(item)}
              <Badge tone={colour(item.data.status)}>
                {item.data.status || item.data.role || "Not started"}
              </Badge>
            </div>
            <h3>{item.data.title}</h3>
            <p>
              {item.data.organization || item.data.research || kindLabels[kind]}
            </p>
            {kind === "contact" ? (
              <div className="card-meta">
                <Mail size={15} />
                {item.data.email || "No email added"}
              </div>
            ) : (
              <>
                <div className="card-meta">
                  <CalendarDays size={15} />
                  {dateLabel(item.data.deadline, zone)}
                </div>
                {(kind === "project" || kind === "test") && (
                  <div className="progress-row">
                    <Progress
                      value={
                        kind === "test"
                          ? preparationProgress(item)
                          : item.data.progress || 0
                      }
                    />
                    <span>
                      {kind === "test"
                        ? preparationProgress(item)
                        : item.data.progress || 0}
                      %
                    </span>
                  </div>
                )}
              </>
            )}
            {item.data.nextStep && (
              <div className="next-step">
                <span>NEXT</span>
                {item.data.nextStep}
              </div>
            )}
            {kind === "contact" && item.data.followupAt && (
              <div className="next-step">
                <span>FOLLOW UP</span>
                {dateLabel(item.data.followupAt, zone)}
              </div>
            )}
          </button>
        ))}
      </div>
    ) : (
      empty(
        `Your ${kind === "test" ? "preparation starts" : kind === "contact" ? "network starts" : "next chapter starts"} here`,
        `Add your first ${kindLabels[kind]} to keep everything together.`,
        kind,
      )
    );
  }
  function opportunityTable(list: Item[]) {
    return list.length ? (
      <div className="table-scroll">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opportunity</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>
                <span className="sr-only">Open link</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <button
                    className="table-title"
                    onClick={() => setDetailId(item.id)}
                  >
                    {itemIcon(item)}
                    <span>
                      <strong>{item.data.title}</strong>
                      <small>
                        {item.data.organization || "Organisation not added"} ·{" "}
                        {item.data.category || "Other"}
                      </small>
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  <span className="deadline-cell">
                    {dateLabel(item.data.deadline, zone)}
                    <small
                      className={
                        new Date(item.data.deadline || "9999") < new Date() &&
                        ["To apply", "Preparing"].includes(
                          item.data.status || "",
                        )
                          ? "red-text"
                          : ""
                      }
                    >
                      {urgency(item.data.deadline, zone)}
                    </small>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge tone={colour(item.data.status)}>
                    {item.data.status || "To apply"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="document-count">
                    {item.data.ready?.filter((d) =>
                      item.data.requirements?.includes(d),
                    ).length || 0}
                    <span> / {item.data.requirements?.length || 0} ready</span>
                  </span>
                  {["To request", "Requested"].includes(
                    item.data.lorStatus || "",
                  ) && <small className="lor-pending">LOR pending</small>}
                </TableCell>
                <TableCell>
                  <Badge tone={colour(item.data.priority)}>
                    {item.data.priority || "Medium"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {item.data.url && (
                    <a
                      className="icon-button"
                      href={item.data.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.data.title} application`}
                    >
                      <ExternalLink size={17} />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ) : (
      empty(
        "No opportunities here yet",
        "Save internships, university research, hackathons, and competitions.",
        "opportunity",
      )
    );
  }
  const selectedDaily = tasks.filter(
      (x) => x.data.deadline && dayKey(x.data.deadline, zone) === plannerDate,
    ),
    undatedTasks = tasks.filter((x) => !x.data.deadline);
  const weekdayIndex =
      (new Date(plannerDate + "T12:00:00Z").getUTCDay() + 6) % 7,
    weekStart = datePlus(plannerDate, -weekdayIndex),
    weekDays = Array.from({ length: 7 }, (_, i) => datePlus(weekStart, i));
  const visibleTasks = (list: Item[]) =>
    list.filter((x) =>
      taskFilter === "All" || taskFilter === "Done"
        ? taskFilter === "All" || x.data.done
        : !x.data.done,
    );
  const monthStart = month + "-01",
    monthDate = new Date(monthStart + "T12:00:00Z"),
    calendarStart = datePlus(monthStart, -((monthDate.getUTCDay() + 6) % 7)),
    calendarCells = Array.from({ length: 42 }, (_, i) =>
      datePlus(calendarStart, i),
    );
  function moveMonth(n: number) {
    const d = new Date(monthStart + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(d.toISOString().slice(0, 7));
    setCalendarDay(null);
  }
  const dayEvents = events.filter(
    (x) => dayKey(x.date, zone) === (calendarDay || today),
  );
  // Browser agent tools use the same save function and API as the visible forms.
  const liveState = useRef({ items, save });
  liveState.current = { items, save };
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (tool: unknown, options: unknown) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "list_launchpad_entries",
            description:
              "Read the current user's entries in this Launchpad workspace.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: () => ({ entries: liveState.current.items }),
          },
          { signal: lifecycle.signal },
        ),
      ).catch(console.error);
      Promise.resolve(
        context.registerTool(
          {
            name: "create_launchpad_entry",
            description:
              "Create an opportunity, contact, project, test, task, or timetable block in the current workspace. Requires a signed-in Google account.",
            inputSchema: {
              type: "object",
              properties: {
                kind: { type: "string", enum: kinds },
                data: {
                  type: "object",
                  properties: { title: { type: "string" } },
                  required: ["title"],
                },
              },
              required: ["kind", "data"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute: async (input: unknown) => {
              const parsed = recordSchema.parse(input);
              await liveState.current.save(parsed.kind, parsed.data);
              return { created: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(console.error);
    } catch (e) {
      console.error("Browser tools unavailable", e);
    }
    return () => lifecycle.abort();
  }, [signedOut]);
  return (
    <SidebarProvider>
      <Nav
        view={view}
        onNavigate={navigate}
        count={opportunities.length}
        user={user}
        onInstall={() => setInstall(true)}
      />
      <SidebarInset className="workspace-main">
        <header className="topbar">
          <div className="topbar-left">
            <SidebarTrigger />
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{navigation.find((x) => x.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <label className="search-box">
              <Search size={17} />
              <Input
                aria-label="Search your workspace"
                placeholder="Search your workspace"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </label>
            <button
              className="icon-button help-button"
              aria-label="Help"
              onClick={() => setHelp(true)}
            >
              <CircleHelp size={20} />
            </button>
            {user ? (
              <button onClick={() => void onSignOut()} className="sign-out">
                Sign out
              </button>
            ) : (
              <button onClick={() => void onSignIn()} className="signin-button">
                Sign in with Google
              </button>
            )}
          </div>
        </header>
        {signedOut && (
          <div className="signin-banner">
            <span>
              <ShieldCheck size={16} />
              <strong>Your private workspace</strong>
              <span>Sign in with Google to start saving your plans.</span>
            </span>
            <button onClick={() => void onSignIn()}>Create my workspace</button>
          </div>
        )}
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {new Intl.DateTimeFormat("en-IN", {
                  timeZone: zone,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date())}
                <span className="heading-divider" />
                {signedOut
                  ? "YOUR NEXT CHAPTER"
                  : `HELLO, ${user!.name.split(" ")[0].toUpperCase()}`}
              </div>
              <h1>{query ? "Search your workspace" : viewCopy[view].title}</h1>
              <p>
                {query
                  ? `${searchResults.length} matching entries`
                  : viewCopy[view].subtitle}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="add-button" disabled={signedOut}>
                  <Plus size={18} />
                  Add new
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {kinds.map((kind) => (
                  <DropdownMenuItem key={kind} onSelect={() => add(kind)}>
                    Add {kindLabels[kind]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {user && !loading && !loadError && (
            <div hidden={view !== "opportunities" || !!query}>
              <OpportunitySheets
                items={opportunities}
                zone={zone}
                account={user.email}
                onSaved={sheetSaved}
                onOpen={setDetailId}
              />
            </div>
          )}
          {loadError ? (
            <div className="error-panel" role="alert">
              <strong>Your workspace couldn’t load.</strong>
              <p>{loadError}</p>
              <Button onClick={() => void load()}>Try again</Button>
            </div>
          ) : loading ? (
            <div className="loading-grid">
              {[1, 2, 3, 4].map((x) => (
                <Skeleton key={x} className="h-32 w-full" />
              ))}
              <Skeleton className="col-span-full h-80 w-full" />
            </div>
          ) : query ? (
            <div className="panel">
              <div className="panel-heading">
                <h2>Results</h2>
                <span>{searchResults.length} entries</span>
              </div>
              {searchResults.length
                ? searchResults.map((x) => row(x))
                : empty(
                    "No matches",
                    "Try a title, organisation, topic, or contact name.",
                  )}
            </div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <div className="stats-grid">
                    {[
                      {
                        label: "Due in the next 7 days",
                        value: soon.length,
                        icon: CalendarDays,
                        tone: "orange",
                        action: () => navigate("calendar"),
                        note: overdue.length
                          ? `${overdue.length} overdue · check dates`
                          : "Your next deadlines",
                      },
                      {
                        label: "Applications in progress",
                        value: opportunities.filter((x) =>
                          ["Applied", "Test", "Interview"].includes(
                            x.data.status || "",
                          ),
                        ).length,
                        icon: Send,
                        tone: "violet",
                        action: () => navigate("applications"),
                        note: "Keep the momentum",
                      },
                      {
                        label: "Tests to prepare for",
                        value: tests.filter(
                          (x) =>
                            !["Prepared", "Completed"].includes(
                              x.data.status || "",
                            ),
                        ).length,
                        icon: BookOpen,
                        tone: "teal",
                        action: () => navigate("prep"),
                        note: "Build your confidence",
                      },
                      {
                        label: "Documents still pending",
                        value: waitingDocs.length,
                        icon: UsersRound,
                        tone: "blue",
                        action: () => navigate("opportunities"),
                        note: "CVs, SOPs, and LORs",
                      },
                    ].map((s) => (
                      <button
                        key={s.label}
                        className={`stat-card ${s.tone}`}
                        onClick={s.action}
                      >
                        <div>
                          <span>{s.label}</span>
                          <s.icon size={19} />
                        </div>
                        <strong>{s.value.toString().padStart(2, "0")}</strong>
                        <small>{s.note}</small>
                      </button>
                    ))}
                  </div>
                  {!items.length && (
                    <div className="welcome-panel">
                      <div>
                        <Badge tone="violet">YOUR FRESH START</Badge>
                        <h2>
                          Everything you’re working towards, in one place.
                        </h2>
                        <p>
                          Start with an opportunity. Add its deadline,
                          documents, and the next small task.
                        </p>
                      </div>
                      <Button onClick={() => add("opportunity")}>
                        <Plus size={17} />
                        Add your first opportunity
                      </Button>
                    </div>
                  )}
                  <div className="overview-grid">
                    <section className="panel">
                      <div className="panel-heading">
                        <h2>
                          Coming up next{" "}
                          <span className="count-pill">{events.length}</span>
                        </h2>
                        <button onClick={() => navigate("calendar")}>
                          View calendar <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {events.length
                        ? events
                            .slice(0, 5)
                            .map((x) => row(x.item, x.label, x.date))
                        : empty(
                            "No deadlines on the horizon",
                            "Add a deadline or follow-up date to see it here.",
                            "opportunity",
                          )}
                    </section>
                    <section className="panel today-panel">
                      <div className="panel-heading">
                        <h2>Today’s focus</h2>
                        <button
                          onClick={() => add("task")}
                          aria-label="Add task"
                        >
                          <Plus size={19} />
                        </button>
                      </div>
                      <div className="focus-summary">
                        <div>
                          <strong>
                            {
                              tasks.filter(
                                (x) =>
                                  x.data.deadline &&
                                  dayKey(x.data.deadline, zone) === today &&
                                  x.data.done,
                              ).length
                            }
                            <span>
                              {" "}
                              /{" "}
                              {
                                tasks.filter(
                                  (x) =>
                                    x.data.deadline &&
                                    dayKey(x.data.deadline, zone) === today,
                                ).length
                              }
                            </span>
                          </strong>
                          <small>tasks complete</small>
                        </div>
                        <div className="focus-date">
                          <span>
                            {new Date(today + "T12:00Z").getUTCDate()}
                          </span>
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            timeZone: "UTC",
                          }).format(new Date(today + "T12:00Z"))}
                        </div>
                      </div>
                      {taskRows(
                        tasks
                          .filter(
                            (x) =>
                              x.data.deadline &&
                              dayKey(x.data.deadline, zone) === today,
                          )
                          .slice(0, 4),
                      )}
                      <button
                        className="panel-footer-link"
                        onClick={() => {
                          setPlannerDate(today);
                          navigate("planner");
                        }}
                      >
                        Open daily planner <ArrowUpRight size={16} />
                      </button>
                    </section>
                  </div>
                  <section className="panel pipeline-panel">
                    <div className="panel-heading">
                      <h2>Your application journey</h2>
                      <button onClick={() => navigate("applications")}>
                        Open pipeline <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <div className="journey-grid">
                      {[
                        "To apply",
                        "Preparing",
                        "Applied",
                        "Test",
                        "Interview",
                        "Offer",
                      ].map((s, i) => (
                        <button
                          key={s}
                          onClick={() => {
                            setStage(s);
                            navigate("opportunities");
                          }}
                        >
                          <span className="journey-number">0{i + 1}</span>
                          <strong>
                            {
                              opportunities.filter((x) => x.data.status === s)
                                .length
                            }
                          </strong>
                          <span>{s}</span>
                          <div className={`journey-line step-${i}`} />
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {view === "opportunities" && (
                <>
                  <section className="panel">
                    <div className="filterbar">
                      <div className="filter-group">
                        <Choice
                          label="Opportunity type filter"
                          value={category}
                          options={["All types", ...categories]}
                          onChange={setCategory}
                        />
                        <Choice
                          label="Application stage filter"
                          value={stage}
                          options={["All stages", ...stages]}
                          onChange={setStage}
                        />
                      </div>
                      <div className="filter-group">
                        <span>{filtered.length} opportunities</span>
                        <Choice
                          label="Sort opportunities"
                          value={sort}
                          options={[
                            "Soonest deadline",
                            "Priority",
                            "Recently added",
                          ]}
                          onChange={setSort}
                        />
                      </div>
                    </div>
                    {opportunityTable(filtered)}
                  </section>
                </>
              )}
              {view === "applications" && (
                <Tabs defaultValue="active">
                  <div className="view-toolbar">
                    <TabsList>
                      <TabsTrigger value="active">Active pipeline</TabsTrigger>
                      <TabsTrigger value="results">Offers & closed</TabsTrigger>
                    </TabsList>
                    <Button
                      variant="outline"
                      onClick={() => add("opportunity")}
                    >
                      <Plus size={16} />
                      Opportunity
                    </Button>
                  </div>
                  <TabsContent value="active">
                    <div className="kanban">
                      {stages.slice(0, 5).map((s) => (
                        <section className="kanban-column" key={s}>
                          <h2>
                            <span className={`stage-line ${colour(s)}`} />
                            {s}
                            <span>
                              {
                                opportunities.filter((x) => x.data.status === s)
                                  .length
                              }
                            </span>
                          </h2>
                          {opportunities
                            .filter((x) => (x.data.status || "To apply") === s)
                            .map((item) => (
                              <div className="kanban-card" key={item.id}>
                                <button onClick={() => setDetailId(item.id)}>
                                  <small>{item.data.category}</small>
                                  <h3>{item.data.title}</h3>
                                  <p>{item.data.organization}</p>
                                  <div className="card-meta">
                                    <CalendarDays size={14} />
                                    {dateLabel(item.data.deadline, zone)}
                                  </div>
                                  {item.data.nextStep && (
                                    <div className="next-step">
                                      {item.data.nextStep}
                                    </div>
                                  )}
                                </button>
                                <Choice
                                  label={`Change ${item.data.title} stage`}
                                  value={s}
                                  options={stages}
                                  onChange={(v) =>
                                    void update(item, {
                                      status: v,
                                      ...(v === "Applied" &&
                                      !item.data.appliedOn
                                        ? {
                                            appliedOn: new Date().toISOString(),
                                          }
                                        : {}),
                                    })
                                  }
                                />
                              </div>
                            ))}
                          <button
                            className="kanban-add"
                            onClick={() => {
                              if (!user) {
                                void onSignIn();
                                return;
                              }
                              setEditor({
                                kind: "opportunity",
                                defaults: { status: s },
                              });
                            }}
                          >
                            <Plus size={15} />
                            Add opportunity
                          </button>
                        </section>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="results">
                    <div className="panel">
                      {opportunityTable(
                        opportunities.filter((x) =>
                          ["Offer", "Rejected", "Closed"].includes(
                            x.data.status || "",
                          ),
                        ),
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
              {view === "projects" && (
                <>
                  <div className="view-toolbar">
                    <span>
                      {
                        projects.filter((x) => x.data.status === "In progress")
                          .length
                      }{" "}
                      projects in progress
                    </span>
                    <Button onClick={() => add("project")}>
                      <Plus size={16} />
                      New project
                    </Button>
                  </div>
                  {cards(projects, "project")}
                </>
              )}
              {view === "prep" && (
                <Tabs defaultValue="upcoming">
                  <div className="view-toolbar">
                    <TabsList>
                      <TabsTrigger value="upcoming">
                        Upcoming / to prepare
                      </TabsTrigger>
                      <TabsTrigger value="prepared">Prepared</TabsTrigger>
                      <TabsTrigger value="completed">Completed</TabsTrigger>
                    </TabsList>
                    <Button onClick={() => add("test")}>
                      <Plus size={16} />
                      Add test / prep
                    </Button>
                  </div>
                  <TabsContent value="upcoming">
                    {cards(
                      tests
                        .filter(
                          (x) =>
                            !["Prepared", "Completed"].includes(
                              x.data.status || "",
                            ),
                        )
                        .sort((a, b) =>
                          (a.data.deadline || "9999").localeCompare(
                            b.data.deadline || "9999",
                          ),
                        ),
                      "test",
                    )}
                  </TabsContent>
                  <TabsContent value="prepared">
                    {cards(
                      tests.filter((x) => x.data.status === "Prepared"),
                      "test",
                    )}
                  </TabsContent>
                  <TabsContent value="completed">
                    {cards(
                      tests.filter((x) => x.data.status === "Completed"),
                      "test",
                    )}
                  </TabsContent>
                </Tabs>
              )}
              {view === "contacts" && (
                <>
                  <div className="view-toolbar">
                    <span>{contacts.length} people in your network</span>
                    <Button onClick={() => add("contact")}>
                      <Plus size={16} />
                      New contact
                    </Button>
                  </div>
                  {cards(contacts, "contact")}
                </>
              )}
              {view === "planner" && (
                <Tabs value={plannerTab} onValueChange={setPlannerTab}>
                  <div className="view-toolbar">
                    <TabsList>
                      <TabsTrigger value="daily">Daily to-do</TabsTrigger>
                      <TabsTrigger value="weekly">Weekly to-do</TabsTrigger>
                      <TabsTrigger value="timetable">Timetable</TabsTrigger>
                    </TabsList>
                    <Button
                      onClick={() =>
                        add(plannerTab === "timetable" ? "block" : "task")
                      }
                    >
                      <Plus size={16} />
                      {plannerTab === "timetable"
                        ? "Add time block"
                        : "Add task"}
                    </Button>
                  </div>
                  <TabsContent value="daily">
                    <div className="planner-grid">
                      <section className="panel">
                        <div className="planner-toolbar">
                          <div className="date-navigation">
                            <button
                              className="icon-button"
                              aria-label="Previous day"
                              onClick={() =>
                                setPlannerDate(datePlus(plannerDate, -1))
                              }
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <Input
                              aria-label="Planner date"
                              type="date"
                              value={plannerDate}
                              onChange={(e) =>
                                e.target.value && setPlannerDate(e.target.value)
                              }
                            />
                            <button
                              className="icon-button"
                              aria-label="Next day"
                              onClick={() =>
                                setPlannerDate(datePlus(plannerDate, 1))
                              }
                            >
                              <ChevronRight size={18} />
                            </button>
                          </div>
                          <Choice
                            value={taskFilter}
                            label="Task status filter"
                            options={["Open", "Done", "All"]}
                            onChange={setTaskFilter}
                          />
                        </div>
                        {taskRows(visibleTasks(selectedDaily))}
                        <div className="planner-subheading">
                          <h3>Unscheduled</h3>
                          <span>Give these a date when you’re ready.</span>
                        </div>
                        {taskRows(visibleTasks(undatedTasks))}
                      </section>
                      <aside className="panel day-agenda">
                        <div className="panel-heading">
                          <h2>Day at a glance</h2>
                        </div>
                        <span className="agenda-label">
                          DEADLINES & FOLLOW-UPS
                        </span>
                        {events.filter(
                          (x) => dayKey(x.date, zone) === plannerDate,
                        ).length ? (
                          events
                            .filter((x) => dayKey(x.date, zone) === plannerDate)
                            .map((x) => row(x.item, x.label, x.date))
                        ) : (
                          <p className="muted pad">
                            No deadlines for this day.
                          </p>
                        )}
                        <span className="agenda-label">
                          YOUR RECURRING TIMETABLE
                        </span>
                        {items
                          .filter(
                            (x) =>
                              x.kind === "block" &&
                              x.data.weekday === weekdays[weekdayIndex],
                          )
                          .sort((a, b) =>
                            (a.data.startTime || "").localeCompare(
                              b.data.startTime || "",
                            ),
                          )
                          .map((x) => (
                            <button
                              className="agenda-block"
                              onClick={() => setDetailId(x.id)}
                              key={x.id}
                            >
                              <span>
                                {x.data.startTime}–{x.data.endTime}
                              </span>
                              <strong>{x.data.title}</strong>
                            </button>
                          ))}
                      </aside>
                    </div>
                  </TabsContent>
                  <TabsContent value="weekly">
                    <div className="week-toolbar">
                      <button
                        className="icon-button"
                        aria-label="Previous week"
                        onClick={() =>
                          setPlannerDate(datePlus(plannerDate, -7))
                        }
                      >
                        <ChevronLeft />
                      </button>
                      <h2>
                        {dateLabel(weekStart + "T12:00:00Z", "UTC")} –{" "}
                        {dateLabel(weekDays[6] + "T12:00:00Z", "UTC")}
                      </h2>
                      <button
                        className="icon-button"
                        aria-label="Next week"
                        onClick={() => setPlannerDate(datePlus(plannerDate, 7))}
                      >
                        <ChevronRight />
                      </button>
                      <Button
                        variant="outline"
                        onClick={() => setPlannerDate(today)}
                      >
                        This week
                      </Button>
                    </div>
                    <div className="weekly-grid">
                      {weekDays.map((day, i) => (
                        <section
                          className={`week-column ${day === today ? "is-today" : ""}`}
                          key={day}
                        >
                          <div className="week-heading">
                            <span>{weekdays[i].slice(0, 3)}</span>
                            <strong>{Number(day.slice(-2))}</strong>
                          </div>
                          {tasks
                            .filter(
                              (x) =>
                                x.data.deadline &&
                                dayKey(x.data.deadline, zone) === day,
                            )
                            .map((x) => (
                              <div className="week-task" key={x.id}>
                                <Checkbox
                                  checked={x.data.done || false}
                                  disabled={pending.has(x.id)}
                                  aria-label={`Complete ${x.data.title}`}
                                  onCheckedChange={(v) =>
                                    void update(x, { done: !!v })
                                  }
                                />
                                <button
                                  className={x.data.done ? "done-text" : ""}
                                  onClick={() => setDetailId(x.id)}
                                >
                                  {x.data.title}
                                </button>
                              </div>
                            ))}
                          {events
                            .filter(
                              (x) =>
                                x.item.kind !== "task" &&
                                dayKey(x.date, zone) === day,
                            )
                            .map((x) => (
                              <button
                                className="week-event"
                                key={x.item.id + x.label}
                                onClick={() => setDetailId(x.item.id)}
                              >
                                <span>{x.label}</span>
                                {x.item.data.title}
                              </button>
                            ))}
                        </section>
                      ))}
                    </div>
                    <section className="panel weekly-backlog">
                      <div className="panel-heading">
                        <h2>Overdue & unscheduled tasks</h2>
                      </div>
                      {taskRows(
                        tasks.filter(
                          (x) =>
                            !x.data.done &&
                            (!x.data.deadline ||
                              dayKey(x.data.deadline, zone) < today),
                        ),
                      )}
                    </section>
                  </TabsContent>
                  <TabsContent value="timetable">
                    <div className="timetable-note">
                      <Clock3 size={17} />
                      Your repeating weekly schedule · times in{" "}
                      {zone.replace("_", " ")}
                    </div>
                    <div className="weekly-grid timetable-grid">
                      {weekdays.map((day) => (
                        <section className="week-column" key={day}>
                          <div className="week-heading">
                            <h2>{day}</h2>
                          </div>
                          {items
                            .filter(
                              (x) =>
                                x.kind === "block" && x.data.weekday === day,
                            )
                            .sort((a, b) =>
                              (a.data.startTime || "").localeCompare(
                                b.data.startTime || "",
                              ),
                            )
                            .map((x) => (
                              <button
                                className="timetable-block"
                                key={x.id}
                                onClick={() => setDetailId(x.id)}
                              >
                                <span>
                                  {x.data.startTime} – {x.data.endTime}
                                </span>
                                <strong>{x.data.title}</strong>
                                {x.data.location && (
                                  <small>{x.data.location}</small>
                                )}
                              </button>
                            ))}
                          <button
                            className="kanban-add"
                            onClick={() => {
                              if (!user) {
                                void onSignIn();
                                return;
                              }
                              setEditor({
                                kind: "block",
                                defaults: { weekday: day },
                              });
                            }}
                          >
                            <Plus size={15} />
                            Time block
                          </button>
                        </section>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
              {view === "calendar" && (
                <div className="calendar-layout">
                  <section className="panel">
                    <div className="calendar-toolbar">
                      <h2>
                        {new Intl.DateTimeFormat("en", {
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        }).format(monthDate)}
                      </h2>
                      <div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setMonth(today.slice(0, 7));
                            setCalendarDay(today);
                          }}
                        >
                          Today
                        </Button>
                        <button
                          className="icon-button"
                          aria-label="Previous month"
                          onClick={() => moveMonth(-1)}
                        >
                          <ChevronLeft />
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Next month"
                          onClick={() => moveMonth(1)}
                        >
                          <ChevronRight />
                        </button>
                      </div>
                    </div>
                    <div className="calendar-weekdays">
                      {weekdays.map((d) => (
                        <span key={d}>{d.slice(0, 3)}</span>
                      ))}
                    </div>
                    <div className="calendar-grid">
                      {calendarCells.map((day) => {
                        const list = events.filter(
                          (x) => dayKey(x.date, zone) === day,
                        );
                        return (
                          <button
                            className={`calendar-cell ${day.slice(0, 7) !== month ? "outside" : ""} ${day === today ? "today" : ""} ${day === calendarDay ? "selected" : ""}`}
                            key={day}
                            onClick={() => setCalendarDay(day)}
                            aria-label={`${day}: ${list.length} events`}
                          >
                            <span className="calendar-number">
                              {Number(day.slice(-2))}
                            </span>
                            {list.slice(0, 2).map((x) => (
                              <span
                                className={`calendar-event ${x.label === "Follow-up" ? "teal" : "violet"}`}
                                key={x.item.id + x.label}
                              >
                                {x.item.data.title}
                              </span>
                            ))}
                            {list.length > 2 && (
                              <small>+{list.length - 2} more</small>
                            )}
                            {list.length > 0 && (
                              <span className="mobile-event-count">
                                {list.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                  <aside className="panel calendar-agenda">
                    <div className="panel-heading">
                      <h2>
                        {dateLabel(
                          (calendarDay || today) + "T12:00:00Z",
                          "UTC",
                        )}
                      </h2>
                    </div>
                    {dayEvents.length
                      ? dayEvents.map((x) => row(x.item, x.label, x.date))
                      : empty(
                          "Nothing due",
                          "Select a date to see its deadlines.",
                        )}
                    <div className="calendar-legend">
                      <span className="legend-square violet" />
                      Deadline / test / task
                      <span className="legend-square teal" />
                      Follow-up
                    </div>
                  </aside>
                </div>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <ShieldCheck size={14} />
              {signedOut
                ? "Sign in with Google for a private workspace"
                : "Your workspace is private to your account"}
            </span>
            <span className="creator-name">By Disha Agarwal</span>
            <label>
              Display timezone{" "}
              <Choice
                label="Display timezone"
                value={zone}
                options={zones}
                onChange={(v) => {
                  setZone(v);
                  localStorage.setItem("launchpad-timezone", v);
                }}
              />
            </label>
          </footer>
        </main>
      </SidebarInset>
      {editor && (
        <Editor
          key={editor.item?.id || editor.kind}
          {...editor}
          items={items}
          zone={zone}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      <Sheet open={!!detail} onOpenChange={(v) => !v && setDetailId(null)}>
        <SheetContent className="detail-sheet">
          {detail && (
            <>
              <SheetHeader>
                <div className="detail-badges">
                  <Badge tone="violet">
                    {detail.data.category || kindLabels[detail.kind]}
                  </Badge>
                  <Badge tone={colour(detail.data.priority)}>
                    {detail.data.priority || detail.data.role || ""}
                  </Badge>
                </div>
                <SheetTitle>{detail.data.title}</SheetTitle>
                <SheetDescription>
                  {detail.data.organization || "Personal workspace"}
                </SheetDescription>
              </SheetHeader>
              <div className="detail-scroll">
                <div className="detail-actions">
                  <Button
                    variant="outline"
                    disabled={pending.has(detail.id)}
                    onClick={() => {
                      setEditor({ kind: detail.kind, item: detail });
                      setDetailId(null);
                    }}
                  >
                    <Pencil size={15} />
                    Edit details
                  </Button>
                  <Button
                    variant="outline"
                    className="delete-button"
                    disabled={pending.has(detail.id)}
                    onClick={() => setDeleteId(detail.id)}
                  >
                    <Trash2 size={15} />
                    Delete
                  </Button>
                </div>
                {detail.kind === "opportunity" && (
                  <div className="detail-section">
                    <h3>Application stage</h3>
                    <Choice
                      value={detail.data.status || "To apply"}
                      label="Application stage"
                      options={stages}
                      onChange={(v) =>
                        void update(detail, {
                          status: v,
                          ...(v === "Applied" && !detail.data.appliedOn
                            ? { appliedOn: new Date().toISOString() }
                            : {}),
                        })
                      }
                    />
                  </div>
                )}
                {detail.kind === "test" && (
                  <div className="detail-section">
                    <h3>Preparation status</h3>
                    <Choice
                      label="Preparation status"
                      value={detail.data.status || "Have to prepare"}
                      options={[
                        "Have to prepare",
                        "Preparing",
                        "Prepared",
                        "Completed",
                      ]}
                      onChange={(v) => void update(detail, { status: v })}
                    />
                  </div>
                )}
                {detail.kind === "project" && (
                  <div className="detail-section">
                    <h3>Project status</h3>
                    <Choice
                      label="Project status"
                      value={detail.data.status || "Not started"}
                      options={[
                        "Not started",
                        "In progress",
                        "On hold",
                        "Completed",
                      ]}
                      onChange={(v) => void update(detail, { status: v })}
                    />
                    <div className="progress-row">
                      <Progress value={detail.data.progress || 0} />
                      <span>{detail.data.progress || 0}%</span>
                    </div>
                  </div>
                )}
                {detail.kind === "task" && (
                  <label className="detail-check">
                    <Checkbox
                      checked={detail.data.done || false}
                      disabled={pending.has(detail.id)}
                      onCheckedChange={(v) =>
                        void update(detail, { done: !!v })
                      }
                    />
                    Mark task complete
                  </label>
                )}
                {detail.data.deadline && (
                  <div className="detail-callout">
                    <CalendarDays size={21} />
                    <div>
                      <span>
                        {detail.kind === "test" ? "TEST DATE" : "DEADLINE"}
                      </span>
                      <strong>
                        {dateLabel(detail.data.deadline, zone, true)}
                      </strong>
                      <small>
                        {zone} · {urgency(detail.data.deadline, zone)}
                      </small>
                    </div>
                  </div>
                )}
                {detail.data.nextStep && (
                  <div className="detail-section">
                    <h3>Next action</h3>
                    <p>{detail.data.nextStep}</p>
                  </div>
                )}
                {detail.data.appliedOn && (
                  <div className="detail-section">
                    <h3>Applied on</h3>
                    <p>{dateLabel(detail.data.appliedOn, zone, true)}</p>
                  </div>
                )}
                {detail.data.followupAt && (
                  <div className="detail-section">
                    <h3>Follow up</h3>
                    <p>{dateLabel(detail.data.followupAt, zone, true)}</p>
                  </div>
                )}
                {detail.kind === "opportunity" && (
                  <div className="detail-section">
                    <h3>Document checklist</h3>
                    {detail.data.requirements?.length ? (
                      detail.data.requirements.map((doc) => (
                        <label className="detail-check" key={doc}>
                          <Checkbox
                            checked={detail.data.ready?.includes(doc) || false}
                            disabled={pending.has(detail.id)}
                            onCheckedChange={(v) =>
                              void update(detail, {
                                ready: v
                                  ? [...(detail.data.ready || []), doc]
                                  : (detail.data.ready || []).filter(
                                      (x) => x !== doc,
                                    ),
                              })
                            }
                          />
                          {doc}
                          <span>
                            {detail.data.ready?.includes(doc)
                              ? "Ready"
                              : "Pending"}
                          </span>
                        </label>
                      ))
                    ) : (
                      <p className="muted">
                        Edit details to add required documents.
                      </p>
                    )}
                    <div className="lor-card">
                      <h4>Letters of recommendation</h4>
                      <p>{detail.data.lorCount || 0} required</p>
                      <Choice
                        value={detail.data.lorStatus || "Not needed"}
                        label="LOR status"
                        options={[
                          "Not needed",
                          "To request",
                          "Requested",
                          "Received",
                        ]}
                        onChange={(v) =>
                          void update(detail, {
                            lorStatus: v as Data["lorStatus"],
                          })
                        }
                      />
                      {detail.data.refereeId && (
                        <button
                          className="text-button"
                          onClick={() => setDetailId(detail.data.refereeId!)}
                        >
                          {items.find((x) => x.id === detail.data.refereeId)
                            ?.data.title || "Contact removed"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {detail.kind === "test" && (
                  <div className="detail-section">
                    <h3>Syllabus & preparation</h3>
                    <div className="progress-row">
                      <Progress value={preparationProgress(detail)} />
                      <span>{preparationProgress(detail)}%</span>
                    </div>
                    {detail.data.topics?.length ? (
                      detail.data.topics.map((topic, i) => (
                        <label className="detail-check" key={i}>
                          <Checkbox
                            checked={topic.done}
                            disabled={pending.has(detail.id)}
                            onCheckedChange={(v) =>
                              void update(detail, {
                                topics: detail.data.topics!.map((t, j) =>
                                  j === i ? { ...t, done: !!v } : t,
                                ),
                              })
                            }
                          />
                          {topic.title}
                        </label>
                      ))
                    ) : (
                      <p className="muted">
                        Add syllabus topics in Edit details.
                      </p>
                    )}
                  </div>
                )}
                {detail.kind === "block" && (
                  <div className="detail-callout">
                    <Clock3 />
                    <div>
                      <strong>{detail.data.weekday}</strong>
                      <p>
                        {detail.data.startTime} – {detail.data.endTime}
                      </p>
                      <small>Repeats weekly · {zone}</small>
                    </div>
                  </div>
                )}
                {(
                  [
                    ["location", "Location"],
                    ["stipend", "Stipend / funding"],
                    ["eligibility", "Eligibility"],
                    ["email", "Email"],
                    ["phone", "Phone"],
                    ["research", "Research interests"],
                  ] as const
                ).map(
                  ([key, label]) =>
                    detail.data[key] && (
                      <div className="detail-section" key={key}>
                        <h3>{label}</h3>
                        {key === "email" ? (
                          <a
                            className="text-button"
                            href={`mailto:${detail.data.email}`}
                          >
                            {detail.data.email}
                          </a>
                        ) : (
                          <p>{detail.data[key]}</p>
                        )}
                      </div>
                    ),
                )}
                {detail.data.duration && (
                  <div className="detail-section">
                    <h3>Time estimate / duration</h3>
                    <p>{detail.data.duration} minutes</p>
                  </div>
                )}
                {detail.data.contactId && (
                  <div className="detail-section">
                    <h3>Professor / POC</h3>
                    {items.find((x) => x.id === detail.data.contactId) ? (
                      <button
                        className="related-item"
                        onClick={() => setDetailId(detail.data.contactId!)}
                      >
                        <UsersRound size={17} />
                        {
                          items.find((x) => x.id === detail.data.contactId)
                            ?.data.title
                        }
                      </button>
                    ) : (
                      <p className="muted">This contact was removed.</p>
                    )}
                  </div>
                )}
                {detail.data.linkedId && (
                  <div className="detail-section">
                    <h3>Related work</h3>
                    {items.find((x) => x.id === detail.data.linkedId) ? (
                      <button
                        className="related-item"
                        onClick={() => setDetailId(detail.data.linkedId!)}
                      >
                        <FolderKanban size={17} />
                        {
                          items.find((x) => x.id === detail.data.linkedId)?.data
                            .title
                        }
                      </button>
                    ) : (
                      <p className="muted">The linked entry was removed.</p>
                    )}
                  </div>
                )}
                {detail.data.notes && (
                  <div className="detail-section">
                    <h3>Notes</h3>
                    <p className="preserve-lines">{detail.data.notes}</p>
                  </div>
                )}
                {detail.data.url && (
                  <a
                    className="external-button"
                    href={detail.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={16} />
                    Open{" "}
                    {detail.kind === "opportunity" ? "application" : "link"}
                  </a>
                )}
                {detail.data.documentsUrl && (
                  <a
                    className="external-button secondary"
                    href={detail.data.documentsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FolderKanban size={16} />
                    Open documents / resources
                  </a>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && !deleting && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes “{items.find((x) => x.id === deleteId)?.data.title}”
              from your workspace. Linked entries will stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="delete-confirm"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {deleting ? "Deleting…" : "Delete entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={install} onOpenChange={setInstall}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Launchpad on your desktop</DialogTitle>
            <DialogDescription>
              Open your workspace like an app, with its own window and shortcut.
            </DialogDescription>
          </DialogHeader>
          <div className="help-content">
            <p>
              <strong>Chrome or Edge on Windows:</strong> open this site in a
              regular browser tab. Use the install icon in the address bar, or
              the browser menu’s “Install this site as an app” option.
            </p>
            <p>
              Once installed, right-click Launchpad and choose{" "}
              <strong>Pin to taskbar</strong>. You can also create a desktop
              shortcut.
            </p>
            <p>
              <strong>Phone:</strong> use “Add to Home Screen” from your
              browser’s menu. On iPhone, open the site in Safari and use Share.
            </p>
            <p className="muted">
              Sign in once to access your saved workspace. An internet
              connection is needed to load and save your entries.
            </p>
            <Button
              onClick={async () => {
                if (installEvent.current) {
                  await installEvent.current.prompt();
                  await installEvent.current.userChoice;
                  installEvent.current = null;
                } else {
                  toast.info(
                    "Open this site in Chrome or Edge, then use the browser’s install option.",
                  );
                }
              }}
            >
              <Download size={16} />
              Install Launchpad
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your workspace, at a glance</DialogTitle>
            <DialogDescription>
              A simple routine for keeping things in order.
            </DialogDescription>
          </DialogHeader>
          <div className="help-content">
            <p>
              <strong>1. Save an opportunity.</strong> Add the deadline,
              eligibility, application link, and required documents.
            </p>
            <p>
              <strong>2. Add people.</strong> Save professor and POC emails
              under Contacts. Link a contact and LOR writer to an application.
            </p>
            <p>
              <strong>3. Move the application.</strong> Update its stage, mark
              documents ready, and set a follow-up date.
            </p>
            <p>
              <strong>4. Prepare and plan.</strong> Add the test syllabus, tick
              topics as you finish, and use daily tasks and weekly time blocks.
            </p>
            <p>
              <strong>Deadline times:</strong> select the opportunity’s timezone
              while adding a date. The workspace shows all dates in your display
              timezone.
            </p>
            <p>
              <ShieldCheck size={16} className="inline-icon" />
              Other people can use this link and sign in with Google. Each
              account has its own private entries.
            </p>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster position="bottom-right" richColors />
    </SidebarProvider>
  );
}
