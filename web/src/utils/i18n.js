import { computed } from 'vue'
import { DEFAULT_LOCALE, messages } from '../i18n/messages'
import { useLocaleStore } from '../store/locale'

function resolveMessage(locale, key) {
  const parts = key.split('.')
  const localeMessages = messages[locale] || messages[DEFAULT_LOCALE]
  const fallbackMessages = messages[DEFAULT_LOCALE]

  const resolveFrom = (source) => {
    return parts.reduce((value, part) => {
      return value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : undefined
    }, source)
  }

  return resolveFrom(localeMessages) ?? resolveFrom(fallbackMessages) ?? key
}

function interpolate(template, params = {}) {
  if (typeof template !== 'string') return template
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  })
}

export function translate(locale, key, params) {
  return interpolate(resolveMessage(locale, key), params)
}

export function useI18n() {
  const localeStore = useLocaleStore()
  const locale = computed(() => localeStore.locale)

  function t(key, params) {
    return translate(localeStore.locale, key, params)
  }

  return {
    locale,
    localeStore,
    t
  }
}
