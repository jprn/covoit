SportRide (100% FRONT, HTML/CSS/JS Vanilla)

Lancement
- Ouvrez index.html dans votre navigateur (double-clic ou via un petit serveur local).
- Tout fonctionne hors-ligne, sans backend. Les données sont stockées dans localStorage.

Structure
- index.html: SPA avec templates et navigation hash
- styles.css: styles mobile-first (cards, boutons, filtres)
- app.js: logique de l’application (store local, router, vues, actions)
- data.js: données de démo (events, rides, bookings, messages, currentUser)

Fonctionnalités
- Accueil et Évènements: choisir un évènement
- Proposer un trajet: formulaire (type, date/heure, départ, places, participation, commentaires, règles, coordonnées)
- Rechercher un trajet: filtres basiques + tri
- Détail trajet: demander à rejoindre (simulé)
- Mes demandes: état des demandes (PENDING/ACCEPTED/REFUSED)
- Profil: pseudo/téléphone/préférences (stockés en local)
- (Option) Messagerie: fil simulé si demande acceptée

Stockage (localStorage)
- Clé principale: sportride_store_v1
- Contenu: users, currentUser/session, events, rides, bookings, messages, notifications, nextIds
- Les actions (publier un trajet, demander une place, envoyer un message) modifient le store local

Navigation (hash)
- #/ (Accueil)
- #/events (Liste évènements)
- #/event/{id} (Page évènement)
- #/create?event_id={id} (Proposer un trajet)
- #/rides?event_id={id} (Trajets)
- #/ride/{id} (Détail trajet)
- #/notifications (Notifications locales)
- #/profile (Profil local)

Réinitialiser
- Ouvrez les outils du navigateur > Application/Stockage > localStorage
- Supprimez la clé sportride_store_v1 puis rechargez la page pour reseed

Notes
- Pas d’authentification: un utilisateur “Invité” est créé automatiquement
- Les messages/notifications/demandes sont simulés
- Pour démo, data.js contient 2 évènements, 6 trajets, 6 demandes, 1 profil, quelques messages
