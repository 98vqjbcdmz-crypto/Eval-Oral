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
