import 'i18next'
import type en from './en.json'

// Makes t('some.key') a type error when the key doesn't exist in en.json.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en }
  }
}
