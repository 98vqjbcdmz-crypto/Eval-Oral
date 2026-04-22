import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://98vqjbcdmz-crypto.github.io';

const rewritePrompt = `Réécris le texte suivant de façon structurée, sobre et fidèle, sans inventer d'information.
Conserve uniquement les informations présentes.
Utilise une formulation professionnelle, concise et directement exploitable pour une fiche d'évaluation.
Trame :
1. Observation clinique
2. Justification / raisonnement
3. Point à consolider si nécessaire`;

app.use(express.json({ limit: '20kb' }));
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost')) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed'));
  }
}));

function extractResponseText(payload) {
  if (typeof payload.output_text === 'string') {
    return payload.output_text.trim();
  }

  const parts = [];
  for (const output of payload.output || []) {
    for (const content of output.content || []) {
      if (content.type === 'output_text' && content.text) {
        parts.push(content.text);
      }
    }
  }
  return parts.join('\n').trim();
}

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/rewrite', async (request, response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: 'OPENAI_API_KEY manquante côté serveur.' });
    return;
  }

  const text = String(request.body?.text || '').trim();
  const criterion = String(request.body?.criterion || '').trim();
  if (!text) {
    response.status(400).json({ error: 'Le texte à restructurer est vide.' });
    return;
  }
  if (text.length > 4000) {
    response.status(413).json({ error: 'Le texte est trop long pour cette aide rédactionnelle.' });
    return;
  }

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        instructions: rewritePrompt,
        input: `Item d'évaluation : ${criterion || 'Non précisé'}\n\nTexte à restructurer :\n${text}`,
        temperature: 0.2
      })
    });

    const payload = await openaiResponse.json();
    if (!openaiResponse.ok) {
      console.error(payload);
      response.status(502).json({ error: 'Erreur lors de l’appel OpenAI.' });
      return;
    }

    const rewrittenText = extractResponseText(payload);
    if (!rewrittenText) {
      response.status(502).json({ error: 'Réponse OpenAI vide.' });
      return;
    }

    response.json({ text: rewrittenText });
  } catch (error) {
    console.error(error);
    response.status(502).json({ error: 'Serveur de restructuration indisponible.' });
  }
});

app.listen(port, () => {
  console.log(`Aide rédactionnelle prête sur http://localhost:${port}`);
});
