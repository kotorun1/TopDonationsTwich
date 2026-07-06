  // ============================================================
  //  PANEL (viewer view) — reads donators from the Twitch
  //  Configuration Service "broadcaster" segment and renders
  //  them, sorted by amount, top 10 only. No backend required.
  // ============================================================

  let DONATORS = [];
  let UPDATED_ON = "";

  function formatAmount(n, cur){
    return Number(n).toLocaleString('ru-RU') + " " + cur;
  }

  function render(){
    const tbody = document.getElementById('tbody');
    const content = document.getElementById('content');

    if (!DONATORS.length){
      tbody.innerHTML = '';
      if (!document.getElementById('emptyMsg')){
        const div = document.createElement('div');
        div.id = 'emptyMsg';
        div.className = 'empty-state';
        div.textContent = '> NO DONOR DATA YET. WAITING FOR STREAMER TO CONFIGURE...';
        content.appendChild(div);
      }
      document.getElementById('updDate').textContent = '--';
      return;
    }

    const existingEmpty = document.getElementById('emptyMsg');
    if (existingEmpty) existingEmpty.remove();

    const sorted = [...DONATORS].sort((a,b)=> b.amount - a.amount).slice(0,10);
    tbody.innerHTML = sorted.map((d,i)=>{
      return `<tr>
        <td>${String(i+1).padStart(2,'0')}</td>
        <td>${escapeHtml(d.name)}</td>
        <td>${formatAmount(d.amount, d.currency)}</td>
      </tr>`;
    }).join('');
    document.getElementById('updDate').textContent = UPDATED_ON || '--';
  }

  function escapeHtml(s){
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function tickClock(){
    const now = new Date();
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    const ss = String(now.getSeconds()).padStart(2,'0');
    document.getElementById('clock').textContent = `${hh}:${mm}:${ss}`;
  }

  function loadFromSegment(){
    try{
      const seg = window.Twitch && Twitch.ext.configuration.broadcaster;
      if (seg && seg.content){
        const parsed = JSON.parse(seg.content);
        DONATORS = Array.isArray(parsed.donators) ? parsed.donators : [];
        UPDATED_ON = parsed.updatedOn || '';
      } else {
        DONATORS = [];
        UPDATED_ON = '';
      }
    } catch(e){
      console.error('Failed to parse configuration content', e);
      DONATORS = [];
    }
    render();
  }

  tickClock();
  setInterval(tickClock, 1000);

  if (window.Twitch && Twitch.ext){
    Twitch.ext.onAuthorized(function(auth){
      loadFromSegment();
    });
    Twitch.ext.configuration.onChanged(function(){
      loadFromSegment();
    });
  } else {
    // fallback so the page still shows something when opened outside Twitch
    document.getElementById('bootLine').textContent = '> STANDALONE MODE (NOT RUNNING INSIDE TWITCH)';
    render();
  }