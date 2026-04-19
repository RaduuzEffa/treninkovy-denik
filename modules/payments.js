/* =====================================================
   payments.js — Evidence plateb + multi-date picker
   ===================================================== */
'use strict';

const Payments = (() => {

  /* ===== STATE ===== */
  let _filters = { month: '', dateFrom: '', dateTo: '', projectId: '', status: '' };

  // Multi-date picker state (modal)
  let _calDates   = [];         // selected ISO date strings: ["2026-04-01","2026-04-08",…]
  let _calMonth   = new Date(); // currently displayed month

  /* =====================================================
     MAIN VIEW
  ===================================================== */
  function render(el) {
    const projects  = Storage.getProjects();
    const payments  = Storage.getPayments();
    const thisMonth = new Date().toISOString().slice(0, 7);

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title"><i class="icon icon-list"></i> Evidence plateb</h1>
          <p class="page-subtitle">Přehled a správa plateb za tréninky</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-ghost btn-sm" onclick="PDFExport.payments()"><i class="icon icon-copy"></i> Export PDF</button>
          <button class="btn btn-primary" onclick="Payments.showAddModal()">+ Nová platba</button>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="filter-bar">
        <div>
          <label class="form-label">Měsíc</label>
          <input class="form-input" type="month" id="flt-month" value="${_filters.month}" style="padding:6px 10px"
            onchange="Payments._applyFilter('month',this.value)" />
        </div>
        <div>
          <label class="form-label">Od data</label>
          <input class="form-input" type="date" id="flt-from" value="${_filters.dateFrom}" style="padding:6px 10px"
            onchange="Payments._applyFilter('dateFrom',this.value)" />
        </div>
        <div>
          <label class="form-label">Do data</label>
          <input class="form-input" type="date" id="flt-to" value="${_filters.dateTo}" style="padding:6px 10px"
            onchange="Payments._applyFilter('dateTo',this.value)" />
        </div>
        <div>
          <label class="form-label">Projekt</label>
          <select class="form-select" id="flt-project" style="padding:6px 10px"
            onchange="Payments._applyFilter('projectId',this.value)">
            <option value="">Všechny projekty</option>
            ${projects.map(p => `<option value="${p.id}"${_filters.projectId===p.id?' selected':''}>${p.icon} ${p.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="form-label">Status</label>
          <select class="form-select" id="flt-status" style="padding:6px 10px"
            onchange="Payments._applyFilter('status',this.value)">
            <option value="">Vše</option>
            <option value="pending"${_filters.status==='pending'?' selected':''}>Čekající</option>
            <option value="confirmed"${_filters.status==='confirmed'?' selected':''}>Potvrzeno</option>
          </select>
        </div>
        <div style="align-self:flex-end">
          <button class="btn btn-ghost btn-sm" onclick="Payments._resetFilters()">✕ Reset</button>
        </div>
        <div style="align-self:flex-end;margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="Payments._setQuick('month','${thisMonth}')">Tento měsíc</button>
          <button class="btn btn-ghost btn-sm" onclick="Payments._setQuickHalf()">Půlrok</button>
          <button class="btn btn-ghost btn-sm" onclick="Payments._setQuickYear()">Celý rok</button>
        </div>
      </div>

      <!-- Table -->
      <div id="payments-table-wrap">
        ${renderTable(payments)}
      </div>`;
  }

  function renderTable(allPayments) {
    const filtered = _filterPayments(allPayments);
    const total    = filtered.reduce((s, p) => s + Number(p.amount), 0);
    const currency = filtered[0]?.currency || Storage.getSettings().defaultCurrency;

    if (filtered.length === 0) return `
      <div class="empty-state">
        <div class="empty-icon"><i class="icon icon-list"></i></div>
        <h3>Žádné platby</h3>
        <p>${Object.values(_filters).some(v => v) ? 'Žádné výsledky pro zadané filtry.' : 'Přidejte první platbu.'}</p>
        <button class="btn btn-primary btn-sm" onclick="Payments.showAddModal()">+ Nová platba</button>
      </div>`;

    return `
      <div class="section-card">
        <div class="table-wrap">
          <table class="payment-table">
            <thead><tr>
              <th>Datum platby</th>
              <th>Dny tréninků</th>
              <th>Projekt</th>
              <th>Sportovec(i)</th>
              <th>Poznámka</th>
              <th>Částka</th>
              <th>Status</th>
              <th>Akce</th>
            </tr></thead>
            <tbody>
              ${filtered.sort((a,b) => b.date.localeCompare(a.date)).map(p => paymentRowHtml(p)).join('')}
            </tbody>
          </table>
        </div>
        <div class="payment-footer">
          <span class="text-sm text-muted">${filtered.length} plateb</span>
          <div>
            <span class="text-sm text-muted" style="margin-right:8px">Celkem:</span>
            <span class="payment-total">${total.toLocaleString('cs-CZ')} ${currency}</span>
          </div>
        </div>
      </div>`;
  }

  function paymentRowHtml(p) {
    const proj    = Storage.getProjectById(p.projectId);
    const players = (p.playerIds||[]).map(id => Storage.getPlayerById(id)?.name).filter(Boolean).join(', ');
    const dates   = (p.trainingDates || []).sort();

    let datesCell = '<span class="text-muted" style="font-size:.75rem">—</span>';
    if (dates.length) {
      const fmt = d => new Date(d+'T00:00:00').toLocaleDateString('cs-CZ',{day:'numeric',month:'numeric'});
      const show = dates.slice(0, 3).map(d => `<span class="training-date-chip">${fmt(d)}</span>`).join('');
      const more = dates.length > 3 ? `<span class="training-date-chip more">+${dates.length-3}</span>` : '';
      datesCell = `<div style="display:flex;flex-wrap:wrap;gap:3px">${show}${more}</div>`;
    }

    return `
      <tr id="prow-${p.id}">
        <td style="white-space:nowrap">${App.fmtDateShort(p.date)}</td>
        <td>${datesCell}</td>
        <td>
          ${proj ? `<span class="chip">${proj.icon} ${proj.name}</span>` : '<span class="text-muted">—</span>'}
        </td>
        <td class="text-sm">${players || '—'}</td>
        <td class="text-sm text-muted">${p.note || '—'}</td>
        <td><span class="payment-amount">${Number(p.amount).toLocaleString('cs-CZ')} ${p.currency}</span></td>
        <td>
          <span class="status-badge status-${p.status}">
            ${p.status === 'confirmed' ? '✓ Potvrzeno' : '⏳ Čeká'}
          </span>
        </td>
        <td>
          <div class="action-row">
            ${p.status === 'pending' ? `
              <button class="btn-icon-sm" title="Potvrdit PIN" onclick="Payments.confirmWithPin('${p.id}')">🔐</button>` : `
              <button class="btn-icon-sm" title="Zrušit potvrzení" onclick="Payments.unreconfirm('${p.id}')">↺</button>`}
            <button class="btn-icon-sm" title="Smazat" onclick="Payments.confirmDelete('${p.id}')"><i class="icon icon-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }

  /* =====================================================
     MULTI-DATE CALENDAR
  ===================================================== */
  function _calHTML() {
    const year  = _calMonth.getFullYear();
    const month = _calMonth.getMonth();
    const monthLabel = _calMonth.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
    const today       = new Date().toISOString().split('T')[0];
    const dowLabels   = ['Po','Út','St','Čt','Pá','So','Ne'];
    const firstDow    = new Date(year, month, 1).getDay(); // 0=Sun
    const offset      = firstDow === 0 ? 6 : firstDow - 1; // Mon-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = '';
    for (let i = 0; i < offset; i++) cells += '<div class="cal-cell cal-empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const iso      = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const selected = _calDates.includes(iso);
      const isToday  = iso === today;
      cells += `<div class="cal-cell${selected?' selected':''}${isToday&&!selected?' today':''}"
                     data-iso="${iso}" onclick="Payments._toggleDate('${iso}')">
                  ${d}
                </div>`;
    }

    const selectedHTML = _calDates.length === 0
      ? '<span class="form-hint">Klikněte na dny v kalendáři</span>'
      : [..._calDates].sort().map(iso => {
          const label = new Date(iso+'T00:00:00').toLocaleDateString('cs-CZ',{day:'numeric',month:'short',year:'numeric'});
          return `<span class="cal-date-chip">
            ${label}
            <button type="button" onclick="Payments._toggleDate('${iso}')" aria-label="Odebrat">×</button>
          </span>`;
        }).join('');

    return `
      <div class="multi-cal">
        <div class="cal-nav">
          <button type="button" class="cal-nav-btn" onclick="Payments._calNav(-1)" aria-label="Předchozí měsíc">‹</button>
          <span class="cal-month-label">${monthLabel}</span>
          <button type="button" class="cal-nav-btn" onclick="Payments._calNav(1)" aria-label="Další měsíc">›</button>
        </div>
        <div class="cal-grid">
          ${dowLabels.map(d => `<div class="cal-dow">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>
      <div class="cal-chips-wrap" id="cal-chips-wrap">
        ${selectedHTML}
      </div>`;
  }

  function _toggleDate(iso) {
    const idx = _calDates.indexOf(iso);
    if (idx === -1) _calDates.push(iso);
    else _calDates.splice(idx, 1);
    _rerenderCal();
  }

  function _calNav(dir) {
    _calMonth = new Date(_calMonth.getFullYear(), _calMonth.getMonth() + dir, 1);
    _rerenderCal();
  }

  function _rerenderCal() {
    const wrap = document.getElementById('np-cal-wrap');
    if (wrap) wrap.innerHTML = _calHTML();
  }

  /* =====================================================
     ADD MODAL
  ===================================================== */
  function showAddModal() {
    // Reset calendar state
    _calDates   = [];
    _calMonth   = new Date();

    const projects = Storage.getProjects();
    const settings = Storage.getSettings();
    const today    = new Date().toISOString().split('T')[0];

    App.showModal('Nová platba',
      `<form class="form" id="add-payment-form" onsubmit="event.preventDefault()">

        <!-- Basic info row -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Datum platby <span class="req">*</span></label>
            <input class="form-input" type="date" id="np-date" value="${today}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Projekt</label>
            <select class="form-select" id="np-project" onchange="Payments._loadPlayersForProject(this.value)">
              <option value="">— bez projektu —</option>
              ${projects.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Multi-date calendar -->
        <div class="form-group">
          <label class="form-label">Dny absolvovaných tréninků</label>
          <p class="form-hint" style="margin-bottom:8px">
            Vyberte všechny dny, kdy trénink proběhl — klidně ve více týdnech nebo měsících.
          </p>
          <div id="np-cal-wrap">
            ${_calHTML()}
          </div>
        </div>

        <!-- Amount & currency -->
        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Částka <span class="req">*</span></label>
            <input class="form-input" type="number" id="np-amount" min="0" step="1" placeholder="500" required />
          </div>
          <div class="form-group">
            <label class="form-label">Měna</label>
            <select class="form-select" id="np-currency">
              <option value="CZK"${settings.defaultCurrency==='CZK'?' selected':''}>CZK</option>
              <option value="EUR"${settings.defaultCurrency==='EUR'?' selected':''}>EUR</option>
              <option value="USD"${settings.defaultCurrency==='USD'?' selected':''}>USD</option>
            </select>
          </div>
        </div>

        <!-- Players (shown when project selected) -->
        <div class="form-group" id="player-select-group" style="display:none">
          <label class="form-label">Sportovec(i)</label>
          <div id="np-players-list" class="player-select-list" style="max-height:140px;overflow-y:auto"></div>
        </div>

        <!-- Note -->
        <div class="form-group">
          <label class="form-label">Poznámka</label>
          <input class="form-input" id="np-note" placeholder="Měsíční poplatek, vstup, …" />
        </div>

        <!-- Status -->
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-select" id="np-status">
            <option value="pending">⏳ Čeká na potvrzení</option>
            <option value="confirmed">✓ Potvrzeno</option>
          </select>
        </div>

      </form>`,
      `<button class="btn btn-ghost" onclick="App.closeModal()">Zrušit</button>
       <button class="btn btn-primary" onclick="Payments._submitAdd()">Přidat platbu</button>`
    );
  }

  function _loadPlayersForProject(projectId) {
    const group = document.getElementById('player-select-group');
    const list  = document.getElementById('np-players-list');
    if (!group || !list) return;
    if (!projectId) { group.style.display = 'none'; list.innerHTML = ''; return; }
    const players = Storage.getPlayersByProject(projectId);
    if (!players.length) { group.style.display = 'none'; return; }
    group.style.display = '';
    list.innerHTML = players.map(p => `
      <div class="player-select-item"
           onclick="this.classList.toggle('selected');this.querySelector('.player-select-check').textContent=this.classList.contains('selected')?'✓':''"
           data-player-id="${p.id}">
        <div class="player-select-check"></div>
        <div class="avatar avatar-sm" style="background:${p.color}">${p.initials}</div>
        <span style="font-size:.875rem">${p.name}</span>
      </div>`).join('');
  }

  function _submitAdd() {
    const date   = document.getElementById('np-date')?.value;
    const amount = document.getElementById('np-amount')?.value;
    if (!date || !amount) { App.showToast('Vyplňte datum a částku', 'error'); return; }
    const projectId   = document.getElementById('np-project')?.value;
    const currency    = document.getElementById('np-currency')?.value || 'CZK';
    const note        = document.getElementById('np-note')?.value?.trim();
    const status      = document.getElementById('np-status')?.value || 'pending';
    const playerIds   = [...document.querySelectorAll('#np-players-list .player-select-item.selected')]
      .map(el => el.dataset.playerId).filter(Boolean);
    const trainingDates = [..._calDates].sort(); // actual calendar dates selected
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();

    Storage.addPayment({
      id: Storage.generateId(), date, amount: Number(amount), currency,
      note: note || '', projectId: projectId || null, playerIds,
      trainingDates,
      status,
      confirmationToken: token,
      confirmedAt: status === 'confirmed' ? new Date().toISOString() : null,
    });
    App.closeModal();
    App.showToast(`Platba přidána ✓${trainingDates.length ? ` (${trainingDates.length} trén. dní)` : ''}`);
    App.updatePendingBadge();
    _refresh();
  }

  /* =====================================================
     ACTIONS
  ===================================================== */
  function confirmWithPin(paymentId) {
    App.showPinModal(() => {
      Storage.updatePayment(paymentId, { status: 'confirmed', confirmedAt: new Date().toISOString() });
      App.showToast('Platba potvrzena ✓', 'success');
      App.updatePendingBadge();
      _refresh();
    }, 'Potvrďte platbu PIN kódem trenéra');
  }

  function unreconfirm(paymentId) {
    Storage.updatePayment(paymentId, { status: 'pending', confirmedAt: null });
    App.showToast('Potvrzení zrušeno');
    App.updatePendingBadge();
    _refresh();
  }

  function confirmDelete(paymentId) {
    const p = Storage.getPaymentById(paymentId);
    App.showConfirm(`Smazat platbu ${p ? `${Number(p.amount).toLocaleString('cs-CZ')} ${p.currency}` : ''}?`,
      () => { Storage.deletePayment(paymentId); App.showToast('Platba smazána'); App.updatePendingBadge(); _refresh(); }
    );
  }

  /* =====================================================
     FILTERS
  ===================================================== */
  function _applyFilter(key, value) {
    _filters[key] = value;
    if (key === 'month') { _filters.dateFrom = ''; _filters.dateTo = ''; }
    if (key === 'dateFrom' || key === 'dateTo') _filters.month = '';
    _refresh();
  }

  function _resetFilters() {
    _filters = { month: '', dateFrom: '', dateTo: '', projectId: '', status: '' };
    render(document.getElementById('main-content'));
  }

  function _setQuick(key, value) {
    _filters = { month: '', dateFrom: '', dateTo: '', projectId: '', status: '' };
    _filters[key] = value;
    _refresh();
  }

  function _setQuickHalf() {
    const now  = new Date();
    const half = now.getMonth() < 6;
    _filters.dateFrom = `${now.getFullYear()}-${half?'01':'07'}-01`;
    _filters.dateTo   = `${now.getFullYear()}-${half?'06':'12'}-${half?'30':'31'}`;
    _filters.month    = '';
    _refresh();
  }

  function _setQuickYear() {
    const y = new Date().getFullYear();
    _filters.dateFrom = `${y}-01-01`;
    _filters.dateTo   = `${y}-12-31`;
    _filters.month    = '';
    _refresh();
  }

  function _filterPayments(allPayments) {
    return allPayments.filter(p => {
      if (_filters.month     && !p.date.startsWith(_filters.month)) return false;
      if (_filters.dateFrom  && p.date < _filters.dateFrom)         return false;
      if (_filters.dateTo    && p.date > _filters.dateTo)           return false;
      if (_filters.projectId && p.projectId !== _filters.projectId) return false;
      if (_filters.status    && p.status !== _filters.status)       return false;
      return true;
    });
  }

  function _refresh() {
    const wrap = document.getElementById('payments-table-wrap');
    if (wrap) wrap.innerHTML = renderTable(Storage.getPayments());
  }

  /* ===== EXPOSE ===== */
  function getFilteredPayments() { return _filterPayments(Storage.getPayments()); }
  function getCurrentFilters()   { return { ..._filters }; }

  return {
    render, showAddModal,
    _loadPlayersForProject, _submitAdd,
    _toggleDate, _calNav,
    confirmWithPin, unreconfirm, confirmDelete,
    _applyFilter, _resetFilters,
    _setQuick, _setQuickHalf, _setQuickYear,
    getFilteredPayments, getCurrentFilters,
  };
})();
