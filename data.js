// Demo data for SportRide 100% FRONT (localStorage)
// You can edit these demo entries. On first run, the app seeds from here.

window.DemoData = {
  currentUser: {
    id: 100,
    nickname: "Invité",
    phone: "",
    prefs: { smoking: false, pets: true, music: true, talk: true },
  },
  users: [
    { id:1, email:'alice@example.com', first_name:'Alice', last_name:'Martin', phone:'+33600000001', city:'Lyon' },
    { id:2, email:'bruno@example.com', first_name:'Bruno', last_name:'Lefevre', phone:'+33600000002', city:'Grenoble' },
    { id:3, email:'camille@example.com', first_name:'Camille', last_name:'Durand', phone:'+33600000003', city:'Annecy' },
    { id:4, email:'david@example.com', first_name:'David', last_name:'Lopez', phone:'+33600000004', city:'Chambéry' },
    { id:5, email:'emma@example.com', first_name:'Emma', last_name:'Petit', phone:'+33600000005', city:'Lyon' },
  ],
  events: [
    { id:1, name:'Trail des Cimes', sport:'trail', date: new Date(Date.now()+20*86400000).toISOString(), time_hint:'08:00', city:'Annecy', address:"Lac d'Annecy", desc:'Trail autour du lac et Semnoz', lat:45.8992, lng:6.1296, image:'' },
    { id:2, name:'Triathlon du Lac', sport:'triathlon', date: new Date(Date.now()+35*86400000).toISOString(), time_hint:'09:00', city:'Aix-les-Bains', address:'Esplanade du lac', desc:'Triathlon S/M/L', lat:45.6896, lng:5.9087, image:'' },
  ],
  rides: [
    { id:1, user_id:1, event_id:1, ride_type:'go', depart_at:new Date(Date.now()+10*86400000 + (7*60+30)*60000).toISOString(), origin_text:'Lyon Part-Dieu', seats_total:4, max_detour_km:10, price_suggested:10, note:'Je passe par Bourgoin', rules:{music:true,luggage:true}, status:'active', created_at:new Date().toISOString() },
    { id:2, user_id:2, event_id:1, ride_type:'return', depart_at:new Date(Date.now()+10*86400000 + (17*60)*60000).toISOString(), origin_text:'Annecy centre', seats_total:3, max_detour_km:5, price_suggested:0, note:'Retour après la course', rules:{pets:false}, status:'active', created_at:new Date().toISOString() },
    { id:3, user_id:3, event_id:1, ride_type:'go', depart_at:new Date(Date.now()+10*86400000 + (6*60+45)*60000).toISOString(), origin_text:'Chambéry Gare', seats_total:3, max_detour_km:15, price_suggested:5, note:null, rules:{smoking:false}, status:'active', created_at:new Date().toISOString() },
    { id:4, user_id:4, event_id:2, ride_type:'go', depart_at:new Date(Date.now()+25*86400000 + (8*60)*60000).toISOString(), origin_text:'Grenoble Victor Hugo', seats_total:4, max_detour_km:20, price_suggested:8, note:"Départ à l'heure", rules:{music:true}, status:'active', created_at:new Date().toISOString() },
    { id:5, user_id:5, event_id:2, ride_type:'return', depart_at:new Date(Date.now()+25*86400000 + (18*60)*60000).toISOString(), origin_text:'Aix-les-Bains', seats_total:2, max_detour_km:10, price_suggested:0, note:null, rules:{luggage:true}, status:'active', created_at:new Date().toISOString() },
    { id:6, user_id:2, event_id:2, ride_type:'go', depart_at:new Date(Date.now()+25*86400000 + (7*60+15)*60000).toISOString(), origin_text:'Grenoble Gare', seats_total:3, max_detour_km:10, price_suggested:6, note:null, rules:{music:true}, status:'active', created_at:new Date().toISOString() },
  ],
  bookings: [
    { id:1, ride_id:1, passenger_name:'Invité', seats:1, message:'Bonjour, je peux rejoindre à Lyon.', status:'PENDING', created_at:new Date().toISOString() },
    { id:2, ride_id:2, passenger_name:'Invité', seats:1, message:'Retour après la course', status:'ACCEPTED', created_at:new Date().toISOString() },
    { id:3, ride_id:3, passenger_name:'Invité', seats:2, message:'Nous sommes deux', status:'REFUSED', created_at:new Date().toISOString() },
    { id:4, ride_id:4, passenger_name:'Invité', seats:1, message:'Ok pour 8h', status:'PENDING', created_at:new Date().toISOString() },
    { id:5, ride_id:5, passenger_name:'Invité', seats:1, message:'Retour vers 19h ?', status:'ACCEPTED', created_at:new Date().toISOString() },
    { id:6, ride_id:6, passenger_name:'Invité', seats:1, message:'Je peux me rendre à Grenoble', status:'PENDING', created_at:new Date().toISOString() },
  ],
  messages: [
    { id:1, booking_id:2, sender:'driver', text:'Salut, ok rdv à 17h à l\'esplanade', created_at:new Date().toISOString() },
    { id:2, booking_id:2, sender:'me', text:'Parfait, merci !', created_at:new Date().toISOString() },
  ]
};
