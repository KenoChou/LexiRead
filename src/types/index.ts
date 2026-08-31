export type Page = 'home' | 'library' | 'reader' | 'vocabulary' | 'review' | 'statistics' | 'settings'
export type BookFormat = 'txt' | 'html' | 'epub'
export type Book = { id: string; title: string; author: string; format: BookFormat; content: string; createdAt: string; lastReadAt?: string; progress: number }
export type VocabularyStatus = 'NEW' | 'LEARNING' | 'FAMILIAR' | 'MASTERED'
export type WordDefinition = { word: string; lemma: string; partOfSpeech: string; phonetic: string; meaning: string; definition: string; example: string }
export type VocabularyItem = WordDefinition & { id: string; status: VocabularyStatus; createdAt: string; isFavorite: boolean; bookId: string; bookTitle: string; chapter: string; context: string; position: number; reviewCount: number; correctCount: number; wrongCount: number; nextReviewAt: string; interval: number; easeFactor: number }
