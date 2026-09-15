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

// Scoped Audio Player Loader
window.loadYTPlayer = function(songId, videoId) {
    const allPlayers = document.querySelectorAll('[id^="yt-player-"]');
    allPlayers.forEach(p => {
        if (p.id !== `yt-player-${songId}`) {
            p.classList.add('hidden');
            p.innerHTML = '';
        }
    });

    const allPreviews = document.querySelectorAll('[id^="yt-preview-"]');
    allPreviews.forEach(pv => pv.classList.remove('hidden'));

    const previewContainer = document.getElementById(`yt-preview-${songId}`);
    const playerContainer = document.getElementById(`yt-player-${songId}`);

    if (previewContainer) previewContainer.classList.add('hidden');
    if (playerContainer) {
        playerContainer.classList.remove('hidden');
        playerContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="90" 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1" 
                title="YouTube Audio Player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen 
                class="rounded-lg border border-rose-500/30">
            </iframe>
        `;
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

                    <!-- NEW CHORDS STUDIO BUTTON -->
                    <button onclick="toggleTimestampStudio('${song.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600 hover:text-white border border-purple-600/30 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                        <i class="fa-solid fa-guitar"></i> Chords Studio
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

                <!-- TIMESTAMP MENU CONTAINER -->
                <div id="timestamp-studio-${song.id}" class="hidden pt-3 border-t border-purple-500/30 bg-purple-950/20 p-3 rounded-lg border border-purple-800/40 space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-purple-300"><i class="fa-solid fa-clock-rotate-left"></i> Timestamp & Chord Menu</span>
                        <span class="text-[10px] text-purple-400 bg-purple-900/50 px-2 py-0.5 rounded">Ready to sync</span>
                    </div>
                    <p class="text-xs text-slate-400">Timestamp controls will load here for this song.</p>
                </div>

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
};

window.toggleLyrics = function(id) {
    const lyricsElement = document.getElementById(`lyrics-container-${id}`);
    if (lyricsElement) {
        lyricsElement.classList.toggle('hidden');
    }
};

window.toggleTimestampStudio = function(id) {
    const studioElement = document.getElementById(`timestamp-studio-${id}`);
    if (studioElement) {
        studioElement.classList.toggle('hidden');
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
            
