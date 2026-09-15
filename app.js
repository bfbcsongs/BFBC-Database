const SUPABASE_URL = 'https://qxnrogteskdwvrxztwvx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nFGA38fcKrTioIZOkAHRrg_MkbZigvw';

let db = null;

// Initial Songs Dataset (Sandbox Backup)
let songs = [
    {
        id: "1",
        title: "Amazing Grace",
        category: "Opening",
        lyrics: "Amazing grace, how sweet the sound, that saved a wretch like me...\nI once was lost, but now am found;\nWas blind, but now I see.",
        audio_url: "",
        video_url: "https://www.youtube.com/watch?v=X6Mtpk4jeVA",
        approved: true,
        created_at: Date.now() - 300000
    },
    {
        id: "2",
        title: "Blessed Assurance",
        category: "Joyful",
        lyrics: "Blessed assurance, Jesus is mine!\nOh, what a foretaste of glory divine!\nHeir of salvation, purchase of God,\nBorn of His Spirit, washed in His blood.",
        approved: true,
        created_at: Date.now() - 200000
    }
];

let activeCategory = null;
let inNewFolderView = false;

// DOM Elements
const searchInput = document.getElementById('search-input');
const categoryButtons = document.querySelectorAll('.category-btn');
const newFolderBtn = document.getElementById('new-folder-btn');
const newCountBadge = document.getElementById('new-count-badge');
const songsContainer = document.getElementById('songs-container');
const songsList = document.getElementById('songs-list');
const songCount = document.getElementById('song-count');
const listHeader = document.getElementById('list-header');

const songModal = document.getElementById('song-modal');
const modalTitle = document.getElementById('modal-title');
const songForm = document.getElementById('song-form');
const addSongBtn = document.getElementById('add-song-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

// ==========================================
// YOUTUBE HELPER FUNCTIONS
// ==========================================
function extractYouTubeID(url) {
    if (!url || url === '#' || typeof url !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ========================================================
// UNIFIED BFBC PLAYER BRIDGE: NO DUPLICATE SCREEN + RULER
// ========================================================
window.loadYTPlayer = function(songId, videoId) {
    if (window.animFrameId) cancelAnimationFrame(window.animFrameId);
    window.activeSongId = songId;

    // Hanapin ang container sa ilalim ng orihinal mong player
    let playerContainer = document.getElementById(`yt-player-${songId}`);
    if (!playerContainer) return;

    playerContainer.classList.remove('hidden');

    // MGA RULER AT MATRIX LANG ANG IDADAGDAG (Walang panibagong Video Frame)
    playerContainer.innerHTML = `
        <div class="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
            <!-- Center Pointer & Moving Ruler -->
            <div class="ruler-wrapper relative w-full h-[60px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                <div class="center-pointer absolute left-1/2 top-0 bottom-0 w-[2px] bg-red-500 z-20 -translate-x-1/2"></div>
                <div class="ruler-track absolute top-0 h-full left-1/2 flex items-end" id="rulerTrack-${songId}"></div>
            </div>

            <!-- Active Chord Display & Save Button -->
            <div class="flex justify-between items-center text-xs">
                <span class="text-slate-400">Playing Chord: <strong id="currentChordLabel-${songId}" class="text-emerald-400 text-sm font-bold">None</strong></span>
                <button onclick="syncTappedChordsToBFBC('${songId}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs transition-all cursor-pointer">
                    <i class="fa-solid fa-floppy-disk"></i> Save Chords to BFBC
                </button>
            </div>

            <!-- 7x8 Chord Matrix -->
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 max-h-56 overflow-y-auto">
                <div id="chordMatrix-${songId}" class="grid grid-cols-7 gap-1"></div>
            </div>
        </div>
    `;

    renderChordMatrixUI(songId);

    // KONEKTA SA MISMONG ORIGINAL PLAYER MO
    // Hook sa existing player variable (o i-bind sa YT Instance mo)
    if (window.player || window.activeYTPlayer) {
        const activePlayer = window.player || window.activeYTPlayer;
        buildRulerTicks(songId, activePlayer.getDuration ? activePlayer.getDuration() : 300);
        syncRulerLoop(songId);
    }
};

// Helper for strict unapproved status check
function isUnapproved(song) {
    return song.approved === false || song.approved === 'false' || song.approved === 0 || song.approved === '0';
}

// ==========================================
// SUPABASE INITIALIZATION & FETCH
// ==========================================
function initSupabase() {
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && typeof supabase !== 'undefined') {
        try {
            db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch(e) {
            console.log('Supabase not configured yet');
        }
    }
}

async function fetchSongs() {
    if (!db) return;
    try {
        const { data, error } = await db.from('songs_sandbox').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
            songs = data;
        }
    } catch (err) {
        console.log('Using local sandbox dataset');
    }
    updateNewFolderBadge();
}

function updateNewFolderBadge() {
    const unapprovedCount = songs.filter(s => isUnapproved(s)).length;
    if (newCountBadge) {
        newCountBadge.textContent = unapprovedCount;
    }
}

// ==========================================
// RENDER SONGS (COMPACT TITLE LIST VIEW)
// ==========================================
function renderSongs(songsToRender, titleText) {
    listHeader.textContent = titleText;
    
    let sortedSongs = [...songsToRender];

    if (inNewFolderView) {
        sortedSongs.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    } else {
        sortedSongs.sort((a, b) => a.title.localeCompare(b.title));
    }

    songCount.textContent = `${sortedSongs.length} song${sortedSongs.length === 1 ? '' : 's'} found`;

    if (sortedSongs.length === 0) {
        songsList.innerHTML = `<p class="text-center text-slate-500 py-8">No songs found in this view.</p>`;
        return;
    }

    songsList.innerHTML = sortedSongs.map(song => {
        const ytId = extractYouTubeID(song.video_url) || extractYouTubeID(song.audio_url);
        const thumbnailUrl = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
        const songIsUnapproved = isUnapproved(song);

        return `
        <div class="bg-slate-800 border border-slate-700/70 rounded-xl overflow-hidden transition-all mb-2">
            <!-- TITLE ROW (Click to Expand / Collapse Details) -->
            <div onclick="toggleSongAccordion('${song.id}')" class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 rounded-lg ${songIsUnapproved ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-600/20 text-indigo-400'} flex items-center justify-center font-bold text-xs shrink-0">
                        <i class="fa-solid ${songIsUnapproved ? 'fa-clock' : 'fa-music'}"></i>
                    </div>
                    <div class="truncate">
                        <h3 class="font-bold text-sm text-white truncate">${song.title}</h3>
                        <span class="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full mt-0.5 inline-block">${song.category}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    ${songIsUnapproved ? `<span class="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold">Unapproved</span>` : ''}
                    <i id="accordion-icon-${song.id}" class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform duration-200"></i>
                </div>
            </div>

            <!-- EXPANDABLE DETAILS -->
            <div id="accordion-details-${song.id}" class="hidden p-4 border-t border-slate-700/60 bg-slate-900/40 space-y-3">
                <div class="flex items-center gap-2 flex-wrap">
                    ${ytId ? `
                    <button onclick="loadYTPlayer('${song.id}', '${ytId}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-600/30 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                        <i class="fa-solid fa-play"></i> Play Audio
                    </button>` : ''}

                    <button onclick="toggleLyrics('${song.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white border border-sky-600/30 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                        <i class="fa-solid fa-align-left"></i> Lyrics
                    </button>

                    <button onclick="handleEditTap('${song.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>

                    <button onclick="handleThumbsUpTap('${song.id}')" title="Tap 5 times to approve" class="flex items-center justify-center p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-900 border border-amber-500/30 rounded-lg transition-all cursor-pointer">
                        <i class="fa-solid fa-thumbs-up text-sm"></i>
                    </button>
                </div>

                ${ytId ? `
                <div class="mt-2 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <div id="yt-preview-${song.id}" class="relative cursor-pointer group" onclick="loadYTPlayer('${song.id}', '${ytId}')">
                        <img src="${thumbnailUrl}" class="w-full h-40 object-cover opacity-80 group-hover:opacity-100 transition-all">
                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div class="px-4 py-2 bg-rose-600/90 text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-lg group-hover:scale-105 transition-all">
                                <i class="fa-solid fa-play"></i> Tap to Play Audio Reference
                            </div>
                        </div>
                    </div>
                    <div id="yt-player-${song.id}" class="hidden"></div>
                </div>
                ` : ''}

                <div id="lyrics-container-${song.id}" class="hidden pt-3 border-t border-slate-700/60 text-slate-300 text-sm whitespace-pre-line font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    ${song.lyrics || 'No lyrics provided.'}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

window.toggleSongAccordion = function(id) {
    const details = document.getElementById(`accordion-details-${id}`);
    const icon = document.getElementById(`accordion-icon-${id}`);
    if (details) details.classList.toggle('hidden');
    if (icon) icon.classList.toggle('rotate-180');
};window.toggleLyrics = function(id) {
    const lyricsElement = document.getElementById(`lyrics-container-${id}`);
    if (lyricsElement) {
        lyricsElement.classList.toggle('hidden');
    }
};

let tapTracker = { songId: null, count: 0, timer: null };

window.handleEditTap = function(id) {
    if (tapTracker.songId === id) {
        tapTracker.count++;
    } else {
        tapTracker.songId = id;
        tapTracker.count = 1;
    }

    clearTimeout(tapTracker.timer);
    tapTracker.timer = setTimeout(() => {
        tapTracker.songId = null;
        tapTracker.count = 0;
    }, 2500);

    if (tapTracker.count >= 5) {
        tapTracker.songId = null;
        tapTracker.count = 0;
        editSong(id);
    }
};

let thumbsTapTracker = { songId: null, count: 0, timer: null };

window.handleThumbsUpTap = async function(id) {
    if (thumbsTapTracker.songId === id) {
        thumbsTapTracker.count++;
    } else {
        thumbsTapTracker.songId = id;
        thumbsTapTracker.count = 1;
    }

    clearTimeout(thumbsTapTracker.timer);
    thumbsTapTracker.timer = setTimeout(() => {
        thumbsTapTracker.songId = null;
        thumbsTapTracker.count = 0;
    }, 2500);

    if (thumbsTapTracker.count >= 5) {
        thumbsTapTracker.songId = null;
        thumbsTapTracker.count = 0;
        await approveSong(id);
    }
};

async function approveSong(id) {
    if (db) {
        try {
            await db.from('songs_sandbox').update({ approved: true }).eq('id', id);
            await fetchSongs();
        } catch (err) {
            console.error('Approval error:', err);
        }
    } else {
        songs = songs.map(s => s.id == id ? { ...s, approved: true } : s);
    }
    updateNewFolderBadge();
    filterAndShowSongs();
}

function filterAndShowSongs() {
    songsContainer.classList.remove('hidden');
    const query = searchInput.value.toLowerCase().trim();

    let filtered = [];

    if (inNewFolderView) {
        filtered = songs.filter(song => {
            const matchesSearch = song.title.toLowerCase().includes(query) || (song.lyrics && song.lyrics.toLowerCase().includes(query));
            return isUnapproved(song) && matchesSearch;
        });
        renderSongs(filtered, query ? `New Folder matching "${query}"` : "New Songs Folder");
    } else {
        filtered = songs.filter(song => {
            const matchesSearch = song.title.toLowerCase().includes(query) || (song.lyrics && song.lyrics.toLowerCase().includes(query));
            const matchesCategory = activeCategory 
                ? (song.category && song.category.trim().toLowerCase() === activeCategory.trim().toLowerCase())
                : true;

            return !isUnapproved(song) && matchesSearch && matchesCategory;
        });

        const headerLabel = activeCategory 
            ? (query ? `${activeCategory} Songs matching "${query}"` : `${activeCategory} Songs`)
            : (query ? `Results for "${query}"` : "All Songs");

        renderSongs(filtered, headerLabel);
    }
}

function clearCategorySelection() {
    activeCategory = null;
    categoryButtons.forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });
}

newFolderBtn.addEventListener('click', () => {
    inNewFolderView = true;
    clearCategorySelection();

    newFolderBtn.classList.remove('bg-amber-500/20', 'text-amber-300');
    newFolderBtn.classList.add('bg-amber-500', 'text-slate-900');

    filterAndShowSongs();
});

searchInput.addEventListener('click', () => {
    inNewFolderView = false;
    newFolderBtn.classList.remove('bg-amber-500', 'text-slate-900');
    newFolderBtn.classList.add('bg-amber-500/20', 'text-amber-300');
    clearCategorySelection();
    filterAndShowSongs();
});

searchInput.addEventListener('input', () => {
    filterAndShowSongs();
});

categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
        inNewFolderView = false;
        newFolderBtn.classList.remove('bg-amber-500', 'text-slate-900');
        newFolderBtn.classList.add('bg-amber-500/20', 'text-amber-300');

        const category = button.getAttribute('data-category');

        if (activeCategory === category) {
            clearCategorySelection();
        } else {
            clearCategorySelection();
            activeCategory = category;
            button.classList.remove('bg-slate-800', 'text-slate-300');
            button.classList.add('bg-indigo-600', 'text-white');
        }

        filterAndShowSongs();
    });
});

function openModal(isEdit = false) {
    modalTitle.textContent = isEdit ? "Edit Song" : "Add New Song";
    songModal.classList.remove('hidden');
}

function closeModal() {
    songModal.classList.add('hidden');
    songForm.reset();
    document.getElementById('song-id').value = '';
}

addSongBtn.addEventListener('click', () => openModal(false));
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

function editSong(id) {
    const song = songs.find(s => s.id == id);
    if (!song) return;

    document.getElementById('song-id').value = song.id;
    document.getElementById('song-title-input').value = song.title;
    document.getElementById('song-category-input').value = song.category;
    document.getElementById('song-audio-input').value = song.audio_url !== '#' ? (song.audio_url || '') : '';
    document.getElementById('song-video-input').value = song.video_url !== '#' ? (song.video_url || '') : '';
    document.getElementById('song-lyrics-input').value = song.lyrics || '';

    openModal(true);
}

songForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('song-id').value;
    const isNew = !id;

    const title = document.getElementById('song-title-input').value;
    const category = document.getElementById('song-category-input').value;
    const audio_url = document.getElementById('song-audio-input').value || '';
    const video_url = document.getElementById('song-video-input').value || '';
    const lyrics = document.getElementById('song-lyrics-input').value || '';

    if (isNew) {
        const newSong = {
            title,
            category,
            audio_url,
            video_url,
            lyrics,
            approved: false,
            created_at: Date.now()
        };

        if (db) {
            try {
                const { error } = await db.from('songs_sandbox').insert([newSong]);
                if (error) {
                    alert('Save Failed: ' + error.message);
                    return;
                } else {
                    alert('Success! Song saved to Sandbox.');
                    await fetchSongs();
                }
            } catch (err) {
                alert('Connection Error: ' + err.message);
                return;
            }
        } else {
            songs.push({ id: Date.now().toString(), ...newSong });
        }

        inNewFolderView = true;
        newFolderBtn.classList.remove('bg-amber-500/20', 'text-amber-300');
        newFolderBtn.classList.add('bg-amber-500', 'text-slate-900');
        clearCategorySelection();

    } else {
        if (db) {
            try {
                const { error } = await db.from('songs_sandbox').update({ title, category, audio_url, video_url, lyrics }).eq('id', id);
                if (error) {
                    alert('Update Failed: ' + error.message);
                    return;
                } else {
                    alert('Success! Song updated.');
                    await fetchSongs();
                }
            } catch (err) {
                alert('Update Error: ' + err.message);
                return;
            }
        } else {
            songs = songs.map(s => s.id == id ? { ...s, title, category, audio_url, video_url, lyrics } : s);
        }
    }

    updateNewFolderBadge();
    closeModal();
    filterAndShowSongs();
});

window.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    await fetchSongs();
    filterAndShowSongs();
});

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
    if (window.animFrameId) cancelAnimationFrame(window.animFrameId);
    window.activeSongId = songId;

    // Hanapin ang container para sa ruler at matrix
    let playerContainer = document.getElementById(`yt-player-${songId}`);
    if (!playerContainer) return;

    playerContainer.classList.remove('hidden');

    // Ruler at Matrix na lang ang i-inject (Tanggal ang duplicate video iframe)
    playerContainer.innerHTML = `
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

    // I-hook sa umiiral na player para gumalaw ang ruler at timestamp
    if (window.player || window.activeYTPlayer) {
        const activePlayer = window.player || window.activeYTPlayer;
        if (typeof buildRulerTicks === 'function') {
            buildRulerTicks(songId, activePlayer.getDuration ? activePlayer.getDuration() : 300);
        }
        if (typeof syncRulerLoop === 'function') {
            syncRulerLoop(songId);
        }
    }
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
    // ==========================================
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
}
