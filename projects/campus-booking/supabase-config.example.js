/**
 * Пример конфигурации. Скопируйте в supabase-config.js и заполните значения.
 * Без ключей Supabase приложение работает в режиме localStorage (без входа).
 */

// Supabase — URL проекта и anon key (Settings → API).
window.CAMPUSBOOK_SUPABASE = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',

  // Email для автоматического доступа к AdminPanel.
  // Зарегистрируйтесь с этим адресом — кнопка ⚙ появится без SQL.
  // Для надёжности также выполните в SQL Editor:
  //   UPDATE profiles SET is_admin = true WHERE email = 'admin@...';
  adminEmail: 'admin@yourdomain.com',
};

// Microsoft Clarity — ID трекера (clarity.microsoft.com → Settings → Install).
// Пусто = аналитика отключена.
window.CAMPUSBOOK_CLARITY_ID = '';
