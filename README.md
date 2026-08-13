# 🚗 ISE Driver App
### Isha Steels Enterprises — Vehicle Operations Management System

**Stack:** Google Apps Script (backend) + GitHub Pages (frontend PWA)  
**Sheet:** [ISE Driver App Google Sheet](https://docs.google.com/spreadsheets/d/1evuqEoFjzLmERGFBN8PJen9qSWiSsxgWoJi6kvmvFk0/)  
**Live App:** https://ishasteels.github.io/driverapp

---

## Files in This Repo

| File | Purpose |
|------|---------|
| `index.html` | Full app UI + CSS |
| `appconfig.js` | Config: GAS URL, colors, role-permissions |
| `app.js` | All JavaScript, views, API calls |
| `Code.gs` | Google Apps Script backend (paste to GAS) |
| `manifest.json` | PWA: standalone install, icons |
| `sw.js` | Service Worker: offline shell caching |
| `icon-180.png` | Apple Touch Icon (already placed) |
| `icon-192.png` | Android icon (generate, see below) |
| `icon-512.png` | Large icon (generate, see below) |

---

## 🚀 Step-by-Step Deployment

### Step 1: Google Apps Script Setup

1. Open your Google Sheet:  
   `https://docs.google.com/spreadsheets/d/1evuqEoFjzLmERGFBN8PJen9qSWiSsxgWoJi6kvmvFk0/`

2. **Extensions → Apps Script**

3. Delete the default `myFunction()` and paste the full contents of `Code.gs`

4. Line 4: Update SHEET_ID:
   ```javascript
   var SHEET_ID = '1evuqEoFjzLmERGFBN8PJen9qSWiSsxgWoJi6kvmvFk0';
   ```

5. **Deploy → New Deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** → Copy the URL

### Step 2: Update appconfig.js

Open `appconfig.js` and update line 13:
```javascript
GAS_URL: 'https://script.google.com/macros/s/AKfycbx.../exec',
```
Replace with your actual deployment URL from Step 1.

### Step 3: Generate Icons

Icons 192 and 512 nahi hain abhi. Use any of these:

**Option A — Online:**  
https://favicon.io/ → Upload your icon-180.png → Download 192x192 and 512x512

**Option B — Python (agar PIL installed ho):**
```python
from PIL import Image

img = Image.open('icon-180.png')
img.resize((192, 192)).save('icon-192.png')
img.resize((512, 512)).save('icon-512.png')
```

### Step 4: Push to GitHub

```bash
# First time (agar local pe hai)
git init
git add .
git commit -m "Initial ISE Driver App"
git remote add origin https://github.com/ishasteels/driverapp.git
git push -u origin main
```

**Ya GitHub UI se:**
1. Go to: https://github.com/ishasteels/driverapp
2. Upload all files (drag & drop)
3. Commit changes

### Step 5: Enable GitHub Pages

1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** → Folder: **/ (root)**
4. Save
5. Wait 2 min → Visit: https://ishasteels.github.io/driverapp

### Step 6: Set GAS Triggers (for daily reminders)

In Apps Script:
1. Left panel → **Triggers (⏰)**
2. **+ Add Trigger**
   - Function: `sendDailyReminders`
   - Event source: **Time-driven**
   - Type: **Day timer**
   - Time: **8 AM to 9 AM**
3. Save

---

## 👥 Roles & Permissions

| Role | Access |
|------|--------|
| **Admin** | Everything: all vehicles, drivers, fuel, audit log, user management |
| **Manager** | All operational data, no users/audit |
| **Driver** | Only their own: attendance, inspection, cleaning, fuel, trips, expenses |

---

## 🗃️ Google Sheet Tabs (all must exist)

| Tab | Purpose |
|-----|---------|
| Users | Login credentials + roles |
| Vehicles | Vehicle master |
| Drivers | Driver master |
| DriverAttendance | Daily attendance |
| VehicleInspection | Pre-trip checklist |
| VehicleCleaning | Cleaning log |
| FuelEntries | Fuel records |
| VehicleServices | Service history |
| ServiceReturnChecklist | Post-service checklist |
| VehicleDocuments | Insurance, PUC, RC etc |
| Reminders | Expiry alerts |
| Notifications | App notifications |
| VehicleTrip | Trip log |
| VehicleExpense | Expense records |
| DriverPenalty | Penalty records |
| DriverReward | Reward records |
| VehicleKMLog | Odometer log |
| MaintenanceSchedule | Maintenance calendar |
| FastagTransactions | Fastag recharge log |
| DispatchTrips | Dispatch records |
| AuditLogs | All actions log |
| VehicleAssignmentHistory | Driver-vehicle assignments |
| NotificationQueue | WhatsApp/Email queue |
| Settings | App settings |

---

## 📱 Install as App on Phone

**Android (Chrome):**
1. Open: https://ishasteels.github.io/driverapp
2. Chrome menu (⋮) → **Add to Home Screen**
3. Opens as standalone app — no browser bar

**iPhone (Safari):**
1. Open URL in Safari
2. Share button (□↑) → **Add to Home Screen**

---

## 🔧 Updating the App

### If only frontend changed (index.html / app.js / appconfig.js):
Just push to GitHub. Changes live in 1-2 min.

### If Code.gs changed:
1. Apps Script → Deploy → **Manage Deployments**
2. Edit → Version: **New Version** → Deploy
3. URL stays same — no need to update appconfig.js

---

## 🐛 Common Issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Login spins forever | GAS URL wrong in appconfig.js | Check GAS_URL, redeploy GAS |
| "Email nahi mila" | Wrong SHEET_ID in Code.gs | Fix SHEET_ID, new version |
| App not installable | Missing icon-192 or icon-512 | Generate and upload icons |
| Data doesn't refresh | GAS quota hit | Wait 1-2 min, try again |
| Chrome badge on icon | Installed as shortcut not PWA | Delete → Clear cache → Re-add |

---

## 📞 Support
AUTOOWORKFLOW — sales@autoworkflow.in  
+91 9953333492
