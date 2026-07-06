 // ============================================================
  //  CONFIG — full CRUD, no inline event handlers (CSP‑safe)
  // ============================================================

  const SEGMENT = 'broadcaster';
  const VERSION = '1';

  let DONATORS = [];
  let editingId = null;
  let nextId = 1;
  let authorized = false;

  function formatAmount(n, cur){
    return Number(n).toLocaleString('ru-RU') + " " + cur;
  }

  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function setStatus(msg, kind){
    const el = document.getElementById('statusLine');
    el.textContent = '> ' + msg;
    el.className = 'status-line' + (kind ? ' ' + kind : '');
  }

  function sortedDonators(){
    return [...DONATORS].sort((a,b)=> b.amount - a.amount);
  }

  function renderPreview(){
    const tbody = document.getElementById('tbody');
    const top10 = sortedDonators().slice(0,10);
    tbody.innerHTML = top10.map((d,i)=>`
      <tr>
        <td>${String(i+1).padStart(2,'0')}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${formatAmount(d.amount, d.currency)}</td>
      </tr>
    `).join('');
    document.getElementById('updDate').textContent = new Date().toLocaleDateString('ru-RU');
  }

  function renderAdminTable(){
    const tbody = document.getElementById('adminTbody');
    const sorted = sortedDonators();
    tbody.innerHTML = sorted.map((d,i)=>`
      <tr data-id="${d.id}">
        <td>${String(i+1).padStart(2,'0')}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${formatAmount(d.amount, d.currency)}</td>
        <td class="actions">
          <button type="button" class="secondary edit-btn" data-id="${d.id}">EDIT</button>
          <button type="button" class="danger delete-btn" data-id="${d.id}">DEL</button>
        </td>
      </tr>
    `).join('');
  }

  function render(){
    renderPreview();
    renderAdminTable();
  }

  function saveToConfig(){
    if (!authorized || !window.Twitch || !Twitch.ext){
      setStatus('not running inside Twitch — changes are local only.', 'err');
      return;
    }
    const payload = JSON.stringify({
      donators: DONATORS,
      updatedOn: new Date().toLocaleDateString('ru-RU')
    });
    try{
      Twitch.ext.configuration.set(SEGMENT, VERSION, payload);
      setStatus('saved.', 'ok');
    } catch(e){
      console.error(e);
      setStatus('save failed: ' + e.message, 'err');
    }
  }

  function loadFromConfig(){
    try{
      const seg = Twitch.ext.configuration.broadcaster;
      if (seg && seg.content){
        const parsed = JSON.parse(seg.content);
        DONATORS = Array.isArray(parsed.donators) ? parsed.donators : [];
        DONATORS.forEach(d => { if (typeof d.id !== 'number'){ d.id = nextId++; } });
        nextId = DONATORS.reduce((m,d)=> Math.max(m, d.id+1), 1);
      }
    } catch(e){
      console.error('Failed to parse configuration content', e);
      DONATORS = [];
    }
    render();
  }

  function resetForm(){
    document.getElementById('nameInput').value = '';
    document.getElementById('amountInput').value = '';
    document.getElementById('currencySelect').value = '\u20BD';
    document.getElementById('submitBtn').textContent = 'ADD';
    document.getElementById('cancelEditBtn').style.display = 'none';
    editingId = null;
  }

  function submitForm(){
    const nameEl = document.getElementById('nameInput');
    const amountEl = document.getElementById('amountInput');
    const currencyEl = document.getElementById('currencySelect');

    const name = nameEl.value.trim();
    const amount = parseFloat(amountEl.value);
    const currency = currencyEl.value;

    if (!name){ setStatus('enter a name first.', 'err'); return; }
    if (isNaN(amount) || amount < 0){ setStatus('enter a valid amount.', 'err'); return; }

    if (editingId !== null){
      const d = DONATORS.find(x => x.id === editingId);
      if (d){ d.name = name; d.amount = amount; d.currency = currency; }
    } else {
      DONATORS.push({ id: nextId++, name, amount, currency });
    }

    resetForm();
    render();
    saveToConfig();
  }

  // ---- делегирование событий для кнопок в админ-таблице ----
  document.getElementById('adminTbody').addEventListener('click', function(e){
    const target = e.target.closest('button');
    if (!target) return;

    const id = parseInt(target.dataset.id);
    if (isNaN(id)) return;

    if (target.classList.contains('edit-btn')){
      const d = DONATORS.find(x => x.id === id);
      if (!d) return;
      document.getElementById('nameInput').value = d.name;
      document.getElementById('amountInput').value = d.amount;
      document.getElementById('currencySelect').value = d.currency;
      document.getElementById('submitBtn').textContent = 'UPDATE';
      document.getElementById('cancelEditBtn').style.display = 'inline-block';
      editingId = id;
      setStatus('editing "' + d.name + '" — change values and press UPDATE.');
    } else if (target.classList.contains('delete-btn')){
      const d = DONATORS.find(x => x.id === id);
      if (!d) return;
      if (!confirm('Delete "' + d.name + '"?')) return;
      DONATORS = DONATORS.filter(x => x.id !== id);
      if (editingId === id) resetForm();
      render();
      saveToConfig();
    }
  });

  // ---- привязка остальных обработчиков через addEventListener ----
  document.getElementById('submitBtn').addEventListener('click', submitForm);
  document.getElementById('cancelEditBtn').addEventListener('click', resetForm);
  document.getElementById('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitForm(); });
  document.getElementById('amountInput').addEventListener('keydown', e => { if (e.key === 'Enter') submitForm(); });

  // ---- инициализация ----
  render();

  if (window.Twitch && Twitch.ext){
    Twitch.ext.onAuthorized(function(auth){
      authorized = true;
      loadFromConfig();
      setStatus('loaded. ready.');
    });
  } else {
    document.getElementById('bootLine').textContent = '> STANDALONE MODE (NOT RUNNING INSIDE TWITCH)';
    setStatus('standalone mode — connect via Twitch to save.', 'err');
  }