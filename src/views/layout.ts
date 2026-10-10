import { Hackathon } from '../types';
import { state, isUrgentDeadline, daysUntil, getSubmissionDeadline, isPastFinal, getAllHackathonDates } from '../state';

import { renderBoard } from './board';
import { renderOverview } from './overview';
import { renderRegistration } from './registration';
import { renderTeam } from './team';
import { renderDates } from './dates';
import { renderTasks } from './tasks';
import { renderArchive } from './archive';

let dismissedBannerHackId: string | null = null;

export function dismissBanner(id: string) {
  dismissedBannerHackId = id;
}

export function renderDeadlineBanner(h?: Hackathon): string {
  if (!h || state.currentView === 'archive') return '';
  if (dismissedBannerHackId === h.id) return '';
  const dates = getAllHackathonDates(h);
  const urgent = dates.filter(isUrgentDeadline).sort((a, b) => daysUntil(a.date) - daysUntil(b.date));
  if (!urgent.length) return '';

  const items = urgent.map(d => {
    const diff = daysUntil(d.date);
    const when = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`;
    return `<div class="deadline-banner-item"><i class="ti ti-alert-triangle"></i> <strong>${d.label}</strong> is due ${when} (${d.date})</div>`;
  }).join('');

  return `
    <div class="deadline-banner" id="deadline-banner">
      <div class="deadline-banner-head">
        <span class="deadline-banner-title"><i class="ti ti-alert-triangle"></i> ${urgent.length > 1 ? `${urgent.length} deadlines coming up` : 'Deadline coming up'}</span>
        <button class="deadline-banner-close" id="deadline-banner-close">&times;</button>
      </div>
      ${items}
    </div>
  `;
}


export function renderPanicTimer(h?: Hackathon): string {
  if (state.currentView === 'board' || state.currentView === 'archive') return '';
  if (!h || h.status !== 'hacking') return '';
  const deadline = getSubmissionDeadline(h);
  if (!deadline) return '';
  return `
    <div class="panic-timer" id="panic-timer" data-deadline="${deadline.date.toISOString()}">
      <div class="panic-timer-label"><i class="ti ti-alarm"></i> ${deadline.label}</div>
      <div class="panic-timer-clock" id="panic-clock">--</div>
    </div>
  `;
}

export function renderView(): string {
  if (state.currentView === 'board') return renderBoard();
  if (state.currentView === 'archive') return renderArchive();

  const h = state.hackathons.find(x => x.id === state.currentHackathonId);
  if (!h) return '<div class="empty">No hackathon selected. Create one to get started!</div>';

  switch (state.currentView) {
    case 'overview': return renderOverview(h);
    case 'registration': return renderRegistration(h);
    case 'team': return renderTeam(h);
    case 'dates': return renderDates(h);
    case 'tasks': return renderTasks(h);
    default: return 'Coming soon...';
  }
}

export function renderLayout(): string {
  const activeHackathons = state.hackathons.filter(x => x.status !== 'completed' && !isPastFinal(x));
  const archivedCount = state.hackathons.filter(x => x.status === 'completed' || isPastFinal(x)).length;

  // Prefer active hackathon as current unless viewing an archived detail
  if (activeHackathons.length > 0 && (!state.currentHackathonId || (state.currentView !== 'archive' && isPastFinal(state.hackathons.find(x => x.id === state.currentHackathonId)!)))) {
    state.currentHackathonId = activeHackathons[0].id;
  }
  
  const h = state.hackathons.find(x => x.id === state.currentHackathonId);
  
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-top">
          <select class="hack-sel" id="hack-sel">
            ${activeHackathons.length 
              ? activeHackathons.map(x => `<option value="${x.id}" ${x.id === state.currentHackathonId ? 'selected' : ''}>${x.name}</option>`).join('') 
              : '<option value="" disabled selected>No active hackathons</option>'}
          </select>
          <div class="hack-tags">${h && !isPastFinal(h) ? h.tags.join(', ') : (activeHackathons.length ? '' : 'All hackathons archived')}</div>
        </div>
        <nav class="sidebar-nav">
          <button class="nav-item ${state.currentView === 'board' ? 'active' : ''}" data-view="board"><i class="ti ti-layout-kanban"></i> Board</button>
          <button class="nav-item ${state.currentView === 'archive' ? 'active' : ''}" data-view="archive"><i class="ti ti-archive"></i> Archives <span class="nav-count">${archivedCount}</span></button>
          <div class="nav-divider"></div>
          <button class="nav-item ${state.currentView === 'overview' ? 'active' : ''}" data-view="overview"><i class="ti ti-layout-dashboard"></i> Overview</button>
          <button class="nav-item ${state.currentView === 'registration' ? 'active' : ''}" data-view="registration"><i class="ti ti-clipboard-check"></i> Registration</button>
          <button class="nav-item ${state.currentView === 'team' ? 'active' : ''}" data-view="team"><i class="ti ti-users"></i> Team <span class="nav-count">${state.cache.members[h?.id || '']?.length || 0}</span></button>
          <button class="nav-item ${state.currentView === 'dates' ? 'active' : ''}" data-view="dates"><i class="ti ti-calendar-event"></i> Dates <span class="nav-count">${h ? getAllHackathonDates(h).length : 0}</span></button>
          <button class="nav-item ${state.currentView === 'tasks' ? 'active' : ''}" data-view="tasks"><i class="ti ti-checklist"></i> Tasks <span class="nav-count">${state.cache.tasks[h?.id || '']?.length || 0}</span></button>
        </nav>
        <div class="sidebar-footer">
          <button class="btn btn-full btn-primary" id="smart-import-btn" style="background:var(--accent);border-color:var(--accent);color:#fff;"><i class="ti ti-sparkles"></i> Auto-Track / Import</button>
          <button class="btn btn-full" id="new-hack-btn"><i class="ti ti-plus"></i> Manual Add</button>
          <button class="btn btn-full" id="export-pdf-btn"><i class="ti ti-file-type-pdf"></i> Export Summary (PDF)</button>
          <button class="btn btn-full btn-danger" id="logout-btn"><i class="ti ti-logout"></i> Logout</button>
          <div class="conn-status"><span class="conn-dot ok"></span><span>Connected as ${state.user.email}</span></div>
        </div>
      </aside>

      <main class="main">
        ${renderDeadlineBanner(h)}
        ${renderPanicTimer(h)}
        <div class="topbar">
          <span class="topbar-title">${state.currentView.charAt(0).toUpperCase() + state.currentView.slice(1)}</span>
          <div class="topbar-actions">
            ${state.currentView === 'overview' && h?.user_id === state.user.id ? '<button class="btn btn-sm btn-danger" id="del-hack-btn"><i class="ti ti-trash"></i> Delete Hackathon</button>' : ''}
          </div>
        </div>
        <div class="content" id="view-content">
          ${renderView()}
        </div>
      </main>
    </div>
  `;
}
