# Домашнее задание 9 — Аналитика MVP (Microsoft Clarity)

## Проект: CampusBook — сервис бронирования ресурсов кампуса

---

## Зачем

Мы не знаем:
- куда реально кликают пользователи (и замечают ли они CTA «Забронировать» в каталоге),
- где они «теряются» — на лендинге, на календаре или на auth-модалке,
- работает ли новый Google-Calendar-style календарь на мобильных (узкие слоты 20 px могут промахиваться под палец).

Интуиция ≠ реальность. Аналитика — реальные записи поведения.

---

## Почему Clarity

| Инструмент | Сложность | Что даёт | Цена |
|---|---|---|---|
| **Microsoft Clarity** | 1 `<script>` | Записи сессий, heatmaps, клики, движения мыши | Бесплатно, без лимитов |
| Google Analytics 4 | Конфиг, события | События, воронки, акквизиция | Бесплатно |
| Яндекс.Метрика | Конфиг + вебвизор | Вебвизор ≈ Clarity, карты скролла | Бесплатно |
| Posthog / Amplitude | SDK, события | Продуктовые метрики, эксперименты | Freemium |

Для учебного MVP Clarity — минимум работы, максимум инсайтов. GA4 добавим позже, когда будут гипотезы про каналы.

---

## Как это работает

```
Пользователь → CampusBook → JS-скрипт Clarity →
  → события и запись в облако Clarity →
  → dashboard: Recordings / Heatmaps / Insights
```

Скрипт асинхронный, не блокирует рендер.

---

## Типы данных

| Тип | Когда появляется | Где смотреть |
|---|---|---|
| **Recordings** (видео-записи) | сразу, после первой сессии | `clarity.microsoft.com → Recordings` |
| **Heatmaps** (клики, скролл) | через несколько часов, нужен минимум трафика | `Heatmaps` |
| **Dashboard / Insights** | на следующий день | `Dashboard` |

---

## Как подключили

### 1. Регистрация

1. `clarity.microsoft.com` → войти через Microsoft / Google.
2. Create new project → Name: `CampusBook`, Website: `https://campus-booking.vercel.app`, Category: `Business`.
3. Settings → Install → **Install manually** → скопировать tracking ID (10-символьная строка).

### 2. Интеграция в код

Чтобы tracking ID не хардкодился и можно было быстро выключить аналитику на локалке, он вынесен в `supabase-config.js`:

```js
window.CAMPUSBOOK_CLARITY_ID = 'abcd1234ef'; // пусто = выключено
```

В `script.js` (функция `initClarity`) при загрузке страницы инжектится стандартный snippet, если ID задан:

```js
function initClarity() {
  const id = (window.CAMPUSBOOK_CLARITY_ID || '').trim();
  if (!id) return;
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", id);
}
```

`initClarity()` вызывается в обработчике `DOMContentLoaded` **до** Supabase-инициализации, чтобы посчитать даже гостевые сессии.

### 3. Проверка

1. Открыть прод в инкогнито, походить по сайту ~30 сек.
2. В DevTools → Network должен быть запрос на `clarity.ms/tag/<ID>` → 200 OK.
3. Через ~1–2 минуты в Clarity Dashboard → Recordings появится первая запись.

### 4. Что смотрим

На старте — 2 гипотезы:

| Гипотеза | Что ищем в Clarity |
|---|---|
| Пользователи находят кнопку «Выбрать для брони» на карточках ресурсов | Heatmap секции `#resources`: клики на `.card-cta`? |
| Новый календарь работает на мобилках (слоты 20 px) | Recordings с mobile viewport: есть «rage clicks» / промахи? |

---

## Что важно по приватности

- Clarity по умолчанию **маскирует** тексты в инпутах (пароли, email). В настройках проверьте что `Masking` не снижен до «Relaxed».
- `Content Security Policy`: если прикрутим CSP-заголовок, надо разрешить `script-src 'unsafe-inline' https://www.clarity.ms` и `connect-src https://*.clarity.ms`.
- В политике приватности (если MVP выйдет за пределы курса) — упомянуть Clarity как суб-процессор Microsoft и добавить opt-out.

---

## Что осталось

- Добавить **кастомные события** (`clarity('set', 'hw_step', '...')`) для воронки: «открыл календарь» → «выбрал слот» → «подтвердил бронь». Сейчас фиксируем только то, что Clarity ловит автоматически.
- Завести **Dashboard alerts** на rage-clicks по критичным элементам.
- Подумать про GA4 для источников трафика, когда будут рекламные кампании.
