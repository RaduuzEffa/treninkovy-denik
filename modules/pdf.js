/* =====================================================
   pdf.js — PDF export (platby + tréninkový plán)
   ===================================================== */
'use strict';

const PDFExport = (() => {

  const PASTEL_BLUE = [100, 149, 237];
  const DARK   = [15, 15, 30];
  const GRAY   = [100, 116, 139];
  const GREEN  = [34, 197, 94];
  const ORANGE = [245, 158, 11];

  function _initDoc(title, subtitle) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Header background
    doc.setFillColor(...PASTEL_BLUE);
    doc.rect(0, 0, pageW, 38, 'F');

    // Title
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 16);

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(200, 180, 255);
    doc.text(subtitle, 14, 24);

    // Generated at
    const now = new Date().toLocaleString('cs-CZ');
    doc.setFontSize(8);
    doc.setTextColor(180, 160, 240);
    doc.text(`Vygenerováno: ${now}`, pageW - 14, 24, { align: 'right' });

    return { doc, pageW, y: 46 };
  }

  function _footer(doc) {
    const pages = doc.internal.pages.length - 1;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFillColor(245, 245, 250);
      doc.rect(0, pageH - 12, pageW, 12, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text('💪 Tréninkový deník — Evidence plateb', 14, pageH - 4);
      doc.text(`${i} / ${pages}`, pageW - 14, pageH - 4, { align: 'right' });
    }
  }

  /* ===== PAYMENTS PDF ===== */
  async function payments() {
    const filteredPayments = Payments.getFilteredPayments();
    const filters = Payments.getCurrentFilters();
    const settings = Storage.getSettings();

    let period = 'Všechny záznamy';
    if (filters.month) period = `Měsíc: ${filters.month}`;
    else if (filters.dateFrom && filters.dateTo) period = `${filters.dateFrom} – ${filters.dateTo}`;
    else if (filters.dateFrom) period = `Od: ${filters.dateFrom}`;

    const { doc, pageW, y: yStart } = _initDoc(
      'Evidence tréninkových plateb',
      `${settings.userName}  ·  ${period}`
    );

    let y = yStart;

    // Summary cards
    const total     = filteredPayments.reduce((s, p) => s + Number(p.amount), 0);
    const confirmed = filteredPayments.filter(p => p.status === 'confirmed').length;
    const pending   = filteredPayments.filter(p => p.status === 'pending').length;
    const currency  = filteredPayments[0]?.currency || settings.defaultCurrency;

    _summaryBox(doc, `${total.toLocaleString('cs-CZ')} ${currency}`, 'Celková částka', 14, y, PASTEL_BLUE);
    _summaryBox(doc, String(confirmed), 'Potvrzeno', 80, y, [34, 197, 94]);
    _summaryBox(doc, String(pending),   'Čeká',      146, y, [245, 158, 11]);
    y += 22;

    if (filteredPayments.length === 0) {
      doc.setFontSize(12); doc.setTextColor(...GRAY);
      doc.text('Žádné platby pro zadané filtry.', 14, y + 10);
    } else {
      doc.autoTable({
        startY: y,
        head: [['Datum', 'Projekt', 'Sportovec(i)', 'Poznámka', 'Částka', 'Status']],
        body: filteredPayments
          .sort((a,b) => b.date.localeCompare(a.date))
          .map(p => {
            const proj = Storage.getProjectById(p.projectId);
            const players = (p.playerIds||[]).map(id => Storage.getPlayerById(id)?.name).filter(Boolean).join(', ');
            return [
              _fmtDate(p.date),
              proj ? proj.name : '—',
              players || '—',
              p.note || '—',
              `${Number(p.amount).toLocaleString('cs-CZ')} ${p.currency}`,
              p.status === 'confirmed' ? '✓ Potvrzeno' : '⏳ Čeká',
            ];
          }),
        styles: { fontSize: 8, font: 'Roboto', cellPadding: 4, lineColor: [230,230,240], lineWidth: 0.2 },
        headStyles: { fillColor: PASTEL_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 22 },
          4: { fontStyle: 'bold', halign: 'right' },
          5: { halign: 'center' },
        },
        bodyStyles: { textColor: DARK },
        alternateRowStyles: { fillColor: [248, 247, 255] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.raw;
            data.cell.styles.textColor = val.includes('✓') ? GREEN : ORANGE;
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 14, right: 14 },
      });

      // Total row
      const fY = doc.lastAutoTable.finalY + 6;
      doc.setFillColor(...PASTEL_BLUE);
      doc.rect(14, fY, pageW - 28, 10, 'F');
      doc.setFontSize(11); doc.setFont('Roboto', 'bold'); doc.setTextColor(255,255,255);
      doc.text('CELKOVÁ SUMA:', 18, fY + 7);
      doc.text(`${total.toLocaleString('cs-CZ')} ${currency}`, pageW - 18, fY + 7, { align: 'right' });
    }

    _footer(doc);
    await _saveNative(doc, `platby_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  /* ===== SESSION PLAN PDF ===== */
  async function sessionPlan(sessionId) {
    const session = Storage.getSessionById(sessionId);
    if (!session) { App.showToast('Trénink nenalezen', 'error'); return; }
    const project = Storage.getProjectById(session.projectId);
    const settings = Storage.getSettings();

    const { doc, pageW } = _initDoc(
      session.title,
      `${project?.icon||''} ${project?.name||''}  ·  ${_fmtDate(session.date)}  ·  ${settings.userName}`
    );

    let y = 46;

    // Status + notes
    doc.setFontSize(10); doc.setFont('Roboto', 'normal'); doc.setTextColor(...GRAY);
    if (session.notes) { doc.text(`📝 ${session.notes}`, 14, y); y += 7; }

    const playerIds = Object.keys(session.playerPlans || {});
    
    playerIds.forEach((playerId, pi) => {
      const player = Storage.getPlayerById(playerId);
      const plan   = session.playerPlans[playerId];
      const exercises = plan?.exercises || [];

      // Player header
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFillColor(245, 245, 255);
      doc.rect(14, y, pageW - 28, 9, 'F');
      doc.setFontSize(11); doc.setFont('Roboto', 'bold'); doc.setTextColor(...DARK);
      doc.text(`👤 ${player?.name || 'Sportovec'}`, 18, y + 6.2);
      if (plan?.notes) {
        doc.setFontSize(8); doc.setFont('Roboto', 'italic'); doc.setTextColor(...GRAY);
        doc.text(plan.notes, pageW - 16, y + 6.2, { align: 'right' });
      }
      y += 12;

      if (exercises.length === 0) {
        doc.setFontSize(9); doc.setTextColor(...GRAY);
        doc.text('Žádná cvičení', 18, y);
        y += 8;
        return;
      }

      doc.autoTable({
        startY: y,
        head: [['Cvičení', 'Série', 'Opakování', 'Váha', 'Pauza', 'Poznámka', '✓']],
        body: exercises.map(ex => [
          ex.name || '—',
          ex.sets  || '—',
          ex.reps  || '—',
          ex.weight ? `${ex.weight} ${ex.unit||'kg'}` : '—',
          ex.restSeconds ? `${ex.restSeconds}s` : '—',
          ex.notes || '',
          ex.completed ? '✓' : '○',
        ]),
        styles: { fontSize: 7.5, font: 'Roboto', cellPadding: 3.5, lineColor: [230,230,240], lineWidth: 0.15 },
        headStyles: { fillColor: PASTEL_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { textColor: DARK },
        alternateRowStyles: { fillColor: [250,249,255] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 16, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 6) {
            data.cell.styles.textColor = data.cell.raw === '✓' ? GREEN : GRAY;
          }
        },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 8;
    });

    _footer(doc);
    await _saveNative(doc, `trenink_${session.date}_${session.title.replace(/\s+/g,'_').slice(0,20)}.pdf`);
  }

  /* ===== BATCH SESSION EXPORT ===== */
  function showSessionExportModal() {
    const projects = Storage.getProjects();
    const thisMonth = new Date().toISOString().slice(0, 7);

    App.showModal('Hromadný export tréninků', `
      <form id="batch-export-form" onsubmit="event.preventDefault(); PDFExport.batchSessionPlans()">
        <div class="form-group">
          <label class="form-label">Měsíc</label>
          <input class="form-input" type="month" id="be-month" value="${thisMonth}" />
        </div>
        <div class="form-group">
          <label class="form-label">Nebo: Od data</label>
          <input class="form-input" type="date" id="be-from" />
        </div>
        <div class="form-group">
          <label class="form-label">Nebo: Do data</label>
          <input class="form-input" type="date" id="be-to" />
        </div>
        <div class="form-group">
          <label class="form-label">Projekt (volitelné)</label>
          <select class="form-select" id="be-project">
            <option value="">-- Všechny projekty --</option>
            ${projects.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-actions" style="margin-top:20px">
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Zrušit</button>
          <button type="submit" class="btn btn-primary"><i class="icon icon-copy"></i> Stáhnout hromadné PDF</button>
        </div>
      </form>
    `);
  }

  async function batchSessionPlans() {
    const month = document.getElementById('be-month').value;
    const dateFrom = document.getElementById('be-from').value;
    const dateTo = document.getElementById('be-to').value;
    const projectId = document.getElementById('be-project').value;

    let sessions = Storage.getSessions();
    if (projectId) sessions = sessions.filter(s => s.projectId === projectId);
    if (month) sessions = sessions.filter(s => s.date.startsWith(month));
    if (dateFrom) sessions = sessions.filter(s => s.date >= dateFrom);
    if (dateTo) sessions = sessions.filter(s => s.date <= dateTo);

    if (sessions.length === 0) {
      App.showToast('Nenalezeny žádné tréninky pro tento filtr.', 'error');
      return;
    }

    sessions.sort((a, b) => a.date.localeCompare(b.date));
    App.closeModal();
    App.showToast(`Generuji PDF pro ${sessions.length} tréninků...`);

    const settings = Storage.getSettings();
    let periodStr = month ? `Měsíc: ${month}` : (dateFrom || dateTo) ? `${dateFrom} - ${dateTo}` : 'Všechny tréninky';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    sessions.forEach((session, sIdx) => {
      if (sIdx > 0) doc.addPage();
      const project = Storage.getProjectById(session.projectId);

      // Header block
      doc.setFillColor(...PASTEL_BLUE);
      doc.rect(0, 0, pageW, 38, 'F');
      doc.setFont('Roboto', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
      doc.text(session.title, 14, 16);
      doc.setFontSize(10); doc.setFont('Roboto', 'normal'); doc.setTextColor(200, 180, 255);
      doc.text(`${project?.icon||''} ${project?.name||''}  ·  ${_fmtDate(session.date)}  ·  ${settings.userName}`, 14, 24);
      
      let y = 46;
      doc.setFontSize(10); doc.setFont('Roboto', 'normal'); doc.setTextColor(...GRAY);
      if (session.notes) { doc.text(`📝 ${session.notes}`, 14, y); y += 7; }

      const playerIds = Object.keys(session.playerPlans || {});
      playerIds.forEach((playerId) => {
        const player = Storage.getPlayerById(playerId);
        const plan   = session.playerPlans[playerId];
        const exercises = plan?.exercises || [];

        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFillColor(245, 245, 255);
        doc.rect(14, y, pageW - 28, 9, 'F');
        doc.setFontSize(11); doc.setFont('Roboto', 'bold'); doc.setTextColor(...DARK);
        doc.text(`👤 ${player?.name || 'Sportovec'}`, 18, y + 6.2);
        if (plan?.notes) {
          doc.setFontSize(8); doc.setFont('Roboto', 'italic'); doc.setTextColor(...GRAY);
          doc.text(plan.notes, pageW - 16, y + 6.2, { align: 'right' });
        }
        y += 12;

        if (exercises.length === 0) {
          doc.setFontSize(9); doc.setTextColor(...GRAY);
          doc.text('Žádná cvičení', 18, y);
          y += 8;
          return;
        }

        doc.autoTable({
          startY: y,
          head: [['Cvičení', 'Série', 'Opakování', 'Váha', 'Pauza', 'Poznámka', '✓']],
          body: exercises.map(ex => [
            ex.name || '—', ex.sets || '—', ex.reps || '—',
            ex.weight ? `${ex.weight} ${ex.unit||'kg'}` : '—',
            ex.restSeconds ? `${ex.restSeconds}s` : '—',
            ex.notes || '', ex.completed ? '✓' : '○',
          ]),
          styles: { fontSize: 7.5, font: 'Roboto', cellPadding: 3.5, lineColor: [230,230,240], lineWidth: 0.15 },
          headStyles: { fillColor: PASTEL_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
          bodyStyles: { textColor: DARK },
          alternateRowStyles: { fillColor: [250,249,255] },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 16, halign: 'center' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 18, halign: 'center' },
            6: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 6) {
              data.cell.styles.textColor = data.cell.raw === '✓' ? GREEN : GRAY;
            }
          },
          margin: { left: 14, right: 14 },
        });

        y = doc.lastAutoTable.finalY + 8;
      });
    });

    _footer(doc);
    await _saveNative(doc, `treninky_hromadny_export_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  /* ===== HELPERS ===== */
  function _summaryBox(doc, value, label, x, y, color) {
    doc.setFillColor(...color, 0.12);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setFillColor(...color.map(c => Math.min(255, c + 180)));
    doc.rect(x, y, 58, 16, 'F');
    doc.setFontSize(13); doc.setFont('Roboto', 'bold'); doc.setTextColor(...color);
    doc.text(value, x + 4, y + 8.5);
    doc.setFontSize(7.5); doc.setFont('Roboto', 'normal'); doc.setTextColor(...GRAY);
    doc.text(label, x + 4, y + 13.5);
  }

  function _fmtDate(isoDate) {
    if (!isoDate) return '—';
    const [y, m, d] = isoDate.split('-');
    return `${d}.${m}.${y}`;
  }

  async function _saveNative(doc, filename) {
    if (window.showSaveFilePicker) {
      try {
        const blob = doc.output('blob');
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'PDF Dokument',
            accept: { 'application/pdf': ['.pdf'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        if (window.App) App.showToast('PDF exportováno ✓');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('FS API error', err);
      }
    }
    // Fallback if FS API is unavailable or failed
    doc.save(filename);
    if (window.App) App.showToast('PDF exportováno ✓');
  }

  return { payments, sessionPlan, showSessionExportModal, batchSessionPlans };
})();
