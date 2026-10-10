import { Hackathon } from '../types';
import { state } from '../state';

export function renderTeam(h: Hackathon): string {
  const members = state.cache.members[h.id] || [];
  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title">Team Roster</div>
        <button class="btn btn-sm" id="add-member-btn"><i class="ti ti-plus"></i> Add Member</button>
      </div>
      ${members.length ? members.map((m, i) => `
        <div class="row-item">
          <div class="av av-${i % 6}">${m.name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
          <div class="row-main">
            <div class="row-title">${m.name} ${m.role ? `<span class="badge b-blue">${m.role}</span>` : ''}</div>
            <div class="row-sub">
              ${m.email ? `<i class="ti ti-mail"></i> ${m.email}` : ''}
              ${m.discord ? ` • <i class="ti ti-brand-discord"></i> ${m.discord}` : ''}
              ${m.github ? ` • <a href="https://github.com/${m.github.replace(/^@/, '')}" target="_blank" style="color:var(--accent)"><i class="ti ti-brand-github"></i> ${m.github}</a>` : ''}
              ${!m.email && !m.discord && !m.github ? 'No contact info' : ''}
            </div>
          </div>
          <div class="row-actions">
            <button class="btn-ghost btn btn-sm del-member" data-id="${m.id}"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `).join('') : '<div class="empty">No team members yet.</div>'}
    </div>
  `;
}
