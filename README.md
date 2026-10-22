# Louve · Marché secondaire SCPI (Primopierre)

Application qui aide un client à analyser le marché secondaire de la SCPI **Primopierre** (Praemia REIM France) et à préparer un email d'achat à la société de gestion. Les quatre actions demandées et les deux bonus sont couverts.

**Démo : <https://louve-primopierre.onrender.com>** (hébergement gratuit : le premier chargement peut prendre 30 à 60 s).

## Lancer en local

Node.js ≥ 22 et npm.

```bash
npm install
npm run dev   # API http://localhost:3001 + interface http://localhost:5173
npm test      # core, serveur, interface
```

## Architecture

- `packages/core` : logique métier pure (frais, rendement, estimation de confrontation, email), testée et partagée par le serveur et le navigateur.
- `apps/server` : Express. Scraping de la page Praemia, cache 30 min, dernier instantané valide sur disque. Routes `GET /api/scpis`, `/api/scpis/:id`, `/api/scpis/:id/market` (`?refresh=1` pour forcer la mise à jour).
- `apps/web` : React + Vite.

Ajouter une SCPI = une entrée dans `apps/server/src/scpi/registry.ts` ; une autre société de gestion demande un nouveau parseur renvoyant le même format. Le parseur actuel lit déjà la page de Primovie (autre SCPI Praemia) sans modification.

## Sources

- Marché (prix, historique, carnet d'ordres, dates, valeur de réalisation) : [page officielle Primopierre](https://www.praemiareim.fr/fr/scpi-primopierre), scrapée.
- Frais (4,80 % + 5 %, frais fixes 90 € TTC), règle de confrontation, contact : [mandat d'achat 08/2026](https://www.praemiareim.fr/documents/14836074/1099398036/PRIMOPIERRE%20-%20Mandat%20d'achat%20-%20Personne%20Physique/dc631e45-bbdd-40fa-23b6-9d52b2160104).
- Dividende brut 2025 (4,56 €/part) et données de contexte : bulletins trimestriels (T4 2025, [T2 2026](https://www.praemiareim.fr/documents/14836074/14836287/PRAEMIA_BTI_Primopierre_T2_2026_VDEF.pdf/97936dbf-e24c-ed99-8b83-a62abece978d)), saisis à la main avec leur source.

## Choix et hypothèses

- Rendement frais inclus = dividende brut 2025 ÷ (dernier prix × 1,098), soit 13,03 % à 31,88 €.
- Frais fixes : les 90 € TTC par dossier du mandat, modifiables dans le registre.
- Estimation : règles du mandat (plus grand volume, puis moins de parts non échangées, puis prix le plus proche du dernier). Le client est supposé dernier à son niveau de prix pour savoir s'il serait servi.
- Comparaisons en prix hors frais. L'email donne le prix maximum hors frais, avec son équivalent frais inclus demandé par le mandat.

## Fiabilité

Le parseur repère les données par libellés et échoue explicitement si la page change. Chaque instantané est contrôlé (prix positifs, prix frais inclus cohérents avec nos frais). En cas d'échec, l'application affiche les dernières données valides avec un bandeau daté.

## Limites

- Seuls les 5 meilleurs niveaux du carnet sont publiés, et le carnet évolue jusqu'à la date limite.
- Le rendement est rétrospectif : les acomptes 2026 sont plus bas.
- Dividende et données des bulletins à mettre à jour à la main.

## Temps consacré et utilisation de l'IA

Environ 3 heures.

J'ai utilisé Claude Code pour m'aider à écrire le code et les tests. J'ai contesté plusieurs choix d'interface (présentation refaite, deux simulateurs fusionnés en un seul ordre partagé).

Exemple de proposition corrigée : en cas d'égalité, le plan proposé par l'IA retenait le prix le plus haut ; le mandat officiel retient le prix le plus proche du dernier prix d'exécution. J'ai corrigé l'algorithme.
