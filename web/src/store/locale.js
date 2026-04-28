import { defineStore } from 'pinia'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../i18n/messages'

const STORAGE_KEY = 'xloop_locale'

function normalizeLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
}

function loadInitialLocale() {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  return normalizeLocale(window.localStorage.getItem(STORAGE_KEY))
}

function persistLocale(locale) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

export const useLocaleStore = defineStore('locale', {
  state: () => ({
    locale: loadInitialLocale()
  }),
  getters: {
    isEnglish: (state) => state.locale === 'en-US'
  },
  actions: {
    setLocale(locale) {
      const nextLocale = normalizeLocale(locale)
      this.locale = nextLocale
      persistLocale(nextLocale)
    },
    toggleLocale() {
      this.setLocale(this.locale === 'zh-CN' ? 'en-US' : 'zh-CN')
    },
    syncDocumentLanguage() {
      persistLocale(this.locale)
    }
  }
})
