# Launchpad

A personal opportunity and study planner by Disha Agarwal. Track university research, tech internships, hackathons, competitions, contacts and professor emails, LOR requirements, applications, projects, tests, syllabus preparation, daily tasks and a weekly timetable.

Everyone signs in with their own Google account. New accounts start empty. Supabase stores each account's records separately and enforces privacy through database row level security.

## Start here

Follow [the deployment guide](docs/SETUP.md). You need your own Supabase project, a Google OAuth client and a Vercel account. Google sign-in becomes available after those settings are configured.

## Run on your computer

Install Node.js 22.13 or newer, then:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Fill in the two public Supabase settings in `.env.local` first. Run `supabase/schema.sql` in your Supabase project's SQL Editor. Open the local URL printed by Vite.

```sh
npm test
npm run build
```

## Understand the code

| File                     | Purpose                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `src/App.tsx`            | Restore sign-in, show authentication errors, switch accounts   |
| `src/Workspace.tsx`      | Dashboard, application board, preparation, tasks and timetable |
| `src/Editor.tsx`         | Forms for adding and editing entries                           |
| `src/lib/backend.ts`     | Google sign-in and Supabase CRUD requests                      |
| `src/lib/records.ts`     | Record fields, validation and deadline timezone handling       |
| `src/styles.css`         | Layout, colours and responsive styling                         |
| `supabase/schema.sql`    | Database table, account privacy policies and timestamps        |
| `tests/privacy.test.mjs` | Runs the database policies against a local PostgreSQL engine   |

Edit the title in `index.html` and the credit in `src/Workspace.tsx` to change branding.

## Practical limits

Deadline reminders appear inside the app 3 days and 1 day before the due date. Optional browser notifications require permission and an open app; there are no background push or email reminders. Documents are stored as links, rather than uploaded files. The installable web app needs an internet connection for private records. Google credentials and live cloud login cannot be verified until your accounts are configured.

## Opportunity sheets

Open **Opportunities** to type directly into a spreadsheet. Use **+ Sheet** to group opportunities and **+ Column** for details such as POC email or LOR. Rename a sheet with **Rename sheet**, or an extra column with its pencil button.

Every named row saves automatically after a short pause. **Enter** moves down and **Tab** moves between cells. Copy rows from Excel and paste into the starting cell; columns follow the table order. For pasted dates, use `YYYY-MM-DD` (due at 23:59 in the row timezone) or `YYYY-MM-DDTHH:mm`. Paste up to 500 rows at a time.

Wait for **Saved** before closing. Invalid rows remain visible with an error; correct them or retry after a connection failure. Sheet settings and saved opportunities sync with your Google account. The sheets use the existing opportunity records, so calendar deadlines and application stages stay connected. No new SQL setup is needed.

## Project and task sheets

**Projects** and **Daily & weekly plan** now have the same spreadsheet editor. Entries save as normal projects or tasks, so their deadlines, project cards, daily lists, weekly lists and calendar use the same records. Each section has its own sheets and extra columns.

New task rows are due at 23:59 on the planner’s selected date; change **Due date** for another day. **Mark complete** turns a row green and saves its completion. Press **Completed** again to reopen it. The daily list initially shows both pending and completed tasks; its status filter can show either. The daily and weekly completion buttons update the same task. Open a project’s **Details** and choose **Add task for this project** to create a linked task using the existing editor.

## Daily dates, weekly dates and unfinished tasks

The task database is inside each planner tab: **Daily to-do** filters the selected day; **Weekly to-do** filters the selected Monday–Sunday week. Change the day or week controls to see that date range. Tasks without a date stay in the unscheduled list.

Unfinished tasks from earlier days automatically appear in the next day's plan with a red **Overdue** mark. They continue to appear until completed. The original due date stays saved, so lateness remains visible and the app does not create duplicate tasks. Completing a carried task keeps it green on its completion day and stops it carrying into later days. In the weekly grid, an earlier unfinished task appears on today (or the first day of a future selected week). If the planner is left open at midnight, a view following today advances to the new day.


## Search, sort, undo and files

Every opportunity, project and dated daily/weekly task database has **Search sheet**, column sorting, ascending/descending order, **Undo · Ctrl+Z** (Cmd+Z on Mac), and CSV/Excel import-export. Undo covers the last 100 row-edit operations in the current session, including paste, completion, subtasks and imports. Wait while a save is in flight. Sheet/column renaming and changes made outside the table are not part of this history. Import undo removes the imported records; undoing recurring completion does not remove an already created next occurrence.

**Import CSV / Excel** accepts `.csv`, `.tsv`, `.xlsx` up to 5 MB and 500 entries per file. XLSX uses the first worksheet; import other worksheets separately. The first row must contain headers matching table labels or field keys (e.g. `Task` or `title`, `Due date` or `deadline`). Extra headers become custom columns. Dates use `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`; an optional `Timezone` column preserves each row's timezone. The whole file is validated before rows are appended to the selected sheet. This creates new records; it does not merge with existing entries. Dated task imports appear on their appropriate daily/weekly dates.

Export downloads the current visible sheet rows, respecting the selected date range, completion filter, search and sorting. Choose **Export CSV** for a text spreadsheet or **Export Excel** for XLSX. Task subtasks and completion are included. Export each named sheet separately. These files contain table fields, not a full account backup.

## Repeat tasks and subtasks

In either task database, choose **Repeat → Daily / Weekly** and enter a due date. Completing a task creates the next occurrence at the same local time, with unchecked subtasks. Only one next occurrence is created per completed task/date, even when retried. An unfinished occurrence carries forward in red as usual; repeats advance when completed, rather than generating a backlog automatically. The task editor also has **Repeat task** and a subtask list.

In the **Subtasks** column, type a step and press Enter; tick the checkbox to complete it, or × to remove it. The counter updates and all changes autosave across daily and weekly views. Completing subtasks does not automatically complete their parent task.
