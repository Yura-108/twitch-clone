# Технический долг

Список накопленных недоработок. Собран по ходу разбора кода — ничего из этого сейчас не сломано, приложение работает. Порядок внутри разделов — по убыванию важности.

---

## Безопасность

- [x] ~~**`totpSecret` отдавался в GraphQL**~~ — закрыто 2026-08-25
  Поле было объявлено с `@Field` в `UserModel`, то есть `findProfile` возвращал секрет второго фактора любому, у кого есть сессия: при XSS он утекал навсегда, а не на одну сессию. `@Field` снят, свойство осталось на классе для серверного кода — как у `password`. Проверено интроспекцией на живом сервере: поля в `UserModel` больше нет. Фронтенд его нигде не запрашивал, серверные чтения (`session.service.ts:119`, `totp.service.ts:55`) работают с Prisma-типом `User`.
  `src/modules/auth/account/models/user.model.ts:35`

- [x] ~~**Смена пароля не завершает остальные сессии**~~ — закрыто 2026-08-31
  После смены пароля все ранее выданные сессии в Redis оставались живыми: если пароль меняли из-за компрометации, злоумышленник сохранял доступ. Дыра была в двух местах, закрыты оба. `SessionService.removeAllForUser` (его уже вызывал `DeactivateService`) получил необязательный второй параметр `exceptSessionId`. `newPassword` — сброс по ссылке из письма, пользователь не авторизован — гасит все сессии без исключений. `changePassword` — смена из кабинета — гасит все, кроме текущей, чтобы пользователь не выпал из приложения на своём же устройстве; для этого `AccountModule` импортирует `SessionModule` (как `DeactivateModule`), а резолвер прокидывает `req` через `@Context()`. Схема GraphQL не изменилась. Проверено на живом сервере двумя cookie-jar'ами: после `changePassword` из A сессия A жива, B получает `User is not authorized`, `findSessionsByUser` пуст; после `newPassword` мертвы обе, вход идёт только с новым паролем.
  `src/modules/auth/session/session.service.ts:177`, `src/modules/auth/password-recovery/password-recovery.service.ts`, `src/modules/auth/account/account.service.ts`

- [ ] **Сброс сессий падает вместе с Redis, но пароль уже сменён**
  В обоих флоу пароль пишется в БД до `removeAllForUser`. Если Redis недоступен, мутация вернёт ошибку с уже изменённым паролем. Выбрано осознанно: тихо ответить `true`, не выкинув чужие сессии, хуже — пользователь будет думать, что чужие устройства отключены. Это тот же класс проблемы, что «Ошибка отправки письма роняет мутацию после записи токена», и решать их стоит одним приёмом.
  `src/modules/auth/account/account.service.ts`, `src/modules/auth/password-recovery/password-recovery.service.ts`

- [x] ~~**TOTP: `enable` принимает `secret` от клиента**~~ — закрыто 2026-08-31
  `generateTotp` теперь кладёт выданный секрет в Redis под ключ `totp:pending:<userId>` с TTL 5 минут, а `EnableTotpInput` потерял поле `secret` — от клиента принимается только пин. Привязать к аккаунту произвольный секрет больше нельзя: GraphQL отклоняет лишнее поле на уровне схемы. Ключ удаляется только после успешной проверки пина, чтобы опечатка не заставляла проходить весь путь с QR-кодом заново, но повторно включить тем же секретом нельзя. Истёкший ключ даёт внятную ошибку про устаревший QR, а не 500. Проверено на живом сервере: неверный пин → ошибка и повторная попытка с верным пином проходит; второй `enableTotp` → `already enabled`; после подмены TTL на 1 секунду → `The code has expired`.
  `src/modules/auth/totp/totp.service.ts`, `src/modules/auth/totp/inputs/enable-totp.input.ts`

- [x] ~~**TOTP: `disable` ничего не переспрашивает**~~ — закрыто 2026-08-31
  `disableTotp` принимает `DisableTotpInput { pin }` и требует действующий TOTP-код: чтобы снять второй фактор, надо им владеть, угнанной сессии недостаточно. Выбран код, а не пароль — он симметричен включению и не падает вместе с паролем. Размен осознанный: при потере телефона пользователь сам отключить не сможет, см. пункт про резервные коды ниже. Проверено: без пина — ошибка схемы, с неверным — `Code is not valid` и флаг в БД не меняется, с верным — `is_totp_enabled = false`, `totp_secret = NULL`, повторный вызов → `not enabled`.
  `src/modules/auth/totp/totp.service.ts`, `src/modules/auth/totp/inputs/disable-totp.input.ts`

- [x] ~~**TOTP: нет резервных кодов восстановления**~~ — закрыто 2026-08-31
  Заведено в тот же день вместе с требованием кода на `disableTotp` и закрыто следом. `enableTotp` теперь возвращает `[String!]!` — 8 одноразовых кодов вида `XXXX-XXXX-XXXX-XXXX` (80 бит энтропии, base32), показываются ровно один раз; в БД лежат argon2-хеши в новой таблице `recovery_codes` (миграция `20260831083756_add_recovery_code_model`, каскад по `user_id`). Код принимается **и на логине** (`LoginInput.recoveryCode`), и в `disableTotp` — без логина второй пункт был бы недостижим, ведь вход сам требует TOTP. Ввод нормализуется, так что регистр, пробелы и дефисы значения не имеют. Использованный код удаляется; при отключении второго фактора гасится весь остаток; повторное включение выдаёт новый комплект, старый перестаёт работать. «Переподключение» = отключить кодом и включить заново — отдельной мутации не понадобилось. Проверено на живом сервере целиком: вход строчными буквами без дефисов проходит, повторный ввод того же кода — нет, после `disableTotp` кодов 0, после нового `enableTotp` пересечение со старым комплектом нулевое.
  `src/modules/auth/totp/recovery-code.service.ts`, `src/shared/utils/recovery-code.util.ts`, `src/modules/auth/session/session.service.ts`

- [x] ~~**Нет ограничения частоты запросов**~~ — закрыто 2026-08-31
  Подключён `@nestjs/throttler` со счётчиками в Redis (`@nest-lab/throttler-storage-redis`, переиспользует существующий `RedisService`). `GqlThrottlerGuard` висит глобально через `APP_GUARD`: базовый потолок 120 запросов в минуту, и он действует **на операцию**, а не на весь API — ключ включает имя обработчика. Трекер считает залогиненных по `session.userId` (сменой IP лимит не обойти), анонимных — по уже написанному `getClientIp`, который разбирает Cloudflare и `x-forwarded-for`.
  Проблема оказалась шире трёх операций из исходного пункта. Ярусы вынесены в `shared/decorators/throttle.decorator.ts`: `@ThrottleAuth()` 5/мин на `loginUser`, `createUser`, `newPassword`, `verifyAccount`, `changePassword`; `@ThrottleMail()` 3/15 мин на `resetPassword`, `sendVerificationToken`, `deactivateAccount`; `@ThrottleOtp()` 5/мин на `generateTotp`, `enableTotp`, `disableTotp` — там перебор 6-значного пина, а попытка с резервным кодом стоит восьми argon2-верификаций; `@ThrottleUpload()` 10/час на `changeProfileAvatar` и `changeStreamThumbnail`, которые гоняют до 10 МБ через `sharp` и грузят в S3.
  Проверено на живом сервере: шестой `loginUser` подряд отвечает лимитом вместо `Invalid password`, четвёртый `resetPassword` упирается в почтовый ярус, шестой `generateTotp` — в otp, при этом десять `findAllCategories` подряд проходят. Обход алиасами не работает: пять алиасов в одном HTTP-запросе списывают пять единиц счётчика — guard срабатывает на каждое исполнение поля. Общность счётчиков проверена двумя процессами: лимит, выбранный на порту 4000, немедленно действует на втором экземпляре на 4001.
  `src/core/config/throttler.config.ts`, `src/shared/guards/gql-throttler.guard.ts`, `src/shared/decorators/throttle.decorator.ts`

- [ ] **Нет блокировки аккаунта после серии неудачных входов**
  Появилось 2026-08-31 вместе с лимитами. Счёт идёт по IP, поэтому распылённый перебор одного аккаунта с многих адресов лимит не ловит. Простая блокировка по логину открывает обратную дыру — злоумышленник намеренно запирает чужой аккаунт. Правильнее экспоненциальная задержка на пару логин+IP плюс письмо владельцу о подозрительных попытках.
  `src/modules/auth/session/session.service.ts`

- [ ] **Нет ограничения глубины и сложности GraphQL-запроса**
  Появилось 2026-08-31. Лимит частоты считает запросы, а не их стоимость: один запрос в рамках лимита может быть сколь угодно тяжёлым. Нужен `graphql-depth-limit` или подсчёт сложности в `getGraphQLConfig`.
  `src/core/config/graphql.config.ts`

- [ ] **Код деактивации — шесть цифр**
  `generateToken(..., false)` выдаёт число из 900 000 вариантов, и `validateDeactivateToken` сверяет его напрямую. Перебор теперь упирается в лимит частоты, но сам код стоило бы удлинить — защита не должна держаться на одном слое.
  `src/shared/utils/generate-token.util.ts:16`

- [ ] **`resetPassword` раскрывает, зарегистрирован ли адрес**
  При неизвестном email летит `NotAcceptableException('User not found')` — перебором собирается список зарегистрированных пользователей. Стандартное поведение: возвращать `true` в обоих случаях, письмо слать только реальному адресу.
  `src/modules/auth/password-recovery/password-recovery.service.ts`

- [x] ~~**TOTP: `totpSecret` хранится в открытом виде**~~ — закрыто 2026-08-31
  Секрет шифруется AES-256-GCM ключом из новой переменной `TOTP_ENCRYPTION_KEY` (32 байта в hex, проходит через `requireEnv` и проверку длины в `core/config/encryption.config.ts`). Хранится base64 от `iv(12) || authTag(16) || ciphertext` — влезает в существующую колонку `totp_secret String?`, миграция не понадобилась. GCM аутентифицирует: побитый или подменённый шифротекст не расшифруется, а не выдаст мусор. Тот же шифротекст лежит и во временном ключе Redis между `generate` и `enable`, так что открытым секрет не хранится нигде. Проверено: в БД после включения 72 символа base64, не 24-символьный base32, а логин с кодом проходит — значит расшифровка на входе сходится с шифрованием при включении. **Ротация ключа делает все сохранённые секреты нечитаемыми** — при смене нужен скрипт перешифровки.
  `src/shared/utils/encryption.util.ts`, `src/core/config/encryption.config.ts`, `src/modules/auth/totp/totp.service.ts`, `src/modules/auth/session/session.service.ts`

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

- [x] ~~**`deactivatedAt` объявлен non-nullable**~~ — закрыто 2026-08-25
  В Prisma поле `DateTime?`, в `UserModel` стояло `@Field(() => Date)` без `nullable`. Ломался не какой-то краевой случай, а ровно наоборот: у любого не деактивированного пользователя `findProfile` падал с `Cannot return null for non-nullable field UserModel.deactivatedAt`. Всплыло в рантайме. Поле помечено `nullable: true`, тип уточнён до `Date | null`. Остальные `@ObjectType` сверены со схемой Prisma — других расхождений по nullability нет.
  `src/modules/auth/account/models/user.model.ts:40`

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

- [ ] **Поля с `nullable: true` типизированы как `string`**
  `avatar` и `bio` в `UserModel`; `thumbnailUrl`, `ingressId`, `serverUrl`, `streamKey` в `StreamModel`. На рантайм не влияет — GraphQL-нуллабельность указана верно, — но всплывёт при включении `strict`.
  `src/modules/auth/account/models/user.model.ts`, `src/modules/stream/models/stream.model.ts`

- [ ] **`@nestjs/mapped-types` версия `"*"`**
  Wildcard-версия, зафиксировать.
  `apps/backend/package.json`

---

## Структура и инфраструктура

- [x] ~~**Нет агрегирующего `auth.module.ts`**~~ — закрыто 2026-08-21
  `AuthModule` собирает шесть доменных модулей, `CoreModule` импортирует один его. Попутно починена проводка `VerificationService`: `SessionModule` объявлял его в своём `providers` вместо импорта `VerificationModule`, из-за чего в приложении жили два экземпляра сервиса (проверено счётчиком в конструкторе: было 2, стало 1).

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

- [x] ~~**Смешение языков в коде**~~ — закрыто 2026-08-21
  Всё приведено к английскому: сообщения об ошибках в `ms.util.ts`, `parse-boolean.util.ts`, `session.service.ts` и пять шаблонов писем. Бренд везде Twitch, адрес поддержки `help@twitch.com`. Этот файл сознательно остаётся на русском.

- [ ] **`media/` — около 120 изображений в git**
  Работает, но репозиторий распухает. Git LFS или внешнее хранилище.

- [ ] **`ms.util.ts` дублирует пакет `ms`**
  Копия оправдана только ради типа `StringValue`. Проверить, не проще ли взять пакет вместе с его типами.
