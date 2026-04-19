/* =====================================================
   settings.js — Nastavení + JSON backup/restore
   ===================================================== */
'use strict';

const Settings = (() => {

  function render(el) {
    const s = Storage.getSettings();
    const projects = Storage.getProjects();
    const players  = Storage.getPlayers();
    const sessions = Storage.getSessions();
    const payments = Storage.getPayments();

    el.innerHTML = `
      <div class="page-header">
        <h1 class="page-title"><i class="icon icon-settings"></i> Nastavení</h1>
        <p class="page-subtitle">Konfigurace aplikace a správa dat</p>
      </div>

      <!-- General settings -->
      <div class="settings-section">
        <div class="settings-section-title">Obecné</div>
        <div class="card" style="max-width:560px">
          <div class="card-body">
            <form class="form" id="settings-form">
              <div class="form-group">
                <label class="form-label">Vaše jméno (zobrazuje se v PDF)</label>
                <input class="form-input" id="s-name" value="${s.userName||''}" placeholder="Trenér Novák" maxlength="60" />
              </div>
              <div class="form-group">
                <label class="form-label">Výchozí měna</label>
                <select class="form-select" id="s-currency">
                  <option value="CZK"${s.defaultCurrency==='CZK'?' selected':''}>CZK — Česká koruna</option>
                  <option value="EUR"${s.defaultCurrency==='EUR'?' selected':''}>EUR — Euro</option>
                  <option value="USD"${s.defaultCurrency==='USD'?' selected':''}>USD — Americký dolar</option>
                </select>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-primary">Uložit nastavení</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- PIN Settings -->
      <div class="settings-section">
        <div class="settings-section-title">🔐 PIN trenéra</div>
        <div class="card" style="max-width:560px">
          <div class="card-body">
            <p class="text-sm text-muted" style="margin-bottom:16px">
              PIN slouží k potvrzení plateb a dokončení tréninků. Sdělte ho svému trenérovi.
              Výchozí PIN: <strong style="color:var(--accent-light)">1234</strong>
            </p>
            <form class="form" id="pin-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nový PIN (4–6 číslic)</label>
                  <input class="form-input" id="s-pin" type="password" inputmode="numeric"
                    placeholder="••••" maxlength="6" pattern="[0-9]{4,6}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Potvrdit PIN</label>
                  <input class="form-input" id="s-pin2" type="password" inputmode="numeric"
                    placeholder="••••" maxlength="6" />
                </div>
              </div>
              <div class="form-actions">
                <button type="submit" class="btn btn-secondary">Změnit PIN</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Data Stats -->
      <div class="settings-section">
        <div class="settings-section-title">📊 Data a statistiky</div>
        <div class="stats-grid" style="max-width:560px;margin-bottom:0">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(124,58,237,.15);color:#a78bfa">📁</div>
            <div class="stat-info">
              <div class="stat-value">${projects.length}</div>
              <div class="stat-label">Projekty</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(34,197,94,.15);color:#4ade80"><i class="icon icon-users"></i></div>
            <div class="stat-info">
              <div class="stat-value">${players.length}</div>
              <div class="stat-label">Sportovci</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(59,130,246,.15);color:#60a5fa"><i class="icon icon-calendar"></i></div>
            <div class="stat-info">
              <div class="stat-value">${sessions.length}</div>
              <div class="stat-label">Tréninky</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(245,158,11,.15);color:#fbbf24"><i class="icon icon-list"></i></div>
            <div class="stat-info">
              <div class="stat-value">${payments.length}</div>
              <div class="stat-label">Platby</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Backup / Restore -->
      <div class="settings-section">
        <div class="settings-section-title">💾 Záloha a obnovení dat</div>
        <div class="card" style="max-width:560px">
          <div class="card-body">
            <p class="text-sm text-muted" style="margin-bottom:16px">
              Exportujte všechna data jako JSON soubor nebo importujte zálohu.
              Data jsou uložena lokálně v prohlížeči.
            </p>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-secondary" onclick="Settings.exportJSON()">⬇️ Exportovat zálohu (JSON)</button>
              <button class="btn btn-secondary" onclick="Settings.triggerImport()">⬆️ Importovat zálohu</button>
              <input type="file" id="import-input" accept=".json" style="display:none" onchange="Settings.importJSON(this)" />
            </div>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="settings-section">
        <div class="settings-section-title" style="color:var(--danger)">⚠️ Nebezpečná zóna</div>
        <div class="card" style="max-width:560px;border-color:rgba(239,68,68,.2)">
          <div class="card-body">
            <p class="text-sm text-muted" style="margin-bottom:16px">
              Tato akce smaže <strong>všechna data</strong> nenávratně.
            </p>
            <button class="btn btn-danger" onclick="Settings.confirmClearAll()"><i class="icon icon-trash"></i> Smazat všechna data</button>
          </div>
        </div>
      </div>`;

    // Form handlers
    document.getElementById('settings-form').addEventListener('submit', e => {
      e.preventDefault();
      const name     = document.getElementById('s-name').value.trim();
      const currency = document.getElementById('s-currency').value;
      Storage.saveSettings({ ...Storage.getSettings(), userName: name, defaultCurrency: currency });
      App.showToast('Nastavení uloženo ✓');
      App.updateSidebarUser();
    });

    document.getElementById('pin-form').addEventListener('submit', e => {
      e.preventDefault();
      const pin  = document.getElementById('s-pin').value;
      const pin2 = document.getElementById('s-pin2').value;
      if (!pin || !/^\d{4,6}$/.test(pin)) { App.showToast('PIN musí být 4–6 číslic', 'error'); return; }
      if (pin !== pin2)                     { App.showToast('PINy se neshodují', 'error'); return; }
      Storage.saveSettings({ ...Storage.getSettings(), trainerPin: pin });
      App.showToast('PIN změněn ✓');
      document.getElementById('s-pin').value  = '';
      document.getElementById('s-pin2').value = '';
    });
  }

  /* ===== EXPORT / IMPORT ===== */
  function exportJSON() {
    const json = Storage.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `treninkovy_denik_zaloha_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); // Appending is required for Safari
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100); // Safari needs delay
    App.showToast('Záloha stažena ✓');
  }

  function triggerImport() {
    document.getElementById('import-input')?.click();
  }

  function importJSON(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        Storage.importAll(e.target.result);
        App.showToast('Data importována ✓. Stránka se obnoví.', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } catch(err) {
        App.showToast('Chyba při importu: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  /* ===== CLEAR ALL ===== */
  function confirmClearAll() {
    App.showConfirm(
      'Opravdu chcete smazat VŠECHNA data? Tato akce je nevratná!',
      () => {
        Object.values(Storage.KEYS).forEach(key => localStorage.removeItem(key));
        App.showToast('Všechna data smazána. Stránka se obnoví.', 'error');
        setTimeout(() => window.location.reload(), 1200);
      },
      'Smazat vše'
    );
  }

  return { render, exportJSON, triggerImport, importJSON, confirmClearAll };
})();
