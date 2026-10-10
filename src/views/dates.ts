import { Hackathon } from '../types';
import { isUrgentDeadline, daysUntil, getAllHackathonDates } from '../state';
import { getGoogleCalendarUrl } from '../utils/calendar';

export function renderDates(h: Hackathon): string {
  const dates = getAllHackathonDates(h);
  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title">Important Dates & Milestones</div>
        <div style="display:flex;gap:6px;">
          ${dates.length ? '<button class="btn btn-sm" id="export-dates-ics-btn"><i class="ti ti-calendar-share"></i> Export .ics</button>' : ''}
          <button class="btn btn-sm" id="add-date-btn"><i class="ti ti-plus"></i> Add Milestone Date</button>
        </div>
      </div>
      ${dates.length ? dates.map(d => {
        const urgent = isUrgentDeadline(d);
        const diff = daysUntil(d.date);
        const isVirtual = String(d.id).startsWith('virtual-');
        const gcalUrl = getGoogleCalendarUrl(`${d.label} - ${h.name}`, d.date, `Milestone for ${h.name}`, h.website_link);
        return `
        <div class="row-item ${urgent ? 'urgent' : ''}">
          <div class="row-main">
            <div class="row-title">${d.label}</div>
            <div class="row-sub">
              ${d.date} • <span class="badge ${urgent ? 'b-red' : 'b-gray'}" style="text-transform:capitalize">${d.type}</span>
              ${urgent ? ` <span class="badge b-red">${diff === 0 ? 'due today' : diff === 1 ? 'due tomorrow' : `due in ${diff}d`}</span>` : diff !== null && diff < 0 ? ' <span class="badge b-gray">ended</span>' : ''}
            </div>
          </div>
          <div class="row-actions" style="opacity:1;">
            <a href="${gcalUrl}" target="_blank" rel="noopener noreferrer" class="btn-ghost btn btn-sm" title="Add to Google Calendar" style="display:inline-flex;text-decoration:none;">
              <i class="ti ti-calendar-plus"></i>
            </a>
            ${!isVirtual ? `<button class="btn-ghost btn btn-sm del-date" data-id="${d.id}" title="Delete date"><i class="ti ti-trash"></i></button>` : ''}
          </div>
        </div>
      `;
      }).join('') : '<div class="empty">No dates added yet. Click "Add Milestone Date" or edit hackathon to set dates.</div>'}
    </div>
  `;
}

