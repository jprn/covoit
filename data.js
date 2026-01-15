// Single-event demo data (100% local)
window.DemoData = {
  event: { id: 1, name: 'Trail des Cimes', sport: 'trail', date: new Date(Date.now()+20*86400000).toISOString(), time_hint: '08:00', city: 'Annecy', address: "Lac d'Annecy", desc: 'Trail autour du lac et Semnoz' },
  rides: [
    { id:1, event_id:1, ride_type:'go', depart_at:new Date(Date.now()+10*86400000+(7*60+30)*60000).toISOString(), origin_text:'Lyon Part-Dieu', seats_total:4, driver:'Alice', owner_pin:'111111', created_at:new Date().toISOString() },
    { id:2, event_id:1, ride_type:'return', depart_at:new Date(Date.now()+10*86400000+(17*60)*60000).toISOString(), origin_text:'Annecy centre', seats_total:3, driver:'Bruno', owner_pin:'222222', created_at:new Date().toISOString() },
  ],
  requests: [
    { id:1, ride_id:2, passenger:'Invité', seats:1, message:'Retour après la course', status:'ACCEPTED', created_at:new Date().toISOString() },
  ],
  messages: [
    { id:1, request_id:1, sender:'driver', text:'Salut, OK pour 17h', created_at:new Date().toISOString() },
  ]
};
