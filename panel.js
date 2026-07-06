// panel.js — viewer panel, автоматическое обновление каждые 5 секунд
// С подробными консоль-логами для отладки

let DONATORS = [];
let UPDATED_ON = "";
let refreshInterval = null;

function formatAmount(n, cur) {
  return Number(n).toLocaleString('ru-RU') + " " + cur;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function render() {
  const tbody = document.getElementById('tbody');
  const content = document.getElementById('content');

  const emptyMsg = document.getElementById('emptyMsg');
  if (emptyMsg) emptyMsg.remove();

  if (!DONATORS || DONATORS.length === 0) {
    tbody.innerHTML = '';
    const div = document.createElement('div');
    div.id = 'emptyMsg';
    div.className = 'empty-state';
    div.textContent = '> NO DONOR DATA YET. WAITING FOR STREAMER TO CONFIGURE...';
    content.appendChild(div);
    document.getElementById('updDate').textContent = '--';
    updateHeight(); // обновить высоту для пустого состояния
    return;
  }

  const sorted = [...DONATORS].sort((a,b) => b.amount - a.amount).slice(0,10);
  tbody.innerHTML = sorted.map((d,i) => `
    <tr>
      <td>${String(i+1).padStart(2,'0')}</td>
      <td>${escapeHtml(d.name)}</td>
      <td>${formatAmount(d.amount, d.currency)}</td>
    </tr>
  `).join('');
  document.getElementById('updDate').textContent = UPDATED_ON || '--';
  
  updateHeight(); // обновить высоту после рендера
}

function updateHeight() {
  if (!window.Twitch || !Twitch.ext || !Twitch.ext.actions) return;
  
  const rowHeight = 26;
  const headerHeight = 100;
  const footerHeight = 40;
  const rows = document.querySelectorAll('#tbody tr').length;
  const totalHeight = headerHeight + rows * rowHeight + footerHeight;
  const finalHeight = Math.min(Math.max(totalHeight, 200), 800);
  

  Twitch.ext.actions.setHeight(finalHeight);
}
function loadFromSegment() {

  try {
    const seg = window.Twitch && Twitch.ext && Twitch.ext.configuration.broadcaster;

    if (seg && seg.content) {

      const parsed = JSON.parse(seg.content);

      DONATORS = Array.isArray(parsed.donators) ? parsed.donators : [];
      UPDATED_ON = parsed.updatedOn || '';
    } else {
      console.warn('No configuration content found (seg or seg.content is null/undefined)');
      DONATORS = [];
      UPDATED_ON = '';
    }
  } catch(e) {
    console.error('Failed to parse configuration content', e);
    DONATORS = [];
  }
  render();
}

function tickClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const ss = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('clock').textContent = `${hh}:${mm}:${ss}`;
}

// Инициализация часов
tickClock();
setInterval(tickClock, 1000);



if (window.Twitch && Twitch.ext) {

  Twitch.ext.onAuthorized(function(auth) {

    // Первая загрузка
    loadFromSegment();
    // Подписка на изменения
    Twitch.ext.configuration.onChanged(function() {

      loadFromSegment();
    });
    // Запускаем обновление каждые 5 секунд (гарантия свежести)
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(loadFromSegment, 5000);

  });
} else {
  console.warn('Twitch.ext is NOT available — running in standalone mode');
  document.getElementById('bootLine').textContent = '> STANDALONE MODE (NOT RUNNING INSIDE TWITCH)';
  render();
}