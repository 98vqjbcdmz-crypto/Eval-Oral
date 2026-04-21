
const STORAGE_KEY = 'ifmk-oraux-dashboard-v1';

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
  bootstrap: {
    A: null,
    B: null
  },
  roles: {
    current: null,
    prep: null,
    patient: null
  },
  timers: {
    current: { duration: 600, remaining: 600, running: false, finished: false },
    prep: { duration: 900, remaining: 900, running: false, finished: false },
    bootA: { duration: 900, remaining: 900, running: false, finished: false },
    bootB: { duration: 900, remaining: 900, running: false, finished: false }
  },
  pendingDraw: null,
  sessionLoadedAt: null,
  awaitingBootstrapSwap: false
});

let state = initialState();
let intervals = {};
let modalSpinInterval = null;
let modalFinalCase = null;
let modalPool = [];

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
  patientName: document.getElementById('patientName'),
  patientNote: document.getElementById('patientNote'),
  nextTurnBtn: document.getElementById('nextTurnBtn'),
  swapBootstrapBtn: document.getElementById('swapBootstrapBtn'),
  overviewStatus: document.getElementById('overviewStatus'),
  casesLeft: document.getElementById('casesLeft'),
  nextStudentPreview: document.getElementById('nextStudentPreview'),
  restoreCasesBtn: document.getElementById('restoreCasesBtn'),
  downloadSessionBtn: document.getElementById('downloadSessionBtn'),
  footerState: document.getElementById('footerState'),
  drawModal: document.getElementById('drawModal'),
  drawTarget: document.getElementById('drawTarget'),
  drawCaseBox: document.getElementById('drawCaseBox'),
  confirmDrawBtn: document.getElementById('confirmDrawBtn'),
  cancelDrawBtn: document.getElementById('cancelDrawBtn')
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

function saveState() {
  syncAvailableCases();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  els.footerState.textContent = 'Session sauvegardée.';
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state = Object.assign(initialState(), parsed);
    state.bootstrap = Object.assign({ A: null, B: null }, state.bootstrap || {});
    state.roles = Object.assign({ current: null, prep: null, patient: null }, state.roles || {});
    state.timers = Object.assign(initialState().timers, state.timers || {});
    if (typeof state.awaitingBootstrapSwap !== 'boolean') {
      state.awaitingBootstrapSwap = false;
    }
    syncAvailableCases();
  } catch (error) {
    console.error('Impossible de relire la session locale', error);
  }
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
  stopTimer(key, true);
  const timer = state.timers[key];
  if (!timer) return;
  if (timer.remaining <= 0) {
    timer.remaining = timer.duration;
  }
  timer.running = true;
  timer.finished = false;
  intervals[key] = setInterval(() => {
    const t = state.timers[key];
    if (!t?.running) return;
    t.remaining -= 1;
    if (t.remaining <= 0) {
      t.remaining = 0;
      t.running = false;
      t.finished = true;
      stopTimer(key, true);
      beep(3);
      showToast(`Temps terminé : ${timerLabel(key)}.`);
    }
    render();
    saveState();
  }, 1000);
  render();
  saveState();
}

function stopTimer(key, silent = false) {
  if (intervals[key]) {
    clearInterval(intervals[key]);
    delete intervals[key];
  }
  if (state.timers[key]) {
    state.timers[key].running = false;
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
  if (!silent) {
    render();
    saveState();
  }
}

function timerLabel(key) {
  return ({
    current: 'oral en cours',
    prep: 'préparation en cours',
    bootA: 'préparation étudiant A',
    bootB: 'préparation étudiant B'
  })[key] || key;
}

function applyTimerVisual(timer, blockEl, valueEl, barEl) {
  valueEl.textContent = formatTime(timer.remaining);
  blockEl.classList.remove('running', 'warning', 'finished');
  if (timer.running) blockEl.classList.add('running');
  if (timer.finished || timer.remaining === 0) blockEl.classList.add('finished');
  else if (timer.remaining <= 60) blockEl.classList.add('warning');
  const pct = Math.max(0, Math.min(100, (timer.remaining / timer.duration) * 100));
  barEl.style.width = `${pct}%`;
}

function buildStudent(name) {
  return {
    name,
    caseTitle: null,
    idChecked: false,
    hasPassed: false
  };
}

function getStudentByTarget(target) {
  if (target === 'bootstrapA') return state.bootstrap.A;
  if (target === 'bootstrapB') return state.bootstrap.B;
  if (target === 'prep') return state.roles.prep;
  return null;
}

function getStudentsInRoom() {
  if (state.phase === 'bootstrap') {
    return [state.bootstrap.A, state.bootstrap.B].filter(Boolean);
  }
  if (state.phase === 'live') {
    return [state.roles.current, state.roles.prep, state.roles.patient].filter(Boolean);
  }
  return [];
}

function getUrnCases(target = null) {
  const targetStudent = typeof target === 'string' ? getStudentByTarget(target) : target;
  const reserved = new Set(
    getStudentsInRoom()
      .filter(student => student && student !== targetStudent)
      .map(student => student.caseTitle)
      .filter(Boolean)
  );
  return state.originalCases.filter(caseTitle => !reserved.has(caseTitle));
}

function syncAvailableCases() {
  state.availableCases = clone(getUrnCases());
  state.usedCases = getStudentsInRoom().map(student => student.caseTitle).filter(Boolean);
}

function recalculateUrn() {
  syncAvailableCases();
  render();
  saveState();
  showToast('Urne recalculée selon les étudiants actuellement en salle.');
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
  clearInterval(modalSpinInterval);
  modalSpinInterval = setInterval(() => {
    const sample = modalPool[Math.floor(Math.random() * modalPool.length)];
    els.drawCaseBox.textContent = sample;
    ticks += 1;
    if (ticks > 18) {
      clearInterval(modalSpinInterval);
      els.drawCaseBox.textContent = modalFinalCase;
    }
  }, 80);
}

function closeDrawModal() {
  clearInterval(modalSpinInterval);
  modalSpinInterval = null;
  modalFinalCase = null;
  modalPool = [];
  state.pendingDraw = null;
  els.drawModal.classList.add('hidden');
  els.drawModal.setAttribute('aria-hidden', 'true');
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
  showToast(`Cas attribué à ${label}. Ce cas restera hors de l'urne tant que l'étudiant sera dans la salle.`);
}

function loadSessionFromInputs() {
  const students = normalizeLines(els.studentsInput.value);
  const cases = normalizeLines(els.casesInput.value);

  if (students.length < 2) {
    alert('Il faut au moins 2 étudiants pour démarrer le premier binôme.');
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
  state.queue = students.map(buildStudent);
  state.originalCases = clone(cases);
  state.sessionLoadedAt = new Date().toISOString();
  state.phase = 'bootstrap';
  state.bootstrap.A = state.queue.shift() || null;
  state.bootstrap.B = state.queue.shift() || null;
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

  stopTimer('bootA', true);
  stopTimer('bootB', true);

  state.roles.current = clone(current);
  state.roles.patient = clone(patient);
  state.roles.prep = state.queue.length ? state.queue.shift() : null;
  state.phase = 'live';
  state.awaitingBootstrapSwap = true;
  resetTimer('current', true);
  resetTimer('prep', true);
  syncAvailableCases();
  render();
  saveState();
  showToast(`Oral lancé : ${state.roles.current.name} passe. Le second étudiant du binôme initial gardera son cas réservé pour passer juste après.`);
}

function archiveCurrentPassage() {
  if (!state.roles.current) return;
  state.history.push({
    name: state.roles.current.name,
    caseTitle: state.roles.current.caseTitle || 'Cas non renseigné',
    endedAt: new Date().toISOString()
  });
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

  stopTimer('current', true);
  archiveCurrentPassage();

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
  showToast(`Passage basculé : ${state.roles.current.name} passe maintenant. L'étudiant en préparation conserve son temps restant.`);
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

  stopTimer('current', true);
  stopTimer('prep', true);
  archiveCurrentPassage();

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
    showToast(leavingStudent
      ? `${leavingStudent.name} sort de la salle : son cas revient dans l'urne. Plus aucun étudiant n'est en préparation.`
      : 'Dernier passage clôturé.');
    return;
  }

  state.roles.patient = previousCurrent;
  state.roles.current = previousPrep;
  state.roles.prep = state.queue.length ? state.queue.shift() : null;

  resetTimer('current', true);
  resetTimer('prep', true);
  syncAvailableCases();
  render();
  saveState();
  showToast(leavingStudent
    ? `${leavingStudent.name} sort de la salle : son cas revient dans l'urne. Rotation effectuée.`
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

function hardReset() {
  const ok = confirm('Réinitialiser complètement la session ?');
  if (!ok) return;
  Object.keys(intervals).forEach(key => stopTimer(key, true));
  localStorage.removeItem(STORAGE_KEY);
  state = initialState();
  els.studentsInput.value = '';
  els.casesInput.value = '';
  render();
  showToast('Session réinitialisée.');
}

function renderQueue(listEl, items, emptyMessage, formatter = (x) => x.name || x) {
  listEl.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = emptyMessage;
    listEl.appendChild(empty);
    return;
  }
  items.forEach(item => {
    const pill = document.createElement('div');
    pill.className = 'pill';
    pill.textContent = formatter(item);
    listEl.appendChild(pill);
  });
}

function setIdentityBadge(el, student) {
  el.classList.toggle('ok', !!student?.idChecked);
  el.textContent = student?.idChecked ? 'Carte d\'identité vérifiée' : 'Carte d\'identité non cochée';
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

  const readyToStart = state.bootstrap.A && state.bootstrap.B;
  els.startWithABtn.disabled = !readyToStart;
  els.startWithBBtn.disabled = !readyToStart;
}

function renderMainRoles() {
  const current = state.roles.current;
  const prep = state.roles.prep;
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

  els.patientName.textContent = patient?.name || '—';
  els.patientNote.textContent = patient
    ? `${patient.name} tient actuellement le rôle de patient. Cas réservé : ${patient.caseTitle || 'non tiré'}. Ce cas ne peut pas être remis dans l'urne tant que l'étudiant reste dans la salle.`
    : 'Le rôle patient sera occupé par l\'étudiant qui vient de passer, sauf pour le tout premier oral où le binôme initial s\'intervertit.';

  els.nextTurnBtn.disabled = !current;
  els.swapBootstrapBtn.disabled = !state.awaitingBootstrapSwap;
}

function renderOverview() {
  syncAvailableCases();

  if (state.phase === 'setup') {
    els.overviewStatus.textContent = 'En attente de configuration.';
  } else if (state.phase === 'bootstrap') {
    els.overviewStatus.textContent = 'Binôme initial en préparation. Les cas tirés sont retirés de l\'urne tant que les étudiants restent dans la salle.';
  } else if (state.awaitingBootstrapSwap) {
    const current = state.roles.current?.name || '—';
    const patient = state.roles.patient?.name || '—';
    const prep = state.roles.prep?.name || 'aucun étudiant';
    els.overviewStatus.textContent = `Premier oral : ${current} passe, ${patient} fait le patient, ${prep} prépare. Après ce passage, faites passer l'autre étudiant du binôme initial.`;
  } else if (state.phase === 'live') {
    const current = state.roles.current?.name || '—';
    const prep = state.roles.prep?.name || 'aucun étudiant';
    els.overviewStatus.textContent = `Oral en cours : ${current}. Préparation parallèle : ${prep}. Le tirage exclut les cas déjà présents dans la salle.`;
  }

  els.casesLeft.textContent = state.availableCases.length;
  els.nextStudentPreview.textContent = state.queue[0]?.name || 'Aucun autre étudiant en attente.';
  renderQueue(els.queueList, state.queue, 'Aucun étudiant en attente.');
  renderQueue(
    els.historyList,
    state.history,
    'Aucun passage terminé pour le moment.',
    item => `${item.name} — ${item.caseTitle}`
  );
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

els.startCurrentTimerBtn.addEventListener('click', () => startTimer('current'));
els.pauseCurrentTimerBtn.addEventListener('click', () => stopTimer('current'));
els.resetCurrentTimerBtn.addEventListener('click', () => resetTimer('current'));

els.nextTurnBtn.addEventListener('click', rotateTurn);
els.swapBootstrapBtn.addEventListener('click', swapInitialRoles);
els.restoreCasesBtn.addEventListener('click', recalculateUrn);
els.downloadSessionBtn.addEventListener('click', exportSession);

els.confirmDrawBtn.addEventListener('click', confirmDraw);
els.cancelDrawBtn.addEventListener('click', closeDrawModal);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.drawModal.classList.contains('hidden')) {
    closeDrawModal();
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

['current', 'prep', 'bootA', 'bootB'].forEach(key => {
  if (state.timers[key]?.running) {
    startTimer(key);
  }
});

render();
