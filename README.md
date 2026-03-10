# Tombstone Manager

Investment banking deal wall app — create, organize, filter, and export tombstones as a high-resolution PNG.

## Prerequisites

Install **Node.js v20+** from https://nodejs.org (LTS version).

---

## First-time Setup

Open a terminal in this folder (`tombstone-app`) and run:

```bash
# Install all dependencies (root + server + client)
npm install
npm install --prefix server
npm install --prefix client
```

---

## Running in Development

```bash
npm run dev
```

This starts both the backend (port 3001) and the frontend (port 5173) simultaneously.

Open your browser at: **http://localhost:5173**

---

## Features

| Feature | Details |
|---|---|
| Add tombstones | Company name, logo upload, deal type, deal size, year, role |
| Filter dashboard | By deal type, year, size range, and name search |
| Edit / Delete | Hover any card to reveal edit and delete buttons |
| Export PNG | Exports currently filtered tombstones as a high-res PNG (3× resolution) matching the deal wall grid layout |

### Deal Types supported
M&A · IPO · Follow-on Offering · Debt Offering · Leveraged Buyout · Private Placement · Restructuring · SPAC · Other

---

## Team Collaboration (Hosting)

To share this with your team, deploy to a cloud server:

### Option A — Railway (easiest, free tier available)
1. Push this folder to a GitHub repository
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Set the **start command** to: `npm install --prefix server && npm run build --prefix client && npm start`
4. Railway will assign a public URL your team can access

### Option B — Render
1. Push to GitHub
2. Go to https://render.com → New Web Service
3. Build command: `npm install --prefix server && npm install --prefix client && npm run build --prefix client`
4. Start command: `npm start`
5. Render provides a free public HTTPS URL

### Option C — Local network (quick team access)
Run the server on a machine with a static IP, then access it via `http://<ip>:3001` from other machines on the same network.

---

## Data Storage

- Database: SQLite file at `server/database/tombstones.db` — backs up easily, just copy the file
- Logo uploads: stored in `server/uploads/`

---

## Project Structure

```
tombstone-app/
├── server/
│   ├── index.js        ← Express API
│   ├── db.js           ← SQLite setup
│   ├── uploads/        ← Uploaded logo images
│   └── database/       ← SQLite database file
├── client/
│   └── src/
│       ├── App.tsx                        ← Main app & state
│       ├── components/
│       │   ├── FilterBar.tsx              ← Filter controls
│       │   ├── TombstoneCard.tsx          ← Dashboard card
│       │   ├── TombstoneForm.tsx          ← Add/edit modal
│       │   └── ExportPanel.tsx            ← Export preview & download
│       ├── api.ts                         ← API client
│       └── types.ts                       ← TypeScript types
└── package.json        ← Root (runs both dev servers)
```
