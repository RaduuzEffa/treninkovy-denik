/* =====================================================
   trainers.js — Správa trenérů / lektorů
   ===================================================== */
'use strict';

const Trainers = (() => {

  /* ===== VYKRESLENÍ SEZNAMU ====== */
  function renderList(el) {
    const trainers = Storage.getTrainers();

    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title"><i class="icon icon-users"></i> Trenéři / Zástupy</h1>
          <p class="page-subtitle">Správa lektorů pro přiřazení do projektů</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="App.navigate('#/trainer/new')">+ Nový trenér</button>
        </div>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0">
          ${trainers.length === 0 ? `
            <div style="padding:var(--s8);text-align:center;color:var(--text-muted)">
              <div style="font-size:2rem;margin-bottom:var(--s2)"><i class="icon icon-users"></i></div>
              Zatím nebyl přidán žádný trenér.
            </div>` : `
            <table style="width:100%;border-collapse:collapse;text-align:left">
              <thead>
                <tr style="border-bottom:1px solid var(--border);background:var(--bg-input)">
                  <th style="padding:var(--s3) var(--s4);font-weight:600;font-size:.875rem">Jméno</th>
                  <th style="padding:var(--s3) var(--s4);font-weight:600;font-size:.875rem">Telefon / Kontakt</th>
                  <th style="padding:var(--s3) var(--s4);font-weight:600;font-size:.875rem">Poznámka / Specializace</th>
                  <th style="padding:var(--s3) var(--s4);width:60px"></th>
                </tr>
              </thead>
              <tbody>
                ${trainers.map(t => `
                  <tr style="border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.2s" 
                      onclick="App.navigate('#/trainer/${t.id}/edit')">
                    <td style="padding:var(--s3) var(--s4);font-weight:500;">
                      <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:32px;height:32px;background:var(--bg-input);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-weight:bold">
                          ${t.name.slice(0,2).toUpperCase()}
                        </div>
                        ${t.name}
                      </div>
                    </td>
                    <td style="padding:var(--s3) var(--s4)">${t.phone || '-'}</td>
                    <td style="padding:var(--s3) var(--s4)">${t.note || '-'}</td>
                    <td style="padding:var(--s3) var(--s4);text-align:right">
                      <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); Trainers.deleteTrainer('${t.id}')">🗑</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  }

  /* ===== VYKRESLENÍ FORMULÁŘE (Nový / Upravit) ====== */
  function renderForm(el, trainerId) {
    const isEdit = !!trainerId;
    const t = isEdit ? Storage.getTrainerById(trainerId) : { name: '', phone: '', note: '', pin: '' };

    el.innerHTML = `
      <div class="page-header">
        <div>
          <button class="btn btn-sm btn-secondary" onclick="App.navigate('#/trainers')" style="margin-bottom:var(--s2)">← Zpět na seznam</button>
          <h1 class="page-title">${isEdit ? 'Upravit trenéra' : 'Nový trenér'}</h1>
        </div>
      </div>

      <div class="card" style="max-width:600px">
        <div class="card-body">
          <form class="form" id="trainer-form">
            <div class="form-group">
              <label class="form-label">Jméno a příjmení trenéra *</label>
              <input class="form-input" id="t-name" value="${t.name}" required placeholder="Např. Martin Novák" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Telefon / Kontakt</label>
              <input class="form-input" id="t-phone" value="${t.phone}" placeholder="+420 123 456 789" />
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tajný PIN trenéra (4 číslice)</label>
                <input class="form-input" id="t-pin" type="password" inputmode="numeric" placeholder="••••" maxlength="4" pattern="[0-9]{4}" value="${t.pin||''}" />
              </div>
              <div class="form-group">
                <label class="form-label">Potvrdit PIN</label>
                <input class="form-input" id="t-pin2" type="password" inputmode="numeric" placeholder="••••" maxlength="4" pattern="[0-9]{4}" value="${t.pin||''}" />
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Poznámka / Specializace</label>
              <textarea class="form-input" id="t-note" rows="3" placeholder="Např. Specialista na kondiční trénink...">${t.note}</textarea>
            </div>

            <div class="form-actions" style="margin-top:var(--s6)">
              <button type="button" class="btn btn-secondary" onclick="App.navigate('#/trainers')">Zrušit</button>
              <button type="submit" class="btn btn-primary">${isEdit ? 'Uložit změny' : 'Založit trenéra'}</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('trainer-form').addEventListener('submit', (e) => {
      e.preventDefault();
      
      const pin = document.getElementById('t-pin').value.trim();
      const pin2 = document.getElementById('t-pin2').value.trim();

      if (pin !== pin2) {
        App.showToast('Zadané PINy se neshodují.', 'error');
        return;
      }

      const payload = {
        name: document.getElementById('t-name').value.trim(),
        phone: document.getElementById('t-phone').value.trim(),
        note: document.getElementById('t-note').value.trim(),
        pin: pin
      };

      if (!payload.name) {
        App.showToast('Jméno je povinné.', 'error');
        return;
      }

      if (isEdit) {
        Storage.updateTrainer(trainerId, payload);
        App.showToast('Trenér upraven ✓');
      } else {
        payload.id = Storage.generateId();
        Storage.addTrainer(payload);
        App.showToast('Trenér přidán ✓');
      }
      
      App.navigate('#/trainers');
    });
  }

  /* ===== MAZÁNÍ ====== */
  function deleteTrainer(id) {
    App.showConfirm('Opravdu si přejete smazat tohoto trenéra? Akce je nevratná.', () => {
      Storage.deleteTrainer(id);
      App.showToast('Trenér smazán', 'error');
      App.navigate('#/trainers');
    });
  }

  return { renderList, renderForm, deleteTrainer };
})();
