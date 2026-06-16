import './styles/main.css';
import { authApi } from './api/auth';
import { supabase, isSupabaseConfigured } from './api/supabase';
import { hackathonApi, teamApi, datesApi, tasksApi, registrationApi } from './api/hackathons';
import { renderAuth } from './components/Auth';
import { Hackathon, Registration, TeamMember, DateItem, Task } from './types';
import { toast, showModal, closeModal } from './utils/ui';

interface AppState {
  user: any;
  hackathons: Hackathon[];
  currentHackathonId: string | null;
  currentView: string;
  cache: {
    members: Record<string, TeamMember[]>;
    dates: Record<string, DateItem[]>;
    tasks: Record<string, Task[]>;
    regs: Record<string, Registration>;
  };
}

let state: AppState = {
  user: null,
  hackathons: [],
  currentHackathonId: null,
  currentView: 'overview',
  cache: {
    members: {},
    dates: {},
    tasks: {},
    regs: {},
  }
};

const appContainer = document.getElementById('app')!;

async function init() {
  if (!isSupabaseConfigured()) {
    appContainer.innerHTML = `
      <div id="config-screen">
        <div class="config-badge" style="background:var(--danger-bg);color:var(--danger-text)">Configuration Missing</div>
        <h2>Supabase Not Found</h2>
        <p>The application credentials (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY) are missing or invalid.</p>
        <p>Please check your Vercel Environment Variables or local .env file and redeploy.</p>
        <div style="margin-top:24px;padding-top:16px;border-top:0.5px solid var(--border);text-align:center;">
          <button class="btn btn-primary" onclick="window.location.reload()">Retry Connection</button>
        </div>
      </div>
    `;
    return;
  }

  // Fail-safe: Force render if stuck
  const renderTimeout = setTimeout(() => {
    if (appContainer.innerHTML === '') render();
  }, 5000);

  // 1. Listen for auth changes
  authApi.onAuthStateChange(async (_event, session) => {
    clearTimeout(renderTimeout);
    state.user = session?.user || null;

    if (state.user) {
      await loadData();
      setupSubscriptions();
    }
    render();
  });

  // 2. Initial session check
  try {
    const session = await authApi.getSession();
    state.user = session?.user || null;
    if (state.user) {
      await loadData();
      setupSubscriptions();
    }
  } catch (e) {
    console.error('Session error:', e);
    state.user = null;
  } finally {
    clearTimeout(renderTimeout);
    render();
  }
}

let activeChannel: any = null;

function setupSubscriptions() {
  if (!state.user || activeChannel) return;

  activeChannel = supabase
    .channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
      console.log('Real-time sync triggered:', payload.table);
      // Re-load all data to ensure cache is perfectly synced
      await loadData();
      if (state.currentHackathonId) {
        await loadHackathonDetails(state.currentHackathonId);
      }
      
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
      if (!isInputFocused) {
        render();
      }
    })
    .subscribe();
}


async function loadData() {
  try {
    const hs = await hackathonApi.getAll();
    state.hackathons = hs;
    if (hs.length > 0 && !state.currentHackathonId) {
      state.currentHackathonId = hs[0].id;
    }
    
    if (state.currentHackathonId) {
      await loadHackathonDetails(state.currentHackathonId);
    }
  } catch (e: any) {
    toast('Error loading data: ' + e.message);
  }
}

async function loadHackathonDetails(id: string) {
  const [ms, ds, ts, r] = await Promise.all([
    teamApi.getByHackathon(id),
    datesApi.getByHackathon(id),
    tasksApi.getByHackathon(id),
    registrationApi.getByHackathon(id)
  ]);
  state.cache.members[id] = ms;
  state.cache.dates[id] = ds;
  state.cache.tasks[id] = ts;
  if (r) state.cache.regs[id] = r;
}

function render() {
  if (!state.user) {
    renderAuth(appContainer);
    return;
  }

  const h = state.hackathons.find(x => x.id === state.currentHackathonId);

  appContainer.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-top">
          <select class="hack-sel" id="hack-sel">
            ${state.hackathons.map(x => `<option value="${x.id}" ${x.id === state.currentHackathonId ? 'selected' : ''}>${x.name}</option>`).join('')}
          </select>
          <div class="hack-tags">${h?.tags.join(', ') || ''}</div>
        </div>
        <nav class="sidebar-nav">
          <button class="nav-item ${state.currentView === 'overview' ? 'active' : ''}" data-view="overview"><i class="ti ti-layout-dashboard"></i> Overview</button>
          <button class="nav-item ${state.currentView === 'registration' ? 'active' : ''}" data-view="registration"><i class="ti ti-clipboard-check"></i> Registration</button>
          <button class="nav-item ${state.currentView === 'team' ? 'active' : ''}" data-view="team"><i class="ti ti-users"></i> Team <span class="nav-count">${state.cache.members[h?.id || '']?.length || 0}</span></button>
          <button class="nav-item ${state.currentView === 'dates' ? 'active' : ''}" data-view="dates"><i class="ti ti-calendar-event"></i> Dates <span class="nav-count">${state.cache.dates[h?.id || '']?.length || 0}</span></button>
          <button class="nav-item ${state.currentView === 'tasks' ? 'active' : ''}" data-view="tasks"><i class="ti ti-checklist"></i> Tasks <span class="nav-count">${state.cache.tasks[h?.id || '']?.length || 0}</span></button>
        </nav>
        <div class="sidebar-footer">
          <button class="btn btn-full" id="import-btn"><i class="ti ti-file-import"></i> Bulk Import</button>
          <button class="btn btn-full" id="new-hack-btn"><i class="ti ti-plus"></i> New hackathon</button>
          <button class="btn btn-full btn-danger" id="logout-btn"><i class="ti ti-logout"></i> Logout</button>
          <div class="conn-status"><span class="conn-dot ok"></span><span>Connected as ${state.user.email}</span></div>
        </div>
      </aside>

      <main class="main">
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

  setupEventListeners();
}

function renderView() {
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

function renderOverview(h: Hackathon) {
  const members = state.cache.members[h.id] || [];
  const tasks = state.cache.tasks[h.id] || [];
  const dates = state.cache.dates[h.id] || [];
  const doneTasks = tasks.filter(t => t.done).length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const nextDate = dates.filter(d => new Date(d.date) >= new Date())[0];

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
        ${h.user_id === state.user.id ? '<button class="btn btn-sm" id="edit-hack-btn"><i class="ti ti-edit"></i> Edit</button>' : ''}
      </div>
      <div class="about-body">${h.description || 'No description provided.'}</div>
      <div class="about-tags">${h.tags.map(t => `<span class="badge b-gray">${t}</span>`).join('')}</div>
    </div>

    ${nextDate ? `
      <div class="panel">
        <div class="panel-head"><div class="panel-head-title">Upcoming</div></div>
        <div class="row-item">
          <div class="row-main">
            <div class="row-title">${nextDate.label}</div>
            <div class="row-sub">${nextDate.date} • ${nextDate.type}</div>
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

function renderRegistration(h: Hackathon) {
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

function renderTeam(h: Hackathon) {
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
            <div class="row-title">${m.name}</div>
            <div class="row-sub">${m.role} • ${m.email}</div>
          </div>
          <div class="row-actions">
            <button class="btn-ghost btn btn-sm del-member" data-id="${m.id}"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `).join('') : '<div class="empty">No team members yet.</div>'}
    </div>
  `;
}

function renderDates(h: Hackathon) {
  const dates = state.cache.dates[h.id] || [];
  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title">Important Dates</div>
        <button class="btn btn-sm" id="add-date-btn"><i class="ti ti-plus"></i> Add Date</button>
      </div>
      ${dates.length ? dates.map(d => `
        <div class="row-item">
          <div class="row-main">
            <div class="row-title">${d.label}</div>
            <div class="row-sub">${d.date} • <span class="badge b-gray" style="text-transform:capitalize">${d.type}</span></div>
          </div>
          <div class="row-actions">
            <button class="btn-ghost btn btn-sm del-date" data-id="${d.id}"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      `).join('') : '<div class="empty">No dates added yet.</div>'}
    </div>
  `;
}

function renderTasks(h: Hackathon) {
  const tasks = state.cache.tasks[h.id] || [];
  return `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-head-title">Task Checklist</div>
        <button class="btn btn-sm" id="add-task-btn"><i class="ti ti-plus"></i> Add Task</button>
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
      `).join('') : '<div class="empty">No tasks yet.</div>'}
    </div>
  `;
}

function setupEventListeners() {
  // Use unique IDs or clear listeners if possible. 
  // For this simple version, we just re-attach as render() replaces the whole DOM.

  document.getElementById('hack-sel')?.addEventListener('change', async (e: any) => {
    state.currentHackathonId = e.target.value;
    await loadHackathonDetails(state.currentHackathonId!);
    render();
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e: any) => {
      state.currentView = (e.currentTarget as HTMLElement).dataset.view!;
      render();
    });
  });

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await authApi.signOut();
    state.user = null;
    if (activeChannel) {
      activeChannel.unsubscribe();
      activeChannel = null;
    }
    render();
  });

  document.getElementById('new-hack-btn')?.addEventListener('click', () => {
    showModal(`
      <h3>New Hackathon</h3>
      <div class="field"><label>Name</label><input id="new-h-name"></div>
      <div class="field"><label>Description</label><textarea id="new-h-desc"></textarea></div>
      <div class="field"><label>Tags (comma separated)</label><input id="new-h-tags"></div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-new-h">Create</button>
      </div>
    `);
    document.getElementById('save-new-h')?.addEventListener('click', async () => {
      const name = (document.getElementById('new-h-name') as HTMLInputElement).value;
      const description = (document.getElementById('new-h-desc') as HTMLTextAreaElement).value;
      const tags = (document.getElementById('new-h-tags') as HTMLInputElement).value.split(',').map(t => t.trim());
      try {
        const newH = await hackathonApi.create({ name, description, tags });
        await registrationApi.upsert({ hackathon_id: newH.id, status: 'not_started' });
        state.hackathons.push(newH);
        state.currentHackathonId = newH.id;
        await loadHackathonDetails(newH.id);
        closeModal();
        render();
        toast('Hackathon created!');
      } catch (e: any) {
        toast('Failed to create: ' + e.message);
      }
    });
  });

  // Task toggle
  document.querySelectorAll('.check').forEach(el => {
    el.addEventListener('click', async (e: any) => {
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      const hId = state.currentHackathonId!;
      const task = state.cache.tasks[hId].find(t => t.id === id)!;
      try {
        const updated = await tasksApi.update(id, { done: !task.done });
        const idx = state.cache.tasks[hId].findIndex(t => t.id === id);
        state.cache.tasks[hId][idx] = updated;
        render();
      } catch (e: any) {
        toast('Update failed: ' + e.message);
      }
    });
  });

  // Member add
  document.getElementById('add-member-btn')?.addEventListener('click', () => {
    showModal(`
      <h3>Add Team Member</h3>
      <div class="field"><label>Name</label><input id="m-name"></div>
      <div class="field"><label>Role</label><input id="m-role"></div>
      <div class="field"><label>Email</label><input id="m-email"></div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-member">Add</button>
      </div>
    `);
    document.getElementById('save-member')?.addEventListener('click', async () => {
      const name = (document.getElementById('m-name') as HTMLInputElement).value;
      const role = (document.getElementById('m-role') as HTMLInputElement).value;
      const email = (document.getElementById('m-email') as HTMLInputElement).value.toLowerCase().trim();
      try {
        const m = await teamApi.add({ hackathon_id: state.currentHackathonId!, name, role, email });
        state.cache.members[state.currentHackathonId!].push(m);
        closeModal();
        render();
        toast('Member added!');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  // Task add
  document.getElementById('add-task-btn')?.addEventListener('click', () => {
    showModal(`
      <h3>Add Task</h3>
      <div class="field"><label>Title</label><input id="t-title"></div>
      <div class="field"><label>Assigned To</label><input id="t-assign"></div>
      <div class="field">
        <label>Priority</label>
        <select id="t-pri">
          <option value="low">Low</option>
          <option value="med" selected>Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-task">Add</button>
      </div>
    `);
    
    document.getElementById('save-task')?.addEventListener('click', async () => {
      const title = (document.getElementById('t-title') as HTMLInputElement).value;
      const assigned_to = (document.getElementById('t-assign') as HTMLInputElement).value;
      const priority = (document.getElementById('t-pri') as HTMLSelectElement).value as any;
      try {
        const t = await tasksApi.add({ hackathon_id: state.currentHackathonId!, title, assigned_to, priority });
        state.cache.tasks[state.currentHackathonId!].push(t);
        closeModal();
        render();
        toast('Task added!');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  // Date add
  document.getElementById('add-date-btn')?.addEventListener('click', () => {
    showModal(`
      <h3>Add Important Date</h3>
      <div class="field"><label>Label</label><input id="d-label"></div>
      <div class="field"><label>Date</label><input type="date" id="d-date"></div>
      <div class="field">
        <label>Type</label>
        <select id="d-type">
          <option value="event">Event</option>
          <option value="deadline">Deadline</option>
          <option value="milestone">Milestone</option>
          <option value="info">Info</option>
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-date">Add</button>
      </div>
    `);

    document.getElementById('save-date')?.addEventListener('click', async () => {
      const label = (document.getElementById('d-label') as HTMLInputElement).value;
      const date = (document.getElementById('d-date') as HTMLInputElement).value;
      const type = (document.getElementById('d-type') as HTMLSelectElement).value as any;
      try {
        const d = await datesApi.add({ hackathon_id: state.currentHackathonId!, label, date, type });
        state.cache.dates[state.currentHackathonId!].push(d);
        closeModal();
        render();
        toast('Date added!');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  // Edit Registration
  document.getElementById('edit-reg-btn')?.addEventListener('click', () => {
    const r = state.cache.regs[state.currentHackathonId!] || {};
    showModal(`
      <h3>Edit Registration</h3>
      <div class="field">
        <label>Status</label>
        <select id="r-status">
          <option value="not_started" ${r.status === 'not_started' ? 'selected' : ''}>Not Started</option>
          <option value="pending" ${r.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="registered" ${r.status === 'registered' ? 'selected' : ''}>Registered</option>
          <option value="cancelled" ${r.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <div class="field"><label>Team Name</label><input id="r-team" value="${r.team_name || ''}"></div>
      <div class="field"><label>Track</label><input id="r-track" value="${r.track || ''}"></div>
      <div class="field"><label>Reference ID</label><input id="r-ref" value="${r.ref_id || ''}"></div>
      <div class="field"><label>Link</label><input id="r-link" value="${r.link || ''}"></div>
      <div class="field"><label>Notes</label><textarea id="r-notes">${r.notes || ''}</textarea></div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-reg">Save</button>
      </div>
    `);

    document.getElementById('save-reg')?.addEventListener('click', async () => {
      const updates = {
        hackathon_id: state.currentHackathonId!,
        status: (document.getElementById('r-status') as HTMLSelectElement).value as any,
        team_name: (document.getElementById('r-team') as HTMLInputElement).value,
        track: (document.getElementById('r-track') as HTMLInputElement).value,
        ref_id: (document.getElementById('r-ref') as HTMLInputElement).value,
        link: (document.getElementById('r-link') as HTMLInputElement).value,
        notes: (document.getElementById('r-notes') as HTMLTextAreaElement).value,
      };
      try {
        const updated = await registrationApi.upsert(updates);
        state.cache.regs[state.currentHackathonId!] = updated;
        closeModal();
        render();
        toast('Registration updated!');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  // Edit Hackathon
  document.getElementById('edit-hack-btn')?.addEventListener('click', () => {
    const h = state.hackathons.find(x => x.id === state.currentHackathonId);
    if (!h) return;
    showModal(`
      <h3>Edit Hackathon</h3>
      <div class="field"><label>Name</label><input id="e-h-name" value="${h.name}"></div>
      <div class="field"><label>Description</label><textarea id="e-h-desc">${h.description}</textarea></div>
      <div class="field"><label>Tags (comma separated)</label><input id="e-h-tags" value="${h.tags.join(', ')}"></div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-hack-btn">Save</button>
      </div>
    `);

    document.getElementById('save-hack-btn')?.addEventListener('click', async () => {
      const name = (document.getElementById('e-h-name') as HTMLInputElement).value;
      const description = (document.getElementById('e-h-desc') as HTMLTextAreaElement).value;
      const tags = (document.getElementById('e-h-tags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(t => t);
      try {
        const updated = await hackathonApi.update(h.id, { name, description, tags });
        const idx = state.hackathons.findIndex(x => x.id === h.id);
        if (idx !== -1) state.hackathons[idx] = updated;
        closeModal();
        render();
        toast('Hackathon updated!');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  // Deletion listeners
  document.querySelectorAll('.del-member').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      if (!confirm('Delete this team member?')) return;
      try {
        await teamApi.delete(id);
        state.cache.members[state.currentHackathonId!] = state.cache.members[state.currentHackathonId!].filter(m => m.id !== id);
        render();
        toast('Member removed');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  document.querySelectorAll('.del-date').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      if (!confirm('Delete this date?')) return;
      try {
        await datesApi.delete(id);
        state.cache.dates[state.currentHackathonId!] = state.cache.dates[state.currentHackathonId!].filter(d => d.id !== id);
        render();
        toast('Date removed');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  document.querySelectorAll('.del-task').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      if (!confirm('Delete this task?')) return;
      try {
        await tasksApi.delete(id);
        state.cache.tasks[state.currentHackathonId!] = state.cache.tasks[state.currentHackathonId!].filter(t => t.id !== id);
        render();
        toast('Task removed');
      } catch (e: any) {
        toast('Failed: ' + e.message);
      }
    });
  });

  document.getElementById('del-hack-btn')?.addEventListener('click', async () => {
    const h = state.hackathons.find(x => x.id === state.currentHackathonId);
    if (!h) return;
    if (state.hackathons.length <= 1) { toast('Need at least one hackathon'); return; }
    if (!confirm(`Delete "${h.name}"? This cannot be undone.`)) return;
    try {
      await hackathonApi.delete(h.id);
      state.hackathons = state.hackathons.filter(x => x.id !== h.id);
      state.currentHackathonId = state.hackathons[0].id;
      await loadHackathonDetails(state.currentHackathonId);
      render();
      toast('Hackathon deleted');
    } catch (e: any) {
      toast('Failed: ' + e.message);
    }
  });

  document.getElementById('import-btn')?.addEventListener('click', () => {
    showModal(`
      <h3>Bulk Import</h3>
      <p style="font-size:12px;color:var(--text-2);margin-bottom:12px;">Paste a JSON array of hackathons.</p>
      <textarea id="import-json" style="width:100%;height:150px;font-family:monospace;font-size:12px;" placeholder='[{"name":"HackX","description":"...","tags":["AI"]}]'></textarea>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="run-import">Import</button>
      </div>
    `);
    document.getElementById('run-import')?.addEventListener('click', async () => {
      const raw = (document.getElementById('import-json') as HTMLTextAreaElement).value;
      try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) throw new Error('Data must be an array');
        for (const item of data) {
          const newH = await hackathonApi.create({ name: item.name, description: item.description, tags: item.tags || [] });
          await registrationApi.upsert({ hackathon_id: newH.id, status: 'not_started' });
          state.hackathons.push(newH);
        }
        closeModal();
        render();
        toast(`Imported ${data.length} hackathons`);
      } catch (e: any) {
        toast('Import failed: ' + e.message);
      }
    });
  });
}

init();
