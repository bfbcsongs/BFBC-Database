// ==========================================
// 1. SUPABASE CONFIGURATION & INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://qxnrogteskdwvrxztwvx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nFGA38fcKrTioIZOkAHRrg_MkbZigvw';

// Safely initialize Supabase client
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ==========================================
// 2. INITIAL DATASET & STATE MANAGEMENT
// ==========================================
let songs = JSON.parse(localStorage.getItem('bfbc_songs')) || [
    {
        id: "1",
        title: "Amazing Grace",
        category: "Opening",
        lyrics: "Amazing grace, how sweet the sound...",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video",
        approved: true,
        created_at: Date.now() - 300000
    },
    {
        id: "2",
        title: "Blessed Assurance",
        category: "Joyful",
        lyrics: "Blessed assurance, Jesus is mine...",
        audio_url: "https://example.com/audio",
        video_url: "https://example.com/video",
        approved: true,
        created_at: Date.now() - 600000
    }
];

// Save to localStorage helper
function saveToLocalStorage() {
    localStorage.setItem('bfbc_songs', JSON.stringify(songs));
}

// Save initial set if empty
if (!localStorage.getItem('bfbc_songs')) {
    saveToLocalStorage();
}

// ==========================================
// 3. SUPABASE SYNC LOGIC
// ==========================================
async function fetchSongsFromSupabase() {
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
            songs = data;
            saveToLocalStorage();
            renderSongList();
        }
    } catch (err) {
        console.warn('Offline or Supabase fetch error, using local cached data:', err.message);
    }
}

async function addSongToSupabase(newSong) {
    if (!supabaseClient) return;

    try {
        const { error } = await supabaseClient
            .from('songs')
            .insert([newSong]);

        if (error) throw error;
        console.log('Song successfully synced to Supabase!');
    } catch (err) {
        console.warn('Could not sync to cloud immediately. Local copy saved.', err.message);
    }
}

// ==========================================
// 4. UI RENDER FUNCTIONS & EVENT LISTENERS
// ==========================================
function renderHeaderActions() {
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;

    headerActions.innerHTML = `
        <button id="add-song-btn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition">
            <i class="fa-solid fa-plus"></i> Add Song
        </button>
    `;

    document.getElementById('add-song-btn').addEventListener('click', openAddSongModal);
}

function renderSongList() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    if (songs.length === 0) {
        mainContent.innerHTML = `<p class="text-slate-400 text-center py-8">No songs found. Tap "+ Add Song" to create one.</p>`;
        return;
    }

    const songCardsHtml = songs.map(song => `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-4 shadow-sm hover:border-slate-600 transition">
            <div class="flex justify-between items-start mb-2">
                <h2 class="text-lg font-bold text-white">${escapeHtml(song.title)}</h2>
                <span class="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full font-medium border border-indigo-700/50">
                    ${escapeHtml(song.category)}
                </span>
            </div>
            <p class="text-slate-300 text-sm whitespace-pre-line mb-3 font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                ${escapeHtml(song.lyrics || 'No lyrics provided.')}
            </p>
            <div class="flex items-center gap-4 text-xs text-slate-400">
                ${song.audio_url ? `<a href="${escapeHtml(song.audio_url)}" target="_blank" class="text-indigo-400 hover:underline flex items-center gap-1"><i class="fa-solid fa-music"></i> Audio</a>` : ''}
                ${song.video_url ? `<a href="${escapeHtml(song.video_url)}" target="_blank" class="text-indigo-400 hover:underline flex items-center gap-1"><i class="fa-solid fa-video"></i> Video</a>` : ''}
            </div>
        </div>
    `).join('');

    mainContent.innerHTML = songCardsHtml;
}

function openAddSongModal() {
    const modalHtml = `
        <div id="modal-backdrop" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-xl text-slate-100">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-white">Add New Song</h3>
                    <button id="close-modal-btn" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <form id="song-form" class="space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-slate-300 mb-1">Title</label>
                        <input type="text" id="song-title" required class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-300 mb-1">Category</label>
                        <input type="text" id="song-category" required class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-300 mb-1">Lyrics</label>
                        <textarea id="song-lyrics" rows="4" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"></textarea>
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" id="cancel-modal-btn" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium">Save Song</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('close-modal-btn').addEventListener('click', closeModal);
    document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);
    document.getElementById('song-form').addEventListener('submit', handleAddSongSubmit);
}

function closeModal() {
    const modal = document.getElementById('modal-backdrop');
    if (modal) modal.remove();
}

async function handleAddSongSubmit(e) {
    e.preventDefault();

    const title = document.getElementById('song-title').value.trim();
    const category = document.getElementById('song-category').value.trim();
    const lyrics = document.getElementById('song-lyrics').value.trim();

    if (!title || !category) return;

    const newSong = {
        title: title,
        category: category,
        lyrics: lyrics,
        audio_url: '',
        video_url: '',
        approved: true,
        created_at: Date.now()
    };

    // 1. Update UI & localStorage immediately for instant offline reactivity
    songs.unshift(newSong);
    saveToLocalStorage();
    renderSongList();
    closeModal();

    // 2. Sync asynchronously to Supabase cloud
    await addSongToSupabase(newSong);
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, match => {
        const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return escapeMap[match];
    });
}

// ==========================================
// 5. APPLICATION INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    renderHeaderActions();
    renderSongList();
    fetchSongsFromSupabase();
});
