/**
 * ScoreManager encapsulates scoring rules for Pencilly.
 * 
 * Rules:
 * - Guesser base score: 100 points
 * - Guesser time bonus: Math.round(150 * remainingSeconds / drawTime)
 * - Guesser first-to-guess bonus: 40 points
 * - Drawer reward: 45 points per correct guesser
 */
export class ScoreManager {
  static readonly BASE_GUESS_POINTS = 100;
  static readonly MAX_TIME_BONUS = 150;
  static readonly FIRST_GUESS_BONUS = 40;
  static readonly DRAWER_BONUS_PER_GUESSER = 45;

  /**
   * Calculates points awarded to a player for guessing correctly.
   */
  static calculateGuesserScore(
    remainingSeconds: number,
    drawTime: number,
    isFirst: boolean
  ): number {
    const safeRemaining = Math.max(0, remainingSeconds);
    const safeDrawTime = Math.max(1, drawTime);
    const timeFraction = Math.min(1, safeRemaining / safeDrawTime);
    const timeBonus = Math.round(this.MAX_TIME_BONUS * timeFraction);
    const firstBonus = isFirst ? this.FIRST_GUESS_BONUS : 0;
    return this.BASE_GUESS_POINTS + timeBonus + firstBonus;
  }

  /**
   * Returns points awarded to the drawer when a guesser is correct.
   */
  static getDrawerBonus(): number {
    return this.DRAWER_BONUS_PER_GUESSER;
  }
}
