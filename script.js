/* ==========================================================================
   CRIC CLASH v30 • SUPREME LIQUID BROADCAST EDITION (script.js)
   All Requested Upgrades Included:
   1. 1v1 Interactive Player Cards (No Dropdowns)
   2. Dynamic Multi-Line Stadium Voice Commentary (Never speaks player names)
   3. Live Hub "undefined" Fix + Auto-Deletes Public Rooms Inactive > 24 Hours
   4. Advanced Career Modal (Batting/Bowling/Recent Form + Top 5 Badges)
   5. Leaderboard with Runs, Wkts, AVG, SR, 6s, 4s, Wins + Advanced H2H Modal
   6. Custom Overs Support (Any custom over count in Match & League)
   7. Auction Room Removed
   8. Working Live Worm & Manhattan Charts with Wicket Dots
   9. Advanced Post-Match Celebration Card & Full Broadcast Scorecard
   ========================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyB0vDSruAblivdCLm8o3s48AFuckFY_Oec",
    authDomain: "cric-clash.firebaseapp.com",
    databaseURL: "https://cric-clash-default-rtdb.firebaseio.com",
    projectId: "cric-clash",
    storageBucket: "cric-clash.firebasestorage.app",
    messagingSenderId: "26915012588",
    appId: "1:26915012588:web:5b6c7e85ef018881e9cac9"
};

try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
} catch (e) {}

const database = (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null;
const auth = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth() : null;
let googleProvider = null;
try {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth.GoogleAuthProvider) {
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
    }
} catch (e) {}

var settings = { appTheme: 'oled', voice: true, sfx: true, autoSave: true, commTone: 'hype' };
var APP_THEMES = ['oled', 'ipl', 'turf', 'cyber', 'frost'];
var matchHistory = [];
var publicFinishedMatches = [];
var pausedMatches = [];
var players = [];
var rivalries = {};
var leagues = [];
var isStrictSpectatorLinkMode = false;
var liveBroadcastPrivacy = 'public';
var pendingStartAction = null;
var activePausedMatchId = null;
var activePublicHubTab = 'live';
var sharedAudioCtx = null;

var selected1v1StrikerIdx = 0;
var selected1v1BowlerIdx = 1;
var h2hPlayerAIdx = 0;
var h2hPlayerBIdx = 1;

/* ==========================================================================
   DYNAMIC COMMENTARY BANK (VARIED & NEVER SPEAKS PLAYER NAMES)
   ========================================================================== */
var COMMENTARY_BANK = {
    dot: [
        "Dot ball! Right on the money, no run.",
        "Solid defense straight back down the pitch.",
        "Beaten on the outside edge! Superb delivery.",
        "Straight to the fielder inside the circle, dot ball.",
        "Tight line and length, keeps the scoring in check.",
        "Play and a miss! Pressure building at the crease.",
        "Crisp drive but straight to mid-off, no run."
    ],
    one: [
        "Quick single taken! Smart rotation of strike.",
        "Pushed into the gap for a comfortable single.",
        "Tapped softly to the leg side and they scamper through for one.",
        "Worked away off the hips for an easy single.",
        "Guided down to third man for one run.",
        "Good running between the wickets, adds one to the total."
    ],
    two: [
        "Driven into the deep and they come back hard for two!",
        "Placed nicely in the gap, hustling back for the second run!",
        "Clipped off the pads, electric running earns two runs!",
        "Punched through the covers for a well-run brace!"
    ],
    three: [
        "Timed into the big pocket! Three runs added to the scoreboard!",
        "Superb placement and brilliant relay in the deep, three runs taken!",
        "Pierces the infield, they push hard and complete three runs!"
    ],
    four: [
        "Cracking shot! Races away to the fence for FOUR!",
        "Shot of authority! Splits the gap for a glorious boundary!",
        "Crunched through the covers! Nobody stopping that FOUR!",
        "Pure timing! Bullet to the boundary rope for FOUR!",
        "Exquisite strokeplay! Finds the rope in style!",
        "Swept away fiercely! One bounce and over the rope for FOUR!",
        "Threaded through point like a tracer bullet! FOUR runs!"
    ],
    six: [
        "MASSIVE SIX! Launched high and handsome into the stands!",
        "Out of the park! That ball has been sent into orbit for SIX!",
        "BOOM! Clean strike right off the sweet spot for a maximum!",
        "High, miles high, and way back into the crowd for SIX!",
        "Monster hit! Clears the ropes with absolute ease!",
        "Stand and deliver! Smoked over long-on for a gigantic SIX!",
        "Unstoppable power! Six more runs added in explosive fashion!"
    ],
    wd: [
        "Wide ball signalled! Drifting way down the leg side.",
        "Strays off target, umpire stretches the arms for a wide.",
        "Too far outside off stump, extra run awarded for wide."
    ],
    nb: [
        "No ball called! Overstepped the popping crease, Free Hit coming up!",
        "Siren goes off for a No Ball! Next delivery is a Free Hit!",
        "Extra run for No Ball and the crowd roars for the Free Hit!"
    ],
    wicket: [
        "OUT! Clean breakthrough! The stumps are shattered!",
        "GONE! Huge wicket right when it mattered most!",
        "UP GOES THE FINGER! Big dismissal shakes up the innings!",
        "TAKEN! Straight into safe hands, a massive blow!",
        "BOWLED HIM! What an unplayable delivery, timber!",
        "Breakthrough achieved! The fielding side is fired up!"
    ],
    start: [
        "The players are set, umpire calls play, let the clash begin!",
        "We are live from the stadium! First ball coming right up!",
        "Electric atmosphere in the arena as the innings gets underway!"
    ],
    inningsBreak: [
        "End of the first innings! A thrilling chase is set up next!",
        "Innings break! Everything to play for in the second half!"
    ],
    finish: [
        "And that wraps up an unforgettable clash of champions!",
        "What a finish! A masterclass performance seals the victory!",
        "Game, set, and match! An iconic victory in the arena!"
    ]
};

var lastSpokenPhrase = '';
function pickRandomCommentary(category) {
    var arr = COMMENTARY_BANK[category] || COMMENTARY_BANK.dot;
    var pick = arr[Math.floor(Math.random() * arr.length)];
    if (arr.length > 1 && pick === lastSpokenPhrase) {
        pick = arr[(arr.indexOf(pick) + 1) % arr.length];
    }
    lastSpokenPhrase = pick;
    return pick;
}

/* ==========================================================================
   MASTER CATALOG OF 113 UNLOCKABLE ACHIEVEMENTS & BADGES
   ========================================================================== */
var MASTER_BADGES = [
    { id: '🎖️ 10-Match Veteran', icon: '🎖️', title: '10-Match Veteran', desc: 'Play 10+ career clashes', check: function(c) { return (c.matches || 0) >= 10; } },
    { id: '👑 25-Clash Legend', icon: '👑', title: '25-Clash Legend', desc: 'Compete in 25+ career matches', check: function(c) { return (c.matches || 0) >= 25; } },
    { id: '🏏 100R Club', icon: '🏏', title: '100 Runs Club', desc: 'Score 100+ total career runs', check: function(c) { return (c.runs || 0) >= 100; } },
    { id: '⚡ 500R Titan', icon: '⚡', title: '500 Runs Titan', desc: 'Amass 500+ total career runs', check: function(c) { return (c.runs || 0) >= 500; } },
    { id: '🔥 Half-Century Hero', icon: '🔥', title: 'Half-Century Hero', desc: 'Score 50+ runs in a single innings', check: function(c) { return (c.fifties || 0) >= 1 || (c.best || 0) >= 50; } },
    { id: '💯 Century Maker', icon: '💯', title: 'Century Maker', desc: 'Score 100+ in a single innings', check: function(c) { return (c.hundreds || 0) >= 1 || (c.best || 0) >= 100; } },
    { id: '💥 6-Sixes Blitz', icon: '💥', title: '6-Sixes Blitz', desc: 'Smash 6+ Sixes in a single match', check: function(c) { return !!c.sixBlitz || (c.maxSixesInMatch || 0) >= 6; } },
    { id: '🚀 Sixer King', icon: '🚀', title: 'Sixer King', desc: 'Hit 10+ career Sixes', check: function(c) { return (c.sixes || 0) >= 10; } },
    { id: '☄️ 50-Sixes Monster', icon: '☄️', title: '50-Sixes Monster', desc: 'Launch 50+ career Sixes', check: function(c) { return (c.sixes || 0) >= 50; } },
    { id: '🎯 Strike Bowler', icon: '🎯', title: 'Strike Bowler', desc: 'Take 5+ career wickets', check: function(c) { return (c.wickets || 0) >= 5; } },
    { id: '🖐️ 5-Wicket Haul', icon: '🖐️', title: '5-Wicket Haul', desc: 'Bag 5+ wickets in a single match', check: function(c) { return (c.fiveWicketHauls || 0) >= 1; } },
    { id: '🟣 25W Viper', icon: '🟣', title: '25-Wicket Viper', desc: 'Claim 25+ career wickets', check: function(c) { return (c.wickets || 0) >= 25; } },
    { id: '🌋 God Mode', icon: '🌋', title: 'God Mode Streak', desc: 'Win 5 consecutive matches in a row', check: function(c) { return (c.maxStreak || 0) >= 5; } }
];

(function build100MoreBadges() {
    var runTiers = [10, 25, 50, 75, 150, 200, 250, 300, 400, 600, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 8500, 10000, 12000];
    runTiers.forEach(function(r) {
        MASTER_BADGES.push({
            id: '🏏 ' + r + 'R Milestone', icon: '🏏', title: r + ' Career Runs',
            desc: 'Score ' + r + '+ career runs', check: function(c) { return (c.runs || 0) >= r; }
        });
    });

    var sixTiers = [1, 3, 5, 15, 20, 25, 30, 40, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 600];
    sixTiers.forEach(function(s) {
        MASTER_BADGES.push({
            id: '🚀 ' + s + ' Sixes Club', icon: '🚀', title: s + ' Career Sixes',
            desc: 'Smash ' + s + '+ career Sixes', check: function(c) { return (c.sixes || 0) >= s; }
        });
    });

    var fourTiers = [1, 5, 10, 15, 25, 35, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 750, 900, 1000];
    fourTiers.forEach(function(f) {
        MASTER_BADGES.push({
            id: '⚡ ' + f + ' Fours Club', icon: '⚡', title: f + ' Boundary Fours',
            desc: 'Hit ' + f + '+ career Fours', check: function(c) { return (c.fours || 0) >= f; }
        });
    });

    var wktTiers = [1, 3, 10, 15, 20, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500];
    wktTiers.forEach(function(w) {
        MASTER_BADGES.push({
            id: '🎯 ' + w + 'W Hunter', icon: '🎯', title: w + ' Career Wickets',
            desc: 'Take ' + w + '+ career wickets', check: function(c) { return (c.wickets || 0) >= w; }
        });
    });

    var matchTiers = [1, 3, 5, 15, 20, 30, 40, 50, 75, 100, 150, 200];
    matchTiers.forEach(function(m) {
        MASTER_BADGES.push({
            id: '🏟️ ' + m + ' Caps', icon: '🏟️', title: m + ' Matches Played',
            desc: 'Play ' + m + '+ career matches', check: function(c) { return (c.matches || 0) >= m; }
        });
    });

    var winTiers = [1, 3, 5, 10, 25];
    winTiers.forEach(function(w) {
        MASTER_BADGES.push({
            id: '🏆 ' + w + ' Victories', icon: '🏆', title: w + ' Match Wins',
            desc: 'Win ' + w + '+ career clashes', check: function(c) { return (c.wins || 0) >= w; }
        });
    });
})();

var matchMode = '1v1', teamWicketRule = 'all_out', teamAName = 'Team A', teamBName = 'Team B', teamAColor = '#4285f4', teamBColor = '#ff1744', teamALogo = null, teamBLogo = null, teamA = [], teamB = [], battingTeam = [], bowlingTeam = [], matchActive = false, cur = 0, nonStriker = -1, curBowler = -1, currOver = [], allBalls = [], overByOver = [], overWickets = [], fowList = [], partnershipRuns = 0, partnershipBalls = 0, innings1 = null, isSecondInnings = false, targetToWin = 0, maxOvers = 10, isFreeHit = false, isSuperOver = false, wicketsDown = 0, tempAvatar = null, currentTab = 'runs', selectedTheme = '#f5c542', currentTrophyTab = 'badges';
var ffaPlayers = [], ffaCurrentBatterIdx = -1, ffaPickedBatterTemp = -1, ffaTurnNumber = 0;
var editIndex = -1, editTempAvatar = null, editSelectedTheme = '#f5c542';
var currentGmailUser = localStorage.getItem('cric_gmail_user') || null;
var currentGoogleName = localStorage.getItem('cric_google_name') || '';
var currentGooglePhoto = localStorage.getItem('cric_google_photo') || '';
var overRuns = 0, overWktsCount = 0, undoStack = [], highlightFilter = 'all';
var hostRoomCode = localStorage.getItem('cric_host_room') || null;
var fullSpectatorRoomRef = null;
var specAudioEnabled = true;
var voiceScoringActive = false;
var recognition = null;
var widesCount = 0, noBallsCount = 0;
var TEAM_THEMES = [
    { name: 'Gold', color: '#f5c542' }, { name: 'CSK', color: '#FFFF00' },
    { name: 'MI', color: '#004BA0' }, { name: 'RCB', color: '#EC1C24' },
    { name: 'KKR', color: '#3A225D' }, { name: 'GT', color: '#1B82E1' },
    { name: 'SRH', color: '#FF822A' }, { name: 'RR', color: '#FF1493' }
];

/* ==========================================================================
   1. PERSISTENCE & BADGE ENGINE
   ========================================================================== */
function checkAndAwardBadges(pl) {
    if (!pl || !pl.career) return;
    pl.career.badges = [];
    MASTER_BADGES.forEach(function(b) {
        if (b.check(pl.career)) {
            pl.career.badges.push(b.id);
        }
    });
}

function loadPersistentData() {
    try {
        var s = localStorage.getItem('cric_settings_v30');
        if (s) settings = Object.assign(settings, JSON.parse(s));
    } catch (e) {}
    try {
        var h = localStorage.getItem('cric_clash_history_v10');
        if (h) matchHistory = JSON.parse(h) || [];
    } catch (e) { matchHistory = []; }
    try {
        var pm = localStorage.getItem('cric_paused_matches_v30');
        if (pm) pausedMatches = JSON.parse(pm) || [];
    } catch (e) { pausedMatches = []; }
    try {
        var p = localStorage.getItem('cric_clash_players_v10');
        if (p) players = JSON.parse(p) || [];
        players.forEach(function(pl) {
            if (!pl.career) pl.career = { matches: 0, runs: 0, balls: 0, fours: 0, sixes: 0, best: 0, wins: 0, fifties: 0, hundreds: 0, ducks: 0, streak: 0, maxStreak: 0, badges: [], wickets: 0, ballsBowled: 0, runsConceded: 0, form: [], fiveWicketHauls: 0, sixBlitz: false, maxSixesInMatch: 0 };
            if (!pl.career.form) pl.career.form = [];
            if (pl.career.wickets === undefined) pl.career.wickets = 0;
            if (pl.career.ballsBowled === undefined) pl.career.ballsBowled = 0;
            if (pl.career.runsConceded === undefined) pl.career.runsConceded = 0;
            if (pl.career.fiveWicketHauls === undefined) pl.career.fiveWicketHauls = 0;
            if (pl.career.maxSixesInMatch === undefined) pl.career.maxSixesInMatch = 0;
            if (!pl.career.badges) pl.career.badges = [];
            if (pl.career.streak === undefined) pl.career.streak = 0;
            if (pl.career.maxStreak === undefined) pl.career.maxStreak = 0;
            if (!pl.theme) pl.theme = '#f5c542';
            checkAndAwardBadges(pl);
        });
    } catch (e) { players = []; }
    try {
        var l = localStorage.getItem('cric_league_v11');
        if (l) leagues = JSON.parse(l) || [];
    } catch (e) { leagues = []; }
}

function saveAll(silent) {
    if (isStrictSpectatorLinkMode) return;
    try {
        if (matchHistory.length > 60) matchHistory = matchHistory.slice(0, 60);
        localStorage.setItem('cric_clash_history_v10', JSON.stringify(matchHistory));
        localStorage.setItem('cric_paused_matches_v30', JSON.stringify(pausedMatches));
        localStorage.setItem('cric_clash_players_v10', JSON.stringify(players));
        localStorage.setItem('cric_league_v11', JSON.stringify(leagues));
        if (!silent && currentGmailUser && settings.autoSave) {
            cloudBackup(true);
        }
    } catch (e) {}
}

function saveSettings() {
    try { localStorage.setItem('cric_settings_v30', JSON.stringify(settings)); } catch (e) {}
}

window.addEventListener('beforeunload', function() {
    if (isStrictSpectatorLinkMode) return;
    if (matchActive) saveLiveState();
    saveAll(true);
});

/* ==========================================================================
   2. UI NAVIGATION, THEMES & CUSTOM OVERS TOGGLE
   ========================================================================== */
function showToast(msg) {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(function() {
        t.style.opacity = '0';
        setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 2400);
}

function toggleCustomOversInput(selectId, inputId) {
    var sel = document.getElementById(selectId);
    var inp = document.getElementById(inputId);
    if (!sel || !inp) return;
    if (sel.value === 'custom') {
        inp.style.display = 'block';
        inp.focus();
    } else {
        inp.style.display = 'none';
    }
}

function getResolvedOversValue(selectId, inputId) {
    var sel = document.getElementById(selectId);
    var inp = document.getElementById(inputId);
    if (sel && sel.value === 'custom') {
        var v = parseInt(inp ? inp.value : '');
        if (!v || v < 1) return null;
        return v;
    }
    return parseInt(sel ? sel.value : '10') || 10;
}

function showPage(pageId) {
    var pages = document.querySelectorAll('.page');
    pages.forEach(function(p) { p.classList.remove('active'); });
    var target = document.getElementById(pageId + 'Page');
    if (target) target.classList.add('active');

    var navBtns = document.querySelectorAll('#mainBottomNav button');
    navBtns.forEach(function(b) { b.classList.remove('active'); });
    var activeNav = document.getElementById('nav' + pageId.charAt(0).toUpperCase() + pageId.slice(1));
    if (activeNav) activeNav.classList.add('active');

    var bottomNav = document.getElementById('mainBottomNav');
    var floatingHud = document.getElementById('floatingHud');
    if (pageId === 'match') {
        if (bottomNav) bottomNav.style.display = 'none';
        if (floatingHud) floatingHud.style.display = 'flex';
    } else {
        if (bottomNav) bottomNav.style.display = 'flex';
        if (floatingHud) floatingHud.style.display = 'none';
    }

    if (pageId === 'home') refreshHomeUI();
    if (pageId === 'profiles') renderProfiles();
    if (pageId === 'leader') renderLeader(currentTab);
    if (pageId === 'league') renderLeagues();
    if (pageId === 'trophy') renderTrophiesTab(currentTrophyTab);
}

function setAppTheme(themeName) {
    if (!APP_THEMES.includes(themeName)) themeName = 'oled';
    settings.appTheme = themeName;
    document.body.className = 'theme-' + themeName;
    APP_THEMES.forEach(function(t) {
        var btn = document.getElementById('themeBtn_' + t);
        if (btn) btn.classList.toggle('active', t === themeName);
    });
    saveSettings();
}

function cycleAppTheme() {
    var idx = (APP_THEMES.indexOf(settings.appTheme || 'oled') + 1) % APP_THEMES.length;
    setAppTheme(APP_THEMES[idx]);
    showToast('🎨 Theme: ' + APP_THEMES[idx].toUpperCase());
}

function toggleSetting(key) {
    settings[key] = !settings[key];
    var el = document.getElementById(key + 'Toggle');
    if (el) el.classList.toggle('on', settings[key]);
    saveSettings();
    showToast((settings[key] ? '✅ Enabled ' : '❌ Disabled ') + key.toUpperCase());
}

/* ==========================================================================
   3. SHARED AUDIO CONTEXT & DYNAMIC COMMENTARY (NO PLAYER NAMES)
   ========================================================================== */
function playSFX(type) {
    if (!settings.sfx) return;
    try {
        if (!sharedAudioCtx) {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (AC) sharedAudioCtx = new AC();
        }
        if (!sharedAudioCtx) return;
        if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
        var osc = sharedAudioCtx.createOscillator();
        var gain = sharedAudioCtx.createGain();
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        var now = sharedAudioCtx.currentTime;
        if (type === 'four') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
            osc.start(now); osc.stop(now + 0.24);
        } else if (type === 'six') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(1180, now + 0.32);
            gain.gain.setValueAtTime(0.26, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now); osc.stop(now + 0.35);
        } else if (type === 'wicket') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(75, now + 0.32);
            gain.gain.setValueAtTime(0.26, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.start(now); osc.stop(now + 0.35);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
            osc.start(now); osc.stop(now + 0.07);
        }
    } catch (e) {}
}

function speakCommentary(text) {
    var box = document.getElementById('commentaryText');
    if (box) box.textContent = text;
    if (!settings.voice || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = 1.08;
        u.pitch = 1.06;
        window.speechSynthesis.speak(u);
    } catch (e) {}
}

function triggerImpactEffect(type) {
    if (type === 'six' || type === 'win') launchConfetti();
}

function launchConfetti() {
    var canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var pieces = [];
    var colors = ['#f5c542', '#ff2d55', '#0a84ff', '#00e676', '#a855f7'];
    for (var i = 0; i < 45; i++) {
        pieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: 6 + Math.random() * 5,
            h: 6 + Math.random() * 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: 4 + Math.random() * 4,
            vx: -2 + Math.random() * 4
        });
    }
    var frames = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(function(p) {
            p.y += p.vy;
            p.x += p.vx;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.w, p.h);
        });
        frames++;
        if (frames < 70) {
            requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
    }
    draw();
}

/* ==========================================================================
   4. PUBLIC LIVE & ARCHIVE HUB (FIXES UNDEFINED & AUTO-CLEANS >24H ROOMS)
   ========================================================================== */
function switchPublicHubTab(tab) {
    activePublicHubTab = tab;
    var btnLive = document.getElementById('pubHubTab_live');
    var btnHist = document.getElementById('pubHubTab_history');
    var liveBox = document.getElementById('publicHubLiveContent');
    var histBox = document.getElementById('publicHubHistoryContent');
    if (btnLive) btnLive.classList.toggle('active', tab === 'live');
    if (btnHist) btnHist.classList.toggle('active', tab === 'history');
    if (liveBox) liveBox.style.display = (tab === 'live') ? 'block' : 'none';
    if (histBox) histBox.style.display = (tab === 'history') ? 'block' : 'none';
    refreshPublicHubFeed();
}

function refreshPublicHubFeed() {
    var liveBox = document.getElementById('publicHubLiveContent');
    var histBox = document.getElementById('publicHubHistoryContent');
    if (!liveBox || !histBox) return;

    if (!database) {
        liveBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">📴 Offline Mode • Connect to internet for Public Live Streams</div>';
        histBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">📴 Offline Mode</div>';
        return;
    }

    var nowMs = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;

    database.ref('live_rooms').limitToLast(25).once('value', function(snap) {
        var val = snap.val();
        var publicRooms = [];
        if (val) {
            Object.keys(val).forEach(function(k) {
                var r = val[k];
                if (!r) return;
                var code = r.roomCode || k;
                var tA = r.teamA || r.p1Name || '';
                var tB = r.teamB || r.p2Name || '';
                var isCorrupted = (!tA || !tB || tA === 'undefined' || tB === 'undefined' || code === 'undefined');
                var isStale24h = (!r.updatedAt || (nowMs - r.updatedAt) > DAY_MS);

                // Auto-remove broken "undefined" rooms or rooms inactive for > 24 hours
                if (isCorrupted || isStale24h || r.ended) {
                    try { database.ref('live_rooms/' + k).remove(); } catch (e) {}
                    return;
                }
                if (r.privacy === 'public') {
                    publicRooms.push({
                        roomCode: code,
                        teamA: tA,
                        teamB: tB,
                        battingTeam: r.battingTeam || tA,
                        score: r.score || '0/0',
                        overs: r.overs || '0.0'
                    });
                }
            });
        }
        if (!publicRooms.length) {
            liveBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">No active public matches right now. Start a Public Match to stream live!</div>';
        } else {
            liveBox.innerHTML = publicRooms.reverse().map(function(r) {
                return '<div style="padding:8px 10px;background:var(--pill-bg);border:1px solid var(--border);border-radius:12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">' +
                    '<div><div style="font-size:11px;font-weight:900;color:var(--gold)">🔴 #' + r.roomCode + ' • ' + r.teamA + ' vs ' + r.teamB + '</div>' +
                    '<div style="font-size:10px;color:#fff;font-weight:800">' + r.battingTeam + ': ' + r.score + ' (' + r.overs + ' ov)</div></div>' +
                    '<button class="btn gold" style="padding:5px 9px;font-size:9px" onclick="openFullSpectatorScreen(\'' + r.roomCode + '\', false)">📺 WATCH LIVE</button></div>';
            }).join('');
        }
    });

    database.ref('public_finished_matches').limitToLast(20).once('value', function(snap) {
        var val = snap.val();
        publicFinishedMatches = [];
        if (val) {
            Object.keys(val).forEach(function(k) {
                var m = val[k];
                if (m && m.teamA && m.teamB && m.teamA !== 'undefined' && m.teamB !== 'undefined') {
                    publicFinishedMatches.push(m);
                } else {
                    try { database.ref('public_finished_matches/' + k).remove(); } catch (e) {}
                }
            });
            publicFinishedMatches.reverse();
        }
        if (!publicFinishedMatches.length) {
            histBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">No finished public broadcast matches yet.</div>';
        } else {
            histBox.innerHTML = publicFinishedMatches.map(function(m, idx) {
                return '<div style="padding:8px 10px;background:var(--pill-bg);border:1px solid var(--border);border-radius:12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">' +
                    '<div><div style="font-size:11px;font-weight:900">' + m.teamA + ' vs ' + m.teamB + '</div>' +
                    '<div style="font-size:9px;color:var(--gold);font-weight:800">🏆 ' + m.winner + ' • ' + m.inn1Score + (m.inn2Score ? ' | ' + m.inn2Score : '') + '</div></div>' +
                    '<button class="btn light" style="padding:5px 9px;font-size:8px" onclick="openPublicHistoryScorecard(' + idx + ')">📋 SCORECARD</button></div>';
            }).join('');
        }
    });
}

function openPublicHistoryScorecard(idx) {
    var m = publicFinishedMatches[idx];
    if (!m) return;
    renderScorecardModalFromRecord(m);
}

/* ==========================================================================
   5. PLAYER ROSTER & ADVANCED HOLOGRAPHIC CAREER MODAL (TOP 5 BADGES)
   ========================================================================== */
function renderThemeChips(containerId, activeColor, callbackName) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = TEAM_THEMES.map(function(t) {
        var active = (t.color.toLowerCase() === activeColor.toLowerCase()) ? 'border:2px solid #fff;transform:scale(1.1);' : 'border:1px solid rgba(255,255,255,0.2);';
        return '<div onclick="' + callbackName + '(\'' + t.color + '\')" style="width:24px;height:24px;border-radius:50%;background:' + t.color + ';cursor:pointer;' + active + '" title="' + t.name + '"></div>';
    }).join('');
}

function selectTheme(col) {
    selectedTheme = col;
    var picker = document.getElementById('customColorPicker');
    if (picker) picker.value = col;
    renderThemeChips('themeSelector', selectedTheme, 'selectTheme');
}

function previewAvatar(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            tempAvatar = e.target.result;
            var prev = document.getElementById('avatarPreview');
            if (prev) prev.innerHTML = '<img src="' + tempAvatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function addProfile() {
    var nameInp = document.getElementById('pName');
    var name = nameInp ? nameInp.value.trim() : '';
    if (!name) return showToast('⚠️ Enter player name!');
    if (players.some(function(p) { return p.name.toLowerCase() === name.toLowerCase(); })) {
        return showToast('⚠️ Player already exists!');
    }
    players.push({
        id: 'pl_' + Date.now(),
        name: name,
        avatar: tempAvatar,
        theme: selectedTheme,
        career: { matches: 0, runs: 0, balls: 0, fours: 0, sixes: 0, best: 0, wins: 0, fifties: 0, hundreds: 0, ducks: 0, streak: 0, maxStreak: 0, badges: [], wickets: 0, ballsBowled: 0, runsConceded: 0, form: [], fiveWicketHauls: 0, sixBlitz: false, maxSixesInMatch: 0 }
    });
    nameInp.value = '';
    tempAvatar = null;
    var prev = document.getElementById('avatarPreview');
    if (prev) prev.innerHTML = '?';
    saveAll();
    renderProfiles();
    refreshHomeUI();
    showToast('✅ Added ' + name + ' to roster!');
}

function getAvatarHTML(p, size, fontSize) {
    size = size || 38;
    fontSize = fontSize || 13;
    var col = (p && p.theme) ? p.theme : '#f5c542';
    if (p && p.avatar) {
        return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px;border-color:' + col + ';overflow:hidden"><img src="' + p.avatar + '" style="width:100%;height:100%;object-fit:cover"></div>';
    }
    var initials = p && p.name ? p.name.substring(0, 2).toUpperCase() : '?';
    return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px;font-size:' + fontSize + 'px;border-color:' + col + ';color:' + col + '">' + initials + '</div>';
}

function renderProfiles() {
    var list = document.getElementById('profilesList');
    if (!list) return;
    if (!players.length) {
        list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:14px;font-size:10px">No players registered yet. Add players above!</div>';
        return;
    }
    list.innerHTML = players.map(function(p, idx) {
        var c = p.career || {};
        var sr = c.balls ? ((c.runs / c.balls) * 100).toFixed(1) : '0.0';
        var avg = c.matches ? (c.runs / c.matches).toFixed(1) : '0.0';
        return '<div class="player-row" style="display:flex;justify-content:space-between;align-items:center;padding:9px;background:var(--pill-bg);border-radius:14px;margin-bottom:6px;border-left:4px solid ' + (p.theme || '#f5c542') + '">' +
            '<div style="display:flex;gap:9px;align-items:center;cursor:pointer;flex:1" onclick="openPlayerDetail(' + idx + ')">' +
            getAvatarHTML(p, 42, 14) +
            '<div><div style="font-weight:900;font-size:12px">' + p.name + ' <span style="font-size:9px;color:var(--gold)">(' + (c.badges ? c.badges.length : 0) + ' 🎖️)</span></div>' +
            '<div style="font-size:9px;color:var(--muted)">M:' + (c.matches || 0) + ' • Runs:' + (c.runs || 0) + ' • AVG:' + avg + ' • SR:' + sr + ' • Wkts:' + (c.wickets || 0) + '</div></div></div>' +
            '<div style="display:flex;gap:4px">' +
            '<button class="btn light" style="padding:5px 8px;font-size:9px" onclick="openEditPlayer(' + idx + ')">✏️</button>' +
            '<button class="btn red" style="padding:5px 8px;font-size:9px" onclick="deletePlayer(' + idx + ')">🗑️</button>' +
            '</div></div>';
    }).join('');
}

function deletePlayer(idx) {
    if (!confirm('Delete ' + players[idx].name + '?')) return;
    players.splice(idx, 1);
    saveAll();
    renderProfiles();
    refreshHomeUI();
    showToast('🗑️ Player removed');
}

function openEditPlayer(idx) {
    editIndex = idx;
    var p = players[idx];
    editTempAvatar = p.avatar || null;
    editSelectedTheme = p.theme || '#f5c542';
    document.getElementById('editPName').value = p.name;
    document.getElementById('editCustomColor').value = editSelectedTheme;
    var prev = document.getElementById('editAvatarPreview');
    prev.innerHTML = editTempAvatar ? '<img src="' + editTempAvatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : p.name.substring(0, 2).toUpperCase();
    renderThemeChips('editThemeSelector', editSelectedTheme, 'selectEditTheme');
    document.getElementById('editPlayerModal').classList.add('open');
}
function closeEditPlayer() { document.getElementById('editPlayerModal').classList.remove('open'); }
function selectEditTheme(col) {
    editSelectedTheme = col;
    document.getElementById('editCustomColor').value = col;
    renderThemeChips('editThemeSelector', editSelectedTheme, 'selectEditTheme');
}
function previewEditAvatar(input) {
    if (input.files && input.files[0]) {
        var r = new FileReader();
        r.onload = function(e) {
            editTempAvatar = e.target.result;
            document.getElementById('editAvatarPreview').innerHTML = '<img src="' + editTempAvatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
        };
        r.readAsDataURL(input.files[0]);
    }
}
function saveEditPlayer() {
    if (editIndex < 0) return;
    var n = document.getElementById('editPName').value.trim();
    if (!n) return showToast('⚠️ Name required');
    players[editIndex].name = n;
    players[editIndex].avatar = editTempAvatar;
    players[editIndex].theme = editSelectedTheme;
    saveAll();
    closeEditPlayer();
    renderProfiles();
    refreshHomeUI();
    showToast('✅ Player updated');
}

/* Advanced Pro Career Profile Modal (With Top 5 Compact Badges) */
function openPlayerDetail(idx) {
    var p = players[idx];
    if (!p) return;
    var c = p.career || {};
    checkAndAwardBadges(p);
    var avg = c.matches ? (c.runs / c.matches).toFixed(1) : '0.0';
    var sr = c.balls ? ((c.runs / c.balls) * 100).toFixed(1) : '0.0';
    var winPct = c.matches ? Math.round(((c.wins || 0) / c.matches) * 100) : 0;
    var econ = c.ballsBowled ? ((c.runsConceded / c.ballsBowled) * 6).toFixed(2) : '0.00';
    var oversBowled = Math.floor((c.ballsBowled || 0) / 6) + '.' + ((c.ballsBowled || 0) % 6);

    var allUnlocked = c.badges || [];
    var topFiveBadges = allUnlocked.slice(-5).reverse();
    var remainingCount = Math.max(0, allUnlocked.length - 5);

    var badgesHtml = topFiveBadges.length ? topFiveBadges.map(function(b) {
        return '<span class="badge gold" style="font-size:8px;padding:3px 7px;margin:2px">' + b + '</span>';
    }).join('') + (remainingCount > 0 ? '<span class="badge dark" style="font-size:8px;padding:3px 7px;margin:2px;cursor:pointer" onclick="closePlayerDetail();showPage(\'trophy\')">+' + remainingCount + ' more →</span>' : '')
    : '<span style="font-size:9px;color:var(--muted)">Play matches to unlock badges!</span>';

    var formArr = (c.form || []).slice(-5);
    var formHtml = formArr.length ? formArr.map(function(f) {
        return '<span class="badge dark" style="font-size:8px;border-color:var(--gold)">' + f + '</span>';
    }).join(' ') : '<span style="font-size:8px;color:var(--muted)">No recent innings</span>';

    document.getElementById('playerDetailContent').innerHTML =
        '<div>' +
        '<div style="display:flex;align-items:center;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">' +
        getAvatarHTML(p, 56, 20) +
        '<div style="flex:1">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<h3 style="margin:0;font-size:17px;color:' + (p.theme || '#f5c542') + '">' + p.name + '</h3>' +
        '<span class="badge gold">WIN ' + winPct + '%</span></div>' +
        '<div style="font-size:9px;color:var(--muted);margin-top:3px">🏟️ Matches: <b>' + (c.matches || 0) + '</b> • 🏆 Wins: <b>' + (c.wins || 0) + '</b> • 🔥 Best Streak: <b>' + (c.maxStreak || 0) + '</b></div>' +
        '<div style="margin-top:5px;display:flex;gap:4px;align-items:center"><span style="font-size:8px;color:var(--muted);font-weight:900">FORM:</span> ' + formHtml + '</div>' +
        '</div></div>' +

        '<div style="font-size:9px;font-weight:900;color:var(--gold);margin:10px 0 5px">🏏 BATTING CAREER ANALYTICS</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">RUNS</div><div style="font-size:13px;font-weight:900">' + (c.runs || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">BEST</div><div style="font-size:13px;font-weight:900;color:var(--gold)">' + (c.best || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">AVG</div><div style="font-size:13px;font-weight:900">' + avg + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">SR</div><div style="font-size:13px;font-weight:900;color:var(--emerald)">' + sr + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">BALLS</div><div style="font-size:12px;font-weight:900">' + (c.balls || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">4s / 6s</div><div style="font-size:12px;font-weight:900">' + (c.fours || 0) + '/' + (c.sixes || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">50s / 100s</div><div style="font-size:12px;font-weight:900">' + (c.fifties || 0) + '/' + (c.hundreds || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">STREAK</div><div style="font-size:12px;font-weight:900;color:#ff9f0a">' + (c.streak || 0) + '🔥</div></div>' +
        '</div>' +

        '<div style="font-size:9px;font-weight:900;color:var(--cyan);margin:10px 0 5px">🎯 BOWLING ATTACK ANALYTICS</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">WICKETS</div><div style="font-size:13px;font-weight:900;color:var(--cyan)">' + (c.wickets || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">OVERS</div><div style="font-size:13px;font-weight:900">' + oversBowled + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">ECONOMY</div><div style="font-size:13px;font-weight:900">' + econ + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">5W HAULS</div><div style="font-size:13px;font-weight:900;color:var(--gold)">' + (c.fiveWicketHauls || 0) + '</div></div>' +
        '</div>' +

        '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--border)">' +
        '<div style="font-size:8px;font-weight:900;color:var(--gold);margin-bottom:4px">🎖️ RECENT 5 BADGES (' + allUnlocked.length + '/' + MASTER_BADGES.length + ' UNLOCKED)</div>' +
        '<div style="display:flex;flex-wrap:wrap">' + badgesHtml + '</div></div>' +
        '<button class="btn light uniform-btn" style="margin-top:10px" onclick="closePlayerDetail()">← CLOSE PROFILE</button>' +
        '</div>';
    document.getElementById('playerDetailModal').classList.add('open');
}
function closePlayerDetail() { document.getElementById('playerDetailModal').classList.remove('open'); }

/* ==========================================================================
   6. INTERACTIVE PLAYER CARDS FOR 1V1, TEAM SQUADS & SOLO FFA
   ========================================================================== */
function updateTeamSetupAura(team, col) {
    if (team === 'A') {
        teamAColor = col;
        var cardA = document.getElementById('teamASetupCard');
        if (cardA) cardA.style.borderColor = col;
        var inpA = document.getElementById('setupTeamAName');
        if (inpA) { inpA.style.borderColor = col; inpA.style.color = col; }
        var listA = document.getElementById('teamAList');
        if (listA) listA.style.borderColor = col;
    } else {
        teamBColor = col;
        var cardB = document.getElementById('teamBSetupCard');
        if (cardB) cardB.style.borderColor = col;
        var inpB = document.getElementById('setupTeamBName');
        if (inpB) { inpB.style.borderColor = col; inpB.style.color = col; }
        var listB = document.getElementById('teamBList');
        if (listB) listB.style.borderColor = col;
    }
}

function previewTeamLogo(team, input) {
    if (input.files && input.files[0]) {
        var r = new FileReader();
        r.onload = function(e) {
            if (team === 'A') teamALogo = e.target.result;
            else teamBLogo = e.target.result;
            showToast('🛡️ Team ' + team + ' Logo Uploaded!');
        };
        r.readAsDataURL(input.files[0]);
    }
}

function toggleSetupMode() {
    var mode = document.getElementById('matchModeSelect').value;
    matchMode = mode;
    document.getElementById('setup1v1Area').style.display = (mode === '1v1') ? 'block' : 'none';
    document.getElementById('setupTeamArea').style.display = (mode === 'team') ? 'block' : 'none';
    document.getElementById('setupFFAArea').style.display = (mode === 'ffa') ? 'block' : 'none';
    populateSetupSelectors();
}

function populateSetupSelectors() {
    if (selected1v1StrikerIdx >= players.length) selected1v1StrikerIdx = 0;
    if (selected1v1BowlerIdx >= players.length) selected1v1BowlerIdx = players.length > 1 ? 1 : 0;
    render1v1CardLists();
    renderMultiSelectLists();
}

/* Interactive 1v1 Player Cards (No Dropdowns!) */
function render1v1CardLists() {
    var sList = document.getElementById('setup1v1StrikerList');
    var bList = document.getElementById('setup1v1BowlerList');
    if (!sList || !bList) return;

    if (!players.length) {
        sList.innerHTML = '<div style="font-size:9px;color:var(--muted);padding:8px;text-align:center">Add players first</div>';
        bList.innerHTML = '<div style="font-size:9px;color:var(--muted);padding:8px;text-align:center">Add players first</div>';
        return;
    }

    sList.innerHTML = players.map(function(p, i) {
        var c = p.career || {};
        var isSel = (i === selected1v1StrikerIdx);
        return '<div class="adv-pick-card p1v1-pick-item ' + (isSel ? 'selected' : '') + '" data-name="' + p.name.toLowerCase() + '" onclick="select1v1PlayerCard(\'striker\',' + i + ')">' +
            '<div style="display:flex;align-items:center;gap:7px;min-width:0">' +
            getAvatarHTML(p, 30, 10) +
            '<div style="min-width:0"><div style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
            '<div style="font-size:8px;color:var(--gold);font-weight:800">🏏' + (c.runs || 0) + 'R • 🎖️' + (c.badges ? c.badges.length : 0) + '</div></div></div>' +
            '<div class="adv-pick-check">✓</div></div>';
    }).join('');

    bList.innerHTML = players.map(function(p, i) {
        var c = p.career || {};
        var isSel = (i === selected1v1BowlerIdx);
        return '<div class="adv-pick-card p1v1-pick-item ' + (isSel ? 'selected-teamA' : '') + '" data-name="' + p.name.toLowerCase() + '" onclick="select1v1PlayerCard(\'bowler\',' + i + ')">' +
            '<div style="display:flex;align-items:center;gap:7px;min-width:0">' +
            getAvatarHTML(p, 30, 10) +
            '<div style="min-width:0"><div style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
            '<div style="font-size:8px;color:var(--cyan);font-weight:800">🎯' + (c.wickets || 0) + 'W • 🎖️' + (c.badges ? c.badges.length : 0) + '</div></div></div>' +
            '<div class="adv-pick-check">✓</div></div>';
    }).join('');

    var b1 = document.getElementById('p1PickedBadge');
    var b2 = document.getElementById('p2PickedBadge');
    if (b1 && players[selected1v1StrikerIdx]) b1.textContent = players[selected1v1StrikerIdx].name;
    if (b2 && players[selected1v1BowlerIdx]) b2.textContent = players[selected1v1BowlerIdx].name;
}

function select1v1PlayerCard(role, idx) {
    if (role === 'striker') {
        selected1v1StrikerIdx = idx;
        if (selected1v1BowlerIdx === idx && players.length > 1) {
            selected1v1BowlerIdx = (idx + 1) % players.length;
        }
    } else {
        selected1v1BowlerIdx = idx;
        if (selected1v1StrikerIdx === idx && players.length > 1) {
            selected1v1StrikerIdx = (idx + 1) % players.length;
        }
    }
    playSFX('dot');
    render1v1CardLists();
}

function buildInteractivePlayerCardHTML(p, i, groupType) {
    var c = p.career || {};
    var inputClass = groupType === 'A' ? 'teamA-cb' : (groupType === 'B' ? 'teamB-cb' : 'ffa-cb');
    var filterClass = (groupType === 'A' || groupType === 'B') ? 'squad-pick-item' : 'ffa-pick-item';
    var activeClass = groupType === 'A' ? 'selected-teamA' : (groupType === 'B' ? 'selected-teamB' : 'selected');

    return '<div class="adv-pick-card ' + filterClass + '" id="pickCard_' + groupType + '_' + i + '" data-name="' + p.name.toLowerCase() + '" onclick="toggleInteractivePickCard(\'' + groupType + '\',' + i + ',\'' + activeClass + '\')">' +
        '<input type="checkbox" class="' + inputClass + '" id="cb_' + groupType + '_' + i + '" value="' + i + '" style="display:none">' +
        '<div style="display:flex;align-items:center;gap:7px;min-width:0">' +
        getAvatarHTML(p, 30, 10) +
        '<div style="min-width:0">' +
        '<div style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
        '<div style="font-size:8px;color:var(--muted);font-weight:800">🏏' + (c.runs || 0) + ' • 🎯' + (c.wickets || 0) + ' • 🎖️' + (c.badges ? c.badges.length : 0) + '</div>' +
        '</div></div>' +
        '<div class="adv-pick-check">✓</div></div>';
}

function toggleInteractivePickCard(groupType, idx, activeClass) {
    var cb = document.getElementById('cb_' + groupType + '_' + idx);
    var card = document.getElementById('pickCard_' + groupType + '_' + idx);
    if (!cb || !card) return;
    cb.checked = !cb.checked;
    card.classList.toggle(activeClass, cb.checked);
    playSFX('dot');
    updateSquadCounts();
}

function renderMultiSelectLists() {
    var listA = document.getElementById('teamAList');
    var listB = document.getElementById('teamBList');
    var listFFA = document.getElementById('ffaPlayersList');
    if (listA && listB) {
        listA.innerHTML = players.map(function(p, i) { return buildInteractivePlayerCardHTML(p, i, 'A'); }).join('');
        listB.innerHTML = players.map(function(p, i) { return buildInteractivePlayerCardHTML(p, i, 'B'); }).join('');
    }
    if (listFFA) {
        listFFA.innerHTML = players.map(function(p, i) { return buildInteractivePlayerCardHTML(p, i, 'FFA'); }).join('');
    }
    updateSquadCounts();
}

function filterSetupPlayerCards(type, query) {
    var q = query.toLowerCase().trim();
    var cls = type === '1v1' ? '.p1v1-pick-item' : (type === 'team' ? '.squad-pick-item' : '.ffa-pick-item');
    document.querySelectorAll(cls).forEach(function(el) {
        var name = el.getAttribute('data-name') || '';
        el.style.display = name.includes(q) ? 'flex' : 'none';
    });
}

function updateSquadCounts() {
    var aCnt = document.querySelectorAll('.teamA-cb:checked').length;
    var bCnt = document.querySelectorAll('.teamB-cb:checked').length;
    var fCnt = document.querySelectorAll('.ffa-cb:checked').length;
    var bA = document.getElementById('teamACountBadge');
    var bB = document.getElementById('teamBCountBadge');
    var bF = document.getElementById('ffaSelectedCountBadge');
    if (bA) bA.textContent = aCnt + ' Picked';
    if (bB) bB.textContent = bCnt + ' Picked';
    if (bF) bF.textContent = fCnt + ' / 11';
}

function refreshHomeUI() {
    var totalHero = document.getElementById('totalMatchesHero');
    if (totalHero) totalHero.textContent = matchHistory.length;
    populateSetupSelectors();
    renderPausedMatches();
    renderMatchHistory();
    refreshPublicHubFeed();
}

/* ==========================================================================
   7. MATCH INITIALIZATION & CUSTOM OVERS
   ========================================================================== */
function createMatchPlayerObj(p) {
    return {
        id: p.id,
        name: p.name,
        avatar: p.avatar || null,
        theme: p.theme || '#f5c542',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        howOut: '',
        oversBowled: 0,
        ballsBowled: 0,
        runsConceded: 0,
        wicketsTaken: 0
    };
}

function startSetupMatch() {
    if (players.length < 2) {
        showToast('⚠️ Add at least 2 players in Players tab first!');
        showPage('profiles');
        return;
    }
    var resolvedOvers = getResolvedOversValue('setupOvers', 'customOversInput');
    if (!resolvedOvers) return showToast('⚠️ Enter a valid custom overs number!');
    maxOvers = resolvedOvers;
    matchMode = document.getElementById('matchModeSelect').value;

    if (matchMode === '1v1') {
        if (selected1v1StrikerIdx === selected1v1BowlerIdx) return showToast('⚠️ Tap two different players for 1v1!');
        var p1 = players[selected1v1StrikerIdx];
        var p2 = players[selected1v1BowlerIdx];
        teamAName = p1.name;
        teamBName = p2.name;
        teamA = [createMatchPlayerObj(p1)];
        teamB = [createMatchPlayerObj(p2)];
    } else if (matchMode === 'team') {
        teamWicketRule = document.getElementById('teamWicketRuleSelect').value;
        teamAName = document.getElementById('setupTeamAName').value.trim() || 'Team A';
        teamBName = document.getElementById('setupTeamBName').value.trim() || 'Team B';
        var aIdxs = Array.from(document.querySelectorAll('.teamA-cb:checked')).map(function(cb) { return parseInt(cb.value); });
        var bIdxs = Array.from(document.querySelectorAll('.teamB-cb:checked')).map(function(cb) { return parseInt(cb.value); });
        if (aIdxs.length < 1 || bIdxs.length < 1) {
            return showToast('⚠️ Tap at least 1 player card per side (Supports 1v2, 1v3, etc.)!');
        }
        teamA = aIdxs.map(function(i) { return createMatchPlayerObj(players[i]); });
        teamB = bIdxs.map(function(i) { return createMatchPlayerObj(players[i]); });
    } else if (matchMode === 'ffa') {
        var fIdxs = Array.from(document.querySelectorAll('.ffa-cb:checked')).map(function(cb) { return parseInt(cb.value); });
        if (fIdxs.length < 3 || fIdxs.length > 11) return showToast('⚠️ Tap 3 to 11 player cards for Solo FFA!');
        ffaPlayers = fIdxs.map(function(i) { return createMatchPlayerObj(players[i]); });
        teamAName = 'Solo Free-For-All';
        teamBName = 'Fielders';
    }

    pendingStartAction = 'new';
    document.getElementById('broadcastModePromptModal').classList.add('open');
}

function closeBroadcastPromptModal() {
    document.getElementById('broadcastModePromptModal').classList.remove('open');
}

function selectPreMatchBroadcastMode(privacy) {
    liveBroadcastPrivacy = privacy;
    closeBroadcastPromptModal();
    var badge = document.getElementById('broadcastPrivacyBadge');
    if (badge) {
        if (privacy === 'public') { badge.textContent = '🌐 PUBLIC LIVE'; badge.style.background = '#00c853'; badge.style.color = '#fff'; }
        else if (privacy === 'private') { badge.textContent = '🔒 PRIVATE QR'; badge.style.background = '#0a84ff'; badge.style.color = '#fff'; }
        else { badge.textContent = '📴 OFFLINE'; badge.style.background = 'rgba(255,255,255,0.12)'; badge.style.color = '#ccc'; }
    }
    if (privacy !== 'offline') startHostingRoom(true);

    if (matchMode === '1v1') {
        initMatchEngine(teamA, teamB, 0, -1, 0);
    } else if (matchMode === 'team') {
        openTeamOpenersModal(teamA, teamB);
    } else if (matchMode === 'ffa') {
        ffaTurnNumber = 0;
        openFFAPickModal();
    }
}

function openTeamOpenersModal(batSq, bowlSq) {
    battingTeam = batSq;
    bowlingTeam = bowlSq;
    var sSel = document.getElementById('openStrikerSelect');
    var nsSel = document.getElementById('openNonStrikerSelect');
    var bSel = document.getElementById('openBowlerSelect');
    sSel.innerHTML = batSq.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
    if (batSq.length === 1) {
        nsSel.innerHTML = '<option value="-1" selected>Solo Batter (1-Man Team)</option>';
    } else {
        nsSel.innerHTML = '<option value="-1">None (Solo Batter)</option>' + batSq.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
        nsSel.value = '1';
    }
    bSel.innerHTML = bowlSq.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
    document.getElementById('teamOpenersModal').classList.add('open');
}

function closeTeamOpenersModal() {
    document.getElementById('teamOpenersModal').classList.remove('open');
}

function syncNonStrikerDropdown() {
    var sIdx = document.getElementById('openStrikerSelect').value;
    var nsSel = document.getElementById('openNonStrikerSelect');
    if (battingTeam.length <= 1) {
        nsSel.value = '-1';
        return;
    }
    if (nsSel.value === sIdx) {
        nsSel.value = (sIdx === '0') ? '1' : '0';
    }
}

function confirmTeamOpeners() {
    var sIdx = parseInt(document.getElementById('openStrikerSelect').value);
    var nsIdx = parseInt(document.getElementById('openNonStrikerSelect').value);
    var bIdx = parseInt(document.getElementById('openBowlerSelect').value);
    if (sIdx === nsIdx && nsIdx !== -1) return showToast('⚠️ Striker & Non-Striker cannot be same!');
    closeTeamOpenersModal();
    if (!isSecondInnings) {
        initMatchEngine(battingTeam, bowlingTeam, sIdx, nsIdx, bIdx);
    } else {
        cur = sIdx;
        nonStriker = nsIdx;
        curBowler = bIdx;
        updateMatchUI();
    }
}

function openFFAPickModal() {
    var choices = document.getElementById('ffaBatterChoices');
    var bSel = document.getElementById('ffaBowlerSelect');
    ffaPickedBatterTemp = -1;
    choices.innerHTML = ffaPlayers.map(function(p, i) {
        if (p.out) return '';
        return '<div class="adv-pick-card" id="ffaChoice_' + i + '" onclick="selectFFABatterCard(' + i + ')">' +
            '<div style="display:flex;align-items:center;gap:8px">' + getAvatarHTML(p, 30, 10) +
            '<div><div style="font-size:11px;font-weight:900">' + p.name + '</div><div style="font-size:8px;color:var(--muted)">Ready to Bat</div></div></div>' +
            '<span class="badge gold">TAP TO BAT</span></div>';
    }).join('');
    bSel.innerHTML = ffaPlayers.map(function(p, i) {
        return '<option value="' + i + '">' + p.name + '</option>';
    }).join('');
    document.getElementById('ffaPickModal').classList.add('open');
}

function closeFFAPickModal() {
    document.getElementById('ffaPickModal').classList.remove('open');
}

function selectFFABatterCard(idx) {
    ffaPickedBatterTemp = idx;
    ffaPlayers.forEach(function(_, i) {
        var el = document.getElementById('ffaChoice_' + i);
        if (el) el.classList.toggle('selected', i === idx);
    });
    var bSel = document.getElementById('ffaBowlerSelect');
    if (bSel && parseInt(bSel.value) === idx) {
        bSel.selectedIndex = (idx + 1) % ffaPlayers.length;
    }
}

function confirmFFANextTurn() {
    if (ffaPickedBatterTemp < 0) return showToast('⚠️ Tap a batter card first!');
    var bIdx = parseInt(document.getElementById('ffaBowlerSelect').value);
    if (bIdx === ffaPickedBatterTemp) return showToast('⚠️ Batter cannot bowl to themselves!');
    closeFFAPickModal();
    ffaCurrentBatterIdx = ffaPickedBatterTemp;
    if (ffaTurnNumber === 0) {
        initMatchEngine(ffaPlayers, ffaPlayers, ffaCurrentBatterIdx, -1, bIdx);
    } else {
        cur = ffaCurrentBatterIdx;
        curBowler = bIdx;
        currOver = [];
        overRuns = 0;
        overWktsCount = 0;
        partnershipRuns = 0;
        partnershipBalls = 0;
        updateMatchUI();
    }
    ffaTurnNumber++;
}

function initMatchEngine(batSq, bowlSq, strikerIdx, nonStrikerIdx, bowlerIdx) {
    battingTeam = batSq;
    bowlingTeam = bowlSq;
    cur = strikerIdx;
    nonStriker = nonStrikerIdx;
    curBowler = bowlerIdx;
    currOver = [];
    allBalls = [];
    overByOver = [];
    overWickets = [];
    fowList = [];
    partnershipRuns = 0;
    partnershipBalls = 0;
    innings1 = null;
    isSecondInnings = false;
    targetToWin = 0;
    isFreeHit = false;
    wicketsDown = 0;
    overRuns = 0;
    overWktsCount = 0;
    widesCount = 0;
    noBallsCount = 0;
    undoStack = [];
    matchActive = true;
    activePausedMatchId = null;

    showPage('match');
    updateMatchUI();
    speakCommentary(pickRandomCommentary('start'));
}

/* ==========================================================================
   8. LIVE SCORING ENGINE (DYNAMIC COMMENTARY WITHOUT PLAYER NAMES)
   ========================================================================== */
function getTotalRuns() {
    return battingTeam.reduce(function(sum, p) { return sum + (p.runs || 0); }, 0) + widesCount + noBallsCount;
}

function getLegalBallsCount() {
    return allBalls.filter(function(b) { return b.legal; }).length;
}

function formatOvers(balls) {
    return Math.floor(balls / 6) + '.' + (balls % 6);
}

function pushUndoSnapshot() {
    undoStack.push(JSON.stringify({
        battingTeam: battingTeam,
        bowlingTeam: bowlingTeam,
        cur: cur,
        nonStriker: nonStriker,
        curBowler: curBowler,
        currOver: currOver,
        allBalls: allBalls,
        overByOver: overByOver,
        overWickets: overWickets,
        fowList: fowList,
        partnershipRuns: partnershipRuns,
        partnershipBalls: partnershipBalls,
        wicketsDown: wicketsDown,
        isFreeHit: isFreeHit,
        overRuns: overRuns,
        overWktsCount: overWktsCount,
        widesCount: widesCount,
        noBallsCount: noBallsCount
    }));
    if (undoStack.length > 25) undoStack.shift();
}

function undo() {
    if (!undoStack.length) return showToast('⚠️ Nothing to undo!');
    var snap = JSON.parse(undoStack.pop());
    battingTeam = snap.battingTeam;
    bowlingTeam = snap.bowlingTeam;
    cur = snap.cur;
    nonStriker = snap.nonStriker;
    curBowler = snap.curBowler;
    currOver = snap.currOver;
    allBalls = snap.allBalls;
    overByOver = snap.overByOver;
    overWickets = snap.overWickets;
    fowList = snap.fowList;
    partnershipRuns = snap.partnershipRuns;
    partnershipBalls = snap.partnershipBalls;
    wicketsDown = snap.wicketsDown;
    isFreeHit = snap.isFreeHit;
    overRuns = snap.overRuns;
    overWktsCount = snap.overWktsCount;
    widesCount = snap.widesCount;
    noBallsCount = snap.noBallsCount;
    updateMatchUI();
    showToast('↩️ Last ball undone');
}

function score(runs) {
    if (!matchActive) return;
    pushUndoSnapshot();

    var batter = battingTeam[cur];
    var bowler = bowlingTeam[curBowler];

    batter.runs += runs;
    batter.balls += 1;
    if (runs === 4) batter.fours += 1;
    if (runs === 6) batter.sixes += 1;

    bowler.ballsBowled += 1;
    bowler.runsConceded += runs;
    partnershipRuns += runs;
    partnershipBalls += 1;
    overRuns += runs;
    isFreeHit = false;

    var label = runs === 0 ? '•' : String(runs);
    currOver.push(label);
    allBalls.push({ label: label, runs: runs, legal: true, wicket: false, batter: batter.name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });

    if (runs === 4) {
        playSFX('four');
        speakCommentary(pickRandomCommentary('four'));
    } else if (runs === 6) {
        playSFX('six');
        triggerImpactEffect('six');
        speakCommentary(pickRandomCommentary('six'));
    } else if (runs === 0) {
        playSFX('dot');
        speakCommentary(pickRandomCommentary('dot'));
    } else if (runs === 1) {
        playSFX('dot');
        speakCommentary(pickRandomCommentary('one'));
    } else if (runs === 2) {
        playSFX('dot');
        speakCommentary(pickRandomCommentary('two'));
    } else {
        playSFX('dot');
        speakCommentary(pickRandomCommentary('three'));
    }

    if (runs % 2 === 1 && nonStriker !== -1) {
        swapStrikeInternal();
    }

    checkPostBallProgress();
}

function extraWd() {
    if (!matchActive) return;
    pushUndoSnapshot();
    var bowler = bowlingTeam[curBowler];
    widesCount += 1;
    bowler.runsConceded += 1;
    partnershipRuns += 1;
    overRuns += 1;
    currOver.push('WD');
    allBalls.push({ label: 'WD', runs: 1, legal: false, wicket: false, batter: battingTeam[cur].name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });
    playSFX('dot');
    speakCommentary(pickRandomCommentary('wd'));
    checkPostBallProgress(true);
}

function extraNoBall() {
    if (!matchActive) return;
    pushUndoSnapshot();
    var bowler = bowlingTeam[curBowler];
    noBallsCount += 1;
    bowler.runsConceded += 1;
    partnershipRuns += 1;
    overRuns += 1;
    isFreeHit = true;
    currOver.push('NB');
    allBalls.push({ label: 'NB', runs: 1, legal: false, wicket: false, batter: battingTeam[cur].name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });
    playSFX('four');
    speakCommentary(pickRandomCommentary('nb'));
    checkPostBallProgress(true);
}

function outPlayer() {
    if (!matchActive) return;
    document.getElementById('wicketModal').classList.add('open');
}
function closeWicketModal() { document.getElementById('wicketModal').classList.remove('open'); }
function closeNextBatterModal() { document.getElementById('nextBatterModal').classList.remove('open'); }

function confirmWicket(howOut) {
    closeWicketModal();
    if (isFreeHit && howOut !== 'Run Out') {
        showToast('🚫 FREE HIT! Batter is NOT OUT (' + howOut + ')!');
        score(0);
        return;
    }
    pushUndoSnapshot();

    var batter = battingTeam[cur];
    var bowler = bowlingTeam[curBowler];
    batter.balls += 1;
    batter.out = true;
    batter.howOut = howOut + (howOut !== 'Run Out' ? ' b ' + bowler.name : '');

    bowler.ballsBowled += 1;
    if (howOut !== 'Run Out') bowler.wicketsTaken += 1;

    wicketsDown += 1;
    overWktsCount += 1;
    isFreeHit = false;
    fowList.push(getTotalRuns() + '/' + wicketsDown + ' (' + batter.name + ')');

    currOver.push('W');
    allBalls.push({ label: 'W', runs: 0, legal: true, wicket: true, batter: batter.name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });

    playSFX('wicket');
    speakCommentary(pickRandomCommentary('wicket'));

    if (matchMode === 'ffa') {
        var remainingFFA = ffaPlayers.filter(function(p) { return !p.out; });
        if (remainingFFA.length === 0) {
            finishFFAMatch();
            return;
        }
        updateMatchUI();
        openFFAPickModal();
        return;
    }

    var maxWkts = (battingTeam.length === 1) ? 1 : (teamWicketRule === 'standard' ? Math.max(1, battingTeam.length - 1) : battingTeam.length);
    if (wicketsDown >= maxWkts) {
        updateMatchUI();
        endCurrentInnings();
        return;
    }

    var unbatted = battingTeam.map(function(p, i) { return (!p.out && i !== cur && i !== nonStriker) ? i : -1; }).filter(function(i) { return i !== -1; });
    if (unbatted.length > 0) {
        var list = document.getElementById('nextBatterList');
        list.innerHTML = unbatted.map(function(idx) {
            return '<button class="btn light uniform-btn" style="justify-content:space-between" onclick="selectNextBatter(' + idx + ')"><span>🏏 ' + battingTeam[idx].name + '</span><span style="font-size:9px;color:var(--gold)">SEND IN</span></button>';
        }).join('');
        document.getElementById('nextBatterModal').classList.add('open');
    } else if (nonStriker !== -1 && !battingTeam[nonStriker].out) {
        cur = nonStriker;
        nonStriker = -1;
        showToast('🔥 Solo Last Man Stands: ' + battingTeam[cur].name);
        checkPostBallProgress();
    } else {
        endCurrentInnings();
    }
}

function selectNextBatter(idx) {
    closeNextBatterModal();
    cur = idx;
    partnershipRuns = 0;
    partnershipBalls = 0;
    checkPostBallProgress();
}

function swapStrikeInternal() {
    if (nonStriker === -1) return;
    var tmp = cur;
    cur = nonStriker;
    nonStriker = tmp;
}

function switchStrikeBtn() {
    if (nonStriker === -1) return showToast('⚠️ Solo batter at crease');
    swapStrikeInternal();
    updateMatchUI();
    showToast('🔄 Strike rotated');
}

function quickSwapRoles() {
    if (matchMode !== '1v1') return;
    endCurrentInnings();
}

function checkPostBallProgress(isExtra) {
    var totalRuns = getTotalRuns();
    var legalBalls = getLegalBallsCount();

    if (isSecondInnings && totalRuns >= targetToWin) {
        updateMatchUI();
        finishFullMatch();
        return;
    }

    if (!isExtra && legalBalls > 0 && legalBalls % 6 === 0) {
        overByOver.push(overRuns);
        overWickets.push(overWktsCount);
        swapStrikeInternal();

        var overNum = Math.floor(legalBalls / 6);
        if (overNum >= maxOvers) {
            updateMatchUI();
            if (matchMode === 'ffa') finishFFAMatch();
            else endCurrentInnings();
            return;
        }

        document.getElementById('overSummaryTitle').textContent = 'END OF OVER ' + overNum;
        document.getElementById('overSummaryBalls').innerHTML = currOver.map(function(b) {
            return '<span class="badge dark" style="font-size:11px;padding:5px 9px">' + b + '</span>';
        }).join('');
        document.getElementById('overSummaryRuns').textContent = overRuns + ' Runs • ' + overWktsCount + ' Wickets';
        document.getElementById('overSummaryModal').classList.add('open');

        currOver = [];
        overRuns = 0;
        overWktsCount = 0;
    }

    updateMatchUI();
    if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate();
}

function closeOverSummary() {
    document.getElementById('overSummaryModal').classList.remove('open');
    if (bowlingTeam.length > 1) openChangeBowler();
}

function openChangeBowler() {
    var list = document.getElementById('nextBowlerList');
    list.innerHTML = bowlingTeam.map(function(b, i) {
        if (matchMode === 'ffa' && i === cur) return '';
        return '<button class="btn light uniform-btn" style="justify-content:space-between" onclick="selectBowler(' + i + ')"><span>🎯 ' + b.name + '</span><span style="font-size:9px">' + b.wicketsTaken + '-' + b.runsConceded + '</span></button>';
    }).join('');
    document.getElementById('changeBowlerModal').classList.add('open');
}
function closeChangeBowler() { document.getElementById('changeBowlerModal').classList.remove('open'); }
function selectBowler(idx) {
    curBowler = idx;
    closeChangeBowler();
    updateMatchUI();
    showToast('🎯 New bowler into the attack');
}
function quickNextBowler() {
    if (bowlingTeam.length <= 1) return showToast('⚠️ Only 1 bowler in squad');
    curBowler = (curBowler + 1) % bowlingTeam.length;
    if (matchMode === 'ffa' && curBowler === cur) curBowler = (curBowler + 1) % bowlingTeam.length;
    updateMatchUI();
    showToast('🎯 Bowler rotated');
}

function endCurrentInnings() {
    if (!isSecondInnings) {
        var inn1History = overByOver.slice();
        if (overRuns > 0 || (getLegalBallsCount() % 6 !== 0)) inn1History.push(overRuns);
        var inn1WktHist = overWickets.slice();
        if (overWktsCount > 0 || (getLegalBallsCount() % 6 !== 0)) inn1WktHist.push(overWktsCount);

        innings1 = {
            teamName: teamAName,
            runs: getTotalRuns(),
            wickets: wicketsDown,
            overs: formatOvers(getLegalBallsCount()),
            extras: (widesCount + noBallsCount),
            fow: fowList.slice(),
            batting: JSON.parse(JSON.stringify(battingTeam)),
            bowling: JSON.parse(JSON.stringify(bowlingTeam)),
            overByOver: inn1History,
            overWickets: inn1WktHist
        };
        targetToWin = innings1.runs + 1;
        isSecondInnings = true;
        wicketsDown = 0;
        currOver = [];
        allBalls = [];
        overByOver = [];
        overWickets = [];
        fowList = [];
        partnershipRuns = 0;
        partnershipBalls = 0;
        overRuns = 0;
        overWktsCount = 0;
        widesCount = 0;
        noBallsCount = 0;
        isFreeHit = false;
        undoStack = [];

        showToast('🏏 Innings Break! Target: ' + targetToWin);
        speakCommentary(pickRandomCommentary('inningsBreak'));

        if (matchMode === '1v1') {
            var tmpA = teamA;
            teamA = teamB;
            teamB = tmpA;
            battingTeam = teamA;
            bowlingTeam = teamB;
            cur = 0;
            nonStriker = -1;
            curBowler = 0;
            updateMatchUI();
        } else {
            openTeamOpenersModal(teamB, teamA);
        }
    } else {
        finishFullMatch();
    }
}

/* Calculates MVP of the Match */
function computeMatchMVP(rec) {
    var map = {};
    function addPerf(list, isBat) {
        (list || []).forEach(function(p) {
            if (!map[p.name]) map[p.name] = { name: p.name, avatar: p.avatar, theme: p.theme, runs: 0, balls: 0, wkts: 0, rc: 0, pts: 0 };
            if (isBat) {
                map[p.name].runs += (p.runs || 0);
                map[p.name].balls += (p.balls || 0);
                map[p.name].pts += (p.runs || 0) + ((p.fours || 0) * 2) + ((p.sixes || 0) * 4);
            } else {
                map[p.name].wkts += (p.wicketsTaken || 0);
                map[p.name].rc += (p.runsConceded || 0);
                map[p.name].pts += ((p.wicketsTaken || 0) * 22);
            }
        });
    }
    if (rec.inn1Data) { addPerf(rec.inn1Data.batting, true); addPerf(rec.inn1Data.bowling, false); }
    if (rec.inn2Data) { addPerf(rec.inn2Data.batting, true); addPerf(rec.inn2Data.bowling, false); }
    var arr = Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return b.pts - a.pts; });
    return arr[0] || { name: rec.teamA, runs: 0, balls: 0, wkts: 0, pts: 0 };
}

function finishFullMatch() {
    matchActive = false;
    var inn2Runs = getTotalRuns();
    var inn2OversStr = formatOvers(getLegalBallsCount());
    var winner = 'Match Tied';
    var marginText = 'Scores Level';

    if (inn2Runs >= targetToWin) {
        winner = teamBName + ' Won';
        var wktsLeft = Math.max(1, battingTeam.length - wicketsDown);
        marginText = teamBName + ' won by ' + wktsLeft + ' wicket' + (wktsLeft > 1 ? 's' : '');
    } else if (inn2Runs < innings1.runs) {
        winner = teamAName + ' Won';
        var runDiff = innings1.runs - inn2Runs;
        marginText = teamAName + ' won by ' + runDiff + ' run' + (runDiff > 1 ? 's' : '');
    }

    var inn2History = overByOver.slice();
    if (overRuns > 0 || (getLegalBallsCount() % 6 !== 0)) inn2History.push(overRuns);

    var record = {
        id: 'm_' + Date.now(),
        date: new Date().toLocaleDateString(),
        mode: matchMode,
        privacy: liveBroadcastPrivacy,
        teamA: teamAName,
        teamB: teamBName,
        inn1Score: innings1.runs + '/' + innings1.wickets + ' (' + innings1.overs + ')',
        inn2Score: inn2Runs + '/' + wicketsDown + ' (' + inn2OversStr + ')',
        winner: winner,
        margin: marginText,
        inn1Data: innings1,
        inn2Data: {
            teamName: teamBName,
            runs: inn2Runs,
            wickets: wicketsDown,
            overs: inn2OversStr,
            extras: (widesCount + noBallsCount),
            fow: fowList.slice(),
            batting: JSON.parse(JSON.stringify(battingTeam)),
            bowling: JSON.parse(JSON.stringify(bowlingTeam)),
            overByOver: inn2History
        }
    };
    record.mvp = computeMatchMVP(record);

    matchHistory.unshift(record);
    applyMatchCareerDelta(record, 1);

    if (database && liveBroadcastPrivacy === 'public') {
        try {
            database.ref('public_finished_matches').push(record);
            if (hostRoomCode) database.ref('live_rooms/' + hostRoomCode).remove();
        } catch (e) {}
    }

    saveAll();
    triggerImpactEffect('win');
    speakCommentary(pickRandomCommentary('finish'));
    showPage('home');
    openPostMatchSummaryModal(0);
}

/* Post-Match Grand Celebration & MVP Summary Modal */
function openPostMatchSummaryModal(idx) {
    var m = matchHistory[idx];
    if (!m) return;
    var mvp = m.mvp || computeMatchMVP(m);
    document.getElementById('postMatchSummaryBody').innerHTML =
        '<div style="text-align:center">' +
        '<div style="font-size:34px">🏆</div>' +
        '<div style="font-size:10px;font-weight:900;color:var(--gold);letter-spacing:1px">OFFICIAL BROADCAST RESULT</div>' +
        '<h2 style="margin:4px 0;font-size:20px;color:#00e676">' + m.winner.toUpperCase() + '</h2>' +
        '<div style="font-size:10px;color:var(--muted);margin-bottom:12px">' + (m.margin || '') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
        '<div class="glass" style="margin:0;padding:10px;border-color:var(--gold)"><div style="font-size:9px;color:var(--muted);font-weight:900">' + m.teamA + '</div><div style="font-size:16px;font-weight:900;margin-top:2px">' + m.inn1Score + '</div></div>' +
        '<div class="glass" style="margin:0;padding:10px;border-color:var(--cyan)"><div style="font-size:9px;color:var(--muted);font-weight:900">' + m.teamB + '</div><div style="font-size:16px;font-weight:900;margin-top:2px">' + m.inn2Score + '</div></div>' +
        '</div>' +
        '<div class="glass" style="margin:0 0 12px;padding:10px;border:1.5px solid var(--gold);display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center;gap:10px">' + getAvatarHTML(mvp, 42, 14) +
        '<div style="text-align:left"><div style="font-size:8px;font-weight:900;color:var(--gold)">🏅 PLAYER OF THE MATCH (MVP)</div>' +
        '<div style="font-size:14px;font-weight:900">' + mvp.name + '</div>' +
        '<div style="font-size:9px;color:var(--muted)">Runs: ' + mvp.runs + '(' + mvp.balls + ') • Wkts: ' + mvp.wkts + '</div></div></div>' +
        '<div style="font-size:16px;font-weight:900;color:var(--gold)">' + mvp.pts + ' PTS</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<button class="btn light uniform-btn" onclick="closePostMatchSummaryModal();openScorecardModal(' + idx + ')">📋 FULL SCORECARD</button>' +
        '<button class="btn gold uniform-btn" onclick="closePostMatchSummaryModal();openCertificateModal(' + idx + ')">📜 CERTIFICATE</button>' +
        '</div>' +
        '<button class="btn dark uniform-btn" style="margin-top:8px" onclick="closePostMatchSummaryModal()">✓ CONTINUE TO HOME</button>' +
        '</div>';
    document.getElementById('postMatchSummaryModal').classList.add('open');
}
function closePostMatchSummaryModal() {
    document.getElementById('postMatchSummaryModal').classList.remove('open');
}

function finishFFAMatch() {
    matchActive = false;
    var sorted = ffaPlayers.slice().sort(function(a, b) { return b.runs - a.runs; });
    var winner = sorted[0] ? sorted[0].name + ' Won (Solo FFA)' : 'Completed';
    var rec = {
        id: 'm_' + Date.now(),
        date: new Date().toLocaleDateString(),
        mode: 'ffa',
        privacy: liveBroadcastPrivacy,
        teamA: 'Solo Free-For-All',
        teamB: sorted.length + ' Players',
        inn1Score: 'Top: ' + (sorted[0] ? sorted[0].runs : 0) + ' runs',
        inn2Score: '',
        winner: winner,
        ffaData: JSON.parse(JSON.stringify(sorted))
    };
    matchHistory.unshift(rec);
    if (database && liveBroadcastPrivacy === 'public') {
        try { database.ref('public_finished_matches').push(rec); } catch (e) {}
    }
    saveAll();
    document.getElementById('ffaPodiumDisplay').innerHTML = sorted.slice(0, 3).map(function(p, i) {
        return '<div class="stat-pill" style="margin-bottom:4px"><b>#' + (i + 1) + ' ' + p.name + '</b> — ' + p.runs + ' (' + p.balls + ')</div>';
    }).join('');
    document.getElementById('ffaFullRankingTable').innerHTML = sorted.map(function(p, i) {
        return '<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid var(--border);font-size:11px"><span>#' + (i + 1) + ' ' + p.name + '</span><b>' + p.runs + ' runs (' + p.wicketsTaken + ' wkts)</b></div>';
    }).join('');
    document.getElementById('ffaPodiumModal').classList.add('open');
    showPage('home');
}
function closeFFAPodium() { document.getElementById('ffaPodiumModal').classList.remove('open'); }

/* ==========================================================================
   9. CAREER STATS DELTA ENGINE (ADD ON FINISH / SUBTRACT ON SINGLE DELETE)
   ========================================================================== */
function applyMatchCareerDelta(rec, sign) {
    players.forEach(function(pl) {
        var foundBat = null, foundBowl = null;
        if (rec.inn1Data && rec.inn2Data) {
            foundBat = rec.inn1Data.batting.find(function(x) { return x.id === pl.id || x.name === pl.name; }) ||
                       rec.inn2Data.batting.find(function(x) { return x.id === pl.id || x.name === pl.name; });
            foundBowl = rec.inn1Data.bowling.find(function(x) { return x.id === pl.id || x.name === pl.name; }) ||
                        rec.inn2Data.bowling.find(function(x) { return x.id === pl.id || x.name === pl.name; });
        }
        if (foundBat || foundBowl) {
            pl.career.matches = Math.max(0, (pl.career.matches || 0) + (1 * sign));
            if (foundBat) {
                pl.career.runs = Math.max(0, (pl.career.runs || 0) + (foundBat.runs * sign));
                pl.career.balls = Math.max(0, (pl.career.balls || 0) + (foundBat.balls * sign));
                pl.career.fours = Math.max(0, (pl.career.fours || 0) + (foundBat.fours * sign));
                pl.career.sixes = Math.max(0, (pl.career.sixes || 0) + (foundBat.sixes * sign));
                if (sign > 0 && foundBat.runs > (pl.career.best || 0)) pl.career.best = foundBat.runs;
                if (foundBat.runs >= 50 && foundBat.runs < 100) pl.career.fifties = Math.max(0, (pl.career.fifties || 0) + (1 * sign));
                if (foundBat.runs >= 100) pl.career.hundreds = Math.max(0, (pl.career.hundreds || 0) + (1 * sign));
                if (sign > 0 && foundBat.sixes >= 6) pl.career.sixBlitz = true;
                if (!pl.career.form) pl.career.form = [];
                if (sign > 0) pl.career.form.push(foundBat.runs + '(' + foundBat.balls + ')');
                else pl.career.form.pop();
            }
            if (foundBowl) {
                pl.career.wickets = Math.max(0, (pl.career.wickets || 0) + (foundBowl.wicketsTaken * sign));
                pl.career.ballsBowled = Math.max(0, (pl.career.ballsBowled || 0) + (foundBowl.ballsBowled * sign));
                pl.career.runsConceded = Math.max(0, (pl.career.runsConceded || 0) + (foundBowl.runsConceded * sign));
                if (foundBowl.wicketsTaken >= 5) pl.career.fiveWicketHauls = Math.max(0, (pl.career.fiveWicketHauls || 0) + (1 * sign));
            }
            if (rec.winner && rec.winner.includes(pl.name)) {
                pl.career.wins = Math.max(0, (pl.career.wins || 0) + (1 * sign));
                if (sign > 0) {
                    pl.career.streak = (pl.career.streak || 0) + 1;
                    if (pl.career.streak > (pl.career.maxStreak || 0)) pl.career.maxStreak = pl.career.streak;
                }
            } else if (sign > 0) {
                pl.career.streak = 0;
            }
            checkAndAwardBadges(pl);
        }
    });
}

/* ==========================================================================
   10. UPDATE LIVE MATCH UI & WORKING WORM/MANHATTAN CHARTS
   ========================================================================== */
function updateMatchUI() {
    var totalRuns = getTotalRuns();
    var legalBalls = getLegalBallsCount();
    var oversStr = formatOvers(legalBalls);

    document.getElementById('liveBattingTeamLabel').textContent = isSecondInnings ? teamBName : teamAName;
    document.getElementById('projectedText').textContent = totalRuns + '/' + wicketsDown;
    document.getElementById('overText').textContent = oversStr;
    document.getElementById('maxOverText').textContent = maxOvers === 999 ? '∞' : maxOvers;
    document.getElementById('wicketText').textContent = wicketsDown;
    document.getElementById('extrasCounterBadge').textContent = 'EXTRAS: ' + (widesCount + noBallsCount) + ' (WD:' + widesCount + ' | NB:' + noBallsCount + ')';
    document.getElementById('freeHitBadge').style.display = isFreeHit ? 'inline-block' : 'none';

    var crr = legalBalls > 0 ? ((totalRuns / legalBalls) * 6).toFixed(2) : '0.00';
    document.getElementById('rrText').textContent = 'CRR: ' + crr;

    var infoBox = document.getElementById('inningsInfo');
    if (isSecondInnings) {
        var needed = Math.max(0, targetToWin - totalRuns);
        var remBalls = Math.max(0, (maxOvers * 6) - legalBalls);
        var rrr = remBalls > 0 ? ((needed / remBalls) * 6).toFixed(2) : '0.00';
        document.getElementById('rrLabel').textContent = 'RRR';
        document.getElementById('reqRRText').textContent = rrr;
        infoBox.style.display = 'block';
        infoBox.textContent = '🎯 TARGET: ' + targetToWin + ' • Need ' + needed + ' runs in ' + remBalls + ' balls';
    } else {
        var proj = maxOvers !== 999 ? Math.round((legalBalls > 0 ? (totalRuns / legalBalls) * 6 : 6) * maxOvers) : totalRuns;
        document.getElementById('rrLabel').textContent = 'PROJ';
        document.getElementById('reqRRText').textContent = proj;
        infoBox.style.display = 'none';
    }

    var b1 = battingTeam[cur];
    if (b1) {
        document.getElementById('batterName').textContent = b1.name + ' *';
        document.getElementById('batterStats').textContent = b1.runs + '(' + b1.balls + ')  •  4s:' + b1.fours + '  6s:' + b1.sixes;
        document.getElementById('photoAvatar').innerHTML = b1.avatar ? '<img src="' + b1.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : b1.name.substring(0, 2).toUpperCase();
    }

    var nsRow = document.getElementById('nonStrikerRow');
    var lastManBadge = document.getElementById('lastManBadge');
    if (nonStriker !== -1 && battingTeam[nonStriker]) {
        var b2 = battingTeam[nonStriker];
        nsRow.style.display = 'flex';
        lastManBadge.style.display = 'none';
        document.getElementById('nsName').textContent = b2.name;
        document.getElementById('nsStats').textContent = b2.runs + '(' + b2.balls + ')';
        document.getElementById('photoAvatarNS').innerHTML = b2.avatar ? '<img src="' + b2.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : b2.name.substring(0, 2).toUpperCase();
    } else {
        nsRow.style.display = 'none';
        lastManBadge.style.display = 'inline-block';
    }

    document.getElementById('partnershipBadge').textContent = 'Stand: ' + partnershipRuns + '(' + partnershipBalls + ')';

    var bw = bowlingTeam[curBowler];
    if (bw) {
        document.getElementById('bowlerName').textContent = bw.name;
        document.getElementById('bowlerStats').textContent = bw.wicketsTaken + '-' + bw.runsConceded + ' (' + formatOvers(bw.ballsBowled) + ' ov)';
        document.getElementById('bowlerAvatar').innerHTML = bw.avatar ? '<img src="' + bw.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : bw.name.substring(0, 2).toUpperCase();
    }

    var dotsEl = document.getElementById('currentOverDots');
    dotsEl.innerHTML = currOver.map(function(d) {
        var bg = d === 'W' ? '#ff2d55' : (d === '4' || d === '6' ? 'var(--gold)' : 'var(--pill-bg)');
        var col = (d === '4' || d === '6') ? '#111' : '#fff';
        return '<span style="min-width:26px;height:26px;border-radius:50%;background:' + bg + ';color:' + col + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">' + d + '</span>';
    }).join('');

    renderBallTimelineFeed();
}

/* Fully Working Live Worm & Manhattan Over-by-Over Charts */
function openLiveGraphsModal() {
    document.getElementById('liveGraphsModal').classList.add('open');

    // Include completed overs + current live partial over!
    var curOversArr = overByOver.slice();
    var curWktsArr = overWickets.slice();
    if (currOver.length > 0) {
        curOversArr.push(overRuns);
        curWktsArr.push(overWktsCount);
    }

    var inn1Overs = (isSecondInnings && innings1 && innings1.overByOver) ? innings1.overByOver : curOversArr;
    var inn2Overs = isSecondInnings ? curOversArr : [];

    // 1. Draw Worm Chart
    var wormCanvas = document.getElementById('liveWormCanvas');
    if (wormCanvas) {
        var ctx = wormCanvas.getContext('2d');
        var W = wormCanvas.width, H = wormCanvas.height;
        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (var g = 1; g <= 3; g++) {
            var gy = (H / 4) * g;
            ctx.beginPath(); ctx.moveTo(28, gy); ctx.lineTo(W - 10, gy); ctx.stroke();
        }

        var maxLen = Math.max(inn1Overs.length, inn2Overs.length, 5);
        var sum1 = inn1Overs.reduce(function(a, b) { return a + b; }, 0);
        var sum2 = inn2Overs.reduce(function(a, b) { return a + b; }, 0);
        var maxY = Math.max(sum1, sum2, 20);

        function drawWormLine(arr, wktArr, color) {
            if (!arr.length) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(28, H - 18);
            var cum = 0;
            var pts = [];
            arr.forEach(function(r, idx) {
                cum += r;
                var x = 28 + ((idx + 1) / maxLen) * (W - 42);
                var y = (H - 18) - (cum / maxY) * (H - 36);
                ctx.lineTo(x, y);
                pts.push({ x: x, y: y, wkts: wktArr ? wktArr[idx] : 0, cum: cum });
            });
            ctx.stroke();

            pts.forEach(function(pt) {
                ctx.fillStyle = pt.wkts > 0 ? '#ff2d55' : color;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.wkts > 0 ? 5 : 3.5, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        drawWormLine(inn1Overs, isSecondInnings && innings1 ? innings1.overWickets : curWktsArr, '#f5c542');
        if (isSecondInnings) drawWormLine(inn2Overs, curWktsArr, '#0a84ff');

        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.fillText(maxY + 'R', 2, 16);
        ctx.fillText('0R', 6, H - 14);
    }

    // 2. Draw Manhattan Bar Chart
    var barCanvas = document.getElementById('liveRunBarCanvas');
    if (barCanvas) {
        var bctx = barCanvas.getContext('2d');
        var BW = barCanvas.width, BH = barCanvas.height;
        bctx.clearRect(0, 0, BW, BH);

        var activeBars = curOversArr.length ? curOversArr : [0];
        var maxBarRun = Math.max.apply(null, activeBars.concat([12]));
        var barStep = (BW - 36) / Math.max(activeBars.length, 6);
        var barW = Math.min(24, barStep * 0.65);

        activeBars.forEach(function(r, i) {
            var bh = (r / maxBarRun) * (BH - 34);
            var bx = 24 + i * barStep + 4;
            var by = (BH - 18) - bh;
            bctx.fillStyle = r >= 12 ? '#f5c542' : '#0a84ff';
            bctx.fillRect(bx, by, barW, Math.max(2, bh));

            bctx.fillStyle = '#fff';
            bctx.font = 'bold 9px Outfit, sans-serif';
            bctx.fillText(String(r), bx + 2, by - 4);
            bctx.fillStyle = '#888';
            bctx.fillText('O' + (i + 1), bx + 2, BH - 5);
        });
    }
}
function closeLiveGraphsModal() { document.getElementById('liveGraphsModal').classList.remove('open'); }

function setHighlightFilter(f) {
    highlightFilter = f;
    ['all', 'boundaries', 'wickets'].forEach(function(k) {
        var btn = document.getElementById('hlBtn_' + k);
        if (btn) btn.classList.toggle('active', k === f);
    });
    renderBallTimelineFeed();
}

function renderBallTimelineFeed() {
    var feed = document.getElementById('liveCommentaryFeed');
    if (!feed) return;
    var filtered = allBalls.slice().reverse().filter(function(b) {
        if (highlightFilter === 'boundaries') return b.runs === 4 || b.runs === 6;
        if (highlightFilter === 'wickets') return b.wicket;
        return true;
    });
    feed.innerHTML = filtered.slice(0, 25).map(function(b) {
        return '<div style="padding:5px 8px;background:var(--pill-bg);border-radius:8px;display:flex;justify-content:space-between">' +
            '<span><b>' + b.over + '</b> ' + b.bowler + ' to ' + b.batter + '</span>' +
            '<b style="color:' + (b.wicket ? '#ff2d55' : (b.runs >= 4 ? 'var(--gold)' : '#fff')) + '">' + b.label + '</b></div>';
    }).join('');
}

/* ==========================================================================
   11. PAUSE / RESUME, SAFE CLEAR ALL & ADVANCED BROADCAST SCORECARD MODAL
   ========================================================================== */
function saveLiveState() {
    if (!matchActive) return;
    var stateObj = {
        id: activePausedMatchId || ('pm_' + Date.now()),
        savedAt: new Date().toLocaleTimeString(),
        matchMode: matchMode,
        teamAName: teamAName,
        teamBName: teamBName,
        teamA: teamA,
        teamB: teamB,
        battingTeam: battingTeam,
        bowlingTeam: bowlingTeam,
        cur: cur,
        nonStriker: nonStriker,
        curBowler: curBowler,
        currOver: currOver,
        allBalls: allBalls,
        overByOver: overByOver,
        overWickets: overWickets,
        innings1: innings1,
        isSecondInnings: isSecondInnings,
        targetToWin: targetToWin,
        maxOvers: maxOvers,
        wicketsDown: wicketsDown,
        widesCount: widesCount,
        noBallsCount: noBallsCount
    };
    var idx = pausedMatches.findIndex(function(m) { return m.id === stateObj.id; });
    if (idx >= 0) pausedMatches[idx] = stateObj;
    else pausedMatches.unshift(stateObj);
    activePausedMatchId = stateObj.id;
    saveAll(true);
}

function pauseAndExitToHome() {
    saveLiveState();
    matchActive = false;
    showToast('⏸️ Match Paused & Saved! Resume anytime from Home.');
    showPage('home');
}

function resumePausedMatch(id) {
    var m = pausedMatches.find(function(x) { return x.id === id; });
    if (!m) return;
    activePausedMatchId = m.id;
    matchMode = m.matchMode;
    teamAName = m.teamAName;
    teamBName = m.teamBName;
    teamA = m.teamA;
    teamB = m.teamB;
    battingTeam = m.battingTeam;
    bowlingTeam = m.bowlingTeam;
    cur = m.cur;
    nonStriker = m.nonStriker;
    curBowler = m.curBowler;
    currOver = m.currOver || [];
    allBalls = m.allBalls || [];
    overByOver = m.overByOver || [];
    overWickets = m.overWickets || [];
    innings1 = m.innings1;
    isSecondInnings = m.isSecondInnings;
    targetToWin = m.targetToWin;
    maxOvers = m.maxOvers;
    wicketsDown = m.wicketsDown;
    widesCount = m.widesCount || 0;
    noBallsCount = m.noBallsCount || 0;
    matchActive = true;

    pausedMatches = pausedMatches.filter(function(x) { return x.id !== id; });
    saveAll(true);
    showPage('match');
    updateMatchUI();
    showToast('▶️ Match Resumed!');
}

function deletePausedMatch(id) {
    pausedMatches = pausedMatches.filter(function(x) { return x.id !== id; });
    saveAll(true);
    renderPausedMatches();
}

function renderPausedMatches() {
    var box = document.getElementById('pausedMatchesContainer');
    if (!box) return;
    if (!pausedMatches.length) { box.innerHTML = ''; return; }
    box.innerHTML = pausedMatches.map(function(m) {
        return '<div style="margin-top:8px;padding:10px;background:rgba(245,197,66,0.12);border:1px solid var(--gold);border-radius:12px;display:flex;justify-content:space-between;align-items:center">' +
            '<div><div style="font-size:10px;font-weight:900;color:var(--gold)">⏸️ PAUSED: ' + m.teamAName + ' vs ' + m.teamBName + '</div>' +
            '<div style="font-size:9px;color:var(--muted)">Saved at ' + m.savedAt + '</div></div>' +
            '<div style="display:flex;gap:4px">' +
            '<button class="btn gold" style="padding:6px 10px;font-size:9px" onclick="resumePausedMatch(\'' + m.id + '\')">▶️ RESUME</button>' +
            '<button class="btn red" style="padding:6px 8px;font-size:9px" onclick="deletePausedMatch(\'' + m.id + '\')">✕</button></div></div>';
    }).join('');
}

function renderMatchHistory() {
    var list = document.getElementById('matchHistoryList');
    var empty = document.getElementById('noMatches');
    if (!list) return;
    if (!matchHistory.length) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = matchHistory.map(function(m, idx) {
        var mvp = m.mvp || computeMatchMVP(m);
        return '<div style="margin-top:8px;padding:10px;background:var(--pill-bg);border-radius:14px;border:1px solid var(--border)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<b style="font-size:11px">' + m.teamA + ' vs ' + m.teamB + '</b>' +
            '<span style="font-size:8px;color:var(--muted)">' + m.date + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px">' +
            '<span style="font-size:10px;color:var(--gold);font-weight:900">🏆 ' + m.winner + '</span>' +
            '<span class="badge dark" style="font-size:8px;color:var(--cyan)">🏅 MVP: ' + mvp.name + '</span></div>' +
            '<div style="font-size:9px;color:var(--muted);margin-top:2px">' + m.inn1Score + (m.inn2Score ? ' • ' + m.inn2Score : '') + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-top:6px">' +
            '<button class="btn light" style="padding:5px 8px;font-size:8px" onclick="openScorecardModal(' + idx + ')">📋 SCORECARD</button>' +
            '<button class="btn gold" style="padding:5px 8px;font-size:8px" onclick="openCertificateModal(' + idx + ')">📜 CERTIFICATE</button>' +
            '<button class="btn red" style="padding:5px 8px;font-size:8px" onclick="deleteSingleMatchFromHistory(' + idx + ')" title="Delete match & deduct its stats from career">🗑️</button>' +
            '</div></div>';
    }).join('');
}

function clearHistory() {
    if (!confirm('Clear match archive list? (Player career stats & badges will NOT be deleted)')) return;
    matchHistory = [];
    saveAll();
    renderMatchHistory();
    refreshHomeUI();
    showToast('🧹 Archive list cleared (Career stats kept safe!)');
}

function deleteSingleMatchFromHistory(idx) {
    var m = matchHistory[idx];
    if (!m) return;
    if (!confirm('Delete "' + m.teamA + ' vs ' + m.teamB + '" and remove its runs/wickets from player career stats?')) return;
    applyMatchCareerDelta(m, -1);
    matchHistory.splice(idx, 1);
    saveAll();
    renderMatchHistory();
    refreshHomeUI();
    showToast('🗑️ Match deleted & career stats updated');
}

function openScorecardModal(idx) {
    var m = matchHistory[idx];
    if (!m) return;
    renderScorecardModalFromRecord(m);
}

/* Full TV Broadcast Scorecard Modal (Batting Table, Bowling Table, Extras, FOW, MVP) */
function buildInningsTableHTML(inn, labelColor) {
    if (!inn) return '';
    var batRows = (inn.batting || []).map(function(b) {
        var sr = b.balls ? ((b.runs / b.balls) * 100).toFixed(0) : '0';
        return '<tr>' +
            '<td><div style="font-weight:900;color:#fff">' + b.name + '</div><div style="font-size:8px;color:var(--muted)">' + (b.howOut || 'not out') + '</div></td>' +
            '<td><b>' + b.runs + '</b></td>' +
            '<td>' + b.balls + '</td>' +
            '<td>' + (b.fours || 0) + '</td>' +
            '<td>' + (b.sixes || 0) + '</td>' +
            '<td style="color:var(--gold)">' + sr + '</td></tr>';
    }).join('');

    var bowlRows = (inn.bowling || []).map(function(bw) {
        var ov = Math.floor((bw.ballsBowled || 0) / 6) + '.' + ((bw.ballsBowled || 0) % 6);
        var ec = bw.ballsBowled ? ((bw.runsConceded / bw.ballsBowled) * 6).toFixed(1) : '0.0';
        return '<tr>' +
            '<td style="color:var(--cyan);font-weight:900">' + bw.name + '</td>' +
            '<td>' + ov + '</td>' +
            '<td>' + (bw.runsConceded || 0) + '</td>' +
            '<td><b style="color:#00e676">' + (bw.wicketsTaken || 0) + '</b></td>' +
            '<td>' + ec + '</td></tr>';
    }).join('');

    return '<div class="glass" style="padding:10px;margin-top:8px;border-left:3px solid ' + labelColor + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<span style="font-size:11px;font-weight:900;color:' + labelColor + '">🏏 ' + inn.teamName + ' INNINGS</span>' +
        '<span style="font-size:13px;font-weight:900">' + inn.runs + '/' + inn.wickets + ' (' + inn.overs + ' ov)</span></div>' +
        '<table class="pro-score-table"><thead><tr><th>BATTER</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>' + batRows + '</tbody></table>' +
        '<div style="font-size:8px;color:var(--muted);margin:6px 0">Extras: <b>' + (inn.extras || 0) + '</b>' + (inn.fow && inn.fow.length ? ' • FOW: ' + inn.fow.join(', ') : '') + '</div>' +
        '<table class="pro-score-table" style="margin-top:6px"><thead><tr><th>BOWLER</th><th>O</th><th>R</th><th>W</th><th>ECON</th></tr></thead><tbody>' + bowlRows + '</tbody></table>' +
        '</div>';
}

function renderScorecardModalFromRecord(m) {
    var mvp = m.mvp || computeMatchMVP(m);
    var html = '<div>' +
        '<div style="text-align:center;padding-bottom:8px;border-bottom:1px solid var(--border)">' +
        '<div style="font-size:9px;color:var(--gold);font-weight:900">OFFICIAL BROADCAST SCORECARD • ' + (m.date || '') + '</div>' +
        '<h3 style="margin:3px 0;font-size:16px">' + m.teamA + ' vs ' + m.teamB + '</h3>' +
        '<div style="font-size:12px;font-weight:900;color:#00e676">🏆 ' + m.winner + '</div>' +
        '<div style="margin-top:5px"><span class="badge gold">🏅 MVP: ' + mvp.name + ' (' + mvp.runs + 'R, ' + mvp.wkts + 'W)</span></div></div>' +
        buildInningsTableHTML(m.inn1Data, 'var(--gold)') +
        buildInningsTableHTML(m.inn2Data, 'var(--cyan)') +
        '<button class="btn light uniform-btn" style="margin-top:10px" onclick="closeScorecard()">← CLOSE SCORECARD</button></div>';
    document.getElementById('scorecardContent').innerHTML = html;
    document.getElementById('scorecardModal').classList.add('open');
}
function closeScorecard() { document.getElementById('scorecardModal').classList.remove('open'); }

function confirmAbandonMatch() {
    if (!confirm('Abort current match without saving?')) return;
    matchActive = false;
    showPage('home');
    showToast('🗑️ Match aborted');
}

/* ==========================================================================
   12. LEADERBOARD (WITH AVG & SR) + ADVANCED H2H RIVALRY MODAL
   ========================================================================== */
function getPlayerMetric(p, key) {
    var c = p.career || {};
    if (key === 'avg') return c.matches ? parseFloat((c.runs / c.matches).toFixed(1)) : 0;
    if (key === 'sr') return c.balls ? parseFloat(((c.runs / c.balls) * 100).toFixed(1)) : 0;
    return c[key] || 0;
}

function renderLeader(statKey) {
    currentTab = statKey || 'runs';
    ['Runs', 'Wickets', 'Avg', 'Sr', 'Sixes', 'Fours', 'Wins'].forEach(function(t) {
        var btn = document.getElementById('tab' + t);
        if (btn) btn.classList.toggle('active', t.toLowerCase() === currentTab);
    });
    var list = document.getElementById('leaderList');
    if (!list) return;
    var sorted = players.slice().sort(function(a, b) {
        return getPlayerMetric(b, currentTab) - getPlayerMetric(a, currentTab);
    });
    list.innerHTML = sorted.map(function(p, idx) {
        var c = p.career || {};
        var avg = c.matches ? (c.runs / c.matches).toFixed(1) : '0.0';
        var sr = c.balls ? ((c.runs / c.balls) * 100).toFixed(1) : '0.0';
        var val = getPlayerMetric(p, currentTab);
        var cap = idx === 0 && currentTab === 'runs' ? ' 🟠' : (idx === 0 && currentTab === 'wickets' ? ' 🟣' : '');
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px;background:var(--pill-bg);border-radius:12px;margin-bottom:5px;cursor:pointer" onclick="openPlayerDetail(' + players.indexOf(p) + ')">' +
            '<div style="display:flex;align-items:center;gap:8px"><b>#' + (idx + 1) + '</b>' + getAvatarHTML(p, 34, 11) +
            '<div><div style="font-size:11px;font-weight:900">' + p.name + cap + '</div>' +
            '<div style="font-size:8px;color:var(--muted)">M:' + (c.matches || 0) + ' • AVG:' + avg + ' • SR:' + sr + '</div></div></div>' +
            '<b style="color:var(--gold);font-size:14px">' + val + '</b></div>';
    }).join('');
}

/* Advanced Head-to-Head Rivalry Comparison Modal */
function openCompareModal() {
    if (players.length < 2) return showToast('⚠️ Need at least 2 players to compare');
    if (h2hPlayerAIdx >= players.length) h2hPlayerAIdx = 0;
    if (h2hPlayerBIdx >= players.length) h2hPlayerBIdx = 1;
    renderCompareModalContent();
    document.getElementById('compareModal').classList.add('open');
}

function updateH2HSelection(side, val) {
    if (side === 'A') h2hPlayerAIdx = parseInt(val);
    else h2hPlayerBIdx = parseInt(val);
    renderCompareModalContent();
}

function buildH2HRow(label, vA, vB) {
    var numA = parseFloat(vA) || 0;
    var numB = parseFloat(vB) || 0;
    var total = numA + numB;
    var pctA = total > 0 ? Math.round((numA / total) * 100) : 50;
    var pctB = 100 - pctA;
    return '<div style="margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;font-size:10px;font-weight:900">' +
        '<span style="color:var(--gold)">' + vA + '</span>' +
        '<span style="font-size:8px;color:var(--muted)">' + label + '</span>' +
        '<span style="color:var(--cyan)">' + vB + '</span></div>' +
        '<div class="h2h-bar-track">' +
        '<div style="width:' + pctA + '%;background:var(--gold)"></div>' +
        '<div style="width:' + pctB + '%;background:var(--cyan)"></div>' +
        '</div></div>';
}

function renderCompareModalContent() {
    var pA = players[h2hPlayerAIdx];
    var pB = players[h2hPlayerBIdx];
    if (!pA || !pB) return;

    var optsA = players.map(function(p, i) { return '<option value="' + i + '" ' + (i === h2hPlayerAIdx ? 'selected' : '') + '>' + p.name + '</option>'; }).join('');
    var optsB = players.map(function(p, i) { return '<option value="' + i + '" ' + (i === h2hPlayerBIdx ? 'selected' : '') + '>' + p.name + '</option>'; }).join('');

    // Calculate Direct Head-to-Head Match Wins between pA and pB
    var h2hClashes = 0, aDirectWins = 0, bDirectWins = 0;
    matchHistory.forEach(function(m) {
        var hasA = (m.teamA === pA.name || m.teamB === pA.name);
        var hasB = (m.teamA === pB.name || m.teamB === pB.name);
        if (hasA && hasB) {
            h2hClashes++;
            if (m.winner && m.winner.includes(pA.name)) aDirectWins++;
            if (m.winner && m.winner.includes(pB.name)) bDirectWins++;
        }
    });

    var cA = pA.career || {}, cB = pB.career || {};
    var avgA = cA.matches ? (cA.runs / cA.matches).toFixed(1) : '0.0';
    var avgB = cB.matches ? (cB.runs / cB.matches).toFixed(1) : '0.0';
    var srA = cA.balls ? ((cA.runs / cA.balls) * 100).toFixed(1) : '0.0';
    var srB = cB.balls ? ((cB.runs / cB.balls) * 100).toFixed(1) : '0.0';

    document.getElementById('compareContent').innerHTML =
        '<div>' +
        '<div style="text-align:center;margin-bottom:10px"><div style="font-size:10px;color:var(--gold);font-weight:900">PRO ANALYTICS ENGINE</div><h3 style="margin:2px 0;font-size:16px">⚔️ HEAD-TO-HEAD RIVALRY</h3></div>' +
        '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:10px">' +
        '<div style="text-align:center"><div style="display:flex;justify-content:center;margin-bottom:5px">' + getAvatarHTML(pA, 46, 16) + '</div><select onchange="updateH2HSelection(\'A\',this.value)">' + optsA + '</select></div>' +
        '<div style="font-size:14px;font-weight:900;color:var(--gold)">VS</div>' +
        '<div style="text-align:center"><div style="display:flex;justify-content:center;margin-bottom:5px">' + getAvatarHTML(pB, 46, 16) + '</div><select onchange="updateH2HSelection(\'B\',this.value)">' + optsB + '</select></div>' +
        '</div>' +

        '<div class="glass" style="padding:9px;margin-bottom:10px;text-align:center;border-color:var(--gold)">' +
        '<div style="font-size:8px;color:var(--gold);font-weight:900">DIRECT 1v1 CLASH RECORD (' + h2hClashes + ' MATCHES)</div>' +
        '<div style="font-size:14px;font-weight:900;margin-top:3px"><span style="color:var(--gold)">' + pA.name + ': ' + aDirectWins + '</span>  —  <span style="color:var(--cyan)">' + pB.name + ': ' + bDirectWins + '</span></div></div>' +

        buildH2HRow('CAREER RUNS', cA.runs || 0, cB.runs || 0) +
        buildH2HRow('BATTING AVERAGE', avgA, avgB) +
        buildH2HRow('STRIKE RATE', srA, srB) +
        buildH2HRow('WICKETS TAKEN', cA.wickets || 0, cB.wickets || 0) +
        buildH2HRow('SIXES SMASHED', cA.sixes || 0, cB.sixes || 0) +
        buildH2HRow('CAREER WINS', cA.wins || 0, cB.wins || 0) +
        buildH2HRow('UNLOCKED BADGES', (cA.badges || []).length, (cB.badges || []).length) +

        '<button class="btn light uniform-btn" style="margin-top:8px" onclick="closeCompareModal()">← CLOSE COMPARISON</button>' +
        '</div>';
}
function closeCompareModal() { document.getElementById('compareModal').classList.remove('open'); }

/* ==========================================================================
   13. TROPHIES & LEAGUES (WITH CUSTOM OVERS)
   ========================================================================== */
function renderTrophiesTab(tab) {
    currentTrophyTab = tab || 'badges';
    ['Badges', 'Match', 'HOF'].forEach(function(k) {
        var btn = document.getElementById('btnTabTrophy' + k);
        if (btn) btn.classList.toggle('active', k.toLowerCase() === currentTrophyTab);
    });

    var grid = document.getElementById('trophyListGrid');
    var empty = document.getElementById('noTrophies');
    var filterWrap = document.getElementById('badgesPlayerFilterWrap');
    var sel = document.getElementById('badgeShowcasePlayerSelect');
    var dash = document.getElementById('trophyStatsDashboard');

    if (currentTrophyTab === 'badges') {
        if (filterWrap) filterWrap.style.display = players.length ? 'block' : 'none';
        if (players.length && sel && sel.options.length !== players.length) {
            sel.innerHTML = players.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
        }
        var pIdx = sel ? (parseInt(sel.value) || 0) : 0;
        var activePl = players[pIdx];
        if (activePl) checkAndAwardBadges(activePl);
        var unlocked = activePl && activePl.career ? activePl.career.badges : [];
        if (dash) {
            dash.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center">' +
                '<div><div style="font-size:10px;font-weight:900;color:var(--gold)">' + (activePl ? activePl.name.toUpperCase() : 'PLAYER') + ' BADGE PROGRESS</div>' +
                '<div style="font-size:9px;color:var(--muted)">Unlocked ' + unlocked.length + ' of ' + MASTER_BADGES.length + ' Master Badges</div></div>' +
                '<div style="font-size:18px;font-weight:900;color:#00e676">' + unlocked.length + '/' + MASTER_BADGES.length + '</div></div>';
        }
        if (empty) empty.style.display = 'none';
        if (grid) {
            grid.innerHTML = MASTER_BADGES.map(function(b) {
                var isUnlocked = unlocked.includes(b.id);
                return '<div class="glass" style="padding:10px;text-align:center;margin-bottom:0;opacity:' + (isUnlocked ? '1' : '0.4') + ';border:1px solid ' + (isUnlocked ? 'var(--gold)' : 'var(--border)') + '">' +
                    '<div style="font-size:24px">' + b.icon + '</div>' +
                    '<div style="font-size:10px;font-weight:900;margin-top:3px">' + b.title + '</div>' +
                    '<div style="font-size:8px;color:var(--muted);margin-top:2px">' + b.desc + '</div>' +
                    '<div style="margin-top:5px;font-size:8px;font-weight:900;color:' + (isUnlocked ? '#00e676' : '#aaa') + '">' + (isUnlocked ? '✅ UNLOCKED' : '🔒 LOCKED') + '</div></div>';
            }).join('');
        }
    } else if (currentTrophyTab === 'match') {
        if (filterWrap) filterWrap.style.display = 'none';
        if (!matchHistory.length) {
            if (grid) grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
        } else {
            if (empty) empty.style.display = 'none';
            if (grid) {
                grid.innerHTML = matchHistory.slice(0, 16).map(function(m) {
                    var mvp = m.mvp || computeMatchMVP(m);
                    return '<div class="glass" style="padding:10px;text-align:center;margin-bottom:0;border:1px solid var(--gold)">' +
                        '<div style="font-size:22px">🏅</div>' +
                        '<div style="font-size:11px;font-weight:900;color:var(--gold);margin-top:3px">' + mvp.name + '</div>' +
                        '<div style="font-size:8px;color:#fff;margin-top:2px">' + m.teamA + ' vs ' + m.teamB + '</div>' +
                        '<div style="font-size:8px;color:var(--muted);margin-top:2px">Runs: ' + mvp.runs + ' • Wkts: ' + mvp.wkts + '</div></div>';
                }).join('');
            }
        }
    } else {
        if (filterWrap) filterWrap.style.display = 'none';
        var topPlayers = players.slice().sort(function(a, b) { return (b.career.runs || 0) - (a.career.runs || 0); }).slice(0, 6);
        if (!topPlayers.length) {
            if (grid) grid.innerHTML = '';
            if (empty) empty.style.display = 'block';
        } else {
            if (empty) empty.style.display = 'none';
            if (grid) {
                grid.innerHTML = topPlayers.map(function(p, i) {
                    return '<div class="glass" style="padding:10px;text-align:center;margin-bottom:0;border:1px solid var(--cyan)">' +
                        '<div style="font-size:22px">' + (i === 0 ? '👑' : '🌟') + '</div>' +
                        '<div style="font-size:11px;font-weight:900;margin-top:3px">' + p.name + '</div>' +
                        '<div style="font-size:8px;color:var(--gold);margin-top:2px">' + (p.career.runs || 0) + ' Runs • ' + (p.career.wickets || 0) + ' Wkts</div></div>';
                }).join('');
            }
        }
    }
}

function renderLeagues() {
    var checklist = document.getElementById('leaguePlayerChecklist');
    if (checklist) {
        checklist.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px">' + players.map(function(p, i) {
            var c = p.career || {};
            return '<div class="adv-pick-card" id="pickCard_LG_' + i + '" onclick="toggleLeaguePickCard(' + i + ')">' +
                '<input type="checkbox" class="league-cb" id="cb_LG_' + i + '" value="' + i + '" style="display:none">' +
                '<div style="display:flex;align-items:center;gap:8px">' + getAvatarHTML(p, 30, 10) +
                '<div><div style="font-size:11px;font-weight:900;color:#fff">' + p.name + '</div>' +
                '<div style="font-size:8px;color:var(--muted)">Runs: ' + (c.runs || 0) + ' • Wkts: ' + (c.wickets || 0) + '</div></div></div>' +
                '<div class="adv-pick-check">✓</div></div>';
        }).join('') + '</div>';
    }
    var list = document.getElementById('leaguesList');
    var empty = document.getElementById('noLeagues');
    var badge = document.getElementById('leagueCountBadge');
    if (badge) badge.textContent = leagues.length;
    if (!list) return;
    if (!leagues.length) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';
    list.innerHTML = leagues.map(function(lg, idx) {
        return '<div style="padding:10px;background:var(--pill-bg);border-radius:12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">' +
            '<div><b>🏆 ' + lg.name + '</b><div style="font-size:9px;color:var(--muted)">' + lg.players.length + ' Players • ' + lg.overs + ' Overs</div></div>' +
            '<button class="btn red" style="padding:4px 8px;font-size:8px" onclick="deleteLeagueByIdx(' + idx + ')">🗑️</button></div>';
    }).join('');
}

function toggleLeaguePickCard(idx) {
    var cb = document.getElementById('cb_LG_' + idx);
    var card = document.getElementById('pickCard_LG_' + idx);
    if (!cb || !card) return;
    cb.checked = !cb.checked;
    card.classList.toggle('selected', cb.checked);
    playSFX('dot');
    updateLeagueSelCount();
}

function updateLeagueSelCount() {
    var cnt = document.querySelectorAll('.league-cb:checked').length;
    var el = document.getElementById('leagueSelectedCount');
    if (el) el.textContent = cnt + ' selected';
}

function createLeague() {
    var name = document.getElementById('leagueNameInput').value.trim();
    var picked = Array.from(document.querySelectorAll('.league-cb:checked')).map(function(cb) { return players[parseInt(cb.value)].name; });
    if (!name) return showToast('⚠️ Enter tournament name');
    if (picked.length < 3) return showToast('⚠️ Pick at least 3 players');
    var resolvedOvers = getResolvedOversValue('leagueOvers', 'customLeagueOversInput');
    if (!resolvedOvers) return showToast('⚠️ Enter valid custom overs for league!');

    leagues.unshift({
        id: 'lg_' + Date.now(),
        name: name,
        overs: resolvedOvers,
        type: document.getElementById('leagueType').value,
        players: picked
    });
    document.getElementById('leagueNameInput').value = '';
    saveAll();
    renderLeagues();
    showToast('🏆 Tournament Created (' + resolvedOvers + ' Overs)!');
}

function deleteLeagueByIdx(idx) {
    leagues.splice(idx, 1);
    saveAll();
    renderLeagues();
}
function closeLeagueDetail() {
    var el = document.getElementById('leagueDetailSection');
    if (el) el.style.display = 'none';
}

/* ==========================================================================
   14. LIVE BROADCAST ROOM, QR CODE & FIREBASE SYNC
   ========================================================================== */
function openSpectatorHub() {
    document.getElementById('spectatorModal').classList.add('open');
    loadActiveBroadcastRooms();
}
function closeSpectatorHub() { document.getElementById('spectatorModal').classList.remove('open'); }

function startHostingRoom(silent) {
    if (!hostRoomCode) hostRoomCode = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('cric_host_room', hostRoomCode);
    var disp = document.getElementById('hostRoomCodeDisplay');
    if (disp) disp.textContent = '#' + hostRoomCode;

    var shareUrl = window.location.origin + window.location.pathname + '?room=' + hostRoomCode;
    var urlBox = document.getElementById('spectatorDirectUrlBox');
    var qrBox = document.getElementById('spectatorQRBox');
    var qrImg = document.getElementById('spectatorQRImg');
    if (urlBox) { urlBox.style.display = 'block'; urlBox.textContent = shareUrl; }
    if (qrBox && qrImg) {
        qrBox.style.display = 'inline-block';
        qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(shareUrl);
    }
    pushLiveRoomUpdate();
    if (!silent) showToast('📡 Live Room #' + hostRoomCode + ' Ready!');
}

function pushLiveRoomUpdate() {
    if (!database || !hostRoomCode || liveBroadcastPrivacy === 'offline') return;
    if (!teamAName || !teamBName || teamAName === 'undefined' || teamBName === 'undefined') return;
    try {
        database.ref('live_rooms/' + hostRoomCode).set({
            roomCode: hostRoomCode,
            privacy: liveBroadcastPrivacy,
            ended: !matchActive,
            teamA: teamAName,
            teamB: teamBName,
            battingTeam: isSecondInnings ? teamBName : teamAName,
            score: getTotalRuns() + '/' + wicketsDown,
            overs: formatOvers(getLegalBallsCount()) + '/' + (maxOvers === 999 ? '∞' : maxOvers),
            striker: battingTeam[cur] ? battingTeam[cur].name + ' ' + battingTeam[cur].runs + '(' + battingTeam[cur].balls + ')' : '',
            bowler: bowlingTeam[curBowler] ? bowlingTeam[curBowler].name + ' ' + bowlingTeam[curBowler].wicketsTaken + '-' + bowlingTeam[curBowler].runsConceded : '',
            currOver: currOver,
            updatedAt: Date.now()
        });
    } catch (e) {}
}

function loadActiveBroadcastRooms() {
    var pills = document.getElementById('activeRoomsPills');
    if (!database || !pills) return;
    var nowMs = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;
    database.ref('live_rooms').limitToLast(15).once('value', function(snap) {
        var val = snap.val();
        if (!val) { pills.innerHTML = '<span style="font-size:9px;color:var(--muted)">No public rooms live right now</span>'; return; }
        var htmlArr = [];
        Object.keys(val).forEach(function(k) {
            var r = val[k];
            if (!r || !r.teamA || !r.teamB || r.teamA === 'undefined' || r.teamB === 'undefined' || r.ended || !r.updatedAt || (nowMs - r.updatedAt) > DAY_MS) {
                try { database.ref('live_rooms/' + k).remove(); } catch (e) {}
                return;
            }
            if (r.privacy === 'public') {
                htmlArr.push('<button class="btn light" style="padding:4px 8px;font-size:9px" onclick="openFullSpectatorScreen(\'' + k + '\', false)">🔴 #' + k + ' (' + r.teamA + ' vs ' + r.teamB + ')</button>');
            }
        });
        pills.innerHTML = htmlArr.length ? htmlArr.join('') : '<span style="font-size:9px;color:var(--muted)">No public rooms live right now</span>';
    });
}

function joinSpectatorRoom() {
    var code = document.getElementById('joinRoomCodeInput').value.trim().replace('#', '');
    if (!code) return showToast('⚠️ Enter a Room Code');
    openFullSpectatorScreen(code, false);
}

function openFullSpectatorScreen(code, strictMode) {
    code = (code || '').trim().replace('#', '');
    if (!code) return showToast('⚠️ Invalid Room Code');
    isStrictSpectatorLinkMode = !!strictMode;
    document.getElementById('tvSpecRoomCode').textContent = 'ROOM #' + code;
    document.getElementById('fullSpectatorBroadcastScreen').style.display = 'block';
    closeSpectatorHub();

    if (!database) {
        document.getElementById('tvSpecLiveBody').innerHTML = '<div class="glass">⚠️ Firebase Offline</div>';
        return;
    }
    if (fullSpectatorRoomRef) fullSpectatorRoomRef.off();
    fullSpectatorRoomRef = database.ref('live_rooms/' + code);
    fullSpectatorRoomRef.on('value', function(snap) {
        var r = snap.val();
        if (!r || !r.teamA || r.teamA === 'undefined') {
            document.getElementById('tvSpecLiveBody').innerHTML = '<div class="glass" style="text-align:center;padding:24px">⚠️ Room #' + code + ' has ended or is no longer active.</div>';
            return;
        }
        document.getElementById('tvSpecLiveBody').innerHTML =
            '<div class="jumbotron">' +
            '<div style="font-size:11px;color:var(--gold);font-weight:900">' + r.teamA + ' vs ' + r.teamB + '</div>' +
            '<div style="font-size:12px;color:#aaa;margin-top:4px">' + (r.battingTeam || r.teamA) + ' BATTING</div>' +
            '<div class="jumbo-score">' + (r.score || '0/0') + '</div>' +
            '<div style="font-size:13px;font-weight:900;color:var(--cyan)">OVERS: ' + (r.overs || '0.0') + '</div>' +
            '<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.15);font-size:11px">' +
            '<div>🏏 <b>' + (r.striker || '-') + '</b></div>' +
            '<div style="margin-top:4px">🎯 <b>' + (r.bowler || '-') + '</b></div>' +
            '</div></div>';
    });
}

function closeFullSpectatorScreen() {
    if (isStrictSpectatorLinkMode) return showToast('🔒 Spectator Link Mode Active');
    document.getElementById('fullSpectatorBroadcastScreen').style.display = 'none';
    if (fullSpectatorRoomRef) fullSpectatorRoomRef.off();
}

function toggleSpecAudio() {
    specAudioEnabled = !specAudioEnabled;
    document.getElementById('tvSpecAudioBtn').textContent = specAudioEnabled ? '🔊 AUDIO ON' : '🔇 MUTED';
}

function shareLiveLink() {
    startHostingRoom(true);
    var url = window.location.origin + window.location.pathname + '?room=' + hostRoomCode;
    document.getElementById('liveLinkText').textContent = '🏏 Watch CRIC CLASH Live!\nRoom Code: #' + hostRoomCode + '\nLink: ' + url;
    var qrWrap = document.getElementById('modalQRWrap');
    var qrImg = document.getElementById('modalQRImg');
    if (qrWrap && qrImg) {
        qrWrap.style.display = 'inline-block';
        qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(url);
    }
    document.getElementById('liveLinkModal').classList.add('open');
}
function closeLiveLink() { document.getElementById('liveLinkModal').classList.remove('open'); }
function copyLiveLink() {
    var txt = document.getElementById('liveLinkText').textContent;
    navigator.clipboard.writeText(txt).then(function() { showToast('📋 Copied to clipboard!'); });
}
function shareLiveLinkWhatsApp() {
    var txt = encodeURIComponent(document.getElementById('liveLinkText').textContent);
    window.open('https://wa.me/?text=' + txt, '_blank');
}
function shareClickableSpectatorLink() { shareLiveLink(); shareLiveLinkWhatsApp(); }

/* ==========================================================================
   15. CERTIFICATE, GOOGLE AUTH & BACKUP
   ========================================================================== */
function openCertificateModal(idx) {
    var m = matchHistory[idx];
    if (!m) return;
    var mvp = m.mvp || computeMatchMVP(m);
    var c = document.getElementById('certificateCanvas');
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#090b12';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 6;
    ctx.strokeRect(14, 14, c.width - 28, c.height - 28);
    ctx.fillStyle = '#f5c542';
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRIC CLASH • OFFICIAL MATCH CERTIFICATE', c.width / 2, 70);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 22px sans-serif';
    ctx.fillText(m.teamA + '  VS  ' + m.teamB, c.width / 2, 135);
    ctx.fillStyle = '#00e676';
    ctx.font = '900 26px sans-serif';
    ctx.fillText('🏆 ' + m.winner.toUpperCase(), c.width / 2, 195);
    ctx.fillStyle = '#0a84ff';
    ctx.font = '800 18px sans-serif';
    ctx.fillText('🏅 MVP: ' + mvp.name + ' (' + mvp.runs + ' Runs, ' + mvp.wkts + ' Wkts)', c.width / 2, 245);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '600 15px sans-serif';
    ctx.fillText(m.inn1Score + (m.inn2Score ? '  |  ' + m.inn2Score : ''), c.width / 2, 295);
    ctx.fillText('Date: ' + m.date, c.width / 2, 345);
    document.getElementById('certificateModal').classList.add('open');
}
function closeCertificate() { document.getElementById('certificateModal').classList.remove('open'); }
function downloadCertificate() {
    var c = document.getElementById('certificateCanvas');
    var a = document.createElement('a');
    a.download = 'cric-clash-certificate.png';
    a.href = c.toDataURL();
    a.click();
}
function downloadMVPSticker() { downloadCertificate(); }
function shareCertificateWhatsApp() { showToast('📲 Download PNG and share on WhatsApp!'); }

function loginWithGoogle() {
    if (!auth || !googleProvider) return showToast('⚠️ Firebase Auth unavailable');
    auth.signInWithPopup(googleProvider).then(function(res) {
        var user = res.user;
        currentGmailUser = user.email;
        currentGoogleName = user.displayName || '';
        currentGooglePhoto = user.photoURL || '';
        localStorage.setItem('cric_gmail_user', currentGmailUser);
        localStorage.setItem('cric_google_name', currentGoogleName);
        localStorage.setItem('cric_google_photo', currentGooglePhoto);
        updateAuthUI();
        showToast('✅ Signed in as ' + currentGmailUser);
    }).catch(function(err) {
        showToast('⚠️ Sign in failed: ' + err.message);
    });
}

function gmailBridgeLogin(isRestore) {
    var email = document.getElementById('gmailInput').value.trim().toLowerCase();
    if (!email || !email.includes('@')) return showToast('⚠️ Enter valid email');
    currentGmailUser = email;
    localStorage.setItem('cric_gmail_user', email);
    updateAuthUI();
    if (isRestore) cloudRestore(false);
    else cloudBackup(false);
}

function gmailLogout() {
    currentGmailUser = null;
    localStorage.removeItem('cric_gmail_user');
    updateAuthUI();
    showToast('👋 Signed out');
}

function updateAuthUI() {
    var loginArea = document.getElementById('gmailLoginArea');
    var loggedArea = document.getElementById('gmailLoggedArea');
    var status = document.getElementById('gmailStatus');
    if (currentGmailUser) {
        if (loginArea) loginArea.style.display = 'none';
        if (loggedArea) loggedArea.style.display = 'block';
        if (status) status.textContent = 'Connected: ' + currentGmailUser;
        document.getElementById('loggedGmailName').textContent = currentGoogleName || 'CRIC CLASH Player';
        document.getElementById('loggedGmail').textContent = currentGmailUser;
    } else {
        if (loginArea) loginArea.style.display = 'block';
        if (loggedArea) loggedArea.style.display = 'none';
        if (status) status.textContent = 'Not signed in';
    }
}

function cloudBackup(silent) {
    if (!database || !currentGmailUser) return;
    var key = currentGmailUser.replace(/[.@]/g, '_');
    database.ref('user_backups/' + key).set({
        players: players,
        matchHistory: matchHistory,
        leagues: leagues,
        updatedAt: new Date().toLocaleString()
    }).then(function() {
        if (!silent) showToast('☁️ Cloud Backup Complete!');
        var lbl = document.getElementById('cloudLastBackup');
        if (lbl) lbl.textContent = 'Last synced: ' + new Date().toLocaleTimeString();
    });
}

function cloudRestore(silent) {
    if (!database || !currentGmailUser) return;
    var key = currentGmailUser.replace(/[.@]/g, '_');
    database.ref('user_backups/' + key).once('value', function(snap) {
        var d = snap.val();
        if (!d) return showToast('⚠️ No cloud backup found');
        players = d.players || [];
        matchHistory = d.matchHistory || [];
        leagues = d.leagues || [];
        saveAll(true);
        refreshHomeUI();
        if (!silent) showToast('🔄 Data Restored from Cloud!');
    });
}

function exportData() {
    var blob = new Blob([JSON.stringify({ players: players, matchHistory: matchHistory, leagues: leagues })], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cric-clash-backup.json';
    a.click();
}

function importData(input) {
    if (!input.files || !input.files[0]) return;
    var r = new FileReader();
    r.onload = function(e) {
        try {
            var d = JSON.parse(e.target.result);
            players = d.players || [];
            matchHistory = d.matchHistory || [];
            leagues = d.leagues || [];
            saveAll();
            refreshHomeUI();
            showToast('📥 Backup Imported!');
        } catch (err) { showToast('⚠️ Invalid JSON file'); }
    };
    r.readAsText(input.files[0]);
}

function resetAppCompletely() {
    if (!confirm('Reset ALL data permanently?')) return;
    localStorage.clear();
    location.reload();
}

/* ==========================================================================
   16. MISC MODALS & BOOTSTRAP ON LOAD
   ========================================================================== */
function openAboutApp() { document.getElementById('aboutModal').classList.add('open'); }
function closeAboutApp() { document.getElementById('aboutModal').classList.remove('open'); }

function triggerDLSMethod() {
    if (!isSecondInnings) return showToast('⚠️ DLS available in 2nd Innings only');
    var newT = prompt('Enter revised DLS Target:', targetToWin);
    if (newT && !isNaN(parseInt(newT))) {
        targetToWin = parseInt(newT);
        updateMatchUI();
        showToast('🌧️ DLS Target updated to ' + targetToWin);
    }
}

function openBallEdit() {
    var list = document.getElementById('ballEditList');
    list.innerHTML = allBalls.slice().reverse().map(function(b) {
        return '<div style="padding:7px;background:var(--pill-bg);border-radius:8px;display:flex;justify-content:space-between;font-size:11px">' +
            '<span><b>' + b.over + '</b> ' + b.batter + '</span><b>' + b.label + '</b></div>';
    }).join('');
    document.getElementById('ballEditModal').classList.add('open');
}
function closeBallEdit() { document.getElementById('ballEditModal').classList.remove('open'); }

function toggleVoiceScoring() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return showToast('⚠️ Voice recognition not supported in this browser');
    var btn = document.getElementById('voiceScoreBtn');
    if (voiceScoringActive) {
        voiceScoringActive = false;
        if (recognition) recognition.stop();
        btn.textContent = '🎙️ OFF';
        return;
    }
    recognition = new SR();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.onresult = function(e) {
        var cmd = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
        document.getElementById('voiceHeardText').textContent = 'Heard: "' + cmd + '"';
        if (cmd.includes('six')) score(6);
        else if (cmd.includes('four')) score(4);
        else if (cmd.includes('one') || cmd.includes('single')) score(1);
        else if (cmd.includes('two')) score(2);
        else if (cmd.includes('three')) score(3);
        else if (cmd.includes('dot') || cmd.includes('zero')) score(0);
        else if (cmd.includes('wide')) extraWd();
        else if (cmd.includes('no ball')) extraNoBall();
        else if (cmd.includes('out') || cmd.includes('wicket')) outPlayer();
    };
    recognition.start();
    voiceScoringActive = true;
    btn.textContent = '🎙️ ON';
    showToast('🎙️ Say: "Four", "Six", "Single", "Wide", "Out"');
}

window.addEventListener('DOMContentLoaded', function() {
    loadPersistentData();
    setAppTheme(settings.appTheme || 'oled');
    ['voice', 'sfx', 'autoSave'].forEach(function(k) {
        var el = document.getElementById(k + 'Toggle');
        if (el) el.classList.toggle('on', !!settings[k]);
    });
    renderThemeChips('themeSelector', selectedTheme, 'selectTheme');
    updateAuthUI();
    refreshHomeUI();

    var params = new URLSearchParams(window.location.search);
    var roomParam = params.get('room');
    if (roomParam) {
        openFullSpectatorScreen(roomParam, true);
    }
});