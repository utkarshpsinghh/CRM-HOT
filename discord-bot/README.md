# 🤖 Kingdom #1391 [HOT] Alliance Discord Bot

Official Discord bot for the **[HOT] Alliance (#1391)** connected in real-time to the [crm.1391.online](https://crm.1391.online) REST API.

---

## ⚡ Features & Slash Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| **`/profile <player>`** | Fetch player dossier with rank, strikes, attendance %, and last 5 battles using **Player Name** or **Player ID**. | `/profile Ares`<br>`/profile 13910042` |
| **`/leaderboard [limit] [sort_by]`** | Ranked attendance leaderboard with podium medals 🥇 🥈 🥉 and battle counts. | `/leaderboard limit:10`<br>`/leaderboard sort_by:attended` |
| **`/attendance <player>`** | Detailed battle participation history showing votes vs. attended slots. | `/attendance Alastor` |
| **`/events [status]`** | View battle schedules (Bear Trap BT1 & BT2 slot times, Swordsland, etc.). | `/events status:Scheduled` |
| **`/inactives [filter]`** | List members who are inactive or have active penalty strikes. | `/inactives filter:strikes` |
| **`/help`** | Displays user guide and command documentation. | `/help` |

---

## 🚀 Quick Setup Guide (5 Minutes)

### Step 1: Create Your Discord Bot in Developer Portal
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** (e.g. name it `HOT Alliance Bot`).
3. In the left menu, click **Bot**:
   - Click **Reset Token** to copy your **Bot Token** (save this!).
   - Under **Privileged Gateway Intents**, enable **Server Members Intent** (optional, recommended).
4. In the left menu, click **General Information** and copy the **Application ID (Client ID)**.

### Step 2: Invite Bot to Your Discord Server
1. In the left menu, go to **OAuth2** -> **URL Generator**.
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Under **Bot Permissions**, check:
   - `Send Messages`
   - `Embed Links`
   - `Attach Files`
   - `Use Slash Commands`
4. Copy the generated URL at the bottom, paste it into your browser, and select your HOT Discord server to invite the bot.

---

### Step 3: Configure Environment Variables
Inside the `discord-bot` directory:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in:
   ```env
   DISCORD_TOKEN=your_bot_token_from_step_1
   DISCORD_CLIENT_ID=your_application_id_from_step_1
   DISCORD_GUILD_ID=your_discord_server_id (right click server -> Copy Server ID)
   CRM_API_BASE_URL=https://crm.1391.online/api/v1
   CRM_API_KEY=hot_crm_your_api_key_from_crm_settings
   ```
   *(To get a CRM API key: log into `crm.1391.online` as Main Admin Seoyoon -> Settings -> "Generate API Key" under External API).*

---

### Step 4: Install Dependencies & Run

```bash
cd discord-bot
npm install
```

#### Register Slash Commands with Discord:
```bash
npm run deploy-commands
```
*(This registers `/profile`, `/leaderboard`, `/events`, `/attendance`, `/inactives`, `/help` instantly to your server).*

#### Start the Bot:
```bash
npm start
```

Or for automatic reloads during development:
```bash
npm run dev
```

---

## 🌐 24/7 Cloud Hosting Options

When you are ready to keep the bot online 24/7 without running your computer:
- **Railway.app** (Recommended): Connect your GitHub repo, select the `discord-bot` root directory, paste your `.env` variables, and it runs 24/7.
- **Render.com**: Deploy as a Background Worker using `npm start`.
- **Fly.io** or a **\$3/month VPS** (DigitalOcean / Hetzner).
