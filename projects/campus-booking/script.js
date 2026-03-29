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

// ===== localStorage helpers =====
function loadBookings() {
  try { return JSON.parse(localStorage.getItem('campusbook_bookings')) || []; }
  catch { return []; }
}

function saveBookings(bookings) {
  localStorage.setItem('campusbook_bookings', JSON.stringify(bookings));
}

let currentFilter = 'all';
let currentSearch = '';

// ===== Render resource cards =====
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
  const bookings = loadBookings();

  if (bookings.length === 0) {
    container.innerHTML = '<p class="empty-state">Пока нет бронирований. Создайте первое!</p>';
    return;
  }

  const sorted = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  container.innerHTML = sorted.map(b => {
    const resource = RESOURCES.find(r => r.id === b.resourceId);
    const rName = resource ? resource.name : b.resourceId;
    const isCancelled = b.status === 'cancelled';
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
          ${!isCancelled ? `<button class="btn btn-danger" onclick="cancelBooking('${b.id}')">Отменить</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== Cancel booking =====
function cancelBooking(id) {
  const bookings = loadBookings().map(b =>
    b.id === id ? { ...b, status: 'cancelled' } : b
  );
  saveBookings(bookings);
  renderBookings();
  renderStats();
}

// ===== Render stats =====
function renderStats() {
  const container = document.getElementById('bookings-stats');
  const bookings = loadBookings();
  const exportBtn = document.getElementById('export-btn');

  if (bookings.length === 0) {
    container.innerHTML = '';
    if (exportBtn) exportBtn.style.display = 'none';
    return;
  }

  const active = bookings.filter(b => b.status === 'active').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;

  container.innerHTML = `
    <div class="stat-card"><div class="stat-num">${bookings.length}</div><div class="stat-label">Всего</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#065f46">${active}</div><div class="stat-label">Активных</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#991b1b">${cancelled}</div><div class="stat-label">Отменённых</div></div>
  `;

  if (exportBtn) exportBtn.style.display = 'inline-block';
}

// ===== Export bookings to JSON =====
function exportBookings() {
  const bookings = loadBookings();
  const blob = new Blob([JSON.stringify(bookings, null, 2)], { type: 'application/json' });
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
function handleFormSubmit(e) {
  e.preventDefault();

  const successEl = document.getElementById('booking-success');
  const errorEl = document.getElementById('booking-error');
  successEl.classList.add('hidden');
  errorEl.classList.add('hidden');

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

  const bookings = loadBookings();
  const conflict = bookings.find(b =>
    b.resourceId === resourceId &&
    b.date === date &&
    b.status === 'active' &&
    !(endTime <= b.startTime || startTime >= b.endTime)
  );

  if (conflict) {
    errorEl.textContent = `Конфликт: этот ресурс уже забронирован ${conflict.startTime}–${conflict.endTime} на ${date}.`;
    errorEl.classList.remove('hidden');
    return;
  }

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

  bookings.push(newBooking);
  saveBookings(bookings);

  successEl.classList.remove('hidden');
  setTimeout(() => successEl.classList.add('hidden'), 3000);

  e.target.reset();
  setMinDate();
  document.getElementById('time-start').value = '10:00';
  document.getElementById('time-end').value = '11:30';

  renderBookings();
  renderStats();
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
document.addEventListener('DOMContentLoaded', () => {
  renderCards('all');
  initFilters();
  initSearch();
  populateTimeSelects();
  populateResourceSelect();
  setMinDate();
  renderBookings();
  renderStats();
  document.getElementById('booking-form').addEventListener('submit', handleFormSubmit);
});
