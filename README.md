# CampusBook — Сервис бронирования ресурсов кампуса

Курсовой MVP-проект по дисциплине **«Программирование без кода»** (Innopolis University).

## Идея

Единый сервис для бронирования ресурсов университетского кампуса: переговорных комнат, аудиторий, коворкинг-зон и оборудования. Вместо хаоса в чатах — прозрачный каталог, календарь и бронирование в пару кликов.

## Домашние задания

| # | Тема | Документ | Промпт | Версия | Демо |
|---|------|----------|--------|--------|------|
| 1 | Проблема, ЦА, ценность MVP | [hw1-problem-audience-value.md](notes/hw1-problem-audience-value.md) | [01-idea-generation.md](prompts/01-idea-generation.md) | [v1](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v1) | — |
| 2 | Пользователь, функции, user flow | [hw2-user-functions-userflow.md](notes/hw2-user-functions-userflow.md) | [02-mvp-scope.md](prompts/02-mvp-scope.md) | [v2](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v2) | — |
| 3 | Лендинг с интерактивными сценариями | [hw3-landing-interactive.md](notes/hw3-landing-interactive.md) | [04-landing-generation.md](prompts/04-landing-generation.md) | [v3-v4](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v3-v4) | [▶ демо](https://htmlpreview.github.io/?https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/blob/v3-v4/projects/campus-booking/index.html) |
| 4 | Улучшения MVP, архитектура | [hw4-improvements-architecture.md](notes/hw4-improvements-architecture.md) | [05-mvp-improvements.md](prompts/05-mvp-improvements.md) | [v3-v4](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v3-v4) | [▶ демо](https://htmlpreview.github.io/?https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/blob/v3-v4/projects/campus-booking/index.html) |
| 4.2 | Декомпозиция MVP (16 блоков) | [hw4_2-mvp-decomposition-table.md](notes/hw4_2-mvp-decomposition-table.md) | — | [v4.2](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v4.2) | [▶ демо](https://htmlpreview.github.io/?https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/blob/v4.2/projects/campus-booking/index.html) |
| 5 | Улучшения MVP через Cursor | [hw5-cursor-improvements.md](notes/hw5-cursor-improvements.md) | [05-cursor-improvements.md](prompts/05-cursor-improvements.md) | [v5](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v5) | [▶ демо](https://htmlpreview.github.io/?https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/blob/v5/projects/campus-booking/index.html) |
| 6 | Подключение БД и авторизация | [hw6-database-auth.md](notes/hw6-database-auth.md) | [06-database-auth.md](prompts/06-database-auth.md) | [v6](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v6) | [▶ демо](https://campus-booking.vercel.app) |

> Столбец **Демо** — статический снимок проекта через [htmlpreview.github.io](https://htmlpreview.github.io) на момент сдачи домашки (привязан к git-тегу), без отдельного деплоя. hw6 задеплоен полноценно на Vercel: [campus-booking.vercel.app](https://campus-booking.vercel.app).

Дополнительно: [сравнение слабого/среднего/сильного промпта](prompts/03-weak-medium-strong-prompts.md) (урок 2).

## Версии проекта

| Тег | Коммит | Что добавлено |
|-----|--------|---------------|
| [v1](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v1) | `3beb0eb` | Начальная структура, hw1 (проблема, ЦА) |
| [v2](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v2) | `3beb0eb` | hw2 (пользователь, функции, user flow) |
| [v3-v4](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v3-v4) | `1121e99` | Лендинг + интерактивный каталог, фильтры, localStorage |
| [v4.2](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v4.2) | `598a378` | hw4.2: полная декомпозиция MVP (16 блоков) |
| [v5](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v5) | `b35e2ec` | hw5: тёмная тема, модал отмены, сортировка броней |
| [v6](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v6) | `9c3b701` | hw6: Supabase + email-авторизация (реальный проект подключён) |

## Лендинг MVP

Исходный код: [`projects/campus-booking/`](projects/campus-booking/)

- `index.html` — разметка, модалки (отмена брони, вход/регистрация)
- `style.css` — стили (светлая/тёмная тема, адаптив)
- `script.js` — логика: каталог, фильтры, поиск, бронирование, **localStorage или Supabase** (см. hw6)
- `supabase-config.js` — URL и anon key Supabase (пусто = только localStorage)
- `supabase-config.example.js` — шаблон конфига
- `supabase/schema.sql` — создание таблицы `bookings` и RLS в Supabase

## Деплой

**Живой сайт:** [https://campus-booking.vercel.app](https://campus-booking.vercel.app)

Задеплоен через Vercel CLI из папки `projects/campus-booking/`. Supabase Auth настроен на `https://campus-booking.vercel.app` (Site URL + Redirect URLs).

Для передеплоя после изменений:
```bash
cd projects/campus-booking
vercel --prod
```

Ключи в `supabase-config.js` попадают в публичный репозиторий — это нормально для **anon key** при корректных RLS; service role в клиент не вставлять.

## Структура репозитория

```
├── prompts/    — промпты, использованные при разработке с ИИ
├── projects/   — исходный код MVP
├── assets/     — изображения, макеты, скриншоты
└── notes/      — домашние задания, описания, заметки
```

## Стек

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Данные:** localStorage по умолчанию; при заполненном `supabase-config.js` — Supabase (PostgreSQL + Auth)
- **AI-tools:** Cursor, ChatGPT, GigaChat
