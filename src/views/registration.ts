import { Hackathon } from '../types';
import { state } from '../state';

export function renderRegistration(h: Hackathon): string {
  const r = state.cache.regs[h.id] || { status: 'not_started' };
  const statusLabels: Record<string, string> = { not_started: 'Not Started', pending: 'Pending', registered: 'Registered', cancelled: 'Cancelled' };
  const statusBadges: Record<string, string> = { not_started: 'b-gray', pending: 'b-amber', registered: 'b-green', cancelled: 'b-red' };

  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title">Registration Status</div>
        <button class="btn btn-sm" id="edit-reg-btn"><i class="ti ti-edit"></i> Edit</button>
      </div>
      <table class="kv-table">
        <tr><td class="kv-key">Status</td><td><span class="badge ${statusBadges[r.status] || 'b-gray'}">${statusLabels[r.status] || r.status}</span></td></tr>
        <tr><td class="kv-key">Team Name</td><td>${r.team_name || '-'}</td></tr>
        <tr><td class="kv-key">Track</td><td>${r.track || '-'}</td></tr>
        <tr><td class="kv-key">Reference ID</td><td><code>${r.ref_id || '-'}</code></td></tr>
        <tr><td class="kv-key">Link</td><td>${r.link ? `<a href="${r.link}" target="_blank" style="color:var(--accent)">${r.link}</a>` : '-'}</td></tr>
        <tr><td class="kv-key">Notes</td><td><div style="white-space:pre-wrap;font-size:12px;color:var(--text-2)">${r.notes || 'No notes.'}</div></td></tr>
      </table>
    </div>
  `;
}
