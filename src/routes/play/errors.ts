import type { TFunction } from 'i18next'
import en from '../../i18n/en.json'
import { ApiError } from '@/lib/api'

type ErrorKey = keyof typeof en.errors

/** Words for an API error code (docs/SPEC.md section 7: friendly states, never a raw code). */
export function errorMessage(code: string, t: TFunction): string {
  const key: ErrorKey = code in en.errors ? (code as ErrorKey) : 'unknown'
  return t(`errors.${key}`)
}

/** The code of whatever a mutation or query threw. */
export const errorCode = (error: unknown): string => (error instanceof ApiError ? error.code : 'unknown')
