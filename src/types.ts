export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  points: number;
  role: 'admin' | 'user';
  completedArticles: string[];
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
}

export interface Article {
  id: string;
  roadmapId: string;
  title: string;
  content: string;
  points: number;
  order: number;
  level?: number; // Level within the roadmap (e.g., 1, 2, 3)
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface Quiz {
  id: string;
  articleId: string;
  questions: QuizQuestion[];
}
