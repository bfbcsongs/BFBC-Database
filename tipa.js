let tipaTimeline = [];
let isTipaEditing = false;
let isDeploying = false;

// 1. Toggle Controls UI
function toggleTipaEditMode(showEdit) {
  isTipaEditing = showEdit;
  const mainCtrl = document.getElementById('tipa-main-ctrl');
  const editCtrl = document.getElementById('tipa-edit-ctrl');
  if (mainCtrl && editCtrl) {
    mainCtrl.classList.toggle('hidden', showEdit);
    editCtrl.classList.toggle('hidden', !showEdit);
  }
}

// 2. Deploy Mode Toggle (Chordify Performance View)
function toggleDeployMode() {
  isDeploying = !isDeploying;
  const deployBtn = document.getElementById('tipa-deploy-btn');
  const deployBadge = document.getElementById('tipa-deploy-badge');

  if (isDeploying) {
    deployBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 rounded-xl shadow-lg border border-emerald-400 flex items-center justify-center gap-2 active:scale-95 transition";
    deployBtn.innerHTML = `<i class="fa-solid fa-circle-stop animate-pulse text-red-400"></i> Exit Deploy Mode`;
    if (deployBadge) deployBadge.classList.remove('hidden');
  } else {
    deployBtn.className = "w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-xl shadow border border-indigo-400 flex items-center justify-center gap-2 active:scale-95 transition";
    deployBtn.innerHTML = `<i class="fa-solid fa-play"></i> Deploy Live Sync (Chordify Mode)`;
    if (deployBadge) deployBadge.classList.add('hidden');
  }
}

// 3. Time Engine Capture
function getTipaPlayerTime() {
  if (typeof player !== 'undefined' && player && typeof player.getCurrentTime === 'function') {
    return player.getCurrentTime() || 0;
  }
  
  const audio = document.getElementById('main-audio') || document.querySelector('audio') || document.querySelector('video');
  if (audio && !isNaN(audio.currentTime)) {
    return audio.currentTime;
  }

  const iframe = document.querySelector('iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage('{"event":"command","func":"getCurrentTime","args":""}', '*');
  }

  return window.lastTipaYTTime || 0;
}

window.addEventListener('message', function(event) {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data && data.info && typeof data.info.currentTime === 'number') {
      window.lastTipaYTTime = data.info.currentTime;
    }
  } catch(e) {}
});

// 4. Chord Tap & Recording
function tapTipaChord(chord) {
  const currentTime = getTipaPlayerTime();
  tipaTimeline = tipaTimeline.filter(item => Math.abs(item.time - currentTime) > 0.25);
  tipaTimeline.push({ time: currentTime, chord: chord });
  tipaTimeline.sort((a, b) => a.time - b.time);
  renderTipaBar();
}

function undoTipaChord() {
  if (tipaTimeline.length > 0) {
    tipaTimeline.pop();
    renderTipaBar();
  }
}

function saveTipaProject() {
  localStorage.setItem('tipa_saved_project', JSON.stringify(tipaTimeline));
  alert('TIPA Project Saved Successfully!');
  toggleTipaEditMode(false);
}

function renderTipaBar() {
  const container = document.getElementById('tipa-inline-bar');
  if (!container) return;

  if (tipaTimeline.length === 0) {
    container.innerHTML = `<span class="text-slate-500 text-[11px]">No registered chords yet. Click Edit to map.</span>`;
    return;
  }

  container.innerHTML = tipaTimeline.map(item => `
    <div id="tipa-node-${item.time.toFixed(1)}" class="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-center shrink-0 min-w-[48px] transition-all">
      <div class="text-indigo-400 font-bold text-sm">${item.chord}</div>
      <div class="text-[9px] text-slate-500">${item.time.toFixed(1)}s</div>
    </div>
  `).join('');
}

// 5. Continuous Sync Engine (Chordify Auto-Scroll & Highlighting)
setInterval(() => {
  const currentTime = getTipaPlayerTime();
  
  const mins = Math.floor(currentTime / 60);
  const secs = (currentTime % 60).toFixed(1);
  const timeEl = document.getElementById('tipa-inline-time');
  if (timeEl) {
    timeEl.innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  if (tipaTimeline.length === 0) return;

  let activeChord = '--';
  let activeTime = null;

  for (let i = 0; i < tipaTimeline.length; i++) {
    if (currentTime >= tipaTimeline[i].time) {
      activeChord = tipaTimeline[i].chord;
      activeTime = tipaTimeline[i].time;
    } else {
      break;
    }
  }

  const chordEl = document.getElementById('tipa-inline-chord');
  if (chordEl) chordEl.innerText = activeChord;

  // Active Tile Highlight & Auto-scroll in Deploy Mode
  document.querySelectorAll('#tipa-inline-bar > div').forEach(el => {
    el.classList.remove('border-emerald-400', 'bg-emerald-950', 'scale-110', 'shadow-lg');
    el.classList.add('border-slate-700', 'bg-slate-900');
  });

  if (activeTime !== null) {
    const activeTile = document.getElementById(`tipa-node-${activeTime.toFixed(1)}`);
    if (activeTile) {
      activeTile.classList.remove('border-slate-700', 'bg-slate-900');
      activeTile.classList.add('border-emerald-400', 'bg-emerald-950', 'scale-110', 'shadow-lg');
      
      if (isDeploying) {
        activeTile.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }
}, 150);

const saved = localStorage.getItem('tipa_saved_project');
if (saved) tipaTimeline = JSON.parse(saved);
