# Convo Web App

## Setup

1. Copy `.env.example` to `.env`.
2. Add your PostgreSQL, Supabase, and JWT credentials.
3. Install dependencies and generate Prisma Client:

```bash
cd my-app
npm install
npx prisma generate --config ../prisma.config.ts
npm run dev
```

The web application runs at `http://localhost:3000`.

