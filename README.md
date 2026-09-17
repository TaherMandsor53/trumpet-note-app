# 🎺 Taheri Scout Band Group Management & Trumpet Note App

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Redux Toolkit](https://img.shields.io/badge/Redux%20Toolkit-2.12-764ABC?style=flat-square&logo=redux)](https://redux-toolkit.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

A comprehensive, role-based band group management system and musical utility suite tailored for the **Taheri Scout Band Group**. The platform centralizes brass & percussion sheet music distribution, musical note transposition to valve fingering charts, rehearsal attendance marking, organizational hierarchy visualization, and financial contributions (*Lavajam*) tracking.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [System Architecture & RBAC](#-system-architecture--rbac)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Modules & Workspaces](#-modules--workspaces)
- [Data Storage & Integration](#-data-storage--integration)
- [License](#-license)

---

## 🌟 Key Features

### 1. 👑 Executive Command Dashboard (Overall Major)
- **Roster & Section Management**: Add, update, and manage band members across all 5 instrument sections.
- **Attendance Oversight**: View aggregate attendance metrics, session logs, and drill participation percentages.
- **Rehearsal Marker**: Schedule sessions (Regular Practice, Parade Drill, Ceremony Rehearsal, Sectional) and log member statuses (`Present`, `Absent`, `Late`, `Excused`).
- **Sheet Music Inventory**: High-level tracking of active tunes, transpositions, and section assignments.

### 2. 💰 Lavajam Financial Portal (Treasurer & Super Admin)
- **Contribution Tracking**: Manage monthly member membership dues (*Lavajam*).
- **Status & Receipts**: Track payments (`Paid` / `Pending`), payment modes (UPI, Cash, Bank Transfer, Cheque), receipts, and transaction references.
- **Financial Analytics**: Real-time revenue metrics, outstanding collections, and section-by-section breakdown.
- **Excel Sync**: One-click import and export of financial records into `.xlsx` format.

### 3. 👥 Section Workspace (Instrument Majors)
- **Section-Specific Leadership**: Tailored workspaces for **Trumpet**, **Saxophone**, **Euphonium**, **Dish (Cymbals)**, and **SideDrum (Snares)** Majors.
- **Roster Management**: Manage players exclusively within the Major's designated instrument section.
- **Tune Distribution**: Assign specific tunes/sheet music to individual section players or the entire section.
- **Drive Sync**: Ingest newly uploaded sheet music directly from section-specific Google Drive folders with automatic **15-day "NEW" badge indicators**.

### 4. 🧑‍💼 Member Portal (Band Players)
- **Personalized Access**: Individual dashboard for band players.
- **Assigned Music Library**: Access personal sheet music notations, PDF scores, keys, and tempos.
- **Lavajam Ledger**: Check individual payment status, past transaction records, and outstanding amounts.
- **Attendance Log**: Personal record of attendance across drills and performances.

### 5. 🎺 Interactive Note Transposer & PDF Generator
- **Brass Fingering Engine**: Converts written note notations (`C, D, E, F, G, A, B`, sharps `#`, flats `b`) into trumpet valve combinations (e.g., `0`, `1`, `2`, `1/2`, `1/3`, `1/2/3`).
- **Octave & Tuning Control**: Supports high/low note mappings and instrument base types.
- **Export to PDF**: Generate printable notation scorecards instantly via `jspdf`.

### 6. 📊 Hierarchical Org Chart
- **Visual Command Chain**: Displays the band structure from the Overall Major and Treasurer through each Instrument Major down to all section members.
- **Expandable Section Nodes**: Inspect section rosters, member ranks, contact details, and active statuses.

### 7. 🎥 Performance Video Showcase
- **Curated Media Library**: Watch and study scout band procession marches, ceremony anthems, and parade cadences (e.g., *Burhanedin Chaman Tera*, *Hubbi Lakum*, *Is Shamme Huda Ka Jo*, *Hai Tahani*).

---

## 🛡️ System Architecture & RBAC

The application enforces strict **Role-Based Access Control (RBAC)** across the frontend UI and internal API handlers.

```
                         ┌─────────────────────────────┐
                         │   Overall Major (Admin)     │
                         │   Full System Access        │
                         └──────────────┬──────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
┌─────────────────────────────┐                       ┌─────────────────────────────┐
│      Treasurer (CFO)        │                       │      Instrument Majors      │
│  Lavajam Financial Portal   │                       │ (Trumpet, Sax, Euph, etc.)  │
│  Financial Excel Reports    │                       │ Section Workspace & Tunes   │
└─────────────────────────────┘                       └──────────────┬──────────────┘
                                                                     │
                                                      ┌──────────────▼──────────────┐
                                                      │    Band Members / Players   │
                                                      │    Personal Portal, Music,  │
                                                      │    Attendance & Dues Status │
                                                      └─────────────────────────────┘
```

### Roles Supported:
| Role | Primary Access Level |
| :--- | :--- |
| **Overall Major** | Executive Dashboard, All Sections, Financials, Org Chart, User Admin, Drive & Excel Sync |
| **Treasurer** | Financial Portal, Lavajam Ledger, Excel Import/Export, Org Chart, Tools |
| **Trumpet Major** | Trumpet Section Workspace, Player Sheet Music Assignment, Drive Sync, Org Chart |
| **Saxophone Major** | Saxophone Section Workspace, Player Management, Drive Sync, Org Chart |
| **Euphonium Major** | Euphonium Section Workspace, Player Management, Drive Sync, Org Chart |
| **Dish Major** | Dish & Cymbals Section Workspace, Player Management, Drive Sync, Org Chart |
| **SideDrum Major** | SideDrum Section Workspace, Player Management, Drive Sync, Org Chart |
| **Band Member / Player** | Personal Member Portal, Assigned Notations, Personal Lavajam & Attendance History |

> **Role Switcher Bar**: The app features a live quick-switcher bar at the top of the interface allowing instant switching between demo accounts (Overall Major, Treasurer, Section Majors, and Paid/Pending Players) for testing and demonstration.

---

## 📁 Project Structure

```text
trumpet-note-app/
├── public/                     # Static assets, logos, and sheet music samples
│   ├── assets/                 # Brand imagery and scout emblems
│   └── tunes/                  # PDF scores and local notation files
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── api/                # Next.js Serverless API endpoints
│   │   │   ├── attendance/     # Attendance session & metrics handlers
│   │   │   ├── auth/           # Login & session handlers
│   │   │   ├── drive/          # Google Drive folder sync handlers
│   │   │   ├── excel/          # Excel import/export endpoints
│   │   │   ├── financials/     # Lavajam contribution endpoints
│   │   │   ├── tunes/          # Sheet music CRUD & assignment endpoints
│   │   │   └── users/          # Member roster administration
│   │   ├── globals.css         # Tailwind directives and CSS variables
│   │   ├── layout.tsx          # Root app layout & Redux store provider
│   │   └── page.tsx            # Main application hub with dynamic tabs
│   ├── components/
│   │   ├── attendance/         # AttendanceMarker & AttendanceReports
│   │   ├── dashboards/         # ExecutiveDashboard, FinancialPortal, SectionWorkspace, MemberPortal
│   │   ├── excel/              # ExcelImportExportModal
│   │   ├── layout/             # Navbar, RoleSwitcherBar
│   │   ├── org-chart/          # HierarchicalOrgChart component
│   │   ├── tools/              # NoteTransposer & VideoShowcase
│   │   ├── tunes/              # DriveSyncModal
│   │   └── ui/                 # Reusable UI library (buttons, cards, badges, dialogs)
│   ├── lib/
│   │   ├── auth.ts             # JWT token handling & auth helpers
│   │   ├── db.ts               # In-memory database with persistent seed data
│   │   ├── drive-service.ts    # Google Drive folder sync simulator
│   │   ├── excel-parser.ts     # SheetJS/XLSX workbook parsing & generation
│   │   ├── initial-data.ts     # Comprehensive initial scout band dataset
│   │   ├── rbac.ts             # Role-based access control rules & guards
│   │   └── utils.ts            # Formatting, styling utilities, date helpers
│   ├── store/                  # Redux Toolkit State Management
│   │   ├── api/bandApi.ts      # RTK Query API slice for all backend operations
│   │   ├── authSlice.ts        # Authentication state & active role
│   │   ├── index.ts            # Redux store configuration
│   │   └── themeSlice.ts       # Theme switcher state (Dark, Light, Monochrome)
│   └── types/
│       └── band.ts             # Core TypeScript interfaces & types
├── next.config.mjs             # Next.js build and image domain configuration
├── package.json                # Project dependencies and npm scripts
├── tailwind.config.ts          # Tailwind CSS theme extension
└── tsconfig.json               # TypeScript compiler configuration
```

---

## 💻 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Frontend**: [React 18](https://reactjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) & [RTK Query](https://redux-toolkit.js.org/rtk-query/overview)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/) & [Sass](https://sass-lang.com/)
- **Icons & Visuals**: [Lucide React](https://lucide.dev/), [Ant Design Icons](https://ant.design/components/icon)
- **Spreadsheets & Documents**: [XLSX (SheetJS)](https://sheetjs.com/), [jsPDF](https://github.com/parallax/jsPDF)
- **Video & Media**: [React Player](https://github.com/cookpete/react-player)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.17.0 or higher recommended)
- `npm` or `yarn` or `pnpm`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TaherMandsor53/trumpet-note-app.git
   cd trumpet-note-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   Open your browser and navigate to:
   ```text
   http://localhost:3005
   ```

> **Note**: The default development port is set to `3005` in `package.json` (`next dev -p 3005`).

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs Next.js development server on port `3005` |
| `npm run build` | Compiles and builds the production application |
| `npm start` | Runs the compiled Next.js production server on port `3005` |
| `npm run start:cra` | Optional legacy Create-React-App startup script |

---

## 📦 Data Storage & Integration

- **In-Memory & Seed Data**: The app includes a preloaded database (`src/lib/db.ts` & `src/lib/initial-data.ts`) containing realistic mock data for all 5 instrument sections, historical attendance logs, Lavajam financial contributions, and sheet music scores.
- **Google Drive Sync Engine**: Simulates live synchronization with Google Drive folder IDs mapped to each instrument section. Newly added files automatically receive a **15-day "NEW" indicator**.
- **Excel Ingestion & Export**: Supports bi-directional Excel sync. Export contribution logs or attendance records into cleanly formatted `.xlsx` sheets, or bulk-import new rosters.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
