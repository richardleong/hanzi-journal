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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
    try {
      const res = await fetch(`${API_URL}/api/words`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        console.warn('API fetch failed:', res.statusText);
        return getLocalWords();
      }
      const words = await res.json();
      // Cache to localStorage for offline fallback
      saveLocalWords(words);
      return words;
    } catch (error) {
      console.warn('API error, using localStorage:', error);
      return getLocalWords();
    }
  },

  async addWord(word: Omit<Word, 'id' | 'created_at' | 'mastered'>): Promise<Word | null> {
    try {
      const res = await fetch(`${API_URL}/api/words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(word),
      });
      if (!res.ok) {
        console.warn('API add failed:', res.statusText);
        return null;
      }
      const newWord = await res.json();
      // Update local cache
      const words = getLocalWords();
      words.push(newWord);
      saveLocalWords(words);
      return newWord;
    } catch (error) {
      console.warn('API error:', error);
      return null;
    }
  },

  async updateWord(id: string, updates: Partial<Word>): Promise<Word | null> {
    try {
      const res = await fetch(`${API_URL}/api/words/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        console.warn('API update failed:', res.statusText);
        return null;
      }
      const updated = await res.json();
      // Update local cache
      const words = getLocalWords();
      const index = words.findIndex((w) => w.id === id);
      if (index !== -1) {
        words[index] = updated;
        saveLocalWords(words);
      }
      return updated;
    } catch (error) {
      console.warn('API error:', error);
      return null;
    }
  },

  async deleteWord(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/words/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        console.warn('API delete failed:', res.statusText);
        return false;
      }
      // Update local cache
      let words = getLocalWords();
      const initialLength = words.length;
      words = words.filter((w) => w.id !== id);
      saveLocalWords(words);
      return words.length < initialLength;
    } catch (error) {
      console.warn('API error:', error);
      return false;
    }
  }
};
