import { ChangeEvent, useMemo, useRef, useState } from 'react'
import ePub from 'epubjs'
import type { Book, Page, VocabularyItem, VocabularyStatus, WordDefinition } from './types'
import { storage } from './services/storage'
import { dictionaryService } from './services/dictionary'
import { reviewService, type Rating } from './services/review'

const nav: { id: Page; label: string; icon: string }[] = [{ id: 'home', label: 'Home', icon: '⌂' }, { id: 'library', label: 'Library', icon: '▤' }, { id: 'vocabulary', label: 'Vocabulary', icon: '◫' }, { id: 'review', label: 'Review', icon: '↻' }, { id: 'statistics', label: 'Statistics', icon: '◔' }, { id: 'settings', label: 'Settings', icon: '⚙' }]
const demoText = `The system automatically provisions GPU resources. Reading in a new language is most effective when it feels calm and continuous. Tap any word to look it up without leaving the page. Build your vocabulary one useful word at a time.`
const date = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)) : 'Not started'
const sentenceFor = (content: string, word: string) => content.split(/(?<=[.!?])\s+/).find((s) => s.toLowerCase().includes(word.toLowerCase())) ?? content.slice(0, 180)

export function App() {
  const [data, setData] = useState(storage.read)
  const [page, setPage] = useState<Page>('home')
  const [activeBookId, setActiveBookId] = useState<string | null>(data.books[0]?.id ?? null)
  const [selected, setSelected] = useState<WordDefinition | null>(null)
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const activeBook = data.books.find((book) => book.id === activeBookId)
  const persist = (next: typeof data) => { storage.write(next); setData(next) }
  const openBook = (book: Book) => { const now = new Date().toISOString(); const updated = { ...book, lastReadAt: now }; persist({ ...data, books: data.books.map((item) => item.id === book.id ? updated : item) }); setActiveBookId(book.id); setPage('reader') }
  const importBook = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'html', 'htm', 'epub'].includes(extension ?? '')) return
    let content = ''
    if (extension === 'epub') {
      const epub = ePub(await file.arrayBuffer())
      await epub.ready
      const sections = epub.spine.spineItems
      const chapterText = await Promise.all(sections.map(async (section) => {
        const document = await section.load(epub.load.bind(epub))
        const text = document.body?.textContent ?? ''
        section.unload()
        return text
      }))
      content = chapterText.join('\n\n')
      epub.destroy()
    } else content = await file.text()
    if (extension === 'html' || extension === 'htm') content = new DOMParser().parseFromString(content, 'text/html').body.innerText
    const book: Book = { id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, ''), author: 'Unknown author', format: extension === 'epub' ? 'epub' : extension === 'txt' ? 'txt' : 'html', content: content.trim() || demoText, createdAt: new Date().toISOString(), progress: 0 }
    persist({ ...data, books: [book, ...data.books] }); openBook(book); event.target.value = ''
  }
  const addWord = () => {
    if (!selected || !activeBook) return
    const existing = data.vocabulary.some((word) => word.lemma === selected.lemma)
    if (!existing) {
      const context = sentenceFor(activeBook.content, selected.word)
      const item: VocabularyItem = { ...selected, id: crypto.randomUUID(), status: 'NEW', createdAt: new Date().toISOString(), isFavorite: false, bookId: activeBook.id, bookTitle: activeBook.title, chapter: 'Reading', context, position: activeBook.content.indexOf(context), reviewCount: 0, correctCount: 0, wrongCount: 0, nextReviewAt: new Date().toISOString(), interval: 1, easeFactor: 2.5 }
      persist({ ...data, vocabulary: [item, ...data.vocabulary] })
    }
    setSelected(null)
  }
  const dueWords = data.vocabulary.filter((word) => new Date(word.nextReviewAt) <= new Date())
  const filteredVocabulary = useMemo(() => data.vocabulary.filter((word) => `${word.word} ${word.meaning}`.toLowerCase().includes(query.toLowerCase())), [data.vocabulary, query])
  const [reviewing, setReviewing] = useState<VocabularyItem | null>(null)
  const [answer, setAnswer] = useState(false)
  const rate = (rating: Rating) => { if (!reviewing) return; persist({ ...data, vocabulary: data.vocabulary.map((word) => word.id === reviewing.id ? reviewService.rate(word, rating) : word) }); setReviewing(null); setAnswer(false) }
  const wordsRead = data.books.reduce((sum, book) => sum + Math.round(book.content.split(/\s+/).length * book.progress), 0)
  return <main className={dark ? 'app dark' : 'app'}>
    <aside><div className="brand"><span>l</span> LexiRead</div><nav>{nav.map((item) => <button key={item.id} className={page === item.id ? 'active' : ''} onClick={() => setPage(item.id)}><i>{item.icon}</i>{item.label}</button>)}</nav><div className="local">● All data stays on this device</div></aside>
    <section className="workspace">
      {page === 'home' && <Home books={data.books} vocabulary={data.vocabulary} onLibrary={() => setPage('library')} onOpen={openBook} />}
      {page === 'library' && <><header><div><p className="eyebrow">YOUR BOOKS</p><h1>Library</h1></div><button className="primary" onClick={() => fileInput.current?.click()}>＋ Import book</button><input ref={fileInput} className="hidden" type="file" accept=".epub,.txt,.html,.htm" onChange={importBook} /></header><div className="format-note">EPUB, TXT and HTML are stored locally. PDF support is planned for a later reading-engine update.</div>{data.books.length ? <div className="books">{data.books.map((book) => <BookCard key={book.id} book={book} onOpen={() => openBook(book)} onDelete={() => { storage.removeBook(book.id); setData(storage.read()) }} />)}</div> : <EmptyLibrary onImport={() => fileInput.current?.click()} />}</>}
      {page === 'reader' && <Reader book={activeBook} onBack={() => setPage('library')} onSelect={setSelected} onProgress={(progress) => activeBook && persist({ ...data, books: data.books.map((book) => book.id === activeBook.id ? { ...book, progress, lastReadAt: new Date().toISOString() } : book) })} />}
      {page === 'vocabulary' && <><header><div><p className="eyebrow">YOUR WORDS</p><h1>Vocabulary</h1></div><input className="search" placeholder="Search words" value={query} onChange={(e) => setQuery(e.target.value)} /></header><div className="word-list">{filteredVocabulary.length ? filteredVocabulary.map((word) => <article className="word-row" key={word.id}><button className="star" onClick={() => persist({ ...data, vocabulary: data.vocabulary.map((item) => item.id === word.id ? { ...item, isFavorite: !item.isFavorite } : item) })}>{word.isFavorite ? '★' : '☆'}</button><div className="word-main"><strong>{word.word}</strong><span>{word.partOfSpeech} · {word.meaning}</span><small>From {word.bookTitle} · {date(word.createdAt)}</small></div><select value={word.status} onChange={(e) => persist({ ...data, vocabulary: data.vocabulary.map((item) => item.id === word.id ? { ...item, status: e.target.value as VocabularyStatus } : item) })}>{(['NEW', 'LEARNING', 'FAMILIAR', 'MASTERED'] as VocabularyStatus[]).map((status) => <option key={status}>{status}</option>)}</select><button className="quiet" onClick={() => { setActiveBookId(word.bookId); setPage('reader') }}>Context ↗</button><button className="quiet danger" onClick={() => { storage.removeWord(word.id); setData(storage.read()) }}>Remove</button></article>) : <div className="empty">No saved words yet. Look up a word while reading to build your list.</div>}</div></>}
      {page === 'review' && <Review words={dueWords} reviewing={reviewing} answer={answer} onStart={(word) => setReviewing(word)} onAnswer={() => setAnswer(true)} onRate={rate} />}
      {page === 'statistics' && <Statistics books={data.books} vocabulary={data.vocabulary} wordsRead={wordsRead} />}
      {page === 'settings' && <Settings dark={dark} setDark={setDark} data={data} onImport={(event) => { const reader = new FileReader(); reader.onload = () => { try { persist(JSON.parse(String(reader.result)) as typeof data) } catch { alert('This backup could not be read.') } }; const file = event.target.files?.[0]; if (file) reader.readAsText(file) }} />}
    </section>
    {selected && <DictionaryCard definition={selected} added={data.vocabulary.some((word) => word.lemma === selected.lemma)} onAdd={addWord} onClose={() => setSelected(null)} />}
  </main>
}

function Home({ books, vocabulary, onLibrary, onOpen }: { books: Book[]; vocabulary: VocabularyItem[]; onLibrary: () => void; onOpen: (book: Book) => void }) { const recent = books[0]; return <><header><div><p className="eyebrow">GOOD TO SEE YOU</p><h1>Your reading space</h1><p className="sub">A quiet place for books and the words you want to keep.</p></div></header>{recent ? <section className="continue"><div className="cover large">{recent.title.slice(0, 1)}</div><div><p className="eyebrow">CONTINUE READING</p><h2>{recent.title}</h2><p>{recent.author} · {Math.round(recent.progress * 100)}% complete</p><button className="primary" onClick={() => onOpen(recent)}>Continue reading →</button></div></section> : <section className="welcome"><p className="eyebrow">START HERE</p><h2>Bring a book, make it yours.</h2><p>Import an EPUB, TXT or HTML file to begin reading offline.</p><button className="primary" onClick={onLibrary}>Open library</button></section>}<h2 className="section-title">Today</h2><div className="metrics"><Metric value="0 min" label="Reading time" /><Metric value="0" label="Words read" /><Metric value={String(vocabulary.filter((word) => new Date(word.createdAt).toDateString() === new Date().toDateString()).length)} label="New vocabulary" /><Metric value={String(vocabulary.filter((word) => new Date(word.nextReviewAt) <= new Date()).length)} label="Words to review" /></div></> }
function Metric({ value, label }: { value: string; label: string }) { return <div className="metric"><strong>{value}</strong><span>{label}</span></div> }
function EmptyLibrary({ onImport }: { onImport: () => void }) { return <div className="empty library-empty"><div>⌁</div><h2>Your library is waiting</h2><p>Start with an EPUB, TXT or HTML book. It will stay on this device.</p><button className="primary" onClick={onImport}>Import your first book</button></div> }
function BookCard({ book, onOpen, onDelete }: { book: Book; onOpen: () => void; onDelete: () => void }) { return <article className="book"><div className="cover">{book.title.slice(0, 1)}</div><div><h2>{book.title}</h2><p>{book.author}</p><small>{book.format.toUpperCase()} · {Math.round(book.progress * 100)}% read</small><div className="progress"><i style={{ width: `${book.progress * 100}%` }} /></div><button className="text-button" onClick={onOpen}>Read book →</button><button className="remove" onClick={onDelete}>Remove</button></div></article> }
function Reader({ book, onBack, onSelect, onProgress }: { book?: Book; onBack: () => void; onSelect: (word: WordDefinition) => void; onProgress: (progress: number) => void }) { const [font, setFont] = useState(20); if (!book) return <EmptyLibrary onImport={onBack} />; const words = book.content.split(/(\s+)/); return <div className="reader"><div className="reader-bar"><button className="quiet" onClick={onBack}>← Library</button><span>{book.title}</span><div><button className="quiet" onClick={() => setFont(Math.max(16, font - 1))}>A−</button><button className="quiet" onClick={() => setFont(Math.min(28, font + 1))}>A+</button><button className="quiet" onClick={() => onProgress(Math.min(1, book.progress + .1))}>Bookmark</button></div></div><article className="reading" style={{ fontSize: font }}>{words.map((token, index) => /[a-zA-Z]/.test(token) ? <button key={index} className="reading-word" onClick={() => onSelect(dictionaryService.lookup(token))}>{token}</button> : token)}<div className="reader-end"><div className="progress"><i style={{ width: `${book.progress * 100}%` }} /></div><span>{Math.round(book.progress * 100)}% complete</span></div></article></div> }
function DictionaryCard({ definition, added, onAdd, onClose }: { definition: WordDefinition; added: boolean; onAdd: () => void; onClose: () => void }) { return <div className="overlay" onMouseDown={onClose}><section className="dictionary" onMouseDown={(e) => e.stopPropagation()}><button className="close" onClick={onClose}>×</button><p className="phonetic">{definition.phonetic}</p><h2>{definition.word}</h2><p className="lemma">{definition.lemma} · {definition.partOfSpeech}</p><h3>{definition.meaning}</h3><p>{definition.definition}</p>{definition.example && <blockquote>{definition.example}</blockquote>}<div className="dictionary-actions"><button className="primary" disabled={added} onClick={onAdd}>{added ? 'Already in vocabulary' : 'Add to vocabulary'}</button><button className="quiet" onClick={onClose}>Already know</button></div><small>Esc to close</small></section></div> }
function Review({ words, reviewing, answer, onStart, onAnswer, onRate }: { words: VocabularyItem[]; reviewing: VocabularyItem | null; answer: boolean; onStart: (word: VocabularyItem) => void; onAnswer: () => void; onRate: (rating: Rating) => void }) { if (!reviewing) return <><header><div><p className="eyebrow">SPACED REPETITION</p><h1>Review</h1><p className="sub">A small, steady practice.</p></div></header><div className="review-intro"><span className="review-count">{words.length}</span><h2>words ready for review</h2><p>Review only what is due. Your next session will be scheduled automatically.</p>{words[0] && <button className="primary" onClick={() => onStart(words[0])}>Start review →</button>}</div></>; return <div className="review-card"><p className="eyebrow">REVIEWING · {words.length} DUE</p><h1>{reviewing.word}</h1>{answer ? <div className="answer"><h3>{reviewing.meaning}</h3><p>{reviewing.context}</p><div className="ratings">{(['Again', 'Hard', 'Good', 'Easy'] as Rating[]).map((rating) => <button key={rating} onClick={() => onRate(rating)}>{rating}</button>)}</div></div> : <button className="primary" onClick={onAnswer}>Show answer</button>}</div> }
function Statistics({ books, vocabulary, wordsRead }: { books: Book[]; vocabulary: VocabularyItem[]; wordsRead: number }) { const mastered = vocabulary.filter((word) => word.status === 'MASTERED').length; return <><header><div><p className="eyebrow">YOUR PROGRESS</p><h1>Statistics</h1></div><div className="periods"><button className="active">Today</button><button>7 days</button><button>30 days</button><button>All time</button></div></header><div className="metrics stats"><Metric value="0 min" label="Reading time" /><Metric value={String(books.length)} label="Books read" /><Metric value={String(wordsRead)} label="Words read" /><Metric value={String(vocabulary.length)} label="New vocabulary" /></div><section className="vocab-stats"><h2>Vocabulary</h2>{(['NEW', 'LEARNING', 'FAMILIAR', 'MASTERED'] as VocabularyStatus[]).map((status) => <div key={status}><span>{status.toLowerCase()}</span><i style={{ width: `${vocabulary.length ? vocabulary.filter((word) => word.status === status).length / vocabulary.length * 100 : 0}%` }} /><b>{status === 'MASTERED' ? mastered : vocabulary.filter((word) => word.status === status).length}</b></div>)}</section></> }
function Settings({ dark, setDark, data, onImport }: { dark: boolean; setDark: (value: boolean) => void; data: { books: Book[]; vocabulary: VocabularyItem[] }; onImport: (event: ChangeEvent<HTMLInputElement>) => void }) { const download = () => { const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); anchor.download = `lexiread-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(anchor.href) }; return <><header><div><p className="eyebrow">PREFERENCES</p><h1>Settings</h1></div></header><section className="settings"><h2>Reading</h2><label>Theme <button className="toggle" onClick={() => setDark(!dark)}>{dark ? 'Dark' : 'Light'}</button></label><label>Font size <span>Adjust it in the reader</span></label><label>Page mode <span>Continuous</span></label><h2>Vocabulary</h2><label>Default mastery state <span>New</span></label><label>Review scheduling <span>Simple spaced repetition</span></label><h2>Data</h2><label>Export backup <button className="quiet" onClick={download}>Export data</button></label><label>Restore backup <input type="file" accept="application/json" onChange={onImport} /></label></section></> }
