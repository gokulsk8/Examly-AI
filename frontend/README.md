# React + TypeScript + Vite

## Supabase shared database

1. Create a Supabase project and copy `.env.example` to `.env`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings. Use only the publishable/anon key in this browser app; never put a service-role key in `VITE_*` variables.
3. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor.
4. In Supabase Authentication → URL Configuration, set the Site URL to the deployed app origin and add each app origin to Redirect URLs. For local Vite development, allow `http://localhost:5173/`; for production, allow the exact deployed origin (for example, `https://your-domain.example/`). Password reset emails return to the app origin that requested them, where the app handles the recovery session and new-password form. Email confirmation is controlled by the project’s Auth settings.
5. Restart the Vite dev server after changing `.env`.

Generated papers and each question in both sets are saved to Supabase. The paper generator itself currently uses local templates; it does not call a generative AI API. The Question bank page can import selectable-text PDF, DOCX, TXT, MD, and CSV question papers, then review, edit, search, and delete individual questions. Scanned PDFs require OCR before upload. Syllabus uploads remain in the current browser’s IndexedDB. Syllabus PDFs are filtered to the subject name and unit-wise syllabus sections; PDFs without recognizable unit headings are rejected rather than saving unrelated document content.

## Sign-in and database troubleshooting

- There are no built-in demo credentials. Use **Create account** for a new account, then confirm the email if Supabase email confirmation is enabled. If sign-in says the email is not confirmed, submit the sign-in form and use **Resend confirmation email**; check the inbox and spam folder. For an existing account, use **Forgot password?** if needed.
- `Invalid login credentials` means Supabase did not accept that email/password pair. It is not a database-schema error.
- If a database operation reports a missing table or column, run [`supabase/schema.sql`](./supabase/schema.sql) first. Then run [`supabase/migrations/20261011000100_role_based_workspace.sql`](./supabase/migrations/20261011000100_role_based_workspace.sql) in the Supabase SQL Editor; the app now saves each new paper with a `status` of `pending_review`, which the base schema alone does not add. If the tables already exist but the API still cannot find them, make sure `public` is listed under Project Settings → API → Exposed schemas. If Supabase reports a permission/RLS error, confirm the signed-in session and the schema’s grants and policies.
- In `.env`, use the project URL and the browser-safe publishable/anon key only. Never put a Supabase service-role key or a private generation-provider key in a `VITE_*` variable.
- Authentication uses Supabase Auth directly from the browser. No separate API server is configured. Paper generation uses local templates; adding an external generation API requires a server-side endpoint to keep its secret key private.

The base schema sets up the tables and initial policies. To enable the three Admin controls, apply [`supabase/migrations/20261011000100_role_based_workspace.sql`](./supabase/migrations/20261011000100_role_based_workspace.sql) **after** `supabase/schema.sql`. New papers are private and pending review until an Admin approves them; approved papers and their questions then become available to faculty. Existing completed papers are retained as approved. The migration adds the paper approval status and template storage. Until it is applied, paper approvals are not enforced by the database.

The Admin usage report calls `supabase.functions.invoke('admin-console', { body: { action: 'overview' } })`, which sends a POST request to `<VITE_SUPABASE_URL>/functions/v1/admin-console` with the signed-in user's access token. The matching function source is `supabase/functions/admin-console/index.ts`. A “Failed to send a request to the Edge Function” error indicates the browser could not reach the function endpoint; confirm the function is deployed to the same Supabase project as `VITE_SUPABASE_URL`, and check browser network/CORS access. HTTP 401/403 responses instead indicate gateway authentication or the function's administrator authorization check.

To deploy to the correct project, take the project ref from the hostname in `VITE_SUPABASE_URL` (the part before `.supabase.co`). From this `frontend` directory, run:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy admin-console --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with the ref matching the website's configured `VITE_SUPABASE_URL`. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; this function requires them and does not need a service-role key in frontend configuration. It verifies the signed-in user's trusted `app_metadata.workspace_role` on the server before using the service-role key. Never put that key in frontend `.env` files, `VITE_*` variables, source code, or browser requests. New sign-ups receive the standard workspace role. Assign Admin only through a trusted administrative process as described below.

### Assigning the administrator role to an existing account

The Admin portal checks `app_metadata.workspace_role`. A value such as `workspace_role: "user"` in User Metadata does not grant administrator access; User Metadata can be edited by the account owner and is intentionally ignored for authorization. The one-time script below updates only App Metadata and preserves its other existing values.

1. In Supabase Dashboard, open **Authentication → Users** and confirm the target account exists.
2. In **Project Settings → API Keys**, obtain the server-only **secret key** (or legacy `service_role` key). Never use the publishable/anon key for this task.
3. In Terminal, run:

   ```zsh
   cd /path/to/Examly-AI/frontend
   export SUPABASE_URL='https://YOUR-PROJECT-REF.supabase.co'
   read -s "SUPABASE_SERVICE_ROLE_KEY?Paste the server-only Supabase key (input is hidden): "
   printf '\n'
   export SUPABASE_SERVICE_ROLE_KEY
   node scripts/grant-admin.mjs gokulbontsk8@gmail.com
   result=$?
   unset SUPABASE_SERVICE_ROLE_KEY SUPABASE_URL
   test "$result" -eq 0
   ```

   Replace `/path/to/Examly-AI/frontend` with this project's actual frontend folder and replace the URL with the same Project URL as `VITE_SUPABASE_URL` in `frontend/.env`. The key is read without displaying it and is not saved in a file or shell command history. Keep the terminal open only while running this command.
4. The script uses the already-installed `@supabase/supabase-js` dependency; no additional package installation is needed. It finds the exact email in that project, preserves existing App Metadata, sets only `workspace_role` to `admin`, and reports success or a clear error.
5. In the website, sign out, select **Admin portal**, and sign in again to receive a session with the updated role. The administrator UI is role-gated, but the role alone is not a database authorization boundary; continue to rely on the database's Row Level Security policies.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
