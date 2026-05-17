import { createClient } from '@supabase/supabase-js';

export interface Word {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  category: string;
  example: string;
  register?: string;
  context?: string[];
  mastered: boolean;
  created_at: string;
}

export const REGISTER_OPTIONS = ['Neutral', 'Formal', 'Informal', 'Slang', 'Vulgar'] as const;
export const CONTEXT_OPTIONS = [
  'Spoken everyday',
  'Texting',
  'Workplace',
  'News / Media',
  'Textbook',
  'Storybook',
  'Singlish mix',
] as const;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const useSupabase = Boolean(supabaseUrl && supabaseKey);
const supabase = useSupabase ? createClient(supabaseUrl, supabaseKey) : null;

const LOCAL_STORAGE_KEY = 'hanzibon_words';

/**
 * Helper to get local storage words. Only runs on client.
 */
function getLocalWords(): Word[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading from localStorage', e);
    return [];
  }
}

/**
 * Helper to save to local storage.
 */
function saveLocalWords(words: Word[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(words));
  } catch (e) {
    console.error('Error writing to localStorage', e);
  }
}

export const storage = {
  async getWords(): Promise<Word[]> {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Supabase fetch failed:', error.message);
        return [];
      }
      return (data as Word[]) || [];
    } else {
      return getLocalWords().sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  },

  async addWord(word: Omit<Word, 'id' | 'created_at' | 'mastered'>): Promise<Word | null> {
    const newWord: Word = {
      ...word,
      id: crypto.randomUUID(),
      mastered: false,
      created_at: new Date().toISOString(),
    };

    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('words')
        .insert([newWord])
        .select()
        .single();
      
      if (error) {
        // If it failed because of missing columns, retry without register/context
        const { register: _r, context: _c, ...coreWord } = newWord;
        const { data: retryData, error: retryError } = await supabase
          .from('words')
          .insert([coreWord])
          .select()
          .single();
        
        if (retryError) {
          console.warn('Supabase insert failed:', retryError.message);
          return null;
        }
        console.info('Saved without register/context — run ALTER TABLE to add those columns.');
        return retryData as Word;
      }
      return data as Word;
    } else {
      const words = getLocalWords();
      words.push(newWord);
      saveLocalWords(words);
      return newWord;
    }
  },

  async updateWord(id: string, updates: Partial<Word>): Promise<Word | null> {
    if (useSupabase && supabase) {
      const { data, error } = await supabase
        .from('words')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.warn('Supabase update failed:', error.message);
        return null;
      }
      return data as Word;
    } else {
      const words = getLocalWords();
      const index = words.findIndex((w) => w.id === id);
      if (index === -1) return null;
      
      words[index] = { ...words[index], ...updates };
      saveLocalWords(words);
      return words[index];
    }
  },

  async deleteWord(id: string): Promise<boolean> {
    if (useSupabase && supabase) {
      const { error } = await supabase.from('words').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete failed:', error.message);
        return false;
      }
      return true;
    } else {
      let words = getLocalWords();
      const initialLength = words.length;
      words = words.filter((w) => w.id !== id);
      saveLocalWords(words);
      return words.length < initialLength;
    }
  }
};
