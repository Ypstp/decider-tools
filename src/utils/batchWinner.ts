export interface TopWinnerInfo {
  primary: string;
  displayLabel: string;
  count: number;
  isTie: boolean;
}

/**
 * Finds the most frequent outcome from a list of batch results.
 * If multiple outcomes tie for the highest count, `primary` is chosen randomly
 * among the tied leaders while `displayLabel` summarizes the tie.
 */
export function getMostFrequentWinner(results: string[]): TopWinnerInfo {
  const counts = new Map<string, number>();
  results.forEach((item) => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });

  let maxCount = 0;
  counts.forEach((c) => {
    if (c > maxCount) maxCount = c;
  });

  const leaders: string[] = [];
  counts.forEach((c, label) => {
    if (c === maxCount) leaders.push(label);
  });

  const primary =
    leaders[Math.floor(Math.random() * leaders.length)] ?? results[0] ?? '';

  return {
    primary,
    displayLabel: leaders.length === 1 ? leaders[0] : leaders.slice(0, 3).join(' / '),
    count: maxCount,
    isTie: leaders.length > 1,
  };
}
