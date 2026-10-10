import { state, loadHackathonDetails } from '../state';
import { STATUS_COLUMNS } from '../constants';
import { toast } from './ui';

function buildPrintSummary(): string {
  const today = new Date().toLocaleDateString();
  const groups = STATUS_COLUMNS.map(col => {
    const items = state.hackathons.filter(h => h.status === col.key);
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
              <strong>Team</strong>
              <ul>
                ${members.length ? members.map(m => `<li>${m.name}${m.role ? ` — ${m.role}` : ''}${m.email ? ` (${m.email})` : ''}</li>`).join('') : '<li>No team members yet</li>'}
              </ul>
            </div>
            <div>
              <strong>Dates</strong>
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
    <h1>Hackathon Summary</h1>
    <div class="print-meta">Generated ${today} • ${state.hackathons.length} hackathon${state.hackathons.length === 1 ? '' : 's'}</div>
    ${groups || '<p>No hackathons yet.</p>'}
  `;
}

export async function exportSummaryPdf() {
  const btn = document.getElementById('export-pdf-btn') as HTMLButtonElement | null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Preparing...'; }
  try {
    // Make sure team/date data for every hackathon is loaded, not just the currently open one
    const missing = state.hackathons.filter(h => !state.cache.members[h.id] || !state.cache.dates[h.id]);
    await Promise.all(missing.map(h => loadHackathonDetails(h.id)));

    let el = document.getElementById('print-summary');
    if (!el) {
      el = document.createElement('div');
      el.id = 'print-summary';
      document.body.appendChild(el);
    }
    el.innerHTML = buildPrintSummary();
    window.print();
  } catch (e: any) {
    toast('Failed to prepare summary: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-file-type-pdf"></i> Export Summary (PDF)'; }
  }
}
