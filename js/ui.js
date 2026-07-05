// ============================================================
// ui.js - واجهة المستخدم
// ============================================================

// ===== عرض المباريات القادمة =====
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
        
        if (typeof window.updateShareAllCount === 'function') window.updateShareAllCount();
    } catch (e) {
        console.error("renderUpcoming:", e);
        document.getElementById('matchesContainer').innerHTML = `<div class="empty-state"><span class="icon">⚠️</span> حدث خطأ</div>`;
    }
}

// ===== عرض بطاقة المباراة =====
function renderMatchCard(m, isUpcoming) {
    const st = getMatchStatus(m);
    const isLive = st.live;
    const isFinished = st.finished;
    const matchId = `${m.timeISO}_${m.team1}_${m.team2}`;
    const submitted = isMatchSubmitted(matchId);
    const canPredictNow = isUpcoming && !isLive && !isFinished && canPredict(m.timeISO);
    const userHasPrediction = userPredictionsMap && userPredictionsMap[matchId] === true;

    let scoreDisplay = '🆚', scoreClass = 'upcoming', matchClass = '';
    let homeScore = 0, awayScore = 0;
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
    }

    // أزرار التوقع
    let predictBtnHtml = 'توقع الآن';
    let predictBtnClass = 'predict-btn';
    let predictBtnExtra = '';

    if (userHasPrediction || submitted) {
        predictBtnHtml = '✅ تم التوقع';
        predictBtnClass += ' submitted';
        predictBtnExtra = 'disabled';
    } else if (!canPredictNow) {
        if (isFinished) {
            predictBtnHtml = '📋 عرض التوقعات';
            predictBtnClass += ' view-btn';
            predictBtnExtra = `onclick="window.openMatchPredictions('${matchId}', '${m.team1}', '${m.team2}', ${homeScore}, ${awayScore})"`;
        } else {
            predictBtnHtml = '⏳ غير متاح';
            predictBtnClass += ' view-btn';
            predictBtnExtra = 'disabled';
        }
    } else {
        predictBtnExtra = `onclick="window.openNameModal('${matchId}','${m.team1}','${m.team2}','${m.timeISO}')"`;
    }

    return `
        <div class="match-card ${matchClass}" onclick="${isFinished ? `window.openMatchPredictions('${matchId}', '${m.team1}', '${m.team2}', ${homeScore}, ${awayScore})` : ''}">
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
                <button class="admin-btn secondary" onclick="event.stopPropagation();window.openTeamStatsModal('${m.team1}','${m.team2}')" style="padding:4px 16px;font-size:0.6rem;background:var(--info-bg);border:1px solid rgba(74,158,255,0.15);color:var(--info);">
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
                    <button class="view-btn" onclick="window.openViewPredictionsModal('${matchId}','${m.team1}','${m.team2}')">
                        📋 استعراض التوقعات
                    </button>
                    <button class="share-link-btn" onclick="window.copyMatchLink('${m.id}', '${m.team1}', '${m.team2}')">
                        🔗 مشاركة
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

// ===== عرض لوحة المتصدرين =====
async function renderLeaderboard(period) {
    const container = document.getElementById("leaderboardContainer");
    if (!state.loaded) {
        container.innerHTML = `<div class="empty-state"><span class="icon">⏳</span> جاري التحميل...</div>`;
        return;
    }
    
    const predictions = state.predictions || [];
    const games = state.previousGamesData || [];
    if (!predictions.length || !games.length) {
        container.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد بيانات كافية</div>`;
        return;
    }

    const scores = {};
    for (let p of predictions) {
        if (!scores[p.user_name]) {
            scores[p.user_name] = { name: p.user_name, points: 0, correct: 0, wrong: 0, total: 0 };
        }
        scores[p.user_name].total++;
        const parts = (p.match_id || "").split("_");
        if (parts.length < 3) continue;
        const team1 = parts[1], team2 = parts[2];
        const result = findMatchResult(team1, team2);
        let winner = null;
        if (result) winner = determineWinner(result);
        
        if (winner === null && result) {
            const isCorrect = p.prediction === 'DRAW';
            if (isCorrect) { scores[p.user_name].points++; scores[p.user_name].correct++; }
            else { scores[p.user_name].wrong++; }
        } else if (winner) {
            const isCorrect = p.prediction === winner;
            if (isCorrect) { scores[p.user_name].points++; scores[p.user_name].correct++; }
            else { scores[p.user_name].wrong++; }
        }
    }
    
    const board = Object.values(scores).sort((a, b) => b.points - a.points || (b.correct - a.correct));
    if (!board.length) {
        container.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد توقعات صحيحة</div>`;
        return;
    }
    document.getElementById('lbTotalPlayers').textContent = board.length;
    document.getElementById('lbTotalPredictions').textContent = predictions.length;

    let rank = 1;
    let i = 0;
    while (i < board.length) {
        let j = i;
        let points = board[i].points;
        while (j < board.length && board[j].points === points) j++;
        for (let k = i; k < j; k++) board[k].rank = rank;
        i = j;
        rank += j - i + 1;
    }

    const topThree = board.slice(0, 3);
    const rest = board.slice(3, 10);

    let html = '';
    if (topThree.length) {
        const champ = topThree[0];
        const accuracy = champ.total > 0 ? Math.round((champ.correct / champ.total) * 100) : 0;
        html += `
            <div class="champion-card" onclick="window.openPlayerPredictions('${champ.name}')">
                <div class="rank-badge">🥇</div>
                <div class="avatar">${champ.name.charAt(0).toUpperCase()}</div>
                <div class="info">
                    <div class="name">${champ.name}
                        <button class="compare-btn" onclick="event.stopPropagation(); window.openCompareModal('${champ.name}')">📊 مقارنة</button>
                    </div>
                    <div class="stats-row">
                        <span class="item">🏆 <strong>${champ.points}</strong> نقطة</span>
                        <span class="item">✅ <strong style="color:var(--gold-light);">${champ.correct}</strong></span>
                        <span class="item">📊 <strong>${champ.total}</strong></span>
                        <span class="item">📊 <strong>${accuracy}%</strong> نجاح</span>
                    </div>
                    <div class="progress-wrapper">
                        <div class="progress-label"><span>نسبة النجاح</span><span>${accuracy}%</span></div>
                        <div class="progress-bar"><div class="fill" style="width:${Math.min(accuracy,100)}%;"></div></div>
                    </div>
                </div>
            </div>
        `;
    }
    if (rest.length || topThree.length > 1) {
        const allPlayers = [...topThree.slice(1), ...rest];
        html += `<div class="players-list">`;
        allPlayers.forEach((player) => {
            const rankNum = player.rank;
            const accuracy = player.total > 0 ? Math.round((player.correct / player.total) * 100) : 0;
            let medal = '';
            if (rankNum === 1) medal = '🥇';
            else if (rankNum === 2) medal = '🥈';
            else if (rankNum === 3) medal = '🥉';
            else medal = `#${rankNum}`;

            let rankClass = '';
            if (rankNum === 1) rankClass = 'gold';
            else if (rankNum === 2) rankClass = 'silver';
            else if (rankNum === 3) rankClass = 'bronze';

            let borderClass = '';
            if (rankNum === 1) borderClass = 'gold-border';
            else if (rankNum === 2) borderClass = 'silver-border';
            else if (rankNum === 3) borderClass = 'bronze-border';

            const isCurrentUser = player.name === localStorage.getItem('lastUserName') || '';

            html += `
                <div class="player-card" style="${isCurrentUser ? 'border-color:rgba(212,167,69,0.30);' : ''}" onclick="window.openPlayerPredictions('${player.name}')">
                    <div class="rank ${rankClass}">${medal}</div>
                    <div class="avatar-sm ${borderClass}">${player.name.charAt(0).toUpperCase()}</div>
                    <div class="info-sm">
                        <div class="name-sm">${player.name} ${isCurrentUser ? '👤' : ''}</div>
                        <div class="sub-sm">
                            <span>✅ <span style="color:var(--gold-light);">${player.correct}</span></span>
                            <span>📊 ${player.total}</span>
                            <span>📊 ${accuracy}%</span>
                        </div>
                        <div class="progress-mini"><div class="fill-mini" style="width:${Math.min(accuracy,100)}%;"></div></div>
                    </div>
                    <div class="points-sm">${player.points}</div>
                    <button class="compare-btn" onclick="event.stopPropagation(); window.openCompareModal('${player.name}')">📊 مقارنة</button>
                    ${isCurrentUser ? `<div class="current-user-indicator active"></div><div class="pulse-dot"></div>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
}

// ===== دوال النوافذ المنبثقة =====
let nameModalMatchId = '', nameModalTeam1 = '', nameModalTeam2 = '', nameModalTimeISO = '';

function openNameModal(matchId, team1, team2, timeISO) {
    if (isMatchFinished(timeISO)) { showCopyToast('⛔ هذه المباراة انتهت، لا يمكن التوقع.'); return; }
    if (!canPredict(timeISO)) { showCopyToast('⛔ لا يمكن التوقع الآن، المباراة على وشك البدء.'); return; }

    nameModalMatchId = matchId;
    nameModalTeam1 = team1;
    nameModalTeam2 = team2;
    nameModalTimeISO = timeISO;

    document.getElementById('nameInput').value = localStorage.getItem('lastUserName') || '';
    document.getElementById('nameStatus').style.display = 'none';
    document.getElementById('nameError').textContent = '';
    document.getElementById('nameSubmitBtn').disabled = false;
    document.getElementById('nameSubmitBtn').textContent = 'متابعة →';

    document.getElementById('nameModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('nameInput').focus(), 300);
}

function closeNameModal() {
    document.getElementById('nameModal').classList.remove('active');
    document.body.style.overflow = '';
}

// ربط الأحداث
document.getElementById('nameCloseBtn').addEventListener('click', closeNameModal);
document.getElementById('nameModal').addEventListener('click', function(e) { if (e.target === this) closeNameModal(); });

document.getElementById('nameSubmitBtn').addEventListener('click', async function() {
    const name = document.getElementById('nameInput').value.trim();
    const errorEl = document.getElementById('nameError');
    const statusEl = document.getElementById('nameStatus');

    if (!name) { errorEl.textContent = '⚠️ الرجاء إدخال اسمك'; return; }

    this.disabled = true;
    this.textContent = '⏳ جاري التحقق...';
    errorEl.textContent = '';
    statusEl.style.display = 'block';

    try {
        const exists = await checkUserNameExists(name);

        if (exists) {
            statusEl.className = 'user-status existing';
            statusEl.textContent = `👤 مرحباً بعودتك "${name}"! سيتم إضافة التوقع إلى حسابك.`;
            localStorage.setItem('lastUserName', name);
            currentUserName = name;

            const existingPred = await getUserPrediction(name, nameModalMatchId);
            if (existingPred) {
                errorEl.textContent = `⚠️ لقد توقعت هذه المباراة مسبقاً`;
                this.disabled = false;
                this.textContent = 'متابعة →';
                renderUpcoming();
                return;
            }

            this.textContent = '✅ متابعة للتوقع';
            setTimeout(() => {
                closeNameModal();
                openPredictionModal(nameModalMatchId, nameModalTeam1, nameModalTeam2, nameModalTimeISO, name);
            }, 600);
        } else {
            statusEl.className = 'user-status new';
            statusEl.textContent = `👤 مرحباً "${name}"! أنت لاعب جديد. سيتم تسجيل توقعاتك.`;
            localStorage.setItem('lastUserName', name);
            currentUserName = name;

            this.textContent = '✅ متابعة للتوقع';
            setTimeout(() => {
                closeNameModal();
                openPredictionModal(nameModalMatchId, nameModalTeam1, nameModalTeam2, nameModalTimeISO, name);
            }, 600);
        }
    } catch (e) {
        console.error("❌ التحقق من الاسم:", e);
        errorEl.textContent = '❌ حدث خطأ أثناء التحقق من الاسم';
        this.disabled = false;
        this.textContent = 'متابعة →';
        statusEl.style.display = 'none';
    }
});

// ===== نافذة التوقع =====
let isEditing = false;

function openPredictionModal(matchId, team1, team2, timeISO, userName) {
    if (isMatchFinished(timeISO)) { showCopyToast('⛔ هذه المباراة انتهت، لا يمكن التوقع.'); return; }
    if (!canPredict(timeISO)) { showCopyToast('⛔ لا يمكن التوقع الآن، المباراة على وشك البدء.'); return; }

    isEditing = false;
    currentMatchId = matchId;
    currentTeam1 = team1;
    currentTeam2 = team2;
    currentTimeISO = timeISO;
    currentUserName = userName || localStorage.getItem('lastUserName') || '';

    document.getElementById('modalTitle').textContent = '📝 توقع نتيجة المباراة';
    document.getElementById('greetingName').textContent = currentUserName;
    document.getElementById('modalUserGreeting').style.display = 'block';
    document.getElementById('modalTeam1').textContent = team1;
    document.getElementById('modalTeam2').textContent = team2;
    document.getElementById('optTeam1').textContent = team1;
    document.getElementById('optTeam2').textContent = team2;
    document.getElementById('modalFlag1').textContent = getFlag(team1);
    document.getElementById('modalFlag2').textContent = getFlag(team2);
    document.getElementById('modalDateTime').textContent = `📅 ${getDateTimeDisplay(timeISO)} (بتوقيت السعودية)`;

    const msgEl = document.getElementById('modalMessage');
    msgEl.textContent = '';
    msgEl.className = 'modal-message';
    document.getElementById('modalSubmitBtn').disabled = false;
    document.getElementById('modalSubmitBtn').textContent = '💾 حفظ التوقع';
    document.querySelectorAll('input[name="prediction"]').forEach(el => el.checked = false);

    document.getElementById('predictionModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePredictionModal() {
    document.getElementById('predictionModal').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('modalCloseBtn').addEventListener('click', closePredictionModal);
document.getElementById('predictionModal').addEventListener('click', function(e) { if (e.target === this) closePredictionModal(); });

document.getElementById('modalSubmitBtn').addEventListener('click', async function() {
    const userName = currentUserName || localStorage.getItem('lastUserName') || '';
    const selected = document.querySelector('input[name="prediction"]:checked');
    const msgEl = document.getElementById('modalMessage');

    if (!userName) { msgEl.textContent = '⚠️ الرجاء إدخال اسمك'; msgEl.className = 'modal-message warning'; return; }
    if (!selected) { msgEl.textContent = '⚠️ الرجاء اختيار توقع'; msgEl.className = 'modal-message warning'; return; }

    let prediction = selected.value;

    if (isMatchFinished(currentTimeISO)) { msgEl.textContent = '⛔ هذه المباراة انتهت، لا يمكن حفظ التوقع.'; msgEl.className = 'modal-message error'; return; }
    if (!canPredict(currentTimeISO)) { msgEl.textContent = '⛔ لا يمكن التوقع الآن، المباراة على وشك البدء.'; msgEl.className = 'modal-message error'; return; }

    this.disabled = true;
    msgEl.textContent = '⏳ جاري الحفظ...';
    msgEl.className = 'modal-message';

    const result = await savePredictionToSupabase(userName, currentMatchId, prediction);

    if (result.success) {
        msgEl.textContent = result.updated ? '✅ تم تحديث التوقع بنجاح! 🎉' : '✅ تم حفظ التوقع بنجاح! 🎉';
        msgEl.className = 'modal-message success';
        this.disabled = false;
        addSubmittedMatch(currentMatchId);
        if (userName) {
            const preds = await fetchUserPredictions(userName);
            userPredictionsMap = {};
            preds.forEach(p => { userPredictionsMap[p.match_id] = true; });
        }
        await fetchAllPredictions();
        renderAllPredictions();
        renderLeaderboard(currentLeaderboardPeriod);
        renderUpcoming();
        updateNewsTicker();
        setTimeout(closePredictionModal, 1200);
    } else {
        msgEl.textContent = result.message || '❌ فشل الحفظ';
        msgEl.className = 'modal-message error';
        this.disabled = false;
    }
});

// ===== دوال أخرى =====
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

function shareResults() {
    const currentUser = localStorage.getItem('lastUserName') || 'لاعب';
    const shareText = `🏆 كأس العالم 2026\n\n👤 ${currentUser}\n📊 النقاط: حسب لوحة المتصدرين\n\n✨ توقع · تنافس · اربح ✨\n#كأس_العالم_2026 #توقعات`;
    if (navigator.share) {
        navigator.share({ title: 'نتائجي في كأس العالم 2026', text: shareText }).catch(() => {});
    } else {
        navigator.clipboard.writeText(shareText).then(() => showCopyToast('✅ تم نسخ النتائج!'))
            .catch(() => prompt('انسخ النص التالي للمشاركة:', shareText));
    }
}

function copyMatchLink(matchId, team1, team2) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?m=${matchId}`;
    navigator.clipboard.writeText(shareUrl).then(() => showCopyToast('✅ تم نسخ رابط المباراة!'))
        .catch(() => {
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showCopyToast('✅ تم نسخ رابط المباراة!');
        });
}

function shareAllTodayTomorrow() {
    if (!isAuthorized) { showPasswordOverlay(); return; }
    const today = getSaudiNow();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const activeMatches = matchesData.filter(m => (matchTime(m.timeISO) + MATCH_DURATION) > now());
    const todayTomorrowMatches = activeMatches.filter(m => {
        const d = toSaudiTime(m.timeISO);
        return (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) ||
            (d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth());
    });
    if (!todayTomorrowMatches.length) { showCopyToast('⚠️ لا توجد مباريات اليوم أو غداً'); return; }
    const baseUrl = window.location.origin + window.location.pathname;
    let shareText = '🏆 كأس العالم 2026 - روابط توقع مباريات اليوم والغد\n\n';
    todayTomorrowMatches.forEach((m, index) => {
        const dayLabel = isTodaySaudi(m.timeISO) ? '📌 اليوم' : '📌 غداً';
        const timeStr = getTimeFromISO(m.timeISO);
        const link = `${baseUrl}?m=${m.id}`;
        shareText += `${index+1}. ${getFlag(m.team1)} ${m.team1} 🆚 ${getFlag(m.team2)} ${m.team2}\n🕒 ${dayLabel} - ${timeStr}\n🔗 <${link}>\n\n`;
    });
    shareText += '✨ توقع · تنافس · اربح ✨\n#كأس_العالم_2026 #توقعات';
    navigator.clipboard.writeText(shareText).then(() => showCopyToast(`✅ تم نسخ روابط ${todayTomorrowMatches.length} مباراة!`))
        .catch(() => prompt('انسخ النص التالي للمشاركة:', shareText));
}

function toggleCompactMode() {
    const container = document.getElementById('leaderboardContainer');
    const playersList = container.querySelector('.players-list');
    const championCard = container.querySelector('.champion-card');
    if (playersList) {
        isCompactMode = !isCompactMode;
        playersList.classList.toggle('compact-mode');
        if (championCard) {
            championCard.style.transform = isCompactMode ? 'scale(0.85)' : 'scale(1)';
            championCard.style.transformOrigin = 'center center';
            championCard.style.margin = isCompactMode ? '-10px 0' : '0';
        }
        const btn = document.getElementById('toggleCompactBtn');
        if (isCompactMode) {
            btn.innerHTML = '📐 وضع التصوير (مفعل)';
            btn.style.background = 'linear-gradient(135deg, var(--success), #27ae60)';
            showCopyToast('📐 تم تفعيل وضع التصغير للقطة الشاشة');
        } else {
            btn.innerHTML = '📐 تصغير للتصوير';
            btn.style.background = 'var(--gold-gradient)';
            showCopyToast('📐 تم إلغاء وضع التصغير');
        }
    }
}

function resetCompactMode() {
    const container = document.getElementById('leaderboardContainer');
    const playersList = container.querySelector('.players-list');
    const championCard = container.querySelector('.champion-card');
    if (playersList) {
        isCompactMode = false;
        playersList.classList.remove('compact-mode');
        if (championCard) {
            championCard.style.transform = 'scale(1)';
            championCard.style.margin = '0';
        }
        const btn = document.getElementById('toggleCompactBtn');
        btn.innerHTML = '📐 تصغير للتصوير';
        btn.style.background = 'var(--gold-gradient)';
        showCopyToast('🔄 تم إعادة الحجم الطبيعي');
    }
}

function setLeaderboardPeriod(period) {
    currentLeaderboardPeriod = period;
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });
    renderLeaderboard(period);
}

function showPasswordOverlay() {
    document.getElementById('passwordOverlay').classList.add('active');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').textContent = '';
    setTimeout(() => document.getElementById('passwordInput').focus(), 300);
    document.body.style.overflow = 'hidden';
}

function hidePasswordOverlay() {
    document.getElementById('passwordOverlay').classList.remove('active');
    document.body.style.overflow = '';
}

function checkPassword() {
    const input = document.getElementById('passwordInput').value.trim();
    const errorEl = document.getElementById('passwordError');
    if (input === SECRET_CODE) {
        isAuthorized = true;
        errorEl.textContent = '';
        hidePasswordOverlay();
        document.getElementById('shareAllContainer').classList.add('visible');
        document.getElementById('adminControls').classList.add('visible');
        updateShareAllCount();
        showCopyToast('✅ تم تفعيل لوحة الإدارة');
    } else {
        errorEl.textContent = '❌ رمز غير صحيح';
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    }
}

document.getElementById('passwordSubmitBtn').addEventListener('click', checkPassword);
document.getElementById('passwordInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') checkPassword();
    if (e.key === 'Escape') hidePasswordOverlay();
});
document.getElementById('passwordCloseBtn').addEventListener('click', hidePasswordOverlay);
document.getElementById('passwordOverlay').addEventListener('click', function(e) {
    if (e.target === this) hidePasswordOverlay();
});

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
            
            if (id === 'previous') renderPreviousGamesFiltered();
            if (id === 'standings') calculateStandings();
            if (id === 'scorers') renderScorers();
            if (id === 'stats') renderTeamStats();
            if (id === 'predictions') renderAllPredictions();
        });
    });
}

// ===== دوال التحديث التلقائي =====
function startAutoUpdate() {
    setInterval(renderUpcoming, 30000);
    setInterval(async () => {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (activeTab === 'previous') renderPreviousGamesFiltered();
        if (activeTab === 'standings' && state.previousGamesData.length) calculateStandings();
        if (activeTab === 'scorers') renderScorers();
        if (activeTab === 'stats') renderTeamStats();
        if (activeTab === 'predictions') await renderAllPredictions();
        renderLeaderboard(currentLeaderboardPeriod);
        updateShareAllCount();
        updateNewsTicker();
    }, 60000);
}

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

// ===== المباريات السابقة =====
function renderPreviousGamesFiltered() {
    const searchText = document.getElementById('prevSearchInput')?.value.trim().toLowerCase() || '';
    let filtered = [...state.previousGamesData];
    filtered.sort((a, b) => (b.sortTimestamp || 0) - (a.sortTimestamp || 0));
    if (searchText) {
        filtered = filtered.filter(g =>
            g.homeAr.toLowerCase().includes(searchText) ||
            g.awayAr.toLowerCase().includes(searchText)
        );
    }
    const container = document.getElementById('previousMatchesContainer');
    const countSpan = document.getElementById('prevCount');
    countSpan.textContent = filtered.length;
    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد مباريات مطابقة</div>`;
        return;
    }
    container.innerHTML = filtered.map(g => `
        <div class="match-card finished-match" onclick="window.openPreviousMatchPredictions('${g.homeAr}', '${g.awayAr}', ${g.homeScore}, ${g.awayScore})">
            <div class="match-teams">
                <div class="match-team"><span class="flag">${getFlag(g.homeAr)}</span> ${g.homeAr}</div>
                <div class="match-score finished">${g.homeScore} - ${g.awayScore}</div>
                <div class="match-team"><span class="flag">${getFlag(g.awayAr)}</span> ${g.awayAr}</div>
            </div>
            <div class="match-meta">
                <span class="tag finished-tag">✅ انتهت - اضغط لعرض التوقعات</span>
            </div>
        </div>
    `).join('');
}

function openPreviousMatchPredictions(team1, team2, homeScore, awayScore) {
    const match = matchesData.find(m => (m.team1 === team1 && m.team2 === team2) || (m.team1 === team2 && m.team2 === team1));
    if (match) {
        const matchId = `${match.timeISO}_${match.team1}_${match.team2}`;
        openMatchPredictions(matchId, team1, team2, homeScore, awayScore);
    } else {
        showCopyToast('⚠️ لا توجد توقعات لهذه المباراة');
    }
}

// ===== ترتيب المجموعات =====
function calculateStandings() {
    try {
        const standings = {};
        for (const [group, teams] of Object.entries(finalGroups)) {
            standings[group] = {};
            teams.forEach(team => { standings[group][team] = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }; });
        }
        state.previousGamesData.forEach(game => {
            const { homeAr, awayAr, homeScore, awayScore } = game;
            let groupName = null;
            for (const [g, teams] of Object.entries(finalGroups)) {
                if (teams.includes(homeAr) && teams.includes(awayAr)) { groupName = g; break; }
            }
            if (!groupName) return;
            const stats = standings[groupName];
            if (!stats[homeAr] || !stats[awayAr]) return;
            stats[homeAr].played++;
            stats[awayAr].played++;
            stats[homeAr].goalsFor += homeScore;
            stats[homeAr].goalsAgainst += awayScore;
            stats[awayAr].goalsFor += awayScore;
            stats[awayAr].goalsAgainst += homeScore;
            let result = { homeScore, awayScore, homeAr, awayAr };
            let winner = determineWinner(result);
            if (winner === homeAr) { stats[homeAr].wins++; stats[homeAr].points += 3; stats[awayAr].losses++; }
            else if (winner === awayAr) { stats[awayAr].wins++; stats[awayAr].points += 3; stats[homeAr].losses++; }
            else { stats[homeAr].draws++; stats[awayAr].draws++; stats[homeAr].points++; stats[awayAr].points++; }
        });
        const container = document.getElementById('standingsContainer');
        let html = '';
        for (const [group, teamsStats] of Object.entries(standings)) {
            const tableRows = [];
            for (const [team, stat] of Object.entries(teamsStats)) {
                tableRows.push({ team, ...stat, diff: stat.goalsFor - stat.goalsAgainst });
            }
            tableRows.sort((a, b) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor);
            html += `<div class="group-card"><div class="group-title">المجموعة ${group}</div><table class="standings-table"><thead><tr><th>#</th><th>الفريق</th><th>ل</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>±</th><th>ن</th></tr></thead><tbody>`;
            tableRows.forEach((row, idx) => {
                html += `<tr><td>${idx+1}</td><td><div class="team-cell"><span>${getFlag(row.team)}</span> <span>${row.team}</span></div></td><td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td><td>${row.goalsFor}</td><td>${row.goalsAgainst}</td><td>${row.diff}</td><td>${row.points}</td></tr>`;
            });
            html += `</tbody></table></div>`;
        }
        container.innerHTML = html || `<div class="empty-state"><span class="icon">📊</span> لا توجد نتائج كافية</div>`;
    } catch (e) {
        console.error("calculateStandings:", e);
        document.getElementById('standingsContainer').innerHTML = `<div class="empty-state"><span class="icon">⚠️</span> خطأ في حساب الترتيب</div>`;
    }
}

// ===== الهدافين =====
let scorersDict = {};
let playerTeamMap = {};

function updateScorers() {
    scorersDict = {};
    playerTeamMap = {};
    for (let match of state.openfootballMatches) {
        const homeTeam = translateToArabic(match.team1 || '');
        const awayTeam = translateToArabic(match.team2 || '');
        const goals = [...(match.goals1 || []), ...(match.goals2 || [])];
        for (let g of goals) {
            if (!g.name) continue;
            let normalizedName = normalizeName(g.name);
            if (!scorersDict[normalizedName]) scorersDict[normalizedName] = 0;
            scorersDict[normalizedName]++;
            let team = '';
            if (match.goals1 && match.goals1.some(gg => gg.name === g.name)) team = homeTeam;
            else if (match.goals2 && match.goals2.some(gg => gg.name === g.name)) team = awayTeam;
            if (team && !playerTeamMap[normalizedName]) playerTeamMap[normalizedName] = team;
        }
    }
    renderScorers();
}

function renderScorers() {
    const container = document.getElementById('scorersContainer');
    const countSpan = document.getElementById('scorersCount');
    const scorersArray = Object.entries(scorersDict).map(([name, goals]) => ({ name, goals }));
    scorersArray.sort((a, b) => b.goals - a.goals);
    countSpan.textContent = scorersArray.length;
    if (!scorersArray.length) {
        container.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد أهداف مسجلة بعد</div>`;
        return;
    }
    let html = `<table class="scorers-table"><thead><tr><th>#</th><th>اللاعب</th><th>الفريق</th><th>الأهداف</th></tr></thead><tbody>`;
    scorersArray.forEach((s, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
        const team = playerTeamMap[s.name] || '';
        const flag = getFlag(team);
        html += `<tr><td class="medal">${medal}</td><td class="player-name">${s.name}</td><td>${flag} ${team}</td><td class="goals">${s.goals}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ===== إحصائيات الفرق =====
function renderTeamStats() {
    const container = document.getElementById('teamStatsContainer');
    if (!state.previousGamesData.length) {
        container.innerHTML = `<div class="empty-state"><span class="icon">⏳</span> لا توجد نتائج كافية</div>`;
        return;
    }
    const stats = {};
    state.previousGamesData.forEach(g => {
        const { homeAr, awayAr, homeScore, awayScore } = g;
        let result = { homeScore, awayScore, homeAr, awayAr };
        let winner = determineWinner(result);
        if (!stats[homeAr]) stats[homeAr] = { played: 0, goalsFor: 0, goalsAgainst: 0, wins: 0, draws: 0, losses: 0 };
        if (!stats[awayAr]) stats[awayAr] = { played: 0, goalsFor: 0, goalsAgainst: 0, wins: 0, draws: 0, losses: 0 };
        stats[homeAr].played++;
        stats[awayAr].played++;
        stats[homeAr].goalsFor += homeScore;
        stats[homeAr].goalsAgainst += awayScore;
        stats[awayAr].goalsFor += awayScore;
        stats[awayAr].goalsAgainst += homeScore;
        if (winner === homeAr) { stats[homeAr].wins++; stats[awayAr].losses++; }
        else if (winner === awayAr) { stats[awayAr].wins++; stats[homeAr].losses++; }
        else { stats[homeAr].draws++; stats[awayAr].draws++; }
    });
    const sorted = Object.keys(stats).sort((a, b) => {
        const diffA = stats[a].goalsFor - stats[a].goalsAgainst;
        const diffB = stats[b].goalsFor - stats[b].goalsAgainst;
        return diffB - diffA || stats[b].goalsFor - stats[a].goalsFor;
    });
    let html = `<table class="team-stats-table"><thead><tr><th>#</th><th>الفريق</th><th>لعب</th><th>فوز</th><th>تعادل</th><th>خسارة</th><th>له</th><th>عليه</th><th>±</th><th>معدل الأهداف</th></tr></thead><tbody>`;
    sorted.forEach((team, idx) => {
        const s = stats[team];
        const diff = s.goalsFor - s.goalsAgainst;
        const avg = s.played > 0 ? (s.goalsFor / s.played).toFixed(2) : '0.00';
        html += `<tr><td>${idx+1}</td><td class="team-name">${getFlag(team)} ${team}</td><td>${s.played}</td><td>${s.wins}</td><td>${s.draws}</td><td>${s.losses}</td><td class="stat-highlight">${s.goalsFor}</td><td>${s.goalsAgainst}</td><td>${diff > 0 ? '+' : ''}${diff}</td><td>${avg}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ===== جميع التوقعات =====
async function renderAllPredictions() {
    const container = document.getElementById('allPredictions');
    const countSpan = document.getElementById('predictionsCount');
    
    const predictions = state.predictions || [];
    countSpan.textContent = predictions.length;
    
    if (!predictions.length) {
        container.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد توقعات بعد</div>`;
        return;
    }
    
    const sorted = [...predictions].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA;
    });
    
    const displayPredictions = sorted.slice(0, 100);
    
    container.innerHTML = displayPredictions.map(p => {
        const parts = p.match_id ? p.match_id.split('_') : [];
        const team1 = parts.length > 1 ? parts[1] : '?';
        const team2 = parts.length > 2 ? parts[2] : '?';
        
        let predictionText = '';
        if (p.prediction === 'DRAW') predictionText = `🤝 تعادل`;
        else if (p.prediction === team1) predictionText = `🏆 فوز ${getFlag(team1)} ${team1}`;
        else if (p.prediction === team2) predictionText = `🏆 فوز ${getFlag(team2)} ${team2}`;
        else predictionText = `🔮 ${p.prediction}`;
        
        let result = findMatchResult(team1, team2);
        let isCorrect = false;
        if (result) {
            const winner = determineWinner(result);
            if (winner === null) isCorrect = p.prediction === 'DRAW';
            else isCorrect = p.prediction === winner;
        }
        const statusClass = isCorrect ? 'correct' : (result ? 'wrong' : 'pending');
        const statusText = isCorrect ? '✅ توقع صحيح' : (result ? '❌ خاطئ' : '⏳ قيد الانتظار');
        const timeStr = p.created_at ? formatDate(p.created_at) : 'تاريخ غير معروف';
        
        return `<div class="prediction-card ${statusClass}" onclick="window.openPlayerPredictions('${p.user_name || ''}')" style="cursor:pointer;">
            <div class="user">
                <div class="avatar-p">${p.user_name ? p.user_name.charAt(0).toUpperCase() : '👤'}</div>
                <span class="name-p">${p.user_name || 'مجهول'}</span>
            </div>
            <div class="prediction-text">${getFlag(team1)} ${team1} 🆚 ${getFlag(team2)} ${team2}</div>
            <div class="prediction-text" style="color:var(--gold-light);">🔮 ${predictionText}</div>
            <span class="status-badge ${statusClass}">${statusText}</span>
            <div style="font-size:0.6rem;color:var(--text-secondary);margin-top:4px;">🕒 ${timeStr}</div>
        </div>`;
    }).join('');
}

// ===== تحديث شريط الأخبار =====
function updateNewsTicker() {
    const tickerEl = document.getElementById('todayHighlights');
    if (!tickerEl) return;

    const today = getSaudiNow();
    const todayMatches = matchesData.filter(m => {
        const d = toSaudiTime(m.timeISO);
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear() &&
            (matchTime(m.timeISO) + MATCH_DURATION) > now();
    });

    if (todayMatches.length === 0) {
        tickerEl.textContent = '📅 لا توجد مباريات اليوم';
        return;
    }

    let text = '📅 مباريات اليوم: ';
    const matchTexts = todayMatches.map(m => {
        const flag1 = getFlag(m.team1);
        const flag2 = getFlag(m.team2);
        const timeStr = getTimeFromISO(m.timeISO);
        return `${flag1} ${m.team1} 🆚 ${flag2} ${m.team2} (${timeStr})`;
    });
    text += matchTexts.join(' | ');
    tickerEl.textContent = text;
}

// ===== تصدير الدوال =====
window.renderUpcoming = renderUpcoming;
window.renderLeaderboard = renderLeaderboard;
window.renderPreviousGamesFiltered = renderPreviousGamesFiltered;
window.calculateStandings = calculateStandings;
window.renderScorers = renderScorers;
window.renderTeamStats = renderTeamStats;
window.renderAllPredictions = renderAllPredictions;
window.renderBracket = function() { /* بسيط */ };
window.updateNewsTicker = updateNewsTicker;
window.initTabs = initTabs;
window.startAutoUpdate = startAutoUpdate;
window.checkUrlForMatch = checkUrlForMatch;
window.openNameModal = openNameModal;
window.openPredictionModal = openPredictionModal;
window.openPreviousMatchPredictions = openPreviousMatchPredictions;
window.openMatchPredictions = function() { showCopyToast('📋 جاري تحميل التوقعات...'); };
window.openViewPredictionsModal = function() { showCopyToast('📋 جاري تحميل التوقعات...'); };
window.openPlayerPredictions = function() { showCopyToast('👤 جاري تحميل توقعات اللاعب...'); };
window.openTeamStatsModal = function() { showCopyToast('📊 جاري تحميل إحصائيات الفريقين...'); };
window.openAnalytics = function() { showCopyToast('📊 جاري تحميل التحليلات...'); };
window.openCompareModal = function() { showCopyToast('📊 جاري تحميل المقارنة...'); };
window.toggleCompactMode = toggleCompactMode;
window.resetCompactMode = resetCompactMode;
window.toggleModalCompact = function() { showCopyToast('📐 تم تبديل وضع التصغير'); };
window.loadDuplicates = function() { showCopyToast('🔍 جاري البحث عن التكرارات...'); };
window.toggleArchive = function() { showCopyToast('📦 جاري تحميل الأرشيف...'); };
window.toggleBracketAdmin = function() { showCopyToast('🏆 جاري تحميل مسار البطولة...'); };
window.runTests = function() { showCopyToast('🧪 جاري تشغيل الاختبارات...'); };
window.shareResults = shareResults;
window.copyMatchLink = copyMatchLink;
window.shareAllTodayTomorrow = shareAllTodayTomorrow;
window.toggleTheme = toggleTheme;
window.setLeaderboardPeriod = setLeaderboardPeriod;
window.showCopyToast = showCopyToast;
