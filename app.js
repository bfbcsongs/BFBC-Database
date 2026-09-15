// ========================================================
// 1. SUPABASE CONFIGURATION & INITIALIZATION
// ========================================================
const SUPABASE_URL = 'https://xyqyjxllzstgkgfmsvwf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cXlqeGxsenN0Z2tnZm1zdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzgwMTgsImV4cCI6MjA1NjgxNDAxOH0.1_R6T79G2-W8P4mQ90L_0M-J1N_y9I8P32_xY-a_m_o';

let db = null;
if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Global Application State
let songs = [];
let activeYTPlayer = null;
let animFrameId = null;
const pixelsPerSecond = 100;
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

// Helper to locate DOM element across common template IDs
function getAppContainer() {
    return document.getElementById('song-container') || 
           document.getElementById('songList') || 
           document.getElementById('songs-list') || 
           document.getElementById('app');
}

// ========================================================
// 2. UI ENGINE & MATRIX GENERATOR
// ========================================================

window.renderChordMatrixUI = function(songId) {
    const matrixContainer = document.getElementById(`chordMatrix-${songId}`);
    if (!matrixContainer) return;

    matrixContainer.innerHTML = '';
    chordRows.forEach(row => {
        notes.forEach(note => {
            const chordName = `${note}${row.suffix}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chord-btn p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-all cursor-pointer text-center';
            btn.textContent = chordName;
            btn.onclick = () => tapChordToSong(songId, chordName);
            matrixContainer.appendChild(btn);
        });
    });
};

window.loadYTPlayer = function(songId, videoId) {
    if (window.animFrameId) cancelAnimationFrame(window.animFrameId);
    window.activeSongId = songId;

    let playerContainer = document.getElementById(`yt-player-${songId}`);
    let previewContainer = document.getElementById(`yt-preview-${songId}`);
    if (!playerContainer) return;

    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    playerContainer.classList.remove('hidden');

    playerContainer.innerHTML = `
        <div class="video-container rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video relative">
            <div id="yt-iframe-instance-${songId}"></div>
        </div>

        <div class="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            <div class="ruler-wrapper relative w-full h-[60px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div class="center-pointer absolute left-1/2 top-0 bottom-0 w-[2px] bg-red-500 z-20 -translate-x-1/2"></div>
                <div class="ruler-track absolute top-0 h-full left-1/2 flex items-end" id="rulerTrack-${songId}"></div>
            </div>

            <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Playing Chord: <strong id="currentChordLabel-${songId}" class="text-emerald-400 text-sm font-bold">None</strong></span>
                <button onclick="syncTappedChordsToBFBC('${songId}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-all cursor-pointer">
                    <i class="fa-solid fa-floppy-disk"></i> Save Chords to BFBC
                </button>
            </div>

            <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 max-h-56 overflow-y-auto">
                <div id="chordMatrix-${songId}" class="grid grid-cols-7 gap-1"></div>
            </div>
        </div>
    `;

    renderChordMatrixUI(songId);

    window.activeYTPlayer = new YT.Player(`yt-iframe-instance-${songId}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 
            'playsinline': 1, 
            'autoplay': 1,
            'enablejsapi': 1 
        },
        events: {
            'onStateChange': (event) => onPlayerStateChange(event, songId),
            'onReady': (event) => {
                buildRulerTicks(songId, event.target.getDuration() || 300);
                event.target.playVideo();
            }
        }
    });
};

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

        const track = document.getElementById(`rulerTrack-${songId}`);
        if (track) {
            track.style.transform = `translateX(-${offsetPixels}px)`;
        }

        const targetSong = songs.find(s => s.id == songId);
        let currentActiveChord = 'None';

        if (targetSong && targetSong.chords && Array.isArray(targetSong.chords)) {
            for (let i = targetSong.chords.length - 1; i >= 0; i--) {
                if (currentTime >= targetSong.chords[i].time) {
                    currentActiveChord = targetSong.chords[i].chord;
                    break;
                }
            }
        }

        const activeLabel = document.getElementById(`currentChordLabel-${songId}`);
        if (activeLabel) activeLabel.textContent = currentActiveChord;

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
}

// ========================================================
// 3. TAPPING ENGINE & BACKEND SYNC
// ========================================================

window.tapChordToSong = function(songId, chordName) {
    if (!activeYTPlayer || typeof activeYTPlayer.getCurrentTime !== 'function') return;

    const currentTime = parseFloat(activeYTPlayer.getCurrentTime().toFixed(2));
    const targetSong = songs.find(s => s.id == songId);
    if (!targetSong) return;

    if (!targetSong.chords || !Array.isArray(targetSong.chords)) {
        targetSong.chords = [];
    }

    targetSong.chords = targetSong.chords.filter(c => Math.abs(c.time - currentTime) > 0.3);

    targetSong.chords.push({
        id: Date.now(),
        time: currentTime,
        chord: chordName
    });

    targetSong.chords.sort((a, b) => a.time - b.time);
    renderRulerMarkers(songId);
};

window.renderRulerMarkers = function(songId) {
    const track = document.getElementById(`rulerTrack-${songId}`);
    if (!track) return;

    track.querySelectorAll('.chord-badge').forEach(b => b.remove());

    const targetSong = songs.find(s => s.id == songId);
    if (!targetSong || !targetSong.chords || !Array.isArray(targetSong.chords)) return;

    targetSong.chords.forEach(item => {
        const badge = document.createElement('div');
        badge.className = 'chord-badge absolute bottom-5 -translate-x-1/2 bg-emerald-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded shadow z-10 cursor-pointer';
        badge.textContent = item.chord;
        badge.style.left = `${item.time * pixelsPerSecond}px`;

        badge.onclick = (e) => {
            e.stopPropagation();
            targetSong.chords = targetSong.chords.filter(c => c.id !== item.id);
            renderRulerMarkers(songId);
        };

        track.appendChild(badge);
// ========================================================
// 1. SUPABASE INITIALIZATION (ORIGINAL WORKING FETCH)
// ========================================================
const SUPABASE_URL = 'https://xyqyjxllzstgkgfmsvwf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cXlqeGxsenN0Z2tnZm1zdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzgwMTgsImV4cCI6MjA1NjgxNDAxOH0.1_R6T79G2-W8P4mQ90L_0M-J1N_y9I8P32_xY-a_m_o';

let db = null;
if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let songs = [];
let activeYTPlayer = null;
let animFrameId = null;
const pixelsPerSecond = 100;

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

// ========================================================
// 2. SONG FETCH & RENDER (ORIGINAL WORKING IMPLEMENTATION)
// ========================================================

async function fetchAndRenderSongs() {
    if (!db) return;

    try {
        const { data, error } = await db
            .from('songs_sandbox')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error);
            return;
        }

        if (data) {
            songs = data;
            renderSongs(songs);
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

function renderSongs(songsToRender) {
    // Dynamically target whichever container exists in index.html
    const container = document.getElementById('song-container') || 
                      document.getElementById('songList') || 
                      document.getElementById('songs-list');

    if (!container) return;

    if (!songsToRender || songsToRender.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-slate-500">No songs found.</div>';
        return;
    }

    container.innerHTML = songsToRender.map(song => `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg mb-4">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="text-lg font-bold text-white">${song.title || 'Untitled'}</h3>
                    <p class="text-xs text-slate-400">${song.artist || 'Unknown Artist'} ${song.key ? `• Key: ${song.key}` : ''}</p>
                </div>
            </div>

            ${song.youtube_id ? `
                <div id="yt-preview-${song.id}" class="relative bg-slate-950 border border-slate-800 rounded-lg overflow-hidden group cursor-pointer" onclick="loadYTPlayer('${song.id}', '${song.youtube_id}')">
                    <img src="https://img.youtube.com/vi/${song.youtube_id}/hqdefault.jpg" class="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-all">
                    <div class="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                        <button class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform">
                            <i class="fa-solid fa-play ml-1"></i>
                        </button>
                    </div>
                </div>
                <div id="yt-player-${song.id}" class="hidden"></div>
            ` : '<p class="text-xs text-slate-500 italic">No YouTube video attached.</p>'}
        </div>
    `).join('');
}

// ========================================================
// 3. YOUTUBE & CHORD MATRIX ENGINE
// ========================================================

window.renderChordMatrixUI = function(songId) {
    const matrixContainer = document.getElementById(`chordMatrix-${songId}`);
    if (!matrixContainer) return;

    matrixContainer.innerHTML = '';
    chordRows.forEach(row => {
        notes.forEach(note => {
            const chordName = `${note}${row.suffix}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chord-btn p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700 transition-all cursor-pointer text-center';
            btn.textContent = chordName;
            btn.onclick = () => tapChordToSong(songId, chordName);
            matrixContainer.appendChild(btn);
        });
    });
};

window.loadYTPlayer = function(songId, videoId) {
    if (window.animFrameId) cancelAnimationFrame(window.animFrameId);

    let playerContainer = document.getElementById(`yt-player-${songId}`);
    let previewContainer = document.getElementById(`yt-preview-${songId}`);
    if (!playerContainer) return;

    if (previewContainer) previewContainer.style.display = 'none';
    playerContainer.classList.remove('hidden');

    playerContainer.innerHTML = `
        <div class="video-container rounded-lg overflow-hidden border border-slate-700 bg-black aspect-video relative">
            <div id="yt-iframe-instance-${songId}"></div>
        </div>

        <div class="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            <div class="ruler-wrapper relative w-full h-[60px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div class="center-pointer absolute left-1/2 top-0 bottom-0 w-[2px] bg-red-500 z-20 -translate-x-1/2"></div>
                <div class="ruler-track absolute top-0 h-full left-1/2 flex items-end" id="rulerTrack-${songId}"></div>
            </div>

            <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Playing Chord: <strong id="currentChordLabel-${songId}" class="text-emerald-400 text-sm font-bold">None</strong></span>
                <button onclick="syncTappedChordsToBFBC('${songId}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-all cursor-pointer">
                    <i class="fa-solid fa-floppy-disk"></i> Save Chords to BFBC
                </button>
            </div>

            <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 max-h-56 overflow-y-auto">
                <div id="chordMatrix-${songId}" class="grid grid-cols-7 gap-1"></div>
            </div>
        </div>
    `;

    renderChordMatrixUI(songId);

    window.activeYTPlayer = new YT.Player(`yt-iframe-instance-${songId}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 'playsinline': 1, 'autoplay': 1, 'enablejsapi': 1 },
        events: {
            'onStateChange': (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                    syncRulerLoop(songId);
                } else if (animFrameId) {
                    cancelAnimationFrame(animFrameId);
                }
            }
        }
    });
};

window.tapChordToSong = function(songId, chordName) {
    if (!activeYTPlayer || typeof activeYTPlayer.getCurrentTime !== 'function') return;

    const currentTime = parseFloat(activeYTPlayer.getCurrentTime().toFixed(2));
    const targetSong = songs.find(s => s.id == songId);
    if (!targetSong) return;

    if (!targetSong.chords) targetSong.chords = [];
    targetSong.chords = targetSong.chords.filter(c => Math.abs(c.time - currentTime) > 0.3);

    targetSong.chords.push({ id: Date.now(), time: currentTime, chord: chordName });
    targetSong.chords.sort((a, b) => a.time - b.time);
};

window.syncTappedChordsToBFBC = async function(songId) {
    const targetSong = songs.find(s => s.id == songId);
    if (!targetSong || !db) return;

    const { error } = await db
        .from('songs_sandbox')
        .update({ chords: targetSong.chords })
        .eq('id', songId);

    if (error) {
        alert("Error saving chords: " + error.message);
    } else {
        alert("Chords saved successfully!");
    }
};

function syncRulerLoop(songId) {
    if (activeYTPlayer && typeof activeYTPlayer.getCurrentTime === 'function') {
        const currentTime = activeYTPlayer.getCurrentTime();
        const offsetPixels = currentTime * pixelsPerSecond;

        const track = document.getElementById(`rulerTrack-${songId}`);
        if (track) track.style.transform = `translateX(-${offsetPixels}px)`;
    }
    animFrameId = requestAnimationFrame(() => syncRulerLoop(songId));
}

document.addEventListener('DOMContentLoaded', fetchAndRenderSongs);
