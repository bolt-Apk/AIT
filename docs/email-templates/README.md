# Брендированные шаблоны писем AI-taip

Шесть шаблонов для Supabase Authentication:

| Файл | Тип письма | Вкладка в Supabase | Тема письма (Subject) |
|------|-----------|-------------------|----------------------|
| `confirm-signup.html` | Подтверждение регистрации | Confirm signup | Подтвердите email — AI-taip |
| `invite-user.html` | Приглашение | Invite user | Приглашение в AI-taip |
| `magic-link.html` | Вход по ссылке | Magic link | Вход в AI-taip |
| `change-email.html` | Смена email | Change email address | Подтвердите новый email — AI-taip |
| `reset-password.html` | Сброс пароля | Reset password | Сброс пароля — AI-taip |
| `reauthentication.html` | Код подтверждения | Reauthentication | Код подтверждения — AI-taip |

## Как установить

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Authentication** → **Email Templates**
4. Для каждого типа письма:
   - Выберите нужную вкладку (см. таблицу выше)
   - Скопируйте содержимое соответствующего `.html` файла
   - Вставьте в поле **Body**
   - В поле **Subject** укажите тему из таблицы
5. Нажмите **Save**

## Переменные

- `{{ .ConfirmationURL }}` — ссылка подтверждения (используется во всех шаблонах кроме Reauthentication)
- `{{ .Token }}` — одноразовый код (используется в Reauthentication)
