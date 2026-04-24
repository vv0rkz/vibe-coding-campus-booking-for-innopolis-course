# CampusBook — Сервис бронирования ресурсов кампуса

Курсовой MVP-проект по дисциплине **«Программирование без кода»** (Innopolis University).

## Идея

Единый сервис для бронирования ресурсов университетского кампуса: переговорных комнат, аудиторий, коворкинг-зон и оборудования. Вместо хаоса в чатах — прозрачный каталог, календарь в стиле Google Calendar и бронирование в пару кликов.

**Живой сайт:** [https://campus-booking.vercel.app](https://campus-booking.vercel.app)

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
| 7 | Auth flow: роли, профиль, валидация | [hw7-auth-flow.md](notes/hw7-auth-flow.md) | [07-auth-flow.md](prompts/07-auth-flow.md) | [v7](#) | [▶ демо](https://campus-booking.vercel.app) |
| 8 | Публикация / деплой | [hw8-deploy.md](notes/hw8-deploy.md) | [08-deploy.md](prompts/08-deploy.md) | [v8](#) | [▶ демо](https://campus-booking.vercel.app) |
| 9 | Аналитика (Microsoft Clarity) | [hw9-analytics.md](notes/hw9-analytics.md) | [09-analytics.md](prompts/09-analytics.md) | [v9](#) | [▶ демо](https://campus-booking.vercel.app) |
| 10 | Paywall и монетизация | [hw10-paywall.md](notes/hw10-paywall.md) | [10-paywall.md](prompts/10-paywall.md) | [v10](#) | [▶ демо](https://campus-booking.vercel.app) |
| 11 | Безопасность MVP | [hw11-security.md](notes/hw11-security.md) | [11-security.md](prompts/11-security.md) | [v11](#) | [▶ демо](https://campus-booking.vercel.app) |

> Столбец **Демо** — статический снимок через [htmlpreview.github.io](https://htmlpreview.github.io) на момент сдачи (привязан к git-тегу) для hw3–hw5; начиная с hw6 проект задеплоен на Vercel: [campus-booking.vercel.app](https://campus-booking.vercel.app).

Дополнительно: [сравнение слабого/среднего/сильного промпта](prompts/03-weak-medium-strong-prompts.md) (урок 2).

## Что умеет продукт сейчас

- **Каталог ресурсов** с фильтрами (переговорные / коворкинги / оборудование / консультации) и поиском.
- **FullCalendar v6**: дневной вид, выбор диапазона drag-and-drop, слоты по 15 минут, индикатор текущего времени, прошедшие слоты визуально закрыты.
- **Bottom sheet бронирования**: при выборе диапазона снизу всплывает панель — не перекрывает весь экран.
- **Редактирование и удаление брони**: клик на свою бронь открывает модалку с изменением времени, назначения и кнопкой удаления.
- **Datepicker с ограничением**: Flatpickr на дате навигации, нельзя выбрать прошедшую дату.
- **Email-регистрация + вход** через Supabase Auth; тост-уведомления при успехе через Toastify.
- **Профиль пользователя**: аватар с инициалами в хедере, dropdown-меню с email / счётчиками / тарифом, отдельная модалка с редактированием display name.
- **Google Calendar интеграция**: после брони — одноклик-добавление в Google Calendar.
- **Paywall**: Free-тариф до 3 активных броней, после — экран оплаты 199 ₽.
- **Безопасность**: RLS-политики запрещают фронту менять `paid`, `success.html` — не даёт PRO.
- **Аналитика**: опциональный Microsoft Clarity через `supabase-config.js`.
- **Тёмная тема** с переключателем-иконкой.

## Версии проекта

| Тег | Коммит | Что добавлено |
|-----|--------|---------------|
| [v1](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v1) | `3beb0eb` | Начальная структура, hw1 (проблема, ЦА) |
| [v2](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v2) | `3beb0eb` | hw2 (пользователь, функции, user flow) |
| [v3-v4](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v3-v4) | `1121e99` | Лендинг + интерактивный каталог, фильтры, localStorage |
| [v4.2](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v4.2) | `598a378` | hw4.2: полная декомпозиция MVP (16 блоков) |
| [v5](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v5) | `b35e2ec` | hw5: тёмная тема, модал отмены, сортировка броней |
| [v6](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/v6) | `9c3b701` | hw6: Supabase + email-авторизация |
| v7–v11 | — | hw7: профиль, валидация, новый хедер · hw8: деплой-dok · hw9: Clarity · hw10: paywall · hw11: безопасность · + Google Calendar add-to-calendar |
| [main](https://github.com/vv0rkz/vibe-coding-campus-booking-for-innopolis-course/tree/main) | `39cdc8f` | FullCalendar v6, 15-мин слоты, bottom sheet, редактирование/удаление брони, Flatpickr, Toastify |

## Лендинг MVP

Исходный код: [`projects/campus-booking/`](projects/campus-booking/)

- `index.html` — разметка, модалки (auth, профиль, paywall, отмена), SVG-иконки
- `style.css` — стили (светлая/тёмная тема, адаптив, календарь-сетка)
- `script.js` — логика: каталог, календарь, бронирование, профиль, paywall, Clarity-init
- `success.html` — страница «оплата почти завершена» (не даёт PRO — см. hw11)
- `supabase-config.js` — URL, anon key Supabase + Clarity ID (пусто = только localStorage / без аналитики)
- `supabase-config.example.js` — шаблон конфига
- `supabase/schema.sql` — таблицы `bookings`, `profiles` и RLS

## Деплой

**Живой сайт:** [https://campus-booking.vercel.app](https://campus-booking.vercel.app)

Задеплоен через Vercel CLI из папки `projects/campus-booking/`. Supabase Auth настроен на `https://campus-booking.vercel.app` (Site URL + Redirect URLs).

Для передеплоя после изменений:
```bash
cd projects/campus-booking
vercel --prod
```

Ключи в `supabase-config.js` попадают в публичный репозиторий — это нормально для **anon key** при корректных RLS; service role в клиент не вставлять (см. hw11).

Подробности: [notes/hw8-deploy.md](notes/hw8-deploy.md).

## Структура репозитория

```
├── prompts/    — промпты, использованные при разработке с ИИ
├── projects/   — исходный код MVP
├── assets/     — изображения, макеты, скриншоты
└── notes/      — домашние задания, описания, заметки
```

## Стек

- **Frontend:** HTML, CSS, JavaScript (vanilla), инлайновые SVG-иконки
- **Данные:** localStorage по умолчанию; при заполненном `supabase-config.js` — Supabase (PostgreSQL + Auth)
- **Аналитика:** Microsoft Clarity (опционально, через конфиг)
- **Хостинг:** Vercel (статика) + Supabase (база/auth/REST)
- **AI-tools:** Cursor, ChatGPT, GigaChat, Lovable (прототипы)
