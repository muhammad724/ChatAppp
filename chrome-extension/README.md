# Convo Companion Chrome Extension

A Manifest V3 companion for the Next.js Convo chat app. It uses the same API,
JWT authentication, Prisma models, and Supabase/Postgres database as the web
application.

## Load locally

1. Run the web app at `http://localhost:3000`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this `chrome-extension` directory.
5. Keep both extension URLs set to `http://localhost:3000`.
6. Sign in from the popup with an existing Convo account.

In development, any unpacked extension origin is accepted by the local API.

## Connect to Vercel

1. Deploy Next.js with root directory `chatapp/my-app`.
2. The default Web App URL and API URL are both:
   `https://chat-appp-mu.vercel.app`.
3. Copy the extension ID shown on `chrome://extensions`.
4. Add `CHROME_EXTENSION_ID` to the Vercel environment variables.
5. Redeploy Next.js, then sign in through the extension popup.

Never place database URLs, Supabase service keys, JWT secrets, or passwords in
this extension.

## Test notifications and unread counts

1. Sign into the extension as one user.
2. Send that user a message from another account.
3. Wait for the polling interval or press refresh in the popup.
4. Verify the toolbar badge and Chrome notification.
5. Click the notification to open the full conversation.
6. Open the conversation in the popup to mark incoming messages as read.

Chrome alarms poll no more often than once per minute. Notification sound also
depends on operating-system notification settings.

## Authentication and storage

- Login uses `POST /api/auth/login`.
- The seven-day JWT is stored in `chrome.storage.local`, not sync.
- Preferences are stored in `chrome.storage.sync`.
- Passwords and server secrets are never stored.
- A `401` response clears the expired extension session.
