# 🏰 HOT — Kingshot Alliance CRM (Command Center)

[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20TypeScript-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite%208-646cff.svg)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styles-Tailwind%20CSS%20v4-38bdf8.svg)](https://tailwindcss.com/)
[![Database](https://img.shields.io/badge/Database-Google%20Sheets-34a853.svg)](https://sheets.google.com/)

A web-based **Alliance Management CRM for the Kingshot alliance "HOT"** designed like a **Kingshot fantasy alliance war room**, not a sterile corporate spreadsheet.

---

## ⚔️ Key Features & Product Highlights

### 1. 🏰 Alliance Command Center (Dashboard)
- **Alliance Telemetry**: Live cards for Total Members (92), Active Combatants, Inactive Absentees, Infraction Strikes, and Needs Attention watchlist.
- **Event Overview Telemetry**: Real-time visual progress bars and attendance percentage gauges for **BT1, BT2, Swordland L1, Swordland L2, Tri Alliance L1, and Tri Alliance L2**.
- **Actionable War Alerts**: Interactive alerts (e.g. *"X members haven't voted recently"*, *"Y members have 2+ strikes"*, *"Z members silent for 7+ days"*) that immediately open filtered roster views.
- **Chronological Event Log**: Quick click into any event's attendance ledger.

### 2. 👥 Alliance Roster (Members)
- **Heraldic Rank Badges**: Custom rank insignia for **R5 (Leader)**, **R4 (Officers)**, **R3 (Elites)**, **R2 (Warriors)**, and **R1 (Recruits)**.
- **Member Dossier**: Complete historical profile tracking former ranks, disciplinary strikes, communication status, notes, and full event participation logs (✓ Joined, ✗ Flaked, — No Vote).
- **Search & Multi-Filter**: Filter by rank, communication (Good / Warning / Poor / Unknown), strikes, and active/inactive status.
- **Soft-Delete / Archiving**: Preserves all historical battle data when members depart or are demoted.

### 3. ⚔️ War Events
- **Supported Event Types**: Default support for **BT1, BT2, Swordland L1, Swordland L2, Tri Alliance L1, Tri Alliance L2**, and custom event types.
- **Automatic Roster Provisioning**: Summoning a new war event automatically enrolls all active alliance members into the attendance ledger with zero manual typing.

### 4. 📊 Attendance Command
- **4 Distinct Combatant Categories**:
  1. 🟢 **Joined**: Voted and participated in the battle.
  2. 🟡 **Voted but Didn't Join**: Flaked after voting YES (includes 1-click **⚠️ Strike** action).
  3. 🔴 **Didn't Vote**: Never submitted a vote response.
  4. ⚪ **Absent / Not Applicable**: Voted NO or excused.
- **Fast Attendance Controls**: Single-click toggle buttons `[YES] [NO] [NO VOTE]` and `[JOINED] [DIDN'T JOIN]`.
- **Bulk Actions**: 1-click operations (*"Mark All YES as JOINED"*, *"Mark All as NO VOTE"*, *"Mark Everyone JOINED"*) with stylized confirmation modals.

### 5. ⚠️ Inactivity & Warning Radar
- **Automated Calculation**: Evaluates the latest timestamp across votes, attendance, and alliance records.
- **Tiered Risk Classification**:
  - ⚠️ **Warning Watchlist**: 3–6 days silent.
  - 🔴 **Inactive**: 7–13 days silent.
  - 💀 **Critical**: 14+ days silent.
- Configurable thresholds directly in Settings.

### 6. 🛡️ Disciplinary Strike System
- Permanent historical strike logs with dates, reasons, and issuer attribution.
- Pardon strike capability without destroying historical audit logs.

### 7. 🔊 Kingshot Game Audio Experience
- Integrated Web Audio API synthesizer generating medieval fanfares, sword clashes, and battle horn alert chimes without external audio dependencies.

---

## ⚡ Quickstart

### 1. Install & Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Build for Production
```bash
npm run build
npm run preview
```

---

## 🔑 Officer Authentication Gate

Log in with default officer credentials:
- **Username**: `admin` (or `hot_leader`)
- **Password**: `kingshot_hot`

*(Credentials can be verified against your own Google Sheets `Admins` table via SHA-256).*

---

## 📄 Google Sheets Database & Google Apps Script Setup

This project uses **Google Sheets as the database** with **Google Apps Script** as the secure backend API.

Follow the step-by-step instructions in [`google-apps-script/README.md`](file:///c:/Users/Utkarsh/Documents/CRM-HOT/google-apps-script/README.md):
1. Create a blank Google Spreadsheet named **"HOT Alliance CRM Database"**.
2. Click **Extensions > Apps Script** and paste the code from [`google-apps-script/Code.gs`](file:///c:/Users/Utkarsh/Documents/CRM-HOT/google-apps-script/Code.gs).
3. Run `setupDatabase()` once to format all 7 sheets (`Members`, `Events`, `Attendance`, `Strike History`, `Communication`, `Admins`, `Settings`).
4. Click **Deploy > New deployment > Web app** (Execute as: *Me*, Who has access: *Anyone*).
5. Paste the generated Web App URL into the **⚙️ Settings** tab of the CRM.

---

## 📱 Mobile Responsiveness

The application is fully responsive on smartphones and tablets, offering thumb-friendly touch targets, mobile card views, and quick filter controls.
