# Брендированные шаблоны писем AviRond

Шесть шаблонов для Supabase Authentication:

| Файл | Тип письма | Вкладка в Supabase | Тема письма (Subject) |
|------|-----------|-------------------|----------------------|
| `confirm-signup.html` | Подтверждение регистрации | Confirm signup | Подтвердите email — AviRond |
| `invite-user.html` | Приглашение | Invite user | Приглашение в AviRond |
| `magic-link.html` | Вход по ссылке | Magic link | Вход в AviRond |
| `change-email.html` | Смена email | Change email address | Подтвердите новый email — AviRond |
| `reset-password.html` | Сброс пароля | Reset password | Сброс пароля — AviRond |
| `reauthentication.html` | Код подтверждения | Reauthentication | Код подтверждения — AviRond |

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
