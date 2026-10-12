import { Hackathon } from '../types';
import { state } from '../state';

export function renderTeam(h: Hackathon): string {
  const members = state.cache.members[h.id] || [];
  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title" style="display:flex;align-items:center;gap:6px;">
          <i class="ti ti-users" style="color:var(--accent)"></i>
          <span>Team Roster (${members.length}${h.team_size_limit ? ` / ${h.team_size_limit}` : ''})</span>
        </div>
        <button class="btn btn-sm btn-primary" id="add-member-btn"><i class="ti ti-plus"></i> Add Member</button>
      </div>
      ${members.length ? members.map((m, i) => {
        const initials = (m.name || 'TM').split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
        return `
        <div class="row-item">
          <div class="av av-${i % 6}">${initials}</div>
          <div class="row-main">
            <div class="row-title" style="display:flex;align-items:center;gap:8px;">
              <span>${m.name}</span>
              ${m.role ? `<span class="badge b-teal">${m.role}</span>` : ''}
            </div>
            <div class="row-sub">
              ${m.email ? `<span style="display:inline-flex;align-items:center;gap:4px;"><i class="ti ti-mail"></i> ${m.email}</span>` : ''}
              ${m.discord ? ` • <span style="display:inline-flex;align-items:center;gap:4px;"><i class="ti ti-brand-discord"></i> ${m.discord}</span>` : ''}
              ${m.github ? ` • <a href="https://github.com/${m.github.replace(/^@/, '')}" target="_blank" style="color:var(--accent);display:inline-flex;align-items:center;gap:4px;"><i class="ti ti-brand-github"></i> ${m.github}</a>` : ''}
              ${!m.email && !m.discord && !m.github ? '<span style="color:var(--text-3)">No contact info</span>' : ''}
            </div>
          </div>
          <div class="row-actions">
            <button class="btn-ghost btn btn-sm del-member" data-id="${m.id}" title="Remove member"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `;}).join('') : `
        <div class="empty">
          <i class="ti ti-users"></i>
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;color:var(--text)">No team members yet</div>
          <div style="font-size:12px;color:var(--text-2);margin-bottom:14px;">Invite teammates or quickly pick collaborators from previous hackathons.</div>
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('add-member-btn')?.click()"><i class="ti ti-plus"></i> Add Team Member</button>
        </div>
      `}
    </div>
  `;
}
