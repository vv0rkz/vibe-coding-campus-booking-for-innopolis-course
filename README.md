# CampusBook — Сервис бронирования ресурсов кампуса

Курсовой MVP-проект по дисциплине **«Программирование без кода»** (Innopolis University).

## Идея

Единый сервис для бронирования ресурсов университетского кампуса: переговорных комнат, аудиторий, коворкинг-зон и оборудования. Вместо хаоса в чатах — прозрачный каталог, календарь и бронирование в пару кликов.

## Домашние задания

| # | Тема | Документ | Промпт |
|---|------|----------|--------|
| 1 | Проблема, ЦА, ценность MVP | [hw1-problem-audience-value.md](notes/hw1-problem-audience-value.md) | [01-idea-generation.md](prompts/01-idea-generation.md) |
| 2 | Пользователь, функции, user flow | [hw2-user-functions-userflow.md](notes/hw2-user-functions-userflow.md) | [02-mvp-scope.md](prompts/02-mvp-scope.md) |
| 3 | Лендинг с интерактивными сценариями | [hw3-landing-interactive.md](notes/hw3-landing-interactive.md) | [04-landing-generation.md](prompts/04-landing-generation.md) |
| 4 | Улучшения MVP, архитектура | [hw4-improvements-architecture.md](notes/hw4-improvements-architecture.md) | [05-mvp-improvements.md](prompts/05-mvp-improvements.md) |

Дополнительно: [сравнение слабого/среднего/сильного промпта](prompts/03-weak-medium-strong-prompts.md) (урок 2).

## Лендинг MVP

Исходный код: [`projects/campus-booking/`](projects/campus-booking/)

- `index.html` — разметка страницы
- `style.css` — стили (адаптивный, современный UI)
- `script.js` — логика (каталог, фильтры, поиск, бронирование, localStorage, статистика, экспорт)

## Структура репозитория

```
├── prompts/    — промпты, использованные при разработке с ИИ
├── projects/   — исходный код MVP
├── assets/     — изображения, макеты, скриншоты
└── notes/      — домашние задания, описания, заметки
```

## Стек

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Данные:** localStorage (MVP), Supabase (план)
- **AI-tools:** Cursor, ChatGPT, GigaChat
