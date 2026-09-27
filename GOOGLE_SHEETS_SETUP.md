# HOT Alliance CRM — Dedicated Google Sheets Setup Guide

Follow these quick steps to create your own dedicated Google Sheet for HOT Alliance CRM:

---

### Step 1: Create a Blank Google Sheet
1. Open [Google Sheets](https://sheets.google.com).
2. Create a new blank spreadsheet.
3. Name it: **`HOT Alliance CRM - Database`**.

---

### Step 2: Open Google Apps Script
1. In your new Google Sheet, click **Extensions** → **Apps Script** in the top menu.
2. In the Apps Script code editor, delete any existing code inside `Code.gs`.
3. Open [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) from this project, copy all its code, and paste it into the editor.
4. Click the **Save** (disk icon) or press `Ctrl + S`.

---

### Step 3: Run One-Click Initialization
1. In the Apps Script toolbar function dropdown, select **`setupDatabase`**.
2. Click **Run** ▶️.
3. Google will ask for authorization on first run — click **Review Permissions** → Choose your Google account → Click **Advanced** → Click **Go to Untitled project (unsafe)** → Click **Allow**.
4. Execution will finish in ~3 seconds.
5. Go back to your Google Sheet: All 8 database tables have now been created automatically with formatted headers:
   * `Members`
   * `Events`
   * `Attendance`
   * `Strike History`
   * `Communication`
   * `Admins` *(pre-seeded with default admin)*
   * `Settings`
   * `Contributions`

---

### Step 4: Deploy as Web App
1. In the Apps Script editor, click the blue **Deploy** button (top right) → **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the fields:
   * **Description**: `HOT Alliance CRM API`
   * **Execute as**: `Me (your email)`
   * **Who has access**: `Anyone` *(Crucial: allows CRM frontend to communicate with sheet)*
4. Click **Deploy**.
5. Copy the **Web App URL** (ends in `/exec`).

---

### Step 5: Connect URL to CRM
You have two easy ways to connect:
* **Option A (In-App)**: Open your CRM, log in, navigate to **Settings**, paste your Web App URL into the **Google Apps Script Web App URL** field, and click **Connect Google Sheet**.
* **Option B (Vercel Environment Variable)**: In your Vercel Project Settings → Environment Variables, add:
  ```env
  VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
  ```

---

### Sign In Credentials
* **Alliance Leader**: Username `admin` | Password `admin` or `1391`
* **R4 Officer**: Username `officer` | Password `hot123`
