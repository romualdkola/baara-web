# Baara — back-office

Back-office web de Baara pour l'équipe : vérification des artisans, prestataires et clients, demandes et missions,
métiers, équipe. Angular 22 (composants autonomes, signaux), branché sur l'API v2 de
[TrustLinkApi](https://github.com/romualdkola/TrustLinkApi) (`/api/v2/admin`). Design : piste A « Chaleureux et local ».
L'espace prestataire (phase 5) viendra dans la même app.

## Écrans
- **Connexion** : e-mail et mot de passe, puis code de double authentification. À la première connexion, QR code à
  scanner dans une appli d'authentification. Un mot de passe provisoire (invitation, réinitialisation) doit être changé
  avant tout le reste.
- **Tableau de bord** : chiffres du jour, de 7 ou 30 jours, choses à traiter, dernières demandes.
- **Vérifications** : file des dossiers (les plus anciens d'abord), examen des pièces avec points de contrôle,
  validation ou refus motivé (le motif part au prestataire par SMS).
- **Prestataires** et **Clients** : listes filtrables, fiches, suspension, réactivation, notes internes, historique.
- **Demandes et missions** : toutes les demandes par étape, recherche par référence (BA-0412), détail avec propositions
  et étapes de la mission.
- **Métiers** : ajout, renommage, masquage.
- **Équipe** : invitation avec mot de passe provisoire affiché une fois, rôles, suspension, réinitialisation des accès.

Les droits suivent le rôle, comme dans l'API : le support consulte et annote, la modération décide (vérifications,
suspensions), le super admin gère les métiers et l'équipe.

## Lancer en développement
1. Démarrer l'API en local (dans TrustLinkApi). Le premier membre de l'équipe est créé au démarrage si l'équipe est
   vide :
   ```bash
   STAFF_EMAIL=admin@baara.local STAFF_PASSWORD=<12 caractères minimum> SMS_LOG_CONTENT=true ./mvnw spring-boot:run
   ```
2. Lancer le back-office, qui vise l'API sur `http://localhost:8082` :
   ```bash
   npm install
   npm start
   ```
3. Ouvrir http://localhost:4200 et se connecter. L'API accepte par défaut les appels venant de `localhost:4200` (CORS).

## Vérifier
```bash
npm test -- --watch=false
npm run build
```

## Production
Le `Dockerfile` construit l'app puis la sert avec nginx sur le port 80 (`deploy/nginx.conf`) : routes Angular
renvoyées vers `index.html`, fichiers versionnés mis en cache un an, `index.html` jamais, en-têtes de sécurité (dont
une CSP qui n'autorise que l'API de Baara et les polices Google). En ligne : https://admin-baara.grapeit.tech, déployé
par Dokploy depuis `main`.

```bash
docker build -t baara-web .
docker run -p 8090:80 baara-web
```

L'adresse de l'API est dans `src/environments/environment.ts` (et dans la CSP de `deploy/nginx.conf`). Côté API,
autoriser le domaine du back-office avec la variable `APP_CORS_ALLOWED_ORIGINS` dans l'environnement Dokploy (par
défaut, seul `http://localhost:4200` est accepté).

## Organisation du code
- `src/app/core` : session (jetons dans le stockage de l'onglet, renouvellement automatique), routes de l'API admin,
  modèles, gardes de navigation.
- `src/app/pages` : un dossier par écran.
- `src/app/shared` : montants, dates, statuts en français, tableau des demandes, actions sur un compte, historique.
