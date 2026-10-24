# WasteWise Jaipur — Security Vulnerability Assessment

**Assessment Date:** 2026-10-24  
**Assessor:** Senior Application Security Engineer  
**Target:** WasteWise Jaipur Smart Waste Collection Decision-Support System  
**Environment:** Local Repository (`JU-Techfest`), Node.js v20+, React 18, Vite 6, TypeScript 5.6  

---

## 1. Executive Summary & Overall Risk Posture

| Metric | Assessment Result |
| :--- | :--- |
| **Overall Security Risk** | **CRITICAL** (Prototype Stage — Zero Backend Security Controls) |
| **Confirmed Vulnerabilities** | **6** (1 Critical, 3 High, 2 Medium) |
| **Likely / Environmental Risks** | **3** (2 Medium, 1 Low) |
| **Missing Architecture Controls** | **7** (Required for Production Backend Specification) |
| **Dependency Vulnerabilities** | **3 Moderate** (GHSA-rj75-hqrm-r3gf in `postcss-selector-parser`) |
| **Automated Test Verification** | **11 of 11 Tests Passing** (including 3 exploit verification tests) |

### Assessment Summary
WasteWise is currently a **purely client-side prototype** running in the browser. While the frontend exhibits strong domain architecture, responsive Jaipur-inspired UI, Leaflet geospatial integration, and functional dispatch heuristics, **it possesses no server-side authentication, authorization, session management, or backend data validation**.

All role restrictions (Municipal Head, Ward Supervisor, Driver) are implemented solely via client-side React conditional rendering (`RoleSwitcher.tsx`, `App.tsx`), and state is initialized from an unauthenticated, unverified `localStorage` payload. Any user can escalate privileges to Municipal Head, manipulate collection payload metrics, assign bins to disabled vehicles, or impersonate other truck drivers directly from the browser console or UI.

---

## 2. Findings Summary Table

| Finding ID | Severity | Category | Title | Status |
| :--- | :---: | :---: | :--- | :---: |
| **SEC-01** | **CRITICAL** | Auth & Access | Client-Side Role Switching & Total Absence of Authentication | **Confirmed** |
| **SEC-02** | **HIGH** | Data Integrity | Unsigned `localStorage` Privilege Escalation & State Tampering | **Confirmed** |
| **SEC-03** | **HIGH** | Authorization | Driver Impersonation & Insecure Direct Object Reference (IDOR) | **Confirmed** |
| **SEC-04** | **HIGH** | Business Logic | Missing Idempotency in Collection Service (Payload Inflation) | **Confirmed** |
| **SEC-05** | **MEDIUM** | Business Logic | Truck Capacity & Offline Status Bypass in Manual Reassignment | **Confirmed** |
| **SEC-06** | **MEDIUM** | Injection | Stored/DOM Cross-Site Scripting (XSS) via Leaflet Popups & DivIcons | **Confirmed** |
| **SEC-07** | **MEDIUM** | Configuration | Missing `.env` Patterns in `.gitignore` (Credential Exposure Risk) | **Likely Risk** |
| **SEC-08** | **MEDIUM** | Dependencies | ReDoS Vulnerability in `postcss-selector-parser` (<7.1.6) | **Confirmed** |
| **SEC-09** | **LOW** | Network & Headers | Missing Content Security Policy (CSP) & HTTP Security Headers | **Likely Risk** |

---

## 3. Detailed Vulnerability Findings

### SEC-01: Client-Side Role Switching & Total Absence of Authentication
- **Severity:** **CRITICAL**
- **CVSS v3.1:** 9.8 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`)
- **File & Lines:** [`src/components/common/RoleSwitcher.tsx#L46-L50`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/common/RoleSwitcher.tsx#L46-L50), [`src/App.tsx#L37-L38`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/App.tsx#L37-L38), [`src/App.tsx#L210-L276`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/App.tsx#L210-L276)
- **Evidence:**
  ```tsx
  // src/components/common/RoleSwitcher.tsx
  <button
    key={r.id}
    type="button"
    onClick={() => onSelectRole(r.id)}
    className={...}
  >
  ```
  ```tsx
  // src/App.tsx
  {activeRole === 'driver' && <DriverView ... />}
  {activeRole === 'municipal_head' && <MunicipalHeadView ... />}
  {activeRole === 'ward_supervisor' && <WardSupervisorView ... />}
  ```
- **Impact:** Any anonymous visitor to the web application can switch roles at will by clicking the header buttons or modifying local React state. There are no server-side sessions, password challenges, or token verifications. A malicious user gains instantaneous access to citywide municipal waste infrastructure, fleet data, and supervisor dispatch operations.
- **Reproducible Steps:**
  1. Open the application in any web browser.
  2. In the header bar, click "Municipal Head".
  3. Observe that all executive data, fleet utilization metrics, and high-risk unserved collection points are immediately accessible without prompting for credentials.
- **Recommended Fix:** Implement server-side authentication (`/officer/login`) with bcrypt password hashing and secure, HTTP-only session cookies. Remove the client-side role switcher from production builds.

---

### SEC-02: Unsigned `localStorage` Privilege Escalation & State Tampering
- **Severity:** **HIGH**
- **CVSS v3.1:** 7.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N`)
- **File & Lines:** [`src/services/storageService.ts#L15-L27`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/storageService.ts#L15-L27), [`src/App.tsx#L33-L35`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/App.tsx#L33-L35)
- **Evidence:**
  ```ts
  // src/services/storageService.ts
  export function loadSavedDemoState(): StoredDemoState | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.bins) && Array.isArray(parsed.trucks)) {
      return parsed as StoredDemoState;
    }
  ```
- **Impact:** The client treats the contents of `localStorage` as an authoritative source of truth for user permissions (`activeRole`), bin states, and truck assignments. Any user can manipulate their identity or arbitrarily rewrite municipal fleet state across browser restarts.
- **Reproducible Steps:**
  1. Open Developer Tools Console (`F12`).
  2. Execute:
     ```js
     localStorage.setItem('wastewise_jaipur_demo_v2', JSON.stringify({
       activeRole: 'municipal_head',
       bins: [],
       trucks: [],
       events: [],
       lastUpdated: new Date().toISOString()
     }));
     location.reload();
     ```
  3. Observe that upon reload, the user is authenticated as "Municipal Head" with persisted state.
- **Recommended Fix:** Never use `localStorage` as an authority for identity, roles, or permissions. Store authenticated identity in server-side session stores, returning user profile data via a protected `/api/auth/me` endpoint.

---

### SEC-03: Driver Impersonation & Insecure Direct Object Reference (IDOR)
- **Severity:** **HIGH**
- **CVSS v3.1:** 7.1 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:L`)
- **File & Lines:** [`src/components/roles/DriverView.tsx#L41`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/roles/DriverView.tsx#L41), [`src/components/roles/DriverView.tsx#L79-L91`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/roles/DriverView.tsx#L79-L91)
- **Evidence:**
  ```tsx
  // src/components/roles/DriverView.tsx
  <select
    id="driver-truck-select"
    value={selectedTruckId}
    onChange={(e) => setSelectedTruckId(e.target.value)}
    className="..."
  >
    {activeTrucks.map((t) => (
      <option key={t.id} value={t.id}>
        {t.id} — {t.driverName} ({t.name.split(' ')[0]})
      </option>
    ))}
  </select>
  ```
- **Impact:** The driver interface provides an unrestricted dropdown of all municipal drivers. Any user in the driver view can select another driver's vehicle and submit "Mark Collected" or "Unable to Collect" actions on their behalf, corrupting the municipal collection record.
- **Reproducible Steps:**
  1. Open the driver interface.
  2. Change the dropdown from "Rajesh Sharma (RJ-14-GA-4821)" to "Kamlesh Gurjar (RJ-14-EA-1934)".
  3. Click "MARK AS COLLECTED".
  4. Observe that Kamlesh Gurjar's route and vehicle payload are modified by an unauthorized user.
- **Recommended Fix:** Enforce driver authentication via phone number and OTP (`/driver/login`). The server must bind the driver's session strictly to their provisioned vehicle and reject any collection requests where `session.truckId !== request.truckId`.

---

### SEC-04: Missing Idempotency in Collection Service (Payload Inflation)
- **Severity:** **HIGH**
- **CVSS v3.1:** 6.5 (`CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N`)
- **File & Lines:** [`src/services/simulationEngine.ts#L185`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/simulationEngine.ts#L185)
- **Evidence:**
  ```ts
  // src/services/simulationEngine.ts
  const newCompleted = t.completedBinIds.includes(binId)
    ? t.completedBinIds
    : [...t.completedBinIds, binId];

  return {
    ...t,
    completedBinIds: newCompleted,
    nextStopBinId: newNextStop,
    currentLoadKg: action === 'collected' ? t.currentLoadKg + weight : t.currentLoadKg,
  ```
- **Impact:** While `completedBinIds` deduplicates the bin ID, `t.currentLoadKg` unconditionally adds `weight` on every call. If an operator or driver triggers a collection action multiple times (e.g., double-clicking or replaying a network request), the truck payload increments repeatedly, artificially corrupting vehicle tonnage data.
- **Reproducible Steps:**
  1. Verified via automated test `src/tests/securityAuditVerification.test.ts:31`.
  2. Call `recordCollectionService('BIN-1', 'TRUCK-1', ...)` twice consecutively for the same bin.
  3. Observe that truck payload increases from 400 kg to 419 kg on the second call instead of being rejected as a duplicate action.
- **Recommended Fix:** Implement server-side idempotency checks. If a bin is already in `collected` status, return `409 Conflict` or a no-op response without altering truck load.

---

### SEC-05: Truck Capacity & Offline Status Bypass in Manual Reassignment
- **Severity:** **MEDIUM**
- **CVSS v3.1:** 5.3 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:N`)
- **File & Lines:** [`src/services/dispatchEngine.ts#L273-L280`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/dispatchEngine.ts#L273-L280)
- **Evidence:**
  ```ts
  // src/services/dispatchEngine.ts
  if (newTruckId) {
    const newTruck = updatedTrucks.find((t) => t.id === newTruckId);
    if (newTruck) {
      newTruck.assignedBinIds.push(binId);
      newTruck.currentLoadKg += targetBin.estimatedKg;
      newTruck.status = 'Assigned';
    }
  }
  ```
- **Impact:** `manuallyReassignBin` does not validate whether `newTruck.currentLoadKg + targetBin.estimatedKg <= newTruck.capacityKg`, nor does it check whether `newTruck.status === 'Offline'`. A user can assign an arbitrary number of bins to a disabled vehicle in maintenance, causing significant operational failure.
- **Reproducible Steps:**
  1. Verified via automated test `src/tests/securityAuditVerification.test.ts:74`.
  2. In Supervisor view, reassign a 3,000 kg bin to offline truck `RJ-14-ED-8219` (capacity 2,200 kg).
  3. Observe that the truck's status is overwritten to `Assigned` and payload exceeds rated capacity with no warning or rejection.
- **Recommended Fix:** Enforce capacity validation and vehicle availability status checks on both client and backend before accepting reassignment requests.

---

### SEC-06: DOM Cross-Site Scripting (XSS) via Leaflet Marker & Popup Template Strings
- **Severity:** **MEDIUM**
- **CVSS v3.1:** 6.1 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N`)
- **File & Lines:** [`src/components/map/OperationsMap.tsx#L156-L193`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/map/OperationsMap.tsx#L156-L193), [`src/components/map/OperationsMap.tsx#L228-L264`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/map/OperationsMap.tsx#L228-L264), [`src/components/common/DustbinMarkerIcon.tsx#L55`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/common/DustbinMarkerIcon.tsx#L55)
- **Evidence:**
  ```ts
  // src/components/map/OperationsMap.tsx
  const popupHtml = `
    <h4 class="font-bold text-[#1D1D21] text-xs leading-snug mb-0.5">${bin.name}</h4>
    <p class="text-[10.5px] text-[#54545A] mb-2">${bin.hindiName}</p>
    ...
  `;
  marker.bindPopup(popupHtml);
  ```
- **Impact:** Leaflet's `marker.bindPopup(html)` and `L.divIcon({ html })` parse strings directly into the DOM using `element.innerHTML`. If bin names or driver names contain HTML or script injections (e.g. from future resident complaint descriptions or manipulated `localStorage`), arbitrary JavaScript executes in the context of the user's session.
- **Reproducible Steps:**
  1. Set `bin.name = '<img src=x onerror=alert(1)>'` in `jaipurBins.ts` or `localStorage`.
  2. Click the bin on the map.
  3. The `onerror` handler executes JavaScript.
- **Recommended Fix:** Sanitize all interpolated values using DOMPurify or replace raw HTML strings with safe DOM element creation (`document.createElement`) and `textContent`.

---

### SEC-07: Missing `.env` Patterns in `.gitignore`
- **Severity:** **MEDIUM**
- **CVSS v3.1:** 5.5 (`CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`)
- **File & Lines:** [`.gitignore#L1-L24`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/.gitignore#L1-L24)
- **Evidence:**
  The project's `.gitignore` contains standard log and editor exclusions, but **omits `.env`, `.env.local`, `.env.*.local`, and database files (`*.sqlite`, `*.db`)**.
- **Impact:** When developers introduce backend secrets (JWT secret, DB credentials, session keys), Git will track `.env` files by default, leading to accidental secret commits to public/shared repositories.
- **Recommended Fix:** Add `.env`, `.env.local`, `.env.*.local`, and `*.sqlite` to `.gitignore` immediately.

---

### SEC-08: Vulnerable Dependencies (`postcss-selector-parser`)
- **Severity:** **MEDIUM**
- **CVSS v3.1:** 5.3 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L`)
- **Evidence:** `npm audit` reports 3 moderate vulnerabilities:
  - `postcss-selector-parser <7.1.6`: Quadratic complexity in flat selector parsing allows CPU exhaustion ([GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)).
  - Dependency chain: `postcss-selector-parser` -> `postcss-nested` -> `tailwindcss`.
- **Impact:** Potential ReDoS during asset build or PostCSS compilation.
- **Recommended Fix:** Upgrade `tailwindcss` / `postcss-selector-parser` to patched versions.

---

### SEC-09: Missing Content Security Policy (CSP) & HTTP Security Headers
- **Severity:** **LOW**
- **CVSS v3.1:** 3.7 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N`)
- **File & Lines:** [`index.html#L1-L21`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/index.html#L1-L21)
- **Evidence:** `index.html` loads external resources from `fonts.googleapis.com` and `unpkg.com` without Subresource Integrity (SRI) on the CSS or a `Content-Security-Policy` header/meta tag.
- **Impact:** Leaves the application susceptible to unauthorized script injection, clickjacking (missing `X-Frame-Options`), and MIME-type sniffing.
- **Recommended Fix:** Implement a strict CSP and security headers via Helmet middleware on the server.

---

## 4. Planned Backend Threat Model & Missing Controls

Because the current repository has no backend, the following controls represent **critical missing architecture** that must be implemented according to product specifications:

| Area | Threat / Risk | Required Control Specification |
| :--- | :--- | :--- |
| **Officer Authentication** | Credential brute forcing & credential theft | Server-side `/api/auth/officer/login` with `bcryptjs` (work factor 12), rate-limited attempts (max 5/min), HTTP-only secure session cookies, session expiry, and revocation on logout. |
| **Driver OTP Lifecycle** | OTP enumeration & replay attacks | Server-side `/api/auth/driver/request-otp` & `verify-otp`. Cryptographically random 6-digit OTP, SHA-256 hashed in database, 5-minute strict expiry, max 3 verification attempts, single-use invalidation, and rate limiting (max 3 requests/10 min). Dev mode must never expose OTP in production responses. |
| **Ward Scope Authorization** | Privilege escalation across municipal boundaries | Server-side middleware checking officer assigned wards. Ward supervisors are rejected (`403 Forbidden`) if querying or modifying wards outside their assignment. Municipal heads have verified citywide access. |
| **Driver Scope Authorization** | Driver accessing other vehicles or stops | Server-side middleware binding driver session strictly to their provisioned vehicle ID. Driver can view and update only their assigned route. |
| **Driver Session Revocation** | Deactivated driver continuing route operations | When an operator deactivates a driver in `/operator/drivers`, the server immediately revokes all active sessions in the `sessions` table. |
| **Collection Idempotency** | Duplicate collection recording & load manipulation | Database transaction with unique constraint on `(bin_id, shift_id)`. Re-submitting collection returns `409 Conflict`. |
| **Mutex Bin Assignment** | Two trucks collecting the same bin simultaneously | Database constraint ensuring `assigned_truck_id` is unique across active uncollected bins in the shift manifest. |
| **Resident Complaint Spam & Abuse** | Upload of malicious executables, EXIF tracking, and DoS | Server-side rate limiter on `/api/complaints` (IP-based sliding window). Multer upload filter validating MIME types (`image/jpeg`, `image/png`, `image/webp`), 5 MB size limit, filename sanitization, EXIF metadata stripping, and secure non-executable storage. |
| **Audit Logging** | Unaccounted municipal data alterations | Server-side `audit_logs` table recording actor, action, timestamp, and metadata for all driver assignments, collections, and status transitions. |

---

## 5. Automated Security Test Results

The assessment executed automated unit and security exploit verification tests using Vitest:

```
 RUN  v5.0.5 C:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest

 ✓ src/tests/riskEngine.test.ts (2 tests) 3ms
   ✓ maps fill percentages to risk categories per specification
   ✓ boosts priority score for sensitive zones and critical levels

 ✓ src/tests/simulationEngine.test.ts (2 tests) 18ms
   ✓ correctly calculates road heading rotation angles
   ✓ records collection service, reduces bin fill to 5%, and updates truck load

 ✓ src/tests/securityAuditVerification.test.ts (3 tests) 16ms
   ✓ CONFIRMS VULN-1: LocalStorage tampering allows unauthenticated role privilege escalation
   ✓ CONFIRMS VULN-2: Repeated collection calls cause arithmetic load inflation (Missing Idempotency)
   ✓ CONFIRMS VULN-3: Manual reassignment bypasses truck capacity limits and offline status

 ✓ src/tests/dispatchEngine.test.ts (4 tests) 1510ms
   ✓ excludes unavailable/offline trucks from assignment
   ✓ strictly respects vehicle capacity limits
   ✓ enforces mutex assignment (a bin is never assigned to two trucks)
   ✓ prioritizes critical and high risk bins first

 Test Files  4 passed (4)
      Tests  11 passed (11)
   Duration  1.96s
```

All 3 security exploit verification tests succeeded in demonstrating the confirmed vulnerabilities in the current codebase.

---

## 6. Prioritized Remediation Plan

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Database & Security Foundation (CRITICAL)                         │
│ • Implement SQLite / PostgreSQL relational schema with mutex constraints   │
│ • Implement bcrypt password hashing & secure session cookie engine         │
│ • Add .env, .env.local, *.sqlite to .gitignore                             │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Authentication & Authorization APIs (CRITICAL)                    │
│ • Implement /api/auth/officer/login and session revocation                 │
│ • Implement /api/auth/driver/request-otp & verify-otp with strict limits   │
│ • Implement RBAC and ward-scoping middleware (401/403 enforcement)         │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Public Complaint Submission Pipeline (HIGH)                       │
│ • Implement anonymous /api/complaints with IP rate limiting                │
│ • Configure Multer with MIME verification, 5MB limit, and EXIF stripping   │
│ • Build mobile-first camera / upload UI at /complaints/new                 │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Operator Driver, Ward & Complaint Dashboards (HIGH)               │
│ • Implement /operator/drivers (provisioning, truck assignment, deactivation)│
│ • Implement /operator/wards (ward boundary & supervisor scoping)           │
│ • Implement /operator/complaints (resolution notes & audit history)        │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Client-Side Router & API Integration (MEDIUM)                     │
│ • Add HTML5 client router for /officer/login, /driver/login, etc.          │
│ • Remove unauthenticated RoleSwitcher in production                        │
│ • Sanitize Leaflet popup & marker HTML to neutralize DOM XSS               │
│ • Implement collection idempotency guards on client and server             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Most Serious Confirmed Vulnerability & Exact Verification Steps

### Most Serious Vulnerability
**SEC-01: Complete Absence of Authentication & Client-Controlled Authorization (CVSS 9.8 - Critical)**

### Exact Verification Steps
1. Open the running WasteWise application at `http://localhost:3000` (or preview server `http://localhost:4173`).
2. Observe the header in the top-right corner containing the `RoleSwitcher` component ([`src/components/common/RoleSwitcher.tsx#L40-L60`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/common/RoleSwitcher.tsx#L40-L60)).
3. Click **"Municipal Head"**.
4. Without entering any username, email, password, or security token, the application immediately mounts [`MunicipalHeadView.tsx`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/roles/MunicipalHeadView.tsx), rendering:
   - Citywide collection progress.
   - High-risk unserved collection points across Jaipur.
   - Entire fleet deployment metrics and tonnage capacity utilization.
   - Complete driver names, phone numbers, and home depots.
5. In addition, opening the browser console and inspecting `localStorage` shows that executing:
   ```javascript
   localStorage.setItem('wastewise_jaipur_demo_v2', JSON.stringify({
     activeRole: 'municipal_head',
     bins: [],
     trucks: [],
     events: [],
     lastUpdated: new Date().toISOString()
   }));
   ```
   permanently locks the browser session into Municipal Head mode without any server authorization.


---

## 8. Phase 1 Client-Side Security Remediation Report

**Execution Date:** 2026-10-24  
**Remediation Scope:** Client-Side Hardening & Integrity Controls (Tasks A through F)  
**Verification Result:** 15 of 15 Tests Passing (`npm test`), 0 TypeScript Errors (`npm run type-check`), Clean Build (`npm run build`)

### 8.1 Status Summary Matrix

| Finding ID | Title | Phase 1 Status | Remediation Summary |
| :--- | :--- | :---: | :--- |
| **SEC-01** | Client-Side Role Switching | **Partially Mitigated (Client)** | Role switcher labeled as `[PROTOTYPE VIEW]`; persistent disclaimer banners clarify that client state is not real authentication; architecture prepared for Phase 2 `/officer/login` backend. |
| **SEC-02** | Unsigned `localStorage` Tampering | **Remediated (Client)** | Implemented `sanitizeDemoRole()` with strict allowlist fallback to `ward_supervisor`; numeric validation prevents negative loads/capacities; state marked with `isUnauthenticatedDemo: true`. |
| **SEC-03** | Driver Impersonation & IDOR | **Partially Mitigated (Client)** | Driver vehicle switcher labeled as simulation inspection; client guard blocks driver completion actions on unassigned bins; server-side token authorization required in Phase 2. |
| **SEC-04** | Collection Idempotency & Load Inflation | **Fully Remediated** | `recordCollectionService` detects duplicate collection calls on already collected bins, returns idempotent no-op events with `weightKg = 0`, and caps loads at truck physical capacity. |
| **SEC-05** | Truck Capacity & Offline Reassignment Bypass | **Fully Remediated** | `manuallyReassignBin` rejects reassignments to offline vehicles (`status === 'Offline'`) and blocks assignments exceeding truck capacity limit (`projectedLoad > truck.capacityKg`). |
| **SEC-06** | Leaflet Popups & Marker XSS Sinks | **Fully Remediated** | Created `src/utils/sanitize.ts`; replaced raw HTML popup string interpolation in `OperationsMap.tsx` with DOM node construction using `.textContent`; escaped all DivIcon HTML attributes. |
| **SEC-07** | `.gitignore` Secrets Exposure Risk | **Fully Remediated** | Added `.env`, `.env.local`, `.env.*.local`, and SQLite database patterns (`*.sqlite`, `*.db`) to `.gitignore`. |
| **SEC-08** | Dependency ReDoS in PostCSS | **Documented Risk** | Build-time `postcss-selector-parser` vulnerability documented; devDependency only with no runtime browser bundle exposure. |
| **SEC-09** | Missing Security Meta Headers | **Partially Mitigated (Client)** | Added `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` to `index.html`; full CSP headers will be set by Express in Phase 2. |

### 8.2 Inventory of Files Modified & Created

1. **`src/utils/sanitize.ts`** *(New)*: HTML escaping and attribute sanitization utilities (`escapeHtml`, `escapeAttr`).
2. **`src/services/storageService.ts`**: Allowlist role sanitization (`sanitizeDemoRole`), bounds checking on truck capacities, and explicit `isUnauthenticatedDemo` flag.
3. **`src/services/simulationEngine.ts`**: Idempotency guard in `recordCollectionService` preventing payload inflation from duplicated taps or replayed events.
4. **`src/services/dispatchEngine.ts`**: Offline vehicle rejection and payload capacity checks in `manuallyReassignBin`.
5. **`src/components/common/RoleSwitcher.tsx`**: Prototype warning banner and tooltip explicitly disclaiming authentication security.
6. **`src/components/roles/DriverView.tsx`**: Simulation terminal advisory banner and stop ownership validation guard.
7. **`src/components/map/OperationsMap.tsx`**: Replaced popup HTML templates with secure DOM nodes (`document.createElement` + `textContent`) and escaped tooltip text.
8. **`src/components/common/DustbinMarkerIcon.tsx`**: Sanitized DivIcon attribute injection sinks with `escapeAttr` and `escapeHtml`.
9. **`src/components/common/TruckMarkerIcon.tsx`**: Sanitized DivIcon attribute injection sinks with `escapeAttr` and `escapeHtml`.
10. **`src/tests/securityAuditVerification.test.ts`**: Suite of 7 automated security verification tests asserting remediation effectiveness across all tasks.
11. **`.gitignore`**: Added `.env*` and `*.sqlite` file patterns.
12. **`index.html`**: Added security meta tags for Referrer-Policy and nosniff.


---

## 9. WasteWise Phase 1.1 — Independent Security Verification Report

**Verification Date:** 2026-10-24  
**Assessor:** Independent Security Audit Team  
**Scope:** Verification of Phase 1 Remediation, Diff Analysis, State Tampering, Concurrency & Data Integrity, DOM XSS Sinks, Dependency Audit, and Test Robustness.

---

### 9.1 Verification of Role and Storage Controls (Section A)

1. **Diff & Implementation Inspection:**
   - [`src/services/storageService.ts`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/storageService.ts): `sanitizeDemoRole()` enforces an allowlist (`['ward_supervisor', 'municipal_head', 'driver']`). Any unexpected string, object, or null defaults to `'ward_supervisor'`. The stored payload includes `isUnauthenticatedDemo: true`.
   - [`src/components/common/RoleSwitcher.tsx`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/common/RoleSwitcher.tsx): Renders a header label `"Demo Views:"` and title tooltips marking each button as `[PROTOTYPE VIEW] ... (Not an authenticated security session)`.
   - [`src/components/roles/DriverView.tsx`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/roles/DriverView.tsx): Renders a persistent warning banner stating that the vehicle switcher is for simulation inspection only and that production operations require OTP verification.

2. **Access Control Assessment:**
   - **Can editing `localStorage` still reveal privileged views?** **YES.** Setting `{"activeRole": "municipal_head"}` in `localStorage` causes `loadSavedDemoState()` to return `activeRole: 'municipal_head'`, which causes React to render `MunicipalHeadView`.
   - **Can editing React state or clicking the switcher reveal privileged views?** **YES.** Because all views, bin coordinates, driver names, phone numbers, and operational routes are bundled directly in the client-side JavaScript (`dist/assets/index-*.js`).
   - **URL Parameter Vulnerabilities:** The application currently does not use a URL router; all routing is React component state. No URL parameter manipulation is possible at this stage.
   - **CRITICAL CONCLUSION:** **There is STILL NO REAL AUTHENTICATION OR SERVER-SIDE AUTHORIZATION.** The client-side controls are solely user-experience labels and input sanitization to prevent crashes. An untrusted user in the browser can inspect or execute any action provided by the client application.

---

### 9.2 Verification of Collection and Dispatch Integrity (Section B)

1. **Repeated Collection Actions & Event Count Consistency:**
   - **Truck Load:** In [`src/services/simulationEngine.ts`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/simulationEngine.ts), if `targetBin.collectionStatus === 'collected'`, `t.currentLoadKg` is NOT incremented.
   - **Event Counts:** In the current implementation, `recordCollectionService()` returns a `duplicateEvent` object (`type: 'collected'`, `weightKg: 0`, `notes: 'Duplicate collection action ignored...'`). In `App.tsx`, `setEvents((prev) => [result.event, ...prev])` prepends this duplicate event to `events`. Consequently, **the event count increments on duplicate collection attempts** even though the payload weight does not. To ensure complete idempotency, duplicate calls must NOT append new events to the audit log.

2. **Concurrent Collection Attempts (Race Conditions):**
   - In a synchronous client-only simulation, if two collection calls execute against the same stale state snapshot (e.g., two asynchronous requests or two driver tabs prior to React state synchronization):
     ```ts
     const call1 = recordCollectionService('BIN-1', 'TRUCK-1', trucks, bins, 'collected');
     const call2 = recordCollectionService('BIN-1', 'TRUCK-2', trucks, bins, 'collected');
     ```
     Both calls evaluate `targetBin.collectionStatus === 'assigned'` and both succeed! `TRUCK-1` and `TRUCK-2` both claim the bin.
   - **Verdict:** Client-side checks cannot prevent concurrency race conditions without a shared backend mutex or database-level row locking (`SELECT FOR UPDATE` or atomic `UPDATE bins SET collection_status = 'collected' WHERE id = ? AND collection_status != 'collected'`).

3. **Manual Reassignment Integrity:**
   - Reassignment to offline vehicles (`status === 'Offline'`) is **REJECTED** with an explicit error message.
   - Reassignment exceeding truck capacity (`projectedLoad > truck.capacityKg`) is **REJECTED** with an explicit error message.
   - Reassignment conflicts: When a bin assigned to Truck 1 is reassigned to Truck 2, `manuallyReassignBin` removes it from Truck 1's `assignedBinIds`, subtracts the load, and adds it to Truck 2. Mutex is preserved.

4. **Invalid or Negative Capacities & Payloads:**
   - **Finding:** In `storageService.ts`, negative capacity (`-500`) was silently converted to `1000`, and negative load was silently converted to `0`. Silently normalizing corrupt or hostile values masks data corruption instead of rejecting it.
   - Furthermore, `manuallyReassignBin` and `recordCollectionService` did not explicitly reject bins with negative `estimatedKg` or trucks with non-positive `capacityKg`. Explicit rejection is required.

---

### 9.3 Verification of XSS Remediation (Section C)

1. **Full Codebase AST & String Sink Audit:**
   - Audit query: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `dangerouslySetInnerHTML`.
   - **Result:** **0 matches** in `src/`.
   - Leaflet sinks:
     - `OperationsMap.tsx`: `marker.bindPopup(() => createBinPopupNode(bin, onSelectBin))` uses native DOM `document.createElement()` and assigns all text via `.textContent`. No HTML parsing sink exists.
     - `OperationsMap.tsx`: `marker.bindPopup(() => createTruckPopupNode(truck, onSelectTruck))` uses native DOM `document.createElement()` and `.textContent`.
     - `OperationsMap.tsx`: `polyline.bindTooltip(...)` passes strings wrapped in `escapeHtml()`.
     - `DustbinMarkerIcon.tsx`: Uses `escapeAttr()` on colors, codes, names, and categories.
     - `TruckMarkerIcon.tsx`: Uses `escapeAttr()` on vehicle IDs, driver names, statuses, and colors.
   - React Views: All bin names, addresses, and supervisor tradeoff rationales are rendered in JSX (`{bin.location.address}`), which natively escapes text nodes.

2. **Hostile Payload Testing:**
   - Tested payloads:
     - `<script>alert('XSS')</script>`
     - `<img src=x onerror=alert(1)>`
     - `" onfocus="alert(document.cookie)" autofocus="`
     - `javascript:alert(1)`
   - All payloads were escaped into HTML entities (`&lt;script&gt;`, `&quot;`, `&lt;img`) and rendered as inert plain text on the map canvas and in the DOM. No script execution occurred.

---

### 9.4 Verification of Git and Dependency Hygiene (Section D)

1. **Git Tracking of Sensitive Assets:**
   - `git ls-files` check confirmed: **No `.env`, `.env.local`, `.sqlite`, `.db`, secret, or key files are tracked by Git.**
   - Project `.gitignore` correctly includes:
     ```gitignore
     .env
     .env.local
     .env.*.local
     *.sqlite
     *.sqlite3
     *.db
     ```

2. **Complete `npm audit` Analysis:**
   - **Vulnerabilities Found:** 3 Moderate
   - **Affected Package:** `postcss-selector-parser` (<7.1.6)
   - **Advisory:** GHSA-rj75-hqrm-r3gf / CVE-2025-27150
   - **Title:** Quadratic complexity in flat selector parsing allows CPU exhaustion (ReDoS / Algorithmic Complexity)
   - **CVSS Score:** 5.9 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:H`)
   - **Dependency Chain:** `ju-techfest-wastewise` -> `tailwindcss@3.4.17` (devDependency) -> `postcss-nested` -> `postcss-selector-parser@6.1.2`
   - **Remediation Path:** Requires upgrading to `tailwindcss@4.x`, which is a major breaking change requiring rewrite of CSS directives and configuration.
   - **Risk Assessment:** **Zero runtime risk in production.** `tailwindcss` and `postcss-selector-parser` execute exclusively at build time (`vite build`). No parser code is packaged into client bundles.

3. **Production HTTP Headers & Content Security Policy (CSP):**
   - **Crucial Limitation:** The `<meta http-equiv="X-Content-Type-Options" content="nosniff">` tag in `index.html` is **not honored by modern browsers** (W3C specification requires it to be delivered as a true HTTP response header).
   - **CSP Status:** Currently missing. A production-ready Content Security Policy must be served via backend HTTP headers:
     ```http
     Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://unpkg.com; connect-src 'self' https://router.project-osrm.org;
     ```

---

### 9.5 Test Quality Analysis (Section E)

1. **Review of `securityAuditVerification.test.ts`:**
   - Tests 1 and 5 tested isolated utility functions (`sanitizeDemoRole` and `escapeHtml`), not full application flows.
   - Test 2 tested `storageService.loadSavedDemoState()`, but relied on silent defaulting rather than explicit validation rejection.
   - Test 3 checked `currentLoadKg` idempotency but did not verify that duplicate event counts are not created.
   - Missing tests: Concurrent collection race condition demonstration, negative payload rejection, and full multi-truck mutex conflict resolution.

---

### 9.6 Production Blockers Summary

The following security controls **CANNOT** be resolved in a client-side prototype and remain hard blockers for production deployment:
1. **Server-Side Authentication (`/officer/login` and `/driver/login`)**: Bcrypt password hashing, session tokens, and SMS OTP verification.
2. **Server-Side Role-Based Access Control (RBAC)**: Enforced in backend API route handlers (401 Unauthorized / 403 Forbidden).
3. **Database Concurrency & Transactional Mutexes**: Atomic row updates (`UPDATE ... WHERE collection_status != 'collected'`) to eliminate double-collection race conditions.
4. **HTTP Security Headers & CSP**: Served by reverse proxy / Express server (Helmet), replacing inert HTML meta tags.
5. **Secure Public Complaint Submission Pipeline**: Backend image upload with MIME inspection, EXIF stripping, and rate limiting.


---

### 9.7 Post-Verification Hardening & Regression Resolution (Phase 1.1 Actions)

Following the independent verification, the confirmed regressions and data-integrity gaps were remediated and verified:

1. **Replaced Silent Normalization with Explicit Rejection in Storage**:
   - In [`src/services/storageService.ts`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/storageService.ts), negative capacities (`capacityKg <= 0`) or negative loads (`currentLoadKg < 0` or `estimatedKg < 0`) are **strictly rejected**, logging a warning and returning `null` to revert to pristine defaults rather than silently normalizing to arbitrary defaults.
2. **Enforced Payload & Capacity Validation in Engines**:
   - In [`src/services/dispatchEngine.ts`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/dispatchEngine.ts), [`manuallyReassignBin`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/dispatchEngine.ts) explicitly validates `targetBin.estimatedKg >= 0` and `newTruck.capacityKg > 0`, returning error strings and preserving state if violated.
   - In [`src/services/simulationEngine.ts`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/simulationEngine.ts), [`recordCollectionService`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/simulationEngine.ts) rejects bins with negative payloads.
3. **Fixed Event Count Inflation on Duplicate Collection Calls**:
   - In [`src/services/simulationEngine.ts`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/services/simulationEngine.ts), duplicate calls return `isDuplicate: true`.
   - In [`src/App.tsx`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/App.tsx), `setEvents` only appends when `!result.isDuplicate`. Both payload load and event counts remain strictly consistent across repeated taps.
4. **Enforced Hex Color Validation in Truck DivIcon**:
   - In [`src/components/common/TruckMarkerIcon.tsx`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/components/common/TruckMarkerIcon.tsx), `truck.color` is verified against `/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/`, falling back to `#B04F34` to prevent CSS style-injection attacks.
5. **Expanded Verification Test Suite (11 Tests in Verification Suite, 19 Total)**:
   - Added tests for negative payload/capacity rejection, event count consistency, multi-truck mutex transfer, race condition demonstration, and hex color validation in [`src/tests/securityAuditVerification.test.ts`](file:///c:/Users/Shivansh/OneDrive/Desktop/sample/JU-Techfest/src/tests/securityAuditVerification.test.ts).
   - Full test run verified: **19 of 19 tests passing (`npm test`)**, **0 TypeScript errors (`npm run type-check`)**, **clean production build (`npm run build`)**.
