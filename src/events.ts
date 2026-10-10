import { state, loadHackathonDetails } from './state';
import { hackathonApi, registrationApi, teamApi, tasksApi, datesApi } from './api/hackathons';
import { authApi } from './api/auth';
import { toast, showModal, closeModal } from './utils/ui';
import { exportSummaryPdf } from './utils/summary';
import { dismissBanner } from './views/layout';
import { renderSmartImportModal } from './views/smartImport';
import { extractFromText, extractFromUrl, extractWithGemini, ExtractedHackathon } from './utils/extractor';
import { HACKATHON_TEMPLATES } from './utils/templates';
import { downloadIcsFile } from './utils/calendar';
import { HackathonStatus } from './types';
import { STATUS_COLUMNS, SUBMISSION_CHECKLIST_ITEMS } from './constants';

let currentExtractedData: ExtractedHackathon | null = null;

function setupImportModalListeners(render: () => void) {
  // Tab switching inside Smart Import Modal
  document.querySelectorAll('.import-tab').forEach(tab => {
    tab.addEventListener('click', (e: any) => {
      const targetTabId = (e.currentTarget as HTMLElement).dataset.tab!;
      document.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.import-pane').forEach(p => p.classList.remove('active'));
      
      (e.currentTarget as HTMLElement).classList.add('active');
      document.getElementById(targetTabId)?.classList.add('active');
    });
  });

  // Clear input
  document.getElementById('clear-smart-input')?.addEventListener('click', () => {
    const input = document.getElementById('smart-input') as HTMLTextAreaElement;
    if (input) input.value = '';
    const prev = document.getElementById('smart-preview-container');
    if (prev) prev.style.display = 'none';
  });

  // Paste from clipboard
  document.getElementById('paste-clipboard-btn')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        toast('Clipboard is empty');
        return;
      }
      const input = document.getElementById('smart-input') as HTMLTextAreaElement;
      if (input) {
        input.value = text;
        toast('Pasted! Analyzing with Gemini AI...');
        document.getElementById('run-smart-extract')?.click();
      }
    } catch {
      toast('Please press Ctrl+V inside the text box to paste');
    }
  });

  // Toggle AI Key container
  document.getElementById('toggle-ai-key-btn')?.addEventListener('click', () => {
    const container = document.getElementById('ai-key-container');
    if (container) {
      container.style.display = container.style.display === 'none' ? 'block' : 'none';
    }
  });

  // Save Gemini Key
  document.getElementById('save-gemini-key-btn')?.addEventListener('click', () => {
    const keyInput = document.getElementById('gemini-api-key-input') as HTMLInputElement;
    const key = keyInput ? keyInput.value.trim() : '';
    if (key) {
      localStorage.setItem('gemini_api_key', key);
      toast('Gemini AI Key saved!');
      const toggleBtn = document.getElementById('toggle-ai-key-btn');
      if (toggleBtn) toggleBtn.innerHTML = '<i class="ti ti-key"></i> AI Key Saved ✓';
      const container = document.getElementById('ai-key-container');
      if (container) container.style.display = 'none';
    } else {
      localStorage.removeItem('gemini_api_key');
      toast('Gemini Key cleared');
    }
  });

  // Run Extraction
  document.getElementById('run-smart-extract')?.addEventListener('click', async () => {
    const rawInput = (document.getElementById('smart-input') as HTMLTextAreaElement)?.value.trim();
    if (!rawInput) {
      toast('Please paste a URL or announcement text');
      return;
    }

    const btn = document.getElementById('run-smart-extract') as HTMLButtonElement;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Analyzing...';
    btn.disabled = true;

    try {
      let extracted: ExtractedHackathon;
      if (rawInput.startsWith('http://') || rawInput.startsWith('https://')) {
        extracted = await extractFromUrl(rawInput);
      } else {
        const aiRes = await extractWithGemini(rawInput);
        extracted = aiRes && aiRes.name ? aiRes : extractFromText(rawInput);
      }

      currentExtractedData = extracted;

      // Populate preview form
      (document.getElementById('prev-name') as HTMLInputElement).value = extracted.name;
      (document.getElementById('prev-desc') as HTMLTextAreaElement).value = extracted.description;
      (document.getElementById('prev-start') as HTMLInputElement).value = extracted.start_date || '';
      (document.getElementById('prev-end') as HTMLInputElement).value = extracted.end_date || '';
      (document.getElementById('prev-tz') as HTMLInputElement).value = extracted.timezone || 'UTC';
      (document.getElementById('prev-limit') as HTMLInputElement).value = extracted.team_size_limit ? String(extracted.team_size_limit) : '';
      (document.getElementById('prev-tracks') as HTMLInputElement).value = extracted.prize_tracks.join(', ');
      (document.getElementById('prev-link') as HTMLInputElement).value = extracted.website_link || '';

      const datesTasksEl = document.getElementById('prev-dates-tasks');
      if (datesTasksEl) {
        const datesHtml = extracted.dates.map(d => `<div>📅 <strong>${d.label}</strong>: ${d.date} (${d.type})</div>`).join('');
        const tasksHtml = extracted.tasks.map(t => `<div>☑️ ${t.title} [${t.priority}]</div>`).join('');
        datesTasksEl.innerHTML = `${datesHtml || '<div>No dates detected</div>'}<div style="margin-top:4px;">${tasksHtml}</div>`;
      }

      const previewContainer = document.getElementById('smart-preview-container');
      if (previewContainer) previewContainer.style.display = 'block';

      toast('Extracted details successfully!');
    } catch (err: any) {
      toast('Extraction failed: ' + err.message);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Confirm and save Smart Import
  document.getElementById('confirm-smart-import')?.addEventListener('click', async () => {
    const name = (document.getElementById('prev-name') as HTMLInputElement).value.trim();
    if (!name) { toast('Name is required'); return; }

    const description = (document.getElementById('prev-desc') as HTMLTextAreaElement).value;
    const start_date = (document.getElementById('prev-start') as HTMLInputElement).value || null;
    const end_date = (document.getElementById('prev-end') as HTMLInputElement).value || null;
    const timezone = (document.getElementById('prev-tz') as HTMLInputElement).value.trim() || 'UTC';
    const limitRaw = (document.getElementById('prev-limit') as HTMLInputElement).value;
    const team_size_limit = limitRaw ? parseInt(limitRaw, 10) : null;
    const prize_tracks = (document.getElementById('prev-tracks') as HTMLInputElement).value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const website_link = (document.getElementById('prev-link') as HTMLInputElement).value.trim();
    const tags = currentExtractedData?.tags && currentExtractedData.tags.length ? currentExtractedData.tags : ['Hackathon'];

    try {
      const newH = await hackathonApi.create({
        name,
        description,
        tags,
        status: 'bookmarked',
        start_date,
        end_date,
        timezone,
        team_size_limit,
        website_link,
        prize_tracks
      });

      await registrationApi.upsert({ hackathon_id: newH.id, status: 'not_started', link: website_link });

      // Insert dates
      if (currentExtractedData?.dates && currentExtractedData.dates.length > 0) {
        await Promise.all(currentExtractedData.dates.map(d => datesApi.add({
          hackathon_id: newH.id,
          label: d.label,
          date: d.date,
          type: d.type
        })));
      }

      // Insert tasks
      if (currentExtractedData?.tasks && currentExtractedData.tasks.length > 0) {
        await Promise.all(currentExtractedData.tasks.map(t => tasksApi.add({
          hackathon_id: newH.id,
          title: t.title,
          priority: t.priority,
          done: false
        })));
      }

      state.hackathons.push(newH);
      state.currentHackathonId = newH.id;
      await loadHackathonDetails(newH.id);

      closeModal();
      render();
      toast(`Created & tracking "${newH.name}"!`);
    } catch (err: any) {
      toast('Failed to save: ' + err.message);
    }
  });

  // Apply Template
  document.querySelectorAll('.apply-template-btn').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      const templateId = (e.currentTarget as HTMLElement).dataset.templateId!;
      const tmpl = HACKATHON_TEMPLATES.find(t => t.id === templateId);
      if (!tmpl) return;

      const now = new Date();
      const toDateStr = (days: number) => {
        const d = new Date();
        d.setDate(now.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      try {
        const newH = await hackathonApi.create({
          name: tmpl.name,
          description: tmpl.description,
          tags: tmpl.tags,
          status: 'applied',
          start_date: toDateStr(0),
          end_date: toDateStr(tmpl.dates[tmpl.dates.length - 1]?.offsetDays || 2),
          timezone: 'UTC',
          team_size_limit: tmpl.team_size_limit,
          prize_tracks: ['Main Track']
        });

        await registrationApi.upsert({ hackathon_id: newH.id, status: 'pending' });

        // Insert template dates
        await Promise.all(tmpl.dates.map(d => datesApi.add({
          hackathon_id: newH.id,
          label: d.label,
          date: toDateStr(d.offsetDays),
          type: d.type
        })));

        // Insert template tasks
        await Promise.all(tmpl.tasks.map(t => tasksApi.add({
          hackathon_id: newH.id,
          title: t.title,
          priority: t.priority,
          done: false
        })));

        state.hackathons.push(newH);
        state.currentHackathonId = newH.id;
        await loadHackathonDetails(newH.id);

        closeModal();
        render();
        toast(`Loaded template: ${tmpl.name}!`);
      } catch (err: any) {
        toast('Failed to load template: ' + err.message);
      }
    });
  });

  // Bulk JSON Import
  document.getElementById('run-import')?.addEventListener('click', async () => {
    const raw = (document.getElementById('import-json') as HTMLTextAreaElement).value;
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('Data must be an array');
      for (const item of data) {
        const newH = await hackathonApi.create({
          name: item.name,
          description: item.description,
          tags: item.tags || ['Hackathon'],
          start_date: item.start_date || null,
          end_date: item.end_date || null,
          website_link: item.website_link || ''
        });
        await registrationApi.upsert({ hackathon_id: newH.id, status: 'not_started' });

        if (Array.isArray(item.dates)) {
          for (const d of item.dates) {
            await datesApi.add({ hackathon_id: newH.id, label: d.label, date: d.date, type: d.type || 'event' });
          }
        }
        if (Array.isArray(item.tasks)) {
          for (const t of item.tasks) {
            await tasksApi.add({ hackathon_id: newH.id, title: t.title, priority: t.priority || 'med', done: !!t.done });
          }
        }
        state.hackathons.push(newH);
      }
      closeModal();
      render();
      toast(`Imported ${data.length} hackathons`);
    } catch (e: any) {
      toast('Import failed: ' + e.message);
    }
  });
}

export function setupEventListeners(render: () => void, activeChannel: any) {
  // Hackathon Selector
  document.getElementById('hack-sel')?.addEventListener('change', async (e: any) => {
    state.currentHackathonId = e.target.value;
    dismissBanner(state.currentHackathonId!);
    await loadHackathonDetails(state.currentHackathonId!);
    render();
  });

  // Deadline banner close
  document.getElementById('deadline-banner-close')?.addEventListener('click', () => {
    if (state.currentHackathonId) dismissBanner(state.currentHackathonId);
    document.getElementById('deadline-banner')?.remove();
  });

  // Navigation Items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e: any) => {
      state.currentView = (e.currentTarget as HTMLElement).dataset.view!;
      render();
    });
  });

  // Export PDF
  document.getElementById('export-pdf-btn')?.addEventListener('click', exportSummaryPdf);

  // Calendar .ics Export (from Overview or Dates)
  const handleExportIcs = () => {
    const h = state.hackathons.find(x => x.id === state.currentHackathonId);
    if (!h) return;
    const dates = state.cache.dates[h.id] || [];
    downloadIcsFile(h, dates);
    toast('Calendar .ics file downloaded!');
  };

  document.getElementById('export-ics-btn')?.addEventListener('click', handleExportIcs);
  document.getElementById('export-dates-ics-btn')?.addEventListener('click', handleExportIcs);

  // Board Hide Past toggle
  document.getElementById('board-hide-past')?.addEventListener('change', (e: any) => {
    state.boardHidePast = e.target.checked;
    render();
  });

  // Board Card Click
  document.querySelectorAll('.board-card').forEach(card => {
    card.addEventListener('click', async (e: any) => {
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      state.currentHackathonId = id;
      state.currentView = 'overview';
      await loadHackathonDetails(id);
      render();
    });
  });

  // Board Card Status Change
  document.querySelectorAll('.board-card-status').forEach(sel => {
    sel.addEventListener('change', async (e: any) => {
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      const status = e.target.value as HackathonStatus;
      try {
        const updated = await hackathonApi.update(id, { status });
        const idx = state.hackathons.findIndex(x => x.id === id);
        if (idx !== -1) state.hackathons[idx] = updated;
        render();
        toast('Status updated!');
      } catch (err: any) {
        toast('Failed: ' + err.message);
      }
    });
  });

  // Archive actions
  document.querySelectorAll('.view-archive-btn').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      state.currentHackathonId = id;
      state.currentView = 'overview';
      await loadHackathonDetails(id);
      render();
    });
  });

  document.querySelectorAll('.reopen-archive-btn').forEach(btn => {
    btn.addEventListener('click', async (e: any) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      try {
        const updated = await hackathonApi.update(id, { status: 'hacking' });
        const idx = state.hackathons.findIndex(x => x.id === id);
        if (idx !== -1) state.hackathons[idx] = updated;
        state.currentHackathonId = id;
        toast(`Restored "${updated.name}" to Active Board!`);
        render();
      } catch (err: any) {
        toast('Failed to restore: ' + err.message);
      }
    });
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await authApi.signOut();
    state.user = null;
    if (activeChannel) {
      activeChannel.unsubscribe();
    }
    render();
  });

  // Smart Automate / Import Modal Button
  document.getElementById('smart-import-btn')?.addEventListener('click', () => {
    showModal(renderSmartImportModal());
    setupImportModalListeners(render);
  });

  // Manual New Hackathon Modal Button
  document.getElementById('new-hack-btn')?.addEventListener('click', () => {
    showModal(`
      <h3>Manual Add Hackathon</h3>
      <div class="field"><label>Name</label><input id="new-h-name"></div>
      <div class="field"><label>Description</label><textarea id="new-h-desc"></textarea></div>
      <div class="field"><label>Tags (comma separated)</label><input id="new-h-tags"></div>
      <div class="field">
        <label>Status</label>
        <select id="new-h-status">
          ${STATUS_COLUMNS.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label>Start Date</label><input type="date" id="new-h-start"></div>
        <div class="field"><label>End Date</label><input type="date" id="new-h-end"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Timezone</label><input id="new-h-tz" placeholder="e.g. IST, UTC-5"></div>
        <div class="field"><label>Team Size Limit</label><input type="number" min="1" id="new-h-team-limit"></div>
      </div>
      <div class="field"><label>Devpost / Website Link</label><input id="new-h-link" placeholder="https://..."></div>
      <div class="field"><label>Prize Tracks (comma separated)</label><input id="new-h-tracks"></div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-new-h">Create</button>
      </div>
    `);
    document.getElementById('save-new-h')?.addEventListener('click', async () => {
      const name = (document.getElementById('new-h-name') as HTMLInputElement).value;
      const description = (document.getElementById('new-h-desc') as HTMLTextAreaElement).value;
      const tags = (document.getElementById('new-h-tags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(t => t);
      const status = (document.getElementById('new-h-status') as HTMLSelectElement).value as HackathonStatus;
      const start_date = (document.getElementById('new-h-start') as HTMLInputElement).value || null;
      const end_date = (document.getElementById('new-h-end') as HTMLInputElement).value || null;
      const timezone = (document.getElementById('new-h-tz') as HTMLInputElement).value;
      const teamLimitRaw = (document.getElementById('new-h-team-limit') as HTMLInputElement).value;
      const team_size_limit = teamLimitRaw ? parseInt(teamLimitRaw, 10) : null;
      const website_link = (document.getElementById('new-h-link') as HTMLInputElement).value;
      const prize_tracks = (document.getElementById('new-h-tracks') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(t => t);
      try {
        const newH = await hackathonApi.create({ name, description, tags, status, start_date, end_date, timezone, team_size_limit, website_link, prize_tracks });
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
      <div class="field">
        <label>Role</label>
        <select id="m-role">
          <option value="Frontend">Frontend</option>
          <option value="Backend">Backend</option>
          <option value="Design">Design</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="field"><label>Email</label><input id="m-email"></div>
      <div class="field"><label>Discord Handle</label><input id="m-discord" placeholder="username"></div>
      <div class="field"><label>GitHub</label><input id="m-github" placeholder="username"></div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-member">Add</button>
      </div>
    `);
    document.getElementById('save-member')?.addEventListener('click', async () => {
      const name = (document.getElementById('m-name') as HTMLInputElement).value;
      const role = (document.getElementById('m-role') as HTMLSelectElement).value;
      const email = (document.getElementById('m-email') as HTMLInputElement).value.toLowerCase().trim();
      const discord = (document.getElementById('m-discord') as HTMLInputElement).value.trim();
      const github = (document.getElementById('m-github') as HTMLInputElement).value.trim();
      try {
        const m = await teamApi.add({ hackathon_id: state.currentHackathonId!, name, role, email, discord, github });
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
  document.getElementById('load-checklist-btn')?.addEventListener('click', async () => {
    const hId = state.currentHackathonId!;
    const existing = new Set((state.cache.tasks[hId] || []).map(t => t.title));
    const toAdd = SUBMISSION_CHECKLIST_ITEMS.filter(title => !existing.has(title));
    if (!toAdd.length) { toast('Checklist already loaded'); return; }
    try {
      const created = await Promise.all(toAdd.map(title => tasksApi.add({ hackathon_id: hId, title, priority: 'high' })));
      state.cache.tasks[hId].push(...created);
      render();
      toast(`Added ${created.length} checklist items`);
    } catch (e: any) {
      toast('Failed: ' + e.message);
    }
  });

  // Load Workflow Presets in Tasks view
  document.getElementById('load-template-tasks-btn')?.addEventListener('click', () => {
    showModal(`
      <h3>Select Workflow Preset to Load</h3>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px;">
        ${HACKATHON_TEMPLATES.map(t => `
          <button class="btn load-tmpl-tasks-action" data-tmpl="${t.id}" style="justify-content:flex-start;text-align:left;padding:10px;">
            <div>
              <div style="font-weight:600;"><i class="ti ${t.icon}"></i> ${t.name}</div>
              <div style="font-size:11px;color:var(--text-2);">${t.tasks.length} tasks: ${t.tasks.map(x => x.title).slice(0, 2).join(', ')}...</div>
            </div>
          </button>
        `).join('')}
      </div>
      <div class="modal-footer"><button class="btn" onclick="closeModal()">Cancel</button></div>
    `);

    document.querySelectorAll('.load-tmpl-tasks-action').forEach(btn => {
      btn.addEventListener('click', async (e: any) => {
        const tmplId = (e.currentTarget as HTMLElement).dataset.tmpl!;
        const tmpl = HACKATHON_TEMPLATES.find(x => x.id === tmplId);
        if (!tmpl) return;

        const hId = state.currentHackathonId!;
        const existing = new Set((state.cache.tasks[hId] || []).map(t => t.title));
        const toAdd = tmpl.tasks.filter(x => !existing.has(x.title));
        if (!toAdd.length) { toast('Tasks already present'); return; }

        try {
          const created = await Promise.all(toAdd.map(t => tasksApi.add({
            hackathon_id: hId,
            title: t.title,
            priority: t.priority,
            done: false
          })));
          state.cache.tasks[hId].push(...created);
          closeModal();
          render();
          toast(`Added ${created.length} tasks from ${tmpl.name}`);
        } catch (err: any) {
          toast('Failed: ' + err.message);
        }
      });
    });
  });

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
      <div class="field">
        <label>Status</label>
        <select id="e-h-status">
          ${STATUS_COLUMNS.map(c => `<option value="${c.key}" ${c.key === h.status ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
      </div>
      <div class="field-row">
        <div class="field"><label>Start Date</label><input type="date" id="e-h-start" value="${h.start_date || ''}"></div>
        <div class="field"><label>End Date</label><input type="date" id="e-h-end" value="${h.end_date || ''}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Timezone</label><input id="e-h-tz" value="${h.timezone || ''}" placeholder="e.g. IST, UTC-5"></div>
        <div class="field"><label>Team Size Limit</label><input type="number" min="1" id="e-h-team-limit" value="${h.team_size_limit ?? ''}"></div>
      </div>
      <div class="field"><label>Devpost / Website Link</label><input id="e-h-link" value="${h.website_link || ''}" placeholder="https://..."></div>
      <div class="field"><label>Prize Tracks (comma separated)</label><input id="e-h-tracks" value="${h.prize_tracks.join(', ')}"></div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="save-hack-btn">Save</button>
      </div>
    `);

    document.getElementById('save-hack-btn')?.addEventListener('click', async () => {
      const name = (document.getElementById('e-h-name') as HTMLInputElement).value;
      const description = (document.getElementById('e-h-desc') as HTMLTextAreaElement).value;
      const tags = (document.getElementById('e-h-tags') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(t => t);
      const status = (document.getElementById('e-h-status') as HTMLSelectElement).value as HackathonStatus;
      const start_date = (document.getElementById('e-h-start') as HTMLInputElement).value || null;
      const end_date = (document.getElementById('e-h-end') as HTMLInputElement).value || null;
      const timezone = (document.getElementById('e-h-tz') as HTMLInputElement).value;
      const teamLimitRaw = (document.getElementById('e-h-team-limit') as HTMLInputElement).value;
      const team_size_limit = teamLimitRaw ? parseInt(teamLimitRaw, 10) : null;
      const website_link = (document.getElementById('e-h-link') as HTMLInputElement).value;
      const prize_tracks = (document.getElementById('e-h-tracks') as HTMLInputElement).value.split(',').map(t => t.trim()).filter(t => t);
      try {
        const updated = await hackathonApi.update(h.id, { name, description, tags, status, start_date, end_date, timezone, team_size_limit, website_link, prize_tracks });
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

  // Deletions
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

  // Check URL params for auto-import (e.g. from bookmarklet)
  const urlParams = new URLSearchParams(window.location.search);
  const autoImportUrl = urlParams.get('auto_import');
  if (autoImportUrl && state.user) {
    window.history.replaceState({}, document.title, window.location.pathname);
    showModal(renderSmartImportModal());
    setupImportModalListeners(render);
    const input = document.getElementById('smart-input') as HTMLTextAreaElement;
    if (input) {
      input.value = autoImportUrl;
      document.getElementById('run-smart-extract')?.click();
    }
  }
}
