// Standalone TIPA State
let tipaDraftTimeline = [];
let tipaSavedTimeline = [];
let tipaMode = 'edit';

// Modal Triggers
function openTipaModal() {
  document.getElementById('tipa-modal').classList.remove('hidden');
  renderTipaDraft();
}

function closeTipaModal() {
  document.getElementById('tipa-modal').classList.add('hidden');
  renderSavedTipaBar();
}

// Mode Switcher (Edit vs Preview)
function setTipaMode(mode) {
  tipaMode = mode;
  const btnEdit = document.getElementById('tipa-btn-edit');
  const btnPreview = document.getElementById('tipa-btn-preview');
  const editPad = document.getElementById('tipa-edit-pad');

  if (mode === 'edit') {
    btnEdit.className = 'py-2 text-xs font-bold rounded-xl bg-amber-600 text-white shadow';
    btnPreview.className = 'py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-400';
    editPad.classList.remove('hidden');
  } else {
    btnPreview.className = 'py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white shadow';
    btnEdit.className = 'py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-400';
    editPad.classList.add('hidden');
  }
}

// Tap Handler (Hooked to your existing player time)
function tapTipaChord(chord) {
  let currentTime = 0;
  
  // Safely hook to existing audio or YouTube player instance
  if (typeof player !== 'undefined' && player.getCurrentTime) {
    currentTime = player.getCurrentTime();
  } else if (document.getElementById('main-audio')) {
    currentTime = document.getElementById('main-audio').currentTime;
  }

  // Filter overlapping taps within 0.25 seconds
  tipaDraftTimeline = tipaDraftTimeline.filter(item => Math.abs(item.time - currentTime) > 0.25);
  tipaDraftTimeline.push({ time: currentTime, chord: chord });
  tipaDraftTimeline.sort((a, b) => a.time - b.time);

  renderTipaDraft();
}

function renderTipaDraft() {
  const container = document.getElementById('tipa-draft-timeline');
  if (tipaDraftTimeline.length === 0) {
    container.innerHTML = `<span class="text-slate-500 text-[11px]">No registered taps yet.</span>`;
    return;
  }

  container.innerHTML = tipaDraftTimeline.map(item => `
    <div class="bg-slate-900 border border-indigo-500/40 px-2 py-1 rounded-lg text-center shrink-0">
      <div class="text-indigo-400 font-bold text-xs">${item.chord}</div>
      <div class="text-[9px] text-slate-500">${item.time.toFixed(1)}s</div>
    </div>
  `).join('');
}

// Save Action
function saveTipaProject() {
  tipaSavedTimeline = [...tipaDraftTimeline];
  localStorage.setItem('tipa_saved_project', JSON.stringify(tipaSavedTimeline));
  alert('TIPA Project saved successfully!');
  closeTipaModal();
}

// Delete Action
function deleteTipaProject() {
  if (confirm('Delete all recorded chords in TIPA?')) {
    tipaDraftTimeline = [];
    tipaSavedTimeline = [];
    localStorage.removeItem('tipa_saved_project');
    renderTipaDraft();
    renderSavedTipaBar();
  }
}

// Render Player Bar Below Main Music Player
function renderSavedTipaBar() {
  const container = document.getElementById('tipa-saved-container');
  const list = document.getElementById('tipa-live-bar');

  if (tipaSavedTimeline.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  list.innerHTML = tipaSavedTimeline.map(item => `
    <div id="tipa-tile-${item.time.toFixed(1)}" class="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl text-center shrink-0 min-w-[50px]">
      <div class="text-indigo-400 font-bold text-xs">${item.chord}</div>
      <div class="text-[9px] text-slate-500">${item.time.toFixed(1)}s</div>
    </div>
  `).join('');
}

// Continuous Sync Hook for Active Playing Music
setInterval(() => {
  if (tipaSavedTimeline.length === 0) return;

  let currentTime = 0;
  if (typeof player !== 'undefined' && player.getCurrentTime) {
    currentTime = player.getCurrentTime();
  } else if (document.getElementById('main-audio')) {
    currentTime = document.getElementById('main-audio').currentTime;
  }

  if (currentTime === 0) return;

  // Find matching chord
  let activeChord = '--';
  for (let i = 0; i < tipaSavedTimeline.length; i++) {
    if (currentTime >= tipaSavedTimeline[i].time) {
      activeChord = tipaSavedTimeline[i].chord;
    } else {
      break;
    }
  }

  document.getElementById('tipa-live-chord').innerText = activeChord;
  const mins = Math.floor(currentTime / 60);
  const secs = (currentTime % 60).toFixed(1);
  document.getElementById('tipa-live-time').innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}, 100);

// Auto-load on startup
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('tipa_saved_project');
  if (saved) {
    tipaSavedTimeline = JSON.parse(saved);
    tipaDraftTimeline = [...tipaSavedTimeline];
    renderSavedTipaBar();
  }
});
