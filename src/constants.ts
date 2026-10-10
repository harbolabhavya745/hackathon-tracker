import { HackathonStatus } from './types';

export const STATUS_COLUMNS: { key: HackathonStatus; label: string }[] = [
  { key: 'bookmarked', label: 'Bookmarked' },
  { key: 'applied', label: 'Applied' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'hacking', label: 'Currently Hacking' },
  { key: 'completed', label: 'Completed' },
];

export const SUBMISSION_CHECKLIST_ITEMS = [
  'Record 2-min demo video',
  'Update README with setup instructions',
  'Add screenshots/GIFs to README',
  'Push final commit',
  'Double check all team members are listed',
  'Verify demo video link works',
  'Submit on Devpost',
];
