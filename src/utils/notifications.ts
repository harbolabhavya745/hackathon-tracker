import { Hackathon } from '../types';
import { state, isUrgentDeadline, daysUntil } from '../state';

let notificationPermissionRequested = false;

export async function notifyUrgentDeadlines(h?: Hackathon) {
  if (!h) return;
  if (!('Notification' in window)) return; // unsupported browser, fail silently

  const dates = state.cache.dates[h.id] || [];
  const urgent = dates.filter(isUrgentDeadline);
  if (!urgent.length) return;

  if (Notification.permission === 'default' && !notificationPermissionRequested) {
    notificationPermissionRequested = true;
    try {
      await Notification.requestPermission();
    } catch {
      return;
    }
  }
  if (Notification.permission !== 'granted') return;

  urgent.forEach(d => {
    const diff = daysUntil(d.date);
    // One notification per date per urgency level, so it doesn't re-fire on every render
    // or repeatedly for the same day, but does re-notify as it gets more urgent.
    const seenKey = `ht-notified:\${d.id}:\${diff}`;
    if (localStorage.getItem(seenKey)) return;

    const when = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`;
    try {
      new Notification(`Deadline: ${d.label}`, {
        body: `${h.name} — due ${when} (${d.date})`,
        tag: seenKey,
      });
      localStorage.setItem(seenKey, '1');
    } catch (e) {
      console.error('Notification error:', e);
    }
  });
}
