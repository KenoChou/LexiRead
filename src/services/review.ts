import type { VocabularyItem } from '../types'
export type Rating = 'Again' | 'Hard' | 'Good' | 'Easy'
export const reviewService = {
  rate(word: VocabularyItem, rating: Rating): VocabularyItem {
    const days = rating === 'Again' ? 0 : rating === 'Hard' ? Math.max(1, word.interval) : rating === 'Good' ? Math.max(1, Math.round(word.interval * word.easeFactor)) : Math.max(3, Math.round(word.interval * word.easeFactor * 1.4))
    const next = new Date(); next.setDate(next.getDate() + days)
    return { ...word, status: rating === 'Again' ? 'LEARNING' : rating === 'Easy' ? 'FAMILIAR' : word.status, reviewCount: word.reviewCount + 1, correctCount: word.correctCount + (rating === 'Again' ? 0 : 1), wrongCount: word.wrongCount + (rating === 'Again' ? 1 : 0), interval: days, easeFactor: Math.max(1.3, word.easeFactor + (rating === 'Easy' ? .15 : rating === 'Again' ? -.2 : 0)), nextReviewAt: next.toISOString() }
  }
}
