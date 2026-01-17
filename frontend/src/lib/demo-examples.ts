export type DemoExample = {
  emojis: string;
  typedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export const demoExamples: DemoExample[] = [
  { emojis: "🦁👑", typedAnswer: "Le Roi Lion", correctAnswer: "Le Roi Lion", isCorrect: true },
  { emojis: "🚢💑🧊", typedAnswer: "Titanic", correctAnswer: "Titanic", isCorrect: true },
  { emojis: "🤖❤️🌱", typedAnswer: "Wall-E", correctAnswer: "Wall-E", isCorrect: true },
  { emojis: "🐀👨‍🍳🇫🇷", typedAnswer: "Ratatouille", correctAnswer: "Ratatouille", isCorrect: true },
  { emojis: "🧸🚀🤠", typedAnswer: "Toy Story", correctAnswer: "Toy Story", isCorrect: true },
  { emojis: "🌀💭🛏️", typedAnswer: "Inception", correctAnswer: "Inception", isCorrect: true },
  { emojis: "🧊❄️👸", typedAnswer: "La Reine des Glaces", correctAnswer: "La Reine des Neiges", isCorrect: false },
  { emojis: "🐠🔍👨‍👦", typedAnswer: "Nemo", correctAnswer: "Le Monde de Nemo", isCorrect: false },
  { emojis: "🟢👹🏰", typedAnswer: "L'Ogre Vert", correctAnswer: "Shrek", isCorrect: false },
  { emojis: "🏠👦🎄", typedAnswer: "Seul à la Maison", correctAnswer: "Maman j'ai raté l'avion", isCorrect: false },
];
