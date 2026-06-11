export type StudyMode = 'study' | 'exam' | 'summary';

export interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  courseId:  string;
  message:   string;
  mode:      StudyMode;
  history:   ChatMessage[];
}

export interface ChatSession {
  courseId:  string;
  mode:      StudyMode;
  history:   ChatMessage[];
}
