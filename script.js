/* ==========================================================================
   CRIC CLASH • PRO LIQUID BROADCAST EDITION (COMPLETE script.js - PART 1)
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

try { if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); } catch (e) {}
const database = (typeof firebase !== 'undefined' && firebase.database) ? firebase.database() : null;
const auth = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth() : null;
let googleProvider = null;
try {
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth.GoogleAuthProvider) {
        googleProvider = new firebase.auth.GoogleAuthProvider();
        googleProvider.setCustomParameters({ prompt: 'select_account' });
    }
} catch (e) {}

const DAY_MS = 24 * 60 * 60 * 1000;
var settings = { appTheme: 'oled', voice: true, sfx: true, autoSave: true, commTone: 'hype' };
var APP_THEMES = ['oled', 'ipl', 'turf', 'cyber', 'crimson', 'matrix'];
var PAGE_ORDER = ['home', 'profiles', 'leader', 'league', 'trophy', 'settings'];
var lastPageIndex = 0;

var matchHistory = [], publicFinishedMatches = [], pausedMatches = [], players = [], rivalries = {}, leagues = [];
var totalAllTimeMatches = 0;
var isStrictSpectatorLinkMode = false, liveBroadcastPrivacy = 'public', activePausedMatchId = null, activePublicHubTab = 'live', sharedAudioCtx = null;
var selected1v1StrikerIdx = 0, selected1v1BowlerIdx = 1, h2hPlayerAIdx = 0, h2hPlayerBIdx = 1;
var activeLeagueMatchMeta = null;

var matchMode = '1v1', teamWicketRule = 'all_out', teamAName = 'Team A', teamBName = 'Team B', teamAColor = '#4285f4', teamBColor = '#ff1744', teamALogo = null, teamBLogo = null, teamA = [], teamB = [], battingTeam = [], bowlingTeam = [], matchActive = false, cur = 0, nonStriker = -1, curBowler = -1, currOver = [], allBalls = [], overByOver = [], overWickets = [], fowList = [], partnershipRuns = 0, partnershipBalls = 0, innings1 = null, isSecondInnings = false, targetToWin = 0, maxOvers = 10, isFreeHit = false, isSuperOver = false, wicketsDown = 0, tempAvatar = null, currentTab = 'runs', selectedTheme = '#f5c542', currentTrophyTab = 'badges';
var ffaPlayers = [], ffaCurrentBatterIdx = -1, ffaPickedBatterTemp = -1, ffaTurnNumber = 0;
var editIndex = -1, editTempAvatar = null, editSelectedTheme = '#f5c542';
var currentGmailUser = localStorage.getItem('cric_gmail_user') || null;
var currentGoogleName = localStorage.getItem('cric_google_name') || '';
var currentGooglePhoto = localStorage.getItem('cric_google_photo') || '';
var overRuns = 0, overWktsCount = 0, undoStack = [], highlightFilter = 'all';
var hostRoomCode = localStorage.getItem('cric_host_room') || null, fullSpectatorRoomRef = null, specAudioEnabled = true, voiceScoringActive = false, recognition = null;
var widesCount = 0, noBallsCount = 0;

var TEAM_THEMES = [
    { name: 'Gold', color: '#f5c542' }, { name: 'CSK', color: '#FFFF00' },
    { name: 'MI', color: '#38bdf8' }, { name: 'RCB', color: '#ff3b5c' },
    { name: 'KKR Purple', color: '#b87cff' }, { name: 'GT', color: '#1B82E1' },
    { name: 'SRH', color: '#FF822A' }, { name: 'RR', color: '#FF1493' }
];

function getReadableThemeColor(hex) {
    if (!hex || typeof hex !== 'string') return '#f5c542';
    var clean = hex.replace('#', '').trim();
    if (clean.length === 3) clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    if (clean.length !== 6) return hex;
    var r = parseInt(clean.substring(0, 2), 16) || 0;
    var g = parseInt(clean.substring(2, 4), 16) || 0;
    var b = parseInt(clean.substring(4, 6), 16) || 0;
    var lum = (0.299 * r + 0.587 * g + 0.114 * b);
    if (lum < 105) {
        var boost = 125 - lum;
        r = Math.min(255, Math.round(r + boost * 1.15));
        g = Math.min(255, Math.round(g + boost * 0.85));
        b = Math.min(255, Math.round(b + boost * 1.35));
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
    return hex;
}

/* ================== 6-AXIS PRO SPIDER / RADAR CHART ENGINE ================== */
function computePlayerRadarMetrics(p) {
    var c = (p && p.career) ? p.career : {};
    var m = c.matches || 0, r = c.runs || 0, b = c.balls || 0, w = c.wickets || 0;
    var f4 = c.fours || 0, f6 = c.sixes || 0, wins = c.wins || 0;
    var avg = m > 0 ? (r / m) : 0;
    var sr = b > 0 ? ((r / b) * 100) : 0;
    var winPct = m > 0 ? ((wins / m) * 100) : 0;

    var power = Math.min(99, Math.round(18 + f6 * 4.5 + f4 * 1.8));
    var consistency = Math.min(99, Math.round(18 + avg * 2.2 + (c.fifties || 0) * 8 + (c.hundreds || 0) * 15));
    var strike = Math.min(99, Math.round(18 + (sr / 220) * 80));
    var bowling = Math.min(99, Math.round(18 + w * 4.8 + (c.fiveWicketHauls || 0) * 14));
    var experience = Math.min(99, Math.round(18 + m * 3.8));
    var clutch = Math.min(99, Math.round(18 + winPct * 0.72 + (c.maxStreak || 0) * 3));

    var ovr = Math.round((power + consistency + strike + bowling + experience + clutch) / 6);
    return {
        labels: ['POWER', 'AVG', 'STRIKE', 'BOWL', 'EXP', 'IMPACT'],
        values: [power, consistency, strike, bowling, experience, clutch],
        ovr: ovr
    };
}

function drawSpiderRadarCanvas(canvasId, datasets) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2 + 4;
    var radius = Math.min(W, H) * 0.34;
    var labels = ['POWER', 'AVG', 'STRIKE', 'BOWL', 'EXP', 'IMPACT'];
    var totalAxes = 6;

    for (var ring = 1; ring <= 4; ring++) {
        var r = (radius / 4) * ring;
        ctx.beginPath();
        for (var i = 0; i < totalAxes; i++) {
            var angle = (Math.PI * 2 * i) / totalAxes - Math.PI / 2;
            var x = cx + r * Math.cos(angle);
            var y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = ring === 4 ? 'rgba(245, 197, 66, 0.35)' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = ring === 4 ? 1.5 : 1;
        ctx.stroke();
    }

    ctx.font = '900 9px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var a = 0; a < totalAxes; a++) {
        var ang = (Math.PI * 2 * a) / totalAxes - Math.PI / 2;
        var ax = cx + radius * Math.cos(ang);
        var ay = cy + radius * Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(ax, ay);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        var lx = cx + (radius + 22) * Math.cos(ang);
        var ly = cy + (radius + 17) * Math.sin(ang);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(labels[a], lx, ly);
    }

    (datasets || []).forEach(function(ds) {
        var vals = ds.values || [20, 20, 20, 20, 20, 20];
        ctx.beginPath();
        var pts = [];
        for (var j = 0; j < totalAxes; j++) {
            var valRatio = Math.max(0.12, Math.min(1, (vals[j] || 20) / 100));
            var pang = (Math.PI * 2 * j) / totalAxes - Math.PI / 2;
            var px = cx + radius * valRatio * Math.cos(pang);
            var py = cy + radius * valRatio * Math.sin(pang);
            pts.push({ x: px, y: py });
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = ds.fill || 'rgba(245, 197, 66, 0.28)';
        ctx.fill();
        ctx.strokeStyle = ds.stroke || '#f5c542';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        pts.forEach(function(pt) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = ds.stroke || '#f5c542';
            ctx.fill();
        });
    });
}

/* ================== CUSTOM LIQUID GLASS DIALOG ENGINE ================== */
var customDialogCallback = null;
var customDialogMode = 'confirm';

function openCustomConfirm(icon, title, msg, confirmLabel, onConfirm) {
    customDialogMode = 'confirm';
    customDialogCallback = onConfirm;
    document.getElementById('customDialogIcon').textContent = icon || '⚠️';
    document.getElementById('customDialogTitle').textContent = title || 'CONFIRM';
    document.getElementById('customDialogMsg').textContent = msg || '';
    document.getElementById('customDialogInputWrap').style.display = 'none';
    document.getElementById('customDialogChips').style.display = 'none';
    document.getElementById('customDialogConfirmBtn').textContent = confirmLabel || 'CONFIRM →';
    document.getElementById('customDialogModal').classList.add('open');
}

function openCustomPrompt(icon, title, msg, defaultVal, quickValues, onConfirm) {
    customDialogMode = 'prompt';
    customDialogCallback = onConfirm;
    document.getElementById('customDialogIcon').textContent = icon || '🏏';
    document.getElementById('customDialogTitle').textContent = title || 'ENTER VALUE';
    document.getElementById('customDialogMsg').textContent = msg || '';
    var inpWrap = document.getElementById('customDialogInputWrap');
    var inp = document.getElementById('customDialogInput');
    inpWrap.style.display = 'block';
    inp.value = defaultVal !== undefined ? defaultVal : '';

    var chipsBox = document.getElementById('customDialogChips');
    if (quickValues && quickValues.length) {
        chipsBox.style.display = 'grid';
        chipsBox.innerHTML = quickValues.map(function(v) {
            return '<button class="btn light" style="padding:8px 0;font-size:12px" onclick="selectCustomPromptQuickVal(' + v + ')">+' + v + '</button>';
        }).join('');
    } else {
        chipsBox.style.display = 'none';
    }
    document.getElementById('customDialogConfirmBtn').textContent = 'APPLY →';
    document.getElementById('customDialogModal').classList.add('open');
    setTimeout(function() { inp.focus(); inp.select(); }, 80);
}

function selectCustomPromptQuickVal(val) {
    var inp = document.getElementById('customDialogInput');
    if (inp) inp.value = val;
    confirmCustomDialogAction();
}

function confirmCustomDialogAction() {
    var cb = customDialogCallback;
    var mode = customDialogMode;
    var val = document.getElementById('customDialogInput').value;
    closeCustomDialog();
    if (cb) {
        if (mode === 'prompt') cb(val);
        else cb(true);
    }
}

function closeCustomDialog() {
    document.getElementById('customDialogModal').classList.remove('open');
    customDialogCallback = null;
}

/* ================== 100% COPYRIGHT-FREE PRO STADIUM SFX SYNTHESIZER ================== */
function ensureAudioContext() {
    if (!sharedAudioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) sharedAudioCtx = new AC();
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
}

function playCrowdCheerBuffer(ctx, duration, peakGain) {
    try {
        var bufferSize = Math.floor(ctx.sampleRate * duration);
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        var b0 = 0, b1 = 0, b2 = 0;
        for (var i = 0; i < bufferSize; i++) {
            var white = Math.random() * 2 - 1;
            b0 = 0.997 * b0 + white * 0.029;
            b1 = 0.985 * b1 + white * 0.032;
            b2 = 0.950 * b2 + white * 0.048;
            data[i] = (b0 + b1 + b2 + white * 0.015) * 3.2;
        }
        var noise = ctx.createBufferSource();
        noise.buffer = buffer;
        var filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(950, ctx.currentTime);
        filter.Q.setValueAtTime(0.75, ctx.currentTime);

        var gain = ctx.createGain();
        var now = ctx.currentTime;
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(peakGain || 0.25, now + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.008, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + duration);
    } catch (e) {}
}

function playBatCrackEffect(ctx) {
    try {
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.055);
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.065);
    } catch (e) {}
}

function playSFX(type) {
    if (!settings.sfx) return;
    try {
        var ctx = ensureAudioContext();
        if (!ctx) return;
        var now = ctx.currentTime;

        if (type === 'four') {
            playBatCrackEffect(ctx);
            playCrowdCheerBuffer(ctx, 1.25, 0.22);
            [523.25, 659.25, 783.99, 1046.5].forEach(function(freq, idx) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, now + idx * 0.07);
                g.gain.setValueAtTime(0.18, now + idx * 0.07);
                g.gain.exponentialRampToValueAtTime(0.008, now + idx * 0.07 + 0.25);
                o.connect(g); g.connect(ctx.destination);
                o.start(now + idx * 0.07); o.stop(now + idx * 0.07 + 0.26);
            });
        } else if (type === 'six') {
            playBatCrackEffect(ctx);
            playCrowdCheerBuffer(ctx, 1.9, 0.34);
            [440, 554.37, 659.25, 880, 1108.73].forEach(function(freq, idx) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'sawtooth';
                o.frequency.setValueAtTime(freq, now + idx * 0.08);
                g.gain.setValueAtTime(0.16, now + idx * 0.08);
                g.gain.exponentialRampToValueAtTime(0.008, now + idx * 0.08 + 0.36);
                o.connect(g); g.connect(ctx.destination);
                o.start(now + idx * 0.08); o.stop(now + idx * 0.08 + 0.38);
            });
        } else if (type === 'wicket') {
            [0, 0.05, 0.11].forEach(function(delay, idx) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(420 - idx * 90, now + delay);
                o.frequency.exponentialRampToValueAtTime(85, now + delay + 0.09);
                g.gain.setValueAtTime(0.28, now + delay);
                g.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);
                o.connect(g); g.connect(ctx.destination);
                o.start(now + delay); o.stop(now + delay + 0.11);
            });
            playCrowdCheerBuffer(ctx, 1.4, 0.25);
        } else if (type === 'siren') {
            var osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.linearRampToValueAtTime(880, now + 0.25);
            osc.frequency.linearRampToValueAtTime(420, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(now); osc.stop(now + 0.56);
        } else if (type === 'win') {
            playCrowdCheerBuffer(ctx, 2.4, 0.36);
            [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach(function(freq, idx) {
                var o = ctx.createOscillator(), g = ctx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, now + idx * 0.11);
                g.gain.setValueAtTime(0.22, now + idx * 0.11);
                g.gain.exponentialRampToValueAtTime(0.008, now + idx * 0.11 + 0.32);
                o.connect(g); g.connect(ctx.destination);
                o.start(now + idx * 0.11); o.stop(now + idx * 0.11 + 0.34);
            });
        } else {
            playBatCrackEffect(ctx);
        }
    } catch (e) {}
}

/* ================== FIXED VOICE COMMENTARY (TTS UNLOCK FOR MOBILE) ================== */
var cachedVoices = [];
function initSpeechVoices() {
    if (!('speechSynthesis' in window)) return;
    cachedVoices = window.speechSynthesis.getVoices() || [];
}
if ('speechSynthesis' in window) {
    initSpeechVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = initSpeechVoices;
    }
}

window.addEventListener('pointerdown', function unlockAudioOnce() {
    ensureAudioContext();
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.resume(); } catch (e) {}
    }
    window.removeEventListener('pointerdown', unlockAudioOnce);
}, { once: true });

function speakCommentary(text) {
    var box = document.getElementById('commentaryText');
    if (box) box.textContent = text;
    if (!settings.voice || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        var u = new SpeechSynthesisUtterance(text);
        if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices() || [];
        var engVoice = cachedVoices.find(function(v) { return v.lang && v.lang.toLowerCase().startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.default); }) || cachedVoices.find(function(v) { return v.lang && v.lang.toLowerCase().startsWith('en'); });
        if (engVoice) u.voice = engVoice;
        u.lang = 'en-US';
        u.rate = 1.06;
        u.pitch = 1.05;
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
    } catch (e) {}
}

function testVoiceAudio() {
    settings.voice = true;
    var vTog = document.getElementById('voiceToggle');
    if (vTog) vTog.classList.add('on');
    playSFX('four');
    speakCommentary("Stadium voice commentary and sound effects are live and ready!");
    showToast('🔊 Audio & Voice Active!');
}

/* ================== ADVANCED 4 / 6 / OUT & 50–300 MILESTONE ANIMATIONS ================== */
var eventPopupTimer = null;
function showEventPopup(type, subText) {
    var box = document.getElementById('eventPopupBox');
    if (!box) return;
    var iconEl = document.getElementById('eventPopupIcon');
    var titleEl = document.getElementById('eventPopupTitle');
    var subEl = document.getElementById('eventPopupSub');

    box.style.display = 'none';
    box.classList.remove('anim-four', 'anim-six', 'anim-wicket');
    void box.offsetWidth;

    if (type === 'four') {
        iconEl.textContent = '🔥';
        titleEl.textContent = 'CRACKING FOUR!';
        titleEl.style.color = '#f5c542';
        box.style.borderColor = '#f5c542';
        box.style.boxShadow = '0 24px 60px rgba(0,0,0,0.92), 0 0 42px rgba(245,197,66,0.55)';
        subEl.textContent = subText || 'RACES TO THE BOUNDARY FENCE';
        box.classList.add('anim-four');
    } else if (type === 'six') {
        iconEl.textContent = '🚀';
        titleEl.textContent = 'MASSIVE SIX!';
        titleEl.style.color = '#c084fc';
        box.style.borderColor = '#a855f7';
        box.style.boxShadow = '0 24px 60px rgba(0,0,0,0.92), 0 0 48px rgba(168,85,247,0.65)';
        subEl.textContent = subText || 'LAUNCHED OUT OF THE STADIUM!';
        box.classList.add('anim-six');
        launchConfetti();
    } else if (type === 'wicket') {
        iconEl.textContent = '💥';
        titleEl.textContent = 'OUT! WICKET!';
        titleEl.style.color = '#ff2d55';
        box.style.borderColor = '#ff2d55';
        box.style.boxShadow = '0 24px 60px rgba(0,0,0,0.92), 0 0 48px rgba(255,45,85,0.65)';
        subEl.textContent = subText || 'STUMPS SHATTERED!';
        box.classList.add('anim-wicket');
    }
    box.style.display = 'block';
    if (eventPopupTimer) clearTimeout(eventPopupTimer);
    eventPopupTimer = setTimeout(function() {
        box.style.display = 'none';
        box.classList.remove('anim-four', 'anim-six', 'anim-wicket');
    }, 1550);
}

function triggerImpactEffect(type) {
    if (type === 'six' || type === 'win') launchConfetti();
}

function launchConfetti() {
    var canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var pieces = [], colors = ['#f5c542', '#ff2d55', '#0a84ff', '#00e676', '#a855f7'];
    for (var i = 0; i < 55; i++) {
        pieces.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height, w: 6 + Math.random() * 5, h: 6 + Math.random() * 5, color: colors[Math.floor(Math.random() * colors.length)], vy: 4 + Math.random() * 4.5, vx: -2.2 + Math.random() * 4.4 });
    }
    var frames = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces.forEach(function(p) { p.y += p.vy; p.x += p.vx; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.w, p.h); });
        frames++;
        if (frames < 75) requestAnimationFrame(draw);
        else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
    }
    draw();
}

var batRaiseTimer = null;
function showBatRaise(runs, playerName) {
    var box = document.getElementById('batRaiseAnimBox');
    if (!box) return;
    var milestoneTitles = {
        50: '🔥 HALF CENTURY • 50!',
        100: '💯 SENSATIONAL CENTURY • 100!',
        150: '⚡ TITANIC 150 RUNS!',
        200: '👑 DOUBLE CENTURY • 200!',
        250: '🌋 MONSTER 250 RUNS!',
        300: '🏆 TRIPLE CENTURY • 300!'
    };
    var label = milestoneTitles[runs] || (runs + ' RUNS!');
    box.style.display = 'none';
    void box.offsetWidth;
    document.getElementById('batRaiseText').textContent = label;
    document.getElementById('batRaisePlayer').textContent = playerName.toUpperCase() + ' RAISES THE BAT!';
    box.style.display = 'block';
    playSFX('win');
    launchConfetti();
    speakCommentary('What a landmark! ' + playerName + ' reaches ' + runs + ' runs!');
    if (batRaiseTimer) clearTimeout(batRaiseTimer);
    batRaiseTimer = setTimeout(function() { box.style.display = 'none'; }, 2800);
}

var COMMENTARY_BANK = {
    dot: ["Dot ball! Right on the money, no run.", "Solid defense straight back down the pitch.", "Beaten on the outside edge! Superb delivery.", "Tight line and length, keeps the scoring in check."],
    one: ["Quick single taken! Smart rotation of strike.", "Pushed into the gap for a comfortable single.", "Tapped softly to the leg side for one."],
    two: ["Driven into the deep and they come back hard for two!", "Placed nicely in the gap, hustling back for the second run!"],
    three: ["Timed into the big pocket! Three runs added to the scoreboard!", "Superb placement and brilliant running, three runs taken!"],
    four: ["Cracking shot! Races away to the fence for FOUR!", "Shot of authority! Splits the gap for a glorious boundary!", "Pure timing! Bullet to the boundary rope for FOUR!"],
    six: ["MASSIVE SIX! Launched high and handsome into the stands!", "Out of the park! Sent into orbit for SIX!", "BOOM! Clean strike right off the sweet spot for a maximum!"],
    wd: ["Wide ball signalled! Drifting way down the leg side.", "Strays off target, umpire stretches the arms for a wide."],
    nb: ["No ball called! Overstepped the crease, Free Hit coming up!", "Siren goes off for a No Ball! Next delivery is a Free Hit!"],
    wicket: ["OUT! Clean breakthrough! The stumps are shattered!", "GONE! Huge wicket right when it mattered most!", "UP GOES THE FINGER! Big dismissal shakes up the innings!"],
    start: ["The players are set, umpire calls play, let the clash begin!", "We are live from the stadium! First ball coming right up!"],
    inningsBreak: ["End of the first innings! A thrilling chase is set up next!"],
    finish: ["And that wraps up an unforgettable clash of champions!", "What a finish! A masterclass performance seals the victory!"]
};

var lastSpokenPhrase = '';
function pickRandomCommentary(cat) {
    var arr = COMMENTARY_BANK[cat] || COMMENTARY_BANK.dot;
    var pick = arr[Math.floor(Math.random() * arr.length)];
    if (arr.length > 1 && pick === lastSpokenPhrase) pick = arr[(arr.indexOf(pick) + 1) % arr.length];
    lastSpokenPhrase = pick;
    return pick;
}

/* ================== 113 MASTER BADGES ================== */
var MASTER_BADGES = [
    { id: '🎖️ 10-Match Veteran', icon: '🎖️', title: '10-Match Veteran', desc: 'Play 10+ clashes', check: function(c) { return (c.matches || 0) >= 10; } },
    { id: '👑 25-Clash Legend', icon: '👑', title: '25-Clash Legend', desc: 'Play 25+ matches', check: function(c) { return (c.matches || 0) >= 25; } },
    { id: '🏏 100R Club', icon: '🏏', title: '100 Runs Club', desc: 'Score 100+ runs', check: function(c) { return (c.runs || 0) >= 100; } },
    { id: '⚡ 500R Titan', icon: '⚡', title: '500 Runs Titan', desc: 'Score 500+ runs', check: function(c) { return (c.runs || 0) >= 500; } },
    { id: '🔥 Half-Century Hero', icon: '🔥', title: 'Half-Century Hero', desc: 'Score 50+ in an innings', check: function(c) { return (c.fifties || 0) >= 1 || (c.best || 0) >= 50; } },
    { id: '💯 Century Maker', icon: '💯', title: 'Century Maker', desc: 'Score 100+ in an innings', check: function(c) { return (c.hundreds || 0) >= 1 || (c.best || 0) >= 100; } },
    { id: '💥 6-Sixes Blitz', icon: '💥', title: '6-Sixes Blitz', desc: '6+ Sixes in a match', check: function(c) { return !!c.sixBlitz || (c.maxSixesInMatch || 0) >= 6; } },
    { id: '🚀 Sixer King', icon: '🚀', title: 'Sixer King', desc: 'Hit 10+ Sixes', check: function(c) { return (c.sixes || 0) >= 10; } },
    { id: '☄️ 50-Sixes Monster', icon: '☄️', title: '50-Sixes Monster', desc: 'Hit 50+ Sixes', check: function(c) { return (c.sixes || 0) >= 50; } },
    { id: '🎯 Strike Bowler', icon: '🎯', title: 'Strike Bowler', desc: 'Take 5+ wickets', check: function(c) { return (c.wickets || 0) >= 5; } },
    { id: '🖐️ 5-Wicket Haul', icon: '🖐️', title: '5-Wicket Haul', desc: '5+ wickets in a match', check: function(c) { return (c.fiveWicketHauls || 0) >= 1; } },
    { id: '🟣 25W Viper', icon: '🟣', title: '25-Wicket Viper', desc: 'Take 25+ wickets', check: function(c) { return (c.wickets || 0) >= 25; } },
    { id: '🌋 God Mode', icon: '🌋', title: 'God Mode Streak', desc: 'Win 5 matches in a row', check: function(c) { return (c.maxStreak || 0) >= 5; } }
];

(function build100MoreBadges() {
    [10, 25, 50, 75, 150, 200, 250, 300, 400, 600, 750, 1000, 1250, 1500, 1750, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 8500, 10000, 12000].forEach(function(r) {
        MASTER_BADGES.push({ id: '🏏 ' + r + 'R Milestone', icon: '🏏', title: r + ' Career Runs', desc: 'Score ' + r + '+ runs', check: function(c) { return (c.runs || 0) >= r; } });
    });
    [1, 3, 5, 15, 20, 25, 30, 40, 60, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500, 600].forEach(function(s) {
        MASTER_BADGES.push({ id: '🚀 ' + s + ' Sixes Club', icon: '🚀', title: s + ' Career Sixes', desc: 'Smash ' + s + '+ Sixes', check: function(c) { return (c.sixes || 0) >= s; } });
    });
    [1, 5, 10, 15, 25, 35, 50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 750, 900, 1000].forEach(function(f) {
        MASTER_BADGES.push({ id: '⚡ ' + f + ' Fours Club', icon: '⚡', title: f + ' Boundary Fours', desc: 'Hit ' + f + '+ Fours', check: function(c) { return (c.fours || 0) >= f; } });
    });
    [1, 3, 10, 15, 20, 30, 40, 50, 60, 75, 100, 125, 150, 200, 250, 300, 400, 500].forEach(function(w) {
        MASTER_BADGES.push({ id: '🎯 ' + w + 'W Hunter', icon: '🎯', title: w + ' Career Wickets', desc: 'Take ' + w + '+ wickets', check: function(c) { return (c.wickets || 0) >= w; } });
    });
    [1, 3, 5, 15, 20, 30, 40, 50, 75, 100, 150, 200].forEach(function(m) {
        MASTER_BADGES.push({ id: '🏟️ ' + m + ' Caps', icon: '🏟️', title: m + ' Matches Played', desc: 'Play ' + m + '+ matches', check: function(c) { return (c.matches || 0) >= m; } });
    });
    [1, 3, 5, 10, 25].forEach(function(w) {
        MASTER_BADGES.push({ id: '🏆 ' + w + ' Victories', icon: '🏆', title: w + ' Match Wins', desc: 'Win ' + w + '+ clashes', check: function(c) { return (c.wins || 0) >= w; } });
    });
})();

function checkAndAwardBadges(pl) {
    if (!pl || !pl.career) return;
    pl.career.badges = [];
    MASTER_BADGES.forEach(function(b) { if (b.check(pl.career)) pl.career.badges.push(b.id); });
}

/* ================== PERSISTENCE & 24H PAUSE AUTO-CLEANUP ================== */
function cleanupExpiredPausedMatches() {
    var nowMs = Date.now();
    var beforeLen = pausedMatches.length;
    pausedMatches = pausedMatches.filter(function(m) {
        if (!m.pausedAt) {
            m.pausedAt = nowMs;
            return true;
        }
        var expired = (nowMs - m.pausedAt) > DAY_MS;
        if (expired && database && m.hostRoomCode) {
            try { database.ref('live_rooms/' + m.hostRoomCode).remove(); } catch (e) {}
        }
        return !expired;
    });
    if (pausedMatches.length !== beforeLen) saveAll(true);
}

function loadPersistentData() {
    try { var s = localStorage.getItem('cric_settings_v30'); if (s) settings = Object.assign(settings, JSON.parse(s)); } catch (e) {}
    try { var h = localStorage.getItem('cric_clash_history_v10'); if (h) matchHistory = JSON.parse(h) || []; } catch (e) { matchHistory = []; }
    try { var pm = localStorage.getItem('cric_paused_matches_v30'); if (pm) pausedMatches = JSON.parse(pm) || []; } catch (e) { pausedMatches = []; }
    cleanupExpiredPausedMatches();
    try {
        var savedTotal = parseInt(localStorage.getItem('cric_total_alltime_v30'));
        totalAllTimeMatches = (!isNaN(savedTotal) && savedTotal >= matchHistory.length) ? savedTotal : matchHistory.length;
    } catch (e) { totalAllTimeMatches = matchHistory.length; }
    try {
        var p = localStorage.getItem('cric_clash_players_v10');
        if (p) players = JSON.parse(p) || [];
        players.forEach(function(pl) {
            if (!pl.career) pl.career = { matches: 0, runs: 0, balls: 0, fours: 0, sixes: 0, best: 0, wins: 0, fifties: 0, hundreds: 0, ducks: 0, streak: 0, maxStreak: 0, badges: [], wickets: 0, ballsBowled: 0, runsConceded: 0, form: [], fiveWicketHauls: 0, sixBlitz: false, maxSixesInMatch: 0 };
            if (!pl.career.form) pl.career.form = [];
            if (!pl.career.badges) pl.career.badges = [];
            if (!pl.theme) pl.theme = '#f5c542';
            checkAndAwardBadges(pl);
        });
    } catch (e) { players = []; }
    try {
        var l = localStorage.getItem('cric_league_v11');
        if (l) leagues = JSON.parse(l) || [];
        leagues.forEach(ensureLeagueStructure);
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
        localStorage.setItem('cric_total_alltime_v30', String(totalAllTimeMatches));
        if (!silent && currentGmailUser && settings.autoSave) cloudBackup(true);
    } catch (e) {}
}

function saveSettings() {
    try { localStorage.setItem('cric_settings_v30', JSON.stringify(settings)); } catch (e) {}
}

window.addEventListener('beforeunload', function() {
    if (isStrictSpectatorLinkMode) return;
    if (matchActive) {
        saveLiveState();
        if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(true);
    }
    saveAll(true);
});

/* ================== UI NAVIGATION, SLIDE ANIMATIONS & THEMES ================== */
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

function triggerTabSlideAnim(el) {
    if (!el) return;
    el.classList.remove('tab-slide-anim');
    void el.offsetWidth;
    el.classList.add('tab-slide-anim');
}

function toggleCustomOversInput(selectId, inputId) {
    var sel = document.getElementById(selectId), inp = document.getElementById(inputId);
    if (!sel || !inp) return;
    if (sel.value === 'custom') { inp.style.display = 'block'; inp.focus(); }
    else inp.style.display = 'none';
}

function getResolvedOversValue(selectId, inputId) {
    var sel = document.getElementById(selectId), inp = document.getElementById(inputId);
    if (sel && sel.value === 'custom') {
        var v = parseInt(inp ? inp.value : '');
        return (!v || v < 1) ? null : v;
    }
    return parseInt(sel ? sel.value : '10') || 10;
}

function showPage(pageId) {
    var nextIdx = PAGE_ORDER.indexOf(pageId);
    var isGoingLeft = (nextIdx !== -1 && nextIdx < lastPageIndex);
    if (nextIdx !== -1) lastPageIndex = nextIdx;

    document.querySelectorAll('.page').forEach(function(p) {
        p.classList.remove('active', 'slide-left');
    });
    var target = document.getElementById(pageId + 'Page');
    if (target) {
        void target.offsetWidth;
        if (isGoingLeft) target.classList.add('slide-left');
        target.classList.add('active');
    }

    document.querySelectorAll('#mainBottomNav button').forEach(function(b) { b.classList.remove('active'); });
    var activeNav = document.getElementById('nav' + pageId.charAt(0).toUpperCase() + pageId.slice(1));
    if (activeNav) activeNav.classList.add('active');

    var bottomNav = document.getElementById('mainBottomNav'), floatingHud = document.getElementById('floatingHud');
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
    if (key === 'voice' && settings.voice) speakCommentary('Voice commentary enabled');
    showToast((settings[key] ? '✅ Enabled ' : '❌ Disabled ') + key.toUpperCase());
}

/* ================== PUBLIC LIVE HUB ================== */
function switchPublicHubTab(tab) {
    activePublicHubTab = tab;
    var btnLive = document.getElementById('pubHubTab_live'), btnHist = document.getElementById('pubHubTab_history');
    var liveBox = document.getElementById('publicHubLiveContent'), histBox = document.getElementById('publicHubHistoryContent');
    if (btnLive) btnLive.classList.toggle('active', tab === 'live');
    if (btnHist) btnHist.classList.toggle('active', tab === 'history');
    if (liveBox) {
        liveBox.style.display = (tab === 'live') ? 'block' : 'none';
        if (tab === 'live') triggerTabSlideAnim(liveBox);
    }
    if (histBox) {
        histBox.style.display = (tab === 'history') ? 'block' : 'none';
        if (tab === 'history') triggerTabSlideAnim(histBox);
    }
    refreshPublicHubFeed();
}

function refreshPublicHubFeed() {
    var liveBox = document.getElementById('publicHubLiveContent'), histBox = document.getElementById('publicHubHistoryContent');
    if (!liveBox || !histBox) return;
    if (!database) {
        liveBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">📴 Offline Mode</div>';
        histBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">📴 Offline Mode</div>';
        return;
    }
    var nowMs = Date.now();
    database.ref('live_rooms').limitToLast(25).once('value', function(snap) {
        var val = snap.val(), publicRooms = [];
        if (val) {
            Object.keys(val).forEach(function(k) {
                var r = val[k];
                if (!r) return;
                var code = r.roomCode || k, tA = r.teamA || '', tB = r.teamB || '';
                var refTime = r.pausedAt || r.updatedAt || 0;
                if (!tA || !tB || tA === 'undefined' || tB === 'undefined' || code === 'undefined' || !refTime || (nowMs - refTime) > DAY_MS || r.ended || r.aborted) {
                    try { database.ref('live_rooms/' + k).remove(); } catch (e) {}
                    return;
                }
                if (r.privacy === 'public') {
                    publicRooms.push({
                        roomCode: code, teamA: tA, teamB: tB, battingTeam: r.battingTeam || tA,
                        score: r.score || '0/0', overs: r.overs || '0.0', striker: r.striker || '',
                        bowler: r.bowler || '', paused: !!r.paused
                    });
                }
            });
        }
        if (!publicRooms.length) {
            liveBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">No active public matches right now.</div>';
        } else {
            liveBox.innerHTML = publicRooms.reverse().map(function(r) {
                var statusTag = r.paused ? '<span class="badge gold" style="font-size:7px;margin-left:4px">⏸️ PAUSED</span>' : '<span class="badge dark" style="font-size:7px;color:#00e676;border-color:#00e676;margin-left:4px">● LIVE</span>';
                return '<div style="padding:9px 10px;background:var(--pill-bg);border:1px solid var(--border);border-radius:12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">' +
                    '<div><div style="font-size:11px;font-weight:900;color:var(--gold)">🔴 #' + r.roomCode + ' • ' + r.teamA + ' vs ' + r.teamB + statusTag + '</div>' +
                    '<div style="font-size:10px;color:#fff;font-weight:800;margin-top:2px">' + r.battingTeam + ': ' + r.score + ' (' + r.overs + ' ov)</div>' +
                    (r.striker ? '<div style="font-size:8px;color:var(--muted);margin-top:2px">🏏 ' + r.striker + (r.bowler ? ' • 🎯 ' + r.bowler : '') + '</div>' : '') + '</div>' +
                    '<button class="btn gold" style="padding:6px 10px;font-size:9px" onclick="openFullSpectatorScreen(\'' + r.roomCode + '\', false)">📺 WATCH</button></div>';
            }).join('');
        }
    });

    database.ref('public_finished_matches').limitToLast(20).once('value', function(snap) {
        var val = snap.val();
        publicFinishedMatches = [];
        if (val) {
            Object.keys(val).forEach(function(k) {
                var m = val[k];
                if (m && m.teamA && m.teamB && m.teamA !== 'undefined') publicFinishedMatches.push(m);
                else { try { database.ref('public_finished_matches/' + k).remove(); } catch (e) {} }
            });
            publicFinishedMatches.reverse();
        }
        if (!publicFinishedMatches.length) {
            histBox.innerHTML = '<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">No finished public matches yet.</div>';
        } else {
            histBox.innerHTML = publicFinishedMatches.map(function(m, idx) {
                return '<div style="padding:8px 10px;background:var(--pill-bg);border:1px solid var(--border);border-radius:12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">' +
                    '<div><div style="font-size:11px;font-weight:900">' + m.teamA + ' vs ' + m.teamB + '</div>' +
                    '<div style="font-size:9px;color:var(--gold);font-weight:800">🏆 ' + m.winner + ' • ' + m.inn1Score + (m.inn2Score ? ' | ' + m.inn2Score : '') + '</div></div>' +
                    '<button class="btn light" style="padding:5px 9px;font-size:8px" onclick="openPublicHistoryScorecard(' + idx + ')">📋 CARD</button></div>';
            }).join('');
        }
    });
}

function openPublicHistoryScorecard(idx) {
    var m = publicFinishedMatches[idx];
    if (m) renderScorecardModalFromRecord(m);
}

/* ================== PLAYER ROSTER & PROFILES ================== */
function renderThemeChips(containerId, activeColor, callbackName) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = TEAM_THEMES.map(function(t) {
        var active = (t.color.toLowerCase() === activeColor.toLowerCase()) ? 'border:2px solid #fff;transform:scale(1.1);' : 'border:1px solid rgba(255,255,255,0.28);';
        return '<div onclick="' + callbackName + '(\'' + t.color + '\')" style="width:25px;height:25px;border-radius:50%;background:' + t.color + ';cursor:pointer;' + active + '" title="' + t.name + '"></div>';
    }).join('');
}

function selectTheme(col) {
    selectedTheme = col;
    var picker = document.getElementById('customColorPicker');
    if (picker && col.startsWith('#')) picker.value = col;
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
    if (players.some(function(p) { return p.name.toLowerCase() === name.toLowerCase(); })) return showToast('⚠️ Player already exists!');
    players.push({
        id: 'pl_' + Date.now(), name: name, avatar: tempAvatar, theme: selectedTheme,
        career: { matches: 0, runs: 0, balls: 0, fours: 0, sixes: 0, best: 0, wins: 0, fifties: 0, hundreds: 0, ducks: 0, streak: 0, maxStreak: 0, badges: [], wickets: 0, ballsBowled: 0, runsConceded: 0, form: [], fiveWicketHauls: 0, sixBlitz: false, maxSixesInMatch: 0 }
    });
    nameInp.value = ''; tempAvatar = null;
    var prev = document.getElementById('avatarPreview');
    if (prev) prev.innerHTML = '?';
    saveAll(); renderProfiles(); refreshHomeUI();
    showToast('✅ Added ' + name);
}

function getAvatarHTML(p, size, fontSize) {
    size = size || 38; fontSize = fontSize || 13;
    var rawCol = (p && p.theme) ? p.theme : '#f5c542';
    var safeCol = getReadableThemeColor(rawCol);
    if (p && p.avatar) return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px;border-color:' + safeCol + ';overflow:hidden"><img src="' + p.avatar + '" style="width:100%;height:100%;object-fit:cover"></div>';
    var initials = p && p.name ? p.name.substring(0, 2).toUpperCase() : '?';
    return '<div class="avatar" style="width:' + size + 'px;height:' + size + 'px;font-size:' + fontSize + 'px;border-color:' + safeCol + ';color:' + safeCol + '">' + initials + '</div>';
}

function renderProfiles() {
    var list = document.getElementById('profilesList');
    if (!list) return;
    if (!players.length) {
        list.innerHTML = '<div style="text-align:center;color:var(--muted);padding:14px;font-size:10px">No players yet. Add above!</div>';
        return;
    }
    list.innerHTML = players.map(function(p, idx) {
        var c = p.career || {}, sr = c.balls ? ((c.runs / c.balls) * 100).toFixed(1) : '0.0', avg = c.matches ? (c.runs / c.matches).toFixed(1) : '0.0';
        var safeCol = getReadableThemeColor(p.theme || '#f5c542');
        var radar = computePlayerRadarMetrics(p);
        return '<div class="player-row" style="display:flex;justify-content:space-between;align-items:center;padding:9px;background:var(--pill-bg);border-radius:14px;margin-bottom:6px;border-left:3.5px solid ' + safeCol + '">' +
            '<div style="display:flex;gap:9px;align-items:center;cursor:pointer;flex:1" onclick="openPlayerDetail(' + idx + ')">' +
            getAvatarHTML(p, 42, 14) +
            '<div><div style="font-weight:900;font-size:12px;color:' + safeCol + '">' + p.name + ' <span class="badge gold" style="font-size:8px;padding:1px 6px;margin-left:3px">OVR ' + radar.ovr + '</span></div>' +
            '<div style="font-size:9px;color:var(--muted)">M:' + (c.matches || 0) + ' • R:' + (c.runs || 0) + ' • AVG:' + avg + ' • SR:' + sr + ' • W:' + (c.wickets || 0) + '</div></div></div>' +
            '<div style="display:flex;gap:4px">' +
            '<button class="btn light" style="padding:5px 8px;font-size:9px" onclick="openEditPlayer(' + idx + ')">✏️</button>' +
            '<button class="btn red" style="padding:5px 8px;font-size:9px" onclick="deletePlayer(' + idx + ')">🗑️</button></div></div>';
    }).join('');
}

function deletePlayer(idx) {
    if (!players[idx]) return;
    openCustomConfirm('🗑️', 'DELETE PLAYER?', 'Remove "' + players[idx].name + '" from your registered roster?', 'DELETE', function() {
        players.splice(idx, 1);
        saveAll(); renderProfiles(); refreshHomeUI();
        showToast('🗑️ Player removed');
    });
}

function openEditPlayer(idx) {
    editIndex = idx;
    var p = players[idx];
    editTempAvatar = p.avatar || null; editSelectedTheme = p.theme || '#f5c542';
    document.getElementById('editPName').value = p.name;
    if (editSelectedTheme.startsWith('#')) document.getElementById('editCustomColor').value = editSelectedTheme;
    document.getElementById('editAvatarPreview').innerHTML = editTempAvatar ? '<img src="' + editTempAvatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : p.name.substring(0, 2).toUpperCase();
    renderThemeChips('editThemeSelector', editSelectedTheme, 'selectEditTheme');
    document.getElementById('editPlayerModal').classList.add('open');
}
function closeEditPlayer() { document.getElementById('editPlayerModal').classList.remove('open'); }
function selectEditTheme(col) {
    editSelectedTheme = col;
    if (col.startsWith('#')) document.getElementById('editCustomColor').value = col;
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
    players[editIndex].name = n; players[editIndex].avatar = editTempAvatar; players[editIndex].theme = editSelectedTheme;
    saveAll(); closeEditPlayer(); renderProfiles(); refreshHomeUI();
    showToast('✅ Player updated');
}

function openPlayerDetail(idx) {
    var p = players[idx];
    if (!p) return;
    var c = p.career || {};
    checkAndAwardBadges(p);
    var safeCol = getReadableThemeColor(p.theme || '#f5c542');
    var avg = c.matches ? (c.runs / c.matches).toFixed(1) : '0.0', sr = c.balls ? ((c.runs / c.balls) * 100).toFixed(1) : '0.0';
    var winPct = c.matches ? Math.round(((c.wins || 0) / c.matches) * 100) : 0;
    var econ = c.ballsBowled ? ((c.runsConceded / c.ballsBowled) * 6).toFixed(2) : '0.00';
    var oversBowled = Math.floor((c.ballsBowled || 0) / 6) + '.' + ((c.ballsBowled || 0) % 6);
    var radar = computePlayerRadarMetrics(p);

    var allUnlocked = c.badges || [], topFiveBadges = allUnlocked.slice(-5).reverse(), remainingCount = Math.max(0, allUnlocked.length - 5);
    var badgesHtml = topFiveBadges.length ? topFiveBadges.map(function(b) { return '<span class="badge gold" style="font-size:8px;padding:3px 7px;margin:2px">' + b + '</span>'; }).join('') +
        (remainingCount > 0 ? '<span class="badge dark" style="font-size:8px;padding:3px 7px;margin:2px;cursor:pointer" onclick="closePlayerDetail();showPage(\'trophy\')">+' + remainingCount + ' more →</span>' : '')
        : '<span style="font-size:9px;color:var(--muted)">Play matches to unlock badges!</span>';

    var formArr = (c.form || []).slice(-5);
    var formHtml = formArr.length ? formArr.map(function(f) { return '<span class="badge dark" style="font-size:8px;border-color:var(--gold)">' + f + '</span>'; }).join(' ') : '<span style="font-size:8px;color:var(--muted)">No recent innings</span>';

    document.getElementById('playerDetailContent').innerHTML =
        '<div><div style="display:flex;align-items:center;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">' +
        getAvatarHTML(p, 56, 20) +
        '<div style="flex:1"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:17px;color:' + safeCol + '">' + p.name + '</h3><span class="badge gold">OVR ' + radar.ovr + ' • WIN ' + winPct + '%</span></div>' +
        '<div style="font-size:9px;color:var(--muted);margin-top:3px">🏟️ M: <b>' + (c.matches || 0) + '</b> • 🏆 Wins: <b>' + (c.wins || 0) + '</b> • 🔥 Max Streak: <b>' + (c.maxStreak || 0) + '</b></div>' +
        '<div style="margin-top:5px;display:flex;gap:4px;align-items:center"><span style="font-size:8px;color:var(--muted);font-weight:900">FORM:</span> ' + formHtml + '</div></div></div>' +

        '<div style="margin-top:10px;background:rgba(0,0,0,0.32);border:1px solid var(--border);border-radius:16px;padding:8px;text-align:center">' +
        '<div style="font-size:8px;font-weight:900;color:var(--gold);letter-spacing:1px">🕸️ 6-AXIS PRO SKILL RADAR</div>' +
        '<canvas id="playerDetailRadarCanvas" width="260" height="205" style="max-width:100%;display:block;margin:0 auto"></canvas></div>' +

        '<div style="font-size:9px;font-weight:900;color:var(--gold);margin:10px 0 5px">🏏 BATTING CAREER</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">RUNS</div><div style="font-size:13px;font-weight:900">' + (c.runs || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">BEST</div><div style="font-size:13px;font-weight:900;color:var(--gold)">' + (c.best || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">AVG</div><div style="font-size:13px;font-weight:900">' + avg + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">SR</div><div style="font-size:13px;font-weight:900;color:var(--emerald)">' + sr + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">BALLS</div><div style="font-size:12px;font-weight:900">' + (c.balls || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">4s / 6s</div><div style="font-size:12px;font-weight:900">' + (c.fours || 0) + '/' + (c.sixes || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">50s / 100s</div><div style="font-size:12px;font-weight:900">' + (c.fifties || 0) + '/' + (c.hundreds || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">STREAK</div><div style="font-size:12px;font-weight:900;color:#ff9f0a">' + (c.streak || 0) + '🔥</div></div></div>' +
        '<div style="font-size:9px;font-weight:900;color:var(--cyan);margin:10px 0 5px">🎯 BOWLING CAREER</div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px">' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">WICKETS</div><div style="font-size:13px;font-weight:900;color:var(--cyan)">' + (c.wickets || 0) + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">OVERS</div><div style="font-size:13px;font-weight:900">' + oversBowled + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">ECON</div><div style="font-size:13px;font-weight:900">' + econ + '</div></div>' +
        '<div class="stat-pill"><div style="font-size:7px;color:var(--muted)">5W HAULS</div><div style="font-size:13px;font-weight:900;color:var(--gold)">' + (c.fiveWicketHauls || 0) + '</div></div></div>' +
        '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--border)"><div style="font-size:8px;font-weight:900;color:var(--gold);margin-bottom:4px">🎖️ BADGES (' + allUnlocked.length + '/' + MASTER_BADGES.length + ')</div>' +
        '<div style="display:flex;flex-wrap:wrap">' + badgesHtml + '</div></div>' +
        '<button class="btn light uniform-btn" style="margin-top:10px" onclick="closePlayerDetail()">← CLOSE</button></div>';

    document.getElementById('playerDetailModal').classList.add('open');
    setTimeout(function() {
        drawSpiderRadarCanvas('playerDetailRadarCanvas', [{ values: radar.values, stroke: safeCol, fill: 'rgba(245, 197, 66, 0.26)' }]);
    }, 30);
}
function closePlayerDetail() { document.getElementById('playerDetailModal').classList.remove('open'); }

/* ================== INTERACTIVE PLAYER CARDS & 1v2/1v3/1v4/1v5 TEAM LOGIC ================== */
function updateTeamSetupAura(team, col) {
    var safeCol = getReadableThemeColor(col);
    if (team === 'A') {
        teamAColor = col;
        var cardA = document.getElementById('teamASetupCard'), inpA = document.getElementById('setupTeamAName'), listA = document.getElementById('teamAList');
        if (cardA) cardA.style.borderColor = safeCol;
        if (inpA) { inpA.style.borderColor = safeCol; inpA.style.color = safeCol; }
        if (listA) listA.style.borderColor = safeCol;
    } else {
        teamBColor = col;
        var cardB = document.getElementById('teamBSetupCard'), inpB = document.getElementById('setupTeamBName'), listB = document.getElementById('teamBList');
        if (cardB) cardB.style.borderColor = safeCol;
        if (inpB) { inpB.style.borderColor = safeCol; inpB.style.color = safeCol; }
        if (listB) listB.style.borderColor = safeCol;
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
    matchMode = document.getElementById('matchModeSelect').value;
    document.getElementById('setup1v1Area').style.display = (matchMode === '1v1') ? 'block' : 'none';
    document.getElementById('setupTeamArea').style.display = (matchMode === 'team') ? 'block' : 'none';
    document.getElementById('setupFFAArea').style.display = (matchMode === 'ffa') ? 'block' : 'none';
    populateSetupSelectors();
}

function populateSetupSelectors() {
    if (selected1v1StrikerIdx >= players.length) selected1v1StrikerIdx = 0;
    if (selected1v1BowlerIdx >= players.length) selected1v1BowlerIdx = players.length > 1 ? 1 : 0;
    if (players.length > 1 && selected1v1StrikerIdx === selected1v1BowlerIdx) selected1v1BowlerIdx = (selected1v1StrikerIdx + 1) % players.length;
    render1v1CardLists();
    renderMultiSelectLists();
}

function render1v1CardLists() {
    var sList = document.getElementById('setup1v1StrikerList'), bList = document.getElementById('setup1v1BowlerList');
    if (!sList || !bList) return;
    if (!players.length) {
        sList.innerHTML = '<div style="font-size:9px;color:var(--muted);padding:8px;text-align:center">Add players first</div>';
        bList.innerHTML = '<div style="font-size:9px;color:var(--muted);padding:8px;text-align:center">Add players first</div>';
        return;
    }
    sList.innerHTML = players.map(function(p, i) {
        var c = p.career || {}, isSel = (i === selected1v1StrikerIdx);
        return '<div class="adv-pick-card p1v1-pick-item p1v1A-pick-item ' + (isSel ? 'selected' : '') + '" data-name="' + p.name.toLowerCase() + '" onclick="select1v1PlayerCard(\'striker\',' + i + ')">' +
            '<div style="display:flex;align-items:center;gap:7px;min-width:0">' + getAvatarHTML(p, 30, 10) +
            '<div style="min-width:0"><div style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
            '<div style="font-size:8px;color:var(--gold);font-weight:800">🏏' + (c.runs || 0) + 'R</div></div></div><div class="adv-pick-check">✓</div></div>';
    }).join('');

    bList.innerHTML = players.map(function(p, i) {
        var c = p.career || {}, isSel = (i === selected1v1BowlerIdx);
        return '<div class="adv-pick-card p1v1-pick-item p1v1B-pick-item ' + (isSel ? 'selected-teamA' : '') + '" data-name="' + p.name.toLowerCase() + '" onclick="select1v1PlayerCard(\'bowler\',' + i + ')">' +
            '<div style="display:flex;align-items:center;gap:7px;min-width:0">' + getAvatarHTML(p, 30, 10) +
            '<div style="min-width:0"><div style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
            '<div style="font-size:8px;color:var(--cyan);font-weight:800">🎯' + (c.wickets || 0) + 'W</div></div></div><div class="adv-pick-check">✓</div></div>';
    }).join('');

    var b1 = document.getElementById('p1PickedBadge'), b2 = document.getElementById('p2PickedBadge');
    if (b1 && players[selected1v1StrikerIdx]) b1.textContent = players[selected1v1StrikerIdx].name;
    if (b2 && players[selected1v1BowlerIdx]) b2.textContent = players[selected1v1BowlerIdx].name;
}

function select1v1PlayerCard(role, idx) {
    if (role === 'striker') {
        selected1v1StrikerIdx = idx;
        if (selected1v1BowlerIdx === idx && players.length > 1) selected1v1BowlerIdx = (idx + 1) % players.length;
    } else {
        selected1v1BowlerIdx = idx;
        if (selected1v1StrikerIdx === idx && players.length > 1) selected1v1StrikerIdx = (idx + 1) % players.length;
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
        '<input type="checkbox" class="' + inputClass + '" id="cb_' + groupType + '_' + i + '" value="' + i + '" style="display:none;pointer-events:none">' +
        '<div style="display:flex;align-items:center;gap:7px;min-width:0">' + getAvatarHTML(p, 30, 10) +
        '<div style="min-width:0"><div style="font-size:10px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>' +
        '<div style="font-size:8px;color:var(--muted);font-weight:800">🏏' + (c.runs || 0) + ' • 🎯' + (c.wickets || 0) + '</div></div></div><div class="adv-pick-check">✓</div></div>';
}

function toggleInteractivePickCard(groupType, idx, activeClass) {
    var cb = document.getElementById('cb_' + groupType + '_' + idx);
    var card = document.getElementById('pickCard_' + groupType + '_' + idx);
    if (!cb || !card) return;
    var nextState = !card.classList.contains(activeClass);
    cb.checked = nextState;
    card.classList.toggle(activeClass, nextState);

    if (nextState && (groupType === 'A' || groupType === 'B')) {
        var oppGroup = groupType === 'A' ? 'B' : 'A';
        var oppClass = oppGroup === 'A' ? 'selected-teamA' : 'selected-teamB';
        var oppCb = document.getElementById('cb_' + oppGroup + '_' + idx);
        var oppCard = document.getElementById('pickCard_' + oppGroup + '_' + idx);
        if (oppCb && oppCard && oppCard.classList.contains(oppClass)) {
            oppCb.checked = false;
            oppCard.classList.remove(oppClass);
        }
    }
    playSFX('dot');
    updateSquadCounts();
}

function renderMultiSelectLists() {
    var listA = document.getElementById('teamAList'), listB = document.getElementById('teamBList'), listFFA = document.getElementById('ffaPlayersList');
    if (listA && listB) {
        listA.innerHTML = players.map(function(p, i) { return buildInteractivePlayerCardHTML(p, i, 'A'); }).join('');
        listB.innerHTML = players.map(function(p, i) { return buildInteractivePlayerCardHTML(p, i, 'B'); }).join('');
    }
    if (listFFA) listFFA.innerHTML = players.map(function(p, i) { return buildInteractivePlayerCardHTML(p, i, 'FFA'); }).join('');
    updateSquadCounts();
}

function filterSetupPlayerCards(type, query) {
    var q = (query || '').toLowerCase().trim();
    var cls = '.p1v1-pick-item';
    if (type === '1v1A') cls = '.p1v1A-pick-item';
    else if (type === '1v1B') cls = '.p1v1B-pick-item';
    else if (type === 'team') cls = '.squad-pick-item';
    else if (type === 'ffa') cls = '.ffa-pick-item';
    document.querySelectorAll(cls).forEach(function(el) {
        var name = el.getAttribute('data-name') || '';
        el.style.display = name.includes(q) ? 'flex' : 'none';
    });
}

function updateSquadCounts() {
    var aCnt = document.querySelectorAll('.teamA-cb:checked').length;
    var bCnt = document.querySelectorAll('.teamB-cb:checked').length;
    var fCnt = document.querySelectorAll('.ffa-cb:checked').length;
    var bA = document.getElementById('teamACountBadge'), bB = document.getElementById('teamBCountBadge'), bF = document.getElementById('ffaSelectedCountBadge');
    if (bA) bA.textContent = aCnt + ' Picked';
    if (bB) bB.textContent = bCnt + ' Picked';
    if (bF) bF.textContent = fCnt + ' / 11';
    var vsBadge = document.getElementById('teamFormatVsBadge');
    if (vsBadge) {
        vsBadge.textContent = aCnt + ' vs ' + bCnt;
        if (aCnt === 1 && bCnt === 1) {
            vsBadge.style.background = 'rgba(255,45,85,0.25)';
            vsBadge.style.color = '#ff4d6d';
            vsBadge.textContent = '1v1 BLOCKED';
        } else {
            vsBadge.style.background = 'linear-gradient(135deg, var(--gold), var(--gold2))';
            vsBadge.style.color = '#111';
        }
    }
}

function refreshHomeUI() {
    var totalHero = document.getElementById('totalMatchesHero');
    if (totalHero) totalHero.textContent = totalAllTimeMatches;
    populateSetupSelectors();
    renderPausedMatches();
    renderMatchHistory();
    refreshPublicHubFeed();
}

/* ================== MATCH ENGINE & TEAM 1v2/1v3+ VALIDATION ================== */
function createMatchPlayerObj(p) {
    return { id: p.id, name: p.name, avatar: p.avatar || null, theme: p.theme || '#f5c542', runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: '', oversBowled: 0, ballsBowled: 0, runsConceded: 0, wicketsTaken: 0 };
}

function startSetupMatch() {
    if (players.length < 2) { showToast('⚠️ Add at least 2 players first!'); showPage('profiles'); return; }
    var resolvedOvers = getResolvedOversValue('setupOvers', 'customOversInput');
    if (!resolvedOvers) return showToast('⚠️ Enter valid overs!');
    maxOvers = resolvedOvers;
    matchMode = document.getElementById('matchModeSelect').value;
    activeLeagueMatchMeta = null;

    if (matchMode === '1v1') {
        if (selected1v1StrikerIdx === selected1v1BowlerIdx) return showToast('⚠️ Tap two different players!');
        var p1 = players[selected1v1StrikerIdx], p2 = players[selected1v1BowlerIdx];
        teamAName = p1.name; teamBName = p2.name;
        teamA = [createMatchPlayerObj(p1)]; teamB = [createMatchPlayerObj(p2)];
    } else if (matchMode === 'team') {
        teamWicketRule = document.getElementById('teamWicketRuleSelect').value;
        teamAName = document.getElementById('setupTeamAName').value.trim() || 'Team A';
        teamBName = document.getElementById('setupTeamBName').value.trim() || 'Team B';
        var aIdxs = Array.from(document.querySelectorAll('.teamA-cb:checked')).map(function(cb) { return parseInt(cb.value); });
        var bIdxs = Array.from(document.querySelectorAll('.teamB-cb:checked')).map(function(cb) { return parseInt(cb.value); });
        if (aIdxs.length < 1 || bIdxs.length < 1) {
            return showToast('⚠️ Select at least 1 player per side!');
        }
        if (aIdxs.length === 1 && bIdxs.length === 1) {
            return showToast('⚠️ 1v1 not allowed in Team Mode! Pick 1v2, 1v3, 1v4+ or use 1v1 Mode!');
        }
        teamA = aIdxs.map(function(i) { return createMatchPlayerObj(players[i]); });
        teamB = bIdxs.map(function(i) { return createMatchPlayerObj(players[i]); });
    } else if (matchMode === 'ffa') {
        var fIdxs = Array.from(document.querySelectorAll('.ffa-cb:checked')).map(function(cb) { return parseInt(cb.value); });
        if (fIdxs.length < 3 || fIdxs.length > 11) return showToast('⚠️ Select 3 to 11 players for Solo FFA!');
        ffaPlayers = fIdxs.map(function(i) { return createMatchPlayerObj(players[i]); });
        teamAName = 'Solo Free-For-All'; teamBName = fIdxs.length + ' Players';
    }
    isSuperOver = false;
    document.getElementById('broadcastModePromptModal').classList.add('open');
}

function closeBroadcastPromptModal() { document.getElementById('broadcastModePromptModal').classList.remove('open'); }

function selectPreMatchBroadcastMode(privacy) {
    liveBroadcastPrivacy = privacy;
    closeBroadcastPromptModal();
    var badge = document.getElementById('broadcastPrivacyBadge');
    if (badge) {
        if (privacy === 'public') { badge.textContent = '🌐 PUBLIC'; badge.style.background = '#00c853'; badge.style.color = '#fff'; }
        else if (privacy === 'private') { badge.textContent = '🔒 PRIVATE'; badge.style.background = '#0a84ff'; badge.style.color = '#fff'; }
        else { badge.textContent = '📴 OFFLINE'; badge.style.background = 'rgba(255,255,255,0.12)'; badge.style.color = '#ccc'; }
    }
    var shareWrap = document.getElementById('shareLiveBtnWrap');
    if (shareWrap) shareWrap.style.display = (privacy === 'offline') ? 'none' : 'grid';

    if (privacy !== 'offline') {
        hostRoomCode = String(Math.floor(1000 + Math.random() * 9000));
        localStorage.setItem('cric_host_room', hostRoomCode);
        startHostingRoom(true);
    }
    if (matchMode === '1v1') initMatchEngine(teamA, teamB, 0, -1, 0);
    else if (matchMode === 'team') openTeamOpenersModal(teamA, teamB);
    else if (matchMode === 'ffa') { ffaTurnNumber = 0; openFFAPickModal(); }
}

function openTeamOpenersModal(batSq, bowlSq) {
    battingTeam = batSq; bowlingTeam = bowlSq;
    var sSel = document.getElementById('openStrikerSelect'), nsSel = document.getElementById('openNonStrikerSelect'), bSel = document.getElementById('openBowlerSelect');
    sSel.innerHTML = batSq.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
    if (batSq.length === 1) nsSel.innerHTML = '<option value="-1" selected>Solo Batter (1-Man Side)</option>';
    else {
        nsSel.innerHTML = '<option value="-1">None (Solo Batter)</option>' + batSq.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
        nsSel.value = '1';
    }
    bSel.innerHTML = bowlSq.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
    document.getElementById('teamOpenersModal').classList.add('open');
}
function closeTeamOpenersModal() { document.getElementById('teamOpenersModal').classList.remove('open'); }

function syncNonStrikerDropdown() {
    var sIdx = document.getElementById('openStrikerSelect').value, nsSel = document.getElementById('openNonStrikerSelect');
    if (battingTeam.length <= 1) { nsSel.value = '-1'; return; }
    if (nsSel.value === sIdx) nsSel.value = (sIdx === '0') ? '1' : '0';
}

function confirmTeamOpeners() {
    var sIdx = parseInt(document.getElementById('openStrikerSelect').value), nsIdx = parseInt(document.getElementById('openNonStrikerSelect').value), bIdx = parseInt(document.getElementById('openBowlerSelect').value);
    if (sIdx === nsIdx && nsIdx !== -1) return showToast('⚠️ Striker & Non-Striker cannot be same!');
    closeTeamOpenersModal();
    if (!isSecondInnings) initMatchEngine(battingTeam, bowlingTeam, sIdx, nsIdx, bIdx);
    else { cur = sIdx; nonStriker = nsIdx; curBowler = bIdx; updateMatchUI(); if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false); }
}

function openFFAPickModal() {
    var choices = document.getElementById('ffaBatterChoices'), bSel = document.getElementById('ffaBowlerSelect');
    ffaPickedBatterTemp = -1;
    choices.innerHTML = ffaPlayers.map(function(p, i) {
        if (p.out) return '';
        return '<div class="adv-pick-card" id="ffaChoice_' + i + '" onclick="selectFFABatterCard(' + i + ')">' +
            '<div style="display:flex;align-items:center;gap:8px">' + getAvatarHTML(p, 30, 10) + '<div><div style="font-size:11px;font-weight:900">' + p.name + '</div></div></div><span class="badge gold">BAT</span></div>';
    }).join('');
    bSel.innerHTML = ffaPlayers.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
    document.getElementById('ffaPickModal').classList.add('open');
}
function closeFFAPickModal() { document.getElementById('ffaPickModal').classList.remove('open'); }

function selectFFABatterCard(idx) {
    ffaPickedBatterTemp = idx;
    ffaPlayers.forEach(function(_, i) { var el = document.getElementById('ffaChoice_' + i); if (el) el.classList.toggle('selected', i === idx); });
    var bSel = document.getElementById('ffaBowlerSelect');
    if (bSel && parseInt(bSel.value) === idx) bSel.selectedIndex = (idx + 1) % ffaPlayers.length;
    playSFX('dot');
}

function confirmFFANextTurn() {
    if (ffaPickedBatterTemp < 0) return showToast('⚠️ Tap a batter first!');
    var bIdx = parseInt(document.getElementById('ffaBowlerSelect').value);
    if (bIdx === ffaPickedBatterTemp) return showToast('⚠️ Batter cannot bowl to themselves!');
    closeFFAPickModal();
    ffaCurrentBatterIdx = ffaPickedBatterTemp;
    if (ffaTurnNumber === 0) initMatchEngine(ffaPlayers, ffaPlayers, ffaCurrentBatterIdx, -1, bIdx);
    else { cur = ffaCurrentBatterIdx; curBowler = bIdx; currOver = []; overRuns = 0; overWktsCount = 0; partnershipRuns = 0; partnershipBalls = 0; widesCount = 0; noBallsCount = 0; isFreeHit = false; updateMatchUI(); if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false); }
    ffaTurnNumber++;
}

function initMatchEngine(batSq, bowlSq, strikerIdx, nonStrikerIdx, bowlerIdx) {
    battingTeam = batSq; bowlingTeam = bowlSq; cur = strikerIdx; nonStriker = nonStrikerIdx; curBowler = bowlerIdx;
    currOver = []; allBalls = []; overByOver = []; overWickets = []; fowList = []; partnershipRuns = 0; partnershipBalls = 0;
    innings1 = null; isSecondInnings = false; targetToWin = 0; isFreeHit = false; wicketsDown = 0; overRuns = 0; overWktsCount = 0; widesCount = 0; noBallsCount = 0; undoStack = []; matchActive = true; activePausedMatchId = null;
    showPage('match'); updateMatchUI();
    if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false);
    speakCommentary(pickRandomCommentary('start'));
}

function getTotalRuns() {
    if (matchMode === 'ffa') return battingTeam[cur] ? (battingTeam[cur].runs || 0) : 0;
    return battingTeam.reduce(function(sum, p) { return sum + (p.runs || 0); }, 0) + widesCount + noBallsCount;
}

function getLegalBallsCount() {
    if (matchMode === 'ffa') return battingTeam[cur] ? (battingTeam[cur].balls || 0) : 0;
    return allBalls.filter(function(b) { return b.legal; }).length;
}

function formatOvers(balls) { return Math.floor(balls / 6) + '.' + (balls % 6); }

function pushUndoSnapshot() {
    undoStack.push(JSON.stringify({
        battingTeam: battingTeam, bowlingTeam: bowlingTeam, cur: cur, nonStriker: nonStriker, curBowler: curBowler,
        currOver: currOver, allBalls: allBalls, overByOver: overByOver, overWickets: overWickets, fowList: fowList,
        partnershipRuns: partnershipRuns, partnershipBalls: partnershipBalls, wicketsDown: wicketsDown,
        isFreeHit: Boolean(isFreeHit), overRuns: overRuns, overWktsCount: overWktsCount, widesCount: widesCount, noBallsCount: noBallsCount
    }));
    if (undoStack.length > 25) undoStack.shift();
}

function undo() {
    if (!undoStack.length) return showToast('⚠️ Nothing to undo!');
    var snap = JSON.parse(undoStack.pop());
    battingTeam = snap.battingTeam; bowlingTeam = snap.bowlingTeam; cur = snap.cur; nonStriker = snap.nonStriker; curBowler = snap.curBowler;
    currOver = snap.currOver || []; allBalls = snap.allBalls || []; overByOver = snap.overByOver || []; overWickets = snap.overWickets || [];
    fowList = snap.fowList || []; partnershipRuns = snap.partnershipRuns || 0; partnershipBalls = snap.partnershipBalls || 0;
    wicketsDown = snap.wicketsDown || 0; overRuns = snap.overRuns || 0; overWktsCount = snap.overWktsCount || 0;
    widesCount = snap.widesCount || 0; noBallsCount = snap.noBallsCount || 0;

    var lastBall = allBalls.length ? allBalls[allBalls.length - 1] : null;
    isFreeHit = Boolean(snap.isFreeHit) && Boolean(lastBall && lastBall.label === 'NB');

    var fhBadge = document.getElementById('freeHitBadge');
    if (fhBadge) fhBadge.style.display = isFreeHit ? 'inline-block' : 'none';

    updateMatchUI();
    if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false);
    showToast('↩️ Last ball undone');
}

function score(runs) {
    if (!matchActive) return;
    pushUndoSnapshot();
    var batter = battingTeam[cur], bowler = bowlingTeam[curBowler], prevRuns = batter.runs;
    batter.runs += runs; batter.balls += 1;
    if (runs === 4) batter.fours += 1;
    if (runs === 6) batter.sixes += 1;
    bowler.ballsBowled += 1; bowler.runsConceded += runs;
    partnershipRuns += runs; partnershipBalls += 1; overRuns += runs;
    isFreeHit = false;

    var label = runs === 0 ? '•' : String(runs);
    currOver.push(label);
    allBalls.push({ label: label, runs: runs, legal: true, wicket: false, batter: batter.name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });

    var milestones = [50, 100, 150, 200, 250, 300];
    var crossedMilestone = 0;
    for (var mIdx = 0; mIdx < milestones.length; mIdx++) {
        if (prevRuns < milestones[mIdx] && batter.runs >= milestones[mIdx]) {
            crossedMilestone = milestones[mIdx];
        }
    }

    if (crossedMilestone > 0) {
        showBatRaise(crossedMilestone, batter.name);
    } else if (runs === 4) {
        playSFX('four');
        showEventPopup('four', batter.name.toUpperCase() + ' • ' + batter.runs + '(' + batter.balls + ')');
        speakCommentary(pickRandomCommentary('four'));
    } else if (runs === 6) {
        playSFX('six');
        showEventPopup('six', batter.name.toUpperCase() + ' • ' + batter.runs + '(' + batter.balls + ')');
        speakCommentary(pickRandomCommentary('six'));
    } else if (runs === 0) {
        playSFX('dot'); speakCommentary(pickRandomCommentary('dot'));
    } else if (runs === 1) {
        playSFX('dot'); speakCommentary(pickRandomCommentary('one'));
    } else if (runs === 2) {
        playSFX('dot'); speakCommentary(pickRandomCommentary('two'));
    } else {
        playSFX('dot'); speakCommentary(pickRandomCommentary('three'));
    }

    if (runs % 2 === 1 && nonStriker !== -1) swapStrikeInternal();
    checkPostBallProgress();
}

function scoreOverthrow() {
    if (!matchActive) return;
    openCustomPrompt('🚀', 'OVERTHROW RUNS (+OT)', 'Tap a quick overthrow button or enter total runs scored on this delivery:', 2, [2, 3, 5, 6, 7], function(val) {
        var r = parseInt(val);
        if (!isNaN(r) && r > 0) score(r);
    });
}

function extraWd() {
    if (!matchActive) return;
    pushUndoSnapshot();
    var bowler = bowlingTeam[curBowler];
    widesCount += 1; bowler.runsConceded += 1; partnershipRuns += 1; overRuns += 1;
    currOver.push('WD');
    allBalls.push({ label: 'WD', runs: 1, legal: false, wicket: false, batter: battingTeam[cur].name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });
    playSFX('dot'); speakCommentary(pickRandomCommentary('wd'));
    checkPostBallProgress(true);
}

function extraNoBall() {
    if (!matchActive) return;
    pushUndoSnapshot();
    var bowler = bowlingTeam[curBowler];
    noBallsCount += 1; bowler.runsConceded += 1; partnershipRuns += 1; overRuns += 1;
    isFreeHit = true;
    currOver.push('NB');
    allBalls.push({ label: 'NB', runs: 1, legal: false, wicket: false, batter: battingTeam[cur].name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });
    playSFX('siren'); speakCommentary(pickRandomCommentary('nb'));
    checkPostBallProgress(true);
}

function outPlayer() { if (matchActive) document.getElementById('wicketModal').classList.add('open'); }
function closeWicketModal() { document.getElementById('wicketModal').classList.remove('open'); }
function closeNextBatterModal() { document.getElementById('nextBatterModal').classList.remove('open'); }

function confirmWicket(howOut) {
    closeWicketModal();
    if (isFreeHit && howOut !== 'Run Out') { showToast('🚫 FREE HIT! NOT OUT!'); score(0); return; }
    pushUndoSnapshot();
    var batter = battingTeam[cur], bowler = bowlingTeam[curBowler];
    batter.balls += 1; batter.out = true; batter.howOut = howOut + (howOut !== 'Run Out' ? ' b ' + bowler.name : '');
    bowler.ballsBowled += 1;
    if (howOut !== 'Run Out') bowler.wicketsTaken += 1;
    wicketsDown += 1; overWktsCount += 1; isFreeHit = false;
    fowList.push(getTotalRuns() + '/' + wicketsDown + ' (' + batter.name + ')');
    currOver.push('W');
    allBalls.push({ label: 'W', runs: 0, legal: true, wicket: true, batter: batter.name, bowler: bowler.name, over: formatOvers(getLegalBallsCount()) });
    playSFX('wicket');
    showEventPopup('wicket', batter.name.toUpperCase() + ' • ' + howOut.toUpperCase());
    speakCommentary(pickRandomCommentary('wicket'));

    if (matchMode === 'ffa') {
        var remainingFFA = ffaPlayers.filter(function(p) { return !p.out; });
        if (remainingFFA.length === 0) finishFFAMatch();
        else { updateMatchUI(); if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false); openFFAPickModal(); }
        return;
    }

    var maxWkts = isSuperOver ? Math.min(2, battingTeam.length) : ((battingTeam.length === 1) ? 1 : (teamWicketRule === 'standard' ? Math.max(1, battingTeam.length - 1) : battingTeam.length));
    if (wicketsDown >= maxWkts) { updateMatchUI(); endCurrentInnings(); return; }

    var unbatted = battingTeam.map(function(p, i) { return (!p.out && i !== cur && i !== nonStriker) ? i : -1; }).filter(function(i) { return i !== -1; });
    if (unbatted.length > 0) {
        document.getElementById('nextBatterList').innerHTML = unbatted.map(function(idx) {
            return '<button class="btn light uniform-btn" style="justify-content:space-between" onclick="selectNextBatter(' + idx + ')"><span>🏏 ' + battingTeam[idx].name + '</span><span style="font-size:9px;color:var(--gold)">SEND IN</span></button>';
        }).join('');
        document.getElementById('nextBatterModal').classList.add('open');
    } else if (nonStriker !== -1 && !battingTeam[nonStriker].out) {
        cur = nonStriker; nonStriker = -1;
        showToast('🔥 Last Man Stands: ' + battingTeam[cur].name);
        checkPostBallProgress();
    } else endCurrentInnings();
}

function selectNextBatter(idx) { closeNextBatterModal(); cur = idx; partnershipRuns = 0; partnershipBalls = 0; checkPostBallProgress(); }
function swapStrikeInternal() { if (nonStriker === -1) return; var tmp = cur; cur = nonStriker; nonStriker = tmp; }
function switchStrikeBtn() { if (nonStriker === -1) return showToast('⚠️ Solo batter'); swapStrikeInternal(); updateMatchUI(); if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false); }
function quickSwapRoles() { if (matchMode === '1v1') endCurrentInnings(); }

function checkPostBallProgress(isExtra) {
    var totalRuns = getTotalRuns(), legalBalls = getLegalBallsCount();
    if (isSecondInnings && matchMode !== 'ffa' && totalRuns >= targetToWin) { updateMatchUI(); finishFullMatch(); return; }
    if (!isExtra && legalBalls > 0 && legalBalls % 6 === 0) {
        overByOver.push(overRuns); overWickets.push(overWktsCount); swapStrikeInternal();
        var overNum = Math.floor(legalBalls / 6);
        if (overNum >= maxOvers) {
            updateMatchUI();
            if (matchMode === 'ffa') {
                battingTeam[cur].out = true; battingTeam[cur].howOut = 'overs completed';
                var remFFA = ffaPlayers.filter(function(p) { return !p.out; });
                if (remFFA.length === 0) finishFFAMatch();
                else openFFAPickModal();
            } else endCurrentInnings();
            return;
        }
        document.getElementById('overSummaryTitle').textContent = 'END OF OVER ' + overNum;
        document.getElementById('overSummaryBalls').innerHTML = currOver.map(function(b) { return '<span class="badge dark" style="font-size:11px;padding:5px 9px">' + b + '</span>'; }).join('');
        document.getElementById('overSummaryRuns').textContent = overRuns + ' Runs • ' + overWktsCount + ' Wickets';
        document.getElementById('overSummaryModal').classList.add('open');
        currOver = []; overRuns = 0; overWktsCount = 0;
    }
    updateMatchUI();
    if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false);
}

function closeOverSummary() { document.getElementById('overSummaryModal').classList.remove('open'); if (bowlingTeam.length > 1) openChangeBowler(); }
function openChangeBowler() {
    document.getElementById('nextBowlerList').innerHTML = bowlingTeam.map(function(b, i) {
        if (matchMode === 'ffa' && i === cur) return '';
        return '<button class="btn light uniform-btn" style="justify-content:space-between" onclick="selectBowler(' + i + ')"><span>🎯 ' + b.name + '</span><span style="font-size:9px">' + b.wicketsTaken + '-' + b.runsConceded + '</span></button>';
    }).join('');
    document.getElementById('changeBowlerModal').classList.add('open');
}
function closeChangeBowler() { document.getElementById('changeBowlerModal').classList.remove('open'); }
function selectBowler(idx) { curBowler = idx; closeChangeBowler(); updateMatchUI(); if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false); }
function quickNextBowler() {
    if (bowlingTeam.length <= 1) return showToast('⚠️ Only 1 bowler');
    curBowler = (curBowler + 1) % bowlingTeam.length;
    if (matchMode === 'ffa' && curBowler === cur) curBowler = (curBowler + 1) % bowlingTeam.length;
    updateMatchUI();
    if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false);
}

function endCurrentInnings() {
    if (!isSecondInnings) {
        var inn1History = overByOver.slice(); if (currOver.length > 0) inn1History.push(overRuns);
        var inn1WktHist = overWickets.slice(); if (currOver.length > 0) inn1WktHist.push(overWktsCount);
        innings1 = { teamName: teamAName, runs: getTotalRuns(), wickets: wicketsDown, overs: formatOvers(getLegalBallsCount()), balls: getLegalBallsCount(), extras: (widesCount + noBallsCount), fow: fowList.slice(), batting: JSON.parse(JSON.stringify(battingTeam)), bowling: JSON.parse(JSON.stringify(bowlingTeam)), overByOver: inn1History, overWickets: inn1WktHist };
        targetToWin = innings1.runs + 1; isSecondInnings = true; wicketsDown = 0; currOver = []; allBalls = []; overByOver = []; overWickets = []; fowList = []; partnershipRuns = 0; partnershipBalls = 0; overRuns = 0; overWktsCount = 0; widesCount = 0; noBallsCount = 0; isFreeHit = false; undoStack = [];
        showToast('🏏 Target: ' + targetToWin); speakCommentary(pickRandomCommentary('inningsBreak'));
        if (matchMode === '1v1') { battingTeam = teamB; bowlingTeam = teamA; cur = 0; nonStriker = -1; curBowler = 0; updateMatchUI(); if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false); }
        else openTeamOpenersModal(teamB, teamA);
    } else finishFullMatch();
}

function startSuperOver() {
    document.getElementById('superOverModal').classList.remove('open');
    isSuperOver = true; maxOvers = 1;
    if (matchMode === 'ffa') {
        var maxScore = Math.max.apply(null, ffaPlayers.map(function(p) { return p.runs || 0; }));
        var tiedLeaders = ffaPlayers.filter(function(p) { return (p.runs || 0) === maxScore; });
        if (tiedLeaders.length >= 2) ffaPlayers = tiedLeaders;
        ffaPlayers.forEach(function(p) { p.runs = 0; p.balls = 0; p.fours = 0; p.sixes = 0; p.out = false; p.howOut = ''; p.ballsBowled = 0; p.runsConceded = 0; p.wicketsTaken = 0; });
        ffaTurnNumber = 0;
        openFFAPickModal();
        showToast('⚡ FFA SUPER OVER SHOOTOUT!');
        return;
    }
    teamA.forEach(function(p) { p.runs = 0; p.balls = 0; p.fours = 0; p.sixes = 0; p.out = false; p.howOut = ''; p.ballsBowled = 0; p.runsConceded = 0; p.wicketsTaken = 0; });
    teamB.forEach(function(p) { p.runs = 0; p.balls = 0; p.fours = 0; p.sixes = 0; p.out = false; p.howOut = ''; p.ballsBowled = 0; p.runsConceded = 0; p.wicketsTaken = 0; });
    if (matchMode === '1v1') initMatchEngine(teamA, teamB, 0, -1, 0);
    else openTeamOpenersModal(teamA, teamB);
    showToast('⚡ 1-OVER SUPER OVER STARTED!');
}
function closeSuperOverModal() { document.getElementById('superOverModal').classList.remove('open'); }

function computeMatchMVP(rec) {
    if (rec.mode === 'ffa' && rec.ffaData && rec.ffaData.length) {
        var topFfa = rec.ffaData[0];
        return { name: topFfa.name, avatar: topFfa.avatar, theme: topFfa.theme, runs: topFfa.runs || 0, balls: topFfa.balls || 0, wkts: topFfa.wicketsTaken || 0, pts: (topFfa.runs || 0) + ((topFfa.wicketsTaken || 0) * 20) };
    }
    var map = {};
    function addPerf(list, isBat) {
        (list || []).forEach(function(p) {
            if (!map[p.name]) map[p.name] = { name: p.name, avatar: p.avatar, theme: p.theme, runs: 0, balls: 0, wkts: 0, rc: 0, pts: 0 };
            if (isBat) { map[p.name].runs += (p.runs || 0); map[p.name].balls += (p.balls || 0); map[p.name].pts += (p.runs || 0) + ((p.fours || 0) * 2) + ((p.sixes || 0) * 4); }
            else { map[p.name].wkts += (p.wicketsTaken || 0); map[p.name].rc += (p.runsConceded || 0); map[p.name].pts += ((p.wicketsTaken || 0) * 22); }
        });
    }
    if (rec.inn1Data) { addPerf(rec.inn1Data.batting, true); addPerf(rec.inn1Data.bowling, false); }
    if (rec.inn2Data) { addPerf(rec.inn2Data.batting, true); addPerf(rec.inn2Data.bowling, false); }
    var arr = Object.keys(map).map(function(k) { return map[k]; }).sort(function(a, b) { return b.pts - a.pts; });
    return arr[0] || { name: rec.teamA, runs: 0, balls: 0, wkts: 0, pts: 0 };
}

function finishFullMatch() {
    var inn2Runs = getTotalRuns(), inn2Balls = getLegalBallsCount(), inn2OversStr = formatOvers(inn2Balls);
    if (inn2Runs === innings1.runs && !isSuperOver) {
        document.getElementById('superOverModalTitle').textContent = 'MATCH TIED!';
        document.getElementById('superOverModalSub').textContent = 'Scores are level! Start the 1-Over Super Over Eliminator!';
        document.getElementById('superOverModal').classList.add('open');
        return;
    }
    matchActive = false;
    var winner = 'Match Tied', marginText = 'Scores Level';
    if (inn2Runs >= targetToWin) {
        winner = teamBName + (isSuperOver ? ' Won Super Over' : ' Won');
        var wktsLeft = Math.max(1, battingTeam.length - wicketsDown);
        marginText = teamBName + ' won by ' + wktsLeft + ' wicket' + (wktsLeft > 1 ? 's' : '');
    } else if (inn2Runs < innings1.runs) {
        winner = teamAName + (isSuperOver ? ' Won Super Over' : ' Won');
        var runDiff = innings1.runs - inn2Runs;
        marginText = teamAName + ' won by ' + runDiff + ' run' + (runDiff > 1 ? 's' : '');
    }

    var inn2History = overByOver.slice(); if (currOver.length > 0) inn2History.push(overRuns);
    var inn2WktHist = overWickets.slice(); if (currOver.length > 0) inn2WktHist.push(overWktsCount);

    var record = {
        id: 'm_' + Date.now(), date: new Date().toLocaleDateString(), mode: matchMode, privacy: liveBroadcastPrivacy,
        teamA: teamAName, teamB: teamBName, maxOvers: maxOvers,
        inn1Score: innings1.runs + '/' + innings1.wickets + ' (' + innings1.overs + ')',
        inn2Score: inn2Runs + '/' + wicketsDown + ' (' + inn2OversStr + ')',
        winner: winner, margin: marginText, inn1Data: innings1,
        inn2Data: { teamName: teamBName, runs: inn2Runs, wickets: wicketsDown, overs: inn2OversStr, balls: inn2Balls, extras: (widesCount + noBallsCount), fow: fowList.slice(), batting: JSON.parse(JSON.stringify(battingTeam)), bowling: JSON.parse(JSON.stringify(bowlingTeam)), overByOver: inn2History, overWickets: inn2WktHist }
    };
    record.mvp = computeMatchMVP(record);
    matchHistory.unshift(record);
    totalAllTimeMatches++;
    applyMatchCareerDelta(record, 1);

    if (activeLeagueMatchMeta) {
        recordLeagueFixtureResult(activeLeagueMatchMeta.leagueId, activeLeagueMatchMeta.fixtureId, record);
        activeLeagueMatchMeta = null;
    }

    if (database && liveBroadcastPrivacy !== 'offline') {
        try {
            if (liveBroadcastPrivacy === 'public') database.ref('public_finished_matches').push(record);
            if (hostRoomCode) database.ref('live_rooms/' + hostRoomCode).remove();
        } catch (e) {}
    }
    saveAll(); playSFX('win'); triggerImpactEffect('win'); speakCommentary(pickRandomCommentary('finish'));
    showPage('home'); openPostMatchSummaryModal(0);
}

function openPostMatchSummaryModal(idx) {
    var m = matchHistory[idx]; if (!m) return;
    var mvp = m.mvp || computeMatchMVP(m);
    document.getElementById('postMatchSummaryBody').innerHTML =
        '<div style="text-align:center"><div style="font-size:34px">🏆</div><div style="font-size:10px;font-weight:900;color:var(--gold);letter-spacing:1px">OFFICIAL RESULT</div>' +
        '<h2 style="margin:4px 0;font-size:20px;color:#00e676">' + m.winner.toUpperCase() + '</h2><div style="font-size:10px;color:var(--muted);margin-bottom:12px">' + (m.margin || '') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">' +
        '<div class="glass" style="margin:0;padding:10px;border-color:var(--gold)"><div style="font-size:9px;color:var(--muted);font-weight:900">' + m.teamA + '</div><div style="font-size:16px;font-weight:900;margin-top:2px">' + m.inn1Score + '</div></div>' +
        '<div class="glass" style="margin:0;padding:10px;border-color:var(--cyan)"><div style="font-size:9px;color:var(--muted);font-weight:900">' + m.teamB + '</div><div style="font-size:16px;font-weight:900;margin-top:2px">' + m.inn2Score + '</div></div></div>' +
        '<div class="glass" style="margin:0 0 12px;padding:10px;border:1.5px solid var(--gold);display:flex;align-items:center;justify-content:space-between">' +
        '<div style="display:flex;align-items:center;gap:10px">' + getAvatarHTML(mvp, 42, 14) +
        '<div style="text-align:left"><div style="font-size:8px;font-weight:900;color:var(--gold)">🏅 MVP</div><div style="font-size:14px;font-weight:900">' + mvp.name + '</div><div style="font-size:9px;color:var(--muted)">Runs: ' + mvp.runs + ' • Wkts: ' + mvp.wkts + '</div></div></div>' +
        '<div style="font-size:16px;font-weight:900;color:var(--gold)">' + mvp.pts + ' PTS</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<button class="btn light uniform-btn" onclick="closePostMatchSummaryModal();openScorecardModal(' + idx + ')">📋 SCORECARD</button>' +
        '<button class="btn gold uniform-btn" onclick="closePostMatchSummaryModal();openCertificateModal(' + idx + ')">📸 9:16 STORY</button></div>' +
        '<button class="btn dark uniform-btn" style="margin-top:8px" onclick="closePostMatchSummaryModal()">✓ CONTINUE</button></div>';
    document.getElementById('postMatchSummaryModal').classList.add('open');
}
function closePostMatchSummaryModal() { document.getElementById('postMatchSummaryModal').classList.remove('open'); }

function finishFFAMatch() {
    var sorted = ffaPlayers.slice().sort(function(a, b) { return (b.runs || 0) - (a.runs || 0); });
    if (sorted.length >= 2 && (sorted[0].runs || 0) === (sorted[1].runs || 0) && !isSuperOver) {
        var tiedNames = sorted.filter(function(p) { return (p.runs || 0) === (sorted[0].runs || 0); }).map(function(p) { return p.name; }).join(' vs ');
        document.getElementById('superOverModalTitle').textContent = 'FFA LEADERS TIED!';
        document.getElementById('superOverModalSub').textContent = tiedNames + ' tied at ' + sorted[0].runs + ' runs! Play 1-Over Super Over Shootout!';
        document.getElementById('superOverModal').classList.add('open');
        return;
    }

    matchActive = false;
    var winner = sorted[0] ? sorted[0].name + (isSuperOver ? ' Won FFA Super Over' : ' Won (Solo FFA)') : 'Completed';
    var rec = { id: 'm_' + Date.now(), date: new Date().toLocaleDateString(), mode: 'ffa', privacy: liveBroadcastPrivacy, teamA: 'Solo Free-For-All', teamB: sorted.length + ' Players', inn1Score: 'Top: ' + (sorted[0] ? sorted[0].runs : 0) + ' runs', inn2Score: '', winner: winner, ffaData: JSON.parse(JSON.stringify(sorted)) };
    rec.mvp = computeMatchMVP(rec);
    matchHistory.unshift(rec); totalAllTimeMatches++;
    applyMatchCareerDelta(rec, 1);
    if (database && liveBroadcastPrivacy !== 'offline') {
        try {
            if (liveBroadcastPrivacy === 'public') database.ref('public_finished_matches').push(rec);
            if (hostRoomCode) database.ref('live_rooms/' + hostRoomCode).remove();
        } catch (e) {}
    }
    saveAll(); playSFX('win'); triggerImpactEffect('win');
    document.getElementById('ffaPodiumDisplay').innerHTML = sorted.slice(0, 3).map(function(p, i) { return '<div class="stat-pill" style="margin-bottom:4px"><b>#' + (i + 1) + ' ' + p.name + '</b> — ' + p.runs + ' (' + p.balls + ')</div>'; }).join('');
    document.getElementById('ffaFullRankingTable').innerHTML = sorted.map(function(p, i) { return '<div style="display:flex;justify-content:space-between;padding:6px;border-bottom:1px solid var(--border);font-size:11px"><span>#' + (i + 1) + ' ' + p.name + '</span><b>' + p.runs + ' runs (' + p.wicketsTaken + ' wkts)</b></div>'; }).join('');
    document.getElementById('ffaPodiumModal').classList.add('open');
    showPage('home');
}
function closeFFAPodium() { document.getElementById('ffaPodiumModal').classList.remove('open'); }

function applyMatchCareerDelta(rec, sign) {
    players.forEach(function(pl) {
        var foundBat = null, foundBowl = null;
        if (rec.mode === 'ffa' && rec.ffaData) {
            var ffaPl = rec.ffaData.find(function(x) { return x.id === pl.id || x.name === pl.name; });
            if (ffaPl) { foundBat = ffaPl; foundBowl = ffaPl; }
        } else if (rec.inn1Data && rec.inn2Data) {
            foundBat = rec.inn1Data.batting.find(function(x) { return x.id === pl.id || x.name === pl.name; }) || rec.inn2Data.batting.find(function(x) { return x.id === pl.id || x.name === pl.name; });
            foundBowl = rec.inn1Data.bowling.find(function(x) { return x.id === pl.id || x.name === pl.name; }) || rec.inn2Data.bowling.find(function(x) { return x.id === pl.id || x.name === pl.name; });
        }
        if (foundBat || foundBowl) {
            pl.career.matches = Math.max(0, (pl.career.matches || 0) + (1 * sign));
            if (foundBat) {
                pl.career.runs = Math.max(0, (pl.career.runs || 0) + ((foundBat.runs || 0) * sign));
                pl.career.balls = Math.max(0, (pl.career.balls || 0) + ((foundBat.balls || 0) * sign));
                pl.career.fours = Math.max(0, (pl.career.fours || 0) + ((foundBat.fours || 0) * sign));
                pl.career.sixes = Math.max(0, (pl.career.sixes || 0) + ((foundBat.sixes || 0) * sign));
                if (sign > 0 && (foundBat.runs || 0) > (pl.career.best || 0)) pl.career.best = foundBat.runs;
                if ((foundBat.runs || 0) >= 50 && (foundBat.runs || 0) < 100) pl.career.fifties = Math.max(0, (pl.career.fifties || 0) + (1 * sign));
                if ((foundBat.runs || 0) >= 100) pl.career.hundreds = Math.max(0, (pl.career.hundreds || 0) + (1 * sign));
                if (sign > 0 && (foundBat.sixes || 0) >= 6) pl.career.sixBlitz = true;
                if (!pl.career.form) pl.career.form = [];
                if (sign > 0) pl.career.form.push((foundBat.runs || 0) + '(' + (foundBat.balls || 0) + ')');
                else pl.career.form.pop();
            }
            if (foundBowl) {
                pl.career.wickets = Math.max(0, (pl.career.wickets || 0) + ((foundBowl.wicketsTaken || 0) * sign));
                pl.career.ballsBowled = Math.max(0, (pl.career.ballsBowled || 0) + ((foundBowl.ballsBowled || 0) * sign));
                pl.career.runsConceded = Math.max(0, (pl.career.runsConceded || 0) + ((foundBowl.runsConceded || 0) * sign));
                if ((foundBowl.wicketsTaken || 0) >= 5) pl.career.fiveWicketHauls = Math.max(0, (pl.career.fiveWicketHauls || 0) + (1 * sign));
            }
            if (rec.winner && rec.winner.includes(pl.name)) {
                pl.career.wins = Math.max(0, (pl.career.wins || 0) + (1 * sign));
                if (sign > 0) {
                    pl.career.streak = (pl.career.streak || 0) + 1;
                    if (pl.career.streak > (pl.career.maxStreak || 0)) pl.career.maxStreak = pl.career.streak;
                }
            } else if (sign > 0) pl.career.streak = 0;
            checkAndAwardBadges(pl);
        }
    });
}
/* ================== LIVE UI, AI WIN PREDICTOR & CHARTS (PART 2) ================== */
function updateLiveWinPredictor(totalRuns, legalBalls) {
    var box = document.getElementById('winPredictorBox');
    if (!box) return;
    if (matchMode === 'ffa') { box.style.display = 'none'; return; }
    box.style.display = 'block';

    var probA = 50, probB = 50;
    var maxWkts = (battingTeam.length === 1) ? 1 : (teamWicketRule === 'standard' ? Math.max(1, battingTeam.length - 1) : battingTeam.length);
    var wktsLeftRatio = Math.max(0, (maxWkts - wicketsDown) / maxWkts);

    if (!isSecondInnings) {
        if (legalBalls > 0) {
            var crr = (totalRuns / legalBalls) * 6;
            var boost = (crr - 7.5) * 4.2 + (wktsLeftRatio - 0.7) * 20;
            probA = Math.min(88, Math.max(12, Math.round(50 + boost)));
            probB = 100 - probA;
        }
    } else {
        var needed = Math.max(0, targetToWin - totalRuns);
        var remBalls = Math.max(0, (maxOvers === 999 ? 60 : maxOvers * 6) - legalBalls);
        if (needed <= 0) { probB = 100; probA = 0; }
        else if (remBalls <= 0 || wicketsDown >= maxWkts) { probA = 100; probB = 0; }
        else {
            var rrr = (needed / remBalls) * 6;
            var crr2 = legalBalls > 0 ? (totalRuns / legalBalls) * 6 : 6.5;
            var rawProbB = 52 + (crr2 - rrr) * 6.5 + (wktsLeftRatio * 24) - (rrr > 12 ? (rrr - 12) * 5 : 0);
            probB = Math.min(96, Math.max(4, Math.round(rawProbB)));
            probA = 100 - probB;
        }
    }

    var lblA = document.getElementById('winPredTeamA'), lblB = document.getElementById('winPredTeamB');
    var barA = document.getElementById('winPredBarA'), barB = document.getElementById('winPredBarB');
    if (lblA) lblA.textContent = teamAName.toUpperCase() + ' ' + probA + '%';
    if (lblB) lblB.textContent = teamBName.toUpperCase() + ' ' + probB + '%';
    if (barA) barA.style.width = probA + '%';
    if (barB) barB.style.width = probB + '%';
}

function updateMatchUI() {
    var totalRuns = getTotalRuns(), legalBalls = getLegalBallsCount(), oversStr = formatOvers(legalBalls);
    document.getElementById('liveBattingTeamLabel').textContent = matchMode === 'ffa' ? (battingTeam[cur] ? battingTeam[cur].name + ' (SOLO)' : 'FFA') : (isSecondInnings ? teamBName : teamAName);
    document.getElementById('projectedText').textContent = totalRuns + '/' + wicketsDown;
    document.getElementById('overText').textContent = oversStr;
    document.getElementById('maxOverText').textContent = maxOvers === 999 ? '∞' : maxOvers;
    document.getElementById('wicketText').textContent = wicketsDown;
    document.getElementById('extrasCounterBadge').textContent = 'EXTRAS: ' + (widesCount + noBallsCount) + ' (WD:' + widesCount + ' | NB:' + noBallsCount + ')';
    document.getElementById('freeHitBadge').style.display = isFreeHit ? 'inline-block' : 'none';

    var crr = legalBalls > 0 ? ((totalRuns / legalBalls) * 6).toFixed(2) : '0.00';
    document.getElementById('rrText').textContent = 'CRR: ' + crr;

    var infoBox = document.getElementById('inningsInfo');
    if (isSecondInnings && matchMode !== 'ffa') {
        var needed = Math.max(0, targetToWin - totalRuns), remBalls = Math.max(0, (maxOvers * 6) - legalBalls);
        document.getElementById('rrLabel').textContent = 'RRR';
        document.getElementById('reqRRText').textContent = remBalls > 0 ? ((needed / remBalls) * 6).toFixed(2) : '0.00';
        infoBox.style.display = 'block';
        infoBox.textContent = '🎯 TARGET: ' + targetToWin + ' • Need ' + needed + ' in ' + remBalls + ' balls';
    } else {
        document.getElementById('rrLabel').textContent = 'PROJ';
        document.getElementById('reqRRText').textContent = maxOvers !== 999 ? Math.round((legalBalls > 0 ? (totalRuns / legalBalls) * 6 : 6) * maxOvers) : totalRuns;
        infoBox.style.display = 'none';
    }

    updateLiveWinPredictor(totalRuns, legalBalls);

    var b1 = battingTeam[cur];
    if (b1) {
        var b1Col = getReadableThemeColor(b1.theme || '#f5c542');
        document.getElementById('batterName').textContent = b1.name + ' *';
        document.getElementById('batterName').style.color = b1Col;
        document.getElementById('batterStats').textContent = b1.runs + '(' + b1.balls + ') • 4s:' + b1.fours + ' 6s:' + b1.sixes;
        var av1 = document.getElementById('photoAvatar');
        av1.style.borderColor = b1Col;
        av1.innerHTML = b1.avatar ? '<img src="' + b1.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : b1.name.substring(0, 2).toUpperCase();
    }

    var nsRow = document.getElementById('nonStrikerRow'), lastManBadge = document.getElementById('lastManBadge');
    if (nonStriker !== -1 && battingTeam[nonStriker]) {
        var b2 = battingTeam[nonStriker];
        nsRow.style.display = 'flex'; lastManBadge.style.display = 'none';
        document.getElementById('nsName').textContent = b2.name;
        document.getElementById('nsStats').textContent = b2.runs + '(' + b2.balls + ')';
        document.getElementById('photoAvatarNS').innerHTML = b2.avatar ? '<img src="' + b2.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : b2.name.substring(0, 2).toUpperCase();
    } else {
        nsRow.style.display = 'none'; lastManBadge.style.display = 'inline-block';
    }

    document.getElementById('partnershipBadge').textContent = 'Stand: ' + partnershipRuns + '(' + partnershipBalls + ')';
    var bw = bowlingTeam[curBowler];
    if (bw) {
        var bwCol = getReadableThemeColor(bw.theme || '#4285f4');
        document.getElementById('bowlerName').textContent = bw.name;
        document.getElementById('bowlerName').style.color = bwCol;
        document.getElementById('bowlerStats').textContent = bw.wicketsTaken + '-' + bw.runsConceded + ' (' + formatOvers(bw.ballsBowled) + ' ov)';
        var avBw = document.getElementById('bowlerAvatar');
        avBw.style.borderColor = bwCol;
        avBw.innerHTML = bw.avatar ? '<img src="' + bw.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : bw.name.substring(0, 2).toUpperCase();
    }

    document.getElementById('currentOverDots').innerHTML = currOver.map(function(d) {
        var bg = d === 'W' ? '#ff2d55' : (d === '4' || d === '6' ? 'var(--gold)' : 'var(--pill-bg)');
        return '<span style="min-width:26px;height:26px;border-radius:50%;background:' + bg + ';color:' + (d === '4' || d === '6' ? '#111' : '#fff') + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">' + d + '</span>';
    }).join('');
    renderBallTimelineFeed();
}

function openLiveGraphsModal() {
    document.getElementById('liveGraphsModal').classList.add('open');
    var curOversArr = overByOver.slice(), curWktsArr = overWickets.slice();
    if (currOver.length > 0) { curOversArr.push(overRuns); curWktsArr.push(overWktsCount); }
    var inn1Overs = (isSecondInnings && innings1 && innings1.overByOver) ? innings1.overByOver : curOversArr;
    var inn2Overs = isSecondInnings ? curOversArr : [];

    var wormCanvas = document.getElementById('liveWormCanvas');
    if (wormCanvas) {
        var ctx = wormCanvas.getContext('2d'), W = wormCanvas.width, H = wormCanvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
        for (var g = 1; g <= 3; g++) { var gy = (H / 4) * g; ctx.beginPath(); ctx.moveTo(28, gy); ctx.lineTo(W - 10, gy); ctx.stroke(); }
        var maxLen = Math.max(inn1Overs.length, inn2Overs.length, 5);
        var sum1 = inn1Overs.reduce(function(a, b) { return a + b; }, 0), sum2 = inn2Overs.reduce(function(a, b) { return a + b; }, 0);
        var maxY = Math.max(sum1, sum2, 20);
        function drawWormLine(arr, wktArr, color) {
            if (!arr.length) return;
            ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(28, H - 18);
            var cum = 0, pts = [];
            arr.forEach(function(r, idx) {
                cum += r;
                var x = 28 + ((idx + 1) / maxLen) * (W - 42), y = (H - 18) - (cum / maxY) * (H - 36);
                ctx.lineTo(x, y); pts.push({ x: x, y: y, wkts: wktArr ? wktArr[idx] : 0 });
            });
            ctx.stroke();
            pts.forEach(function(pt) { ctx.fillStyle = pt.wkts > 0 ? '#ff2d55' : color; ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.wkts > 0 ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); });
        }
        drawWormLine(inn1Overs, isSecondInnings && innings1 ? innings1.overWickets : curWktsArr, '#f5c542');
        if (isSecondInnings) drawWormLine(inn2Overs, curWktsArr, '#0a84ff');
        ctx.fillStyle = '#aaa'; ctx.font = 'bold 9px Outfit, sans-serif';
        ctx.fillText(maxY + 'R', 2, 16); ctx.fillText('0R', 6, H - 14);
    }

    var barCanvas = document.getElementById('liveRunBarCanvas');
    if (barCanvas) {
        var bctx = barCanvas.getContext('2d'), BW = barCanvas.width, BH = barCanvas.height;
        bctx.clearRect(0, 0, BW, BH);
        var activeBars = curOversArr.length ? curOversArr : [0];
        var maxBarRun = Math.max.apply(null, activeBars.concat([12]));
        var barStep = (BW - 36) / Math.max(activeBars.length, 6), barW = Math.min(24, barStep * 0.65);
        activeBars.forEach(function(r, i) {
            var bh = (r / maxBarRun) * (BH - 34), bx = 24 + i * barStep + 4, by = (BH - 18) - bh;
            bctx.fillStyle = r >= 12 ? '#f5c542' : '#0a84ff'; bctx.fillRect(bx, by, barW, Math.max(2, bh));
            bctx.fillStyle = '#fff'; bctx.font = 'bold 9px Outfit, sans-serif'; bctx.fillText(String(r), bx + 2, by - 4);
            bctx.fillStyle = '#888'; bctx.fillText('O' + (i + 1), bx + 2, BH - 5);
        });
    }
}
function closeLiveGraphsModal() { document.getElementById('liveGraphsModal').classList.remove('open'); }

function setHighlightFilter(f) {
    highlightFilter = f;
    ['all', 'boundaries', 'wickets'].forEach(function(k) { var btn = document.getElementById('hlBtn_' + k); if (btn) btn.classList.toggle('active', k === f); });
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
        return '<div style="padding:5px 8px;background:var(--pill-bg);border-radius:8px;display:flex;justify-content:space-between"><span><b>' + b.over + '</b> ' + b.bowler + ' to ' + b.batter + '</span><b style="color:' + (b.wicket ? '#ff2d55' : (b.runs >= 4 ? 'var(--gold)' : '#fff')) + '">' + b.label + '</b></div>';
    }).join('');
}

/* ================== PAUSE / RESUME (24H EXPIRY) & ABORT ================== */
function saveLiveState() {
    if (!matchActive) return;
    var stateObj = {
        id: activePausedMatchId || ('pm_' + Date.now()),
        savedAt: new Date().toLocaleTimeString(),
        pausedAt: Date.now(),
        hostRoomCode: hostRoomCode,
        liveBroadcastPrivacy: liveBroadcastPrivacy,
        matchMode: matchMode, teamWicketRule: teamWicketRule, teamAName: teamAName, teamBName: teamBName,
        teamA: teamA, teamB: teamB, ffaPlayers: ffaPlayers, battingTeam: battingTeam, bowlingTeam: bowlingTeam,
        cur: cur, nonStriker: nonStriker, curBowler: curBowler, currOver: currOver, allBalls: allBalls,
        overByOver: overByOver, overWickets: overWickets, fowList: fowList, partnershipRuns: partnershipRuns,
        partnershipBalls: partnershipBalls, overRuns: overRuns, overWktsCount: overWktsCount, isFreeHit: isFreeHit,
        innings1: innings1, isSecondInnings: isSecondInnings, targetToWin: targetToWin, maxOvers: maxOvers,
        wicketsDown: wicketsDown, widesCount: widesCount, noBallsCount: noBallsCount
    };
    var idx = pausedMatches.findIndex(function(m) { return m.id === stateObj.id; });
    if (idx >= 0) pausedMatches[idx] = stateObj;
    else pausedMatches.unshift(stateObj);
    activePausedMatchId = stateObj.id;
    saveAll(true);
}

function pauseAndExitToHome() {
    saveLiveState();
    if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(true);
    matchActive = false;
    showToast('⏸️ Match Paused! (Auto-clears after 24h)');
    showPage('home');
}

function resumePausedMatch(id) {
    var m = pausedMatches.find(function(x) { return x.id === id; });
    if (!m) return;
    activePausedMatchId = m.id;
    hostRoomCode = m.hostRoomCode || hostRoomCode;
    liveBroadcastPrivacy = m.liveBroadcastPrivacy || 'offline';
    matchMode = m.matchMode; teamWicketRule = m.teamWicketRule || 'all_out';
    teamAName = m.teamAName; teamBName = m.teamBName; teamA = m.teamA || []; teamB = m.teamB || []; ffaPlayers = m.ffaPlayers || [];
    battingTeam = m.battingTeam; bowlingTeam = m.bowlingTeam; cur = m.cur; nonStriker = m.nonStriker; curBowler = m.curBowler;
    currOver = m.currOver || []; allBalls = m.allBalls || []; overByOver = m.overByOver || []; overWickets = m.overWickets || [];
    fowList = m.fowList || []; partnershipRuns = m.partnershipRuns || 0; partnershipBalls = m.partnershipBalls || 0;
    overRuns = m.overRuns || 0; overWktsCount = m.overWktsCount || 0; isFreeHit = !!m.isFreeHit;
    innings1 = m.innings1; isSecondInnings = m.isSecondInnings; targetToWin = m.targetToWin; maxOvers = m.maxOvers;
    wicketsDown = m.wicketsDown; widesCount = m.widesCount || 0; noBallsCount = m.noBallsCount || 0; matchActive = true;
    pausedMatches = pausedMatches.filter(function(x) { return x.id !== id; });
    saveAll(true); showPage('match'); updateMatchUI();
    if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false);
    showToast('▶️ Match Resumed!');
}

function deletePausedMatch(id) {
    var m = pausedMatches.find(function(x) { return x.id === id; });
    if (m && database && m.hostRoomCode) {
        try { database.ref('live_rooms/' + m.hostRoomCode).remove(); } catch (e) {}
    }
    pausedMatches = pausedMatches.filter(function(x) { return x.id !== id; });
    saveAll(true); renderPausedMatches(); refreshPublicHubFeed();
}

function renderPausedMatches() {
    cleanupExpiredPausedMatches();
    var box = document.getElementById('pausedMatchesContainer');
    if (!box) return;
    if (!pausedMatches.length) { box.innerHTML = ''; return; }
    box.innerHTML = pausedMatches.map(function(m) {
        return '<div style="margin-top:8px;padding:10px;background:rgba(245,197,66,0.12);border:1px solid var(--gold);border-radius:12px;display:flex;justify-content:space-between;align-items:center">' +
            '<div><div style="font-size:10px;font-weight:900;color:var(--gold)">⏸️ PAUSED: ' + m.teamAName + ' vs ' + m.teamBName + '</div><div style="font-size:9px;color:var(--muted)">Saved at ' + m.savedAt + ' (24h auto-expire)</div></div>' +
            '<div style="display:flex;gap:4px"><button class="btn gold" style="padding:6px 10px;font-size:9px" onclick="resumePausedMatch(\'' + m.id + '\')">▶️ RESUME</button>' +
            '<button class="btn red" style="padding:6px 8px;font-size:9px" onclick="deletePausedMatch(\'' + m.id + '\')">✕</button></div></div>';
    }).join('');
}

function renderMatchHistory() {
    var list = document.getElementById('matchHistoryList'), empty = document.getElementById('noMatches');
    if (!list) return;
    if (!matchHistory.length) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';
    list.innerHTML = matchHistory.map(function(m, idx) {
        var mvp = m.mvp || computeMatchMVP(m);
        return '<div style="margin-top:8px;padding:10px;background:var(--pill-bg);border-radius:14px;border:1px solid var(--border)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:11px">' + m.teamA + ' vs ' + m.teamB + '</b><span style="font-size:8px;color:var(--muted)">' + m.date + '</span></div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px"><span style="font-size:10px;color:var(--gold);font-weight:900">🏆 ' + m.winner + '</span><span class="badge dark" style="font-size:8px;color:var(--cyan)">🏅 MVP: ' + mvp.name + '</span></div>' +
            '<div style="font-size:9px;color:var(--muted);margin-top:2px">' + m.inn1Score + (m.inn2Score ? ' • ' + m.inn2Score : '') + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-top:6px">' +
            '<button class="btn light" style="padding:5px 8px;font-size:8px" onclick="openScorecardModal(' + idx + ')">📋 SCORECARD</button>' +
            '<button class="btn gold" style="padding:5px 8px;font-size:8px" onclick="openCertificateModal(' + idx + ')">📸 9:16 STORY</button>' +
            '<button class="btn red" style="padding:5px 8px;font-size:8px" onclick="deleteSingleMatchFromHistory(' + idx + ')">🗑️</button></div></div>';
    }).join('');
}

function clearHistory() {
    if (!matchHistory.length) return showToast('⚠️ Archive is already empty');
    openCustomConfirm('🧹', 'CLEAR ARCHIVE LIST?', 'Clear match archive list? Your Total Clashes count, Player Career Stats & 113 Badges will stay 100% safe!', 'CLEAR LIST', function() {
        matchHistory = [];
        saveAll(); renderMatchHistory(); refreshHomeUI();
        showToast('🧹 Archive cleared (All stats & Total Clashes preserved!)');
    });
}

function deleteSingleMatchFromHistory(idx) {
    var m = matchHistory[idx];
    if (!m) return;
    openCustomConfirm('🗑️', 'DELETE MATCH?', 'Delete "' + m.teamA + ' vs ' + m.teamB + '" and deduct its stats from career records?', 'DELETE', function() {
        applyMatchCareerDelta(m, -1);
        matchHistory.splice(idx, 1);
        totalAllTimeMatches = Math.max(0, totalAllTimeMatches - 1);
        saveAll(); renderMatchHistory(); refreshHomeUI();
        showToast('🗑️ Match deleted');
    });
}

function openScorecardModal(idx) { var m = matchHistory[idx]; if (m) renderScorecardModalFromRecord(m); }

function buildInningsTableHTML(inn, labelColor) {
    if (!inn) return '';
    var batRows = (inn.batting || []).map(function(b) {
        var sr = b.balls ? ((b.runs / b.balls) * 100).toFixed(0) : '0';
        return '<tr><td><div style="font-weight:900;color:#fff">' + b.name + '</div><div style="font-size:8px;color:var(--muted)">' + (b.howOut || 'not out') + '</div></td><td><b>' + b.runs + '</b></td><td>' + b.balls + '</td><td>' + (b.fours || 0) + '</td><td>' + (b.sixes || 0) + '</td><td style="color:var(--gold)">' + sr + '</td></tr>';
    }).join('');
    var bowlRows = (inn.bowling || []).map(function(bw) {
        var ov = Math.floor((bw.ballsBowled || 0) / 6) + '.' + ((bw.ballsBowled || 0) % 6), ec = bw.ballsBowled ? ((bw.runsConceded / bw.ballsBowled) * 6).toFixed(1) : '0.0';
        return '<tr><td style="color:var(--cyan);font-weight:900">' + bw.name + '</td><td>' + ov + '</td><td>' + (bw.runsConceded || 0) + '</td><td><b style="color:#00e676">' + (bw.wicketsTaken || 0) + '</b></td><td>' + ec + '</td></tr>';
    }).join('');
    return '<div class="glass" style="padding:10px;margin-top:8px;border-left:3px solid ' + labelColor + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:11px;font-weight:900;color:' + labelColor + '">🏏 ' + inn.teamName + '</span><span style="font-size:13px;font-weight:900">' + inn.runs + '/' + inn.wickets + ' (' + inn.overs + ')</span></div>' +
        '<table class="pro-score-table"><thead><tr><th>BATTER</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>' + batRows + '</tbody></table>' +
        '<div style="font-size:8px;color:var(--muted);margin:6px 0">Extras: <b>' + (inn.extras || 0) + '</b>' + (inn.fow && inn.fow.length ? ' • FOW: ' + inn.fow.join(', ') : '') + '</div>' +
        '<table class="pro-score-table" style="margin-top:6px"><thead><tr><th>BOWLER</th><th>O</th><th>R</th><th>W</th><th>ECON</th></tr></thead><tbody>' + bowlRows + '</tbody></table></div>';
}

function renderScorecardModalFromRecord(m) {
    var mvp = m.mvp || computeMatchMVP(m), ffaHtml = '';
    if (m.mode === 'ffa' && m.ffaData) {
        ffaHtml = '<div class="glass" style="padding:10px;margin-top:8px"><table class="pro-score-table"><thead><tr><th>PLAYER</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>WKTS</th></tr></thead><tbody>' +
            m.ffaData.map(function(p, i) { return '<tr><td><b>#' + (i + 1) + ' ' + p.name + '</b></td><td><b>' + p.runs + '</b></td><td>' + p.balls + '</td><td>' + (p.fours || 0) + '</td><td>' + (p.sixes || 0) + '</td><td>' + (p.wicketsTaken || 0) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    document.getElementById('scorecardContent').innerHTML =
        '<div><div style="text-align:center;padding-bottom:8px;border-bottom:1px solid var(--border)"><div style="font-size:9px;color:var(--gold);font-weight:900">SCORECARD • ' + (m.date || '') + '</div><h3 style="margin:3px 0;font-size:16px">' + m.teamA + ' vs ' + m.teamB + '</h3><div style="font-size:12px;font-weight:900;color:#00e676">🏆 ' + m.winner + '</div><div style="margin-top:5px"><span class="badge gold">🏅 MVP: ' + mvp.name + ' (' + mvp.runs + 'R, ' + mvp.wkts + 'W)</span></div></div>' +
        ffaHtml + buildInningsTableHTML(m.inn1Data, 'var(--gold)') + buildInningsTableHTML(m.inn2Data, 'var(--cyan)') +
        '<button class="btn light uniform-btn" style="margin-top:10px" onclick="closeScorecard()">← CLOSE</button></div>';
    document.getElementById('scorecardModal').classList.add('open');
}
function closeScorecard() { document.getElementById('scorecardModal').classList.remove('open'); }

function confirmAbandonMatch() {
    openCustomConfirm('🗑️', 'ABORT MATCH?', 'Abort current live match and remove it from Live Hub?', 'ABORT MATCH', function() {
        matchActive = false;
        activeLeagueMatchMeta = null;
        if (database && hostRoomCode) {
            try { database.ref('live_rooms/' + hostRoomCode).remove(); } catch (e) {}
        }
        if (activePausedMatchId) {
            pausedMatches = pausedMatches.filter(function(x) { return x.id !== activePausedMatchId; });
            activePausedMatchId = null;
            saveAll(true);
        }
        showPage('home');
        showToast('🗑️ Match aborted & removed from Live Hub');
    });
}

/* ================== LEADERBOARD, H2H & TROPHIES ================== */
function getPlayerMetric(p, key) {
    var c = p.career || {};
    if (key === 'avg') return c.matches ? parseFloat((c.runs / c.matches).toFixed(1)) : 0;
    if (key === 'sr') return c.balls ? parseFloat(((c.runs / c.balls) * 100).toFixed(1)) : 0;
    return c[key] || 0;
}

function renderLeader(statKey) {
    currentTab = statKey || 'runs';
    ['Runs', 'Wickets', 'Avg', 'Sr', 'Sixes', 'Fours', 'Wins'].forEach(function(t) { var btn = document.getElementById('tab' + t); if (btn) btn.classList.toggle('active', t.toLowerCase() === currentTab); });
    var list = document.getElementById('leaderList');
    if (!list) return;
    var sorted = players.slice().sort(function(a, b) { return getPlayerMetric(b, currentTab) - getPlayerMetric(a, currentTab); });
    list.innerHTML = sorted.map(function(p, idx) {
        var c = p.career || {}, avg = c.matches ? (c.runs / c.matches).toFixed(1) : '0.0', sr = c.balls ? ((c.runs / c.balls) * 100).toFixed(1) : '0.0';
        var val = getPlayerMetric(p, currentTab), cap = idx === 0 && currentTab === 'runs' ? ' 🟠' : (idx === 0 && currentTab === 'wickets' ? ' 🟣' : '');
        var safeCol = getReadableThemeColor(p.theme || '#f5c542');
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px;background:var(--pill-bg);border-radius:12px;margin-bottom:5px;cursor:pointer;border-left:3px solid ' + safeCol + '" onclick="openPlayerDetail(' + players.indexOf(p) + ')">' +
            '<div style="display:flex;align-items:center;gap:8px"><b>#' + (idx + 1) + '</b>' + getAvatarHTML(p, 34, 11) +
            '<div><div style="font-size:11px;font-weight:900;color:' + safeCol + '">' + p.name + cap + '</div><div style="font-size:8px;color:var(--muted)">M:' + (c.matches || 0) + ' • AVG:' + avg + ' • SR:' + sr + '</div></div></div>' +
            '<b style="color:var(--gold);font-size:14px">' + val + '</b></div>';
    }).join('');
    triggerTabSlideAnim(list);
}

function openCompareModal() {
    if (players.length < 2) return showToast('⚠️ Need at least 2 players');
    if (h2hPlayerAIdx >= players.length) h2hPlayerAIdx = 0;
    if (h2hPlayerBIdx >= players.length) h2hPlayerBIdx = 1;
    renderCompareModalContent();
    document.getElementById('compareModal').classList.add('open');
}
function updateH2HSelection(side, val) { if (side === 'A') h2hPlayerAIdx = parseInt(val); else h2hPlayerBIdx = parseInt(val); renderCompareModalContent(); }
function closeCompareModal() { document.getElementById('compareModal').classList.remove('open'); }

function buildH2HRow(label, vA, vB) {
    var numA = parseFloat(vA) || 0, numB = parseFloat(vB) || 0, total = numA + numB;
    var pctA = total > 0 ? Math.round((numA / total) * 100) : 50;
    return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:10px;font-weight:900"><span style="color:var(--gold)">' + vA + '</span><span style="font-size:8px;color:var(--muted)">' + label + '</span><span style="color:var(--cyan)">' + vB + '</span></div><div class="h2h-bar-track"><div style="width:' + pctA + '%;background:var(--gold)"></div><div style="width:' + (100 - pctA) + '%;background:var(--cyan)"></div></div></div>';
}

function renderCompareModalContent() {
    var pA = players[h2hPlayerAIdx], pB = players[h2hPlayerBIdx];
    if (!pA || !pB) return;
    var optsA = players.map(function(p, i) { return '<option value="' + i + '" ' + (i === h2hPlayerAIdx ? 'selected' : '') + '>' + p.name + '</option>'; }).join('');
    var optsB = players.map(function(p, i) { return '<option value="' + i + '" ' + (i === h2hPlayerBIdx ? 'selected' : '') + '>' + p.name + '</option>'; }).join('');
    var h2hClashes = 0, aDirectWins = 0, bDirectWins = 0;
    matchHistory.forEach(function(m) {
        if ((m.teamA === pA.name || m.teamB === pA.name) && (m.teamA === pB.name || m.teamB === pB.name)) {
            h2hClashes++;
            if (m.winner && m.winner.includes(pA.name)) aDirectWins++;
            if (m.winner && m.winner.includes(pB.name)) bDirectWins++;
        }
    });
    var cA = pA.career || {}, cB = pB.career || {}, avgA = cA.matches ? (cA.runs / cA.matches).toFixed(1) : '0.0', avgB = cB.matches ? (cB.runs / cB.matches).toFixed(1) : '0.0', srA = cA.balls ? ((cA.runs / cA.balls) * 100).toFixed(1) : '0.0', srB = cB.balls ? ((cB.runs / cB.balls) * 100).toFixed(1) : '0.0';
    var radA = computePlayerRadarMetrics(pA), radB = computePlayerRadarMetrics(pB);

    document.getElementById('compareContent').innerHTML =
        '<div><div style="text-align:center;margin-bottom:10px"><h3 style="margin:2px 0;font-size:16px">⚔️ H2H RIVALRY & RADAR</h3></div>' +
        '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:10px">' +
        '<div style="text-align:center"><div style="display:flex;justify-content:center;margin-bottom:5px">' + getAvatarHTML(pA, 46, 16) + '</div><select onchange="updateH2HSelection(\'A\',this.value)">' + optsA + '</select><div style="font-size:9px;color:var(--gold);font-weight:900;margin-top:3px">OVR ' + radA.ovr + '</div></div>' +
        '<div style="font-size:14px;font-weight:900;color:var(--gold)">VS</div>' +
        '<div style="text-align:center"><div style="display:flex;justify-content:center;margin-bottom:5px">' + getAvatarHTML(pB, 46, 16) + '</div><select onchange="updateH2HSelection(\'B\',this.value)">' + optsB + '</select><div style="font-size:9px;color:var(--cyan);font-weight:900;margin-top:3px">OVR ' + radB.ovr + '</div></div></div>' +

        '<div style="background:rgba(0,0,0,0.34);border:1px solid var(--border);border-radius:16px;padding:8px;margin-bottom:10px;text-align:center">' +
        '<div style="font-size:8px;font-weight:900;color:var(--muted);margin-bottom:2px"><span style="color:var(--gold)">■ ' + pA.name.toUpperCase() + '</span> vs <span style="color:var(--cyan)">■ ' + pB.name.toUpperCase() + '</span></div>' +
        '<canvas id="h2hRadarCanvas" width="260" height="200" style="max-width:100%;display:block;margin:0 auto"></canvas></div>' +

        '<div class="glass" style="padding:9px;margin-bottom:10px;text-align:center;border-color:var(--gold)"><div style="font-size:8px;color:var(--gold);font-weight:900">1v1 CLASHES (' + h2hClashes + ')</div><div style="font-size:14px;font-weight:900;margin-top:3px"><span style="color:var(--gold)">' + pA.name + ': ' + aDirectWins + '</span> — <span style="color:var(--cyan)">' + pB.name + ': ' + bDirectWins + '</span></div></div>' +
        buildH2HRow('RUNS', cA.runs || 0, cB.runs || 0) + buildH2HRow('AVERAGE', avgA, avgB) + buildH2HRow('STRIKE RATE', srA, srB) + buildH2HRow('WICKETS', cA.wickets || 0, cB.wickets || 0) + buildH2HRow('SIXES', cA.sixes || 0, cB.sixes || 0) + buildH2HRow('WINS', cA.wins || 0, cB.wins || 0) +
        '<button class="btn light uniform-btn" style="margin-top:8px" onclick="closeCompareModal()">← CLOSE</button></div>';

    setTimeout(function() {
        drawSpiderRadarCanvas('h2hRadarCanvas', [
            { values: radA.values, stroke: '#f5c542', fill: 'rgba(245, 197, 66, 0.25)' },
            { values: radB.values, stroke: '#0a84ff', fill: 'rgba(10, 132, 255, 0.25)' }
        ]);
    }, 30);
}

function renderTrophiesTab(tab) {
    currentTrophyTab = tab || 'badges';
    ['Badges', 'Match', 'HOF'].forEach(function(k) { var btn = document.getElementById('btnTabTrophy' + k); if (btn) btn.classList.toggle('active', k.toLowerCase() === currentTrophyTab); });
    var grid = document.getElementById('trophyListGrid'), empty = document.getElementById('noTrophies'), filterWrap = document.getElementById('badgesPlayerFilterWrap'), sel = document.getElementById('badgeShowcasePlayerSelect'), dash = document.getElementById('trophyStatsDashboard');
    if (currentTrophyTab === 'badges') {
        if (filterWrap) filterWrap.style.display = players.length ? 'block' : 'none';
        if (players.length && sel && sel.options.length !== players.length) sel.innerHTML = players.map(function(p, i) { return '<option value="' + i + '">' + p.name + '</option>'; }).join('');
        var activePl = players[sel ? (parseInt(sel.value) || 0) : 0];
        if (activePl) checkAndAwardBadges(activePl);
        var unlocked = activePl && activePl.career ? activePl.career.badges : [];
        if (dash) dash.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:10px;font-weight:900;color:var(--gold)">' + (activePl ? activePl.name.toUpperCase() : 'PLAYER') + ' BADGES</div><div style="font-size:9px;color:var(--muted)">Unlocked ' + unlocked.length + ' / ' + MASTER_BADGES.length + '</div></div><div style="font-size:18px;font-weight:900;color:#00e676">' + unlocked.length + '/' + MASTER_BADGES.length + '</div></div>';
        if (empty) empty.style.display = 'none';
        if (grid) grid.innerHTML = MASTER_BADGES.map(function(b) {
            var isU = unlocked.includes(b.id);
            return '<div class="glass" style="padding:10px;text-align:center;margin-bottom:0;opacity:' + (isU ? '1' : '0.4') + ';border:1px solid ' + (isU ? 'var(--gold)' : 'var(--border)') + '"><div style="font-size:24px">' + b.icon + '</div><div style="font-size:10px;font-weight:900;margin-top:3px">' + b.title + '</div><div style="font-size:8px;color:var(--muted);margin-top:2px">' + b.desc + '</div><div style="margin-top:5px;font-size:8px;font-weight:900;color:' + (isU ? '#00e676' : '#aaa') + '">' + (isU ? '✅ UNLOCKED' : '🔒 LOCKED') + '</div></div>';
        }).join('');
    } else if (currentTrophyTab === 'match') {
        if (filterWrap) filterWrap.style.display = 'none';
        if (!matchHistory.length) { if (grid) grid.innerHTML = ''; if (empty) empty.style.display = 'block'; }
        else {
            if (empty) empty.style.display = 'none';
            if (grid) grid.innerHTML = matchHistory.slice(0, 16).map(function(m) {
                var mvp = m.mvp || computeMatchMVP(m);
                return '<div class="glass" style="padding:10px;text-align:center;margin-bottom:0;border:1px solid var(--gold)"><div style="font-size:22px">🏅</div><div style="font-size:11px;font-weight:900;color:var(--gold);margin-top:3px">' + mvp.name + '</div><div style="font-size:8px;color:#fff;margin-top:2px">' + m.teamA + ' vs ' + m.teamB + '</div></div>';
            }).join('');
        }
    } else {
        if (filterWrap) filterWrap.style.display = 'none';
        var topP = players.slice().sort(function(a, b) { return (b.career.runs || 0) - (a.career.runs || 0); }).slice(0, 6);
        if (!topP.length) { if (grid) grid.innerHTML = ''; if (empty) empty.style.display = 'block'; }
        else {
            if (empty) empty.style.display = 'none';
            if (grid) grid.innerHTML = topP.map(function(p, i) {
                return '<div class="glass" style="padding:10px;text-align:center;margin-bottom:0;border:1px solid var(--cyan)"><div style="font-size:22px">' + (i === 0 ? '👑' : '🌟') + '</div><div style="font-size:11px;font-weight:900;margin-top:3px">' + p.name + '</div><div style="font-size:8px;color:var(--gold);margin-top:2px">' + (p.career.runs || 0) + 'R • ' + (p.career.wickets || 0) + 'W</div></div>';
            }).join('');
        }
    }
    triggerTabSlideAnim(grid);
}

/* ================== PRO AUTO LEAGUE ENGINE ================== */
function ensureLeagueStructure(lg) {
    if (!lg) return;
    if (!lg.standings) {
        lg.standings = {};
        (lg.players || []).forEach(function(pName) {
            lg.standings[pName] = { p: 0, w: 0, l: 0, pts: 0, runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0, nrr: 0 };
        });
    }
    if (!lg.fixtures || !lg.fixtures.length) {
        lg.fixtures = [];
        var pList = lg.players || [];
        if (lg.type === 'knockout') {
            for (var i = 0; i < pList.length - 1; i += 2) {
                lg.fixtures.push({ id: 'fx_' + i, p1: pList[i], p2: pList[i + 1], played: false, winner: '', scoreSummary: '', stage: 'Knockout' });
            }
            if (pList.length % 2 === 1 && pList.length >= 3) {
                lg.fixtures.push({ id: 'fx_bye', p1: pList[pList.length - 1], p2: pList[0], played: false, winner: '', scoreSummary: '', stage: 'Playoff' });
            }
        } else {
            var fIdx = 0;
            for (var a = 0; a < pList.length; a++) {
                for (var b = a + 1; b < pList.length; b++) {
                    lg.fixtures.push({ id: 'fx_' + (++fIdx), p1: pList[a], p2: pList[b], played: false, winner: '', scoreSummary: '', stage: 'Group' });
                }
            }
        }
    }
}

function toggleLeaguePickCard(idx) {
    var cb = document.getElementById('cb_LG_' + idx), card = document.getElementById('pickCard_LG_' + idx);
    if (!cb || !card) return;
    var nextState = !card.classList.contains('selected');
    cb.checked = nextState; card.classList.toggle('selected', nextState);
    playSFX('dot');
    var el = document.getElementById('leagueSelectedCount');
    if (el) el.textContent = document.querySelectorAll('.league-cb:checked').length + ' selected';
}

function createLeague() {
    var name = document.getElementById('leagueNameInput').value.trim();
    var picked = Array.from(document.querySelectorAll('.league-cb:checked')).map(function(cb) {
        var idx = parseInt(cb.value);
        return players[idx] ? players[idx].name : null;
    }).filter(Boolean);
    if (!name) return showToast('⚠️ Enter tournament name');
    if (picked.length < 3) return showToast('⚠️ Pick at least 3 players');
    var resolvedOvers = getResolvedOversValue('leagueOvers', 'customLeagueOversInput');
    if (!resolvedOvers) return showToast('⚠️ Enter valid overs!');

    var newLg = { id: 'lg_' + Date.now(), name: name, overs: resolvedOvers, type: document.getElementById('leagueType').value, players: picked, standings: {}, fixtures: [], champion: '' };
    ensureLeagueStructure(newLg);
    leagues.unshift(newLg);
    document.getElementById('leagueNameInput').value = '';
    saveAll(); renderLeagues();
    showToast('🏆 Tournament Created with Schedule & Points Table!');
}

function playLeagueFixture(leagueId, fixtureId) {
    var lg = leagues.find(function(x) { return x.id === leagueId; });
    if (!lg) return;
    var fx = lg.fixtures.find(function(f) { return f.id === fixtureId; });
    if (!fx || fx.played) return;

    var p1Obj = players.find(function(p) { return p.name === fx.p1; }) || { id: 'lgp1', name: fx.p1, theme: '#f5c542' };
    var p2Obj = players.find(function(p) { return p.name === fx.p2; }) || { id: 'lgp2', name: fx.p2, theme: '#0a84ff' };

    matchMode = '1v1';
    maxOvers = lg.overs || 2;
    teamAName = p1Obj.name;
    teamBName = p2Obj.name;
    teamA = [createMatchPlayerObj(p1Obj)];
    teamB = [createMatchPlayerObj(p2Obj)];
    isSuperOver = false;
    activeLeagueMatchMeta = { leagueId: lg.id, fixtureId: fx.id };

    document.getElementById('broadcastModePromptModal').classList.add('open');
    showToast('🏆 League Clash: ' + fx.p1 + ' vs ' + fx.p2);
}

function recordLeagueFixtureResult(leagueId, fixtureId, rec) {
    var lg = leagues.find(function(x) { return x.id === leagueId; });
    if (!lg) return;
    ensureLeagueStructure(lg);
    var fx = lg.fixtures.find(function(f) { return f.id === fixtureId; });
    if (!fx || fx.played) return;

    fx.played = true;
    fx.winner = rec.winner;
    fx.scoreSummary = rec.inn1Score + ' vs ' + rec.inn2Score;

    var p1 = fx.p1, p2 = fx.p2;
    if (!lg.standings[p1]) lg.standings[p1] = { p: 0, w: 0, l: 0, pts: 0, runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0, nrr: 0 };
    if (!lg.standings[p2]) lg.standings[p2] = { p: 0, w: 0, l: 0, pts: 0, runsFor: 0, ballsFor: 0, runsAgainst: 0, ballsAgainst: 0, nrr: 0 };

    var s1 = lg.standings[p1], s2 = lg.standings[p2];
    s1.p += 1; s2.p += 1;

    var maxQuotaBalls = (lg.overs || 2) * 6;
    var r1 = rec.inn1Data ? rec.inn1Data.runs : 0;
    var b1 = rec.inn1Data ? (rec.inn1Data.wickets >= 1 ? maxQuotaBalls : Math.max(1, rec.inn1Data.balls || maxQuotaBalls)) : maxQuotaBalls;
    var r2 = rec.inn2Data ? rec.inn2Data.runs : 0;
    var b2 = rec.inn2Data ? (rec.inn2Data.wickets >= 1 && r2 < r1 ? maxQuotaBalls : Math.max(1, rec.inn2Data.balls || maxQuotaBalls)) : maxQuotaBalls;

    s1.runsFor += r1; s1.ballsFor += b1; s1.runsAgainst += r2; s1.ballsAgainst += b2;
    s2.runsFor += r2; s2.ballsFor += b2; s2.runsAgainst += r1; s2.ballsAgainst += b1;

    if (rec.winner.includes(p1)) { s1.w += 1; s1.pts += 2; s2.l += 1; }
    else if (rec.winner.includes(p2)) { s2.w += 1; s2.pts += 2; s1.l += 1; }
    else { s1.pts += 1; s2.pts += 1; }

    [s1, s2].forEach(function(st) {
        var forRate = st.ballsFor > 0 ? (st.runsFor / st.ballsFor) * 6 : 0;
        var agRate = st.ballsAgainst > 0 ? (st.runsAgainst / st.ballsAgainst) * 6 : 0;
        st.nrr = parseFloat((forRate - agRate).toFixed(2));
    });

    if (fx.stage === 'FINAL') {
        lg.champion = rec.winner.replace(' Won Super Over', '').replace(' Won', '');
    } else {
        var unplayedGroup = lg.fixtures.filter(function(f) { return !f.played; });
        var hasFinal = lg.fixtures.some(function(f) { return f.stage === 'FINAL'; });
        if (unplayedGroup.length === 0 && !hasFinal) {
            var ranked = Object.keys(lg.standings).sort(function(a, b) {
                if (lg.standings[b].pts !== lg.standings[a].pts) return lg.standings[b].pts - lg.standings[a].pts;
                return lg.standings[b].nrr - lg.standings[a].nrr;
            });
            if (ranked.length >= 2) {
                lg.fixtures.push({ id: 'fx_final_' + Date.now(), p1: ranked[0], p2: ranked[1], played: false, winner: '', scoreSummary: '', stage: 'FINAL' });
                showToast('🔥 GRAND FINAL UNLOCKED: ' + ranked[0] + ' vs ' + ranked[1] + '!');
            }
        }
    }
    saveAll();
}

function renderLeagues() {
    var checklist = document.getElementById('leaguePlayerChecklist');
    if (checklist) {
        if (!players.length) {
            checklist.innerHTML = '<div style="text-align:center;padding:10px;font-size:10px;color:var(--muted)">Add players in Players tab first!</div>';
        } else {
            checklist.innerHTML = '<div style="display:flex;flex-direction:column;gap:6px">' + players.map(function(p, i) {
                var c = p.career || {};
                return '<div class="adv-pick-card" id="pickCard_LG_' + i + '" onclick="toggleLeaguePickCard(' + i + ')">' +
                    '<input type="checkbox" class="league-cb" id="cb_LG_' + i + '" value="' + i + '" style="display:none;pointer-events:none">' +
                    '<div style="display:flex;align-items:center;gap:8px">' + getAvatarHTML(p, 30, 10) +
                    '<div><div style="font-size:11px;font-weight:900;color:#fff">' + p.name + '</div><div style="font-size:8px;color:var(--muted)">Runs: ' + (c.runs || 0) + ' • Wkts: ' + (c.wickets || 0) + '</div></div></div><div class="adv-pick-check">✓</div></div>';
            }).join('') + '</div>';
        }
    }
    var list = document.getElementById('leaguesList'), empty = document.getElementById('noLeagues'), badge = document.getElementById('leagueCountBadge');
    if (badge) badge.textContent = leagues.length;
    if (!list) return;
    if (!leagues.length) { list.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
    if (empty) empty.style.display = 'none';

    list.innerHTML = leagues.map(function(lg, idx) {
        ensureLeagueStructure(lg);
        var rankedNames = Object.keys(lg.standings).sort(function(a, b) {
            if (lg.standings[b].pts !== lg.standings[a].pts) return lg.standings[b].pts - lg.standings[a].pts;
            return lg.standings[b].nrr - lg.standings[a].nrr;
        });

        var tableRows = rankedNames.map(function(pName, rIdx) {
            var st = lg.standings[pName];
            var nrrStr = (st.nrr >= 0 ? '+' : '') + (st.nrr || 0).toFixed(2);
            var qBadge = rIdx < 2 ? '<span style="color:var(--gold);font-size:8px;margin-left:3px">★Q</span>' : '';
            return '<tr><td><b>#' + (rIdx + 1) + ' ' + pName + '</b>' + qBadge + '</td><td>' + st.p + '</td><td>' + st.w + '</td><td>' + st.l + '</td><td style="color:' + (st.nrr >= 0 ? '#00e676' : '#ff4d6d') + ';font-weight:800">' + nrrStr + '</td><td><b style="color:var(--gold)">' + st.pts + '</b></td></tr>';
        }).join('');

        var fixturesHtml = (lg.fixtures || []).map(function(fx) {
            var isFinal = fx.stage === 'FINAL';
            var stageBadge = '<span class="badge ' + (isFinal ? 'gold' : 'dark') + '" style="font-size:7px">' + (fx.stage || 'Match') + '</span>';
            if (fx.played) {
                return '<div style="padding:7px 9px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center">' +
                    '<div><div>' + stageBadge + ' <b style="font-size:10px">' + fx.p1 + ' vs ' + fx.p2 + '</b></div>' +
                    '<div style="font-size:8px;color:#00e676;font-weight:800;margin-top:2px">🏆 ' + fx.winner + ' (' + fx.scoreSummary + ')</div></div>' +
                    '<span class="badge dark" style="color:#00e676">✓ DONE</span></div>';
            }
            return '<div style="padding:7px 9px;background:var(--pill-bg);border:1px solid ' + (isFinal ? 'var(--gold)' : 'var(--border)') + ';border-radius:10px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center">' +
                '<div>' + stageBadge + ' <b style="font-size:11px;margin-left:4px">' + fx.p1 + ' vs ' + fx.p2 + '</b></div>' +
                '<button class="btn gold" style="padding:5px 10px;font-size:9px" onclick="playLeagueFixture(\'' + lg.id + '\',\'' + fx.id + '\')">▶ PLAY</button></div>';
        }).join('');

        var champBanner = lg.champion ? '<div style="background:linear-gradient(135deg,rgba(245,197,66,0.25),rgba(0,230,118,0.2));border:1.5px solid var(--gold);padding:8px;border-radius:12px;text-align:center;margin-bottom:8px;font-weight:900;color:var(--gold)">👑 CHAMPION: ' + lg.champion.toUpperCase() + ' 🏆</div>' : '';

        return '<div class="glass" style="padding:12px;margin-bottom:10px;border:1.5px solid var(--gold)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div><div style="font-size:13px;font-weight:900;color:var(--gold)">🏆 ' + lg.name + '</div><div style="font-size:8px;color:var(--muted)">' + lg.players.length + ' Players • ' + lg.overs + ' Overs • Auto NRR Table</div></div>' +
            '<button class="btn red" style="padding:4px 8px;font-size:8px" onclick="deleteLeagueByIdx(' + idx + ')">🗑️</button></div>' +
            champBanner +
            '<div style="font-size:9px;font-weight:900;color:var(--cyan);margin-bottom:4px">📊 POINTS TABLE (WITH NRR)</div>' +
            '<table class="pro-score-table" style="margin-bottom:10px"><thead><tr><th>PLAYER</th><th>P</th><th>W</th><th>L</th><th>NRR</th><th>PTS</th></tr></thead><tbody>' + tableRows + '</tbody></table>' +
            '<div style="font-size:9px;font-weight:900;color:var(--gold);margin-bottom:5px">⚔️ TOURNAMENT FIXTURES</div>' +
            '<div style="max-height:195px;overflow-y:auto">' + fixturesHtml + '</div></div>';
    }).join('');
}

function deleteLeagueByIdx(idx) {
    if (!leagues[idx]) return;
    openCustomConfirm('🗑️', 'DELETE LEAGUE?', 'Remove tournament "' + leagues[idx].name + '"?', 'DELETE', function() {
        leagues.splice(idx, 1);
        saveAll(); renderLeagues();
        showToast('🗑️ League removed');
    });
}

/* ================== 9:16 SOCIAL MEDIA STORY POSTER GENERATOR (1080x1920 HD) ================== */
function openCertificateModal(idx) {
    var m = matchHistory[idx]; if (!m) return;
    var mvp = m.mvp || computeMatchMVP(m);
    var c = document.getElementById('certificateCanvas');
    if (!c) return;
    c.width = 1080; c.height = 1920;
    var ctx = c.getContext('2d');

    var bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#050711');
    bgGrad.addColorStop(0.45, '#0d152c');
    bgGrad.addColorStop(1, '#04060c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    var glow1 = ctx.createRadialGradient(540, 260, 20, 540, 260, 520);
    glow1.addColorStop(0, 'rgba(245, 197, 66, 0.25)');
    glow1.addColorStop(1, 'rgba(245, 197, 66, 0)');
    ctx.fillStyle = glow1; ctx.fillRect(0, 0, 1080, 900);

    var glow2 = ctx.createRadialGradient(540, 1450, 20, 540, 1450, 550);
    glow2.addColorStop(0, 'rgba(10, 132, 255, 0.22)');
    glow2.addColorStop(1, 'rgba(10, 132, 255, 0)');
    ctx.fillStyle = glow2; ctx.fillRect(0, 800, 1080, 1120);

    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 8;
    ctx.strokeRect(44, 44, 992, 1832);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 64, 952, 1792);

    ctx.fillStyle = 'rgba(245, 197, 66, 0.16)';
    ctx.fillRect(310, 120, 460, 58);
    ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 2;
    ctx.strokeRect(310, 120, 460, 58);
    ctx.fillStyle = '#f5c542';
    ctx.font = '900 26px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ CRIC CLASH • OFFICIAL STORY', 540, 158);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px "Space Grotesk", sans-serif';
    ctx.fillText('MATCH SUMMARY', 540, 270);
    ctx.fillStyle = '#949ab1';
    ctx.font = '700 28px Outfit, sans-serif';
    ctx.fillText((m.date || '') + '  •  ' + (m.mode ? m.mode.toUpperCase() : 'CLASH'), 540, 325);

    ctx.fillStyle = 'rgba(0, 230, 118, 0.14)';
    ctx.fillRect(100, 380, 880, 185);
    ctx.strokeStyle = '#00e676'; ctx.lineWidth = 4;
    ctx.strokeRect(100, 380, 880, 185);
    ctx.fillStyle = '#00e676';
    ctx.font = '900 54px "Space Grotesk", sans-serif';
    ctx.fillText('🏆 ' + (m.winner || 'COMPLETED').toUpperCase(), 540, 468);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '800 32px Outfit, sans-serif';
    ctx.fillText(m.margin || 'Official Clash Result', 540, 528);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(100, 620, 880, 210);
    ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 3;
    ctx.strokeRect(100, 620, 880, 210);
    ctx.fillStyle = '#f5c542';
    ctx.font = '900 36px Outfit, sans-serif';
    ctx.fillText('🏏 ' + (m.teamA || 'TEAM 1').toUpperCase(), 540, 690);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px "Space Grotesk", sans-serif';
    ctx.fillText(m.inn1Score || '0/0', 540, 780);

    if (m.inn2Score) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(100, 870, 880, 210);
        ctx.strokeStyle = '#0a84ff'; ctx.lineWidth = 3;
        ctx.strokeRect(100, 870, 880, 210);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 36px Outfit, sans-serif';
        ctx.fillText('🏏 ' + (m.teamB || 'TEAM 2').toUpperCase(), 540, 940);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 64px "Space Grotesk", sans-serif';
        ctx.fillText(m.inn2Score, 540, 1030);
    }

    ctx.fillStyle = 'rgba(245, 197, 66, 0.11)';
    ctx.fillRect(100, 1140, 880, 320);
    ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 4;
    ctx.strokeRect(100, 1140, 880, 320);

    ctx.fillStyle = '#f5c542';
    ctx.font = '900 32px Outfit, sans-serif';
    ctx.fillText('🏅 PLAYER OF THE MATCH (MVP)', 540, 1210);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 66px "Space Grotesk", sans-serif';
    ctx.fillText((mvp.name || 'MVP').toUpperCase(), 540, 1300);
    ctx.fillStyle = '#00e676';
    ctx.font = '800 36px Outfit, sans-serif';
    ctx.fillText('🏏 ' + (mvp.runs || 0) + ' RUNS   •   🎯 ' + (mvp.wkts || 0) + ' WICKETS   •   ⚡ ' + (mvp.pts || 0) + ' PTS', 540, 1385);

    var topBats = [], topBowls = [];
    if (m.inn1Data) { topBats = topBats.concat(m.inn1Data.batting || []); topBowls = topBowls.concat(m.inn1Data.bowling || []); }
    if (m.inn2Data) { topBats = topBats.concat(m.inn2Data.batting || []); topBowls = topBowls.concat(m.inn2Data.bowling || []); }
    topBats.sort(function(a, b) { return (b.runs || 0) - (a.runs || 0); });
    topBowls.sort(function(a, b) { return (b.wicketsTaken || 0) - (a.wicketsTaken || 0); });

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(100, 1500, 880, 210);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
    ctx.strokeRect(100, 1500, 880, 210);

    ctx.fillStyle = '#949ab1';
    ctx.font = '800 26px Outfit, sans-serif';
    ctx.fillText('🔥 TOP PERFORMANCES', 540, 1555);

    var tb1 = topBats[0] ? (topBats[0].name + ': ' + topBats[0].runs + '(' + topBats[0].balls + ')') : '-';
    var tbw1 = topBowls[0] ? (topBowls[0].name + ': ' + topBowls[0].wicketsTaken + '-' + topBowls[0].runsConceded) : '-';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px Outfit, sans-serif';
    ctx.fillText('Best Batter: ' + tb1, 540, 1615);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('Best Bowler: ' + tbw1, 540, 1670);

    ctx.fillStyle = '#f5c542';
    ctx.font = '900 28px "Space Grotesk", sans-serif';
    ctx.fillText('CRIC CLASH • OFFICIAL MATCH SUMMARY', 540, 1810);

    document.getElementById('certificateModal').classList.add('open');
}

function closeCertificate() { document.getElementById('certificateModal').classList.remove('open'); }
function downloadCertificate() {
    var c = document.getElementById('certificateCanvas'), a = document.createElement('a');
    a.download = 'cric-clash-story-' + Date.now() + '.png';
    a.href = c.toDataURL('image/png');
    a.click();
    showToast('📥 9:16 HD Story Poster Saved!');
}
function shareCertificateWhatsApp() {
    var c = document.getElementById('certificateCanvas');
    if (navigator.canShare && c.toBlob) {
        c.toBlob(function(blob) {
            var file = new File([blob], 'cric-clash-story.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                navigator.share({ title: 'CRIC CLASH Match Story', text: 'Check out our CRIC CLASH result!', files: [file] }).catch(function() {});
                return;
            }
            downloadCertificate();
        });
    } else {
        downloadCertificate();
    }
}

/* ================== FULL LIVE SPECTATOR TV, QR, AUTH & DELETE CLOUD DATA ================== */
function openSpectatorHub() { document.getElementById('spectatorModal').classList.add('open'); loadActiveBroadcastRooms(); }
function closeSpectatorHub() { document.getElementById('spectatorModal').classList.remove('open'); }

function startHostingRoom(silent) {
    if (!hostRoomCode) hostRoomCode = String(Math.floor(1000 + Math.random() * 9000));
    localStorage.setItem('cric_host_room', hostRoomCode);
    var disp = document.getElementById('hostRoomCodeDisplay');
    if (disp) disp.textContent = '#' + hostRoomCode;
    var shareUrl = window.location.origin + window.location.pathname + '?room=' + hostRoomCode;
    var urlBox = document.getElementById('spectatorDirectUrlBox'), qrBox = document.getElementById('spectatorQRBox'), qrImg = document.getElementById('spectatorQRImg');
    if (urlBox) { urlBox.style.display = 'block'; urlBox.textContent = shareUrl; }
    if (qrBox && qrImg) { qrBox.style.display = 'inline-block'; qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(shareUrl); }
    pushLiveRoomUpdate(false);
    if (!silent) showToast('📡 Room #' + hostRoomCode + ' Ready!');
}

function pushLiveRoomUpdate(isPaused) {
    if (!database || !hostRoomCode || liveBroadcastPrivacy === 'offline') return;
    if (!teamAName || !teamBName || teamAName === 'undefined') return;
    var totalRuns = getTotalRuns(), legalBalls = getLegalBallsCount();
    var crr = legalBalls > 0 ? ((totalRuns / legalBalls) * 6).toFixed(2) : '0.00';
    var targetInfo = (isSecondInnings && matchMode !== 'ffa') ? ('Target: ' + targetToWin + ' • Need ' + Math.max(0, targetToWin - totalRuns)) : ('CRR: ' + crr);
    var nsObj = (nonStriker !== -1 && battingTeam[nonStriker]) ? battingTeam[nonStriker] : null;
    try {
        database.ref('live_rooms/' + hostRoomCode).set({
            roomCode: hostRoomCode,
            privacy: liveBroadcastPrivacy,
            ended: false,
            aborted: false,
            paused: !!isPaused,
            pausedAt: isPaused ? Date.now() : null,
            teamA: teamAName,
            teamB: teamBName,
            battingTeam: isSecondInnings ? teamBName : teamAName,
            score: totalRuns + '/' + wicketsDown,
            overs: formatOvers(legalBalls) + '/' + (maxOvers === 999 ? '∞' : maxOvers),
            crr: crr,
            targetInfo: targetInfo,
            striker: battingTeam[cur] ? battingTeam[cur].name + ' ' + battingTeam[cur].runs + '(' + battingTeam[cur].balls + ')' : '-',
            nonStriker: nsObj ? nsObj.name + ' ' + nsObj.runs + '(' + nsObj.balls + ')' : '',
            bowler: bowlingTeam[curBowler] ? bowlingTeam[curBowler].name + ' ' + bowlingTeam[curBowler].wicketsTaken + '-' + bowlingTeam[curBowler].runsConceded + ' (' + formatOvers(bowlingTeam[curBowler].ballsBowled) + ')' : '-',
            currOver: currOver.slice(),
            recentBalls: allBalls.slice(-8).reverse(),
            updatedAt: Date.now()
        });
    } catch (e) {}
}

function loadActiveBroadcastRooms() {
    var pills = document.getElementById('activeRoomsPills');
    if (!database || !pills) return;
    var nowMs = Date.now();
    database.ref('live_rooms').limitToLast(15).once('value', function(snap) {
        var val = snap.val();
        if (!val) { pills.innerHTML = '<span style="font-size:9px;color:var(--muted)">No public rooms live</span>'; return; }
        var htmlArr = [];
        Object.keys(val).forEach(function(k) {
            var r = val[k];
            var refTime = (r && (r.pausedAt || r.updatedAt)) || 0;
            if (!r || !r.teamA || r.teamA === 'undefined' || r.ended || r.aborted || !refTime || (nowMs - refTime) > DAY_MS) {
                try { database.ref('live_rooms/' + k).remove(); } catch (e) {}
                return;
            }
            if (r.privacy === 'public') htmlArr.push('<button class="btn light" style="padding:4px 8px;font-size:9px" onclick="openFullSpectatorScreen(\'' + k + '\', false)">' + (r.paused ? '⏸️' : '🔴') + ' #' + k + ' (' + r.teamA + ' vs ' + r.teamB + ')</button>');
        });
        pills.innerHTML = htmlArr.length ? htmlArr.join('') : '<span style="font-size:9px;color:var(--muted)">No public rooms live</span>';
    });
}

function joinSpectatorRoom() {
    var code = document.getElementById('joinRoomCodeInput').value.trim().replace('#', '');
    if (!code) return showToast('⚠️ Enter Room Code');
    openFullSpectatorScreen(code, false);
}

function openFullSpectatorScreen(code, strictMode) {
    code = (code || '').trim().replace('#', '');
    if (!code) return showToast('⚠️ Invalid Room Code');
    isStrictSpectatorLinkMode = !!strictMode;
    document.getElementById('tvSpecRoomCode').textContent = 'ROOM #' + code;
    document.getElementById('fullSpectatorBroadcastScreen').style.display = 'block';
    closeSpectatorHub();
    if (!database) return;
    if (fullSpectatorRoomRef) fullSpectatorRoomRef.off();
    fullSpectatorRoomRef = database.ref('live_rooms/' + code);
    fullSpectatorRoomRef.on('value', function(snap) {
        var r = snap.val();
        if (!r || !r.teamA || r.teamA === 'undefined' || r.aborted) {
            document.getElementById('tvSpecLiveBody').innerHTML = '<div class="glass" style="text-align:center;padding:24px">⚠️ Room #' + code + ' has ended or been removed.</div>';
            return;
        }
        var overDotsHtml = (r.currOver || []).map(function(d) {
            var bg = d === 'W' ? '#ff2d55' : (d === '4' || d === '6' ? 'var(--gold)' : 'var(--pill-bg)');
            return '<span style="min-width:26px;height:26px;border-radius:50%;background:' + bg + ';color:' + (d === '4' || d === '6' ? '#111' : '#fff') + ';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900">' + d + '</span>';
        }).join('') || '<span style="font-size:9px;color:var(--muted)">Waiting for next ball...</span>';

        var timelineHtml = (r.recentBalls || []).map(function(b) {
            return '<div style="padding:5px 8px;background:var(--pill-bg);border-radius:8px;display:flex;justify-content:space-between;font-size:10px;margin-top:4px"><span><b>' + b.over + '</b> ' + b.bowler + ' to ' + b.batter + '</span><b style="color:' + (b.wicket ? '#ff2d55' : (b.runs >= 4 ? 'var(--gold)' : '#fff')) + '">' + b.label + '</b></div>';
        }).join('');

        document.getElementById('tvSpecLiveBody').innerHTML =
            '<div class="jumbotron"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;color:var(--gold);font-weight:900">' + r.teamA + ' vs ' + r.teamB + '</span>' +
            (r.paused ? '<span class="badge gold">⏸️ PAUSED</span>' : '<span class="badge dark" style="color:#00e676;border-color:#00e676">● LIVE</span>') + '</div>' +
            '<div style="font-size:12px;color:#aaa;margin-top:6px">' + (r.battingTeam || r.teamA) + ' BATTING</div>' +
            '<div class="jumbo-score">' + (r.score || '0/0') + '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><span style="font-size:13px;font-weight:900;color:var(--cyan)">OVERS: ' + (r.overs || '0.0') + '</span><span style="font-size:10px;font-weight:900;color:var(--emerald)">' + (r.targetInfo || '') + '</span></div>' +
            '<div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.15);font-size:11px">' +
            '<div>🏏 <b>' + (r.striker || '-') + ' *</b></div>' +
            (r.nonStriker ? '<div style="margin-top:3px;opacity:0.85">🏃 ' + r.nonStriker + '</div>' : '') +
            '<div style="margin-top:6px;color:var(--cyan)">🎯 <b>' + (r.bowler || '-') + '</b></div></div>' +
            '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.15)"><div style="font-size:8px;color:var(--muted);font-weight:900;margin-bottom:5px">THIS OVER</div><div style="display:flex;gap:6px;flex-wrap:wrap">' + overDotsHtml + '</div></div></div>' +
            (timelineHtml ? '<div class="glass" style="margin-top:10px"><div style="font-size:9px;font-weight:900;color:var(--gold);margin-bottom:4px">🎬 RECENT BALLS</div>' + timelineHtml + '</div>' : '');
    });
}
function closeFullSpectatorScreen() {
    if (isStrictSpectatorLinkMode) return showToast('🔒 Spectator Mode Active');
    document.getElementById('fullSpectatorBroadcastScreen').style.display = 'none';
    if (fullSpectatorRoomRef) fullSpectatorRoomRef.off();
}
function toggleSpecAudio() { specAudioEnabled = !specAudioEnabled; document.getElementById('tvSpecAudioBtn').textContent = specAudioEnabled ? '🔊 AUDIO' : '🔇 MUTE'; }

function shareLiveLink() {
    if (liveBroadcastPrivacy === 'offline') return showToast('📴 Offline match cannot share live link');
    startHostingRoom(true);
    var url = window.location.origin + window.location.pathname + '?room=' + hostRoomCode;
    document.getElementById('liveLinkText').textContent = '🏏 Watch CRIC CLASH Live!\nRoom Code: #' + hostRoomCode + '\nLink: ' + url;
    var qrWrap = document.getElementById('modalQRWrap'), qrImg = document.getElementById('modalQRImg');
    if (qrWrap && qrImg) { qrWrap.style.display = 'inline-block'; qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(url); }
    document.getElementById('liveLinkModal').classList.add('open');
}
function closeLiveLink() { document.getElementById('liveLinkModal').classList.remove('open'); }
function copyLiveLink() { navigator.clipboard.writeText(document.getElementById('liveLinkText').textContent).then(function() { showToast('📋 Copied!'); }); }
function shareLiveLinkWhatsApp() { window.open('https://wa.me/?text=' + encodeURIComponent(document.getElementById('liveLinkText').textContent), '_blank'); }
function shareClickableSpectatorLink() { shareLiveLink(); shareLiveLinkWhatsApp(); }

function loginWithGoogle() {
    if (!auth || !googleProvider) return showToast('⚠️ Auth unavailable');
    auth.signInWithPopup(googleProvider).then(function(res) {
        currentGmailUser = res.user.email; currentGoogleName = res.user.displayName || '';
        localStorage.setItem('cric_gmail_user', currentGmailUser); localStorage.setItem('cric_google_name', currentGoogleName);
        updateAuthUI(); showToast('✅ Signed in as ' + currentGmailUser);
    }).catch(function(err) { showToast('⚠️ ' + err.message); });
}
function gmailBridgeLogin(isRestore) {
    var email = document.getElementById('gmailInput') ? document.getElementById('gmailInput').value.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) return showToast('⚠️ Enter valid email');
    currentGmailUser = email; localStorage.setItem('cric_gmail_user', email); updateAuthUI();
    if (isRestore) cloudRestore(false); else cloudBackup(false);
}
function gmailLogout() { currentGmailUser = null; localStorage.removeItem('cric_gmail_user'); updateAuthUI(); showToast('👋 Signed out'); }
function updateAuthUI() {
    var loginArea = document.getElementById('gmailLoginArea'), loggedArea = document.getElementById('gmailLoggedArea'), status = document.getElementById('gmailStatus');
    if (currentGmailUser) {
        if (loginArea) loginArea.style.display = 'none';
        if (loggedArea) loggedArea.style.display = 'block';
        if (status) status.textContent = 'Connected: ' + currentGmailUser;
        var gn = document.getElementById('loggedGmailName'), ge = document.getElementById('loggedGmail');
        if (gn) gn.textContent = currentGoogleName || 'CRIC CLASH Player';
        if (ge) ge.textContent = currentGmailUser;
    } else {
        if (loginArea) loginArea.style.display = 'block';
        if (loggedArea) loggedArea.style.display = 'none';
        if (status) status.textContent = 'Not signed in';
    }
}
function cloudBackup(silent) {
    if (!database || !currentGmailUser) return;
    var key = currentGmailUser.replace(/[.@]/g, '_');
    database.ref('user_backups/' + key).set({ players: players, matchHistory: matchHistory, leagues: leagues, totalAllTimeMatches: totalAllTimeMatches, updatedAt: new Date().toLocaleString() }).then(function() {
        if (!silent) showToast('☁️ Cloud Backup Complete!');
    });
}
function cloudRestore(silent) {
    if (!database || !currentGmailUser) return;
    var key = currentGmailUser.replace(/[.@]/g, '_');
    database.ref('user_backups/' + key).once('value', function(snap) {
        var d = snap.val(); if (!d) return showToast('⚠️ No backup found');
        players = d.players || []; matchHistory = d.matchHistory || []; leagues = d.leagues || [];
        leagues.forEach(ensureLeagueStructure);
        totalAllTimeMatches = d.totalAllTimeMatches || matchHistory.length;
        saveAll(true); refreshHomeUI();
        if (!silent) showToast('🔄 Restored from Cloud!');
    });
}

function deleteCloudDataOnly() {
    if (!database || !currentGmailUser) return showToast('⚠️ Sign in first to delete cloud data');
    openCustomConfirm('🗑️', 'DELETE CLOUD DATA?', 'Permanently delete all backup data stored in the cloud for ' + currentGmailUser + '? (Your local phone data will remain untouched).', 'DELETE CLOUD', function() {
        var key = currentGmailUser.replace(/[.@]/g, '_');
        database.ref('user_backups/' + key).remove().then(function() {
            showToast('🗑️ Cloud data permanently deleted!');
        }).catch(function() {
            showToast('⚠️ Failed to delete cloud data');
        });
    });
}

function resetAppCompletely() {
    openCustomConfirm('⚠️', 'FACTORY RESET APP?', 'Reset ALL players, matches, and badges permanently? This cannot be undone.', 'RESET EVERYTHING', function() {
        localStorage.clear();
        location.reload();
    });
}
function openAboutApp() { document.getElementById('aboutModal').classList.add('open'); }
function closeAboutApp() { document.getElementById('aboutModal').classList.remove('open'); }

function triggerDLSMethod() {
    if (!isSecondInnings) return showToast('⚠️ DLS available in 2nd Innings only');
    openCustomPrompt('🌧️', 'REVISED DLS TARGET', 'Enter the revised target score for the chasing side:', targetToWin, [], function(newT) {
        var parsed = parseInt(newT);
        if (!isNaN(parsed) && parsed > 0) {
            targetToWin = parsed;
            updateMatchUI();
            if (liveBroadcastPrivacy !== 'offline') pushLiveRoomUpdate(false);
            showToast('🌧️ DLS Target: ' + targetToWin);
        }
    });
}

function openBallEdit() {
    document.getElementById('ballEditList').innerHTML = allBalls.slice().reverse().map(function(b) {
        return '<div style="padding:7px;background:var(--pill-bg);border-radius:8px;display:flex;justify-content:space-between;font-size:11px"><span><b>' + b.over + '</b> ' + b.batter + '</span><b>' + b.label + '</b></div>';
    }).join('');
    document.getElementById('ballEditModal').classList.add('open');
}
function closeBallEdit() { document.getElementById('ballEditModal').classList.remove('open'); }

function toggleVoiceScoring() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return showToast('⚠️ Voice mic not supported in this browser');
    var btn = document.getElementById('voiceScoreBtn');
    if (voiceScoringActive) {
        voiceScoringActive = false; if (recognition) recognition.stop();
        btn.textContent = '🎙️ VOICE OFF'; return;
    }
    recognition = new SR();
    recognition.continuous = true; recognition.interimResults = false; recognition.lang = 'en-US';
    recognition.onresult = function(e) {
        var cmd = e.results[e.results.length - 1][0].transcript.toLowerCase().trim();
        var heardEl = document.getElementById('voiceHeardText');
        if (heardEl) heardEl.textContent = '🎙️ "' + cmd + '"';
        if (/\b(six|6|sex|sick|seeks|fix|ticks|siks)\b/.test(cmd)) score(6);
        else if (/\b(four|4|for|fall|fore|far|foul|core|full)\b/.test(cmd)) score(4);
        else if (/\b(three|3|tree|free)\b/.test(cmd)) score(3);
        else if (/\b(two|2|to|too|double|tu)\b/.test(cmd)) score(2);
        else if (/\b(one|1|won|single|run|van|fun)\b/.test(cmd)) score(1);
        else if (/\b(dot|0|zero|no run|nothing|not|got)\b/.test(cmd)) score(0);
        else if (/\b(wide|white|why|wait|wild)\b/.test(cmd)) extraWd();
        else if (/\b(no ball|noble|no|free hit)\b/.test(cmd)) extraNoBall();
        else if (/\b(out|wicket|gone|bowled|caught|howzat)\b/.test(cmd)) outPlayer();
        else if (/\b(undo|back)\b/.test(cmd)) undo();
    };
    recognition.onend = function() { if (voiceScoringActive) { try { recognition.start(); } catch (e) {} } };
    recognition.start();
    voiceScoringActive = true;
    btn.textContent = '🎙️ VOICE ON';
    showToast('🎙️ Mic Active: Say Six, Four, Single, Dot, Wide, Out');
}

var deferredPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault(); deferredPrompt = e;
    var b = document.getElementById('pwaInstallBtn');
    if (b) b.style.display = 'inline-flex';
});

function installPWA() {
    if (!deferredPrompt) return showToast('📲 Open browser menu → "Add to Home Screen"');
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(c) {
        if (c.outcome === 'accepted') {
            var b = document.getElementById('pwaInstallBtn');
            if (b) b.style.display = 'none';
        }
        deferredPrompt = null;
    });
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
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
    }
    var roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam) openFullSpectatorScreen(roomParam, true);
});