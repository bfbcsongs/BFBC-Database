const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let db = null;

// Initial Sample Songs Dataset
let songs = [
    {
        id: "1",
        title: "Amazing Grace",
        category: "Opening",
        lyrics: "Amazing grace, how sweet the sound, that saved a wretch like me...\nI once was lost, but now am found;\nWas blind, but now I see.",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video"
    },
    {
        id: "2",
        title: "Blessed Assurance",
        category: "Joyful",
        lyrics: "Blessed assurance, Jesus is mine!\nOh, what a foretaste of glory divine!\nHeir of salvation, purchase of God,\nBorn of His Spirit, washed in His blood.",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video"
    },
    {
        id: "3",
        title: "How Great Thou Art",
        category: "Solemn",
        lyrics: "O Lord my God, when I in awesome wonder,\nConsider all the worlds Thy hands have made;\nI see the stars, I hear the rolling thunder,\nThy power throughout the universe displayed.",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video"
    }
];

let activeCategory = null;

const searchInput = document.getElementById('search-input');
const categoryButtons = document.querySelectorAll('.category-btn');
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

const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
let toastTimeout;

function showToast(message) {
    toastMsg.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-2');
    }, 1800);
}

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
        const { data, error } = await db.from('songs').select('*').order('title', { ascending: true });
        if (!error && data && data.length > 0) {
            songs = data;
        }
    } catch (err) {
        console.log('Using local dataset');
    }
}

function renderSongs(songsToRender, titleText) {
    listHeader.textContent = titleText;
    
    const sortedSongs = [...songsToRender].sort((a, b) => a.title.localeCompare(b.title));
    songCount.textContent = `${sortedSongs.length} song${sortedSongs.length === 1 ? '' : 's'} found`;

    if (sortedSongs.length === 0) {
        songsList.innerHTML = `<p class="text-center text-slate-500 py-8">No songs found.</p>`;
        return;
    }

    songsList.innerHTML = sortedSongs.map(song => `
        <div class="p-4 bg-slate-800 border border-slate-700/70 rounded-xl hover:border-indigo-500/50 transition-all space-y-3">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="font-bold text-lg text-white">${song.title}</h3>
                        <span class="text-xs px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 rounded-full font-medium">
                            ${song.category}
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 flex-wrap">
                    ${song.audio_url && song.audio_url !== '#' ? `
                    <a href="${song.audio_url}" target="_blank" class="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-600/30 rounded-lg text-xs font-semibold transition-all">
                        <i class="fa-solid fa-music"></i> Audio
                    </a>` : ''}

                    ${song.video_url && song.video_url !== '#' ? `
                    <a href="${song.video_url}" target="_blank" class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-600/30 rounded-lg text-xs font-semibold transition-all">
                        <i class="fa-solid fa-play"></i> Video
                    </a>` : ''}

                    <button onclick="toggleLyrics('${song.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white border border-sky-600/30 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                        <i class="fa-solid fa-align-left"></i> Lyrics
                    </button>

                    <button onclick="handleEditTap('${song.id}')" class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                </div>
            </div>

            <div id="lyrics-container-${song.id}" class="hidden pt-3 border-t border-slate-700/60 text-slate-300 text-sm whitespace-pre-line font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                ${song.lyrics || 'No lyrics provided.'}
            </div>
        </div>
    `).join('');
}

window.toggleLyrics = function(id) {
    const lyricsElement = document.getElementById(`lyrics-container-${id}`);
    if (lyricsElement) {
        lyricsElement.classList.toggle('hidden');
    }
};

// 5 Consecutive Taps Tracker for Editing
let tapTracker = {
    songId: null,
    count: 0,
    timer: null
};

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

    const remaining = 5 - tapTracker.count;

    if (remaining > 0) {
        showToast(`Tap ${remaining} more time${remaining === 1 ? '' : 's'} to edit`);
    } else {
        tapTracker.songId = null;
        tapTracker.count = 0;
        editSong(id);
    }
};

function filterAndShowSongs() {
    songsContainer.classList.remove('hidden');

    const query = searchInput.value.toLowerCase().trim();
    
    let filtered = songs.filter(song => {
        const matchesSearch = song.title.toLowerCase().includes(query) || (song.lyrics && song.lyrics.toLowerCase().includes(query));
        const matchesCategory = activeCategory ? song.category === activeCategory : true;
        return matchesSearch && matchesCategory;
    });

    const headerLabel = activeCategory 
        ? (query ? `${activeCategory} Songs matching "${query}"` : `${activeCategory} Songs`)
        : (query ? `Results for "${query}"` : "All Songs");

    renderSongs(filtered, headerLabel);
}

function clearCategorySelection() {
    activeCategory = null;
    categoryButtons.forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });
}

searchInput.addEventListener('click', () => {
    clearCategorySelection();
    filterAndShowSongs();
});

searchInput.addEventListener('input', () => {
    filterAndShowSongs();
});

categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
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
    const songPayload = {
        title: document.getElementById('song-title-input').value,
        category: document.getElementById('song-category-input').value,
        audio_url: document.getElementById('song-audio-input').value || '',
        video_url: document.getElementById('song-video-input').value || '',
        lyrics: document.getElementById('song-lyrics-input').value || ''
    };

    if (db) {
        try {
            if (id) {
                await db.from('songs').update(songPayload).eq('id', id);
            } else {
                await db.from('songs').insert([songPayload]);
            }
            await fetchSongs();
        } catch (err) {
            console.error('Supabase save error:', err);
        }
    } else {
        if (id) {
            songs = songs.map(s => s.id == id ? { ...s, ...songPayload } : s);
        } else {
            songs.push({ id: Date.now().toString(), ...songPayload });
        }
    }

    closeModal();
    filterAndShowSongs();
});

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
    initSupabase();
    await fetchSongs();
});
