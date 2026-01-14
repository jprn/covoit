# SportRide – MVP PWA

Covoiturage simple pour un évènement sportif. Mobile-first, rapide, et prêt à déployer.

## Stack
- Front: HTML/CSS/JS vanilla (SPA, hash routing)
- PWA: Manifest + Service Worker (cache statique)
- Backend: Supabase (Auth + Postgres + RLS)
- Déploiement: Vercel ou Netlify

## Fonctionnalités (MVP)
- Proposer un trajet (conducteur)
- Rechercher / filtrer des trajets
- Réserver une place (statut pending)
- Messagerie 1:1 liée à une réservation
- Notifications in-app (liste depuis table)
- Modération: signalements basiques

## Installation locale
1. Cloner/copier ce dossier.
2. Créer un projet Supabase: https://supabase.com/
3. Dans SQL Editor, exécuter `sql/schema.sql`, puis `sql/policies.sql`.
4. Créer des comptes utilisateurs (Auth > Users) pour vos 8 utilisateurs de test.
5. Récupérer leurs `id` (UUID) et mettre à jour `sql/seed.sql` en remplaçant les UUID placeholder.
6. Exécuter `sql/seed.sql`.
7. Copier `supabase/config.example.js` vers `supabase/config.js` et renseigner `SUPABASE_URL` et `SUPABASE_ANON_KEY`.
8. Dans `index.html`, remplacer l'import de `config.example.js` par `config.js` si vous souhaitez commiter votre config (évitez en public), ou laissez `config.example.js` et mettez vos valeurs directement dedans en local.
9. Servir le dossier (ex: avec un simple serveur local) et ouvrir `http://localhost:3000`.

Astuce: sur mac, avec Python: `python3 -m http.server 3000` (dans ce dossier).

## Déploiement (Vercel)
- Créez un nouveau projet et importez ce dossier.
- Définissez les variables d'environnement (si vous créez un `config.js` privé, servez-le via un secret) ou collez vos valeurs dans `config.example.js` pour le MVP.
- Build command: aucun (site statique). Output: racine.

## Modèle de données
Voir `sql/schema.sql` pour les tables et la vue `rides_view`.
- RLS activées, politiques dans `sql/policies.sql`.
- Trigger de notifications lors des insert/update de bookings.

## Données de seed
- 2 évènements, 5 trajets, 8 profils utilisateurs (UUID à remplacer par vos vrais `auth.users.id`).

## Notes RGPD
- Auth Supabase gère consentements de base. Pour suppression de compte (v2): supprimer `auth.users` + cascade profil/données.

## Roadmap v2 (idées)
- Notes/avis post-trajet
- Push notifications PWA (topic par évènement)
- Carte interactive (MapLibre)
- QR code rejoindre l’évènement
- Import CSV inscrits (organisateur)
