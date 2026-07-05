// ============================================================
// ui.js - واجهة المستخدم (العرض، التفاعلات، النوافذ المنبثقة)
// ============================================================

// ===== دوال العرض الأساسية =====

// عرض المباريات القادمة
function renderUpcoming() {
    try {
        const groupFilter = document.getElementById('groupFilter')?.value || 'all';
        let active = [];
        
        if (groupFilter === 'all') {
            active = upcomingMatches(matchesData);
        } else {
            const teams = finalGroups[groupFilter] || [];
            active = matchesData.filter(m => teams.includes(m.team1) || teams.includes(m.team2));
        }
        
        active.sort((a, b) => matchTime(a.timeISO) - matchTime(b.timeISO));
        
        if (groupFilter === 'all') {
            if (currentDayFilter === 'today') {
                active = active.filter(m => isTodaySaudi(m.timeISO));
            } else if (currentDayFilter === 'tomorrow') {
                active = active.filter(m => isTomorrowSaudi(m.timeISO));
            } else if (currentDayFilter === 'week') {
                const today = getSaudiNow();
                const weekLater = new Date(today);
                weekLater.setDate(weekLater.getDate() + 7);
                active = active.filter(m => {
                    const d = toSaudiTime(m.timeISO);
                    return d >= today && d <= weekLater;
                });
            }
        }
        
        const container = document.getElementById('matchesContainer');
        document.getElementById('upcomingCount').textContent = active.length;
        
        if (!active.length) {
            container.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد مباريات تطابق الفلاتر</div>`;
            return;
        }
        
        container.innerHTML = active.map(m => {
            const isUpcoming = (matchTime(m.timeISO) + MATCH_DURATION) > now();
            return renderMatchCard(m, isUpcoming);
        }).join('');
        
        updateShareAllCount();
    } catch (e) {
        console.error("renderUpcoming:", e);
        document.getElementById('matchesContainer').innerHTML = `<div class="empty-state"><span class="icon">⚠️</span> حدث خطأ</div>`;
    }
}

// عرض بطاقة المباراة
function renderMatchCard(m, isUpcoming) {
    const st = getMatchStatus(m);
    const isLive = st.live;
    const isFinished = st.finished;
    const matchId = `${m.timeISO}_${m.team1}_${m.team2}`;
    const submitted = isMatchSubmitted(matchId);
    const canPredictNow = isUpcoming && !isLive && !isFinished && canPredict(m.timeISO);
    const userHasPrediction = userPredictionsMap && userPredictionsMap[matchId] === true;

    let scoreDisplay = '🆚', scoreClass = 'upcoming', matchClass = '';
    let homeScore = 0, awayScore = 0, matchResult = null;
    let penaltyHtml = '';

    if (isLive) {
        scoreDisplay = '🔴 LIVE';
        scoreClass = 'live';
        matchClass = 'live';
    } else if (isFinished) {
        const result = findMatchResult(m.team1, m.team2);
        if (result) {
            homeScore = result.homeScore;
            awayScore = result.awayScore;
            scoreDisplay = `${homeScore} - ${awayScore}`;
            scoreClass = 'finished';
            matchClass = 'finished-match';
            matchResult = { homeScore, awayScore };
            if (result.hadPenalties && result.homePenalty !== null && result.awayPenalty !== null) {
                penaltyHtml = `<span class="score-penalty-badge">⚽ ركلات ترجيح: ${result.homePenalty} — ${result.awayPenalty}</span>`;
            }
        } else {
            scoreDisplay = '✅';
            scoreClass = 'finished';
            matchClass = 'finished-match';
        }
    }

    // نسبة الفوز الذكية
    const team1Stats = getTeamStats(m.team1);
    const team2Stats = getTeamStats(m.team2);
    let smartWinRate1 = 50, smartWinRate2 = 50;
    
    if (team1Stats.total > 0 && team2Stats.total > 0) {
        const totalGoals1 = team1Stats.goalsFor + team1Stats.goalsAgainst;
        const totalGoals2 = team2Stats.goalsFor + team2Stats.goalsAgainst;
        if (totalGoals1 > 0 && totalGoals2 > 0) {
            const attack1 = team1Stats.goalsFor / team1Stats.total;
            const defense1 = team1Stats.goalsAgainst / team1Stats.total;
            const attack2 = team2Stats.goalsFor / team2Stats.total;
            const defense2 = team2Stats.goalsAgainst / team2Stats.total;
            
            const strength1 = (attack1 * 1.5) + (1 / (defense1 + 0.5));
            const strength2 = (attack2 * 1.5) + (1 / (defense2 + 0.5));
            const total = strength1 + strength2;
            smartWinRate1 = total > 0 ? (strength1 / total) * 100 : 50;
            smartWinRate2 = 100 - smartWinRate1;
        }
    } else if (team1Stats.total > 0) {
        smartWinRate1 = Math.min(100, Math.max(0, team1Stats.winRate));
        smartWinRate2 = 100 - smartWinRate1;
    } else if (team2Stats.total > 0) {
        smartWinRate2 = Math.min(100, Math.max(0, team2Stats.winRate));
        smartWinRate1 = 100 - smartWinRate2;
    }

    // أزرار التوقع
    let predictBtnHtml = 'توقع الآن';
    let predictDisabled = false;
    let predictBtnClass = 'predict-btn';
    let predictBtnExtra = '';

    if (userHasPrediction || submitted) {
        predictDisabled = true;
        predictBtnHtml = '✅ تم التوقع';
        predictBtnClass += ' submitted';
        predictBtnExtra = 'disabled';
    } else if (!canPredictNow) {
        predictDisabled = true;
        if (isFinished) {
            predictBtnHtml = '📋 عرض التوقعات';
            predictBtnClass += ' view-btn';
            predictBtnExtra = `onclick="openMatchPredictions('${matchId}', '${m.team1}', '${m.team2}', ${homeScore}, ${awayScore})"`;
        } else {
            predictBtnHtml = '⏳ غير متاح';
            predictBtnClass += ' view-btn';
            predictBtnExtra = 'disabled';
        }
    } else {
        predictBtnExtra = `onclick="openNameModal('${matchId}','${m.team1}','${m.team2}','${m.timeISO}')"`;
    }

    return `
        <div class="match-card ${matchClass}">
            <div class="match-teams">
                <div class="match-team"><span class="flag">${getFlag(m.team1)}</span> ${m.team1}</div>
                <div class="match-score ${scoreClass}">${scoreDisplay} ${penaltyHtml}</div>
                <div class="match-team"><span class="flag">${getFlag(m.team2)}</span> ${m.team2}</div>
            </div>
            
            <div class="win-probability" style="margin:8px 0 6px 0;padding:6px 12px;">
                <div class="prob-title" style="font-size:0.6rem;">📊 نسبة الفوز المتوقعة (تحليل ذكي)</div>
                <div class="prob-bar" style="height:18px;">
                    <div class="segment home" style="width:${Math.round(smartWinRate1)}%;background:${smartWinRate1 >= 50 ? 'var(--success)' : 'var(--danger)'};">${Math.round(smartWinRate1)}%</div>
                    <div class="segment away" style="width:${Math.round(smartWinRate2)}%;background:${smartWinRate2 >= 50 ? 'var(--success)' : 'var(--danger)'};">${Math.round(smartWinRate2)}%</div>
                </div>
                <div class="prob-labels" style="font-size:0.5rem;">
                    <span class="label"><span class="dot home" style="background:${smartWinRate1 >= 50 ? 'var(--success)' : 'var(--danger)'};"></span> ${m.team1}</span>
                    <span class="label"><span class="dot away" style="background:${smartWinRate2 >= 50 ? 'var(--success)' : 'var(--danger)'};"></span> ${m.team2}</span>
                </div>
            </div>
            
            <div style="display:flex;justify-content:center;margin:6px 0 8px 0;">
                <button class="admin-btn secondary" onclick="event.stopPropagation();openTeamStatsModal('${m.team1}','${m.team2}')" style="padding:4px 16px;font-size:0.6rem;background:var(--info-bg);border:1px solid rgba(74,158,255,0.15);color:var(--info);">
                    📊 عرض إحصائيات الفريقين
                </button>
            </div>
            
            <div class="match-meta">
                <span class="tag">🏅 ${m.roundLabel}</span>
                ${isUpcoming ? `<span class="timer ${isLive ? 'live' : ''}">${isLive ? '🔴 تُلعب الآن' : st.text}</span>` : `<span class="tag finished-tag">✅ انتهت</span>`}
            </div>
            
            <div class="match-meta" style="margin-top:4px;">
                <span class="tag">${getDay(m.timeISO)}</span>
                <span class="tag">${getDateTimeDisplay(m.timeISO)}</span>
            </div>
            
            ${isUpcoming ? `
                <div class="predict-btn-wrap">
                    <div class="btn-group">
                        <button class="${predictBtnClass}" ${predictBtnExtra}>${predictBtnHtml}</button>
                    </div>
                    <button class="view-btn" onclick="openViewPredictionsModal('${matchId}','${m.team1}','${m.team2}')">
                        📋 استعراض التوقعات
                    </button>
                    <button class="share-link-btn" onclick="copyMatchLink('${m.id}', '${m.team1}', '${m.team2}')">
                        🔗 مشاركة
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// ===== لوحة المتصدرين =====
function renderLeaderboard(period) {
    const container = document.getElementById("leaderboardContainer");
    // ... تنفيذ عرض لوحة المتصدرين (كما في الكود الأصلي) ...
}

// ===== دوال النوافذ المنبثقة =====
function openNameModal(matchId, team1, team2, timeISO) {
    // ... تنفيذ نافذة إدخال الاسم ...
}

function openPredictionModal(matchId, team1, team2, timeISO, userName) {
    // ... تنفيذ نافذة التوقع ...
}

function openMatchPredictions(matchId, team1, team2, homeScore, awayScore) {
    // ... تنفيذ نافذة توقعات المباراة ...
}

function openViewPredictionsModal(matchId, team1, team2) {
    // ... تنفيذ نافذة استعراض التوقعات ...
}

function openPlayerPredictions(userName) {
    // ... تنفيذ نافذة توقعات اللاعب ...
}

function openTeamStatsModal(team1, team2) {
    // ... تنفيذ نافذة إحصائيات الفريقين ...
}

function openAnalytics() {
    // ... تنفيذ نافذة التحليلات ...
}

function openCompareModal(selectedPlayer) {
    // ... تنفيذ نافذة المقارنة ...
}

// ===== دوال المشاركة =====
function shareResults() {
    // ... مشاركة النتائج ...
}

function copyMatchLink(matchId, team1, team2) {
    // ... نسخ رابط المباراة ...
}

function shareAllTodayTomorrow() {
    // ... مشاركة جميع روابط اليوم والغد ...
}

// ===== دوال الإدارة =====
function toggleCompactMode() {
    // ... تفعيل وضع التصغير ...
}

function resetCompactMode() {
    // ... إعادة الحجم الطبيعي ...
}

function toggleModalCompact() {
    // ... تصغير/تكبير الجدول في النافذة ...
}

function loadDuplicates() {
    // ... عرض التوقعات المكررة ...
}

function toggleArchive() {
    // ... عرض الأرشيف ...
}

function toggleBracketAdmin() {
    // ... عرض مسار البطولة ...
}

function runTests() {
    // ... تشغيل الاختبارات ...
}

// ===== دوال التحليلات =====
function populatePlayerAnalyticsSelect() {
    // ... تعبئة قائمة اللاعبين للتحليل ...
}

function updatePlayerAnalytics() {
    // ... تحديث تحليلات اللاعب ...
}

function renderMatchAnalytics() {
    // ... عرض تحليلات المباريات ...
}

// ===== دوال مساعدة =====
function showCopyToast(msg) {
    const t = document.getElementById('copyToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme === 'light' ? 'light' : '');
    localStorage.setItem('theme', newTheme);
    document.getElementById('themeToggleBtn').textContent = newTheme === 'light' ? '☀️ الوضع الفاتح' : '🌙 الوضع المظلم';
}

// ===== التبويبات =====
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            const target = document.getElementById(`${id}Tab`);
            if (target) target.classList.add('active');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const dayFilter = document.getElementById('dayFilterTabs');
            if (id === 'upcoming') dayFilter.classList.add('visible');
            else dayFilter.classList.remove('visible');
            
            if (id === 'previous' && !state.previousGamesData.length) loadPreviousGamesFull();
            if (id === 'standings' && state.previousGamesData.length) calculateStandings();
            if (id === 'scorers') renderScorers();
            if (id === 'stats') renderTeamStats();
            if (id === 'predictions') renderAllPredictions();
        });
    });
}

// ===== التحديث التلقائي =====
function startAutoUpdate() {
    setInterval(renderUpcoming, 1000);
    setInterval(async () => {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (activeTab === 'previous') loadPreviousGamesFull();
        if (activeTab === 'standings' && state.previousGamesData.length) calculateStandings();
        if (activeTab === 'scorers') renderScorers();
        if (activeTab === 'stats') renderTeamStats();
        if (activeTab === 'predictions') await renderAllPredictions();
        renderLeaderboard(currentLeaderboardPeriod);
        updateShareAllCount();
        updateNewsTicker();
    }, 30000);
}

// ===== التحقق من رابط المباراة =====
function checkUrlForMatch() {
    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('m');
    if (matchId && !isNaN(matchId)) {
        const match = matchesData.find(m => m.id === parseInt(matchId));
        if (match && !isMatchFinished(match.timeISO)) {
            setTimeout(() => {
                openNameModal(`${match.timeISO}_${match.team1}_${match.team2}`, match.team1, match.team2, match.timeISO);
            }, 800);
        }
    }
}

// ===== التصدير للاستخدام العام =====
window.renderUpcoming = renderUpcoming;
window.renderLeaderboard = renderLeaderboard;
window.openNameModal = openNameModal;
window.openPredictionModal = openPredictionModal;
window.openMatchPredictions = openMatchPredictions;
window.openViewPredictionsModal = openViewPredictionsModal;
window.openPlayerPredictions = openPlayerPredictions;
window.openTeamStatsModal = openTeamStatsModal;
window.openAnalytics = openAnalytics;
window.openCompareModal = openCompareModal;
window.shareResults = shareResults;
window.copyMatchLink = copyMatchLink;
window.shareAllTodayTomorrow = shareAllTodayTomorrow;
window.toggleCompactMode = toggleCompactMode;
window.resetCompactMode = resetCompactMode;
window.toggleModalCompact = toggleModalCompact;
window.loadDuplicates = loadDuplicates;
window.toggleArchive = toggleArchive;
window.toggleBracketAdmin = toggleBracketAdmin;
window.runTests = runTests;
window.toggleTheme = toggleTheme;
window.setLeaderboardPeriod = setLeaderboardPeriod;
window.updatePlayerAnalytics = updatePlayerAnalytics;
window.renderCompare = renderCompare;
window.closeCompareModal = closeCompareModal;
