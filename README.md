# WasteWise — Pune Edition: Smart Waste Operations Decision Support

> **Pune Municipal Corporation (PMC) Operations • 15 Administrative Zones • 42 Ward Records**  
> An evidence-based, data-honest waste monitoring, macro workload allocation, and operational decision-support platform built on the PMC master operations dataset.

---

## 1. Executive Overview

**WasteWise (Pune Edition)** is an urban civic-technology platform built for municipal directors, ward supervisors, and fleet operators in Pune, Maharashtra.

The platform is powered directly by the supplied master dataset (`src/data/puneMasterDataset.json`), which consolidates operational spreadsheets across six core civic streams. Rather than inventing missing telemetry or smoothing away inconvenient inconsistencies, WasteWise strictly adheres to **data honesty**: every source number is preserved intact, data conflicts are transparently exposed, and macro planning calculations are clearly distinguished from approved dispatches.

---

## 2. Visual & Architectural Identity

WasteWise features a custom contemporary Maharashtra civic-operations aesthetic:
- **Pune Basalt Architecture**: Deep volcanic dark basalt (`#1A1D24`, `#2C3240`) inspired by historical Pune stone fortifications and civic infrastructure.
- **Sahyadri Greens**: Rich hill forest & monsoon sage (`#366E46`, `#4A8A5C`) denoting healthy collection progress and environmental sustainability.
- **Muted Maharashtra Saffron**: Heritage ochre/saffron (`#D3832B`, `#B8651B`) for active navigation, key metrics, and primary accents.
- **Monsoon River Neutrals**: Slate & river-stone surfaces (`#F8F9FA`, `#F1F3F5`, `#E5E8EB`) providing clean high-contrast operational dashboards.
- **Data-Honest Cartography**: Built with Leaflet and actual OpenStreetMap tiles centered on Pune (`18.5204° N, 73.8567° E`). Does not render synthetic polygons pretending to be official GIS ward boundaries.

---

## 3. Master Operations Data Foundation

The dataset models civic sanitation operations across the **Pune Municipal Corporation (PMC)**:

| Metric | Source-Reported Value | Derivation & Status |
| :--- | :--- | :--- |
| **Total Reported Daily Waste** | **1,592.43 Tonnes/Day** | Direct sum of 42 ward records |
| **Total Reported Households** | **4,294,227 Households** | Direct sum of 42 ward records |
| **Door-to-Door (D2D) Listed HH** | **939,121 Households** | Represents 21.87% of total reported households |
| **Reported Street Bins** | **5,569 Bins** | Direct sum of 42 ward records |
| **Administrative Zones** | **15 Zones** | Official PMC administrative divisions |
| **Ward Records** | **42 Records** | 41 assigned to zones; 1 ambiguous composite |
| **Fleet Inventory Records** | **15 Populated / 27 Unknown** | 2,125 reported vehicles; 27 wards strictly preserved as `null` |
| **Disposal Destinations** | **1 Primary SLF Record** | Urali Devachi Processing Site & SLF (300–350 TPD) |
| **Historical Recycling Series** | **10 Observations (2011–2020)** | 165 MT/day (2011) to 220 MT/day (2020) |

---

## 4. Handled Data Conflicts & Known Gaps

### Conflict 1: Duplicate Ward 39 Records
- **The Issue**: Ward 39 appears twice in the source spreadsheets under two distinct zones with different data:
  1. Record A: `Dhankawadi-Ambegaon Pathar` under Zone `Dhanawadi Sahakarnagar` (44.00 TPD, 59,265 households).
  2. Record B: `Navi Peth-Parvati` under Zone `Kasba Vishrambaugh Wada` (46.32 TPD, 86,159 households).
- **Resolution**: WasteWise preserves **both** records with unique internal identifiers (`pune-ward-39-dhanawadi` and `pune-ward-39-kasba`) and flags both with `conflict_type: "duplicate_ward_number"`. Neither record is silently discarded or averaged.

### Conflict 2: Ambiguous Composite Ward 42
- **The Issue**: Ward 42 is recorded with raw label `"42(12,7,10,8,9)"` and composite name `"Kondhwa-Yelwalewadi, Dhankawadi-Sahakanagar, Hadapsar-Mundhwa, Sinhagad Road, Warje-Karvenagar"`.
- **Resolution**: Left as `zone_name: null` and `zone_assignment_status: "ambiguous_source_value"`. The platform does not invent an arbitrary zone assignment.

### Gap 3: Missing Fleet Counts (27 Wards)
- **The Issue**: Exactly 15 wards have populated vehicle counts; 27 wards are blank/null.
- **Resolution**: Missing fleet counts are strictly rendered as **`Unknown (Not Reported)`**, never normalized to zero or filled with synthetic numbers.

### Gap 4: Historical Recycling Unit Ambiguity
- **The Issue**: Source column header says *"million tonnes"*, but row values are recorded as *"165 MT/day"* through *"220 MT/day"*.
- **Resolution**: Stored and displayed as raw strings (`"165 MT/day"`) with an explicit unit ambiguity warning badge.

### Gap 5: 100% Segregation Anomaly
- **The Issue**: `reported_households_with_waste_segregation` equals `reported_total_households` across all 42 records.
- **Resolution**: Flagged in the Data Quality Registry as a probable data-entry or reporting anomaly rather than verified 100% compliance.

---

## 5. Navigation & Operational Dashboards

The application is organized into 7 specialized civic operational views:

1. **City Overview (`/`)**:
   - Executive dashboard presenting citywide TPD, household counts, street bin inventory, and fleet completeness.
   - Interactive OpenStreetMap road network cartography of Pune.
   - Zone workload distribution rollup and top-volume ward leaderboards.
2. **Zones & Wards (`/zones-wards`)**:
   - Complete directory of all 42 source records across the 15 zones.
   - Workload drilldowns, sorting by TPD, household counts, and D2D listing share.
   - Dedicated inspection modal with data-conflict advisories.
3. **Fleet & Allocation (`/fleet-allocation`)**:
   - Fleet completeness analysis (15 reported vs 27 unknown).
   - Vehicle type classification (`Ghanta Gadi, Chota Haati, Tipper`), capacities (1000/3000/5000 kg), and purchase vintage (2014–2021).
4. **Route Planning (`/route-planning`)**:
   - Scenario planning engine taking ward-level waste tonnages as workload inputs.
   - Configurable vehicle pool, payload capacity, shift duration, and depot locations.
   - Explicit calculation of unassigned workload and required vehicle deficits.
5. **Waste Analytics (`/waste-analytics`)**:
   - 10-year historical citywide recycling progression (2011–2020) with unit caveats.
   - Street sweeping vs commercial waste analysis.
   - Monthly user charge recovery analysis (₹13.44 Cr citywide monthly potential).
6. **Data Quality (`/data-quality`)**:
   - Dedicated registry exposing the 9 master dataset caveats.
   - Deep-dives on Ward 39 duplication, Ward 42 composite ambiguity, and missing fleet records.
   - Provenance table of all 6 source CSV files with UUIDs and record counts.
7. **Administration (`/administration`)**:
   - Security status, session inspection, and prototype role switcher.
   - Quick reset for simulation caches.

---

## 6. Route Planning Scope & Limitations

The planning engine is designed for **macro-level decision support**, not real turn-by-turn dispatching:
- **What It Does**: Calculates required collection trips per ward based on reported daily waste tonnages and vehicle payload capacities; detects fleet pool exhaustion; and reports unassigned tonnage.
- **What It Does NOT Do**: The master dataset does not contain individual household addresses, commercial GPS coordinates, or road turn restrictions. Therefore, WasteWise does **not** claim real optimal routes, turn-by-turn driver ETAs, or verified zero-missed-stop coverage. Every scenario output is explicitly labeled as a **Proposed Planning Scenario**, separate from an approved operational dispatch.

---

## 7. Security Architecture

WasteWise maintains an enterprise-grade backend security boundary in `server/`:
- **Server-Side Authentication**:
  - Officers: Bcrypt password hashing (12 salt rounds), 256-bit opaque session tokens hashed with SHA-256 at rest, secure HttpOnly cookies.
  - Drivers: Mobile-first 6-digit cryptographic OTP, 5-minute expiry, max 3 attempts, single-use, 60s cooldown.
- **Role-Based & Scope Authorization**:
  - Middleware enforces permissions on every API endpoint. Ward supervisors are strictly scoped to their assigned ward (`403 Forbidden` on other wards). Drivers are locked to their own assigned vehicle.
- **Transactional Mutex & Idempotency**:
  - Atomic database updates (`UPDATE bins SET collection_status = 'collected' WHERE id = ? AND collection_status != 'collected'`) prevent double-counting race conditions.
  - Idempotency keys prevent duplicate collection event logging.
- **HTTP Security & Injection Prevention**:
  - Helmet HTTP headers with Content Security Policy (CSP).
  - DOM XSS sinks eliminated via native text escaping.
  - Zero trust in `localStorage`: client-side role switches are treated as demo-only inspection modes.

---

## 8. Installation, Testing & Startup

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone repository and enter directory
cd JU-Techfest

# Install dependencies
npm install
```

### Verification & Testing
```bash
# 1. Run full TypeScript type check (client + server)
npm run type-check

# 2. Run full automated test suite (48 tests across 8 test files)
npm test

# 3. Build production bundle
npm run build
```

### Running the Application Locally
To experience the full authenticated application with live session management and SQLite database integration:

```bash
# Terminal 1: Start Express backend server (Port 5000)
npm run server:dev

# Terminal 2: Start Vite frontend development server (Port 3000)
npm run dev
```

*(Optional) To re-seed or bootstrap pilot municipal commissioner & supervisor accounts:*
```bash
npm run server:bootstrap
```

---

*Authored for Pune Municipal Waste Operations & JU Techfest 2026.*
