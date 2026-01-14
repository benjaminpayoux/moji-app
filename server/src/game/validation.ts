export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

export function isCloseEnough(input: string, target: string): boolean {
  if (input === target) return true;
  const distance = levenshteinDistance(input, target);
  const maxDistance = Math.max(1, Math.floor(target.length * 0.2));
  return distance <= maxDistance;
}

export function checkAnswer(guess: string, answers: string[]): boolean {
  const normalizedGuess = normalizeText(guess);
  return answers.some((answer) =>
    isCloseEnough(normalizedGuess, normalizeText(answer))
  );
}
