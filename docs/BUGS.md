# BUGS

Маленькие баг-репорты и грабли: что сломалось, почему и как лечили,
чтобы не наступать дважды. Новые записи добавлять сверху раздела.

## Фронтенд / сборка

### /tools/parse-product ловит 401 — getToken не видит токен (15.11)
- **Симптом:** превью товара из формы вишлиста → `unauthorized`, хотя место
  в комнате есть.
- **Причина:** токен вешается по пути запроса (код достаётся из
  `/rooms/{code}/…`), а в `/tools/parse-product` кода комнаты в пути нет.
- **Решение:** у `ApiClient.post/patch/put` появился параметр `headers` —
  вызов с пути без кода комнаты вешает `authorization` сам
  (`features/wishlist/AddWishlistItemForm.tsx`).

### oxlint на WS-хуке: set-state-in-effect / exhaustive-deps (15.11)
- **Симптом:** `setStatus('closed')` в эффекте и «missing dependency 'active'»
  в `useRoomEvents`.
- **Причина:** синхронный setState в эффекте каскадит рендеры; `active`
  выведен из deps, но линтер этого не знает.
- **Решение:** статус «закрыто» выводить при рендере
  (`active ? socketStatus : 'closed'`), а `active` добавить в deps
  корректности ради — значение меняется только вместе с roomCode/token.

### ci.yml падает за 0 секунд: «Unrecognized named-value: 'hashFiles'» (15.11)
- **Симптом:** run по `.github/workflows/ci.yml` завершается за 0s, чек-ранов
  нет, баннер «This run likely failed because of a workflow file issue».
- **Причина:** `hashFiles()` недоступна в job-level `if` (контекст ещё не
  вычислен) — раннер отбраковывает весь файл на парсинге.
- **Решение:** условие перенести внутрь шага (`if:` у `steps`) или убрать
  совсем — гейт «когда появится frontend/package.json» удалён, фронт в репо
  постоянно. Проверять файлы workflow локально: `python3 -c "import yaml;
  yaml.safe_load(open(path))"` ловит только YAML, но не семантику Actions.

### WS-события приходили с snake_case-полями (15.11)
- **Симптом:** по WS `"player_id"`, в REST — `playerId`.
- **Причина:** `#[serde(rename_all = "camelCase")]` на enum переименовывает
  только **варианты**, не их поля.
- **Решение:** `#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]`
  в `backend/src/ws.rs`.

### Инжект main.scss в vite задублировал бы reset (15.11)
- **Симптом (потенциальный):** reset-стили повторились бы в сборке по разу на
  каждый компонент.
- **Причина:** `additionalData` подставляет содержимое в каждый scss; если бы
  в `main.scss` лежал `@use 'reset'`, он компилировался бы N раз.
- **Решение:** `main.scss` — только `@forward 'variables'/'mixins'` (CSS не
  генерирует), `reset.scss` импортируется в `main.tsx` один раз. Файлы самой
  `app/styles/` из инжекта исключены (`id.includes('/src/app/styles/')`),
  иначе main.scss подключил бы сам себя → рекурсия.

### `@use` не реэкспортирует члены модуля (15.11)
- **Симптом:** инжект `@use 'main.scss' as *` не давал доступа к `$desktop`.
- **Причина:** `@use` только делает члены видимыми **внутри** файла;
  наружу они не пробрасываются.
- **Решение:** для хаба использовать `@forward` (это «@use + реэкспорт»).

### vite не компилирует scss, который никто не импортировал (15.11)
- **Симптом:** smoke-файл со стилями не попал в сборку.
- **Причина:** `additionalData` работает только для файлов, попавших в граф
  зависимостей; сам по себе файл в `src/` не собирается.
- **Решение:** подключать scss импортом из tsx/ts (как и должно быть).

### erasableSyntaxOnly в tsconfig запрещает parameter properties (15.11)
- **Симптом:** `constructor(readonly status: number)` сломал бы сборку.
- **Решение:** в классах (`ApiClient`, `ApiError`) объявлять поля явно и
  присваивать в конструкторе.

### verbatimModuleSyntax: типы — только через import type
- **Симптом:** обычный `import { ApiErrorBody } from …` для типа.
- **Решение:** `import type { … }` (и `export type * from './types'` в
  индексах).

## Rust / бекенд

### rand 0.9 ThreadRng — !Send (15.11)
- **Симптом:** `Handler<_, _>` не реализован для шафл-хендлера.
- **Причина:** `rand::rng()` нельзя держать через `.await` — ток-фьючерс
  axum обязан быть Send.
- **Решение:** ограничить время жизни rng скоуп-блоком без await внутри:
  `let assignment = { let mut rng = rand::rng(); shuffle(...)? };`.

### sqlx: `&mut Transaction` не реализует `PgExecutor` (15.11)
- **Симптом:** E0277 при передаче `&mut tx` в generic-функцию.
- **Причина:** deref-коэрция не работает для generic-параметров.
- **Решение:** функции с `impl PgExecutor<'_>` вызывать как `&mut *tx`,
  функции с конкретным `&mut PgConnection` — просто `&mut tx`.

### sqlx::migrate! не принимает относительный путь (15.11)
- **Симптом:** «paths relative to the current file's directory are not
  currently supported».
- **Решение:** вызывать без аргумента — `sqlx::migrate!()`; миграции
  зашиваются в бинарник, папка в рантайме не нужна.

### CORS закрыт в release — фронт не видит локальный API
- **Симптом:** фронт на :5173 ловит CORS-ошибки.
- **Причина:** CorsLayer включается только в debug (`cfg!(debug_assertions)`),
  прод идёт через same-origin прокси.
- **Решение:** локально запускать `cargo run` **без** `--release`.

### Интеграционные тесты молча пропускаются
- **Симптом:** «0 passed» и странно быстро.
- **Причина:** без `SANTA_TEST_DB` тесты делают early-return.
- **Решение:** `SANTA_TEST_DB=postgres://… cargo test --test api`
  (см. README §Тесты).

## Инфраструктура / окружение

### Postgres не стартует под root / не пишет в /var/run/postgresql
- **Решение:** личный кластер: `initdb -D ~/.santa-pg/data -U santa --auth=trust`,
  `pg_ctl … -o "-p 5432 -k ~/.santa-pg"` (сокет — в свою папку), при занятом
  5432 — порт 5433. Рецепт целиком: docs/LOCAL_SETUP.md §2.

### Docker daemon не запущен — сборки не проверить
- **Решение:** проверять сборку через CI или `systemctl start docker` +
  `docker compose -f docker-compose.prod.yml build`.

### HTTPS: Caddy не выдаёт сертификат
- **Причина:** Let's Encrypt должен увидеть домен на этом IP: A-запись
  обязана указывать на сервер **до** первого `docker compose up`, порты
  80/443 открыты.
- **Решение:** сначала DNS (`ping домен` → IP сервера), потом up; volume
  `caddy_data` держать — там живут сертификаты.

## Git / GitHub

### push отклонён: «refusing to allow a Personal Access Token to create or
### update workflow without `workflow` scope»
- **Причина:** PAT/gh-токен без скоупа `workflow` не может пушить файлы в
  `.github/`.
- **Решение (одно из):** `gh auth refresh -h github.com -s workflow` —
  или перевести remote на SSH: `git remote set-url origin git@github.com:Unstate/secret-santa.git`
  (SSH-ключ уже настроен в gh).

### Токен Git хранится в plaintext (~/.git-credentials, credential.helper=store)
- **Замечание по безопасности:** файл не в репозитории, но лежит открытым
  текстом в домашней папке. Если сменили токен/перешли на SSH — удалить
  старые записи из `~/.git-credentials`.
