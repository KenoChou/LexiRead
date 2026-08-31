import type { WordDefinition } from '../types'

const entries: Record<string, Omit<WordDefinition, 'word' | 'lemma'>> = {
  provision: { partOfSpeech: 'verb', phonetic: '/prəˈvɪʒən/', meaning: '配置；提供；供应', definition: 'To supply or make available something that is needed.', example: 'The system automatically provisions GPU resources.' },
  reading: { partOfSpeech: 'noun', phonetic: '/ˈriːdɪŋ/', meaning: '阅读；读物', definition: 'The activity or skill of understanding written words.', example: 'Reading every day builds a lasting habit.' },
  language: { partOfSpeech: 'noun', phonetic: '/ˈlæŋɡwɪdʒ/', meaning: '语言', definition: 'A system of communication using words or signs.', example: 'English is used around the world.' },
  vocabulary: { partOfSpeech: 'noun', phonetic: '/vəˈkæbjələri/', meaning: '词汇；词汇量', definition: 'The words known and used by a person or in a language.', example: 'She is building her vocabulary through reading.' }
}

const lemmaOf = (word: string) => word.toLowerCase().replace(/(ing|ed|es|s)$/, '') || word.toLowerCase()
export const dictionaryService = {
  lookup(word: string): WordDefinition {
    const cleaned = word.toLowerCase().replace(/[^a-z'-]/g, '')
    const lemma = entries[cleaned] ? cleaned : lemmaOf(cleaned)
    const entry = entries[cleaned] ?? entries[lemma]
    return entry ? { word: cleaned, lemma, ...entry } : { word: cleaned, lemma, partOfSpeech: 'word', phonetic: '', meaning: '本地词典暂未收录此词', definition: 'No local definition is available yet.', example: '' }
  }
}
