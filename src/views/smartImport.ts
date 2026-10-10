import { HACKATHON_TEMPLATES } from '../utils/templates';

export function renderSmartImportModal(): string {
  const savedKey = localStorage.getItem('gemini_api_key') || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  if (savedKey && !localStorage.getItem('gemini_api_key')) {
    localStorage.setItem('gemini_api_key', savedKey);
  }

  return `
    <div style="min-width:320px;max-width:680px;width:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <h3 style="margin:0;font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px;">
          <i class="ti ti-sparkles" style="color:var(--accent)"></i> Auto-Track / Import Hackathon
        </h3>
        <button class="btn-ghost btn btn-sm" onclick="closeModal()"><i class="ti ti-x"></i></button>
      </div>

      <div class="import-tabs">
        <button class="import-tab active" data-tab="tab-smart"><i class="ti ti-wand"></i> AI & Text Extractor</button>
        <button class="import-tab" data-tab="tab-templates"><i class="ti ti-template"></i> Pre-built Templates</button>
        <button class="import-tab" data-tab="tab-raw"><i class="ti ti-code"></i> Bulk JSON</button>
      </div>

      <!-- Tab 1: Smart Extractor (URL / Text) -->
      <div class="import-pane active" id="tab-smart">
        <div style="background:var(--teal-bg);color:var(--teal-text);padding:10px 12px;border-radius:var(--r-sm);font-size:12px;margin-bottom:12px;line-height:1.4;">
          <strong><i class="ti ti-sparkles"></i> Instant AI Extraction:</strong> Copy the announcement text or details section from Unstop, Devpost, Discord, or Email, then click <em>Paste from Clipboard</em> below.
        </div>

        <div class="field">
          <label style="font-weight:500;">Hackathon Description Text or Direct URL</label>
          <textarea id="smart-input" style="width:100%;min-height:110px;font-size:13px;" placeholder="Paste hackathon details text or announcement here..."></textarea>
        </div>

        <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
          <button class="btn btn-primary" id="run-smart-extract"><i class="ti ti-sparkles"></i> Extract & Preview</button>
          <button class="btn" id="paste-clipboard-btn"><i class="ti ti-clipboard"></i> Paste from Clipboard</button>
          <button class="btn btn-ghost" id="clear-smart-input">Clear</button>
          
          <button class="btn btn-sm btn-ghost" id="toggle-ai-key-btn" style="margin-left:auto;color:var(--accent);">
            <i class="ti ti-key"></i> ${savedKey ? '<span class="badge b-green"><i class="ti ti-sparkles"></i> Gemini AI Active</span>' : 'Add Gemini AI Key'}
          </button>
        </div>

        <!-- AI Key Settings (Collapsible) -->
        <div id="ai-key-container" style="display:none;background:var(--bg-2);border:0.5px solid var(--border);border-radius:var(--r-sm);padding:10px;margin-bottom:12px;">
          <div style="font-size:11.5px;color:var(--text-2);margin-bottom:6px;">
            Enter a free <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent);">Google Gemini API Key</a> for 100% accurate AI extraction on any webpage, PDF, or text:
          </div>
          <div style="display:flex;gap:6px;">
            <input type="password" id="gemini-api-key-input" value="${savedKey}" placeholder="AIzaSy..." style="font-size:12px;padding:5px 8px;flex:1;">
            <button class="btn btn-sm btn-primary" id="save-gemini-key-btn">Save</button>
          </div>
        </div>

        <!-- Extraction Preview Container -->
        <div id="smart-preview-container" style="display:none;background:var(--bg-2);border:0.5px solid var(--border-md);border-radius:var(--r-md);padding:14px;margin-top:12px;">
          <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:var(--accent);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <i class="ti ti-check"></i> Extracted Hackathon Plan
          </div>
          
          <div class="field"><label>Hackathon Name</label><input id="prev-name" style="font-weight:600;"></div>
          <div class="field"><label>Description</label><textarea id="prev-desc" style="min-height:50px;"></textarea></div>
          
          <div class="field-row">
            <div class="field"><label>Start Date</label><input type="date" id="prev-start"></div>
            <div class="field"><label>End / Submission Date</label><input type="date" id="prev-end"></div>
          </div>

          <div class="field-row">
            <div class="field"><label>Timezone</label><input id="prev-tz"></div>
            <div class="field"><label>Team Size Limit</label><input type="number" id="prev-limit"></div>
          </div>

          <div class="field"><label>Prize Tracks / Categories (comma separated)</label><input id="prev-tracks"></div>
          <div class="field"><label>Website Link</label><input id="prev-link"></div>

          <div style="margin-top:12px;border-top:0.5px solid var(--border);padding-top:10px;">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-2);margin-bottom:6px;">Detected Milestones & Checklist:</div>
            <div id="prev-dates-tasks" style="font-size:12px;color:var(--text-2);max-height:120px;overflow-y:auto;"></div>
          </div>

          <div class="modal-footer" style="margin-top:12px;">
            <button class="btn" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" id="confirm-smart-import"><i class="ti ti-plus"></i> Create & Track Now</button>
          </div>
        </div>
      </div>

      <!-- Tab 2: Workflow Templates -->
      <div class="import-pane" id="tab-templates">
        <p style="font-size:12.5px;color:var(--text-2);margin-bottom:12px;">
          Select a pre-built workflow preset to auto-generate standard hackathon stages, milestone dates, and submission checklists.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${HACKATHON_TEMPLATES.map(t => `
            <div class="template-card" style="background:var(--bg-2);border:0.5px solid var(--border);border-radius:var(--r-md);padding:12px;cursor:pointer;transition:border .15s;display:flex;flex-direction:column;justify-content:space-between;" data-template-id="${t.id}">
              <div>
                <div style="font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                  <i class="ti ${t.icon}" style="color:var(--accent)"></i> ${t.name}
                </div>
                <div style="font-size:11.5px;color:var(--text-2);margin-bottom:8px;line-height:1.4;">${t.description}</div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
                  ${t.tags.map(tag => `<span class="badge b-gray" style="font-size:10px;">${tag}</span>`).join('')}
                </div>
              </div>
              <button class="btn btn-sm btn-primary apply-template-btn" data-template-id="${t.id}" style="width:100%;justify-content:center;">
                Use This Template
              </button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Tab 3: Bulk JSON -->
      <div class="import-pane" id="tab-raw">
        <p style="font-size:12px;color:var(--text-2);margin-bottom:8px;">Paste a JSON array of hackathons.</p>
        <textarea id="import-json" style="width:100%;height:140px;font-family:monospace;font-size:11.5px;" placeholder='[{"name":"HackX","description":"...","tags":["AI"],"dates":[{"label":"Kickoff","date":"2026-10-01"}]}]'></textarea>
        <div class="modal-footer" style="margin-top:10px;">
          <button class="btn" onclick="closeModal()">Cancel</button>
          <button class="btn btn-primary" id="run-import">Import JSON</button>
        </div>
      </div>
    </div>
  `;
}

