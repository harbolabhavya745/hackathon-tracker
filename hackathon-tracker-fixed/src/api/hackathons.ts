import { supabase } from './supabase';
import { Hackathon, Registration, TeamMember, DateItem, Task } from '../types';

export const hackathonApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('hackathons')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as Hackathon[];
  },

  async create(hackathon: Partial<Hackathon>) {
    const { data, error } = await supabase
      .from('hackathons')
      .insert(hackathon)
      .select()
      .single();
    if (error) throw error;
    return data as Hackathon;
  },

  async update(id: string, updates: Partial<Hackathon>) {
    const { data, error } = await supabase
      .from('hackathons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Hackathon;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('hackathons')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const registrationApi = {
  async getByHackathon(hackathonId: string) {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('hackathon_id', hackathonId)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data as Registration | null;
  },

  async upsert(registration: Partial<Registration>) {
    const { data, error } = await supabase
      .from('registrations')
      .upsert(registration)
      .select()
      .single();
    if (error) throw error;
    return data as Registration;
  }
};

export const teamApi = {
  async getByHackathon(hackathonId: string) {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('hackathon_id', hackathonId);
    if (error) throw error;
    return data as TeamMember[];
  },

  async add(member: Partial<TeamMember>) {
    const { data, error } = await supabase
      .from('team_members')
      .insert(member)
      .select()
      .single();
    if (error) throw error;
    return data as TeamMember;
  },

  async update(id: string, updates: Partial<TeamMember>) {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as TeamMember;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const datesApi = {
  async getByHackathon(hackathonId: string) {
    const { data, error } = await supabase
      .from('dates')
      .select('*')
      .eq('hackathon_id', hackathonId)
      .order('date', { ascending: true });
    if (error) throw error;
    return data as DateItem[];
  },

  async add(date: Partial<DateItem>) {
    const { data, error } = await supabase
      .from('dates')
      .insert(date)
      .select()
      .single();
    if (error) throw error;
    return data as DateItem;
  },

  async update(id: string, updates: Partial<DateItem>) {
    const { data, error } = await supabase
      .from('dates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as DateItem;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('dates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export const tasksApi = {
  async getByHackathon(hackathonId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('hackathon_id', hackathonId);
    if (error) throw error;
    return data as Task[];
  },

  async add(task: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();
    if (error) throw error;
    return data as Task;
  },

  async update(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Task;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
