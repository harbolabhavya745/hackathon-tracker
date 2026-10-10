import { Hackathon } from '../types';
import { state, daysUntil, isPastFinal, getNearestUpcomingDeadline, getFinalDate } from '../state';
import { STATUS_COLUMNS } from '../constants';

export function renderBoardCard(h: Hackathon): string {
  const nextDeadline = getNearestUpcomingDeadline(h);
  const finalDate = getFinalDate(h, state.cache.dates[h.id] || []);
  const targetDate = nextDeadline?.date || finalDate;
  const diff = targetDate ? daysUntil(targetDate) : null;
  const isEnded = isPastFinal(h);

  let deadlineBadge = '';
  if (isEnded) {
    deadlineBadge = `<span class="badge b-gray">ended</span>`;
  } else if (diff !== null) {
    if (diff === 0) deadlineBadge = `<span class="badge b-red">due today</span>`;
    else if (diff === 1) deadlineBadge = `<span class="badge b-red">1 day left</span>`;
    else if (diff <= 3) deadlineBadge = `<span class="badge b-red">${diff} days left</span>`;
    else deadlineBadge = `<span class="badge b-gray">${diff} days left</span>`;
  }

  const dateLine = nextDeadline
    ? `${nextDeadline.label}: ${nextDeadline.date}`
    : h.start_date || h.end_date
      ? `${h.start_date || '?'} → ${h.end_date || '?'}`
      : 'No dates set';

  return `
    <div class="board-card" data-id="${h.id}">
      <div class="board-card-title">${h.name}</div>
      <div class="board-card-sub">${dateLine}${h.timezone ? ` • ${h.timezone}` : ''}</div>
      <div class="board-card-meta">
        ${deadlineBadge}
        ${h.team_size_limit ? `<span class="badge b-blue">max ${h.team_size_limit}</span>` : ''}
        ${h.website_link ? `<a href="${h.website_link}" target="_blank" class="board-card-link" onclick="event.stopPropagation()"><i class="ti ti-external-link"></i></a>` : ''}
      </div>
      ${(h.prize_tracks || []).length ? `<div class="board-card-tracks">${(h.prize_tracks || []).map(t => `<span class="badge b-teal">${t}</span>`).join('')}</div>` : ''}
      <select class="board-card-status" data-id="${h.id}" onclick="event.stopPropagation()">
        ${STATUS_COLUMNS.map(c => `<option value="${c.key}" ${c.key === h.status ? 'selected' : ''}>Move to: ${c.label}</option>`).join('')}
      </select>
    </div>
  `;
}

export function renderBoard(): string {
  const controls = `
    <div class="board-controls">
      <label class="board-filter"><input type="checkbox" id="board-hide-past" ${state.boardHidePast ? 'checked' : ''}> Hide ended events (after final)</label>
      <span class="board-sort-note"><i class="ti ti-sort-ascending"></i> Sorted by closest upcoming deadline</span>
    </div>
  `;

  const columns = STATUS_COLUMNS.map(col => {
    let items = state.hackathons.filter(h => h.status === col.key);
    if (state.boardHidePast && col.key !== 'completed') {
      items = items.filter(h => !isPastFinal(h));
    }
    items = [...items].sort((a, b) => {
      const da = getNearestUpcomingDeadline(a)?.date || getFinalDate(a, state.cache.dates[a.id] || []);
      const db = getNearestUpcomingDeadline(b)?.date || getFinalDate(b, state.cache.dates[b.id] || []);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return daysUntil(da) - daysUntil(db);
    });

    return `
      <div class="board-col">
        <div class="board-col-head">
          <span>${col.label}</span>
          <span class="nav-count">${items.length}</span>
        </div>
        <div class="board-col-body">
          ${items.length ? items.map(renderBoardCard).join('') : '<div class="board-empty">Nothing here</div>'}
        </div>
      </div>
    `;
  }).join('');

  return `${controls}<div class="board">${columns}</div>`;
}
