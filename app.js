// SportRide - Single Event - 100% Front (localStorage)

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// Store
const LS_KEY = 'sportride_single_event_v1';
const LS_OWNER_VERIF = 'sportride_owner_verif_v1';
const Store = {
  data: null,
  load(){ try{ this.data = JSON.parse(localStorage.getItem(LS_KEY))||null; }catch{ this.data=null; }
    if(!this.data){ this.seed(); }
  },
  save(){ localStorage.setItem(LS_KEY, JSON.stringify(this.data)); },
  seed(){
    const d = window.DemoData;
    this.data = {
      currentUser: d.currentUser,
      event: d.event,
      rides: d.rides,
      requests: d.requests,
      messages: d.messages,
      next: { ride: (d.rides?.length||0)+1, request: (d.requests?.length||0)+1, message: (d.messages?.length||0)+1 }
    };
    this.save();
  },
  reset(){ localStorage.removeItem(LS_KEY); this.load(); },
  singleEvent(){ return this.data.event; },
  addRide(payload){ const id=this.data.next.ride++; const r={ id, ...payload, created_at:new Date().toISOString() }; this.data.rides.push(r); this.save(); return r; },
  listRides({type}={}){ let r=[...this.data.rides]; if(type && type!=='any') r=r.filter(x=>x.ride_type===type); r=r.sort((a,b)=> new Date(a.depart_at)-new Date(b.depart_at)); return r; },
  getRide(id){ return this.data.rides.find(r=>String(r.id)===String(id)); },
  addRequest({ride_id, passenger, seats, message}){ const id=this.data.next.request++; const req={ id, ride_id, passenger, seats, message, status:'PENDING', created_at:new Date().toISOString() }; this.data.requests.push(req); this.save(); return req; },
  listMyRequests(){ const me=this.data.currentUser?.nickname||'Invité'; return this.data.requests.filter(r=>r.passenger===me).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)); },
  setRequestStatus(id, status){ const r=this.data.requests.find(x=>x.id===id); if(r){ r.status=status; this.save(); } return r; },
  addMessage({request_id, sender, text}){ const id=this.data.next.message++; const m={ id, request_id, sender, text, created_at:new Date().toISOString() }; this.data.messages.push(m); this.save(); return m; },
  requestsByRide(rideId){ return this.data.requests.filter(r=> r.ride_id===rideId); },
  isOwner(rideId){ const ride=this.getRide(rideId); const me=this.data.currentUser||{}; if(!ride) return false; if(ride.driver && ride.driver===me.nickname){ if(!ride.driver_phone) return true; return (ride.driver_phone===me.phone); } return false; },
  seatsLeft(rideId){
    const ride = this.getRide(rideId);
    if (!ride) return 0;
    const booked = this.data.requests.filter(r=> r.ride_id===rideId && r.status==='ACCEPTED').reduce((s,r)=> s + (Number(r.seats)||0), 0);
    const left = Math.max(0, Number(ride.seats_total||0) - booked);
    return left;
  }
};
Store.load();

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
function toast(msg){ const t=$('#toast'); if(!t){ alert(msg); return; } t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2000); }

// Helpers for requests display/counters
function reqCounts(rideId){ const items = Store.requestsByRide(rideId); return { pending: items.filter(x=>x.status==='PENDING').length, accepted: items.filter(x=>x.status==='ACCEPTED').length }; }
function refreshReqCounters(rideId){
  document.querySelectorAll(`.btn-reqs[data-ride="${rideId}"]`).forEach(btn=>{
    const c=reqCounts(rideId);
    btn.textContent = `Demandes (P:${c.pending} / A:${c.accepted})`;
  });
  const pend = document.getElementById(`pend-${rideId}`);
  if (pend){
    const c = reqCounts(rideId);
    if (c.pending>0){ pend.textContent = `${c.pending} nouvelles`; pend.classList.remove('hidden'); }
    else { pend.classList.add('hidden'); pend.textContent=''; }
  }
}
function buildReqListHTML(rideId){ const items = Store.requestsByRide(rideId); if (!items.length) return '<li class="card">Aucune demande</li>'; const me=Store.data.currentUser?.nickname||'Invité'; const owner=Store.isOwner(rideId);
  return items.map(x=>{ const mine = x.passenger===me; const badge = x.status==='PENDING'?'badge pending': x.status==='ACCEPTED'?'badge accepted':'badge refused';
    const cancelBtn = (mine && x.status==='PENDING')? `<button type=\"button\" class=\"btn small btn-cancel-req\" data-req=\"${x.id}\">Annuler</button>`: '';
    const ownerBtns = (owner && x.status==='PENDING')? `<button type=\"button\" class=\"btn small primary btn-accept-req\" data-req=\"${x.id}\">Accepter</button> <button type=\"button\" class=\"btn small danger btn-refuse-req\" data-req=\"${x.id}\">Refuser</button>`: '';
    return `<li class=\"card\"><div><strong>${x.passenger}</strong> • ${x.seats} place(s) <span class=\"${badge}\" style=\"margin-left:8px\">${x.status}</span></div><div class=\"muted\">${x.message||''}</div><div class=\"cta-row\">${ownerBtns} ${cancelBtn}</div></li>`; }).join(''); }

// Router
const routes = {
  '#home': renderHome,
  '#event': renderEvent,
  '#offer': renderOffer,
  '#search': renderSearch,
  '#ride': renderRide,
  '#requests': renderRequests,
  '#profile': renderProfile,
};

function mountLayout(){ const root=$('#app'); root.innerHTML=''; root.append($('#tpl-layout').content.cloneNode(true)); }
async function router(){ mountLayout(); const h=location.hash||'#home'; const [base, query]=h.split('?'); const params=new URLSearchParams(query||''); const view=routes[base]||renderHome; await view(params); setActive(base); }
function setActive(base){ $$('.tab').forEach(t=> t.classList.toggle('active', t.getAttribute('href')===base)); }
window.addEventListener('hashchange', router);

// Components
function rideCard(r){ const left = Store.seatsLeft(r.id); const full = left<=0; const reqs = Store.requestsByRide(r.id); const pCount = reqs.filter(x=>x.status==='PENDING').length; const aCount = reqs.filter(x=>x.status==='ACCEPTED').length; return `<li class="card" data-ride="${r.id}">
  <div><strong>${r.origin_text}</strong> → ${Store.singleEvent().name} (${Store.singleEvent().city})</div>
  <div>${fmtDateTime(r.depart_at)} • ${r.ride_type.toUpperCase()} • ${left}/${r.seats_total} places ${full? '<span class="badge full">Complet</span>':''} <span id="pend-${r.id}" class="badge pending ${pCount>0? '' : 'hidden'}">${pCount>0? `${pCount} nouvelles` : ''}</span></div>
  <div class="cta-row">${full? '<span class="badge full">Complet</span>' : `<a class="btn primary" href="#ride?id=${r.id}">Voir</a>
    <button type="button" class="btn btn-reqs" data-ride="${r.id}">Demandes (P:${pCount} / A:${aCount})</button>`}
  </div>
  <ul id="reqs-${r.id}" class="list hidden"></ul>
</li>`; }

// Views
async function renderHome(){ const frag=$('#tpl-home').content.cloneNode(true); $('#page').append(frag); }

async function renderEvent(){ const ev=Store.singleEvent(); const frag=$('#tpl-event').content.cloneNode(true); const card=$('#event-card',frag);
  card.innerHTML = `<h2>${ev.name}</h2><div>${ev.city} • ${new Date(ev.date).toLocaleDateString()} • ${ev.time_hint||''}</div><p>${ev.desc||''}</p>`;
  const list=$('#ev-rides',frag), empty=$('#ev-empty',frag), sel=$('#ev-filter-type',frag), chk=$('#ev-only-available',frag);
  function render(){ let rides=Store.listRides({type:sel.value}); if (chk.checked) rides = rides.filter(r=> Store.seatsLeft(r.id)>0); list.innerHTML=''; empty.classList.toggle('hidden', rides.length>0); rides.forEach(r=>{ list.insertAdjacentHTML('beforeend', rideCard(r)); }); }
  // Delegated interactions: toggle requests list and cancel/accept/refuse (with PIN if needed)
  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-reqs');
    if (btn){ const rid=Number(btn.getAttribute('data-ride')); const ul=document.getElementById(`reqs-${rid}`); if(!ul) return; if(!ul.classList.contains('hidden')){ ul.classList.add('hidden'); ul.innerHTML=''; return; } ul.innerHTML = buildReqListHTML(rid); ul.classList.remove('hidden'); return; }
    const cancel = e.target.closest('.btn-cancel-req');
    if (cancel){ const id = Number(cancel.getAttribute('data-req')); const req = Store.setRequestStatus(id, 'CANCELLED'); if(req){ toast('Demande annulée'); }
      // refresh the list and counters
      const rideId = req?.ride_id; if (rideId){ refreshReqCounters(rideId); const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); }
      }
    }
    const accept = e.target.closest('.btn-accept-req');
    if (accept){ const id=Number(accept.getAttribute('data-req')); const reqObj = Store.data.requests.find(x=>x.id===id); const ride = reqObj && Store.getRide(reqObj.ride_id);
      if (ride && !(Store.isOwner(ride.id) || OwnerAuth.isVerified(ride.id))){ const pin=prompt('Entrez le code PIN conducteur pour ce trajet'); if(!pin || pin!==ride.owner_pin){ toast('PIN incorrect'); return; } OwnerAuth.verify(ride.id); }
      const req=Store.setRequestStatus(id,'ACCEPTED'); if(req){ toast('Demande acceptée'); refreshReqCounters(req.ride_id); const ul=document.getElementById(`reqs-${req.ride_id}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(req.ride_id); } refreshRideCards(req.ride_id); }
    }
    const refuse = e.target.closest('.btn-refuse-req');
    if (refuse){ const id=Number(refuse.getAttribute('data-req')); const reqObj = Store.data.requests.find(x=>x.id===id); const ride = reqObj && Store.getRide(reqObj.ride_id);
      if (ride && !(Store.isOwner(ride.id) || OwnerAuth.isVerified(ride.id))){ const pin=prompt('Entrez le code PIN conducteur pour ce trajet'); if(!pin || pin!==ride.owner_pin){ toast('PIN incorrect'); return; } OwnerAuth.verify(ride.id); }
      const req=Store.setRequestStatus(id,'REFUSED'); if(req){ toast('Demande refusée'); refreshReqCounters(req.ride_id); const ul=document.getElementById(`reqs-${req.ride_id}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(req.ride_id); } refreshRideCards(req.ride_id); }
    }
  });
  sel.addEventListener('change', render); chk.addEventListener('change', render); render(); $('#page').append(frag); }

async function renderOffer(){ const frag=$('#tpl-offer').content.cloneNode(true); const form=$('#offer-form',frag), err=$('#offer-error',frag);
  const me=Store.data.currentUser||{}; form.nickname.value=me.nickname||''; form.phone.value=me.phone||'';
  form.addEventListener('submit',(e)=>{ e.preventDefault(); err.textContent=''; const fd=new FormData(form); const p=Object.fromEntries(fd.entries());
    const required=[['ride_type','Type'],['depart_at','Date/heure'],['origin','Départ'],['seats','Places'],['nickname','Pseudo'],['phone','Téléphone']];
    for(const [k,label] of required){ if(!p[k]||String(p[k]).trim()===''){ err.textContent=`${label} est requis`; form.querySelector(`[name="${k}"]`).focus(); return; }}
    Store.data.currentUser={ ...me, nickname:p.nickname, phone:p.phone }; Store.save();
    // generate a 6-digit PIN for the ride owner
    const pin = String(Math.floor(100000 + Math.random()*900000));
    const payload={ event_id:Store.singleEvent().id, ride_type:p.ride_type, depart_at:new Date(p.depart_at).toISOString(), origin_text:p.origin, seats_total:Number(p.seats), driver: Store.data.currentUser.nickname||'Invité', driver_phone: Store.data.currentUser.phone||'', owner_pin: pin };
    const ride=Store.addRide(payload);
    // mark verified on this device and inform the user
    OwnerAuth.verify(ride.id);
    toast(`Trajet publié. PIN conducteur: ${pin}`);
    alert(`Code PIN conducteur pour ce trajet: ${pin}\nConservez-le pour gérer les demandes depuis un autre appareil.`);
    location.hash = `#ride?id=${ride.id}`;
  });
  $('#page').append(frag); }

async function renderSearch(){ const frag=$('#tpl-search').content.cloneNode(true); const list=$('#search-list',frag), empty=$('#search-empty',frag);
  const sel=$('#search-type',frag), city=$('#search-city',frag), time=$('#search-time',frag), seats=$('#search-seats',frag), cost=$('#search-cost',frag), sort=$('#search-sort',frag), only=$('#search-only-available',frag);
  function apply(){ let r=Store.listRides({type:sel.value}); if(city.value) r=r.filter(x=> x.origin_text.toLowerCase().includes(city.value.toLowerCase()));
    if(time.value){ const [hh,mm]=time.value.split(':').map(Number); r=r.filter(x=>{ const d=new Date(x.depart_at); const t=d.getHours()*60+d.getMinutes(); const target=hh*60+mm; return Math.abs(t-target)<=60; }); }
    if(seats.value) r=r.filter(x=> Store.seatsLeft(x.id)>=Number(seats.value)); if(only.checked) r=r.filter(x=> Store.seatsLeft(x.id)>0);
    if(sort.value==='earliest') r.sort((a,b)=> new Date(a.depart_at)-new Date(b.depart_at)); if(sort.value==='seats') r.sort((a,b)=> (Store.seatsLeft(b.id))-(Store.seatsLeft(a.id))); if(sort.value==='cost') r.sort((a,b)=> (a.price||0)-(b.price||0));
    list.innerHTML=''; empty.classList.toggle('hidden', r.length>0); r.forEach(x=> list.insertAdjacentHTML('beforeend', rideCard(x)));
  }
  // Delegation in search list as well (with PIN)
  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('.btn-reqs');
    if (btn){ const rid=Number(btn.getAttribute('data-ride')); const ul=document.getElementById(`reqs-${rid}`); if(!ul) return; if(!ul.classList.contains('hidden')){ ul.classList.add('hidden'); ul.innerHTML=''; return; } ul.innerHTML = buildReqListHTML(rid); ul.classList.remove('hidden'); return; }
    const cancel = e.target.closest('.btn-cancel-req');
    if (cancel){ const id = Number(cancel.getAttribute('data-req')); const req = Store.setRequestStatus(id, 'CANCELLED'); if(req){ toast('Demande annulée'); } const rideId = req?.ride_id; if (rideId){ refreshReqCounters(rideId); const ul=document.getElementById(`reqs-${rideId}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(rideId); } }
    }
    const accept = e.target.closest('.btn-accept-req'); if (accept){ const id=Number(accept.getAttribute('data-req')); const reqObj = Store.data.requests.find(x=>x.id===id); const ride = reqObj && Store.getRide(reqObj.ride_id);
      if (ride && !(Store.isOwner(ride.id) || OwnerAuth.isVerified(ride.id))){ const pin=prompt('Entrez le code PIN conducteur pour ce trajet'); if(!pin || pin!==ride.owner_pin){ toast('PIN incorrect'); return; } OwnerAuth.verify(ride.id); }
      const req=Store.setRequestStatus(id,'ACCEPTED'); if(req){ toast('Demande acceptée'); refreshReqCounters(req.ride_id); const ul=document.getElementById(`reqs-${req.ride_id}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(req.ride_id); } refreshRideCards(req.ride_id); }}
    const refuse = e.target.closest('.btn-refuse-req'); if (refuse){ const id=Number(refuse.getAttribute('data-req')); const reqObj = Store.data.requests.find(x=>x.id===id); const ride = reqObj && Store.getRide(reqObj.ride_id);
      if (ride && !(Store.isOwner(ride.id) || OwnerAuth.isVerified(ride.id))){ const pin=prompt('Entrez le code PIN conducteur pour ce trajet'); if(!pin || pin!==ride.owner_pin){ toast('PIN incorrect'); return; } OwnerAuth.verify(ride.id); }
      const req=Store.setRequestStatus(id,'REFUSED'); if(req){ toast('Demande refusée'); refreshReqCounters(req.ride_id); const ul=document.getElementById(`reqs-${req.ride_id}`); if(ul && !ul.classList.contains('hidden')){ ul.innerHTML = buildReqListHTML(req.ride_id); } refreshRideCards(req.ride_id); }}
  });
  const resetBtn = $('#search-reset',frag);
  if (resetBtn){ resetBtn.addEventListener('click', ()=>{ sel.value='any'; city.value=''; time.value=''; seats.value=''; cost.value=''; sort.value='earliest'; only.checked=false; apply(); }); }
  [sel,city,time,seats,cost,sort,only].forEach(el=> el.addEventListener('input', apply)); apply();
  $('#page').append(frag); }

async function renderRide(params){ const id=params.get('id'); const r=Store.getRide(id); const frag=$('#tpl-ride').content.cloneNode(true); const box=$('#ride-details',frag);
  if(!r){ box.textContent='Trajet introuvable'; $('#page').append(frag); return; }
  const leftNow = Store.seatsLeft(r.id);
  box.innerHTML = `<h2>${r.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div>${fmtDateTime(r.depart_at)} • ${r.ride_type.toUpperCase()}</div>
  <div>Places restantes: ${leftNow}/${r.seats_total} ${leftNow<=0? '<span class="badge full">Complet</span>':''}</div>
  <div>Conducteur: ${r.driver||'Invité'}</div>`;
  const modal=$('#req-modal',frag), btn=$('#btn-request',frag), form=$('#req-form',frag);
  // Prefill requester info from profile
  if (form.passenger_name) form.passenger_name.value = Store.data.currentUser?.nickname||'';
  if (form.passenger_phone) form.passenger_phone.value = Store.data.currentUser?.phone||'';
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
    const req = Store.setRequestStatus(reqId, 'CANCELLED');
    if (req) {
      toast('Demande annulée');
      const ul = reqSection.querySelector('#ride-reqs-list');
      if (ul) ul.innerHTML = buildReqListHTML(rid);
      refreshReqCounters(rid);
      // refresh seats and disable button if full
      const updated = Store.getRide(rid);
      const boxNow = document.getElementById('ride-details');
      if (boxNow && updated) {
        boxNow.innerHTML = `<h2>${updated.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div>${fmtDateTime(updated.depart_at)} • ${updated.ride_type.toUpperCase()}</div>
  <div>Places restantes: ${Store.seatsLeft(updated.id)}/${updated.seats_total} ${Store.seatsLeft(updated.id)<=0? '<span class="badge full">Complet</span>':''}</div>
  <div>Conducteur: ${updated.driver||'Invité'}</div>`;
      }
      const leftAfter = Store.seatsLeft(rid);
      if (leftAfter<=0) { btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); } else { btn.classList.remove('disabled'); btn.removeAttribute('disabled'); }
    }
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
  // Owner actions in detail (with PIN)
  reqSection.addEventListener('click', (e)=>{
    const accept = e.target.closest('.btn-accept-req');
    if (accept){ const id=Number(accept.getAttribute('data-req')); if(!(Store.isOwner(r.id) || OwnerAuth.isVerified(r.id))){ const pin=prompt('Entrez le code PIN conducteur pour ce trajet'); if(!pin || pin!== (Store.getRide(r.id)?.owner_pin||'')){ toast('PIN incorrect'); return; } OwnerAuth.verify(r.id); }
      const rq=Store.setRequestStatus(id,'ACCEPTED'); if(rq){ toast('Demande acceptée'); const ul=reqSection.querySelector('#ride-reqs-list'); if(ul) ul.innerHTML = buildReqListHTML(r.id); refreshReqCounters(r.id); const leftAfter=Store.seatsLeft(r.id); if (leftAfter<=0){ btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); } } }
    const refuse = e.target.closest('.btn-refuse-req');
    if (refuse){ const id=Number(refuse.getAttribute('data-req')); if(!(Store.isOwner(r.id) || OwnerAuth.isVerified(r.id))){ const pin=prompt('Entrez le code PIN conducteur pour ce trajet'); if(!pin || pin!== (Store.getRide(r.id)?.owner_pin||'')){ toast('PIN incorrect'); return; } OwnerAuth.verify(r.id); }
      const rq=Store.setRequestStatus(id,'REFUSED'); if(rq){ toast('Demande refusée'); const ul=reqSection.querySelector('#ride-reqs-list'); if(ul) ul.innerHTML = buildReqListHTML(r.id); refreshReqCounters(r.id); } }
  });
  form.addEventListener('submit', (e)=>{ e.preventDefault(); const p=Object.fromEntries(new FormData(form).entries());
    const name = (p.passenger_name&&p.passenger_name.trim()) || (Store.data.currentUser?.nickname)||'Invité';
    const phone = (p.passenger_phone&&p.passenger_phone.trim()) || (Store.data.currentUser?.phone)||'';
    // persist back to profile for convenience
    Store.data.currentUser = { ...(Store.data.currentUser||{}), nickname:name, phone:phone };
    Store.save();
    const seats=Number(p.seats||1);
    // Guard: prevent creating a request if not enough seats at submission time
    if (Store.seatsLeft(r.id) < seats) { toast('Trajet complet ou places insuffisantes'); closeModal(); return; }
    const req=Store.addRequest({ ride_id:r.id, passenger:name, seats, message:(p.message||'')+ (phone? ` (tel: ${phone})`:'') }); toast('Demande envoyée'); closeModal();
    // auto-accept after 3s if enough seats (simple simulation) — disabled if PIN set and not verified
    const rideNow = Store.getRide(r.id);
    const shouldAuto = !(rideNow?.owner_pin);
    if (shouldAuto) setTimeout(()=>{ const left = Store.seatsLeft(r.id); if (left >= req.seats) { const rr = Store.setRequestStatus(req.id, 'ACCEPTED'); if(rr){ toast('Demande acceptée'); } } else { Store.setRequestStatus(req.id, 'REFUSED'); toast('Demande refusée (plus de places)'); }
      // refresh details display
      const updated = Store.getRide(r.id); const boxNow = document.getElementById('ride-details'); if (boxNow && updated) { boxNow.innerHTML = `<h2>${updated.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div>${fmtDateTime(updated.depart_at)} • ${updated.ride_type.toUpperCase()}</div>
  <div>Places restantes: ${Store.seatsLeft(updated.id)}/${updated.seats_total}</div>
  <div>Conducteur: ${updated.driver||'Invité'}</div>`; }
      // refresh counters in lists
      refreshReqCounters(r.id);
      const ul = document.getElementById('ride-reqs-list'); if (ul) ul.innerHTML = buildReqListHTML(r.id);
      // disable button if now full
      const leftAfter = Store.seatsLeft(r.id);
      if (leftAfter<=0) { btn.classList.add('disabled'); btn.setAttribute('disabled','disabled'); }
    }, 3000);
  });
  $('#page').append(frag); }

async function renderRequests(){ const frag=$('#tpl-requests').content.cloneNode(true); const list=$('#req-list',frag), empty=$('#req-empty',frag);
  function render(){ const items = Store.listMyRequests(); list.innerHTML=''; empty.classList.toggle('hidden', items.length>0);
    items.forEach(x=>{ const ride=Store.getRide(x.ride_id); const badge = x.status==='PENDING'?'badge pending': x.status==='ACCEPTED'?'badge accepted':'badge refused'; const canCancel = x.status==='PENDING';
      list.insertAdjacentHTML('beforeend', `<li class=\"card\"><div><strong>${ride?.origin_text||'—'} → ${Store.singleEvent().name}</strong></div><div>${fmtDateTime(ride?.depart_at||x.created_at)} • <span class=\"${badge}\">${x.status}</span></div><div>${x.seats} place(s) • ${x.message||''}</div>${canCancel? '<div class=\\"cta-row\\"><button type=\\"button\\" class=\\"btn danger btn-cancel-req\\" data-req=\\"'+x.id+'\\">Annuler</button></div>':''}</li>`);
    });
  }
  list.addEventListener('click', (e)=>{ const btn=e.target.closest('.btn-cancel-req'); if (!btn) return; const id=Number(btn.getAttribute('data-req')); const req = Store.setRequestStatus(id, 'CANCELLED'); if(req){ toast('Demande annulée'); refreshReqCounters(req.ride_id); render(); }});
  render();
  $('#page').append(frag); }

async function renderProfile(){ const frag=$('#tpl-profile').content.cloneNode(true); const f=$('#profile-form',frag); const me=Store.data.currentUser||{}; f.nickname.value=me.nickname||''; f.phone.value=me.phone||'';
  f.pref_music.checked=!!me.prefs?.music; f.pref_smoking.checked=!!me.prefs?.smoking; f.pref_pets.checked=!!me.prefs?.pets; f.pref_talk.checked=!!me.prefs?.talk;
  f.addEventListener('submit', (e)=>{ e.preventDefault(); const p=Object.fromEntries(new FormData(f).entries()); Store.data.currentUser={ id:100, nickname:p.nickname||'Invité', phone:p.phone||'', prefs:{ music:!!p.pref_music, smoking:!!p.pref_smoking, pets:!!p.pref_pets, talk:!!p.pref_talk } }; Store.save(); toast('Profil enregistré'); });
  $('#btn-reset',frag).addEventListener('click', ()=>{ if(confirm('Réinitialiser toutes les données locales ?')){ Store.reset(); toast('Données réinitialisées'); location.hash='#home'; } });
  $('#page').append(frag); }

// Bootstrap
function setActiveFromHash(){ const base=(location.hash||'#home').split('?')[0]; $$('.tab').forEach(t=> t.classList.toggle('active', t.getAttribute('href')===base)); }
window.addEventListener('hashchange', setActiveFromHash);
router().then(setActiveFromHash);
