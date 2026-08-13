// ============================================================
// ISE DRIVER APP — app.js
// Isha Steels Enterprises — Vehicle Operations Management
// Depends on: appconfig.js (load BEFORE this file)
// ============================================================

'use strict';

// ─── GLOBAL STATE ────────────────────────────────────────────
var _U       = null;   // logged-in user object
var _TOKEN   = null;   // auth token
var _DATA    = {};     // cached backend data
var _cbIdx   = 0;      // JSONP counter
var _VIEW    = null;   // current active view
var _refreshTimer = null;

// ─── JSONP API ───────────────────────────────────────────────
function _api(action, data, onOk, onErr) {
  var API = APP_CONFIG.GAS_URL;
  if (!API || API.indexOf('PASTE') !== -1) {
    _toast('⚠️ GAS URL not configured in appconfig.js', 'danger');
    if (onErr) onErr({ message: 'GAS_URL not set' });
    return;
  }

  var cbName = '_gcb' + (++_cbIdx);
  var timeout;

  window[cbName] = function(r) {
    clearTimeout(timeout);
    try { delete window[cbName]; } catch(e) {}
    var s = document.getElementById('_s_' + cbName);
    if (s) s.remove();
    if (r && r.success === false && r.error && r.error.indexOf('Login') !== -1) {
      _signOut(); return;
    }
    if (onOk) onOk(r);
  };

  timeout = setTimeout(function() {
    try { delete window[cbName]; } catch(e) {}
    var s = document.getElementById('_s_' + cbName);
    if (s) s.remove();
    if (onErr) onErr({ message: 'Request timeout. Internet check karo.' });
  }, 25000);

  var url = API + '?callback=' + cbName + '&payload=' +
    encodeURIComponent(JSON.stringify({
      action: action, data: data || {}, token: _TOKEN || ''
    }));

  var sc  = document.createElement('script');
  sc.id   = '_s_' + cbName;
  sc.src  = url;
  sc.onerror = function() {
    clearTimeout(timeout);
    try { delete window[cbName]; } catch(e) {}
    if (onErr) onErr({ message: 'Network error. GAS URL check karo.' });
  };
  document.body.appendChild(sc);
}

// ─── SESSION ─────────────────────────────────────────────────
function _saveSession() {
  try {
    localStorage.setItem(APP_CONFIG.SESSION_KEY,
      JSON.stringify({ user: _U, token: _TOKEN }));
  } catch(e) {}
}

function _loadSession() {
  try {
    var s = localStorage.getItem(APP_CONFIG.SESSION_KEY);
    if (!s) return false;
    var obj = JSON.parse(s);
    if (!obj || !obj.token) return false;
    _U     = obj.user;
    _TOKEN = obj.token;
    return true;
  } catch(e) { return false; }
}

function _clearSession() {
  try {
    localStorage.removeItem(APP_CONFIG.SESSION_KEY);
    localStorage.removeItem(APP_CONFIG.DATA_KEY);
    localStorage.removeItem(APP_CONFIG.DATA_TS_KEY);
  } catch(e) {}
}

function _saveCachedData() {
  try {
    localStorage.setItem(APP_CONFIG.DATA_KEY, JSON.stringify(_DATA));
    localStorage.setItem(APP_CONFIG.DATA_TS_KEY, Date.now().toString());
  } catch(e) {}
}

function _loadCachedData() {
  try {
    var ts = localStorage.getItem(APP_CONFIG.DATA_TS_KEY);
    if (!ts) return false;
    var age = (Date.now() - parseInt(ts)) / 60000;
    if (age > APP_CONFIG.REFRESH_MINS) return false;
    var d = localStorage.getItem(APP_CONFIG.DATA_KEY);
    if (!d) return false;
    _DATA = JSON.parse(d);
    return true;
  } catch(e) { return false; }
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Apply brand colors
  var r = document.documentElement.style;
  var c = APP_CONFIG.COLORS;
  r.setProperty('--color-primary',       c.primary);
  r.setProperty('--color-primary-dark',  c.primaryDark);
  r.setProperty('--color-primary-light', c.primaryLight);
  r.setProperty('--color-secondary',     c.secondary);
  r.setProperty('--color-surface',       c.surface);
  r.setProperty('--color-background',    c.background);
  r.setProperty('--color-border',        c.border);
  r.setProperty('--color-text',          c.textMain);
  r.setProperty('--color-text-sub',      c.textSub);
  r.setProperty('--color-success',       c.success);
  r.setProperty('--color-warning',       c.warning);
  r.setProperty('--color-danger',        c.danger);
  r.setProperty('--color-info',          c.info);

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { scope: './' })
      .catch(function(e) { console.warn('SW:', e); });
  }

  if (_loadSession() && _U) {
    _initApp();
  } else {
    _showLogin();
  }
});

// ─── LOGIN ────────────────────────────────────────────────────
function _showLogin() {
  document.getElementById('login-screen').style.display = '';
  document.getElementById('app-shell').style.display    = 'none';
}

function _doLogin() {
  var email = document.getElementById('inp-email').value.trim();
  var pass  = document.getElementById('inp-pass').value.trim();
  if (!email || !pass) { _toast('Email aur password dono bharo.', 'danger'); return; }

  _setLoginBusy(true);
  _api('login', { email: email, password: pass },
    function(r) {
      _setLoginBusy(false);
      if (!r.success) { _toast(r.error || 'Login fail.', 'danger'); return; }
      _U     = r.user;
      _TOKEN = r.token;
      _saveSession();
      _initApp();
    },
    function(e) {
      _setLoginBusy(false);
      _toast(e.message || 'Connection error.', 'danger');
    }
  );
}

function _setLoginBusy(busy) {
  var btn = document.getElementById('btn-login');
  if (!btn) return;
  btn.disabled    = busy;
  btn.textContent = busy ? 'Loading...' : 'Login';
}

// ─── APP INIT ─────────────────────────────────────────────────
function _initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').style.display    = '';

  // Set user info in header
  _qs('#user-name').textContent  = _U.name;
  _qs('#user-role').textContent  = _cap(_U.role);

  // Build bottom nav based on role
  _buildNav();

  // Load data
  if (_loadCachedData()) {
    _showView('dashboard');
    _refreshData(); // background refresh
  } else {
    _showLoader('Data load ho raha hai...');
    _refreshData(function() { _showView('dashboard'); });
  }

  // Auto-refresh timer
  if (_refreshTimer) clearInterval(_refreshTimer);
  _refreshTimer = setInterval(function() {
    _refreshData();
  }, APP_CONFIG.REFRESH_MINS * 60 * 1000);
}

function _refreshData(cb) {
  _api('getAllData', {},
    function(r) {
      if (r.success === false) { _toast(r.error, 'danger'); return; }
      delete r.success;
      delete r.timestamp;
      _DATA = r;
      _saveCachedData();
      _hideLoader();
      if (cb) cb();
      // Refresh current view if open
      if (_VIEW) _showView(_VIEW);
    },
    function(e) {
      _hideLoader();
      _toast('Data refresh fail: ' + e.message, 'danger');
      if (cb) cb();
    }
  );
}

function _signOut() {
  if (_refreshTimer) clearInterval(_refreshTimer);
  _U = null; _TOKEN = null; _DATA = {};
  _clearSession();
  _showLogin();
}

// ─── NAVIGATION ───────────────────────────────────────────────
function _buildNav() {
  var role    = _U.role;
  var modules = APP_CONFIG.ROLE_MODULES[role] || [];
  var nav     = _qs('#bottom-nav');
  nav.innerHTML = '';

  // Pick 5 most important for bottom nav
  var navItems = role === 'driver'
    ? ['my_dashboard', 'my_attendance', 'my_inspection', 'my_fuel', 'my_trips']
    : ['dashboard', 'vehicles', 'drivers', 'fuel', 'services'];

  navItems.forEach(function(key) {
    if (modules.indexOf(key) === -1) return;
    var m   = APP_CONFIG.MODULES[key];
    var btn = document.createElement('button');
    btn.className   = 'nav-btn';
    btn.id          = 'nav-' + key;
    btn.innerHTML   = '<span class="nav-icon">' + m.icon + '</span><span class="nav-label">' + m.label + '</span>';
    btn.onclick     = function() { _showView(key); };
    nav.appendChild(btn);
  });
}

function _showView(viewKey) {
  _VIEW = viewKey;

  // Update nav active state
  document.querySelectorAll('.nav-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  var nb = document.getElementById('nav-' + viewKey);
  if (nb) nb.classList.add('active');

  var main = _qs('#main-content');
  main.innerHTML = '';

  switch(viewKey) {
    case 'dashboard':     _renderDashboard(main); break;
    case 'my_dashboard':  _renderMyDashboard(main); break;
    case 'vehicles':      _renderVehicles(main); break;
    case 'drivers':       _renderDrivers(main); break;
    case 'attendance':    _renderAttendance(main); break;
    case 'my_attendance': _renderMyAttendance(main); break;
    case 'inspection':    _renderInspectionList(main); break;
    case 'my_inspection': _renderInspectionForm(main); break;
    case 'cleaning':      _renderCleaningList(main); break;
    case 'my_cleaning':   _renderCleaningForm(main); break;
    case 'fuel':          _renderFuelList(main); break;
    case 'my_fuel':       _renderFuelForm(main); break;
    case 'trips':         _renderTrips(main); break;
    case 'my_trips':      _renderTripForm(main); break;
    case 'dispatch':      _renderDispatch(main); break;
    case 'services':      _renderServices(main); break;
    case 'documents':     _renderDocuments(main); break;
    case 'reminders':     _renderReminders(main); break;
    case 'expenses':      _renderExpenses(main); break;
    case 'my_expenses':   _renderExpenseForm(main); break;
    case 'fastag':        _renderFastag(main); break;
    case 'kmlogs':        _renderKMLogs(main); break;
    case 'my_kmlogs':     _renderKMLogForm(main); break;
    case 'maintenance':   _renderMaintenance(main); break;
    case 'penalties':     _renderPenalties(main); break;
    case 'rewards':       _renderRewards(main); break;
    case 'auditlog':      _renderAuditLog(main); break;
    case 'users':         _renderUsers(main); break;
    default: main.innerHTML = '<p style="padding:2rem;color:var(--color-text-sub)">View coming soon...</p>';
  }
}

// ─── VIEWS ────────────────────────────────────────────────────

// ADMIN/MANAGER DASHBOARD
function _renderDashboard(el) {
  var vehicles   = _DATA.vehicles   || [];
  var drivers    = _DATA.drivers    || [];
  var fuel       = _DATA.fuel       || [];
  var services   = _DATA.services   || [];
  var reminders  = _DATA.reminders  || [];
  var attendance = _DATA.attendance || [];

  var activeVeh  = vehicles.filter(function(v){ return v.Status === 'Active'; }).length;
  var activeDrivers = drivers.filter(function(d){ return d.Status === 'Active'; }).length;
  var todayFuel  = fuel.filter(function(f){ return f.Date === _today(); });
  var fuelAmt    = todayFuel.reduce(function(s,f){ return s + (parseFloat(f.Amount)||0); }, 0);
  var pendingRem = reminders.filter(function(r){ return r.Status === 'Pending'; }).length;
  var todayAtt   = attendance.filter(function(a){ return a.Date === _today(); }).length;

  var expiring = vehicles.filter(function(v){
    return _daysTo(v.InsuranceExpiry) <= 30 || _daysTo(v.PUCExpiry) <= 15;
  });

  el.innerHTML = _pageHeader('📊 Dashboard') + '<div class="content-pad">' +

    '<div class="kpi-grid">' +
      _kpi('🚗', 'Total Vehicles', vehicles.length, '#2980B9') +
      _kpi('✅', 'Active Vehicles', activeVeh, '#27AE60') +
      _kpi('👤', 'Active Drivers', activeDrivers, '#8E44AD') +
      _kpi('🔔', 'Pending Alerts', pendingRem, pendingRem > 0 ? '#E74C3C' : '#27AE60') +
    '</div>' +
    '<div class="kpi-grid">' +
      _kpi('📋', "Today's Attendance", todayAtt, '#27AE60') +
      _kpi('⛽', "Today's Fuel Spend", '₹' + fuelAmt.toFixed(0), '#E67E22') +
      _kpi('🔧', 'Services Pending', services.filter(function(s){ return s.Status !== 'Completed'; }).length, '#D51515') +
      _kpi('🛠️', 'Maintenance Due', (_DATA.maintenance||[]).filter(function(m){ return m.Status === 'Pending'; }).length, '#E67E22') +
    '</div>' +

    (expiring.length ? '<div class="alert-card danger"><b>⚠️ Expiry Alerts</b><br>' +
      expiring.map(function(v){
        var ins = _daysTo(v.InsuranceExpiry), puc = _daysTo(v.PUCExpiry);
        var msgs = [];
        if(ins <= 30) msgs.push('Insurance: ' + ins + 'd');
        if(puc <= 15) msgs.push('PUC: ' + puc + 'd');
        return v.VehicleNo + ' — ' + msgs.join(', ');
      }).join('<br>') + '</div>' : '') +

    _sectionHeader('Recent Fuel Entries') +
    _table(['Date','Vehicle','Driver','Qty','Amount'],
      fuel.slice(-5).reverse().map(function(f){
        return [f.Date, _vnum(f.VehicleID), _dname(f.DriverID),
                (f.FuelQty||'') + 'L', '₹'+(f.Amount||'')];
      })) +

    _sectionHeader('Upcoming Reminders') +
    _table(['Vehicle','Type','Date','Priority'],
      reminders.filter(function(r){ return r.Status==='Pending'; }).slice(0,5).map(function(r){
        return [_vnum(r.VehicleID), r.ReminderType, r.ReminderDate,
                '<span class="badge badge-'+r.Priority.toLowerCase()+'">'+r.Priority+'</span>'];
      })) +
  '</div>';

  // Floating action: go to all modules
  el.innerHTML += _fab('☰', 'openAllModules()');
}

// DRIVER DASHBOARD
function _renderMyDashboard(el) {
  var att  = _DATA.myAttendance  || [];
  var fuel = _DATA.myFuel        || [];
  var ins  = _DATA.myInspections || [];
  var veh  = _U.assignedVehicle;

  el.innerHTML = _pageHeader('👋 ' + _U.name.split(' ')[0]) + '<div class="content-pad">' +

    (veh ? '<div class="vehicle-card">' +
      '<div class="vc-plate">' + (veh.VehicleNo || 'N/A') + '</div>' +
      '<div class="vc-detail">' + (veh.Brand||'') + ' ' + (veh.Model||'') +
        ' · ' + (veh.FuelType||'') + '</div>' +
      '<div class="vc-km">📏 ' + (veh.CurrentKM||'') + ' KM</div>' +
    '</div>' : '<div class="alert-card info">Koi vehicle assign nahi hai abhi.</div>') +

    '<div class="kpi-grid">' +
      _kpi('📋', 'Attendance (Month)', att.filter(function(a){
        return a.Date && a.Date.startsWith(_thisMonth()); }).length, '#27AE60') +
      _kpi('⛽', 'Fuel Entries', fuel.length, '#E67E22') +
      _kpi('🔍', 'Inspections', ins.length, '#D51515') +
      _kpi('🗺️', 'Trips', (_DATA.myTrips||[]).length, '#2980B9') +
    '</div>' +

    _sectionHeader('Quick Actions') +
    '<div class="quick-actions">' +
      _qaBtn('📋', 'Mark Attendance', "openAttForm()") +
      _qaBtn('🔍', 'Vehicle Inspection', "openInsForm()") +
      _qaBtn('🧽', 'Log Cleaning', "openClnForm()") +
      _qaBtn('⛽', 'Add Fuel', "openFuelForm()") +
      _qaBtn('🗺️', 'Log Trip', "openTripForm()") +
      _qaBtn('📏', 'KM Entry', "openKMForm()") +
    '</div>' +

    _sectionHeader('Recent Attendance') +
    _table(['Date','Status','In','Out'],
      att.slice(-5).reverse().map(function(a){
        return [a.Date,
          '<span class="badge badge-'+(a.Status||'').toLowerCase()+'">'+(a.Status||'')+'</span>',
          a.InTime, a.OutTime];
      })) +
  '</div>';
}

// VEHICLES LIST
function _renderVehicles(el) {
  var vehicles = _DATA.vehicles || [];
  el.innerHTML = _pageHeader('🚗 Vehicles',
    _U.role !== 'driver' ? '<button class="btn-sm btn-primary" onclick="openVehicleForm()">+ Add</button>' : '') +
    '<div class="content-pad">';

  vehicles.forEach(function(v) {
    var insD  = _daysTo(v.InsuranceExpiry);
    var pucD  = _daysTo(v.PUCExpiry);
    var alert = (insD <= 30 || pucD <= 15) ? '🔴' : '🟢';
    el.innerHTML += '<div class="list-card" onclick="openVehicleDetail(\'' + v.VehicleID + '\')">' +
      '<div class="lc-row">' +
        '<div><b class="plate-tag">' + (v.VehicleNo||'') + '</b>' +
          '<span class="lc-sub"> ' + (v.Brand||'') + ' ' + (v.Model||'') + '</span></div>' +
        '<div>' + alert + ' <span class="badge badge-' + (v.Status||'').toLowerCase() + '">' + (v.Status||'') + '</span></div>' +
      '</div>' +
      '<div class="lc-meta">' +
        '⛽ ' + (v.FuelType||'—') + ' &nbsp;|&nbsp; ' +
        '📏 ' + (v.CurrentKM||'—') + ' KM &nbsp;|&nbsp; ' +
        '🏷️ ₹' + (v.FastagBalance||'—') +
      '</div>' +
      '<div class="lc-meta">' +
        '🛡️ Ins: ' + (v.InsuranceExpiry||'—') +
        (insD <= 30 ? ' <b class="red">('+insD+'d)</b>' : '') +
        ' &nbsp;|&nbsp; 🌿 PUC: ' + (v.PUCExpiry||'—') +
        (pucD <= 15 ? ' <b class="red">('+pucD+'d)</b>' : '') +
      '</div>' +
    '</div>';
  });

  el.innerHTML += '</div>';
}

// DRIVERS LIST
function _renderDrivers(el) {
  var drivers = _DATA.drivers || [];
  el.innerHTML = _pageHeader('👤 Drivers',
    '<button class="btn-sm btn-primary" onclick="openDriverForm()">+ Add</button>') +
    '<div class="content-pad">';

  drivers.forEach(function(d) {
    el.innerHTML += '<div class="list-card" onclick="openDriverDetail(\'' + d.DriverID + '\')">' +
      '<div class="lc-row">' +
        '<div><b>' + (d.Name||'') + '</b>' +
          '<span class="lc-sub"> · DRV ID: ' + (d.DriverID||'') + '</span></div>' +
        '<span class="badge badge-' + (d.Status||'').toLowerCase() + '">' + (d.Status||'') + '</span>' +
      '</div>' +
      '<div class="lc-meta">📱 ' + (d.Mobile||'—') +
        ' &nbsp;|&nbsp; 🩸 ' + (d.BloodGroup||'—') +
        ' &nbsp;|&nbsp; 💰 ₹' + (d.Salary||'—') +
      '</div>' +
      '<div class="lc-meta">📄 Lic: ' + (d.LicenseNo||'—') + ' (Exp: ' + (d.LicenseExpiry||'—') + ')</div>' +
    '</div>';
  });
  el.innerHTML += '</div>';
}

// ATTENDANCE (admin)
function _renderAttendance(el) {
  var att = _DATA.attendance || [];
  var today = att.filter(function(a){ return a.Date === _today(); });
  el.innerHTML = _pageHeader('📋 Attendance') + '<div class="content-pad">' +
    _sectionHeader("Today's Log — " + _today()) +
    _table(['Driver','Vehicle','In','Out','Status','Location'],
      today.map(function(a){
        return [_dname(a.DriverID), _vnum(a.VehicleID), a.InTime, a.OutTime,
          '<span class="badge badge-'+(a.Status||'').toLowerCase()+'">'+(a.Status||'')+'</span>',
          a.Location];
      })) +
    _sectionHeader('All Entries') +
    _table(['Date','Driver','Status','In','Out'],
      att.slice(-20).reverse().map(function(a){
        return [a.Date, _dname(a.DriverID),
          '<span class="badge badge-'+(a.Status||'').toLowerCase()+'">'+(a.Status||'')+'</span>',
          a.InTime, a.OutTime];
      })) +
  '</div>';
}

// MY ATTENDANCE (driver)
function _renderMyAttendance(el) {
  var att = _DATA.myAttendance || [];
  el.innerHTML = _pageHeader('📋 My Attendance',
    '<button class="btn-sm btn-primary" onclick="openAttForm()">+ Mark</button>') +
    '<div class="content-pad">' +
    _table(['Date','Status','In Time','Out Time'],
      att.slice(-15).reverse().map(function(a){
        return [a.Date,
          '<span class="badge badge-'+(a.Status||'').toLowerCase()+'">'+(a.Status||'')+'</span>',
          a.InTime, a.OutTime];
      })) +
  '</div>';
}

// INSPECTION LIST (admin)
function _renderInspectionList(el) {
  var ins = _DATA.inspections || [];
  el.innerHTML = _pageHeader('🔍 Inspections') + '<div class="content-pad">' +
    _table(['Date','Vehicle','Driver','Status','Remarks'],
      ins.slice(-20).reverse().map(function(i){
        return [i.Date, _vnum(i.VehicleID), _dname(i.DriverID),
          '<span class="badge badge-'+(i.Status||'').toLowerCase()+'">'+(i.Status||'')+'</span>',
          i.Remarks];
      })) +
  '</div>';
}

// INSPECTION FORM (driver)
function _renderInspectionForm(el) {
  var checks = APP_CONFIG.INSPECTION_CHECKS;
  var checksHTML = checks.map(function(c){
    return '<div class="toggle-row">' +
      '<label>' + c.label + '</label>' +
      '<div class="toggle-group" id="tg-' + c.key + '">' +
        '<button class="toggle-btn active" onclick="setToggle(\'' + c.key + '\',\'Yes\',this)">✅ Yes</button>' +
        '<button class="toggle-btn" onclick="setToggle(\'' + c.key + '\',\'No\',this)">❌ No</button>' +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML = _pageHeader('🔍 Vehicle Inspection') + '<div class="content-pad">' +
    '<div class="form-card">' +
      _fGroup('Date', 'date', 'ins-date', _today()) +
      _fGroup('Remarks', 'text', 'ins-remarks', '', 'Optional notes...') +
      checksHTML +
      '<button class="btn-primary full-btn" onclick="submitInspection()">✅ Submit Inspection</button>' +
    '</div>' +
  '</div>';

  // init toggle state
  checks.forEach(function(c){ window['_toggle_' + c.key] = 'Yes'; });
}

// CLEANING LIST (admin)
function _renderCleaningList(el) {
  var clns = _DATA.cleaning || [];
  el.innerHTML = _pageHeader('🧽 Cleaning Logs') + '<div class="content-pad">' +
    _table(['Date','Vehicle','Driver','Status'],
      clns.slice(-20).reverse().map(function(c){
        return [c.Date, _vnum(c.VehicleID), _dname(c.DriverID),
          '<span class="badge badge-'+(c.Status||'').toLowerCase()+'">'+(c.Status||'')+'</span>'];
      })) +
  '</div>';
}

// CLEANING FORM (driver)
function _renderCleaningForm(el) {
  var checks = APP_CONFIG.CLEANING_CHECKS;
  var checksHTML = checks.map(function(c){
    return '<div class="toggle-row">' +
      '<label>' + c.label + '</label>' +
      '<div class="toggle-group" id="tg-' + c.key + '">' +
        '<button class="toggle-btn active" onclick="setToggle(\'' + c.key + '\',\'Yes\',this)">✅ Yes</button>' +
        '<button class="toggle-btn" onclick="setToggle(\'' + c.key + '\',\'No\',this)">❌ No</button>' +
      '</div>' +
    '</div>';
  }).join('');

  el.innerHTML = _pageHeader('🧽 Vehicle Cleaning') + '<div class="content-pad">' +
    '<div class="form-card">' +
      _fGroup('Date', 'date', 'cln-date', _today()) +
      checksHTML +
      '<button class="btn-primary full-btn" onclick="submitCleaning()">✅ Submit Cleaning Log</button>' +
    '</div>' +
  '</div>';
  checks.forEach(function(c){ window['_toggle_' + c.key] = 'Yes'; });
}

// FUEL LIST (admin/manager)
function _renderFuelList(el) {
  var fuel = _DATA.fuel || [];
  el.innerHTML = _pageHeader('⛽ Fuel Entries',
    '<button class="btn-sm btn-primary" onclick="openFuelForm()">+ Add</button>') +
    '<div class="content-pad">' +
    _table(['Date','Vehicle','Driver','Qty (L)','Amount','KM'],
      fuel.slice(-20).reverse().map(function(f){
        return [f.Date, _vnum(f.VehicleID), _dname(f.DriverID),
          f.FuelQty, '₹'+(f.Amount||''), f.KMReading];
      })) +
  '</div>';
}

// FUEL FORM
function _renderFuelForm(el) {
  var veh = _U.assignedVehicle;
  el.innerHTML = _pageHeader('⛽ Add Fuel Entry') + '<div class="content-pad">' +
    '<div class="form-card">' +
      _fGroup('Date', 'date', 'fuel-date', _today()) +
      _fGroup('Vehicle ID', 'text', 'fuel-vid', veh ? veh.VehicleID : '', 'VEH0001') +
      _fGroup('Current KM Reading', 'number', 'fuel-km', '', '45000') +
      _fGroup('Previous KM Reading', 'number', 'fuel-prevkm', '', '44500') +
      _fGroup('Fuel Qty (Litres)', 'number', 'fuel-qty', '', '25') +
      _fGroup('Amount (₹)', 'number', 'fuel-amt', '', '2500') +
      _fGroup('Pump Name', 'text', 'fuel-pump', '', 'HPCL, MG Road') +
      '<button class="btn-primary full-btn" onclick="submitFuel()">⛽ Add Fuel Entry</button>' +
    '</div>' +
  '</div>';
}

// TRIPS (admin)
function _renderTrips(el) {
  var trips = _DATA.trips || [];
  el.innerHTML = _pageHeader('🗺️ Vehicle Trips',
    '<button class="btn-sm btn-primary" onclick="openTripForm()">+ Add</button>') +
    '<div class="content-pad">' +
    _table(['Date','Vehicle','From','To','KM','Material'],
      trips.slice(-20).reverse().map(function(t){
        return [t.Date, _vnum(t.VehicleID), t.FromLocation, t.ToLocation,
          t.TotalKM, t.MaterialType];
      })) +
  '</div>';
}

// TRIP FORM
function _renderTripForm(el) {
  var veh = _U.assignedVehicle;
  var mats = APP_CONFIG.MATERIAL_TYPES.map(function(m){
    return '<option>' + m + '</option>';
  }).join('');
  el.innerHTML = _pageHeader('🗺️ Log Trip') + '<div class="content-pad">' +
    '<div class="form-card">' +
      _fGroup('Date', 'date', 'trp-date', _today()) +
      _fGroup('Vehicle ID', 'text', 'trp-vid', veh ? veh.VehicleID : '') +
      _fGroup('From Location', 'text', 'trp-from', '', 'Delhi Warehouse') +
      _fGroup('To Location', 'text', 'trp-to', '', 'Gurgaon Hub') +
      '<div class="f-group"><label>Material Type</label><select id="trp-mat">' + mats + '</select></div>' +
      _fGroup('Weight (MT)', 'number', 'trp-wt', '', '5.5') +
      _fGroup('Start KM', 'number', 'trp-skm', '', '45000') +
      _fGroup('End KM', 'number', 'trp-ekm', '', '45350') +
      _fGroup('Remarks', 'text', 'trp-rem', '', 'Optional') +
      '<button class="btn-primary full-btn" onclick="submitTrip()">🗺️ Submit Trip Log</button>' +
    '</div>' +
  '</div>';
}

// SERVICES
function _renderServices(el) {
  var svc = _DATA.services || [];
  el.innerHTML = _pageHeader('🔧 Vehicle Services',
    '<button class="btn-sm btn-primary" onclick="openServiceForm()">+ Add</button>') +
    '<div class="content-pad">';

  svc.slice(-15).reverse().forEach(function(s){
    el.innerHTML += '<div class="list-card">' +
      '<div class="lc-row">' +
        '<b>' + _vnum(s.VehicleID) + '</b>' +
        '<span class="badge badge-' + (s.Status||'').toLowerCase() + '">' + (s.Status||'') + '</span>' +
      '</div>' +
      '<div class="lc-meta">🔧 ' + (s.Issue||'') + ' &nbsp;·&nbsp; 🏪 ' + (s.GarageName||'') + '</div>' +
      '<div class="lc-meta">📅 ' + (s.ServiceDate||'') + ' &nbsp;|&nbsp; 💰 ₹' + (s.Amount||'') + '</div>' +
      '<div class="lc-meta">Next: ' + (s.NextServiceDate||'—') + ' / ' + (s.NextServiceKM||'—') + ' KM</div>' +
    '</div>';
  });
  el.innerHTML += '</div>';
}

// DOCUMENTS
function _renderDocuments(el) {
  var docs = _DATA.documents || [];
  el.innerHTML = _pageHeader('📄 Vehicle Documents',
    '<button class="btn-sm btn-primary" onclick="openDocForm()">+ Add</button>') +
    '<div class="content-pad">' +
    _table(['Vehicle','Type','Doc No','Expiry','Status'],
      docs.map(function(d){
        var days = _daysTo(d.ExpiryDate);
        var cls  = days <= 30 ? 'red' : '';
        return [_vnum(d.VehicleID), d.DocumentType, d.DocumentNumber,
          '<span class="' + cls + '">' + (d.ExpiryDate||'') + (days <= 30 ? ' ('+days+'d)' : '') + '</span>',
          '<span class="badge badge-'+(d.Status||'').toLowerCase()+'">'+(d.Status||'')+'</span>'];
      })) +
  '</div>';
}

// REMINDERS
function _renderReminders(el) {
  var rem = _DATA.reminders || [];
  el.innerHTML = _pageHeader('🔔 Reminders',
    '<button class="btn-sm btn-primary" onclick="openReminderForm()">+ Add</button>') +
    '<div class="content-pad">' +
    _table(['Vehicle','Type','Date','Priority','Status'],
      rem.map(function(r){
        return [_vnum(r.VehicleID), r.ReminderType, r.ReminderDate,
          '<span class="badge badge-'+(r.Priority||'').toLowerCase()+'">'+(r.Priority||'')+'</span>',
          '<span class="badge badge-'+(r.Status||'').toLowerCase()+'">'+(r.Status||'')+'</span>'];
      })) +
  '</div>';
}

// EXPENSES
function _renderExpenses(el) {
  var exp = _DATA.expenses || [];
  var total = exp.reduce(function(s,e){ return s + (parseFloat(e.Amount)||0); }, 0);
  el.innerHTML = _pageHeader('💸 Expenses',
    '<button class="btn-sm btn-primary" onclick="openExpenseForm()">+ Add</button>') +
    '<div class="content-pad">' +
    '<div class="kpi-grid">' +
      _kpi('💸', 'Total Expenses', '₹' + total.toFixed(0), '#E74C3C') +
      _kpi('📝', 'Total Entries', exp.length, '#2980B9') +
    '</div>' +
    _table(['Date','Vehicle','Type','Amount','Mode','Approved By'],
      exp.slice(-20).reverse().map(function(e){
        return [e.Date, _vnum(e.VehicleID), e.ExpenseType,
          '₹'+(e.Amount||''), e.PaymentMode, e.ApprovedBy];
      })) +
  '</div>';
}

// EXPENSE FORM
function _renderExpenseForm(el) {
  var types = APP_CONFIG.EXPENSE_TYPES.map(function(t){ return '<option>' + t + '</option>'; }).join('');
  var modes = APP_CONFIG.PAYMENT_MODES.map(function(m){ return '<option>' + m + '</option>'; }).join('');
  var veh   = _U.assignedVehicle;
  el.innerHTML = _pageHeader('💸 Add Expense') + '<div class="content-pad">' +
    '<div class="form-card">' +
      _fGroup('Date', 'date', 'exp-date', _today()) +
      _fGroup('Vehicle ID', 'text', 'exp-vid', veh ? veh.VehicleID : '') +
      '<div class="f-group"><label>Expense Type</label><select id="exp-type">' + types + '</select></div>' +
      _fGroup('Amount (₹)', 'number', 'exp-amt', '', '500') +
      '<div class="f-group"><label>Payment Mode</label><select id="exp-mode">' + modes + '</select></div>' +
      _fGroup('Remarks', 'text', 'exp-rem', '', 'Optional') +
      '<button class="btn-primary full-btn" onclick="submitExpense()">💸 Submit Expense</button>' +
    '</div>' +
  '</div>';
}

// FASTAG
function _renderFastag(el) {
  var txns = _DATA.fastag || [];
  el.innerHTML = _pageHeader('🏷️ Fastag Transactions',
    '<button class="btn-sm btn-primary" onclick="openFastagForm()">+ Add</button>') +
    '<div class="content-pad">';

  // Fastag balances per vehicle
  var balances = {};
  (_DATA.vehicles||[]).forEach(function(v){
    if (v.VehicleID) balances[v.VehicleID] = { no: v.VehicleNo, bal: parseFloat(v.FastagBalance)||0 };
  });

  el.innerHTML += '<div class="kpi-grid">';
  Object.keys(balances).slice(0,4).forEach(function(vid){
    var b = balances[vid];
    el.innerHTML += _kpi('🏷️', b.no, '₹' + b.bal.toFixed(0), b.bal < 500 ? '#E74C3C' : '#27AE60');
  });
  el.innerHTML += '</div>' +
    _table(['Date','Vehicle','Opening','Recharge','Closing','Remarks'],
      txns.slice(-15).reverse().map(function(t){
        return [t.Date, _vnum(t.VehicleID), '₹'+(t.OpeningBalance||''),
          '₹'+(t.RechargeAmount||''), '₹'+(t.ClosingBalance||''), t.Remarks];
      })) +
  '</div>';
}

// KM LOGS
function _renderKMLogs(el) {
  var logs = _DATA.kmLogs || [];
  el.innerHTML = _pageHeader('📏 KM Logs',
    '<button class="btn-sm btn-primary" onclick="openKMForm()">+ Add</button>') +
    '<div class="content-pad">' +
    _table(['Date','Vehicle','Odometer','By','Remarks'],
      logs.slice(-20).reverse().map(function(l){
        return [l.Date, _vnum(l.VehicleID), l.OdometerReading, l.EnteredBy, l.Remarks];
      })) +
  '</div>';
}

// KM LOG FORM
function _renderKMLogForm(el) {
  var veh = _U.assignedVehicle;
  el.innerHTML = _pageHeader('📏 KM Entry') + '<div class="content-pad">' +
    '<div class="form-card">' +
      _fGroup('Date', 'date', 'km-date', _today()) +
      _fGroup('Vehicle ID', 'text', 'km-vid', veh ? veh.VehicleID : '') +
      _fGroup('Odometer Reading (KM)', 'number', 'km-odo', veh ? veh.CurrentKM : '', '45000') +
      _fGroup('Remarks', 'text', 'km-rem', '', 'Morning reading') +
      '<button class="btn-primary full-btn" onclick="submitKMLog()">📏 Save KM Entry</button>' +
    '</div>' +
  '</div>';
}

// MAINTENANCE
function _renderMaintenance(el) {
  var maint = _DATA.maintenance || [];
  el.innerHTML = _pageHeader('🛠️ Maintenance Schedule',
    '<button class="btn-sm btn-primary" onclick="openMaintForm()">+ Add</button>') +
    '<div class="content-pad">';

  maint.forEach(function(m){
    var daysLeft = _daysTo(m.NextDueDate);
    var cls = daysLeft <= 30 ? 'danger' : daysLeft <= 60 ? 'warning' : '';
    el.innerHTML += '<div class="list-card">' +
      '<div class="lc-row">' +
        '<b>' + _vnum(m.VehicleID) + ' — ' + (m.MaintenanceType||'') + '</b>' +
        '<span class="badge badge-' + (m.Status||'').toLowerCase() + '">' + (m.Status||'') + '</span>' +
      '</div>' +
      '<div class="lc-meta">Last: ' + (m.LastDoneDate||'—') + ' @ ' + (m.LastDoneKM||'—') + ' KM</div>' +
      '<div class="lc-meta '+ cls + '">Next: ' + (m.NextDueDate||'—') + ' / ' + (m.NextDueKM||'—') + ' KM' +
        (daysLeft <= 60 ? ' <b>('+daysLeft+'d)</b>' : '') + '</div>' +
    '</div>';
  });
  el.innerHTML += '</div>';
}

// PENALTIES
function _renderPenalties(el) {
  var pens = _DATA.penalties || [];
  var total = pens.reduce(function(s,p){ return s + (parseFloat(p.Amount)||0); }, 0);
  el.innerHTML = _pageHeader('⚠️ Driver Penalties',
    '<button class="btn-sm btn-primary" onclick="openPenaltyForm()">+ Add</button>') +
    '<div class="content-pad">' +
    '<div class="kpi-grid">' +
      _kpi('⚠️', 'Total Penalties', pens.length, '#E74C3C') +
      _kpi('💸', 'Total Amount', '₹' + total.toFixed(0), '#E74C3C') +
    '</div>' +
    _table(['Date','Driver','Reason','Amount','Status'],
      pens.slice(-15).reverse().map(function(p){
        return [p.Date, _dname(p.DriverID), p.Reason, '₹'+(p.Amount||''),
          '<span class="badge badge-'+(p.Status||'').toLowerCase()+'">'+(p.Status||'')+'</span>'];
      })) +
  '</div>';
}

// REWARDS
function _renderRewards(el) {
  var rwds = _DATA.rewards || [];
  var total = rwds.reduce(function(s,r){ return s + (parseFloat(r.Amount)||0); }, 0);
  el.innerHTML = _pageHeader('🏆 Driver Rewards',
    '<button class="btn-sm btn-primary" onclick="openRewardForm()">+ Add</button>') +
    '<div class="content-pad">' +
    '<div class="kpi-grid">' +
      _kpi('🏆', 'Total Rewards', rwds.length, '#F1C40F') +
      _kpi('💰', 'Total Amount', '₹' + total.toFixed(0), '#27AE60') +
    '</div>' +
    _table(['Date','Driver','Reason','Amount','Status'],
      rwds.slice(-15).reverse().map(function(r){
        return [r.Date, _dname(r.DriverID), r.Reason, '₹'+(r.Amount||''),
          '<span class="badge badge-'+(r.Status||'').toLowerCase()+'">'+(r.Status||'')+'</span>'];
      })) +
  '</div>';
}

// AUDIT LOG
function _renderAuditLog(el) {
  var logs = _DATA.auditLogs || [];
  el.innerHTML = _pageHeader('📝 Audit Log') + '<div class="content-pad">' +
    _table(['Date/Time','Module','Action','Record','By'],
      logs.slice(-30).reverse().map(function(l){
        return [l.DateTime, l.Module, l.Action, l.RecordID, l.PerformedBy];
      })) +
  '</div>';
}

// USERS
function _renderUsers(el) {
  var users = _DATA.users || [];
  el.innerHTML = _pageHeader('👥 Users') + '<div class="content-pad">' +
    _table(['Name','Role','Email','Status'],
      users.map(function(u){
        return [u.Name, u.Role, u.Email,
          '<span class="badge badge-'+(u.Status||'').toLowerCase()+'">'+(u.Status||'')+'</span>'];
      })) +
  '</div>';
}

// DISPATCH
function _renderDispatch(el) {
  var disp = _DATA.dispatch || [];
  el.innerHTML = _pageHeader('📦 Dispatch',
    '<button class="btn-sm btn-primary" onclick="openDispatchForm()">+ Add</button>') +
    '<div class="content-pad">' +
    _table(['Trip ID','Customer','Material','Weight','Invoice','Loading','Delivery','Status'],
      disp.slice(-15).reverse().map(function(d){
        return [d.TripID, d.CustomerName, d.Material, d.Weight + ' MT',
          d.InvoiceNo, d.LoadingDate, d.DeliveryDate,
          '<span class="badge badge-'+(d.Status||'').toLowerCase().replace(/ /g,'-')+'">'+(d.Status||'')+'</span>'];
      })) +
  '</div>';
}

// ─── FORM SUBMIT FUNCTIONS ────────────────────────────────────
function submitAttendance(inOrOut) {
  var veh = _U.assignedVehicle;
  var now = new Date();
  var time = _pad(now.getHours()) + ':' + _pad(now.getMinutes());
  var data = {
    date:      _v('att-date') || _today(),
    vehicleID: veh ? veh.VehicleID : '',
    inTime:    inOrOut === 'in'  ? time : '',
    outTime:   inOrOut === 'out' ? time : '',
    status:    _v('att-status') || 'Present',
    location:  _v('att-loc') || '',
    gps:       ''
  };

  // Try to get GPS
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos){
      data.gps = pos.coords.latitude + ',' + pos.coords.longitude;
      _submitForm('addAttendance', data, '✅ Attendance marked!');
    }, function(){
      _submitForm('addAttendance', data, '✅ Attendance marked (no GPS)');
    });
  } else {
    _submitForm('addAttendance', data, '✅ Attendance marked!');
  }
}

function submitInspection() {
  var checks = {};
  APP_CONFIG.INSPECTION_CHECKS.forEach(function(c){
    checks[c.key] = window['_toggle_' + c.key] || 'No';
  });
  var data = Object.assign({
    date:    _v('ins-date') || _today(),
    remarks: _v('ins-remarks') || ''
  }, checks);
  _submitForm('addInspection', data, '✅ Inspection submitted!');
}

function submitCleaning() {
  var checks = {};
  APP_CONFIG.CLEANING_CHECKS.forEach(function(c){
    checks[c.key] = window['_toggle_' + c.key] || 'No';
  });
  var data = Object.assign({ date: _v('cln-date') || _today() }, checks);
  _submitForm('addCleaning', data, '✅ Cleaning log saved!');
}

function submitFuel() {
  var data = {
    date:       _v('fuel-date') || _today(),
    vehicleID:  _v('fuel-vid'),
    kmReading:  parseFloat(_v('fuel-km'))    || 0,
    previousKM: parseFloat(_v('fuel-prevkm'))|| 0,
    fuelQty:    parseFloat(_v('fuel-qty'))   || 0,
    amount:     parseFloat(_v('fuel-amt'))   || 0,
    pumpName:   _v('fuel-pump')
  };
  if (!data.vehicleID || !data.fuelQty || !data.amount) {
    _toast('Vehicle ID, Qty aur Amount zaroori hai.', 'danger'); return;
  }
  _submitForm('addFuel', data, '⛽ Fuel entry saved!');
}

function submitTrip() {
  var data = {
    date:         _v('trp-date') || _today(),
    vehicleID:    _v('trp-vid'),
    fromLocation: _v('trp-from'),
    toLocation:   _v('trp-to'),
    materialType: _v('trp-mat'),
    weight:       parseFloat(_v('trp-wt'))  || 0,
    startKM:      parseFloat(_v('trp-skm')) || 0,
    endKM:        parseFloat(_v('trp-ekm')) || 0,
    remarks:      _v('trp-rem')
  };
  _submitForm('addTrip', data, '🗺️ Trip logged!');
}

function submitExpense() {
  var data = {
    date:        _v('exp-date') || _today(),
    vehicleID:   _v('exp-vid'),
    expenseType: _v('exp-type'),
    amount:      parseFloat(_v('exp-amt')) || 0,
    paymentMode: _v('exp-mode'),
    remarks:     _v('exp-rem')
  };
  _submitForm('addExpense', data, '💸 Expense saved!');
}

function submitKMLog() {
  var data = {
    date:      _v('km-date') || _today(),
    vehicleID: _v('km-vid'),
    odometer:  parseFloat(_v('km-odo')) || 0,
    remarks:   _v('km-rem')
  };
  _submitForm('addKMLog', data, '📏 KM entry saved!');
}

function _submitForm(action, data, successMsg) {
  var btn = document.querySelector('.btn-primary.full-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  _api(action, data,
    function(r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
      if (!r.success) { _toast(r.error || 'Save fail', 'danger'); return; }
      _toast(successMsg, 'success');
      setTimeout(function(){ _refreshData(function(){ _showView(_VIEW); }); }, 1000);
    },
    function(e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
      _toast(e.message || 'Error', 'danger');
    }
  );
}

// ─── MODAL OPENER SHORTCUTS ───────────────────────────────────
function openAttForm()        { _showView('my_attendance'); }
function openInsForm()        { _showView('my_inspection'); }
function openClnForm()        { _showView('my_cleaning'); }
function openFuelForm()       { _showView(_U.role === 'driver' ? 'my_fuel' : 'fuel'); }
function openTripForm()       { _showView(_U.role === 'driver' ? 'my_trips' : 'trips'); }
function openKMForm()         { _showView(_U.role === 'driver' ? 'my_kmlogs' : 'kmlogs'); }
function openExpenseForm()    { _showView(_U.role === 'driver' ? 'my_expenses' : 'expenses'); }
function openVehicleForm()    { _toast('Coming soon: Add Vehicle form', 'info'); }
function openDriverForm()     { _toast('Coming soon: Add Driver form', 'info'); }
function openServiceForm()    { _toast('Coming soon: Add Service form', 'info'); }
function openDocForm()        { _toast('Coming soon: Add Document form', 'info'); }
function openReminderForm()   { _toast('Coming soon: Add Reminder form', 'info'); }
function openPenaltyForm()    { _toast('Coming soon: Add Penalty form', 'info'); }
function openRewardForm()     { _toast('Coming soon: Add Reward form', 'info'); }
function openDispatchForm()   { _toast('Coming soon: Add Dispatch form', 'info'); }
function openFastagForm()     { _toast('Coming soon: Fastag Recharge form', 'info'); }
function openMaintForm()      { _toast('Coming soon: Add Maintenance form', 'info'); }
function openVehicleDetail(id){ _toast('Vehicle detail: ' + id, 'info'); }
function openDriverDetail(id) { _toast('Driver detail: ' + id, 'info'); }

function openAllModules() {
  var role = _U.role;
  var modules = APP_CONFIG.ROLE_MODULES[role] || [];
  var html = '<div class="module-grid">';
  modules.forEach(function(key) {
    var m = APP_CONFIG.MODULES[key];
    if (!m) return;
    html += '<div class="module-tile" onclick="closeModal();_showView(\'' + key + '\')" style="--mc:' + m.color + '">' +
      '<div class="mt-icon">' + m.icon + '</div>' +
      '<div class="mt-label">' + m.label + '</div>' +
    '</div>';
  });
  html += '</div>';
  _modal('All Modules', html);
}

// Toggle helper for inspection/cleaning forms
function setToggle(key, val, btn) {
  window['_toggle_' + key] = val;
  var group = document.getElementById('tg-' + key);
  if (!group) return;
  group.querySelectorAll('.toggle-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
}

// ─── UI HELPERS ───────────────────────────────────────────────
function _pageHeader(title, actions) {
  return '<div class="page-header">' +
    '<h2 class="page-title">' + title + '</h2>' +
    (actions ? '<div class="page-actions">' + actions + '</div>' : '') +
  '</div>';
}

function _sectionHeader(text) {
  return '<div class="section-header">' + text + '</div>';
}

function _kpi(icon, label, value, color) {
  return '<div class="kpi-card" style="border-top-color:' + (color||'var(--color-primary)') + '">' +
    '<div class="kpi-icon">' + icon + '</div>' +
    '<div class="kpi-value" style="color:' + (color||'var(--color-primary)') + '">' + value + '</div>' +
    '<div class="kpi-label">' + label + '</div>' +
  '</div>';
}

function _table(headers, rows) {
  if (!rows || rows.length === 0)
    return '<div class="empty-state">Koi data nahi hai abhi.</div>';
  var th = headers.map(function(h){ return '<th>' + h + '</th>'; }).join('');
  var tr = rows.map(function(r){
    return '<tr>' + r.map(function(c){ return '<td>' + (c !== undefined && c !== null ? c : '—') + '</td>'; }).join('') + '</tr>';
  }).join('');
  return '<div class="table-wrap"><table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table></div>';
}

function _fGroup(label, type, id, val, ph) {
  return '<div class="f-group"><label>' + label + '</label>' +
    '<input type="' + type + '" id="' + id + '" value="' + (val||'') + '"' +
    (ph ? ' placeholder="' + ph + '"' : '') + '></div>';
}

function _qaBtn(icon, label, fn) {
  return '<button class="qa-btn" onclick="' + fn + '">' +
    '<span class="qa-icon">' + icon + '</span>' +
    '<span class="qa-label">' + label + '</span>' +
  '</button>';
}

function _fab(icon, fn) {
  return '<button class="fab" onclick="' + fn + '">' + icon + '</button>';
}

function _modal(title, body) {
  var m = document.getElementById('global-modal');
  _qs('#modal-title').textContent = title;
  _qs('#modal-body').innerHTML = body;
  m.style.display = 'flex';
}

function closeModal() {
  document.getElementById('global-modal').style.display = 'none';
}

function _toast(msg, type) {
  var t   = document.createElement('div');
  t.className = 'toast toast-' + (type||'info');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.classList.add('show'); }, 10);
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 300); }, 3000);
}

function _showLoader(msg) {
  var l = document.getElementById('loader');
  if (l) { l.style.display = 'flex'; l.querySelector('p').textContent = msg || 'Loading...'; }
}

function _hideLoader() {
  var l = document.getElementById('loader');
  if (l) l.style.display = 'none';
}

// ─── LOOKUP HELPERS ───────────────────────────────────────────
function _vnum(vehicleID) {
  var v = (_DATA.vehicles||[]).find(function(x){ return x.VehicleID === vehicleID; });
  return v ? v.VehicleNo : (vehicleID||'—');
}

function _dname(driverID) {
  var d = (_DATA.drivers||[]).find(function(x){ return x.DriverID === driverID; });
  return d ? d.Name : (driverID||'—');
}

function _daysTo(dateStr) {
  if (!dateStr) return 9999;
  var d = new Date(dateStr);
  return Math.ceil((d - new Date()) / 86400000);
}

function _today() {
  var d = new Date();
  return d.getFullYear() + '-' + _pad(d.getMonth()+1) + '-' + _pad(d.getDate());
}

function _thisMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + _pad(d.getMonth()+1);
}

function _pad(n) { return n < 10 ? '0'+n : ''+n; }
function _cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function _v(id)  { var el = document.getElementById(id); return el ? el.value : ''; }
function _qs(s)  { return document.querySelector(s); }
