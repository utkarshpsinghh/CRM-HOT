# HOT — Kingshot Alliance CRM — Google Sheets Backend Setup

This document guides you through setting up **Google Sheets as your live database** with **Google Apps Script** as the secure backend API.

---

## ⚡ Quick 3-Minute Setup

### Step 1: Create a Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it **"HOT Alliance CRM Database"**.

### Step 2: Open Google Apps Script
1. In the top menu of your Google Sheet, click **Extensions** > **Apps Script**.
2. Delete any code currently in the `Code.gs` editor.
3. Copy all code from `google-apps-script/Code.gs` and paste it into the editor.
4. Click the **Save** icon (diskette) or press `Ctrl + S`.

### Step 3: Run One-Click Initialization
1. In the toolbar dropdown next to "Debug", select the function **`setupDatabase`**.
2. Click **Run**.
3. Google will ask for authorization on first run:
   - Click *Review permissions*
   - Choose your Google account
   - Click *Advanced* (small text at bottom left)
   - Click *Go to Untitled project (unsafe)*
   - Click *Allow*
4. Check your Google Sheet: All 7 sheets (`Members`, `Events`, `Attendance`, `Strike History`, `Communication`, `Admins`, `Settings`) are now formatted with golden headers and default admin credentials!

### Step 4: Deploy as Web App
1. At the top right of Apps Script, click the blue **Deploy** button > **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Configure the deployment:
   - **Description**: `HOT Alliance CRM API`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Crucial so the frontend can send requests without exposing your private Google account login)*
4. Click **Deploy**.
5. Copy the **Web App URL** (looks like `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 5: Connect in the HOT Alliance CRM
1. Open the CRM frontend website.
2. Log in using default credentials:
   - **Username**: `admin`
   - **Password**: `kingshot_hot`
3. Go to the **⚙️ Settings** tab.
4. Paste your **Web App URL** into the *Google Apps Script URL* field.
5. Click **Test & Connect to Google Sheets**.
6. You will see `🟢 Sheets Connected` in the top bar! The source of truth is now your Google Spreadsheet.

---

## 🔒 Security & Data Integrity

- Passwords are never sent to third-party servers. Passwords are hash-checked against the `Admins` sheet using SHA-256.
- Google Sheets credentials and Google account passwords are NEVER stored in the frontend codebase.
- Members soft-deletion preserves complete historical event attendance and war records.
