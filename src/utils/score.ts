/**
 * スコア用正確率を計算する
 * 正確率 = KPM / (KPM + ミスタイプ数 - 連続ミス数)
 * @param kpm 1分あたりのキー入力数 (Keys Per Minute)
 * @param mistypeCount ミスタイプ数
 * @param continuousMistypeCount 連続ミスタイプ数
 * @returns 0-1 のfraction (パーセント表記する場合は *100)
 */
export function calculateAccuracy(kpm: number, mistypeCount: number, continuousMistypeCount: number): number {
  const denominator = kpm + mistypeCount - continuousMistypeCount;
  if (denominator <= 0) {
    return 0;
  }
  return kpm / denominator;
}

/**
 * スコア計算の共通関数
 * スコア = 文字数 * (スコア用正確率)^5 * 2
 * スコア用正確率は 0-1 のfractionとして扱う
 * @param charCount 文字数
 * @param kpm 1分あたりのキー入力数 (Keys Per Minute)
 * @param mistypeCount ミスタイプ数
 * @param continuousMistypeCount 連続ミスタイプ数
 * @returns 計算されたスコア
 */
export function calculateScore(charCount: number, kpm: number, mistypeCount: number, continuousMistypeCount: number): number {
  const accuracy = calculateAccuracy(kpm, mistypeCount, continuousMistypeCount);
  return Math.round(charCount * accuracy ** 5 * 2);
}
