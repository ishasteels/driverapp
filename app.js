// ============================================================
// ISE DRIVER APP — app.js  v2.0
// Isha Steels Enterprises — Vehicle Operations Management
// Depends on: appconfig.js (load BEFORE this file)
// ============================================================
'use strict';

// ─── GLOBAL STATE ────────────────────────────────────────────
var _U            = null;
var _TOKEN        = null;
var _DATA         = {};
var _cbIdx        = 0;
var _VIEW         = null;
var _refreshTimer = null;
var _searchQuery  = '';
var _filterState  = {};

// ─── JSONP API ───────────────────────────────────────────────
function _api(action, data, onOk, onErr) {
  var API = APP_CONFIG.GAS_URL;
  if (!API || API.indexOf('PASTE') !== -1) {
    _toast('⚠️ GAS URL configure nahi hai', 'danger');
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
    if (r && r.success === false && r.error && r.error.indexOf('Login') !== -1) { _signOut(); return; }
    if (onOk) onOk(r);
  };
  timeout = setTimeout(function() {
    try { delete window[cbName]; } catch(e) {}
    var s = document.getElementById('_s_' + cbName);
    if (s) s.remove();
    if (onErr) onErr({ message: 'Request timeout. Internet check karo.' });
  }, 25000);
  var url = API + '?callback=' + cbName + '&payload=' +
    encodeURIComponent(JSON.stringify({ action: action, data: data || {}, token: _TOKEN || '' }));
  var sc = document.createElement('script');
  sc.id = '_s_' + cbName; sc.src = url;
  sc.onerror = function() { clearTimeout(timeout); if (onErr) onErr({ message: 'Network error' }); };
  document.body.appendChild(sc);
}

// ─── SESSION ─────────────────────────────────────────────────
function _saveSession() {
  try { localStorage.setItem(APP_CONFIG.SESSION_KEY, JSON.stringify({ user: _U, token: _TOKEN })); } catch(e) {}
}
function _loadSession() {
  try {
    var s = localStorage.getItem(APP_CONFIG.SESSION_KEY);
    if (!s) return false;
    var obj = JSON.parse(s);
    if (!obj || !obj.token) return false;
    _U = obj.user; _TOKEN = obj.token; return true;
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
    if ((Date.now() - parseInt(ts)) / 60000 > APP_CONFIG.REFRESH_MINS) return false;
    var d = localStorage.getItem(APP_CONFIG.DATA_KEY);
    if (!d) return false;
    _DATA = JSON.parse(d); return true;
  } catch(e) { return false; }
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  var r = document.documentElement.style, c = APP_CONFIG.COLORS;
  Object.keys(c).forEach(function(k) {
    r.setProperty('--color-' + k.replace(/([A-Z])/g, '-$1').toLowerCase(), c[k]);
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function(e) { console.warn('SW:', e); });
  }
  if (_loadSession() && _U) { _initApp(); } else { _showLogin(); }
});

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
      _U = r.user; _TOKEN = r.token;
      _saveSession(); _initApp();
    },
    function(e) { _setLoginBusy(false); _toast(e.message || 'Connection error.', 'danger'); }
  );
}

function _setLoginBusy(busy) {
  var btn = document.getElementById('btn-login');
  if (!btn) return;
  btn.disabled = busy; btn.textContent = busy ? 'Logging in...' : 'Login';
}

function _initApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').style.display    = '';
  _qs('#user-name').textContent = _U.name;
  _qs('#user-role').textContent = _cap(_U.role);
  _buildNav();
  if (_loadCachedData()) {
    _showView(_U.role === 'driver' ? 'my_dashboard' : 'dashboard');
    _refreshData();
  } else {
    _showLoader('Data load ho raha hai...');
    _refreshData(function() { _showView(_U.role === 'driver' ? 'my_dashboard' : 'dashboard'); });
  }
  if (_refreshTimer) clearInterval(_refreshTimer);
  _refreshTimer = setInterval(_refreshData, APP_CONFIG.REFRESH_MINS * 60000);
}

function _refreshData(cb) {
  _api('getAllData', {},
    function(r) {
      if (r.success === false) { _toast(r.error, 'danger'); _hideLoader(); if (cb) cb(); return; }
      delete r.success; delete r.timestamp;
      _DATA = r; _saveCachedData(); _hideLoader();
      if (cb) cb(); else if (_VIEW) _showView(_VIEW);
    },
    function(e) { _hideLoader(); _toast('Refresh fail: ' + e.message, 'danger'); if (cb) cb(); }
  );
}

function _signOut() {
  if (_refreshTimer) clearInterval(_refreshTimer);
  _U = null; _TOKEN = null; _DATA = {};
  _clearSession(); _showLogin();
}

// ─── NAVIGATION ───────────────────────────────────────────────
function _buildNav() {
  var role = _U.role;
  var nav  = _qs('#bottom-nav');
  nav.innerHTML = '';
  var navItems = role === 'driver'
    ? ['my_dashboard', 'my_attendance', 'my_inspection', 'my_fuel', 'my_trips']
    : ['dashboard', 'vehicles', 'drivers', 'fuel', 'services'];
  navItems.forEach(function(key) {
    var m = APP_CONFIG.MODULES[key]; if (!m) return;
    var btn = document.createElement('button');
    btn.className = 'nav-btn'; btn.id = 'nav-' + key;
    btn.innerHTML = '<span class="nav-icon">' + m.icon + '</span><span class="nav-label">' + m.label + '</span>';
    btn.onclick   = function() { _showView(key); };
    nav.appendChild(btn);
  });
}

function _showView(viewKey, params) {
  _VIEW = viewKey; _searchQuery = ''; _filterState = {};
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  var nb = document.getElementById('nav-' + viewKey);
  if (nb) nb.classList.add('active');
  var main = _qs('#main-content');
  main.innerHTML = '';
  main.scrollTop = 0;
  switch(viewKey) {
    case 'dashboard':      _renderDashboard(main); break;
    case 'my_dashboard':   _renderMyDashboard(main); break;
    case 'vehicles':       _renderVehicles(main); break;
    case 'vehicle_detail': _renderVehicleDetail(main, params); break;
    case 'drivers':        _renderDrivers(main); break;
    case 'driver_detail':  _renderDriverDetail(main, params); break;
    case 'attendance':     _renderAttendance(main); break;
    case 'my_attendance':  _renderMyAttendance(main); break;
    case 'inspection':     _renderInspectionList(main); break;
    case 'my_inspection':  _renderInspectionForm(main); break;
    case 'cleaning':       _renderCleaningList(main); break;
    case 'my_cleaning':    _renderCleaningForm(main); break;
    case 'fuel':           _renderFuelList(main); break;
    case 'my_fuel':        _renderFuelForm(main); break;
    case 'trips':          _renderTrips(main); break;
    case 'my_trips':       _renderTripForm(main); break;
    case 'dispatch':       _renderDispatch(main); break;
    case 'services':       _renderServices(main); break;
    case 'service_form':   _renderServiceForm(main); break;
    case 'documents':      _renderDocuments(main); break;
    case 'reminders':      _renderReminders(main); break;
    case 'expenses':       _renderExpenses(main); break;
    case 'my_expenses':    _renderExpenseForm(main); break;
    case 'fastag':         _renderFastag(main); break;
    case 'fastag_form':    _renderFastagForm(main); break;
    case 'kmlogs':         _renderKMLogs(main); break;
    case 'my_kmlogs':      _renderKMLogForm(main); break;
    case 'maintenance':    _renderMaintenance(main); break;
    case 'penalties':      _renderPenalties(main); break;
    case 'rewards':        _renderRewards(main); break;
    case 'auditlog':       _renderAuditLog(main); break;
    case 'users':          _renderUsers(main); break;
    case 'vehicle_form':   _renderVehicleForm(main); break;
    case 'driver_form':    _renderDriverForm(main); break;
    case 'settings':       _renderSettings(main); break;
    default: main.innerHTML = _emptyState('🚧', 'Coming Soon', 'Yeh view jald aa raha hai');
  }
}

// ═══════════════════════════════════════════════════════════════
// VIEWS
// ═══════════════════════════════════════════════════════════════

// ── ADMIN DASHBOARD ───────────────────────────────────────────
function _renderDashboard(el) {
  var vehicles   = _DATA.vehicles   || [];
  var drivers    = _DATA.drivers    || [];
  var fuel       = _DATA.fuel       || [];
  var services   = _DATA.services   || [];
  var reminders  = _DATA.reminders  || [];
  var attendance = _DATA.attendance || [];
  var expenses   = _DATA.expenses   || [];

  var activeVeh     = vehicles.filter(function(v){ return v.Status === 'Active'; }).length;
  var activeDrivers = drivers.filter(function(d){ return d.Status === 'Active'; }).length;
  var todayFuel     = fuel.filter(function(f){ return f.Date === _today(); });
  var fuelAmt       = todayFuel.reduce(function(s,f){ return s + (parseFloat(f.Amount)||0); }, 0);
  var pendingRem    = reminders.filter(function(r){ return r.Status === 'Pending'; }).length;
  var todayAtt      = attendance.filter(function(a){ return a.Date === _today(); }).length;
  var monthExp      = expenses.filter(function(e){ return (e.Date||'').startsWith(_thisMonth()); })
                              .reduce(function(s,e){ return s + (parseFloat(e.Amount)||0); }, 0);
  var svcPending    = services.filter(function(s){ return s.Status !== 'Completed'; }).length;

  var expiring = vehicles.filter(function(v){
    return _daysTo(v.InsuranceExpiry) <= 30 || _daysTo(v.PUCExpiry) <= 15;
  });

  // Last 7 days fuel spend for mini-trend
  var trend = _last7DaysFuel(fuel);

  el.innerHTML = _pageHeader('📊 Dashboard') +
  '<div class="content-pad">' +

  // Hero stats row
  '<div class="hero-stats">' +
    _heroStat('🚗', vehicles.length, 'Vehicles', '#2980B9') +
    _heroStat('👤', activeDrivers, 'Drivers', '#8E44AD') +
    _heroStat('🔔', pendingRem, 'Alerts', pendingRem > 0 ? '#E74C3C' : '#27AE60') +
    _heroStat('📋', todayAtt, "Today's Att.", '#27AE60') +
  '</div>' +

  // Finance strip
  '<div class="finance-strip">' +
    '<div class="fs-item"><div class="fs-label">Today\'s Fuel</div><div class="fs-val">₹' + fuelAmt.toFixed(0) + '</div></div>' +
    '<div class="fs-sep"></div>' +
    '<div class="fs-item"><div class="fs-label">Month Expense</div><div class="fs-val">₹' + _abbr(monthExp) + '</div></div>' +
    '<div class="fs-sep"></div>' +
    '<div class="fs-item"><div class="fs-label">Services Due</div><div class="fs-val">' + svcPending + '</div></div>' +
    '<div class="fs-sep"></div>' +
    '<div class="fs-item"><div class="fs-label">Active Vehicles</div><div class="fs-val">' + activeVeh + '</div></div>' +
  '</div>' +

  // Expiry alerts
  (expiring.length ? '<div class="alert-card danger">' +
    '<div class="ac-title">⚠️ Expiry Alerts (' + expiring.length + ')</div>' +
    expiring.map(function(v){
      var ins = _daysTo(v.InsuranceExpiry), puc = _daysTo(v.PUCExpiry);
      var msgs = [];
      if (ins <= 30) msgs.push('🛡️ Insurance: ' + ins + 'd');
      if (puc <= 15) msgs.push('🌿 PUC: ' + puc + 'd');
      return '<div class="ac-row"><b class="plate-tag">' + v.VehicleNo + '</b> ' + msgs.join(' · ') + '</div>';
    }).join('') + '</div>' : '') +

  // Fuel trend chart
  '<div class="chart-card">' +
    '<div class="cc-title">⛽ Fuel Spend — Last 7 Days</div>' +
    '<canvas id="fuelChart" height="80"></canvas>' +
  '</div>' +

  // Today's attendance
  _sectionHeader('Today\'s Attendance — ' + _today()) +
  (todayAtt === 0
    ? _emptyState('📋', 'No Attendance Yet', 'Aaj ka koi record nahi mila')
    : _table(['Driver','Vehicle','In','Out','Status'],
        attendance.filter(function(a){ return a.Date === _today(); }).map(function(a){
          return [_dname(a.DriverID), _vnum(a.VehicleID), a.InTime||'—', a.OutTime||'—',
            _badge(a.Status)];
        }))) +

  // Recent fuel
  _sectionHeader('Recent Fuel Entries') +
  _table(['Date','Vehicle','Qty','Amount','Mileage'],
    fuel.slice(-5).reverse().map(function(f){
      var m = parseFloat(f.Mileage||0);
      return [f.Date, _vnum(f.VehicleID),
        (f.FuelQty||'') + ' L', '₹' + (f.Amount||''),
        m > 0 ? (m < 7 ? '<span class="red">' + m + ' km/L</span>' : m + ' km/L') : '—'];
    })) +

  // Pending reminders
  _sectionHeader('Upcoming Reminders') +
  _table(['Vehicle','Type','Date','Priority'],
    reminders.filter(function(r){ return r.Status === 'Pending'; }).slice(0,6).map(function(r){
      return [_vnum(r.VehicleID), r.ReminderType, r.ReminderDate, _badge(r.Priority)];
    })) +

  '</div>' + _fab('☰', 'openAllModules()');

  // Draw fuel chart after DOM ready
  setTimeout(function() { _drawFuelChart(trend); }, 50);
}

function _last7DaysFuel(fuel) {
  var days = [], today = new Date();
  for (var i = 6; i >= 0; i--) {
    var d = new Date(today); d.setDate(d.getDate() - i);
    var ds = d.getFullYear() + '-' + _pad(d.getMonth()+1) + '-' + _pad(d.getDate());
    var amt = fuel.filter(function(f){ return f.Date === ds; })
                  .reduce(function(s,f){ return s + (parseFloat(f.Amount)||0); }, 0);
    days.push({ label: _pad(d.getDate()) + '/' + _pad(d.getMonth()+1), amt: amt });
  }
  return days;
}

function _drawFuelChart(trend) {
  var canvas = document.getElementById('fuelChart');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.offsetWidth || 300;
  canvas.width = W; canvas.height = 80;
  var max = Math.max.apply(null, trend.map(function(t){ return t.amt; })) || 1;
  var barW = (W - 40) / trend.length;
  ctx.clearRect(0, 0, W, 80);
  trend.forEach(function(t, i) {
    var barH = Math.max(4, (t.amt / max) * 55);
    var x = 20 + i * barW + barW * 0.15;
    var bw = barW * 0.7;
    // Bar
    var grad = ctx.createLinearGradient(0, 80 - barH, 0, 80);
    grad.addColorStop(0, '#D51515');
    grad.addColorStop(1, '#FF6B6B');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, 80 - barH - 14, bw, barH, 3)
                  : ctx.rect(x, 80 - barH - 14, bw, barH);
    ctx.fill();
    // Label
    ctx.fillStyle = '#999'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(t.label, x + bw/2, 78);
    if (t.amt > 0) {
      ctx.fillStyle = '#2B2B2B'; ctx.font = 'bold 9px sans-serif';
      ctx.fillText('₹' + _abbr(t.amt), x + bw/2, 80 - barH - 17);
    }
  });
}

// ── DRIVER DASHBOARD ──────────────────────────────────────────
function _renderMyDashboard(el) {
  var att  = _DATA.myAttendance  || [];
  var fuel = _DATA.myFuel        || [];
  var ins  = _DATA.myInspections || [];
  var veh  = _U.assignedVehicle;
  var monthAtt = att.filter(function(a){ return (a.Date||'').startsWith(_thisMonth()); });
  var presentDays = monthAtt.filter(function(a){ return a.Status === 'Present'; }).length;
  var penalties = _DATA.myPenalties || [];
  var rewards   = _DATA.myRewards   || [];

  el.innerHTML = _pageHeader('👋 Namaskar, ' + _U.name.split(' ')[0] + '!') +
  '<div class="content-pad">' +

  // My vehicle card — rich version
  (veh
    ? '<div class="my-vehicle-card" onclick="_showView(\'vehicles\')">' +
        '<div class="mvc-left">' +
          '<div class="mvc-plate">' + (veh.VehicleNo || 'N/A') + '</div>' +
          '<div class="mvc-brand">' + (veh.Brand||'') + ' ' + (veh.Model||'') + '</div>' +
          '<div class="mvc-meta">' + (veh.FuelType||'') + ' · ' + (veh.VehicleType||'') + '</div>' +
        '</div>' +
        '<div class="mvc-right">' +
          '<div class="mvc-km">' + _abbr(parseFloat(veh.CurrentKM||0)) + '</div>' +
          '<div class="mvc-km-label">KM</div>' +
          '<div class="mvc-fastag">🏷️ ₹' + (veh.FastagBalance||0) + '</div>' +
        '</div>' +
      '</div>'
    : '<div class="alert-card info">Koi vehicle assign nahi hai abhi. Admin se contact karo.</div>') +

  // This month stats
  '<div class="month-strip">' +
    '<div class="ms-item"><div class="ms-val">' + presentDays + '</div><div class="ms-label">Present</div></div>' +
    '<div class="ms-item"><div class="ms-val">' + fuel.length + '</div><div class="ms-label">Fuel Logs</div></div>' +
    '<div class="ms-item"><div class="ms-val">' + ins.length + '</div><div class="ms-label">Inspections</div></div>' +
    '<div class="ms-item"><div class="ms-val">' + (_DATA.myTrips||[]).length + '</div><div class="ms-label">Trips</div></div>' +
  '</div>' +

  // Pending alerts for driver
  (penalties.filter(function(p){ return p.Status === 'Pending'; }).length
    ? '<div class="alert-card danger"><div class="ac-title">⚠️ Pending Penalty</div>' +
        penalties.filter(function(p){ return p.Status === 'Pending'; }).map(function(p){
          return '<div class="ac-row">₹' + (p.Amount||0) + ' — ' + (p.Reason||'') + '</div>';
        }).join('') + '</div>'
    : '') +
  (rewards.filter(function(r){ return r.Status === 'Pending'; }).length
    ? '<div class="alert-card" style="background:#FEF9E7;border-left-color:#F1C40F">' +
        '<div class="ac-title">🏆 Reward Pending</div>' +
        rewards.filter(function(r){ return r.Status === 'Pending'; }).map(function(r){
          return '<div class="ac-row">₹' + (r.Amount||0) + ' — ' + (r.Reason||'') + '</div>';
        }).join('') + '</div>'
    : '') +

  // Quick actions — big tappable buttons
  _sectionHeader('Quick Actions') +
  '<div class="big-actions">' +
    _bigAction('📋', 'Mark Attendance', 'openAttModal()', '#27AE60') +
    _bigAction('🔍', 'Inspection', 'openInsForm()', '#D51515') +
    _bigAction('🧽', 'Cleaning', 'openClnForm()', '#16A085') +
    _bigAction('⛽', 'Fuel Entry', 'openFuelForm()', '#E67E22') +
    _bigAction('🗺️', 'Log Trip', 'openTripForm()', '#2980B9') +
    _bigAction('📏', 'KM Entry', 'openKMForm()', '#8E44AD') +
  '</div>' +

  // Recent attendance
  _sectionHeader('This Month\'s Attendance') +
  _attendanceCalendar(att) +

  // Recent fuel
  _sectionHeader('My Recent Fuel Entries') +
  _table(['Date','Qty','Amount','Mileage'],
    fuel.slice(-5).reverse().map(function(f){
      var m = parseFloat(f.Mileage||0);
      return [f.Date, (f.FuelQty||'')+'L', '₹'+(f.Amount||''),
        m > 0 ? (m < 7 ? '<span class="red">'+m+'</span>' : m) : '—'];
    })) +

  '</div>';
}

// Mini attendance calendar (dots)
function _attendanceCalendar(att) {
  var today = new Date();
  var year  = today.getFullYear(), month = today.getMonth();
  var days  = new Date(year, month+1, 0).getDate();
  var firstDay = new Date(year, month, 1).getDay();
  var attMap = {};
  att.forEach(function(a) { attMap[a.Date] = a.Status; });
  var html = '<div class="att-cal">';
  ['S','M','T','W','T','F','S'].forEach(function(d) {
    html += '<div class="cal-head">' + d + '</div>';
  });
  for (var i = 0; i < firstDay; i++) html += '<div class="cal-cell"></div>';
  for (var d2 = 1; d2 <= days; d2++) {
    var ds = year + '-' + _pad(month+1) + '-' + _pad(d2);
    var st = attMap[ds];
    var cls = st === 'Present' ? 'cal-present'
            : st === 'Absent'  ? 'cal-absent'
            : st === 'Late'    ? 'cal-late'
            : d2 === today.getDate() ? 'cal-today' : '';
    html += '<div class="cal-cell ' + cls + '" title="' + (st||ds) + '">' + d2 + '</div>';
  }
  return html + '</div>';
}

// ── VEHICLES ──────────────────────────────────────────────────
function _renderVehicles(el) {
  var vehicles = _DATA.vehicles || [];
  el.innerHTML = _pageHeader('🚗 Vehicles',
    _U.role !== 'driver'
      ? '<button class="btn-sm btn-primary" onclick="_showView(\'vehicle_form\')">+ Add</button>' : '') +
  _searchBar('vehSearch', 'Search by number, brand, model...', 'filterVehicles()') +
  '<div class="content-pad" id="veh-list">';

  _renderVehicleCards(el.querySelector('#veh-list'), vehicles, '');
  el.innerHTML += '</div>';
}

function _renderVehicleCards(container, vehicles, query) {
  var filtered = query
    ? vehicles.filter(function(v){
        var q = query.toLowerCase();
        return (v.VehicleNo||'').toLowerCase().includes(q) ||
               (v.Brand||'').toLowerCase().includes(q) ||
               (v.Model||'').toLowerCase().includes(q) ||
               (v.FuelType||'').toLowerCase().includes(q);
      })
    : vehicles;

  if (filtered.length === 0) {
    container.innerHTML = _emptyState('🔍', 'Koi vehicle nahi mila', 'Search term badlo');
    return;
  }

  container.innerHTML = filtered.map(function(v) {
    var insD = _daysTo(v.InsuranceExpiry);
    var pucD = _daysTo(v.PUCExpiry);
    var health = insD > 30 && pucD > 15 ? 'good' : insD > 7 && pucD > 5 ? 'warn' : 'bad';
    var healthColor = health === 'good' ? '#27AE60' : health === 'warn' ? '#F39C12' : '#E74C3C';
    var healthLabel = health === 'good' ? 'OK' : health === 'warn' ? 'Alert' : 'Critical';

    return '<div class="veh-card" onclick="_showView(\'vehicle_detail\',\'' + v.VehicleID + '\')">' +
      '<div class="vc2-header">' +
        '<div class="vc2-plate-wrap">' +
          '<div class="vc2-plate">' + (v.VehicleNo||'—') + '</div>' +
          '<div class="vc2-brand">' + (v.Brand||'') + ' ' + (v.Model||'') + '</div>' +
        '</div>' +
        '<div class="vc2-health" style="background:' + healthColor + '20;color:' + healthColor + '">' +
          '<span class="vc2-dot" style="background:' + healthColor + '"></span>' + healthLabel +
        '</div>' +
      '</div>' +
      '<div class="vc2-pills">' +
        '<span class="pill">⛽ ' + (v.FuelType||'—') + '</span>' +
        '<span class="pill">🚗 ' + (v.VehicleType||'—') + '</span>' +
        '<span class="pill">🏢 ' + (v.OwnershipType||'—') + '</span>' +
      '</div>' +
      '<div class="vc2-stats">' +
        '<div class="vc2-stat"><div class="vs-val">' + _abbr(parseFloat(v.CurrentKM||0)) + '</div><div class="vs-label">KM</div></div>' +
        '<div class="vc2-stat"><div class="vs-val">₹' + (v.FastagBalance||0) + '</div><div class="vs-label">Fastag</div></div>' +
        '<div class="vc2-stat ' + (insD <= 30 ? 'red' : '') + '"><div class="vs-val">' + insD + 'd</div><div class="vs-label">Insurance</div></div>' +
        '<div class="vc2-stat ' + (pucD <= 15 ? 'red' : '') + '"><div class="vs-val">' + pucD + 'd</div><div class="vs-label">PUC</div></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function filterVehicles() {
  var q = document.getElementById('vehSearch').value.trim();
  _renderVehicleCards(_qs('#veh-list'), _DATA.vehicles || [], q);
}

// ── VEHICLE DETAIL ────────────────────────────────────────────
function _renderVehicleDetail(el, vehicleID) {
  var v = (_DATA.vehicles||[]).find(function(x){ return x.VehicleID === vehicleID; });
  if (!v) { el.innerHTML = _emptyState('❌', 'Vehicle nahi mila', ''); return; }

  var fuelHistory = (_DATA.fuel||[]).filter(function(f){ return f.VehicleID === vehicleID; });
  var svcHistory  = (_DATA.services||[]).filter(function(s){ return s.VehicleID === vehicleID; });
  var docs        = (_DATA.documents||[]).filter(function(d){ return d.VehicleID === vehicleID; });
  var trips       = (_DATA.trips||[]).filter(function(t){ return t.VehicleID === vehicleID; });
  var expenses    = (_DATA.expenses||[]).filter(function(e){ return e.VehicleID === vehicleID; });
  var insD = _daysTo(v.InsuranceExpiry), pucD = _daysTo(v.PUCExpiry);
  var driver = (_DATA.drivers||[]).find(function(d){ return d.DriverID === v.AssignedDriverID; });
  var totalFuelCost = fuelHistory.reduce(function(s,f){ return s + (parseFloat(f.Amount)||0); }, 0);
  var totalExpCost  = expenses.reduce(function(s,e){ return s + (parseFloat(e.Amount)||0); }, 0);

  el.innerHTML = _pageHeader(v.VehicleNo, '<button class="btn-sm btn-ghost" onclick="history.back()">← Back</button>') +
  '<div class="content-pad">' +

  // Big vehicle card
  '<div class="vd-hero">' +
    '<div class="vd-plate">' + v.VehicleNo + '</div>' +
    '<div class="vd-name">' + (v.Brand||'') + ' ' + (v.Model||'') + ' · ' + (v.FuelType||'') + '</div>' +
    '<div class="vd-pills">' +
      _badge(v.Status) +
      '<span class="pill">' + (v.VehicleType||'—') + '</span>' +
      '<span class="pill">' + (v.OwnershipType||'—') + '</span>' +
    '</div>' +
  '</div>' +

  // Assigned driver
  (driver ? '<div class="list-card" style="margin-bottom:.6rem" onclick="_showView(\'driver_detail\',\'' + driver.DriverID + '\')">' +
    '<div class="lc-row"><b>👤 Assigned Driver</b><span class="badge badge-active">Active</span></div>' +
    '<div class="lc-meta"><b>' + driver.Name + '</b> · 📱 ' + driver.Mobile + ' · 🩸 ' + (driver.BloodGroup||'—') + '</div>' +
  '</div>' : '<div class="alert-card info">Koi driver assign nahi hai.</div>') +

  // Stats grid
  '<div class="vd-stats">' +
    _vdStat('📏', _abbr(parseFloat(v.CurrentKM||0)) + ' KM', 'Odometer') +
    _vdStat('⛽', fuelHistory.length, 'Fuel Logs') +
    _vdStat('🔧', svcHistory.length, 'Services') +
    _vdStat('🗺️', trips.length, 'Trips') +
    _vdStat('💸', '₹' + _abbr(totalFuelCost + totalExpCost), 'Total Cost') +
    _vdStat('🏷️', '₹' + (v.FastagBalance||0), 'Fastag Bal') +
  '</div>' +

  // Document status
  _sectionHeader('Document Status') +
  '<div class="doc-status-grid">' +
    _docStatus('🛡️', 'Insurance', v.InsuranceExpiry, insD) +
    _docStatus('🌿', 'PUC', v.PUCExpiry, pucD) +
    _docStatus('📄', 'Registration', v.RegistrationNo, null) +
  '</div>' +

  // Technical details
  _sectionHeader('Technical Details') +
  '<div class="detail-grid">' +
    _detailRow('Engine No', v.EngineNo) +
    _detailRow('Chassis No', v.ChassisNo) +
    _detailRow('Fastag No', v.FastagNo) +
    _detailRow('Reg No', v.RegistrationNo) +
    _detailRow('Added On', v.CreatedOn) +
  '</div>' +

  // Fuel history
  _sectionHeader('Recent Fuel History') +
  _table(['Date','Qty','Amount','Mileage','Pump'],
    fuelHistory.slice(-6).reverse().map(function(f){
      var m = parseFloat(f.Mileage||0);
      return [f.Date, (f.FuelQty||'')+'L', '₹'+(f.Amount||''),
        m > 0 ? (m < 7 ? '<span class="red">'+m+' km/L</span>' : m+' km/L') : '—',
        f.PumpName||'—'];
    })) +

  // Service history
  _sectionHeader('Service History') +
  _table(['Date','Type','Issue','Amount','Status'],
    svcHistory.slice(-5).reverse().map(function(s){
      return [s.ServiceDate, s.ServiceType||'—', s.Issue||'—', '₹'+(s.Amount||''), _badge(s.Status)];
    })) +

  // Documents list
  (docs.length ? _sectionHeader('Documents') +
  _table(['Type','Doc No','Expiry','Status'],
    docs.map(function(d){
      var dd = _daysTo(d.ExpiryDate);
      return [d.DocumentType, d.DocumentNumber,
        '<span class="' + (dd <= 30 ? 'red' : '') + '">' + (d.ExpiryDate||'—') + (dd <= 30 ? ' ('+dd+'d)' : '') + '</span>',
        _badge(d.Status)];
    })) : '') +

  // Action buttons
  '<div class="action-btns">' +
    ((_U.role === 'admin' || _U.role === 'manager')
      ? '<button class="btn-action" onclick="_showView(\'service_form\')">🔧 Log Service</button>' +
        '<button class="btn-action" onclick="_showView(\'fastag_form\')">🏷️ Recharge Fastag</button>'
      : '') +
  '</div>' +

  '</div>';
}

function _docStatus(icon, label, val, days) {
  var cls = days === null ? 'ok' : days <= 0 ? 'bad' : days <= 30 ? 'warn' : 'ok';
  var color = cls === 'ok' ? '#27AE60' : cls === 'warn' ? '#F39C12' : '#E74C3C';
  return '<div class="doc-status-card" style="border-top-color:' + color + '">' +
    '<div class="dsc-icon">' + icon + '</div>' +
    '<div class="dsc-label">' + label + '</div>' +
    '<div class="dsc-val" style="color:' + color + '">' + (val||'N/A') + '</div>' +
    (days !== null ? '<div class="dsc-days" style="color:' + color + '">' + (days <= 0 ? 'EXPIRED' : days + ' days') + '</div>' : '') +
  '</div>';
}

function _vdStat(icon, val, label) {
  return '<div class="vd-stat-card"><div class="vds-icon">' + icon + '</div>' +
    '<div class="vds-val">' + val + '</div><div class="vds-label">' + label + '</div></div>';
}

// ── DRIVERS ───────────────────────────────────────────────────
function _renderDrivers(el) {
  var drivers = _DATA.drivers || [];
  el.innerHTML = _pageHeader('👤 Drivers',
    '<button class="btn-sm btn-primary" onclick="_showView(\'driver_form\')">+ Add</button>') +
  _searchBar('drvSearch', 'Search by name, mobile, license...', 'filterDrivers()') +
  '<div class="content-pad" id="drv-list">';
  _renderDriverCards(_qs('#drv-list'), drivers, '');
  el.innerHTML += '</div>';
}

function _renderDriverCards(container, drivers, query) {
  var filtered = query
    ? drivers.filter(function(d){
        var q = query.toLowerCase();
        return (d.Name||'').toLowerCase().includes(q) ||
               (d.Mobile||'').includes(q) ||
               (d.LicenseNo||'').toLowerCase().includes(q);
      })
    : drivers;

  if (filtered.length === 0) {
    container.innerHTML = _emptyState('🔍', 'Koi driver nahi mila', 'Search term badlo');
    return;
  }

  container.innerHTML = filtered.map(function(d) {
    var licDays = _daysTo(d.LicenseExpiry);
    var assignedVeh = (_DATA.vehicles||[]).find(function(v){ return v.AssignedDriverID === d.DriverID; });
    return '<div class="drv-card" onclick="_showView(\'driver_detail\',\'' + d.DriverID + '\')">' +
      '<div class="dc-top">' +
        '<div class="dc-avatar" style="background:' + _nameColor(d.Name) + '">' + _initials(d.Name) + '</div>' +
        '<div class="dc-info">' +
          '<div class="dc-name">' + (d.Name||'—') + '</div>' +
          '<div class="dc-sub">📱 ' + (d.Mobile||'—') + ' · 🩸 ' + (d.BloodGroup||'—') + '</div>' +
          '<div class="dc-sub">' + _badge(d.Status) + '</div>' +
        '</div>' +
        '<div class="dc-salary">₹' + _abbr(parseFloat(d.Salary||0)) + '<br><span>Salary</span></div>' +
      '</div>' +
      '<div class="dc-bottom">' +
        '<span class="pill">🚗 ' + (assignedVeh ? assignedVeh.VehicleNo : 'Unassigned') + '</span>' +
        '<span class="pill ' + (licDays <= 90 ? 'pill-warn' : '') + '">📄 Lic: ' + licDays + 'd</span>' +
        '<span class="pill">📅 ' + (d.JoiningDate||'—') + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function filterDrivers() {
  _renderDriverCards(_qs('#drv-list'), _DATA.drivers || [], document.getElementById('drvSearch').value.trim());
}

// ── DRIVER DETAIL ─────────────────────────────────────────────
function _renderDriverDetail(el, driverID) {
  var d = (_DATA.drivers||[]).find(function(x){ return x.DriverID === driverID; });
  if (!d) { el.innerHTML = _emptyState('❌', 'Driver nahi mila', ''); return; }

  var att   = (_DATA.attendance||[]).filter(function(a){ return a.DriverID === driverID; });
  var fuel  = (_DATA.fuel||[]).filter(function(f){ return f.DriverID === driverID; });
  var trips = (_DATA.trips||[]).filter(function(t){ return t.DriverID === driverID; });
  var pens  = (_DATA.penalties||[]).filter(function(p){ return p.DriverID === driverID; });
  var rwds  = (_DATA.rewards||[]).filter(function(r){ return r.DriverID === driverID; });
  var vehicle = (_DATA.vehicles||[]).find(function(v){ return v.AssignedDriverID === driverID; });

  var presentCount = att.filter(function(a){ return a.Status === 'Present'; }).length;
  var penTotal = pens.reduce(function(s,p){ return s + (parseFloat(p.Amount)||0); }, 0);
  var rwdTotal = rwds.reduce(function(s,r){ return s + (parseFloat(r.Amount)||0); }, 0);
  var licDays  = _daysTo(d.LicenseExpiry);

  el.innerHTML = _pageHeader(d.Name, '<button class="btn-sm btn-ghost" onclick="history.back()">← Back</button>') +
  '<div class="content-pad">' +

  // Profile hero
  '<div class="drv-hero">' +
    '<div class="dh-avatar" style="background:' + _nameColor(d.Name) + '">' + _initials(d.Name) + '</div>' +
    '<div class="dh-info">' +
      '<div class="dh-name">' + (d.Name||'—') + '</div>' +
      '<div class="dh-id">' + (d.DriverID||'') + '</div>' +
      _badge(d.Status) +
    '</div>' +
  '</div>' +

  // Stat row
  '<div class="vd-stats">' +
    _vdStat('📋', presentCount, 'Days Present') +
    _vdStat('⛽', fuel.length, 'Fuel Logs') +
    _vdStat('🗺️', trips.length, 'Trips') +
    _vdStat('⚠️', pens.length, 'Penalties') +
    _vdStat('🏆', rwds.length, 'Rewards') +
    _vdStat('💰', '₹' + _abbr(rwdTotal - penTotal), 'Net Reward') +
  '</div>' +

  // Assigned vehicle
  (vehicle
    ? '<div class="list-card" onclick="_showView(\'vehicle_detail\',\'' + vehicle.VehicleID + '\')">' +
        '<div class="lc-row"><b>🚗 Assigned Vehicle</b><span class="badge badge-active">Active</span></div>' +
        '<div class="lc-meta"><b class="plate-tag">' + vehicle.VehicleNo + '</b> · ' + (vehicle.Brand||'') + ' ' + (vehicle.Model||'') + '</div>' +
      '</div>'
    : '<div class="alert-card info">Koi vehicle assign nahi hai.</div>') +

  // Details
  _sectionHeader('Personal Details') +
  '<div class="detail-grid">' +
    _detailRow('📱 Mobile', d.Mobile) +
    _detailRow('🆘 Emergency', d.EmergencyContact) +
    _detailRow('🩸 Blood Group', d.BloodGroup) +
    _detailRow('📍 Address', d.Address) +
    _detailRow('🆔 Aadhaar', d.AadhaarNo ? '****' + d.AadhaarNo.slice(-4) : '—') +
    _detailRow('💰 Salary', '₹' + (d.Salary||'—')) +
    _detailRow('📅 Joined', d.JoiningDate) +
  '</div>' +

  _sectionHeader('License') +
  '<div class="detail-grid">' +
    _detailRow('License No', d.LicenseNo) +
    _detailRow('License Expiry', '<span class="' + (licDays <= 90 ? 'red' : '') + '">' + (d.LicenseExpiry||'—') + (licDays <= 90 ? ' (' + licDays + 'd)' : '') + '</span>') +
  '</div>' +

  // Attendance this month
  _sectionHeader('This Month\'s Attendance') +
  _attendanceCalendar(att) +

  // Recent trips
  _sectionHeader('Recent Trips') +
  _table(['Date','From','To','KM','Material'],
    trips.slice(-5).reverse().map(function(t){
      return [t.Date, t.FromLocation||'—', t.ToLocation||'—', t.TotalKM||'—', t.MaterialType||'—'];
    })) +

  // Penalties & Rewards
  (pens.length ? _sectionHeader('Penalties') +
    _table(['Date','Reason','Amount','Status'],
      pens.slice(-5).reverse().map(function(p){
        return [p.Date, p.Reason||'—', '₹'+(p.Amount||0), _badge(p.Status)];
      })) : '') +

  (rwds.length ? _sectionHeader('Rewards') +
    _table(['Date','Reason','Amount','Status'],
      rwds.slice(-5).reverse().map(function(r){
        return [r.Date, r.Reason||'—', '₹'+(r.Amount||0), _badge(r.Status)];
      })) : '') +

  // Actions
  (_U.role === 'admin' || _U.role === 'manager'
    ? '<div class="action-btns">' +
        '<button class="btn-action" onclick="openPenaltyForm(\'' + driverID + '\')">⚠️ Add Penalty</button>' +
        '<button class="btn-action" onclick="openRewardForm(\'' + driverID + '\')">🏆 Add Reward</button>' +
      '</div>'
    : '') +

  '</div>';
}

// ── ATTENDANCE (admin/manager) ────────────────────────────────
function _renderAttendance(el) {
  var att   = _DATA.attendance || [];
  var today = att.filter(function(a){ return a.Date === _today(); });
  var presentT = today.filter(function(a){ return a.Status === 'Present'; }).length;
  var absentT  = today.filter(function(a){ return a.Status === 'Absent'; }).length;
  var lateT    = today.filter(function(a){ return a.Status === 'Late'; }).length;

  el.innerHTML = _pageHeader('📋 Attendance') +
  _searchBar('attSearch', 'Search by driver name or date...', 'filterAttendance()') +
  '<div class="content-pad">' +

  '<div class="att-summary">' +
    '<div class="as-item as-present"><div class="as-num">' + presentT + '</div><div class="as-label">Present</div></div>' +
    '<div class="as-item as-absent"><div class="as-num">' + absentT + '</div><div class="as-label">Absent</div></div>' +
    '<div class="as-item as-late"><div class="as-num">' + lateT + '</div><div class="as-label">Late</div></div>' +
    '<div class="as-item as-total"><div class="as-num">' + today.length + '</div><div class="as-label">Total</div></div>' +
  '</div>' +

  _sectionHeader('Today — ' + _today()) +
  (today.length === 0 ? _emptyState('📋', 'Aaj ka koi record nahi', 'Drivers ne abhi mark nahi kiya')
    : _table(['Driver','Vehicle','In','Out','Status','Location'],
        today.map(function(a){
          return [_dname(a.DriverID), _vnum(a.VehicleID), a.InTime||'—', a.OutTime||'—',
            _badge(a.Status), a.Location||'—'];
        }))) +

  _sectionHeader('All Records') +
  '<div id="att-all-table">' +
  _table(['Date','Driver','Status','In','Out','Location'],
    att.slice(-30).reverse().map(function(a){
      return [a.Date, _dname(a.DriverID), _badge(a.Status), a.InTime||'—', a.OutTime||'—', a.Location||'—'];
    })) +
  '</div>' +
  '</div>';
}

function filterAttendance() {
  var q = document.getElementById('attSearch').value.trim().toLowerCase();
  var att = _DATA.attendance || [];
  var filtered = q ? att.filter(function(a){
    return _dname(a.DriverID).toLowerCase().includes(q) || (a.Date||'').includes(q);
  }) : att;
  _qs('#att-all-table').innerHTML = _table(['Date','Driver','Status','In','Out'],
    filtered.slice(-30).reverse().map(function(a){
      return [a.Date, _dname(a.DriverID), _badge(a.Status), a.InTime||'—', a.OutTime||'—'];
    }));
}

// ── MY ATTENDANCE (driver) ────────────────────────────────────
function _renderMyAttendance(el) {
  var att = _DATA.myAttendance || [];
  var monthAtt = att.filter(function(a){ return (a.Date||'').startsWith(_thisMonth()); });
  var present = monthAtt.filter(function(a){ return a.Status === 'Present'; }).length;
  var absent  = monthAtt.filter(function(a){ return a.Status === 'Absent'; }).length;
  var late    = monthAtt.filter(function(a){ return a.Status === 'Late'; }).length;

  el.innerHTML = _pageHeader('📋 My Attendance',
    '<button class="btn-sm btn-primary" onclick="openAttModal()">+ Mark</button>') +
  '<div class="content-pad">' +

  '<div class="att-summary">' +
    '<div class="as-item as-present"><div class="as-num">' + present + '</div><div class="as-label">Present</div></div>' +
    '<div class="as-item as-absent"><div class="as-num">' + absent + '</div><div class="as-label">Absent</div></div>' +
    '<div class="as-item as-late"><div class="as-num">' + late + '</div><div class="as-label">Late</div></div>' +
    '<div class="as-item as-total"><div class="as-num">' + monthAtt.length + '</div><div class="as-label">Days Logged</div></div>' +
  '</div>' +

  _sectionHeader('This Month\'s Calendar') +
  _attendanceCalendar(att) +

  _sectionHeader('Attendance History') +
  _table(['Date','Status','In Time','Out Time','Location'],
    att.slice(-20).reverse().map(function(a){
      return [a.Date, _badge(a.Status), a.InTime||'—', a.OutTime||'—', a.Location||'—'];
    })) +
  '</div>';
}

// ── INSPECTION LIST ───────────────────────────────────────────
function _renderInspectionList(el) {
  var ins = _DATA.inspections || [];
  var today = ins.filter(function(i){ return i.Date === _today(); });
  el.innerHTML = _pageHeader('🔍 Inspections') +
  '<div class="content-pad">' +
  '<div class="att-summary">' +
    '<div class="as-item as-present"><div class="as-num">' + today.length + '</div><div class="as-label">Today</div></div>' +
    '<div class="as-item as-total"><div class="as-num">' + ins.length + '</div><div class="as-label">Total</div></div>' +
  '</div>' +
  ins.slice(-15).reverse().map(function(i){
    var failed = [];
    if (i.FuelCheck !== 'Yes') failed.push('Fuel');
    if (i.TyreCheck !== 'Yes') failed.push('Tyre');
    if (i.InsuranceCheck !== 'Yes') failed.push('Ins');
    if (i.PUCCheck !== 'Yes') failed.push('PUC');
    return '<div class="list-card">' +
      '<div class="lc-row">' +
        '<div><b class="plate-tag">' + _vnum(i.VehicleID) + '</b> <span class="lc-sub">· ' + i.Date + '</span></div>' +
        (failed.length > 0
          ? '<span class="badge badge-late">⚠️ ' + failed.length + ' issues</span>'
          : '<span class="badge badge-active">✅ All OK</span>') +
      '</div>' +
      '<div class="lc-meta">👤 ' + _dname(i.DriverID) + '</div>' +
      (failed.length > 0 ? '<div class="lc-meta red">Issues: ' + failed.join(', ') + '</div>' : '') +
      (i.Remarks ? '<div class="lc-meta">💬 ' + i.Remarks + '</div>' : '') +
    '</div>';
  }).join('') +
  '</div>';
}

// ── INSPECTION FORM ───────────────────────────────────────────
function _renderInspectionForm(el) {
  var checks = APP_CONFIG.INSPECTION_CHECKS;
  el.innerHTML = _pageHeader('🔍 Vehicle Inspection') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Date', 'date', 'ins-date', _today()) +
  _fGroup('Vehicle ID', 'text', 'ins-vid', _U.assignedVehicle ? _U.assignedVehicle.VehicleID : '', 'VEH001') +
  '<div class="checks-section">' +
  checks.map(function(c){
    return '<div class="check-row">' +
      '<span class="cr-label">' + c.label + '</span>' +
      '<div class="cr-toggle" id="tg-' + c.key + '">' +
        '<button class="tg-yes active" onclick="setToggle(\'' + c.key + '\',\'Yes\',this)">Yes</button>' +
        '<button class="tg-no" onclick="setToggle(\'' + c.key + '\',\'No\',this)">No</button>' +
      '</div>' +
    '</div>';
  }).join('') +
  '</div>' +
  _fGroupTA('Remarks', 'ins-remarks', 'Koi issue ho toh yahan likho...') +
  '<button class="btn-primary full-btn" onclick="submitInspection()">✅ Submit Inspection</button>' +
  '</div></div>';
  checks.forEach(function(c){ window['_toggle_' + c.key] = 'Yes'; });
}

// ── CLEANING LIST ─────────────────────────────────────────────
function _renderCleaningList(el) {
  var clns = _DATA.cleaning || [];
  el.innerHTML = _pageHeader('🧽 Cleaning Logs') +
  '<div class="content-pad">' +
  clns.slice(-15).reverse().map(function(c){
    var checks = ['ExteriorClean','InteriorClean','MatClean','DashboardClean','SeatClean','MirrorClean','TyrePolish','PerfumeAvailable'];
    var doneCount = checks.filter(function(k){ return c[k] === 'Yes'; }).length;
    var pct = Math.round(doneCount / checks.length * 100);
    return '<div class="list-card">' +
      '<div class="lc-row">' +
        '<div><b class="plate-tag">' + _vnum(c.VehicleID) + '</b> <span class="lc-sub">· ' + c.Date + '</span></div>' +
        '<span class="badge ' + (pct === 100 ? 'badge-active' : pct >= 60 ? 'badge-pending' : 'badge-absent') + '">' + pct + '%</span>' +
      '</div>' +
      '<div class="lc-meta">👤 ' + _dname(c.DriverID) + '</div>' +
      '<div class="progress-bar"><div class="pb-fill" style="width:' + pct + '%;background:' + (pct===100?'#27AE60':pct>=60?'#F39C12':'#E74C3C') + '"></div></div>' +
    '</div>';
  }).join('') +
  '</div>';
}

// ── CLEANING FORM ─────────────────────────────────────────────
function _renderCleaningForm(el) {
  var checks = APP_CONFIG.CLEANING_CHECKS;
  el.innerHTML = _pageHeader('🧽 Vehicle Cleaning') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Date', 'date', 'cln-date', _today()) +
  '<div class="checks-section">' +
  checks.map(function(c){
    return '<div class="check-row">' +
      '<span class="cr-label">' + c.label + '</span>' +
      '<div class="cr-toggle" id="tg-' + c.key + '">' +
        '<button class="tg-yes active" onclick="setToggle(\'' + c.key + '\',\'Yes\',this)">Yes</button>' +
        '<button class="tg-no" onclick="setToggle(\'' + c.key + '\',\'No\',this)">No</button>' +
      '</div>' +
    '</div>';
  }).join('') +
  '</div>' +
  '<button class="btn-primary full-btn" onclick="submitCleaning()">🧽 Submit Cleaning Log</button>' +
  '</div></div>';
  checks.forEach(function(c){ window['_toggle_' + c.key] = 'Yes'; });
}

// ── FUEL LIST ─────────────────────────────────────────────────
function _renderFuelList(el) {
  var fuel = _DATA.fuel || [];
  var totalAmt  = fuel.reduce(function(s,f){ return s + (parseFloat(f.Amount)||0); }, 0);
  var totalLtrs = fuel.reduce(function(s,f){ return s + (parseFloat(f.FuelQty)||0); }, 0);
  var avgMileage = fuel.filter(function(f){ return parseFloat(f.Mileage||0) > 0; });
  var mileageAvg = avgMileage.length ? (avgMileage.reduce(function(s,f){ return s + parseFloat(f.Mileage); }, 0) / avgMileage.length).toFixed(1) : '—';

  el.innerHTML = _pageHeader('⛽ Fuel Entries',
    '<button class="btn-sm btn-primary" onclick="_showView(\'my_fuel\')">+ Add</button>') +
  _searchBar('fuelSearch', 'Search by vehicle, driver, pump...', 'filterFuel()') +
  '<div class="content-pad">' +

  '<div class="hero-stats">' +
    _heroStat('⛽', '₹' + _abbr(totalAmt), 'Total Spend', '#E67E22') +
    _heroStat('💧', _abbr(totalLtrs) + 'L', 'Total Fuel', '#2980B9') +
    _heroStat('📈', mileageAvg, 'Avg km/L', '#27AE60') +
    _heroStat('📝', fuel.length, 'Entries', '#8E44AD') +
  '</div>' +

  '<div id="fuel-table">' +
  _table(['Date','Vehicle','Driver','Qty','Amount','km/L','Pump'],
    fuel.slice(-20).reverse().map(function(f){
      var m = parseFloat(f.Mileage||0);
      return [f.Date, _vnum(f.VehicleID), _dname(f.DriverID),
        (f.FuelQty||'')+'L', '₹'+(f.Amount||''),
        m > 0 ? (m < 7 ? '<span class="red">'+m+'</span>' : ''+m) : '—',
        f.PumpName||'—'];
    })) +
  '</div></div>';
}

function filterFuel() {
  var q = document.getElementById('fuelSearch').value.trim().toLowerCase();
  var fuel = _DATA.fuel || [];
  var filtered = q ? fuel.filter(function(f){
    return _vnum(f.VehicleID).toLowerCase().includes(q) ||
           _dname(f.DriverID).toLowerCase().includes(q) ||
           (f.PumpName||'').toLowerCase().includes(q);
  }) : fuel;
  _qs('#fuel-table').innerHTML = _table(['Date','Vehicle','Driver','Qty','Amount','km/L','Pump'],
    filtered.slice(-20).reverse().map(function(f){
      var m = parseFloat(f.Mileage||0);
      return [f.Date, _vnum(f.VehicleID), _dname(f.DriverID), (f.FuelQty||'')+'L', '₹'+(f.Amount||''),
        m > 0 ? (m < 7 ? '<span class="red">'+m+'</span>' : ''+m) : '—', f.PumpName||'—'];
    }));
}

// ── FUEL FORM ─────────────────────────────────────────────────
function _renderFuelForm(el) {
  var veh = _U.assignedVehicle;
  el.innerHTML = _pageHeader('⛽ Add Fuel Entry') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Date', 'date', 'fuel-date', _today()) +
  _fGroup('Vehicle ID', 'text', 'fuel-vid', veh ? veh.VehicleID : '', 'VEH001') +
  _fGroup('Current KM Reading', 'number', 'fuel-km', '', '45000') +
  _fGroup('Previous KM Reading', 'number', 'fuel-prevkm', veh ? (veh.CurrentKM||'') : '', '44500') +
  _fGroup('Fuel Qty (Litres)', 'number', 'fuel-qty', '', '25') +
  _fGroup('Amount (₹)', 'number', 'fuel-amt', '', '2500') +
  _fGroup('Pump Name', 'text', 'fuel-pump', '', 'HPCL Station Name') +
  '<div class="calc-preview" id="fuel-calc">—</div>' +
  '<button class="btn-primary full-btn" onclick="submitFuel()">⛽ Save Fuel Entry</button>' +
  '</div></div>';

  // Live calc
  ['fuel-qty','fuel-amt','fuel-km','fuel-prevkm'].forEach(function(id) {
    var el2 = document.getElementById(id);
    if (el2) el2.addEventListener('input', _updateFuelCalc);
  });
}

function _updateFuelCalc() {
  var qty = parseFloat(_v('fuel-qty')) || 0;
  var amt = parseFloat(_v('fuel-amt')) || 0;
  var km  = parseFloat(_v('fuel-km'))  || 0;
  var prev= parseFloat(_v('fuel-prevkm'))|| 0;
  var dist = km - prev;
  var mil  = qty > 0 && dist > 0 ? (dist / qty).toFixed(1) : '—';
  var rate = qty > 0 ? '₹' + (amt / qty).toFixed(2) + '/L' : '—';
  var calc = document.getElementById('fuel-calc');
  if (calc) {
    calc.innerHTML = '📏 Distance: <b>' + dist + ' km</b> &nbsp;|&nbsp; 📈 Mileage: <b>' + mil + ' km/L</b> &nbsp;|&nbsp; 💰 Rate: <b>' + rate + '</b>';
  }
}

// ── TRIPS ─────────────────────────────────────────────────────
function _renderTrips(el) {
  var trips = _DATA.trips || [];
  var totalKM = trips.reduce(function(s,t){ return s + (parseFloat(t.TotalKM)||0); }, 0);
  el.innerHTML = _pageHeader('🗺️ Trips',
    '<button class="btn-sm btn-primary" onclick="_showView(\'my_trips\')">+ Add</button>') +
  '<div class="content-pad">' +
  '<div class="hero-stats">' +
    _heroStat('🗺️', trips.length, 'Total Trips', '#2980B9') +
    _heroStat('📏', _abbr(totalKM) + ' km', 'Total KM', '#8E44AD') +
  '</div>' +
  _table(['Date','Vehicle','Driver','From → To','KM','Material'],
    trips.slice(-20).reverse().map(function(t){
      return [t.Date, _vnum(t.VehicleID), _dname(t.DriverID),
        (t.FromLocation||'?') + ' → ' + (t.ToLocation||'?'),
        t.TotalKM||'—', t.MaterialType||'—'];
    })) +
  '</div>';
}

// ── TRIP FORM ─────────────────────────────────────────────────
function _renderTripForm(el) {
  var veh = _U.assignedVehicle;
  var mats = APP_CONFIG.MATERIAL_TYPES.map(function(m){ return '<option>' + m + '</option>'; }).join('');
  el.innerHTML = _pageHeader('🗺️ Log Trip') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Date', 'date', 'trp-date', _today()) +
  _fGroup('Vehicle ID', 'text', 'trp-vid', veh ? veh.VehicleID : '') +
  _fGroup('From Location', 'text', 'trp-from', '', 'Delhi Warehouse') +
  _fGroup('To Location', 'text', 'trp-to', '', 'Gurgaon Hub') +
  '<div class="f-group"><label>Material Type</label><select id="trp-mat">' + mats + '</select></div>' +
  _fGroup('Weight (MT)', 'number', 'trp-wt', '', '5.5') +
  _fGroup('Start KM', 'number', 'trp-skm', '', '45000') +
  _fGroup('End KM', 'number', 'trp-ekm', '', '45350') +
  _fGroup('Remarks', 'text', 'trp-rem', '', 'Optional') +
  '<button class="btn-primary full-btn" onclick="submitTrip()">🗺️ Submit Trip</button>' +
  '</div></div>';
}

// ── SERVICES ──────────────────────────────────────────────────
function _renderServices(el) {
  var svc = _DATA.services || [];
  var pending   = svc.filter(function(s){ return s.Status !== 'Completed'; });
  var completed = svc.filter(function(s){ return s.Status === 'Completed'; });
  var totalCost = svc.reduce(function(s,x){ return s + (parseFloat(x.Amount)||0); }, 0);

  el.innerHTML = _pageHeader('🔧 Services',
    '<button class="btn-sm btn-primary" onclick="_showView(\'service_form\')">+ Add</button>') +
  '<div class="content-pad">' +
  '<div class="hero-stats">' +
    _heroStat('🔧', pending.length, 'Pending', '#D51515') +
    _heroStat('✅', completed.length, 'Completed', '#27AE60') +
    _heroStat('💸', '₹' + _abbr(totalCost), 'Total Cost', '#E67E22') +
  '</div>' +

  (pending.length ? _sectionHeader('In Progress') +
    pending.map(function(s){
      return '<div class="list-card">' +
        '<div class="lc-row"><b class="plate-tag">' + _vnum(s.VehicleID) + '</b>' + _badge(s.Status) + '</div>' +
        '<div class="lc-meta">🔧 ' + (s.ServiceType||'—') + ' · 🏪 ' + (s.GarageName||'—') + '</div>' +
        '<div class="lc-meta">📅 ' + (s.ServiceDate||'—') + ' · 💰 ₹' + (s.Amount||0) + '</div>' +
        '<div class="lc-meta">Issue: ' + (s.Issue||'—') + '</div>' +
        (s.NextServiceDate ? '<div class="lc-meta">Next: ' + s.NextServiceDate + ' / ' + (s.NextServiceKM||'—') + ' KM</div>' : '') +
      '</div>';
    }).join('') : '') +

  _sectionHeader('All Services') +
  _table(['Date','Vehicle','Type','Issue','Amount','Status'],
    svc.slice(-15).reverse().map(function(s){
      return [s.ServiceDate||'—', _vnum(s.VehicleID), s.ServiceType||'—',
        s.Issue||'—', '₹'+(s.Amount||0), _badge(s.Status)];
    })) +
  '</div>';
}

// ── SERVICE FORM ──────────────────────────────────────────────
function _renderServiceForm(el) {
  var types = APP_CONFIG.SERVICE_TYPES.map(function(t){ return '<option>' + t + '</option>'; }).join('');
  var vehOpts = (_DATA.vehicles||[]).map(function(v){ return '<option value="' + v.VehicleID + '">' + v.VehicleNo + ' — ' + (v.Brand||'') + '</option>'; }).join('');
  el.innerHTML = _pageHeader('🔧 Log Service') +
  '<div class="content-pad"><div class="form-card">' +
  '<div class="f-group"><label>Vehicle</label><select id="svc-vid">' + vehOpts + '</select></div>' +
  '<div class="f-group"><label>Service Type</label><select id="svc-type">' + types + '</select></div>' +
  _fGroup('Service Date', 'date', 'svc-date', _today()) +
  _fGroup('Garage Name', 'text', 'svc-garage', '', 'Expert Auto, Faridabad') +
  _fGroup('Issue / Work Done', 'text', 'svc-issue', '', 'Oil change + filter') +
  _fGroup('Amount (₹)', 'number', 'svc-amt', '', '4000') +
  _fGroup('Service KM Reading', 'number', 'svc-km', '', '45000') +
  _fGroup('Next Service Date', 'date', 'svc-ndate', '') +
  _fGroup('Next Service KM', 'number', 'svc-nkm', '', '51000') +
  _fGroup('Technician Name', 'text', 'svc-tech', '', 'Raju Mechanic') +
  '<button class="btn-primary full-btn" onclick="submitService()">🔧 Save Service Record</button>' +
  '</div></div>';
}

// ── EXPENSES ──────────────────────────────────────────────────
function _renderExpenses(el) {
  var exp = _DATA.expenses || [];
  var thisMonth = exp.filter(function(e){ return (e.Date||'').startsWith(_thisMonth()); });
  var byType = {};
  exp.forEach(function(e){ byType[e.ExpenseType||'Other'] = (byType[e.ExpenseType||'Other']||0) + (parseFloat(e.Amount)||0); });
  var total = exp.reduce(function(s,e){ return s + (parseFloat(e.Amount)||0); }, 0);
  var monthTotal = thisMonth.reduce(function(s,e){ return s + (parseFloat(e.Amount)||0); }, 0);

  el.innerHTML = _pageHeader('💸 Expenses',
    '<button class="btn-sm btn-primary" onclick="_showView(\'my_expenses\')">+ Add</button>') +
  '<div class="content-pad">' +
  '<div class="hero-stats">' +
    _heroStat('💸', '₹' + _abbr(monthTotal), 'This Month', '#E74C3C') +
    _heroStat('📊', '₹' + _abbr(total), 'All Time', '#2980B9') +
    _heroStat('📝', exp.length, 'Entries', '#8E44AD') +
  '</div>' +

  // By type breakdown
  _sectionHeader('Expense Breakdown') +
  '<div class="breakdown-list">' +
  Object.keys(byType).map(function(type){
    var pct = total > 0 ? Math.round(byType[type] / total * 100) : 0;
    return '<div class="bl-item">' +
      '<div class="bl-row"><span>' + type + '</span><span>₹' + _abbr(byType[type]) + ' (' + pct + '%)</span></div>' +
      '<div class="progress-bar"><div class="pb-fill" style="width:' + pct + '%"></div></div>' +
    '</div>';
  }).join('') +
  '</div>' +

  _searchBar('expSearch', 'Search by vehicle, type...', 'filterExpenses()') +
  '<div id="exp-table">' +
  _table(['Date','Vehicle','Type','Amount','Mode','By'],
    exp.slice(-20).reverse().map(function(e){
      return [e.Date, _vnum(e.VehicleID), e.ExpenseType||'—',
        '₹'+(e.Amount||0), e.PaymentMode||'—', e.ApprovedBy||'—'];
    })) +
  '</div></div>';
}

function filterExpenses() {
  var q = document.getElementById('expSearch').value.trim().toLowerCase();
  var exp = _DATA.expenses || [];
  var filtered = q ? exp.filter(function(e){
    return _vnum(e.VehicleID).toLowerCase().includes(q) || (e.ExpenseType||'').toLowerCase().includes(q);
  }) : exp;
  _qs('#exp-table').innerHTML = _table(['Date','Vehicle','Type','Amount','Mode','By'],
    filtered.slice(-20).reverse().map(function(e){
      return [e.Date, _vnum(e.VehicleID), e.ExpenseType||'—', '₹'+(e.Amount||0), e.PaymentMode||'—', e.ApprovedBy||'—'];
    }));
}

// ── EXPENSE FORM ──────────────────────────────────────────────
function _renderExpenseForm(el) {
  var types = APP_CONFIG.EXPENSE_TYPES.map(function(t){ return '<option>' + t + '</option>'; }).join('');
  var modes = APP_CONFIG.PAYMENT_MODES.map(function(m){ return '<option>' + m + '</option>'; }).join('');
  var veh = _U.assignedVehicle;
  el.innerHTML = _pageHeader('💸 Add Expense') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Date', 'date', 'exp-date', _today()) +
  _fGroup('Vehicle ID', 'text', 'exp-vid', veh ? veh.VehicleID : '') +
  '<div class="f-group"><label>Expense Type</label><select id="exp-type">' + types + '</select></div>' +
  _fGroup('Amount (₹)', 'number', 'exp-amt', '', '500') +
  '<div class="f-group"><label>Payment Mode</label><select id="exp-mode">' + modes + '</select></div>' +
  _fGroup('Remarks', 'text', 'exp-rem', '', 'Optional') +
  '<button class="btn-primary full-btn" onclick="submitExpense()">💸 Submit Expense</button>' +
  '</div></div>';
}

// ── FASTAG ────────────────────────────────────────────────────
function _renderFastag(el) {
  var txns = _DATA.fastag || [];
  var vehicles = _DATA.vehicles || [];
  var lowBal = vehicles.filter(function(v){ return parseFloat(v.FastagBalance||0) < 300; });

  el.innerHTML = _pageHeader('🏷️ Fastag',
    '<button class="btn-sm btn-primary" onclick="_showView(\'fastag_form\')">+ Recharge</button>') +
  '<div class="content-pad">' +

  (lowBal.length ? '<div class="alert-card danger"><div class="ac-title">⚠️ Low Fastag Balance</div>' +
    lowBal.map(function(v){ return '<div class="ac-row"><b class="plate-tag">' + v.VehicleNo + '</b> — ₹' + (v.FastagBalance||0) + '</div>'; }).join('') + '</div>' : '') +

  _sectionHeader('Vehicle Fastag Balances') +
  '<div class="fastag-grid">' +
  vehicles.map(function(v){
    var bal = parseFloat(v.FastagBalance||0);
    var cls = bal < 300 ? '#E74C3C' : bal < 600 ? '#F39C12' : '#27AE60';
    return '<div class="ft-card" style="border-top-color:' + cls + '">' +
      '<div class="ft-plate">' + (v.VehicleNo||'—') + '</div>' +
      '<div class="ft-no">' + (v.FastagNo||'—') + '</div>' +
      '<div class="ft-bal" style="color:' + cls + '">₹' + bal.toFixed(0) + '</div>' +
      '<div class="ft-label">' + (bal < 300 ? '🔴 Low!' : bal < 600 ? '🟡 OK' : '🟢 Good') + '</div>' +
    '</div>';
  }).join('') +
  '</div>' +

  _sectionHeader('Recharge History') +
  _table(['Date','Vehicle','Opening','Recharge','Closing','Remarks'],
    txns.slice(-15).reverse().map(function(t){
      return [t.Date, _vnum(t.VehicleID), '₹'+(t.OpeningBalance||0), '₹'+(t.RechargeAmount||0), '₹'+(t.ClosingBalance||0), t.Remarks||'—'];
    })) +
  '</div>';
}

// ── FASTAG FORM ───────────────────────────────────────────────
function _renderFastagForm(el) {
  var vehOpts = (_DATA.vehicles||[]).map(function(v){
    return '<option value="' + v.VehicleID + '">' + v.VehicleNo + ' (Bal: ₹' + (v.FastagBalance||0) + ')</option>';
  }).join('');
  el.innerHTML = _pageHeader('🏷️ Fastag Recharge') +
  '<div class="content-pad"><div class="form-card">' +
  '<div class="f-group"><label>Vehicle</label><select id="ft-vid" onchange="updateFastagBal(this)">' + vehOpts + '</select></div>' +
  '<div class="f-group"><label>Opening Balance (₹)</label><input type="number" id="ft-open" placeholder="auto-fills" readonly style="background:#f4f4f4"></div>' +
  _fGroup('Recharge Amount (₹)', 'number', 'ft-rch', '', '500') +
  _fGroup('Date', 'date', 'ft-date', _today()) +
  _fGroup('Remarks', 'text', 'ft-rem', '', 'Quarterly top-up') +
  '<div class="calc-preview" id="ft-calc">—</div>' +
  '<button class="btn-primary full-btn" onclick="submitFastag()">🏷️ Save Recharge</button>' +
  '</div></div>';

  setTimeout(function() {
    var sel = document.getElementById('ft-vid');
    if (sel) updateFastagBal(sel);
  }, 50);
}

function updateFastagBal(sel) {
  var vid = sel.value;
  var v = (_DATA.vehicles||[]).find(function(x){ return x.VehicleID === vid; });
  var openEl = document.getElementById('ft-open');
  if (openEl && v) { openEl.value = parseFloat(v.FastagBalance||0).toFixed(0); _updateFastagCalc(); }
  document.getElementById('ft-rch') && document.getElementById('ft-rch').addEventListener('input', _updateFastagCalc);
}

function _updateFastagCalc() {
  var open = parseFloat(_v('ft-open')) || 0;
  var rch  = parseFloat(_v('ft-rch'))  || 0;
  var calc = document.getElementById('ft-calc');
  if (calc) calc.innerHTML = 'Opening: ₹' + open + ' + Recharge: ₹' + rch + ' = <b>New Balance: ₹' + (open+rch).toFixed(0) + '</b>';
}

// ── KM LOGS ───────────────────────────────────────────────────
function _renderKMLogs(el) {
  var logs = _DATA.kmLogs || [];
  el.innerHTML = _pageHeader('📏 KM Logs',
    '<button class="btn-sm btn-primary" onclick="_showView(\'my_kmlogs\')">+ Add</button>') +
  '<div class="content-pad">' +
  _table(['Date','Vehicle','Odometer','By','Remarks'],
    logs.slice(-20).reverse().map(function(l){
      return [l.Date, _vnum(l.VehicleID), (l.OdometerReading||'—') + ' km', l.EnteredBy||'—', l.Remarks||'—'];
    })) +
  '</div>';
}

function _renderKMLogForm(el) {
  var veh = _U.assignedVehicle;
  el.innerHTML = _pageHeader('📏 KM Entry') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Date', 'date', 'km-date', _today()) +
  _fGroup('Vehicle ID', 'text', 'km-vid', veh ? veh.VehicleID : '') +
  _fGroup('Odometer Reading (KM)', 'number', 'km-odo', veh ? (veh.CurrentKM||'') : '', '45000') +
  _fGroup('Remarks', 'text', 'km-rem', '', 'Morning reading') +
  '<button class="btn-primary full-btn" onclick="submitKMLog()">📏 Save KM Entry</button>' +
  '</div></div>';
}

// ── DISPATCH ──────────────────────────────────────────────────
function _renderDispatch(el) {
  var disp = _DATA.dispatch || [];
  var inTransit = disp.filter(function(d){ return d.Status === 'In Transit'; }).length;
  el.innerHTML = _pageHeader('📦 Dispatch') +
  '<div class="content-pad">' +
  '<div class="hero-stats">' +
    _heroStat('🚛', inTransit, 'In Transit', '#E67E22') +
    _heroStat('✅', disp.filter(function(d){ return d.Status === 'Delivered'; }).length, 'Delivered', '#27AE60') +
    _heroStat('📦', disp.length, 'Total', '#2980B9') +
  '</div>' +
  disp.slice(-15).reverse().map(function(d){
    return '<div class="list-card">' +
      '<div class="lc-row"><b>' + (d.CustomerName||'—') + '</b>' + _badge(d.Status) + '</div>' +
      '<div class="lc-meta">📦 ' + (d.Material||'—') + ' · ' + (d.Weight||0) + ' MT · 📄 ' + (d.InvoiceNo||'—') + '</div>' +
      '<div class="lc-meta">📅 Loading: ' + (d.LoadingDate||'—') + ' → Delivery: ' + (d.DeliveryDate||'—') + '</div>' +
    '</div>';
  }).join('') +
  '</div>';
}

// ── DOCUMENTS ─────────────────────────────────────────────────
function _renderDocuments(el) {
  var docs = _DATA.documents || [];
  var expiringSoon = docs.filter(function(d){ return _daysTo(d.ExpiryDate) <= 30; });
  el.innerHTML = _pageHeader('📄 Documents') +
  '<div class="content-pad">' +
  (expiringSoon.length ? '<div class="alert-card danger"><div class="ac-title">⚠️ Expiring within 30 days</div>' +
    expiringSoon.map(function(d){ return '<div class="ac-row"><b class="plate-tag">' + _vnum(d.VehicleID) + '</b> — ' + d.DocumentType + ': ' + _daysTo(d.ExpiryDate) + 'd</div>'; }).join('') + '</div>' : '') +
  _table(['Vehicle','Type','Doc No','Expiry','Status'],
    docs.map(function(d){
      var dd = _daysTo(d.ExpiryDate);
      return [_vnum(d.VehicleID), d.DocumentType, d.DocumentNumber||'—',
        '<span class="' + (dd <= 30 ? 'red' : '') + '">' + (d.ExpiryDate||'—') + (dd <= 30 && dd >= 0 ? ' (' + dd + 'd)' : '') + '</span>',
        _badge(d.Status)];
    })) +
  '</div>';
}

// ── REMINDERS ─────────────────────────────────────────────────
function _renderReminders(el) {
  var rem = _DATA.reminders || [];
  var high = rem.filter(function(r){ return r.Priority === 'High' && r.Status === 'Pending'; });
  el.innerHTML = _pageHeader('🔔 Reminders') +
  '<div class="content-pad">' +
  (high.length ? '<div class="alert-card danger"><div class="ac-title">🔴 High Priority (' + high.length + ')</div>' +
    high.map(function(r){ return '<div class="ac-row"><b class="plate-tag">' + _vnum(r.VehicleID) + '</b> — ' + r.ReminderType + ' on ' + r.ReminderDate + '</div>'; }).join('') + '</div>' : '') +
  _table(['Vehicle','Type','Date','Priority','Status'],
    rem.map(function(r){
      return [_vnum(r.VehicleID), r.ReminderType, r.ReminderDate, _badge(r.Priority), _badge(r.Status)];
    })) +
  '</div>';
}

// ── MAINTENANCE ───────────────────────────────────────────────
function _renderMaintenance(el) {
  var maint = _DATA.maintenance || [];
  el.innerHTML = _pageHeader('🛠️ Maintenance') +
  '<div class="content-pad">' +
  maint.map(function(m){
    var daysLeft = _daysTo(m.NextDueDate);
    var col = daysLeft <= 0 ? '#E74C3C' : daysLeft <= 15 ? '#F39C12' : '#27AE60';
    return '<div class="list-card">' +
      '<div class="lc-row">' +
        '<div><b class="plate-tag">' + _vnum(m.VehicleID) + '</b> <span class="lc-sub">· ' + (m.MaintenanceType||'—') + '</span></div>' +
        _badge(m.Status) +
      '</div>' +
      '<div class="lc-meta">Last: ' + (m.LastDoneDate||'—') + ' @ ' + (m.LastDoneKM||'—') + ' KM</div>' +
      '<div class="lc-meta" style="color:' + col + '">Next: ' + (m.NextDueDate||'—') + ' / ' + (m.NextDueKM||'—') + ' KM' +
        (daysLeft <= 30 ? ' <b>(' + daysLeft + 'd)</b>' : '') + '</div>' +
      '<div class="progress-bar"><div class="pb-fill" style="width:' + Math.min(100, Math.max(0, 100 - daysLeft)) + '%;background:' + col + '"></div></div>' +
    '</div>';
  }).join('') +
  '</div>';
}

// ── PENALTIES ─────────────────────────────────────────────────
function _renderPenalties(el) {
  var pens = _DATA.penalties || [];
  var total = pens.reduce(function(s,p){ return s + (parseFloat(p.Amount)||0); }, 0);
  el.innerHTML = _pageHeader('⚠️ Penalties') +
  '<div class="content-pad">' +
  '<div class="hero-stats">' +
    _heroStat('⚠️', pens.length, 'Total', '#E74C3C') +
    _heroStat('💸', '₹' + _abbr(total), 'Amount', '#E74C3C') +
    _heroStat('⏳', pens.filter(function(p){ return p.Status === 'Pending'; }).length, 'Pending', '#F39C12') +
  '</div>' +
  _table(['Date','Driver','Reason','Amount','Status'],
    pens.slice(-15).reverse().map(function(p){
      return [p.Date, _dname(p.DriverID), p.Reason||'—', '₹'+(p.Amount||0), _badge(p.Status)];
    })) +
  '</div>';
}

// ── REWARDS ───────────────────────────────────────────────────
function _renderRewards(el) {
  var rwds = _DATA.rewards || [];
  var total = rwds.reduce(function(s,r){ return s + (parseFloat(r.Amount)||0); }, 0);
  el.innerHTML = _pageHeader('🏆 Rewards') +
  '<div class="content-pad">' +
  '<div class="hero-stats">' +
    _heroStat('🏆', rwds.length, 'Total', '#F1C40F') +
    _heroStat('💰', '₹' + _abbr(total), 'Amount', '#27AE60') +
  '</div>' +
  _table(['Date','Driver','Reason','Amount','Status'],
    rwds.slice(-15).reverse().map(function(r){
      return [r.Date, _dname(r.DriverID), r.Reason||'—', '₹'+(r.Amount||0), _badge(r.Status)];
    })) +
  '</div>';
}

// ── AUDIT LOG ─────────────────────────────────────────────────
function _renderAuditLog(el) {
  var logs = _DATA.auditLogs || [];
  el.innerHTML = _pageHeader('📝 Audit Log') +
  _searchBar('aulSearch', 'Search by module, action, user...', 'filterAudit()') +
  '<div class="content-pad" id="aul-wrap">' +
  _table(['Date/Time','Module','Action','Record','By'],
    logs.slice(-40).reverse().map(function(l){
      return [l.DateTime, l.Module, l.Action, l.RecordID, l.PerformedBy];
    })) +
  '</div>';
}

function filterAudit() {
  var q = document.getElementById('aulSearch').value.trim().toLowerCase();
  var logs = _DATA.auditLogs || [];
  var filtered = q ? logs.filter(function(l){
    return (l.Module||'').toLowerCase().includes(q) ||
           (l.Action||'').toLowerCase().includes(q) ||
           (l.PerformedBy||'').toLowerCase().includes(q);
  }) : logs;
  _qs('#aul-wrap').innerHTML = _table(['Date/Time','Module','Action','Record','By'],
    filtered.slice(-40).reverse().map(function(l){
      return [l.DateTime, l.Module, l.Action, l.RecordID, l.PerformedBy];
    }));
}

// ── USERS ─────────────────────────────────────────────────────
function _renderUsers(el) {
  var users = _DATA.users || [];
  el.innerHTML = _pageHeader('👥 Users') +
  '<div class="content-pad">' +
  users.map(function(u){
    var perms = String(u.Permissions||'').split(',').filter(Boolean);
    return '<div class="list-card">' +
      '<div class="lc-row">' +
        '<div class="dc-left">' +
          '<div class="dc-avatar" style="background:' + _nameColor(u.Name) + ';width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.85rem">' + _initials(u.Name) + '</div>' +
        '</div>' +
        '<div style="flex:1;margin-left:.6rem">' +
          '<b>' + (u.Name||'—') + '</b>' +
          '<div class="lc-meta">' + (u.Email||'—') + ' · ' + (u.Mobile||'—') + '</div>' +
        '</div>' +
        _badge(u.Role) +
      '</div>' +
      '<div class="lc-meta" style="margin-top:.3rem">✅ ' + perms.slice(0,4).join(' · ') + (perms.length > 4 ? ' +' + (perms.length-4) : '') + '</div>' +
      '<div class="lc-meta">' + _badge(u.Status) + ' · Last Login: ' + (u.LastLogin||'—') + '</div>' +
    '</div>';
  }).join('') +
  '</div>';
}

// ── VEHICLE FORM ──────────────────────────────────────────────
function _renderVehicleForm(el) {
  var types  = APP_CONFIG.VEHICLE_TYPES.map(function(t){ return '<option>' + t + '</option>'; }).join('');
  var fuels  = APP_CONFIG.FUEL_TYPES.map(function(f){ return '<option>' + f + '</option>'; }).join('');
  var owns   = APP_CONFIG.OWNERSHIP_TYPES.map(function(o){ return '<option>' + o + '</option>'; }).join('');
  var drvOpts = (_DATA.drivers||[]).map(function(d){ return '<option value="' + d.DriverID + '">' + d.Name + '</option>'; }).join('');
  el.innerHTML = _pageHeader('🚗 Add Vehicle') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Vehicle Number', 'text', 'nv-no', '', 'UP36B0000') +
  '<div class="f-group"><label>Vehicle Type</label><select id="nv-type">' + types + '</select></div>' +
  '<div class="f-group"><label>Fuel Type</label><select id="nv-fuel">' + fuels + '</select></div>' +
  '<div class="f-group"><label>Ownership</label><select id="nv-own">' + owns + '</select></div>' +
  _fGroup('Brand', 'text', 'nv-brand', '', 'Maruti') +
  _fGroup('Model', 'text', 'nv-model', '', 'Swift') +
  _fGroup('Registration No', 'text', 'nv-reg', '', 'MH19B0000') +
  _fGroup('Engine No', 'text', 'nv-eng', '', '') +
  _fGroup('Chassis No', 'text', 'nv-chs', '', '') +
  _fGroup('Current KM', 'number', 'nv-km', '', '0') +
  _fGroup('Insurance Expiry', 'date', 'nv-ins', '') +
  _fGroup('PUC Expiry', 'date', 'nv-puc', '') +
  _fGroup('Fastag No', 'text', 'nv-ft', '', '') +
  _fGroup('Fastag Balance (₹)', 'number', 'nv-ftbal', '', '0') +
  '<div class="f-group"><label>Assign Driver</label><select id="nv-drv"><option value="">— None —</option>' + drvOpts + '</select></div>' +
  '<button class="btn-primary full-btn" onclick="submitVehicle()">🚗 Add Vehicle</button>' +
  '</div></div>';
}

// ── DRIVER FORM ───────────────────────────────────────────────
function _renderDriverForm(el) {
  var blood = APP_CONFIG.BLOOD_GROUPS.map(function(b){ return '<option>' + b + '</option>'; }).join('');
  el.innerHTML = _pageHeader('👤 Add Driver') +
  '<div class="content-pad"><div class="form-card">' +
  _fGroup('Full Name', 'text', 'nd-name', '', 'Ramesh Kumar') +
  _fGroup('Mobile', 'tel', 'nd-mob', '', '9876543210') +
  _fGroup('Email (for login)', 'email', 'nd-email', '', 'ramesh@ishasteels.com') +
  _fGroup('Password (for app)', 'text', 'nd-pass', '', 'Driver@1234') +
  _fGroup('Address', 'text', 'nd-addr', '', '') +
  _fGroup('License No', 'text', 'nd-lic', '', '') +
  _fGroup('License Expiry', 'date', 'nd-licexp', '') +
  _fGroup('Aadhaar No', 'text', 'nd-aadh', '', '0000 0000 0000') +
  '<div class="f-group"><label>Blood Group</label><select id="nd-blood">' + blood + '</select></div>' +
  _fGroup('Emergency Contact', 'tel', 'nd-emg', '', '9876543211') +
  _fGroup('Joining Date', 'date', 'nd-join', _today()) +
  _fGroup('Monthly Salary (₹)', 'number', 'nd-sal', '', '25000') +
  '<button class="btn-primary full-btn" onclick="submitDriver()">👤 Add Driver</button>' +
  '</div></div>';
}

// ── SETTINGS ──────────────────────────────────────────────────
function _renderSettings(el) {
  el.innerHTML = _pageHeader('⚙️ Settings') +
  '<div class="content-pad">' +

  // User profile card
  '<div class="settings-profile">' +
    '<div class="sp-avatar" style="background:' + _nameColor(_U.name) + '">' + _initials(_U.name) + '</div>' +
    '<div class="sp-info">' +
      '<div class="sp-name">' + _U.name + '</div>' +
      '<div class="sp-email">' + _U.email + '</div>' +
      _badge(_U.role) +
    '</div>' +
  '</div>' +

  _sectionHeader('App Info') +
  '<div class="settings-list">' +
    _settingRow('🏢', 'Company', 'Isha Steels Enterprises') +
    _settingRow('📱', 'App Version', APP_CONFIG.APP_VERSION) +
    _settingRow('🔄', 'Auto Refresh', APP_CONFIG.REFRESH_MINS + ' minutes') +
    _settingRow('👤', 'Your Role', _cap(_U.role)) +
    _settingRow('🔑', 'User ID', _U.userID||'—') +
  '</div>' +

  _sectionHeader('Your Permissions') +
  '<div class="perm-list">' +
  (_U.permissions||[]).filter(Boolean).map(function(p){ return '<span class="perm-badge">' + p + '</span>'; }).join('') +
  '</div>' +

  _sectionHeader('Cache') +
  '<div class="settings-list">' +
    '<div class="setting-row" onclick="_refreshData();_toast(\'Data refreshed!\',\'success\')">' +
      '<div class="sr-icon">🔄</div><div class="sr-label">Refresh App Data</div><div class="sr-arrow">›</div>' +
    '</div>' +
    '<div class="setting-row" onclick="_clearCacheAndReload()">' +
      '<div class="sr-icon">🗑️</div><div class="sr-label">Clear Cache & Reload</div><div class="sr-arrow">›</div>' +
    '</div>' +
  '</div>' +

  '<button class="btn-danger full-btn" style="margin-top:1.5rem" onclick="_signOut()">🚪 Logout</button>' +
  '</div>';
}

function _settingRow(icon, label, val) {
  return '<div class="setting-row"><div class="sr-icon">' + icon + '</div><div class="sr-label">' + label + '</div><div class="sr-val">' + val + '</div></div>';
}

function _clearCacheAndReload() {
  _clearSession();
  if ('caches' in window) caches.keys().then(function(k){ k.forEach(function(c){ caches.delete(c); }); });
  window.location.reload();
}

// ═══════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════

function openAttModal() {
  var veh = _U.assignedVehicle;
  var now = new Date();
  var time = _pad(now.getHours()) + ':' + _pad(now.getMinutes());
  _modal('📋 Mark Attendance',
    '<div class="form-card" style="box-shadow:none;padding:0">' +
    _fGroup('Date', 'date', 'att-date', _today()) +
    '<div class="f-group"><label>Status</label><select id="att-status">' +
      '<option>Present</option><option>Late</option><option>Absent</option>' +
    '</select></div>' +
    _fGroup('Location', 'text', 'att-loc', '', 'Delhi HQ') +
    '<div class="att-btn-row">' +
      '<button class="btn-att-in" onclick="submitAttendance(\'in\')">🟢 Mark IN (' + time + ')</button>' +
      '<button class="btn-att-out" onclick="submitAttendance(\'out\')">🔴 Mark OUT (' + time + ')</button>' +
    '</div></div>'
  );
}

function openAllModules() {
  var role = _U.role;
  var modules = APP_CONFIG.ROLE_MODULES[role] || [];
  _modal('All Modules',
    '<div class="module-grid">' +
    modules.map(function(key) {
      var m = APP_CONFIG.MODULES[key]; if (!m) return '';
      return '<div class="module-tile" onclick="closeModal();_showView(\'' + key + '\')" style="--mc:' + m.color + '">' +
        '<div class="mt-icon">' + m.icon + '</div>' +
        '<div class="mt-label">' + m.label + '</div>' +
      '</div>';
    }).join('') +
    '</div>' +
    '<div class="module-tile" onclick="closeModal();_showView(\'settings\')" style="margin-top:.6rem;--mc:#7F8C8D">' +
      '<div class="mt-icon">⚙️</div><div class="mt-label">Settings</div>' +
    '</div>'
  );
}

function openPenaltyForm(driverID) {
  _modal('⚠️ Add Penalty',
    '<div class="form-card" style="box-shadow:none;padding:0">' +
    _fGroup('Date', 'date', 'pnl-date', _today()) +
    '<input type="hidden" id="pnl-driver" value="' + (driverID||'') + '">' +
    _fGroup('Reason', 'text', 'pnl-reason', '', 'Late arrival') +
    _fGroup('Amount (₹)', 'number', 'pnl-amt', '', '500') +
    '<button class="btn-primary full-btn" onclick="submitPenalty()">⚠️ Add Penalty</button></div>'
  );
}

function openRewardForm(driverID) {
  _modal('🏆 Add Reward',
    '<div class="form-card" style="box-shadow:none;padding:0">' +
    _fGroup('Date', 'date', 'rwd-date', _today()) +
    '<input type="hidden" id="rwd-driver" value="' + (driverID||'') + '">' +
    _fGroup('Reason', 'text', 'rwd-reason', '', 'Best fuel efficiency') +
    _fGroup('Amount (₹)', 'number', 'rwd-amt', '', '1000') +
    '<button class="btn-primary full-btn" onclick="submitReward()">🏆 Give Reward</button></div>'
  );
}

// ═══════════════════════════════════════════════════════════════
// FORM SUBMIT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

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
    location:  _v('att-loc') || ''
  };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      data.gps = pos.coords.latitude + ',' + pos.coords.longitude;
      _submitModal('addAttendance', data, '✅ Attendance marked!', 'my_attendance');
    }, function() {
      _submitModal('addAttendance', data, '✅ Attendance marked (no GPS)!', 'my_attendance');
    }, { timeout: 5000 });
  } else {
    _submitModal('addAttendance', data, '✅ Attendance marked!', 'my_attendance');
  }
}

function submitInspection() {
  var checks = {};
  APP_CONFIG.INSPECTION_CHECKS.forEach(function(c){ checks[c.key] = window['_toggle_' + c.key] || 'No'; });
  _submitForm('addInspection', Object.assign({ date: _v('ins-date')||_today(), vehicleID: _v('ins-vid'), remarks: _v('ins-remarks') }, checks), '✅ Inspection submitted!');
}

function submitCleaning() {
  var checks = {};
  APP_CONFIG.CLEANING_CHECKS.forEach(function(c){ checks[c.key] = window['_toggle_' + c.key] || 'No'; });
  _submitForm('addCleaning', Object.assign({ date: _v('cln-date')||_today() }, checks), '✅ Cleaning saved!');
}

function submitFuel() {
  var data = { date: _v('fuel-date')||_today(), vehicleID: _v('fuel-vid'),
    kmReading: parseFloat(_v('fuel-km'))||0, previousKM: parseFloat(_v('fuel-prevkm'))||0,
    fuelQty: parseFloat(_v('fuel-qty'))||0, amount: parseFloat(_v('fuel-amt'))||0, pumpName: _v('fuel-pump') };
  if (!data.vehicleID || !data.fuelQty || !data.amount) { _toast('Vehicle ID, Qty aur Amount zaroori hai.', 'danger'); return; }
  _submitForm('addFuel', data, '⛽ Fuel entry saved!');
}

function submitTrip() {
  _submitForm('addTrip', { date: _v('trp-date')||_today(), vehicleID: _v('trp-vid'),
    fromLocation: _v('trp-from'), toLocation: _v('trp-to'), materialType: _v('trp-mat'),
    weight: parseFloat(_v('trp-wt'))||0, startKM: parseFloat(_v('trp-skm'))||0,
    endKM: parseFloat(_v('trp-ekm'))||0, remarks: _v('trp-rem') }, '🗺️ Trip logged!');
}

function submitService() {
  var data = { vehicleID: _v('svc-vid'), serviceType: _v('svc-type'), serviceDate: _v('svc-date')||_today(),
    garageName: _v('svc-garage'), issue: _v('svc-issue'), amount: parseFloat(_v('svc-amt'))||0,
    serviceKM: parseFloat(_v('svc-km'))||0, nextServiceDate: _v('svc-ndate'),
    nextServiceKM: parseFloat(_v('svc-nkm'))||0, technicianName: _v('svc-tech'), status: 'Completed' };
  _submitForm('addService', data, '🔧 Service logged!');
}

function submitExpense() {
  _submitForm('addExpense', { date: _v('exp-date')||_today(), vehicleID: _v('exp-vid'),
    expenseType: _v('exp-type'), amount: parseFloat(_v('exp-amt'))||0,
    paymentMode: _v('exp-mode'), remarks: _v('exp-rem') }, '💸 Expense saved!');
}

function submitKMLog() {
  _submitForm('addKMLog', { date: _v('km-date')||_today(), vehicleID: _v('km-vid'),
    odometer: parseFloat(_v('km-odo'))||0, remarks: _v('km-rem') }, '📏 KM entry saved!');
}

function submitFastag() {
  var open = parseFloat(_v('ft-open'))||0, rch = parseFloat(_v('ft-rch'))||0;
  if (!rch) { _toast('Recharge amount daalo.', 'danger'); return; }
  _submitForm('addFastag', { vehicleID: _v('ft-vid'), date: _v('ft-date')||_today(),
    opening: open, recharge: rch, remarks: _v('ft-rem') }, '🏷️ Fastag recharged!');
}

function submitVehicle() {
  _submitForm('addVehicle', { vehicleNo: _v('nv-no'), vehicleType: _v('nv-type'), fuelType: _v('nv-fuel'),
    ownershipType: _v('nv-own'), brand: _v('nv-brand'), model: _v('nv-model'),
    registrationNo: _v('nv-reg'), engineNo: _v('nv-eng'), chassisNo: _v('nv-chs'),
    currentKM: parseFloat(_v('nv-km'))||0, insuranceExpiry: _v('nv-ins'),
    pucExpiry: _v('nv-puc'), fastagNo: _v('nv-ft'), fastagBalance: parseFloat(_v('nv-ftbal'))||0,
    assignedDriverID: _v('nv-drv') }, '🚗 Vehicle added!');
}

function submitDriver() {
  var data = { name: _v('nd-name'), mobile: _v('nd-mob'), email: _v('nd-email'),
    password: _v('nd-pass'), address: _v('nd-addr'), licenseNo: _v('nd-lic'),
    licenseExpiry: _v('nd-licexp'), aadhaarNo: _v('nd-aadh'), bloodGroup: _v('nd-blood'),
    emergencyContact: _v('nd-emg'), joiningDate: _v('nd-join')||_today(), salary: parseFloat(_v('nd-sal'))||0 };
  if (!data.name || !data.mobile) { _toast('Name aur mobile zaroori hai.', 'danger'); return; }
  _submitForm('addDriver', data, '👤 Driver added!');
}

function submitPenalty() {
  var data = { driverID: _v('pnl-driver'), date: _v('pnl-date')||_today(),
    reason: _v('pnl-reason'), amount: parseFloat(_v('pnl-amt'))||0 };
  if (!data.driverID || !data.reason) { _toast('Driver ID aur reason zaroori hai.', 'danger'); return; }
  _submitModal('addPenalty', data, '⚠️ Penalty added!', null);
}

function submitReward() {
  var data = { driverID: _v('rwd-driver'), date: _v('rwd-date')||_today(),
    reason: _v('rwd-reason'), amount: parseFloat(_v('rwd-amt'))||0 };
  if (!data.driverID || !data.reason) { _toast('Driver ID aur reason zaroori hai.', 'danger'); return; }
  _submitModal('addReward', data, '🏆 Reward added!', null);
}

// Core submit helpers
function _submitForm(action, data, successMsg) {
  var btn = document.querySelector('.btn-primary.full-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  _api(action, data,
    function(r) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
      if (!r.success) { _toast(r.error || 'Save fail', 'danger'); return; }
      _toast(successMsg, 'success');
      setTimeout(function(){ _refreshData(function(){ if (_VIEW) _showView(_VIEW); }); }, 800);
    },
    function(e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
      _toast(e.message || 'Error', 'danger');
    }
  );
}

function _submitModal(action, data, successMsg, nextView) {
  _api(action, data,
    function(r) {
      closeModal();
      if (!r.success) { _toast(r.error || 'Fail', 'danger'); return; }
      _toast(successMsg, 'success');
      setTimeout(function(){ _refreshData(function(){ if (nextView) _showView(nextView); else if (_VIEW) _showView(_VIEW); }); }, 800);
    },
    function(e) { closeModal(); _toast(e.message || 'Error', 'danger'); }
  );
}

// Toggle helper
function setToggle(key, val, btn) {
  window['_toggle_' + key] = val;
  var group = document.getElementById('tg-' + key);
  if (!group) return;
  group.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
}

// Shortcuts
function openInsForm()  { _showView('my_inspection'); }
function openClnForm()  { _showView('my_cleaning'); }
function openFuelForm() { _showView(_U.role === 'driver' ? 'my_fuel' : 'my_fuel'); }
function openTripForm() { _showView(_U.role === 'driver' ? 'my_trips' : 'my_trips'); }
function openKMForm()   { _showView(_U.role === 'driver' ? 'my_kmlogs' : 'my_kmlogs'); }

// ═══════════════════════════════════════════════════════════════
// UI BUILDER HELPERS
// ═══════════════════════════════════════════════════════════════

function _pageHeader(title, actions) {
  return '<div class="page-header"><h2 class="page-title">' + title + '</h2>' +
    (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
}

function _sectionHeader(text) {
  return '<div class="section-header">' + text + '</div>';
}

function _searchBar(id, ph, fn) {
  return '<div class="search-bar"><span class="sb-icon">🔍</span>' +
    '<input id="' + id + '" class="sb-input" placeholder="' + ph + '" oninput="' + fn + '"></div>';
}

function _badge(status) {
  if (!status) return '';
  var s   = String(status).toLowerCase().replace(/ /g, '-');
  return '<span class="badge badge-' + s + '">' + status + '</span>';
}

function _heroStat(icon, val, label, color) {
  return '<div class="hs-item" style="border-top-color:' + (color||'var(--color-primary)') + '">' +
    '<div class="hs-icon">' + icon + '</div>' +
    '<div class="hs-val" style="color:' + (color||'var(--color-primary)') + '">' + val + '</div>' +
    '<div class="hs-label">' + label + '</div>' +
  '</div>';
}

function _bigAction(icon, label, fn, color) {
  return '<button class="ba-btn" onclick="' + fn + '" style="border-top-color:' + (color||'var(--color-primary)') + '">' +
    '<div class="ba-icon" style="color:' + (color||'var(--color-primary)') + '">' + icon + '</div>' +
    '<div class="ba-label">' + label + '</div>' +
  '</button>';
}

function _table(headers, rows) {
  if (!rows || rows.length === 0) return _emptyState('📭', 'Koi data nahi', 'Abhi tak koi record nahi hai');
  return '<div class="table-wrap"><table><thead><tr>' +
    headers.map(function(h){ return '<th>' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    rows.map(function(r){ return '<tr>' + r.map(function(c){ return '<td>' + (c !== undefined && c !== null ? c : '—') + '</td>'; }).join('') + '</tr>'; }).join('') +
    '</tbody></table></div>';
}

function _emptyState(icon, title, sub) {
  return '<div class="empty-state"><div class="es-icon">' + icon + '</div><div class="es-title">' + title + '</div><div class="es-sub">' + sub + '</div></div>';
}

function _fGroup(label, type, id, val, ph) {
  return '<div class="f-group"><label>' + label + '</label>' +
    '<input type="' + type + '" id="' + id + '" value="' + (val||'') + '"' + (ph ? ' placeholder="' + ph + '"' : '') + '></div>';
}

function _fGroupTA(label, id, ph) {
  return '<div class="f-group"><label>' + label + '</label><textarea id="' + id + '" placeholder="' + (ph||'') + '" rows="2"></textarea></div>';
}

function _fab(icon, fn) {
  return '<button class="fab" onclick="' + fn + '">' + icon + '</button>';
}

function _detailRow(label, val) {
  return '<div class="dr-row"><div class="dr-label">' + label + '</div><div class="dr-val">' + (val||'—') + '</div></div>';
}

function _modal(title, body) {
  _qs('#modal-title').textContent = title;
  _qs('#modal-body').innerHTML    = body;
  document.getElementById('global-modal').style.display = 'flex';
}

function closeModal() { document.getElementById('global-modal').style.display = 'none'; }

function _toast(msg, type) {
  var t = document.createElement('div');
  t.className = 'toast toast-' + (type||'info'); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function(){ t.classList.add('show'); }, 10);
  setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 300); }, 3500);
}

function _showLoader(msg) {
  var l = document.getElementById('loader');
  if (l) { l.style.display = 'flex'; l.querySelector('p').textContent = msg||'Loading...'; }
}
function _hideLoader() { var l = document.getElementById('loader'); if (l) l.style.display = 'none'; }

// ═══════════════════════════════════════════════════════════════
// DATA HELPERS
// ═══════════════════════════════════════════════════════════════
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
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}
function _today() {
  var d = new Date();
  return d.getFullYear() + '-' + _pad(d.getMonth()+1) + '-' + _pad(d.getDate());
}
function _thisMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + _pad(d.getMonth()+1);
}
function _pad(n)  { return n < 10 ? '0' + n : '' + n; }
function _cap(s)  { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function _v(id)   { var el = document.getElementById(id); return el ? el.value : ''; }
function _qs(s)   { return document.querySelector(s); }
function _abbr(n) {
  n = parseFloat(n)||0;
  return n >= 100000 ? (n/100000).toFixed(1)+'L' : n >= 1000 ? (n/1000).toFixed(1)+'K' : ''+n;
}
function _nameColor(name) {
  var colors = ['#D51515','#2980B9','#8E44AD','#27AE60','#E67E22','#16A085','#2B2B2B','#C0392B'];
  var i = 0;
  for (var j = 0; j < (name||'').length; j++) i += (name||'').charCodeAt(j);
  return colors[i % colors.length];
}
function _initials(name) {
  return (name||'?').split(' ').slice(0,2).map(function(w){ return w[0]; }).join('').toUpperCase();
}
