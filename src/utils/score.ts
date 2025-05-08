/**
 * スコア計算の共通関数
 * @param speed タイピング速度 (文字数/分)
 * @param accuracy 正確率 (0-1の範囲)
 * @param mistypeCount ミスタイプ数 (オプション)
 * @returns 計算されたスコア
 */
export function calculateScore(speed: number, accuracy: number, mistypeCount?: number): number {
  // 現在の計算式: 速度 * 正確率
  // 後で更新される可能性があるため、柔軟な設計にします
  return Math.round(speed * accuracy);
}
