import './styles/main.css';
import { authApi } from './api/auth';
import { supabase, isSupabaseConfigured } from './api/supabase';
import { renderAuth } from './components/Auth';
import { state, loadData, loadHackathonDetails } from './state';
import { notifyUrgentDeadlines } from './utils/notifications';
import { setupPanicTimer } from './utils/panic';
import { setupEventListeners } from './events';
import { renderLayout } from './views/layout';

const appContainer = document.getElementById('app')!;
let activeChannel: any = null;

function render() {
  try {
    if (!state.user) {
      renderAuth(appContainer);
      return;
    }

    const h = state.hackathons.find(x => x.id === state.currentHackathonId);
    notifyUrgentDeadlines(h);

    appContainer.innerHTML = renderLayout();

    setupEventListeners(render, activeChannel);
    setupPanicTimer();
  } catch (err: any) {
    console.error('Render error:', err);
    appContainer.innerHTML = `
      <div id="config-screen">
        <div class="config-badge" style="background:var(--danger-bg);color:var(--danger-text)">Application Error</div>
        <h2>Unable to Render Dashboard</h2>
        <p style="color:var(--danger-text);font-family:monospace;font-size:12px;">${err.message || String(err)}</p>
        <div style="margin-top:16px;">
          <button class="btn btn-primary" onclick="localStorage.clear();window.location.reload();">Reset Session & Reload</button>
        </div>
      </div>
    `;
  }
}

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

async function recoverFromBadSession() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('sb-'))
    .forEach(k => localStorage.removeItem(k));
  try {
    await authApi.signOut();
  } catch {
    // Ignore error
  }
  state.user = null;
}

async function init() {
  if (!isSupabaseConfigured()) {
    appContainer.innerHTML = `
      <div id="config-screen">
        <div class="config-badge" style="background:var(--warn-bg);color:var(--warn-text)">Database Connection</div>
        <h2>Connect Supabase</h2>
        <p>Enter your Supabase credentials to sync your hackathons.</p>
        <div class="field">
          <label>Supabase Project URL</label>
          <input id="cfg-sb-url" value="${localStorage.getItem('supabase_url') || 'https://ausayxftqpvsdfwgunvc.supabase.co'}" placeholder="https://xyz.supabase.co">
        </div>
        <div class="field">
          <label>Supabase Anon Key</label>
          <input type="password" id="cfg-sb-key" value="${localStorage.getItem('supabase_anon_key') || ''}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...">
          <div style="font-size:11px;color:var(--text-3);margin-top:4px;">
            Found in your <a href="https://supabase.com/dashboard/project/ausayxftqpvsdfwgunvc/settings/api" target="_blank" style="color:var(--accent);">Supabase Project API Settings</a> (the <code>anon</code> <code>public</code> key).
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:8px;">
          <button class="btn btn-primary" id="btn-save-sb-cfg" style="flex:1;">Save & Connect</button>
        </div>
      </div>
    `;

    document.getElementById('btn-save-sb-cfg')?.addEventListener('click', () => {
      const url = (document.getElementById('cfg-sb-url') as HTMLInputElement)?.value.trim();
      const key = (document.getElementById('cfg-sb-key') as HTMLInputElement)?.value.trim();
      if (!url || !key) {
        alert('Please provide both Supabase URL and Anon Key.');
        return;
      }
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_anon_key', key);
      window.location.reload();
    });
    return;
  }

  // Fail-safe: Force render if stuck
  const renderTimeout = setTimeout(() => {
    if (appContainer.innerHTML === '') render();
  }, 5000);

  // 1. Listen for auth changes
  authApi.onAuthStateChange(async (_event, session) => {
    clearTimeout(renderTimeout);
    try {
      state.user = session?.user || null;
      if (state.user) {
        await loadData();
        setupSubscriptions();
      } else {
        if (activeChannel) {
          activeChannel.unsubscribe();
          activeChannel = null;
        }
      }
    } catch (e) {
      console.error('Auth state change error:', e);
      await recoverFromBadSession();
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
  } catch (e: any) {
    console.error('Session error:', e);
    // A stale/invalid refresh token (e.g. left over from a deleted or recreated
    // Supabase project) can make getSession() throw instead of just returning null.
    // Clear it out so the user lands on the login screen instead of a blank page.
    await recoverFromBadSession();
    state.user = null;
  } finally {
    clearTimeout(renderTimeout);
    render();
  }
}

init();
