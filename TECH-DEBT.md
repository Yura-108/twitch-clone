# Технический долг

Список накопленных недоработок. Собран по ходу разбора кода — ничего из этого сейчас не сломано, приложение работает. Порядок внутри разделов — по убыванию важности.

---

## Безопасность

- [ ] **Смена пароля не завершает остальные сессии**
  После `newPassword` все ранее выданные сессии в Redis остаются живыми. Если пароль меняли из-за компрометации, злоумышленник сохраняет доступ. Обход ключей уже написан в `SessionService.findByUser` — переиспользовать его, удалив все сессии пользователя кроме текущей.
  `src/modules/auth/password-recovery/password-recovery.service.ts`

- [ ] **Нет ограничения частоты запросов**
  `loginUser` открыт для перебора паролей, `resetPassword` — для рассылки писем на чужие адреса и выжигания SMTP-квоты, `sendVerificationToken` — то же самое. Подключить `@nestjs/throttler` с отдельными лимитами на эти три операции.

- [ ] **`resetPassword` раскрывает, зарегистрирован ли адрес**
  При неизвестном email летит `NotAcceptableException('User not found')` — перебором собирается список зарегистрированных пользователей. Стандартное поведение: возвращать `true` в обоих случаях, письмо слать только реальному адресу.
  `src/modules/auth/password-recovery/password-recovery.service.ts`

- [ ] **Пустые переменные окружения проходят молча**
  `getOrThrow()` ловит только `undefined`; пустая строка для него — валидное значение. `SESSION_SECRET=''` или `COOKIES_SECRET=''` пролезут без предупреждения, и подписи станут предсказуемыми. `requireEnv()` уже написан (`src/shared/utils/require-env.util.ts`), но применён только в `mailer.config.ts` — провести через него все обязательные переменные либо подключить `validationSchema` в `ConfigModule`.

- [ ] **`ValidationPipe` без `whitelist`**
  Сейчас только `transform: true`. Для GraphQL некритично — схема сама отсекает лишние поля, — но включить стоит до появления REST-эндпоинтов и загрузки файлов.
  `src/main.ts`

---

## Данные и хранилища

- [x] ~~**Расхождение схемы Prisma и миграций**~~ — закрыто 2026-08-20
  Создана миграция `20260820054238_add_token_model_and_verification_flags`, помечена применённой через `migrate resolve`. Проверено: `migrate deploy` на пустой базе даёт схему, идентичную рабочей. В `prisma.config.ts` добавлен `shadowDatabaseUrl` (`POSTGRES_SHADOW_URI`) — без него Prisma не умеет сравнивать историю миграций со схемой.

- [ ] **Shadow-база не создаётся автоматически**
  `POSTGRES_SHADOW_URI` указывает на `twitch_shadow`, которую нужно создать руками: `docker exec twitch-postgres psql -U postgres -d postgres -c "CREATE DATABASE twitch_shadow;"`. На чистой машине `migrate dev` без неё не заработает. Добавить init-скрипт в `docker-compose.yml`.

- [ ] **Просроченные токены не удаляются никогда**
  `generateToken` чистит только один существующий токен через `findFirst` + `delete`, истёкшие остаются навсегда — в таблице уже скопились лишние записи. Заменить на `deleteMany` по `{ type, userId }` и добавить периодическую чистку по `expiresIn`.
  `src/shared/utils/generate-token.util.ts`

- [ ] **`KEYS` вместо `SCAN` при обходе сессий**
  `KEYS` блокирует Redis на время выполнения. Пока сессий десятки — незаметно, на продовом объёме это остановка всей базы.
  `src/modules/auth/session/session.service.ts:43`

- [ ] **Формат сессии в Redis не версионируется**
  Схема данных в Redis — тоже контракт, но без миграций: при изменении `SessionMetadata` старые записи молча ломают выдачу (уже наступали на это с `deviceInfo` → `device`). Приём: версионировать префикс — `SESSION_FOLDER='sessions:v2:'`, тогда старые ключи становятся невидимыми и отмирают по TTL.

- [ ] **`PrismaService` читает `process.env` напрямую**
  Все остальные места используют `ConfigService.getOrThrow`, здесь — сырой `process.env.POSTGRES_URI`, который молча даст `undefined`, если env не загрузился.
  `src/core/prisma/prisma.service.ts:12`

---

## Логика и корректность

- [ ] **Двойной запрос к БД на каждый `findProfile`**
  `GqlAuthGuard` уже загружает пользователя целиком и кладёт в `req.user`, после чего `AccountService.me(id)` делает второй `findUnique` по тому же id. Принимать `@Authorized() user: User` и возвращать его — либо грузить в гварде только `id`.
  `src/shared/guards/gql-auth.guard.ts` + `src/modules/auth/account/account.service.ts`

- [ ] **`clearSession` оставляет осиротевшую сессию**
  Мутация стирает куку у клиента, но запись в Redis живёт до конца TTL (30 дней) и продолжает попадать в `findSessionsByUser` — пользователь видит мёртвую запись, которую нечем убрать. Решить, что мутация значит для фронтенда: если «выйти на этом устройстве», то это работа `logout`.
  `src/modules/auth/session/session.service.ts`

- [ ] **Ошибка отправки письма роняет мутацию после записи токена**
  Если SMTP недоступен, `sendVerificationToken` бросает исключение уже после того, как токен записан в БД: пользователь получает ошибку, токен висит. Решить, что важнее — атомарность или устойчивость к недоступности почты.

- [ ] **Срок жизни токена — 5 минут**
  `300_000` мс в `generateToken`. Для письма мало: доставка может занять больше. Обычно ставят от часа до суток, и разные сроки для верификации и сброса пароля тоже разумны. При изменении поправить текст в `verification.template.tsx`, где срок указан явно.
  `src/shared/utils/generate-token.util.ts:22`

- [ ] **Два последовательных запроса при регистрации**
  `AccountService.create` проверяет занятость username и email двумя отдельными `findUnique`. Схлопывается в один `findFirst` с `OR`.
  `src/modules/auth/account/account.service.ts`

- [ ] **`password` в `UserModel`**
  Поле объявлено без `@Field`, так что в GraphQL не утечёт, но модель ответа не должна знать о хеше пароля вообще.
  `src/modules/auth/account/models/user.model.ts:11`

---

## Типизация

- [ ] **`tsconfig` не strict**
  `noImplicitAny: false`, `strictBindCallApply: false`, включён только `strictNullChecks`. Сейчас проект маленький — это самый дешёвый момент поставить `"strict": true`. Через полгода будет неделя правок.
  `apps/backend/tsconfig.json`

- [ ] **`avatar` и `bio` помечены `nullable: true`, но типизированы как `string`**
  Всплывёт при включении `strict`.
  `src/modules/auth/account/models/user.model.ts`

- [ ] **`@nestjs/mapped-types` версия `"*"`**
  Wildcard-версия, зафиксировать.
  `apps/backend/package.json`

---

## Структура и инфраструктура

- [ ] **Нет агрегирующего `auth.module.ts`**
  `CoreModule` импортирует доменные модули напрямую: `AccountModule`, `SessionModule`, `VerificationModule`, `PasswordRecoveryModule`. Завести `modules/auth/auth.module.ts`, собирающий их, и импортировать один.

- [ ] **Нет тестов**
  `*.spec.ts` отсутствуют целиком. Первое, что стоит покрыть: гвард, логин, регистрация, флоу верификации и сброса пароля.

- [ ] **Нет глобального exception filter и логгера**
  Ошибки летят как есть, `stacktrace` уходит клиенту в `extensions`, все исключения помечены `INTERNAL_SERVER_ERROR` независимо от типа. Нужен фильтр плюс `Logger` вместо теряющихся ошибок.

- [ ] **Директория `packages/` объявлена в workspaces, но не существует**
  Туда логично положить типы, сгенерированные из `schema.gql` через graphql-codegen, — общие для фронта и бэка.
  `package.json` (корень)

- [ ] **`.env` загружается в четырёх местах**
  `main.ts`, `is-dev.utils.ts`, `prisma.config.ts`, `ConfigModule.forRoot`. При этом `is-dev.utils.ts` читает файловую систему как сайд-эффект импорта — это ломает тесты. Правильнее прокидывать `NODE_ENV` через npm-скрипты, как уже сделано во фронтенде через `dotenv-cli`.

- [ ] **`MAIL_FROM` понадобится отдельной переменной**
  Сейчас `from` собирается из `MAIL_LOGIN`, что верно для trial-домена MailerSend. При подключении своего домена адрес отправителя и логин SMTP станут разными значениями.
  `src/core/config/mailer.config.ts`

---

## Мелочи

- [ ] **Смешение языков в коде**
  `ms.util.ts` и `parse-boolean.util.ts` бросают ошибки на русском, весь остальной код и комментарии — на английском. Выбрать один язык.

- [ ] **`media/` — около 120 изображений в git**
  Работает, но репозиторий распухает. Git LFS или внешнее хранилище.

- [ ] **`ms.util.ts` дублирует пакет `ms`**
  Копия оправдана только ради типа `StringValue`. Проверить, не проще ли взять пакет вместе с его типами.
