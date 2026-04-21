
const STORAGE_KEY = 'ifmk-oraux-dashboard-v1';
const BACKUP_STORAGE_KEY = 'ifmk-oraux-dashboard-backup-v1';

const initialState = () => ({
  config: {
    studentsRaw: '',
    casesRaw: ''
  },
  phase: 'setup', // setup | bootstrap | live
  queue: [],
  originalCases: [],
  availableCases: [],
  usedCases: [],
  history: [],
  submittedEvaluations: [],
  bootstrap: {
    A: null,
    B: null
  },
  roles: {
    current: null,
    prep: null,
    nextPrep: null,
    patient: null
  },
  timers: {
    current: { duration: 600, remaining: 600, running: false, finished: false },
    prep: { duration: 900, remaining: 900, running: false, finished: false },
    nextPrep: { duration: 900, remaining: 900, running: false, finished: false },
    bootA: { duration: 900, remaining: 900, running: false, finished: false },
    bootB: { duration: 900, remaining: 900, running: false, finished: false }
  },
  pendingDraw: null,
  drawPreview: null,
  currentEvaluation: null,
  editingEvaluation: null,
  sessionLoadedAt: null,
  awaitingBootstrapSwap: false
});

let state = initialState();
let intervals = {};
let modalSpinInterval = null;
let modalFinalCase = null;
let modalPool = [];

const EVALUATION_CRITERIA = [
  {
    id: 'bilans',
    label: 'Évaluation (bilans) C1 et C4',
    image: 'assets/grille-items/bilans.png',
    max: 5,
    levels: [
      { value: '5', label: '5 - Praticien expérimenté' },
      { value: '3.75', label: '3,75 - Praticien avancé' },
      { value: '2.5', label: '2,5 - Praticien intermédiaire' },
      { value: '1.25', label: '1,25 - Novice avancé' },
      { value: '0', label: '0 - Novice' }
    ]
  },
  {
    id: 'technique',
    label: 'Pratique technique C1, C2 et C4',
    image: 'assets/grille-items/technique.png',
    max: 5,
    levels: [
      { value: '5', label: '5 - Praticien expérimenté' },
      { value: '3.75', label: '3,75 - Praticien avancé' },
      { value: '2.5', label: '2,5 - Praticien intermédiaire' },
      { value: '1.25', label: '1,25 - Novice avancé' },
      { value: '0', label: '0 - Novice' }
    ]
  },
  {
    id: 'cif',
    label: 'Classification internationale du fonctionnement C1 et C4',
    image: 'assets/grille-items/cif.png',
    max: 5,
    levels: [
      { value: '5', label: '5 - Praticien expérimenté' },
      { value: '3.75', label: '3,75 - Praticien avancé' },
      { value: '2.5', label: '2,5 - Praticien intermédiaire' },
      { value: '1.25', label: '1,25 - Novice avancé' },
      { value: '0', label: '0 - Novice' }
    ]
  },
  {
    id: 'objectif',
    label: 'Objectif spécifique C2 et C4',
    image: 'assets/grille-items/objectif.png',
    max: 3,
    levels: [
      { value: '3', label: '3 - Praticien expérimenté' },
      { value: '2.25', label: '2,25 - Praticien avancé' },
      { value: '1.5', label: '1,5 - Praticien intermédiaire' },
      { value: '0.75', label: '0,75 - Novice avancé' },
      { value: '0', label: '0 - Novice' }
    ]
  },
  {
    id: 'communication',
    label: 'Attitude et communication C5',
    image: 'assets/grille-items/communication.png',
    max: 2,
    levels: [
      { value: '2', label: '2 - Praticien expérimenté' },
      { value: '1.5', label: '1,5 - Praticien avancé' },
      { value: '1', label: '1 - Praticien intermédiaire' },
      { value: '0.5', label: '0,5 - Novice avancé' },
      { value: '0', label: '0 - Novice' }
    ]
  }
];

const els = {
  logoImage: document.getElementById('logoImage'),
  logoFallback: document.getElementById('logoFallback'),
  clockTime: document.getElementById('clockTime'),
  clockDate: document.getElementById('clockDate'),
  studentsInput: document.getElementById('studentsInput'),
  casesInput: document.getElementById('casesInput'),
  loadSessionBtn: document.getElementById('loadSessionBtn'),
  saveSessionBtn: document.getElementById('saveSessionBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),
  restoreBackupBtn: document.getElementById('restoreBackupBtn'),
  initialPanel: document.getElementById('initialPanel'),
  initialHelp: document.getElementById('initialHelp'),
  initialEmpty: document.getElementById('initialEmpty'),
  initialReady: document.getElementById('initialReady'),
  bootAName: document.getElementById('bootAName'),
  bootBName: document.getElementById('bootBName'),
  bootACase: document.getElementById('bootACase'),
  bootBCase: document.getElementById('bootBCase'),
  bootAId: document.getElementById('bootAId'),
  bootBId: document.getElementById('bootBId'),
  bootADrawBtn: document.getElementById('bootADrawBtn'),
  bootBDrawBtn: document.getElementById('bootBDrawBtn'),
  bootAStartPrepBtn: document.getElementById('bootAStartPrepBtn'),
  bootBStartPrepBtn: document.getElementById('bootBStartPrepBtn'),
  bootATimerBlock: document.getElementById('bootATimerBlock'),
  bootBTimerBlock: document.getElementById('bootBTimerBlock'),
  bootATimerValue: document.getElementById('bootATimerValue'),
  bootBTimerValue: document.getElementById('bootBTimerValue'),
  bootATimerBar: document.getElementById('bootATimerBar'),
  bootBTimerBar: document.getElementById('bootBTimerBar'),
  startWithABtn: document.getElementById('startWithABtn'),
  startWithBBtn: document.getElementById('startWithBBtn'),
  queueList: document.getElementById('queueList'),
  historyList: document.getElementById('historyList'),
  currentName: document.getElementById('currentName'),
  currentCase: document.getElementById('currentCase'),
  currentIdentityBadge: document.getElementById('currentIdentityBadge'),
  currentTimerBlock: document.getElementById('currentTimerBlock'),
  currentTimerValue: document.getElementById('currentTimerValue'),
  currentTimerBar: document.getElementById('currentTimerBar'),
  startCurrentTimerBtn: document.getElementById('startCurrentTimerBtn'),
  pauseCurrentTimerBtn: document.getElementById('pauseCurrentTimerBtn'),
  resetCurrentTimerBtn: document.getElementById('resetCurrentTimerBtn'),
  submitExamBtn: document.getElementById('submitExamBtn'),
  evaluationPanel: document.getElementById('evaluationPanel'),
  evaluationMeta: document.getElementById('evaluationMeta'),
  evaluationScore: document.getElementById('evaluationScore'),
  evaluationCaseTitle: document.getElementById('evaluationCaseTitle'),
  evaluationIdChecked: document.getElementById('evaluationIdChecked'),
  evaluationItems: document.getElementById('evaluationItems'),
  positivePoints: document.getElementById('positivePoints'),
  improvementAreas: document.getElementById('improvementAreas'),
  lowScoreComment: document.getElementById('lowScoreComment'),
  prepName: document.getElementById('prepName'),
  prepCase: document.getElementById('prepCase'),
  prepIdentityBadge: document.getElementById('prepIdentityBadge'),
  prepIdCheckbox: document.getElementById('prepIdCheckbox'),
  prepTimerBlock: document.getElementById('prepTimerBlock'),
  prepTimerValue: document.getElementById('prepTimerValue'),
  prepTimerBar: document.getElementById('prepTimerBar'),
  drawPrepBtn: document.getElementById('drawPrepBtn'),
  startPrepTimerBtn: document.getElementById('startPrepTimerBtn'),
  pausePrepTimerBtn: document.getElementById('pausePrepTimerBtn'),
  resetPrepTimerBtn: document.getElementById('resetPrepTimerBtn'),
  nextPrepPanel: document.getElementById('nextPrepPanel'),
  nextPrepName: document.getElementById('nextPrepName'),
  nextPrepCase: document.getElementById('nextPrepCase'),
  nextPrepIdentityBadge: document.getElementById('nextPrepIdentityBadge'),
  nextPrepIdCheckbox: document.getElementById('nextPrepIdCheckbox'),
  nextPrepTimerBlock: document.getElementById('nextPrepTimerBlock'),
  nextPrepTimerValue: document.getElementById('nextPrepTimerValue'),
  nextPrepTimerBar: document.getElementById('nextPrepTimerBar'),
  enterNextPrepBtn: document.getElementById('enterNextPrepBtn'),
  drawNextPrepBtn: document.getElementById('drawNextPrepBtn'),
  startNextPrepTimerBtn: document.getElementById('startNextPrepTimerBtn'),
  pauseNextPrepTimerBtn: document.getElementById('pauseNextPrepTimerBtn'),
  resetNextPrepTimerBtn: document.getElementById('resetNextPrepTimerBtn'),
  patientName: document.getElementById('patientName'),
  patientNote: document.getElementById('patientNote'),
  nextTurnBtn: document.getElementById('nextTurnBtn'),
  swapBootstrapBtn: document.getElementById('swapBootstrapBtn'),
  overviewStatus: document.getElementById('overviewStatus'),
  casesLeft: document.getElementById('casesLeft'),
  nextStudentPreview: document.getElementById('nextStudentPreview'),
  restoreCasesBtn: document.getElementById('restoreCasesBtn'),
  pauseEvaluationsBtn: document.getElementById('pauseEvaluationsBtn'),
  dailySummaryBtn: document.getElementById('dailySummaryBtn'),
  downloadSessionBtn: document.getElementById('downloadSessionBtn'),
  footerState: document.getElementById('footerState'),
  drawModal: document.getElementById('drawModal'),
  drawTarget: document.getElementById('drawTarget'),
  drawCaseBox: document.getElementById('drawCaseBox'),
  confirmDrawBtn: document.getElementById('confirmDrawBtn'),
  cancelDrawBtn: document.getElementById('cancelDrawBtn'),
  criterionPreviewModal: document.getElementById('criterionPreviewModal'),
  criterionPreviewTitle: document.getElementById('criterionPreviewTitle'),
  criterionPreviewImage: document.getElementById('criterionPreviewImage'),
  closeCriterionPreviewBtn: document.getElementById('closeCriterionPreviewBtn')
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function normalizeLines(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const min = Math.floor(safe / 60).toString().padStart(2, '0');
  const sec = Math.floor(safe % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function updateClock() {
  const now = new Date();
  els.clockTime.textContent = now.toLocaleTimeString('fr-FR');
  els.clockDate.textContent = now.toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function saveState(silent = false) {
  updateRunningTimers();
  syncAvailableCases();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!silent) {
    els.footerState.textContent = 'Session sauvegardée.';
  }
}

function getBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Impossible de relire la sauvegarde de secours', error);
    return null;
  }
}

function updateBackupButton() {
  els.restoreBackupBtn.disabled = !getBackup();
}

function createResetBackup() {
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    state: clone(state)
  }));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = Object.assign(initialState(), parsed);
    state.bootstrap = Object.assign({ A: null, B: null }, state.bootstrap || {});
    state.roles = Object.assign({ current: null, prep: null, nextPrep: null, patient: null }, state.roles || {});
    state.timers = Object.assign(initialState().timers, state.timers || {});
    state.drawPreview = state.drawPreview || null;
    state.currentEvaluation = state.currentEvaluation || null;
    state.editingEvaluation = state.editingEvaluation || null;
    state.submittedEvaluations = state.submittedEvaluations || [];
    if (typeof state.awaitingBootstrapSwap !== 'boolean') {
      state.awaitingBootstrapSwap = false;
    }
    syncAvailableCases();
  } catch (error) {
    console.error('Impossible de relire la session locale', error);
  }
}

function restoreBackup() {
  const backup = getBackup();
  if (!backup?.state) {
    alert('Aucune sauvegarde de secours disponible.');
    updateBackupButton();
    return;
  }
  const ok = confirm('Restaurer la dernière sauvegarde de secours ? La session actuelle sera remplacée.');
  if (!ok) return;
  Object.keys(intervals).forEach(key => stopTimer(key, true));
  state = Object.assign(initialState(), backup.state);
  state.bootstrap = Object.assign({ A: null, B: null }, state.bootstrap || {});
  state.roles = Object.assign({ current: null, prep: null, nextPrep: null, patient: null }, state.roles || {});
  state.timers = Object.assign(initialState().timers, state.timers || {});
  state.drawPreview = state.drawPreview || null;
  syncAvailableCases();
  saveState(true);
  render();
  const savedAt = backup.savedAt ? new Date(backup.savedAt).toLocaleString('fr-FR') : 'date inconnue';
  showToast(`Sauvegarde de secours restaurée (${savedAt}).`);
}

function showToast(message) {
  els.footerState.textContent = message;
}

function beep(times = 1) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    let start = ctx.currentTime;
    for (let i = 0; i < times; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i % 2 === 0 ? 880 : 660;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.27);
      start += 0.32;
    }
  } catch (error) {
    console.warn('Beep non disponible', error);
  }
}

function startTimer(key) {
  clearTimerInterval(key);
  const timer = state.timers[key];
  if (!timer) return;
  updateRunningTimer(key);
  if (timer.remaining <= 0) {
    timer.remaining = timer.duration;
  }
  if (key === 'current') {
    ensureCurrentEvaluation();
  }
  timer.running = true;
  timer.finished = false;
  timer.startedAt = Date.now();
  timer.remainingAtStart = timer.remaining;
  timer.endsAt = Date.now() + (timer.remaining * 1000);
  timer.notifiedFinished = false;
  render();
  saveState();
}

function clearTimerInterval(key) {
  if (intervals[key]) {
    clearInterval(intervals[key]);
    delete intervals[key];
  }
}

function stopTimer(key, silent = false) {
  updateRunningTimer(key);
  clearTimerInterval(key);
  if (state.timers[key] && !silent) {
    state.timers[key].running = false;
    state.timers[key].startedAt = null;
    state.timers[key].remainingAtStart = state.timers[key].remaining;
    state.timers[key].endsAt = null;
  }
  if (!silent) {
    render();
    saveState();
  }
}

function resetTimer(key, silent = false) {
  stopTimer(key, true);
  const timer = state.timers[key];
  if (!timer) return;
  timer.remaining = timer.duration;
  timer.finished = false;
  timer.running = false;
  timer.startedAt = null;
  timer.remainingAtStart = timer.duration;
  timer.endsAt = null;
  timer.notifiedFinished = false;
  if (!silent) {
    render();
    saveState();
  }
}

function timerLabel(key) {
  return ({
    current: 'oral en cours',
    prep: 'préparation en cours',
    nextPrep: 'préparation suivante',
    bootA: 'préparation étudiant A',
    bootB: 'préparation étudiant B'
  })[key] || key;
}

function applyTimerVisual(timer, blockEl, valueEl, barEl) {
  updateRunningTimers();
  valueEl.textContent = formatTime(timer.remaining);
  blockEl.classList.remove('running', 'warning', 'finished');
  if (timer.running) blockEl.classList.add('running');
  if (timer.finished || timer.remaining === 0) blockEl.classList.add('finished');
  else if (timer.remaining <= 60) blockEl.classList.add('warning');
  const pct = Math.max(0, Math.min(100, (timer.remaining / timer.duration) * 100));
  barEl.style.width = `${pct}%`;
}

function updateRunningTimer(key) {
  const timer = state.timers[key];
  if (!timer?.running) return timer;
  if (!timer.endsAt && timer.startedAt) {
    const base = Number.isFinite(timer.remainingAtStart) ? timer.remainingAtStart : timer.remaining;
    timer.endsAt = timer.startedAt + (base * 1000);
  }
  if (!timer.endsAt) return timer;
  timer.remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  if (timer.remaining <= 0) {
    timer.remaining = 0;
    timer.running = false;
    timer.finished = true;
    timer.startedAt = null;
    timer.remainingAtStart = 0;
    timer.endsAt = null;
    if (!timer.notifiedFinished) {
      timer.notifiedFinished = true;
      beep(3);
      showToast(`Temps terminé : ${timerLabel(key)}.`);
    }
  }
  return timer;
}

function updateRunningTimers() {
  Object.keys(state.timers || {}).forEach(updateRunningTimer);
}

function buildStudent(name) {
  return {
    type: 'student',
    name,
    caseTitle: null,
    idChecked: false,
    hasPassed: false
  };
}

function buildPauseMarker(label = 'Pause') {
  return {
    type: 'pause',
    name: label
  };
}

function isPauseLine(value) {
  return String(value || '').trim().toLowerCase() === 'pause';
}

function isPauseMarker(item) {
  return item?.type === 'pause' || isPauseLine(item?.name);
}

function buildQueueItem(line) {
  return isPauseLine(line) ? buildPauseMarker(line) : buildStudent(line);
}

function shiftNextStudent() {
  if (state.queue.length && isPauseMarker(state.queue[0])) return null;
  return state.queue.shift() || null;
}

function countQueuedStudents(items = state.queue) {
  return items.filter(item => !isPauseMarker(item)).length;
}

function nextQueueLabel() {
  const next = state.queue[0];
  if (!next) return '';
  return isPauseMarker(next) ? 'Pause évaluateur planifiée' : next.name;
}

function canEnterNextStudent() {
  return !!state.queue.length && !isPauseMarker(state.queue[0]);
}

function getStudentByTarget(target) {
  if (target === 'bootstrapA') return state.bootstrap.A;
  if (target === 'bootstrapB') return state.bootstrap.B;
  if (target === 'prep') return state.roles.prep;
  if (target === 'nextPrep') return state.roles.nextPrep;
  return null;
}

function getUrnCases(target = null) {
  const targetStudent = typeof target === 'string' ? getStudentByTarget(target) : target;
  if (state.phase === 'bootstrap') {
    const bootstrapCases = [state.bootstrap.A, state.bootstrap.B]
      .filter(student => student && student !== targetStudent)
      .map(student => student.caseTitle)
      .filter(Boolean);
    return state.originalCases.filter(caseTitle => !bootstrapCases.includes(caseTitle));
  }
  const currentCase = state.phase === 'live' ? state.roles.current?.caseTitle : null;
  if (!currentCase || targetStudent === state.roles.current) {
    return clone(state.originalCases);
  }
  return state.originalCases.filter(caseTitle => caseTitle !== currentCase);
}

function syncAvailableCases() {
  state.availableCases = clone(getUrnCases());
  if (state.phase === 'bootstrap') {
    state.usedCases = [state.bootstrap.A?.caseTitle, state.bootstrap.B?.caseTitle].filter(Boolean);
  } else {
    state.usedCases = state.phase === 'live' && state.roles.current?.caseTitle
      ? [state.roles.current.caseTitle]
      : [];
  }
}

function recalculateUrn() {
  syncAvailableCases();
  render();
  saveState();
  showToast('Urne recalculée : seul le cas du passage en cours est retiré.');
}

function pauseEvaluations() {
  if (state.phase !== 'live') {
    alert('La pause des évaluations est disponible pendant une session en cours.');
    return;
  }
  const ok = confirm('Mettre en pause les évaluations et repartir ensuite avec deux étudiants en préparation, comme au démarrage ? Terminez le passage en cours avant de l’utiliser.');
  if (!ok) return;
  const candidates = [state.roles.prep, state.roles.nextPrep, ...state.queue]
    .filter(item => item && !isPauseMarker(item));
  if (candidates.length < 2) {
    alert('Il faut au moins deux étudiants restants pour relancer un binôme de préparation après la pause.');
    return;
  }
  Object.keys(intervals).forEach(key => stopTimer(key));
  state.phase = 'bootstrap';
  state.bootstrap.A = candidates.shift();
  state.bootstrap.B = candidates.shift();
  state.queue = candidates;
  state.roles.current = null;
  state.roles.patient = null;
  state.roles.prep = null;
  state.roles.nextPrep = null;
  state.currentEvaluation = null;
  state.awaitingBootstrapSwap = false;
  ['current', 'prep', 'nextPrep', 'bootA', 'bootB'].forEach(key => resetTimer(key, true));
  syncAvailableCases();
  render();
  saveState();
  showToast('Pause évaluateur activée. Reprise avec deux étudiants en préparation.');
}

function resumeBootstrapAfterPause() {
  const candidates = [state.roles.prep, state.roles.nextPrep, ...state.queue]
    .filter(item => item && !isPauseMarker(item));
  if (candidates.length < 2) return false;
  Object.keys(intervals).forEach(key => stopTimer(key));
  state.phase = 'bootstrap';
  state.bootstrap.A = candidates.shift();
  state.bootstrap.B = candidates.shift();
  state.queue = candidates;
  state.roles.current = null;
  state.roles.patient = null;
  state.roles.prep = null;
  state.roles.nextPrep = null;
  state.currentEvaluation = null;
  state.awaitingBootstrapSwap = false;
  ['current', 'prep', 'nextPrep', 'bootA', 'bootB'].forEach(key => resetTimer(key, true));
  syncAvailableCases();
  render();
  saveState();
  showToast('Pause planifiée atteinte. Reprise avec deux étudiants en préparation.');
  return true;
}

function consumeScheduledPauseAndResume() {
  if (!state.queue.length || !isPauseMarker(state.queue[0])) return false;
  state.queue.shift();
  return resumeBootstrapAfterPause();
}

function drawCaseFor(target) {
  const student = getStudentByTarget(target);
  if (!student) {
    alert('Aucun étudiant disponible pour ce tirage.');
    return;
  }
  if (student.caseTitle) {
    alert('Cet étudiant a déjà un cas attribué.');
    return;
  }

  const pool = getUrnCases(target);
  if (!pool.length) {
    alert('Aucun cas clinique disponible dans l\'urne pour ce tirage.');
    return;
  }

  state.pendingDraw = target;
  openDrawModal(student.name, pool);
}

function openDrawModal(studentName, pool) {
  if (!pool.length) {
    alert('Aucun cas clinique disponible.');
    return;
  }
  modalPool = clone(pool);
  els.drawTarget.textContent = `Étudiant concerné : ${studentName}`;
  els.drawModal.classList.remove('hidden');
  els.drawModal.setAttribute('aria-hidden', 'false');
  let ticks = 0;
  modalFinalCase = modalPool[Math.floor(Math.random() * modalPool.length)];
  state.drawPreview = {
    active: true,
    target: state.pendingDraw,
    studentName,
    caseTitle: 'Préparation du tirage...',
    final: false,
    updatedAt: new Date().toISOString()
  };
  saveState(true);
  clearInterval(modalSpinInterval);
  modalSpinInterval = setInterval(() => {
    const sample = modalPool[Math.floor(Math.random() * modalPool.length)];
    els.drawCaseBox.textContent = sample;
    state.drawPreview = {
      active: true,
      target: state.pendingDraw,
      studentName,
      caseTitle: sample,
      final: false,
      updatedAt: new Date().toISOString()
    };
    saveState(true);
    ticks += 1;
    if (ticks > 18) {
      clearInterval(modalSpinInterval);
      els.drawCaseBox.textContent = modalFinalCase;
      state.drawPreview = {
        active: true,
        target: state.pendingDraw,
        studentName,
        caseTitle: modalFinalCase,
        final: true,
        updatedAt: new Date().toISOString()
      };
      saveState(true);
    }
  }, 80);
}

function closeDrawModal() {
  clearInterval(modalSpinInterval);
  modalSpinInterval = null;
  modalFinalCase = null;
  modalPool = [];
  state.pendingDraw = null;
  state.drawPreview = null;
  els.drawModal.classList.add('hidden');
  els.drawModal.setAttribute('aria-hidden', 'true');
  saveState(true);
}

function openCriterionPreview(itemId) {
  const item = EVALUATION_CRITERIA.find(criterion => criterion.id === itemId);
  if (!item) return;
  els.criterionPreviewTitle.textContent = `${item.label} / ${item.max}`;
  els.criterionPreviewImage.src = item.image;
  els.criterionPreviewImage.alt = item.label;
  els.criterionPreviewModal.classList.remove('hidden');
  els.criterionPreviewModal.setAttribute('aria-hidden', 'false');
}

function closeCriterionPreview() {
  els.criterionPreviewModal.classList.add('hidden');
  els.criterionPreviewModal.setAttribute('aria-hidden', 'true');
  els.criterionPreviewImage.removeAttribute('src');
  els.criterionPreviewImage.alt = '';
}

function confirmDraw() {
  if (!state.pendingDraw || !modalFinalCase) return;
  const targetStudent = getStudentByTarget(state.pendingDraw);
  if (!targetStudent) return;

  targetStudent.caseTitle = modalFinalCase;
  const label = targetStudent.name;
  closeDrawModal();
  syncAvailableCases();
  render();
  saveState();
  showToast(`Cas attribué à ${label}. Il sera retiré de l'urne seulement pendant son passage.`);
}

function loadSessionFromInputs() {
  const students = normalizeLines(els.studentsInput.value);
  const cases = normalizeLines(els.casesInput.value);

  if (students.filter(line => !isPauseLine(line)).length < 2) {
    alert('Il faut au moins 2 étudiants pour démarrer le premier binôme.');
    return;
  }
  if (students.slice(0, 2).some(isPauseLine)) {
    alert('Place la première ligne PAUSE après les deux premiers étudiants du binôme de démarrage.');
    return;
  }
  if (cases.length < 1) {
    alert('Ajoute au moins un cas clinique.');
    return;
  }

  Object.keys(intervals).forEach(key => stopTimer(key, true));
  state = initialState();
  state.config.studentsRaw = els.studentsInput.value.trim();
  state.config.casesRaw = els.casesInput.value.trim();
  state.queue = students.map(buildQueueItem);
  state.originalCases = clone(cases);
  state.sessionLoadedAt = new Date().toISOString();
  state.phase = 'bootstrap';
  state.bootstrap.A = shiftNextStudent();
  state.bootstrap.B = shiftNextStudent();
  syncAvailableCases();
  render();
  saveState();
  showToast('Session chargée.');
}

function startLive(firstCurrentKey) {
  const current = firstCurrentKey === 'A' ? state.bootstrap.A : state.bootstrap.B;
  const patient = firstCurrentKey === 'A' ? state.bootstrap.B : state.bootstrap.A;

  if (!current || !patient) {
    alert('Le premier binôme n\'est pas prêt.');
    return;
  }
  if (!current.caseTitle || !patient.caseTitle) {
    const ok = confirm('Un des deux cas cliniques n\'a pas été tiré. Continuer quand même ?');
    if (!ok) return;
  }

  stopTimer('bootA');
  stopTimer('bootB');

  state.roles.current = clone(current);
  state.roles.patient = clone(patient);
  state.roles.prep = shiftNextStudent();
  state.phase = 'live';
  state.awaitingBootstrapSwap = true;
  resetTimer('current', true);
  resetTimer('prep', true);
  syncAvailableCases();
  render();
  saveState();
  showToast(`Oral lancé : ${state.roles.current.name} passe. Le second étudiant du binôme initial passera juste après.`);
}

function archiveCurrentPassage() {
  if (!state.roles.current) return;
  const submitted = findSubmittedEvaluationForStudent(state.roles.current);
  const evaluation = state.currentEvaluation
    ? clone(state.currentEvaluation)
    : (submitted ? clone(submitted) : null);
  const score = Number.isFinite(Number(evaluation?.score)) ? Number(evaluation.score) : (evaluation ? calculateEvaluationScore(evaluation) : null);
  upsertHistoryEntry({
    key: evaluation?.key || submitted?.key || passageKey(state.roles.current),
    name: state.roles.current.name,
    caseTitle: state.roles.current.caseTitle || 'Cas non renseigné',
    idChecked: !!state.roles.current.idChecked,
    evaluation,
    score,
    endedAt: new Date().toISOString()
  });
  state.currentEvaluation = null;
  state.editingEvaluation = null;
}

function swapInitialRoles() {
  if (state.phase !== 'live' || !state.awaitingBootstrapSwap) {
    alert('Cette action sert uniquement à faire passer le second étudiant du binôme initial après le tout premier oral.');
    return;
  }
  if (!state.roles.current || !state.roles.patient) {
    alert('Le binôme initial n\'est pas complet.');
    return;
  }

  finishAndAdvancePassage({ archive: true });
}

function enterNextPrep() {
  if (state.phase !== 'live') {
    alert('L’entrée suivante est disponible après le lancement du premier oral.');
    return;
  }
  if (state.roles.nextPrep) {
    alert('Un étudiant suivant est déjà entré en préparation.');
    return;
  }
  if (!canEnterNextStudent()) {
    alert('Aucun étudiant en attente.');
    return;
  }
  state.roles.nextPrep = shiftNextStudent();
  resetTimer('nextPrep', true);
  syncAvailableCases();
  render();
  saveState();
  showToast(`${state.roles.nextPrep.name} entre en préparation. Le chrono du préparant actuel continue.`);
}

function rotateTurn() {
  if (!state.roles.current) {
    alert('Aucun oral en cours.');
    return;
  }

  if (state.awaitingBootstrapSwap) {
    alert('Pour le premier binôme, utilisez d\'abord le bouton “Faire passer l\'autre du binôme initial”.');
    return;
  }

  finishAndAdvancePassage({ archive: true });
}

function finishAndAdvancePassage({ archive = true } = {}) {
  if (!state.roles.current) return;

  stopTimer('current');
  if (archive) {
    archiveCurrentPassage();
  }

  if (state.awaitingBootstrapSwap) {
    const previousCurrent = clone(state.roles.current);
    previousCurrent.hasPassed = true;
    const previousPatient = clone(state.roles.patient);

    state.roles.patient = previousCurrent;
    state.roles.current = previousPatient;
    state.awaitingBootstrapSwap = false;
    resetTimer('current', true);
    syncAvailableCases();
    render();
    saveState();
    showToast(`Passage terminé : ${state.roles.current.name} est prêt à passer. L'étudiant en préparation conserve son temps restant.`);
    return;
  }

  stopTimer('prep');

  const leavingStudent = state.roles.patient ? clone(state.roles.patient) : null;
  const previousCurrent = clone(state.roles.current);
  previousCurrent.hasPassed = true;
  const previousPrep = state.roles.prep ? clone(state.roles.prep) : null;

  if (!previousPrep) {
    state.roles.current = null;
    state.roles.prep = null;
    state.roles.patient = null;
    resetTimer('current', true);
    resetTimer('prep', true);
    syncAvailableCases();
    render();
    saveState();
    if (consumeScheduledPauseAndResume()) return;
    showToast(leavingStudent
      ? `${leavingStudent.name} sort de la salle. Le cas du passage terminé revient dans l'urne.`
      : 'Dernier passage clôturé.');
    return;
  }

  const nextPrep = state.roles.nextPrep ? clone(state.roles.nextPrep) : null;
  const nextPrepTimer = clone(state.timers.nextPrep);
  const nextPrepWasRunning = !!state.timers.nextPrep?.running;
  state.roles.patient = previousCurrent;
  state.roles.current = previousPrep;
  state.roles.prep = nextPrep || shiftNextStudent();
  state.roles.nextPrep = null;

  stopTimer('nextPrep');
  resetTimer('current', true);
  if (nextPrep) {
    state.timers.prep = nextPrepTimer;
    state.timers.prep.running = false;
  } else {
    resetTimer('prep', true);
  }
  resetTimer('nextPrep', true);
  syncAvailableCases();
  render();
  saveState();
  if (nextPrep && nextPrepWasRunning) {
    startTimer('prep');
  }
  showToast(leavingStudent
    ? `${leavingStudent.name} sort de la salle. Le cas du passage terminé revient dans l'urne.`
    : 'Rotation effectuée.');
}

function exportSession() {
  const data = {
    exportedAt: new Date().toISOString(),
    state
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'session-oraux-ifmk.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Session exportée.');
}

function saveAndFinishEvaluation() {
  updateEvaluationFromForm();
  const evaluation = getActiveEvaluation();
  if (!evaluation) {
    alert('Aucune fiche d’évaluation active.');
    return;
  }
  const score = getEvaluationScore(evaluation);
  if (score < 10 && !evaluation.lowScoreComment.trim()) {
    const ok = confirm('La note est inférieure à 10/20 et le commentaire dédié est vide. Enregistrer quand même ?');
    if (!ok) return;
  }
  const editRef = state.editingEvaluation
    ? {
      key: state.editingEvaluation._historyKey || state.editingEvaluation.key || '',
      name: state.editingEvaluation._historyName || state.editingEvaluation.studentName || '',
      caseTitle: state.editingEvaluation._historyCaseTitle || state.editingEvaluation.caseTitle || ''
    }
    : null;
  const submitted = archiveSubmittedEvaluation(evaluation, score);
  if (state.editingEvaluation) {
    upsertHistoryEntry({
      key: submitted.key,
      matchKey: editRef.key,
      matchName: editRef.name,
      matchCaseTitle: editRef.caseTitle,
      name: submitted.studentName,
      caseTitle: submitted.caseTitle || 'Cas non renseigné',
      idChecked: !!submitted.idChecked,
      evaluation: clone(submitted),
      score,
      endedAt: findHistoryItemByKey(submitted.key)?.endedAt || submitted.submittedAt
    });
    state.editingEvaluation = null;
    showToast('Fiche corrigée et réenregistrée.');
  } else {
    upsertHistoryEntry({
      key: submitted.key,
      name: submitted.studentName,
      caseTitle: submitted.caseTitle || 'Cas non renseigné',
      idChecked: !!submitted.idChecked,
      evaluation: clone(submitted),
      score,
      endedAt: new Date().toISOString()
    });
    state.currentEvaluation = null;
    finishAndAdvancePassage({ archive: false });
  }
  render();
  saveState(true);
  if (confirm('Fiche enregistrée. Télécharger le PDF maintenant ?')) {
    downloadExamPdf(submitted, score);
  }
}

function downloadExamPdf(evaluation, score = calculateEvaluationScore(evaluation)) {
  const pdf = buildExamPdf(evaluation, score);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = buildExamFilename(evaluation);
  a.click();
  URL.revokeObjectURL(url);
}

function archiveSubmittedEvaluation(evaluation, score) {
  state.submittedEvaluations = state.submittedEvaluations || [];
  const cleanEvaluation = clone(evaluation);
  delete cleanEvaluation._historyKey;
  delete cleanEvaluation._historyName;
  delete cleanEvaluation._historyCaseTitle;
  const submitted = {
    ...cleanEvaluation,
    score,
    submittedAt: new Date().toISOString(),
    key: evaluation.key || evaluationKey(evaluation)
  };
  const existingIndex = state.submittedEvaluations.findIndex(item => item.key === submitted.key);
  if (existingIndex >= 0) {
    state.submittedEvaluations[existingIndex] = submitted;
  } else {
    state.submittedEvaluations.push(submitted);
  }
  return submitted;
}

function evaluationKey(evaluation) {
  return [
    evaluation.studentName || '',
    evaluation.caseTitle || '',
    evaluation.startedAt || ''
  ].join('|');
}

function passageKey(student) {
  return [
    student?.name || '',
    student?.caseTitle || 'Cas non renseigné'
  ].join('|');
}

function findSubmittedEvaluationForStudent(student) {
  const matches = (state.submittedEvaluations || []).filter(item =>
    item.studentName === student?.name
    && (item.caseTitle || 'Cas non renseigné') === (student?.caseTitle || 'Cas non renseigné')
  );
  return matches[matches.length - 1] || null;
}

function findHistoryItemByKey(key) {
  return (state.history || []).find(item => key && item.key === key) || null;
}

function upsertHistoryEntry(entry) {
  state.history = state.history || [];
  const {
    matchKey,
    matchName,
    matchCaseTitle,
    ...storedEntry
  } = entry;
  const existingIndex = state.history.findIndex(item =>
    (entry.key && item.key === entry.key)
    || (matchKey && item.key === matchKey)
    || (matchName && item.name === matchName && item.caseTitle === matchCaseTitle)
    || (!entry.key && item.name === entry.name && item.caseTitle === entry.caseTitle)
  );
  if (existingIndex >= 0) {
    state.history[existingIndex] = { ...state.history[existingIndex], ...storedEntry };
  } else {
    state.history.push(storedEntry);
  }
}

function buildExamFilename(evaluation) {
  return `${safeFilename(evaluation.studentName)}_${safeFilename(evaluation.sessionName)}_${safeFilename(evaluation.caseTitle)}.pdf`;
}

function safeFilename(value) {
  return String(value || 'non-renseigne')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'non-renseigne';
}

function buildExamPdf(evaluation, score) {
  const lines = [
    'Fiche d’examen - Oral UI10',
    `Nom / prénom : ${evaluation.studentName || 'Non renseigné'}`,
    `Session : ${evaluation.sessionName || 'UI10-S6'}`,
    `Cas clinique : ${evaluation.caseTitle || 'Non renseigné'}`,
    `Carte d'identité : ${evaluation.idChecked ? 'vérifiée' : 'non cochée'}`,
    `Date : ${new Date().toLocaleString('fr-FR')}`,
    `Note : ${formatScore(score)}/20`,
    ''
  ];

  EVALUATION_CRITERIA.forEach(item => {
    const criterion = evaluation.criteria?.[item.id] || {};
    lines.push(`${item.label} : ${criterion.score || 'non évalué'} / ${item.max}`);
    lines.push(`Commentaire : ${criterion.comment || ''}`);
    lines.push('');
  });
  lines.push('Points positifs de l’étudiant');
  lines.push(evaluation.positivePoints || '');
  lines.push('');
  lines.push('Axes d’amélioration');
  lines.push(evaluation.improvementAreas || '');
  lines.push('');
  lines.push('Commentaire si note < 10, risque ou drapeau rouge');
  lines.push(evaluation.lowScoreComment || '');

  return createSimplePdf(lines);
}

function generateDailySummaryPdf() {
  const evaluations = state.submittedEvaluations || [];
  if (!evaluations.length) {
    alert('Aucune fiche soumise pour le récapitulatif de journée.');
    return;
  }
  const pdf = buildDailySummaryPdf(evaluations);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recapitulatif_${safeFilename('UI10-S6')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Récapitulatif de journée généré.');
}

function buildDailySummaryPdf(evaluations) {
  const sorted = [...evaluations].sort((a, b) => String(a.submittedAt || '').localeCompare(String(b.submittedAt || '')));
  const average = sorted.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / sorted.length;
  const lines = [
    'Récapitulatif de journée - Oral UI10',
    `Session : UI10-S6`,
    `Date : ${new Date().toLocaleDateString('fr-FR')}`,
    `Fiches soumises : ${sorted.length}`,
    `Moyenne : ${formatScore(average)}/20`,
    ''
  ];
  sorted.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.studentName || 'Non renseigné'} - ${formatScore(item.score || 0)}/20`);
    lines.push(`Cas : ${item.caseTitle || 'Non renseigné'}`);
    lines.push(`Points positifs : ${item.positivePoints || ''}`);
    lines.push(`Axes d'amélioration : ${item.improvementAreas || ''}`);
    if ((Number(item.score) || 0) < 10 || item.lowScoreComment) {
      lines.push(`Commentaire < 10, risque ou drapeau rouge : ${item.lowScoreComment || ''}`);
    }
    lines.push('');
  });
  return createSimplePdf(lines);
}

function createSimplePdf(lines) {
  const encoder = new TextEncoder();
  const objects = [];
  const pageObjects = [];
  const pages = chunkPdfLines(lines.flatMap(wrapPdfLine), 42);

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('PAGES_PLACEHOLDER');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  pages.forEach(pageLines => {
    const content = buildPdfContent(pageLines);
    const contentObjectNumber = objects.length + 2;
    const pageObject = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`;
    pageObjects.push(objects.length + 1);
    objects.push(pageObject);
    objects.push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjects.map(num => `${num} 0 R`).join(' ')}] /Count ${pageObjects.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return encoder.encode(pdf);
}

function buildPdfContent(lines) {
  const escaped = lines.map((line, index) => {
    const size = index === 0 ? 16 : 10;
    const y = 800 - (index * 18);
    return `BT /F1 ${size} Tf 50 ${y} Td (${escapePdfText(toPdfLatin(line))}) Tj ET`;
  });
  return escaped.join('\n');
}

function wrapPdfLine(line) {
  const text = String(line || ' ');
  if (text.length <= 92) return [text];
  const words = text.split(' ');
  const out = [];
  let current = '';
  words.forEach(word => {
    if (`${current} ${word}`.trim().length > 92) {
      out.push(current);
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  });
  if (current) out.push(current);
  return out;
}

function chunkPdfLines(lines, size) {
  const chunks = [];
  for (let i = 0; i < lines.length; i += size) {
    chunks.push(lines.slice(i, i + size));
  }
  return chunks.length ? chunks : [['Fiche d’examen']];
}

function toPdfLatin(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function hardReset() {
  const ok = confirm('Réinitialiser complètement la session ?');
  if (!ok) return;
  Object.keys(intervals).forEach(key => stopTimer(key, true));
  createResetBackup();
  localStorage.removeItem(STORAGE_KEY);
  state = initialState();
  els.studentsInput.value = '';
  els.casesInput.value = '';
  render();
  updateBackupButton();
  showToast('Session réinitialisée. Une sauvegarde de secours a été conservée.');
}

function renderQueue(listEl, items, emptyMessage, formatter = (x) => x.name || x, onClick = null) {
  listEl.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = emptyMessage;
    listEl.appendChild(empty);
    return;
  }
  items.forEach(item => {
    const pill = document.createElement(onClick ? 'button' : 'div');
    pill.className = onClick ? 'pill history-item' : 'pill';
    if (onClick) pill.type = 'button';
    pill.textContent = formatter(item);
    if (onClick) {
      pill.addEventListener('click', () => onClick(item));
    }
    listEl.appendChild(pill);
  });
}

function renderHistoryList() {
  els.historyList.innerHTML = '';
  if (!state.history.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'Aucun passage terminé pour le moment.';
    els.historyList.appendChild(empty);
    return;
  }
  state.history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'pill history-row';

    const nameBtn = document.createElement('button');
    nameBtn.className = 'history-name';
    nameBtn.type = 'button';
    nameBtn.textContent = `${item.name} - ${item.caseTitle}${findEvaluationForHistory(item) ? ` - ${formatScore(findEvaluationScoreForHistory(item))}/20` : ' - fiche non soumise'}`;
    nameBtn.title = 'Rééditer la fiche';
    nameBtn.addEventListener('click', () => editHistoryEvaluation(item));

    const viewBtn = document.createElement('button');
    viewBtn.className = 'history-view';
    viewBtn.type = 'button';
    viewBtn.textContent = 'Voir';
    viewBtn.title = 'Ouvrir la fiche dans une autre fenêtre';
    viewBtn.addEventListener('click', () => openHistoryResult(item));

    row.appendChild(nameBtn);
    row.appendChild(viewBtn);
    els.historyList.appendChild(row);
  });
}

function setIdentityBadge(el, student) {
  el.classList.toggle('ok', !!student?.idChecked);
  el.textContent = student?.idChecked ? 'Carte d\'identité vérifiée' : 'Carte d\'identité non cochée';
}

function defaultEvaluation(student = state.roles.current) {
  return {
    studentName: student?.name || '',
    caseTitle: student?.caseTitle || '',
    idChecked: !!student?.idChecked,
    sessionName: 'UI10-S6',
    startedAt: new Date().toISOString(),
    criteria: Object.fromEntries(EVALUATION_CRITERIA.map(item => [item.id, { score: '', comment: '' }])),
    positivePoints: '',
    improvementAreas: '',
    lowScoreComment: ''
  };
}

function hydrateEvaluationCriteria(evaluation) {
  if (!evaluation) return null;
  evaluation.caseTitle = evaluation.caseTitle || '';
  evaluation.idChecked = !!evaluation.idChecked;
  evaluation.criteria = evaluation.criteria || {};
  EVALUATION_CRITERIA.forEach(item => {
    evaluation.criteria[item.id] = evaluation.criteria[item.id] || { score: '', comment: '' };
  });
  return evaluation;
}

function getActiveEvaluation() {
  return hydrateEvaluationCriteria(state.editingEvaluation || state.currentEvaluation);
}

function openCurrentEvaluationEditor() {
  if (!state.roles.current) return;
  ensureCurrentEvaluation();
  render();
  saveState(true);
  setTimeout(() => els.evaluationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  showToast('Fiche du passage ouverte en édition.');
}

function ensureCurrentEvaluation() {
  const current = state.roles.current;
  if (!current) return;
  const samePassage = state.currentEvaluation
    && state.currentEvaluation.studentName === current.name
    && state.currentEvaluation.caseTitle === (current.caseTitle || '');
  if (!samePassage) {
    state.currentEvaluation = defaultEvaluation(current);
  }
}

function getEvaluationScore(evaluation = getActiveEvaluation()) {
  if (!evaluation) return 0;
  return calculateEvaluationScore(evaluation);
}

function renderEvaluationForm() {
  const evaluation = getActiveEvaluation();
  const isEditingHistory = !!state.editingEvaluation;
  const visible = !!evaluation && (!!state.roles.current || isEditingHistory);
  els.evaluationPanel.classList.toggle('hidden', !visible);
  els.submitExamBtn.disabled = !visible;
  els.submitExamBtn.textContent = isEditingHistory ? 'Enregistrer les corrections' : 'Enregistrer et passer à la suite';
  if (!visible) return;

  els.evaluationMeta.textContent = isEditingHistory
    ? `Réédition historique - ${evaluation.studentName || 'Étudiant'} - ${evaluation.caseTitle || 'Cas non renseigné'}`
    : `${evaluation.studentName || 'Étudiant'} - ${evaluation.caseTitle || 'Cas non renseigné'}`;
  els.evaluationScore.textContent = `${formatScore(getEvaluationScore(evaluation))}/20`;
  if (document.activeElement !== els.evaluationCaseTitle) {
    els.evaluationCaseTitle.value = evaluation.caseTitle || '';
  }
  els.evaluationIdChecked.checked = !!evaluation.idChecked;
  if (!els.evaluationItems.dataset.ready) {
    els.evaluationItems.innerHTML = EVALUATION_CRITERIA.map(item => `
      <div class="eval-item">
        <h4>${item.label} <span>/ ${item.max}</span></h4>
        <button class="criterion-thumb" type="button" data-criterion-preview="${item.id}" title="Agrandir le repère de grille">
          <img src="${item.image}" alt="${item.label}">
        </button>
        <select data-eval-score="${item.id}">
          <option value="">Non évalué</option>
          ${item.levels.map(level => `<option value="${level.value}">${level.label}</option>`).join('')}
        </select>
        <textarea data-eval-comment="${item.id}" placeholder="Commentaire pour ce critère"></textarea>
      </div>
    `).join('');
    els.evaluationItems.dataset.ready = 'true';
    els.evaluationItems.querySelectorAll('[data-eval-score]').forEach(select => {
      select.addEventListener('change', updateEvaluationFromForm);
    });
    els.evaluationItems.querySelectorAll('[data-eval-comment]').forEach(textarea => {
      textarea.addEventListener('input', updateEvaluationFromForm);
    });
    els.evaluationItems.querySelectorAll('[data-criterion-preview]').forEach(button => {
      button.addEventListener('click', () => openCriterionPreview(button.dataset.criterionPreview));
    });
  }
  EVALUATION_CRITERIA.forEach(item => {
    const criterion = evaluation.criteria?.[item.id] || { score: '', comment: '' };
    els.evaluationItems.querySelector(`[data-eval-score="${item.id}"]`).value = criterion.score;
    els.evaluationItems.querySelector(`[data-eval-comment="${item.id}"]`).value = criterion.comment;
  });
  if (document.activeElement !== els.positivePoints) els.positivePoints.value = evaluation.positivePoints || '';
  if (document.activeElement !== els.improvementAreas) els.improvementAreas.value = evaluation.improvementAreas || '';
  if (document.activeElement !== els.lowScoreComment) els.lowScoreComment.value = evaluation.lowScoreComment || '';
}

function updateEvaluationFromForm() {
  const evaluation = getActiveEvaluation();
  if (!evaluation) return;
  evaluation.caseTitle = els.evaluationCaseTitle.value.trim();
  evaluation.idChecked = els.evaluationIdChecked.checked;
  EVALUATION_CRITERIA.forEach(item => {
    evaluation.criteria[item.id] = {
      score: els.evaluationItems.querySelector(`[data-eval-score="${item.id}"]`).value,
      comment: els.evaluationItems.querySelector(`[data-eval-comment="${item.id}"]`).value
    };
  });
  evaluation.positivePoints = els.positivePoints.value;
  evaluation.improvementAreas = els.improvementAreas.value;
  evaluation.lowScoreComment = els.lowScoreComment.value;
  els.evaluationScore.textContent = `${formatScore(getEvaluationScore(evaluation))}/20`;
  syncCurrentRoleFromEvaluation(evaluation);
  saveState(true);
}

function syncCurrentRoleFromEvaluation(evaluation) {
  if (state.editingEvaluation || !state.roles.current) return;
  state.roles.current.caseTitle = evaluation.caseTitle;
  state.roles.current.idChecked = !!evaluation.idChecked;
  els.currentCase.textContent = evaluation.caseTitle || 'Cas non renseigné';
  setIdentityBadge(els.currentIdentityBadge, state.roles.current);
  syncAvailableCases();
}

function formatScore(score) {
  return Number(score).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function findEvaluationForHistory(historyItem) {
  const submittedByKey = (state.submittedEvaluations || []).find(item => historyItem.key && item.key === historyItem.key);
  if (submittedByKey) return submittedByKey;
  const submittedByIdentity = (state.submittedEvaluations || []).find(item =>
    item.studentName === historyItem.name && item.caseTitle === historyItem.caseTitle
  ) || null;
  if (submittedByIdentity) return submittedByIdentity;
  if (historyItem.evaluation) return historyItem.evaluation;
  return null;
}

function editHistoryEvaluation(historyItem) {
  const evaluation = findEvaluationForHistory(historyItem) || defaultEvaluation({
    name: historyItem.name,
    caseTitle: historyItem.caseTitle,
    idChecked: !!historyItem.idChecked
  });
  state.editingEvaluation = hydrateEvaluationCriteria({
    ...clone(evaluation),
    key: evaluation.key || historyItem.key || evaluationKey(evaluation),
    _historyKey: historyItem.key || '',
    _historyName: historyItem.name || '',
    _historyCaseTitle: historyItem.caseTitle || ''
  });
  render();
  saveState(true);
  setTimeout(() => els.evaluationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  showToast('Fiche ouverte en réédition depuis l’historique.');
}

function findEvaluationScoreForHistory(historyItem) {
  const evaluation = findEvaluationForHistory(historyItem);
  if (!evaluation) return 0;
  if (Number.isFinite(Number(evaluation.score))) return Number(evaluation.score);
  return calculateEvaluationScore(evaluation);
}

function calculateEvaluationScore(evaluation) {
  return EVALUATION_CRITERIA.reduce((total, item) => {
    const value = parseFloat(evaluation.criteria?.[item.id]?.score || '0');
    if (!Number.isFinite(value)) return total;
    return total + Math.min(Math.max(value, 0), item.max);
  }, 0);
}

function openHistoryResult(historyItem) {
  const evaluation = findEvaluationForHistory(historyItem);
  const score = findEvaluationScoreForHistory(historyItem);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=900');
  if (!win) {
    alert('Impossible d’ouvrir la fenêtre de résultat. Vérifiez le bloqueur de fenêtres.');
    return;
  }
  const payload = evaluation ? encodeURIComponent(JSON.stringify({ evaluation, score })) : '';
  win.document.write(buildHistoryResultHtml(historyItem, evaluation, score, payload));
  win.document.close();
}

function buildHistoryResultHtml(historyItem, evaluation, score, payload) {
  const caseTitle = evaluation?.caseTitle || historyItem.caseTitle || 'Non renseigné';
  const criteriaHtml = evaluation
    ? EVALUATION_CRITERIA.map(item => {
      const criterion = evaluation.criteria?.[item.id] || {};
      return `<section><h2>${escapeHtml(item.label)} - ${escapeHtml(criterion.score || 'non évalué')} / ${escapeHtml(String(item.max))}</h2><p>${escapeHtml(criterion.comment || 'Aucun commentaire.')}</p></section>`;
    }).join('')
    : '<p>Aucune fiche soumise pour ce passage.</p>';
  const downloadScript = evaluation ? `
    <script>
      const payload = JSON.parse(decodeURIComponent('${payload}'));
      ${createSimplePdf.toString()}
      ${buildPdfContent.toString()}
      ${wrapPdfLine.toString()}
      ${chunkPdfLines.toString()}
      ${toPdfLatin.toString()}
      ${escapePdfText.toString()}
      ${formatScore.toString()}
      ${safeFilename.toString()}
      const EVALUATION_CRITERIA = ${JSON.stringify(EVALUATION_CRITERIA)};
      ${buildExamPdf.toString()}
      ${buildExamFilename.toString()}
      document.getElementById('download').addEventListener('click', () => {
        const pdf = buildExamPdf(payload.evaluation, payload.score);
        const blob = new Blob([pdf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = buildExamFilename(payload.evaluation);
        a.click();
        URL.revokeObjectURL(url);
      });
    </script>` : '';
  return `<!doctype html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <title>Résultat ${escapeHtml(historyItem.name || '')}</title>
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 28px; color: #17324d; background: #f6f9fd; }
        main { max-width: 920px; margin: 0 auto; background: #fff; border: 1px solid #dfe8f3; border-radius: 18px; padding: 24px; box-shadow: 0 14px 34px rgba(22,50,77,.1); }
        h1 { margin-top: 0; }
        h2 { color: #204f86; font-size: 1rem; margin-bottom: 8px; }
        section { border-top: 1px solid #dfe8f3; padding-top: 14px; margin-top: 14px; }
        .score { font-size: 2.8rem; font-weight: 900; color: #204f86; }
        button { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 800; background: #198754; color: white; cursor: pointer; }
        .muted { color: #64788d; }
      </style>
    </head>
    <body>
      <main>
        <h1>${escapeHtml(historyItem.name || 'Étudiant')}</h1>
        <p class="muted">Cas clinique : ${escapeHtml(caseTitle)}</p>
        <p class="muted">Carte d'identité : ${escapeHtml(evaluation?.idChecked ? 'vérifiée' : 'non cochée')}</p>
        <div class="score">${evaluation ? `${escapeHtml(formatScore(score))}/20` : '—'}</div>
        ${evaluation ? '<button id="download">Télécharger la fiche PDF</button>' : ''}
        ${criteriaHtml}
        ${evaluation ? `
          <section><h2>Points positifs</h2><p>${escapeHtml(evaluation.positivePoints || 'Aucun commentaire.')}</p></section>
          <section><h2>Axes d'amélioration</h2><p>${escapeHtml(evaluation.improvementAreas || 'Aucun commentaire.')}</p></section>
          <section><h2>Commentaire si note &lt; 10, risque ou drapeau rouge</h2><p>${escapeHtml(evaluation.lowScoreComment || 'Aucun commentaire.')}</p></section>
        ` : ''}
      </main>
      ${downloadScript}
    </body>
    </html>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function renderBootstrapPanel() {
  const hasBootstrap = !!(state.bootstrap.A && state.bootstrap.B);
  els.initialEmpty.classList.toggle('hidden', hasBootstrap);
  els.initialReady.classList.toggle('hidden', !hasBootstrap);

  if (!hasBootstrap) return;

  els.bootAName.textContent = state.bootstrap.A.name;
  els.bootBName.textContent = state.bootstrap.B.name;
  els.bootACase.textContent = state.bootstrap.A.caseTitle || 'Aucun cas tiré pour le moment.';
  els.bootBCase.textContent = state.bootstrap.B.caseTitle || 'Aucun cas tiré pour le moment.';
  els.bootAId.checked = !!state.bootstrap.A.idChecked;
  els.bootBId.checked = !!state.bootstrap.B.idChecked;
  els.bootADrawBtn.disabled = !state.bootstrap.A.idChecked || !!state.bootstrap.A.caseTitle;
  els.bootBDrawBtn.disabled = !state.bootstrap.B.idChecked || !!state.bootstrap.B.caseTitle;
  applyTimerVisual(state.timers.bootA, els.bootATimerBlock, els.bootATimerValue, els.bootATimerBar);
  applyTimerVisual(state.timers.bootB, els.bootBTimerBlock, els.bootBTimerValue, els.bootBTimerBar);

  els.startWithABtn.textContent = `${state.bootstrap.A.name} passe / ${state.bootstrap.B.name} fait le patient`;
  els.startWithBBtn.textContent = `${state.bootstrap.B.name} passe / ${state.bootstrap.A.name} fait le patient`;

  const readyToStart = !!(
    state.bootstrap.A?.idChecked &&
    state.bootstrap.B?.idChecked &&
    state.bootstrap.A?.caseTitle &&
    state.bootstrap.B?.caseTitle
  );
  els.startWithABtn.disabled = !readyToStart;
  els.startWithBBtn.disabled = !readyToStart;
}

function renderMainRoles() {
  const current = state.roles.current;
  const prep = state.roles.prep;
  const nextPrep = state.roles.nextPrep;
  const patient = state.roles.patient;

  els.currentName.textContent = current?.name || 'Aucun oral lancé';
  els.currentCase.textContent = current?.caseTitle || 'Charge une session, prépare le binôme initial puis lance le premier oral.';
  setIdentityBadge(els.currentIdentityBadge, current);
  applyTimerVisual(state.timers.current, els.currentTimerBlock, els.currentTimerValue, els.currentTimerBar);

  els.prepName.textContent = prep?.name || '—';
  els.prepCase.textContent = prep?.caseTitle || 'Le prochain étudiant apparaîtra ici.';
  setIdentityBadge(els.prepIdentityBadge, prep);
  els.prepIdCheckbox.checked = !!prep?.idChecked;
  els.prepIdCheckbox.disabled = !prep;
  els.drawPrepBtn.disabled = !prep || !prep.idChecked || !!prep.caseTitle;
  applyTimerVisual(state.timers.prep, els.prepTimerBlock, els.prepTimerValue, els.prepTimerBar);

  els.nextPrepName.textContent = nextPrep?.name || '—';
  els.nextPrepCase.textContent = nextPrep?.caseTitle || 'Aucun étudiant entré pour le moment.';
  setIdentityBadge(els.nextPrepIdentityBadge, nextPrep);
  els.nextPrepIdCheckbox.checked = !!nextPrep?.idChecked;
  els.nextPrepIdCheckbox.disabled = !nextPrep;
  els.enterNextPrepBtn.disabled = state.phase !== 'live' || !!nextPrep || !canEnterNextStudent();
  els.drawNextPrepBtn.disabled = !nextPrep || !nextPrep.idChecked || !!nextPrep.caseTitle;
  els.startNextPrepTimerBtn.disabled = !nextPrep;
  els.pauseNextPrepTimerBtn.disabled = !nextPrep;
  els.resetNextPrepTimerBtn.disabled = !nextPrep;
  applyTimerVisual(state.timers.nextPrep, els.nextPrepTimerBlock, els.nextPrepTimerValue, els.nextPrepTimerBar);

  els.patientName.textContent = patient?.name || '—';
  els.patientNote.textContent = patient
    ? `${patient.name} tient actuellement le rôle de patient.`
    : 'Le rôle patient sera occupé par l\'étudiant qui vient de passer, sauf pour le tout premier oral où le binôme initial s\'intervertit.';

  els.nextTurnBtn.disabled = !current;
  els.swapBootstrapBtn.disabled = !state.awaitingBootstrapSwap;
  els.pauseEvaluationsBtn.disabled = state.phase !== 'live';
  els.dailySummaryBtn.disabled = !(state.submittedEvaluations || []).length;
}

function renderOverview() {
  syncAvailableCases();

  if (state.phase === 'setup') {
    els.overviewStatus.textContent = 'En attente de configuration.';
  } else if (state.phase === 'bootstrap') {
    els.overviewStatus.textContent = 'Binôme initial en préparation. Aucun cas n\'est retiré avant le début d\'un passage.';
  } else if (state.awaitingBootstrapSwap) {
    const current = state.roles.current?.name || '—';
    const patient = state.roles.patient?.name || '—';
    const prep = state.roles.prep?.name || 'aucun étudiant';
    const nextPrep = state.roles.nextPrep?.name;
    els.overviewStatus.textContent = `Premier oral : ${current} passe, ${patient} fait le patient, ${prep} prépare${nextPrep ? `, ${nextPrep} est aussi entré en préparation` : ''}. Après ce passage, faites passer l'autre étudiant du binôme initial.`;
  } else if (state.phase === 'live') {
    const current = state.roles.current?.name || '—';
    const prep = state.roles.prep?.name || 'aucun étudiant';
    const nextPrep = state.roles.nextPrep?.name;
    els.overviewStatus.textContent = `Oral en cours : ${current}. Préparation parallèle : ${prep}${nextPrep ? `. Préparation suivante : ${nextPrep}` : ''}. Le tirage exclut seulement le cas du passage en cours.`;
  }

  els.casesLeft.textContent = state.availableCases.length;
  els.nextStudentPreview.textContent = nextQueueLabel() || 'Aucun autre étudiant en attente.';
  renderQueue(els.queueList, state.queue, 'Aucun étudiant en attente.', item => isPauseMarker(item) ? 'PAUSE ÉVALUATEUR' : item.name);
  renderHistoryList();
}

function renderInputs() {
  if (document.activeElement !== els.studentsInput) {
    els.studentsInput.value = state.config.studentsRaw || '';
  }
  if (document.activeElement !== els.casesInput) {
    els.casesInput.value = state.config.casesRaw || '';
  }
}

function render() {
  renderInputs();
  renderBootstrapPanel();
  renderMainRoles();
  renderOverview();
  renderEvaluationForm();
  updateBackupButton();
}

els.logoImage.addEventListener('load', () => {
  els.logoImage.style.display = 'block';
  els.logoFallback.classList.add('hidden');
});
els.logoImage.addEventListener('error', () => {
  els.logoImage.style.display = 'none';
  els.logoFallback.classList.remove('hidden');
});

els.studentsInput.addEventListener('input', () => {
  state.config.studentsRaw = els.studentsInput.value;
  saveState();
});
els.casesInput.addEventListener('input', () => {
  state.config.casesRaw = els.casesInput.value;
  saveState();
});

els.loadSessionBtn.addEventListener('click', loadSessionFromInputs);
els.saveSessionBtn.addEventListener('click', saveState);
els.restoreBackupBtn.addEventListener('click', restoreBackup);
els.resetAllBtn.addEventListener('click', hardReset);

els.bootAId.addEventListener('change', () => {
  if (state.bootstrap.A) state.bootstrap.A.idChecked = els.bootAId.checked;
  render(); saveState();
});
els.bootBId.addEventListener('change', () => {
  if (state.bootstrap.B) state.bootstrap.B.idChecked = els.bootBId.checked;
  render(); saveState();
});

els.bootADrawBtn.addEventListener('click', () => drawCaseFor('bootstrapA'));
els.bootBDrawBtn.addEventListener('click', () => drawCaseFor('bootstrapB'));

els.bootAStartPrepBtn.addEventListener('click', () => startTimer('bootA'));
els.bootBStartPrepBtn.addEventListener('click', () => startTimer('bootB'));

els.startWithABtn.addEventListener('click', () => startLive('A'));
els.startWithBBtn.addEventListener('click', () => startLive('B'));

els.prepIdCheckbox.addEventListener('change', () => {
  if (state.roles.prep) {
    state.roles.prep.idChecked = els.prepIdCheckbox.checked;
  }
  render();
  saveState();
});

els.drawPrepBtn.addEventListener('click', () => drawCaseFor('prep'));
els.startPrepTimerBtn.addEventListener('click', () => startTimer('prep'));
els.pausePrepTimerBtn.addEventListener('click', () => stopTimer('prep'));
els.resetPrepTimerBtn.addEventListener('click', () => resetTimer('prep'));

els.enterNextPrepBtn.addEventListener('click', enterNextPrep);
els.nextPrepIdCheckbox.addEventListener('change', () => {
  if (state.roles.nextPrep) {
    state.roles.nextPrep.idChecked = els.nextPrepIdCheckbox.checked;
  }
  render();
  saveState();
});
els.drawNextPrepBtn.addEventListener('click', () => drawCaseFor('nextPrep'));
els.startNextPrepTimerBtn.addEventListener('click', () => startTimer('nextPrep'));
els.pauseNextPrepTimerBtn.addEventListener('click', () => stopTimer('nextPrep'));
els.resetNextPrepTimerBtn.addEventListener('click', () => resetTimer('nextPrep'));

els.startCurrentTimerBtn.addEventListener('click', () => startTimer('current'));
els.pauseCurrentTimerBtn.addEventListener('click', () => stopTimer('current'));
els.resetCurrentTimerBtn.addEventListener('click', () => resetTimer('current'));
els.submitExamBtn.addEventListener('click', saveAndFinishEvaluation);
els.currentName.addEventListener('click', openCurrentEvaluationEditor);
els.currentCase.addEventListener('click', openCurrentEvaluationEditor);
els.currentIdentityBadge.addEventListener('click', openCurrentEvaluationEditor);
els.evaluationCaseTitle.addEventListener('input', updateEvaluationFromForm);
els.evaluationIdChecked.addEventListener('change', updateEvaluationFromForm);
els.positivePoints.addEventListener('input', updateEvaluationFromForm);
els.improvementAreas.addEventListener('input', updateEvaluationFromForm);
els.lowScoreComment.addEventListener('input', updateEvaluationFromForm);

els.nextTurnBtn.addEventListener('click', rotateTurn);
els.swapBootstrapBtn.addEventListener('click', swapInitialRoles);
els.restoreCasesBtn.addEventListener('click', recalculateUrn);
els.pauseEvaluationsBtn.addEventListener('click', pauseEvaluations);
els.dailySummaryBtn.addEventListener('click', generateDailySummaryPdf);
els.downloadSessionBtn.addEventListener('click', exportSession);

els.confirmDrawBtn.addEventListener('click', confirmDraw);
els.cancelDrawBtn.addEventListener('click', closeDrawModal);
els.closeCriterionPreviewBtn.addEventListener('click', closeCriterionPreview);
els.criterionPreviewModal.addEventListener('click', (event) => {
  if (event.target === els.criterionPreviewModal) {
    closeCriterionPreview();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.drawModal.classList.contains('hidden')) {
    closeDrawModal();
  }
  if (event.key === 'Escape' && !els.criterionPreviewModal.classList.contains('hidden')) {
    closeCriterionPreview();
  }
});

window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY && event.newValue) {
    loadState();
    render();
  }
});

loadState();
updateClock();
setInterval(updateClock, 1000);
setInterval(() => {
  if (Object.values(state.timers || {}).some(timer => timer?.running)) {
    render();
    saveState(true);
  }
}, 1000);

['current', 'prep', 'nextPrep', 'bootA', 'bootB'].forEach(key => {
  if (state.timers[key]?.running) {
    updateRunningTimer(key);
  }
});

render();
