# Convo Desktop

A polished desktop messaging interface built with React, TypeScript, Tauri 2, and Rust.

## Development

1. Install [Rust](https://www.rust-lang.org/tools/install) and the Tauri system prerequisites.
2. Run `npm install`.
3. Run `npm run tauri dev`.

Use `npm run dev` for a browser-only UI preview.

## Build the Windows installer on GitHub

The workflow at `.github/workflows/build-windows.yml` builds Convo on a
GitHub-hosted Windows machine, so Visual Studio Build Tools are not required on
your computer.

1. Push this project to a GitHub repository using the `main` branch.
2. Open the repository's **Actions** tab.
3. Select **Build Convo for Windows** and choose **Run workflow**.
4. When it finishes, download the **Convo-Windows** artifact.

Pushing a tag such as `v1.0.0` also creates a GitHub Release containing the
Windows installers.

## Environment and backend security

Copy `.env.example` to `.env` and add only public client configuration. Never add a
PostgreSQL connection string or Supabase service-role key to this desktop project.
Those credentials must remain in a trusted API server; the desktop app should call
that API using an authenticated user session.
