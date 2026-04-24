# Промпты — hw11: безопасность

## Контекст

CampusBook + Supabase, уже есть paywall (hw10). Нужны базовые защиты от спама и от банального «открыл `/success` → получил PRO».

---

## Промпт 1 — защитить `success.html` и `profiles.paid`

> В моём проекте есть файл `projects/campus-booking/success.html`, который открывается после нажатия «Оплатить» в paywall.
> По слайдам в учебной версии эта страница автоматически делает `UPDATE profiles set paid = true`. Это небезопасно — любой может открыть URL и получить PRO.
>
> Сделай так:
> 1. Страница `success.html` ничего не UPDATE-ит, просто текст «оплата почти завершена» + ссылка назад.
> 2. В схеме Supabase политика UPDATE на `profiles` запрещает менять `paid` даже свою строку — через `with check (paid = (select paid from profiles where id = auth.uid()))`.
> 3. В `hw11-security.md` — примеры DevTools-атак и ожидаемый отказ RLS.

## Промпт 2 — cooldown на форму бронирования

> В `script.js` добавь защиту от спама по кнопке «Забронировать»:
> - константа `BOOKING_COOLDOWN_MS = 3000`,
> - переменная `lastBookingAt`,
> - в `handleBookingSubmit` первым делом проверяй: если `Date.now() - lastBookingAt < BOOKING_COOLDOWN_MS` → показать сообщение «Подождите немного — попробуйте через N сек» и прервать.
> После успешного insert — обновить `lastBookingAt = Date.now()`.

## Промпт 3 — «Я не робот»

> В форму подтверждения брони добавь чекбокс «Я не робот» (обычный `<input type="checkbox" required>`). До подтверждения submit не должен проходить. В JS — явная проверка `if (!notRobot)` с понятной ошибкой.
> Объясни, что это не реальная защита от ботов, но UX-замок против случайного двойного клика и дешёвых автоматов. Для продакшна — hCaptcha / Cloudflare Turnstile.

## Промпт 4 — план серверной защиты

> Опиши минимальный набор серверных мер безопасности для этого проекта (Vercel + Supabase):
> 1. Serverless webhook для платёжки (единственный, кто может поднять `paid=true`, через service_role).
> 2. CSP-заголовки в `vercel.json` — какие именно домены разрешить (Supabase, Clarity, Unsplash).
> 3. Rate limit на уровне бэкенда (Edge Function + Redis) для insert-ов в bookings.
> 4. Когда имеет смысл переходить с localStorage-сессий на HttpOnly-куки.
> Формат: короткое описание + код `vercel.json` для CSP.
