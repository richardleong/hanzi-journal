export const toneMap: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/**
 * Converts numeric pinyin (e.g., "hao3") to marked pinyin (e.g., "hǎo").
 * Applies standard Hanyu Pinyin tone placement rules.
 */
export function convertToPinyin(text: string): string {
  // Replace v with ü if there are no tone marks involved, or let the tone regex handle it.
  // Actually, we should handle syllables one by one.
  
  // A regex to match a pinyin syllable ending in a number 1-5.
  // E.g., zhuang1, nü3, lv4, hao3
  const syllableRegex = /([a-zA-ZüÜ]+)([1-5])/g;

  return text.replace(syllableRegex, (match, pinyin, toneStr) => {
    let tone = parseInt(toneStr, 10);
    // Tone 5 is neutral, same as tone 0 or no tone.
    if (tone < 1 || tone > 4) tone = 0;

    pinyin = pinyin.toLowerCase();
    pinyin = pinyin.replace(/v/g, 'ü');

    if (tone === 0) return pinyin;

    // Determine which vowel gets the tone mark.
    let targetVowel = '';

    if (pinyin.includes('a')) {
      targetVowel = 'a';
    } else if (pinyin.includes('e')) {
      targetVowel = 'e';
    } else if (pinyin.includes('ou')) {
      targetVowel = 'o';
    } else {
      // Find the last vowel
      const vowels = pinyin.match(/[aeiouü]/g);
      if (vowels && vowels.length > 0) {
        targetVowel = vowels[vowels.length - 1];
      }
    }

    if (targetVowel) {
      const markedVowel = toneMap[targetVowel][tone];
      // Replace the last occurrence of the target vowel to handle cases correctly,
      // though typically the target vowel only appears once per syllable anyway.
      return pinyin.replace(targetVowel, markedVowel);
    }

    return pinyin;
  });
}

// Build reverse map: toned char → [base vowel, tone number]
const toneReverse = new Map<string, [string, number]>();
for (const [base, variants] of Object.entries(toneMap)) {
  const normalBase = base === 'v' ? 'ü' : base;
  for (let tone = 0; tone <= 4; tone++) {
    if (variants[tone] && variants[tone] !== normalBase) {
      toneReverse.set(variants[tone], [normalBase, tone]);
    }
  }
}

/**
 * Converts toned pinyin (e.g. "shǔ") into a sort key (e.g. "shu3")
 * so that same-base syllables sort by tone: 1st → 2nd → 3rd → 4th → neutral.
 */
export function pinyinSortKey(pinyin: string): string {
  let result = '';
  for (const char of pinyin) {
    const entry = toneReverse.get(char);
    if (entry) {
      result += entry[0] + entry[1];
    } else {
      result += char;
    }
  }
  return result.toLowerCase();
}
