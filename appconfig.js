// ════════════════════════════════════════════════════════════════════════════
// appconfig.js — ISE Driver App v3.0
// Sirf yahan GAS_URL change karo — baaki kuch mat chheḍo
// ════════════════════════════════════════════════════════════════════════════
window.APP_CONFIG = {

  // ── GAS Web App URL ────────────────────────────────────────────────────
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwgPa0S_kN7QzCeW5TA15dUzPxGfK7PSEgXGTsaJs-kyp71jn-uFXwAOeKajqKvP2PCtA/exec',

  // ── App Info ────────────────────────────────────────────────────────────
  APP_NAME:    'ISE Driver App',
  APP_SHORT:   'ISE Vehicles',
  APP_VERSION: '3.0.0',
  COMPANY:     'Isha Steels Enterprises',

  // ── Session ─────────────────────────────────────────────────────────────
  SESSION_KEY:   'ise_session_v3',
  SESSION_HOURS: 12,

  // ── Brand Colors ─────────────────────────────────────────────────────────
  COLORS: {
    primary:      '#D51515',
    primaryDark:  '#A80F0F',
    primaryLight: '#FF4444',
    secondary:    '#2B2B2B',
    success:      '#27AE60',
    warning:      '#E67E22',
    danger:       '#E74C3C',
    info:         '#2980B9'
  },

  // ── API Timeouts ─────────────────────────────────────────────────────────
  DEFAULT_TIMEOUT: 30000,
  LONG_TIMEOUT:    60000,

  // ── Polling ─────────────────────────────────────────────────────────────
  POLL_INTERVAL: 30000,   // 30s
  REFRESH_MINS:  5,

  // ── Role → Module access map ─────────────────────────────────────────────
  ROLE_MODULES: {
    admin: [
      'dashboard','operations','vehicles','drivers','attendance','muster',
      'inspection','cleaning','fuel','trips','dispatch','services',
      'documents','reminders','expenses','fastag','kmlogs','maintenance',
      'penalties','rewards','checklist','checklist_setup','delegation',
      'leave_requests','holidays','announcements','analytics','payroll',
      'auditlog','users','settings'
    ],
    manager: [
      'dashboard','operations','vehicles','drivers','attendance','muster',
      'inspection','cleaning','fuel','trips','dispatch','services',
      'documents','reminders','expenses','fastag','kmlogs','maintenance',
      'penalties','rewards','checklist','checklist_setup','delegation',
      'leave_requests','holidays','announcements','analytics','settings'
    ],
    driver: [
      'my_dashboard','my_attendance','my_inspection','my_cleaning',
      'my_fuel','my_trips','my_expenses','my_kmlogs','my_checklist',
      'my_delegations','my_leave','holidays','announcements','profile'
    ]
  },

  // ── Module metadata ───────────────────────────────────────────────────────
  MODULES: {
    // Admin/Manager
    dashboard:       { label:'Dashboard',       icon:'fa-chart-pie',        color:'#2B2B2B' },
    operations:      { label:'Control Room',    icon:'fa-tower-control',    color:'#0D9488' },
    vehicles:        { label:'Vehicles',        icon:'fa-car',              color:'#2980B9' },
    drivers:         { label:'Drivers',         icon:'fa-id-badge',         color:'#8E44AD' },
    attendance:      { label:'Attendance',      icon:'fa-clipboard-user',   color:'#27AE60' },
    muster:          { label:'Muster Report',   icon:'fa-table-list',       color:'#16A085' },
    inspection:      { label:'Inspection',      icon:'fa-magnifying-glass', color:'#D51515' },
    cleaning:        { label:'Cleaning',        icon:'fa-broom',            color:'#16A085' },
    fuel:            { label:'Fuel',            icon:'fa-gas-pump',         color:'#E67E22' },
    trips:           { label:'Trips',           icon:'fa-route',            color:'#2980B9' },
    dispatch:        { label:'Dispatch',        icon:'fa-truck',            color:'#8E44AD' },
    services:        { label:'Services',        icon:'fa-wrench',           color:'#D51515' },
    documents:       { label:'Documents',       icon:'fa-file-alt',         color:'#2B2B2B' },
    reminders:       { label:'Reminders',       icon:'fa-bell',             color:'#F39C12' },
    expenses:        { label:'Expenses',        icon:'fa-receipt',          color:'#E74C3C' },
    fastag:          { label:'Fastag',          icon:'fa-tag',              color:'#27AE60' },
    kmlogs:          { label:'KM Logs',         icon:'fa-gauge-high',       color:'#2980B9' },
    maintenance:     { label:'Maintenance',     icon:'fa-screwdriver-wrench',color:'#E67E22' },
    penalties:       { label:'Penalties',       icon:'fa-triangle-exclamation',color:'#E74C3C' },
    rewards:         { label:'Rewards',         icon:'fa-trophy',           color:'#F1C40F' },
    checklist:       { label:'Checklists',      icon:'fa-list-check',       color:'#0D9488' },
    checklist_setup: { label:'Task Setup',      icon:'fa-sliders',          color:'#0D9488' },
    delegation:      { label:'Delegation',      icon:'fa-people-arrows',    color:'#2980B9' },
    leave_requests:  { label:'Leave Mgmt',      icon:'fa-calendar-xmark',   color:'#8E44AD' },
    holidays:        { label:'Holidays',        icon:'fa-umbrella-beach',   color:'#F39C12' },
    announcements:   { label:'Announcements',   icon:'fa-bullhorn',         color:'#D51515' },
    analytics:       { label:'Analytics',       icon:'fa-chart-line',       color:'#2980B9' },
    payroll:         { label:'Payroll',         icon:'fa-money-check-dollar',color:'#27AE60' },
    auditlog:        { label:'Audit Log',       icon:'fa-shield-halved',    color:'#7F8C8D' },
    users:           { label:'Users',           icon:'fa-users',            color:'#8E44AD' },
    settings:        { label:'Settings',        icon:'fa-gear',             color:'#7F8C8D' },
    // Driver
    my_dashboard:    { label:'My Dashboard',    icon:'fa-house',            color:'#2B2B2B' },
    my_attendance:   { label:'My Attendance',   icon:'fa-calendar-check',   color:'#27AE60' },
    my_inspection:   { label:'Inspection',      icon:'fa-magnifying-glass', color:'#D51515' },
    my_cleaning:     { label:'Cleaning',        icon:'fa-broom',            color:'#16A085' },
    my_fuel:         { label:'Fuel Entry',      icon:'fa-gas-pump',         color:'#E67E22' },
    my_trips:        { label:'My Trips',        icon:'fa-route',            color:'#2980B9' },
    my_expenses:     { label:'Expenses',        icon:'fa-receipt',          color:'#E74C3C' },
    my_kmlogs:       { label:'KM Log',          icon:'fa-gauge-high',       color:'#8E44AD' },
    my_checklist:    { label:'My Checklist',    icon:'fa-list-check',       color:'#0D9488' },
    my_delegations:  { label:'My Tasks',        icon:'fa-people-arrows',    color:'#2980B9' },
    my_leave:        { label:'My Leave',        icon:'fa-calendar-xmark',   color:'#8E44AD' },
    profile:         { label:'Profile',         icon:'fa-circle-user',      color:'#2B2B2B' },
  },

  // ── Sidebar nav groups (admin/manager) ────────────────────────────────────
  NAV_GROUPS: {
    admin: [
      { label:'OVERVIEW',    items:['dashboard','operations','analytics'] },
      { label:'FLEET',       items:['vehicles','drivers','fuel','trips','kmlogs','dispatch','maintenance'] },
      { label:'COMPLIANCE',  items:['attendance','muster','inspection','cleaning','services','documents','reminders','fastag'] },
      { label:'FINANCE',     items:['expenses','penalties','rewards','payroll'] },
      { label:'TEAM',        items:['checklist','checklist_setup','delegation','leave_requests','holidays','announcements'] },
      { label:'SYSTEM',      items:['users','auditlog','settings'] }
    ],
    manager: [
      { label:'OVERVIEW',    items:['dashboard','operations','analytics'] },
      { label:'FLEET',       items:['vehicles','drivers','fuel','trips','kmlogs','dispatch','maintenance'] },
      { label:'COMPLIANCE',  items:['attendance','muster','inspection','cleaning','services','documents','reminders','fastag'] },
      { label:'FINANCE',     items:['expenses','penalties','rewards'] },
      { label:'TEAM',        items:['checklist','checklist_setup','delegation','leave_requests','holidays','announcements'] },
      { label:'ACCOUNT',     items:['settings'] }
    ]
  },

  // ── Bottom nav (mobile — admin/manager) ───────────────────────────────────
  MOB_NAV: {
    admin:   ['dashboard','operations','vehicles','attendance','settings'],
    manager: ['dashboard','operations','vehicles','attendance','settings'],
    driver:  ['my_dashboard','my_attendance','my_checklist','my_fuel','profile']
  },

  // ── Inspection checks ─────────────────────────────────────────────────────
  INSPECTION_CHECKS: [
    { key:'fuelCheck',      label:'⛽ Fuel Level OK' },
    { key:'tyreCheck',      label:'🛞 Tyres OK' },
    { key:'mirrorCheck',    label:'🪞 Mirrors OK' },
    { key:'fastagCheck',    label:'🏷️ Fastag Balance OK' },
    { key:'rcCheck',        label:'📄 RC Present' },
    { key:'insuranceCheck', label:'🛡️ Insurance Present' },
    { key:'pucCheck',       label:'🌿 PUC Present' }
  ],

  // ── Cleaning checks ───────────────────────────────────────────────────────
  CLEANING_CHECKS: [
    { key:'exteriorClean',    label:'🚿 Exterior Clean' },
    { key:'interiorClean',    label:'🪣 Interior Clean' },
    { key:'matClean',         label:'🧹 Mat Clean' },
    { key:'dashboardClean',   label:'✨ Dashboard Clean' },
    { key:'seatClean',        label:'💺 Seat Clean' },
    { key:'mirrorClean',      label:'🪞 Mirror Clean' },
    { key:'tyrePolish',       label:'⚫ Tyre Polish' },
    { key:'perfumeAvailable', label:'🌸 Perfume Available' }
  ],

  // ── Service return checks ─────────────────────────────────────────────────
  SERVICE_RETURN_CHECKS: [
    { key:'fastagPresent', label:'🏷️ Fastag Present' },
    { key:'mirrorPresent', label:'🪞 Mirror OK' },
    { key:'rcPresent',     label:'📄 RC Present' },
    { key:'insPresent',    label:'🛡️ Insurance Present' },
    { key:'pucPresent',    label:'🌿 PUC Present' },
    { key:'toolKit',       label:'🧰 Tool Kit Present' },
    { key:'jack',          label:'🔩 Jack Present' },
    { key:'stepney',       label:'🛞 Stepney Present' }
  ],

  // ── Dropdown options ───────────────────────────────────────────────────────
  VEHICLE_TYPES:    ['Car','Truck','Tempo','Bus','Crane','JCB','Bike','Other'],
  FUEL_TYPES:       ['Petrol','Diesel','CNG','Electric'],
  OWNERSHIP_TYPES:  ['Company Owned','Vendor Vehicle','Leased'],
  EXPENSE_TYPES:    ['Fuel','Service','Insurance','PUC','Fastag','Toll','Tyre','Repair','Other'],
  PAYMENT_MODES:    ['Cash','UPI','Bank Transfer','Credit Card','Debit Card'],
  DOCUMENT_TYPES:   ['Insurance','PUC','RC','Permit','Fitness Certificate','Other'],
  SERVICE_TYPES:    ['Oil Change','Major Service','Repair','Tyre Work','AC Service','Body Work','Electrical Work','Other'],
  MAINTENANCE_TYPES:['Service','Wheel Alignment','Wheel Balancing','Tyre Rotation','Oil Change','Battery','Other'],
  BLOOD_GROUPS:     ['A+','A-','B+','B-','AB+','AB-','O+','O-'],
  PRIORITY_LEVELS:  ['High','Medium','Low'],
  REMINDER_TYPES:   ['Insurance','PUC','Service','Alignment','Battery','Tyre','Fastag','Other'],
  MATERIAL_TYPES:   ['TMT Bars','MS Plates','Iron Rods','Steel Coils','Angle Iron','Billets','Other'],
  LEAVE_TYPES:      ['Casual Leave','Sick Leave','Paid Leave','LWP','Comp Off'],
  TASK_FREQ:        [
    { val:'D',        label:'Daily' },
    { val:'W',        label:'Weekly' },
    { val:'M',        label:'Monthly' },
    { val:'One-time', label:'One-time' }
  ],
  TASK_TYPES:       ['Individual','Shared'],
  WEEK_DAYS:        ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  DEPT_LIST:        ['Fleet','Operations','Management','Finance','HR','Other'],
  ANNOUNCE_PRIORITY:['Normal','High','Urgent'],
};

// Shortcut for GAS URL
window.GAS_URL = window.APP_CONFIG.GAS_URL;
