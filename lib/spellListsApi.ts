import { supabase } from './supabaseClient';
import { Lesson } from '../types';

interface SpellingListRow {
  id: string;
  user_id: string;
  title: string;
  content: Lesson;
  created_at: string;
}

function rowToLesson(row: SpellingListRow): Lesson {
  return {
    ...(row.content as Lesson),
    id: row.id, // always use the DB UUID as the lesson ID
  };
}

export async function fetchSpellingLists(): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('spelling_lists')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToLesson(row as SpellingListRow));
}

export async function createSpellingList(lesson: Lesson, userId: string): Promise<Lesson> {
  const { data, error } = await supabase
    .from('spelling_lists')
    .insert({ user_id: userId, title: lesson.label, content: lesson })
    .select()
    .single();

  if (error) throw error;
  return rowToLesson(data as SpellingListRow);
}

export async function deleteSpellingList(id: string): Promise<void> {
  const { error } = await supabase
    .from('spelling_lists')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
