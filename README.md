# Sang Noir Online — Supabase v17

Cette version ajoute :

- Connexion Discord via Supabase Auth.
- Onglet Admin accessible uniquement aux profils avec `role = 'admin'`.
- Gestion des images depuis le site :
  - ajouter une image ;
  - remplacer une image en réutilisant la même clé ;
  - supprimer une image ;
  - classer par catégorie : avatar, boutique, rôle, ADN, fond, interface, autre.
- Association d’images aux objets de la boutique.
- Gestion des comptes autorisés :
  - passer un compte en admin ;
  - retirer l’admin.
- Bucket Supabase Storage `sang-noir-assets`.

## 1. SQL à exécuter

Dans Supabase → SQL Editor → New Query, colle le contenu de :

```text
supabase/migration_v17_discord_admin_media.sql
```

Puis clique sur Run.

## 2. Te donner l’accès admin

Après avoir créé ton compte sur le site, exécute dans Supabase SQL Editor :

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'rttyrttyttttt@gmail.com'
);
```

Si ton email de compte est différent, remplace-le.

## 3. Activer Discord

Dans Supabase :

1. Va dans Authentication.
2. Va dans Providers.
3. Active Discord.
4. Crée une application dans Discord Developer Portal.
5. Copie le Client ID et Client Secret dans Supabase.
6. Ajoute l’URL callback Supabase dans Discord OAuth2.

L’URL callback ressemble à :

```text
https://TON-PROJET.supabase.co/auth/v1/callback
```

## 4. URL Configuration Supabase

Dans Authentication → URL Configuration :

Site URL :

```text
https://sang-noir-online.vercel.app
```

Redirect URLs :

```text
https://sang-noir-online.vercel.app/**
http://localhost:5173/**
```

## 5. Déploiement

```bash
git add .
git commit -m "Ajoute Discord et panel admin images"
git push
```

Vercel redéploiera automatiquement.

## Important

La gestion des images utilise Supabase Storage. Les images sont publiques en lecture, mais seuls les admins peuvent les ajouter/remplacer/supprimer.
