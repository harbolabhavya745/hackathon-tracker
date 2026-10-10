import { state, isPastFinal, getFinalDate, daysUntil } from '../state';

export function renderArchive(): string {
  const archived = state.hackathons.filter(h => h.status === 'completed' || isPastFinal(h));

  if (!archived.length) {
    return `
      <div class="panel">
        <div class="panel-head">
          <div class="panel-head-title"><i class="ti ti-archive"></i> Concluded & Archived Hackathons</div>
        </div>
        <div class="empty" style="padding:48px 16px;text-align:center;">
          <div style="font-size:24px;margin-bottom:8px;">📁</div>
          <div style="font-weight:500;font-size:14px;margin-bottom:4px;">No archived hackathons yet</div>
          <div style="font-size:12px;color:var(--text-2);max-width:340px;margin:0 auto;">
            Hackathons will automatically appear in this archive once their final deadline passes or when marked as completed.
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title"><i class="ti ti-archive"></i> Concluded & Archived Hackathons (${archived.length})</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;padding:12px;">
        ${archived.map(h => {
          const finalDate = getFinalDate(h);
          const diff = finalDate ? daysUntil(finalDate) : null;
          const members = state.cache.members[h.id] || [];
          const tasks = state.cache.tasks[h.id] || [];
          const doneTasks = tasks.filter(t => t.done).length;
          const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

          return `
            <div class="board-card archive-card" data-id="${h.id}" style="padding:14px;display:flex;flex-direction:column;gap:10px;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                <div>
                  <div style="font-size:14px;font-weight:600;">${h.name}</div>
                  <div style="font-size:11px;color:var(--text-2);margin-top:2px;">
                    ${h.start_date || '?'} → ${h.end_date || finalDate || '?'} ${h.timezone ? `(${h.timezone})` : ''}
                  </div>
                </div>
                <div style="display:flex;gap:4px;align-items:center;">
                  <span class="badge b-gray">${diff !== null && diff < 0 ? `Ended ${Math.abs(diff)}d ago` : 'Completed'}</span>
                </div>
              </div>

              ${h.description ? `<div style="font-size:12px;color:var(--text-2);line-height:1.4;">${h.description}</div>` : ''}

              <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                ${h.tags.map(t => `<span class="badge b-teal">${t}</span>`).join('')}
                <span class="badge b-blue"><i class="ti ti-users"></i> ${members.length} members</span>
                <span class="badge ${progress === 100 ? 'b-green' : 'b-gray'}"><i class="ti ti-check"></i> ${doneTasks}/${tasks.length} tasks (${progress}%)</span>
              </div>

              <div style="display:flex;gap:8px;margin-top:4px;border-top:0.5px solid var(--border);padding-top:10px;justify-content:flex-end;">
                ${h.website_link ? `<a href="${h.website_link}" target="_blank" class="btn btn-sm btn-ghost" style="color:var(--accent);"><i class="ti ti-external-link"></i> Website</a>` : ''}
                <button class="btn btn-sm view-archive-btn" data-id="${h.id}"><i class="ti ti-eye"></i> View Details</button>
                <button class="btn btn-sm reopen-archive-btn" data-id="${h.id}"><i class="ti ti-rotate-clockwise"></i> Reopen</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
