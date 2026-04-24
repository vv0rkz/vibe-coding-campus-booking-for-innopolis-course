# Промпты — hw8: публикация

## Контекст

CampusBook — статический фронт (vanilla HTML/CSS/JS) + Supabase. Нужно выбрать вариант деплоя, опубликовать, настроить Supabase Auth под новый домен.

---

## Промпт 1 — выбор варианта деплоя

> Сравни 4 варианта публикации для статического сайта с Supabase-бэкендом: htmlpreview.github.io, GitHub Pages, Vercel, VPS.
> Критерии: скорость деплоя, работа с env-переменными, поддержка кастомного домена, цена, когда нужен бэкенд (webhook платёжки).
> Дай таблицу плюсов/минусов и одну рекомендацию под учебный MVP.

## Промпт 2 — деплой на Vercel

> У меня папка `projects/campus-booking/` с тремя файлами (index.html, style.css, script.js) и подпапкой `vendor/`. Никакого npm/build. Как развернуть это на Vercel через CLI?
> Нужно: команды по порядку, как настроить корневую папку, как сделать preview-деплой и как — production.

## Промпт 3 — Supabase Auth после деплоя

> У меня задеплой https://campus-booking.vercel.app. Регистрация и magic link ведут на localhost, хотя я вроде бы всё переключил.
> Опиши, что именно надо поставить в **Supabase → Authentication → URL Configuration** (Site URL, Redirect URLs), чтобы magic link / password reset возвращали пользователя на прод, но при этом локальный dev на `http://localhost:8000` продолжал работать.

## Промпт 4 — webhook платёжки (план на hw11)

> CampusBook имеет paywall (таблица `profiles.paid`). Сейчас фронт сам пишет paid=true — это небезопасно.
> Предложи минимальную архитектуру webhook-а: Vercel Serverless Function `api/payment-webhook.js`, которая принимает POST от ЮKassa, проверяет подпись, и через supabase service_role ставит `paid = true` только после подтверждённого платежа. Что должно лежать в env-переменных Vercel, что — в `profiles` RLS.
