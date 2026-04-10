// ===== Resource data =====
const RESOURCES = [
  { id: 'r1', name: 'Переговорная «Эврика»', type: 'room', description: 'Светлая комната на 6 человек с проектором и маркерной доской.', floor: 3, capacity: 6, img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop' },
  { id: 'r2', name: 'Переговорная «Спринт»', type: 'room', description: 'Компактная переговорка для быстрых стендапов.', floor: 2, capacity: 4, img: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=400&fit=crop' },
  { id: 'r3', name: 'Коворкинг «Хаб»', type: 'coworking', description: 'Открытое пространство на 20 мест для самоподготовки.', floor: 1, capacity: 20, img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop' },
  { id: 'r4', name: 'Зона «Лофт»', type: 'coworking', description: 'Уютное пространство для мозговых штурмов.', floor: 4, capacity: 12, img: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=600&h=400&fit=crop' },
  { id: 'r5', name: 'Проектор Epson EB-U50', type: 'equipment', description: 'Переносной проектор Full HD. Выдача на ресепшн.', floor: 1, capacity: 1, img: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&h=400&fit=crop' },
  { id: 'r6', name: 'Консультация — проф. Иванова', type: 'consultation', description: 'ML и анализ данных. 30-минутные слоты.', floor: 5, capacity: 1, img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop' },
];

const TYPE_LABELS = { room: 'Переговорная', coworking: 'Коворкинг', equipment: 'Оборудование', consultation: 'Консультация' };
const BADGE_CLASSES = { room: 'badge-room', coworking: 'badge-coworking', equipment: 'badge-equipment', consultation: 'badge-consultation' };

// ===== Backend: localStorage или Supabase (hw6) =====
let sbClient = null;
let useSupabase = false;
let currentUser = null;
let bookingsCache = [];
let authMode = 'login';

function loadBookingsFromLS() {
  try { return JSON.parse(localStorage.getItem('campusbook_bookings')) || []; }
  catch { return []; }
}

function persistLocalBookings() {
  if (!useSupabase) {
    localStorage.setItem('campusbook_bookings', JSON.stringify(bookingsCache));
  }
}

function isSupabaseConfigured() {
  const c = window.CAMPUSBOOK_SUPABASE || {};
  return !!(c.url && c.anonKey && String(c.url).trim().startsWith('http'));
}

function rowToBooking(row) {
  return {
    id: row.id,
    userName: row.user_name,
    resourceId: row.resource_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    status: row.status,
    createdAt: row.created_at,
    _userId: row.user_id,
  };
}

function getBookingsForList() {
  if (!useSupabase || !currentUser) return bookingsCache;
  return bookingsCache.filter(b => b._userId === currentUser.id);
}

function findConflict(resourceId, date, startTime, endTime) {
  return bookingsCache.find(b =>
    b.resourceId === resourceId &&
    b.date === date &&
    b.status === 'active' &&
    !(endTime <= b.startTime || startTime >= b.endTime)
  );
}

async function initSupabaseAndAuth() {
  if (!isSupabaseConfigured()) {
    useSupabase = false;
    sbClient = null;
    currentUser = null;
    bookingsCache = loadBookingsFromLS();
    updateAuthUI();
    updateBookingGate();
    return;
  }

  const createClient = window.supabase?.createClient;
  if (typeof createClient !== 'function') {
    console.warn('Supabase JS не загружен');
    useSupabase = false;
    bookingsCache = loadBookingsFromLS();
    updateAuthUI();
    updateBookingGate();
    return;
  }

  const cfg = window.CAMPUSBOOK_SUPABASE;
  useSupabase = true;
  sbClient = createClient(cfg.url.trim(), cfg.anonKey.trim());

  const { data: { session } } = await sbClient.auth.getSession();
  currentUser = session?.user ?? null;

  sbClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();
    updateBookingGate();
    refreshBookings();
  });

  await refreshBookings();
  updateAuthUI();
  updateBookingGate();
}

async function refreshBookings() {
  if (!useSupabase) {
    bookingsCache = loadBookingsFromLS();
  } else if (!currentUser) {
    bookingsCache = [];
  } else {
    const { data, error } = await sbClient.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      bookingsCache = [];
    } else {
      bookingsCache = (data || []).map(rowToBooking);
    }
  }
  renderBookings();
  renderStats();
}

function updateAuthUI() {
  const openAuth = document.getElementById('btn-open-auth');
  const wrap = document.getElementById('auth-user-wrap');
  const emailEl = document.getElementById('auth-email');
  if (!openAuth || !wrap) return;

  if (!useSupabase) {
    openAuth.classList.add('hidden');
    wrap.classList.add('hidden');
    return;
  }

  if (currentUser) {
    openAuth.classList.add('hidden');
    wrap.classList.remove('hidden');
    emailEl.textContent = currentUser.email || 'Пользователь';
  } else {
    wrap.classList.add('hidden');
    openAuth.classList.remove('hidden');
  }
}

function updateBookingGate() {
  const gate = document.getElementById('booking-gate');
  const formWrap = document.getElementById('booking-form-wrap');
  if (!gate || !formWrap) return;

  if (!useSupabase) {
    gate.classList.add('hidden');
    formWrap.classList.remove('hidden');
    return;
  }

  if (currentUser) {
    gate.classList.add('hidden');
    formWrap.classList.remove('hidden');
  } else {
    gate.classList.remove('hidden');
    formWrap.classList.add('hidden');
  }
}

// ===== Render resource cards =====
let currentFilter = 'all';
let currentSearch = '';

function renderCards(filter, search) {
  if (filter !== undefined) currentFilter = filter;
  if (search !== undefined) currentSearch = search.toLowerCase();

  const container = document.getElementById('resource-cards');
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
      </div>
    </div>
  `).join('');
}

// ===== Render bookings list =====
function renderBookings() {
  const container = document.getElementById('bookings-list');

  if (useSupabase && !currentUser) {
    container.innerHTML = '<p class="empty-state">Войдите, чтобы увидеть свои бронирования.</p>';
    return;
  }

  const list = getBookingsForList();
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-state">Пока нет бронирований. Создайте первое!</p>';
    return;
  }

  const sortValue = document.getElementById('sort-select').value;
  const sorted = [...list].sort((a, b) => {
    if (sortValue === 'date-asc') {
      const dateA = new Date(a.date + 'T' + a.startTime);
      const dateB = new Date(b.date + 'T' + b.startTime);
      return dateA - dateB;
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
    return `
      <div class="booking-card ${isCancelled ? 'cancelled' : ''}">
        <div class="booking-info">
          <h4>${rName}</h4>
          <p>${b.date} &middot; ${b.startTime}–${b.endTime} &middot; ${b.purpose}</p>
          <p>Бронь: ${b.userName}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="booking-status ${isCancelled ? 'status-cancelled' : 'status-active'}">
            ${isCancelled ? 'Отменено' : 'Активно'}
          </span>
          ${!isCancelled ? `<button class="btn btn-danger" onclick="showCancelModal('${safeId}')">Отменить</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== Cancel modal =====
let pendingCancelId = null;

function showCancelModal(id) {
  const booking = getBookingsForList().find(b => String(b.id) === String(id));
  if (!booking) return;

  const resource = RESOURCES.find(r => r.id === booking.resourceId);
  const rName = resource ? resource.name : booking.resourceId;

  document.getElementById('modal-details').innerHTML =
    `<strong>${rName}</strong><br>${booking.date} · ${booking.startTime}–${booking.endTime} · ${booking.purpose}`;

  pendingCancelId = id;
  document.getElementById('cancel-modal').classList.add('visible');
}

function hideCancelModal() {
  pendingCancelId = null;
  document.getElementById('cancel-modal').classList.remove('visible');
}

async function confirmCancel() {
  if (!pendingCancelId) return;

  if (useSupabase && currentUser) {
    const { error } = await sbClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', pendingCancelId)
      .eq('user_id', currentUser.id);
    if (error) {
      console.error(error);
      alert('Не удалось отменить бронь: ' + error.message);
      return;
    }
    await refreshBookings();
  } else {
    bookingsCache = bookingsCache.map(b =>
      String(b.id) === String(pendingCancelId) ? { ...b, status: 'cancelled' } : b
    );
    persistLocalBookings();
    renderBookings();
    renderStats();
  }

  hideCancelModal();
}

// ===== Render stats =====
function renderStats() {
  const container = document.getElementById('bookings-stats');
  const exportBtn = document.getElementById('export-btn');

  if (useSupabase && !currentUser) {
    container.innerHTML = '';
    if (exportBtn) exportBtn.style.display = 'none';
    return;
  }

  const list = getBookingsForList();
  if (list.length === 0) {
    container.innerHTML = '';
    if (exportBtn) exportBtn.style.display = 'none';
    return;
  }

  const active = list.filter(b => b.status === 'active').length;
  const cancelled = list.filter(b => b.status === 'cancelled').length;

  container.innerHTML = `
    <div class="stat-card"><div class="stat-num">${list.length}</div><div class="stat-label">Всего</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#065f46">${active}</div><div class="stat-label">Активных</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#991b1b">${cancelled}</div><div class="stat-label">Отменённых</div></div>
  `;

  if (exportBtn) exportBtn.style.display = 'inline-block';
}

// ===== Export bookings to JSON =====
function exportBookings() {
  const list = getBookingsForList();
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campusbook_bookings.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Populate time selects =====
function populateTimeSelects() {
  const startSel = document.getElementById('time-start');
  const endSel = document.getElementById('time-end');
  for (let h = 8; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      startSel.innerHTML += `<option value="${time}">${time}</option>`;
      endSel.innerHTML += `<option value="${time}">${time}</option>`;
    }
  }
  startSel.value = '10:00';
  endSel.value = '11:30';
}

// ===== Populate resource select =====
function populateResourceSelect() {
  const sel = document.getElementById('resource-select');
  RESOURCES.forEach(r => {
    sel.innerHTML += `<option value="${r.id}">${r.name} (${TYPE_LABELS[r.type]})</option>`;
  });
}

// ===== Set min date to today =====
function setMinDate() {
  const dateInput = document.getElementById('booking-date');
  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;
}

// ===== Form submit =====
async function handleFormSubmit(e) {
  e.preventDefault();

  const successEl = document.getElementById('booking-success');
  const errorEl = document.getElementById('booking-error');
  successEl.classList.add('hidden');
  errorEl.classList.add('hidden');

  if (useSupabase && !currentUser) {
    errorEl.textContent = 'Войдите, чтобы бронировать.';
    errorEl.classList.remove('hidden');
    return;
  }

  const userName = document.getElementById('user-name').value.trim();
  const resourceId = document.getElementById('resource-select').value;
  const date = document.getElementById('booking-date').value;
  const startTime = document.getElementById('time-start').value;
  const endTime = document.getElementById('time-end').value;
  const purpose = document.getElementById('purpose').value.trim();

  if (startTime >= endTime) {
    errorEl.textContent = 'Время начала должно быть раньше времени окончания.';
    errorEl.classList.remove('hidden');
    return;
  }

  const conflict = findConflict(resourceId, date, startTime, endTime);
  if (conflict) {
    errorEl.textContent = `Конфликт: этот ресурс уже забронирован ${conflict.startTime}–${conflict.endTime} на ${date}.`;
    errorEl.classList.remove('hidden');
    return;
  }

  if (useSupabase && currentUser) {
    const { error } = await sbClient.from('bookings').insert({
      user_id: currentUser.id,
      user_name: userName,
      resource_id: resourceId,
      date,
      start_time: startTime,
      end_time: endTime,
      purpose,
      status: 'active',
    });
    if (error) {
      errorEl.textContent = error.message || 'Ошибка сохранения в базу.';
      errorEl.classList.remove('hidden');
      return;
    }
    await refreshBookings();
  } else {
    const newBooking = {
      id: 'b_' + Date.now(),
      userName,
      resourceId,
      date,
      startTime,
      endTime,
      purpose,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    bookingsCache.push(newBooking);
    persistLocalBookings();
    renderBookings();
    renderStats();
  }

  successEl.classList.remove('hidden');
  setTimeout(() => successEl.classList.add('hidden'), 3000);

  e.target.reset();
  setMinDate();
  document.getElementById('time-start').value = '10:00';
  document.getElementById('time-end').value = '11:30';
}

// ===== Auth modal =====
function showAuthModal() {
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-modal').classList.add('visible');
}

function hideAuthModal() {
  document.getElementById('auth-modal').classList.remove('visible');
}

function setAuthTab(mode) {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.authTab === mode);
  });
  document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
  document.getElementById('auth-modal-title').textContent = mode === 'login' ? 'Вход' : 'Регистрация';
  document.getElementById('auth-error').textContent = '';
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  if (!sbClient) return;

  const errEl = document.getElementById('auth-error');
  errEl.textContent = '';
  const email = document.getElementById('auth-email-input').value.trim();
  const password = document.getElementById('auth-password-input').value;

  if (authMode === 'login') {
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) {
      errEl.textContent = error.message;
      return;
    }
    hideAuthModal();
  } else {
    const { error } = await sbClient.auth.signUp({ email, password });
    if (error) {
      errEl.textContent = error.message;
      return;
    }
    errEl.textContent = 'Если в проекте включено подтверждение email — проверьте почту. Иначе можно войти сразу.';
  }
}

// ===== Dark mode =====
function initTheme() {
  const saved = localStorage.getItem('campusbook_theme');
  if (saved === 'dark') applyDark();
}

function applyDark() {
  document.body.classList.add('dark');
  document.getElementById('theme-toggle').textContent = '☀️ Светлая';
}

function applyLight() {
  document.body.classList.remove('dark');
  document.getElementById('theme-toggle').textContent = '🌙 Тёмная';
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  if (isDark) {
    applyLight();
    localStorage.setItem('campusbook_theme', 'light');
  } else {
    applyDark();
    localStorage.setItem('campusbook_theme', 'dark');
  }
}

// ===== Filter buttons =====
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCards(btn.dataset.type);
    });
  });
}

// ===== Search =====
function initSearch() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    renderCards(undefined, e.target.value);
  });
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await initSupabaseAndAuth();

  renderCards('all');
  initFilters();
  initSearch();
  populateTimeSelects();
  populateResourceSelect();
  setMinDate();
  if (!useSupabase) {
    renderBookings();
    renderStats();
  }

  document.getElementById('booking-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('sort-select').addEventListener('change', renderBookings);
  document.getElementById('modal-back').addEventListener('click', hideCancelModal);
  document.getElementById('modal-confirm').addEventListener('click', confirmCancel);

  document.getElementById('cancel-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cancel-modal')) hideCancelModal();
  });

  document.getElementById('btn-open-auth')?.addEventListener('click', showAuthModal);
  document.getElementById('open-auth-from-gate')?.addEventListener('click', showAuthModal);
  document.getElementById('auth-modal-close')?.addEventListener('click', hideAuthModal);
  document.getElementById('auth-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('auth-modal')) hideAuthModal();
  });

  document.querySelectorAll('[data-auth-tab]').forEach(tab => {
    tab.addEventListener('click', () => setAuthTab(tab.dataset.authTab));
  });
  document.getElementById('auth-form')?.addEventListener('submit', handleAuthSubmit);

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    if (sbClient) await sbClient.auth.signOut();
    bookingsCache = [];
    renderBookings();
    renderStats();
  });
});
