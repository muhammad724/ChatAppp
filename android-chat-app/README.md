# Convo

Convo is an Android-first private chat application built with Expo/React Native, Express, Socket.IO, Supabase Auth/PostgreSQL, Prisma, and Cloudinary. It supports one-to-one conversations, text, and images.

## What is included

- Email/password registration, login, logout, and persisted Supabase sessions
- Unique username profiles and prefix-based username search
- Race-safe private conversation creation through a unique sorted participant pair
- Conversation previews, unread counts, paginated history, optimistic text sends, and retryable image uploads
- Socket.IO text delivery, typing, presence, delivered/read receipts, edits, and message deletion
- Camera/gallery selection and signed Cloudinary uploads with progress, MIME allow-listing, size limits, and stored public IDs
- Authorization at every conversation/message boundary, Zod validation, Helmet, rate limiting, CORS, and centralized errors
- Android-oriented original visual design (no copied assets)

## Prerequisites (Windows)

Install Node.js 20+, Android Studio with an Android Virtual Device, and Git. The commands below are PowerShell commands run from `F:\Chatapp`.

```powershell
cd F:\Chatapp
npm install
```

## 1. Supabase setup

1. Create a Supabase project.
2. In **Authentication > Providers > Email**, enable email/password. For quick local testing, either disable email confirmation or confirm each registration email.
3. Copy `server\.env.example` to `server\.env` and `mobile\.env.example` to `mobile\.env`:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item mobile\.env.example mobile\.env
```

4. Put the pooled PostgreSQL connection string in `DATABASE_URL` and the direct connection string in `DIRECT_URL`.
5. Put the project URL and **service role** key in `server\.env`. The service-role key remains server-only.
6. Put the project URL and public **anon/publishable** key in `mobile\.env`. A publishable key is expected in a client; never put the service-role key here.

The application stores public profiles in its own `User` table using the exact UUID from `auth.users`. Supabase Auth remains the source of identity and token verification.

Create the schema and Prisma client:

```powershell
npm run prisma:generate -w server
npm run prisma:migrate -w server -- --name initial
```

For production/CI after committing the generated `server\prisma\migrations` directory:

```powershell
npm run prisma:deploy -w server
```

The optional seed command explains why auth-backed users are registered through the app:

```powershell
npm run prisma:seed -w server
```

## 2. Cloudinary setup

Create a Cloudinary account and put the cloud name, API key, and API secret in `server\.env`. Do not add Cloudinary credentials to `mobile\.env`. The app requests a signed upload from the backend, uploads directly to Cloudinary, then records the returned secure URL and public ID. The server uses that public ID when deleting an image for everyone.

The default maximum is 10 MiB and accepted MIME types are JPEG, PNG, and WebP. Change `MAX_IMAGE_BYTES` on the server if needed. For stronger production hardening, also configure Cloudinary upload restrictions/transformation rules at the account level.

## 3. Run locally

Start the backend in one PowerShell window:

```powershell
cd F:\Chatapp
npm run dev:server
```

Start Expo in another:

```powershell
cd F:\Chatapp
npm run dev:mobile
```

Press `a` in Expo to open the Android emulator. `EXPO_PUBLIC_API_URL=http://10.0.2.2:4000` is already shown in the example because Android Studio maps `10.0.2.2` to the Windows host. For a physical Android phone, replace it with the computer's LAN IPv4 address (for example `http://192.168.1.25:4000`) and allow TCP port 4000 through Windows Firewall. Both devices must be on the same network.

`usesCleartextTraffic` is enabled for emulator HTTP development. Use HTTPS and remove that allowance for a production build.

## Commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Individual workspaces also expose `dev`, `typecheck`, `lint`, `build`, Prisma, and test scripts in their `package.json` files.

## Production notes

- Set `NODE_ENV=production`, use HTTPS, and list exact allowed web origins in `CORS_ORIGINS` (comma-separated). Native apps do not normally send an Origin header.
- Use Supabase connection pooling for `DATABASE_URL` and keep `DIRECT_URL` for migrations.
- Keep `server\.env` and `mobile\.env` uncommitted. Only values prefixed `EXPO_PUBLIC_` are embedded in the mobile bundle.
- Run `prisma migrate deploy` during deployment. Run the compiled server with `npm run build -w server` followed by `npm start -w server`.
- Socket presence is in-memory and appropriate for one server process. For horizontal scaling, add the Socket.IO Redis adapter and a shared presence store.
- Add abuse monitoring, retention rules, backups, privacy/terms pages, and platform-specific release signing before public distribution.

## Structure

```text
mobile/  Expo Router Android-first client
server/  Express API, Socket.IO server, Prisma schema, and tests
```
