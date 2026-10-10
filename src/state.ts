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

// Returns all dates for a hackathon (combining custom milestones with start_date & end_date)
export function getAllHackathonDates(h: Hackathon): DateItem[] {
  const dates = [...(state.cache.dates[h.id] || [])];
  if (h.start_date && !dates.some(d => d.date === h.start_date)) {
    dates.push({
      id: `virtual-start-${h.id}`,
      hackathon_id: h.id,
      label: 'Hackathon Starts',
      date: h.start_date,
      type: 'event',
      created_at: h.created_at
    });
  }
  if (h.end_date && !dates.some(d => d.date === h.end_date)) {
    dates.push({
      id: `virtual-end-${h.id}`,
      hackathon_id: h.id,
      label: 'Final Submission Deadline',
      date: h.end_date,
      type: 'deadline',
      created_at: h.created_at
    });
  }
  return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// A deadline is "urgent" when it's a deadline-type date landing today or within the next 3 days
export function isUrgentDeadline(d: DateItem): boolean {
  if (d.type !== 'deadline') return false;
  const diff = daysUntil(d.date);
  return diff >= 0 && diff <= 3;
}

// Returns the latest / final date for a hackathon (end_date, or highest milestone date)
export function getFinalDate(h: Hackathon): string | null {
  const allDates = getAllHackathonDates(h);
  if (!allDates.length) return null;
  allDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return allDates[0].date;
}

// Checks whether the hackathon has passed its final deadline / end date
export function isPastFinal(h: Hackathon): boolean {
  const finalDate = getFinalDate(h);
  if (!finalDate) return false;
  return daysUntil(finalDate) < 0;
}

// Returns the nearest upcoming deadline/date that hasn't passed yet
export function getNearestUpcomingDeadline(h: Hackathon): DateItem | null {
  const allDates = getAllHackathonDates(h);
  const upcoming = allDates
    .filter(d => daysUntil(d.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] || null;
}

// The exact submission deadline for the panic timer: the soonest upcoming
// deadline-type entry in the Dates tab, falling back to the hackathon's end date.
export function getSubmissionDeadline(h: Hackathon): { label: string; date: Date } | null {
  const allDates = getAllHackathonDates(h);
  const upcomingDeadlines = allDates
    .filter(d => d.type === 'deadline' && daysUntil(d.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (upcomingDeadlines.length) {
    return { label: upcomingDeadlines[0].label, date: new Date(upcomingDeadlines[0].date) };
  }
  return null;
}



