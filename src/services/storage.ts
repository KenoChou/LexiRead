import type { Book, VocabularyItem } from '../types'

const key = 'lexiread-data-v1'
type Stored = { books: Book[]; vocabulary: VocabularyItem[] }
const empty: Stored = { books: [], vocabulary: [] }

export const storage = {
  read(): Stored { try { return JSON.parse(localStorage.getItem(key) ?? '') as Stored } catch { return empty } },
  write(data: Stored) { localStorage.setItem(key, JSON.stringify(data)) },
  addBook(book: Book) { const data = this.read(); data.books.unshift(book); this.write(data); return book },
  removeBook(id: string) { const data = this.read(); data.books = data.books.filter((book) => book.id !== id); this.write(data) },
  saveBook(book: Book) { const data = this.read(); data.books = data.books.map((item) => item.id === book.id ? book : item); this.write(data) },
  addWord(item: VocabularyItem) { const data = this.read(); if (!data.vocabulary.some((word) => word.lemma === item.lemma)) { data.vocabulary.unshift(item); this.write(data) } },
  saveWord(item: VocabularyItem) { const data = this.read(); data.vocabulary = data.vocabulary.map((word) => word.id === item.id ? item : word); this.write(data) },
  removeWord(id: string) { const data = this.read(); data.vocabulary = data.vocabulary.filter((word) => word.id !== id); this.write(data) }
}
