export interface Hackathon {
  id: string;
  user_id: string;
  name: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  hackathon_id: string;
  status: 'not_started' | 'pending' | 'registered' | 'cancelled';
  team_name: string;
  track: string;
  ref_id: string;
  link: string;
  notes: string;
}

export interface TeamMember {
  id: string;
  hackathon_id: string;
  name: string;
  role: string;
  email: string;
  created_at: string;
}

export interface DateItem {
  id: string;
  hackathon_id: string;
  label: string;
  date: string;
  type: 'event' | 'deadline' | 'milestone' | 'info';
  created_at: string;
}

export interface Task {
  id: string;
  hackathon_id: string;
  title: string;
  done: boolean;
  assigned_to: string;
  priority: 'high' | 'med' | 'low';
  created_at: string;
}
