import { ApiError } from './ApiClient'
import type { ApiErrorCode } from './types'

// Обработка ошибок по коду (TODO). Для shuffle_impossible и validation_failed
// бекенд присылает в message живые детали (причины, что именно не так) — их
// не перекрываем. Для остальных кодов текст стабильный, независимо от бекенда.
const DETAILED_CODES: ReadonlySet<string> = new Set(['shuffle_impossible', 'validation_failed'])

const CODE_TEXT: Record<ApiErrorCode, string> = {
  room_not_found: 'Комната не найдена — проверь код',
  name_taken: 'Такое имя в этой комнате уже занято',
  not_organizer: 'Это доступно только организатору',
  forbidden: 'Нет доступа к этой комнате',
  unauthorized: 'Сначала войди в комнату',
  wrong_status: 'Комната уже в другом статусе — обнови страницу',
  reshuffle_blocked: 'Пересобрать пары нельзя: кто-то уже открыл, кому он дарит',
  shuffle_impossible: 'Шафл невозможен с такими исключениями',
  shuffle_not_ready: 'Шафл ещё не проводился',
  item_not_found: 'Товар уже удалён — обнови вишлист',
  validation_failed: 'Проверь заполненные поля',
  internal: 'Внутренняя ошибка — попробуй ещё раз',
}

export function apiErrorText(error: ApiError): string {
  if (DETAILED_CODES.has(error.code)) return error.message
  return CODE_TEXT[error.code as ApiErrorCode] ?? error.message
}
