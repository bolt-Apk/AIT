# Техническое задание — AviRond AI Platform

**Дата**: 2026-09-08
**Версия**: 1.0

---

## 1. Общее описание

**AviRond** — мультимодальная AI-платформа (русскоязычная), объединяющая в одном интерфейсе:
- AI-чат с 30+ языковыми моделями
- Генерацию изображений (14+ моделей)
- Генерацию видео (25+ моделей)
- Синтез речи — TTS (12+ моделей)
- Распознавание речи — STT (3+ модели)
- Графический редактор макетов (Figma-подобный)
- Конструктор рекламных роликов (5-шаговый мастер)
- Систему оплаты через ЮKassa
- Реферальную программу
- Административную панель
- Поддержку пользователей (чат в реальном времени)

**Целевая аудитория**: русскоязычные пользователи, маркетологи, дизайнеры, контент-мейкеры.

---

## 2. Стек технологий

| Слой | Технология |
|---|---|
| Frontend | React 18 + TypeScript |
| Сборка | Vite |
| Стили | Tailwind CSS |
| Иконки | Lucide React |
| Роутинг | React Router v7 |
| Canvas-редактор | Fabric.js |
| Мобильное приложение | Capacitor (iOS + Android) |
| PWA | Service Worker + manifest |
| Backend | Supabase (Auth, Database, Storage, Realtime, Edge Functions) |
| AI-провайдер | AiTunnel API (`https://api.aitunnel.ru/v1/`) |
| Оплата | ЮKassa (`https://api.yookassa.ru/v3/`) |
| Email-уведомления | Resend (`https://api.resend.com/emails`) |

---

## 3. Структура маршрутов (страниц)

| Путь | Страница | Доступ |
|---|---|---|
| `/` | Генератор (основной экран) | Авторизованные |
| `/auth` | Вход / Регистрация / Восстановление пароля | Публичный |
| `/settings` | Настройки пользователя | Авторизованные |
| `/image-creator` | Графический редактор макетов | Авторизованные |
| `/ad-creator` | Конструктор рекламных роликов | Авторизованные |
| `/support` | Чат с поддержкой | Авторизованные |
| `/stup` | Панель администратора | Только администраторы |
| `/privacy` | Политика конфиденциальности | Публичный |
| `/terms` | Условия использования | Публичный |

---

## 4. Экранные модули — подробное описание

### 4.1. Авторизация (`/auth`)

**Макет**: Двухколоночный на десктопе. Слева — брендовая панель с анимированными иконками и карточками возможностей. Справа — форма.

**Режимы формы**:
- **Вход**: email + пароль
- **Регистрация**: email + пароль + подтверждение пароля + индикатор надёжности пароля
- **Восстановление**: email → отправка ссылки сброса

**Функции**:
- Захват реферального кода из URL-параметра `?ref=CODE`
- После регистрации — автоматическая регистрация реферала (вызов `register-referral`)
- Отображение счётчика пользователей (всего / онлайн) через `user-stats`
- Модальные окна с описанием возможностей по категориям (Чат, Изображения, Видео, TTS — с перечислением моделей)

**Подтверждение email**: Настроено через Supabase Auth. После подтверждения — экран `EmailVerified` с анимацией конфетти.

**Сброс пароля**: Экран `ResetPassword` с формой нового пароля + индикатором надёжности.

---

### 4.2. Генератор (`/`) — основной экран

Центральный экран приложения. Содержит **5 вкладок**:

#### 4.2.1. Чат (Chat)

- Боковая панель с историей чатов (создание, загрузка, удаление, экспорт в .txt)
- Выбор из 30+ моделей (GPT-5, Claude Opus 5, Gemini, Grok, DeepSeek, Llama и др.)
- Настраиваемые параметры: системный промпт, температура, max_tokens, top_p, frequency_penalty, presence_penalty
- Прикрепление изображений (drag & drop, вставка из буфера, выбор из библиотеки)
- Автоопределение запросов на генерацию изображений (по ключевым словам)
- Голосовой ввод через Web Speech API с автоотправкой
- Markdown-рендеринг ответов (код, таблицы, LaTeX, списки)
- Слэш-команды (`/`) — быстрые действия
- Шаблоны промптов (кнопка с категориями)
- Копирование, перегенерация, полноэкранный режим
- Отображение баланса в реальном времени

**Edge Function**: `chat-completion`
**БД**: `chat_sessions`, `user_balances` (realtime подписка)

#### 4.2.2. Синтез речи (TTS)

- 15+ моделей TTS (GPT-4o-mini-tts, ElevenLabs, Fish Speech, Voxtral и др.)
- Выбор голоса (зависит от модели)
- Клонирование голоса: загрузка аудио или запись с микрофона + необязательная транскрипция
- История генераций с воспроизведением, редактированием, перегенерацией, удалением, скачиванием
- Конвертация записи в WAV формат

**Edge Function**: `text-to-speech`
**БД**: `tts_history`

#### 4.2.3. Распознавание речи (STT)

- 3+ модели STT (Whisper, GPT-4o-mini-transcribe, Voxtral-mini)
- Загрузка аудио или запись с микрофона
- Результат транскрипции с копированием и редактированием
- История в localStorage

**Edge Function**: `speech-to-text`

#### 4.2.4. Видео

- 25+ моделей (Veo 3.1, Sora 2 Pro, Kling 3.0, Seedance 2.5, Hailuo 3 и др.)
- Развитый ввод промпта с прикреплениями:
  - Первый кадр (изображение)
  - Последний кадр (изображение)
  - Референсное изображение
  - Референсные видео
  - Референсное аудио
- Негативный промпт
- AI-улучшение промпта (через `chat-completion`)
- **Асинхронная генерация**: отправка → поллинг каждые 5 сек → до 10 минут ожидания
- Восстановление незавершённых задач при перезагрузке (через `pending_generations`)
- История видео с просмотром, скачиванием, удалением

**Edge Functions**: `generate-video` (POST — отправка, GET — поллинг)
**БД**: `video_history`, `pending_generations`
**Storage**: `video-inputs` (загрузка референсов)

#### 4.2.5. Изображения

- 14+ моделей (GPT Image 2, Flux.2 Max, Recraft v4.1, Seedream 5 и др.)
- Настройки зависят от модели: размер, качество, соотношение сторон, разрешение, количество
- Референсные изображения (до лимита модели)
- AI-улучшение промпта с поддержкой vision
- Анимированный 4D-куб во время загрузки
- История с просмотром, скачиванием, расшариванием, отправкой обратно как референс

**Edge Function**: `generate-image`
**БД**: `image_history`
**Storage**: `generated-images`

---

### 4.3. Графический редактор (`/image-creator`)

**Figma-подобный** редактор изображений с шаблонами.

**Галерея шаблонов**:
- Категории: Продажи, Мероприятия, Цитаты и др.
- Фильтры по стилю
- Поиск
- Создание пустого холста

**Редактор**:
- **Панель слоёв**: добавление текста, прямоугольников, кругов, изображений; управление видимостью, блокировкой, порядком, дублированием, удалением
- **Панель свойств**:
  - Текст: шрифт, размер, цвет, bold/italic/underline/strikethrough, выравнивание, межстрочный интервал, тень, прозрачность
  - Фигуры: заливка, скругление углов, прозрачность
  - Изображения: замена, AI-удаление фона
- **Панель формата**: пресеты для соцсетей (Instagram, Facebook, YouTube и др.), произвольное разрешение, безопасные зоны, цвет фона
- **AI-генерация**: промпт + выбор модели + переключатель «использовать холст как референс»
- **Инструменты**: undo/redo, зум, полноэкранный режим, экспорт PNG/JPG

**Движок**: Fabric.js
**Edge Function**: `generate-image`

---

### 4.4. Конструктор рекламных роликов (`/ad-creator`)

**5-шаговый мастер** для создания мультисценовых рекламных роликов:

#### Шаг 1 — Бриф
- Тип контента, название проекта, описание, целевая аудитория
- Боль клиента, соотношение сторон, длительность сцены (4-30 сек), количество сцен (3-100)
- Стиль, референсные изображения

#### Шаг 2 — Сценарий
- AI-генерация раскадровки через `chat-completion`
- Редактируемые сцены: визуальное описание, текст на экране, голосовая реплика, промпт для изображения
- Загрузка пользовательских фото с AI-анализом

#### Шаг 3 — Изображения
- Генерация изображения для каждой сцены
- Выбор модели (6 вариантов)
- Пакетная генерация
- Референсные изображения для визуальной консистентности
- Описание персонажа для единообразия

#### Шаг 4 — Видео
- Генерация видео из изображений для каждой сцены
- Выбор модели (22 варианта)
- Редактирование промптов с AI-улучшением
- Пакетная генерация с параллельным поллингом

#### Шаг 5 — Аудио
- TTS для каждой сцены
- Выбор модели (8 вариантов) и голоса
- AI-улучшение голосовых реплик
- Плеер для прослушивания
- Пакетная генерация

**Сохранение**: Состояние целиком хранится в localStorage (`ad-creator-state`)
**Отображение стоимости**: Расчёт цены на каждом шаге

---

### 4.5. Настройки (`/settings`)

- **Профиль**: Отображаемое имя, никнейм (уникальный), email, смена пароля
- **Баланс**: Текущий баланс, пополнение (пакеты 100/500/1000/3000₽ + произвольная сумма)
- **Реферальная программа**: Комиссия 10%, реферальная ссылка с копированием, текст для расшаривания, список последних рефералов
- **Промо**: Уведомление о бесплатном периоде (до сентября 2026)
- **Тема**: Светлая / Тёмная / Системная
- **Данные**: Информация о хранилище

**Edge Function**: `create-payment`
**БД**: `user_balances`, `referrals`

---

### 4.6. Панель администратора (`/stup`)

**Доступ**: Только пользователи из таблицы `admin_users`.

**Вкладки**:

#### Dashboard
- 12 карточек со статистикой: пользователи, генерации, изображения, чаты, TTS, видео, незавершённые задачи, платежи, доход, токены в системе, рефералы
- Дельты сегодня/вчера
- Переключатель бесплатного режима (free_mode)

#### Пользователи
- Поиск, сортировка, пагинация
- Фильтры: онлайн / забаненные
- Действия: редактирование баланса, бан/разбан с указанием причины, удаление
- Просмотр генераций пользователя (изображения, видео, чаты, TTS)

#### Поддержка
- Встроенный чат поддержки (компонент `AdminSupportChat`)
- Список тикетов с непрочитанными
- Отправка сообщений от имени поддержки

#### Мониторинг
- Проверка здоровья всех AI-моделей
- Категории: чат, изображения, TTS, видео
- Статус (ok/error/timeout), задержка ответа
- Фильтр только ошибок
- Push-уведомления и звуковые оповещения при сбоях
- Email-оповещения через Resend

**Edge Functions**: `admin-data`, `model-health-check`

---

### 4.7. Чат поддержки (`/support`)

- Автосоздание/загрузка тикета
- Текстовые сообщения
- Прикрепление файлов (изображения, видео)
- Голосовые сообщения (запись с микрофона с возможностью отмены)
- Индикатор набора текста (realtime broadcast channel)
- Отметки о прочтении
- Просмотр изображений в полноэкранном режиме

**БД**: `support_tickets`, `support_messages`
**Storage**: `support-attachments`
**Realtime**: postgres_changes + broadcast channel

---

### 4.8. Статические страницы

- `/privacy` — Политика конфиденциальности (русский текст)
- `/terms` — Условия использования (русский текст)

---

## 5. Система авторизации

- **Провайдер**: Supabase Auth (email + пароль)
- **Подтверждение email**: Включено (кастомные шаблоны в `docs/email-templates/`)
- **Восстановление пароля**: Через email-ссылку → экран сброса
- **Автоматическое создание баланса**: Триггер `handle_new_user_balance` при регистрации — 1000 ₽ стартовый бонус
- **Автоматическая генерация реферального кода**: Триггер `generate_referral_code` при вставке в `user_balances`
- **Обнаружение типа сессии**: AuthProvider определяет recovery-режим и подтверждение email через URL-параметры

---

## 6. Система баланса и оплаты

### 6.1. Валюта

**1 токен = 1 рубль (₽)**

### 6.2. Стартовый бонус

1000 ₽ при регистрации (триггер `handle_new_user_balance`).

### 6.3. Пополнение

Пакеты: 100₽, 500₽, 1000₽, 3000₽ + произвольная сумма (1–10 000).
Процесс:
1. Клиент вызывает `create-payment` → создание платежа в ЮKassa
2. Пользователь перенаправляется на страницу оплаты ЮKassa
3. ЮKassa отправляет webhook → `yookassa-webhook`
4. Webhook подтверждает платёж → вызов `add_tokens` → обновление баланса

### 6.4. Списание

Каждая AI-функция:
1. **Предварительная проверка** (worst-case оценка стоимости) — 402 при нехватке
2. **Вызов внешнего API**
3. **Фактическое списание** через `deduct_tokens` (атомарное, с блокировкой строки)
4. **Для видео**: предварительное списание → возврат при ошибке через `add_tokens`

### 6.5. Бесплатный режим

Переключатель `free_mode` в `app_settings` — обходит все проверки баланса.

### 6.6. Реферальная программа

- Комиссия: 10% от пополнений приглашённого
- Код генерируется автоматически (8 символов, MD5-хеш)
- Привязка через URL-параметр `?ref=CODE`
- Таблица `referrals` отслеживает связи

---

## 7. База данных — полная схема

### 7.1. Таблицы (19 шт.)

#### `admin_users`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK, FK → auth.users | ID администратора |
| `created_at` | timestamptz | Дата добавления |

#### `app_settings`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | integer, PK, DEFAULT 1 | Всегда 1 (singleton) |
| `aitunnel_api_key` | text | API-ключ AiTunnel |
| `default_model` | text, DEFAULT 'gpt-image-1' | Модель по умолчанию |
| `default_resolution` | text, DEFAULT '1K' | Разрешение по умолчанию |
| `default_aspect_ratio` | text, DEFAULT '1:1' | Соотношение сторон |
| `updated_at` | timestamptz | Дата обновления |
| `api_key_set` | boolean | Флаг наличия ключа |
| `free_mode` | boolean, DEFAULT false | Бесплатный режим |

#### `user_balances`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK, FK → auth.users | ID пользователя |
| `tokens` | numeric, DEFAULT 10 | Баланс в ₽ |
| `created_at` | timestamptz | Создание |
| `updated_at` | timestamptz | Обновление |
| `referral_code` | text, UNIQUE | Реферальный код |
| `referred_by` | uuid, FK → auth.users | Кто привёл |
| `total_referral_earnings` | numeric, DEFAULT 0 | Заработок с рефералов |
| `nickname` | text, UNIQUE (case-insensitive) | Никнейм |
| `banned_at` | timestamptz | Дата бана |
| `ban_reason` | text | Причина бана |

#### `payments`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID платежа |
| `user_id` | uuid, FK → auth.users | Плательщик |
| `yookassa_id` | text, UNIQUE | ID платежа в ЮKassa |
| `amount` | numeric | Сумма в ₽ |
| `tokens` | integer | Количество токенов |
| `status` | text, DEFAULT 'pending' | pending / succeeded / canceled |
| `created_at` | timestamptz | Создание |
| `updated_at` | timestamptz | Обновление |

#### `referrals`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID записи |
| `referrer_id` | uuid, FK → auth.users | Пригласивший |
| `referred_id` | uuid, FK, UNIQUE | Приглашённый (один реферер) |
| `earned` | numeric, DEFAULT 0 | Заработок |
| `created_at` | timestamptz | Создание |

#### `chat_sessions`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID сессии |
| `user_id` | uuid, FK → auth.users | Владелец |
| `title` | text, DEFAULT 'Новый чат' | Название |
| `model` | text | Модель |
| `messages` | jsonb, DEFAULT '[]' | Массив сообщений |
| `created_at` | timestamptz | Создание |
| `updated_at` | timestamptz | Обновление |

#### `tts_history`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID записи |
| `user_id` | uuid, FK → auth.users | Пользователь |
| `text` | text | Исходный текст |
| `model` | text | Модель |
| `voice` | text | Голос |
| `audio_url` | text | URL аудиофайла |
| `created_at` | timestamptz | Создание |

#### `video_history`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID записи |
| `user_id` | uuid, FK → auth.users | Пользователь |
| `prompt` | text | Промпт |
| `model` | text | Модель |
| `duration` | integer, DEFAULT 5 | Длительность (сек) |
| `video_url` | text, UNIQUE | URL видеофайла |
| `created_at` | timestamptz | Создание |

#### `image_history`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID записи |
| `user_id` | uuid, FK → auth.users | Пользователь |
| `prompt` | text | Промпт |
| `model` | text | Модель |
| `image_url` | text | URL изображения |
| `created_at` | timestamptz | Создание |

#### `pending_generations`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID записи |
| `user_id` | uuid, FK → auth.users | Пользователь |
| `type` | text, DEFAULT 'video' | Тип генерации |
| `generation_id` | text | ID в AiTunnel |
| `prompt` | text | Промпт |
| `model` | text | Модель |
| `duration` | integer | Длительность |
| `aspect_ratio` | text | Соотношение сторон |
| `estimated_cost` | numeric | Оценочная стоимость |
| `status` | text, DEFAULT 'pending' | pending / completed / failed |
| `result_url` | text | URL результата |
| `error_message` | text | Сообщение об ошибке |
| `created_at` | timestamptz | Создание |
| `updated_at` | timestamptz | Обновление |

#### `generation_results`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID результата |
| `project_id` | uuid, FK → projects | Проект |
| `user_id` | uuid, FK → auth.users | Пользователь |
| `image_url` | text | URL изображения |
| `prompt` | text | Промпт |
| `variants` | jsonb, DEFAULT '[]' | Варианты |
| `settings` | jsonb, DEFAULT '{}' | Настройки |
| `created_at` | timestamptz | Создание |

#### `projects`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID проекта |
| `name` | text | Название |
| `thumbnail` | text | Превью |
| `user_id` | uuid, FK → auth.users | Владелец |
| `created_at` | timestamptz | Создание |
| `updated_at` | timestamptz | Обновление |

#### `pipeline_blocks`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID блока |
| `project_id` | uuid, FK → projects | Проект |
| `type` | text | Тип блока |
| `label` | text | Метка |
| `icon` | text | Иконка |
| `position` | integer | Порядок |
| `settings` | jsonb | Настройки |
| `created_at` | timestamptz | Создание |

#### `generation_rate_limit`
| Колонка | Тип | Описание |
|---|---|---|
| `client_key` | text, PK | Ключ клиента |
| `window_start` | timestamptz | Начало окна |
| `request_count` | integer | Число запросов |

#### `support_tickets`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID тикета |
| `user_id` | uuid, FK → auth.users | Пользователь |
| `subject` | text, DEFAULT 'Обращение в поддержку' | Тема |
| `status` | text, DEFAULT 'open' | Статус |
| `last_message_at` | timestamptz | Последнее сообщение |
| `unread_user` | integer, DEFAULT 0 | Непрочитанные (пользователь) |
| `unread_admin` | integer, DEFAULT 0 | Непрочитанные (админ) |
| `created_at` | timestamptz | Создание |

#### `support_messages`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID сообщения |
| `ticket_id` | uuid, FK → support_tickets | Тикет |
| `sender` | text | 'user' или 'admin' |
| `content` | text | Текст |
| `media_url` | text | URL вложения |
| `media_type` | text, DEFAULT 'text' | Тип: text/image/video/voice |
| `created_at` | timestamptz | Создание |

#### `shared_media`
| Колонка | Тип | Описание |
|---|---|---|
| `id` | uuid, PK | ID записи |
| `sender_id` | uuid, FK → auth.users | Отправитель |
| `receiver_id` | uuid, FK → auth.users | Получатель |
| `media_type` | text | Тип медиа |
| `media_url` | text | URL |
| `label` | text | Подпись |
| `seen` | boolean, DEFAULT false | Просмотрено |
| `created_at` | timestamptz | Создание |

#### `user_presence`
| Колонка | Тип | Описание |
|---|---|---|
| `user_id` | uuid, PK, FK → auth.users | Пользователь |
| `last_seen` | timestamptz | Последняя активность |
| `device_type` | text, DEFAULT 'desktop' | Тип устройства |
| `user_agent` | text | User-Agent |
| `created_at` | timestamptz | Создание |

---

### 7.2. Представления (Views)

| View | SQL |
|---|---|
| `user_nicknames_lookup` | `SELECT id, nickname FROM user_balances` |
| `user_nicknames_view` | `SELECT id, COALESCE(nickname, 'unknown') AS nickname FROM user_balances` |

---

### 7.3. Функции (12 шт.)

| Функция | Тип | Описание |
|---|---|---|
| `add_tokens(user_id, amount)` | SECURITY DEFINER | Атомарное начисление токенов (upsert) |
| `deduct_tokens(user_id, amount)` | SECURITY DEFINER | Атомарное списание с блокировкой строки; исключения: USER_NOT_FOUND, INSUFFICIENT_BALANCE |
| `deduct_tokens(amount integer)` | SECURITY DEFINER | Списание для текущего пользователя (auth.uid()) |
| `deduct_tokens(amount numeric)` | SECURITY DEFINER | Перегрузка для numeric |
| `claim_generation_slot(key, limit, window)` | SECURITY DEFINER | Скользящее окно rate-limiting |
| `generate_referral_code()` | TRIGGER | Автогенерация 8-символьного реферального кода |
| `handle_new_user_balance()` | TRIGGER (auth.users) | Создание баланса 1000₽ при регистрации |
| `get_user_stats()` | SECURITY DEFINER | Количество пользователей и онлайн |
| `search_users_by_nickname(query)` | INVOKER | Поиск по никнейму (санитизация, ILIKE, лимит 8) |
| `get_nicknames_by_ids(uuid[])` | INVOKER | Пакетный поиск никнеймов (макс 50 ID) |
| `increment_support_unread_admin(ticket_id)` | SQL | +1 к unread_admin |
| `increment_support_unread_user(ticket_id)` | SQL | +1 к unread_user |

---

### 7.4. Триггеры

| Триггер | Таблица | Событие | Функция |
|---|---|---|---|
| `set_referral_code` | `user_balances` | BEFORE INSERT | `generate_referral_code()` |
| *(на auth.users)* | `auth.users` | AFTER INSERT | `handle_new_user_balance()` |

---

### 7.5. Хранилище (Storage Buckets)

| Bucket | Назначение | Доступ |
|---|---|---|
| `generated-images` | Сгенерированные изображения | Приватный, RLS по user_id |
| `generated-videos` | Сгенерированные видео | Приватный, RLS по user_id |
| `tts-audio` | Аудио синтеза речи | Приватный, RLS по user_id |
| `video-inputs` | Загруженные референсы (изображения, аудио) | Приватный, RLS по user_id |
| `support-attachments` | Вложения в тикетах поддержки | Приватный, RLS + signed URLs |

---

## 8. Edge Functions (серверные функции) — 12 шт.

### 8.1. `chat-completion`
- **Метод**: POST
- **Авторизация**: JWT
- **Внешний API**: `POST https://api.aitunnel.ru/v1/chat/completions`
- **Ценообразование**: 49 моделей, ₽/миллион токенов (вход/выход). Fallback: 100/1600₽
- **Лимиты**: макс 200 сообщений, max_tokens до 16 384
- **Проверка баланса**: worst-case оценка, минимум ₽0.50
- **Ответ**: OpenAI-совместимый JSON + `tokens_remaining`, `cost_rubles`

### 8.2. `generate-image`
- **Метод**: POST
- **Внешний API**: `POST https://api.aitunnel.ru/v1/images/generations`
- **Ценообразование**: 29 моделей, ₽0.41–₽35.70 за изображение
- **Проверка баланса**: unit × 4 × n, минимум ₽2
- **Обработка**: base64 → загрузка в Storage → возврат public URL

### 8.3. `generate-video`
- **Методы**: POST (отправка), GET (поллинг по `?id=`)
- **Внешний API**: `POST/GET https://api.aitunnel.ru/v1/videos`
- **Ценообразование**: 25 моделей, ₽6.75–₽102/сек, макс 30 сек
- **Механика**: предварительное списание → поллинг → возврат при ошибке
- **Особенности**: Avatar-IV имеет отдельный формат payload; поддержка 2K/4K

### 8.4. `text-to-speech`
- **Метод**: POST
- **Внешний API**: `POST https://api.aitunnel.ru/v1/audio/speech`
- **Ценообразование**: 12 моделей, ₽124–₽20,000 за миллион символов
- **Лимит**: 4096 символов
- **Ответ**: бинарный аудиопоток (mp3/PCM)
- **Клонирование голоса**: Voxtral — base64 или Supabase Storage URL

### 8.5. `speech-to-text`
- **Метод**: POST
- **Внешний API**: `POST https://api.aitunnel.ru/v1/audio/transcriptions`
- **Ценообразование**: 3 модели, ₽0.003–₽0.017/сек
- **Лимит**: ~15 МБ аудио
- **Ответ**: `{ text, duration }` + заголовки стоимости

### 8.6. `create-payment`
- **Метод**: POST
- **Внешний API**: `POST https://api.yookassa.ru/v3/payments` (Basic auth)
- **Валюта**: RUB, 1 токен = 1₽
- **Процесс**: создание записи в `payments` → запрос к ЮKassa → возврат URL оплаты

### 8.7. `yookassa-webhook`
- **Метод**: POST
- **JWT**: Отключён (verify_jwt = false)
- **Верификация**: HMAC-SHA256 подпись или fallback-проверка через GET к ЮKassa
- **События**: `payment.succeeded` → `add_tokens`, `payment.canceled` → обновление статуса
- **Идемпотентность**: обновляет только записи со статусом 'pending'

### 8.8. `register-referral`
- **Метод**: POST
- **Процесс**: поиск реферера по коду → проверка дубликатов → INSERT в `referrals` → UPDATE `referred_by`

### 8.9. `admin-data`
- **Методы**: GET/POST с параметром `?action=`
- **Доступ**: JWT + проверка `admin_users`
- **15 действий**: stats, users, update_balance, top_up_user_balance, delete_user, ban_user, unban_user, user_generations, presence, get_support_tickets, get_support_messages, send_support_message, mark_ticket_read, get_support_unread, delete_support_ticket

### 8.10. `user-stats`
- **Метод**: GET/POST
- **JWT**: Отключён
- **Ответ**: `{ total_users, online_users }`

### 8.11. `model-health-check`
- **Метод**: GET/POST
- **Доступ**: JWT + admin
- **Процесс**: реальные запросы ко всем AI-моделям → отчёт о статусе
- **Таймауты**: Chat: 15s, Image: 180s, TTS: 20s, Video: 20s
- **Модели**: 32 чат, 22 изображения, 16 TTS, 17 видео
- **Email**: При ошибках → HTML-письмо через Resend (`monitor@avirond.com`)

### 8.12. `video-proxy`
- **Метод**: GET
- **JWT**: Отключён (используется HMAC-подпись)
- **Внешний API**: `GET https://api.aitunnel.ru/v1/videos/{id}/content`
- **Подпись**: HMAC-SHA256 от `{id}:{expires}` с секретным ключом
- **Кеш**: `Cache-Control: public, max-age=86400`

---

## 9. Переменные окружения (секреты)

| Переменная | Где используется |
|---|---|
| `VITE_SUPABASE_URL` | Фронтенд — подключение к Supabase |
| `VITE_SUPABASE_ANON_KEY` | Фронтенд — анонимный ключ |
| `SUPABASE_URL` | Все Edge Functions |
| `SUPABASE_ANON_KEY` | Все Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Все Edge Functions (административный доступ) |
| `AITUNNEL_API_KEY` | AI-функции + health check + video-proxy |
| `YOOKASSA_SHOP_ID` | create-payment, yookassa-webhook |
| `YOOKASSA_SECRET_KEY` | create-payment, yookassa-webhook |
| `RESEND_API_KEY` | model-health-check |
| `VIDEO_PROXY_SIGNING_SECRET` | video-proxy (опционально — генерируется если отсутствует) |

---

## 10. Ключевые UI-компоненты

| Компонент | Назначение |
|---|---|
| `Layout` | Основной шелл: нижняя мобильная навигация (Чат, Речь, Видео, Изображения + меню «Ещё») |
| `ModelSelector` | Модальное окно выбора LLM-моделей (30+ моделей, группировка по провайдеру, поиск, цены) |
| `VideoModelSelector` | Выбор модели видео + настройки длительности/соотношения/разрешения |
| `ImageModelSelector` | Выбор модели изображений + настройки качества/размера |
| `TTSModelSelector` | Выбор модели и голоса TTS |
| `MediaLibrary` | Модальная библиотека медиа (сгенерированные + общие) с функцией «отправить» |
| `LibraryPanel` | Полностраничная библиотека (вкладки: изображения/видео/аудио) |
| `MessageContent` | Markdown-рендерер (код, LaTeX, таблицы, списки) |
| `AdminSupportChat` | Админская панель поддержки (мультитикетный интерфейс) |
| `AnimatedBackground` | Анимированный фон с плавающими иконками + эффект прожектора от мыши |
| `ImageViewer` | Полноэкранный просмотр изображений с зумом/скачиванием/расшариванием |
| `VideoPromptInput` | Текстовое поле с inline-прикреплениями (изображения/видео/аудио + роли) |
| `PromptTemplates` | Браузер шаблонов промптов (категории: чат/изображения/видео) |
| `SlashCommandMenu` | Автодополнение по `/` для быстрых действий |
| `PWAInstallPrompt` | Баннер установки PWA |

---

## 11. Дизайн и тема

- **Темы**: Светлая / Тёмная / Системная (сохранение в localStorage)
- **Стилизация**: Tailwind CSS
- **Стеклянный эффект (glassmorphism)**: Форма авторизации, карточки
- **Анимации**: CSS-переходы, плавающие иконки на экране входа, анимация конфетти, мигание баланса при списании, 4D-куб при загрузке изображений
- **Адаптивность**: Мобильная нижняя навигация, адаптивные сетки
- **Язык интерфейса**: Русский (все тексты захардкожены)

---

## 12. Мобильное приложение (Capacitor)

- **Платформы**: iOS + Android
- **App ID**: `com.avirond.app`
- **Функции**:
  - Управление StatusBar (тёмная тема)
  - Обработка кнопки «Назад» на Android
  - Скрытие splash screen при загрузке
  - Адаптивный viewport для клавиатуры
  - Кроссплатформенное скачивание/расшаривание файлов

---

## 13. PWA

- **Service Worker**: Через `vite-plugin-pwa`
- **Иконки**: 192×192, 384×384, 512×512 (PNG + WebP)
- **Manifest**: `manifest.webmanifest`
- **Установка**: Кастомный баннер `PWAInstallPrompt` для iOS и Android

---

## 14. Пошаговая инструкция для воссоздания

### Шаг 1 — Подготовка инфраструктуры
1. Создать проект в Supabase
2. Настроить аутентификацию (email + пароль, подтверждение email)
3. Загрузить email-шаблоны (из `docs/email-templates/`)
4. Получить API-ключи: AiTunnel, ЮKassa, Resend

### Шаг 2 — База данных
1. Выполнить SQL из `database-export.sql` (таблицы, индексы, функции, триггеры)
2. Настроить RLS-политики для всех таблиц
3. Создать Storage buckets: `generated-images`, `generated-videos`, `tts-audio`, `video-inputs`, `support-attachments`
4. Настроить Storage-политики
5. Включить Realtime для: `user_balances`, `shared_media`, `support_tickets`, `support_messages`
6. Создать триггер на `auth.users` → `handle_new_user_balance()`

### Шаг 3 — Edge Functions
1. Развернуть все 12 Edge Functions
2. Настроить секреты окружения (см. раздел 9)
3. Настроить `verify_jwt: false` для: `yookassa-webhook`, `video-proxy`, `user-stats`

### Шаг 4 — Фронтенд
1. Создать React + Vite + TypeScript проект
2. Установить зависимости: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `fabric`, `lucide-react`
3. Настроить Tailwind CSS
4. Реализовать все страницы и компоненты (см. разделы 4 и 10)
5. Настроить PWA (vite-plugin-pwa)

### Шаг 5 — Оплата
1. Зарегистрироваться в ЮKassa
2. Настроить webhook URL → `{SUPABASE_URL}/functions/v1/yookassa-webhook`
3. Установить секреты `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`

### Шаг 6 — Мониторинг
1. Зарегистрироваться в Resend
2. Верифицировать домен отправителя (`monitor@avirond.com`)
3. Установить секрет `RESEND_API_KEY`

### Шаг 7 — Мобильное приложение (опционально)
1. Установить Capacitor
2. Добавить платформы iOS/Android
3. Настроить `capacitor.config.ts`
4. Собрать и опубликовать

### Шаг 8 — Администрирование
1. Добавить UUID администратора в таблицу `admin_users`
2. Настроить бесплатный режим при необходимости (через `app_settings.free_mode`)

---

## 15. Список AI-моделей (полный)

### Чат (30+ моделей)
GPT-5, GPT-5-mini, GPT-4.1, GPT-4.1-mini, GPT-4.1-nano, GPT-4o, GPT-4o-mini, o3, o3-mini, o4-mini, Claude Opus 5, Claude Sonnet 5, Claude Sonnet 4, Claude Haiku 4.5, Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 3.7, Gemini 3.5, DeepSeek v4, DeepSeek R1, DeepSeek Chat, Llama 4 Maverick, Llama 4 Scout, Llama 3.3 70B, Mistral Large, Mistral Medium, Mistral Small, Codestral, Qwen 3.8, GLM 5.3, Grok 4, Seed 2, Muse Spark

### Изображения (14+ моделей)
GPT Image 2, GPT Image 1, GPT Image 1 Mini, Muse, Gemini (несколько вариантов), Seedream 5, Seedream 4.5, Flux.2 Max/Pro/Ultra, Grok Imagine, Recraft v4.1 (несколько), Riverflow, KREA, Qwen Image

### Видео (25+ моделей)
Veo 3.1/fast/lite, Kling v3.0 Pro/Std/Turbo/O1, Sora 2 Pro, Wan 3.0/2.7/2.6, Seedance 2.5/2.0/fast/mini/1.5-pro, Hailuo 3/2.3, Gen 4.5, Aleph 2, Grok Imagine Video, Flux 3 Video, Avatar IV, HappyHorse

### TTS (12+ моделей)
GPT-4o-mini-tts, ElevenLabs (несколько), Fish Speech, Voxtral (клонирование), и другие

### STT (3+ модели)
Whisper, GPT-4o-mini-transcribe, Voxtral-mini
