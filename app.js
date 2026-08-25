// ════════════════════════════════════════════════════════════════════════════
// app.js — ISE Driver App v3.1
// SPEED: localStorage cache layer + lazy loading + optimistic UI
// RESPONSIVE: mobile/tablet/desktop breakpoints
// ════════════════════════════════════════════════════════════════════════════
(function(W){
'use strict';

var MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var CFG=W.APP_CONFIG||{};

// ════════════════════════════════════════════════════════════════════════════
// DATE HELPERS
// ════════════════════════════════════════════════════════════════════════════
W._today=function(){return new Date().toISOString().slice(0,10);};
W._currMonth=function(){return new Date().toISOString().slice(0,7);};
W._daysAgo=function(n){var d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);};
W._parseAnyDate=function(s){
  if(!s)return null;var str=String(s).trim();
  if(!str||str==='-'||str==='undefined'||str==='null')return null;
  var gm=str.match(/([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if(gm){var mo={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
    var d=new Date(+gm[3],mo[gm[1]]||0,+gm[2],+gm[4],+gm[5],+gm[6]);return isNaN(d)?null:d;}
  var ddmm=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?/);
  if(ddmm){var d2=new Date(+ddmm[3],+ddmm[2]-1,+ddmm[1],+(ddmm[4]||0),+(ddmm[5]||0));return isNaN(d2)?null:d2;}
  var norm=str.length===10?str+'T00:00:00':str.replace(' ','T');
  var d3=new Date(norm);return isNaN(d3)?null:d3;
};
W._fmtDate=function(s){
  if(!s||s==='-')return'—';
  try{var d=W._parseAnyDate(s);if(!d)return String(s).slice(0,10);
    return d.getDate()+' '+MN[d.getMonth()]+' '+d.getFullYear();}catch(e){return s;}
};
W._fmtDateTime=function(s){
  if(!s||s==='-')return'—';
  try{var d=W._parseAnyDate(s);if(!d)return String(s).slice(0,16);
    var h=d.getHours(),m=d.getMinutes(),ap=h>=12?'PM':'AM',h12=h%12||12;
    return d.getDate()+' '+MN[d.getMonth()]+' '+d.getFullYear()+' '+h12+':'+(m<10?'0':'')+m+' '+ap;}catch(e){return s;}
};
W._fmtTime=function(s){
  if(!s)return'—';var str=String(s).trim();
  var m=str.match(/(\d{1,2}):(\d{2})/);if(!m)return str;
  var h=+m[1],mn=+m[2],ap=h>=12?'PM':'AM',h12=h%12||h;
  return h12+':'+(mn<10?'0':'')+mn+' '+ap;
};
W._daysLeft=function(dateStr){
  if(!dateStr)return 9999;
  return Math.ceil((new Date(dateStr+'T00:00:00')-new Date())/86400000);
};
W._dayName=function(dateStr){
  try{return new Date(dateStr+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long'});}catch(e){return'';}
};

// ════════════════════════════════════════════════════════════════════════════
// STRING HELPERS
// ════════════════════════════════════════════════════════════════════════════
W._esc=function(s){
  if(s===null||s===undefined)return'';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
};
W._commaNum=function(n){return(+n||0).toLocaleString('en-IN');};
W._inr=function(n){return'₹'+W._commaNum(n);};
W._initials=function(name){
  var p=String(name||'').trim().split(' ');
  return p.length>=2?p[0][0].toUpperCase()+p[1][0].toUpperCase():(p[0]||'?')[0].toUpperCase();
};
W._avatarColor=function(name){
  var colors=['#1A73E8','#EA4335','#34A853','#FBBC04','#8E44AD','#0D9488','#E67E22','#1557B0'];
  var i=String(name||'').split('').reduce(function(a,c){return a+c.charCodeAt(0);},0);
  return colors[i%colors.length];
};

// ════════════════════════════════════════════════════════════════════════════
// SESSION
// ════════════════════════════════════════════════════════════════════════════
var SK=CFG.SESSION_KEY||'ise_session_v3';
var SH=CFG.SESSION_HOURS||12;
W._saveSession=function(u){try{localStorage.setItem(SK,JSON.stringify({user:u,exp:Date.now()+SH*3600000}));}catch(e){}};
W._loadSession=function(){try{var r=localStorage.getItem(SK);if(!r)return null;var s=JSON.parse(r);return(s&&s.user&&Date.now()<(s.exp||0))?s:null;}catch(e){return null;}};
W._clearSession=function(){try{localStorage.removeItem(SK);}catch(e){}};

// ════════════════════════════════════════════════════════════════════════════
// ═══════════════ LOCALCACHE — Speed layer ════════════════════════════════
// First load: GAS fetch → save to localStorage
// Repeat visit: serve from localStorage (< 5ms) → background refresh
// TTL: 5 minutes default
// ════════════════════════════════════════════════════════════════════════════
var LC_PREFIX='ise_lc_v3_';
var LC_TTL_MS=5*60*1000; // 5 minutes

W._lcGet=function(key){
  try{
    var raw=localStorage.getItem(LC_PREFIX+key);
    if(!raw)return null;
    var obj=JSON.parse(raw);
    if(!obj||Date.now()>obj.exp)return null; // expired
    return obj.data;
  }catch(e){return null;}
};
W._lcSet=function(key,data,ttlMs){
  try{
    var str=JSON.stringify({data:data,exp:Date.now()+(ttlMs||LC_TTL_MS)});
    if(str.length<4*1024*1024) // 4MB max
      localStorage.setItem(LC_PREFIX+key,str);
  }catch(e){
    // localStorage full — clear old ISE cache entries
    try{
      Object.keys(localStorage).filter(function(k){return k.startsWith(LC_PREFIX);}).forEach(function(k){localStorage.removeItem(k);});
      localStorage.setItem(LC_PREFIX+key,JSON.stringify({data:data,exp:Date.now()+(ttlMs||LC_TTL_MS)}));
    }catch(e2){}
  }
};
W._lcClear=function(key){try{localStorage.removeItem(LC_PREFIX+(key||''));if(!key){Object.keys(localStorage).filter(function(k){return k.startsWith(LC_PREFIX);}).forEach(function(k){localStorage.removeItem(k);});}}catch(e){}};
W._lcClearAll=function(){W._lcClear();};

// ════════════════════════════════════════════════════════════════════════════
// GAS JSONP BRIDGE — with localStorage speed layer
// ════════════════════════════════════════════════════════════════════════════
W._gas=function(fn,args,onOk,onErr,_retry){
  if(typeof W._lbShow==='function')W._lbShow();
  var GU=W.GAS_URL||(CFG.GAS_URL)||'';
  var sess=W._loadSession();
  var sa=(args||[]).concat([sess?sess.user:null]);
  var cb='_cb'+Date.now()+Math.floor(Math.random()*9999);
  var pl=encodeURIComponent(JSON.stringify({action:fn,args:sa}));
  var url=GU+'?callback='+cb+'&payload='+pl;
  var done=false,sc=document.createElement('script'),rt=_retry||0;
  var tm=setTimeout(function(){
    if(done)return;done=true;
    if(typeof W._lbHide==='function')W._lbHide();
    sc.remove();delete W[cb];
    if(rt<1){setTimeout(function(){W._gas(fn,args,onOk,onErr,1);},2000);return;}
    if(onErr)onErr({message:'Network error. Check connection.'});
    else if(typeof W._toast==='function')W._toast('Connection error — tap to retry','err');
  },CFG.DEFAULT_TIMEOUT||30000);
  W[cb]=function(data){
    if(done)return;done=true;
    if(typeof W._lbHide==='function')W._lbHide();
    clearTimeout(tm);sc.remove();delete W[cb];
    if(data&&data.success===false&&data.error){
      if(data.error.indexOf('Session expire')>=0||data.error.indexOf('NOT_AUTH')>=0){
        W._clearSession();W._lcClearAll();location.reload();return;
      }
      if(onErr)onErr({message:data.error});
      else if(typeof W._toast==='function')W._toast('Error: '+data.error,'err');
    }else{if(onOk)onOk(data);}
  };
  sc.onerror=function(){if(done)return;done=true;clearTimeout(tm);sc.remove();delete W[cb];
    if(onErr)onErr({message:'Network error.'});};
  sc.src=url;document.head.appendChild(sc);
};

// Login (no session attached)
W._gasLogin=function(email,pass,onOk,onErr){
  var GU=W.GAS_URL||(CFG.GAS_URL)||'';
  var cb='_cb'+Date.now()+Math.floor(Math.random()*9999);
  var pl=encodeURIComponent(JSON.stringify({action:'login',args:[email,pass]}));
  var url=GU+'?callback='+cb+'&payload='+pl;
  var done=false,sc=document.createElement('script');
  var tm=setTimeout(function(){if(done)return;done=true;sc.remove();delete W[cb];if(onErr)onErr({message:'Server timeout.'});},30000);
  W[cb]=function(data){if(done)return;done=true;clearTimeout(tm);sc.remove();delete W[cb];
    if(data&&data.success===false&&data.error){if(onErr)onErr({message:data.error});}else{if(onOk)onOk(data);}};
  sc.onerror=function(){if(done)return;done=true;clearTimeout(tm);sc.remove();delete W[cb];if(onErr)onErr({message:'Network error.'});};
  sc.src=url;document.head.appendChild(sc);
};

// CSV Download
W._downloadCSV=function(filename,rows){
  var csv=rows.map(function(r){return r.map(function(c){return'"'+String(c===null||c===undefined?'':c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();document.body.removeChild(a);
};

// GPS
W._getGPS=function(onOk,onErr){
  if(!navigator.geolocation){if(onErr)onErr('GPS not supported');return;}
  navigator.geolocation.getCurrentPosition(
    function(p){onOk(p.coords.latitude.toFixed(6)+','+p.coords.longitude.toFixed(6));},
    function(e){if(onErr)onErr(e.message||'GPS error');},
    {enableHighAccuracy:true,timeout:12000,maximumAge:30000}
  );
};

})(window);

// ════════════════════════════════════════════════════════════════════════════
// APP STATE
// ════════════════════════════════════════════════════════════════════════════
var _U=null;
var _D={};
var _curV='';
var _pollTimer=null;
var _bgRefreshTimer=null;
var _dataLoaded=false;

// Data helpers
function _drivers(){return _D.drivers||[];}
function _vehicles(){return _D.vehicles||[];}
function _driverByID(id){return _drivers().filter(function(d){return String(d.DriverID||'')===String(id);})[0]||null;}
function _vehicleByID(id){return _vehicles().filter(function(v){return String(v.VehicleID||'')===String(id);})[0]||null;}
function _driverName(id){var d=_driverByID(id);return d?String(d.Name||id):String(id);}
function _vehicleNo(id){var v=_vehicleByID(id);return v?String(v.VehicleNo||id):String(id);}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════════════
function doLogin(){
  var email=document.getElementById('inp-email').value.trim();
  var pass=document.getElementById('inp-pass').value;
  _hideLoginErr();
  if(!email){_showLoginErr('Email daalo.');return;}
  if(!pass){_showLoginErr('Password daalo.');return;}
  _setLoginBusy(true);
  _gasLogin(email,pass,function(res){
    _setLoginBusy(false);
    if(!res||!res.success||!res.user){_showLoginErr((res&&res.error)||'Login failed.');return;}
    _saveSession(res.user);
    _bootApp(res.user);
  },function(err){
    _setLoginBusy(false);
    _showLoginErr(err.message||'Server error. Try again.');
  });
}

// ════════════════════════════════════════════════════════════════════════════
// BOOT APP
// ════════════════════════════════════════════════════════════════════════════
function _bootApp(user){
  _U=user;
  document.getElementById('sLogin').className='scr';
  document.getElementById('sApp').className='scr on';
  _buildSidebar();
  _buildMobNav();
  _updateSbProfile();

  // ── SPEED: Try localStorage first, show UI instantly ──────────────────
  var cached=_loadLocalData();
  if(cached){
    _D=cached;
    _dataLoaded=true;
    var startView=_defaultView(user.role);
    _loadV(startView);
    // Background refresh after 800ms
    setTimeout(function(){_fetchFreshData(true);},800);
  } else {
    // No cache — show skeletons, fetch from GAS
    var startView=_defaultView(user.role);
    _loadV(startView);
    _showSkelContent();
    _fetchFreshData(false);
  }
  _startPoll();
}

// ── localStorage data layer ───────────────────────────────────────────────
function _loadLocalData(){
  try{
    var role=_U?_U.role:'driver';
    var key='alldata_'+role;
    return _lcGet(key);
  }catch(e){return null;}
}
function _saveLocalData(data){
  try{
    var role=_U?_U.role:'driver';
    // Don't cache huge audit logs
    var toSave=Object.assign({},data);
    if(toSave.auditLogs)delete toSave.auditLogs;
    _lcSet('alldata_'+role, toSave, 5*60*1000); // 5 min TTL
  }catch(e){}
}

function _fetchFreshData(silent){
  if(!_U)return;
  _gas('getAllData',[],function(res){
    if(res&&res.success!==false){
      _D=res;
      _dataLoaded=true;
      _saveLocalData(res);
      _renderCurrentView();
      _checkCelebrations();
      _checkAnnouncements();
      _updateBadges();
      if(!silent)_hideLoader();
    }
  },function(err){
    if(!silent){
      _toast('Data load failed. Using cached.','warn');
    }
  });
}

function _refreshData(){
  _toast('Refreshing...','info');
  _lcClearAll();
  _fetchFreshData(false);
}

// Alias used by all CRUD handlers after submit
function _loadAllData(silent){
  _lcClearAll(); // clear cache so fresh data loads
  _fetchFreshData(silent||false);
}

function _startPoll(){
  if(_pollTimer)clearInterval(_pollTimer);
  _pollTimer=setInterval(function(){
    if(_U&&document.visibilityState!=='hidden'){
      _fetchFreshData(true);
    }
  },CFG.POLL_INTERVAL||60000); // 60s (was 30s — reduce API quota usage)
}

// Page visibility — pause poll when tab is hidden
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='visible'&&_U){
    // Tab became visible — refresh if data is older than 2 min
    var cached=_loadLocalData();
    if(!cached){_fetchFreshData(true);}
  }
});

function _defaultView(role){
  return role==='driver'?'my_dashboard':'dashboard';
}

// ════════════════════════════════════════════════════════════════════════════
// VIEW ROUTING
// ════════════════════════════════════════════════════════════════════════════
window._loadV=function(view){
  _curV=view;
  closeSb();
  document.querySelectorAll('.nv').forEach(function(el){el.classList.toggle('on',el.dataset.view===view);});
  document.querySelectorAll('.mob-nav-btn').forEach(function(el){el.classList.toggle('on',el.dataset.view===view);});
  var mod=(APP_CONFIG.MODULES||{})[view]||{};
  document.getElementById('tb-title').textContent=mod.label||view;
  document.getElementById('tb-sub').textContent='Isha Steels Enterprises';
  _renderView(view);
};
function _renderCurrentView(){if(_curV)_renderView(_curV);}
function _renderView(view){
  var c=document.getElementById('content');if(!c)return;
  requestAnimationFrame(function(){
    c.style.animation='none';
    requestAnimationFrame(function(){
      c.style.animation='fadeIn .2s ease both';
      switch(view){
        case 'dashboard':       c.innerHTML=_vDashboard();break;
        case 'operations':      c.innerHTML=_vOperations();break;
        case 'vehicles':        c.innerHTML=_vVehicles();break;
        case 'drivers':         c.innerHTML=_vDrivers();break;
        case 'attendance':      c.innerHTML=_vAttendance();break;
        case 'muster':          c.innerHTML=_vMuster();break;
        case 'fuel':            c.innerHTML=_vFuel();break;
        case 'trips':           c.innerHTML=_vTrips();break;
        case 'expenses':        c.innerHTML=_vExpenses();break;
        case 'fastag':          c.innerHTML=_vFastag();break;
        case 'kmlogs':          c.innerHTML=_vKMLogs();break;
        case 'dispatch':        c.innerHTML=_vDispatch();break;
        case 'inspection':      c.innerHTML=_vInspection();break;
        case 'cleaning':        c.innerHTML=_vCleaning();break;
        case 'services':        c.innerHTML=_vServices();break;
        case 'documents':       c.innerHTML=_vDocuments();break;
        case 'reminders':       c.innerHTML=_vReminders();break;
        case 'maintenance':     c.innerHTML=_vMaintenance();break;
        case 'penalties':       c.innerHTML=_vPenalties();break;
        case 'rewards':         c.innerHTML=_vRewards();break;
        case 'checklist':       c.innerHTML=_vChecklist();break;
        case 'checklist_setup': c.innerHTML=_vChecklistSetup();break;
        case 'delegation':      c.innerHTML=_vDelegation();break;
        case 'leave_requests':  c.innerHTML=_vLeaveRequests();break;
        case 'holidays':        c.innerHTML=_vHolidays();break;
        case 'announcements':   c.innerHTML=_vAnnouncements();break;
        case 'analytics':       c.innerHTML=_vAnalytics();setTimeout(_initAnalyticsCharts,100);break;
        case 'payroll':         c.innerHTML=_vPayroll();break;
        case 'auditlog':        c.innerHTML=_vAuditLog();break;
        case 'users':           c.innerHTML=_vUsers();break;
        case 'settings':        c.innerHTML=_vSettings();break;
        case 'my_dashboard':    c.innerHTML=_vMyDashboard();break;
        case 'my_attendance':   c.innerHTML=_vMyAttendance();break;
        case 'my_inspection':   c.innerHTML=_vMyInspection();break;
        case 'my_cleaning':     c.innerHTML=_vMyCleaning();break;
        case 'my_fuel':         c.innerHTML=_vMyFuel();break;
        case 'my_trips':        c.innerHTML=_vMyTrips();break;
        case 'my_expenses':     c.innerHTML=_vMyExpenses();break;
        case 'my_kmlogs':       c.innerHTML=_vMyKMLogs();break;
        case 'my_checklist':    c.innerHTML=_vMyChecklist();break;
        case 'my_delegations':  c.innerHTML=_vMyDelegations();break;
        case 'my_leave':        c.innerHTML=_vMyLeave();break;
        case 'profile':         c.innerHTML=_vProfile();break;
        default:                c.innerHTML=_vDashboard();
      }
    });
  });
}

function _showSkelContent(){
  var c=document.getElementById('content');if(!c)return;
  c.innerHTML='<div class="skel-wrap">'+
    '<div class="skel" style="height:32px;width:200px;border-radius:4px;margin-bottom:20px"></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px">'+
    [1,2,3,4].map(function(){return'<div class="skel" style="height:90px;border-radius:8px"></div>';}).join('')+'</div>'+
    '<div class="skel" style="height:180px;border-radius:8px;margin-bottom:12px"></div>'+
    '<div class="skel" style="height:120px;border-radius:8px"></div></div>';
}

// Page load
window.addEventListener('load',function(){
  var sess=_loadSession();
  if(sess&&sess.user){
    _bootApp(sess.user);
  } else {
    document.getElementById('sLogin').className='scr on';
    document.documentElement.classList.remove('has-session');
    var em=document.getElementById('inp-email');if(em)em.focus();
  }
});

function doLogout(){
  if(!confirm('Logout karna chahte ho?'))return;
  _clearSession();_lcClearAll();
  _U=null;_D={};_curV='';_dataLoaded=false;
  if(_pollTimer){clearInterval(_pollTimer);_pollTimer=null;}
  document.getElementById('sApp').className='scr';
  document.getElementById('sLogin').className='scr on';
  document.getElementById('inp-email').value='';
  document.getElementById('inp-pass').value='';
  document.documentElement.classList.remove('has-session');
}

// ════════════════════════════════════════════════════════════════════════════
// SIDEBAR + MOBILE NAV
// ════════════════════════════════════════════════════════════════════════════
function _buildSidebar(){
  if(!_U)return;
  var nav=document.getElementById('sb-nav');if(!nav)return;
  var role=_U.role||'driver';
  var groups=APP_CONFIG.NAV_GROUPS&&APP_CONFIG.NAV_GROUPS[role];
  var html='';
  if(groups){
    groups.forEach(function(g){
      html+='<div class="nv-sec"><div class="nv-lbl">'+g.label+'</div>';
      g.items.forEach(function(m){
        var md=(APP_CONFIG.MODULES||{})[m]||{};
        var badge=m==='leave_requests'?'<span class="nv-badge" id="badge-leave" style="display:none">0</span>':'';
        html+='<div class="nv" data-view="'+m+'" onclick="_loadV(\''+m+'\')" title="'+_escInline(md.label||m)+'">'+
          '<i class="fas '+(md.icon||'fa-circle')+'" style="color:'+md.color+'"></i>'+
          '<span>'+_escInline(md.label||m)+'</span>'+badge+'</div>';
      });
      html+='</div>';
    });
  } else {
    var items=(APP_CONFIG.ROLE_MODULES&&APP_CONFIG.ROLE_MODULES[role])||[];
    html+='<div class="nv-sec">';
    items.forEach(function(m){
      var md=(APP_CONFIG.MODULES||{})[m]||{};
      html+='<div class="nv" data-view="'+m+'" onclick="_loadV(\''+m+'\')" title="'+_escInline(md.label||m)+'">'+
        '<i class="fas '+(md.icon||'fa-circle')+'" style="color:'+md.color+'"></i>'+
        '<span>'+_escInline(md.label||m)+'</span></div>';
    });
    html+='</div>';
  }
  html+='<hr class="nv-sep">';
  html+='<div class="nv nv-danger" onclick="doLogout()" title="Logout"><i class="fas fa-right-from-bracket" style="color:#EA4335"></i><span>Logout</span></div>';
  nav.innerHTML=html;
}

function _buildMobNav(){
  if(!_U)return;
  // Support both #mobNav direct and #mob-nav-inner wrapper
  var nav=document.getElementById('mob-nav-inner')||document.getElementById('mobNav');
  if(!nav)return;
  var role=_U.role||'driver';
  var items=((APP_CONFIG.MOB_NAV&&APP_CONFIG.MOB_NAV[role])||[]).slice(0,5);
  nav.innerHTML=items.map(function(m){
    var md=(APP_CONFIG.MODULES||{})[m]||{};
    return '<button class="mob-nav-btn" data-view="'+m+'" onclick="_loadV(\''+m+'\')">'+
      '<i class="fas '+(md.icon||'fa-circle')+'"></i>'+
      '<span class="mob-nav-lbl">'+_escInline((md.label||m).split(' ')[0])+'</span></button>';
  }).join('');
}

function _updateSbProfile(){
  if(!_U)return;
  var ava=document.getElementById('sb-ava'),avaTxt=document.getElementById('sb-ava-txt');
  var nm=document.getElementById('sb-name'),rl=document.getElementById('sb-role');
  var col=_avatarColor(_U.name||'');
  if(ava)ava.style.background='linear-gradient(135deg,'+col+','+col+'bb)';
  if(avaTxt)avaTxt.textContent=_initials(_U.name||'');
  if(nm)nm.textContent=_U.name||'User';
  if(rl)rl.textContent=(_U.role||'driver').charAt(0).toUpperCase()+(_U.role||'').slice(1);
}

function _checkCelebrations(){
  var cels=_D.celebrations||[];
  cels.forEach(function(c){
    _addNtf((c.type==='birthday'?'🎂 Happy Birthday ':'🏢 Work Anniversary — ')+c.name+'!','fa-cake-candles','#FEF7E0','#B06000');
  });
}
function _checkAnnouncements(){
  var anns=_D.announcements||[];
  var badge=document.getElementById('badge-ann');
  if(badge){badge.textContent=anns.length||'';badge.style.display=anns.length?'':'none';}
}
function _updateBadges(){
  var leaves=(_D.leaveRequests||[]).filter(function(l){return String(l.status||'')==='Pending';});
  var badge=document.getElementById('badge-leave');
  if(badge){badge.textContent=leaves.length||'';badge.style.display=leaves.length?'':'none';}
}

// ── Optimistic write helper ───────────────────────────────────────────────
// Updates local cache immediately, then syncs to GAS
// Shows result instantly without waiting for network
function _optimisticWrite(fn, args, localUpdateFn, successMsg, errorMsg){
  // 1. Apply local update immediately
  if(localUpdateFn){try{localUpdateFn(_D);}catch(e){}}
  _saveLocalData(_D);
  _renderCurrentView();
  // 2. Show success optimistically
  _toast((successMsg||'Saved!'),'success');
  // 3. Sync to GAS in background
  _gas(fn,args,function(r){
    if(r&&r.success){
      // Server confirmed — refresh data silently
      setTimeout(function(){_fetchFreshData(true);},1000);
    } else {
      _toast('Sync error: '+(r&&r.error||errorMsg||'Try again'),'err');
      // Revert by fetching fresh data
      _fetchFreshData(true);
    }
  },function(e){
    _toast('Network error — changes may not be saved','warn');
    _fetchFreshData(true);
  });
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════
function _ph(title,btn){
  return '<div class="page-hdr"><div class="page-title">'+title+'</div>'+
    '<div class="page-actions">'+(btn||'')+'</div></div>';
}
function _emptyState(icon,title,sub){
  return '<div class="empty-state"><div class="es-icon">'+icon+'</div>'+
    '<div class="es-title">'+_esc(title)+'</div>'+
    '<div class="es-sub">'+_esc(sub||'')+'</div></div>';
}
function _kpi(icon,color,val,label,sub,extra){
  return '<div class="kpi-card" style="--kc:'+color+'"'+(extra?' '+extra:'')+'>'+
    '<div class="kpi-top"><div class="kpi-ico"><i class="fas '+icon+'"></i></div></div>'+
    '<div class="kpi-val">'+_esc(String(val))+'</div>'+
    '<div class="kpi-lbl">'+_esc(label)+'</div>'+
    '<div class="kpi-sub">'+_esc(sub||'')+'</div></div>';
}
function _dr(label,val){
  return '<div class="dr-row"><div class="dr-label">'+_esc(label)+'</div><div class="dr-val">'+val+'</div></div>';
}
function _escInline(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ════════════════════════════════════════════════════════════════════════════
// RESPONSIVE GRID HELPER — detects viewport and returns appropriate grid
// ════════════════════════════════════════════════════════════════════════════
function _isMobile(){return window.innerWidth<640;}
function _isTablet(){return window.innerWidth>=640&&window.innerWidth<1024;}
function _isDesktop(){return window.innerWidth>=1024;}
function _gridCols(mob,tab,desk){
  if(_isMobile())return mob||1;
  if(_isTablet())return tab||2;
  return desk||3;
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ════════════════════════════════════════════════════════════════════════════
function _vDashboard(){
  var veh=_D.vehicles||[];
  var drv=_D.drivers||[];
  var att=_D.attendance||[];
  var fuel=_D.fuel||[];
  var lv=_D.leaveRequests||[];
  var dels=_D.delegations||[];
  var anns=_D.announcements||[];
  var cels=_D.celebrations||[];
  var today=_today();
  var mon=_currMonth();

  var activeVeh=veh.filter(function(v){return v.Status==='Active';}).length;
  var activeDrv=drv.filter(function(d){return d.Status==='Active';}).length;
  var todayAtt=att.filter(function(a){return String(a.Date||'').slice(0,10)===today;});
  var present=todayAtt.filter(function(a){return a.Status==='Present'||a.Status==='Late';}).length;
  var late=todayAtt.filter(function(a){return a.Status==='Late';}).length;
  var monFuel=fuel.filter(function(f){return String(f.Date||'').startsWith(mon);}).reduce(function(s,f){return s+Number(f.Amount||0);},0);
  var todayFuel=fuel.filter(function(f){return String(f.Date||'').slice(0,10)===today;}).reduce(function(s,f){return s+Number(f.Amount||0);},0);
  var pendingLv=lv.filter(function(l){return String(l.status||'')==='Pending';}).length;
  var overdueDels=dels.filter(function(d){return d.is_overdue;}).length;

  // Alerts
  var alerts=[];
  veh.forEach(function(v){
    var insD=_daysLeft(String(v.InsuranceExpiry||'').slice(0,10));
    var pucD=_daysLeft(String(v.PUCExpiry||'').slice(0,10));
    var ftB=Number(v.FastagBalance||0);
    if(insD>=0&&insD<=30)alerts.push({type:'ins',vno:v.VehicleNo,days:insD,msg:'Insurance: '+insD+'d baaki',col:insD<7?'var(--R)':'var(--O)',ico:'fa-shield'});
    if(pucD>=0&&pucD<=15)alerts.push({type:'puc',vno:v.VehicleNo,days:pucD,msg:'PUC: '+pucD+'d baaki',col:'var(--O)',ico:'fa-leaf'});
    if(ftB<300)alerts.push({type:'ft',vno:v.VehicleNo,bal:ftB,msg:'Fastag low: ₹'+ftB,col:'var(--W)',ico:'fa-tag'});
  });

  var html='';

  // Celebrations
  cels.forEach(function(c){
    html+='<div class="cel-banner"><span class="cel-icon">'+(c.type==='birthday'?'🎂':'🎉')+'</span>'+
      '<div><div class="cel-name">'+(c.type==='birthday'?'Birthday — ':'Work Anniversary — ')+_esc(c.name)+'</div>'+
      '<div class="cel-msg">Wishing you a great day!</div></div></div>';
  });

  // KPI cards
  html+='<div class="kpi-grid">'+
    _kpi('fa-car','#1A73E8',activeVeh,'Active Vehicles','Total fleet')+
    _kpi('fa-id-badge','#8E44AD',activeDrv,'Active Drivers','On roster')+
    _kpi('fa-user-check','#2F9E44',present,'Present Today','Out of '+activeDrv)+
    _kpi('fa-clock','#D97706',late,'Late Today','Late arrivals')+
    _kpi('fa-gas-pump','#E03131','₹'+_commaNum(todayFuel),'Fuel Today','Spent today')+
    _kpi('fa-gas-pump','#E67E22','₹'+_commaNum(monFuel),'Fuel This Month','Running total')+
    _kpi('fa-calendar-xmark','#7048E8',pendingLv,'Leave Pending','Awaiting approval')+
    _kpi('fa-triangle-exclamation','#E03131',overdueDels,'Overdue Tasks','Action needed')+
    '</div>';

  // Alerts strip
  if(alerts.length){
    html+='<div class="alert-card warn" style="margin-bottom:14px">'+
      '<i class="fas fa-bell"></i>'+
      '<div><div class="ac-title">Vehicle Alerts ('+alerts.length+')</div>'+
      alerts.map(function(a){
        return '<div class="lc-meta" style="margin-top:4px"><i class="fas '+a.ico+'" style="color:'+a.col+'"></i> '+
          '<b>'+_esc(a.vno)+'</b> '+_esc(a.msg)+'</div>';
      }).join('')+'</div></div>';
  }

  // Two-col grid: attendance + announcements
  var colStyle=_isMobile()?'display:block':'display:grid;grid-template-columns:1fr 1fr;gap:16px';
  html+='<div style="'+colStyle+'">'; // end two-col

  // Today attendance
  html+='<div>';
  html+='<div class="sec-hdr"><span><i class="fas fa-users" style="color:var(--P)"></i> Today\'s Attendance</span></div>';
  if(!todayAtt.length){
    html+='<div style="text-align:center;padding:32px 16px;color:var(--tx3);font-size:13px;background:var(--sur2);border-radius:var(--r);border:1.5px solid var(--bdr)">No records yet today.</div>';
  }else{
    html+='<div style="background:var(--sur2);border:1.5px solid var(--bdr);border-radius:var(--r);overflow:hidden">';
    todayAtt.slice(0,8).forEach(function(a){
      var drvObj=_driverByID(a.DriverID);
      var nm=drvObj?drvObj.Name:String(a.DriverID||'');
      var col=a.Status==='Present'?'var(--G)':a.Status==='Late'?'var(--O)':'var(--R)';
      var bc=a.Status==='Present'?'badge-green':a.Status==='Late'?'badge-yellow':'badge-red';
      html+='<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--bdr)">'+
        '<div style="width:30px;height:30px;border-radius:50%;background:'+_avatarColor(nm)+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;flex-shrink:0">'+_initials(nm)+'</div>'+
        '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(nm)+'</div>'+
        '<div style="font-size:11px;color:var(--tx3)">'+_fmtTime(a.InTime||'')+(a.OutTime?' — '+_fmtTime(a.OutTime):'')+'</div></div>'+
        '<span class="badge '+bc+'">'+_esc(a.Status||'')+'</span></div>';
    });
    if(todayAtt.length>8)html+='<div style="padding:10px 14px;text-align:center;font-size:12px;color:var(--tx3)">+'+( todayAtt.length-8)+' more</div>';
    html+='</div>';
  }
  html+='</div>';

  // Announcements
  html+='<div'+(  _isMobile()?' style="margin-top:16px"':'')+'>';
  html+='<div class="sec-hdr"><span><i class="fas fa-bullhorn" style="color:var(--V)"></i> Announcements</span></div>';
  if(!anns.length){
    html+='<div style="text-align:center;padding:32px 16px;color:var(--tx3);font-size:13px;background:var(--sur2);border-radius:var(--r);border:1.5px solid var(--bdr)">No announcements.</div>';
  }else{
    anns.slice(0,5).forEach(function(a){
      var pClass=String(a.Priority||'').toLowerCase()==='urgent'?'urgent':String(a.Priority||'').toLowerCase()==='high'?'high':'normal';
      html+='<div class="ann-card '+pClass+'">'+
        '<div class="ann-text">'+_esc(a.Message||a.Announcement||'')+'</div>'+
        '<div class="ann-meta"><i class="fas fa-user"></i>'+_esc(a.PostedBy||'')+'&nbsp;·&nbsp;<i class="fas fa-calendar"></i>'+_fmtDate(a.Date||a.CreatedAt||'')+'</div></div>';
    });
  }
  html+='</div>';
  html+='</div>'; // end two-col

  // Upcoming holidays
  var hols=(_D.holidays||[]).filter(function(h){return _daysLeft(String(h.Date||'').slice(0,10))>=0;}).slice(0,3);
  if(hols.length){
    html+='<div class="sec-hdr" style="margin-top:16px"><span><i class="fas fa-calendar-check" style="color:var(--T)"></i> Upcoming Holidays</span></div>';
    hols.forEach(function(h){
      var d=_parseAnyDate(String(h.Date||''));
      html+='<div class="hol-card">'+
        '<div class="hol-date"><div class="hol-day">'+(d?d.getDate():'?')+'</div><div class="hol-mon">'+(d?MN[d.getMonth()]:'')+'</div></div>'+
        '<div><div class="hol-name">'+_esc(h.Name||h.HolidayName||'')+'</div>'+
        '<div class="hol-type">'+_esc(h.Type||'Public Holiday')+'</div></div></div>';
    });
  }

  return html;
}
function _vOperations(){
  var veh=_D.vehicles||[];var drv=_D.drivers||[];
  var att=_D.attendance||[];var fuel=_D.fuel||[];
  var dels=_D.delegations||[];var chk=_D.checklists||[];
  var today=_today();

  var todayAtt=att.filter(function(a){return String(a.Date||'').slice(0,10)===today;});
  var present=todayAtt.filter(function(a){return a.Status==='Present'||a.Status==='Late';}).length;
  var todayFuel=fuel.filter(function(f){return String(f.Date||'').slice(0,10)===today;}).length;
  var overdueDels=dels.filter(function(d){return d.is_overdue;}).length;
  var pendingChk=chk.filter(function(c){return String(c.Status||'')==='Pending';}).length;

  var html='<div class="control-hero">' +
    '<div><span class="eyebrow">LIVE — '+_today()+'</span><h3>Fleet Control Room</h3>' +
    '<p>'+present+' drivers present · '+todayFuel+' fuel entries · '+veh.filter(function(v){return v.Status==='Active';}).length+' vehicles active</p></div>' +
    '<button class="control-cta" onclick="_loadV(\'dashboard\')"><i class="fas fa-chart-pie"></i> Full Dashboard</button></div>';

  html+='<div class="kpi-grid" style="margin-bottom:18px">';
  html+=_kpi('fa-users','#27AE60',present,'Present Today','');
  html+=_kpi('fa-list-check','#0D9488',pendingChk,'Pending Tasks','Checklist today');
  html+=_kpi('fa-triangle-exclamation','#E74C3C',overdueDels,'Overdue Tasks','');
  html+=_kpi('fa-gas-pump','#E67E22',todayFuel,'Fuel Entries','Today');
  html+='</div>';

  html+='<div class="sec-hdr"><i class="fas fa-exclamation-circle" style="color:var(--O)"></i>Needs Attention</div>';

  // Low fastag vehicles
  var lowFT=veh.filter(function(v){return Number(v.FastagBalance||0)<300;});
  if(lowFT.length){
    lowFT.forEach(function(v){
      html+='<button class="attention-card" onclick="openVehicleDetail(\''+v.VehicleID+'\')">' +
        '<div class="attention-icon">🏷️</div>' +
        '<div class="attention-copy"><b>'+_esc(v.VehicleNo)+' — Fastag Low</b><small>Balance: ₹'+Number(v.FastagBalance||0)+'</small></div>' +
        '<div class="attention-count">₹'+Number(v.FastagBalance||0)+'</div></button>';
    });
  }

  // Expiry alerts
  veh.forEach(function(v){
    var insD=_daysLeft(String(v.InsuranceExpiry||'').slice(0,10));
    if(insD>=0&&insD<=30){
      html+='<button class="attention-card" onclick="openVehicleDetail(\''+v.VehicleID+'\')">' +
        '<div class="attention-icon">🛡️</div>' +
        '<div class="attention-copy"><b>'+_esc(v.VehicleNo)+' — Insurance Expiring</b><small>'+insD+' days remaining</small></div>' +
        '<div class="attention-count" style="color:var(--R)">'+insD+'d</div></button>';
    }
  });

  // Overdue delegations
  if(overdueDels){
    html+='<button class="attention-card" onclick="_loadV(\'delegation\')">' +
      '<div class="attention-icon">⚠️</div>' +
      '<div class="attention-copy"><b>'+overdueDels+' Overdue Tasks</b><small>Delegations past due date</small></div>' +
      '<div class="attention-count" style="color:var(--R)">'+overdueDels+'</div></button>';
  }

  if(!lowFT.length&&!overdueDels){
    html+='<div style="padding:24px;text-align:center;color:var(--tx3);font-size:13px">✅ All clear — no urgent items</div>';
  }

  // Vehicle status grid
  html+='<div class="sec-hdr"><i class="fas fa-car" style="color:var(--P)"></i>Live Vehicle Status</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">';
  veh.filter(function(v){return v.Status==='Active';}).forEach(function(v){
    var drv=_driverByID(v.AssignedDriverID);
    var drvAtt=todayAtt.filter(function(a){return String(a.DriverID||'')===String(v.AssignedDriverID||'');});
    var attStatus=drvAtt.length?drvAtt[drvAtt.length-1].Status:'Not marked';
    var attCol=attStatus==='Present'?'var(--G)':attStatus==='Late'?'var(--O)':'var(--tx3)';
    html+='<div class="list-card" style="cursor:pointer" onclick="openVehicleDetail(\''+v.VehicleID+'\')">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'+
      '<span class="plate-tag">'+_esc(v.VehicleNo)+'</span>'+
      '<span style="font-size:11px;color:var(--tx3)">'+_esc(v.VehicleType||'')+'</span></div>'+
      '<div style="font-size:12px;color:var(--tx2);margin-bottom:4px"><i class="fas fa-id-badge"></i> '+_esc(drv?drv.Name:'Unassigned')+'</div>'+
      '<div style="font-size:11.5px;color:'+attCol+'"><i class="fas fa-circle-dot"></i> '+_esc(attStatus)+'</div>'+
      '<div style="font-size:11.5px;color:var(--tx3);margin-top:3px"><i class="fas fa-gauge-high"></i> '+Number(v.CurrentKM||0).toLocaleString('en-IN')+' km &nbsp;|&nbsp; Fastag: ₹'+Number(v.FastagBalance||0)+'</div></div>';
  });
  html+='</div>';

  return html;
}

// ── VEHICLES ──────────────────────────────────────────────────────────────────
function _vVehicles(){
  var veh=_D.vehicles||[];
  var html=_ph('Vehicles','<button class="btn btn-sm" onclick="openAddVehicle()"><i class="fas fa-plus"></i> Add Vehicle</button>');
  html+='<div class="search-bar"><i class="fas fa-search"></i><input id="veh-search" placeholder="Search by number, brand, type..." oninput="_filterVeh()" ></div>';
  if(!veh.length)return html+_emptyState('🚗','No vehicles yet','Add your first vehicle');
  html+='<div id="veh-list">'+_renderVehList(veh)+'</div>';
  return html;
}
function _filterVeh(){
  var q=(document.getElementById('veh-search').value||'').toLowerCase();
  var veh=(_D.vehicles||[]).filter(function(v){
    return !q||(v.VehicleNo||'').toLowerCase().includes(q)||(v.Brand||'').toLowerCase().includes(q)||
      (v.Model||'').toLowerCase().includes(q)||(v.VehicleType||'').toLowerCase().includes(q);
  });
  var el=document.getElementById('veh-list');if(el)el.innerHTML=_renderVehList(veh);
}
function _renderVehList(veh){
  if(!veh.length)return _emptyState('🔍','No results','Try a different search');
  return veh.map(function(v){
    var insD=_daysLeft(String(v.InsuranceExpiry||'').slice(0,10));
    var pucD=_daysLeft(String(v.PUCExpiry||'').slice(0,10));
    var ftB=Number(v.FastagBalance||0);
    var health=insD<7||pucD<7?'danger':insD<30||pucD<15||ftB<300?'warn':'ok';
    var hCol=health==='ok'?'var(--G)':health==='warn'?'var(--O)':'var(--R)';
    var hLabel=health==='ok'?'Healthy':health==='warn'?'Needs Attention':'Action Required';
    var drv=_driverByID(v.AssignedDriverID);
    return '<div class="veh-card" onclick="openVehicleDetail(\''+v.VehicleID+'\')">'+
      '<div class="vc-header">'+
      '<div><div class="vc-plate">'+_esc(v.VehicleNo)+'</div>'+
      '<div class="vc-brand">'+_esc((v.Brand||'')+' '+( v.Model||''))+'  <span class="pill">'+_esc(v.VehicleType||'')+'</span></div></div>'+
      '<div class="vc-health" style="background:'+hCol+'22;color:'+hCol+'"><div class="vc-dot" style="background:'+hCol+'"></div>'+hLabel+'</div></div>'+
      '<div class="vc-pills">'+
      '<span class="pill">'+_esc(v.FuelType||'')+'</span>'+
      '<span class="pill">'+_esc(v.OwnershipType||'')+'</span>'+
      (drv?'<span class="pill"><i class="fas fa-id-badge"></i> '+_esc(drv.Name)+'</span>':'')+
      '</div>'+
      '<div class="vc-stats">'+
      '<div class="vc-stat"><div class="vs-val">'+Number(v.CurrentKM||0).toLocaleString('en-IN')+'</div><div class="vs-lbl">Curr KM</div></div>'+
      '<div class="vc-stat"><div class="vs-val" style="color:'+(insD<30?'var(--R)':'var(--tx)')+'">'+insD+'d</div><div class="vs-lbl">Insurance</div></div>'+
      '<div class="vc-stat"><div class="vs-val" style="color:'+(pucD<15?'var(--R)':'var(--tx)')+'">'+pucD+'d</div><div class="vs-lbl">PUC</div></div>'+
      '<div class="vc-stat"><div class="vs-val" style="color:'+(ftB<300?'var(--R)':'var(--tx)')+'">₹'+ftB+'</div><div class="vs-lbl">Fastag</div></div>'+
      '</div></div>';
  }).join('');
}

// Vehicle detail
function openVehicleDetail(vID){
  var v=_vehicleByID(vID);if(!v)return;
  var drv=_driverByID(v.AssignedDriverID);
  var insD=_daysLeft(String(v.InsuranceExpiry||'').slice(0,10));
  var pucD=_daysLeft(String(v.PUCExpiry||'').slice(0,10));
  var ftB=Number(v.FastagBalance||0);
  var fuelRec=(_D.fuel||[]).filter(function(f){return String(f.VehicleID||'')===vID;});
  var lastFuel=fuelRec[fuelRec.length-1]||null;

  var body='<div class="vd-hero"><div class="vd-plate">'+_esc(v.VehicleNo)+'</div>'+
    '<div class="vd-name">'+_esc((v.Brand||'')+' '+(v.Model||''))+'</div>'+
    '<div class="vd-pills"><span class="vd-pill">'+_esc(v.FuelType||'')+'</span><span class="vd-pill">'+_esc(v.OwnershipType||'')+'</span><span class="vd-pill">'+_esc(v.VehicleType||'')+'</span></div></div>';

  body+='<div class="vd-stats">'+
    '<div class="vd-stat"><div class="vds-val">'+Number(v.CurrentKM||0).toLocaleString('en-IN')+'</div><div class="vds-lbl">Current KM</div></div>'+
    '<div class="vd-stat"><div class="vds-val">₹'+ftB+'</div><div class="vds-lbl">Fastag Bal</div></div>'+
    '<div class="vd-stat"><div class="vds-val">'+(lastFuel?lastFuel.Mileage+'kmpl':'—')+'</div><div class="vds-lbl">Last Mileage</div></div></div>';

  body+='<div class="doc-status-grid">'+
    '<div class="dsc" style="--kc:'+(insD<7?'var(--R)':insD<30?'var(--O)':'var(--G)')+'">'+
    '<div class="dsc-icon">🛡️</div><div class="dsc-label">Insurance</div><div class="dsc-val">'+_fmtDate(v.InsuranceExpiry)+'</div><div class="dsc-days">'+insD+'d left</div></div>'+
    '<div class="dsc" style="--kc:'+(pucD<7?'var(--R)':pucD<15?'var(--O)':'var(--G)')+'">'+
    '<div class="dsc-icon">🌿</div><div class="dsc-label">PUC</div><div class="dsc-val">'+_fmtDate(v.PUCExpiry)+'</div><div class="dsc-days">'+pucD+'d left</div></div>'+
    '<div class="dsc" style="--kc:'+(ftB<300?'var(--R)':ftB<1000?'var(--O)':'var(--G)')+'">'+
    '<div class="dsc-icon">🏷️</div><div class="dsc-label">Fastag</div><div class="dsc-val">₹'+ftB+'</div><div class="dsc-days">'+(ftB<300?'Recharge needed!':'OK')+'</div></div></div>';

  if(drv){
    body+='<div class="sec-hdr">Assigned Driver</div>'+
      '<div class="list-card" style="cursor:default">'+
      '<div style="display:flex;align-items:center;gap:12px">'+
      '<div style="width:40px;height:40px;border-radius:50%;background:'+_avatarColor(drv.Name)+';display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800">'+_initials(drv.Name)+'</div>'+
      '<div><div style="font-size:14px;font-weight:800">'+_esc(drv.Name)+'</div>'+
      '<div style="font-size:12px;color:var(--tx3)">'+_esc(drv.Mobile)+' &nbsp;·&nbsp; '+_esc(drv.BloodGroup||'')+'</div></div></div></div>';
  }

  body+='<div class="action-btns">'+
    '<button class="btn-action" onclick="closeModal();_loadV(\'fuel\')"><i class="fas fa-gas-pump"></i> Fuel</button>'+
    '<button class="btn-action" onclick="closeModal();_loadV(\'services\')"><i class="fas fa-wrench"></i> Service</button>'+
    '<button class="btn-action" onclick="closeModal();_loadV(\'documents\')"><i class="fas fa-file"></i> Docs</button>'+
    '<button class="btn-action" onclick="closeModal();_loadV(\'fastag\')"><i class="fas fa-tag"></i> Fastag</button>'+
    '</div>';

  _modal('Vehicle — '+v.VehicleNo, body);
}

function openAddVehicle(){
  var opts=function(arr){return arr.map(function(a){return'<option>'+a+'</option>';}).join('');};
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Vehicle Number *</label><input id="nv-no" placeholder="e.g. UP36B5958" style="text-transform:uppercase"></div>'+
    '<div class="fgrp"><label>Vehicle Type *</label><select id="nv-type"><option value="">Select</option>'+opts(APP_CONFIG.VEHICLE_TYPES)+'</select></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Brand</label><input id="nv-brand" placeholder="e.g. Maruti"></div>'+
    '<div class="fgrp"><label>Model</label><input id="nv-model" placeholder="e.g. Swift"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Fuel Type</label><select id="nv-fuel"><option value="">Select</option>'+opts(APP_CONFIG.FUEL_TYPES)+'</select></div>'+
    '<div class="fgrp"><label>Ownership</label><select id="nv-own"><option value="">Select</option>'+opts(APP_CONFIG.OWNERSHIP_TYPES)+'</select></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Insurance Expiry</label><input type="date" id="nv-ins"></div>'+
    '<div class="fgrp"><label>PUC Expiry</label><input type="date" id="nv-puc"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Fastag No</label><input id="nv-ftno" placeholder="Fastag number"></div>'+
    '<div class="fgrp"><label>Fastag Balance (₹)</label><input type="number" id="nv-ftbal" placeholder="0"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Registration No</label><input id="nv-reg" placeholder="MH19B3547"></div>'+
    '<div class="fgrp"><label>Current KM</label><input type="number" id="nv-km" placeholder="0"></div></div>'+
    '<div class="fgrp"><label>Assign Driver</label><select id="nv-drv"><option value="">— Unassigned —</option>'+
    (_D.drivers||[]).filter(function(d){return d.Status==='Active';}).map(function(d){return'<option value="'+d.DriverID+'">'+_esc(d.Name)+'</option>';}).join('')+'</select></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddVehicle()"><i class="fas fa-plus"></i> Add Vehicle</button></div>';
  _modal('Add New Vehicle',body);
}

function submitAddVehicle(){
  var no=document.getElementById('nv-no').value.trim().toUpperCase();
  var type=document.getElementById('nv-type').value;
  if(!no||!type){_toast('Vehicle number aur type zaroori hain','warn');return;}
  var data={
    vehicleNo:no,vehicleType:type,
    brand:document.getElementById('nv-brand').value.trim(),
    model:document.getElementById('nv-model').value.trim(),
    fuelType:document.getElementById('nv-fuel').value,
    ownershipType:document.getElementById('nv-own').value,
    insuranceExpiry:document.getElementById('nv-ins').value,
    pucExpiry:document.getElementById('nv-puc').value,
    fastagNo:document.getElementById('nv-ftno').value.trim(),
    fastagBalance:document.getElementById('nv-ftbal').value||0,
    registrationNo:document.getElementById('nv-reg').value.trim(),
    currentKM:document.getElementById('nv-km').value||0,
    assignedDriverID:document.getElementById('nv-drv').value
  };
  closeModal();_showLoader('Adding vehicle...');
  _gas('addVehicle',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('Vehicle added! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── DRIVERS ───────────────────────────────────────────────────────────────────
function _vDrivers(){
  var drv=_D.drivers||[];
  var html=_ph('Drivers','<button class="btn btn-sm" onclick="openAddDriver()"><i class="fas fa-plus"></i> Add Driver</button>');
  html+='<div class="search-bar"><i class="fas fa-search"></i><input id="drv-search" placeholder="Search by name, mobile, license..." oninput="_filterDrv()"></div>';
  if(!drv.length)return html+_emptyState('👤','No drivers yet','Add your first driver');
  html+='<div id="drv-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">'+_renderDrvGrid(drv)+'</div>';
  return html;
}
function _filterDrv(){
  var q=(document.getElementById('drv-search').value||'').toLowerCase();
  var drv=(_D.drivers||[]).filter(function(d){
    return !q||(d.Name||'').toLowerCase().includes(q)||(d.Mobile||'').includes(q)||(d.LicenseNo||'').toLowerCase().includes(q);
  });
  var el=document.getElementById('drv-grid');if(el)el.innerHTML=_renderDrvGrid(drv);
}
function _renderDrvGrid(drv){
  if(!drv.length)return _emptyState('🔍','No results','Try a different search');
  return drv.map(function(d){
    var col=_avatarColor(d.Name);
    var licD=_daysLeft(String(d.LicenseExpiry||'').slice(0,10));
    var veh=_vehicles().filter(function(v){return String(v.AssignedDriverID||'')===String(d.DriverID||'');});
    return '<div class="driver-card" onclick="openDriverDetail(\''+d.DriverID+'\')">'+
      '<div class="dc-top">'+
      '<div class="dc-avatar" style="background:'+col+';width:48px;height:48px;border-radius:12px;font-size:17px;font-weight:900">'+_initials(d.Name)+'</div>'+
      '<div style="flex:1;min-width:0">'+
      '<div class="dc-name">'+_esc(d.Name)+'</div>'+
      '<div class="dc-meta"><i class="fas fa-phone"></i> '+_esc(d.Mobile)+'</div>'+
      '<div class="dc-meta"><i class="fas fa-id-card"></i> '+_esc(d.LicenseNo||'—')+'</div>'+
      '<div class="dc-foot">'+
      '<span class="badge '+(d.Status==='Active'?'badge-active':'badge-inactive')+'">'+_esc(d.Status)+'</span>'+
      (veh.length?'<span class="pill"><i class="fas fa-car"></i> '+_esc(veh[0].VehicleNo)+'</span>':'')+
      (licD<30&&licD>=0?'<span class="badge badge-warning"><i class="fas fa-id-card"></i> Lic: '+licD+'d</span>':'')+
      '</div></div></div></div>';
  }).join('');
}
function openDriverDetail(dID){
  var d=_driverByID(dID);if(!d)return;
  var veh=_vehicles().filter(function(v){return String(v.AssignedDriverID||'')===dID;});
  var licD=_daysLeft(String(d.LicenseExpiry||'').slice(0,10));
  var col=_avatarColor(d.Name);

  var body='<div style="display:flex;align-items:center;gap:14px;padding:4px 0 16px">'+
    '<div style="width:56px;height:56px;border-radius:14px;background:'+col+';display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#fff;flex-shrink:0">'+_initials(d.Name)+'</div>'+
    '<div><div style="font-size:17px;font-weight:900">'+_esc(d.Name)+'</div>'+
    '<div style="font-size:12px;color:var(--tx3)">'+_esc(d.Mobile)+' &nbsp;·&nbsp; '+_esc(d.BloodGroup||'—')+'</div>'+
    '<div style="margin-top:4px"><span class="badge '+(d.Status==='Active'?'badge-active':'badge-inactive')+'">'+_esc(d.Status)+'</span></div></div></div>';

  body+='<div class="detail-grid">'+
    _dr('License',d.LicenseNo)+_dr('License Expiry',_fmtDate(d.LicenseExpiry)+(licD<30&&licD>=0?' <span style="color:var(--R);font-weight:800">('+licD+'d)</span>':''))+
    _dr('Joining Date',_fmtDate(d.JoiningDate))+_dr('Address',d.Address||'—')+
    _dr('Emergency',d.EmergencyContact||'—')+_dr('Salary','₹'+Number(d.Salary||0).toLocaleString('en-IN'))+
    _dr('Week Off',d.WeekOffDay||'Sunday')+_dr('Aadhaar',d.AadhaarNo||'—')+'</div>';

  if(veh.length){
    body+='<div class="sec-hdr">Assigned Vehicle</div>'+
      '<div class="list-card" style="cursor:default">'+
      '<div class="lc-row"><span class="plate-tag">'+_esc(veh[0].VehicleNo)+'</span>'+
      '<span class="badge badge-active">Active</span></div>'+
      '<div class="lc-sub">'+_esc(veh[0].Brand||'')+' '+_esc(veh[0].Model||'')+' · '+_esc(veh[0].FuelType||'')+'</div></div>';
  }

  body+='<div class="action-btns">'+
    '<button class="btn-action" onclick="closeModal();_openAddPenalty(\''+dID+'\')"><i class="fas fa-triangle-exclamation"></i> Penalty</button>'+
    '<button class="btn-action" onclick="closeModal();_openAddReward(\''+dID+'\')"><i class="fas fa-trophy"></i> Reward</button>'+
    '<button class="btn-action" onclick="closeModal();_openAddLeaveApproval(\''+dID+'\')"><i class="fas fa-calendar"></i> Leave</button>'+
    '</div>';

  _modal('Driver — '+d.Name, body);
}
function _dr(label,val){
  return '<div class="dr-row"><div class="dr-label">'+_esc(label)+'</div><div class="dr-val">'+val+'</div></div>';
}
function openAddDriver(){
  var opts=function(arr){return arr.map(function(a){return'<option>'+a+'</option>';}).join('');};
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Full Name *</label><input id="nd-name" placeholder="Driver full name"></div>'+
    '<div class="fgrp"><label>Mobile *</label><input id="nd-mob" placeholder="9XXXXXXXXX" type="tel"></div></div>'+
    '<div class="fgrp"><label>Address</label><input id="nd-addr" placeholder="Full address"></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>License Number *</label><input id="nd-lic" placeholder="UP1234567890"></div>'+
    '<div class="fgrp"><label>License Expiry</label><input type="date" id="nd-licexp"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Blood Group</label><select id="nd-blood"><option value="">Select</option>'+opts(APP_CONFIG.BLOOD_GROUPS)+'</select></div>'+
    '<div class="fgrp"><label>Week Off</label><select id="nd-wkoff">'+opts(APP_CONFIG.WEEK_DAYS)+'</select></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Joining Date</label><input type="date" id="nd-join" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Birth Date</label><input type="date" id="nd-dob"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Aadhaar No</label><input id="nd-aadh" placeholder="12-digit Aadhaar"></div>'+
    '<div class="fgrp"><label>Emergency Contact</label><input id="nd-emer" placeholder="9XXXXXXXXX" type="tel"></div></div>'+
    '<div class="fgrp"><label>Salary (₹)</label><input type="number" id="nd-sal" placeholder="Monthly salary"></div>'+
    '<div class="sec-hdr">App Login (Optional)</div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Email</label><input type="email" id="nd-email" placeholder="driver@ishasteels.com"></div>'+
    '<div class="fgrp"><label>Password</label><input id="nd-pw" placeholder="Login password" type="password"></div></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddDriver()"><i class="fas fa-plus"></i> Add Driver</button></div>';
  _modal('Add New Driver',body);
}
function submitAddDriver(){
  var name=document.getElementById('nd-name').value.trim();
  var mob=document.getElementById('nd-mob').value.trim();
  var lic=document.getElementById('nd-lic').value.trim();
  if(!name||!mob){_toast('Name aur mobile zaroori hain','warn');return;}
  var data={
    name:name,mobile:mob,licenseNo:lic,
    address:document.getElementById('nd-addr').value.trim(),
    licenseExpiry:document.getElementById('nd-licexp').value,
    bloodGroup:document.getElementById('nd-blood').value,
    weekOffDay:document.getElementById('nd-wkoff').value,
    joiningDate:document.getElementById('nd-join').value,
    birthDate:document.getElementById('nd-dob').value,
    aadhaarNo:document.getElementById('nd-aadh').value.trim(),
    emergencyContact:document.getElementById('nd-emer').value.trim(),
    salary:document.getElementById('nd-sal').value||0,
    email:document.getElementById('nd-email').value.trim(),
    password:document.getElementById('nd-pw').value
  };
  closeModal();_showLoader('Adding driver...');
  _gas('addDriver',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('Driver added! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── ATTENDANCE (Admin/Manager) ─────────────────────────────────────────────
function _vAttendance(){
  var att=_D.attendance||[];
  var today=_today();
  var todayAtt=att.filter(function(a){return String(a.Date||'').slice(0,10)===today;});
  var present=todayAtt.filter(function(a){return a.Status==='Present'||a.Status==='Late';}).length;
  var late=todayAtt.filter(function(a){return a.Status==='Late';}).length;
  var absent=todayAtt.filter(function(a){return a.Status==='Absent';}).length;

  var html=_ph('Attendance',
    '<button class="btn btn-sm btn-ghost" onclick="_downloadAttCSV()"><i class="fas fa-download"></i> CSV</button>'+
    '<button class="btn btn-sm" onclick="_loadV(\'muster\')"><i class="fas fa-table-list"></i> Muster</button>');

  html+='<div class="att-summary">'+
    '<div class="as-item as-present"><div class="as-num">'+present+'</div><div class="as-lbl">Present</div></div>'+
    '<div class="as-item as-late"><div class="as-num">'+late+'</div><div class="as-lbl">Late</div></div>'+
    '<div class="as-item as-absent"><div class="as-num">'+absent+'</div><div class="as-lbl">Absent</div></div>'+
    '<div class="as-item as-total"><div class="as-num">'+todayAtt.length+'</div><div class="as-lbl">Total</div></div></div>';

  html+='<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+
    '<select id="att-filter-date" onchange="_filterAtt()" style="padding:8px 12px;border:1.5px solid var(--bdr);border-radius:8px;font-size:13px;background:var(--sur);color:var(--tx);font-family:inherit">'+
    '<option value="">Today</option><option value="week">This Week</option><option value="month">This Month</option></select>'+
    '<div class="search-bar" style="flex:1;margin-bottom:0"><i class="fas fa-search"></i><input id="att-search" placeholder="Search driver..." oninput="_filterAtt()"></div></div>';

  html+='<div id="att-list">'+_renderAttList(todayAtt)+'</div>';
  return html;
}
function _filterAtt(){
  var q=(document.getElementById('att-search').value||'').toLowerCase();
  var range=(document.getElementById('att-filter-date').value)||'';
  var today=_today();
  var att=(_D.attendance||[]).filter(function(a){
    var d=String(a.Date||'').slice(0,10);
    if(range==='week'){var w=new Date();w.setDate(w.getDate()-7);if(d<w.toISOString().slice(0,10))return false;}
    else if(range==='month'){if(!d.startsWith(today.slice(0,7)))return false;}
    else{if(d!==today)return false;}
    if(q){var name=_driverName(a.DriverID).toLowerCase();if(!name.includes(q))return false;}
    return true;
  });
  var el=document.getElementById('att-list');if(el)el.innerHTML=_renderAttList(att);
}
function _renderAttList(att){
  if(!att.length)return _emptyState('📋','No records','No attendance records for this period');
  if(_isMobile()){
    return att.slice().reverse().map(function(a){
      var sCol=a.Status==='Present'?'badge-present':a.Status==='Late'?'badge-late':a.Status==='Half Day'?'badge-hd':'badge-absent';
      return '<div class="list-card">'+
        '<div class="lc-row"><b>'+_esc(_driverName(a.DriverID))+'</b><span class="badge '+sCol+'">'+_esc(a.Status)+'</span></div>'+
        '<div class="lc-meta"><i class="fas fa-calendar"></i>'+_fmtDate(a.Date)+'&nbsp;·&nbsp;IN: <b>'+(_fmtTime(a.InTime)||'—')+'</b>'+(a.OutTime?'&nbsp;·&nbsp;OUT: <b>'+_fmtTime(a.OutTime)+'</b>':'')+'</div>'+
        (a.TotalHours?'<div class="lc-sub"><i class="fas fa-clock"></i> '+_esc(a.TotalHours)+'</div>':'')+
        '</div>';
    }).join('');
  }
  return '<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
    '<th>Driver</th><th>Date</th><th>IN</th><th>OUT</th><th>Hours</th><th>Status</th><th>GPS</th></tr></thead><tbody>'+
    att.slice().reverse().map(function(a){
      var sCol=a.Status==='Present'?'badge-present':a.Status==='Late'?'badge-late':a.Status==='Half Day'?'badge-hd':'badge-absent';
      return '<tr><td><b>'+_esc(_driverName(a.DriverID))+'</b></td>'+
        '<td>'+_fmtDate(a.Date)+'</td>'+
        '<td>'+_esc(_fmtTime(a.InTime)||'—')+'</td>'+
        '<td>'+_esc(_fmtTime(a.OutTime)||'—')+'</td>'+
        '<td>'+_esc(a.TotalHours||'—')+'</td>'+
        '<td><span class="badge '+sCol+'">'+_esc(a.Status)+'</span></td>'+
        '<td style="font-size:11px;color:var(--tx3)">'+_esc(a.GPSLocation?'📍 Yes':'—')+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function _downloadAttCSV(){
  var att=_D.attendance||[];
  var rows=[['Driver','Date','IN','OUT','Hours','Status','GPS','Location']];
  att.forEach(function(a){rows.push([_driverName(a.DriverID),a.Date,_fmtTime(a.InTime),_fmtTime(a.OutTime),a.TotalHours||'',a.Status,a.GPSLocation||'',a.Location||'']);});
  _downloadCSV('ISE_Attendance_'+_today()+'.csv',rows);
}

// ── MUSTER GRID ───────────────────────────────────────────────────────────────
function _vMuster(){
  var html=_ph('Muster Report',
    '<select id="muster-month" onchange="_loadMuster()" style="padding:8px 12px;border:1.5px solid var(--bdr);border-radius:8px;font-size:13px;background:var(--sur);color:var(--tx);font-family:inherit">'+
    _last6Months().map(function(m){return'<option value="'+m.val+'"'+(m.val===_today().slice(0,7)?' selected':'')+'>'+m.label+'</option>';}).join('')+'</select>'+
    '<button class="btn btn-sm btn-ghost" onclick="_downloadMusterCSV()"><i class="fas fa-download"></i> CSV</button>');
  html+='<div id="muster-grid">'+_renderMuster()+'</div>';
  return html;
}
function _last6Months(){
  var res=[];var d=new Date();
  for(var i=0;i<6;i++){
    var y=d.getFullYear(),m=d.getMonth();
    res.push({val:y+'-'+(m<9?'0':'')+(m+1),label:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m]+' '+y});
    d.setMonth(d.getMonth()-1);
  }
  return res;
}
function _loadMuster(){
  var m=document.getElementById('muster-month').value;
  _showLoader('Loading muster...');
  _gas('getMusterGrid',[m],function(res){
    _hideLoader();
    var el=document.getElementById('muster-grid');
    if(el)el.innerHTML=_renderMusterFromData(res);
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _renderMuster(){
  var att=_D.attendance||[];
  var drv=_D.drivers||[];
  var today=_today();var mon=today.slice(0,7);
  var year=parseInt(mon.slice(0,4)),m=parseInt(mon.slice(5,7))-1;
  var days=new Date(year,m+1,0).getDate();
  var dates=[];for(var d=1;d<=days;d++)dates.push(mon+'-'+(d<10?'0':'')+d);

  if(!drv.length)return _emptyState('📊','No drivers','Add drivers first');
  var html='<div class="muster-wrap"><table class="muster-tbl"><thead><tr>'+
    '<th class="mst-name">Driver</th><th class="mst-pct">%</th>'+
    dates.map(function(dt){var dow=new Date(dt+'T00:00:00').getDay();return'<th class="mst-day">'+(dow===0||dow===6?'<b>':'')+dt.slice(8)+(dow===0||dow===6?'</b>':'')+'</th>';}).join('')+'</tr></thead><tbody>';

  drv.filter(function(d){return d.Status==='Active';}).forEach(function(dr){
    var dID=String(dr.DriverID||'');
    var drvAtt={};
    att.filter(function(a){return String(a.DriverID||'')===dID&&String(a.Date||'').startsWith(mon);})
      .forEach(function(a){drvAtt[String(a.Date||'').slice(0,10)]=a.Status;});
    var wod=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(dr.WeekOffDay||'Sunday');
    var p=0,total=0;
    var cells=dates.map(function(dt){
      var dow=new Date(dt+'T00:00:00').getDay();
      if(dow===wod)return'<td class="mst-cell mst-WO">WO</td>';
      total++;
      var st=drvAtt[dt];
      if(!st)return dt<=today?'<td class="mst-cell mst-A">A</td>':'<td class="mst-cell"></td>';
      var cls=st==='Present'?'mst-P':st==='Late'?'mst-L':st==='Half Day'?'mst-HD':'mst-A';
      var abbr=st==='Present'?'P':st==='Late'?'L':st==='Half Day'?'HD':'A';
      if(st==='Present')p++;else if(st==='Late')p+=0.75;else if(st==='Half Day')p+=0.5;
      return'<td class="mst-cell '+cls+'">'+abbr+'</td>';
    });
    var pct=total>0?Math.round(p/total*100):0;
    html+='<tr><td class="mst-name"><b>'+_esc(dr.Name)+'</b></td>'+
      '<td class="mst-pct" style="color:'+(pct>=90?'var(--G)':pct>=70?'var(--O)':'var(--R)')+'">'+pct+'%</td>'+
      cells.join('')+'</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function _renderMusterFromData(res){
  if(!res||!res.rows)return _emptyState('📊','No data','No muster data');
  var dates=res.dates||[];var rows=res.rows||[];
  var html='<div class="muster-wrap"><table class="muster-tbl"><thead><tr>'+
    '<th class="mst-name">Driver</th><th class="mst-pct">%</th>'+
    dates.map(function(dt){return'<th class="mst-day">'+dt.slice(8)+'</th>';}).join('')+'</tr></thead><tbody>';
  rows.forEach(function(r){
    html+='<tr><td class="mst-name"><b>'+_esc(r.name)+'</b></td>'+
      '<td class="mst-pct" style="color:'+(r.pct>=90?'var(--G)':r.pct>=70?'var(--O)':'var(--R)')+'">'+r.pct+'%</td>'+
      (r.cells||[]).map(function(c){
        var cls=c==='P'?'mst-P':c==='L'?'mst-L':c==='HD'?'mst-HD':c==='A'?'mst-A':c==='WO'?'mst-WO':c==='H'?'mst-H':'';
        return'<td class="mst-cell '+cls+'">'+c+'</td>';
      }).join('')+'</tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function _downloadMusterCSV(){
  _toast('Downloading...','info');
  _gas('getMusterGrid',[document.getElementById('muster-month').value],function(res){
    if(!res||!res.rows)return;
    var rows=[['Driver','%'].concat(res.dates||[])];
    (res.rows||[]).forEach(function(r){rows.push([r.name,r.pct+'%'].concat(r.cells||[]));});
    _downloadCSV('ISE_Muster_'+(res.month||_today().slice(0,7))+'.csv',rows);
  },function(e){_toast(e.message,'err');});
}

// ── FUEL ─────────────────────────────────────────────────────────────────────
function _vFuel(){
  var fuel=_D.fuel||[];
  var html=_ph('Fuel Entries',
    '<button class="btn btn-sm btn-ghost" onclick="_downloadFuelCSV()"><i class="fas fa-download"></i> CSV</button>'+
    '<button class="btn btn-sm" onclick="openAddFuel()"><i class="fas fa-plus"></i> Add Entry</button>');

  var mon=_today().slice(0,7);
  var monFuel=fuel.filter(function(f){return String(f.Date||'').startsWith(mon);});
  var totAmt=monFuel.reduce(function(s,f){return s+Number(f.Amount||0);},0);
  var totQty=monFuel.reduce(function(s,f){return s+Number(f.FuelQty||0);},0);
  var avgMil=monFuel.filter(function(f){return parseFloat(f.Mileage||0)>0;});
  var avgM=avgMil.length?( avgMil.reduce(function(s,f){return s+parseFloat(f.Mileage||0);},0)/avgMil.length).toFixed(1):0;

  html+='<div class="finance-strip">'+
    '<div class="fs-item"><div class="fs-label">Month Spend</div><div class="fs-val">'+_inr(totAmt)+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Total Qty</div><div class="fs-val">'+totQty.toFixed(1)+'L</div></div>'+
    '<div class="fs-item"><div class="fs-label">Avg Mileage</div><div class="fs-val">'+avgM+' km/L</div></div>'+
    '<div class="fs-item"><div class="fs-label">Entries</div><div class="fs-val">'+monFuel.length+'</div></div></div>';

  if(_isMobile()){
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    fuel.slice().reverse().slice(0,50).forEach(function(f){
      var mil=parseFloat(f.Mileage||0);
      var mCol=mil>0&&mil<6?'var(--R)':mil>=12?'var(--G)':'var(--tx)';
      html+='<div class="list-card">'+
        '<div class="lc-row"><span class="plate-tag">'+_esc(_vehicleNo(f.VehicleID))+'</span><b>'+_inr(f.Amount)+'</b></div>'+
        '<div class="lc-meta"><i class="fas fa-user"></i>'+_esc(_driverName(f.DriverID))+'&nbsp;·&nbsp;<i class="fas fa-calendar"></i>'+_fmtDate(f.Date)+'</div>'+
        '<div class="lc-meta"><i class="fas fa-gas-pump"></i>'+_esc(f.FuelQty)+'L &nbsp;·&nbsp; ₹'+_esc(f.CostPerLiter)+'/L'+(mil>0?' &nbsp;·&nbsp; <b style="color:'+mCol+'">'+mil+' km/L</b>':'')+'</div>'+
        (f.PumpName?'<div class="lc-sub"><i class="fas fa-location-dot"></i> '+_esc(f.PumpName)+'</div>':'')+
        '</div>';
    });
    html+='</div>';
  } else {
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr>'+
      '<th>Vehicle</th><th>Driver</th><th>Date</th><th>Qty</th><th>Amount</th><th>Rate</th><th>Mileage</th><th>Pump</th></tr></thead><tbody>';
    fuel.slice().reverse().slice(0,50).forEach(function(f){
      var mil=parseFloat(f.Mileage||0);
      var mCol=mil>0&&mil<6?'color:var(--R);font-weight:800':mil>=12?'color:var(--G)':'';
      html+='<tr>'+
        '<td><span class="plate-tag">'+_esc(_vehicleNo(f.VehicleID))+'</span></td>'+
        '<td>'+_esc(_driverName(f.DriverID))+'</td>'+
        '<td>'+_fmtDate(f.Date)+'</td>'+
        '<td>'+_esc(f.FuelQty)+'L</td>'+
        '<td><b>'+_inr(f.Amount)+'</b></td>'+
        '<td>₹'+_esc(f.CostPerLiter)+'/L</td>'+
        '<td style="'+mCol+'">'+(mil>0?mil+' km/L':'—')+'</td>'+
        '<td style="font-size:12px;color:var(--tx3)">'+_esc(f.PumpName||'—')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function openAddFuel(){
  var vList=(_D.vehicles||[]).filter(function(v){return v.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Vehicle *</label><select id="af-veh" onchange="_fuelVehChange()"><option value="">Select Vehicle</option>'+
    vList.map(function(v){return'<option value="'+v.VehicleID+'">'+_esc(v.VehicleNo)+' — '+_esc((v.Brand||'')+' '+(v.Model||''))+'</option>';}).join('')+'</select></div>'+
    '<div id="af-prev-km" style="font-size:12.5px;color:var(--tx3);margin:6px 0 12px;padding:8px 12px;background:var(--sur2);border-radius:8px;display:none"></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date *</label><input type="date" id="af-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Current KM</label><input type="number" id="af-km" placeholder="Odometer reading" oninput="_fuelCalc()"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Fuel Qty (L) *</label><input type="number" id="af-qty" placeholder="e.g. 30" step="0.1" oninput="_fuelCalc()"></div>'+
    '<div class="fgrp"><label>Amount (₹) *</label><input type="number" id="af-amt" placeholder="e.g. 3000" oninput="_fuelCalc()"></div></div>'+
    '<div id="af-calc" class="calc-preview" style="display:none"></div>'+
    '<div class="fgrp"><label>Pump Name</label><input id="af-pump" placeholder="e.g. HPCL Rohini"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddFuel()"><i class="fas fa-gas-pump"></i> Add Fuel Entry</button></div>';
  _modal('Add Fuel Entry',body);
}
function _fuelVehChange(){
  var vID=document.getElementById('af-veh').value;
  var el=document.getElementById('af-prev-km');
  if(!vID){if(el)el.style.display='none';return;}
  var v=_vehicleByID(vID);
  if(v&&el){el.textContent='Last KM: '+Number(v.CurrentKM||0).toLocaleString('en-IN')+' km';el.style.display='block';}
}
function _fuelCalc(){
  var qty=parseFloat(document.getElementById('af-qty').value||0);
  var amt=parseFloat(document.getElementById('af-amt').value||0);
  var km=parseFloat(document.getElementById('af-km').value||0);
  var vID=document.getElementById('af-veh').value;
  var v=vID?_vehicleByID(vID):null;
  var prevKM=v?Number(v.CurrentKM||0):0;
  var el=document.getElementById('af-calc');if(!el)return;
  if(qty<=0&&amt<=0){el.style.display='none';return;}
  var rate=qty>0&&amt>0?(amt/qty).toFixed(2):0;
  var dist=km>0&&prevKM>0&&km>prevKM?km-prevKM:0;
  var mileage=qty>0&&dist>0?(dist/qty).toFixed(1):0;
  var mCol=mileage>0&&mileage<6?'color:var(--R);font-weight:800':mileage>=12?'color:var(--G);font-weight:700':'';
  el.style.display='flex';
  el.innerHTML='⛽ Rate: <b>₹'+rate+'/L</b>'+(dist>0?' &nbsp;|&nbsp; Distance: <b>'+dist+' km</b>':'')+(mileage>0?' &nbsp;|&nbsp; Mileage: <b style="'+mCol+'">'+mileage+' km/L</b>':'');
}
function submitAddFuel(){
  var vID=document.getElementById('af-veh').value;
  var qty=document.getElementById('af-qty').value;
  var amt=document.getElementById('af-amt').value;
  if(!vID){_toast('Vehicle select karo','warn');return;}
  if(!qty||!amt){_toast('Qty aur amount zaroori hain','warn');return;}
  var v=_vehicleByID(vID);
  var data={vehicleID:vID,date:document.getElementById('af-date').value,
    kmReading:document.getElementById('af-km').value||0,
    previousKM:v?Number(v.CurrentKM||0):0,
    fuelQty:qty,amount:amt,pumpName:document.getElementById('af-pump').value.trim()};
  closeModal();_showLoader('Adding fuel entry...');
  _gas('addFuel',[data],function(r){
    _hideLoader();
    if(r&&r.success){_toast('Fuel entry added! Mileage: '+(r.mileage||'—')+' km/L ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _downloadFuelCSV(){
  var rows=[['Vehicle','Driver','Date','KM','Prev KM','Distance','Qty(L)','Amount','Rate/L','Mileage','Pump']];
  (_D.fuel||[]).forEach(function(f){
    rows.push([_vehicleNo(f.VehicleID),_driverName(f.DriverID),f.Date,f.KMReading,f.PreviousKM,f.DistanceTravelled,f.FuelQty,f.Amount,f.CostPerLiter,f.Mileage,f.PumpName||'']);
  });
  _downloadCSV('ISE_Fuel_'+_today()+'.csv',rows);
}

// ── CHECKLIST (Admin/Manager) ─────────────────────────────────────────────────
function _vChecklist(){
  var chk=_D.checklists||[];
  var today=_today();
  var done=chk.filter(function(c){return c.Status==='Done';}).length;
  var pending=chk.filter(function(c){return c.Status==='Pending';}).length;

  var html=_ph('Checklist — Today',
    '<button class="btn btn-sm btn-ghost" onclick="_loadV(\'checklist_setup\')"><i class="fas fa-sliders"></i> Task Setup</button>'+
    '<button class="btn btn-sm" onclick="_refreshChecklist()"><i class="fas fa-rotate-right"></i> Refresh</button>');

  html+='<div class="finance-strip" style="margin-bottom:16px">'+
    '<div class="fs-item"><div class="fs-label">Done</div><div class="fs-val" style="color:var(--G)">'+done+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Pending</div><div class="fs-val" style="color:var(--O)">'+pending+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Total</div><div class="fs-val">'+chk.length+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Completion</div><div class="fs-val">'+(chk.length?Math.round(done/chk.length*100):0)+'%</div></div></div>';

  if(!chk.length)return html+_emptyState('✅','No tasks today','Set up tasks in Task Setup');

  // Group by driver
  var byDriver={};
  chk.forEach(function(c){
    var key=c.TaskType==='Shared'?'__shared__':String(c.AssignedTo||'__unknown__');
    if(!byDriver[key])byDriver[key]=[];
    byDriver[key].push(c);
  });

  Object.keys(byDriver).forEach(function(key){
    var items=byDriver[key];
    var label=key==='__shared__'?'🔄 Shared Tasks':key==='__unknown__'?'Unassigned':_driverName(key);
    html+='<div class="sec-hdr">'+_esc(label)+'</div>';
    items.forEach(function(c){
      var isDone=c.Status==='Done';
      var isShared=c.TaskType==='Shared';
      html+='<div class="list-card" style="cursor:default">'+
        '<div style="display:flex;align-items:center;gap:12px">'+
        '<div style="font-size:20px">'+(isDone?'✅':'🔲')+'</div>'+
        '<div style="flex:1">'+
        '<div style="font-size:13px;font-weight:700;color:var(--tx)">'+_esc(c.TaskName)+(isShared?'<span class="shared-badge">Shared</span>':'')+'</div>'+
        '<div style="font-size:11.5px;color:var(--tx3);margin-top:3px">'+
        (isDone?'✓ Done by <b>'+_esc(c.ClaimedByName)+'</b> at '+_esc(c.ClaimedAt||''):'⏳ Pending — '+_esc(c.PlannedTime||''))+
        '</div></div>'+
        '<span class="badge '+(isDone?'badge-completed':'badge-pending')+'">'+_esc(c.Status)+'</span></div></div>';
    });
  });
  return html;
}
function _refreshChecklist(){
  _showLoader('Generating checklist...');
  _gas('generateChecklist',[],function(r){
    _hideLoader();
    if(r&&r.success){_toast('Checklist refreshed! '+r.rows+' tasks ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── CHECKLIST SETUP ───────────────────────────────────────────────────────────
function _vChecklistSetup(){
  var tasks=_D.taskList||[];
  var html=_ph('Task Setup',
    '<button class="btn btn-sm" onclick="openAddTask()"><i class="fas fa-plus"></i> Add Task</button>');

  if(!tasks.length)return html+_emptyState('📋','No tasks setup','Create recurring tasks for drivers');

  html+='<div style="display:flex;flex-direction:column;gap:8px">';
  tasks.forEach(function(t){
    var active=t.Status==='Active';
    var isShared=t.TaskType==='Shared';
    var assignees=String(t.AssignedToName||t.AssignedTo||'—');
    var freqMap={D:'Daily',W:'Weekly',M:'Monthly','One-time':'One-time'};
    html+='<div class="list-card">'+
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">'+
      '<div style="flex:1">'+
      '<div style="font-size:13.5px;font-weight:800;color:var(--tx)">'+_esc(t.TaskName)+(isShared?'<span class="shared-badge">Shared</span>':'')+'</div>'+
      '<div style="font-size:12px;color:var(--tx3);margin-top:4px">'+
      '<i class="fas fa-user"></i> '+_esc(assignees)+' &nbsp;·&nbsp; '+
      '<i class="fas fa-repeat"></i> '+(freqMap[t.Frequency]||t.Frequency)+' &nbsp;·&nbsp; '+
      '<i class="fas fa-clock"></i> '+_esc(t.StartTime||'—')+'</div></div>'+
      '<div style="display:flex;gap:6px;align-items:center">'+
      '<span class="badge '+(active?'badge-active':'badge-inactive')+'">'+_esc(t.Status)+'</span>'+
      (active?'<button class="btn btn-xs btn-ghost" onclick="deactivateTask(\''+t.TaskUID+'\')">Deactivate</button>':'')+
      '</div></div></div>';
  });
  html+='</div>';
  return html;
}
function openAddTask(){
  var drv=(_D.drivers||[]).filter(function(d){return d.Status==='Active';});
  var drvOpts=drv.map(function(d){return'<option value="'+d.DriverID+'">'+_esc(d.Name)+'</option>';}).join('');
  var freqOpts=APP_CONFIG.TASK_FREQ.map(function(f){return'<option value="'+f.val+'">'+f.label+'</option>';}).join('');

  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Task Name *</label><input id="at-name" placeholder="e.g. Vehicle Interior Cleaning"></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Task Type *</label>'+
    '<select id="at-type" onchange="_taskTypeChange()">'+
    '<option value="Individual">Individual — One driver</option>'+
    '<option value="Shared">Shared — First to claim wins</option></select></div>'+
    '<div class="fgrp"><label>Frequency *</label><select id="at-freq">'+freqOpts+'</select></div></div>'+
    '<div class="fgrp"><label>Assign To *</label>'+
    '<select id="at-drv-single"><option value="">Select Driver</option>'+drvOpts+'</select></div>'+
    '<div class="fgrp" id="at-shared-wrap" style="display:none"><label>Assign To (Multiple — Shared)</label>'+
    '<div style="display:flex;flex-direction:column;gap:4px">'+
    drv.map(function(d){return'<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;background:var(--sur2)"><input type="checkbox" class="at-drv-chk" value="'+d.DriverID+'" data-name="'+_esc(d.Name)+'"> '+_esc(d.Name)+'</label>';}).join('')+'</div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Start Date</label><input type="date" id="at-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Start Time</label><input type="time" id="at-time" value="08:00"></div></div>'+
    '<div class="fgrp"><label>Notes</label><textarea id="at-notes" placeholder="Task instructions (optional)"></textarea></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddTask()"><i class="fas fa-plus"></i> Create Task</button></div>';
  _modal('Add Task',body);
}
function _taskTypeChange(){
  var t=document.getElementById('at-type').value;
  document.getElementById('at-drv-single').parentElement.style.display=t==='Individual'?'block':'none';
  document.getElementById('at-shared-wrap').style.display=t==='Shared'?'block':'none';
}
function submitAddTask(){
  var name=document.getElementById('at-name').value.trim();
  var type=document.getElementById('at-type').value;
  if(!name){_toast('Task name zaroori hai','warn');return;}
  var assignedTo,assignedToName;
  if(type==='Shared'){
    var checked=Array.from(document.querySelectorAll('.at-drv-chk:checked'));
    if(!checked.length){_toast('Kam se kam ek driver select karo','warn');return;}
    assignedTo=checked.map(function(c){return c.value;}).join(',');
    assignedToName=checked.map(function(c){return c.dataset.name;}).join('/');
  } else {
    assignedTo=document.getElementById('at-drv-single').value;
    if(!assignedTo){_toast('Driver select karo','warn');return;}
    assignedToName=_driverName(assignedTo);
  }
  var data={taskName:name,taskType:type,assignedTo:assignedTo,assignedToName:assignedToName,
    frequency:document.getElementById('at-freq').value,
    startDate:document.getElementById('at-date').value,
    startTime:document.getElementById('at-time').value,
    notes:document.getElementById('at-notes').value.trim()};
  closeModal();_showLoader('Creating task...');
  _gas('saveTask',[data],function(r){
    _hideLoader();
    if(r&&r.success){_toast('Task created! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function deactivateTask(uid){
  if(!confirm('Is task ko deactivate karna hai?'))return;
  _gas('deactivateTask',[uid],function(r){
    if(r&&r.success){_toast('Task deactivated','success');_loadAllData(true);}
  },function(e){_toast(e.message,'err');});
}

// ── DELEGATION ────────────────────────────────────────────────────────────────
function _vDelegation(){
  var dels=_D.delegations||[];
  var html=_ph('Delegation / Tasks',
    '<button class="btn btn-sm" onclick="openCreateDelegation()"><i class="fas fa-plus"></i> New Task</button>');

  var pending=dels.filter(function(d){return d.status==='Pending';}).length;
  var overdue=dels.filter(function(d){return d.is_overdue;}).length;
  var completed=dels.filter(function(d){return d.status==='Completed';}).length;

  html+='<div class="finance-strip" style="margin-bottom:16px">'+
    '<div class="fs-item"><div class="fs-label">Pending</div><div class="fs-val" style="color:var(--O)">'+pending+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Overdue</div><div class="fs-val" style="color:var(--R)">'+overdue+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Completed</div><div class="fs-val" style="color:var(--G)">'+completed+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Total</div><div class="fs-val">'+dels.length+'</div></div></div>';

  html+='<div style="display:flex;gap:8px;margin-bottom:14px">'+
    '<select id="del-filter" onchange="_filterDel()" style="padding:8px 12px;border:1.5px solid var(--bdr);border-radius:8px;font-size:13px;background:var(--sur);color:var(--tx);font-family:inherit">'+
    '<option value="">All</option><option value="Pending">Pending</option><option value="Completed">Completed</option><option value="overdue">Overdue</option></select>'+
    '<div class="search-bar" style="flex:1;margin-bottom:0"><i class="fas fa-search"></i><input id="del-search" placeholder="Search task or driver..." oninput="_filterDel()"></div></div>';

  if(!dels.length)return html+_emptyState('📌','No delegations','Create your first task assignment');
  html+='<div id="del-list">'+_renderDelList(dels)+'</div>';
  return html;
}
function _filterDel(){
  var f=document.getElementById('del-filter').value;
  var q=(document.getElementById('del-search').value||'').toLowerCase();
  var dels=(_D.delegations||[]).filter(function(d){
    if(f==='overdue')return d.is_overdue;
    if(f&&d.status!==f)return false;
    if(q){return (d.task_desc||'').toLowerCase().includes(q)||(d.delegated_to_name||'').toLowerCase().includes(q);}
    return true;
  });
  var el=document.getElementById('del-list');if(el)el.innerHTML=_renderDelList(dels);
}
function _renderDelList(dels){
  if(!dels.length)return _emptyState('🔍','No results','No tasks match filter');
  return dels.map(function(d){
    var sCol=d.status==='Completed'?'badge-completed':d.is_overdue?'badge-high':'badge-pending';
    return '<div class="del-card'+(d.is_overdue?' overdue':d.status==='Completed'?' completed':'')+'" onclick="openDelDetail(\''+d.task_id+'\')">'+
      '<div class="del-head">'+
      '<div class="del-task">'+_esc(d.task_desc)+'</div>'+
      '<span class="badge '+sCol+'">'+_esc(d.is_overdue?'Overdue':d.status)+'</span></div>'+
      '<div class="del-meta">'+
      '<span class="del-meta-item"><i class="fas fa-id-badge"></i> '+_esc(d.delegated_to_name)+'</span>'+
      '<span class="del-meta-item"><i class="fas fa-calendar"></i> Due: '+_fmtDate(d.final_date)+'</span>'+
      '<span class="del-meta-item"><i class="fas fa-user"></i> By: '+_esc(d.delegated_by_name)+'</span>'+
      (d.revision_1?'<span class="del-meta-item" style="color:var(--O)"><i class="fas fa-rotate-right"></i> Rev '+( d.revision_2?'2':'1')+'</span>':'')+
      '</div></div>';
  }).join('');
}
function openDelDetail(taskID){
  var dels=_D.delegations||[];
  var d=dels.filter(function(x){return x.task_id===taskID;})[0];if(!d)return;
  var body='<div class="detail-grid">'+
    _dr('Task',d.task_desc)+_dr('Assigned To',d.delegated_to_name)+
    _dr('Delegated By',d.delegated_by_name)+_dr('First Date',_fmtDate(d.first_date))+
    _dr('Final Due',_fmtDate(d.final_date))+_dr('Status',d.status)+
    (d.revision_1?_dr('Revision 1',_fmtDate(d.revision_1)):'')+
    (d.revision_2?_dr('Revision 2',_fmtDate(d.revision_2)):'')+
    (d.completion_remarks?_dr('Completion Remarks',d.completion_remarks):'')+
    (d.actual_close_date?_dr('Closed On',_fmtDate(d.actual_close_date)):'')+
    '</div>';
  if(d.status!=='Completed'){
    body+='<div style="display:flex;gap:8px;margin-top:14px">'+
      '<button class="btn btn-success btn-sm" onclick="markDelComplete(\''+taskID+'\')"><i class="fas fa-check"></i> Mark Complete</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="closeModal()">Close</button></div>';
  }
  _modal('Task Detail',body);
}
function markDelComplete(taskID){
  var remarks=prompt('Completion remarks (optional):');
  closeModal();_showLoader('Updating...');
  _gas('completeDelegation',[taskID,remarks||'',''],function(r){
    _hideLoader();
    if(r&&r.success){_toast('Task completed! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function openCreateDelegation(){
  var drv=(_D.drivers||[]).filter(function(d){return d.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Assign To *</label>'+
    '<select id="cd-drv"><option value="">Select Driver/Staff</option>'+
    drv.map(function(d){return'<option value="'+d.DriverID+'|'+_esc(d.Name)+'">'+_esc(d.Name)+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Task Description *</label>'+
    '<textarea id="cd-desc" placeholder="Describe the task clearly..." style="min-height:90px"></textarea></div>'+
    '<div class="fgrp"><label>Due Date *</label><input type="date" id="cd-date" min="'+_today()+'"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitCreateDelegation()"><i class="fas fa-paper-plane"></i> Assign Task</button></div>';
  _modal('Assign New Task',body);
}
function submitCreateDelegation(){
  var drvVal=document.getElementById('cd-drv').value;
  var desc=document.getElementById('cd-desc').value.trim();
  var date=document.getElementById('cd-date').value;
  if(!drvVal||!desc||!date){_toast('Sab fields zaroori hain','warn');return;}
  var parts=drvVal.split('|');
  var data={delegatedTo:parts[0],delegatedToName:parts[1]||'',taskDesc:desc,firstDate:date};
  closeModal();_showLoader('Assigning task...');
  _gas('createDelegation',[data],function(r){
    _hideLoader();
    if(r&&r.success){_toast('Task assigned! WA sent ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── LEAVE REQUESTS (Admin/Manager) ────────────────────────────────────────────
function _vLeaveRequests(){
  var leaves=_D.leaveRequests||[];
  var pending=leaves.filter(function(l){return l.status==='Pending';}).length;
  var html=_ph('Leave Management','');

  html+='<div class="finance-strip" style="margin-bottom:14px">'+
    '<div class="fs-item"><div class="fs-label">Pending</div><div class="fs-val" style="color:var(--O)">'+pending+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Approved</div><div class="fs-val" style="color:var(--G)">'+leaves.filter(function(l){return l.status==='Approved';}).length+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Rejected</div><div class="fs-val" style="color:var(--R)">'+leaves.filter(function(l){return l.status==='Rejected';}).length+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Total</div><div class="fs-val">'+leaves.length+'</div></div></div>';

  html+='<select id="lv-filter" onchange="_filterLeaves()" style="padding:8px 12px;border:1.5px solid var(--bdr);border-radius:8px;font-size:13px;background:var(--sur);color:var(--tx);font-family:inherit;margin-bottom:14px">'+
    '<option value="">All Requests</option><option value="Pending" selected>Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option></select>';

  if(!leaves.length)return html+_emptyState('📅','No leave requests','No leaves submitted yet');

  var shown=leaves.filter(function(l){return l.status==='Pending';});
  html+='<div id="lv-list">'+_renderLeaveList(shown)+'</div>';
  return html;
}
function _filterLeaves(){
  var f=document.getElementById('lv-filter').value;
  var shown=(_D.leaveRequests||[]).filter(function(l){return !f||l.status===f;});
  var el=document.getElementById('lv-list');if(el)el.innerHTML=_renderLeaveList(shown);
}
function _renderLeaveList(leaves){
  if(!leaves.length)return _emptyState('📅','No requests','No leave requests here');
  return leaves.map(function(l){
    var sCol=l.status==='Approved'?'badge-approved':l.status==='Rejected'?'badge-rejected':l.status==='Cancelled'?'badge-inactive':'badge-pending';
    return '<div class="leave-card">'+
      '<div class="leave-head">'+
      '<div>'+
      '<div class="leave-type">'+_esc(l.driver_name)+' — '+_esc(l.leave_type)+'</div>'+
      '<div class="leave-dates"><i class="fas fa-calendar"></i> '+_fmtDate(l.from_date)+' → '+_fmtDate(l.to_date)+' ('+l.num_days+' day'+(l.num_days>1?'s':'')+')</div></div>'+
      '<span class="badge '+sCol+'">'+_esc(l.status)+'</span></div>'+
      '<div class="leave-reason">'+_esc(l.reason||'No reason given')+'</div>'+
      (l.status==='Pending'?
        '<div class="leave-action-row">'+
        '<button class="btn btn-success btn-sm" onclick="approveLeave(\''+l.request_id+'\',\'Approved\')"><i class="fas fa-check"></i> Approve</button>'+
        '<button class="btn btn-danger btn-sm" onclick="approveLeave(\''+l.request_id+'\',\'Rejected\')"><i class="fas fa-times"></i> Reject</button></div>':
        (l.remark?'<div style="font-size:12px;color:var(--tx3);margin-top:6px"><i class="fas fa-comment"></i> '+_esc(l.remark)+'</div>':'')
      )+'</div>';
  }).join('');
}
function approveLeave(reqID,decision){
  var remark='';
  if(decision==='Rejected'){remark=prompt('Rejection reason (optional):');}
  _showLoader(decision+'...');
  _gas('approveLeave',[reqID,decision,remark||''],function(r){
    _hideLoader();
    if(r&&r.success){_toast('Leave '+decision+'! WA sent ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _openAddLeaveApproval(dID){
  var drv=_driverByID(dID);if(!drv)return;
  var leaves=(_D.leaveRequests||[]).filter(function(l){return String(l.driver_id||l.DriverID||'')===String(dID||'');});
  var pending=leaves.filter(function(l){return l.status==='Pending';});
  var body='<div style="padding:4px 0 14px">'+
    '<div style="font-weight:800;font-size:14px;margin-bottom:4px">'+_esc(drv.Name)+'</div>'+
    '<div style="font-size:12px;color:var(--tx3)">Leave history &amp; approval</div></div>';
  if(!pending.length&&!leaves.length){
    body+=_emptyState('📅','No leave requests','This driver has no pending leaves');
  } else {
    body+='<div style="display:flex;flex-direction:column;gap:8px">';
    var toShow=pending.length?pending:leaves.slice(0,5);
    toShow.forEach(function(l){
      var sCol=l.status==='Approved'?'badge-approved':l.status==='Rejected'?'badge-rejected':'badge-pending';
      body+='<div class="leave-card">'+
        '<div class="leave-head"><div>'+
        '<div class="leave-type">'+_esc(l.leave_type||l.LeaveType||'—')+'</div>'+
        '<div class="leave-dates">'+_fmtDate(l.from_date||l.FromDate)+' → '+_fmtDate(l.to_date||l.ToDate)+'</div></div>'+
        '<span class="badge '+sCol+'">'+_esc(l.status||'—')+'</span></div>'+
        '<div class="leave-reason">'+_esc(l.reason||l.Reason||'No reason')+'</div>'+
        (l.status==='Pending'?
          '<div class="leave-action-row">'+
          '<button class="btn btn-success btn-sm" onclick="approveLeave(\''+l.request_id+'\',\'Approved\')"><i class="fas fa-check"></i> Approve</button>'+
          '<button class="btn btn-danger btn-sm" onclick="approveLeave(\''+l.request_id+'\',\'Rejected\')"><i class="fas fa-times"></i> Reject</button></div>':'')+
        '</div>';
    });
    body+='</div>';
  }
  _modal('Leave — '+drv.Name, body);
}

// ── HOLIDAYS ──────────────────────────────────────────────────────────────────
function _vHolidays(){
  var hols=_D.holidays||[];
  var today=_today();
  var upcoming=hols.filter(function(h){return String(h.HolidayDate||'').slice(0,10)>=today&&h.Type!=='Deleted';}).sort(function(a,b){return String(a.HolidayDate||'').localeCompare(String(b.HolidayDate||''));});
  var past=hols.filter(function(h){return String(h.HolidayDate||'').slice(0,10)<today&&h.Type!=='Deleted';});
  var isAdmin=_U&&(_U.role==='admin'||_U.role==='manager');

  var html=_ph('Holiday Calendar',isAdmin?'<button class="btn btn-sm" onclick="openAddHoliday()"><i class="fas fa-plus"></i> Add Holiday</button>':'');

  if(!hols.length)return html+_emptyState('🗓️','No holidays set','Add company holidays');

  html+='<div class="sec-hdr"><i class="fas fa-calendar" style="color:var(--P)"></i>Upcoming ('+upcoming.length+')</div>';
  upcoming.forEach(function(h){
    var d=new Date(String(h.HolidayDate||'').slice(0,10)+'T00:00:00');
    var daysLeft=_daysLeft(String(h.HolidayDate||'').slice(0,10));
    html+='<div class="hol-card">'+
      '<div class="hol-date"><div class="hol-day">'+d.getDate()+'</div><div class="hol-mon">'+MN[d.getMonth()]+'</div></div>'+
      '<div style="flex:1"><div class="hol-name">'+_esc(h.HolidayName)+'</div>'+
      '<div class="hol-type">'+_esc(h.Type||'')+(h.Description?' — '+_esc(h.Description):'')+'</div></div>'+
      '<div style="text-align:right"><div style="font-size:11px;color:var(--tx3)">'+DAYS[d.getDay()]+'</div>'+
      '<div style="font-size:11px;color:var(--P);font-weight:700">'+(daysLeft===0?'Today!':daysLeft+'d away')+'</div>'+
      (isAdmin?'<button class="btn btn-xs btn-ghost" style="margin-top:6px" onclick="deleteHoliday(\''+h.HolidayID+'\')">Remove</button>':'')+
      '</div></div>';
  });
  if(past.length){
    html+='<div class="sec-hdr" style="margin-top:20px"><i class="fas fa-history" style="color:var(--tx3)"></i>Past ('+past.length+')</div>';
    past.slice(-5).reverse().forEach(function(h){
      html+='<div class="hol-card" style="opacity:.6">'+
        '<div class="hol-date" style="background:var(--sur2)"><div class="hol-day" style="color:var(--tx3)">'+new Date(String(h.HolidayDate||'').slice(0,10)+'T00:00:00').getDate()+'</div>'+
        '<div class="hol-mon">'+MN[new Date(String(h.HolidayDate||'').slice(0,10)+'T00:00:00').getMonth()]+'</div></div>'+
        '<div><div class="hol-name">'+_esc(h.HolidayName)+'</div><div class="hol-type">'+_esc(h.Type||'')+'</div></div></div>';
    });
  }
  return html;
}
function openAddHoliday(){
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Holiday Name *</label><input id="ah-name" placeholder="e.g. Diwali"></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date *</label><input type="date" id="ah-date"></div>'+
    '<div class="fgrp"><label>Type</label><select id="ah-type">'+
    ['National','Religious','Optional','Company'].map(function(t){return'<option>'+t+'</option>';}).join('')+'</select></div></div>'+
    '<div class="fgrp"><label>Description</label><input id="ah-desc" placeholder="Optional description"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddHoliday()"><i class="fas fa-plus"></i> Add Holiday</button></div>';
  _modal('Add Holiday',body);
}
function submitAddHoliday(){
  var name=document.getElementById('ah-name').value.trim();
  var date=document.getElementById('ah-date').value;
  if(!name||!date){_toast('Name aur date zaroori hain','warn');return;}
  closeModal();_showLoader('Adding...');
  _gas('addHoliday',[{holidayName:name,holidayDate:date,type:document.getElementById('ah-type').value,description:document.getElementById('ah-desc').value.trim()}],function(r){
    _hideLoader();if(r&&r.success){_toast('Holiday added! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function deleteHoliday(id){
  if(!confirm('Remove this holiday?'))return;
  _gas('deleteHoliday',[id],function(r){if(r&&r.success){_toast('Removed','success');_loadAllData(true);}});
}

// ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
function _vAnnouncements(){
  var anns=_D.announcements||[];
  var isAdmin=_U&&(_U.role==='admin'||_U.role==='manager');
  var html=_ph('Announcements',isAdmin?'<button class="btn btn-sm" onclick="openPostAnn()"><i class="fas fa-plus"></i> Post</button>':'');

  if(!anns.length)return html+_emptyState('📢','No announcements','Post company-wide announcements');
  anns.forEach(function(a){
    var p=String(a.priority||'Normal').toLowerCase();
    html+='<div class="ann-card '+p+'">'+
      '<div class="ann-text">'+_esc(a.text)+'</div>'+
      '<div class="ann-meta">'+
      '<span><i class="fas fa-user"></i> '+_esc(a.posted_by_name)+'</span>'+
      '<span><i class="fas fa-clock"></i> '+_fmtDateTime(a.posted_at)+'</span>'+
      '<span class="badge badge-'+(p==='high'?'high':p==='urgent'?'high':'active')+'">'+_esc(a.priority)+'</span>'+
      (isAdmin?'<span style="cursor:pointer;color:var(--R);font-size:11px;margin-left:auto" onclick="deleteAnn(\''+a.ann_id+'\')"><i class="fas fa-trash"></i></span>':'')+
      '</div></div>';
  });
  return html;
}
function openPostAnn(){
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Announcement Text *</label><textarea id="ann-txt" placeholder="Type announcement..." style="min-height:100px"></textarea></div>'+
    '<div class="fgrp"><label>Priority</label><select id="ann-pri">'+
    APP_CONFIG.ANNOUNCE_PRIORITY.map(function(p){return'<option>'+p+'</option>';}).join('')+'</select></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitPostAnn()"><i class="fas fa-bullhorn"></i> Post Announcement</button></div>';
  _modal('Post Announcement',body);
}
function submitPostAnn(){
  var txt=document.getElementById('ann-txt').value.trim();
  if(!txt){_toast('Announcement text daalo','warn');return;}
  closeModal();_showLoader('Posting...');
  _gas('postAnnouncement',[{text:txt,priority:document.getElementById('ann-pri').value}],function(r){
    _hideLoader();if(r&&r.success){_toast('Posted! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function deleteAnn(id){
  if(!confirm('Delete this announcement?'))return;
  _gas('deleteAnnouncement',[id],function(r){if(r&&r.success){_toast('Deleted','success');_loadAllData(true);}});
}

// ── PENALTIES & REWARDS ───────────────────────────────────────────────────────
function _vPenalties(){
  var pen=_D.penalties||[];
  var html=_ph('Penalties','<button class="btn btn-sm" onclick="_openAddPenalty(\'\')"><i class="fas fa-plus"></i> Add Penalty</button>');
  if(!pen.length)return html+_emptyState('⚠️','No penalties','Clean slate!');
  if(_isMobile()){
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    pen.slice().reverse().forEach(function(p){
      html+='<div class="list-card">'+
        '<div class="lc-row"><b>'+_esc(_driverName(p.DriverID))+'</b><b style="color:var(--R)">'+_inr(p.Amount)+'</b></div>'+
        '<div class="lc-meta"><i class="fas fa-calendar"></i>'+_fmtDate(p.Date)+'&nbsp;·&nbsp;<span class="badge '+(p.Status==='Paid'?'badge-approved':'badge-pending')+'">'+_esc(p.Status)+'</span></div>'+
        '<div class="lc-sub">'+_esc(p.Reason)+'</div>'+
        (p.Status==='Pending'?'<button class="btn btn-xs btn-ghost" style="margin-top:8px" onclick="markPenPaid(\''+p.PenaltyID+'\')"><i class="fas fa-check"></i> Mark Paid</button>':'')+
        '</div>';
    });
    html+='</div>';
  } else {
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Driver</th><th>Date</th><th>Reason</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>';
    pen.slice().reverse().forEach(function(p){
      html+='<tr><td><b>'+_esc(_driverName(p.DriverID))+'</b></td>'+
        '<td>'+_fmtDate(p.Date)+'</td>'+
        '<td style="max-width:200px">'+_esc(p.Reason)+'</td>'+
        '<td><b>'+_inr(p.Amount)+'</b></td>'+
        '<td><span class="badge '+(p.Status==='Paid'?'badge-approved':'badge-pending')+'">'+_esc(p.Status)+'</span></td>'+
        '<td>'+(p.Status==='Pending'?'<button class="btn btn-xs btn-ghost" onclick="markPenPaid(\''+p.PenaltyID+'\')">Mark Paid</button>':'')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function _openAddPenalty(dID){
  var drv=(_D.drivers||[]).filter(function(d){return d.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Driver *</label><select id="pen-drv"><option value="">Select</option>'+
    drv.map(function(d){return'<option value="'+d.DriverID+'"'+(d.DriverID===dID?' selected':'')+'>'+_esc(d.Name)+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Date</label><input type="date" id="pen-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Reason *</label><textarea id="pen-reason" placeholder="Reason for penalty..."></textarea></div>'+
    '<div class="fgrp"><label>Amount (₹)</label><input type="number" id="pen-amt" placeholder="0" value="0"></div>'+
    '<button class="btn btn-wide btn-lg btn-danger" style="margin-top:12px" onclick="submitAddPenalty()"><i class="fas fa-triangle-exclamation"></i> Add Penalty</button></div>';
  _modal('Add Penalty',body);
}
function submitAddPenalty(){
  var dID=document.getElementById('pen-drv').value;
  var reason=document.getElementById('pen-reason').value.trim();
  if(!dID||!reason){_toast('Driver aur reason zaroori hain','warn');return;}
  closeModal();_showLoader('Adding penalty...');
  _gas('addPenalty',[{driverID:dID,date:document.getElementById('pen-date').value,reason:reason,amount:document.getElementById('pen-amt').value||0}],function(r){
    _hideLoader();if(r&&r.success){_toast('Penalty added! WA sent ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function markPenPaid(id){
  _gas('updatePenaltyStatus',[id,'Paid'],function(r){if(r&&r.success){_toast('Marked Paid ✅','success');_loadAllData(true);}});
}

function _vRewards(){
  var rwd=_D.rewards||[];
  var html=_ph('Rewards','<button class="btn btn-sm" onclick="_openAddReward(\'\')"><i class="fas fa-plus"></i> Add Reward</button>');
  if(!rwd.length)return html+_emptyState('🏆','No rewards yet','Recognize great work!');
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Driver</th><th>Date</th><th>Reason</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>';
  rwd.slice().reverse().forEach(function(r){
    html+='<tr><td><b>'+_esc(_driverName(r.DriverID))+'</b></td>'+
      '<td>'+_fmtDate(r.Date)+'</td>'+
      '<td>'+_esc(r.Reason)+'</td>'+
      '<td><b style="color:var(--G)">'+_inr(r.Amount)+'</b></td>'+
      '<td><span class="badge '+(r.Status==='Paid'?'badge-approved':'badge-pending')+'">'+_esc(r.Status)+'</span></td>'+
      '<td>'+(r.Status==='Pending'?'<button class="btn btn-xs btn-ghost" onclick="markRwdPaid(\''+r.RewardID+'\')">Mark Paid</button>':'')+'</td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function _openAddReward(dID){
  var drv=(_D.drivers||[]).filter(function(d){return d.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Driver *</label><select id="rwd-drv"><option value="">Select</option>'+
    drv.map(function(d){return'<option value="'+d.DriverID+'"'+(d.DriverID===dID?' selected':'')+'>'+_esc(d.Name)+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Date</label><input type="date" id="rwd-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Reason *</label><textarea id="rwd-reason" placeholder="Reason for reward..."></textarea></div>'+
    '<div class="fgrp"><label>Amount (₹)</label><input type="number" id="rwd-amt" placeholder="0" value="500"></div>'+
    '<button class="btn btn-wide btn-lg btn-success" style="margin-top:12px" onclick="submitAddReward()"><i class="fas fa-trophy"></i> Add Reward</button></div>';
  _modal('Add Reward',body);
}
function submitAddReward(){
  var dID=document.getElementById('rwd-drv').value;
  var reason=document.getElementById('rwd-reason').value.trim();
  if(!dID||!reason){_toast('Driver aur reason zaroori hain','warn');return;}
  closeModal();_showLoader('Adding reward...');
  _gas('addReward',[{driverID:dID,date:document.getElementById('rwd-date').value,reason:reason,amount:document.getElementById('rwd-amt').value||0}],function(r){
    _hideLoader();if(r&&r.success){_toast('Reward added! 🏆 WA sent','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function markRwdPaid(id){
  _gas('updateRewardStatus',[id,'Paid'],function(r){if(r&&r.success){_toast('Marked Paid ✅','success');_loadAllData(true);}});
}

// ── EXPENSES ──────────────────────────────────────────────────────────────────
function _vExpenses(){
  var exp=_D.expenses||[];
  var html=_ph('Expenses','<button class="btn btn-sm" onclick="openAddExpense()"><i class="fas fa-plus"></i> Add Expense</button>');
  var mon=_today().slice(0,7);
  var monExp=exp.filter(function(e){return String(e.Date||'').startsWith(mon);});
  var total=monExp.reduce(function(s,e){return s+Number(e.Amount||0);},0);
  var byType={};
  monExp.forEach(function(e){var t=e.ExpenseType||'Other';byType[t]=(byType[t]||0)+Number(e.Amount||0);});
  html+='<div class="finance-strip" style="margin-bottom:16px">'+
    '<div class="fs-item"><div class="fs-label">Month Total</div><div class="fs-val">'+_inr(total)+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Entries</div><div class="fs-val">'+monExp.length+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Highest</div><div class="fs-val">'+
    (Object.keys(byType).length?_inr(Math.max.apply(null,Object.values(byType))):'₹0')+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Avg</div><div class="fs-val">'+(monExp.length?_inr(Math.round(total/monExp.length)):'₹0')+'</div></div></div>';
  if(!exp.length)return html+_emptyState('💸','No expenses','Add expense records');
  if(_isMobile()){
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    exp.slice().reverse().slice(0,50).forEach(function(e){
      html+='<div class="list-card">'+
        '<div class="lc-row"><span class="plate-tag">'+_esc(_vehicleNo(e.VehicleID))+'</span><b>'+_inr(e.Amount)+'</b></div>'+
        '<div class="lc-meta"><i class="fas fa-tag"></i>'+_esc(e.ExpenseType)+'&nbsp;·&nbsp;<i class="fas fa-calendar"></i>'+_fmtDate(e.Date)+'&nbsp;·&nbsp;'+_esc(e.PaymentMode||'—')+'</div>'+
        (e.Remarks?'<div class="lc-sub">'+_esc(e.Remarks)+'</div>':'')+
        '</div>';
    });
    html+='</div>';
  } else {
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Date</th><th>Type</th><th>Amount</th><th>Mode</th><th>Remarks</th></tr></thead><tbody>';
    exp.slice().reverse().slice(0,50).forEach(function(e){
      html+='<tr><td><span class="plate-tag">'+_esc(_vehicleNo(e.VehicleID))+'</span></td>'+
        '<td>'+_fmtDate(e.Date)+'</td><td>'+_esc(e.ExpenseType)+'</td>'+
        '<td><b>'+_inr(e.Amount)+'</b></td><td>'+_esc(e.PaymentMode||'—')+'</td>'+
        '<td style="font-size:12px;color:var(--tx3)">'+_esc(e.Remarks||'—')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function openAddExpense(){
  var vList=(_D.vehicles||[]).filter(function(v){return v.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Vehicle *</label><select id="ae-veh"><option value="">Select</option>'+
    vList.map(function(v){return'<option value="'+v.VehicleID+'">'+_esc(v.VehicleNo)+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date</label><input type="date" id="ae-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Type *</label><select id="ae-type"><option value="">Select</option>'+
    APP_CONFIG.EXPENSE_TYPES.map(function(t){return'<option>'+t+'</option>';}).join('')+'</select></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Amount (₹) *</label><input type="number" id="ae-amt" placeholder="0"></div>'+
    '<div class="fgrp"><label>Payment Mode</label><select id="ae-mode">'+
    APP_CONFIG.PAYMENT_MODES.map(function(m){return'<option>'+m+'</option>';}).join('')+'</select></div></div>'+
    '<div class="fgrp"><label>Remarks</label><input id="ae-rem" placeholder="Optional remarks"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddExpense()"><i class="fas fa-plus"></i> Add Expense</button></div>';
  _modal('Add Expense',body);
}
function submitAddExpense(){
  var vID=document.getElementById('ae-veh').value;
  var amt=document.getElementById('ae-amt').value;
  var type=document.getElementById('ae-type').value;
  if(!vID||!amt||!type){_toast('Vehicle, type aur amount zaroori hain','warn');return;}
  closeModal();_showLoader('Adding...');
  _gas('addExpense',[{vehicleID:vID,date:document.getElementById('ae-date').value,expenseType:type,amount:amt,paymentMode:document.getElementById('ae-mode').value,remarks:document.getElementById('ae-rem').value.trim()}],function(r){
    _hideLoader();if(r&&r.success){_toast('Expense added ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── TRIPS ─────────────────────────────────────────────────────────────────────
function _vTrips(){
  var trips=_D.trips||[];
  var html=_ph('Vehicle Trips','<button class="btn btn-sm" onclick="openAddTrip()"><i class="fas fa-plus"></i> Add Trip</button>');
  if(!trips.length)return html+_emptyState('🗺️','No trips','Log vehicle trips');
  if(_isMobile()){
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    trips.slice().reverse().slice(0,50).forEach(function(t){
      html+='<div class="list-card">'+
        '<div class="lc-row"><span class="plate-tag">'+_esc(_vehicleNo(t.VehicleID))+'</span><b>'+_esc(t.TotalKM||0)+' km</b></div>'+
        '<div class="lc-meta"><i class="fas fa-arrow-right"></i>'+_esc(t.FromLocation)+' → '+_esc(t.ToLocation)+'</div>'+
        '<div class="lc-meta"><i class="fas fa-user"></i>'+_esc(_driverName(t.DriverID))+'&nbsp;·&nbsp;<i class="fas fa-calendar"></i>'+_fmtDate(t.Date)+(t.MaterialType?'&nbsp;·&nbsp;'+_esc(t.MaterialType):'')+'</div>'+
        '</div>';
    });
    html+='</div>';
  } else {
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Driver</th><th>Date</th><th>From</th><th>To</th><th>Material</th><th>KM</th></tr></thead><tbody>';
    trips.slice().reverse().slice(0,50).forEach(function(t){
      html+='<tr><td><span class="plate-tag">'+_esc(_vehicleNo(t.VehicleID))+'</span></td>'+
        '<td>'+_esc(_driverName(t.DriverID))+'</td><td>'+_fmtDate(t.Date)+'</td>'+
        '<td>'+_esc(t.FromLocation)+'</td><td>'+_esc(t.ToLocation)+'</td>'+
        '<td>'+_esc(t.MaterialType||'—')+'</td><td><b>'+_esc(t.TotalKM||0)+' km</b></td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function openAddTrip(){
  var vList=(_D.vehicles||[]).filter(function(v){return v.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Vehicle *</label><select id="atr-veh"><option value="">Select</option>'+
    vList.map(function(v){return'<option value="'+v.VehicleID+'">'+_esc(v.VehicleNo)+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Date</label><input type="date" id="atr-date" value="'+_today()+'"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>From Location *</label><input id="atr-from" placeholder="e.g. ISE Depot Rohini"></div>'+
    '<div class="fgrp"><label>To Location *</label><input id="atr-to" placeholder="e.g. Bhiwadi Plant"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Start KM</label><input type="number" id="atr-skm" placeholder="Odometer at start"></div>'+
    '<div class="fgrp"><label>End KM</label><input type="number" id="atr-ekm" placeholder="Odometer at end"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Material</label><select id="atr-mat"><option value="">—</option>'+
    APP_CONFIG.MATERIAL_TYPES.map(function(m){return'<option>'+m+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Weight (MT)</label><input type="number" id="atr-wt" step="0.1" placeholder="0.0"></div></div>'+
    '<div class="fgrp"><label>Remarks</label><input id="atr-rem" placeholder="Optional"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddTrip()"><i class="fas fa-plus"></i> Log Trip</button></div>';
  _modal('Log Trip',body);
}
function submitAddTrip(){
  var vID=document.getElementById('atr-veh').value;
  var from=document.getElementById('atr-from').value.trim();
  var to=document.getElementById('atr-to').value.trim();
  if(!vID||!from||!to){_toast('Vehicle, from aur to location zaroori hain','warn');return;}
  var data={vehicleID:vID,date:document.getElementById('atr-date').value,fromLocation:from,toLocation:to,
    startKM:document.getElementById('atr-skm').value||0,endKM:document.getElementById('atr-ekm').value||0,
    materialType:document.getElementById('atr-mat').value,weight:document.getElementById('atr-wt').value||0,
    remarks:document.getElementById('atr-rem').value.trim()};
  closeModal();_showLoader('Logging trip...');
  _gas('addTrip',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('Trip logged! '+r.totalKM+' km ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── OTHER ADMIN VIEWS (stubs with real data) ──────────────────────────────────
function _vDispatch(){
  var dis=_D.dispatch||[];
  var html=_ph('Dispatch','<button class="btn btn-sm" onclick="_openAddDispatch()"><i class="fas fa-plus"></i> Add</button>');
  if(!dis.length)return html+_emptyState('📦','No dispatch records','');
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>ID</th><th>Customer</th><th>Material</th><th>Invoice</th><th>Loading</th><th>Delivery</th><th>Status</th></tr></thead><tbody>';
  dis.slice().reverse().forEach(function(d){
    html+='<tr><td style="font-size:11px;color:var(--tx3)">'+_esc(d.DispatchID)+'</td>'+
      '<td><b>'+_esc(d.CustomerName)+'</b></td><td>'+_esc(d.Material)+' '+d.Weight+'MT</td>'+
      '<td>'+_esc(d.InvoiceNo||'—')+'</td><td>'+_fmtDate(d.LoadingDate)+'</td>'+
      '<td>'+_fmtDate(d.DeliveryDate)+'</td>'+
      '<td><span class="badge '+(d.Status==='Delivered'?'badge-completed':d.Status==='In Transit'?'badge-in-progress':'badge-pending')+'">'+_esc(d.Status)+'</span></td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function _openAddDispatch(){ _toast('Coming soon','info'); }

function _vServices(){
  var svc=_D.services||[];
  var html=_ph('Vehicle Services','<button class="btn btn-sm" onclick="openAddService()"><i class="fas fa-plus"></i> Add Service</button>');
  if(!svc.length)return html+_emptyState('🔧','No service records','');
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Date</th><th>Type</th><th>Garage</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
  svc.slice().reverse().forEach(function(s){
    html+='<tr><td><span class="plate-tag">'+_esc(_vehicleNo(s.VehicleID))+'</span></td>'+
      '<td>'+_fmtDate(s.ServiceDate)+'</td><td>'+_esc(s.ServiceType)+'</td>'+
      '<td>'+_esc(s.GarageName)+'</td><td>'+_inr(s.Amount)+'</td>'+
      '<td><span class="badge '+(s.Status==='Completed'?'badge-completed':'badge-in-progress')+'">'+_esc(s.Status)+'</span></td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function openAddService(){
  var vList=(_D.vehicles||[]).filter(function(v){return v.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Vehicle *</label><select id="as-veh"><option value="">Select</option>'+
    vList.map(function(v){return'<option value="'+v.VehicleID+'">'+_esc(v.VehicleNo)+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date</label><input type="date" id="as-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Type *</label><select id="as-type"><option value="">Select</option>'+APP_CONFIG.SERVICE_TYPES.map(function(t){return'<option>'+t+'</option>';}).join('')+'</select></div></div>'+
    '<div class="fgrp"><label>Garage Name *</label><input id="as-garage" placeholder="e.g. SpeedMaster Delhi"></div>'+
    '<div class="fgrp"><label>Issue / Work Done</label><textarea id="as-issue" placeholder="Describe the service..."></textarea></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Amount (₹)</label><input type="number" id="as-amt" placeholder="0"></div>'+
    '<div class="fgrp"><label>Next Service Date</label><input type="date" id="as-next"></div></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddService()"><i class="fas fa-plus"></i> Add Service</button></div>';
  _modal('Add Service Record',body);
}
function submitAddService(){
  var vID=document.getElementById('as-veh').value;
  var type=document.getElementById('as-type').value;
  var garage=document.getElementById('as-garage').value.trim();
  if(!vID||!type||!garage){_toast('Vehicle, type aur garage zaroori hain','warn');return;}
  closeModal();_showLoader('Adding...');
  _gas('addService',[{vehicleID:vID,serviceDate:document.getElementById('as-date').value,serviceType:type,garageName:garage,issue:document.getElementById('as-issue').value.trim(),amount:document.getElementById('as-amt').value||0,nextServiceDate:document.getElementById('as-next').value}],function(r){
    _hideLoader();if(r&&r.success){_toast('Service added ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

function _vDocuments(){
  var docs=_D.documents||[];
  var html=_ph('Vehicle Documents','<button class="btn btn-sm" onclick="openAddDoc()"><i class="fas fa-plus"></i> Add Doc</button>');
  if(!docs.length)return html+_emptyState('📄','No documents','');
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Type</th><th>Number</th><th>Expiry</th><th>Status</th></tr></thead><tbody>';
  docs.forEach(function(d){
    var exp=_daysLeft(String(d.ExpiryDate||'').slice(0,10));
    html+='<tr><td><span class="plate-tag">'+_esc(_vehicleNo(d.VehicleID))+'</span></td>'+
      '<td>'+_esc(d.DocumentType)+'</td><td>'+_esc(d.DocumentNumber||'—')+'</td>'+
      '<td style="color:'+(exp<30?'var(--R)':exp<90?'var(--O)':'var(--tx)')+'">'+_fmtDate(d.ExpiryDate)+(exp>=0?' ('+exp+'d)':'')+'</td>'+
      '<td><span class="badge badge-'+(d.Status==='Active'?'active':'inactive')+'">'+_esc(d.Status)+'</span></td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function openAddDoc(){ _toast('Add document form — coming soon','info'); }

function _vReminders(){
  var rem=_D.reminders||[];
  var html=_ph('Reminders','<button class="btn btn-sm" onclick="openAddReminder()"><i class="fas fa-plus"></i> Add</button>');
  if(!rem.length)return html+_emptyState('🔔','No reminders','');
  html+='<div style="display:flex;flex-direction:column;gap:8px">';
  rem.slice().reverse().forEach(function(r){
    var d=_daysLeft(String(r.ReminderDate||'').slice(0,10));
    var col=d<=0?'var(--R)':d<=7?'var(--R)':d<=30?'var(--O)':'var(--G)';
    html+='<div class="list-card">'+
      '<div class="lc-row"><span style="font-size:13px;font-weight:700">'+_esc(_vehicleNo(r.VehicleID))+' — '+_esc(r.ReminderType)+'</span>'+
      '<span class="badge badge-'+(r.Priority==='High'?'high':r.Priority==='Medium'?'medium':'low')+'">'+_esc(r.Priority)+'</span></div>'+
      '<div class="lc-meta"><i class="fas fa-calendar" style="color:'+col+'"></i>'+_fmtDate(r.ReminderDate)+
      (d>=0?' <b style="color:'+col+'">('+d+'d)</b>':'')+'</div>'+
      (r.Notes?'<div style="font-size:12px;color:var(--tx3);margin-top:4px">'+_esc(r.Notes)+'</div>':'')+
      (r.Status==='Pending'?'<button class="btn btn-xs btn-ghost" style="margin-top:8px" onclick="markReminderDone(\''+r.ReminderID+'\')">Mark Done</button>':'')+
      '</div>';
  });
  html+='</div>';
  return html;
}
function openAddReminder(){ _toast('Add reminder — coming soon','info'); }
function markReminderDone(id){
  _gas('updateReminderStatus',[id,'Completed'],function(r){if(r&&r.success){_toast('Done ✅','success');_loadAllData(true);}});
}

function _vMaintenance(){
  var m=_D.maintenance||[];
  var html=_ph('Maintenance Schedule','');
  if(!m.length)return html+_emptyState('🛠️','No maintenance schedules','');
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Type</th><th>Last Done</th><th>Next Due</th><th>Status</th></tr></thead><tbody>';
  m.forEach(function(s){
    var d=_daysLeft(String(s.NextDueDate||'').slice(0,10));
    html+='<tr><td><span class="plate-tag">'+_esc(_vehicleNo(s.VehicleID))+'</span></td>'+
      '<td>'+_esc(s.MaintenanceType)+'</td><td>'+_fmtDate(s.LastDoneDate)+'</td>'+
      '<td style="color:'+(d<0?'var(--R)':d<=15?'var(--O)':'var(--tx)')+'">'+_fmtDate(s.NextDueDate)+(d>=0?' ('+d+'d)':' Overdue!')+'</td>'+
      '<td><span class="badge badge-'+(s.Status==='Pending'?'pending':'completed')+'">'+_esc(s.Status)+'</span></td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function _vFastag(){
  var ft=_D.fastag||[];
  var vList=_D.vehicles||[];
  var html=_ph('Fastag Transactions','<button class="btn btn-sm" onclick="openAddFastag()"><i class="fas fa-plus"></i> Recharge</button>');
  html+='<div class="sec-hdr">Current Balances</div>';
  html+='<div class="kpi-grid">';
  vList.filter(function(v){return v.Status==='Active';}).forEach(function(v){
    var bal=Number(v.FastagBalance||0);
    var col=bal<300?'var(--R)':bal<1000?'var(--O)':'var(--G)';
    html+=_kpi('fa-tag',col,_inr(bal),v.VehicleNo,bal<300?'⚠️ Low!':'OK');
  });
  html+='</div>';
  if(ft.length){
    html+='<div class="sec-hdr">Recharge History</div>';
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Date</th><th>Opening</th><th>Recharge</th><th>Closing</th></tr></thead><tbody>';
    ft.slice().reverse().slice(0,20).forEach(function(f){
      html+='<tr><td><span class="plate-tag">'+_esc(_vehicleNo(f.VehicleID))+'</span></td>'+
        '<td>'+_fmtDate(f.Date)+'</td><td>'+_inr(f.OpeningBalance)+'</td>'+
        '<td style="color:var(--G);font-weight:700">+'+_inr(f.RechargeAmount)+'</td>'+
        '<td><b>'+_inr(f.ClosingBalance)+'</b></td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function openAddFastag(){
  var vList=(_D.vehicles||[]).filter(function(v){return v.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Vehicle *</label><select id="aft-veh" onchange="_fastagVehChange()"><option value="">Select</option>'+
    vList.map(function(v){return'<option value="'+v.VehicleID+'|'+Number(v.FastagBalance||0)+'">'+_esc(v.VehicleNo)+' — Bal: ₹'+Number(v.FastagBalance||0)+'</option>';}).join('')+'</select></div>'+
    '<div id="aft-bal-show" style="font-size:12px;color:var(--tx3);padding:8px 12px;background:var(--sur2);border-radius:8px;margin:6px 0 12px;display:none"></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date</label><input type="date" id="aft-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Recharge Amount (₹) *</label><input type="number" id="aft-amt" placeholder="e.g. 1000"></div></div>'+
    '<div class="fgrp"><label>Remarks</label><input id="aft-rem" placeholder="Optional"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddFastag()"><i class="fas fa-tag"></i> Recharge Fastag</button></div>';
  _modal('Fastag Recharge',body);
}
function _fastagVehChange(){
  var val=document.getElementById('aft-veh').value;
  var el=document.getElementById('aft-bal-show');
  if(!val||!el){if(el)el.style.display='none';return;}
  var parts=val.split('|');
  el.textContent='Current Balance: ₹'+parts[1];el.style.display='block';
}
function submitAddFastag(){
  var val=document.getElementById('aft-veh').value;
  var amt=document.getElementById('aft-amt').value;
  if(!val||!amt){_toast('Vehicle aur amount zaroori hain','warn');return;}
  var parts=val.split('|');
  closeModal();_showLoader('Recharging...');
  _gas('addFastag',[{vehicleID:parts[0],opening:Number(parts[1]||0),recharge:amt,date:document.getElementById('aft-date').value,remarks:document.getElementById('aft-rem').value.trim()}],function(r){
    _hideLoader();if(r&&r.success){_toast('Fastag recharged! New bal: ₹'+r.closingBalance+' ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

function _vKMLogs(){
  var logs=_D.kmLogs||[];
  var html=_ph('KM Logs','<button class="btn btn-sm" onclick="openAddKMLog()"><i class="fas fa-plus"></i> Add Log</button>');
  if(!logs.length)return html+_emptyState('📏','No KM logs','');
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Vehicle</th><th>Date</th><th>Odometer</th><th>By</th><th>Remarks</th></tr></thead><tbody>';
  logs.slice().reverse().forEach(function(l){
    html+='<tr><td><span class="plate-tag">'+_esc(_vehicleNo(l.VehicleID))+'</span></td>'+
      '<td>'+_fmtDate(l.Date)+'</td><td><b>'+Number(l.OdometerReading||0).toLocaleString('en-IN')+' km</b></td>'+
      '<td>'+_esc(l.EnteredBy||'—')+'</td><td style="font-size:12px;color:var(--tx3)">'+_esc(l.Remarks||'—')+'</td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}
function openAddKMLog(){
  var vList=(_D.vehicles||[]).filter(function(v){return v.Status==='Active';});
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Vehicle *</label><select id="akl-veh"><option value="">Select</option>'+
    vList.map(function(v){return'<option value="'+v.VehicleID+'">'+_esc(v.VehicleNo)+' — '+Number(v.CurrentKM||0).toLocaleString('en-IN')+' km</option>';}).join('')+'</select></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date</label><input type="date" id="akl-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Odometer Reading *</label><input type="number" id="akl-od" placeholder="Current KM reading"></div></div>'+
    '<div class="fgrp"><label>Remarks</label><input id="akl-rem" placeholder="e.g. Morning reading"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitAddKMLog()"><i class="fas fa-plus"></i> Add KM Log</button></div>';
  _modal('Add KM Log',body);
}
function submitAddKMLog(){
  var vID=document.getElementById('akl-veh').value;
  var od=document.getElementById('akl-od').value;
  if(!vID||!od){_toast('Vehicle aur odometer zaroori hain','warn');return;}
  closeModal();_showLoader('Adding...');
  _gas('addKMLog',[{vehicleID:vID,date:document.getElementById('akl-date').value,odometer:od,remarks:document.getElementById('akl-rem').value.trim()}],function(r){
    _hideLoader();if(r&&r.success){_toast('KM log added ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function _vAnalytics(){
  var html=_ph('Analytics Dashboard',
    '<button class="btn btn-sm btn-ghost" onclick="_downloadAnalyticsCSV()"><i class="fas fa-download"></i> CSV</button>'+
    '<button class="btn btn-sm" onclick="_loadAnalytics()"><i class="fas fa-rotate-right"></i> Refresh</button>');

  var mon=_today().slice(0,7);
  html+='<div class="ana-toolbar"><div class="ana-row">'+
    '<div class="ana-grp"><div class="ana-lbl">From</div><input type="date" id="ana-from" class="ana-sel" value="'+mon+'-01"></div>'+
    '<div class="ana-grp"><div class="ana-lbl">To</div><input type="date" id="ana-to" class="ana-sel" value="'+_today()+'"></div>'+
    '<button class="btn btn-sm" onclick="_loadAnalytics()"><i class="fas fa-search"></i> Apply</button></div></div>';

  // Quick KPIs from cached data
  var fuel=_D.fuel||[];var exp=_D.expenses||[];var trips=_D.trips||[];
  var from=mon+'-01',to=_today();
  var monFuel=fuel.filter(function(f){var d=String(f.Date||'').slice(0,10);return d>=from&&d<=to;});
  var monExp=exp.filter(function(e){var d=String(e.Date||'').slice(0,10);return d>=from&&d<=to;});
  var monTrips=trips.filter(function(t){var d=String(t.Date||'').slice(0,10);return d>=from&&d<=to;});
  var totFuel=monFuel.reduce(function(s,f){return s+Number(f.Amount||0);},0);
  var totExp=monExp.reduce(function(s,e){return s+Number(e.Amount||0);},0);
  var totKM=monTrips.reduce(function(s,t){return s+Number(t.TotalKM||0);},0);

  html+='<div class="kpi-grid" style="margin:16px 0">'+
    _kpi('fa-gas-pump','#E67E22',_inr(totFuel),'Fuel Spend','This period')+
    _kpi('fa-receipt','#E74C3C',_inr(totExp+totFuel),'Total Expense','Fuel + others')+
    _kpi('fa-route','#2980B9',monTrips.length,'Trips','This period')+
    _kpi('fa-gauge-high','#8E44AD',totKM.toLocaleString('en-IN')+' km','Total Distance','')+
    '</div>';

  html+='<div class="ana-charts-grid">'+
    '<div class="ana-chart-card ana-wide"><div class="ana-chart-title"><i class="fas fa-chart-line" style="color:var(--P)"></i>Fuel Spend Trend</div><canvas id="chart-fuel" height="80"></canvas></div>'+
    '<div class="ana-chart-card"><div class="ana-chart-title"><i class="fas fa-chart-pie" style="color:var(--P)"></i>Expense by Type</div><canvas id="chart-exp"></canvas></div>'+
    '<div class="ana-chart-card"><div class="ana-chart-title"><i class="fas fa-chart-bar" style="color:var(--G)"></i>Mileage by Vehicle</div><canvas id="chart-mil"></canvas></div>'+
    '<div class="ana-chart-card"><div class="ana-chart-title"><i class="fas fa-users" style="color:var(--O)"></i>Attendance %</div><canvas id="chart-att"></canvas></div>'+
    '</div>';

  return html;
}

function _initAnalyticsCharts(){
  if(typeof Chart==='undefined')return;
  var fuel=_D.fuel||[];var exp=_D.expenses||[];
  var att=_D.attendance||[];var veh=_D.vehicles||[];
  var mon=_today().slice(0,7);
  var from=mon+'-01',to=_today();

  // Fuel trend
  var fuelMap={};
  fuel.filter(function(f){var d=String(f.Date||'').slice(0,10);return d>=from&&d<=to;})
    .forEach(function(f){var d=String(f.Date||'').slice(0,10);fuelMap[d]=(fuelMap[d]||0)+Number(f.Amount||0);});
  var fKeys=Object.keys(fuelMap).sort();
  _mkChart('chart-fuel','line',fKeys,fKeys.map(function(k){return fuelMap[k];}),['#D51515'],'₹ Fuel');

  // Expense by type
  var expMap={};
  exp.filter(function(e){var d=String(e.Date||'').slice(0,10);return d>=from&&d<=to;})
    .forEach(function(e){var t=e.ExpenseType||'Other';expMap[t]=(expMap[t]||0)+Number(e.Amount||0);});
  var eKeys=Object.keys(expMap);
  _mkChart('chart-exp','doughnut',eKeys,eKeys.map(function(k){return expMap[k];}),
    ['#D51515','#2980B9','#27AE60','#E67E22','#8E44AD','#0D9488'],'');

  // Mileage by vehicle
  var milMap={};
  fuel.filter(function(f){var d=String(f.Date||'').slice(0,10);return d>=from&&d<=to;})
    .forEach(function(f){var v=_vehicleNo(f.VehicleID);var m=parseFloat(f.Mileage||0);if(m>0){if(!milMap[v])milMap[v]=[];milMap[v].push(m);}});
  var mKeys=Object.keys(milMap);
  var mVals=mKeys.map(function(k){return(milMap[k].reduce(function(s,v){return s+v;},0)/milMap[k].length).toFixed(1);});
  _mkChart('chart-mil','bar',mKeys,mVals,['#27AE60'],'km/L');

  // Attendance %
  var attMap={};
  att.filter(function(a){var d=String(a.Date||'').slice(0,10);return d>=from&&d<=to;})
    .forEach(function(a){var n=_driverName(a.DriverID);if(!attMap[n])attMap[n]={p:0,t:0};
      attMap[n].t++;if(a.Status==='Present'||a.Status==='Late')attMap[n].p++;});
  var aKeys=Object.keys(attMap).slice(0,8);
  var aVals=aKeys.map(function(k){return attMap[k].t?Math.round(attMap[k].p/attMap[k].t*100):0;});
  _mkChart('chart-att','bar',aKeys,aVals,aVals.map(function(v){return v>=90?'#27AE60':v>=70?'#E67E22':'#E74C3C';}),'%');
}

var _charts={};
function _mkChart(id,type,labels,data,colors,label){
  var el=document.getElementById(id);if(!el)return;
  if(_charts[id]){try{_charts[id].destroy();}catch(e){}}
  var isDark=document.body.classList.contains('dark');
  var tc=isDark?'#AAAAAA':'#555555';var gc=isDark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';
  _charts[id]=new Chart(el.getContext('2d'),{
    type:type,
    data:{labels:labels,datasets:[{label:label||'',data:data,
      backgroundColor:type==='line'?'rgba(213,21,21,.12)':colors,
      borderColor:type==='line'?'#D51515':colors,
      borderWidth:type==='line'?2:0,fill:type==='line',tension:.35,
      pointBackgroundColor:'#D51515',pointRadius:3}]},
    options:{responsive:true,plugins:{legend:{display:type==='doughnut',labels:{color:tc,boxWidth:12,font:{size:11}}},tooltip:{callbacks:{label:function(c){return c.label+': '+(label==='₹ Fuel'||label===''?'₹':'')+Number(c.parsed.y||c.parsed||0).toLocaleString('en-IN')+(label==='%'?'%':label==='km/L'?' km/L':'');}}}},
      scales:type==='doughnut'?{}:{x:{ticks:{color:tc,font:{size:10}},grid:{color:gc}},y:{ticks:{color:tc,font:{size:10}},grid:{color:gc}}}}
  });
}
function _loadAnalytics(){
  var from=document.getElementById('ana-from').value;
  var to=document.getElementById('ana-to').value;
  _showLoader('Loading analytics...');
  _gas('getAnalytics',[{from:from,to:to}],function(r){
    _hideLoader();
    _toast('Analytics updated','success');
    setTimeout(_initAnalyticsCharts,200);
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _downloadAnalyticsCSV(){
  var fuel=_D.fuel||[];
  var rows=[['Vehicle','Driver','Date','Qty','Amount','Mileage']];
  fuel.forEach(function(f){rows.push([_vehicleNo(f.VehicleID),_driverName(f.DriverID),f.Date,f.FuelQty,f.Amount,f.Mileage]);});
  _downloadCSV('ISE_Analytics_'+_today()+'.csv',rows);
}

// ── PAYROLL ───────────────────────────────────────────────────────────────────
function _vPayroll(){
  var saved=_D.payroll||[];
  var html=_ph('Payroll Summary',
    '<select id="pay-month" style="padding:8px 12px;border:1.5px solid var(--bdr);border-radius:8px;font-size:13px;background:var(--sur);color:var(--tx);font-family:inherit">'+
    _last6Months().map(function(m){return'<option value="'+m.val+'">'+m.label+'</option>';}).join('')+'</select>'+
    '<button class="btn btn-sm" onclick="_loadPayroll()"><i class="fas fa-calculator"></i> Calculate</button>'+
    '<button class="btn btn-sm btn-ghost" onclick="_downloadPayrollCSV()"><i class="fas fa-download"></i> CSV</button>');

  html+='<div id="payroll-result">';
  if(!saved.length){html+='<div style="padding:32px;text-align:center;color:var(--tx3)"><i class="fas fa-calculator" style="font-size:40px;margin-bottom:12px;display:block;opacity:.3"></i>Select month aur Calculate karein</div>';}
  else{ html+=_renderPayrollCards(saved); }
  html+='</div>';
  return html;
}
function _loadPayroll(){
  var m=document.getElementById('pay-month').value;
  _showLoader('Calculating payroll...');
  _gas('getPayrollSummary',[m],function(r){
    _hideLoader();
    if(!r||!r.employees){_toast('Payroll calculate nahi hua','err');return;}
    var el=document.getElementById('payroll-result');
    if(el)el.innerHTML=_renderPayrollCards(r.employees,r.summary,m);
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _renderPayrollCards(emps,summary,month){
  var html='';
  if(summary){
    html+='<div class="finance-strip" style="margin-bottom:16px">'+
      '<div class="fs-item"><div class="fs-label">Employees</div><div class="fs-val">'+summary.total+'</div></div>'+
      '<div class="fs-item"><div class="fs-label">Gross</div><div class="fs-val">'+_inr(summary.total_gross)+'</div></div>'+
      '<div class="fs-item"><div class="fs-label">Deductions</div><div class="fs-val" style="color:var(--R)">'+_inr(summary.total_deductions)+'</div></div>'+
      '<div class="fs-item"><div class="fs-label">Net</div><div class="fs-val" style="color:var(--G)">'+_inr(summary.total_net)+'</div></div></div>';
    if(month)html+='<button class="btn btn-sm btn-success" style="margin-bottom:16px" onclick="_savePayrollData()"><i class="fas fa-save"></i> Save Payroll</button>';
  }
  window._lastPayrollData=emps;window._lastPayrollMonth=month;
  html+='<div class="payroll-grid">';
  emps.forEach(function(e){
    var col=_avatarColor(e.driver_name);
    html+='<div class="payroll-card">'+
      '<div class="pc-head"><div class="pc-avatar" style="background:'+col+'">'+_initials(e.driver_name)+'</div>'+
      '<div><div class="pc-name">'+_esc(e.driver_name)+'</div><div class="pc-id">'+_esc(e.driver_id)+'</div></div></div>'+
      '<div class="pc-row"><span class="pc-lbl">Present</span><span class="pc-val">'+e.present_days+' days</span></div>'+
      '<div class="pc-row"><span class="pc-lbl">Absent/LWP</span><span class="pc-val" style="color:var(--R)">'+e.absent_days+'/'+e.lwp_days+' days</span></div>'+
      '<div class="pc-row"><span class="pc-lbl">Gross Salary</span><span class="pc-val">'+_inr(e.gross_salary)+'</span></div>'+
      '<div class="pc-row pc-deduct"><span class="pc-lbl">Total Deductions</span><span class="pc-val">-'+_inr(e.total_deductions)+'</span></div>'+
      '<div class="pc-row pc-net"><span class="pc-lbl">Net Payable</span><span class="pc-val">'+_inr(e.net_salary)+'</span></div>'+
      '</div>';
  });
  html+='</div>';
  return html;
}
function _savePayrollData(){
  if(!window._lastPayrollData||!window._lastPayrollMonth){_toast('Pehle calculate karo','warn');return;}
  _showLoader('Saving...');
  _gas('savePayroll',[window._lastPayrollData,window._lastPayrollMonth],function(r){
    _hideLoader();if(r&&r.success){_toast('Payroll saved! ✅','success');}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _downloadPayrollCSV(){
  var emps=window._lastPayrollData||(_D.payroll||[]);
  if(!emps.length){_toast('Pehle payroll calculate karo','warn');return;}
  var rows=[['Driver','Present','Absent','LWP','Gross','PF','ESI','TDS','LWP Ded','Total Ded','Net']];
  emps.forEach(function(e){rows.push([e.driver_name||e.driver_id,e.present_days,e.absent_days,e.lwp_days,e.gross_salary,e.pf_deduction,e.esi_deduction,e.tds,e.lwp_deduction,e.total_deductions,e.net_salary]);});
  _downloadCSV('ISE_Payroll_'+(window._lastPayrollMonth||_today().slice(0,7))+'.csv',rows);
}

// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
function _vAuditLog(){
  var logs=_D.auditLogs||[];
  var html=_ph('Audit Log','');
  if(!logs.length)return html+_emptyState('📝','No audit records','');
  html+='<div class="card"><div class="audit-list">';
  logs.slice().reverse().slice(0,100).forEach(function(l){
    html+='<div class="audit-row">'+
      '<span class="audit-module">'+_esc(l.Module||'—')+'</span>'+
      '<span class="audit-action">'+_esc(l.Action||'—')+'</span>'+
      '<span class="audit-id">'+_esc(l.RecordID||'—')+'</span>'+
      '<span class="audit-by"><i class="fas fa-user"></i> '+_esc(l.PerformedBy||'—')+'</span>'+
      '<span class="audit-time">'+_fmtDateTime(l.DateTime)+'</span></div>';
  });
  html+='</div></div>';
  return html;
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function _vUsers(){
  var users=_D.users||[];
  var html=_ph('User Management','<button class="btn btn-sm" onclick="openAddUser()"><i class="fas fa-plus"></i> Add User</button>');
  if(!users.length)return html+_emptyState('👥','No users','');
  users.forEach(function(u){
    var col=_avatarColor(u.Name||'');
    var rBadge=u.Role==='Admin'?'badge-admin':u.Role==='Manager'?'badge-manager':'badge-driver';
    html+='<div class="user-card">'+
      '<div class="uc-avatar" style="background:'+col+'">'+_initials(u.Name||'?')+'</div>'+
      '<div class="uc-info">'+
      '<div class="uc-name">'+_esc(u.Name)+'</div>'+
      '<div class="uc-meta">'+_esc(u.Email)+' &nbsp;·&nbsp; '+_esc(u.Mobile||'—')+'</div>'+
      '<div style="margin-top:4px"><span class="badge '+rBadge+'">'+_esc(u.Role)+'</span>'+
      (u.Status!=='Active'?'<span class="badge badge-inactive" style="margin-left:4px">Inactive</span>':'')+'</div>'+
      '<div class="uc-perms">'+_esc(u.Permissions||'—')+'</div></div>'+
      '<div style="display:flex;flex-direction:column;gap:4px">'+
      (u.Status==='Active'?'<button class="btn btn-xs btn-ghost" onclick="toggleUserStatus(\''+u.UserID+'\',\'Inactive\')">Disable</button>':
        '<button class="btn btn-xs btn-outline" onclick="toggleUserStatus(\''+u.UserID+'\',\'Active\')">Enable</button>')+
      '</div></div>';
  });
  return html;
}
function openAddUser(){ _modal('Add User','<div style="padding:16px;color:var(--tx3)">Use Add Driver (with login credentials) to add driver users, or directly edit the Users sheet for admins/managers.</div>'); }
function toggleUserStatus(uid,status){
  if(!confirm('Status change karna hai?'))return;
  _gas('updateUserStatus',[uid,status],function(r){if(r&&r.success){_toast('Status updated ✅','success');_loadAllData(true);}});
}

// ── SETTINGS ─────────────────────────────────────────────────────────────────
function _vSettings(){
  if(!_U)return'';
  var col=_avatarColor(_U.name||'');
  var html='<div class="settings-profile">'+
    '<div class="sp-avatar" style="background:rgba(255,255,255,.2)">'+_initials(_U.name||'')+'</div>'+
    '<div><div class="sp-name">'+_esc(_U.name)+'</div>'+
    '<div class="sp-email">'+_esc(_U.email)+'</div>'+
    '<div style="margin-top:8px"><span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700">'+_esc(_U.role)+'</span></div></div></div>';

  html+='<div class="settings-list">'+
    '<div class="setting-row" onclick="_changePassword()">'+
    '<div class="sr-icon"><i class="fas fa-lock"></i></div>'+
    '<div class="sr-label">Change Password</div><i class="fas fa-chevron-right sr-arrow"></i></div>'+
    '<div class="setting-row" onclick="toggleDark()">'+
    '<div class="sr-icon"><i class="fas fa-moon"></i></div>'+
    '<div class="sr-label">Dark Mode</div><div class="sr-val" id="dk-val">'+(document.body.classList.contains('dark')?'On':'Off')+'</div></div>'+
    '<div class="setting-row">'+
    '<div class="sr-icon"><i class="fas fa-building"></i></div>'+
    '<div class="sr-label">Company</div><div class="sr-val">Isha Steels Enterprises</div></div>'+
    '<div class="setting-row">'+
    '<div class="sr-icon"><i class="fas fa-code-branch"></i></div>'+
    '<div class="sr-label">App Version</div><div class="sr-val">v3.0.0</div></div></div>';

  html+='<div class="sec-hdr">My Permissions</div>'+
    '<div class="perm-list">'+
    (_U.permissions||[]).map(function(p){return'<span class="perm-badge">'+_esc(p)+'</span>';}).join('')+'</div>';

  html+='<button class="btn btn-wide btn-danger" style="margin-top:20px" onclick="doLogout()"><i class="fas fa-right-from-bracket"></i> Logout</button>';
  return html;
}
function _changePassword(){
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>New Password *</label><input type="password" id="cp-new" placeholder="New password (min 4 chars)"></div>'+
    '<div class="fgrp"><label>Confirm Password *</label><input type="password" id="cp-con" placeholder="Repeat new password"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitChangePassword()"><i class="fas fa-lock"></i> Change Password</button></div>';
  _modal('Change Password',body);
}
function submitChangePassword(){
  var np=document.getElementById('cp-new').value;var cp=document.getElementById('cp-con').value;
  if(!np||np.length<4){_toast('Password kam se kam 4 characters ka ho','warn');return;}
  if(np!==cp){_toast('Passwords match nahi kar rahe','warn');return;}
  closeModal();_showLoader('Changing...');
  _gas('changePassword',[np],function(r){
    _hideLoader();if(r&&r.success){_toast('Password changed! ✅','success');}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ════════════════════════════════════════════════════════════════════════════
// DRIVER VIEWS
// ════════════════════════════════════════════════════════════════════════════

// ── MY DASHBOARD ─────────────────────────────────────────────────────────────
function _vMyDashboard(){
  var myVeh=(_D.myVehicle||[])[0]||null;
  var myDrv=(_D.myDriver||[])[0]||null;
  var myAtt=_D.myAttendance||[];
  var myChk=_D.myChecklist||[];
  var myDel=_D.myDelegations||[];
  var cels=_D.celebrations||[];
  var anns=_D.announcements||[];
  var today=_today();
  var lb=_D.leaveBalance||{};

  var todayAtt=myAtt.filter(function(a){return String(a.Date||'').slice(0,10)===today;});
  var hasIN=todayAtt.some(function(a){return a.InTime;});
  var hasOUT=todayAtt.some(function(a){return a.OutTime;});
  var mon=today.slice(0,7);
  var monAtt=myAtt.filter(function(a){return String(a.Date||'').slice(0,10).startsWith(mon);});
  var pDays=monAtt.filter(function(a){return a.Status==='Present'||a.Status==='Late';}).length;

  var pendingChk=myChk.filter(function(c){return c.status==='Pending';}).length;
  var pendingDel=myDel.filter(function(d){return d.status==='Pending';}).length;
  var overdueD=myDel.filter(function(d){return d.is_overdue;}).length;

  var html='';

  // Celebration banners
  cels.forEach(function(c){
    html+='<div class="cel-banner"><div class="cel-icon">'+(c.type==='birthday'?'🎂':'🏢')+'</div>'+
      '<div class="cel-msg"><div class="cel-name">Happy '+(c.type==='birthday'?'Birthday':'Work Anniversary')+' '+_esc(c.name)+'!</div>'+
      '<div class="cel-sub">From Team ISE 🎉</div></div></div>';
  });

  // My vehicle card
  if(myVeh){
    var insD=_daysLeft(String(myVeh.InsuranceExpiry||'').slice(0,10));
    var pucD=_daysLeft(String(myVeh.PUCExpiry||'').slice(0,10));
    html+='<div class="mvc">'+
      '<div class="mvc-inner">'+
      '<div class="mvc-left">'+
      '<div class="mvc-plate">'+_esc(myVeh.VehicleNo)+'</div>'+
      '<div class="mvc-brand">'+_esc((myVeh.Brand||'')+' '+(myVeh.Model||''))+'</div>'+
      '<div class="mvc-meta">'+
      '<span class="mvc-tag">'+_esc(myVeh.FuelType||'')+'</span>'+
      (insD<30&&insD>=0?'<span class="mvc-tag" style="background:rgba(231,76,60,.3);color:#ffaaaa">Ins: '+insD+'d</span>':'')+
      (pucD<15&&pucD>=0?'<span class="mvc-tag" style="background:rgba(231,76,60,.3);color:#ffaaaa">PUC: '+pucD+'d</span>':'')+
      '</div></div>'+
      '<div class="mvc-right">'+
      '<div class="mvc-km">'+Number(myVeh.CurrentKM||0).toLocaleString('en-IN')+'</div>'+
      '<div class="mvc-km-lbl">Current KM</div>'+
      '<div class="mvc-fastag" style="margin-top:8px">🏷️ ₹'+Number(myVeh.FastagBalance||0)+'</div></div>'+
      '</div></div>';
  } else {
    html+='<div class="alert-card info"><b>No vehicle assigned</b><br>Manager se contact karo.</div>';
  }

  // Today's attendance status
  html+='<div class="card" style="margin-bottom:14px">'+
    '<div style="font-size:13px;font-weight:800;color:var(--tx2);margin-bottom:12px"><i class="fas fa-calendar-check"></i> Today\'s Attendance</div>'+
    (hasIN&&hasOUT?
      '<div style="color:var(--G);font-weight:700;font-size:14px">✅ Attendance complete for today</div>':
      hasIN?
      '<div style="color:var(--O);font-weight:700;font-size:14px">🟡 Checked IN · Please mark OUT when leaving</div>'+
      '<button class="btn btn-wide btn-lg" style="margin-top:10px;background:var(--P)" onclick="_markAttendance(\'out\')"><i class="fas fa-right-from-bracket"></i> Mark OUT</button>':
      '<div style="color:var(--tx3);font-size:13px;margin-bottom:10px">Not marked yet today</div>'+
      '<button class="btn btn-wide btn-lg" onclick="_markAttendance(\'in\')"><i class="fas fa-right-to-bracket"></i> Mark IN</button>'
    )+'</div>';

  // Stats strip
  html+='<div class="month-strip">'+
    '<div class="ms-item"><div class="ms-val">'+pDays+'</div><div class="ms-lbl">Present</div></div>'+
    '<div class="ms-item"><div class="ms-val" style="color:var(--O)">'+pendingChk+'</div><div class="ms-lbl">Tasks</div></div>'+
    '<div class="ms-item"><div class="ms-val" style="color:'+(overdueD?'var(--R)':'var(--P)')+'">'+pendingDel+'</div><div class="ms-lbl">Delegated</div></div>'+
    '<div class="ms-item"><div class="ms-val" style="color:var(--G)">'+(lb.total_available||0)+'</div><div class="ms-lbl">Leave Bal</div></div></div>';

  // Big action buttons
  html+='<div class="big-actions">'+
    '<button class="ba-btn" style="--kc:#D51515" onclick="_loadV(\'my_inspection\')"><div class="ba-icon">🔍</div><div class="ba-label">Inspection</div></button>'+
    '<button class="ba-btn" style="--kc:#16A085" onclick="_loadV(\'my_cleaning\')"><div class="ba-icon">🧽</div><div class="ba-label">Cleaning</div></button>'+
    '<button class="ba-btn" style="--kc:#E67E22" onclick="_loadV(\'my_fuel\')"><div class="ba-icon">⛽</div><div class="ba-label">Fuel</div></button>'+
    '<button class="ba-btn" style="--kc:#2980B9" onclick="_loadV(\'my_trips\')"><div class="ba-icon">🗺️</div><div class="ba-label">Trip</div></button>'+
    '<button class="ba-btn" style="--kc:#E74C3C" onclick="_loadV(\'my_expenses\')"><div class="ba-icon">💸</div><div class="ba-label">Expense</div></button>'+
    '<button class="ba-btn" style="--kc:#8E44AD" onclick="_loadV(\'my_kmlogs\')"><div class="ba-icon">📏</div><div class="ba-label">KM Log</div></button></div>';

  // Today's checklist preview
  if(myChk.length){
    html+='<div class="sec-hdr"><i class="fas fa-list-check" style="color:var(--T)"></i>Today\'s Checklist</div>';
    html+='<div class="daily-checklist">';
    myChk.slice(0,4).forEach(function(c){
      var done=c.status==='Done';var taken=c.isTaken;
      html+='<button class="daily-step'+(done?' is-done':'')+'" onclick="_loadV(\'my_checklist\')" style="cursor:pointer">'+
        '<span>'+(done?'✅':taken?'🔄':'🔲')+'</span>'+
        '<b>'+_esc(c.taskName)+(c.taskType==='Shared'?'<span class="shared-badge">Shared</span>':'')+'</b>'+
        '<em>'+(done?'Done by '+_esc(c.claimedByName):taken?'Claimed by '+_esc(c.claimedByName):'⏳ '+_esc(c.plannedTime))+'</em></button>';
    });
    if(myChk.length>4)html+='<div style="font-size:12px;color:var(--P);cursor:pointer;padding:8px 14px" onclick="_loadV(\'my_checklist\')">View all '+myChk.length+' tasks →</div>';
    html+='</div>';
  }

  // Announcements
  if(anns.length){
    html+='<div class="sec-hdr"><i class="fas fa-bullhorn" style="color:var(--P)"></i>Announcements</div>';
    anns.slice(0,2).forEach(function(a){
      html+='<div class="ann-card '+(a.priority||'Normal').toLowerCase()+'">'+
        '<div class="ann-text">'+_esc(a.text)+'</div>'+
        '<div class="ann-meta"><i class="fas fa-user"></i>'+_esc(a.posted_by_name)+'</div></div>';
    });
  }

  return html;
}

// ── MARK ATTENDANCE (Driver) ──────────────────────────────────────────────────
function _markAttendance(type){
  _showLoader('Getting GPS...');
  _getGPS(function(gps){
    var loc=APP_CONFIG.DEPOT_NAME||'ISE Depot';
    _gas('addAttendance',[{type:type,gps:gps,location:loc,date:_today()}],function(r){
      _hideLoader();
      if(r&&r.success){
        var msg=type==='in'?'✅ Checked IN!':'✅ Checked OUT! Total: '+(r.totalHours||'—');
        _toast(msg,'success');_loadAllData(true);
      } else {
        _hideLoader();_toast('Error: '+(r&&r.error),'err');
      }
    },function(e){_hideLoader();_toast(e.message,'err');});
  },function(err){
    // GPS failed — proceed without
    _gas('addAttendance',[{type:type,gps:'',location:APP_CONFIG.DEPOT_NAME||'ISE Depot',date:_today()}],function(r){
      _hideLoader();
      if(r&&r.success){_toast((type==='in'?'✅ Checked IN!':'✅ Checked OUT!'),'success');_loadAllData(true);}
      else _toast('Error: '+(r&&r.error),'err');
    },function(e){_hideLoader();_toast(e.message,'err');});
  });
}

// ── MY ATTENDANCE ─────────────────────────────────────────────────────────────
function _vMyAttendance(){
  var att=_D.myAttendance||[];
  var today=_today();var mon=today.slice(0,7);
  var todayAtt=att.filter(function(a){return String(a.Date||'').slice(0,10)===today;});
  var hasIN=todayAtt.some(function(a){return a.InTime;});
  var hasOUT=todayAtt.some(function(a){return a.OutTime;});

  var html=_ph('My Attendance','');

  // Mark attendance card
  html+='<div class="card" style="margin-bottom:16px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:12px"><i class="fas fa-calendar-check" style="color:var(--G)"></i> Mark Today\'s Attendance</div>';
  if(hasIN&&hasOUT){
    var t=todayAtt[0];
    html+='<div style="background:var(--Gl);padding:12px;border-radius:10px;color:#1A7A40;font-weight:700">'+
      '✅ Complete — IN: '+_fmtTime(t.InTime)+' · OUT: '+_fmtTime(t.OutTime)+' · '+_esc(t.TotalHours||'')+'</div>';
  } else if(hasIN){
    html+='<div style="color:var(--O);font-weight:700;margin-bottom:10px">🟡 Checked IN at '+_fmtTime(todayAtt[0].InTime)+'</div>'+
      '<button class="btn btn-wide" style="background:var(--P)" onclick="_markAttendance(\'out\')"><i class="fas fa-right-from-bracket"></i> Mark OUT</button>';
  } else {
    html+='<button class="btn btn-wide btn-lg" onclick="_markAttendance(\'in\')"><i class="fas fa-right-to-bracket"></i> Mark IN — '+today+'</button>';
  }
  html+='</div>';

  // Monthly summary
  var monAtt=att.filter(function(a){return String(a.Date||'').slice(0,10).startsWith(mon);});
  var p=monAtt.filter(function(a){return a.Status==='Present';}).length;
  var l=monAtt.filter(function(a){return a.Status==='Late';}).length;
  var ab=monAtt.filter(function(a){return a.Status==='Absent';}).length;
  html+='<div class="att-summary">'+
    '<div class="as-item as-present"><div class="as-num">'+p+'</div><div class="as-lbl">Present</div></div>'+
    '<div class="as-item as-late"><div class="as-num">'+l+'</div><div class="as-lbl">Late</div></div>'+
    '<div class="as-item as-absent"><div class="as-num">'+ab+'</div><div class="as-lbl">Absent</div></div>'+
    '<div class="as-item as-total"><div class="as-num">'+monAtt.length+'</div><div class="as-lbl">Marked</div></div></div>';

  if(!att.length)return html+_emptyState('📋','No attendance records yet','Mark IN to start');

  // History
  html+='<div class="sec-hdr">Recent History</div>';
  html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Day</th><th>IN</th><th>OUT</th><th>Hours</th><th>Status</th></tr></thead><tbody>';
  att.slice().reverse().slice(0,30).forEach(function(a){
    var s=a.Status||'—';var sCol=s==='Present'?'badge-present':s==='Late'?'badge-late':s==='Half Day'?'badge-hd':'badge-absent';
    html+='<tr><td>'+_fmtDate(a.Date)+'</td><td>'+_dayName(String(a.Date||'').slice(0,10)).slice(0,3)+'</td>'+
      '<td>'+_fmtTime(a.InTime)+'</td><td>'+(_fmtTime(a.OutTime)||'—')+'</td>'+
      '<td>'+_esc(a.TotalHours||'—')+'</td><td><span class="badge '+sCol+'">'+_esc(s)+'</span></td></tr>';
  });
  html+='</tbody></table></div>';
  return html;
}

// ── MY CHECKLIST ──────────────────────────────────────────────────────────────
function _vMyChecklist(){
  var chk=_D.myChecklist||[];
  var done=chk.filter(function(c){return c.status==='Done';}).length;
  var pending=chk.filter(function(c){return c.status==='Pending'&&!c.isTaken;}).length;

  var html=_ph('My Checklist','');
  html+='<div class="finance-strip" style="margin-bottom:16px">'+
    '<div class="fs-item"><div class="fs-label">Done</div><div class="fs-val" style="color:var(--G)">'+done+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Pending</div><div class="fs-val" style="color:var(--O)">'+pending+'</div></div>'+
    '<div class="fs-item"><div class="fs-label">Total</div><div class="fs-val">'+chk.length+'</div></div></div>';

  if(!chk.length)return html+_emptyState('✅','All clear!','No tasks assigned today');

  chk.forEach(function(c){
    var done=c.status==='Done';var taken=c.isTaken;
    var cls='checklist-item'+(done?' done':taken?' taken':'');
    html+='<div class="'+cls+'">';
    html+='<div class="ci-icon">'+(done?'✅':taken?'🔄':c.taskType==='Shared'?'👥':'🔲')+'</div>';
    html+='<div class="ci-body">'+
      '<div class="ci-name">'+_esc(c.taskName)+(c.taskType==='Shared'?'<span class="shared-badge">Shared</span>':'')+'</div>'+
      '<div class="ci-meta">'+
      (done?'✓ Done at '+_esc(c.claimedAt||''):taken?'Claimed by '+_esc(c.claimedByName):'⏳ '+_esc(c.plannedTime||''))+
      '</div></div>';
    if(!done&&!taken){
      if(c.taskType==='Shared'){
        html+='<button class="btn btn-sm" onclick="claimTask(\''+c.checkID+'\')"><i class="fas fa-hand-pointer"></i> Claim</button>';
      } else {
        html+='<button class="btn btn-sm" onclick="openMarkTaskDone(\''+c.checkID+'\')"><i class="fas fa-check"></i> Done</button>';
      }
    }
    html+='</div>';
  });
  return html;
}
function claimTask(checkID){
  _showLoader('Claiming task...');
  _gas('claimTask',[checkID],function(r){
    _hideLoader();
    if(r&&r.alreadyClaimed){_toast('Already claimed by '+r.claimedBy,'warn');_loadAllData(true);return;}
    if(r&&r.success){_toast('Task claimed! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function openMarkTaskDone(checkID){
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Remarks (Optional)</label><textarea id="td-rem" placeholder="Any remarks about this task..."></textarea></div>'+
    '<button class="btn btn-wide btn-lg btn-success" style="margin-top:12px" onclick="submitMarkTaskDone(\''+checkID+'\')"><i class="fas fa-check"></i> Mark Done</button></div>';
  _modal('Mark Task Done',body);
}
function submitMarkTaskDone(checkID){
  var remarks=document.getElementById('td-rem').value.trim();
  closeModal();_showLoader('Marking done...');
  _gas('markTaskDone',[checkID,remarks,''],function(r){
    _hideLoader();if(r&&r.success){_toast('Task completed! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── MY DELEGATIONS ────────────────────────────────────────────────────────────
function _vMyDelegations(){
  var dels=_D.myDelegations||[];
  var html=_ph('My Tasks','');
  var pending=dels.filter(function(d){return d.status==='Pending';}).length;
  var overdue=dels.filter(function(d){return d.is_overdue;}).length;

  if(overdue){html+='<div class="alert-card danger"><div class="ac-title">⚠️ '+overdue+' Overdue Task'+(overdue>1?'s':'')+'</div></div>';}
  if(!dels.length)return html+_emptyState('📌','No tasks assigned','Manager se naya task milega');

  dels.forEach(function(d){
    html+='<div class="del-card'+(d.is_overdue?' overdue':d.status==='Completed'?' completed':'')+'">'+
      '<div class="del-head"><div class="del-task">'+_esc(d.task_desc)+'</div>'+
      '<span class="badge '+(d.status==='Completed'?'badge-completed':d.is_overdue?'badge-high':'badge-pending')+'">'+_esc(d.is_overdue?'Overdue':d.status)+'</span></div>'+
      '<div class="del-meta">'+
      '<span class="del-meta-item"><i class="fas fa-calendar"></i> Due: '+_fmtDate(d.final_date)+'</span>'+
      '<span class="del-meta-item"><i class="fas fa-user"></i> By: '+_esc(d.delegated_by_name)+'</span>'+
      (d.revision_1?'<span class="del-meta-item" style="color:var(--O)"><i class="fas fa-rotate-right"></i> Revised</span>':'')+
      '</div>'+
      (d.status==='Pending'?
        '<div style="display:flex;gap:8px;margin-top:10px">'+
        '<button class="btn btn-sm btn-success" onclick="markDelComplete(\''+d.task_id+'\')"><i class="fas fa-check"></i> Mark Done</button>'+
        '<button class="btn btn-sm btn-ghost" onclick="openRevisionRequest(\''+d.task_id+'\')"><i class="fas fa-calendar"></i> Request Date Change</button></div>':'')+
      '</div>';
  });
  return html;
}
function openRevisionRequest(taskID){
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>New Requested Date *</label><input type="date" id="rv-date" min="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Reason</label><textarea id="rv-reason" placeholder="Why you need more time..."></textarea></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitRevision(\''+taskID+'\')"><i class="fas fa-paper-plane"></i> Request Extension</button></div>';
  _modal('Request Date Change',body);
}
function submitRevision(taskID){
  var date=document.getElementById('rv-date').value;
  var reason=document.getElementById('rv-reason').value.trim();
  if(!date){_toast('New date daalo','warn');return;}
  closeModal();_showLoader('Sending request...');
  _gas('requestDateRevision',[taskID,date,reason],function(r){
    _hideLoader();if(r&&r.success){_toast('Request sent to manager! ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── MY LEAVE ──────────────────────────────────────────────────────────────────
function _vMyLeave(){
  var leaves=_D.myLeaves||[];
  var lb=_D.leaveBalance||{};
  var html=_ph('My Leave','<button class="btn btn-sm" onclick="openApplyLeave()"><i class="fas fa-plus"></i> Apply Leave</button>');

  // Leave balance
  html+='<div class="leave-balance">'+
    '<div class="lb-item"><div class="lb-num lb-cl">'+lb.casual_leave+'</div><div class="lb-lbl">Casual</div></div>'+
    '<div class="lb-item"><div class="lb-num lb-sl">'+lb.sick_leave+'</div><div class="lb-lbl">Sick</div></div>'+
    '<div class="lb-item"><div class="lb-num lb-pl">'+lb.paid_leave+'</div><div class="lb-lbl">Paid</div></div>'+
    '<div class="lb-item"><div class="lb-num" style="color:var(--tx)">'+lb.total_available+'</div><div class="lb-lbl">Total Left</div></div></div>';

  if(!leaves.length)return html+_emptyState('📅','No leave requests','Apply karo');
  html+='<div class="sec-hdr">My Requests</div>';
  leaves.forEach(function(l){
    var sCol=l.status==='Approved'?'badge-approved':l.status==='Rejected'?'badge-rejected':'badge-pending';
    html+='<div class="leave-card">'+
      '<div class="leave-head"><div>'+
      '<div class="leave-type">'+_esc(l.leave_type)+'</div>'+
      '<div class="leave-dates">'+_fmtDate(l.from_date)+' → '+_fmtDate(l.to_date)+' ('+l.num_days+' day'+(l.num_days>1?'s':'')+')</div></div>'+
      '<span class="badge '+sCol+'">'+_esc(l.status)+'</span></div>'+
      '<div class="leave-reason">'+_esc(l.reason||'')+'</div>'+
      (l.remark?'<div style="font-size:12px;color:var(--tx3);margin-top:6px;padding:8px;background:var(--sur2);border-radius:7px"><i class="fas fa-comment"></i> '+_esc(l.remark)+'</div>':'')+
      (l.status==='Pending'?'<button class="btn btn-xs btn-ghost" style="margin-top:8px" onclick="cancelLeaveReq(\''+l.request_id+'\')">Cancel Request</button>':'')+
      '</div>';
  });
  return html;
}
function openApplyLeave(){
  var body='<div class="form-card" style="border:none;padding:0">'+
    '<div class="fgrp"><label>Leave Type *</label><select id="al-type"><option value="">Select</option>'+
    APP_CONFIG.LEAVE_TYPES.map(function(t){return'<option>'+t+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>From Date *</label><input type="date" id="al-from" min="'+_today()+'"></div>'+
    '<div class="fgrp"><label>To Date *</label><input type="date" id="al-to" min="'+_today()+'"></div></div>'+
    '<div class="fgrp"><label>Reason *</label><textarea id="al-reason" placeholder="Reason for leave..."></textarea></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitApplyLeave()"><i class="fas fa-paper-plane"></i> Apply Leave</button></div>';
  _modal('Apply for Leave',body);
}
function submitApplyLeave(){
  var type=document.getElementById('al-type').value;
  var from=document.getElementById('al-from').value;
  var to=document.getElementById('al-to').value;
  var reason=document.getElementById('al-reason').value.trim();
  if(!type||!from||!to||!reason){_toast('Sab fields zaroori hain','warn');return;}
  if(to<from){_toast('To date, from date se pehle nahi ho sakti','warn');return;}
  closeModal();_showLoader('Applying...');
  _gas('requestLeave',[{leaveType:type,fromDate:from,toDate:to,reason:reason}],function(r){
    _hideLoader();if(r&&r.success){_toast('Leave applied! Manager ko notify kiya ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function cancelLeaveReq(reqID){
  if(!confirm('Cancel karna hai?'))return;
  _gas('cancelLeave',[reqID],function(r){if(r&&r.success){_toast('Cancelled','success');_loadAllData(true);}});
}

// ── MY INSPECTION ─────────────────────────────────────────────────────────────
function _vMyInspection(){
  var ins=_D.myInspections||[];
  var html=_ph('Vehicle Inspection','');
  var today=_today();
  var todayIns=ins.filter(function(i){return String(i.Date||'').slice(0,10)===today;});

  if(todayIns.length){
    html+='<div class="alert-card success" style="margin-bottom:14px"><b>✅ Inspection done today</b><br>'+_fmtDateTime(todayIns[0].CreatedOn)+'</div>';
  } else {
    html+='<div class="alert-card info" style="margin-bottom:14px"><b>⚠️ Today\'s inspection pending</b><br>Trip se pehle inspection complete karo.</div>';
  }

  html+='<div class="form-card">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:14px"><i class="fas fa-magnifying-glass" style="color:var(--P)"></i> Pre-Trip Inspection</div>';

  html+='<div class="check-rows">';
  APP_CONFIG.INSPECTION_CHECKS.forEach(function(c){
    html+='<div class="check-row">'+
      '<div class="cr-label">'+_esc(c.label)+'</div>'+
      '<div class="cr-toggle" id="tg-'+c.key+'-grp">'+
      '<button class="tg-yes" id="tg-'+c.key+'-yes" onclick="setToggle(\''+c.key+'\',\'Yes\',this)">Yes</button>'+
      '<button class="tg-no active" id="tg-'+c.key+'-no" onclick="setToggle(\''+c.key+'\',\'No\',this)">No</button>'+
      '</div></div>';
  });
  html+='</div>'+
    '<div class="fgrp" style="margin-top:14px"><label>Remarks</label><input id="ins-rem" placeholder="Any issues or notes..."></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px" onclick="submitInspection()"><i class="fas fa-check"></i> Submit Inspection</button></div>';

  if(ins.length){
    html+='<div class="sec-hdr" style="margin-top:20px">Recent Inspections</div>';
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Status</th><th>Issues</th></tr></thead><tbody>';
    ins.slice().reverse().slice(0,10).forEach(function(i){
      var issues=['FuelCheck','TyreCheck','MirrorCheck','FastagCheck','RCCheck','InsuranceCheck','PUCCheck'].filter(function(k){return i[k]==='No';});
      html+='<tr><td>'+_fmtDate(i.Date)+'</td>'+
        '<td><span class="badge '+(issues.length?'badge-warning':'badge-completed')+'">'+_esc(i.Status)+'</span></td>'+
        '<td style="font-size:11.5px;color:var(--tx3)">'+_esc(issues.length?issues.join(', '):'All OK')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function submitInspection(){
  var myVeh=(_D.myVehicle||[])[0];
  if(!myVeh){_toast('No vehicle assigned','err');return;}
  var data={vehicleID:myVeh.VehicleID,date:_today(),remarks:document.getElementById('ins-rem').value.trim()};
  APP_CONFIG.INSPECTION_CHECKS.forEach(function(c){data[c.key]=window['_toggle_'+c.key]||'No';});
  _showLoader('Submitting inspection...');
  _gas('addInspection',[data],function(r){
    _hideLoader();
    if(r&&r.success){
      var failMsg=r.failed&&r.failed.length?(' Issues: '+r.failed.join(', ')):'All clear!';
      _toast('Inspection submitted! '+failMsg,'success');_loadAllData(true);
    } else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── MY CLEANING ───────────────────────────────────────────────────────────────
function _vMyCleaning(){
  var cls=_D.myCleaning||[];
  var today=_today();
  var todayCls=cls.filter(function(c){return String(c.Date||'').slice(0,10)===today;});
  var html=_ph('Vehicle Cleaning','');
  if(todayCls.length){html+='<div class="alert-card success" style="margin-bottom:14px"><b>✅ Cleaning done today</b></div>';}
  html+='<div class="form-card">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:14px"><i class="fas fa-broom" style="color:var(--T)"></i> Cleaning Checklist</div>';
  html+='<div class="check-rows">';
  APP_CONFIG.CLEANING_CHECKS.forEach(function(c){
    html+='<div class="check-row">'+
      '<div class="cr-label">'+_esc(c.label)+'</div>'+
      '<div class="cr-toggle">'+
      '<button class="tg-yes" onclick="setToggle(\''+c.key+'\',\'Yes\',this)">Yes</button>'+
      '<button class="tg-no active" onclick="setToggle(\''+c.key+'\',\'No\',this)">No</button>'+
      '</div></div>';
  });
  html+='</div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:14px;background:var(--T)" onclick="submitCleaning()"><i class="fas fa-broom"></i> Submit Cleaning</button></div>';
  return html;
}
function submitCleaning(){
  var myVeh=(_D.myVehicle||[])[0];
  if(!myVeh){_toast('No vehicle assigned','err');return;}
  var data={vehicleID:myVeh.VehicleID,date:_today()};
  APP_CONFIG.CLEANING_CHECKS.forEach(function(c){data[c.key]=window['_toggle_'+c.key]||'No';});
  _showLoader('Submitting...');
  _gas('addCleaning',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('Cleaning submitted! '+r.pct+'% complete ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── MY FUEL ───────────────────────────────────────────────────────────────────
function _vMyFuel(){
  var fuel=_D.myFuel||[];
  var myVeh=(_D.myVehicle||[])[0];
  var html=_ph('Fuel Entry','');
  html+='<div class="form-card" style="margin-bottom:16px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:14px"><i class="fas fa-gas-pump" style="color:var(--O)"></i> Add Fuel Entry</div>'+
    (myVeh?'<div style="font-size:12px;color:var(--tx3);margin-bottom:12px;padding:8px 12px;background:var(--sur2);border-radius:8px">Vehicle: <b>'+_esc(myVeh.VehicleNo)+'</b> &nbsp;·&nbsp; Last KM: <b>'+Number(myVeh.CurrentKM||0).toLocaleString('en-IN')+'</b></div>':'')+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date</label><input type="date" id="mf-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Current KM</label><input type="number" id="mf-km" placeholder="Odometer reading" oninput="_fuelCalcMy()"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Fuel Qty (L) *</label><input type="number" id="mf-qty" placeholder="e.g. 30" step="0.1" oninput="_fuelCalcMy()"></div>'+
    '<div class="fgrp"><label>Amount (₹) *</label><input type="number" id="mf-amt" placeholder="e.g. 3000" oninput="_fuelCalcMy()"></div></div>'+
    '<div id="mf-calc" class="calc-preview" style="display:none"></div>'+
    '<div class="fgrp"><label>Pump Name</label><input id="mf-pump" placeholder="e.g. HPCL Rohini"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px;background:var(--O)" onclick="submitMyFuel()"><i class="fas fa-gas-pump"></i> Submit</button></div>';

  if(fuel.length){
    html+='<div class="sec-hdr">My Fuel History</div>';
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Qty</th><th>Amt</th><th>Mileage</th></tr></thead><tbody>';
    fuel.slice().reverse().slice(0,20).forEach(function(f){
      var m=parseFloat(f.Mileage||0);var col=m>0&&m<6?'color:var(--R);font-weight:800':m>=12?'color:var(--G)':'';
      html+='<tr><td>'+_fmtDate(f.Date)+'</td><td>'+_esc(f.FuelQty)+'L</td><td>'+_inr(f.Amount)+'</td><td style="'+col+'">'+(m>0?m+'kmpl':'—')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function _fuelCalcMy(){
  var qty=parseFloat(document.getElementById('mf-qty').value||0);
  var amt=parseFloat(document.getElementById('mf-amt').value||0);
  var km=parseFloat(document.getElementById('mf-km').value||0);
  var myVeh=(_D.myVehicle||[])[0];var prev=myVeh?Number(myVeh.CurrentKM||0):0;
  var el=document.getElementById('mf-calc');if(!el)return;
  if(qty<=0&&amt<=0){el.style.display='none';return;}
  var rate=qty>0&&amt>0?(amt/qty).toFixed(2):0;
  var dist=km>prev&&prev>0?km-prev:0;var mil=qty>0&&dist>0?(dist/qty).toFixed(1):0;
  var mCol=mil>0&&mil<6?'color:var(--R);font-weight:800':mil>=12?'color:var(--G);font-weight:700':'';
  el.style.display='flex';
  el.innerHTML='⛽ Rate: <b>₹'+rate+'/L</b>'+(dist>0?' | Dist: <b>'+dist+'km</b>':'')+(mil>0?' | Mileage: <b style="'+mCol+'">'+mil+'km/L</b>':'');
}
function submitMyFuel(){
  var myVeh=(_D.myVehicle||[])[0];
  if(!myVeh){_toast('No vehicle assigned','err');return;}
  var qty=document.getElementById('mf-qty').value;var amt=document.getElementById('mf-amt').value;
  if(!qty||!amt){_toast('Qty aur amount zaroori hain','warn');return;}
  var data={vehicleID:myVeh.VehicleID,date:document.getElementById('mf-date').value,
    kmReading:document.getElementById('mf-km').value||0,previousKM:Number(myVeh.CurrentKM||0),
    fuelQty:qty,amount:amt,pumpName:document.getElementById('mf-pump').value.trim()};
  _showLoader('Submitting...');
  _gas('addFuel',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('Fuel entry done! '+r.mileage+' km/L ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── MY TRIPS / EXPENSES / KM LOGS ─────────────────────────────────────────────
function _vMyTrips(){
  var trips=_D.myTrips||[];
  var myVeh=(_D.myVehicle||[])[0];
  var html=_ph('My Trips','');
  html+='<div class="form-card" style="margin-bottom:16px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:12px"><i class="fas fa-route" style="color:var(--P)"></i> Log New Trip</div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>From *</label><input id="mt-from" placeholder="e.g. ISE Depot Rohini"></div>'+
    '<div class="fgrp"><label>To *</label><input id="mt-to" placeholder="e.g. Bhiwadi Plant"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Start KM</label><input type="number" id="mt-skm" placeholder="0"></div>'+
    '<div class="fgrp"><label>End KM</label><input type="number" id="mt-ekm" placeholder="0"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Material</label><select id="mt-mat"><option value="">—</option>'+APP_CONFIG.MATERIAL_TYPES.map(function(m){return'<option>'+m+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Weight (MT)</label><input type="number" id="mt-wt" step="0.1" placeholder="0.0"></div></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px;background:var(--P)" onclick="submitMyTrip()"><i class="fas fa-route"></i> Log Trip</button></div>';
  if(trips.length){
    html+='<div class="sec-hdr">My Trips</div>';
    html+='<div style="display:flex;flex-direction:column;gap:8px">';
    trips.slice().reverse().slice(0,15).forEach(function(t){
      html+='<div class="list-card" style="cursor:default">'+
        '<div class="lc-row"><b>'+_esc(t.FromLocation||'')+'</b><i class="fas fa-arrow-right" style="color:var(--tx3)"></i><b>'+_esc(t.ToLocation||'')+'</b></div>'+
        '<div class="lc-meta"><i class="fas fa-calendar"></i>'+_fmtDate(t.Date)+' &nbsp;·&nbsp; '+_esc(t.MaterialType||'—')+' &nbsp;·&nbsp; <b>'+Number(t.TotalKM||0)+' km</b></div></div>';
    });
    html+='</div>';
  }
  return html;
}
function submitMyTrip(){
  var myVeh=(_D.myVehicle||[])[0];
  var from=document.getElementById('mt-from').value.trim();
  var to=document.getElementById('mt-to').value.trim();
  if(!from||!to){_toast('From aur To zaroori hain','warn');return;}
  var data={vehicleID:myVeh?myVeh.VehicleID:'',date:_today(),fromLocation:from,toLocation:to,
    startKM:document.getElementById('mt-skm').value||0,endKM:document.getElementById('mt-ekm').value||0,
    materialType:document.getElementById('mt-mat').value,weight:document.getElementById('mt-wt').value||0};
  _showLoader('Logging...');
  _gas('addTrip',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('Trip logged! '+r.totalKM+' km ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _vMyExpenses(){
  var exp=_D.myExpenses||[];
  var myVeh=(_D.myVehicle||[])[0];
  var html=_ph('My Expenses','');
  html+='<div class="form-card" style="margin-bottom:16px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:12px"><i class="fas fa-receipt" style="color:var(--R)"></i> Add Expense</div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Type *</label><select id="me-type"><option value="">Select</option>'+APP_CONFIG.EXPENSE_TYPES.map(function(t){return'<option>'+t+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Amount (₹) *</label><input type="number" id="me-amt" placeholder="0"></div></div>'+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Payment Mode</label><select id="me-mode">'+APP_CONFIG.PAYMENT_MODES.map(function(m){return'<option>'+m+'</option>';}).join('')+'</select></div>'+
    '<div class="fgrp"><label>Date</label><input type="date" id="me-date" value="'+_today()+'"></div></div>'+
    '<div class="fgrp"><label>Remarks</label><input id="me-rem" placeholder="Optional"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px;background:var(--R)" onclick="submitMyExpense()"><i class="fas fa-plus"></i> Add Expense</button></div>';
  if(exp.length){
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Mode</th></tr></thead><tbody>';
    exp.slice().reverse().slice(0,20).forEach(function(e){
      html+='<tr><td>'+_fmtDate(e.Date)+'</td><td>'+_esc(e.ExpenseType)+'</td><td><b>'+_inr(e.Amount)+'</b></td><td>'+_esc(e.PaymentMode||'—')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function submitMyExpense(){
  var myVeh=(_D.myVehicle||[])[0];
  var type=document.getElementById('me-type').value;
  var amt=document.getElementById('me-amt').value;
  if(!type||!amt){_toast('Type aur amount zaroori hain','warn');return;}
  var data={vehicleID:myVeh?myVeh.VehicleID:'',date:document.getElementById('me-date').value,
    expenseType:type,amount:amt,paymentMode:document.getElementById('me-mode').value,
    remarks:document.getElementById('me-rem').value.trim()};
  _showLoader('Adding...');
  _gas('addExpense',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('Expense added ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}
function _vMyKMLogs(){
  var logs=_D.myKMLogs||[];
  var myVeh=(_D.myVehicle||[])[0];
  var html=_ph('KM Log','');
  html+='<div class="form-card" style="margin-bottom:16px">'+
    '<div style="font-size:14px;font-weight:800;margin-bottom:12px"><i class="fas fa-gauge-high" style="color:var(--V)"></i> Add KM Reading</div>'+
    (myVeh?'<div style="font-size:12px;color:var(--tx3);padding:8px 12px;background:var(--sur2);border-radius:8px;margin-bottom:12px">Last: <b>'+Number(myVeh.CurrentKM||0).toLocaleString('en-IN')+' km</b></div>':'')+
    '<div class="fgrp-row">'+
    '<div class="fgrp"><label>Date</label><input type="date" id="mkl-date" value="'+_today()+'"></div>'+
    '<div class="fgrp"><label>Odometer *</label><input type="number" id="mkl-od" placeholder="Current reading"></div></div>'+
    '<div class="fgrp"><label>Remarks</label><input id="mkl-rem" placeholder="e.g. Morning reading"></div>'+
    '<button class="btn btn-wide btn-lg" style="margin-top:12px;background:var(--V)" onclick="submitMyKMLog()"><i class="fas fa-plus"></i> Add Reading</button></div>';
  if(logs.length){
    html+='<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Odometer</th><th>Remarks</th></tr></thead><tbody>';
    logs.slice().reverse().forEach(function(l){
      html+='<tr><td>'+_fmtDate(l.Date)+'</td><td><b>'+Number(l.OdometerReading||0).toLocaleString('en-IN')+' km</b></td><td>'+_esc(l.Remarks||'—')+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  return html;
}
function submitMyKMLog(){
  var myVeh=(_D.myVehicle||[])[0];
  var od=document.getElementById('mkl-od').value;
  if(!od){_toast('Odometer reading daalo','warn');return;}
  var data={vehicleID:myVeh?myVeh.VehicleID:'',date:document.getElementById('mkl-date').value,odometer:od,remarks:document.getElementById('mkl-rem').value.trim()};
  _showLoader('Adding...');
  _gas('addKMLog',[data],function(r){
    _hideLoader();if(r&&r.success){_toast('KM log added ✅','success');_loadAllData(true);}
    else _toast('Error: '+(r&&r.error),'err');
  },function(e){_hideLoader();_toast(e.message,'err');});
}

// ── PROFILE ────────────────────────────────────────────────────────────────────
function _vProfile(){
  if(!_U)return'';
  var col=_avatarColor(_U.name||'');
  var lb=_D.leaveBalance||{};
  var html='<div class="settings-profile">'+
    '<div class="sp-avatar" style="background:rgba(255,255,255,.2)">'+_initials(_U.name||'')+'</div>'+
    '<div><div class="sp-name">'+_esc(_U.name)+'</div>'+
    '<div class="sp-email">'+_esc(_U.email)+'</div>'+
    '<div style="margin-top:6px;font-size:12px;opacity:.8">'+_esc(_U.mobile||'')+'</div></div></div>';

  var myDrv=(_D.myDriver||[])[0]||{};
  html+='<div class="detail-grid">'+
    _dr('Driver ID',myDrv.DriverID||'—')+_dr('Blood Group',myDrv.BloodGroup||'—')+
    _dr('Joining Date',_fmtDate(myDrv.JoiningDate))+_dr('License',myDrv.LicenseNo||'—')+
    _dr('License Expiry',_fmtDate(myDrv.LicenseExpiry))+_dr('Week Off',myDrv.WeekOffDay||'Sunday')+
    '</div>';

  html+='<div class="sec-hdr">Leave Balance</div>'+
    '<div class="leave-balance">'+
    '<div class="lb-item"><div class="lb-num lb-cl">'+lb.casual_leave+'</div><div class="lb-lbl">Casual</div></div>'+
    '<div class="lb-item"><div class="lb-num lb-sl">'+lb.sick_leave+'</div><div class="lb-lbl">Sick</div></div>'+
    '<div class="lb-item"><div class="lb-num lb-pl">'+lb.paid_leave+'</div><div class="lb-lbl">Paid</div></div></div>';

  html+='<div class="settings-list">'+
    '<div class="setting-row" onclick="_changePassword()"><div class="sr-icon"><i class="fas fa-lock"></i></div><div class="sr-label">Change Password</div><i class="fas fa-chevron-right sr-arrow"></i></div>'+
    '<div class="setting-row" onclick="toggleDark()"><div class="sr-icon"><i class="fas fa-moon"></i></div><div class="sr-label">Dark Mode</div></div></div>';

  html+='<button class="btn btn-wide btn-danger" style="margin-top:20px" onclick="doLogout()"><i class="fas fa-right-from-bracket"></i> Logout</button>';
  return html;
}

// ── MN ref for date helpers ──
var MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── INSPECTION (Admin) ────────────────────────────────────────────────────────
function _vInspection(){
  var ins=_D.inspections||[];
  var html=_ph('Vehicle Inspection','');
  html+='<div class="search-bar"><i class="fas fa-search"></i><input id="ins-search" placeholder="Search by vehicle, driver..." oninput="_filterIns()"></div>';
  if(!ins.length)return html+_emptyState('🔍','No inspections','Driver inspections will appear here');
  html+='<div id="ins-list">'+_renderInsList(ins)+'</div>';
  return html;
}
function _filterIns(){
  var q=(document.getElementById('ins-search').value||'').toLowerCase();
  var ins=(_D.inspections||[]).filter(function(i){return !q||(i.VehicleNo||'').toLowerCase().includes(q)||(i.DriverName||'').toLowerCase().includes(q);});
  var el=document.getElementById('ins-list');if(el)el.innerHTML=_renderInsList(ins);
}
function _renderInsList(ins){
  if(!ins.length)return _emptyState('🔍','No results','Try different search');
  return ins.slice().reverse().slice(0,50).map(function(i){
    var ok=Number(i.FailCount||0)===0;
    return '<div class="list-card"><div class="lc-row">'+
      '<div style="font-weight:700;color:var(--tx)"><span class="plate-tag">'+_esc(i.VehicleNo||_vehicleNo(i.VehicleID))+'</span></div>'+
      '<span class="badge '+(ok?'badge-green':'badge-red')+'">'+(ok?'✅ Clear':'⚠️ '+i.FailCount+' Issues')+'</span></div>'+
      '<div class="lc-meta"><i class="fas fa-id-badge"></i>'+_esc(i.DriverName||_driverName(i.DriverID))+'&nbsp;·&nbsp;<i class="fas fa-calendar"></i>'+_fmtDate(i.Date)+'</div></div>';
  }).join('');
}

// ── CLEANING (Admin) ──────────────────────────────────────────────────────────
function _vCleaning(){
  var cln=_D.cleaning||[];
  var html=_ph('Vehicle Cleaning','');
  html+='<div class="search-bar"><i class="fas fa-search"></i><input id="cln-search" placeholder="Search by vehicle, driver..." oninput="_filterCln()"></div>';
  if(!cln.length)return html+_emptyState('🧹','No cleaning records','Driver cleaning records will appear here');
  html+='<div id="cln-list">'+_renderClnList(cln)+'</div>';
  return html;
}
function _filterCln(){
  var q=(document.getElementById('cln-search').value||'').toLowerCase();
  var cln=(_D.cleaning||[]).filter(function(c){return !q||(c.VehicleNo||'').toLowerCase().includes(q)||(c.DriverName||'').toLowerCase().includes(q);});
  var el=document.getElementById('cln-list');if(el)el.innerHTML=_renderClnList(cln);
}
function _renderClnList(cln){
  if(!cln.length)return _emptyState('🔍','No results','Try different search');
  return cln.slice().reverse().slice(0,50).map(function(c){
    var ok=Number(c.FailCount||0)===0;
    return '<div class="list-card"><div class="lc-row">'+
      '<div style="font-weight:700;color:var(--tx)"><span class="plate-tag">'+_esc(c.VehicleNo||_vehicleNo(c.VehicleID))+'</span></div>'+
      '<span class="badge '+(ok?'badge-green':'badge-red')+'">'+(ok?'✅ Clean':'⚠️ '+c.FailCount+' Issues')+'</span></div>'+
      '<div class="lc-meta"><i class="fas fa-id-badge"></i>'+_esc(c.DriverName||_driverName(c.DriverID))+'&nbsp;·&nbsp;<i class="fas fa-calendar"></i>'+_fmtDate(c.Date)+'</div></div>';
  }).join('');
}
