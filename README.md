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
| `src/CrystalScene.tsx`   | Decorative crystals, page icons and the motion switch           |
| `src/crystal.css`        | Glass surfaces, colourful accents and CSS sculptures             |
| `supabase/schema.sql`    | Database table, account privacy policies and timestamps        |
| `tests/privacy.test.mjs` | Runs the database policies against a local PostgreSQL engine   |

Edit the title in `index.html` and the credit in `src/Workspace.tsx` to change branding.

## Crystal appearance and motion

The page header combines faceted crystals, a rotating CSS cube and floating cards whose icons match the current section. Glass surfaces and colourful dashboard tiles work in both light and dark modes. Editable sheet cells stay opaque; green completed tasks and red overdue tasks retain their meaning.

Use **Motion on / Motion off** beside **Add new** to pause or resume decorative animations. The choice stays on this device and syncs across its open tabs. A device's reduced-motion accessibility setting always disables the animations. Artwork is CSS rather than a 3D engine: it makes no network requests, has no mouse tracking and does not change your records. Edit the colour variables at the top of `src/crystal.css` to customise the palette; the animation and mobile rules are at the bottom.

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


## Custom task reminder times and themes

In **Daily to-do** or **Weekly to-do**, use the optional **Remind me at** cell to choose a reminder date and time. The task editor has the same option. The time is stored using that task's timezone and syncs with its account. Leave it blank for only the default 3-day and 1-day deadline reminders.

At the chosen time the reminder appears in the app, and an optional browser notification is sent when permission is granted. The app checks roughly every 10 seconds while open and rechecks when brought back into focus; browser background throttling can delay it. If the app was closed, missed reminders appear on the next open. **Dismiss** clears only that custom reminder and syncs across devices; completing its task also hides it. Repeating tasks shift their custom reminder along with their next due date. CSV/Excel import and export include the custom reminder column.

The moon/sun button in the top bar switches **Light / Dark** mode. Before a choice is saved, the app uses the device's theme when opened. Your manual choice is saved on that device, including for later visits. Dark mode covers sheets, cards, planner, calendar and edit dialogs, with green completed tasks and red overdue tasks.


## Resources

Open **Resources** in the sidebar to save important websites, documentation, courses and videos. Type directly into **Resource name**, **Link**, **Category**, **Source / course**, **Saved / pinned**, and **Notes**. Links need `https://` or `http://`; **Open** opens the link in a new tab. Choose **Pinned** for a shortcut below the database. **New resource** opens the regular form, and **Details** lets you edit or delete a saved entry.

Resources have their own named sheets and custom columns, with autosave, search, sorting, Ctrl+Z, Excel paste and CSV/XLSX import-export. Saved links stay private to the signed-in account and sync through Supabase. No additional SQL setup is needed.

For compatibility with existing installed databases, `encodeRecord` stores resources under the existing `project` kind with `data.recordType = "resource"`. `decodeRecord` restores the logical `resource` kind when reading them; ordinary projects remain projects. Resource sheet settings use `launchpadResourceSheets`, separate from project settings.
