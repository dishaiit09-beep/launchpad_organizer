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

Deadlines appear inside the app; it does not send email or push reminders. Documents are stored as links, rather than uploaded files. The installable web app needs an internet connection for private records. Google credentials and live cloud login cannot be verified until your accounts are configured.

## Opportunity sheets

Open **Opportunities** to type directly into a spreadsheet. Use **+ Sheet** to group opportunities and **+ Column** for details such as POC email or LOR. Rename a sheet with **Rename sheet**, or an extra column with its pencil button.

Every named row saves automatically after a short pause. **Enter** moves down and **Tab** moves between cells. Copy rows from Excel and paste into the starting cell; columns follow the table order. For pasted dates, use `YYYY-MM-DD` (due at 23:59 in the row timezone) or `YYYY-MM-DDTHH:mm`. Paste up to 500 rows at a time.

Wait for **Saved** before closing. Invalid rows remain visible with an error; correct them or retry after a connection failure. Sheet settings and saved opportunities sync with your Google account. The sheets use the existing opportunity records, so calendar deadlines and application stages stay connected. No new SQL setup is needed.
