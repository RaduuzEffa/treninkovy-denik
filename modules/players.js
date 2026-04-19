/* =====================================================
   players.js — Bojovníci CRUD + views
   ===================================================== */
'use strict';

const Players = (() => {

  const PLAYER_COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b','#a78bfa'];

  /* ===== LIST ===== */
  function renderList(el) {
    const players  = Storage.getPlayers();
    const projects = Storage.getProjects();

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title"><i class="icon icon-users"></i> Bojovníci</h1>
          <p class="page-subtitle">Správa všech sportovců</p>
        </div>
        <button class="btn btn-primary" onclick="Players.showNewPlayerModal()">+ Nový bojovník</button>
      </div>

      ${players.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <h3>Žádní bojovníci</h3>
          <p>Přidejte první bojovníka nebo sportovce</p>
          <button class="btn btn-primary" onclick="Players.showNewPlayerModal()">Přidat bojovníka</button>
        </div>` : `
        <div class="players-grid">
          ${players.map(p => playerCardHtml(p, projects)).join('')}
        </div>`}`;
  }

  function playerCardHtml(player, projects) {
    const playerProjects = (player.projectIds || [])
      .map(id => projects.find(p => p.id === id))
      .filter(Boolean);
    return `
      <div class="player-card" onclick="Players.renderEditForm(document.getElementById('main-content'),'${player.id}')">
        <div class="player-avatar-lg avatar" style="background:${player.color}">${player.initials}</div>
        <div class="player-name">${player.name}</div>
        <div class="player-meta">${playerProjects.map(p => `${p.icon} ${p.name}`).join(' · ') || 'Bez projektu'}</div>
        ${player.note ? `<div class="text-xs text-muted" style="margin-top:4px">${player.note}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Players.confirmDelete('${player.id}')"><i class="icon icon-trash"></i></button>
        </div>
      </div>`;
  }

  /* ===== EDIT FORM ===== */
  function renderEditForm(el, playerId) {
    const player   = Storage.getPlayerById(playerId);
    if (!player) { el.innerHTML = '<p>Bojovník nenalezen</p>'; return; }
    const projects = Storage.getProjects();

    el.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Zpět</button>
      <div class="page-header">
        <h1 class="page-title">Upravit bojovníka</h1>
      </div>
      <div class="card" style="max-width:560px">
        <div class="card-body">
          <form class="form" id="player-form">
            <div class="form-group">
              <label class="form-label">Jméno bojovníka <span class="req">*</span></label>
              <input class="form-input" id="pf-name" value="${player.name}" required maxlength="60"/>
            </div>
            <div class="form-group">
              <label class="form-label">Barva avataru</label>
              <div class="color-picker" id="player-color-picker">
                ${PLAYER_COLORS.map(c => `
                  <div class="color-pill${player.color===c?' selected':''}" style="background:${c}" data-color="${c}" onclick="Players._pickColor(this)"></div>
                `).join('')}
              </div>
              <input type="hidden" id="pf-color" value="${player.color}" />
            </div>
            <div class="form-group">
              <label class="form-label">Poznámka</label>
              <input class="form-input" id="pf-note" placeholder="Volitelná poznámka..." value="${player.note||''}" />
            </div>
            <div class="form-group">
              <label class="form-label">Projekty bojovníka</label>
              <div class="player-select-list">
                ${projects.map(proj => {
                  const inProject = (player.projectIds || []).includes(proj.id);
                  return `
                    <div class="player-select-item${inProject?' selected':''}" onclick="Players._toggleProjectMembership(this,'${playerId}','${proj.id}')">
                      <div class="player-select-check">${inProject?'✓':''}</div>
                      <div style="font-size:1.1rem">${proj.icon}</div>
                      <div>
                        <div style="font-weight:500;font-size:.875rem">${proj.name}</div>
                        <div class="text-xs text-muted">${proj.description||''}</div>
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-ghost" onclick="history.back()">Zrušit</button>
              <button type="submit" class="btn btn-primary">Uložit</button>
            </div>
          </form>
        </div>
      </div>`;

    document.getElementById('player-form').addEventListener('submit', e => {
      e.preventDefault();
      const name  = document.getElementById('pf-name').value.trim();
      if (!name) return;
      const color = document.getElementById('pf-color').value;
      Storage.updatePlayer(playerId, {
        name, color, note: document.getElementById('pf-note').value.trim(),
        initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      });
      App.showToast('Bojovník upraven ✓');
      history.back();
    });
  }

  /* ===== ADD / NEW MODAL ===== */
  function showNewPlayerModal(preselectedProjectId = null) {
    const projects = Storage.getProjects();
    App.showModal('Nový bojovník',
      `<form class="form" id="new-player-form" onsubmit="event.preventDefault()">
        <div class="form-group">
          <label class="form-label">Jméno bojovníka <span class="req">*</span></label>
          <input class="form-input" id="np-name" placeholder="Jan Novák" required maxlength="60" autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Barva avataru</label>
          <div class="color-picker" id="np-color-picker">
            ${PLAYER_COLORS.map((c, i) => `
              <div class="color-pill${i===0?' selected':''}" style="background:${c}" data-color="${c}" onclick="Players._pickColorInPicker(this,'np-color-picker','np-color')"></div>
            `).join('')}
          </div>
          <input type="hidden" id="np-color" value="${PLAYER_COLORS[0]}" />
        </div>
        <div class="form-group">
          <label class="form-label">Přidat do projektu</label>
          <select class="form-select" id="np-project">
            <option value="">— bez projektu —</option>
            ${projects.map(p => `<option value="${p.id}"${p.id===preselectedProjectId?' selected':''}>${p.icon} ${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Poznámka</label>
          <input class="form-input" id="np-note" placeholder="Volitelná poznámka..." />
        </div>
      </form>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Zrušit</button>
       <button class="btn btn-primary" onclick="Players._submitNewPlayer()">Vytvořit bojovníka</button>`
    );
    setTimeout(() => document.getElementById('np-name')?.focus(), 80);
  }

  function _submitNewPlayer() {
    const name = document.getElementById('np-name')?.value?.trim();
    if (!name) { App.showToast('Zadejte jméno bojovníka', 'error'); return; }
    const color     = document.getElementById('np-color')?.value || PLAYER_COLORS[0];
    const projectId = document.getElementById('np-project')?.value;
    const note      = document.getElementById('np-note')?.value?.trim();
    const id        = Storage.generateId();
    const initials  = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    Storage.addPlayer({ id, name, color, initials, note: note||'', projectIds: projectId ? [projectId] : [] });
    if (projectId) {
      const proj = Storage.getProjectById(projectId);
      if (proj) Storage.updateProject(projectId, { playerIds: [...(proj.playerIds||[]), id] });
    }
    App.closeModal();
    App.showToast(`Bojovník ${name} přidán ✓`);
    App.handleRoute();
  }

  /* ===== ADD TO PROJECT MODAL ===== */
  function showAddToProjectModal(projectId) {
    const proj    = Storage.getProjectById(projectId);
    const players = Storage.getPlayers();
    const existing = proj?.playerIds || [];
    const others   = players.filter(p => !existing.includes(p.id));

    App.showModal('Přidat bojovníka do projektu',
      `<div style="display:flex;flex-direction:column;gap:12px">
        <p class="text-sm text-muted">Vyberte existujícího bojovníka nebo vytvořte nového:</p>
        <button class="btn btn-primary btn-sm" onclick="App.closeModal();Players.showNewPlayerModal('${projectId}')">+ Vytvořit nového bojovníka</button>
        ${others.length > 0 ? `
          <div class="divider-text">nebo přidat existujícího</div>
          <div class="player-select-list" id="add-player-list">
            ${others.map(p => `
              <div class="player-select-item" onclick="Players._addExistingToProject('${p.id}','${projectId}')">
                <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
                <span style="font-size:.875rem;font-weight:500">${p.name}</span>
              </div>`).join('')}
          </div>` : '<p class="text-sm text-muted">Všichni bojovníci jsou již v projektu.</p>'}
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Zavřít</button>`
    );
  }

  function _addExistingToProject(playerId, projectId) {
    Storage.addPlayerToProject(playerId, projectId);
    App.closeModal();
    App.showToast('Bojovník přidán do projektu ✓');
    App.navigate(`#/project/${projectId}`);
  }

  /* ===== DELETE ===== */
  function confirmDelete(playerId) {
    const player = Storage.getPlayerById(playerId);
    App.showConfirm(
      `Opravdu smazat bojovníka „${player?.name}"?`,
      () => { Storage.deletePlayer(playerId); App.showToast('Bojovník smazán'); App.handleRoute(); }
    );
  }

  /* ===== UI HELPERS ===== */
  function _pickColor(el) {
    el.closest('.color-picker').querySelectorAll('.color-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    const input = document.getElementById('pf-color');
    if (input) input.value = el.dataset.color;
  }

  function _pickColorInPicker(el, pickerId, inputId) {
    document.querySelectorAll(`#${pickerId} .color-pill`).forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    const input = document.getElementById(inputId);
    if (input) input.value = el.dataset.color;
  }

  function _toggleProjectMembership(el, playerId, projectId) {
    const isSelected = el.classList.toggle('selected');
    el.querySelector('.player-select-check').textContent = isSelected ? '✓' : '';
    if (isSelected) { Storage.addPlayerToProject(playerId, projectId); }
    else            { Storage.removePlayerFromProject(playerId, projectId); }
  }

  return {
    renderList, renderEditForm,
    showNewPlayerModal, _submitNewPlayer,
    showAddToProjectModal, _addExistingToProject,
    confirmDelete, _pickColor, _pickColorInPicker, _toggleProjectMembership,
  };
})();
