import { Hackathon } from '../types';
import { state, isUrgentDeadline, getAllHackathonDates, daysUntil } from '../state';
import { STATUS_COLUMNS } from '../constants';

export function renderOverview(h: Hackathon): string {
  const members = state.cache.members[h.id] || [];
  const tasks = state.cache.tasks[h.id] || [];
  const dates = getAllHackathonDates(h);
  const doneTasks = tasks.filter(t => t.done).length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const nextDate = dates.filter(d => daysUntil(d.date) >= 0)[0];

  return `
    <div class="metrics-row">
      <div class="metric"><div class="metric-val">${members.length}</div><div class="metric-lbl">Team Members</div></div>
      <div class="metric"><div class="metric-val">${tasks.length}</div><div class="metric-lbl">Total Tasks</div></div>
      <div class="metric"><div class="metric-val">${progress}%</div><div class="metric-lbl">Completion</div></div>
      <div class="metric"><div class="metric-val">${dates.length}</div><div class="metric-lbl">Events/Dates</div></div>
    </div>
    
    <div class="prog-track"><div class="prog-fill" style="width:${progress}%"></div></div>
    <div class="prog-label">${doneTasks} of ${tasks.length} tasks completed</div>

    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title">About ${h.name}</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm" id="export-ics-btn" title="Download iCalendar file"><i class="ti ti-calendar-event"></i> Sync Calendar</button>
          ${h.user_id === state.user.id ? '<button class="btn btn-sm" id="edit-hack-btn"><i class="ti ti-edit"></i> Edit</button>' : ''}
        </div>
      </div>
      <div class="about-body">${h.description || 'No description provided.'}</div>
      <div class="about-tags">${h.tags.map(t => `<span class="badge b-gray">${t}</span>`).join('')}</div>
      <table class="kv-table">
        <tr><td class="kv-key">Status</td><td>${STATUS_COLUMNS.find(c => c.key === h.status)?.label || h.status}</td></tr>
        <tr><td class="kv-key">Dates</td><td>${h.start_date || '?'} → ${h.end_date || '?'}${h.timezone ? ` (${h.timezone})` : ''}</td></tr>
        <tr><td class="kv-key">Team Size Limit</td><td>${h.team_size_limit || 'No limit set'}</td></tr>
        <tr><td class="kv-key">Website</td><td>${h.website_link ? `<a href="${h.website_link}" target="_blank" style="color:var(--accent)">${h.website_link}</a>` : '-'}</td></tr>
        <tr><td class="kv-key">Prize Tracks</td><td>${h.prize_tracks.length ? h.prize_tracks.map(t => `<span class="badge b-teal">${t}</span>`).join(' ') : '-'}</td></tr>
      </table>
    </div>

    ${nextDate ? `
      <div class="panel">
        <div class="panel-head"><div class="panel-head-title">Upcoming</div></div>
        <div class="row-item ${isUrgentDeadline(nextDate) ? 'urgent' : ''}">
          <div class="row-main">
            <div class="row-title">${nextDate.label}</div>
            <div class="row-sub">${nextDate.date} • ${nextDate.type}${isUrgentDeadline(nextDate) ? ` • <span class="badge b-red">due soon</span>` : ''}</div>
          </div>
        </div>
      </div>
    ` : ''}
  `;
}
