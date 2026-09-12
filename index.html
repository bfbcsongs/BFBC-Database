const SUPABASE_URL = 'https://qxnrogteskdwvrxztwvx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nFGA38fcKrTioIZOkAHRrg_MkbZigvw';

let db = null;

// Initial Songs Dataset
let songs = [
    {
        id: "1",
        title: "Amazing Grace",
        category: "Opening",
        lyrics: "Amazing grace, how sweet the sound, that saved a wretch like me...\nI once was lost, but now am found;\nWas blind, but now I see.",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video",
        approved: true,
        created_at: Date.now() - 300000
    },
    {
        id: "2",
        title: "Blessed Assurance",
        category: "Joyful",
        lyrics: "Blessed assurance, Jesus is mine!\nOh, what a foretaste of glory divine!\nHeir of salvation, purchase of God,\nBorn of His Spirit, washed in His blood.",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video",
        approved: true,
        created_at: Date.now() - 200000
    },
    {
        id: "3",
        title: "How Great Thou Art",
        category: "Solemn",
        lyrics: "O Lord my God, when I in awesome wonder,\nConsider all the worlds Thy hands have made;\nI see the stars, I hear the rolling thunder,\nThy power throughout the universe displayed.",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video",
        approved: true,
        created_at: Date.now() - 100000
    }
];

let activeCategory = null;
let inNewFolderView = false;

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
        const { data, error } = await db.from('songs').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
            songs = data;
        }
    } catch (err) {
        console.log('Using local dataset');
    }
    updateNewFolderBadge();
}

function updateNewFolderBadge() {
    const unapprovedCount = songs.filter(s => s.approved === false || s.approved === 'false').length;
    if (newCountBadge) {
        newCountBadge.textContent = unapprovedCount;
    }
}

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

    songsList.innerHTML = sortedSongs.map(song => `
        <div class="p-4 bg-slate-800 border border-slate-700/70 rounded-xl hover:border-indigo-500/50 transition-all space-y-3">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="font-bold text-lg text-white">${song.title}</h3>
                        <span class="text-xs px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 rounded-full font-medium">
                            ${song.category}
                        </span>
                        ${(song.approved === false || song.approved === 'false') ? `<span class="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold">Unapproved</span>` : ''}
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

                    <button onclick="handleThumbsUpTap('${song.id}')" title="Tap 5 times to approve" class="flex items-center justify-center p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-900 border border-amber-500/30 rounded-lg transition-all cursor-pointer">
                        <i class="fa-solid fa-thumbs-up text-sm"></i>
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
            await db.from('songs').update({ approved: true }).eq('id', id);
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
            const isUnapproved = (song.approved === false || song.approved === 'false');
            const matchesSearch = song.title.toLowerCase().includes(query) || (song.lyrics && song.lyrics.toLowerCase().includes(query));
            return isUnapproved && matchesSearch;
        });
        renderSongs(filtered, query ? `New Folder matching "${query}"` : "New Songs Folder");
    } else {
        filtered = songs.filter(song => {
            // Include approved songs or songs without explicit false flags
            const isApproved = song.approved !== false && song.approved !== 'false';
            const matchesSearch = song.title.toLowerCase().includes(query) || (song.lyrics && song.lyrics.toLowerCase().includes(query));
            
            // Flexible category match (case-insensitive & trimmed)
            const matchesCategory = activeCategory 
                ? (song.category && song.category.trim().toLowerCase() === activeCategory.trim().toLowerCase())
                : true;

            return isApproved && matchesSearch && matchesCategory;
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
                await db.from('songs').insert([newSong]);
                await fetchSongs();
            } catch (err) {
                console.error('Supabase insert error:', err);
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
                await db.from('songs').update({ title, category, audio_url, video_url, lyrics }).eq('id', id);
                await fetchSongs();
            } catch (err) {
                console.error('Supabase update error:', err);
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
