// ==========================================
// PART 1: BFBC RULER & TIMELINE SYNC ENGINE
// ==========================================

let activeYTPlayer = null;
let animFrameId = null;
const pixelsPerSecond = 100; // Ruler movement speed scale
let activeSongId = null;

const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const chordRows = [
    { suffix: '' },
    { suffix: 'm' },
    { suffix: '7' },
    { suffix: 'm7' },
    { suffix: 'Maj7' },
    { suffix: '#' },
    { suffix: '#m' },
    { suffix: '#m7' }
];

// 1. YouTube Player Loader (Additive overlay)
window.loadYTPlayer = function(songId, videoId) {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    activeSongId = songId;

    const playerContainer = document.getElementById(`yt-player-${songId}`);
    if (!playerContainer) return;

    playerContainer.classList.remove('hidden');

    playerContainer.innerHTML = `
        <div class="video-container rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video mt-2">
            <div id="yt-iframe-instance-${songId}"></div>
        </div>

        <div class="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            <!-- Red Center Line Pointer & Ruler Track -->
            <div class="ruler-wrapper relative w-full h-[60px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div class="center-pointer absolute left-1/2 top-0 bottom-0 w-[2px] bg-red-500 z-20 -translate-x-1/2"></div>
                <div class="ruler-track absolute top-0 h-full left-1/2 flex items-end" id="rulerTrack-${songId}"></div>
            </div>

            <!-- Active Playback Display & Save Action -->
            <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Playing Chord: <strong id="currentChordLabel-${songId}" class="text-emerald-400 text-sm font-bold">None</strong></span>
                <button onclick="syncTappedChordsToBFBC('${songId}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-all cursor-pointer">
                    <i class="fa-solid fa-floppy-disk"></i> Save Chords to BFBC
                </button>
            </div>

            <!-- 7x8 Manual Tap Chord Matrix -->
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 max-h-56 overflow-y-auto">
                <div id="chordMatrix-${songId}" class="grid grid-cols-7 gap-1"></div>
            </div>
        </div>
    `;

    renderChordMatrixUI(songId);

    activeYTPlayer = new YT.Player(`yt-iframe-instance-${songId}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 'playsinline': 1, 'autoplay': 1 },
        events: {
            'onStateChange': (event) => onPlayerStateChange(event, songId),
            'onReady': (event) => {
                buildRulerTicks(songId, event.target.getDuration() || 300);
            }
        }
    });
};

// 2. Build 7x8 Chord Matrix Buttons
function renderChordMatrixUI(songId) {
    const matrix = document.getElementById(`chordMatrix-${songId}`);
    if (!matrix) return;
    matrix.innerHTML = '';

    chordRows.forEach(row => {
        notes.forEach(note => {
            const chordName = `${note}${row.suffix}`;
            const btn = document.createElement('button');
            btn.className = 'chord-btn bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded text-[11px] font-bold border border-slate-700 text-center active:scale-95 transition-all cursor-pointer';
            btn.textContent = chordName;
            
            // Call Part 2 Tapping Helper
            btn.onclick = () => tapChordToSong(songId, chordName);
            matrix.appendChild(btn);
        });
    });
}

// 3. Build Timeline Ruler Scale
function buildRulerTicks(songId, duration) {
    const track = document.getElementById(`rulerTrack-${songId}`);
    if (!track) return;

    track.innerHTML = '';
    const step = 0.1;
    const totalTicks = Math.min(Math.ceil(duration / step), 3000);

    for (let i = 0; i <= totalTicks; i++) {
        const timeVal = i * step;
        const tick = document.createElement('div');
        const isMajor = i % 10 === 0;

        tick.className = `absolute bottom-0 w-[1px] ${isMajor ? 'h-4 bg-slate-400' : 'h-2 bg-slate-700'}`;
        tick.style.left = `${timeVal * pixelsPerSecond}px`;

        if (isMajor) {
            const label = document.createElement('span');
            label.className = 'absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-[9px] text-slate-400';
            label.textContent = `${timeVal.toFixed(0)}s`;
            tick.appendChild(label);
        }
        track.appendChild(tick);
    }
    renderRulerMarkers(songId);
}

// 4. Track Video State & Continuous Animation Sync
function onPlayerStateChange(event, songId) {
    if (event.data === YT.PlayerState.PLAYING) {
        buildRulerTicks(songId, activeYTPlayer.getDuration());
        syncRulerLoop(songId);
    } else {
        if (animFrameId) cancelAnimationFrame(animFrameId);
    }
}

function syncRulerLoop(songId) {
    if (activeYTPlayer && typeof activeYTPlayer.getCurrentTime === 'function') {
        const currentTime = activeYTPlayer.getCurrentTime();
        const offsetPixels = currentTime * pixelsPerSecond;

        // Shift ruler track behind red center pointer
        const track = document.getElementById(`rulerTrack-${songId}`);
        if (track) {
            track.style.transform = `translateX(-${offsetPixels}px)`;
        }

        // Search current playing chord from song's chords array
        const targetSong = songs.find(s => s.id == songId);
        let currentActiveChord = 'None';

        if (targetSong && targetSong.chords) {
            for (let i = targetSong.chords.length - 1; i >= 0; i--) {
                if (currentTime >= targetSong.chords[i].time) {
                    currentActiveChord = targetSong.chords[i].chord;
                    break;
                }
            }
        }

        // Active Chord Label Update
        const activeLabel = document.getElementById(`currentChordLabel-${songId}`);
        if (activeLabel) activeLabel.textContent = currentActiveChord;

        // Active Matrix Button Highlight
        const matrix = document.getElementById(`chordMatrix-${songId}`);
        if (matrix) {
            matrix.querySelectorAll('.chord-btn').forEach(btn => {
                if (btn.textContent === currentActiveChord) {
                    btn.classList.add('bg-emerald-500', 'text-slate-950', 'border-emerald-400');
                    btn.classList.remove('bg-slate-800', 'text-slate-200');
                } else {
                    btn.classList.remove('bg-emerald-500', 'text-slate-950', 'border-emerald-400');
                    btn.classList.add('bg-slate-800', 'text-slate-200');
                }
            });
        }
    }
    animFrameId = requestAnimationFrame(() => syncRulerLoop(songId));
}// ==========================================
// PART 2: MANUAL TAPPING & BFBC DB SYNC
// ==========================================

// 1. Manual Chord Tapper at Red Line Timestamp
window.tapChordToSong = function(songId, chordName) {
    if (!activeYTPlayer || typeof activeYTPlayer.getCurrentTime !== 'function') return;

    // Kunin ang eksaktong oras sa red center line
    const currentTime = parseFloat(activeYTPlayer.getCurrentTime().toFixed(2));

    const targetSong = songs.find(s => s.id == songId);
    if (!targetSong) return;

    if (!targetSong.chords) {
        targetSong.chords = [];
    }

    // Overwrite lumang chord stamp kung malapit sa parehong pwesto (< 0.3s)
    targetSong.chords = targetSong.chords.filter(c => Math.abs(c.time - currentTime) > 0.3);

    // Idagdag ang bagong na-tap na chord
    targetSong.chords.push({
        id: Date.now(),
        time: currentTime,
        chord: chordName
    });

    targetSong.chords.sort((a, b) => a.time - b.time);

    // I-render agad ang green badge sa ruler
    renderRulerMarkers(songId);
};

// 2. Render Green Badges on Ruler
window.renderRulerMarkers = function(songId) {
    const track = document.getElementById(`rulerTrack-${songId}`);
    if (!track) return;

    // Clean old badges
    track.querySelectorAll('.chord-badge').forEach(b => b.remove());

    const targetSong = songs.find(s => s.id == songId);
    if (!targetSong || !targetSong.chords) return;

    targetSong.chords.forEach(item => {
        const badge = document.createElement('div');
        badge.className = 'chord-badge absolute bottom-5 -translate-x-1/2 bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded shadow z-10 cursor-pointer';
        badge.textContent = item.chord;
        badge.style.left = `${item.time * pixelsPerSecond}px`;

        // Click badge to delete marker
        badge.onclick = (e) => {
            e.stopPropagation();
            targetSong.chords = targetSong.chords.filter(c => c.id !== item.id);
            renderRulerMarkers(songId);
        };

        track.appendChild(badge);
    });
};

// 3. Save Tapped Chords Directly to BFBC Supabase DB
window.syncTappedChordsToBFBC = async function(songId) {
    const targetSong = songs.find(s => s.id == songId);
    if (!targetSong) return;

    if (db) {
        try {
            const { error } = await db
                .from('songs_sandbox') // Ang iyong aktibong BFBC songs table
                .update({ chords: targetSong.chords })
                .eq('id', songId);

            if (error) {
                alert("BFBC Database Error: " + error.message);
            } else {
                alert("Successfully saved chords to BFBC database!");
            }
        } catch (err) {
            console.error("Sync error:", err);
            alert("Saved locally in session.");
        }
    } else {
        alert("Saved locally in session.");
    }
};
