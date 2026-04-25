/* ============================================================
   CampusBook — основной скрипт
   Модули:
   - state + Supabase init
   - каталог ресурсов (cards)
   - календарь (day view, клик-клик range)
   - профиль (read/update display_name + paid)
   - paywall (лимит free-броней)
   - валидация форм
   - Google Calendar "Add to Calendar"
   - Microsoft Clarity init (из config)
   ============================================================ */

// ===== Resource data =====
const DEFAULT_RESOURCES = [
  { id: 'r1', name: 'Переговорная «Эврика»', type: 'room', description: 'Светлая комната на 6 человек с проектором и маркерной доской.', floor: 3, capacity: 6, img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop' },
  { id: 'r2', name: 'Переговорная «Спринт»', type: 'room', description: 'Компактная переговорка для быстрых стендапов.', floor: 2, capacity: 4, img: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=400&fit=crop' },
  { id: 'r3', name: 'Коворкинг «Хаб»', type: 'coworking', description: 'Открытое пространство на 20 мест для самоподготовки.', floor: 1, capacity: 20, img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop' },
  { id: 'r4', name: 'Зона «Лофт»', type: 'coworking', description: 'Уютное пространство для мозговых штурмов.', floor: 4, capacity: 12, img: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=600&h=400&fit=crop' },
  { id: 'r5', name: 'Проектор Epson EB-U50', type: 'equipment', description: 'Переносной проектор Full HD. Выдача на ресепшн.', floor: 1, capacity: 1, img: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=400&fit=crop' },
  { id: 'r6', name: 'Консультация — проф. Иванова', type: 'consultation', description: 'ML и анализ данных. 30-минутные слоты.', floor: 5, capacity: 1, img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop' },
];
let RESOURCES = DEFAULT_RESOURCES.map(r => ({ ...r }));

const TYPE_LABELS = { room: 'Переговорная', coworking: 'Коворкинг', equipment: 'Оборудование', consultation: 'Консультация' };
const BADGE_CLASSES = { room: 'badge-room', coworking: 'badge-coworking', equipment: 'badge-equipment', consultation: 'badge-consultation' };

// ===== Calendar config =====
const CAL_START_HOUR = 8;
const CAL_END_HOUR = 22;
const SLOT_MIN = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (CAL_END_HOUR - CAL_START_HOUR) * SLOTS_PER_HOUR;

// ===== Paywall config =====
const FREE_BOOKING_LIMIT = 3;

// ===== State =====
let sbClient = null;
let useSupabase = false;
let currentUser = null;
let currentProfile = null; // { display_name, paid }
let bookingsCache = [];
let authMode = 'login';

let calResourceId = RESOURCES[0].id;
let calDate = todayISO();
let selStart = null; // slot index [0..TOTAL_SLOTS]
let selEnd = null;   // slot index (exclusive)
let fcCalendar = null; // FullCalendar instance
let isSubmitting = false;

// ===== Helpers =====
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateRu(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
}
function slotIndexToTime(i) {
  const totalMin = CAL_START_HOUR * 60 + i * SLOT_MIN;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function timeToSlotIndex(t) {
  const [h, m] = t.split(':').map(Number);
  return (h - CAL_START_HOUR) * SLOTS_PER_HOUR + Math.floor(m / SLOT_MIN);
}
function isoToDateObj(iso, time) { return new Date(iso + 'T' + (time || '00:00') + ':00'); }

function loadBookingsFromLS() {
  try { return JSON.parse(localStorage.getItem('campusbook_bookings')) || []; }
  catch { return []; }
}
function persistLocalBookings() {
  if (!useSupabase) localStorage.setItem('campusbook_bookings', JSON.stringify(bookingsCache));
}
function isSupabaseConfigured() {
  const c = window.CAMPUSBOOK_SUPABASE || {};
  return !!(c.url && c.anonKey && String(c.url).trim().startsWith('http'));
}
function rowToBooking(row) {
  return {
    id: row.id, userName: row.user_name, resourceId: row.resource_id,
    date: row.date, startTime: row.start_time, endTime: row.end_time,
    purpose: row.purpose, status: row.status, createdAt: row.created_at,
    _userId: row.user_id,
  };
}
function getMyBookings() {
  if (!useSupabase) return bookingsCache;
  return bookingsCache.filter(b => b._userId === currentUser?.id);
}
function getActiveBookings(list) { return list.filter(b => b.status === 'active'); }

// ===== Connectivity check =====
async function checkSupabaseReachable(url, anonKey) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url + '/rest/v1/', {
      signal: ctrl.signal,
      headers: { apikey: anonKey },
    });
    clearTimeout(t);
    return res.status < 500;
  } catch {
    return false;
  }
}

function showOfflineBanner(reason) {
  const b = document.getElementById('offline-banner');
  if (b) { b.textContent = reason; b.classList.remove('hidden'); }
}
function hideOfflineBanner() {
  document.getElementById('offline-banner')?.classList.add('hidden');
}

// ===== Supabase init =====
async function initSupabaseAndAuth() {
  if (!isSupabaseConfigured()) {
    useSupabase = false; sbClient = null; currentUser = null; currentProfile = null;
    bookingsCache = loadBookingsFromLS();
    updateAuthUI(); updateBookingGate(); return;
  }
  const createClient = window.supabase?.createClient;
  if (typeof createClient !== 'function') {
    console.warn('Supabase JS не загружен — fallback в localStorage');
    useSupabase = false; bookingsCache = loadBookingsFromLS();
    updateAuthUI(); updateBookingGate(); return;
  }
  const cfg = window.CAMPUSBOOK_SUPABASE;

  // Connectivity check — detect VPN/region block
  const reachable = await checkSupabaseReachable(cfg.url.trim(), cfg.anonKey.trim());
  if (!reachable) {
    showOfflineBanner('⚠️ Supabase недоступен (возможно, заблокирован провайдером). Работаем в оффлайн-режиме (localStorage). Попробуйте VPN.');
    useSupabase = false; sbClient = null; currentUser = null; currentProfile = null;
    bookingsCache = loadBookingsFromLS();
    updateAuthUI(); updateBookingGate(); return;
  }
  hideOfflineBanner();

  useSupabase = true;
  sbClient = createClient(cfg.url.trim(), cfg.anonKey.trim());

  const { data: { session } } = await sbClient.auth.getSession();
  currentUser = session?.user ?? null;
  await loadProfile();

  sbClient.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user ?? null;
    await loadProfile();
    updateAuthUI(); updateBookingGate();
    await refreshBookings();
    renderCalendar();
  });

  await refreshBookings();
  updateAuthUI(); updateBookingGate();
}

async function loadProfile() {
  if (!useSupabase || !currentUser) { currentProfile = null; return; }
  const { data, error } = await sbClient
    .from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
  if (error) { console.warn('profiles load:', error.message); currentProfile = null; return; }
  if (!data) {
    const display_name = (currentUser.user_metadata?.display_name || (currentUser.email || '').split('@')[0] || 'Пользователь').slice(0, 60);
    const { data: ins, error: insErr } = await sbClient
      .from('profiles').insert({ id: currentUser.id, email: currentUser.email, display_name, paid: false })
      .select().single();
    if (insErr) { console.warn('profiles insert:', insErr.message); currentProfile = null; return; }
    currentProfile = ins;
  } else {
    currentProfile = data;
  }
}

async function refreshBookings() {
  if (!useSupabase) { bookingsCache = loadBookingsFromLS(); }
  else if (!currentUser) { bookingsCache = []; }
  else {
    const { data, error } = await sbClient.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); bookingsCache = []; }
    else bookingsCache = (data || []).map(rowToBooking);
  }
  renderBookings(); renderStats(); renderCalendar(); renderProfileMenuStats();
}

// ===== Header / profile UI =====
function initialsOf(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const s = String(nameOrEmail).trim();
  if (!s) return '?';
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}
function displayName() {
  return currentProfile?.display_name || (currentUser?.email || '').split('@')[0] || 'Пользователь';
}

function updateAuthUI() {
  const openAuth = $('#btn-open-auth');
  const wrap = $('#profile-wrap');
  if (!openAuth || !wrap) return;

  if (!useSupabase) {
    openAuth.classList.add('hidden');
    wrap.classList.add('hidden');
    return;
  }
  if (currentUser) {
    openAuth.classList.add('hidden');
    wrap.classList.remove('hidden');
    const name = displayName();
    $('#avatar').textContent = initialsOf(name);
    $('#profile-avatar-lg').textContent = initialsOf(name);
    $('#profile-name').textContent = name;
    $('#profile-email').textContent = currentUser.email || '';
    renderProfileMenuStats();
  } else {
    wrap.classList.add('hidden');
    openAuth.classList.remove('hidden');
    closeProfileMenu();
  }
  // Admin button: no Supabase (dev) OR adminEmail match OR is_admin flag
  const adminBtn = document.getElementById('btn-admin');
  if (adminBtn) adminBtn.classList.toggle('hidden', !isAdminUser());
}

function isAdminUser() {
  const cfgAdminEmail = window.CAMPUSBOOK_SUPABASE?.adminEmail?.trim().toLowerCase();
  const userEmail = currentUser?.email?.trim().toLowerCase();
  return !useSupabase
    || (currentUser && currentProfile?.is_admin)
    || (currentUser && cfgAdminEmail && userEmail === cfgAdminEmail);
}

function renderProfileMenuStats() {
  const el = $('#profile-stats');
  if (!el || !currentUser) return;
  const mine = getMyBookings();
  const active = getActiveBookings(mine).length;
  const total = mine.length;
  const cfgAdminEmail = window.CAMPUSBOOK_SUPABASE?.adminEmail?.trim().toLowerCase();
  const isAdmin = currentProfile?.is_admin || (cfgAdminEmail && currentUser?.email?.trim().toLowerCase() === cfgAdminEmail);
  const plan = isAdmin ? 'Admin' : (currentProfile?.paid ? 'PRO' : 'Free');
  el.innerHTML = `
    <div class="ps-item"><div class="ps-num">${active}</div><div class="ps-label">Активных</div></div>
    <div class="ps-item"><div class="ps-num">${total}</div><div class="ps-label">Всего</div></div>
    <div class="ps-item"><div class="ps-num">${plan}</div><div class="ps-label">Тариф</div></div>
  `;
}

function updateBookingGate() {
  const gate = $('#booking-gate');
  const app = $('#booking-app');
  if (!gate || !app) return;
  if (!useSupabase) { gate.classList.add('hidden'); app.classList.remove('hidden'); return; }
  if (currentUser) { gate.classList.add('hidden'); app.classList.remove('hidden'); }
  else { gate.classList.remove('hidden'); app.classList.add('hidden'); }
}

// ===== Catalog rendering =====
let currentFilter = 'all';
let currentSearch = '';

function renderCards(filter, search) {
  if (filter !== undefined) currentFilter = filter;
  if (search !== undefined) currentSearch = search.toLowerCase();
  const container = $('#resource-cards');
  let filtered = currentFilter === 'all' ? RESOURCES : RESOURCES.filter(r => r.type === currentFilter);
  if (currentSearch) {
    filtered = filtered.filter(r =>
      r.name.toLowerCase().includes(currentSearch) ||
      r.description.toLowerCase().includes(currentSearch)
    );
  }
  container.innerHTML = filtered.map(r => `
    <div class="card" data-type="${r.type}">
      <img class="card-img" src="${r.img}" alt="${r.name}" loading="lazy" />
      <div class="card-body">
        <span class="card-badge ${BADGE_CLASSES[r.type]}">${TYPE_LABELS[r.type]}</span>
        <h3>${r.name}</h3>
        <p>${r.description}</p>
        <div class="card-meta">${r.floor} этаж &bull; до ${r.capacity} чел.</div>
        <button type="button" class="card-cta" data-pick-resource="${r.id}">Выбрать для брони</button>
      </div>
    </div>
  `).join('');
}

// ===== Calendar rendering =====
function populateResourceSelect() {
  const sel = $('#resource-select');
  sel.innerHTML = RESOURCES.map(r =>
    `<option value="${r.id}">${r.name} (${TYPE_LABELS[r.type]})</option>`
  ).join('');
  sel.value = calResourceId;
}

function fcGetEvents(_fetchInfo, successCallback) {
  const myId = currentUser?.id;
  const events = bookingsCache
    .filter(b => b.resourceId === calResourceId && b.status === 'active')
    .map(b => ({
      id: b.id || b._id,
      title: b._userId === myId ? (b.purpose || 'Моя бронь') : 'Занято',
      start: `${b.date}T${b.startTime}`,
      end: `${b.date}T${b.endTime}`,
      backgroundColor: b._userId === myId ? '#059669' : '#64748b',
      borderColor:     b._userId === myId ? '#059669' : '#64748b',
    }));

  // Shade past time slots as background events
  const slotStart = `${String(CAL_START_HOUR).padStart(2, '0')}:00`;
  const slotEnd   = `${String(CAL_END_HOUR).padStart(2, '0')}:00`;
  const pastBgEvent = (start, end) => ({
    start, end, display: 'background', overlap: true, classNames: ['past-time-bg'],
  });
  if (calDate < todayISO()) {
    events.push(pastBgEvent(`${calDate}T${slotStart}`, `${calDate}T${slotEnd}`));
  } else if (calDate === todayISO()) {
    const now = new Date();
    const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (nowStr > slotStart) {
      events.push(pastBgEvent(`${calDate}T${slotStart}`, `${calDate}T${nowStr}`));
    }
  }

  successCallback(events);
}

function initFullCalendar() {
  const el = document.getElementById('fc-calendar');
  if (!el || typeof FullCalendar === 'undefined') return;

  fcCalendar = new FullCalendar.Calendar(el, {
    locale: 'ru',
    initialView: 'timeGridDay',
    initialDate: calDate,
    headerToolbar: false,
    allDaySlot: false,
    slotMinTime: `${String(CAL_START_HOUR).padStart(2, '0')}:00:00`,
    slotMaxTime: `${String(CAL_END_HOUR).padStart(2, '0')}:00:00`,
    slotDuration: '00:15:00',
    slotLabelMinutes: 60,
    slotLabelInterval: '01:00',
    nowIndicator: true,
    height: 'auto',
    selectable: true,
    selectMirror: true,
    unselectAuto: false,
    selectOverlap: false,
    selectAllow(info) {
      return info.start >= new Date();
    },
    events: fcGetEvents,
    select(info) {
      const toTime = d =>
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      selStart = timeToSlotIndex(toTime(info.start));
      selEnd   = timeToSlotIndex(toTime(info.end));
      if (!rangeIsFree(selStart, selEnd)) {
        selStart = null; selEnd = null;
        fcCalendar.unselect(); return;
      }
      updateSelectionPanel();
    },
    eventClick(info) {
      const id = info.event.id;
      const mine = getMyBookings().find(b => String(b.id) === String(id) && b.status === 'active');
      if (mine) showEditModal(mine);
    },
  });
  fcCalendar.render();
}

function renderCalendar() {
  const dateText = document.getElementById('cal-date-text');
  if (dateText) dateText.textContent = formatDateRu(calDate);
  updateBuildingStatus();
  if (!fcCalendar) return;
  fcCalendar.gotoDate(calDate);
  fcCalendar.refetchEvents();
  updateSelectionPanel();
}

function rangeIsFree(s, e) {
  if (s === null || e === null || e <= s) return false;
  const dayBookings = bookingsCache.filter(b =>
    b.resourceId === calResourceId && b.date === calDate && b.status === 'active'
  );
  const isPastDay = calDate < todayISO();
  if (isPastDay) return false;
  const isToday = calDate === todayISO();
  const now = new Date();
  const currentSlotNow = isToday
    ? Math.floor(((now.getHours() - CAL_START_HOUR) * 60 + now.getMinutes()) / SLOT_MIN)
    : -1;
  for (let i = s; i < e; i++) {
    if (isToday && i < currentSlotNow) return false;
    if (dayBookings.some(b => {
      const bs = timeToSlotIndex(b.startTime);
      const be = timeToSlotIndex(b.endTime);
      return i >= bs && i < be;
    })) return false;
  }
  return true;
}

function openBookingModal() {
  $('#booking-modal').classList.add('visible');
  setTimeout(() => document.getElementById('purpose')?.focus(), 80);
}

function closeBookingModal() {
  $('#booking-modal').classList.remove('visible');
}

function updateSelectionPanel() {
  const hint = $('#cal-hint');
  if (selStart === null || selEnd === null) {
    hint.textContent = 'Зажмите и перетащите по слотам, чтобы выбрать интервал.';
    closeBookingModal(); return;
  }
  const resource = RESOURCES.find(r => r.id === calResourceId);
  const startTime = slotIndexToTime(selStart);
  const endTime = slotIndexToTime(selEnd);
  $('#sel-resource-name').textContent = resource?.name || '—';
  $('#sel-range').textContent = `${formatDateRu(calDate)}, ${startTime}–${endTime}`;
  hint.textContent = '';
  openBookingModal();
}

function clearSelection() {
  selStart = null; selEnd = null;
  if (fcCalendar) fcCalendar.unselect();
  closeBookingModal();
  $('#booking-success').classList.add('hidden');
  $('#booking-error').classList.add('hidden');
  $('#booking-form').reset();
}

// ===== Booking submit =====
async function handleBookingSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return;
  const errorEl = $('#booking-error');
  const successEl = $('#booking-success');
  errorEl.classList.add('hidden'); successEl.classList.add('hidden');

  if (selStart === null || selEnd === null) return;

  // Validation
  const purposeEl = $('#purpose');
  const notRobot = $('#not-robot').checked;
  touch(purposeEl);
  if (!purposeEl.checkValidity()) {
    setFieldError('purpose', purposeEl.validationMessage || 'Заполните цель бронирования.');
    purposeEl.focus(); return;
  }
  setFieldError('purpose', '');
  if (!notRobot) return showBookingError('Подтвердите «Я не робот».');

  if (useSupabase && !currentUser) return showBookingError('Войдите, чтобы бронировать.');

  // Paywall: only affects Supabase mode
  if (useSupabase && currentProfile && !currentProfile.paid) {
    const myActive = getActiveBookings(getMyBookings()).length;
    if (myActive >= FREE_BOOKING_LIMIT) { showPaywall(); return; }
  }

  const resource = RESOURCES.find(r => r.id === calResourceId);
  const startTime = slotIndexToTime(selStart);
  const endTime = slotIndexToTime(selEnd);
  const purpose = purposeEl.value.trim();
  const userName = displayName();

  if (!rangeIsFree(selStart, selEnd)) return showBookingError('Интервал пересекается с другой бронью.');

  const submitBtn = $('#sel-submit');
  isSubmitting = true;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Сохраняем…'; }

  try {
    if (useSupabase && currentUser) {
      const withTimeout = (p, ms = 30000) => Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('Нет ответа от сервера. Supabase мог засыпать — попробуйте ещё раз через несколько секунд.')), ms)),
      ]);

      const { error } = await withTimeout(sbClient.from('bookings').insert({
        user_id: currentUser.id,
        user_name: userName,
        resource_id: calResourceId,
        date: calDate,
        start_time: startTime,
        end_time: endTime,
        purpose,
        status: 'active',
      }));
      if (error) throw new Error(error.message || 'Ошибка сохранения.');
      // Обновляем фоново — не блокируем UI
      refreshBookings().catch(e => console.warn('refreshBookings:', e));
    } else {
      bookingsCache.push({
        id: 'b_' + Date.now(),
        _userId: null,
        userName,
        resourceId: calResourceId,
        date: calDate, startTime, endTime, purpose,
        status: 'active', createdAt: new Date().toISOString(),
      });
      persistLocalBookings(); renderBookings(); renderStats();
    }

    // Success
    const gcal = $('#gcal-link');
    if (gcal) gcal.href = buildGCalUrl({
      title: `CampusBook · ${resource?.name || ''}`,
      description: `Цель: ${purpose}\nРесурс: ${resource?.name || ''}`,
      date: calDate, startTime, endTime,
    });
    successEl.classList.remove('hidden');
    renderProfileMenuStats();
    if (fcCalendar) fcCalendar.refetchEvents();
    setTimeout(() => { clearSelection(); }, 2500);
  } catch (err) {
    console.error('Booking error:', err);
    showBookingError(err.message || 'Неизвестная ошибка. Попробуйте ещё раз.');
  } finally {
    isSubmitting = false;
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Забронировать'; }
  }
}

function showBookingError(msg) {
  const el = $('#booking-error'); el.textContent = msg; el.classList.remove('hidden');
}

// ===== Google Calendar link =====
function buildGCalUrl({ title, description, date, startTime, endTime }) {
  const fmt = (iso, t) => {
    const d = new Date(iso + 'T' + t + ':00');
    const pad = n => String(n).padStart(2, '0');
    // Use local time formatted as YYYYMMDDTHHMMSS (Google takes ctz=)
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
           'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
  };
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: fmt(date, startTime) + '/' + fmt(date, endTime),
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow',
  });
  return 'https://calendar.google.com/calendar/render?' + params.toString();
}

// ===== Bookings list =====
function renderBookings() {
  const container = $('#bookings-list');
  if (useSupabase && !currentUser) {
    container.innerHTML = '<p class="empty-state">Войдите, чтобы увидеть свои бронирования.</p>';
    return;
  }
  const list = getMyBookings();
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-state">Пока нет бронирований. Создайте первое!</p>';
    return;
  }
  const sortValue = $('#sort-select').value;
  const sorted = [...list].sort((a, b) => {
    if (sortValue === 'date-asc') {
      return isoToDateObj(a.date, a.startTime) - isoToDateObj(b.date, b.startTime);
    }
    if (sortValue === 'status') {
      if (a.status === b.status) return new Date(b.createdAt) - new Date(a.createdAt);
      return a.status === 'active' ? -1 : 1;
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  container.innerHTML = sorted.map(b => {
    const resource = RESOURCES.find(r => r.id === b.resourceId);
    const rName = resource ? resource.name : b.resourceId;
    const isCancelled = b.status === 'cancelled';
    const safeId = String(b.id).replace(/'/g, '');
    const gcal = isCancelled ? '' : `
      <a class="gcal-mini" href="${buildGCalUrl({
        title: 'CampusBook · ' + rName,
        description: 'Цель: ' + b.purpose,
        date: b.date, startTime: b.startTime, endTime: b.endTime,
      })}" target="_blank" rel="noopener" title="Добавить в Google Calendar">
        <svg class="icon"><use href="#i-google"/></svg>
        <span>Google</span>
      </a>`;
    return `
      <div class="booking-card ${isCancelled ? 'cancelled' : ''}">
        <div class="booking-info">
          <h4>${rName}</h4>
          <p>${formatDateRu(b.date)} · ${b.startTime}–${b.endTime} · ${b.purpose}</p>
          <p>Бронь: ${b.userName}</p>
        </div>
        <div class="booking-tools">
          <span class="booking-status ${isCancelled ? 'status-cancelled' : 'status-active'}">${isCancelled ? 'Отменено' : 'Активно'}</span>
          ${gcal}
          ${!isCancelled ? `<button class="btn btn-danger" onclick="showCancelModal('${safeId}')">Отменить</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ===== Cancel modal =====
let pendingCancelId = null;
function showCancelModal(id) {
  const booking = getMyBookings().find(b => String(b.id) === String(id));
  if (!booking) return;
  const resource = RESOURCES.find(r => r.id === booking.resourceId);
  const rName = resource ? resource.name : booking.resourceId;
  $('#modal-details').innerHTML = `<strong>${rName}</strong><br>${booking.date} · ${booking.startTime}–${booking.endTime} · ${booking.purpose}`;
  pendingCancelId = id;
  $('#cancel-modal').classList.add('visible');
}
function hideCancelModal() { pendingCancelId = null; $('#cancel-modal').classList.remove('visible'); }
async function confirmCancel() {
  if (!pendingCancelId) return;
  if (useSupabase && currentUser) {
    const { error } = await sbClient.from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', pendingCancelId).eq('user_id', currentUser.id);
    if (error) { alert('Не удалось отменить бронь: ' + error.message); return; }
    await refreshBookings();
  } else {
    bookingsCache = bookingsCache.map(b => String(b.id) === String(pendingCancelId) ? { ...b, status: 'cancelled' } : b);
    persistLocalBookings(); renderBookings(); renderStats(); renderCalendar();
  }
  hideCancelModal();
}

// ===== Edit booking modal =====
let editingBooking = null;

function showEditModal(booking) {
  editingBooking = booking;
  const resource = RESOURCES.find(r => r.id === booking.resourceId);
  $('#edit-modal-details').innerHTML =
    `<strong>${resource?.name || booking.resourceId}</strong> · ${formatDateRu(booking.date)}`;
  $('#edit-start-time').value = booking.startTime;
  $('#edit-end-time').value   = booking.endTime;
  $('#edit-purpose').value    = booking.purpose || '';
  $('#edit-error').classList.add('hidden');
  $('#edit-booking-modal').classList.add('visible');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#edit-purpose')?.focus(), 80);
}

function hideEditModal() {
  editingBooking = null;
  $('#edit-booking-modal').classList.remove('visible');
  document.body.style.overflow = '';
}

function hasConflict(resourceId, date, startTime, endTime, excludeId) {
  const s = timeToSlotIndex(startTime);
  const e = timeToSlotIndex(endTime);
  if (e <= s) return true;
  return bookingsCache.some(b => {
    if (b.resourceId !== resourceId || b.date !== date || b.status !== 'active') return false;
    if (String(b.id) === String(excludeId)) return false;
    const bs = timeToSlotIndex(b.startTime);
    const be = timeToSlotIndex(b.endTime);
    return s < be && e > bs;
  });
}

async function handleEditSubmit(e) {
  e.preventDefault();
  if (!editingBooking) return;
  const errEl = $('#edit-error');
  errEl.classList.add('hidden');

  const startTime = $('#edit-start-time').value;
  const endTime   = $('#edit-end-time').value;
  const purpose   = $('#edit-purpose').value.trim();

  if (!startTime || !endTime) return;
  if (endTime <= startTime) {
    errEl.textContent = 'Конец должен быть позже начала.';
    errEl.classList.remove('hidden'); return;
  }
  if (purpose.length < 3) {
    errEl.textContent = 'Укажите цель (минимум 3 символа).';
    errEl.classList.remove('hidden'); return;
  }
  if (hasConflict(editingBooking.resourceId, editingBooking.date, startTime, endTime, editingBooking.id)) {
    errEl.textContent = 'Новый интервал пересекается с другой бронью.';
    errEl.classList.remove('hidden'); return;
  }

  const saveBtn = $('#edit-save-btn');
  saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем…';
  try {
    if (useSupabase && currentUser) {
      const { error } = await sbClient.from('bookings')
        .update({ start_time: startTime, end_time: endTime, purpose })
        .eq('id', editingBooking.id).eq('user_id', currentUser.id);
      if (error) throw new Error(error.message);
      await refreshBookings();
    } else {
      bookingsCache = bookingsCache.map(b =>
        String(b.id) === String(editingBooking.id)
          ? { ...b, startTime, endTime, purpose }
          : b
      );
      persistLocalBookings(); renderBookings(); renderStats();
      if (fcCalendar) fcCalendar.refetchEvents();
    }
    hideEditModal();
    showToast('Бронь обновлена');
  } catch (err) {
    errEl.textContent = err.message || 'Ошибка сохранения.';
    errEl.classList.remove('hidden');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Сохранить';
  }
}

async function handleEditDelete() {
  if (!editingBooking) return;
  const delBtn = $('#edit-delete-btn');
  delBtn.disabled = true; delBtn.textContent = 'Удаляем…';
  try {
    if (useSupabase && currentUser) {
      const { error } = await sbClient.from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', editingBooking.id).eq('user_id', currentUser.id);
      if (error) throw new Error(error.message);
      await refreshBookings();
    } else {
      bookingsCache = bookingsCache.map(b =>
        String(b.id) === String(editingBooking.id) ? { ...b, status: 'cancelled' } : b
      );
      persistLocalBookings(); renderBookings(); renderStats();
      if (fcCalendar) fcCalendar.refetchEvents();
    }
    hideEditModal();
    showToast('Бронь удалена', 'info');
  } catch (err) {
    $('#edit-error').textContent = err.message || 'Ошибка.';
    $('#edit-error').classList.remove('hidden');
  } finally {
    delBtn.disabled = false; delBtn.textContent = 'Удалить бронь';
  }
}

// ===== Stats =====
function renderStats() {
  const container = $('#bookings-stats');
  const exportBtn = $('#export-btn');
  if (useSupabase && !currentUser) { container.innerHTML = ''; if (exportBtn) exportBtn.style.display = 'none'; return; }
  const list = getMyBookings();
  if (list.length === 0) { container.innerHTML = ''; if (exportBtn) exportBtn.style.display = 'none'; return; }
  const active = list.filter(b => b.status === 'active').length;
  const cancelled = list.filter(b => b.status === 'cancelled').length;
  container.innerHTML = `
    <div class="stat-card"><div class="stat-num">${list.length}</div><div class="stat-label">Всего</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--success)">${active}</div><div class="stat-label">Активных</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${cancelled}</div><div class="stat-label">Отменённых</div></div>
  `;
  if (exportBtn) exportBtn.style.display = 'inline-block';
}

function exportBookings() {
  const list = getMyBookings();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'campusbook_bookings.json'; a.click();
  URL.revokeObjectURL(url);
}

// ===== Auth modal + validation =====
function showAuthModal(mode) {
  $('#auth-error').textContent = '';
  setAuthTab(mode || 'login');
  $('#auth-modal').classList.add('visible');
  setTimeout(() => $('#auth-email-input').focus(), 50);
}
function hideAuthModal() { $('#auth-modal').classList.remove('visible'); }
function setAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.authTab === mode));
  $('#auth-submit-btn').textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
  $('#auth-modal-title').textContent = mode === 'login' ? 'Вход' : 'Регистрация';
  $('#auth-error').textContent = '';
  // toggle name + password2 fields for register
  const nameField = document.querySelector('[data-field="name"]');
  const pass2Field = document.querySelector('[data-field="password2"]');
  const isRegister = mode === 'register';
  nameField.hidden = !isRegister;
  pass2Field.hidden = !isRegister;
  $('#auth-name-input').required = isRegister;
  $('#auth-password2-input').required = isRegister;
  $('#auth-password-input').autocomplete = isRegister ? 'new-password' : 'current-password';
}

function setFieldError(inputId, msg) {
  const el = document.querySelector(`.field-error[data-for="${inputId}"]`);
  if (el) el.textContent = msg || '';
  const input = document.getElementById(inputId);
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
function touch(input) { input.classList.add('touched'); }

function validateAuthForm() {
  const email = $('#auth-email-input');
  const pass = $('#auth-password-input');
  const pass2 = $('#auth-password2-input');
  const name = $('#auth-name-input');
  let ok = true;
  [email, pass, pass2, name].forEach(touch);
  setFieldError('auth-email-input', '');
  setFieldError('auth-password-input', '');
  setFieldError('auth-password2-input', '');
  setFieldError('auth-name-input', '');

  if (!email.checkValidity()) { setFieldError('auth-email-input', 'Укажите корректный email.'); ok = false; }
  if (!pass.checkValidity()) {
    setFieldError('auth-password-input', pass.validity.tooShort ? 'Пароль минимум 6 символов.' : 'Введите пароль.');
    ok = false;
  }
  if (authMode === 'register') {
    if (!name.checkValidity()) { setFieldError('auth-name-input', 'Имя минимум 2 символа.'); ok = false; }
    if (pass2.value !== pass.value) { setFieldError('auth-password2-input', 'Пароли не совпадают.'); ok = false; }
  }
  return ok;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  if (!sbClient) return;
  if (!validateAuthForm()) return;

  const errEl = $('#auth-error'); errEl.textContent = '';
  const email = $('#auth-email-input').value.trim();
  const password = $('#auth-password-input').value;

  if (authMode === 'login') {
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) { errEl.textContent = humanAuthError(error.message); return; }
    hideAuthModal();
    const name = data?.user?.user_metadata?.display_name || data?.user?.email?.split('@')[0] || '';
    showToast(`Добро пожаловать${name ? ', ' + name : ''}! 👋`);
  } else {
    const displayName = $('#auth-name-input').value.trim();
    const { error } = await sbClient.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    });
    if (error) { errEl.textContent = humanAuthError(error.message); return; }
    hideAuthModal();
    showToast('Аккаунт создан! Проверьте почту для подтверждения.');
  }
}
function humanAuthError(msg) {
  const m = String(msg || '').toLowerCase();
  if (m.includes('invalid login')) return 'Неверный email или пароль.';
  if (m.includes('already registered')) return 'Этот email уже зарегистрирован.';
  if (m.includes('password')) return 'Проверьте пароль (минимум 6 символов).';
  return msg || 'Ошибка входа.';
}

// ===== Toast notifications =====
function showToast(text, type = 'success') {
  if (typeof Toastify === 'undefined') return;
  const colors = {
    success: 'linear-gradient(135deg, #059669, #10b981)',
    error:   'linear-gradient(135deg, #dc2626, #ef4444)',
    info:    'linear-gradient(135deg, #2563eb, #3b82f6)',
  };
  Toastify({
    text,
    duration: 3500,
    close: true,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
    style: { background: colors[type] || colors.success, borderRadius: '10px', fontSize: '.9rem' },
  }).showToast();
}

// ===== Profile modal =====
function showProfileModal() {
  if (!currentUser) return;
  $('#profile-display-name').value = currentProfile?.display_name || '';
  $('#profile-email-input').value = currentUser.email || '';
  const plan = $('#profile-plan');
  const cfgAdminEmail2 = window.CAMPUSBOOK_SUPABASE?.adminEmail?.trim().toLowerCase();
  const isAdmin = currentProfile?.is_admin || (cfgAdminEmail2 && currentUser?.email?.trim().toLowerCase() === cfgAdminEmail2);
  if (isAdmin) {
    plan.textContent = 'Тариф: Admin — полный доступ';
    plan.classList.add('paid');
  } else if (currentProfile?.paid) {
    plan.textContent = 'Тариф: PRO — полный доступ';
    plan.classList.add('paid');
  } else {
    plan.textContent = `Тариф: Free (до ${FREE_BOOKING_LIMIT} активных броней)`;
    plan.classList.remove('paid');
  }
  $('#profile-error').textContent = '';
  $('#profile-modal').classList.add('visible');
  closeProfileMenu();
}
function hideProfileModal() { $('#profile-modal').classList.remove('visible'); }

async function handleProfileSubmit(e) {
  e.preventDefault();
  if (!currentUser || !sbClient) return;
  const input = $('#profile-display-name'); touch(input);
  setFieldError('profile-display-name', '');
  if (!input.checkValidity()) {
    setFieldError('profile-display-name', 'Имя минимум 2 символа.');
    return;
  }
  const name = input.value.trim();
  const { error } = await sbClient
    .from('profiles').update({ display_name: name }).eq('id', currentUser.id);
  if (error) { $('#profile-error').textContent = error.message; return; }
  currentProfile = { ...currentProfile, display_name: name };
  hideProfileModal();
  updateAuthUI();
  showToast('Профиль сохранён');
  renderBookings();
}

// ===== Profile menu (dropdown) =====
function toggleProfileMenu() {
  const menu = $('#profile-menu');
  const btn = $('#avatar-btn');
  const open = menu.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function closeProfileMenu() {
  $('#profile-menu')?.classList.remove('open');
  $('#avatar-btn')?.setAttribute('aria-expanded', 'false');
}

// ===== Paywall =====
function showPaywall() {
  $('#pw-free-limit').textContent = FREE_BOOKING_LIMIT;
  $('#paywall-modal').classList.add('visible');
}
function hidePaywall() { $('#paywall-modal').classList.remove('visible'); }

// ===== Theme =====
function initTheme() {
  const saved = localStorage.getItem('campusbook_theme');
  if (saved === 'dark') document.body.classList.add('dark');
}
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('campusbook_theme', isDark ? 'dark' : 'light');
}

// ===== Filters / search =====
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCards(btn.dataset.type);
    });
  });
}
function initSearch() {
  $('#search-input').addEventListener('input', (e) => renderCards(undefined, e.target.value));
}

// ===== Microsoft Clarity (hw9) =====
function initClarity() {
  const id = (window.CAMPUSBOOK_CLARITY_ID || '').trim();
  if (!id) return;
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", id);
}

// ===== Building facade view =====
let bldViewActive = true; // building is default view

function switchResView(view) {
  bldViewActive = view === 'building';
  const cardsEl  = document.getElementById('res-cards-view');
  const bldEl    = document.getElementById('building-view');
  const cardsBtn = document.getElementById('res-view-cards-btn');
  const bldBtn   = document.getElementById('res-view-building-btn');
  if (bldViewActive) {
    cardsEl?.classList.add('hidden');
    bldEl?.classList.remove('hidden');
    cardsBtn?.classList.remove('active');
    bldBtn?.classList.add('active');
    updateBuildingStatus();
  } else {
    cardsEl?.classList.remove('hidden');
    bldEl?.classList.add('hidden');
    cardsBtn?.classList.add('active');
    bldBtn?.classList.remove('active');
  }
}

// Detailed realtime status for a resource on calDate
function getDetailedRoomStatus(resourceId) {
  const todayStr = todayISO();
  const dateBookings = bookingsCache
    .filter(b => b.resourceId === resourceId && b.date === calDate && b.status === 'active')
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (calDate < todayStr) return { status: 'free', label: 'Прошедшая дата' };
  if (!dateBookings.length) return { status: 'free', label: 'Свободно весь день' };

  if (calDate === todayStr) {
    const now  = new Date();
    const nowT = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const cur  = dateBookings.find(b => b.startTime <= nowT && nowT < b.endTime);
    if (cur) return {
      status: cur._userId === currentUser?.id ? 'mine' : 'busy',
      label: `Занято до ${cur.endTime}`,
    };
    const next = dateBookings.find(b => b.startTime > nowT);
    if (!next) return { status: 'free', label: 'Свободно сейчас' };
    return {
      status: next._userId === currentUser?.id ? 'mine' : 'free',
      label: `Свободно до ${next.startTime}`,
    };
  }
  // Future date
  const mine = dateBookings.find(b => b._userId === currentUser?.id);
  if (mine) return { status: 'mine', label: `Моя бронь ${mine.startTime}–${mine.endTime}` };
  return { status: 'busy', label: `Занято (${dateBookings.length})` };
}

function updateBuildingStatus() {
  if (!bldViewActive) return;
  document.querySelectorAll('#building-svg .bld-room').forEach(g => {
    const { status, label } = getDetailedRoomStatus(g.dataset.roomId);
    g.classList.remove('status-free', 'status-busy', 'status-mine');
    g.classList.add('status-' + status);
    const sub = g.querySelector('[data-room-sub]');
    if (sub) sub.textContent = label;
  });
}

// Dynamic SVG building generation
function renderBuildingSVG() {
  const svg = document.getElementById('building-svg');
  if (!svg) return;
  svg.querySelectorAll('.bld-room, .bld-win').forEach(el => el.remove());

  const NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs, text) {
    const e = document.createElementNS(NS, tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
    if (text !== undefined) e.textContent = text;
    return e;
  }

  const BLD_X = 52, BLD_W = 576;
  const DOOR_X = 542; // door starts here on floor 1
  const ROOM_H = 42, ROOM_GAP = 6;
  const WIN_W  = 52,  WIN_H = 26, WIN_GAP = 8;
  const FLOOR_Y   = { 1: 320, 2: 256, 3: 192, 4: 128, 5: 64 };
  const FLOOR_WIN_Y = { 1: 334, 2: 270, 3: 206, 4: 142, 5: 78 };

  const byFloor = {};
  RESOURCES.forEach(r => {
    const f = Math.min(Math.max(r.floor || 1, 1), 5);
    (byFloor[f] = byFloor[f] || []).push(r);
  });

  [5, 4, 3, 2, 1].forEach(floor => {
    const rooms  = byFloor[floor] || [];
    const roomY  = FLOOR_Y[floor];
    const winY   = FLOOR_WIN_Y[floor];
    const avail  = floor === 1 ? (DOOR_X - BLD_X - ROOM_GAP) : BLD_W;
    const n      = rooms.length;
    const roomW  = n > 0 ? Math.min(300, Math.floor((avail - (n - 1) * ROOM_GAP) / n)) : 0;
    const blockW = n > 0 ? (n * roomW + (n - 1) * ROOM_GAP) : 0;

    rooms.forEach((res, i) => {
      const x  = BLD_X + i * (roomW + ROOM_GAP);
      const cx = x + roomW / 2;
      const g  = mk('g', { class: 'bld-room', 'data-room-id': res.id, tabindex: '0', role: 'button', 'aria-label': res.name });
      g.appendChild(mk('rect', { class: 'room-rect', x, y: roomY, width: roomW, height: ROOM_H, rx: 5 }));
      const label = res.name.length > 24 ? res.name.slice(0, 22) + '…' : res.name;
      g.appendChild(mk('text', { class: 'room-label', x: cx, y: roomY + 16, 'text-anchor': 'middle' }, label));
      g.appendChild(mk('text', { class: 'room-sub', x: cx, y: roomY + 33, 'text-anchor': 'middle', 'data-room-sub': res.id },
        `${floor} эт. · до ${res.capacity} чел.`));
      svg.appendChild(g);
    });

    // Decorative windows in leftover space
    let wx = BLD_X + blockW + (blockW > 0 ? ROOM_GAP * 2 : 0);
    while (wx + WIN_W <= BLD_X + avail) {
      svg.appendChild(mk('rect', { class: 'bld-win', x: wx, y: winY, width: WIN_W, height: WIN_H, rx: 3 }));
      wx += WIN_W + WIN_GAP;
    }
  });

  initBuildingRoomEvents();
  updateBuildingStatus();
}

// Tooltip (created once)
const _bldTip = document.createElement('div');
_bldTip.className = 'bld-tooltip';
document.body.appendChild(_bldTip);

function _showBldTip(e, roomId) {
  const res = RESOURCES.find(r => r.id === roomId);
  if (!res) return;
  const { status, label } = getDetailedRoomStatus(roomId);
  const icon = { free: '🟢', busy: '🔴', mine: '🔵' }[status] || '⚪';
  const adminHint = isAdminUser() ? '<br><em style="opacity:.7;font-size:.8em">✏️ Нажмите для редактирования</em>' : '';
  _bldTip.innerHTML = `<strong>${res.name}</strong><br><span>${icon} ${label}</span>${adminHint}`;
  _bldTip.classList.add('visible');
  _moveBldTip(e);
}
function _moveBldTip(e) {
  _bldTip.style.left = (e.clientX + 14) + 'px';
  _bldTip.style.top  = (e.clientY - 52) + 'px';
}
function _hideBldTip() { _bldTip.classList.remove('visible'); }

function _selectBldRoom(roomId) {
  if (isAdminUser()) {
    const res = RESOURCES.find(r => r.id === roomId);
    if (res) {
      showAdminModal();
      openAdminForm(res);
      return;
    }
  }
  calResourceId = roomId;
  const sel = document.getElementById('resource-select');
  if (sel) sel.value = roomId;
  document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' });
  selStart = null; selEnd = null;
  renderCalendar();
}

function initBuildingRoomEvents() {
  document.querySelectorAll('#building-svg .bld-room').forEach(g => {
    const roomId = g.dataset.roomId;
    g.addEventListener('mouseenter', e => _showBldTip(e, roomId));
    g.addEventListener('mousemove',  e => _moveBldTip(e));
    g.addEventListener('mouseleave', _hideBldTip);
    g.addEventListener('click',   () => _selectBldRoom(roomId));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') _selectBldRoom(roomId); });
  });
}

function initBuildingView() {
  document.getElementById('res-view-cards-btn')?.addEventListener('click', () => switchResView('cards'));
  document.getElementById('res-view-building-btn')?.addEventListener('click', () => switchResView('building'));
}

// ===== Resources: load from Supabase / localStorage / defaults =====
async function loadResources() {
  if (!useSupabase) {
    try {
      const stored = JSON.parse(localStorage.getItem('campusbook_resources') || 'null');
      if (stored && stored.length) RESOURCES = stored;
    } catch { /* use defaults */ }
    return;
  }
  const { data, error } = await sbClient.from('resources').select('*').eq('active', true).order('sort_order');
  if (error) { console.warn('loadResources:', error.message); return; }
  if (!data || !data.length) { await seedResources(); return; }
  RESOURCES = data.map(row => ({
    id: row.id, name: row.name, type: row.type,
    description: row.description || '',
    floor: row.floor, capacity: row.capacity, img: row.img_url || '',
  }));
}

async function seedResources() {
  try {
    const rows = DEFAULT_RESOURCES.map((r, i) => ({
      id: r.id, name: r.name, type: r.type, description: r.description,
      floor: r.floor, capacity: r.capacity, img_url: r.img, sort_order: i, active: true,
    }));
    const { error } = await sbClient.from('resources').insert(rows);
    if (!error) RESOURCES = DEFAULT_RESOURCES.map(r => ({ ...r }));
  } catch (e) { console.warn('seedResources:', e); }
}

// ===== Admin Panel =====
function showAdminModal() {
  renderAdminResourceList();
  hideAdminForm();
  document.getElementById('admin-modal')?.classList.add('visible');
}
function hideAdminModal() {
  document.getElementById('admin-modal')?.classList.remove('visible');
  hideAdminForm();
}
function hideAdminForm() {
  document.getElementById('admin-form-panel')?.classList.add('hidden');
  document.getElementById('admin-resource-form')?.reset();
  document.getElementById('admin-form-id').value = '';
  document.getElementById('admin-form-error').textContent = '';
}

function renderAdminResourceList() {
  const list = document.getElementById('admin-resource-list');
  if (!list) return;
  if (!RESOURCES.length) {
    list.innerHTML = '<p class="empty-state">Нет ресурсов. Добавьте первый.</p>';
    return;
  }
  list.innerHTML = RESOURCES.map(r => `
    <div class="admin-res-row">
      <div class="admin-res-info">
        <span class="admin-res-name">${r.name}</span>
        <span class="card-badge ${BADGE_CLASSES[r.type] || ''}">${TYPE_LABELS[r.type] || r.type}</span>
        <span class="admin-res-meta">${r.floor} эт. · ${r.capacity} чел.</span>
      </div>
      <div class="admin-res-btns">
        <button type="button" class="btn btn-ghost btn-sm" data-admin-edit="${r.id}">
          <svg class="icon"><use href="#i-edit"/></svg>
        </button>
        <button type="button" class="btn btn-danger btn-sm" data-admin-delete="${r.id}">
          <svg class="icon"><use href="#i-trash"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function openAdminForm(resource) {
  const panel = document.getElementById('admin-form-panel');
  panel?.classList.remove('hidden');
  document.getElementById('admin-form-title').textContent = resource ? 'Редактировать ресурс' : 'Новый ресурс';
  document.getElementById('admin-form-id').value       = resource?.id || '';
  document.getElementById('admin-name').value          = resource?.name || '';
  document.getElementById('admin-type').value          = resource?.type || 'room';
  document.getElementById('admin-description').value   = resource?.description || '';
  document.getElementById('admin-floor').value         = resource?.floor || 1;
  document.getElementById('admin-capacity').value      = resource?.capacity || 1;
  document.getElementById('admin-img').value           = resource?.img || '';
  document.getElementById('admin-form-error').textContent = '';
  panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleAdminFormSubmit(e) {
  e.preventDefault();
  const id          = document.getElementById('admin-form-id').value.trim();
  const name        = document.getElementById('admin-name').value.trim();
  const type        = document.getElementById('admin-type').value;
  const description = document.getElementById('admin-description').value.trim();
  const floor       = parseInt(document.getElementById('admin-floor').value) || 1;
  const capacity    = parseInt(document.getElementById('admin-capacity').value) || 1;
  const img         = document.getElementById('admin-img').value.trim();
  const errorEl     = document.getElementById('admin-form-error');
  if (!name) { errorEl.textContent = 'Введите название'; return; }

  const resource = { id: id || ('r' + Date.now()), name, type, description, floor, capacity, img };

  if (useSupabase) {
    const row = { id: resource.id, name, type, description, floor, capacity, img_url: img, active: true };
    const { error } = id
      ? await sbClient.from('resources').update(row).eq('id', id)
      : await sbClient.from('resources').insert(row);
    if (error) { errorEl.textContent = error.message; return; }
  }

  if (id) {
    const idx = RESOURCES.findIndex(r => r.id === id);
    if (idx >= 0) RESOURCES[idx] = resource; else RESOURCES.push(resource);
  } else {
    RESOURCES.push(resource);
  }
  if (!useSupabase) localStorage.setItem('campusbook_resources', JSON.stringify(RESOURCES));

  populateResourceSelect();
  renderCards();
  renderBuildingSVG();
  hideAdminForm();
  renderAdminResourceList();
  showToast(id ? 'Ресурс обновлён' : 'Ресурс добавлен');
}

async function handleAdminDelete(resourceId) {
  if (!confirm('Удалить ресурс? Существующие брони сохранятся.')) return;
  if (useSupabase) {
    const { error } = await sbClient.from('resources').update({ active: false }).eq('id', resourceId);
    if (error) {
      showToast('Ошибка удаления: ' + error.message, 'error');
      console.error('Admin delete error:', error);
      return;
    }
  }
  RESOURCES = RESOURCES.filter(r => r.id !== resourceId);
  if (!useSupabase) localStorage.setItem('campusbook_resources', JSON.stringify(RESOURCES));
  populateResourceSelect();
  renderCards();
  renderBuildingSVG();
  renderAdminResourceList();
  showToast('Ресурс удалён');
}

function initAdmin() {
  document.getElementById('btn-admin')?.addEventListener('click', showAdminModal);
  document.getElementById('admin-modal-close')?.addEventListener('click', hideAdminModal);
  document.getElementById('admin-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('admin-modal')) hideAdminModal();
  });
  document.getElementById('admin-add-btn')?.addEventListener('click', () => openAdminForm(null));
  document.getElementById('admin-form-cancel')?.addEventListener('click', hideAdminForm);
  document.getElementById('admin-resource-form')?.addEventListener('submit', handleAdminFormSubmit);
  document.getElementById('admin-resource-list')?.addEventListener('click', e => {
    const editId = e.target.closest('[data-admin-edit]')?.dataset.adminEdit;
    const delId  = e.target.closest('[data-admin-delete]')?.dataset.adminDelete;
    if (editId) { const res = RESOURCES.find(r => r.id === editId); if (res) openAdminForm(res); }
    if (delId)  handleAdminDelete(delId);
  });
}

// ===== Short DOM helper =====
function $(s) { return document.querySelector(s); }

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initClarity();

  await initSupabaseAndAuth();
  await loadResources();
  if (!useSupabase) { renderBookings(); renderStats(); }
  populateResourceSelect();
  renderCards('all');
  initFilters();
  initSearch();
  initFullCalendar();
  initBuildingView();
  renderBuildingSVG();
  renderCalendar();
  initAdmin();

  // Booking form
  $('#booking-form').addEventListener('submit', handleBookingSubmit);
  $('#sel-clear').addEventListener('click', clearSelection);
  $('#booking-modal-close')?.addEventListener('click', clearSelection);
  $('#booking-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) clearSelection(); });
  $('#purpose').addEventListener('input', () => setFieldError('purpose', ''));

  // Catalog → pick resource for booking
  $('#resource-cards').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick-resource]');
    if (!btn) return;
    calResourceId = btn.dataset.pickResource;
    $('#resource-select').value = calResourceId;
    selStart = null; selEnd = null;
    renderCalendar();
    document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
  });

  // Calendar controls
  $('#resource-select').addEventListener('change', (e) => {
    calResourceId = e.target.value;
    selStart = null; selEnd = null;
    renderCalendar();
  });
  // Flatpickr datepicker на лейбле даты
  let calPicker = null;
  if (typeof flatpickr !== 'undefined') {
    calPicker = flatpickr('#cal-date-display', {
      locale: 'ru',
      dateFormat: 'Y-m-d',
      defaultDate: calDate,
      minDate: 'today',
      disableMobile: true,
      onChange(selectedDates, dateStr) {
        if (dateStr) { calDate = dateStr; selStart = null; selEnd = null; renderCalendar(); }
      },
    });
  }

  function setCalDate(iso) {
    calDate = iso; selStart = null; selEnd = null;
    if (calPicker) calPicker.setDate(iso, false);
    renderCalendar();
  }

  $('#cal-prev').addEventListener('click', () => setCalDate(addDays(calDate, -1)));
  $('#cal-next').addEventListener('click', () => setCalDate(addDays(calDate, 1)));
  $('#cal-today').addEventListener('click', () => setCalDate(todayISO()));

  // Theme
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // Sort
  $('#sort-select').addEventListener('change', renderBookings);

  // Edit booking modal
  $('#edit-booking-form')?.addEventListener('submit', handleEditSubmit);
  $('#edit-delete-btn')?.addEventListener('click', handleEditDelete);
  $('#edit-cancel-btn')?.addEventListener('click', hideEditModal);
  $('#edit-modal-close')?.addEventListener('click', hideEditModal);
  $('#edit-booking-modal')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) hideEditModal(); });

  // Cancel modal
  $('#modal-back').addEventListener('click', hideCancelModal);
  $('#modal-confirm').addEventListener('click', confirmCancel);
  $('#cancel-modal').addEventListener('click', (e) => { if (e.target === $('#cancel-modal')) hideCancelModal(); });

  // Auth
  $('#btn-open-auth')?.addEventListener('click', () => showAuthModal('login'));
  $('#open-auth-from-gate')?.addEventListener('click', () => showAuthModal('login'));
  $('#auth-modal-close')?.addEventListener('click', hideAuthModal);
  $('#auth-modal')?.addEventListener('click', (e) => { if (e.target === $('#auth-modal')) hideAuthModal(); });
  document.querySelectorAll('[data-auth-tab]').forEach(tab => {
    tab.addEventListener('click', () => setAuthTab(tab.dataset.authTab));
  });
  $('#auth-form')?.addEventListener('submit', handleAuthSubmit);
  ['auth-email-input', 'auth-password-input', 'auth-password2-input', 'auth-name-input'].forEach(id => {
    document.getElementById(id)?.addEventListener('blur', (e) => {
      touch(e.target); if (e.target.checkValidity()) setFieldError(id, '');
    });
  });

  // Profile menu
  $('#avatar-btn')?.addEventListener('click', (e) => { e.stopPropagation(); toggleProfileMenu(); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#profile-wrap')) closeProfileMenu();
  });
  $('#menu-profile')?.addEventListener('click', showProfileModal);
  $('#profile-modal-close')?.addEventListener('click', hideProfileModal);
  $('#profile-cancel')?.addEventListener('click', hideProfileModal);
  $('#profile-modal')?.addEventListener('click', (e) => { if (e.target === $('#profile-modal')) hideProfileModal(); });
  $('#profile-form')?.addEventListener('submit', handleProfileSubmit);

  $('#btn-logout')?.addEventListener('click', async () => {
    closeProfileMenu();
    if (sbClient) await sbClient.auth.signOut();
    bookingsCache = []; currentProfile = null;
    renderBookings(); renderStats(); renderCalendar();
  });

  // Paywall
  $('#paywall-close')?.addEventListener('click', hidePaywall);
  $('#paywall-modal')?.addEventListener('click', (e) => { if (e.target === $('#paywall-modal')) hidePaywall(); });
  $('#pw-pay')?.addEventListener('click', () => {
    hidePaywall();
    window.location.href = 'success.html';
  });

  // Refresh calendar + building every minute
  setInterval(() => {
    if (fcCalendar) fcCalendar.refetchEvents();
    updateBuildingStatus();
  }, 60000);
});

// expose for onclick attrs
window.exportBookings = exportBookings;
window.showCancelModal = showCancelModal;
