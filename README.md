# ❄️ FROSTREALM: STRATEGY & SURVIVAL (Kingdom #1)

A playable online mobile-first 2D isometric kingdom strategy survival game inspired by the core gameplay systems of *Kingshot* and *Whiteout Survival*.

Built with **TypeScript, React 19, HTML5 Canvas 2D Isometric Engine, Tailwind CSS, Supabase / PostgreSQL, and Capacitor Android**.

---

## 🏰 Game Overview

In the freezing wilderness of **Kingdom #1 (Frostrealm Alpha)**, players establish and fortify their Citadel. Lord Commanders manage four primary resources (**Food, Wood, Stone, Gold**) and premium **Gems**, construct 12 specialized survival buildings, train 3 troop classes, recruit legendary champions, and march across a shared 100x100 kingdom world map to harvest resource caches and purge rogue marauder outposts.

### Core Systems Implemented:
1. **Interactive 2D Isometric City View**:
   - Smooth mobile touch pan and pinch/wheel zoom controls.
   - 12 canonical buildings with isometric depth, levels, and badges.
   - Procedural winter blizzard snow particles and procedural Web Audio SFX.
   - Floating resource harvest bubbles with 1-tap collection.
   - Single construction queue with countdown timers and instant gem completion.
2. **12 Canonical Buildings**:
   - `Main Hall` (Progression gate & building limits)
   - `Barracks` (Infantry training)
   - `Archery Range` (Ranged troop training)
   - `Stable` (Cavalry breeding)
   - `Farmstead` (Food production)
   - `Lumber Mill` (Wood timber production)
   - `Stone Quarry` (Stone production)
   - `Gold Workshop` (Gold refining)
   - `Research Academy` (Technology tree)
   - `Field Hospital` (Treats wounded troops)
   - `Warehouse` (Protects stockpiled resources)
   - `Alliance Embassy` (Diplomacy & reinforcements)
3. **Resource Economy**:
   - Server-authoritative timestamps for production calculation.
   - Atomic resource deduction with checks preventing negative balances.
4. **Troop System**:
   - 3 troop classes: **Infantry** (Frost Axemen), **Ranged** (Snow Archers), **Cavalry** (Scout Riders).
   - Training queue, training times, and hospital casualty triage.
5. **Starter Heroes**:
   - 5 Original Champions: Valeria Frostguard (Epic), Kaelen Nightbow (Rare), Bjoern Ironhoof (Epic), Elira Sunfire (Legendary), Torin Stonecrag (Common).
6. **100x100 Shared Kingdom Map & Expeditions**:
   - City placement with collision protection.
   - Resource nodes (Food, Wood, Stone, Gold).
   - Neutral enemy camps (Frost Wolves, Snow Marauders, Glacier Golems).
   - Server-authoritative marches with travel countdowns, combat resolution, and return trips.
7. **Deterministic Combat Resolver**:
   - Round-based combat simulation factoring in unit stats, hero skills, and technology buffs.
   - Casualties and hospital wounded triage.
   - Comprehensive Battle Reports.
8. **Research Academy Tech Tree**:
   - Economy branch (+Food, +Wood, +Stone).
   - Military branch (+Infantry, +Ranged, +Cavalry).
9. **Alliance & Social Systems**:
   - Create and join alliances.
   - Live War Room alliance chat.
   - Kingdom Power & Citadel level leaderboards.
10. **Quests & Progression**:
    - Chapter 1 quest milestones with reward claiming and confetti celebration.
11. **QA & Admin Support Tooling**:
    - Built-in audit log and testing panel for instant queue completion, resource granting, and system reset.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm run test
```

### 3. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Mobile device simulation mode (F12 -> Responsive) is recommended.

### 4. Build for Production
```bash
npm run build
```

### 5. Build Android APK (Capacitor)
```bash
npm run android:sync
npm run android:build
```

---

## 🗄️ Database & Supabase Migration

The game includes a normalized PostgreSQL schema designed for Kingdom #1 with multi-kingdom (`kingdom_id`) expansion readiness.

To apply the schema to your Supabase project:
1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Open the file [`supabase/game_schema.sql`](./supabase/game_schema.sql).
3. Copy the entire contents and click **Run**.
4. The script provisions:
   - 25+ normalized tables (`kingdoms`, `players`, `player_profiles`, `cities`, `buildings`, `player_resources`, `player_heroes`, `player_troops`, `marches`, `battle_reports`, `alliances`, `quests`, `mail`, etc.).
   - Row Level Security (RLS) policies.
   - Server-authoritative stored procedures (RPCs): `rpc_init_player_profile`, `rpc_collect_building_resource`, `rpc_start_building_upgrade`, `rpc_complete_building_upgrade`.
