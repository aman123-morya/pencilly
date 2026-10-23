import crypto from 'node:crypto';
import { chooseWords } from '../words.js';
import type { Language, WordCategory, WordMode } from '../types.js';

export class WordManager {
  static getWordOptions(
    mode: WordMode,
    count: number,
    usedWords: Set<string>,
    category: WordCategory = 'all',
    language: Language = 'en'
  ): string[] {
    const safeCount = Math.max(1, Math.min(5, count));
    if (mode === 'combination') {
      return Array.from({ length: safeCount }, () => {
        const pair = chooseWords(2, usedWords, category, language);
        return pair.join(' ');
      });
    }
    return chooseWords(safeCount, usedWords, category, language);
  }

  static createWordMask(word: string, revealedIndices: Set<number>): string {
    if (!word) return '';
    return [...word]
      .map((letter, index) => {
        if (letter === ' ' || letter === '-' || revealedIndices.has(index)) {
          return letter;
        }
        return '_';
      })
      .join(' ');
  }

  static calculateWantedHints(
    hintsConfig: number,
    drawTime: number,
    remainingSeconds: number,
    word: string,
    mode: WordMode
  ): number {
    if (mode === 'hidden' || hintsConfig <= 0) return 0;
    const letterCount = word.replace(/[^\p{L}]/gu, '').length;
    const maxPossibleHints = Math.min(hintsConfig, Math.max(0, letterCount - 1));
    if (maxPossibleHints <= 0) return 0;

    const revealStep = drawTime / (maxPossibleHints + 1);
    const elapsed = Math.max(0, drawTime - remainingSeconds);
    return Math.min(maxPossibleHints, Math.floor(elapsed / revealStep));
  }

  static revealNextHint(word: string, revealedIndices: Set<number>): number | null {
    if (!word) return null;
    const unrevealedIndices: number[] = [];
    for (let i = 0; i < word.length; i++) {
      if (/[\p{L}]/u.test(word[i]) && !revealedIndices.has(i)) {
        unrevealedIndices.push(i);
      }
    }

    if (unrevealedIndices.length === 0) {
      return null;
    }

    const randomIndex = crypto.randomInt(unrevealedIndices.length);
    const selectedCharIndex = unrevealedIndices[randomIndex];
    revealedIndices.add(selectedCharIndex);
    return selectedCharIndex;
  }

  static normalize(value: string): string {
    return (value || '')
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  static isMatch(guess: string, target: string): boolean {
    return this.normalize(guess) === this.normalize(target);
  }
}
