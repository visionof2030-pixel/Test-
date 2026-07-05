// ============================================================
// core.js - المنطق الأساسي للتطبيق
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
    // الجولات الثلاث الأولى
    { id: 1, team1: "المكسيك", team2: "جنوب أفريقيا", time: "2026-06-11T22:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 2, team1: "الأرجنتين", team2: "الجزائر", time: "2026-06-11T04:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 3, team1: "النمسا", team2: "الأردن", time: "2026-06-11T07:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 4, team1: "البرتغال", team2: "الكونغو الديمقراطية", time: "2026-06-11T20:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 5, team1: "كوريا الجنوبية", team2: "التشيك", time: "2026-06-12T05:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 6, team1: "كندا", team2: "البوسنة والهرسك", time: "2026-06-12T22:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 7, team1: "أمريكا", team2: "العراق", time: "2026-06-13T04:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 8, team1: "سويسرا", team2: "قطر", time: "2026-06-13T22:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 9, team1: "البرازيل", team2: "المغرب", time: "2026-06-14T01:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 10, team1: "هايتي", team2: "إسكتلندا", time: "2026-06-14T04:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 11, team1: "أستراليا", team2: "تركيا", time: "2026-06-14T07:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 12, team1: "ألمانيا", team2: "كوراساو", time: "2026-06-14T20:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 13, team1: "اليابان", team2: "هولندا", time: "2026-06-14T23:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 14, team1: "الإكوادور", team2: "ساحل العاج", time: "2026-06-15T02:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 15, team1: "السويد", team2: "تونس", time: "2026-06-15T05:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 16, team1: "إسبانيا", team2: "الرأس الأخضر", time: "2026-06-15T19:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 17, team1: "مصر", team2: "بلجيكا", time: "2026-06-15T22:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 18, team1: "السعودية", team2: "أوروغواي", time: "2026-06-16T01:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 19, team1: "إيران", team2: "نيوزيلندا", time: "2026-06-16T04:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 20, team1: "السنغال", team2: "فرنسا", time: "2026-06-16T22:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 21, team1: "النرويج", team2: "العراق", time: "2026-06-17T01:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 22, team1: "الجزائر", team2: "الأرجنتين", time: "2026-06-17T04:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 23, team1: "الأردن", team2: "النمسا", time: "2026-06-17T07:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 24, team1: "البرتغال", team2: "كرواتيا", time: "2026-06-17T20:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    { id: 25, team1: "إنجلترا", team2: "كرواتيا", time: "2026-06-17T23:00:00+03:00", round: "first", roundLabel: "الجولة الأولى" },
    // الجولة الثانية
    { id: 26, team1: "جنوب أفريقيا", team2: "التشيك", time: "2026-06-18T19:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 27, team1: "سويسرا", team2: "البوسنة والهرسك", time: "2026-06-18T22:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 28, team1: "قطر", team2: "كندا", time: "2026-06-19T01:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 29, team1: "المكسيك", team2: "كوريا الجنوبية", time: "2026-06-19T04:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 30, team1: "أستراليا", team2: "أمريكا", time: "2026-06-19T22:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 31, team1: "المغرب", team2: "إسكتلندا", time: "2026-06-20T01:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 32, team1: "البرازيل", team2: "هايتي", time: "2026-06-20T03:30:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 33, team1: "تركيا", team2: "باراغواي", time: "2026-06-20T06:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 34, team1: "السويد", team2: "هولندا", time: "2026-06-20T20:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 35, team1: "ساحل العاج", team2: "ألمانيا", time: "2026-06-20T23:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 36, team1: "الإكوادور", team2: "كوراساو", time: "2026-06-21T03:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 37, team1: "اليابان", team2: "تونس", time: "2026-06-21T07:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 38, team1: "إسبانيا", team2: "السعودية", time: "2026-06-21T19:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 39, team1: "بلجيكا", team2: "إيران", time: "2026-06-21T22:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 40, team1: "أوروغواي", team2: "الرأس الأخضر", time: "2026-06-22T01:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 41, team1: "مصر", team2: "نيوزيلندا", time: "2026-06-22T04:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 42, team1: "الأرجنتين", team2: "النمسا", time: "2026-06-22T20:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 43, team1: "العراق", team2: "فرنسا", time: "2026-06-23T00:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 44, team1: "النرويج", team2: "السنغال", time: "2026-06-23T03:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 45, team1: "الأردن", team2: "الجزائر", time: "2026-06-23T06:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 46, team1: "البرتغال", team2: "أوزبكستان", time: "2026-06-23T20:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 47, team1: "إنجلترا", team2: "غانا", time: "2026-06-23T23:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 48, team1: "بنما", team2: "كرواتيا", time: "2026-06-24T02:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    { id: 49, team1: "كولومبيا", team2: "الكونغو الديمقراطية", time: "2026-06-24T05:00:00+03:00", round: "second", roundLabel: "الجولة الثانية" },
    // الجولة الثالثة
    { id: 50, team1: "كندا", team2: "سويسرا", time: "2026-06-24T22:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 51, team1: "قطر", team2: "البوسنة والهرسك", time: "2026-06-24T22:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 52, team1: "المغرب", team2: "هايتي", time: "2026-06-25T01:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 53, team1: "إسكتلندا", team2: "البرازيل", time: "2026-06-25T01:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 54, team1: "جنوب أفريقيا", team2: "كوريا الجنوبية", time: "2026-06-25T04:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 55, team1: "المكسيك", team2: "التشيك", time: "2026-06-25T04:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 56, team1: "كوراساو", team2: "ساحل العاج", time: "2026-06-25T23:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 57, team1: "ألمانيا", team2: "الإكوادور", time: "2026-06-25T23:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 58, team1: "هولندا", team2: "تونس", time: "2026-06-26T02:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 59, team1: "اليابان", team2: "السويد", time: "2026-06-26T02:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 60, team1: "أمريكا", team2: "تركيا", time: "2026-06-26T05:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 61, team1: "أستراليا", team2: "باراغواي", time: "2026-06-26T05:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 62, team1: "فرنسا", team2: "النرويج", time: "2026-06-26T22:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 63, team1: "السنغال", team2: "العراق", time: "2026-06-26T22:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 64, team1: "السعودية", team2: "الرأس الأخضر", time: "2026-06-27T03:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 65, team1: "إسبانيا", team2: "أوروغواي", time: "2026-06-27T03:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 66, team1: "إيران", team2: "مصر", time: "2026-06-27T06:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 67, team1: "نيوزيلندا", team2: "بلجيكا", time: "2026-06-27T06:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 68, team1: "إنجلترا", team2: "بنما", time: "2026-06-28T00:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 69, team1: "كرواتيا", team2: "غانا", time: "2026-06-28T00:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 70, team1: "البرتغال", team2: "كولومبيا", time: "2026-06-28T02:30:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 71, team1: "الكونغو الديمقراطية", team2: "أوزبكستان", time: "2026-06-28T02:30:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 72, team1: "الجزائر", team2: "النمسا", time: "2026-06-28T05:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    { id: 73, team1: "الأردن", team2: "الأرجنتين", time: "2026-06-28T05:00:00+03:00", round: "third", roundLabel: "الجولة الثالثة" },
    // دور الـ 32
    { id: 101, team1: "جنوب أفريقيا", team2: "كندا", time: "2026-06-28T22:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 102, team1: "البرازيل", team2: "اليابان", time: "2026-06-29T20:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 103, team1: "ألمانيا", team2: "باراغواي", time: "2026-06-29T23:30:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 104, team1: "هولندا", team2: "المغرب", time: "2026-06-30T04:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 105, team1: "ساحل العاج", team2: "النرويج", time: "2026-06-30T20:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 106, team1: "فرنسا", team2: "السويد", time: "2026-07-01T00:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 107, team1: "المكسيك", team2: "الإكوادور", time: "2026-07-01T04:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 108, team1: "إنجلترا", team2: "الكونغو الديمقراطية", time: "2026-07-01T19:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 109, team1: "بلجيكا", team2: "السنغال", time: "2026-07-01T23:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 110, team1: "أمريكا", team2: "البوسنة والهرسك", time: "2026-07-02T03:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 111, team1: "إسبانيا", team2: "النمسا", time: "2026-07-02T22:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 112, team1: "البرتغال", team2: "كرواتيا", time: "2026-07-03T02:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 113, team1: "سويسرا", team2: "الجزائر", time: "2026-07-03T06:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 114, team1: "أستراليا", team2: "مصر", time: "2026-07-03T21:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 115, team1: "الأرجنتين", team2: "الرأس الأخضر", time: "2026-07-04T01:00:00+03:00", round: "round32", roundLabel: "دور الـ 32" },
    { id: 116, team1: "كولومبيا", team2: "غانا", time: "2026-07-04T04:30:00+03:00", round: "round32", roundLabel: "دور الـ 32" }
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
        const fiveMin = 5 * 60 * 1000;
        const remainingText = diff < fiveMin ? '⏳ تنطلق خلال أقل من 5 دقائق' : `⏱️ ${h}h ${min}m`;
        return { live: false, finished: false, text: remainingText };
    } else if (cur <= end) {
        return { live: true, finished: false, text: "🔴 تُلعب الآن" };
    }
    return { live: false, finished: true, text: "✅ انتهت" };
}

function upcomingMatches(arr) {
    return arr.filter(m => (matchTime(m.timeISO) + MATCH_DURATION) > now());
}

function toSaudiTime(isoString) {
    return new Date(isoString);
}

function getSaudiNow() {
    return new Date();
}

function isTodaySaudi(isoString) {
    const d = toSaudiTime(isoString);
    const now = getSaudiNow();
    return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
}

function isTomorrowSaudi(isoString) {
    const d = toSaudiTime(isoString);
    const now = getSaudiNow();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.getFullYear() === tomorrow.getFullYear() &&
        d.getMonth() === tomorrow.getMonth() &&
        d.getDate() === tomorrow.getDate();
}

function getDay(t) {
    const d = toSaudiTime(t);
    return ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getDay()];
}

function getDateFmt(t) {
    const d = toSaudiTime(t);
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getTimeFromISO(t) {
    const d = toSaudiTime(t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getDateTimeDisplay(t) {
    return `${getDateFmt(t)} - ${getTimeFromISO(t)}`;
}

function formatDate(isoString) {
    if (!isoString) return 'تاريخ غير معروف';
    return getDateTimeDisplay(isoString);
}

// ===== دوال الترجمة =====
const nameMapping = new Map([
    ["مکزیک", "المكسيك"],
    ["Mexico", "المكسيك"],
    ["مكسيك", "المكسيك"],
    ["آفریقای جنوبی", "جنوب أفريقيا"],
    ["South Africa", "جنوب أفريقيا"],
    ["افریقای جنوبی", "جنوب أفريقيا"],
    ["آرژانتین", "الأرجنتين"],
    ["Argentina", "الأرجنتين"],
    ["ارژانتین", "الأرجنتين"],
    ["الجزایر", "الجزائر"],
    ["Algeria", "الجزائر"],
    ["الجزائر", "الجزائر"],
    ["اتریش", "النمسا"],
    ["Austria", "النمسا"],
    ["اتریش", "النمسا"],
    ["اردن", "الأردن"],
    ["Jordan", "الأردن"],
    ["اردن", "الأردن"],
    ["پرتغال", "البرتغال"],
    ["پرتقال", "البرتغال"],
    ["Portugal", "البرتغال"],
    ["پرتغال", "البرتغال"],
    ["کنگو دمکراتیک", "الكونغو الديمقراطية"],
    ["جمهوری کنگو", "الكونغو الديمقراطية"],
    ["DR Congo", "الكونغو الديمقراطية"],
    ["کنگو", "الكونغو الديمقراطية"],
    ["کانگو", "الكونغو الديمقراطية"],
    ["دمکراتیک کنگو", "الكونغو الديمقراطية"],
    ["کره جنوبی", "كوريا الجنوبية"],
    ["South Korea", "كوريا الجنوبية"],
    ["کره جنوبي", "كوريا الجنوبية"],
    ["جمهوری چک", "التشيك"],
    ["Czech Republic", "التشيك"],
    ["چک", "التشيك"],
    ["کانادا", "كندا"],
    ["Canada", "كندا"],
    ["بوسنی و هرزگوین", "البوسنة والهرسك"],
    ["Bosnia and Herzegovina", "البوسنة والهرسك"],
    ["بوسنی", "البوسنة والهرسك"],
    ["آمریکا", "أمريكا"],
    ["United States", "أمريكا"],
    ["امریکا", "أمريكا"],
    ["US", "أمريكا"],
    ["عراق", "العراق"],
    ["Iraq", "العراق"],
    ["العراق", "العراق"],
    ["سوئیس", "سويسرا"],
    ["Switzerland", "سويسرا"],
    ["سویس", "سويسرا"],
    ["قطر", "قطر"],
    ["Qatar", "قطر"],
    ["برزیل", "البرازيل"],
    ["Brazil", "البرازيل"],
    ["برزیل", "البرازيل"],
    ["مراکش", "المغرب"],
    ["Morocco", "المغرب"],
    ["مراكش", "المغرب"],
    ["هائیتی", "هايتي"],
    ["Haiti", "هايتي"],
    ["هائیتی", "هايتي"],
    ["اسکاتلند", "إسكتلندا"],
    ["Scotland", "إسكتلندا"],
    ["اسكاتلند", "إسكتلندا"],
    ["استرالیا", "أستراليا"],
    ["Australia", "أستراليا"],
    ["استراليا", "أستراليا"],
    ["ترکیه", "تركيا"],
    ["Turkey", "تركيا"],
    ["ترکیه", "تركيا"],
    ["آلمان", "ألمانيا"],
    ["Germany", "ألمانيا"],
    ["المان", "ألمانيا"],
    ["کوراساو", "كوراساو"],
    ["Curaçao", "كوراساو"],
    ["کوراسائو", "كوراساو"],
    ["کوراساو", "كوراساو"],
    ["ژاپن", "اليابان"],
    ["Japan", "اليابان"],
    ["ژاپن", "اليابان"],
    ["هلند", "هولندا"],
    ["Netherlands", "هولندا"],
    ["هولندا", "هولندا"],
    ["اکوادور", "الإكوادور"],
    ["Ecuador", "الإكوادور"],
    ["اكوادور", "الإكوادور"],
    ["ساحل عاج", "ساحل العاج"],
    ["Ivory Coast", "ساحل العاج"],
    ["ساحل عاج", "ساحل العاج"],
    ["سوئد", "السويد"],
    ["Sweden", "السويد"],
    ["سويد", "السويد"],
    ["تونس", "تونس"],
    ["Tunisia", "تونس"],
    ["اسپانیا", "إسبانيا"],
    ["Spain", "إسبانيا"],
    ["اسبانيا", "إسبانيا"],
    ["کیپ ورد", "الرأس الأخضر"],
    ["Cape Verde", "الرأس الأخضر"],
    ["کیپ ورد", "الرأس الأخضر"],
    ["مصر", "مصر"],
    ["Egypt", "مصر"],
    ["بلژیک", "بلجيكا"],
    ["Belgium", "بلجيكا"],
    ["بلژیک", "بلجيكا"],
    ["عربستان سعودی", "السعودية"],
    ["سعودی", "السعودية"],
    ["Saudi Arabia", "السعودية"],
    ["السعودية", "السعودية"],
    ["اروگوئه", "أوروغواي"],
    ["اروگویه", "أوروغواي"],
    ["Uruguay", "أوروغواي"],
    ["اروگوئه", "أوروغواي"],
    ["ایران", "إيران"],
    ["Iran", "إيران"],
    ["نیوزیلند", "نيوزيلندا"],
    ["New Zealand", "نيوزيلندا"],
    ["نیوزیلند", "نيوزيلندا"],
    ["سنگال", "السنغال"],
    ["Senegal", "السنغال"],
    ["سنگال", "السنغال"],
    ["فرانسه", "فرنسا"],
    ["France", "فرنسا"],
    ["فرانسه", "فرنسا"],
    ["نروژ", "النرويج"],
    ["Norway", "النرويج"],
    ["نروژ", "النرويج"],
    ["انگلستان", "إنجلترا"],
    ["England", "إنجلترا"],
    ["انگلستان", "إنجلترا"],
    ["کرواسی", "كرواتيا"],
    ["Croatia", "كرواتيا"],
    ["کرواسی", "كرواتيا"],
    ["پاناما", "بنما"],
    ["Panama", "بنما"],
    ["پاناما", "بنما"],
    ["کلمبیا", "كولومبيا"],
    ["Colombia", "كولومبيا"],
    ["کلمبیا", "كولومبيا"],
    ["ازبکستان", "أوزبكستان"],
    ["Uzbekistan", "أوزبكستان"],
    ["ازبکستان", "أوزبكستان"],
    ["غنا", "غانا"],
    ["Ghana", "غانا"],
    ["پاراگوئه", "باراغواي"],
    ["Paraguay", "باراغواي"],
    ["پاراگوئه", "باراغواي"]
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

function getUserPredictionFromLocal(userName, matchId) {
    if (!userName) return null;
    return getLocalPredictions()[`${userName}_${matchId}`] || null;
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
    
    const [games, openfootball, predictions] = await Promise.all([
        fetchPreviousGames(),
        fetchOpenfootballMatches(),
        fetchAllPredictions()
    ]);

    state.previousGamesData = games;
    state.openfootballMatches = openfootball;
    state.predictions = predictions;
    state.loaded = true;

    // سيتم استدعاء دوال UI من ui.js
    if (typeof renderAllPredictions === 'function') renderAllPredictions();
    if (typeof updateScorers === 'function') updateScorers();
    if (typeof renderLeaderboard === 'function') renderLeaderboard('all');
    if (typeof renderUpcoming === 'function') renderUpcoming();
    if (typeof calculateStandings === 'function') calculateStandings();
    if (typeof renderTeamStats === 'function') renderTeamStats();
    if (typeof renderScorers === 'function') renderScorers();
    if (typeof renderBracket === 'function') renderBracket();
    if (typeof initTabs === 'function') initTabs();
    if (typeof checkUrlForMatch === 'function') checkUrlForMatch();
    if (typeof startAutoUpdate === 'function') startAutoUpdate();
    if (typeof updateNewsTicker === 'function') updateNewsTicker();

    console.log("✅ تهيئة التطبيق مكتملة");
}
