// SportRide - Single Event - 100% Front (localStorage)

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

// Store
const LS_KEY = 'sportride_single_event_v1';
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
};
Store.load();

function fmtDateTime(iso){ const d=new Date(iso); return d.toLocaleString(); }
function toast(msg){ const t=$('#toast'); if(!t){ alert(msg); return; } t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2000); }

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
function rideCard(r){ const cost = r.price? `${r.price} €`:'Libre'; return `<li class="card">
  <div><strong>${r.origin_text}</strong> → ${Store.singleEvent().name} (${Store.singleEvent().city})</div>
  <div>${fmtDateTime(r.depart_at)} • ${r.ride_type.toUpperCase()} • ${r.seats_total} places • ${cost}</div>
  <div class="cta-row"><a class="btn primary block" href="#ride?id=${r.id}">Voir</a></div>
</li>`; }

// Views
async function renderHome(){ const frag=$('#tpl-home').content.cloneNode(true); $('#page').append(frag); }

async function renderEvent(){ const ev=Store.singleEvent(); const frag=$('#tpl-event').content.cloneNode(true); const card=$('#event-card',frag);
  card.innerHTML = `<h2>${ev.name}</h2><div>${ev.city} • ${new Date(ev.date).toLocaleDateString()} • ${ev.time_hint||''}</div><p>${ev.desc||''}</p>`;
  const list=$('#ev-rides',frag), empty=$('#ev-empty',frag), sel=$('#ev-filter-type',frag);
  function render(){ const rides=Store.listRides({type:sel.value}); list.innerHTML=''; empty.classList.toggle('hidden', rides.length>0); rides.forEach(r=>{ list.insertAdjacentHTML('beforeend', rideCard(r)); }); }
  sel.addEventListener('change', render); render(); $('#page').append(frag); }

async function renderOffer(){ const frag=$('#tpl-offer').content.cloneNode(true); const form=$('#offer-form',frag), err=$('#offer-error',frag);
  const me=Store.data.currentUser||{}; form.nickname.value=me.nickname||''; form.phone.value=me.phone||'';
  form.addEventListener('submit',(e)=>{ e.preventDefault(); err.textContent=''; const fd=new FormData(form); const p=Object.fromEntries(fd.entries());
    const required=[['ride_type','Type'],['depart_at','Date/heure'],['origin','Départ'],['seats','Places'],['nickname','Pseudo'],['phone','Téléphone']];
    for(const [k,label] of required){ if(!p[k]||String(p[k]).trim()===''){ err.textContent=`${label} est requis`; form.querySelector(`[name="${k}"]`).focus(); return; }}
    Store.data.currentUser={ ...me, nickname:p.nickname, phone:p.phone }; Store.save();
    const payload={ event_id:Store.singleEvent().id, ride_type:p.ride_type, depart_at:new Date(p.depart_at).toISOString(), origin_text:p.origin, seats_total:Number(p.seats), price:Number(p.price||0), rules:{ luggage:!!p.luggage, music:!!p.music, smoking:!!p.smoking, pets:!!p.pets }, driver: Store.data.currentUser.nickname||'Invité' };
    const ride=Store.addRide(payload); toast('Trajet publié'); location.hash = `#ride?id=${ride.id}`;
  });
  $('#page').append(frag); }

async function renderSearch(){ const frag=$('#tpl-search').content.cloneNode(true); const list=$('#search-list',frag), empty=$('#search-empty',frag);
  const sel=$('#search-type',frag), city=$('#search-city',frag), time=$('#search-time',frag), seats=$('#search-seats',frag), cost=$('#search-cost',frag), sort=$('#search-sort',frag);
  function apply(){ let r=Store.listRides({type:sel.value}); if(city.value) r=r.filter(x=> x.origin_text.toLowerCase().includes(city.value.toLowerCase()));
    if(time.value){ const [hh,mm]=time.value.split(':').map(Number); r=r.filter(x=>{ const d=new Date(x.depart_at); const t=d.getHours()*60+d.getMinutes(); const target=hh*60+mm; return Math.abs(t-target)<=60; }); }
    if(seats.value) r=r.filter(x=> x.seats_total>=Number(seats.value)); if(cost.value) r=r.filter(x=> Number(x.price||0)<=Number(cost.value));
    if(sort.value==='earliest') r.sort((a,b)=> new Date(a.depart_at)-new Date(b.depart_at)); if(sort.value==='seats') r.sort((a,b)=> (b.seats_total)-(a.seats_total)); if(sort.value==='cost') r.sort((a,b)=> (a.price||0)-(b.price||0));
    list.innerHTML=''; empty.classList.toggle('hidden', r.length>0); r.forEach(x=> list.insertAdjacentHTML('beforeend', rideCard(x)));
  }
  [sel,city,time,seats,cost,sort].forEach(el=> el.addEventListener('input', apply)); apply();
  $('#page').append(frag); }

async function renderRide(params){ const id=params.get('id'); const r=Store.getRide(id); const frag=$('#tpl-ride').content.cloneNode(true); const box=$('#ride-details',frag);
  if(!r){ box.textContent='Trajet introuvable'; $('#page').append(frag); return; }
  box.innerHTML = `<h2>${r.origin_text} → ${Store.singleEvent().name} (${Store.singleEvent().city})</h2>
  <div>${fmtDateTime(r.depart_at)} • ${r.ride_type.toUpperCase()}</div>
  <div>Places totales: ${r.seats_total}</div>
  <div>Participation: ${r.price? r.price+' €':'Libre'}</div>
  <div>Conducteur: ${r.driver||'Invité'}</div>`;
  const modal=$('#req-modal',frag), btn=$('#btn-request',frag), form=$('#req-form',frag);
  btn.addEventListener('click', ()=> modal.classList.remove('hidden'));
  $('#req-cancel',frag).addEventListener('click', ()=> modal.classList.add('hidden'));
  form.addEventListener('submit', (e)=>{ e.preventDefault(); const p=Object.fromEntries(new FormData(form).entries()); const me=Store.data.currentUser?.nickname||'Invité'; const seats=Number(p.seats||1); const req=Store.addRequest({ ride_id:r.id, passenger:me, seats, message:p.message||'' }); toast('Demande envoyée'); modal.classList.add('hidden');
    // auto-accept after 3s if enough seats (simple simulation)
    setTimeout(()=>{ const rr = Store.setRequestStatus(req.id, 'ACCEPTED'); if(rr){ toast('Demande acceptée'); } }, 3000);
  });
  $('#page').append(frag); }

async function renderRequests(){ const frag=$('#tpl-requests').content.cloneNode(true); const list=$('#req-list',frag), empty=$('#req-empty',frag);
  const items = Store.listMyRequests(); list.innerHTML=''; empty.classList.toggle('hidden', items.length>0);
  items.forEach(x=>{ const ride=Store.getRide(x.ride_id); const badge = x.status==='PENDING'?'badge pending': x.status==='ACCEPTED'?'badge accepted':'badge refused';
    list.insertAdjacentHTML('beforeend', `<li class="card"><div><strong>${ride?.origin_text||'—'} → ${Store.singleEvent().name}</strong></div><div>${fmtDateTime(ride?.depart_at||x.created_at)} • <span class="${badge}">${x.status}</span></div><div>${x.seats} place(s) • ${x.message||''}</div></li>`);
  });
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
