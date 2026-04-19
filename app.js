/* =====================================================
   app.js — Router, Bootstrap, Dashboard
   ===================================================== */
'use strict';

const App = (() => {

  /* ===== ROUTER ===== */
  let _pendingAction = null;

  function init() {
    seedDataIfEmpty();
    updateSidebarUser();
    updatePendingBadge();
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  function navigate(hash) {
    window.location.hash = hash;
    closeSidebar();
  }

  function handleRoute() {
    const hash = window.location.hash || '#/';
    updateNavActive(hash);
    updatePendingBadge();

    const el = document.getElementById('main-content');
    if (!el) return;

    // Reset animation by clearing and recreating a wrapper
    el.innerHTML = '<div id="page-wrapper" class="page-enter"></div>';
    const wrap = document.getElementById('page-wrapper');

    // Dynamic route matching
    const m = {
      projectNew:    hash.match(/^#\/project\/new$/),
      projectDetail: hash.match(/^#\/project\/([^/]+)$/),
      sessionNew:    hash.match(/^#\/project\/([^/]+)\/session\/new$/),
      sessionView:   hash.match(/^#\/session\/([^/]+)$/),
      sessionEdit:   hash.match(/^#\/session\/([^/]+)\/edit$/),
      playerEdit:    hash.match(/^#\/player\/([^/]+)\/edit$/),
      trainerNew:    hash.match(/^#\/trainer\/new$/),
      trainerEdit:   hash.match(/^#\/trainer\/([^/]+)\/edit$/),
    };

    if      (m.sessionNew)    Sessions.renderPlanner(wrap, m.sessionNew[1]);
    else if (m.sessionView)   Exercises.renderViewSession(wrap, m.sessionView[1]);
    else if (m.sessionEdit)   Sessions.renderEditSession(wrap, m.sessionEdit[1]);
    else if (m.projectNew)    Projects.renderForm(wrap, null);
    else if (m.projectDetail) Projects.renderDetail(wrap, m.projectDetail[1]);
    else if (m.playerEdit)    Players.renderEditForm(wrap, m.playerEdit[1]);
    else if (m.trainerNew)    Trainers.renderForm(wrap, null);
    else if (m.trainerEdit)   Trainers.renderForm(wrap, m.trainerEdit[1]);
    else if (hash === '#/projects') Projects.renderList(wrap);
    else if (hash === '#/players')  Players.renderList(wrap);
    else if (hash === '#/trainers') Trainers.renderList(wrap);
    else if (hash === '#/payments' || hash.startsWith('#/payments')) Payments.render(wrap);
    else if (hash === '#/settings') Settings.render(wrap);
    else renderDashboard(wrap);
  }

  function updateNavActive(hash) {
    const base =
      hash.startsWith('#/project') || hash.startsWith('#/session') ? '#/projects' :
      hash.startsWith('#/payments') ? '#/payments' :
      hash.startsWith('#/players')  ? '#/players'  :
      hash.startsWith('#/trainers') ? '#/trainers' :
      hash.startsWith('#/settings') ? '#/settings' : '#/';

    document.querySelectorAll('[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === base);
    });
  }

  /* ===== SIDEBAR (mobile) ===== */
  function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    const hb = document.getElementById('hamburger-btn');
    const open = sb.classList.toggle('mobile-open');
    ov.classList.toggle('active', open);
    hb.classList.toggle('open', open);
  }

  function closeSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    const hb = document.getElementById('hamburger-btn');
    sb.classList.remove('mobile-open');
    ov.classList.remove('active');
    hb.classList.remove('open');
  }

  /* ===== MODAL ===== */
  function showModal(title, bodyHTML, footerHTML = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    document.getElementById('modal-overlay').classList.add('active');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('modal-body').innerHTML = '';
    document.getElementById('modal-footer').innerHTML = '';
  }

  function showConfirm(message, onConfirm, label = 'Smazat') {
    _pendingAction = onConfirm;
    showModal('Potvrzení', `<p style="color:var(--text-secondary)">${message}</p>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Zrušit</button>
       <button class="btn btn-danger" onclick="App.closeModal();App._runPendingAction();">${label}</button>`
    );
  }

  function _runPendingAction() {
    if (_pendingAction) { _pendingAction(); _pendingAction = null; }
  }

  /* ===== PIN MODAL ===== */
  function showPinModal(onSuccess, message = 'Potvrďte akci PINem') {
    let pin = '';
    const settings = Storage.getSettings();
    const trainers = Storage.getTrainers();

    const options = [
      `<option value="master">👑 ADMIN (${settings.userName || 'Správce'})</option>`,
      ...trainers.map(t => `<option value="${t.id}">👤 ${t.name}</option>`)
    ].join('');

    const body = `
      <div class="pin-modal">
        <p class="pin-subtitle">${message}</p>
        <div style="margin-bottom:16px;">
          <select id="pin-trainer-select" class="form-select" style="width:100%;max-width:300px;margin:0 auto;display:block;">
            ${options}
          </select>
        </div>
        <div class="pin-display">
          <span class="pin-dot" id="pd1"></span>
          <span class="pin-dot" id="pd2"></span>
          <span class="pin-dot" id="pd3"></span>
          <span class="pin-dot" id="pd4"></span>
        </div>
        <div class="pin-keypad" id="pin-keypad">
          ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k =>
            `<button class="pin-key${k===''?' pin-key-empty':''}" data-key="${k}">${k}</button>`
          ).join('')}
        </div>
        <div class="pin-error" id="pin-error" style="display:none">Nesprávný PIN. Zkuste znovu.</div>
      </div>`;

    showModal('🔐 PIN Potvrzení', body);

    setTimeout(() => {
      const settings = Storage.getSettings();
      const keypad = document.getElementById('pin-keypad');
      if (!keypad) return;

      function updateDisplay() {
        for (let i = 1; i <= 4; i++) {
          const dot = document.getElementById(`pd${i}`);
          if (dot) dot.classList.toggle('filled', pin.length >= i);
        }
      }

      keypad.addEventListener('click', e => {
        const key = e.target.closest('[data-key]')?.dataset?.key;
        if (key === undefined || key === '') return;
        const err = document.getElementById('pin-error');
        if (err) err.style.display = 'none';

        if (key === '⌫') {
          pin = pin.slice(0, -1);
        } else if (pin.length < 4) {
          pin += key;
        }
        updateDisplay();

        if (pin.length === 4) {
          const selectedVal = document.getElementById('pin-trainer-select').value;
          let validPins = [];
          
          if (selectedVal === 'master') {
            validPins = [settings.trainerPin, '0000' + settings.trainerPin];
          } else {
            const t = trainers.find(tr => tr.id === selectedVal);
            if (t && t.pin) validPins.push(t.pin);
          }

          if (validPins.includes(pin)) {
            closeModal();
            onSuccess();
          } else {
            if (err) err.style.display = 'block';
            setTimeout(() => { pin = ''; updateDisplay(); if(err) err.style.display='none'; }, 600);
          }
        }
      });
    }, 60);
  }

  /* ===== ATTACHMENT MODAL ===== */
  function showAttachmentModal(sessionId) {
    const session = Storage.getSessionById(sessionId);
    if (!session || !session.attachmentData) return;

    if (session.attachmentData.startsWith('data:application/pdf')) {
      const w = window.open();
      if (w) w.document.write(`<iframe width="100%" height="100%" src="${session.attachmentData}"></iframe>`);
      else showToast('Povolte vyskakovací okna pro zobrazení PDF', 'error');
    } else {
      showModal('Příloha: ' + (session.attachmentName || 'Obrázek'), 
        `<div style="text-align:center"><img src="${session.attachmentData}" style="max-width:100%;max-height:65vh;object-fit:contain;border-radius:var(--radius-md)" /></div>`,
        `<button class="btn btn-secondary" onclick="App.closeModal()">Zavřít</button>`
      );
    }
  }

  /* ===== TOAST ===== */
  function showToast(msg, type = 'success') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
    t.innerHTML = `<span class="toast-icon">${icon}</span>
      <span class="toast-message">${msg}</span>
      <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>`;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  /* ===== SIDEBAR USER ===== */
  function updateSidebarUser() {
    const s = Storage.getSettings();
    const name = s.userName || 'Trenér';
    const el = document.getElementById('sidebar-username');
    const av = document.getElementById('sidebar-avatar');
    if (el) el.textContent = name;
    if (av) av.textContent = name.slice(0, 2).toUpperCase();
  }

  function updatePendingBadge() {
    const badge = document.getElementById('nav-pending-badge');
    if (!badge) return;
    const count = Storage.getPayments().filter(p => p.status === 'pending').length;
    badge.style.display = count > 0 ? '' : 'none';
    badge.textContent = count;
  }

  /* ===== DASHBOARD ===== */
  function renderDashboard(el) {
    const projects = Storage.getProjects();
    const sessions = Storage.getSessions();
    const payments = Storage.getPayments();
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todaySessions  = sessions.filter(s => s.date === today);
    const pendingPays    = payments.filter(p => p.status === 'pending');
    const monthTotal     = payments
      .filter(p => p.date.startsWith(thisMonth))
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const monthCurrency  = payments.find(p => p.date.startsWith(thisMonth))?.currency || Storage.getSettings().defaultCurrency;

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">${fmtDate(today)}</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="PDFExport.showSessionExportModal()"><i class="icon icon-copy"></i> Export tréninků (PDF)</button>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('#/payments')">+ Platba</button>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('#/project/new')">+ Projekt</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(124,58,237,.15);color:#a78bfa"><i class="icon icon-list"></i></div>
          <div class="stat-info">
            <div class="stat-value">${projects.length}</div>
            <div class="stat-label">Projekty / sporty</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(59,130,246,.15);color:#60a5fa"><i class="icon icon-calendar"></i></div>
          <div class="stat-info">
            <div class="stat-value">${todaySessions.length}</div>
            <div class="stat-label">Dnes na plánu</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(245,158,11,.15);color:#fbbf24"><i class="icon icon-copy"></i></div>
          <div class="stat-info">
            <div class="stat-value">${pendingPays.length}</div>
            <div class="stat-label">Čekající platby</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:rgba(34,197,94,.15);color:#4ade80"><i class="icon icon-users"></i></div>
          <div class="stat-info">
            <div class="stat-value">${monthTotal.toLocaleString('cs-CZ')} ${monthCurrency}</div>
            <div class="stat-label">Výdaje tento měsíc</div>
          </div>
        </div>
      </div>

      ${todaySessions.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title"><i class="icon icon-calendar"></i> Dnes na plánu</h2>
        </div>
        <div class="sessions-grid">
          ${todaySessions.map(s => sessionCardHtml(s)).join('')}
        </div>
      </div>` : ''}

      <div class="section">
        <div class="section-header">
          <h2 class="section-title"><i class="icon icon-list"></i> Moje projekty</h2>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('#/project/new')">+ Nový</button>
        </div>
        ${projects.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon"><i class="icon icon-list"></i></div>
            <h3>Zatím žádné projekty</h3>
            <p>Vytvořte první sport nebo tréninkovou skupinu</p>
            <button class="btn btn-primary" onclick="App.navigate('#/project/new')">Vytvořit projekt</button>
          </div>` : `
          <div class="projects-grid">
            ${projects.map(p => projectCardHtml(p, today)).join('')}
          </div>`}
      </div>

      ${upcomingSessionsHtml(sessions, projects, today)}
    `;
  }

  function sessionCardHtml(s) {
    const project = Storage.getProjectById(s.projectId);
    const playerCount = Object.keys(s.playerPlans || {}).length;
    return `
      <div class="session-card" onclick="App.navigate('#/session/${s.id}')">
        <div class="session-card-header">
          <span class="project-badge" style="background:${project?.color||'#7c3aed'}22;color:${project?.color||'#a78bfa'}">
            ${project?.icon||'🏋️'} ${project?.name||'—'}
          </span>
          <span class="status-badge status-${s.status}">${statusLabel(s.status)}</span>
        </div>
        <div class="session-card-title">${s.title}</div>
        <div class="session-card-meta">
          <span>👥 ${playerCount} sportovec${playerCount===1?'':'ů'}</span>
          ${s.notes ? `<span>📝 ${s.notes.slice(0,40)}</span>` : ''}
        </div>
      </div>`;
  }

  function projectCardHtml(p, today) {
    const sessions = Storage.getSessionsByProject(p.id);
    const players  = Storage.getPlayersByProject(p.id);
    const upcoming = sessions.filter(s => s.date >= today).length;
    return `
      <div class="project-card" style="--project-color:${p.color}" onclick="App.navigate('#/project/${p.id}')">
        <div class="project-card-accent" style="background:${p.color}"></div>
        <div class="project-card-content">
          <div class="project-icon">${p.icon}</div>
          <div class="project-name">${p.name}</div>
          <div class="project-desc">${p.description||''}</div>
          <div class="project-stats">
            <span>👥 ${players.length}</span>
            <span>📋 ${sessions.length} tréninků</span>
            ${upcoming > 0 ? `<span class="upcoming-badge">↑ ${upcoming} nadcházejících</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function upcomingSessionsHtml(sessions, projects, today) {
    const upcoming = sessions
      .filter(s => s.date > today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
    if (!upcoming.length) return '';
    return `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title"><i class="icon icon-calendar"></i> Nadcházející tréninky</h2>
        </div>
        <div class="session-list">
          ${upcoming.map(s => {
            const proj = Storage.getProjectById(s.projectId);
            return `
              <div class="session-row" onclick="App.navigate('#/session/${s.id}')">
                <div class="session-row-left">
                  <div class="session-row-date">${fmtDate(s.date)}</div>
                  <div class="session-row-title">${s.title}</div>
                </div>
                <div class="session-row-right">
                  <span class="project-badge" style="background:${proj?.color||'#7c3aed'}22;color:${proj?.color||'#a78bfa'}">
                    ${proj?.icon||'🏋️'} ${proj?.name||'—'}
                  </span>
                  <span class="status-badge status-${s.status}">${statusLabel(s.status)}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ===== HELPERS ===== */
  function statusLabel(s) {
    return { planned: 'Naplánováno', in_progress: 'Probíhá', completed: 'Dokončeno' }[s] || s;
  }

  function fmtDate(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('cs-CZ', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function fmtDateShort(isoDate) {
    if (!isoDate) return '—';
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /* ===== SEED DATA ===== */
  function seedDataIfEmpty() {
    if (Storage.getProjects().length > 0) return;
    const pid  = Storage.generateId();
    const p1id = Storage.generateId();
    const p2id = Storage.generateId();
    const p3id = Storage.generateId();
    const sid1 = Storage.generateId();
    const sid2 = Storage.generateId();
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    Storage.addProject({ id: pid, name: 'Posilovna', type: 'gym', description: 'Silový trénink skupiny', color: '#7c3aed', icon: '🏋️', createdAt: new Date().toISOString(), playerIds: [p1id, p2id, p3id] });
    Storage.addPlayer({ id: p1id, name: 'Jan Novák', initials: 'JN', color: '#22c55e', projectIds: [pid], note: '' });
    Storage.addPlayer({ id: p2id, name: 'Petra Svobodová', initials: 'PS', color: '#f59e0b', projectIds: [pid], note: '' });
    Storage.addPlayer({ id: p3id, name: 'Lukáš Hora', initials: 'LH', color: '#3b82f6', projectIds: [pid], note: '' });

    const e = (name, sets, reps, weight, notes='') => ({ id: Storage.generateId(), name, sets, reps, weight, unit:'kg', restSeconds:90, notes, completed:false });

    Storage.addSession({
      id: sid1, projectId: pid, date: today,
      title: 'Silový trénink A — spodní partie', notes: 'Zaměření na záda a nohy', status: 'planned',
      playerPlans: {
        [p1id]: { exercises: [e('Dřep',3,10,80), e('Mrtvý tah',4,8,100), e('Leg press',3,12,120)], notes:'', allCompleted:false },
        [p2id]: { exercises: [e('Dřep',3,12,40,'Technika, lehčí váha'), e('Rumunský mrtvý tah',3,10,30), e('Výpad',3,10,20)], notes:'', allCompleted:false },
        [p3id]: { exercises: [e('Dřep',5,5,120,'Těžká série'), e('Mrtvý tah',4,6,140)], notes:'Pokročilý program', allCompleted:false },
      }, createdAt: new Date().toISOString()
    });
    Storage.addSession({
      id: sid2, projectId: pid, date: tomorrow,
      title: 'Horní partie — push den', notes: '', status: 'planned',
      playerPlans: {
        [p1id]: { exercises: [e('Bench press',4,10,70), e('Tlak s činkou',3,12,30)], notes:'', allCompleted:false },
        [p2id]: { exercises: [e('Klik od stolu',3,15,0,'Vlastní váha'), e('Tlak na stroji',3,12,20)], notes:'', allCompleted:false },
      }, createdAt: new Date().toISOString()
    });
    Storage.addPayment({ id: Storage.generateId(), date: today, amount: 1200, currency: 'CZK', note: 'Měsíční poplatek — duben', projectId: pid, playerIds: [p1id, p2id], status: 'confirmed', confirmationToken: 'A1B2C3', confirmedAt: new Date().toISOString() });
    Storage.addPayment({ id: Storage.generateId(), date: today, amount: 600, currency: 'CZK', note: 'Jednorázový vstup', projectId: pid, playerIds: [p3id], status: 'pending', confirmationToken: 'D4E5F6', confirmedAt: null });
  }

  /* ===== PUBLIC API ===== */
  return {
    init, navigate, handleRoute,
    toggleSidebar, closeSidebar,
    showModal, closeModal, showConfirm, showPinModal, showAttachmentModal,
    _runPendingAction,
    showToast, updateSidebarUser, updatePendingBadge,
    statusLabel, fmtDate, fmtDateShort,
    renderDashboard, sessionCardHtml, projectCardHtml,
  };
})();

window.addEventListener('DOMContentLoaded', () => App.init());
