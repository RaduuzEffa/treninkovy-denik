/* =====================================================
   storage.js — localStorage CRUD abstrakce
   ===================================================== */
'use strict';

const Storage = (() => {
  const KEYS = {
    PROJECTS: 'td_projects',
    TRAINERS: 'td_trainers',
    PLAYERS:  'td_players',
    SESSIONS: 'td_sessions',
    PAYMENTS: 'td_payments',
    SETTINGS: 'td_settings',
  };

  /* ---- Helpers ---- */
  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
  function generateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /* ---- Settings ---- */
  function getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(KEYS.SETTINGS));
      return s ? { ...defaultSettings(), ...s } : defaultSettings();
    } catch { return defaultSettings(); }
  }
  function defaultSettings() {
    return { trainerPin: '1234', defaultCurrency: 'CZK', userName: 'Trenér' };
  }
  function saveSettings(data) { localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data)); }

  /* ---- Projects ---- */
  function getProjects() { return _get(KEYS.PROJECTS); }
  function saveProjects(d) { _set(KEYS.PROJECTS, d); }
  function getProjectById(id) { return getProjects().find(p => p.id === id) || null; }
  function addProject(p)    { const arr = getProjects(); arr.push(p); saveProjects(arr); return p; }
  function updateProject(id, data) {
    saveProjects(getProjects().map(p => p.id === id ? { ...p, ...data } : p));
  }
  function deleteProject(id) {
    saveProjects(getProjects().filter(p => p.id !== id));
    saveSessions(getSessions().filter(s => s.projectId !== id));
  }

  /* ---- Trainers ---- */
  function getTrainers() { return _get(KEYS.TRAINERS); }
  function saveTrainers(d) { _set(KEYS.TRAINERS, d); }
  function getTrainerById(id) { return getTrainers().find(t => t.id === id) || null; }
  function addTrainer(t) { const arr = getTrainers(); arr.push(t); saveTrainers(arr); return t; }
  function updateTrainer(id, data) {
    saveTrainers(getTrainers().map(t => t.id === id ? { ...t, ...data } : t));
  }
  function deleteTrainer(id) {
    saveTrainers(getTrainers().filter(t => t.id !== id));
    // Optional: remove trainer from associated projects
    const projs = getProjects();
    projs.forEach(p => {
      if (p.trainerIds && p.trainerIds.includes(id)) {
        p.trainerIds = p.trainerIds.filter(tid => tid !== id);
        updateProject(p.id, p);
      }
    });
  }

  /* ---- Players ---- */
  function getPlayers() { return _get(KEYS.PLAYERS); }
  function savePlayers(d) { _set(KEYS.PLAYERS, d); }
  function getPlayerById(id) { return getPlayers().find(p => p.id === id) || null; }
  function getPlayersByProject(projectId) {
    const proj = getProjectById(projectId);
    if (!proj || !proj.playerIds) return [];
    const ids = proj.playerIds;
    return getPlayers().filter(p => ids.includes(p.id));
  }
  function addPlayer(p)    { const arr = getPlayers(); arr.push(p); savePlayers(arr); return p; }
  function updatePlayer(id, data) {
    savePlayers(getPlayers().map(p => p.id === id ? { ...p, ...data } : p));
  }
  function deletePlayer(id) {
    savePlayers(getPlayers().filter(p => p.id !== id));
    saveProjects(getProjects().map(proj => ({
      ...proj, playerIds: (proj.playerIds || []).filter(pid => pid !== id)
    })));
  }
  function addPlayerToProject(playerId, projectId) {
    const proj = getProjectById(projectId);
    if (!proj) return;
    const ids = proj.playerIds || [];
    if (!ids.includes(playerId)) updateProject(projectId, { playerIds: [...ids, playerId] });
    const player = getPlayerById(playerId);
    if (player) {
      const pids = player.projectIds || [];
      if (!pids.includes(projectId)) updatePlayer(playerId, { projectIds: [...pids, projectId] });
    }
  }
  function removePlayerFromProject(playerId, projectId) {
    const proj = getProjectById(projectId);
    if (proj) updateProject(projectId, { playerIds: (proj.playerIds || []).filter(id => id !== playerId) });
    const player = getPlayerById(playerId);
    if (player) updatePlayer(playerId, { projectIds: (player.projectIds || []).filter(id => id !== projectId) });
  }

  /* ---- Sessions ---- */
  function getSessions() { return _get(KEYS.SESSIONS); }
  function saveSessions(d) { _set(KEYS.SESSIONS, d); }
  function getSessionById(id) { return getSessions().find(s => s.id === id) || null; }
  function getSessionsByProject(projectId) {
    return getSessions()
      .filter(s => s.projectId === projectId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  function addSession(s)    { const arr = getSessions(); arr.push(s); saveSessions(arr); return s; }
  function updateSession(id, data) {
    saveSessions(getSessions().map(s => s.id === id ? { ...s, ...data } : s));
  }
  function deleteSession(id) { saveSessions(getSessions().filter(s => s.id !== id)); }

  /* ---- Payments ---- */
  function getPayments() { return _get(KEYS.PAYMENTS); }
  function savePayments(d) { _set(KEYS.PAYMENTS, d); }
  function getPaymentById(id) { return getPayments().find(p => p.id === id) || null; }
  function addPayment(p)  { const arr = getPayments(); arr.push(p); savePayments(arr); return p; }
  function updatePayment(id, data) {
    savePayments(getPayments().map(p => p.id === id ? { ...p, ...data } : p));
  }
  function deletePayment(id) { savePayments(getPayments().filter(p => p.id !== id)); }

  /* ---- Export / Import ---- */
  function exportAll() {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      projects: getProjects(),
      trainers: getTrainers(),
      players:  getPlayers(),
      sessions: getSessions(),
      payments: getPayments(),
      settings: getSettings(),
    }, null, 2);
  }
  function importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (data.projects) saveProjects(data.projects);
    if (data.trainers) saveTrainers(data.trainers);
    if (data.players)  savePlayers(data.players);
    if (data.sessions) saveSessions(data.sessions);
    if (data.payments) savePayments(data.payments);
    if (data.settings) saveSettings(data.settings);
  }

  return {
    KEYS, generateId,
    getSettings, saveSettings, defaultSettings,
    getProjects, saveProjects, getProjectById, addProject, updateProject, deleteProject,
    getTrainers, saveTrainers, getTrainerById, addTrainer, updateTrainer, deleteTrainer,
    getPlayers, savePlayers, getPlayerById, getPlayersByProject,
    addPlayer, updatePlayer, deletePlayer, addPlayerToProject, removePlayerFromProject,
    getSessions, saveSessions, getSessionById, getSessionsByProject,
    addSession, updateSession, deleteSession,
    getPayments, savePayments, getPaymentById, addPayment, updatePayment, deletePayment,
    exportAll, importAll,
  };
})();
