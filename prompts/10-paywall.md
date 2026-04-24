# Промпты — hw10: paywall

## Контекст

CampusBook = vanilla HTML/CSS/JS + Supabase. Есть таблица `bookings` и email-авторизация. Нужно добавить бесплатный лимит (3 активные брони), paywall-модалку, страницу `/success.html`.

---

## Промпт 1 — схема profiles + RLS

> У меня в Supabase уже есть таблица `bookings` с RLS.
> Добавь таблицу `profiles (id uuid PK → auth.users, email, display_name, paid boolean default false, ...)`, политики RLS:
> - SELECT — только свой профиль,
> - INSERT — только свой, и `paid` в insert-е может быть только `false`,
> - UPDATE — свой, но `paid` изменять нельзя (сравнение: `check (paid = старое значение)`).
> Это нужно чтобы фронт не мог обмануть paywall через прямой UPDATE.

## Промпт 2 — логика paywall на клиенте

> Обнови `script.js`:
> - при submit формы бронирования, если `useSupabase && currentProfile && !currentProfile.paid`, посчитай сколько у пользователя активных (`status='active'`) броней,
> - если ≥ `FREE_BOOKING_LIMIT = 3` — открой модалку `#paywall-modal` и прерви submit,
> - иначе — обычный flow.
> Вынеси `FREE_BOOKING_LIMIT` в константу.

## Промпт 3 — страница /success.html

> Сделай отдельный файл `success.html` в той же папке:
> - подключает ту же `style.css`,
> - показывает иконку часов, заголовок «Оплата почти завершена», пояснение «доступ активируется после подтверждения webhook-ом платёжки»,
> - кнопку «Вернуться в приложение» → `index.html`.
> **Важно:** страница не должна делать `UPDATE profiles set paid = true`. Мы идём сразу к безопасной версии (hw11). В комментарии к странице оставь заметку, что здесь в реальном продакте подключается webhook ЮKassa.

## Промпт 4 — paywall UI и «Мой профиль»

> Добавь в `index.html` модалку `#paywall-modal` в стиле остальных модалок:
> - иконка замка + заголовок,
> - текст про лимит 3 брони,
> - буллеты PRO-фич,
> - кнопка «Оплатить 199 ₽» → ведёт на `success.html`.
> В модалке «Мой профиль» добавь плашку с текущим тарифом (Free / PRO) на основе `profiles.paid`. В dropdown-меню аватара в мини-счётчиках добавь строку «Тариф: Free» или «Тариф: PRO».
