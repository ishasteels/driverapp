# 🚗 ISE Driver App v3.0
### Isha Steels Enterprises — Vehicle Operations Management System

**Stack:** Google Apps Script (backend) + GitHub Pages (frontend PWA)  
**Sheet:** [ISE Driver App Google Sheet](https://docs.google.com/spreadsheets/d/1T7ujy6Wtcm1F2l_vgb2KhvRGYpEUl7cdbl-G2cE17sY/)  
**Live App:** https://ishasteels.github.io/driverapp  
**Built by:** [Autoworkflow](https://autoworkflow.in) — sales@autoworkflow.in

---

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | Full app UI + CSS (1393 lines) |
| `appconfig.js` | GAS URL, colors, role permissions, module config |
| `app.js` | All JS — views, API calls, CRUD (2900+ lines) |
| `Code.gs` | Google Apps Script backend (paste to GAS editor) |
| `manifest.json` | PWA manifest — standalone install |
| `sw.js` | Service Worker — offline shell caching |
| `icon-192.png` | Android PWA icon |
| `icon-512.png` | Large PWA icon |
| `icon-180.png` | iPhone touch icon |

---

## 🚀 Deployment

### Step 1 — Google Sheet Setup
Sheet ID: `1T7ujy6Wtcm1F2l_vgb2KhvRGYpEUl7cdbl-G2cE17sY`

Make sure all 32 tabs exist:
`Users, Vehicles, Drivers, DriverAttendance, VehicleInspection, VehicleCleaning, FuelEntries, VehicleServices, ServiceReturnChecklist, VehicleDocuments, Reminders, Notifications, NotificationQueue, VehicleTrip, VehicleExpense, DriverPenalty, DriverReward, VehicleKMLog, MaintenanceSchedule, FastagTransactions, DispatchTrips, AuditLogs, VehicleAssignmentHistory, AppConfig, HolidayList, LeaveRequests, TaskList, Checklist, Checklist_Today, Delegation, Announcements, Payroll`

### Step 2 — Google Apps Script
1. Open Sheet → **Extensions → Apps Script**
2. Delete default code → paste full `Code.gs`
3. Save (Ctrl+S)

### Step 3 — Script Properties (WhatsApp credentials)
Apps Script → Project Settings (⚙️) → Script Properties → Add:
```
WA_API_KEY  = your-messageautosender-api-key
WA_AUTH     = your-basic-auth-value
```

### Step 4 — Deploy as Web App
1. Deploy → New Deployment
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Deploy → Copy the URL

### Step 5 — Update appconfig.js
```javascript
GAS_URL: 'https://script.google.com/macros/s/YOUR_NEW_URL/exec',
```

### Step 6 — Setup Triggers (run once)
In Apps Script editor, run `runFullSetup()` function once.

This sets:
- `sendDailyReminders` → 8 AM daily (vehicle alerts + celebrations)
- `refreshChecklistToday` → Sunday 11 PM (weekly checklist refresh)

### Step 7 — Push to GitHub
```bash
git add .
git commit -m "ISE Driver App v3.0"
git push origin main
```

### Step 8 — Enable GitHub Pages
Repo Settings → Pages → Branch: main → / (root) → Save  
Wait ~2 min → https://ishasteels.github.io/driverapp

---

## 👥 Roles

| Role | Access |
|------|--------|
| **Admin** | Everything — all modules, users, audit log, payroll |
| **Manager** | All operational data, no users/payroll/audit |
| **Driver** | Only own data — attendance, inspection, cleaning, fuel, trips, expenses, checklist, tasks, leave |

---

## 🗃️ New Modules (v3.0)

### ✅ Checklist
- Admin sets up recurring tasks (Daily/Weekly/Monthly/One-time)
- **Shared tasks** — multiple drivers see same task; first to tap "Claim" gets credit
- `PropertiesService` mutex lock prevents double-claim race condition
- `Checklist_Today` sheet for fast read (no 41K row scan)
- Daily trigger auto-refreshes today's tasks

### 📌 Delegation
- Admin/Manager assigns one-off tasks to drivers
- Driver can request date revision (max 2 times)
- WA alert on assign + on completion
- Overdue tracking with visual indicators

### 🗓️ Leave Management
- Driver applies for CL/SL/PL/LWP
- Manager approves/rejects from app
- Leave balance tracked from Drivers sheet
- WA notification both ways

### 📅 Holiday Calendar
- Admin manages holiday list
- Shows upcoming 5 holidays on dashboard
- Attendance system respects holidays
- Payroll skips holidays in working day calc

### 📢 Announcements
- Admin/Manager posts company announcements
- Priority: Normal / High / Urgent
- Visible to all roles on dashboard

### 💰 Payroll (Admin only)
- Auto-calculates monthly salary per driver
- Deducts LWP/absent days
- Considers approved leaves
- CSV export for accountant

### 📊 Analytics
- Fuel spend trend (line chart)
- Expense by type (doughnut)
- Mileage by vehicle (bar chart)
- Attendance % by driver (bar chart)
- Date range filter

### 🎂 Celebrations
- Auto-detects birthdays + work anniversaries
- Banner on dashboard
- WA wish sent at 8 AM via daily trigger

---

## 📱 Install as App

**Android (Chrome):**
1. Open: https://ishasteels.github.io/driverapp
2. Chrome menu ⋮ → Add to Home Screen
3. Opens as standalone app — no browser bar

**iPhone (Safari):**
1. Open URL in Safari (not Chrome)
2. Share button → Add to Home Screen

---

## 🔧 Update Process

### Frontend only (index.html / app.js / appconfig.js):
Just push to GitHub. Live in 1-2 min.

### Code.gs changed:
1. Apps Script → Deploy → Manage Deployments
2. Edit → Version: New Version → Deploy
3. URL stays same — no appconfig.js update needed

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| Login spins forever | Check GAS_URL in appconfig.js, redeploy GAS |
| "Session expire" on every action | New deployment needed — update GAS_URL |
| Checklist empty | Run `generateChecklist` or wait for Sunday trigger |
| GPS block not working | Check DEPOT_LAT/LNG in AppConfig sheet |
| WA not sending | Check WA_API_KEY and WA_AUTH in Script Properties |
| Dark mode not saving | localStorage must be enabled in browser |
| Charts not loading | CDN cdn.jsdelivr.net blocked — check network |

---

## 📞 Support
**Autoworkflow** — India's Leading Google Workspace Automation Partner  
📧 sales@autoworkflow.in  
📱 +91 9953333492  
🌐 autoworkflow.in
