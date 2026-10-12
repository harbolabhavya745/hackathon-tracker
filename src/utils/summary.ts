import { state, loadHackathonDetails, isPastFinal } from '../state';
import { STATUS_COLUMNS } from '../constants';
import { toast, showModal, closeModal } from './ui';

function buildPrintSummary(targetHackathons: typeof state.hackathons, title = 'Hackathon Summary'): string {
  const today = new Date().toLocaleDateString();
  const groups = STATUS_COLUMNS.map(col => {
    const items = targetHackathons.filter(h => h.status === col.key);
    if (!items.length) return '';
    return `
      <h2>${col.label} (${items.length})</h2>
      ${items.map(h => {
        const members = state.cache.members[h.id] || [];
        const dates = state.cache.dates[h.id] || [];
        return `
        <div class="print-card">
          <div class="print-card-title">${h.name}</div>
          <div class="print-card-sub">
            ${h.start_date || '?'} → ${h.end_date || '?'}${h.timezone ? ` (${h.timezone})` : ''}
            ${h.team_size_limit ? ` • Team limit: ${h.team_size_limit}` : ''}
            ${h.website_link ? ` • ${h.website_link}` : ''}
          </div>
          ${h.description ? `<div class="print-desc">${h.description}</div>` : ''}
          ${h.prize_tracks.length ? `<div class="print-desc"><strong>Tracks:</strong> ${h.prize_tracks.join(', ')}</div>` : ''}
          <div class="print-card-cols">
            <div>
              <strong>Team (${members.length})</strong>
              <ul>
                ${members.length ? members.map(m => `<li>${m.name}${m.role ? ` — ${m.role}` : ''}${m.email ? ` (${m.email})` : ''}</li>`).join('') : '<li>No team members yet</li>'}
              </ul>
            </div>
            <div>
              <strong>Dates (${dates.length})</strong>
              <ul>
                ${dates.length ? dates.map(d => `<li>${d.label} — ${d.date} (${d.type})</li>`).join('') : '<li>No dates added yet</li>'}
              </ul>
            </div>
          </div>
        </div>
      `;
      }).join('')}
    `;
  }).join('');

  return `
    <h1>${title}</h1>
    <div class="print-meta">Generated ${today} • ${targetHackathons.length} hackathon${targetHackathons.length === 1 ? '' : 's'}</div>
    ${groups || '<p>No hackathons found in this export.</p>'}
  `;
}

async function generatePdfForScope(scope: string) {
  let target: typeof state.hackathons = [];
  let title = 'Hackathon Summary';

  if (scope === 'current') {
    const currentH = state.hackathons.find(h => h.id === state.currentHackathonId);
    target = currentH ? [currentH] : [];
    title = currentH ? `${currentH.name} Summary` : 'Hackathon Summary';
  } else if (scope === 'all') {
    target = state.hackathons;
    title = 'All Hackathons (Full Archive)';
  } else {
    // Default: active only (excludes completed and past-deadline events)
    target = state.hackathons.filter(h => h.status !== 'completed' && !isPastFinal(h));
    title = 'Active Hackathons Summary';
  }

  const btn = document.getElementById('export-pdf-btn') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Preparing...'; }
  try {
    const missing = target.filter(h => !state.cache.members[h.id] || !state.cache.dates[h.id]);
    await Promise.all(missing.map(h => loadHackathonDetails(h.id)));

    let el = document.getElementById('print-summary');
    if (!el) {
      el = document.createElement('div');
      el.id = 'print-summary';
      document.body.appendChild(el);
    }
    el.innerHTML = buildPrintSummary(target, title);
    window.print();
  } catch (e: any) {
    toast('Failed to prepare summary: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-file-type-pdf"></i> Export'; }
  }
}

export async function exportSummaryPdf() {
  const currentH = state.hackathons.find(h => h.id === state.currentHackathonId);
  const activeHackathons = state.hackathons.filter(h => h.status !== 'completed' && !isPastFinal(h));
  const archivedCount = state.hackathons.filter(h => h.status === 'completed' || isPastFinal(h)).length;

  showModal(`
    <h3>Export Summary (PDF)</h3>
    <div class="field" style="margin-bottom:18px;">
      <label style="font-weight:600;margin-bottom:8px;">Choose what to include in the summary:</label>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;background:var(--bg-3);border:1px solid var(--border-md);border-radius:var(--r-md);">
          <input type="radio" name="export-scope" value="active" checked style="margin-top:3px;cursor:pointer;">
          <div>
            <div style="font-weight:600;color:var(--text);">Active Hackathons Only (Recommended)</div>
            <div style="font-size:11.5px;color:var(--text-2);margin-top:2px;">Excludes ${archivedCount} previous, ended, or completed hackathons (${activeHackathons.length} active event${activeHackathons.length === 1 ? '' : 's'})</div>
          </div>
        </label>
        
        ${currentH ? `
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;background:var(--bg-3);border:1px solid var(--border-md);border-radius:var(--r-md);">
          <input type="radio" name="export-scope" value="current" style="margin-top:3px;cursor:pointer;">
          <div>
            <div style="font-weight:600;color:var(--text);">Current Hackathon Only</div>
            <div style="font-size:11.5px;color:var(--text-2);margin-top:2px;">Only export details for "${currentH.name}"</div>
          </div>
        </label>
        ` : ''}

        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;background:var(--bg-3);border:1px solid var(--border-md);border-radius:var(--r-md);">
          <input type="radio" name="export-scope" value="all" style="margin-top:3px;cursor:pointer;">
          <div>
            <div style="font-weight:600;color:var(--text);">All Hackathons (Full Archive)</div>
            <div style="font-size:11.5px;color:var(--text-2);margin-top:2px;">Includes all ${state.hackathons.length} current and past hackathons</div>
          </div>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="do-export-btn"><i class="ti ti-file-type-pdf"></i> Generate PDF</button>
    </div>
  `);

  document.getElementById('do-export-btn')?.addEventListener('click', async () => {
    const selectedScope = (document.querySelector('input[name="export-scope"]:checked') as HTMLInputElement)?.value || 'active';
    closeModal();
    await generatePdfForScope(selectedScope);
  });
}
