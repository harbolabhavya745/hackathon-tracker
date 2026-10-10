import { Hackathon, Registration, TeamMember, DateItem, Task } from './types';
import { hackathonApi, teamApi, datesApi, tasksApi, registrationApi } from './api/hackathons';
import { toast } from './utils/ui';

export interface AppState {
  user: any;
  hackathons: Hackathon[];
  currentHackathonId: string | null;
  currentView: string;
  boardHidePast: boolean;
  cache: {
    members: Record<string, TeamMember[]>;
    dates: Record<string, DateItem[]>;
    tasks: Record<string, Task[]>;
    regs: Record<string, Registration>;
  };
}

export const state: AppState = {
  user: null,
  hackathons: [],
  currentHackathonId: null,
  currentView: 'board',
  boardHidePast: true,
  cache: {
    members: {},
    dates: {},
    tasks: {},
    regs: {},
  }
};

export async function loadData() {
  try {
    const hs = await hackathonApi.getAll();
    state.hackathons = hs;
    if (hs.length > 0 && !state.currentHackathonId) {
      state.currentHackathonId = hs[0].id;
    }

    // Prefetch dates for every hackathon (not just the open one) so the Board
    // can show each card's real nearest deadline instead of just start/end date.
    await Promise.all(hs.map(async h => {
      if (!state.cache.dates[h.id]) {
        state.cache.dates[h.id] = await datesApi.getByHackathon(h.id);
      }
    }));

    if (state.currentHackathonId) {
      await loadHackathonDetails(state.currentHackathonId);
    }
  } catch (e: any) {
    toast('Error loading data: ' + e.message);
    throw e;
  }
}

export async function loadHackathonDetails(id: string) {
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

// Returns whole-day difference between the date and today (can be negative for past dates)
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// A deadline is "urgent" when it's a deadline-type date landing today or within the next 3 days
export function isUrgentDeadline(d: DateItem): boolean {
  if (d.type !== 'deadline') return false;
  const diff = daysUntil(d.date);
  return diff >= 0 && diff <= 3;
}

// Returns the latest / final date for a hackathon (end_date, or highest milestone date)
export function getFinalDate(h: Hackathon, dates: DateItem[] = []): string | null {
  const allDates: string[] = [];
  if (h.end_date) allDates.push(h.end_date);
  if (h.start_date) allDates.push(h.start_date);
  dates.forEach(d => {
    if (d.date) allDates.push(d.date);
  });
  if (!allDates.length) return null;
  allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return allDates[0];
}

// Checks whether the hackathon has passed its final deadline / end date
export function isPastFinal(h: Hackathon, dates?: DateItem[]): boolean {
  const ds = dates || state.cache.dates[h.id] || [];
  const finalDate = getFinalDate(h, ds);
  if (!finalDate) return false;
  return daysUntil(finalDate) < 0;
}

// Returns the nearest upcoming deadline/date that hasn't passed yet
export function getNearestUpcomingDeadline(h: Hackathon, dates?: DateItem[]): DateItem | null {
  const ds = dates || state.cache.dates[h.id] || [];
  const upcoming = ds
    .filter(d => daysUntil(d.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] || null;
}

// The exact submission deadline for the panic timer: the soonest upcoming
// deadline-type entry in the Dates tab, falling back to the hackathon's end date.
export function getSubmissionDeadline(h: Hackathon, dates: DateItem[] = []): { label: string; date: Date } | null {
  const upcomingDeadlines = dates
    .filter(d => d.type === 'deadline' && daysUntil(d.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (upcomingDeadlines.length) {
    return { label: upcomingDeadlines[0].label, date: new Date(upcomingDeadlines[0].date) };
  }
  if (h.end_date && daysUntil(h.end_date) >= 0) {
    return { label: 'Submission deadline', date: new Date(h.end_date) };
  }
  return null;
}

