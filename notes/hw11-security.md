# Домашнее задание 11 — Безопасность MVP

## Проект: CampusBook — сервис бронирования ресурсов кампуса

---

## Риски в MVP (по лекции) и что с ними у нас

### 1. Доступ без проверки
**Риск:** «продукт верит, что пользователь честный» → кто-то открывает прямую ссылку `/success` и получает PRO бесплатно.

**Как ломают:**
```
Пользователь → открывает https://campus-booking.vercel.app/success.html
        → если страница автоматически делает UPDATE paid=true → PRO получен бесплатно
```

**Защита в CampusBook:**
- `success.html` **не** обновляет `profiles.paid`. Эта страница — просто landing («Оплата почти завершена»).
- В RLS таблицы `profiles` политика UPDATE запрещает менять `paid` даже свою строку (см. `schema.sql`, `profiles_update_own_name`).
- Обновление `paid` = только service_role (Vercel Serverless webhook, см. ниже).

### 2. Открытые данные
**Риск:** чужие брони, чужие emailы, возможность вписать что угодно в чужую запись.

**Защита:**
- RLS `bookings`: SELECT своих + активных (для проверки пересечений, без user_name и purpose на стороне клиента это всё равно ок, но в будущем можно отрезать), INSERT только со своим `user_id`, UPDATE только свои.
- RLS `profiles`: SELECT/INSERT/UPDATE только свои, `paid` защищён дополнительно.
- Anon key в клиенте безопасен при корректном RLS. Service role в клиент **не попадает**.

### 3. Логика оплаты на фронте
**Риск:** кнопка «Оплатить» на фронте просто ставит флаг — любой человек с DevTools делает то же самое без денег.

**Защита:**
- Фронт не пишет `paid = true` нигде (см. grep по `paid` в `script.js` — только чтение).
- Webhook платёжки (план) — единственный способ выставить `paid`.

### 4. Нет ограничений на действия
**Риск:** спам, перегруз, расходы.

**Защита (реализовано):**
- **Cooldown** на бронирование: между попытками минимум 3 сек (константа `BOOKING_COOLDOWN_MS`). Если быстрее — пользователь видит «Подождите немного…».
- **Чекбокс «Я не робот»** в форме бронирования — обязательное подтверждение перед submit.
- **Native validation** на всех инпутах — отсекает мусор ещё до запроса в базу (hw7).
- Supabase Auth сам ограничивает частоту попыток логина/signup.

---

## Что реализовано в коде (hw11)

### 1. Cooldown на бронирование

```js
const BOOKING_COOLDOWN_MS = 3000;
let lastBookingAt = 0;

async function handleBookingSubmit(e) {
  const now = Date.now();
  if (now - lastBookingAt < BOOKING_COOLDOWN_MS) {
    const wait = Math.ceil((BOOKING_COOLDOWN_MS - (now - lastBookingAt)) / 1000);
    return showBookingError(`Подождите немного — попробуйте через ${wait} сек.`);
  }
  // ... после успешного submit
  lastBookingAt = now;
}
```

Это локальная защита — она не мешает злоумышленнику, но останавливает случайный двойной клик / нервное нажатие. Реальный rate-limit должен быть в базе (Edge Function с Redis-токен-бакетом) или в политиках Supabase.

### 2. «Я не робот»

Обычный чекбокс с `required` в форме подтверждения брони. Не защита от ботов (они умеют клацать), а **UX-замок** против случайного submit и против копипаст-ботов в учебном формате. В реальном MVP — hCaptcha / Turnstile Cloudflare.

### 3. `/success.html` не даёт PRO

Страница статическая: текст + ссылка обратно. Никаких `sbClient.from('profiles').update()`.

### 4. RLS на `profiles.paid`

```sql
-- UPDATE своего профиля, НО paid должен остаться прежним
create policy "profiles_update_own_name"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and paid = (select paid from public.profiles where id = auth.uid())
  );
```

Т.е. даже если злоумышленник сделает в DevTools:
```js
await sbClient.from('profiles').update({ paid: true }).eq('id', currentUser.id);
```
— получит `new row violates row-level security policy`.

### 5. Нет секретов на фронте

В `supabase-config.js`:
- `SUPABASE_URL` — публичный, ок.
- `SUPABASE_ANON_KEY` — публичный, защита через RLS.
- Clarity ID — публичный, ок (лежит в JS).
- **Нет**: `SERVICE_ROLE_KEY`, `CLOUDPAYMENTS_SECRET`, email-SMTP пароля.

---

## План серверной защиты (то, что за рамками курса)

Для реальной продакшн-защиты нужно добавить:

1. **Vercel Serverless Function `api/payment-webhook.js`**
   - принимает POST от ЮKassa,
   - проверяет HMAC-подпись тела,
   - через `createClient(URL, SERVICE_ROLE_KEY)` делает `update profiles set paid = true where id = <user_id из payload>`,
   - возвращает 200 строго после успешного UPDATE.

2. **Rate limit на Supabase Edge Function** — 10 броней/час/user через токен-бакет в Redis Upstash.

3. **CSP-заголовок** в `vercel.json`:
   ```json
   {
     "headers": [{ "source": "/(.*)", "headers": [
       { "key": "Content-Security-Policy",
         "value": "default-src 'self'; script-src 'self' https://www.clarity.ms; connect-src 'self' https://*.supabase.co https://*.clarity.ms; img-src 'self' https://images.unsplash.com data:; style-src 'self' 'unsafe-inline';" }
     ]}]
   }
   ```
   — блокирует большинство XSS-векторов.

4. **HttpOnly-cookies** для сессии вместо localStorage (supabase-js это умеет через `auth.storageKey` + кастомный storage → требует собственного API-роута на Vercel). Минимизирует XSS-последствия.

5. **Регулярный аудит через `npm audit` / Snyk** — у нас только один зависимый ресурс (supabase-js в vendor), но всё равно стоит обновлять.

---

## Ручная проверка безопасности

| Атака | Команда в DevTools Console | Ожидание |
|---|---|---|
| Поставить себе PRO прямым UPDATE | `await window.supabase.createClient(...).from('profiles').update({paid:true}).eq('id', myId)` | `row violates RLS` |
| Прочитать чужой email из profiles | `.from('profiles').select('*').neq('id', myId)` | `[]` (RLS отсекает) |
| Создать бронь с чужим user_id | `.from('bookings').insert({user_id:'other',...})` | `row violates RLS` (с check user_id = auth.uid()) |
| Быстро забронировать 10 раз | 10× click на «Забронировать» | 1 запрос, остальные блокируются cooldown-ом |
| Открыть `/success.html` без оплаты | вручную зайти по URL | Просто статическая страница, никаких UPDATE |
| Отправить форму без «Я не робот» | снять галку и submit | `showBookingError('Подтвердите «Я не робот»')` |

---

## Что осталось

- Реальный webhook платёжного провайдера.
- CSP-заголовки в `vercel.json`.
- hCaptcha / Cloudflare Turnstile вместо «Я не робот».
- Аудит лога Supabase (логины с разных IP в короткий промежуток → alert).
