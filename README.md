# ChatAppp

This repository contains two related chat applications in separate folders:

- [`chatapp/`](./chatapp) — Next.js web chat application with Prisma and PostgreSQL.
- [`android-chat-app/`](./android-chat-app) — Expo mobile application and its server.

## Web application

```bash
cd chatapp/my-app
npm install
npm run dev
```

Copy `chatapp/.env.example` to `chatapp/.env` and supply your own credentials.

### Deploying the web application to Vercel

Set the Vercel project's **Root Directory** to `chatapp/my-app`. The
app-local `vercel.json` then uses `npm install` and `npm run build`.

Add these variables in **Vercel → Project Settings → Environment Variables**
for Production (and Preview if preview deployments need to work):

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SOCKET_URL`
- `NEXT_PUBLIC_APP_URL`

Use hosted URLs for the two public URL variables; values containing
`localhost` only work during local development. The Socket.IO server in
`chatapp/my-app/socket` must be deployed as a separate long-running service,
and `NEXT_PUBLIC_SOCKET_URL` must point to that service.

After changing a Vercel environment variable, redeploy the application because
existing deployments do not receive the new value.

## Android application

See [`android-chat-app/README.md`](./android-chat-app/README.md) for mobile and server setup instructions. Use the included `.env.example` files as templates.
