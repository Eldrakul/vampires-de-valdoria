# Vampires de Valdoria v18

Version corrigée et nettoyée.

## Ce que cette version corrige

- Le panneau Créer/Rejoindre disparaît quand le joueur est déjà dans une partie.
- Le bouton Lancer disparaît après le début de la partie.
- Impossible de lancer plusieurs fois la même partie.
- Ajout d’un bouton Quitter la partie.
- Affichage clair de la phase actuelle : lobby, jour, nuit, terminé.
- Ajout d’un vrai panneau Actions selon la phase et le rôle.
- Actions de jour : vote.
- Actions de nuit :
  - Vampire : mordre / drainer.
  - Médecin : protéger.
  - Prêtre : bénir.
  - Généticien : analyser l’ADN.
  - Enquêteur : inspecter.
  - Humain : dormir.
- Résolution de nuit améliorée.
- Les bots votent et agissent automatiquement.
- Le mode entraînement est moins violent.
- Onglet Admin visible seulement aux comptes `role = admin`.
- Gestion des admins directement depuis le site une fois le premier admin créé.
- Gestion des images via Supabase Storage.
- Association d’images aux objets boutique.
- Nom du jeu remplacé par **Vampires de Valdoria**.

## SQL à exécuter

Dans Supabase → SQL Editor → New Query, colle tout le contenu de :

```text
supabase/migration_v18_game_admin_fix.sql
```

Puis clique sur Run.

## Premier admin

Une seule fois, après avoir créé ton compte, exécute dans Supabase SQL Editor :

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'TON_EMAIL'
);
```

Ensuite, tu peux gérer les autres admins directement depuis l’onglet Admin du site.

## Déploiement

```bash
git add .
git commit -m "Vampires de Valdoria v18"
git push
```

Vercel redéploiera automatiquement.

## Variables Vercel

```env
VITE_SUPABASE_URL=https://konipfqbzmlqaivvxszt.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```
