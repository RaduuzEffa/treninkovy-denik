/* =====================================================
   projects.js — Projekty CRUD + Master-Detail view
   ===================================================== */
'use strict';

const Projects = (() => {

  const PROJECT_COLORS = ['#7c3aed','#2563eb','#059669','#dc2626','#d97706','#db2777','#0891b2','#65a30d'];
  const PROJECT_ICONS  = ['🏋️','⚽','🏀','🏊','🚴','🎾','🏃','🥊','🤸','🧘','🏒','⛷️','🤾'];
  const PROJECT_TYPES  = [
    { value:'gym',         label:'Posilovna / Gym' },
    { value:'football',    label:'Fotbal' },
    { value:'basketball',  label:'Basketbal' },
    { value:'swimming',    label:'Plavání' },
    { value:'cycling',     label:'Cyklistika' },
    { value:'running',     label:'Běh' },
    { value:'tennis',      label:'Tenis' },
    { value:'martial_arts',label:'Bojový sport' },
    { value:'other',       label:'Jiný sport' },
  ];
  const DAYS = ['Po','Út','St','Čt','Pá','So','Ne'];

  let _selectedId = null;

  /* ===== MAIN LIST (Master-Detail) ===== */
  function renderList(el) {
    const projects = Storage.getProjects();
    if (!_selectedId || !projects.find(p => p.id === _selectedId)) {
      _selectedId = projects[0]?.id || null;
    }

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">📁 Projekty</h1>
          <p class="page-subtitle">Sporty a tréninkové skupiny</p>
        </div>
        <button class="btn btn-primary" onclick="Projects.renderForm(document.getElementById('main-content'),null)">+ Nový projekt</button>
      </div>

      ${projects.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <h3>Žádné projekty</h3>
          <p>Vytvořte první sportovní projekt nebo skupinu</p>
          <button class="btn btn-primary" onclick="Projects.renderForm(document.getElementById('main-content'),null)">Vytvořit projekt</button>
        </div>` : `
        <div class="project-master-detail">
          <!-- LEFT: project list -->
          <div class="project-list-panel" id="proj-list-panel">
            ${projects.map(p => projectListItemHtml(p)).join('')}
          </div>
          <!-- RIGHT: detail panel -->
          <div id="project-detail-panel">
            ${_selectedId ? renderOptionsPanel(_selectedId) : ''}
          </div>
        </div>`}`;
  }

  function projectListItemHtml(project) {
    const players  = Storage.getPlayersByProject(project.id);
    const sessions = Storage.getSessionsByProject(project.id);
    const trainingDays = project.trainingDays || [];
    const isActive = project.id === _selectedId;
    return `
      <div class="project-list-item${isActive?' active':''}" data-project-id="${project.id}"
           onclick="Projects.selectProject('${project.id}')">
        <div class="project-list-icon" style="background:${project.color}18;color:${project.color}">
          ${project.icon}
        </div>
        <div class="project-list-info">
          <div class="project-list-name">${project.name}</div>
          <div class="project-list-meta">
            <i class="icon icon-users"></i> ${players.length} &nbsp;·&nbsp; <i class="icon icon-list"></i> ${sessions.length}
            ${trainingDays.length ? `&nbsp;·&nbsp; <span style="color:var(--accent)">${trainingDays.join(' ')}</span>` : ''}
          </div>
        </div>
        ${isActive ? '<div class="project-list-chevron">›</div>' : ''}
      </div>`;
  }

  function selectProject(projectId) {
    _selectedId = projectId;
    // Update active class in list
    document.querySelectorAll('.project-list-item').forEach(el => {
      const active = el.dataset.projectId === projectId;
      el.classList.toggle('active', active);
      const chev = el.querySelector('.project-list-chevron');
      if (active && !chev) el.insertAdjacentHTML('beforeend','<div class="project-list-chevron">›</div>');
      if (!active && chev) chev.remove();
    });
    // Re-render right panel
    const panel = document.getElementById('project-detail-panel');
    if (panel) panel.innerHTML = renderOptionsPanel(projectId);
  }

  /* ===== OPTIONS PANEL (right side) ===== */
  function renderOptionsPanel(projectId) {
    const project = Storage.getProjectById(projectId);
    if (!project) return '';
    const players      = Storage.getPlayersByProject(projectId);
    const sessions     = Storage.getSessionsByProject(projectId);
    const today        = new Date().toISOString().split('T')[0];
    const upcoming     = sessions.filter(s => s.date >= today).sort((a,b) => a.date.localeCompare(b.date)).slice(0,8);
    const trainingDays = project.trainingDays || [];
    const cfg          = Storage.getSettings();

    return `
      <div class="proj-options-header">
        <div style="display:flex;align-items:center;gap:14px;min-width:0">
          <div class="proj-options-icon" style="background:${project.color}18;color:${project.color}">${project.icon}</div>
          <div style="min-width:0">
            <div class="proj-options-name">${project.name}</div>
            <div class="proj-options-desc">${project.description||'&nbsp;'}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="Projects.renderForm(document.getElementById('main-content'),'${projectId}')"><i class="icon icon-edit"></i> Upravit</button>
          <button class="btn btn-secondary btn-sm" onclick="App.navigate('#/project/${projectId}')"><i class="icon icon-list"></i> Detail</button>
          <button class="btn btn-primary btn-sm" onclick="App.navigate('#/project/${projectId}/session/new')">+ Trénink</button>
        </div>
      </div>

      <div class="proj-options-body">

        <!-- PRIORITY: Upcoming sessions -->
        <div class="proj-options-section">
          <div class="proj-section-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s4)">
            <span><i class="icon icon-list"></i> Nadcházející tréninky
              ${upcoming.length ? `<span class="upcoming-badge" style="margin-left:6px">${upcoming.length}</span>` : ''}
            </span>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('#/project/${projectId}/session/new')">+ Nový</button>
          </div>
          ${upcoming.length === 0 ? `
            <div style="text-align:center;padding:20px 0">
              <div style="font-size:1.8rem;opacity:.2;margin-bottom:8px"><i class="icon icon-calendar"></i></div>
              <p class="text-sm text-muted">Žádné naplánované tréninky.</p>
              <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="App.navigate('#/project/${projectId}/session/new')">Naplánovat</button>
            </div>` : `
            <div style="display:flex;flex-direction:column;gap:6px">
              ${upcoming.map(s => {
                const diff = Math.round((new Date(s.date+'T00:00:00') - new Date()) / 86400000);
                const badge = diff === 0 ? `<span class="days-badge days-today">Dnes</span>`
                            : diff === 1 ? `<span class="days-badge days-tomorrow">Zítra</span>`
                            : diff <= 7  ? `<span class="days-badge days-week">za ${diff} dní</span>`
                            :              `<span class="days-badge">${App.fmtDateShort(s.date)}</span>`;
                return `
                <div class="session-row" style="padding:10px 14px" onclick="App.navigate('#/session/${s.id}')">
                  <div class="session-row-left">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
                      ${badge}
                    </div>
                    <div class="session-row-title">${s.title}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:5px">
                    <span class="chip"><i class="icon icon-users"></i> ${Object.keys(s.playerPlans||{}).length}</span>
                    <button class="btn-icon-sm" title="Duplikovat" onclick="event.stopPropagation();Projects.duplicateSession('${s.id}')"><i class="icon icon-copy"></i></button>
                  </div>
                </div>`;
              }).join('')}
            </div>`}
        </div>

        <!-- Compact: training days + players -->
        <div class="proj-options-section proj-compact-row">
          <div class="proj-compact-col">
            <div class="proj-section-title" style="margin-bottom:var(--s3)"><i class="icon icon-calendar"></i> Dny tréninků</div>
            <div class="day-picker" style="gap:4px">
              ${DAYS.map(d => `
                <div class="day-pill day-pill-sm${trainingDays.includes(d)?' selected':''}" data-day="${d}"
                     onclick="Projects._toggleDay('${projectId}','${d}',this)">${d}</div>
              `).join('')}
            </div>
          </div>
          <div class="proj-compact-col">
            <div class="proj-section-title" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--s3)">
              <span><i class="icon icon-users"></i> Hráči (${players.length}${project.capacity?' / '+project.capacity:''})</span>
              <button class="btn btn-ghost btn-sm" onclick="Players.showAddToProjectModal('${projectId}')">+</button>
            </div>
            ${players.length === 0
              ? `<button class="btn btn-secondary btn-sm" onclick="Players.showAddToProjectModal('${projectId}')">Přidat hráče</button>`
              : `<div class="players-mini-row">
                   ${players.map(p => `
                     <div class="players-mini-chip" title="${p.name}" onclick="App.navigate('#/player/${p.id}/edit')">
                       <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
                       <span>${p.name.split(' ')[0]}</span>
                     </div>`).join('')}
                 </div>`}
          </div>
        </div>

        <!-- Settings: collapsible accordion -->
        <details class="proj-settings-accordion">
          <summary class="proj-settings-summary">
            <div style="flex:1;min-width:0">
              <div class="proj-section-title" style="margin-bottom:2px"><i class="icon icon-settings"></i> Nastavení projektu</div>
              <div class="proj-settings-meta">${
                [project.location, project.coachName, project.monthlyFee ? project.monthlyFee+'\u00a0'+cfg.defaultCurrency : '']
                  .filter(Boolean).join(' · ') || 'Klikněte pro nastavení'
              }</div>
            </div>
            <span class="proj-settings-chevron">›</span>
          </summary>
          <div class="proj-settings-body">
            <form class="form" id="proj-opts-form-${projectId}" onsubmit="event.preventDefault()">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Místo konání</label>
                  <input class="form-input" id="po-loc-${projectId}" placeholder="Fitness centrum, hřiště…" value="${project.location||''}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Trenér / kontakt</label>
                  <input class="form-input" id="po-coach-${projectId}" placeholder="Jméno nebo telefon…" value="${project.coachName||''}" />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Měs. poplatek (${cfg.defaultCurrency})</label>
                  <input class="form-input" type="number" id="po-fee-${projectId}" placeholder="0" min="0" value="${project.monthlyFee||''}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Max. kapacita</label>
                  <input class="form-input" type="number" id="po-cap-${projectId}" placeholder="—" min="0" value="${project.capacity||''}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Poznámky</label>
                <textarea class="form-textarea" id="po-notes-${projectId}" rows="2" placeholder="Libovolné poznámky k projektu…">${project.notes||''}</textarea>
              </div>
              <div class="form-actions">
                <button type="button" class="btn btn-danger btn-sm" onclick="Projects.confirmDelete('${projectId}')"><i class="icon icon-trash"></i> Smazat projekt</button>
                <button type="button" class="btn btn-primary" onclick="Projects._saveOptions('${projectId}')">💾 Uložit nastavení</button>
              </div>
            </form>
          </div>
        </details>

      </div>`;
  }

  /* ===== TOGGLE TRAINING DAY ===== */
  function _toggleDay(projectId, day, el) {
    const project = Storage.getProjectById(projectId);
    if (!project) return;
    const days = [...(project.trainingDays || [])];
    const idx = days.indexOf(day);
    if (idx === -1) days.push(day);
    else days.splice(idx, 1);
    days.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    Storage.updateProject(projectId, { trainingDays: days });
    el.classList.toggle('selected');
    // Update list item meta
    const listItem = document.querySelector(`.project-list-item[data-project-id="${projectId}"] .project-list-meta`);
    if (listItem) {
      const plCount = Storage.getPlayersByProject(projectId).length;
      const sesCount = Storage.getSessionsByProject(projectId).length;
      listItem.innerHTML = `<i class="icon icon-users"></i> ${plCount} &nbsp;·&nbsp; <i class="icon icon-list"></i> ${sesCount}${days.length ? ` &nbsp;·&nbsp; <span style="color:var(--accent)">${days.join(' ')}</span>` : ''}`;
    }
  }

  /* ===== SAVE PROJECT OPTIONS ===== */
  function _saveOptions(projectId) {
    const data = {
      location:   document.getElementById(`po-loc-${projectId}`)?.value?.trim()   || '',
      coachName:  document.getElementById(`po-coach-${projectId}`)?.value?.trim() || '',
      monthlyFee: Number(document.getElementById(`po-fee-${projectId}`)?.value)   || 0,
      capacity:   Number(document.getElementById(`po-cap-${projectId}`)?.value)   || 0,
      notes:      document.getElementById(`po-notes-${projectId}`)?.value?.trim() || '',
    };
    Storage.updateProject(projectId, data);
    App.showToast('Nastavení projektu uloženo ✓');
  }

  /* ===== DETAIL VIEW (full view via #/project/:id) ===== */
  function renderDetail(el, projectId) {
    const project = Storage.getProjectById(projectId);
    if (!project) { el.innerHTML = `<p style="color:var(--text-muted)">Projekt nenalezen.</p>`; return; }

    const players  = Storage.getPlayersByProject(projectId);
    const sessions = Storage.getSessionsByProject(projectId);
    const payments = Storage.getPayments().filter(p => p.projectId === projectId);
    const today    = new Date().toISOString().split('T')[0];
    const upcoming = sessions.filter(s => s.date >= today);
    const past     = sessions.filter(s => s.date < today);

    el.innerHTML = `
      <button class="back-btn" onclick="App.navigate('#/projects')">← Projekty</button>
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:16px">
          <div style="font-size:2.5rem">${project.icon}</div>
          <div>
            <h1 class="page-title">${project.name}</h1>
            <p class="page-subtitle">${project.description || ''}</p>
          </div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="Projects.renderForm(document.getElementById('main-content'),'${projectId}')"><i class="icon icon-edit"></i> Upravit</button>
          <button class="btn btn-danger btn-sm" onclick="Projects.confirmDelete('${projectId}')"><i class="icon icon-trash"></i> Smazat</button>
          <button class="btn btn-primary" onclick="App.navigate('#/project/${projectId}/session/new')">+ Nový trénink</button>
        </div>
      </div>

      <div class="detail-grid">
        <div>
          <div class="section">
            <div class="section-header">
              <h2 class="section-title"><i class="icon icon-list"></i> Naplánované tréninky (${upcoming.length})</h2>
            </div>
            ${upcoming.length === 0 ? `
              <div class="empty-state" style="padding:32px">
                <div class="empty-icon"><i class="icon icon-calendar"></i></div>
                <h3>Žádné nadcházející tréninky</h3>
                <button class="btn btn-primary btn-sm" onclick="App.navigate('#/project/${projectId}/session/new')">Přidat trénink</button>
              </div>` : `
              <div class="session-list">
                ${upcoming.map(s => sessionRowHtml(s)).join('')}
              </div>`}
          </div>

          ${past.length > 0 ? `
          <div class="section">
            <div class="section-header">
              <h2 class="section-title">📜 Proběhlé tréninky (${past.length})</h2>
            </div>
            <div class="session-list">
              ${past.map(s => sessionRowHtml(s)).join('')}
            </div>
          </div>` : ''}

          <div class="section">
            <div class="section-header">
              <h2 class="section-title"><i class="icon icon-list"></i> Platby projektu</h2>
              <button class="btn btn-secondary btn-sm" onclick="App.navigate('#/payments')">Všechny platby</button>
            </div>
            ${payments.length === 0 ? `
              <div class="empty-state" style="padding:24px">
                <div class="empty-icon"><i class="icon icon-list"></i></div>
                <h3>Žádné platby</h3>
              </div>` : `
              <div class="section-card">
                <div class="table-wrap">
                  <table class="payment-table">
                    <thead><tr>
                      <th>Datum</th><th>Dny</th><th>Hráč(i)</th><th>Částka</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      ${payments.slice(0,8).map(p => {
                        const names = (p.playerIds||[]).map(id => Storage.getPlayerById(id)?.name || id).join(', ');
                        const days  = (p.trainingDays||[]).map(d => `<span class="day-chip">${d}</span>`).join('');
                        return `<tr onclick="App.navigate('#/payments')" style="cursor:pointer">
                          <td>${App.fmtDateShort(p.date)}</td>
                          <td><div style="display:flex;gap:3px;flex-wrap:wrap">${days||'—'}</div></td>
                          <td>${names||'—'}</td>
                          <td class="payment-amount">${Number(p.amount).toLocaleString('cs-CZ')} ${p.currency}</td>
                          <td><span class="status-badge status-${p.status}">${p.status==='confirmed'?'Potvrzeno':'Čeká'}</span></td>
                        </tr>`;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>`}
          </div>
        </div>

        <div>
          <div class="section">
            <div class="section-header">
              <h2 class="section-title"><i class="icon icon-users"></i> Hráči (${players.length})</h2>
              <button class="btn btn-secondary btn-sm" onclick="Players.showAddToProjectModal('${projectId}')">+ Přidat</button>
            </div>
            ${players.length === 0 ? `
              <div class="empty-state" style="padding:24px">
                <div class="empty-icon">👤</div>
                <h3>Žádní hráči</h3>
                <button class="btn btn-secondary btn-sm" onclick="Players.showAddToProjectModal('${projectId}')">Přidat hráče</button>
              </div>` : `
              <div style="display:flex;flex-direction:column;gap:8px">
                ${players.map(player => playerRowHtml(player, projectId)).join('')}
              </div>`}
          </div>
        </div>
      </div>`;
  }

  function sessionRowHtml(s) {
    const playerCount = Object.keys(s.playerPlans || {}).length;
    return `
      <div class="session-row" onclick="App.navigate('#/session/${s.id}')">
        <div class="session-row-left">
          <div class="session-row-date">${App.fmtDate(s.date)}</div>
          <div class="session-row-title">${s.title}</div>
        </div>
        <div class="session-row-right">
          <span class="chip"><i class="icon icon-users"></i> ${playerCount}</span>
          <span class="status-badge status-${s.status}">${App.statusLabel(s.status)}</span>
          <button class="btn-icon-sm" title="Duplikovat" onclick="event.stopPropagation();Projects.duplicateSession('${s.id}')"><i class="icon icon-copy"></i></button>
          <button class="btn-icon-sm" title="Smazat" onclick="event.stopPropagation();Projects.deleteSession('${s.id}')"><i class="icon icon-trash"></i></button>
        </div>
      </div>`;
  }

  function playerRowHtml(player, projectId) {
    return `
      <div class="card card-hover" style="padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="App.navigate('#/player/${player.id}/edit')">
        <div class="avatar avatar-md" style="background:${player.color}">${player.initials}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.9rem">${player.name}</div>
          ${player.note ? `<div class="text-xs text-muted">${player.note}</div>` : ''}
        </div>
        <button class="btn-icon-sm" title="Odebrat z projektu" onclick="event.stopPropagation();Projects.removePlayer('${player.id}','${projectId}')">✕</button>
      </div>`;
  }

  /* ===== FORM (new/edit) ===== */
  function renderForm(el, editId) {
    const project = editId ? Storage.getProjectById(editId) : null;
    const isEdit  = !!project;

    el.innerHTML = `
      <button class="back-btn" onclick="history.back()">← Zpět</button>
      <div class="page-header">
        <h1 class="page-title">${isEdit ? 'Upravit projekt' : 'Nový projekt'}</h1>
      </div>

      <div class="card" style="max-width:640px">
        <div class="card-body">
          <form class="form" id="project-form">
            <div class="form-group">
              <label class="form-label">Název projektu <span class="req">*</span></label>
              <input class="form-input" id="pf-name" placeholder="např. Posilovna, FC Sparta..." maxlength="60" value="${project?.name||''}" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Typ sportu</label>
                <select class="form-select" id="pf-type">
                  ${PROJECT_TYPES.map(t => `<option value="${t.value}"${(project?.type||'gym')===t.value?' selected':''}>${t.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Popis</label>
                <input class="form-input" id="pf-desc" placeholder="Volitelný popis..." maxlength="120" value="${project?.description||''}" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ikona projektu</label>
              <div class="icon-picker" id="pf-icon-picker">
                ${PROJECT_ICONS.map(ic => `
                  <div class="icon-pill${(project?.icon||'🏋️')===ic?' selected':''}" data-icon="${ic}" onclick="Projects._selectIcon(this,'pf-icon-picker')">${ic}</div>
                `).join('')}
              </div>
              <input type="hidden" id="pf-icon" value="${project?.icon||'🏋️'}" />
            </div>

            <div class="form-group">
              <label class="form-label">Barva projektu</label>
              <div class="color-picker">
                ${PROJECT_COLORS.map(c => `
                  <div class="color-pill${(project?.color||'#7c3aed')===c?' selected':''}" style="background:${c}" data-color="${c}" onclick="Projects._selectColor(this)"></div>
                `).join('')}
              </div>
              <input type="hidden" id="pf-color" value="${project?.color||'#7c3aed'}" />
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-ghost" onclick="history.back()">Zrušit</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Uložit změny' : 'Vytvořit projekt'}</button>
            </div>
          </form>
        </div>
      </div>`;

    document.getElementById('project-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('pf-name').value.trim();
      if (!name) return;
      const data = {
        name,
        type:        document.getElementById('pf-type').value,
        description: document.getElementById('pf-desc').value.trim(),
        icon:        document.getElementById('pf-icon').value,
        color:       document.getElementById('pf-color').value,
      };
      if (isEdit) {
        Storage.updateProject(editId, data);
        App.showToast('Projekt upraven ✓');
        App.navigate('#/projects');
      } else {
        const id = Storage.generateId();
        Storage.addProject({ id, ...data, createdAt: new Date().toISOString(), playerIds: [], trainingDays: [] });
        App.showToast('Projekt vytvořen ✓');
        _selectedId = id;
        App.navigate('#/projects');
      }
    });
  }

  /* ===== ACTIONS ===== */
  function confirmDelete(projectId) {
    const proj = Storage.getProjectById(projectId);
    App.showConfirm(
      `Opravdu smazat projekt „${proj?.name}"? Budou smazány i všechny tréninky.`,
      () => {
        Storage.deleteProject(projectId);
        _selectedId = null;
        App.showToast('Projekt smazán');
        App.navigate('#/projects');
      }
    );
  }

  function deleteSession(sessionId) {
    App.showConfirm('Smazat tento trénink?', () => {
      Storage.deleteSession(sessionId);
      App.showToast('Trénink smazán');
      App.handleRoute();
    });
  }

  /* ===== DUPLICATE SESSION ===== */
  function duplicateSession(sessionId) {
    const s = Storage.getSessionById(sessionId);
    if (!s) return;
    const nextDay = new Date(new Date(s.date+'T00:00:00').getTime() + 7*86400000)
      .toISOString().split('T')[0]; // default: same weekday next week

    App.showModal('<i class="icon icon-copy"></i> Duplikovat trénink',
      `<div class="form">
        <div class="dup-preview">
          <div class="dup-preview-icon"><i class="icon icon-copy"></i></div>
          <div>
            <div class="dup-preview-title">${s.title}</div>
            <div class="dup-preview-meta">${App.fmtDateShort(s.date)} &nbsp;·&nbsp; <i class="icon icon-users"></i> ${Object.keys(s.playerPlans||{}).length} hráčů</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Název kopie</label>
          <input class="form-input" id="dup-title" value="${s.title} (kopie)" maxlength="80" />
        </div>
        <div class="form-group">
          <label class="form-label">Nové datum <span class="req">*</span></label>
          <input class="form-input" type="date" id="dup-date" value="${nextDay}" required />
        </div>
        <div class="form-hint" style="margin-top:-8px">
          Všechna cvičení budou zkopírována. Stav "dokončeno" bude resetován.
        </div>
      </div>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Zrušit</button>
       <button class="btn btn-primary" onclick="Projects._confirmDuplicate('${sessionId}')"><i class="icon icon-copy"></i> Duplikovat</button>`
    );
  }

  function _confirmDuplicate(sessionId) {
    const s = Storage.getSessionById(sessionId);
    if (!s) return;
    const date  = document.getElementById('dup-date')?.value;
    const title = document.getElementById('dup-title')?.value?.trim();
    if (!date || !title) { App.showToast('Vyplnte název a datum', 'error'); return; }

    // Deep clone via JSON
    const clone = JSON.parse(JSON.stringify(s));
    clone.id        = Storage.generateId();
    clone.date      = date;
    clone.title     = title;
    clone.status    = 'planned';
    clone.createdAt = new Date().toISOString();

    // Reset all exercise completion + generate new exercise IDs
    if (clone.playerPlans) {
      Object.values(clone.playerPlans).forEach(plan => {
        plan.allCompleted = false;
        (plan.exercises || []).forEach(ex => {
          ex.id        = Storage.generateId();
          ex.completed = false;
        });
      });
    }

    Storage.addSession(clone);
    App.closeModal();
    App.showToast(`Trénink "${title}" duplikovan ✓`);
    App.handleRoute();
  }

  function removePlayer(playerId, projectId) {
    Storage.removePlayerFromProject(playerId, projectId);
    App.showToast('Hráč odebrán z projektu');
    App.navigate(`#/project/${projectId}`);
  }

  /* ===== UI HELPERS ===== */
  function _selectIcon(el, pickerId) {
    document.querySelectorAll(`#${pickerId} .icon-pill`).forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    const input = el.closest('.form').querySelector('#pf-icon');
    if (input) input.value = el.dataset.icon;
  }

  function _selectColor(el) {
    el.closest('.color-picker').querySelectorAll('.color-pill').forEach(p => p.classList.remove('selected'));
    el.classList.add('selected');
    const input = el.closest('.form').querySelector('#pf-color');
    if (input) input.value = el.dataset.color;
  }

  return {
    renderList, renderDetail, renderForm, selectProject,
    confirmDelete, deleteSession, removePlayer,
    duplicateSession, _confirmDuplicate,
    _toggleDay, _saveOptions,
    _selectIcon, _selectColor,
  };
})();
