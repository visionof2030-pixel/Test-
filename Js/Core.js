// ============================================================
// core.js - المنطق الأساسي للتطبيق (البيانات، الحالات، الدوال الأساسية)
// ============================================================

// ===== الحالة العامة =====
const state = {
    previousGamesData: [],
    allGames: [],
    openfootballMatches: [],
    predictions: [],
    loaded: false
};

let userPredictionsMap = {};
let isAuthorized = false;
let isCompactMode = false;
let isModalCompact = false;
let currentMatchId = null;
let currentTeam1 = '';
let currentTeam2 = '';
let currentTimeISO = '';
let currentUserName = '';
let currentDayFilter = 'all';
let currentLeaderboardPeriod = 'all';

// ===== كلمة السر =====
const SECRET_CODE = "1406";

// ===== بيانات المباريات الثابتة =====
const matchesData = [
    // ... جميع المباريات كما هي في الكود الأصلي ...
    // تم حذفها للاختصار، يجب إضافتها كاملة
];

// ===== المجموعات =====
const finalGroups = {
    "A": ["المكسيك", "جنوب أفريقيا", "كوريا الجنوبية", "التشيك"],
    "B": ["كندا", "البوسنة والهرسك", "قطر", "سويسرا"],
    "C": ["البرازيل", "المغرب", "هايتي", "إسكتلندا"],
    "D": ["أمريكا", "باراغواي", "أستراليا", "تركيا"],
    "E": ["ألمانيا", "كوراساو", "ساحل العاج", "الإكوادور"],
    "F": ["هولندا", "اليابان", "السويد", "تونس"],
    "G": ["بلجيكا", "مصر", "إيران", "نيوزيلندا"],
    "H": ["إسبانيا", "الرأس الأخضر", "السعودية", "أوروغواي"],
    "I": ["فرنسا", "السنغال", "النرويج", "العراق"],
    "J": ["الأرجنتين", "الجزائر", "النمسا", "الأردن"],
    "K": ["البرتغال", "الكونغو الديمقراطية", "أوزبكستان", "كولومبيا"],
    "L": ["إنجلترا", "كرواتيا", "غانا", "بنما"]
};

// ===== دوال الوقت =====
function now() { return Date.now(); }

function matchTime(timeISO) { return new Date(timeISO).getTime(); }

const MATCH_DURATION = 105 * 60 * 1000;

function isMatchLive(timeISO) {
    const cur = now();
    const start = matchTime(timeISO);
    return cur >= start && cur <= start + MATCH_DURATION;
}

function isMatchFinished(timeISO) {
    return now() > matchTime(timeISO) + MATCH_DURATION;
}

function canPredict(timeISO) {
    const start = matchTime(timeISO);
    const nowTime = now();
    const fiveMinutes = 5 * 60 * 1000;
    return (start - nowTime) > fiveMinutes;
}

function getMatchStatus(m) {
    const start = matchTime(m.timeISO);
    const end = start + MATCH_DURATION;
    const cur = now();
    if (cur < start) {
        const diff = start - cur;
        const h = Math.floor(diff / 3600000);
        const min = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        const fiveMin = 5 * 60 * 1000;
        const remainingText = diff < fiveMin ? '⏳ تنطلق خلال أقل من 5 دقائق' : `⏱️ ${h}h ${min}m ${s}s`;
        return { live: false, finished: false, text: remainingText };
    } else if (cur <= end) {
        return { live: true, finished: false, text: "🔴 تُلعب الآن" };
    }
    return { live: false, finished: true, text: "✅ انتهت" };
}

function upcomingMatches(arr) {
    return arr.filter(m => (matchTime(m.timeISO) + MATCH_DURATION) > now());
}

// ===== دوال الترجمة والأعلام =====
const nameMapping = new Map([
    ["مکزیک", "المكسيك"],
    ["Mexico", "المكسيك"],
    ["آفریقای جنوبی", "جنوب أفريقيا"],
    ["South Africa", "جنوب أفريقيا"],
    ["آرژانتین", "الأرجنتين"],
    ["Argentina", "الأرجنتين"],
    ["الجزایر", "الجزائر"],
    ["Algeria", "الجزائر"],
    // ... باقي الخريطة ...
]);

function normalizeName(str) {
    if (!str) return "";
    str = str.normalize("NFD").replace(/[\u064B-\u065F]/g, "");
    str = str.replace(/[ى]/g, "ا").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه")
             .replace(/[ک]/g, "ك").replace(/[ی]/g, "ي").replace(/[ي]/g, "ي")
             .replace(/[ئ]/g, "ي").replace(/[ؤ]/g, "و").replace(/[إ]/g, "ا").replace(/[آ]/g, "ا");
    return str.trim().replace(/\s+/g, ' ');
}

function translateToArabic(raw) {
    if (!raw) return "";
    let trimmed = raw.trim();
    if (nameMapping.has(trimmed)) return nameMapping.get(trimmed);
    let normalized = normalizeName(trimmed);
    for (let [key, value] of nameMapping) {
        if (normalizeName(key) === normalized) return value;
    }
    let lower = trimmed.toLowerCase();
    for (let [key, value] of nameMapping) {
        if (key.toLowerCase() === lower) return value;
    }
    for (let [key, value] of nameMapping) {
        if (normalized.includes(normalizeName(key)) || normalizeName(key).includes(normalized)) {
            return value;
        }
    }
    return trimmed;
}

function getFlag(name) {
    const map = {
        "المكسيك": "🇲🇽",
        "جنوب أفريقيا": "🇿🇦",
        "الأرجنتين": "🇦🇷",
        "الجزائر": "🇩🇿",
        "النمسا": "🇦🇹",
        "الأردن": "🇯🇴",
        "البرتغال": "🇵🇹",
        "الكونغو الديمقراطية": "🇨🇩",
        "كوريا الجنوبية": "🇰🇷",
        "التشيك": "🇨🇿",
        "كندا": "🇨🇦",
        "البوسنة والهرسك": "🇧🇦",
        "أمريكا": "🇺🇸",
        "العراق": "🇮🇶",
        "سويسرا": "🇨🇭",
        "قطر": "🇶🇦",
        "البرازيل": "🇧🇷",
        "المغرب": "🇲🇦",
        "هايتي": "🇭🇹",
        "إسكتلندا": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
        "أستراليا": "🇦🇺",
        "تركيا": "🇹🇷",
        "ألمانيا": "🇩🇪",
        "كوراساو": "🇨🇼",
        "اليابان": "🇯🇵",
        "هولندا": "🇳🇱",
        "الإكوادور": "🇪🇨",
        "ساحل العاج": "🇨🇮",
        "السويد": "🇸🇪",
        "تونس": "🇹🇳",
        "إسبانيا": "🇪🇸",
        "الرأس الأخضر": "🇨🇻",
        "مصر": "🇪🇬",
        "بلجيكا": "🇧🇪",
        "السعودية": "🇸🇦",
        "أوروغواي": "🇺🇾",
        "إيران": "🇮🇷",
        "نيوزيلندا": "🇳🇿",
        "السنغال": "🇸🇳",
        "فرنسا": "🇫🇷",
        "النرويج": "🇳🇴",
        "إنجلترا": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        "كرواتيا": "🇭🇷",
        "بنما": "🇵🇦",
        "كولومبيا": "🇨🇴",
        "أوزبكستان": "🇺🇿",
        "غانا": "🇬🇭",
        "باراغواي": "🇵🇾"
    };
    return map[name] || "🏁";
}

function translateBracketTeamName(name) {
    if (!name) return name;
    let match = name.match(/^Winner\s+Group\s+([A-L])$/i);
    if (match) {
        let groupLetter = match[1].toUpperCase();
        return `متصدر المجموعة (${groupLetter})`;
    }
    match = name.match(/^Runner-up\s+Group\s+([A-L])$/i);
    if (match) {
        let groupLetter = match[1].toUpperCase();
        return `وصيف المجموعة (${groupLetter})`;
    }
    match = name.match(/^3rd\s+Group\s+([A-L\/]+)$/i);
    if (match) {
        let groups = match[1].toUpperCase().split('/');
        return `ثالث المجموعة (${groups.join('/')})`;
    }
    return translateToArabic(name);
}

// ===== دوال النتائج =====
function determineWinner(matchResult) {
    if (!matchResult) return null;

    if (matchResult.hadPenalties && matchResult.homePenalty !== null && matchResult.awayPenalty !== null) {
        if (parseInt(matchResult.homePenalty) > parseInt(matchResult.awayPenalty)) {
            return matchResult.homeAr;
        } else if (parseInt(matchResult.awayPenalty) > parseInt(matchResult.homePenalty)) {
            return matchResult.awayAr;
        }
        return null;
    }

    if (matchResult.homeScore > matchResult.awayScore) {
        return matchResult.homeAr;
    } else if (matchResult.awayScore > matchResult.homeScore) {
        return matchResult.awayAr;
    }

    return null;
}

function findMatchResult(team1, team2) {
    // البحث في البيانات المحملة
    let match = state.previousGamesData.find(m => 
        (m.homeAr === team1 && m.awayAr === team2) || 
        (m.homeAr === team2 && m.awayAr === team1)
    );
    
    if (match) {
        let result = {
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            homeAr: match.homeAr,
            awayAr: match.awayAr,
            homePenalty: match.homePenalty || null,
            awayPenalty: match.awayPenalty || null,
            hadPenalties: match.hadPenalties || false
        };
        result.winner = determineWinner(result);
        return result;
    }

    // البحث في بيانات OpenFootball
    if (state.openfootballMatches && state.openfootballMatches.length) {
        let m = state.openfootballMatches.find(m => {
            const h = translateToArabic(m.team1 || '');
            const a = translateToArabic(m.team2 || '');
            return (h === team1 && a === team2) || (h === team2 && a === team1);
        });
        
        if (m && (m.finished === true || m.finished === "TRUE" || m.status === 'finished')) {
            let homeScore = m.home_score || m.goals1?.length || 0;
            let awayScore = m.away_score || m.goals2?.length || 0;
            let homeAr = translateToArabic(m.team1 || '');
            let awayAr = translateToArabic(m.team2 || '');
            let result = { homeScore, awayScore, homeAr, awayAr, homePenalty: null, awayPenalty: null, hadPenalties: false };
            
            if (m.penalties && typeof m.penalties === 'object') {
                let hPen = m.penalties.home_score || m.penalties.home || null;
                let aPen = m.penalties.away_score || m.penalties.away || null;
                if (hPen !== null && aPen !== null) {
                    result.homePenalty = parseInt(hPen);
                    result.awayPenalty = parseInt(aPen);
                    result.hadPenalties = true;
                }
            }
            result.winner = determineWinner(result);
            return result;
        }
    }

    return null;
}

// ===== دوال التوقعات المحلية =====
function getSubmittedMatches() {
    try {
        const raw = localStorage.getItem('submitted_matches');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
}

function addSubmittedMatch(matchId) {
    const current = getSubmittedMatches();
    if (!current.includes(matchId)) {
        current.push(matchId);
        localStorage.setItem('submitted_matches', JSON.stringify(current));
    }
}

function isMatchSubmitted(matchId) {
    return getSubmittedMatches().includes(matchId);
}

function getLocalPredictions() {
    try {
        const data = localStorage.getItem('predictions');
        return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
}

function saveLocalPrediction(userName, matchId, prediction) {
    try {
        const predictions = getLocalPredictions();
        predictions[`${userName}_${matchId}`] = { userName, matchId, prediction, timestamp: new Date().toISOString() };
        localStorage.setItem('predictions', JSON.stringify(predictions));
        return true;
    } catch (e) { return false; }
}

// ===== دوال إحصائيات الفرق =====
function getTeamStats(teamName) {
    const games = state.previousGamesData || [];
    let wins = 0, losses = 0, draws = 0, goalsFor = 0, goalsAgainst = 0;
    const results = [];

    for (let game of games) {
        let isHome = game.homeAr === teamName;
        let isAway = game.awayAr === teamName;
        if (!isHome && !isAway) continue;

        const result = {
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            homeAr: game.homeAr,
            awayAr: game.awayAr,
            homePenalty: game.homePenalty,
            awayPenalty: game.awayPenalty,
            hadPenalties: game.hadPenalties
        };
        const winner = determineWinner(result);

        if (isHome) {
            goalsFor += game.homeScore;
            goalsAgainst += game.awayScore;
            if (winner === teamName) { wins++; results.push('W'); }
            else if (winner === game.awayAr) { losses++; results.push('L'); }
            else { draws++; results.push('D'); }
        } else {
            goalsFor += game.awayScore;
            goalsAgainst += game.homeScore;
            if (winner === teamName) { wins++; results.push('W'); }
            else if (winner === game.homeAr) { losses++; results.push('L'); }
            else { draws++; results.push('D'); }
        }
    }

    const total = wins + losses + draws;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    const goalDiff = goalsFor - goalsAgainst;

    // أفضل الهدافين من OpenFootball
    const scorers = {};
    if (state.openfootballMatches) {
        for (let match of state.openfootballMatches) {
            const homeTeam = translateToArabic(match.team1 || '');
            const awayTeam = translateToArabic(match.team2 || '');
            if (homeTeam !== teamName && awayTeam !== teamName) continue;
            
            const goals = [...(match.goals1 || []), ...(match.goals2 || [])];
            for (let g of goals) {
                if (!g.name) continue;
                if (!scorers[g.name]) scorers[g.name] = 0;
                scorers[g.name]++;
            }
        }
    }

    const topScorers = Object.entries(scorers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([name, goals]) => ({ name, goals }));

    return {
        wins, losses, draws, total, winRate,
        goalsFor, goalsAgainst, goalDiff,
        results, topScorers
    };
}

// ===== التهيئة =====
async function init() {
    console.log("🚀 تهيئة التطبيق...");
    
    // تحميل البيانات
    const [games, openfootball, predictions] = await Promise.all([
        fetchPreviousGames(),
        fetchOpenfootballMatches(),
        fetchAllPredictions()
    ]);

    state.previousGamesData = games;
    state.openfootballMatches = openfootball;
    state.predictions = predictions;
    state.loaded = true;

    // تحديث واجهة المستخدم
    renderAllPredictions();
    updateScorers();
    renderLeaderboard('all');
    renderUpcoming();
    calculateStandings();
    renderTeamStats();
    renderScorers();
    renderBracket();
    initTabs();
    checkUrlForMatch();
    startAutoUpdate();
    updateNewsTicker();

    console.log("✅ تهيئة التطبيق مكتملة");
}
