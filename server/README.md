# Aide rédactionnelle locale

Ce serveur garde la clé OpenAI côté MacBook. La page GitHub appelle seulement `http://localhost:3000/api/rewrite`.

## Installation

```bash
cd server
npm install
cp .env.example .env
```

Ouvrir ensuite `server/.env` et remplacer `OPENAI_API_KEY` par la clé OpenAI.

## Lancer

```bash
npm start
```

La page GitHub peut ensuite utiliser les boutons `Structurer`.

Si le navigateur affiche `Load failed`, ouvrir plutôt le dashboard servi localement :

```text
http://localhost:3000/
```

Dans ce mode, la page et l'API utilisent la même adresse locale, ce qui évite les blocages navigateur entre GitHub Pages et `localhost`.

## Automator

Créer une application Automator avec l'action `Exécuter un script Shell` :

```bash
cd "/Users/simlbf/Downloads/oraux_ifmk_dashboard/server"
if ! curl -fsS "http://localhost:3000/health" >/dev/null 2>&1; then
  nohup /usr/local/bin/node server.js >/tmp/oraux-ifmk-server.log 2>&1 &
  sleep 2
fi
open -a Safari "http://localhost:3000/"
open -a Safari "http://localhost:3000/retro.html"
```

Pour arrêter le serveur, utiliser le bouton `Arrêter serveur local` dans le bloc `Vue d'ensemble` du dashboard local.

## Configuration utile

- `OPENAI_API_KEY` : clé OpenAI, jamais à committer.
- `OPENAI_MODEL` : modèle utilisé pour la restructuration.
- `ALLOWED_ORIGIN` : origine autorisée, par défaut `https://98vqjbcdmz-crypto.github.io`.
- `PORT` : port local, par défaut `3000`.

Si le serveur tourne sur un autre port, ouvrir la console du navigateur sur la page dashboard et exécuter :

```js
localStorage.setItem('oralApiBaseUrl', 'http://localhost:3001');
location.reload();
```
