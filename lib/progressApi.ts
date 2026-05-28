import { supabase } from './supabaseClient';
import { WordProgress } from '../types';

interface ProgressData {
  currentLessonId: string | null;
  currentItemIndex: number;
  progress: Record<string, WordProgress>;
}

export async function fetchProgress(): Promise<ProgressData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_progress')
    .select('data')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return null;
  return data.data as ProgressData;
}

export async function saveProgress(data: ProgressData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('user_progress').upsert({
    user_id: user.id,
    data,
    updated_at: new Date().toISOString(),
  });
}
