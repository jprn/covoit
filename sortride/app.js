// SportRide SPA
// Routing simple (hash) + REST API PHP/MySQL (Hostinger)

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

// REST client
const API_BASE = "/api";
async function api(path, { method = 'GET', body, auth = true } = {}){
  const headers = { 'Content-Type': 'application/json' };
  if (auth && state.session?.token) headers['Authorization'] = `Bearer ${state.session.token}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body? JSON.stringify(body): undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

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
function ensureAuth() { if (!state.session) { location.hash = "#/auth"; throw new Error("auth"); } }

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

    const data = await api('/events.php');
    state.events = data.events || [];

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
    const ev = (await api(`/events.php?id=${id}`)).event;
    if (!ev) { header.innerHTML = '<div class="card">Évènement introuvable</div>'; return frag; }
    header.innerHTML = `<h2>${ev.name}</h2><div>${ev.city} • ${new Date(ev.date).toLocaleDateString()}</div>`;

    const btnC = $("#btn-create-from-event", frag);
    const btnF = $("#btn-find-from-event", frag);
    btnC.href = `#/create?event_id=${ev.id}`;
    btnF.href = `#/rides?event_id=${ev.id}`;

    // rides list
    const list = $("#ride-list", frag); const empty = $("#ride-empty", frag);
    const rides = (await api(`/rides.php?event_id=${id}`)).rides;
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
        const data = await api('/auth.php', { method: 'POST', body: { action: 'login', email, password }, auth: false });
        state.session = { token: data.token, user: data.user };
        localStorage.setItem('sr_session', JSON.stringify(state.session));
        state.me = data.user; location.hash = '#/profile';
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
      const data = await api('/auth.php', { method:'POST', body:{ action:'update_profile', profile: payload }});
      state.me = data.user; alert('Profil mis à jour');
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
    const events = (await api('/events.php')).events;
    (events||[]).forEach(e => selEvent.appendChild(el(`<option value="${e.id}">${e.name} – ${e.city}</option>`)));

    // preselect from query
    const url = new URL(location.href); const q = Object.fromEntries(url.searchParams.entries());
    if (q.event_id) selEvent.value = q.event_id;

    $('#btn-geoloc', frag).addEventListener('click', ()=>{
      if (!navigator.geolocation) return alert('Géolocalisation non supportée');
      navigator.geolocation.getCurrentPosition((pos)=>{
        form.origin.value = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      }, ()=> alert('Impossible de récupérer votre position'));
    });

    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); errBox.textContent = '';
      const fd = new FormData(form); const p = Object.fromEntries(fd.entries());
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
        await api('/rides.php', { method:'POST', body: payload });
        alert('Trajet publié'); location.hash = `#/event/${p.event_id}`;
      }catch(ex){ errBox.textContent = ex.message; }
    });
    return frag;
  },
  rides: async () => {
    const frag = $("#tpl-rides").content.cloneNode(true);
    const list = $("#rides-list", frag); const empty = $("#rides-empty", frag);
    const url = new URL(location.href); const q = Object.fromEntries(url.searchParams.entries());
    const filterType = $("#filter-type", frag); const sortSel = $("#filter-sort", frag);

    const rides = (await api('/rides.php')).rides;

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
    const ride = (await api(`/ride.php?id=${id}`)).ride;
    if (!ride) { box.innerHTML = 'Trajet introuvable'; return frag; }
    box.innerHTML = rideDetailsHTML(ride);

    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); ensureAuth(); err.textContent='';
      const fd = new FormData(form); const count = Number(fd.get('count')||1); const message = fd.get('message')||'';
      try{
        await api('/bookings.php', { method:'POST', body:{ ride_id: ride.id, seats: count, message }});
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
      const msgs = (await api(`/messages.php?booking_id=${resId}`)).messages;
      thread.innerHTML = '';
      (msgs||[]).forEach(m => {
        const mine = m.sender_id === state.me.id;
        thread.appendChild(el(`<div class="msg ${mine?'me':''}">${m.text}</div>`));
      })
    }
    form.addEventListener('submit', async (e)=>{
      e.preventDefault(); const text = new FormData(form).get('text'); if (!text) return;
      await api('/messages.php', { method:'POST', body:{ booking_id: resId, text }});
      form.reset(); await load();
    });
    await load();
    return frag;
  },
  notifications: async () => {
    ensureAuth();
    const frag = $("#tpl-notifications").content.cloneNode(true);
    const list = $("#notif-list", frag); const empty=$("#notif-empty", frag);
    const data = (await api('/notifications.php')).notifications;
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
  const [base, ...params] = hash.split('/').reduce((acc,part)=>{
    if (part.startsWith('#')) acc.push(part+''); else acc.push(part);
    return acc;
  }, []).slice(0,3); // keep short
  const key = params.length? `${base}` : hash;
  const handler = routes[base] || routes[key] || pages.home;
  const page = await handler(params.slice(1));
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
}

initAuth().then(router);
