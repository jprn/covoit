// SportRide - Single Event - 100% Front (localStorage)

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const LS_OWNER_VERIF = 'sportride_owner_verif_v1';
const LS_DEVICE_ID = 'sportride_device_id_v1';
const QS = new URLSearchParams(location.search);

// Force hard reload: unregister SW, clear Cache Storage, then reload with cache-busting param
async function hardReload(){
  try{
    if ('serviceWorker' in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=> r.unregister().catch(()=>{})));
    }
  }catch{}
  try{
    if (window.caches && caches.keys){
      const names = await caches.keys();
      await Promise.all(names.map(n=> caches.delete(n).catch(()=>{})));
    }
  }catch{}
  // Keep hash, add/replace cb param to bust caches
  const url = new URL(location.href);
  url.searchParams.set('cb', String(Date.now()));
  // Remove any hard flag to avoid loop
  url.searchParams.delete('hard');
  location.replace(url.toString());
}

const Store = {
  event: window.DemoData?.event || null,
  eventSource: 'demo',
  deviceId: null,
  cache: {
    rides: [],
    ridesSource: 'demo',
    requestsByRide: new Map(),
    myRequests: [],
  },
  ensureDeviceId(){
    if (this.deviceId) return this.deviceId;
    let id = localStorage.getItem(LS_DEVICE_ID);
    if (!id){
      id = (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(LS_DEVICE_ID, id);
    }
    this.deviceId = id;
    return id;
  },
  singleEvent(){ return this.event || { id: 1, name: 'Évènement', city: '', date: new Date().toISOString() }; },
};

// Configurable API base: priority = query param ?api=... > localStorage > default '/api'
let API_BASE = (new URLSearchParams(location.search).get('api')
  || localStorage.getItem('SR_API_BASE')
  || '/api').replace(/\/$/, '');
if (new URLSearchParams(location.search).get('api')){
  localStorage.setItem('SR_API_BASE', API_BASE);
}
async function apiFetch(path, { method='GET', body=null } = {}){
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok){
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const API = {
  async health(){
    const data = await apiFetch(`/health.php`);
    return data;
  },
  async getEvent(id){
    const qs = id ? `?id=${encodeURIComponent(String(id))}` : '';
    const data = await apiFetch(`/event_get.php${qs}`);
    return data.event;
  },
  async listRides(eventId){
    const qs = eventId ? `?event_id=${encodeURIComponent(String(eventId))}` : '';
    const data = await apiFetch(`/rides_list.php${qs}`);
    return data.rides || [];
  },
  async createRide(payload){
    return apiFetch('/rides_create.php', { method:'POST', body: payload });
  },
  async listRequestsByRide(rideId){
    const data = await apiFetch(`/requests_list.php?ride_id=${encodeURIComponent(String(rideId))}`);
    return data.requests || [];
  },
  async listMyRequests(deviceId){
    const data = await apiFetch(`/requests_my.php?requester_device_id=${encodeURIComponent(String(deviceId))}`);
    return data.requests || [];
  },
  async createRequest(payload){
    return apiFetch('/requests_create.php', { method:'POST', body: payload });
  },
  async cancelRequest(payload){
    return apiFetch('/requests_cancel.php', { method:'POST', body: payload });
  },
  async acceptRequest(payload){
    return apiFetch('/requests_accept.php', { method:'POST', body: payload });
  },
  async refuseRequest(payload){
    return apiFetch('/requests_refuse.php', { method:'POST', body: payload });
  },
  async updateRide(payload){
    return apiFetch('/rides_update.php', { method:'POST', body: payload });
  },
  async deleteRide(payload){
    return apiFetch('/rides_delete.php', { method:'POST', body: payload });
  },
};

async function loadRides(){
  try{
    const rides = await API.listRides(Store.singleEvent()?.id || 1);
    Store.cache.rides = rides;
    Store.cache.ridesSource = 'api';
    return rides;
  }catch{
    const fallback = window.DemoData?.rides || [];
    Store.cache.rides = fallback;
    Store.cache.ridesSource = 'demo';
    return fallback;
  }
}

async function loadEvent(){
  try {
    const ev = await API.getEvent();
    if (ev && ev.id) { Store.event = ev; Store.eventSource = 'api'; }
  } catch {
    // keep DemoData fallback
    Store.eventSource = 'demo';
  }
}
function getRide(id){
  return Store.cache.rides.find(r=> String(r.id)===String(id));
}
async function loadRequestsByRide(rideId){
  const items = await API.listRequestsByRide(rideId);
  Store.cache.requestsByRide.set(String(rideId), items);
  return items;
}
function cachedRequestsByRide(rideId){
  return Store.cache.requestsByRide.get(String(rideId)) || [];
}
function seatsLeftFrom(ride, reqs){
  if (!ride) return 0;
  const booked = reqs.filter(r=> r.status==='ACCEPTED').reduce((s,r)=> s + (Number(r.seats)||0), 0);
  return Math.max(0, Number(ride.seats_total||0) - booked);
}

// Owner PIN verification store (per device)
const OwnerAuth = {
  map: {},
  load(){ try{ this.map = JSON.parse(localStorage.getItem(LS_OWNER_VERIF))||{}; }catch{ this.map={}; } },
  save(){ localStorage.setItem(LS_OWNER_VERIF, JSON.stringify(this.map)); },
  verify(rideId){ this.map[String(rideId)] = true; this.save(); },
  isVerified(rideId){ return !!this.map[String(rideId)]; }
};
OwnerAuth.load();

function fmtDateTime(iso){ const d=new Date(iso); return d.toLocaleString(); }
function fmtTimeHM(iso){ const d=new Date(iso); return d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
function statusLabelFR(s){
  switch(s){
    case 'PENDING': return 'En attente de validation';
    case 'ACCEPTED': return 'Acceptée';
    case 'REFUSED': return 'Refusée';
    case 'CANCELLED': return 'Annulée';
    default: return s;
  }
}
function toast(msg){ const t=$('#toast'); if(!t){ alert(msg); return; } t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2000); }

// Helpers for requests display/counters
function reqCounts(rideId){ const items = cachedRequestsByRide(rideId); return { pending: items.filter(x=>x.status==='PENDING').length, accepted: items.filter(x=>x.status==='ACCEPTED').length }; }
function refreshReqCounters(rideId){
  document.querySelectorAll(`.btn-reqs[data-ride="${rideId}"]`).forEach(btn=>{
    const c=reqCounts(rideId);
    btn.textContent = `Demandes (En attente:${c.pending} / Acceptées:${c.accepted})`;
  });
  const pend = document.getElementById(`pend-${rideId}`);
  if (pend){
    const c = reqCounts(rideId);
    if (c.pending>0){ pend.textContent = `${c.pending} nouvelles`; pend.classList.remove('hidden'); }
    else { pend.classList.add('hidden'); pend.textContent=''; }
  }
}
function buildReqListHTML(rideId){ const items = cachedRequestsByRide(rideId); if (!items.length) return '<li class="card">Aucune demande</li>'; const me=Store.ensureDeviceId();
  return items.map(x=>{ const mine = x.requester_device_id && x.requester_device_id===me; const badge = x.status==='PENDING'?'badge pending': x.status==='ACCEPTED'?'badge accepted':'badge refused';
    const cancelBtn = (mine && x.status==='PENDING')? `<button type=\"button\" class=\"btn small btn-cancel-req\" data-req=\"${x.id}\" data-ride=\"${rideId}\">Annuler</button>`: '';
    const ownerBtns = (x.status==='PENDING')? `<button type=\"button\" class=\"btn small primary btn-accept-req\" data-req=\"${x.id}\" data-ride=\"${rideId}\">Accepter</button> <button type=\"button\" class=\"btn small danger btn-refuse-req\" data-req=\"${x.id}\" data-ride=\"${rideId}\">Refuser</button>`: '';
    return `<li class=\"card\"><div><strong>${x.passenger_name||x.passenger||''}</strong> • ${x.seats} place(s) <span class=\"${badge}\" style=\"margin-left:8px\">${statusLabelFR(x.status)}</span></div><div class=\"muted\">${x.message||''}</div><div class=\"cta-row\">${ownerBtns} ${cancelBtn}</div></li>`; }).join(''); }

// Router
const routes = {
  '#home': renderHome,
  '#event': renderEvent,
  '#offer': renderOffer,
  '#search': renderSearch,
  '#ride': renderRide,
  '#requests': renderRequests,
};

function mountLayout(){ const root=$('#app'); root.innerHTML=''; root.append($('#tpl-layout').content.cloneNode(true)); }
async function router(){
  mountLayout();
  // ensure mobile nav is closed when navigating
  document.body.classList.remove('nav-open'); const nb=document.getElementById('nav-toggle'); if(nb) nb.setAttribute('aria-expanded','false');
  const h=location.hash||'#home'; const [base, query]=h.split('?'); const params=new URLSearchParams(query||''); const view=routes[base]||renderHome; await view(params); setActive(base);
}
function setActive(base){ $$('.tab').forEach(t=> t.classList.toggle('active', t.getAttribute('href')===base)); }
window.addEventListener('hashchange', router);

// Burger nav toggle
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('#nav-toggle');
  if (btn){ const open = !document.body.classList.contains('nav-open'); document.body.classList.toggle('nav-open', open); btn.setAttribute('aria-expanded', String(open)); }
  const tab = e.target.closest('.tab');
  if (tab){ document.body.classList.remove('nav-open'); const b=$('#nav-toggle'); if(b) b.setAttribute('aria-expanded','false'); }
});

// Components
function rideCard(r){ const reqs = cachedRequestsByRide(r.id); const pCount = reqs.filter(x=>x.status==='PENDING').length; const aCount = reqs.filter(x=>x.status==='ACCEPTED').length; const left = seatsLeftFrom(r, reqs); const full = left<=0; return `<li class="card" data-ride="${r.id}">
  <div><strong>Lieu de départ:</strong> ${r.origin_text}</div>
  <div><strong>Heure de départ:</strong> ${fmtTimeHM(r.depart_at)}</div>
  <div><strong>Places disponibles:</strong> ${left}/${r.seats_total} ${full? '<span class="badge full">Complet</span>':''} <span id="pend-${r.id}" class="badge pending ${pCount>0? '' : 'hidden'}">${pCount>0? `${pCount} nouvelles` : ''}</span></div>
  <div class="cta-row">${full? '<span class="badge full">Complet</span>' : `<a class="btn primary" href="#ride?id=${r.id}">Voir</a>
    <button type="button" class="btn btn-reqs" data-ride="${r.id}">Demandes (En attente:${pCount} / Acceptées:${aCount})</button>`}
  </div>
  <ul id="reqs-${r.id}" class="list hidden"></ul>
</li>`; }

// Views
async function renderHome(){ const frag=$('#tpl-home').content.cloneNode(true); $('#page').append(frag); }

async function renderEvent(){ await loadEvent().catch(()=>{}); const ev=Store.singleEvent(); const frag=$('#tpl-event').content.cloneNode(true); const card=$('#event-card',frag);
  const src = Store.eventSource==='api'? 'API' : 'local';
  card.innerHTML = `<h2>${ev.name}</h2>
  <div>${ev.city} • ${new Date(ev.date).toLocaleDateString()} • ${ev.time_hint||''}</div>
  <p>${ev.desc||''}</p>
  <div class="cta-row">
    <button id="btn-ev-refresh" class="btn">Rafraîchir</button>
  </div>`;
  const list=$('#ev-rides',frag), empty=$('#ev-empty',frag), sel=$('#ev-filter-type',frag), chk=$('#ev-only-available',frag);
  async function render(){
    const all = await loadRides();
    await Promise.all(all.map(r=> loadRequestsByRide(r.id).catch(()=>[])));
    let rides=[...all];
    if(sel.value && sel.value!=='any') rides=rides.filter(x=>x.ride_type===sel.value);
    if (chk.checked) rides = rides.filter(r=> seatsLeftFrom(r, cachedRequestsByRide(r.id))>0);
    rides = rides.sort((a,b)=> new Date(a.depart_at)-new Date(b.depart_at));
    list.innerHTML='';
    empty.classList.toggle('hidden', rides.length>0);
    rides.forEach(r=>{ list.insertAdjacentHTML('beforeend', rideCard(r)); });
  }
  // Delegated interactions: toggle requests list and cancel/accept/refuse (with PIN if needed)
  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-reqs');
    if (btn){ const rid=Number(btn.getAttribute('data-ride')); const ul=document.getElementById(`reqs-${rid}`); if(!ul) return; if(!ul.classList.contains('hidden')){ ul.classList.add('hidden'); ul.innerHTML=''; return; } ul.innerHTML = buildReqListHTML(rid); ul.classList.remove('hidden'); return; }
    const cancel = e.target.closest('.btn-cancel-req');
    if (cancel){
      const id = Number(cancel.getAttribute('data-req'));
      const rideId = Number(cancel.getAttribute('data-ride'));
      API.cancelRequest({ request_id: id, requester_device_id: Store.ensureDeviceId() }).then(async ()=>{
        toast('Demande annulée');
        await loadRequestsByRide(rideId);
        refreshReqCounters(rideId);
        const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); }
        await render();
      }).catch(err=> toast(err.message||'Erreur'));
    }
    const accept = e.target.closest('.btn-accept-req');
    if (accept){
      const id=Number(accept.getAttribute('data-req'));
      const rideId=Number(accept.getAttribute('data-ride'));
      const pin=prompt('Entrez le code PIN conducteur pour ce trajet');
      if(!pin){ return; }
      API.acceptRequest({ request_id: id, pin }).then(async ()=>{
        OwnerAuth.verify(rideId);
        toast('Demande acceptée');
        await loadRequestsByRide(rideId);
        refreshReqCounters(rideId);
        const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); }
        await render();
      }).catch(err=> toast(err.message||'Erreur'));
    }
    const refuse = e.target.closest('.btn-refuse-req');
    if (refuse){
      const id=Number(refuse.getAttribute('data-req'));
      const rideId=Number(refuse.getAttribute('data-ride'));
      const pin=prompt('Entrez le code PIN conducteur pour ce trajet');
      if(!pin){ return; }
      API.refuseRequest({ request_id: id, pin }).then(async ()=>{
        OwnerAuth.verify(rideId);
        toast('Demande refusée');
        await loadRequestsByRide(rideId);
        refreshReqCounters(rideId);
        const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); }
        await render();
      }).catch(err=> toast(err.message||'Erreur'));
    }
  });
  sel.addEventListener('change', ()=>{ render().catch(()=>{}); }); chk.addEventListener('change', ()=>{ render().catch(()=>{}); });
  const btnRefresh = $('#btn-ev-refresh', frag);
  if (btnRefresh){ btnRefresh.addEventListener('click', async (e)=>{
    if (e && (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)) { await hardReload(); return; }
    await loadEvent().catch(()=>{}); await render().catch(()=>{});
    const c=$('#event-card'); if(c){ const ev2=Store.singleEvent(); const src2=Store.eventSource==='api'?'API':'local'; c.innerHTML = `<h2>${ev2.name}</h2><div class=\"muted\">Données: ${src2} • API: <code id=\\"api-base\\">${API_BASE}</code></div><div>${ev2.city} • ${new Date(ev2.date).toLocaleDateString()} • ${ev2.time_hint||''}</div><p>${ev2.desc||''}</p><div class=\"cta-row\"><button id=\"btn-ev-refresh\" class=\"btn\">Rafraîchir</button></div>`; }
  }); }
  try { await render(); } catch { /* fallback to empty list already handled in loadRides */ }
  $('#page').append(frag);
}

async function renderOffer(){ const frag=$('#tpl-offer').content.cloneNode(true); const form=$('#offer-form',frag), err=$('#offer-error',frag);
  form.addEventListener('submit',(e)=>{ e.preventDefault(); err.textContent=''; const fd=new FormData(form); const p=Object.fromEntries(fd.entries());
    const required=[['ride_type','Type'],['depart_at','Date/heure'],['origin','Départ'],['seats','Places'],['nickname','Pseudo'],['phone','Téléphone']];
    for(const [k,label] of required){ if(!p[k]||String(p[k]).trim()===''){ err.textContent=`${label} est requis`; form.querySelector(`[name="${k}"]`).focus(); return; }}
    const payload={ event_id:Store.singleEvent().id, ride_type:p.ride_type, depart_at:new Date(p.depart_at).toISOString(), origin_text:p.origin, seats_total:Number(p.seats), driver_name: p.nickname||'Invité', driver_phone: p.phone||'' };
    API.createRide(payload).then(async (resp)=>{
      const rideId = resp?.ride?.id;
      const pin = resp?.owner_pin;
      if (!rideId || !pin){ toast('Erreur création trajet'); return; }
      OwnerAuth.verify(rideId);
      toast(`Trajet publié. PIN conducteur: ${pin}`);
      alert(`Code PIN conducteur pour ce trajet: ${pin}\nConservez-le pour gérer les demandes depuis un autre appareil.`);
      await loadRides();
      location.hash = `#ride?id=${rideId}`;
    }).catch(err2=>{ err.textContent = err2.message || 'Erreur'; });
  });
  $('#page').append(frag); }

async function renderSearch(){ const frag=$('#tpl-search').content.cloneNode(true); const list=$('#search-list',frag), empty=$('#search-empty',frag);
  const sel=$('#search-type',frag), city=$('#search-city',frag), time=$('#search-time',frag), seats=$('#search-seats',frag), cost=$('#search-cost',frag), sort=$('#search-sort',frag), only=$('#search-only-available',frag);
  async function apply(){
    const all = await loadRides();
    await Promise.all(all.map(r=> loadRequestsByRide(r.id).catch(()=>[])));
    let r=[...all];
    if(sel.value && sel.value!=='any') r=r.filter(x=>x.ride_type===sel.value);
    if(city.value) r=r.filter(x=> x.origin_text.toLowerCase().includes(city.value.toLowerCase()));
    if(time.value){ const [hh,mm]=time.value.split(':').map(Number); r=r.filter(x=>{ const d=new Date(x.depart_at); const t=d.getHours()*60+d.getMinutes(); const target=hh*60+mm; return Math.abs(t-target)<=60; }); }
    if(seats.value) r=r.filter(x=> seatsLeftFrom(x, cachedRequestsByRide(x.id))>=Number(seats.value));
    if(only.checked) r=r.filter(x=> seatsLeftFrom(x, cachedRequestsByRide(x.id))>0);
    if(sort.value==='earliest') r.sort((a,b)=> new Date(a.depart_at)-new Date(b.depart_at));
    if(sort.value==='seats') r.sort((a,b)=> (seatsLeftFrom(b, cachedRequestsByRide(b.id)))-(seatsLeftFrom(a, cachedRequestsByRide(a.id))));
    if(sort.value==='cost') r.sort((a,b)=> (a.price||0)-(b.price||0));
    list.innerHTML=''; empty.classList.toggle('hidden', r.length>0); r.forEach(x=> list.insertAdjacentHTML('beforeend', rideCard(x)));
  }
  // Delegation in search list as well (with PIN)
  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-reqs');
    if (btn){ const rid=Number(btn.getAttribute('data-ride')); const ul=document.getElementById(`reqs-${rid}`); if(!ul) return; if(!ul.classList.contains('hidden')){ ul.classList.add('hidden'); ul.innerHTML=''; return; } ul.innerHTML = buildReqListHTML(rid); ul.classList.remove('hidden'); return; }
    const cancel = e.target.closest('.btn-cancel-req');
    if (cancel){
      const id = Number(cancel.getAttribute('data-req'));
      const rideId = Number(cancel.getAttribute('data-ride'));
      API.cancelRequest({ request_id: id, requester_device_id: Store.ensureDeviceId() }).then(async ()=>{
        toast('Demande annulée');
        await loadRequestsByRide(rideId);
        refreshReqCounters(rideId);
        const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); }
        await apply();
      }).catch(err=> toast(err.message||'Erreur'));
    }
    const accept = e.target.closest('.btn-accept-req');
    if (accept){
      const id=Number(accept.getAttribute('data-req'));
      const rideId=Number(accept.getAttribute('data-ride'));
      const pin=prompt('Entrez le code PIN conducteur pour ce trajet');
      if(!pin){ return; }
      API.acceptRequest({ request_id: id, pin }).then(async ()=>{
        OwnerAuth.verify(rideId);
        toast('Demande acceptée');
        await loadRequestsByRide(rideId);
        refreshReqCounters(rideId);
        const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); }
        await apply();
      }).catch(err=> toast(err.message||'Erreur'));
    }
    const refuse = e.target.closest('.btn-refuse-req');
    if (refuse){
      const id=Number(refuse.getAttribute('data-req'));
      const rideId=Number(refuse.getAttribute('data-ride'));
      const pin=prompt('Entrez le code PIN conducteur pour ce trajet');
      if(!pin){ return; }
      API.refuseRequest({ request_id: id, pin }).then(async ()=>{
        OwnerAuth.verify(rideId);
        toast('Demande refusée');
        await loadRequestsByRide(rideId);
        refreshReqCounters(rideId);
        const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); }
        await apply();
      }).catch(err=> toast(err.message||'Erreur'));
    }
  });
  const resetBtn = $('#search-reset',frag);
  if (resetBtn){ resetBtn.addEventListener('click', ()=>{ sel.value='any'; city.value=''; time.value=''; seats.value=''; cost.value=''; sort.value='earliest'; only.checked=false; apply().catch(()=>{}); }); }
  [sel,city,time,seats,cost,sort,only].forEach(el=> el.addEventListener('input', ()=>{ apply().catch(()=>{}); }));
  await apply();
  $('#page').append(frag); }

async function renderRide(params){ const id=params.get('id'); const frag=$('#tpl-ride').content.cloneNode(true); const box=$('#ride-details',frag);
  await loadRides();
  const r = getRide(id);
  if(!r){ box.textContent='Trajet introuvable'; $('#page').append(frag); return; }
  await loadRequestsByRide(r.id);
  const leftNow = seatsLeftFrom(r, cachedRequestsByRide(r.id));
  box.innerHTML = `<h2>${r.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div><strong>Heure de départ : </strong>${fmtDateTime(r.depart_at)}</div>
  <div><strong>Places restantes : </strong>${leftNow}/${r.seats_total} ${leftNow<=0? '<span class="badge full">Complet</span>':''}</div>
  <div><strong>Conducteur : </strong>${r.driver_name||r.driver||'Invité'} Tel : ${r.driver_phone}</div>
  <div class="cta-row"><button id="btn-edit-ride" class="btn">Modifier</button><button id="btn-delete-ride" class="btn danger">Supprimer</button></div>`;
  const modal=$('#req-modal',frag), btn=$('#btn-request',frag), form=$('#req-form',frag);
  const editModal=$('#edit-modal',frag), editForm=$('#edit-form',frag);
  // Requests list on ride detail
  const reqSection = document.createElement('section');
  reqSection.innerHTML = `<h3>Demandes reçues</h3><ul id="ride-reqs-list" class="list">${buildReqListHTML(r.id)}</ul>`;
  btn.insertAdjacentElement('afterend', reqSection);
  // Allow cancelling/accepting/refusing from detail page
  reqSection.addEventListener('click', (e)=>{
    const cancel = e.target.closest('.btn-cancel-req');
    if (!cancel) return;
    const rid = r.id;
    const reqId = Number(cancel.getAttribute('data-req'));
    API.cancelRequest({ request_id: reqId, requester_device_id: Store.ensureDeviceId() }).then(async ()=>{
      toast('Demande annulée');
      await loadRequestsByRide(rid);
      const ul = reqSection.querySelector('#ride-reqs-list');
      if (ul) ul.innerHTML = buildReqListHTML(rid);
      refreshReqCounters(rid);
      const boxNow = document.getElementById('ride-details');
      const leftAfter = seatsLeftFrom(r, cachedRequestsByRide(rid));
      if (boxNow) {
        boxNow.innerHTML = `<h2>${r.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div><strong>Heure de départ : </strong>${fmtDateTime(r.depart_at)}</div>
  <div><strong>Places restantes : </strong>${leftAfter}/${r.seats_total} ${leftAfter<=0? '<span class="badge full">Complet</span>':''}</div>
  <div><strong>Conducteur : </strong>${r.driver_name||r.driver} Tel : ${r.driver_phone}</div>`;
      }
      if (leftAfter<=0) { btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); } else { btn.classList.remove('disabled'); btn.removeAttribute('disabled'); }
    }).catch(err=> toast(err.message||'Erreur'));
  });
  const closeModal = ()=> modal.classList.add('hidden');
  const openModal = ()=> modal.classList.remove('hidden');
  if (leftNow<=0) { btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); }
  else { btn.addEventListener('click', openModal); }
  $('#req-cancel',frag).addEventListener('click', closeModal);
  const xbtn = $('#req-x',frag); if (xbtn) xbtn.addEventListener('click', closeModal);
  // Close on backdrop click
  modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });
  // Close on Escape key while modal is visible
  frag.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && !modal.classList.contains('hidden')) closeModal(); });
  // Edit modal handlers
  let editPin = null; // store PIN for this edit session
  const closeEdit = ()=> editModal.classList.add('hidden');
  const openEdit = ()=>{
    if (!editModal){ toast('Modal d\'édition introuvable'); return; }
    // Ask PIN BEFORE opening the modal
    const _pin = prompt('Entrez le code PIN conducteur pour ce trajet');
    if (!_pin){ return; }
    editPin = _pin;
    // Prefill fields from current ride r
    if (editForm){
      if (editForm.ride_type) editForm.ride_type.value = (r.ride_type||'go');
      if (editForm.depart_at){
        const dt = new Date(r.depart_at);
        const isoLocal = new Date(dt.getTime()-dt.getTimezoneOffset()*60000).toISOString().slice(0,16);
        editForm.depart_at.value = isoLocal;
      }
      if (editForm.origin) editForm.origin.value = r.origin_text||'';
      if (editForm.seats) editForm.seats.value = Number(r.seats_total||1);
    }
    editModal.classList.remove('hidden');
  };
  const editX = $('#edit-x', frag); if (editX) editX.addEventListener('click', closeEdit);
  const editCancel = $('#edit-cancel', frag); if (editCancel) editCancel.addEventListener('click', closeEdit);
  // Delegated clicks for edit/delete on the #ride-details box (survive innerHTML refresh)
  box.addEventListener('click', async (e)=>{
    const be = e.target.closest('#btn-edit-ride');
    if (be){ e.preventDefault(); e.stopPropagation(); openEdit(); return; }
    const bd = e.target.closest('#btn-delete-ride');
    if (bd){
      e.preventDefault(); e.stopPropagation();
      if (!confirm('Supprimer ce trajet ? Cette action est irréversible.')) return;
      const pin = prompt('Entrez le code PIN conducteur pour ce trajet');
      if (!pin) return;
      try{
        await API.deleteRide({ ride_id: r.id, pin });
        toast('Trajet supprimé');
        await loadRides();
        location.hash = '#event';
      }catch(err){ toast(err.message||'Erreur'); }
      return;
    }
  });
  // Fallback delegation at document level (in case of dynamic re-renders)
  const docClickHandler = async (e)=>{
    if (!document.body.contains(box)) { document.removeEventListener('click', docClickHandler); return; }
    const be = e.target.closest && e.target.closest('#btn-edit-ride');
    if (be){ e.preventDefault(); openEdit(); return; }
  };
  document.addEventListener('click', docClickHandler);
  if (editForm){ editForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(editForm); const p = Object.fromEntries(fd.entries());
    // Basic validation
    if (!p.depart_at || !p.origin || !p.seats){ toast('Champs manquants'); return; }
    const payload = {
      ride_id: r.id,
      ride_type: p.ride_type,
      depart_at: new Date(p.depart_at).toISOString(),
      origin_text: p.origin,
      seats_total: Number(p.seats||1),
    };
    const pin = editPin || prompt('Entrez le code PIN conducteur pour ce trajet');
    if (!pin) return;
    try{
      await API.updateRide({ ...payload, pin });
      toast('Trajet mis à jour');
      closeEdit();
      await loadRides();
      // Refresh current ride display
      const nr = getRide(r.id);
      if (nr){
        const leftNow2 = seatsLeftFrom(nr, cachedRequestsByRide(nr.id));
        const boxNow = document.getElementById('ride-details');
        if (boxNow){
          boxNow.innerHTML = `<h2>${nr.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div>${fmtDateTime(nr.depart_at)} • ${nr.ride_type.toUpperCase()}</div>
  <div>Places restantes: ${leftNow2}/${nr.seats_total} ${leftNow2<=0? '<span class="badge full">Complet</span>':''}</div>
  <div>Conducteur: ${nr.driver_name||nr.driver||'Invité'}</div>`;
        }
      }
    }catch(err){ toast(err.message||'Erreur'); }
  }); }
  // Owner actions in detail (with PIN)
  reqSection.addEventListener('click', (e)=>{
    const accept = e.target.closest('.btn-accept-req');
    if (accept){
      const id=Number(accept.getAttribute('data-req'));
      const pin=prompt('Entrez le code PIN conducteur pour ce trajet');
      if(!pin){ return; }
      API.acceptRequest({ request_id: id, pin }).then(async ()=>{
        OwnerAuth.verify(r.id);
        toast('Demande acceptée');
        await loadRequestsByRide(r.id);
        const ul=reqSection.querySelector('#ride-reqs-list'); if(ul) ul.innerHTML = buildReqListHTML(r.id);
        refreshReqCounters(r.id);
        const leftAfter = seatsLeftFrom(r, cachedRequestsByRide(r.id));
        if (leftAfter<=0){ btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); }
      }).catch(err=> toast(err.message||'Erreur'));
    }
    const refuse = e.target.closest('.btn-refuse-req');
    if (refuse){
      const id=Number(refuse.getAttribute('data-req'));
      const pin=prompt('Entrez le code PIN conducteur pour ce trajet');
      if(!pin){ return; }
      API.refuseRequest({ request_id: id, pin }).then(async ()=>{
        OwnerAuth.verify(r.id);
        toast('Demande refusée');
        await loadRequestsByRide(r.id);
        const ul=reqSection.querySelector('#ride-reqs-list'); if(ul) ul.innerHTML = buildReqListHTML(r.id);
        refreshReqCounters(r.id);
      }).catch(err=> toast(err.message||'Erreur'));
    }
  });
  form.addEventListener('submit', (e)=>{ e.preventDefault(); const p=Object.fromEntries(new FormData(form).entries());
    const name = (p.passenger_name&&p.passenger_name.trim()) || 'Invité';
    const phone = (p.passenger_phone&&p.passenger_phone.trim()) || '';
    const seats=Number(p.seats||1);
    // Guard: prevent creating a request if not enough seats at submission time
    const left = seatsLeftFrom(r, cachedRequestsByRide(r.id));
    if (left < seats) { toast('Trajet complet ou places insuffisantes'); closeModal(); return; }
    API.createRequest({ ride_id: r.id, passenger_name: name, passenger_phone: phone, seats, message: (p.message||''), requester_device_id: Store.ensureDeviceId() }).then(async ()=>{
      toast('Demande envoyée');
      closeModal();
      await loadRequestsByRide(r.id);
      const ul=reqSection.querySelector('#ride-reqs-list'); if(ul) ul.innerHTML = buildReqListHTML(r.id);
      refreshReqCounters(r.id);
      const leftAfter = seatsLeftFrom(r, cachedRequestsByRide(r.id));
      const boxNow = document.getElementById('ride-details');
      if (boxNow) {
        boxNow.innerHTML = `<h2>${r.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div>${fmtDateTime(r.depart_at)} • ${r.ride_type.toUpperCase()}</div>
  <div>Places restantes: ${leftAfter}/${r.seats_total} ${leftAfter<=0? '<span class="badge full">Complet</span>':''}</div>
  <div>Conducteur: ${r.driver_name||r.driver||'Invité'}</div>`;
      }
      if (leftAfter<=0) { btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); }
    }).catch(err=> toast(err.message||'Erreur'));
  });
  $('#page').append(frag); }

async function renderRequests(){ const frag=$('#tpl-requests').content.cloneNode(true); const list=$('#req-list',frag), empty=$('#req-empty',frag);
  async function render(){
    await loadRides();
    const items = await API.listMyRequests(Store.ensureDeviceId());
    Store.cache.myRequests = items;
    list.innerHTML='';
    empty.classList.toggle('hidden', items.length>0);
    items.forEach(x=>{
      const ride = getRide(x.ride_id);
      const badge = x.status==='PENDING'?'badge pending': x.status==='ACCEPTED'?'badge accepted':'badge refused';
      const canCancel = x.status==='PENDING';
      list.insertAdjacentHTML('beforeend', `<li class=\"card\"><div><strong>${ride?.origin_text||'—'} → ${Store.singleEvent().name}</strong></div><div>${fmtDateTime(ride?.depart_at||x.created_at)} • <span class=\"${badge}\">${x.status}</span></div><div>${x.seats} place(s) • ${x.message||''}</div>${canCancel? '<div class=\\"cta-row\\"><button type=\\"button\\" class=\\"btn danger btn-cancel-req\\" data-req=\\"'+x.id+'\\" data-ride=\\"'+x.ride_id+'\\">Annuler</button></div>':''}</li>`);
    });
  }
  list.addEventListener('click', (e)=>{
    const btn=e.target.closest('.btn-cancel-req');
    if (!btn) return;
    const id=Number(btn.getAttribute('data-req'));
    const rideId=Number(btn.getAttribute('data-ride'));
    API.cancelRequest({ request_id: id, requester_device_id: Store.ensureDeviceId() }).then(async ()=>{
      toast('Demande annulée');
      await loadRequestsByRide(rideId).catch(()=>[]);
      refreshReqCounters(rideId);
      await render();
    }).catch(err=> toast(err.message||'Erreur'));
  });
  await render();
  $('#page').append(frag);
}

// Bootstrap
function setActiveFromHash(){ const base=(location.hash||'#home').split('?')[0]; $$('.tab').forEach(t=> t.classList.toggle('active', t.getAttribute('href')===base)); }
window.addEventListener('hashchange', setActiveFromHash);
(async ()=>{
  await loadEvent();
  await router();
  setActiveFromHash();
})();
