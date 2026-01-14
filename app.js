// SportRide SPA
// 100% local (no backend): state persisted in localStorage

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// PWA: register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Basic state
const state = {
  session: null, // { token, user: { id, email, first_name, last_name, ... } }
  me: null,
  events: [],
};

// Local store
const LS_KEY = 'sportride_store_v1';
const Store = {
  data: null,
  load(){
    try { this.data = JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { this.data=null; }
    if (!this.data) this.seed();
  },
  save(){ localStorage.setItem(LS_KEY, JSON.stringify(this.data)); },
  seed(){
    const now = new Date();
    const day = 24*3600*1000;
    this.data = {
      users: [
        { id:1, email:'alice@example.com', first_name:'Alice', last_name:'Martin', phone:'+33600000001', city:'Lyon' },
        { id:2, email:'bruno@example.com', first_name:'Bruno', last_name:'Lefevre', phone:'+33600000002', city:'Grenoble' },
        { id:3, email:'camille@example.com', first_name:'Camille', last_name:'Durand', phone:'+33600000003', city:'Annecy' },
        { id:4, email:'david@example.com', first_name:'David', last_name:'Lopez', phone:'+33600000004', city:'Chambéry' },
        { id:5, email:'emma@example.com', first_name:'Emma', last_name:'Petit', phone:'+33600000005', city:'Lyon' },
        { id:6, email:'fanny@example.com', first_name:'Fanny', last_name:'Morel', phone:'+33600000006', city:'Valence' },
        { id:7, email:'gabriel@example.com', first_name:'Gabriel', last_name:'Garcia', phone:'+33600000007', city:'Clermont-Ferrand' },
        { id:8, email:'hugo@example.com', first_name:'Hugo', last_name:'Rossi', phone:'+33600000008', city:'Saint-Étienne' },
      ],
      sessions: [],
      currentToken: null,
      events: [
        { id:1, name:'Trail des Cimes', sport:'trail', date:new Date(now.getTime()+20*day).toISOString(), city:'Annecy', location:"Lac d'Annecy", dest_lat:45.8992, dest_lng:6.1296 },
        { id:2, name:'Triathlon du Lac', sport:'triathlon', date:new Date(now.getTime()+35*day).toISOString(), city:'Aix-les-Bains', location:'Esplanade du lac', dest_lat:45.6896, dest_lng:5.9087 },
      ],
      rides: [
        { id:1, user_id:1, event_id:1, ride_type:'go', depart_at:new Date(now.getTime()+10*day+ (7*60+30)*60000).toISOString(), origin_text:'Lyon Part-Dieu', origin_lat:45.76, origin_lng:4.861, seats_total:4, max_detour_km:10, price_suggested:10, note:'Je passe par Bourgoin', rules:{music:true,luggage:true}, status:'active', created_at:new Date().toISOString() },
        { id:2, user_id:2, event_id:1, ride_type:'return', depart_at:new Date(now.getTime()+10*day+ (17*60)*60000).toISOString(), origin_text:'Annecy centre', origin_lat:45.9, origin_lng:6.1167, seats_total:3, max_detour_km:5, price_suggested:0, note:'Retour après la course', rules:{pets:false}, status:'active', created_at:new Date().toISOString() },
        { id:3, user_id:3, event_id:1, ride_type:'go', depart_at:new Date(now.getTime()+10*day+ (6*60+45)*60000).toISOString(), origin_text:'Chambéry Gare', origin_lat:45.57, origin_lng:5.92, seats_total:3, max_detour_km:15, price_suggested:5, note:null, rules:{smoking:false}, status:'active', created_at:new Date().toISOString() },
        { id:4, user_id:4, event_id:2, ride_type:'go', depart_at:new Date(now.getTime()+25*day+ (8*60)*60000).toISOString(), origin_text:'Grenoble Victor Hugo', origin_lat:45.186, origin_lng:5.7266, seats_total:4, max_detour_km:20, price_suggested:8, note:"Départ à l'heure", rules:{music:true}, status:'active', created_at:new Date().toISOString() },
        { id:5, user_id:5, event_id:2, ride_type:'return', depart_at:new Date(now.getTime()+25*day+ (18*60)*60000).toISOString(), origin_text:'Aix-les-Bains', origin_lat:45.69, origin_lng:5.91, seats_total:2, max_detour_km:10, price_suggested:0, note:null, rules:{luggage:true}, status:'active', created_at:new Date().toISOString() },
      ],
      bookings: [],
      messages: [],
      notifications: [],
      nextIds: { user:9, ride:6, booking:1, message:1, notif:1 }
    };
    this.save();
  },
  userByEmail(email){ return this.data.users.find(u=>u.email.toLowerCase()===email.toLowerCase()); },
  currentUser(){ const t=this.data.currentToken; if (!t) return null; const s=this.data.sessions.find(s=>s.token===t); if(!s) return null; return this.data.users.find(u=>u.id===s.user_id)||null; },
  signIn(email, password){ // password ignored in MVP seed
    const u = this.userByEmail(email);
    if (!u) return null;
    const token = Math.random().toString(36).slice(2)+Date.now();
    this.data.sessions.push({ token, user_id: u.id, created_at: new Date().toISOString()});
    this.data.currentToken = token; this.save(); return { token, user: u };
  },
  updateProfile(patch){ const me = this.currentUser(); if (!me) return null; Object.assign(me, patch); this.save(); return me; },
  listEvents(){ return [...this.data.events].sort((a,b)=>new Date(a.date)-new Date(b.date)); },
  listRides({event_id}={}){
    let rr = this.data.rides.filter(r=> new Date(r.depart_at) >= new Date());
    if (event_id) rr = rr.filter(r=>String(r.event_id)===String(event_id));
    return rr.sort((a,b)=> new Date(a.depart_at)-new Date(b.depart_at)).map(r=>this.enrichRide(r));
  },
  getRide(id){ const r=this.data.rides.find(x=>x.id==id); return r? this.enrichRide(r): null; },
  enrichRide(r){
    const e = this.data.events.find(ev=>ev.id===r.event_id);
    const driver = this.data.users.find(u=>u.id===r.user_id);
    const seats_booked = this.data.bookings.filter(b=>b.ride_id===r.id && (b.status==='pending'||b.status==='accepted')).reduce((s,b)=>s+b.seats,0);
    return { ...r, event_name: e?.name, event_city: e?.city, driver_name: `${driver?.first_name||''} ${driver?.last_name||''}`.trim(), seats_booked };
  },
  createRide(payload){ const me=this.currentUser(); if(!me) throw new Error('auth'); const id=this.data.nextIds.ride++; const r={ id, user_id: me.id, status:'active', created_at:new Date().toISOString(), ...payload }; this.data.rides.push(r); this.save(); return this.enrichRide(r); },
  createBooking({ride_id, seats, message}){
    const me=this.currentUser(); if(!me) throw new Error('auth');
    const exists = this.data.bookings.find(b=>b.ride_id==ride_id && b.passenger_id==me.id && b.status!=='cancelled');
    if (exists) throw new Error('Vous avez déjà une réservation pour ce trajet');
    const id=this.data.nextIds.booking++; const b={ id, ride_id, passenger_id: me.id, seats, message, status:'pending', created_at:new Date().toISOString() };
    this.data.bookings.push(b);
    const ride = this.data.rides.find(r=>r.id==ride_id);
    if (ride && ride.user_id !== me.id) {
      this.data.notifications.push({ id:this.data.nextIds.notif++, user_id: ride.user_id, title:'Nouvelle demande', body:'Un passager souhaite rejoindre votre trajet', created_at:new Date().toISOString(), read:0 });
    }
    this.save(); return b;
  },
  listMessages(booking_id){ return this.data.messages.filter(m=>m.booking_id==booking_id).sort((a,b)=> new Date(a.created_at)-new Date(b.created_at)); },
  sendMessage({booking_id, text}){
    const me=this.currentUser(); if(!me) throw new Error('auth');
    const id=this.data.nextIds.message++; const m={ id, booking_id, sender_id: me.id, text, created_at:new Date().toISOString()}; this.data.messages.push(m);
    // notify other
    const bk = this.data.bookings.find(b=>b.id==booking_id);
    if (bk){ const ride=this.data.rides.find(r=>r.id==bk.ride_id); const other = (bk.passenger_id===me.id)? ride?.user_id : bk.passenger_id; if (other) this.data.notifications.push({ id:this.data.nextIds.notif++, user_id:other, title:'Nouveau message', body: text.slice(0,120), created_at:new Date().toISOString(), read:0 }); }
    this.save(); return m;
  },
  myNotifications(){ const me=this.currentUser(); if(!me) return []; return this.data.notifications.filter(n=>n.user_id===me.id).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)); },
  ensureGuest(){
    // If a session exists, return it
    const u = this.currentUser();
    if (u) return { token: this.data.currentToken, user: u };
    // find or create a local guest user
    let guest = this.data.users.find(x=>x.email==='guest@local');
    if (!guest) {
      guest = { id: this.data.nextIds.user++, email:'guest@local', first_name:'Invité', last_name:'', phone:'', city:'' };
      this.data.users.push(guest);
    }
    const token = Math.random().toString(36).slice(2)+Date.now();
    this.data.sessions.push({ token, user_id: guest.id, created_at: new Date().toISOString()});
    this.data.currentToken = token; this.save();
    return { token, user: guest };
  }
};
Store.load();

// Helpers
function fmtDate(dt) { return new Date(dt).toLocaleString(); }
function hdist(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*(Math.sin(dLon/2)**2);
  return 2*R*Math.asin(Math.sqrt(x));
}
function el(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function ensureAuth() {
  if (!state.session) {
    const res = Store.ensureGuest();
    state.session = { token: res.token, user: res.user };
    state.me = res.user;
    localStorage.setItem('sr_session', JSON.stringify(state.session));
  }
}

// Layout mounting
function mountLayout() {
  const app = $("#app");
  app.innerHTML = "";
  const layout = $("#tpl-layout").content.cloneNode(true);
  app.appendChild(layout);
  $$("[data-link]").forEach(b => b.addEventListener("click", (e)=>{
    e.preventDefault(); location.hash = b.getAttribute("data-link");
  }));
}

// Pages
const pages = {
  home: async () => {
    const frag = $("#tpl-home").content.cloneNode(true);
    return frag;
  },
  events: async () => {
    const frag = $("#tpl-events").content.cloneNode(true);
    const list = $("#event-list", frag);
    const empty = $("#event-empty", frag);
    const input = $("#event-q", frag);
    state.events = Store.listEvents();

    function render(q=""){
      list.innerHTML = "";
      const it = state.events.filter(e => (e.name+" "+e.city).toLowerCase().includes(q.toLowerCase()));
      empty.classList.toggle('hidden', it.length>0);
      it.forEach(e => {
        const item = el(`<li class="card">
          <div><strong>${e.name}</strong> – ${e.city}</div>
          <div>${new Date(e.date).toLocaleDateString()} • ${e.sport}</div>
          <div class="cta-row"><a class="btn primary block" href="#/event/${e.id}">Voir</a></div>
        </li>`);
        list.appendChild(item);
      });
    }
    input.addEventListener('input', ()=>render(input.value));
    render("");
    return frag;
  },
  event: async (params) => {
    const id = params[0];
    const frag = $("#tpl-event").content.cloneNode(true);
    const header = $("#event-header", frag);
    const ev = Store.data.events.find(e=>String(e.id)===String(id));
    if (!ev) { header.innerHTML = '<div class="card">Évènement introuvable</div>'; return frag; }
    header.innerHTML = `<h2>${ev.name}</h2><div>${ev.city} • ${new Date(ev.date).toLocaleDateString()}</div>`;

    const btnC = $("#btn-create-from-event", frag);
    const btnF = $("#btn-find-from-event", frag);
    btnC.href = `#/create?event_id=${ev.id}`;
    btnF.href = `#/rides?event_id=${ev.id}`;

    // rides list
    const list = $("#ride-list", frag); const empty = $("#ride-empty", frag);
    const rides = Store.listRides({event_id:id});
    function render(r=rides){
      list.innerHTML = '';
      empty.classList.toggle('hidden', (r||[]).length>0);
      (r||[]).forEach(x => list.appendChild(rideCard(x)));
    }
    render(rides);
    return frag;
  },
  auth: async () => {
    const frag = $("#tpl-auth").content.cloneNode(true);
    const form = $("#auth-form", frag);
    const error = $("#auth-error", frag);
    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); error.textContent = '';
      const fd = new FormData(form); const email=fd.get('email'); const password=fd.get('password');
      try{
        const res = Store.signIn(email, password);
        if (!res) throw new Error('Identifiants invalides');
        state.session = { token: res.token, user: res.user };
        localStorage.setItem('sr_session', JSON.stringify(state.session));
        state.me = res.user; location.hash = '#/profile';
      }catch(ex){ error.textContent = ex.message; }
    });
    return frag;
  },
  profile: async () => {
    ensureAuth();
    const frag = $("#tpl-profile").content.cloneNode(true);
    const box = $("#profile-info", frag);
    const form = $("#profile-form", frag);
    const btnLogout = $("#btn-logout", frag);
    box.innerHTML = `<div><strong>${state.me?.first_name||''} ${state.me?.last_name||''}</strong></div><div>${state.me?.email||''}</div>`;
    form.first_name.value = state.me?.first_name||'';
    form.last_name.value = state.me?.last_name||'';
    form.phone.value = state.me?.phone||'';
    form.city.value = state.me?.city||'';
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(form); const payload = Object.fromEntries(fd.entries());
      const u = Store.updateProfile(payload);
      state.me = u; alert('Profil mis à jour');
    });
    btnLogout.addEventListener('click', async ()=>{ localStorage.removeItem('sr_session'); state.session=null; state.me=null; location.hash = '#/auth'; });
    return frag;
  },
  create: async () => {
    ensureAuth();
    const frag = $("#tpl-create").content.cloneNode(true);
    const form = $("#ride-form", frag);
    const errBox = $("#ride-error", frag);
    const selEvent = $("#ride-event", frag);
    const events = Store.listEvents();
    (events||[]).forEach(e => selEvent.appendChild(el(`<option value="${e.id}">${e.name} – ${e.city}</option>`)));

    // preselect from query
    const url = new URL(location.href); const q = Object.fromEntries(url.searchParams.entries());
    if (q.event_id) selEvent.value = q.event_id;

    // Prefill contact fields
    if (form.last_name) form.last_name.value = state.me?.last_name||'';
    if (form.first_name) form.first_name.value = state.me?.first_name||'';
    if (form.email) form.email.value = state.me?.email||'';
    if (form.phone) form.phone.value = state.me?.phone||'';

    $('#btn-geoloc', frag).addEventListener('click', ()=>{
      if (!navigator.geolocation) return alert('Géolocalisation non supportée');
      navigator.geolocation.getCurrentPosition((pos)=>{
        form.origin.value = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      }, ()=> alert('Impossible de récupérer votre position'));
    });

    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); errBox.textContent = '';
      const fd = new FormData(form); const p = Object.fromEntries(fd.entries());
      // update profile with provided contact info
      Store.updateProfile({
        first_name: p.first_name || state.me?.first_name || '',
        last_name: p.last_name || state.me?.last_name || '',
        email: p.email || state.me?.email || '',
        phone: p.phone || state.me?.phone || ''
      });
      state.me = Store.currentUser();
      const payload = {
        event_id: p.event_id,
        ride_type: p.ride_type,
        depart_at: new Date(p.depart_at).toISOString(),
        origin_text: p.origin,
        seats_total: Number(p.seats),
        max_detour_km: Number(p.max_detour_km||0),
        price_suggested: Number(p.price_suggested||0),
        note: p.note||null,
        rules: {
          luggage: !!p.luggage, music: !!p.music, smoking: !!p.smoking, pets: !!p.pets
        },
      };
      try{
        Store.createRide(payload);
        toast('Trajet publié'); location.hash = `#/event/${p.event_id}`;
      }catch(ex){ errBox.textContent = ex.message; }
    });
    return frag;
  },
  rides: async () => {
    const frag = $("#tpl-rides").content.cloneNode(true);
    const list = $("#rides-list", frag); const empty = $("#rides-empty", frag);
    const url = new URL(location.href); const q = Object.fromEntries(url.searchParams.entries());
    const filterType = $("#filter-type", frag); const sortSel = $("#filter-sort", frag);
    const rides = Store.listRides();

    function applyFilters() {
      let r = [...(rides||[])];
      const type = filterType.value;
      if (type !== 'any') r = r.filter(x => x.ride_type === type);
      if (q.event_id) r = r.filter(x => String(x.event_id) === String(q.event_id));
      const sort = sortSel.value;
      if (sort === 'earliest') r.sort((a,b)=> new Date(a.depart_at)-new Date(b.depart_at));
      if (sort === 'closest' && navigator.geolocation) {
        // Use geolocation to sort by distance
        navigator.geolocation.getCurrentPosition((pos)=>{
          r.sort((a,b)=>{
            const da = hdist({lat:pos.coords.latitude,lng:pos.coords.longitude},{lat:a.origin_lat||0,lng:a.origin_lng||0});
            const db = hdist({lat:pos.coords.latitude,lng:pos.coords.longitude},{lat:b.origin_lat||0,lng:b.origin_lng||0});
            return da-db;
          });
          render(r);
        });
        return;
      }
      render(r);
    }

    function render(r){
      list.innerHTML = '';
      empty.classList.toggle('hidden', (r||[]).length>0);
      (r||[]).forEach(x => list.appendChild(rideCard(x)));
    }

    [filterType, sortSel].forEach(elm=>elm.addEventListener('change', applyFilters));
    applyFilters();

    return frag;
  },
  ride: async (params) => {
    const id = params[0];
    const frag = $("#tpl-ride").content.cloneNode(true);
    const box = $("#ride-details", frag);
    const form = $("#book-form", frag);
    const err = $("#book-error", frag);
    const ride = Store.getRide(id);
    if (!ride) { box.innerHTML = 'Trajet introuvable'; return frag; }
    box.innerHTML = rideDetailsHTML(ride);

    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); ensureAuth(); err.textContent='';
      const fd = new FormData(form); const count = Number(fd.get('count')||1); const message = fd.get('message')||'';
      try{
        Store.createBooking({ ride_id: ride.id, seats: count, message });
        alert('Demande envoyée'); location.hash = '#/notifications';
      }catch(ex){ err.textContent = ex.message; }
    });
    return frag;
  },
  messages: async (params) => {
    ensureAuth();
    const resId = params[0];
    const frag = $("#tpl-messages").content.cloneNode(true);
    const thread = $("#thread", frag);
    const form = $("#chat-form", frag);

    async function load(){
      const msgs = Store.listMessages(resId);
      thread.innerHTML = '';
      (msgs||[]).forEach(m => {
        const mine = m.sender_id === state.me.id;
        thread.appendChild(el(`<div class="msg ${mine?'me':''}">${m.text}</div>`));
      })
    }
    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); const text = new FormData(form).get('text'); if (!text) return;
      Store.sendMessage({ booking_id: Number(resId), text });
      form.reset(); await load();
    });
    await load();
    return frag;
  },
  notifications: async () => {
    ensureAuth();
    const frag = $("#tpl-notifications").content.cloneNode(true);
    const list = $("#notif-list", frag); const empty=$("#notif-empty", frag);
    const data = Store.myNotifications();
    list.innerHTML = '';
    empty.classList.toggle('hidden', (data||[]).length>0);
    (data||[]).forEach(n => list.appendChild(el(`<li class="card">${n.title}<div class="muted">${fmtDate(n.created_at)}</div></li>`)));
    return frag;
  }
};

function rideCard(x){
  const left = x.seats_total - (x.seats_booked||0);
  return el(`<li class="card">
    <div><strong>${x.origin_text}</strong> → ${x.event_name} (${x.event_city})</div>
    <div>${new Date(x.depart_at).toLocaleString()} • ${x.ride_type.toUpperCase()} • ${left} places</div>
    <div>${x.price_suggested? (x.price_suggested+" € conseillés") : "Participation libre"}</div>
    <div class="cta-row"><a class="btn primary block" href="#/ride/${x.id}">Voir</a></div>
  </li>`);
}
function rideDetailsHTML(x){
  const left = x.seats_total - (x.seats_booked||0);
  return `<h2>${x.origin_text} → ${x.event_name} (${x.event_city})</h2>
  <div>${new Date(x.depart_at).toLocaleString()} • ${x.ride_type.toUpperCase()}</div>
  <div>Places restantes: ${left} / ${x.seats_total}</div>
  <div>Participation: ${x.price_suggested? x.price_suggested+" €" : "Libre"}</div>
  <div>Règles: ${Object.entries(x.rules||{}).filter(([k,v])=>v).map(([k])=>k).join(', ')||'—'}</div>
  <div>Conducteur: ${x.driver_name||'Anonyme'}</div>`
}

// Router
const routes = {
  "#/": pages.home,
  "#/events": pages.events,
  "#/event": pages.event,
  "#/auth": pages.auth,
  "#/profile": pages.profile,
  "#/create": pages.create,
  "#/rides": pages.rides,
  "#/ride": pages.ride,
  "#/messages": pages.messages,
  "#/notifications": pages.notifications,
};

async function router(){
  mountLayout();
  const hash = location.hash || "#/";
  // Expected formats: #/ , #/events , #/event/1 , #/ride/5 , etc.
  const parts = hash.split('/');
  const base = parts.slice(0,2).join('/'); // e.g. '#/event'
  const params = parts.slice(2);          // e.g. ['1']
  const handler = routes[base] || pages.home;
  const page = await handler(params);
  $("#page").innerHTML = "";
  $("#page").appendChild(page);
  // set active tab
  const tab = base.replace('#/','');
  $$(".tab").forEach(t => t.classList.toggle('active', t.dataset.tab===tab || (tab===''&&t.dataset.tab==='home')));
}

window.addEventListener('hashchange', router);

// Session handling (localStorage token)
async function initAuth(){
  const raw = localStorage.getItem('sr_session');
  if (raw) {
    try { state.session = JSON.parse(raw); state.me = state.session.user; } catch {}
  }
  if (!state.session) {
    const res = Store.ensureGuest();
    state.session = { token: res.token, user: res.user };
    state.me = res.user;
    localStorage.setItem('sr_session', JSON.stringify(state.session));
  }
}

initAuth().then(router);
