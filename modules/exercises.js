/* =====================================================
   exercises.js — Check-off view (průběh tréninku)
   ===================================================== */
'use strict';

const Exercises = (() => {

  let _activePlayerId = null;

  /* ===== MAIN VIEW ===== */
  function renderViewSession(el, sessionId) {
    const session = Storage.getSessionById(sessionId);
    if (!session) { el.innerHTML = '<p style="color:var(--text-muted)">Trénink nenalezen.</p>'; return; }
    const project = Storage.getProjectById(session.projectId);
    const playerIds = Object.keys(session.playerPlans || {});

    if (!_activePlayerId || !playerIds.includes(_activePlayerId)) {
      _activePlayerId = playerIds[0] || null;
    }

    // Overall progress
    const { done: totalDone, total: totalAll } = _overallProgress(session);
    const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    el.innerHTML = `
      <button class="back-btn" onclick="App.navigate('#/project/${session.projectId}')">← ${project?.icon||''} ${project?.name||'Zpět'}</button>

      <!-- Session Header -->
      <div class="session-view-header" style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
              <span class="status-badge status-${session.status}">${App.statusLabel(session.status)}</span>
              <span class="text-sm text-muted">${App.fmtDate(session.date)}</span>
            </div>
            <h1 class="page-title" style="font-size:1.4rem">${session.title}</h1>
            ${session.notes ? `<p class="text-sm text-muted" style="margin-top:4px">${session.notes}</p>` : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('#/session/${sessionId}/edit')"><i class="icon icon-edit"></i> Upravit</button>
            <button class="btn btn-primary btn-sm" onclick="PDFExport.sessionPlan('${sessionId}')"><i class="icon icon-copy"></i> PDF</button>
          </div>
        </div>

        <!-- Overall Progress -->
        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-muted);margin-bottom:6px">
            <span>Celkový postup tréninku</span>
            <span style="font-weight:600;color:var(--accent-light)">${totalDone} / ${totalAll} cvičení (${overallPct}%)</span>
          </div>
          <div class="session-progress-wrap">
            <div class="progress-bar${overallPct===100?' success':''}" style="height:8px;width:${overallPct}%"></div>
          </div>
        </div>
      </div>

      <!-- Player tabs -->
      <div class="player-tabs" id="view-player-tabs" style="margin-bottom:16px">
        ${playerIds.map(id => playerTabHtml(id, session)).join('')}
      </div>

      <!-- Exercise list for active player -->
      <div id="view-exercise-body">
        ${exerciseListHtml(sessionId, _activePlayerId, session)}
      </div>`;
  }

  function playerTabHtml(playerId, session) {
    const player = Storage.getPlayerById(playerId);
    const plan   = session.playerPlans?.[playerId] || {};
    const exercises = plan.exercises || [];
    const done   = exercises.filter(e => e.completed).length;
    const total  = exercises.length;
    const pct    = total > 0 ? Math.round((done/total)*100) : 0;
    const isActive = playerId === _activePlayerId;

    return `
      <div class="player-tab${isActive?' active':''}" id="vtab-${playerId}"
           onclick="Exercises._switchViewTab('${session.id}','${playerId}')">
        <div class="tab-avatar" style="background:${player?.color||'#7c3aed'}">${player?.initials||'?'}</div>
        <span>${player?.name?.split(' ')[0] || '—'}</span>
        <span class="tab-progress" style="color:${pct===100?'var(--success)':''}">
          ${pct===100?'✓':(`${done}/${total}`)}
        </span>
      </div>`;
  }

  function exerciseListHtml(sessionId, playerId, session) {
    if (!playerId) return `<div class="empty-state"><p>Žádný hráč</p></div>`;
    const plan = session.playerPlans?.[playerId] || {};
    const exercises = plan.exercises || [];
    const player = Storage.getPlayerById(playerId);
    const done = exercises.filter(e => e.completed).length;
    const pct  = exercises.length > 0 ? Math.round((done/exercises.length)*100) : 0;

    return `
      <div class="card">
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar avatar-md" style="background:${player?.color||'#7c3aed'}">${player?.initials||'?'}</div>
            <div>
              <div style="font-weight:600">${player?.name||'—'}</div>
              ${plan.notes ? `<div class="text-xs text-muted">${plan.notes}</div>` : ''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:.8rem;color:var(--text-muted)">${done}/${exercises.length} dokončeno</div>
            <div style="font-size:1rem;font-weight:700;color:${pct===100?'var(--success)':'var(--accent-light)'}">${pct}%</div>
          </div>
        </div>
        <div class="card-body" style="padding-bottom:8px">
          <!-- Player progress bar -->
          <div class="progress-wrap" style="height:6px;margin-bottom:16px">
            <div class="progress-bar${pct===100?' success':''}" style="width:${pct}%"></div>
          </div>

          ${exercises.length === 0 ? `
            <div class="empty-state" style="padding:20px">
              <div class="empty-icon" style="font-size:2rem">💪</div>
              <p>Žádná cvičení pro tohoto hráče</p>
            </div>` : `
            <div class="exercise-list" id="exercise-list-${playerId}">
              ${exercises.map(ex => exerciseItemHtml(sessionId, playerId, ex)).join('')}
            </div>`}
        </div>
        <div class="card-footer" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <button class="btn btn-ghost btn-sm" onclick="Exercises._markAllForPlayer('${sessionId}','${playerId}',${pct<100})">
            ${pct===100 ? '↺ Odznačit vše' : '✓✓ Označit vše'}
          </button>
          ${pct===100 ? `
            <button class="btn btn-success btn-sm" onclick="App.showPinModal(() => Exercises._confirmPlayerCompletion('${sessionId}','${playerId}'))">
              🔐 Potvrdit trenérem (PIN)
            </button>` : ''}
        </div>
      </div>`;
  }

  function exerciseItemHtml(sessionId, playerId, ex) {
    return `
      <div class="exercise-item${ex.completed?' completed':''}" id="exitem-${ex.id}">
        <div class="exercise-checkbox" onclick="Exercises._toggleExercise('${sessionId}','${playerId}','${ex.id}')">
          ${ex.completed ? '✓' : ''}
        </div>
        <div class="exercise-info">
          <div class="exercise-name">${ex.name || 'Bez názvu'}</div>
          <div class="exercise-meta">
            ${ex.sets ? `<span class="exercise-chip"><strong>${ex.sets}</strong> série</span>` : ''}
            ${ex.reps ? `<span class="exercise-chip">× <strong>${ex.reps}</strong> opakování</span>` : ''}
            ${ex.weight ? `<span class="exercise-chip"><strong>${ex.weight}</strong> ${ex.unit||'kg'}</span>` : ''}
            ${ex.restSeconds ? `<span class="exercise-chip">⏱ <strong>${ex.restSeconds}</strong>s pauza</span>` : ''}
          </div>
          ${ex.notes ? `<div class="exercise-note-text">📝 ${ex.notes}</div>` : ''}
        </div>
      </div>`;
  }

  /* ===== INTERACTIONS ===== */
  function _switchViewTab(sessionId, playerId) {
    _activePlayerId = playerId;
    document.querySelectorAll('.player-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`vtab-${playerId}`)?.classList.add('active');
    const session = Storage.getSessionById(sessionId);
    const body = document.getElementById('view-exercise-body');
    if (body && session) body.innerHTML = exerciseListHtml(sessionId, playerId, session);
  }

  function _toggleExercise(sessionId, playerId, exId) {
    const session = Storage.getSessionById(sessionId);
    if (!session) return;

    const plan = session.playerPlans?.[playerId];
    if (!plan) return;
    const ex = plan.exercises.find(e => e.id === exId);
    if (!ex) return;

    ex.completed = !ex.completed;

    // Check if all done for player
    plan.allCompleted = plan.exercises.every(e => e.completed);

    // Check if all players done
    const allDone = Object.values(session.playerPlans).every(p => p.allCompleted);
    if (allDone && session.status !== 'completed') session.status = 'completed';
    else if (!allDone && session.status === 'completed') session.status = 'in_progress';
    else if (session.status === 'planned') session.status = 'in_progress';

    Storage.updateSession(sessionId, { playerPlans: session.playerPlans, status: session.status });

    // Update UI
    const itemEl = document.getElementById(`exitem-${exId}`);
    if (itemEl) {
      itemEl.classList.toggle('completed', ex.completed);
      const cb = itemEl.querySelector('.exercise-checkbox');
      if (cb) cb.textContent = ex.completed ? '✓' : '';
    }
    _refreshPlayerProgress(sessionId, playerId, session);
  }

  function _markAllForPlayer(sessionId, playerId, markDone) {
    const session = Storage.getSessionById(sessionId);
    if (!session) return;
    const plan = session.playerPlans?.[playerId];
    if (!plan) return;
    plan.exercises.forEach(ex => { ex.completed = markDone; });
    plan.allCompleted = markDone;
    Storage.updateSession(sessionId, { playerPlans: session.playerPlans });

    const body = document.getElementById('view-exercise-body');
    if (body) body.innerHTML = exerciseListHtml(sessionId, playerId, session);
    _refreshTabProgress(sessionId, session);
  }

  function _confirmPlayerCompletion(sessionId, playerId) {
    const session = Storage.getSessionById(sessionId);
    if (!session) return;
    const player = Storage.getPlayerById(playerId);
    App.showToast(`✓ ${player?.name} potvrzeno trenérem!`, 'success');
  }

  function _refreshPlayerProgress(sessionId, playerId, session) {
    const exercises = session.playerPlans?.[playerId]?.exercises || [];
    const done = exercises.filter(e => e.completed).length;
    const total = exercises.length;
    const pct = total > 0 ? Math.round((done/total)*100) : 0;

    // Update card header
    const card = document.getElementById(`exercise-list-${playerId}`)?.closest('.card');
    if (card) {
      const headerRight = card.querySelector('.card-header div:last-child');
      if (headerRight) {
        headerRight.innerHTML = `
          <div style="font-size:.8rem;color:var(--text-muted)">${done}/${total} dokončeno</div>
          <div style="font-size:1rem;font-weight:700;color:${pct===100?'var(--success)':'var(--accent-light)'}">${pct}%</div>`;
      }
      const pb = card.querySelector('.progress-bar');
      if (pb) { pb.style.width = `${pct}%`; pb.classList.toggle('success', pct===100); }
      const footer = card.querySelector('.card-footer');
      if (footer) {
        footer.innerHTML = `
          <button class="btn btn-ghost btn-sm" onclick="Exercises._markAllForPlayer('${sessionId}','${playerId}',${pct<100})">
            ${pct===100 ? '↺ Odznačit vše' : '✓✓ Označit vše'}
          </button>
          ${pct===100 ? `<button class="btn btn-success btn-sm" onclick="App.showPinModal(() => Exercises._confirmPlayerCompletion('${sessionId}','${playerId}'))">🔐 Potvrdit trenérem (PIN)</button>` : ''}`;
      }
    }

    _refreshTabProgress(sessionId, session);
    _refreshOverallProgress(session);
  }

  function _refreshTabProgress(sessionId, session) {
    const playerIds = Object.keys(session.playerPlans || {});
    playerIds.forEach(id => {
      const tab = document.getElementById(`vtab-${id}`);
      if (!tab) return;
      const exercises = session.playerPlans[id]?.exercises || [];
      const done = exercises.filter(e => e.completed).length;
      const total = exercises.length;
      const pct = total > 0 ? Math.round((done/total)*100) : 0;
      const span = tab.querySelector('.tab-progress');
      if (span) { span.textContent = pct===100 ? '✓' : `${done}/${total}`; span.style.color = pct===100 ? 'var(--success)' : ''; }
    });
  }

  function _refreshOverallProgress(session) {
    const { done, total } = _overallProgress(session);
    const pct = total > 0 ? Math.round((done/total)*100) : 0;
    const pb = document.querySelector('.session-progress-wrap .progress-bar');
    if (pb) { pb.style.width = `${pct}%`; pb.classList.toggle('success', pct===100); }
    const label = document.querySelector('.session-progress-wrap')?.previousElementSibling?.querySelector('span:last-child');
    if (label) label.textContent = `${done} / ${total} cvičení (${pct}%)`;
  }

  function _overallProgress(session) {
    let done = 0, total = 0;
    Object.values(session.playerPlans || {}).forEach(plan => {
      const exs = plan.exercises || [];
      done  += exs.filter(e => e.completed).length;
      total += exs.length;
    });
    return { done, total };
  }

  return { renderViewSession, _switchViewTab, _toggleExercise, _markAllForPlayer, _confirmPlayerCompletion };
})();
