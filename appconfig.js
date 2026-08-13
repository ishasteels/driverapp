// ============================================================
// ISE DRIVER APP — appconfig.js
// Isha Steels Enterprises — Vehicle Operations Management
// ============================================================
// STEP 1: After deploying Code.gs as Web App, paste the URL below.
// STEP 2: Commit this file to GitHub. App will auto-update.
// ============================================================

var APP_CONFIG = {

  // ── GAS Web App URL (paste after deployment) ──────────────
  GAS_URL: 'PASTE_YOUR_GAS_DEPLOYMENT_URL_HERE',
  // Example: 'https://script.google.com/macros/s/AKfycbx.../exec'

  // ── App Identity ──────────────────────────────────────────
  APP_NAME:      'ISE Driver App',
  APP_SHORT:     'ISE Vehicles',
  COMPANY:       'Isha Steels Enterprises',
  APP_VERSION:   '1.0.0',

  // ── Brand Colors (from ISE logo) ─────────────────────────
  // Primary: ISE Red (logo red figure)
  // Secondary: Charcoal (logo text)
  COLORS: {
    primary:      '#D51515',   // ISE red
    primaryDark:  '#A80F0F',   // hover/pressed
    primaryLight: '#FF4444',   // light variant
    secondary:    '#2B2B2B',   // ISE charcoal
    surface:      '#FFFFFF',
    background:   '#F4F4F4',
    border:       '#E0E0E0',
    textMain:     '#2B2B2B',
    textSub:      '#666666',
    success:      '#27AE60',
    warning:      '#F39C12',
    danger:       '#E74C3C',
    info:         '#2980B9'
  },

  // ── Role → Module Access Map ──────────────────────────────
  // These determine which tiles show up in the nav/home
  ROLE_MODULES: {
    admin: [
      'dashboard', 'vehicles', 'drivers', 'attendance',
      'inspection', 'cleaning', 'fuel', 'trips', 'dispatch',
      'services', 'documents', 'reminders', 'expenses',
      'fastag', 'kmlogs', 'maintenance', 'penalties',
      'rewards', 'auditlog', 'users'
    ],
    manager: [
      'dashboard', 'vehicles', 'drivers', 'attendance',
      'inspection', 'cleaning', 'fuel', 'trips', 'dispatch',
      'services', 'documents', 'reminders', 'expenses',
      'fastag', 'kmlogs', 'maintenance', 'penalties', 'rewards'
    ],
    driver: [
      'my_dashboard', 'my_attendance', 'my_inspection',
      'my_cleaning', 'my_fuel', 'my_trips', 'my_expenses', 'my_kmlogs'
    ]
  },

  // ── Module Metadata (icon + label) ───────────────────────
  MODULES: {
    dashboard:     { label: 'Dashboard',     icon: '📊', color: '#2B2B2B' },
    vehicles:      { label: 'Vehicles',      icon: '🚗', color: '#2980B9' },
    drivers:       { label: 'Drivers',       icon: '👤', color: '#8E44AD' },
    attendance:    { label: 'Attendance',    icon: '📋', color: '#27AE60' },
    inspection:    { label: 'Inspection',    icon: '🔍', color: '#D51515' },
    cleaning:      { label: 'Cleaning',      icon: '🧽', color: '#16A085' },
    fuel:          { label: 'Fuel',          icon: '⛽', color: '#E67E22' },
    trips:         { label: 'Trips',         icon: '🗺️', color: '#2980B9' },
    dispatch:      { label: 'Dispatch',      icon: '📦', color: '#8E44AD' },
    services:      { label: 'Services',      icon: '🔧', color: '#D51515' },
    documents:     { label: 'Documents',     icon: '📄', color: '#2B2B2B' },
    reminders:     { label: 'Reminders',     icon: '🔔', color: '#F39C12' },
    expenses:      { label: 'Expenses',      icon: '💸', color: '#E74C3C' },
    fastag:        { label: 'Fastag',        icon: '🏷️', color: '#27AE60' },
    kmlogs:        { label: 'KM Logs',       icon: '📏', color: '#2980B9' },
    maintenance:   { label: 'Maintenance',   icon: '🛠️', color: '#E67E22' },
    penalties:     { label: 'Penalties',     icon: '⚠️', color: '#E74C3C' },
    rewards:       { label: 'Rewards',       icon: '🏆', color: '#F1C40F' },
    auditlog:      { label: 'Audit Log',     icon: '📝', color: '#7F8C8D' },
    users:         { label: 'Users',         icon: '👥', color: '#8E44AD' },

    my_dashboard:  { label: 'My Dashboard',  icon: '📊', color: '#2B2B2B' },
    my_attendance: { label: 'My Attendance', icon: '📋', color: '#27AE60' },
    my_inspection: { label: 'Inspection',    icon: '🔍', color: '#D51515' },
    my_cleaning:   { label: 'Cleaning',      icon: '🧽', color: '#16A085' },
    my_fuel:       { label: 'Fuel Entry',    icon: '⛽', color: '#E67E22' },
    my_trips:      { label: 'My Trips',      icon: '🗺️', color: '#2980B9' },
    my_expenses:   { label: 'Expenses',      icon: '💸', color: '#E74C3C' },
    my_kmlogs:     { label: 'KM Log',        icon: '📏', color: '#2980B9' }
  },

  // ── Vehicle Types ─────────────────────────────────────────
  VEHICLE_TYPES:   ['Car', 'Truck', 'Tempo', 'Bus', 'Crane', 'JCB', 'Other'],
  FUEL_TYPES:      ['Petrol', 'Diesel', 'CNG', 'Electric'],
  OWNERSHIP_TYPES: ['Company Owned', 'Vendor Vehicle', 'Leased'],

  // ── Inspection Checks ─────────────────────────────────────
  INSPECTION_CHECKS: [
    { key: 'fuelCheck',     label: '⛽ Fuel Level OK' },
    { key: 'tyreCheck',     label: '🛞 Tyres OK' },
    { key: 'mirrorCheck',   label: '🪞 Mirrors OK' },
    { key: 'fastagCheck',   label: '🏷️ Fastag Balance OK' },
    { key: 'rcCheck',       label: '📄 RC Present' },
    { key: 'insuranceCheck',label: '🛡️ Insurance Present' },
    { key: 'pucCheck',      label: '🌿 PUC Present' }
  ],

  // ── Cleaning Checks ───────────────────────────────────────
  CLEANING_CHECKS: [
    { key: 'exteriorClean',    label: '🚿 Exterior Clean' },
    { key: 'interiorClean',    label: '🪣 Interior Clean' },
    { key: 'matClean',         label: '🧹 Mat Clean' },
    { key: 'dashboardClean',   label: '✨ Dashboard Clean' },
    { key: 'seatClean',        label: '💺 Seat Clean' },
    { key: 'mirrorClean',      label: '🪞 Mirror Clean' },
    { key: 'tyrePolish',       label: '⚫ Tyre Polish' },
    { key: 'perfumeAvailable', label: '🌸 Perfume Available' }
  ],

  // ── Service Return Checks ─────────────────────────────────
  SERVICE_RETURN_CHECKS: [
    { key: 'fastagPresent', label: '🏷️ Fastag Present' },
    { key: 'mirrorPresent', label: '🪞 Mirror OK' },
    { key: 'rcPresent',     label: '📄 RC Present' },
    { key: 'insPresent',    label: '🛡️ Insurance Present' },
    { key: 'pucPresent',    label: '🌿 PUC Present' },
    { key: 'toolKit',       label: '🧰 Tool Kit Present' },
    { key: 'jack',          label: '🔩 Jack Present' },
    { key: 'stepney',       label: '🛞 Stepney Present' }
  ],

  // ── Expense Types ─────────────────────────────────────────
  EXPENSE_TYPES: ['Fuel', 'Service', 'Insurance', 'PUC', 'Fastag', 'Toll', 'Tyre', 'Repair', 'Other'],
  PAYMENT_MODES: ['Cash', 'UPI', 'Bank Transfer', 'Credit Card', 'Debit Card'],

  // ── Document Types ────────────────────────────────────────
  DOCUMENT_TYPES: ['Insurance', 'PUC', 'RC', 'Permit', 'Fitness Certificate', 'Other'],

  // ── Service Types ─────────────────────────────────────────
  SERVICE_TYPES: ['Oil Change', 'Major Service', 'Repair', 'Tyre Work', 'AC Service', 'Body Work', 'Other'],

  // ── Maintenance Types ─────────────────────────────────────
  MAINTENANCE_TYPES: ['Service', 'Wheel Alignment', 'Wheel Balancing', 'Tyre Rotation', 'Oil Change', 'Battery', 'Other'],

  // ── Blood Groups ──────────────────────────────────────────
  BLOOD_GROUPS: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],

  // ── Priority Levels ───────────────────────────────────────
  PRIORITY_LEVELS: ['High', 'Medium', 'Low'],

  // ── Reminder Types ────────────────────────────────────────
  REMINDER_TYPES: ['Insurance', 'PUC', 'Service', 'Alignment', 'Battery', 'Tyre', 'Other'],

  // ── Material Types (for trips) ────────────────────────────
  MATERIAL_TYPES: ['TMT Bars', 'MS Plates', 'Iron Rods', 'Steel Coils', 'Angle Iron', 'Billets', 'Other'],

  // ── Session ───────────────────────────────────────────────
  SESSION_KEY:    'ise_driver_app_session',
  DATA_KEY:       'ise_driver_app_data',
  DATA_TS_KEY:    'ise_driver_app_ts',
  REFRESH_MINS:   5   // auto-refresh every 5 minutes
};
