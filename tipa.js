// Standalone Inline TIPA Logic with Auto-Inject
let tipaTimeline = [];
let isTipaEditing = false;

// 1. Auto-Inject TIPA UI inside the Song Card below YouTube/Player
function injectTipaUI() {
  if (document.getElementById('tipa-inline-container')) return;

  // Hanapin ang player o active container sa mobile view
  const playerBox = document.querySelector('iframe') || document.querySelector('#player') || document.querySelector('main');
  if (!playerBox) return;

  const tipaHTML = `
    <div id="tipa-inline-container" class="mt-3 bg-slate-900 border border-slate-700/80 rounded-xl p-3 space-y-3">
      <div class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px] font-bold text-indigo-400 border-b border-slate-800 pb-1">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-sliders"></i> TIPA Play Bar</span>
          <span id="tipa-inline-time" class="font-mono text-slate-400">00:00.0</span>
        </div>
        <div class="flex items-center gap-2">
          <div id="tipa-inline-chord" class="bg-indigo-950 border border-indigo-500/50 text-indigo-400 font-mono text-xl font-black px-3 py-1 rounded-lg shrink-0">--</div>
          <div id="tipa-inline-bar" class="flex gap-1.5 overflow-x-auto py-1 text-xs font-mono w-full min-h-[40px] items-center">
            <span class="text-slate-500 text-[11px]">No registered chords yet. Click Edit to map.</span>
          </div>
        </div>
      </div>

      <div class="border-t border-slate-800 pt-2">
        <div id="tipa-main-ctrl">
          <button onclick="toggleTipaEditMode(true)" class="w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-pen-to-square"></i> Edit TIPA Chords
          </button>
        </div>

        <div id="tipa-edit-ctrl" class="hidden space-y-2">
          <div class="grid grid-cols-7 gap-1 bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
            <button onclick="tapTipaChord('C')" class="bg-indigo-600 text-white font-bold text-xs py-1.5 rounded active:scale-90">C</button>
            <button onclick="tapTipaChord('D')" class="bg-indigo-600 text-white font-bold text-xs py-1.5 rounded active:scale-90">D</button>
            <button onclick="tapTipaChord('E')" class="bg-indigo-600 text-white font-bold text-xs py-1.5 rounded active:scale-90">E</button>
            <button onclick="tapTipaChord('F')" class="bg-indigo-600 text-white font-bold text-xs py-1.5 rounded active:scale-90">F</button>
            <button onclick="tapTipaChord('G')" class="bg-indigo-600 text-white font-bold text-xs py-1.5 rounded active:scale-90">G</button>
            <button onclick="tapTipaChord('A')" class="bg-indigo-600 text-white font-bold text-xs py-1.5 rounded active:scale-90">A</button>
            <button onclick="tapTipaChord('B')" class="bg-indigo-600 text-white font-bold text-xs py-1.5 rounded active:scale-90">B</button>

            <button onclick="tapTipaChord('Cm')" class="bg-slate-700 text-slate-200 font-bold text-xs py-1 rounded active:scale-90">Cm</button>
            <button onclick="tapTipaChord('Dm')" class="bg-slate-700 text-slate-200 font-bold text-xs py-1 rounded active:scale-90">Dm</button>
            <button onclick="tapTipaChord('Em')" class="bg-slate-700 text-slate-200 font-bold text-xs py-1 rounded active:scale-90">Em</button>
            <button onclick="tapTipaChord('Fm')" class="bg-slate-700 text-slate-200 font-bold text-xs py-1 rounded active:scale-90">Fm</button>
            <button onclick="tapTipaChord('Gm')" class="bg-slate-700 text-slate-200 font-bold text-xs py-1 rounded active:scale-90">Gm</button>
            <button onclick="tapTipaChord('Am')" class="bg-slate-700 text-slate-200 font-bold text-xs py-1 rounded active:scale-90">Am</button>
            <button onclick="tapTipaChord('Bm')" class="bg-slate-700 text-slate-200 font-bold text-xs py-1 rounded active:scale-90">Bm</button>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1">
            <button onclick="undoTipaChord()" class="bg-slate-800 text-amber-400 border border-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-lg">Undo</button>
            <div class="flex gap-1.5">
              <button onclick="toggleTipaEditMode(false)" class="bg-slate-800 text-slate-300 text-[11px] font-bold px-3 py-1.5 rounded-lg">Exit</button>
              <button onclick="saveTipaProject()" class="bg-emerald-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-lg">Save</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  playerBox.insertAdjacentHTML('afterend', tipaHTML);
  renderTipaBar();
}

// 2. Controls & Event Listeners
function toggleTipaEditMode(showEdit) {
  isTipaEditing = showEdit;
  document.getElementById('tipa-main-ctrl').classList.toggle('hidden', showEdit);
  document.getElementById('tipa-edit-ctrl').classList.toggle('hidden', !showEdit);
}

function getTipaPlayerTime() {
  if (typeof player !== 'undefined' && player.getCurrentTime) return player.getCurrentTime();
  const audio = document.getElementById('main-audio');
  return audio ? audio.currentTime : 0;
}

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
    <div id="tipa-node-${item.time.toFixed(1)}" class="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-center shrink-0 min-w-[42px]">
      <div class="text-indigo-400 font-bold text-xs">${item.chord}</div>
      <div class="text-[9px] text-slate-500">${item.time.toFixed(1)}s</div>
    </div>
  `).join('');
}

// 3. Continuous Sync Engine
setInterval(() => {
  injectTipaUI();

  const currentTime = getTipaPlayerTime();
  const mins = Math.floor(currentTime / 60);
  const secs = (currentTime % 60).toFixed(1);
  const timeEl = document.getElementById('tipa-inline-time');
  if (timeEl) timeEl.innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;

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

  document.querySelectorAll('#tipa-inline-bar > div').forEach(el => el.classList.remove('border-indigo-500', 'bg-indigo-950'));
  if (activeTime !== null) {
    const activeTile = document.getElementById(`tipa-node-${activeTime.toFixed(1)}`);
    if (activeTile) activeTile.classList.add('border-indigo-500', 'bg-indigo-950');
  }
}, 300);

// Load Saved Data
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('tipa_saved_project');
  if (saved) tipaTimeline = JSON.parse(saved);
});
