# Промпт 6 — Подключение базы данных и авторизация

## Контекст
Урок 6. Задача: подключить Supabase для бронирований, добавить вход по email/паролю. Ресурсы можно оставить в константе `RESOURCES`.

## Промпты

### Промпт 1: Интеграция с Supabase

> Подключи проект к Supabase по URL и anon key из `supabase-config.js`. Если ключи пустые — оставь режим localStorage. Если заданы — сохраняй и читай бронирования из таблицы `bookings` (поля: user_id, user_name, resource_id text, date, start_time, end_time, purpose, status). Ресурсы не выноси в БД. Сохрани проверку пересечения слотов.

### Промпт 2: Авторизация

> Добавь Supabase Auth: модальное окно с вкладками «Вход» и «Регистрация» (email + пароль). В шапке — «Войти» или email + «Выйти». Без входа скрой форму бронирования и покажи приглашение войти.

### Промпт 3: RLS

> Создай SQL для таблицы `bookings` и политики RLS: INSERT только со своим user_id; UPDATE только свои строки; SELECT — свои строки или все со status = active (для проверки конфликтов на клиенте).

## Результат
Реализация в `projects/campus-booking/` (`script.js`, `supabase-config.js`, `supabase/schema.sql`). Описание в `notes/hw6-database-auth.md`.
