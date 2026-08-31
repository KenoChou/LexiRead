/// <reference types="vite/client" />

declare module 'epubjs' {
  type Section = { load: (loader: (url: string) => Promise<unknown>) => Promise<Document>; unload: () => void }
  type EpubBook = { ready: Promise<void>; spine: { spineItems: Section[] }; load: (url: string) => Promise<unknown>; destroy: () => void }
  export default function ePub(input: ArrayBuffer): EpubBook
}
