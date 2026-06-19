# Tigries Dashboard

React + TypeScript SaaS app built with Vite, React Router, Tailwind/shadcn-style components, and Supabase.

## Structure

- `frontend/` - Vite React application.
- `backend/` - Supabase migrations, seed, and remote database scripts.

The deployed app runs from the frontend and connects directly to Supabase with public client credentials. The backend folder is not a hosted API.

## Local Development

```bash
npm install
npm run dev
```

Local URL:

```text
http://localhost:5173
```

Required frontend env variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` in Vercel frontend env variables.

## Vercel Deployment

This repo includes `vercel.json` for monorepo deployment:

- install command: `npm install`
- build command: `npm run build`
- output directory: `frontend/dist`
- SPA fallback: all routes rewrite to `index.html`

In Vercel, add these environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

After the first deployment, add the Vercel domain to Supabase Auth redirect URLs if authentication redirects are used.

## Database Changes

Apply remote Supabase migrations from the backend workspace:

```bash
npm run db:apply:remote --workspace backend
```
