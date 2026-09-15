const SUPABASE_URL = 'https://qxnrogteskdwvrxztwvx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_nFGA38fcKrTioIZOkAHRrg_MkbZigvw';

let db = null;

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


/* =========================================================
   YOUTUBE PLAYERS
   ========================================================= */

const ytPlayers = {};
const ytTimelineTimers = {};
const ytPlayerReady = {};

let youtubeApiReady = false;


/* YouTube API callback */
window.onYouTubeIframeAPIReady = function () {

    youtubeApiReady = true;

    console.log('YouTube IFrame API ready.');

};


/* =========================================================
   DOM REFERENCES
   ========================================================= */

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


/* =========================================================
   YOUTUBE URL
   ========================================================= */

function extractYouTubeID(url) {

    if (!url || url === '#' || typeof url !== 'string') {
        return null;
    }

    const regExp =
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;

    const match = url.match(regExp);

    return (match && match[2].length === 11)
        ? match[2]
        : null;
}


/* =========================================================
   TIME FORMAT
   ========================================================= */

function formatTime(seconds) {

    seconds = Math.max(0, Math.floor(seconds || 0));

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}


/* =========================================================
   CREATE TIME MARKERS
   ========================================================= */

function createTimeMarkers(songId, duration) {

    const timeline = document.getElementById(`time-timeline-${songId}`);

    if (!timeline) {
        return;
    }

    const track = timeline.querySelector('.time-track');

    if (!track) {
        return;
    }

    const pixelsPerSecond = 70;

    const safeDuration = Math.max(
        1,
        Math.ceil(duration || 300)
    );

    const markerCount = safeDuration + 1;

    track.style.width = `${markerCount * pixelsPerSecond}px`;

    let html = '';

    for (let i = 0; i < markerCount; i++) {

        html += `
            <div
                class="time-marker"
                data-time="${i}"
                style="left:${i * pixelsPerSecond}px">

                <span>${formatTime(i)}</span>

                <div class="time-tick"></div>

            </div>
        `;
    }

    track.innerHTML = html;
}


/* =========================================================
   UPDATE TIME FRAME
   ========================================================= */

function updateTimeTimeline(songId, currentTime) {

    const timeline =
        document.getElementById(`time-timeline-${songId}`);

    if (!timeline) {
        return;
    }

    const track =
        timeline.querySelector('.time-track');

    if (!track) {
        return;
    }

    const pixelsPerSecond = 70;

    /*
       The current time marker is always moved
       to the fixed center reference point.
    */

    const center = timeline.clientWidth / 2;

    const position =
        center - (currentTime * pixelsPerSecond);

    track.style.transform =
        `translateX(${position}px)`;


    /*
       Highlight the marker currently passing
       the center reference.
    */

    const markers =
        track.querySelectorAll('.time-marker');

    markers.forEach(marker => {

        const markerTime =
            parseFloat(marker.dataset.time);

        const distance =
            Math.abs(markerTime - currentTime);

        if (distance < 0.5) {
            marker.classList.add('active');
        } else {
            marker.classList.remove('active');
        }

    });


    /*
       Current digital time below timeline.
    */

    const currentDisplay =
        document.getElementById(`time-current-${songId}`);

    if (currentDisplay) {

        currentDisplay.textContent =
            formatTime(currentTime);

    }
}


/* =========================================================
   START TIME FRAME
   ========================================================= */

function startTimeTimeline(songId) {

    stopTimeTimeline(songId);

    ytTimelineTimers[songId] =
        setInterval(() => {

            const player =
                ytPlayers[songId];

            if (
                !player ||
                typeof player.getCurrentTime !== 'function'
            ) {
                return;
            }

            let currentTime = 0;

            try {
                currentTime =
                    player.getCurrentTime();
            } catch (err) {
                return;
            }

            updateTimeTimeline(
                songId,
                currentTime
            );

        }, 50);
}


/* =========================================================
   STOP TIME FRAME
   ========================================================= */

function stopTimeTimeline(songId) {

    if (ytTimelineTimers[songId]) {

        clearInterval(
            ytTimelineTimers[songId]
        );

        ytTimelineTimers[songId] = null;
    }
}


/* =========================================================
   CREATE YOUTUBE PLAYER
   ========================================================= */

function createYTPlayer(songId, videoId) {

    const playerContainer =
        document.getElementById(`yt-player-${songId}`);

    if (!playerContainer) {
        return;
    }


    /*
       If the API isn't ready yet,
       try again shortly.
    */

    if (
        typeof YT === 'undefined' ||
        typeof YT.Player === 'undefined'
    ) {

        setTimeout(() => {
            createYTPlayer(songId, videoId);
        }, 300);

        return;
    }


    /*
       Destroy previous player if necessary.
    */

    if (ytPlayers[songId]) {

        try {
            ytPlayers[songId].destroy();
        } catch (err) {}

        delete ytPlayers[songId];
    }


    playerContainer.innerHTML = '';

    const playerDiv =
        document.createElement('div');

    playerDiv.id =
        `youtube-iframe-${songId}`;

    playerContainer.appendChild(playerDiv);


    ytPlayers[songId] =
        new YT.Player(
            playerDiv.id,
            {
                width: '100%',
                height: '90',

                videoId: videoId,

                playerVars: {
                    autoplay: 1,
                    playsinline: 1,
                    controls: 1,
                    rel: 0,
                    modestbranding: 1
                },

                events: {

                    onReady: function(event) {

                        ytPlayerReady[songId] = true;

                        const duration =
                            event.target.getDuration();

                        createTimeMarkers(
                            songId,
                            duration
                        );

                        updateTimeTimeline(
                            songId,
                            event.target.getCurrentTime()
                        );

                        /*
                           Start immediately if playback
                           actually started.
                        */

                        if (
                            event.target.getPlayerState() ===
                            YT.PlayerState.PLAYING
                        ) {

                            startTimeTimeline(songId);

                        }

                    },


                    onStateChange: function(event) {

                        /*
                           PLAYING
                        */

                        if (
                            event.data ===
                            YT.PlayerState.PLAYING
                        ) {

                            startTimeTimeline(songId);

                        }


                        /*
                           PAUSED
                        */

                        else if (
                            event.data ===
                            YT.PlayerState.PAUSED
                        ) {

                            stopTimeTimeline(songId);

                            updateTimeTimeline(
                                songId,
                                event.target.getCurrentTime()
                            );

                        }


                        /*
                           ENDED
                        */

                        else if (
                            event.data ===
                            YT.PlayerState.ENDED
                        ) {

                            stopTimeTimeline(songId);

                            updateTimeTimeline(
                                songId,
                                event.target.getCurrentTime()
                            );

                        }

                    }

                }

            }
        );

}


/* =========================================================
   LOAD YOUTUBE PLAYER
   ========================================================= */

window.loadYTPlayer = function(songId, videoId) {

    /*
       Hide other players.
    */

    const allPlayers =
        document.querySelectorAll('[id^="yt-player-"]');

    allPlayers.forEach(player => {

        if (player.id !== `yt-player-${songId}`) {

            player.classList.add('hidden');

            stopTimeTimeline(
                player.id.replace('yt-player-', '')
            );

        }

    });


    /*
       Show all previews first.
    */

    const allPreviews =
        document.querySelectorAll('[id^="yt-preview-"]');

    allPreviews.forEach(preview => {

        preview.classList.remove('hidden');

    });


    const previewContainer =
        document.getElementById(
            `yt-preview-${songId}`
        );

    const playerContainer =
        document.getElementById(
            `yt-player-${songId}`
        );


    if (previewContainer) {

        previewContainer.classList.add('hidden');

    }


    if (playerContainer) {

        playerContainer.classList.remove('hidden');

        /*
           Create the actual YouTube IFrame player.
        */

        createYTPlayer(
            songId,
            videoId
        );

    }

};


/* =========================================================
   APPROVAL
   ========================================================= */

function isUnapproved(song) {

    return (
        song.approved === false ||
        song.approved === 'false' ||
        song.approved === 0 ||
        song.approved === '0'
    );

}


/* =========================================================
   SUPABASE
   ========================================================= */

function initSupabase() {

    if (
        SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
        typeof supabase !== 'undefined'
    ) {

        try {

            db =
                supabase.createClient(
                    SUPABASE_URL,
                    SUPABASE_ANON_KEY
                );

        } catch (e) {

            console.log(
                'Supabase not configured yet'
            );

        }

    }

}


/* =========================================================
   FETCH SONGS
   ========================================================= */

async function fetchSongs() {

    if (!db) {
        return;
    }

    try {

        const {
            data,
            error
        } =
            await db
                .from('songs_sandbox')
                .select('*')
                .order(
                    'created_at',
                    {
                        ascending: false
                    }
                );


        if (
            !error &&
            data &&
            data.length > 0
        ) {

            songs = data;

        }

    } catch (err) {

        console.log(
            'Using local sandbox dataset'
        );

    }

    updateNewFolderBadge();

}


/* =========================================================
   NEW SONG BADGE
   ========================================================= */

function updateNewFolderBadge() {

    const unapprovedCount =
        songs.filter(
            s => isUnapproved(s)
        ).length;

    if (newCountBadge) {

        newCountBadge.textContent =
            unapprovedCount;

    }

}


/* =========================================================
   RENDER SONGS
   ========================================================= */

function renderSongs(
    songsToRender,
    titleText
) {

    /*
       Stop old timeline timers before rerendering.
    */

    Object.keys(ytTimelineTimers)
        .forEach(songId => {

            stopTimeTimeline(songId);

        });


    listHeader.textContent =
        titleText;


    let sortedSongs =
        [...songsToRender];


    if (inNewFolderView) {

        sortedSongs.sort(
            (a, b) =>
                (b.created_at || 0) -
                (a.created_at || 0)
        );

    } else {

        sortedSongs.sort(
            (a, b) =>
                a.title.localeCompare(b.title)
        );

    }


    songCount.textContent =
        `${sortedSongs.length} song${sortedSongs.length === 1 ? '' : 's'} found`;


    if (sortedSongs.length === 0) {

        songsList.innerHTML = `
            <p class="text-center text-slate-500 py-8">
                No songs found in this view.
            </p>
        `;

        return;
    }


    songsList.innerHTML =
        sortedSongs.map(song => {

            const ytId =
                extractYouTubeID(song.video_url) ||
                extractYouTubeID(song.audio_url);


            const thumbnailUrl =
                ytId
                    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                    : null;


            const songIsUnapproved =
                isUnapproved(song);


            return `

            <div
                class="bg-slate-800 border border-slate-700/70 rounded-xl overflow-hidden transition-all mb-2">


                <!-- SONG HEADER -->

                <div
                    onclick="toggleSongAccordion('${song.id}')"
                    class="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors">

                    <div class="flex items-center gap-3 overflow-hidden">

                        <div
                            class="w-8 h-8 rounded-lg ${
                                songIsUnapproved
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-indigo-600/20 text-indigo-400'
                            } flex items-center justify-center font-bold text-xs shrink-0">

                            <i
                                class="fa-solid ${
                                    songIsUnapproved
                                        ? 'fa-clock'
                                        : 'fa-music'
                                }">
                            </i>

                        </div>


                        <div class="truncate">

                            <h3
                                class="font-bold text-sm text-white truncate">

                                ${song.title}

                            </h3>


                            <span
                                class="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full mt-0.5 inline-block">

                                ${song.category}

                            </span>

                        </div>

                    </div>


                    <div class="flex items-center gap-2 shrink-0">

                        ${
                            songIsUnapproved
                                ? `
                                    <span
                                        class="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-bold">

                                        Unapproved

                                    </span>
                                  `
                                : ''
                        }


                        <i
                            id="accordion-icon-${song.id}"
                            class="fa-solid fa-chevron-down text-slate-400 text-xs transition-transform duration-200">
                        </i>

                    </div>

                </div>


                <!-- ACCORDION DETAILS -->

                <div
                    id="accordion-details-${song.id}"
                    class="hidden p-4 border-t border-slate-700/60 bg-slate-900/40 space-y-3">


                    <!-- BUTTONS -->

                    <div class="flex items-center gap-2 flex-wrap">

                        ${
                            ytId
                                ? `
                                    <button
                                        onclick="loadYTPlayer('${song.id}', '${ytId}')"
                                        class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-600/30 rounded-lg text-xs font-semibold transition-all cursor-pointer">

                                        <i class="fa-solid fa-play"></i>
                                        Play Audio

                                    </button>
                                  `
                                : ''
                        }


                        <button
                            onclick="toggleLyrics('${song.id}')"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white border border-sky-600/30 rounded-lg text-xs font-semibold transition-all cursor-pointer">

                            <i class="fa-solid fa-align-left"></i>
                            Lyrics

                        </button>


                        <button
                            onclick="handleEditTap('${song.id}')"
                            class="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white border border-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer">

                            <i class="fa-solid fa-pen"></i>
                            Edit

                        </button>


                        <button
                            onclick="handleThumbsUpTap('${song.id}')"
                            title="Tap 5 times to approve"
                            class="flex items-center justify-center p-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-slate-900 border border-amber-500/30 rounded-lg transition-all cursor-pointer">

                            <i class="fa-solid fa-thumbs-up text-sm"></i>

                        </button>

                    </div>


                    ${
                        ytId
                            ? `

                                <!-- YOUTUBE -->

                                <div
                                    class="mt-2 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">


                                    <!-- YOUTUBE PREVIEW -->

                                    <div
                                        id="yt-preview-${song.id}"
                                        class="relative cursor-pointer group"
                                        onclick="loadYTPlayer('${song.id}', '${ytId}')">

                                        <img
                                            src="${thumbnailUrl}"
                                            class="w-full h-40 object-cover opacity-80 group-hover:opacity-100 transition-all">


                                        <div
                                            class="absolute inset-0 bg-black/40 flex items-center justify-center">

                                            <div
                                                class="px-4 py-2 bg-rose-600/90 text-white text-xs font-bold rounded-full flex items-center gap-2 shadow-lg group-hover:scale-105 transition-all">

                                                <i class="fa-solid fa-play"></i>

                                                Tap to Play Audio Reference

                                            </div>

                                        </div>

                                    </div>


                                    <!-- YOUTUBE PLAYER -->

                                    <div
                                        id="yt-player-${song.id}"
                                        class="hidden">
                                    </div>


                                    <!-- TIME FRAME -->

                                    <div
                                        id="time-timeline-${song.id}"
                                        class="time-timeline">

                                        <!-- FIXED CENTER REFERENCE -->

                                        <div
                                            class="time-center-line">
                                        </div>


                                        <div
                                            class="time-center-label">
                                            NOW
                                        </div>


                                        <!-- MOVING TIME TRACK -->

                                        <div
                                            class="time-track">
                                        </div>

                                    </div>


                                    <!-- CURRENT TIME -->

                                    <div
                                        class="time-current-wrap">

                                        <span
                                            id="time-current-${song.id}">
                                            00:00
                                        </span>

                                    </div>

                                </div>

                              `
                            : ''
                    }


                    <!-- LYRICS -->

                    <div
                        id="lyrics-container-${song.id}"
                        class="hidden pt-3 border-t border-slate-700/60 text-slate-300 text-sm whitespace-pre-line font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-800">

                        ${song.lyrics || 'No lyrics provided.'}

                    </div>


                </div>

            </div>

            `;

        }).join('');
    /* =========================================================
   ACCORDION
   ========================================================= */

window.toggleSongAccordion =
function(id) {

    const details =
        document.getElementById(
            `accordion-details-${id}`
        );

    const icon =
        document.getElementById(
            `accordion-icon-${id}`
        );


    if (details) {

        details.classList.toggle(
            'hidden'
        );

    }


    if (icon) {

        icon.classList.toggle(
            'rotate-180'
        );

    }

};


/* =========================================================
   LYRICS
   ========================================================= */

window.toggleLyrics =
function(id) {

    const lyricsElement =
        document.getElementById(
            `lyrics-container-${id}`
        );

    if (lyricsElement) {

        lyricsElement.classList.toggle(
            'hidden'
        );

    }

};


/* =========================================================
   EDIT TAP SECURITY
   ========================================================= */

let tapTracker = {
    songId: null,
    count: 0,
    timer: null
};


window.handleEditTap =
function(id) {

    if (
        tapTracker.songId === id
    ) {

        tapTracker.count++;

    } else {

        tapTracker.songId = id;
        tapTracker.count = 1;

    }


    clearTimeout(
        tapTracker.timer
    );


    tapTracker.timer =
        setTimeout(() => {

            tapTracker.songId = null;
            tapTracker.count = 0;

        }, 2500);


    if (
        tapTracker.count >= 5
    ) {

        tapTracker.songId = null;
        tapTracker.count = 0;

        editSong(id);

    }

};


/*
=========================================================
   APPROVAL TAP SECURITY
   ========================================================= */

let thumbsTapTracker = {
    songId: null,
    count: 0,
    timer: null
};


window.handleThumbsUpTap =
async function(id) {

    if (
        thumbsTapTracker.songId === id
    ) {

        thumbsTapTracker.count++;

    } else {

        thumbsTapTracker.songId = id;
        thumbsTapTracker.count = 1;

    }


    clearTimeout(
        thumbsTapTracker.timer
    );


    thumbsTapTracker.timer =
        setTimeout(() => {

            thumbsTapTracker.songId = null;
            thumbsTapTracker.count = 0;

        }, 2500);


    if (
        thumbsTapTracker.count >= 5
    ) {

        thumbsTapTracker.songId = null;
        thumbsTapTracker.count = 0;

        await approveSong(id);

    }

};


/* =========================================================
   APPROVE SONG
   ========================================================= */

async function approveSong(id) {

    if (db) {

        try {

            await db
                .from('songs_sandbox')
                .update({
                    approved: true
                })
                .eq('id', id);


            await fetchSongs();

        } catch (err) {

            console.error(
                'Approval error:',
                err
            );

        }

    } else {

        songs =
            songs.map(s =>
                s.id == id
                    ? {
                        ...s,
                        approved: true
                    }
                    : s
            );

    }


    updateNewFolderBadge();

    filterAndShowSongs();

}


/*
========================
   FILTER / DISPLAY
   ========================================================= */

function filterAndShowSongs() {

    songsContainer.classList.remove(
        'hidden'
    );


    const query =
        searchInput.value
            .toLowerCase()
            .trim();


    let filtered = [];


    if (inNewFolderView) {

        filtered =
            songs.filter(song => {

                const matchesSearch =
                    song.title
                        .toLowerCase()
                        .includes(query) ||

                    (
                        song.lyrics &&
                        song.lyrics
                            .toLowerCase()
                            .includes(query)
                    );


                return (
                    isUnapproved(song) &&
                    matchesSearch
                );

            });


        renderSongs(
            filtered,
            query
                ? `New Folder matching "${query}"`
                : "New Songs Folder"
        );

    } else {

        filtered =
            songs.filter(song => {

                const matchesSearch =
                    song.title
                        .toLowerCase()
                        .includes(query) ||

                    (
                        song.lyrics &&
                        song.lyrics
                            .toLowerCase()
                            .includes(query)
                    );


                const matchesCategory =
                    activeCategory
                        ? (
                            song.category &&
                            song.category
                                .trim()
                                .toLowerCase() ===
                            activeCategory
                                .trim()
                                .toLowerCase()
                        )
                        : true;


                return (
                    !isUnapproved(song) &&
                    matchesSearch &&
                    matchesCategory
                );

            });


        const headerLabel =
            activeCategory

                ? (
                    query
                        ? `${activeCategory} Songs matching "${query}"`
                        : `${activeCategory} Songs`
                  )

                : (
                    query
                        ? `Results for "${query}"`
                        : "All Songs"
                  );


        renderSongs(
            filtered,
            headerLabel
        );

    }

}


/*

}


/*
    =========================================================
   CATEGORY
   ========================================================= */

function clearCategorySelection() {

    activeCategory = null;


    categoryButtons.forEach(btn => {

        btn.classList.remove(
            'bg-indigo-600',
            'text-white'
        );

        btn.classList.add(
            'bg-slate-800',
            'text-slate-300'
        );

    });

}


/* =========================================================
   NEW SONGS FOLDER
   ========================================================= */

newFolderBtn.addEventListener(
    'click',
    () => {

        inNewFolderView = true;

        clearCategorySelection();


        newFolderBtn.classList.remove(
            'bg-amber-500/20',
            'text-amber-300'
        );


        newFolderBtn.classList.add(
            'bg-amber-500',
            'text-slate-900'
        );


        filterAndShowSongs();

    }
);


/* =========================================================
   SEARCH
   ========================================================= */

searchInput.addEventListener(
    'click',
    () => {

        inNewFolderView = false;


        newFolderBtn.classList.remove(
            'bg-amber-500',
            'text-slate-900'
        );


        newFolderBtn.classList.add(
            'bg-amber-500/20',
            'text-amber-300'
        );


        clearCategorySelection();

        filterAndShowSongs();

    }
);


searchInput.addEventListener(
    'input',
    () => {

        filterAndShowSongs();

    }
);


/* =========================================================
   CATEGORY BUTTONS
   ========================================================= */

categoryButtons.forEach(button => {

    button.addEventListener(
        'click',
        () => {

            inNewFolderView = false;


            newFolderBtn.classList.remove(
                'bg-amber-500',
                'text-slate-900'
            );


            newFolderBtn.classList.add(
                'bg-amber-500/20',
                'text-amber-300'
            );


            const category =
                button.getAttribute(
                    'data-category'
                );


            if (
                activeCategory === category
            ) {

                clearCategorySelection();

            } else {

                clearCategorySelection();

                activeCategory = category;


                button.classList.remove(
                    'bg-slate-800',
                    'text-slate-300'
                );


                button.classList.add(
                    'bg-indigo-600',
                    'text-white'
                );

            }


            filterAndShowSongs();

        }
    );

});


/* =========================================================
   MODAL
   ========================================================= */

function openModal(isEdit = false) {

    modalTitle.textContent =
        isEdit
            ? "Edit Song"
            : "Add New Song";


    songModal.classList.remove(
        'hidden'
    );

}


function closeModal() {

    songModal.classList.add(
        'hidden'
    );

    songForm.reset();

    document.getElementById(
        'song-id'
    ).value = '';

}


/* =========================================================
   ADD SONG
   ========================================================= */

addSongBtn.addEventListener(
    'click',
    () => openModal(false)
);


closeModalBtn.addEventListener(
    'click',
    closeModal
);


cancelModalBtn.addEventListener(
    'click',
    closeModal
);


/* =========================================================
   EDIT SONG
   ========================================================= */

function editSong(id) {

    const song =
        songs.find(
            s => s.id == id
        );


    if (!song) {
        return;
    }


    document.getElementById(
        'song-id'
    ).value = song.id;


    document.getElementById(
        'song-title-input'
    ).value = song.title;


    document.getElementById(
        'song-category-input'
    ).value = song.category;


    document.getElementById(
        'song-audio-input'
    ).value =
        song.audio_url !== '#'
            ? (song.audio_url || '')
            : '';


    document.getElementById(
        'song-video-input'
    ).value =
        song.video_url !== '#'
            ? (song.video_url || '')
            : '';


    document.getElementById(
        'song-lyrics-input'
    ).value =
        song.lyrics || '';


    openModal(true);

}


/*
    =========================================================
   SAVE SONG
   ========================================================= */

songForm.addEventListener(
    'submit',
    async (e) => {

        e.preventDefault();


        const id =
            document.getElementById(
                'song-id'
            ).value;


        const isNew = !id;


        const title =
            document.getElementById(
                'song-title-input'
            ).value;


        const category =
            document.getElementById(
                'song-category-input'
            ).value;


        const audio_url =
            document.getElementById(
                'song-audio-input'
            ).value || '';


        const video_url =
            document.getElementById(
                'song-video-input'
            ).value || '';


        const lyrics =
            document.getElementById(
                'song-lyrics-input'
            ).value || '';


        if (isNew) {

            const newSong = {

                title,
                category,
                audio_url,
                video_url,
                lyrics,

                approved: false,

                created_at:
                    Date.now()

            };


            if (db) {

                try {

                    const {
                        error
                    } =
                        await db
                            .from('songs_sandbox')
                            .insert([
                                newSong
                            ]);


                    if (error) {

                        alert(
                            'Save Failed: ' +
                            error.message
                        );

                        return;

                    } else {

                        alert(
                            'Success! Song saved to Sandbox.'
                        );


                        await fetchSongs();

                    }

                } catch (err) {

                    alert(
                        'Connection Error: ' +
                        err.message
                    );

                    return;

                }

            } else {

                songs.push({
                    id:
                        Date.now().toString(),

                    ...newSong
                });

            }


            inNewFolderView = true;


            newFolderBtn.classList.remove(
                'bg-amber-500/20',
                'text-amber-300'
            );


            newFolderBtn.classList.add(
                'bg-amber-500',
                'text-slate-900'
            );


            clearCategorySelection();


        } else {

            if (db) {

                try {

                    const {
                        error
                    } =
                        await db
                            .from('songs_sandbox')
                            .update({
                                title,
                                category,
                                audio_url,
                                video_url,
                                lyrics
                            })
                            .eq('id', id);


                    if (error) {

                        alert(
                            'Update Failed: ' +
                            error.message
                        );

                        return;

                    } else {

                        alert(
                            'Success! Song updated.'
                        );


                        await fetchSongs();

                    }

                } catch (err) {

                    alert(
                        'Update Error: ' +
                        err.message
                    );

                    return;

                }

            } else {

                songs =
                    songs.map(
                        s =>
                            s.id == id
                                ? {
                                    ...s,
                                    title,
                                    category,
                                    audio_url,
                                    video_url,
                                    lyrics
                                  }
                                : s
                    );

            }

        }


        updateNewFolderBadge();

        closeModal();

        filterAndShowSongs();

    }
);


/*
    =========================================================
   INITIALIZE
   ========================================================= */

window.addEventListener(
    'DOMContentLoaded',
    async () => {

        initSupabase();

        await fetchSongs();

        filterAndShowSongs();

    }
);
