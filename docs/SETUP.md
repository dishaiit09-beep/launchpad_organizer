# Publish Launchpad under your name

## 1. Your GitHub project

The complete project is in https://github.com/dishaiit09-beep/launchpad_organizer. Import this repository in Vercel. `package.json` is at the repository root, so you do not need to change the root directory setting.

For local use, download the repository ZIP or clone it. Do not commit `node_modules`, `dist` or `.env.local`.

## 2. Create your Supabase database

1. Create a project at https://supabase.com/dashboard and save your database password privately.
2. Open **SQL Editor**, paste the complete contents of `supabase/schema.sql`, and run it.
3. Find the project URL and publishable key in the project's Connect/API settings. The legacy `anon` key also works.
4. You will use these as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Use the publishable key, never the secret or `service_role` key. The included SQL policies allow users to access only their own records.

## 3. Deploy on Vercel

1. Sign in at https://vercel.com with GitHub.
2. Choose **Add New → Project**, import `launchpad`, and select **Vite**.
3. Keep build command `npm run build` and output directory `dist`.
4. Add the two environment variables from step 2, then deploy.
5. Copy the resulting HTTPS website URL. Redeploy whenever you change environment variables.

You can choose a project name and add your own domain in Vercel's project settings. A purchased custom domain is optional.

## 4. Connect Google sign-in

1. Open https://console.cloud.google.com and create/select your own project.
2. In **Google Auth Platform**, configure Branding, contact email and an **External** audience. Use only basic identity scopes: `openid`, email and profile.
3. Create an OAuth client of type **Web application**.
4. Add your website origin, such as `https://launchpad-yourname.vercel.app`, as an authorized JavaScript origin.
5. In Supabase **Authentication → Sign In / Providers → Google**, enable Google and copy its displayed callback URL. Add that exact URL to Google's **Authorized redirect URIs**. It normally looks like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`.
6. Paste Google's client ID and client secret into the Supabase Google provider settings, then save.
7. In Supabase **Authentication → URL Configuration**, set Site URL to your deployed website. Add `https://YOUR-WEBSITE/` to the redirect allowlist.

Google's callback goes to Supabase; Supabase then sends the user back to your website. Do not put the Google client secret into Vercel or any `VITE_` variable.

For a public launch, use the Google console's production/publish controls for your External app. Basic identity sign-in has a testing exception, but test users and branding behaviour depend on the console settings. Complete any domain/branding verification Google requests; custom branding may require verification.

For local development, also allow `http://localhost:5173/` in Supabase redirects and `http://localhost:5173` in Google's origins. Start login and finish it in the same browser.

Official references:

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
- https://developers.google.com/identity/protocols/oauth2/production-readiness/overview
- https://vercel.com/docs/frameworks/frontend/vite

## 5. Check it before sharing

1. Visit your deployed site and click **Sign in with Google**.
2. Choose your Gmail/Google account. You should return to an empty workspace.
3. Add one opportunity and one task, refresh, and check that they remain saved.
4. Sign out, then sign in with a different Google account. Its workspace must be empty.
5. Check that signing back into the first account restores its records.

The automated privacy test checks account isolation in local PostgreSQL. These steps check your actual OAuth and hosted database configuration.

## How friends use it

Send friends the website URL. They click **Sign in with Google**, choose their own account, and start adding entries. They do not need GitHub, Vercel or Supabase accounts. Every account has its own workspace; this version does not include shared team boards.

- **Opportunities:** add deadlines, application links, POC, document requirements and next steps. Move entries through Preparing, Applied, Test, Interview and other stages.
- **Contacts:** save professor emails, research interests and LOR contacts.
- **Preparation:** add tests, dates and syllabus topics; mark topics completed.
- **Tasks / timetable:** plan daily work, weekly tasks and study blocks.
- **Projects:** track progress and links.

For desktop access, use Chrome/Edge's **Install app** option in the address bar/menu, then pin the installed app to your taskbar or desktop. On phones, use **Add to Home Screen**. Private data still loads from the cloud while online.

## Fix common setup errors

| Problem                             | Check                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Configuration message before login  | Both Vercel variables are correct; redeploy after setting them                  |
| Google provider disabled            | Enable Google and save the client ID/secret in Supabase                         |
| `redirect_uri_mismatch`             | Google redirect URI exactly matches Supabase's callback                         |
| Returned to localhost or wrong site | Supabase Site URL and redirect allowlist point to your deployed website         |
| Records table missing               | Run the full `supabase/schema.sql` in the correct project                       |
| New Google account cannot log in    | Check External audience, publishing/testing controls and Google console's error |

Supabase and Vercel usage limits depend on your selected plans. Monitor their dashboards as more people join.
