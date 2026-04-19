/* =====================================================
   sessions.js — Plánování tréninků (planner + edit)
   ===================================================== */
'use strict';

const Sessions = (() => {

  /* ===== STATE ===== */
  let _state = {
    projectId: null,
    sessionId: null,  // null = new
    date: '',
    title: '',
    notes: '',
    selectedPlayerIds: [],
    playerPlans: {},  // { playerId: { exercises: [], notes: '' } }
    activeTab: null,
    attachmentData: null,
    attachmentName: null,
  };

  /* ===== RENDER PLANNER (new) ===== */
  function renderPlanner(el, projectId) {
    const project = Storage.getProjectById(projectId);
    if (!project) { el.innerHTML = '<p>Projekt nenalezen.</p>'; return; }

    const today = new Date().toISOString().split('T')[0];
    _state = {
      projectId, sessionId: null,
      date: today, title: '', notes: '',
      selectedPlayerIds: (project.playerIds || []).slice(),
      playerPlans: {}, activeTab: (project.playerIds||[])[0] || null,
      attachmentData: null, attachmentName: null,
    };
    // Init plans for all players
    (project.playerIds || []).forEach(id => {
      _state.playerPlans[id] = { exercises: [], notes: '', allCompleted: false };
    });

    _renderPlannerUI(el, project);
  }

  /* ===== RENDER EDIT ===== */
  function renderEditSession(el, sessionId) {
    const session = Storage.getSessionById(sessionId);
    if (!session) { el.innerHTML = '<p>Trénink nenalezen.</p>'; return; }
    const project = Storage.getProjectById(session.projectId);

    _state = {
      projectId: session.projectId,
      sessionId,
      date: session.date,
      title: session.title,
      notes: session.notes || '',
      selectedPlayerIds: Object.keys(session.playerPlans || {}),
      playerPlans: JSON.parse(JSON.stringify(session.playerPlans || {})),
      activeTab: Object.keys(session.playerPlans || {})[0] || null,
      attachmentData: session.attachmentData || null,
      attachmentName: session.attachmentName || null,
    };

    _renderPlannerUI(el, project);
  }

  /* ===== RENDER PLANNER UI ===== */
  function _renderPlannerUI(el, project) {
    const allPlayers = Storage.getPlayersByProject(project.id);

    el.innerHTML = `
      <button class="back-btn" onclick="App.navigate('#/project/${project.id}')">← ${project.icon} ${project.name}</button>
      <div class="page-header">
        <h1 class="page-title">${_state.sessionId ? 'Upravit trénink' : 'Nový trénink'}</h1>
      </div>

      <!-- Header fields -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-body">
          <div class="form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Datum <span class="req">*</span></label>
                <input class="form-input" type="date" id="sess-date" value="${_state.date}" onchange="Sessions._updateField('date',this.value)" />
              </div>
              <div class="form-group" style="flex:2">
                <label class="form-label">Název tréninku <span class="req">*</span></label>
                <input class="form-input" id="sess-title" placeholder="např. Silový trénink A" value="${_state.title}" oninput="Sessions._updateField('title',this.value)" />
              </div>
            </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="flex:2">
                <label class="form-label">Poznámka k tréninku</label>
                <input class="form-input" id="sess-notes" placeholder="Volitelná poznámka..." value="${_state.notes}" oninput="Sessions._updateField('notes',this.value)" />
              </div>
              <div class="form-group" style="flex:1">
                <label class="form-label"><i class="icon icon-link"></i> Příloha (PDF / Obrázek)</label>
                <input type="file" class="form-input" id="sess-attachment" accept="image/*,.pdf" onchange="Sessions._handleAttachment(this)" style="padding: 6px 12px; font-size: 0.8rem; background: var(--bg-input)" />
                <div id="sess-att-preview" style="margin-top:6px; font-size:0.8rem; color:var(--text-secondary)">
                  ${_state.attachmentName ? `Připojeno: <strong>${_state.attachmentName}</strong> <button class="btn-icon-sm" style="margin-left:4px" onclick="Sessions._clearAttachment()" type="button"><i class="icon icon-trash"></i></button>` : 'Žádná příloha'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Player selection -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <div class="card-title"><i class="icon icon-users"></i> Sportovci tohoto tréninku</div>
          <button class="btn btn-ghost btn-sm" onclick="Players.showNewPlayerModal('${project.id}')">+ Nový sportovec</button>
        </div>
        <div class="card-body">
          ${allPlayers.length === 0 ? `
            <p class="text-sm text-muted">Žádní sportovci v projektu. <button class="btn btn-secondary btn-sm" onclick="Players.showAddToProjectModal('${project.id}')">Přidat sportovce</button></p>` : `
            <div class="player-select-list" id="player-select-list">
              ${allPlayers.map(p => playerSelectHtml(p)).join('')}
            </div>`}
        </div>
      </div>

      <!-- Exercise plans per player -->
      ${_state.selectedPlayerIds.length > 0 ? exercisePlannerHtml(allPlayers) : `
        <div class="empty-state" style="padding:32px">
          <div class="empty-icon">👆</div>
          <h3>Vyberte sportovce</h3>
          <p>Označte sportovce výše, pak jim přidejte individuální cvičení</p>
        </div>`}

      <!-- Save button -->
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:24px">
        <button class="btn btn-ghost" onclick="history.back()">Zrušit</button>
        <button class="btn btn-success btn-lg" onclick="Sessions._saveSession()">
          ${_state.sessionId ? '💾 Uložit změny' : '✅ Uložit trénink'}
        </button>
      </div>`;
  }

  function playerSelectHtml(player) {
    const selected = _state.selectedPlayerIds.includes(player.id);
    return `
      <div class="player-select-item${selected?' selected':''}" id="ps-${player.id}" onclick="Sessions._togglePlayer('${player.id}')">
        <div class="player-select-check">${selected?'✓':''}</div>
        <div class="avatar avatar-sm" style="background:${player.color}">${player.initials}</div>
        <span style="font-size:.875rem;font-weight:500">${player.name}</span>
        ${player.note ? `<span class="text-xs text-muted">${player.note}</span>` : ''}
      </div>`;
  }

  function exercisePlannerHtml(allPlayers) {
    const players = _state.selectedPlayerIds
      .map(id => allPlayers.find(p => p.id === id))
      .filter(Boolean);
    if (!players.length) return '';
    if (!_state.activeTab || !_state.selectedPlayerIds.includes(_state.activeTab)) {
      _state.activeTab = _state.selectedPlayerIds[0];
    }

    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">💪 Plán cvičení per sportovec</div>
        </div>
        <div class="card-body">
          <!-- Player tabs -->
          <div class="player-tabs" id="sess-player-tabs">
            ${players.map(p => `
              <div class="player-tab${p.id===_state.activeTab?' active':''}" id="ptab-${p.id}" onclick="Sessions._switchTab('${p.id}')">
                <div class="tab-avatar" style="background:${p.color}">${p.initials}</div>
                ${p.name.split(' ')[0]}
                <span class="tab-progress">(${(_state.playerPlans[p.id]?.exercises||[]).length})</span>
              </div>`).join('')}
          </div>

          <!-- Exercise table per player -->
          <div id="exercise-planner-body" style="margin-top:16px">
            ${exerciseTableHtml(_state.activeTab)}
          </div>
        </div>
      </div>`;
  }

  function exerciseTableHtml(playerId) {
    if (!playerId) return '';
    const plan = _state.playerPlans[playerId] || { exercises: [], notes: '' };
    const exercises = plan.exercises || [];
    const player = Storage.getPlayerById(playerId);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div style="font-size:.875rem;color:var(--text-secondary)">
          Plán pro <strong style="color:var(--text-primary)">${player?.name || '—'}</strong>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="Sessions._copyFromPlayer('${playerId}')"><i class="icon icon-list"></i> Kopírovat od…</button>
          <button class="btn btn-secondary btn-sm" onclick="Sessions._addExercise('${playerId}')">+ Přidat cvičení</button>
        </div>
      </div>

      ${exercises.length === 0 ? `
        <div class="empty-state" style="padding:20px">
          <div class="empty-icon" style="font-size:2rem">💪</div>
          <p style="color:var(--text-muted);font-size:.875rem">Žádná cvičení. Přidejte první.</p>
        </div>` : `
        <div class="exercise-plan-header">
          <span>Cvičení</span><span>Série</span><span>Opak.</span>
          <span>Váha (kg)</span><span>Pauza (s)</span><span></span>
        </div>
        <div id="exercise-rows-${playerId}">
          ${exercises.map((ex, i) => exerciseRowHtml(playerId, ex, i)).join('')}
        </div>`}

      <div class="form-group" style="margin-top:16px">
        <label class="form-label">Poznámka pro sportovce</label>
        <input class="form-input" placeholder="Individuální pokyny..." value="${plan.notes||''}"
          oninput="Sessions._updatePlayerNote('${playerId}',this.value)" />
      </div>`;
  }

  function exerciseRowHtml(playerId, ex, idx) {
    return `
      <div class="exercise-plan-row" id="exrow-${ex.id}">
        <input class="input-sm" placeholder="Název cvičení" value="${ex.name||''}"
          oninput="Sessions._updateExField('${playerId}','${ex.id}','name',this.value)" />
        <input class="input-sm" type="number" min="1" max="20" placeholder="3" value="${ex.sets||''}"
          oninput="Sessions._updateExField('${playerId}','${ex.id}','sets',Number(this.value))" />
        <input class="input-sm" type="number" min="1" max="100" placeholder="10" value="${ex.reps||''}"
          oninput="Sessions._updateExField('${playerId}','${ex.id}','reps',Number(this.value))" />
        <input class="input-sm" type="number" min="0" step="0.5" placeholder="60" value="${ex.weight||''}"
          oninput="Sessions._updateExField('${playerId}','${ex.id}','weight',Number(this.value))" />
        <input class="input-sm" type="number" min="0" step="10" placeholder="90" value="${ex.restSeconds||''}"
          oninput="Sessions._updateExField('${playerId}','${ex.id}','restSeconds',Number(this.value))" />
        <button class="btn-icon-sm" onclick="Sessions._removeExercise('${playerId}','${ex.id}')" title="Smazat"><i class="icon icon-trash"></i></button>
      </div>`;
  }

  /* ===== STATE MUTATIONS ===== */
  function _updateField(key, value) { _state[key] = value; }
  function _updatePlayerNote(playerId, value) {
    if (!_state.playerPlans[playerId]) _state.playerPlans[playerId] = { exercises: [], notes: '' };
    _state.playerPlans[playerId].notes = value;
  }
  function _updateExField(playerId, exId, field, value) {
    const plan = _state.playerPlans[playerId];
    if (!plan) return;
    const ex = plan.exercises.find(e => e.id === exId);
    if (ex) ex[field] = value;
  }

  function _togglePlayer(playerId) {
    const item = document.getElementById(`ps-${playerId}`);
    const check = item?.querySelector('.player-select-check');
    const idx = _state.selectedPlayerIds.indexOf(playerId);

    if (idx === -1) {
      _state.selectedPlayerIds.push(playerId);
      if (!_state.playerPlans[playerId]) _state.playerPlans[playerId] = { exercises: [], notes: '', allCompleted: false };
      item?.classList.add('selected');
      if (check) check.textContent = '✓';
      if (!_state.activeTab) _state.activeTab = playerId;
    } else {
      _state.selectedPlayerIds.splice(idx, 1);
      item?.classList.remove('selected');
      if (check) check.textContent = '';
      if (_state.activeTab === playerId) _state.activeTab = _state.selectedPlayerIds[0] || null;
    }
    _refreshExercisePlanner();
  }

  function _refreshExercisePlanner() {
    const project = Storage.getProjectById(_state.projectId);
    if (!project) return;
    const allPlayers = Storage.getPlayersByProject(_state.projectId);
    const container = document.getElementById('exercise-planner-body')?.parentElement?.parentElement;
    // Re-render exercise planner section
    const plannerWrapper = document.querySelector('.card:last-of-type');
    if (_state.selectedPlayerIds.length === 0) {
      if (plannerWrapper) plannerWrapper.remove();
      return;
    }
    // Rebuild player tabs
    const tabsEl = document.getElementById('sess-player-tabs');
    if (tabsEl) {
      const players = _state.selectedPlayerIds.map(id => allPlayers.find(p=>p.id===id)).filter(Boolean);
      tabsEl.innerHTML = players.map(p => `
        <div class="player-tab${p.id===_state.activeTab?' active':''}" id="ptab-${p.id}" onclick="Sessions._switchTab('${p.id}')">
          <div class="tab-avatar" style="background:${p.color}">${p.initials}</div>
          ${p.name.split(' ')[0]}
          <span class="tab-progress">(${(_state.playerPlans[p.id]?.exercises||[]).length})</span>
        </div>`).join('');
    }
    const body = document.getElementById('exercise-planner-body');
    if (body) body.innerHTML = exerciseTableHtml(_state.activeTab);
  }

  function _switchTab(playerId) {
    if (_state.activeTab === playerId) return;
    _state.activeTab = playerId;
    document.querySelectorAll('.player-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`ptab-${playerId}`)?.classList.add('active');
    const body = document.getElementById('exercise-planner-body');
    if (body) body.innerHTML = exerciseTableHtml(playerId);
  }

  function _addExercise(playerId) {
    if (!_state.playerPlans[playerId]) _state.playerPlans[playerId] = { exercises: [], notes: '', allCompleted: false };
    const ex = { id: Storage.generateId(), name: '', sets: 3, reps: 10, weight: 0, unit: 'kg', restSeconds: 90, notes: '', completed: false };
    _state.playerPlans[playerId].exercises.push(ex);

    const container = document.getElementById(`exercise-rows-${playerId}`);
    if (container) {
      container.insertAdjacentHTML('beforeend', exerciseRowHtml(playerId, ex, container.children.length));
    } else {
      const body = document.getElementById('exercise-planner-body');
      if (body) body.innerHTML = exerciseTableHtml(playerId);
    }
    _updateTabCount(playerId);
  }

  function _removeExercise(playerId, exId) {
    const plan = _state.playerPlans[playerId];
    if (!plan) return;
    plan.exercises = plan.exercises.filter(e => e.id !== exId);
    document.getElementById(`exrow-${exId}`)?.remove();
    // If no exercises left, re-render to show empty state
    if (plan.exercises.length === 0) {
      const body = document.getElementById('exercise-planner-body');
      if (body) body.innerHTML = exerciseTableHtml(playerId);
    }
    _updateTabCount(playerId);
  }

  function _updateTabCount(playerId) {
    const tab = document.getElementById(`ptab-${playerId}`);
    if (tab) {
      const span = tab.querySelector('.tab-progress');
      if (span) span.textContent = `(${(_state.playerPlans[playerId]?.exercises||[]).length})`;
    }
  }

  function _copyFromPlayer(targetPlayerId) {
    const players = _state.selectedPlayerIds
      .filter(id => id !== targetPlayerId)
      .map(id => Storage.getPlayerById(id))
      .filter(Boolean);

    if (players.length === 0) { App.showToast('Žádný jiný sportovec není vybrán', 'error'); return; }

    const opts = players.map(p => `
      <div class="player-select-item" onclick="Sessions._doCopy('${targetPlayerId}','${p.id}')">
        <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
        <span>${p.name}</span>
        <span class="text-xs text-muted">(${(_state.playerPlans[p.id]?.exercises||[]).length} cvičení)</span>
      </div>`).join('');

    App.showModal('Kopírovat plán od sportovce',
      `<p class="text-sm text-muted" style="margin-bottom:12px">Vyberte sportovce, od kterého zkopírovat cvičení:</p>
       <div class="player-select-list">${opts}</div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Zrušit</button>`
    );
  }

  function _doCopy(targetId, sourceId) {
    const sourcePlan = _state.playerPlans[sourceId];
    if (!sourcePlan) return;
    // Deep copy with new IDs
    const newExercises = sourcePlan.exercises.map(ex => ({ ...ex, id: Storage.generateId(), completed: false }));
    if (!_state.playerPlans[targetId]) _state.playerPlans[targetId] = { exercises: [], notes: '', allCompleted: false };
    _state.playerPlans[targetId].exercises = newExercises;
    App.closeModal();
    const body = document.getElementById('exercise-planner-body');
    if (body) body.innerHTML = exerciseTableHtml(targetId);
    _updateTabCount(targetId);
    App.showToast('Plán zkopírován ✓');
  }

  /* ===== SAVE ===== */
  function _saveSession() {
    const date  = document.getElementById('sess-date')?.value || _state.date;
    const title = document.getElementById('sess-title')?.value?.trim() || _state.title;
    if (!date)  { App.showToast('Vyberte datum tréninku', 'error'); return; }
    if (!title) { App.showToast('Zadejte název tréninku', 'error'); return; }
    if (_state.selectedPlayerIds.length === 0) { App.showToast('Vyberte alespoň jednoho sportovce', 'error'); return; }

    const notes = document.getElementById('sess-notes')?.value?.trim() || _state.notes;
    const attachmentData = _state.attachmentData;
    const attachmentName = _state.attachmentName;

    // Collect only selected players' plans
    const playerPlans = {};
    _state.selectedPlayerIds.forEach(id => {
      playerPlans[id] = _state.playerPlans[id] || { exercises: [], notes: '', allCompleted: false };
    });

    if (_state.sessionId) {
      Storage.updateSession(_state.sessionId, { date, title, notes, playerPlans, attachmentData, attachmentName });
      App.showToast('Trénink uložen ✓');
      App.navigate(`#/session/${_state.sessionId}`);
    } else {
      const id = Storage.generateId();
      Storage.addSession({ id, projectId: _state.projectId, date, title, notes, attachmentData, attachmentName, status: 'planned', playerPlans, createdAt: new Date().toISOString() });
      App.showToast('Trénink vytvořen ✓');
      App.navigate(`#/session/${id}`);
    }
  }

  function _handleAttachment(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      App.showToast('Soubor je příliš velký (max 5 MB)', 'error');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      _state.attachmentData = e.target.result;
      _state.attachmentName = file.name;
      const prev = document.getElementById('sess-att-preview');
      if (prev) prev.innerHTML = `Připojeno: <strong>${file.name}</strong> <button class="btn-icon-sm" style="margin-left:4px" onclick="Sessions._clearAttachment()" type="button"><i class="icon icon-trash"></i></button>`;
    };
    reader.readAsDataURL(file);
  }

  function _clearAttachment() {
    _state.attachmentData = null;
    _state.attachmentName = null;
    const input = document.getElementById('sess-attachment');
    if (input) input.value = '';
    const prev = document.getElementById('sess-att-preview');
    if (prev) prev.innerHTML = 'Žádná příloha';
  }

  return {
    renderPlanner, renderEditSession,
    _updateField, _updatePlayerNote, _updateExField, _handleAttachment, _clearAttachment,
    _togglePlayer, _switchTab,
    _addExercise, _removeExercise,
    _copyFromPlayer, _doCopy,
    _saveSession,
  };
})();
