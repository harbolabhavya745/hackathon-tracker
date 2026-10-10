import { Hackathon } from '../types';
import { state } from '../state';

export function renderTasks(h: Hackathon): string {
  const tasks = state.cache.tasks[h.id] || [];
  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title">Task Checklist</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm" id="load-checklist-btn"><i class="ti ti-list-check"></i> Standard Submission Checklist</button>
          <button class="btn btn-sm" id="load-template-tasks-btn"><i class="ti ti-template"></i> Load Workflow Presets</button>
          <button class="btn btn-sm" id="add-task-btn"><i class="ti ti-plus"></i> Add Task</button>
        </div>
      </div>
      ${tasks.length ? tasks.map(t => `
        <div class="row-item">
          <div class="check ${t.done ? 'on' : ''}" data-id="${t.id}">${t.done ? '<i class="ti ti-check"></i>' : ''}</div>
          <div class="row-main">
            <div class="row-title" style="${t.done ? 'text-decoration:line-through;opacity:0.5' : ''}">${t.title}</div>
            <div class="row-sub">Assigned to: ${t.assigned_to || 'Everyone'} • <span class="badge ${t.priority === 'high' ? 'b-red' : t.priority === 'low' ? 'b-blue' : 'b-amber'}">${t.priority}</span></div>
          </div>
          <div class="row-actions">
            <button class="btn-ghost btn btn-sm del-task" data-id="${t.id}"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `).join('') : '<div class="empty">No tasks yet. Click "Standard Submission Checklist" or "Load Workflow Presets" to auto-populate tasks.</div>'}
    </div>
  `;
}
