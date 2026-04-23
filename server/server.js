import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(__dirname, '..');
const port = process.env.PORT || 3000;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://98vqjbcdmz-crypto.github.io';

const rewritePrompt = `Réécris le commentaire d'évaluation suivant de façon claire, professionnelle et fidèle, sans inventer d'information.

Cadre :
évaluation d'oral en IFMK, pour des étudiants en fin de licence. Le niveau attendu est méthodologique : capacité à organiser le raisonnement, justifier les choix, mobiliser les données du bilan et adapter la pratique au cas clinique.

Objectif :
- transformer des notes rapides d'évaluateur en commentaire exploitable pour une fiche d'oral IFMK ;
- conserver le sens, le niveau de réserve et les nuances du texte initial ;
- ne pas ajouter d'éléments cliniques, pédagogiques ou factuels absents du texte initial ;
- ne pas survaloriser ni dramatiser ;
- ne pas déduire une note ou un niveau si ce n'est pas explicitement mentionné.

Style attendu :
- phrases courtes ;
- ton sobre, évaluatif et bienveillant ;
- formulation précise, sans jugement de personne ;
- vocabulaire adapté à une évaluation de compétence en kinésithérapie ;
- éviter les formulations trop générales.

Contenu à intégrer si pertinent, sans faire apparaître de rubriques :
- l'observation principale ;
- les éléments satisfaisants ou pertinents ;
- les points à préciser, justifier ou améliorer.

Format de sortie :
- produire un commentaire court, en 1 à 3 phrases maximum ;
- rédiger en paragraphe continu ;
- ne pas utiliser de titre ;
- ne pas utiliser de Markdown ;
- ne pas utiliser de liste numérotée ;
- ne pas utiliser de gras ;
- ne pas écrire les intitulés "Ce qui est observé", "Ce qui est satisfaisant" ou "Ce qui reste à améliorer" ;
- ne pas nommer l'item, le critère ou le champ dans le commentaire ;
- ne pas commencer par "L'évaluation de...", "L'item...", "Le critère..." ou une formule équivalente ;
- rédiger directement sur ce que l'étudiant montre, réussit ou doit améliorer ;
- éviter les formulations longues ou scolaires ;
- privilégier une formulation directement utilisable dans une fiche d'évaluation.

Utilise les repères qualitatifs uniquement pour contextualiser la formulation.
Ne choisis pas la note.
Ne suggère pas un niveau qui n'est pas indiqué par le commentaire initial ou la note déjà sélectionnée.
Ne transforme pas une remarque mineure en défaut majeur.
Ne transforme pas une difficulté importante en simple détail.

Si le texte initial est très court, produire un commentaire très court.
Si une dimension n'est pas pertinente, ne pas la créer artificiellement.`;

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

function normalizeRubric(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

function buildRewriteInput({ criterion, score, max, focus, rubric, text, mode }) {
  const lines = [];
  lines.push(`Item d'évaluation : ${criterion || 'Non précisé'}`);
  if (mode === 'synthesis') {
    lines.push('Mode : générer une synthèse courte à partir des notes et commentaires des items déjà évalués.');
  }
  if (score) {
    lines.push(`Note sélectionnée pour l'item : ${score}${max ? ` / ${max}` : ''}`);
  } else {
    lines.push('Note sélectionnée pour l\'item : non renseignée');
  }
  if (focus) {
    lines.push(`Contexte de l'item : ${focus}`);
  }
  if (rubric.length) {
    lines.push('Repères qualitatifs condensés du barème :');
    rubric.forEach(item => lines.push(`- ${item}`));
  }
  lines.push('');
  lines.push(mode === 'synthesis' ? 'Éléments disponibles à synthétiser :' : 'Commentaire brut à restructurer :');
  lines.push(text);
  return lines.join('\n');
}

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.get(['/', '/index.html'], (_request, response) => {
  response.sendFile(path.join(publicRoot, 'index.html'));
});

app.get('/retro.html', (_request, response) => {
  response.sendFile(path.join(publicRoot, 'retro.html'));
});

app.get(['/app.js', '/config.js', '/logo-ifmk.png'], (request, response) => {
  response.sendFile(path.join(publicRoot, request.path));
});

app.use('/assets', express.static(path.join(publicRoot, 'assets'), {
  dotfiles: 'ignore',
  fallthrough: false
}));

app.post('/api/rewrite', async (request, response) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    response.status(500).json({ error: 'OPENAI_API_KEY manquante côté serveur.' });
    return;
  }

  const text = String(request.body?.text || '').trim();
  const criterion = String(request.body?.criterion || '').trim();
  const score = String(request.body?.score || '').trim();
  const max = String(request.body?.max || '').trim();
  const focus = String(request.body?.focus || '').trim();
  const mode = request.body?.mode === 'synthesis' ? 'synthesis' : 'rewrite';
  const rubric = normalizeRubric(request.body?.rubric);
  if (!text) {
    response.status(400).json({ error: mode === 'synthesis' ? 'Aucun item renseigné pour générer la synthèse.' : 'Le texte à restructurer est vide.' });
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
        input: buildRewriteInput({ criterion, score, max, focus, rubric, text, mode }),
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
