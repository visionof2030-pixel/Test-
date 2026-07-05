// ============================================================
// ui.js - واجهة المستخدم
// ============================================================

// ===== دوال العرض الأساسية =====

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
        <div class="match-card ${matchClass}" onclick="${isFinished ? `openMatchPredictions('${matchId}', '${m.team1}', '${m.team2}', ${homeScore}, ${awayScore})` : ''}">
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
            <div class="champion-card" onclick="openPlayerPredictions('${champ.name}')">
                <div class="rank-badge">🥇</div>
                <div class="avatar">${champ.name.charAt(0).toUpperCase()}</div>
                <div class="info">
                    <div class="name">${champ.name}
                        <button class="compare-btn" onclick="event.stopPropagation(); openCompareModal('${champ.name}')">📊 مقارنة</button>
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
                <div class="player-card" style="${isCurrentUser ? 'border-color:rgba(212,167,69,0.30);' : ''}" onclick="openPlayerPredictions('${player.name}')">
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
                    <button class="compare-btn" onclick="event.stopPropagation(); openCompareModal('${player.name}')">📊 مقارنة</button>
                    ${isCurrentUser ? `<div class="current-user-indicator active"></div><div class="pulse-dot"></div>` : ''}
                </div>
            `;
        });
        html += `</div>`;
    }
    container.innerHTML = html;
}

// ===== نافذة إدخال الاسم =====
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

document.getElementById('nameCloseBtn').addEventListener('click', closeNameModal);
document.getElementById('nameModal').addEventListener('click', function(e) { if (e.target === this) closeNameModal(); });

document.getElementById('nameSubmitBtn').addEventListener('click', async function() {
    const name = document.getElementById('nameInput').value.trim();
    const errorEl = document.getElementById('nameError');
    const statusEl = document.getElementById('nameStatus');

    if (!name) { errorEl.textContent = '⚠️ الرجاء إدخال اسمك'; return; }

    if (!supabaseClient) { errorEl.textContent = '❌ خطأ في الاتصال بقاعدة البيانات'; return; }

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
                errorEl.textContent = `⚠️ لقد توقعت هذه المباراة مسبقاً: ${existingPred.prediction === 'DRAW' ? 'تعادل' : existingPred.prediction}`;
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

    if (!isEditing && isMatchSubmitted(currentMatchId)) {
        msgEl.textContent = '⚠️ لقد توقعت هذه المباراة مسبقاً';
        msgEl.className = 'modal-message warning';
        return;
    }

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

// ===== دوال النوافذ المنبثقة الأخرى =====
async function openMatchPredictions(matchId, team1, team2, homeScore, awayScore) {
    if (!state.loaded) {
        await fetchPreviousGames();
        await fetchAllPredictions();
    }
    document.getElementById('mpTeam1').textContent = team1;
    document.getElementById('mpTeam2').textContent = team2;
    document.getElementById('mpFlag1').textContent = getFlag(team1);
    document.getElementById('mpFlag2').textContent = getFlag(team2);
    let result = findMatchResult(team1, team2);
    let penaltyText = '';
    if (result) {
        homeScore = result.homeScore;
        awayScore = result.awayScore;
        let displayScore = `${homeScore} - ${awayScore}`;
        if (result.hadPenalties && result.homePenalty !== null && result.awayPenalty !== null) {
            penaltyText = ` ⚽ ركلات ترجيح: ${result.homePenalty} — ${result.awayPenalty}`;
        }
        document.getElementById('mpResult').textContent = `النتيجة: ${displayScore}${penaltyText}`;
    } else {
        document.getElementById('mpResult').textContent = `⚠️ لم يتم العثور على نتيجة هذه المباراة بعد`;
    }
    
    const scorersDiv = document.getElementById('mpScorersDetail');
    let scorersHtml = '';
    let matchOF = state.openfootballMatches.find(m => {
        const h = translateToArabic(m.team1 || '');
        const a = translateToArabic(m.team2 || '');
        return (h === team1 && a === team2) || (h === team2 && a === team1);
    });
    if (matchOF) {
        const goals = [...(matchOF.goals1 || []), ...(matchOF.goals2 || [])];
        if (goals.length) {
            scorersHtml += `<div style="margin:4px 0;"><strong>⚽ الأهداف:</strong></div>`;
            if (matchOF.goals1 && matchOF.goals1.length) {
                scorersHtml += `<div>${getFlag(team1)} <strong>${team1}</strong>: `;
                scorersHtml += matchOF.goals1.map(g => {
                    let minute = g.minute ? ` ${g.minute}'` : '';
                    let name = g.name || 'لاعب';
                    return `<span class="goal-item"><span class="minute">${minute}</span> ${name}</span>`;
                }).join(' ');
                scorersHtml += `</div>`;
            }
            if (matchOF.goals2 && matchOF.goals2.length) {
                scorersHtml += `<div>${getFlag(team2)} <strong>${team2}</strong>: `;
                scorersHtml += matchOF.goals2.map(g => {
                    let minute = g.minute ? ` ${g.minute}'` : '';
                    let name = g.name || 'لاعب';
                    return `<span class="goal-item"><span class="minute">${minute}</span> ${name}</span>`;
                }).join(' ');
                scorersHtml += `</div>`;
            }
        } else {
            scorersHtml = `<div style="color:var(--text-secondary);">⚽ لا توجد أهداف مسجلة</div>`;
        }
    } else {
        scorersHtml = `<div style="color:var(--text-secondary);">⚽ لا توجد تفاصيل للأهداف</div>`;
    }
    scorersDiv.innerHTML = scorersHtml;

    const correctSpan = document.getElementById('mpCorrectCount');
    const wrongSpan = document.getElementById('mpWrongCount');
    const totalSpan = document.getElementById('mpTotalCount');
    const tbody = document.getElementById('predictionsTableBody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-secondary);">⏳ جاري التحميل...</td></tr>`;

    const predictions = await fetchMatchPredictions(matchId);
    totalSpan.textContent = predictions.length;
    
    if (predictions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-secondary);">📭 لا توجد توقعات لهذه المباراة</td></tr>`;
        correctSpan.textContent = '0';
        wrongSpan.textContent = '0';
        document.getElementById('matchPredictionsModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
    }

    let result2 = findMatchResult(team1, team2);
    let correctResult = null;
    if (result2) correctResult = determineWinner(result2);
    if (!correctResult) correctResult = "DRAW";

    let correctCount = 0, wrongCount = 0;
    let rows = '';
    predictions.forEach((p, idx) => {
        const isCorrect = p.prediction === correctResult;
        if (isCorrect) correctCount++;
        else wrongCount++;
        let predictionText = p.prediction === 'DRAW' ? 'تعادل' : `فوز ${p.prediction}`;
        const statusText = isCorrect ? 'صحيح' : 'خاطئ';
        const statusClass = isCorrect ? 'status-correct' : 'status-wrong';
        const predClass = isCorrect ? 'correct' : 'wrong';
        const timeStr = p.created_at ? formatDate(p.created_at) : 'تاريخ غير معروف';
        rows += `<tr>
            <td class="user-name" onclick="openPlayerPredictions('${p.user_name || ''}')">${p.user_name || 'مجهول'}</td>
            <td class="prediction-text ${predClass}">${predictionText}</td>
            <td class="${statusClass}">${statusText}</td>
            <td class="time-cell">${timeStr}</td>
        </tr>`;
    });
    correctSpan.textContent = correctCount;
    wrongSpan.textContent = wrongCount;
    tbody.innerHTML = rows;
    document.getElementById('matchPredictionsModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMatchPredictionsModal() {
    document.getElementById('matchPredictionsModal').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('matchPredictionsCloseBtn').addEventListener('click', closeMatchPredictionsModal);
document.getElementById('matchPredictionsModal').addEventListener('click', function(e) { if (e.target === this) closeMatchPredictionsModal(); });

// ===== نافذة استعراض التوقعات =====
async function openViewPredictionsModal(matchId, team1, team2) {
    document.getElementById('viewTeam1').textContent = team1;
    document.getElementById('viewTeam2').textContent = team2;
    document.getElementById('viewFlag1').textContent = getFlag(team1);
    document.getElementById('viewFlag2').textContent = getFlag(team2);
    document.getElementById('probTeam1').textContent = team1;
    document.getElementById('probTeam2').textContent = team2;
    
    const listContainer = document.getElementById('viewPredictionsList');
    const countSpan = document.getElementById('viewPredictionsCount');
    listContainer.innerHTML = `<div class="empty-state"><span class="icon">⏳</span> جاري التحميل...</div>`;
    countSpan.textContent = '...';

    const predictions = await fetchMatchPredictions(matchId);
    countSpan.textContent = predictions.length;

    let homeCount = 0, awayCount = 0, drawCount = 0;
    for (let p of predictions) {
        if (p.prediction === team1) homeCount++;
        else if (p.prediction === team2) awayCount++;
        else if (p.prediction === 'DRAW') drawCount++;
    }
    const totalPreds = predictions.length;
    const homePercent = totalPreds > 0 ? (homeCount / totalPreds) * 100 : 0;
    const awayPercent = totalPreds > 0 ? (awayCount / totalPreds) * 100 : 0;

    document.getElementById('probHomePercent').textContent = homePercent.toFixed(1) + '%';
    document.getElementById('probAwayPercent').textContent = awayPercent.toFixed(1) + '%';

    document.querySelector('#probBar .segment.home').style.width = homePercent + '%';
    document.querySelector('#probBar .segment.home').textContent = homePercent.toFixed(0) + '%';
    document.querySelector('#probBar .segment.away').style.width = awayPercent + '%';
    document.querySelector('#probBar .segment.away').textContent = awayPercent.toFixed(0) + '%';

    if (totalPreds === 0) {
        document.querySelector('#probBar .segment.home').style.width = '50%';
        document.querySelector('#probBar .segment.home').textContent = '0%';
        document.querySelector('#probBar .segment.away').style.width = '50%';
        document.querySelector('#probBar .segment.away').textContent = '0%';
    }

    if (predictions.length === 0) {
        listContainer.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد توقعات لهذه المباراة</div>`;
    } else {
        let html = '';
        predictions.forEach((p) => {
            let text = '';
            if (p.prediction === 'DRAW') text = '🤝 تعادل الفريقين';
            else text = `🏆 فوز ${getFlag(p.prediction)} ${p.prediction}`;
            
            let result = findMatchResult(team1, team2);
            let isCorrect = false;
            if (result) {
                const winner = determineWinner(result);
                if (winner === null) isCorrect = p.prediction === 'DRAW';
                else isCorrect = p.prediction === winner;
            }
            const statusClass = isCorrect ? 'correct' : (result ? 'wrong' : 'pending');
            const statusText = isCorrect ? '✅ صحيح' : (result ? '❌ خاطئ' : '⏳ قيد الانتظار');
            
            html += `
                <div class="prediction-card ${statusClass}" onclick="openPlayerPredictions('${p.user_name || ''}')" style="cursor:pointer;">
                    <div class="user"><div class="avatar-p">${p.user_name ? p.user_name.charAt(0).toUpperCase() : '👤'}</div><span class="name-p">${p.user_name || 'مجهول'}</span></div>
                    <div class="prediction-text">🔮 ${text}</div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <div style="font-size:0.6rem;color:var(--text-secondary);margin-top:4px;">🕒 ${p.created_at ? formatDate(p.created_at) : 'تاريخ غير معروف'}</div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }
    document.getElementById('viewPredictionsModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeViewPredictionsModal() {
    document.getElementById('viewPredictionsModal').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('viewModalCloseBtn').addEventListener('click', closeViewPredictionsModal);
document.getElementById('viewPredictionsModal').addEventListener('click', function(e) { if (e.target === this) closeViewPredictionsModal(); });

// ===== نافذة توقعات اللاعب =====
async function openPlayerPredictions(userName) {
    if (!userName) { showCopyToast('⚠️ اسم المستخدم غير معروف'); return; }
    document.getElementById('playerModalName').textContent = userName;
    const listContainer = document.getElementById('playerPredictionsList');
    const correctSpan = document.getElementById('playerCorrectCount');
    const wrongSpan = document.getElementById('playerWrongCount');
    const totalSpan = document.getElementById('playerTotalCount');
    listContainer.innerHTML = `<div class="empty-state"><span class="icon">⏳</span> جاري التحميل...</div>`;

    const predictions = await fetchUserPredictions(userName);
    let correct = 0, wrong = 0;
    for (let p of predictions) {
        const parts = (p.match_id || "").split("_");
        if (parts.length < 3) continue;
        const team1 = parts[1], team2 = parts[2];
        const result = findMatchResult(team1, team2);
        if (!result) continue;
        const winner = determineWinner(result);
        if (winner === null) {
            if (p.prediction === 'DRAW') correct++;
            else wrong++;
        } else if (p.prediction === winner) correct++;
        else wrong++;
    }
    correctSpan.textContent = correct;
    wrongSpan.textContent = wrong;
    totalSpan.textContent = predictions.length;

    if (!predictions.length) {
        listContainer.innerHTML = `<div class="empty-state"><span class="icon">📭</span> لا توجد توقعات لهذا اللاعب</div>`;
        document.getElementById('playerPredictionsModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        return;
    }

    let html = '';
    predictions.forEach((p, idx) => {
        const parts = p.match_id ? p.match_id.split('_') : [];
        const team1 = parts.length > 1 ? parts[1] : '?';
        const team2 = parts.length > 2 ? parts[2] : '?';
        let predText = '';
        if (p.prediction === 'DRAW') predText = 'تعادل';
        else if (p.prediction === team1) predText = `فوز ${team1}`;
        else if (p.prediction === team2) predText = `فوز ${team2}`;
        else predText = p.prediction;
        
        let result = findMatchResult(team1, team2);
        let isCorrect = false;
        if (result) {
            const winner = determineWinner(result);
            if (winner === null) isCorrect = p.prediction === 'DRAW';
            else isCorrect = p.prediction === winner;
        }
        const statusClass = isCorrect ? 'correct' : (result ? 'wrong' : 'pending');
        const statusText = isCorrect ? '✅ صحيح' : (result ? '❌ خاطئ' : '⏳ قيد الانتظار');

        html += `
            <div class="player-prediction-item">
                <div class="num">#${idx + 1}</div>
                <div class="match-info">
                    <div class="teams">
                        <span class="flag">${getFlag(team1)}</span> ${team1} 🆚 <span class="flag">${getFlag(team2)}</span> ${team2}
                    </div>
                    <div class="pred">🔮 ${predText}</div>
                    <span class="status ${statusClass}">${statusText}</span>
                </div>
                <div class="time">🕒 ${p.created_at ? formatDate(p.created_at) : 'تاريخ غير معروف'}</div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
    document.getElementById('playerPredictionsModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePlayerPredictionsModal() {
    document.getElementById('playerPredictionsModal').classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('playerModalCloseBtn').addEventListener('click', closePlayerPredictionsModal);
document.getElementById('playerPredictionsModal').addEventListener('click', function(e) { if (e.target === this) closePlayerPredictionsModal(); });

// ===== نافذة إحصائيات الفريقين =====
function openTeamStatsModal(team1, team2) {
    const modal = document.getElementById('teamStatsModal');
    const content = document.getElementById('teamStatsContent');
    
    const stats1 = getTeamStats(team1);
    const stats2 = getTeamStats(team2);
    
    const getResultSymbol = (teamName, game) => {
        const result = findMatchResult(game.homeAr, game.awayAr);
        if (!result) return '⏳';
        const winner = determineWinner(result);
        if (winner === teamName) return '✅';
        else if (winner === null) return '➖';
        else return '❌';
    };
    
    const getStreakHtml = (teamName, games) => {
        const teamGames = games.filter(g => g.homeAr === teamName || g.awayAr === teamName);
        const recentGames = teamGames.slice(-10);
        return recentGames.map(g => getResultSymbol(teamName, g)).join(' ');
    };
    
    const allGames = state.previousGamesData || [];
    const streak1 = getStreakHtml(team1, allGames);
    const streak2 = getStreakHtml(team2, allGames);
    
    content.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px;">
            <div style="background:rgba(255,255,255,0.02);border-radius:var(--radius-md);padding:16px;border:1px solid var(--border-subtle);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;border-bottom:1px solid var(--border-gold);padding-bottom:8px;">
                    <span style="font-size:1.5rem;">${getFlag(team1)}</span>
                    <span style="font-weight:800;font-size:1rem;color:var(--gold-light);">${team1}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.7rem;margin-bottom:8px;">
                    <div><span style="color:var(--text-secondary);">🏆 فوز:</span> <strong style="color:var(--success);">${stats1.wins}</strong></div>
                    <div><span style="color:var(--text-secondary);">❌ خسارة:</span> <strong style="color:var(--danger);">${stats1.losses}</strong></div>
                    <div><span style="color:var(--text-secondary);">➖ تعادل:</span> <strong style="color:var(--gold-light);">${stats1.draws}</strong></div>
                    <div><span style="color:var(--text-secondary);">📊 مباريات:</span> <strong>${stats1.total}</strong></div>
                    <div><span style="color:var(--text-secondary);">⚽ أهداف له:</span> <strong style="color:var(--gold-light);">${stats1.goalsFor}</strong></div>
                    <div><span style="color:var(--text-secondary);">⚽ أهداف عليه:</span> <strong style="color:var(--danger);">${stats1.goalsAgainst}</strong></div>
                </div>
                <div style="margin-top:8px;border-top:1px solid var(--border-subtle);padding-top:8px;">
                    <div style="font-size:0.6rem;color:var(--text-secondary);margin-bottom:4px;">📈 سلسلة النتائج (آخر 10 مباريات):</div>
                    <div style="font-size:1rem;letter-spacing:2px;word-break:break-all;">${streak1 || 'لا توجد مباريات سابقة'}</div>
                </div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border-radius:var(--radius-md);padding:16px;border:1px solid var(--border-subtle);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;border-bottom:1px solid var(--border-gold);padding-bottom:8px;">
                    <span style="font-size:1.5rem;">${getFlag(team2)}</span>
                    <span style="font-weight:800;font-size:1rem;color:var(--gold-light);">${team2}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.7rem;margin-bottom:8px;">
                    <div><span style="color:var(--text-secondary);">🏆 فوز:</span> <strong style="color:var(--success);">${stats2.wins}</strong></div>
                    <div><span style="color:var(--text-secondary);">❌ خسارة:</span> <strong style="color:var(--danger);">${stats2.losses}</strong></div>
                    <div><span style="color:var(--text-secondary);">➖ تعادل:</span> <strong style="color:var(--gold-light);">${stats2.draws}</strong></div>
                    <div><span style="color:var(--text-secondary);">📊 مباريات:</span> <strong>${stats2.total}</strong></div>
                    <div><span style="color:var(--text-secondary);">⚽ أهداف له:</span> <strong style="color:var(--gold-light);">${stats2.goalsFor}</strong></div>
                    <div><span style="color:var(--text-secondary);">⚽ أهداف عليه:</span> <strong style="color:var(--danger);">${stats2.goalsAgainst}</strong></div>
                </div>
                <div style="margin-top:8px;border-top:1px solid var(--border-subtle);padding-top:8px;">
                    <div style="font-size:0.6rem;color:var(--text-secondary);margin-bottom:4px;">📈 سلسلة النتائج (آخر 10 مباريات):</div>
                    <div style="font-size:1rem;letter-spacing:2px;word-break:break-all;">${streak2 || 'لا توجد مباريات سابقة'}</div>
                </div>
            </div>
        </div>
        <div style="text-align:center;margin-top:16px;">
            <button class="tab-btn" onclick="document.getElementById('teamStatsModal').classList.remove('active');document.body.style.overflow='';" style="background:var(--gold-glow);border-color:var(--border-gold);color:var(--gold-light);">إغلاق</button>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

document.getElementById('teamStatsCloseBtn').addEventListener('click', function() {
    document.getElementById('teamStatsModal').classList.remove('active');
    document.body.style.overflow = '';
});
document.getElementById('teamStatsModal').addEventListener('click', function(e) {
    if (e.target === this) {
        document.getElementById('teamStatsModal').classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===== دوال أخرى =====
function updateShareAllCount() {
    if (!isAuthorized) { document.getElementById('shareAllCount').textContent = '🔒'; return; }
    const today = getSaudiNow();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const activeMatches = matchesData.filter(m => (matchTime(m.timeISO) + MATCH_DURATION) > now());
    const count = activeMatches.filter(m => {
        const d = toSaudiTime(m.timeISO);
        return (d.getDate() === today.getDate() && d.getMonth() === today.getMonth()) ||
            (d.getDate() === tomorrow.getDate() && d.getMonth() === tomorrow.getMonth());
    }).length;
    document.getElementById('shareAllCount').textContent = count;
}

function showCopyToast(msg) {
    const t = document.getElementById('copyToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
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
    } else {
        showCopyToast('⚠️ انتظر حتى تحميل البيانات');
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

function toggleModalCompact() {
    const modalContent = document.getElementById('matchPredictionsContent');
    const btn = document.getElementById('modalCompactBtn');
    isModalCompact = !isModalCompact;
    modalContent.classList.toggle('compact-mode');
    if (isModalCompact) {
        btn.textContent = '📐 تكبير';
        showCopyToast('📐 تم تصغير جدول التوقعات للتصوير');
    } else {
        btn.textContent = '📐 تصغير';
        showCopyToast('📐 تم تكبير جدول التوقعات');
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
            
            if (id === 'previous' && !state.previousGamesData.length) fetchPreviousGames().then(games => { state.previousGamesData = games; renderPreviousGamesFiltered(); });
            if (id === 'standings' && state.previousGamesData.length) calculateStandings();
            if (id === 'scorers') renderScorers();
            if (id === 'stats') renderTeamStats();
            if (id === 'predictions') renderAllPredictions();
        });
    });
}

function startAutoUpdate() {
    setInterval(renderUpcoming, 10000);
    setInterval(async () => {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        if (activeTab === 'previous') {
            state.previousGamesData = await fetchPreviousGames();
            renderPreviousGamesFiltered();
        }
        if (activeTab === 'standings' && state.previousGamesData.length) calculateStandings();
        if (activeTab === 'scorers') renderScorers();
        if (activeTab === 'stats') renderTeamStats();
        if (activeTab === 'predictions') await renderAllPredictions();
        renderLeaderboard(currentLeaderboardPeriod);
        updateShareAllCount();
        updateNewsTicker();
    }, 30000);
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
        <div class="match-card finished-match" onclick="openPreviousMatchPredictions('${g.homeAr}', '${g.awayAr}', ${g.homeScore}, ${g.awayScore})">
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

document.getElementById('prevSearchInput')?.addEventListener('input', renderPreviousGamesFiltered);
document.getElementById('groupFilter')?.addEventListener('change', renderUpcoming);

document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentDayFilter = this.dataset.day;
        renderUpcoming();
    });
});

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
        
        return `<div class="prediction-card ${statusClass}" onclick="openPlayerPredictions('${p.user_name || ''}')" style="cursor:pointer;">
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

// ===== مسار البطولة =====
function renderBracket() {
    const container = document.getElementById('bracketContainer');
    const first32 = matchesData.filter(m => m.round === 'round32').map(m => ({
        team1: m.team1,
        team2: m.team2,
        round: 'Round of 32',
        stage: 'Round of 32',
        date: m.timeISO,
        home_score: 0,
        away_score: 0,
        finished: false,
        _id: `r32_${m.id}`
    }));
    
    const roundOrder = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL'];
    const roundNames = { 'R32': 'دور الـ 32', 'R16': 'دور الـ 16', 'QF': 'ربع النهائي', 'SF': 'نصف النهائي', '3RD': 'المركز الثالث', 'FINAL': 'النهائي' };
    const rounds = {};
    roundOrder.forEach(r => rounds[r] = []);
    const seenMatches = new Set();
    
    for (let match of first32) {
        const matchKey = `R32|${match.team1}|${match.team2}`;
        if (!seenMatches.has(matchKey)) {
            seenMatches.add(matchKey);
            rounds['R32'].push(match);
        }
    }
    
    let hasMatches = false;
    let html = `<div class="bracket-tree">`;
    for (let r of roundOrder) {
        const matches = rounds[r] || [];
        if (matches.length === 0) continue;
        hasMatches = true;
        html += `<div class="bracket-round"><div class="bracket-round-title">🏅 ${roundNames[r] || r}</div>`;
        for (let match of matches) {
            let homeDisplay = translateToArabic(match.team1 || '?');
            let awayDisplay = translateToArabic(match.team2 || '?');
            const flag1 = getFlag(homeDisplay) || '🏁';
            const flag2 = getFlag(awayDisplay) || '🏁';
            html += `
                <div class="bracket-match-item">
                    <div class="teams">
                        <span class="team"><span class="flag">${flag1}</span> ${homeDisplay}</span>
                        <span class="vs">🆚</span>
                        <span class="team"><span class="flag">${flag2}</span> ${awayDisplay}</span>
                    </div>
                    <div class="status">⏳ لم تلعب</div>
                </div>
            `;
        }
        html += `</div>`;
    }
    html += `</div>`;
    container.innerHTML = hasMatches ? html : `<div class="empty-state"><span class="icon">📊</span> لا توجد مباريات في المخطط</div>`;
}

function toggleBracketAdmin() {
    const wrapper = document.getElementById('bracketWrapper');
    if (wrapper.classList.contains('visible')) {
        wrapper.classList.remove('visible');
    } else {
        wrapper.classList.add('visible');
        renderBracket();
        showCopyToast('🏆 تم عرض مسار البطولة');
    }
}

// ===== التوقعات المكررة =====
async function loadDuplicates() {
    const section = document.getElementById('duplicatesSection');
    const container = document.getElementById('duplicatesContainer');
    const badge = document.getElementById('dupCountBadge');

    if (section.classList.contains('visible')) {
        section.classList.remove('visible');
        return;
    }

    section.classList.add('visible');
    container.innerHTML = `<div class="duplicates-empty">⏳ جاري البحث عن التكرارات...</div>`;

    if (!supabaseClient) {
        container.innerHTML = `<div class="duplicates-empty">❌ Supabase غير متصل</div>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("predictions")
            .select("user_name, match_id, prediction, created_at")
            .order("created_at", { ascending: false })
            .limit(500);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="duplicates-empty">📭 لا توجد توقعات مسجلة</div>`;
            badge.textContent = '0';
            return;
        }

        const groups = {};
        for (let p of data) {
            const key = `${p.user_name}|${p.match_id}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }

        const duplicates = {};
        for (let [key, items] of Object.entries(groups)) {
            if (items.length > 1) {
                const [userName, matchId] = key.split('|');
                duplicates[key] = {
                    user_name: userName,
                    match_id: matchId,
                    count: items.length,
                    predictions: items.map(p => p.prediction),
                    created_at: items[0].created_at
                };
            }
        }

        const dupKeys = Object.keys(duplicates);
        badge.textContent = dupKeys.length;

        if (dupKeys.length === 0) {
            container.innerHTML = `<div class="duplicates-empty">✅ لا توجد توقعات مكررة</div>`;
            return;
        }

        let html = `<table class="duplicates-table"><thead><tr><th>المستخدم</th><th>المباراة</th><th>التكرار</th><th>التوقعات</th></tr></thead><tbody>`;
        for (let key of dupKeys) {
            const d = duplicates[key];
            const parts = d.match_id ? d.match_id.split('_') : [];
            const team1 = parts.length > 1 ? parts[1] : '?';
            const team2 = parts.length > 2 ? parts[2] : '?';
            const preds = d.predictions.map(p => p === 'DRAW' ? 'تعادل' : p).join(' / ');
            html += `<tr>
                <td class="dup-user">${d.user_name}</td>
                <td class="dup-match">${getFlag(team1)} ${team1} 🆚 ${getFlag(team2)} ${team2}</td>
                <td class="dup-count">${d.count}</td>
                <td class="dup-preds">${preds}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        console.error("❌ جلب التكرارات:", e);
        container.innerHTML = `<div class="duplicates-empty">❌ حدث خطأ: ${e.message}</div>`;
    }
}

// ===== الأرشيف =====
function toggleArchive() {
    const section = document.getElementById('archiveSection');
    const container = document.getElementById('archiveContainer');
    const countSpan = document.getElementById('archiveCount');

    if (section.classList.contains('visible')) {
        section.classList.remove('visible');
        return;
    }

    section.classList.add('visible');
    container.innerHTML = `<div class="duplicates-empty">⏳ جاري تحميل الأرشيف...</div>`;

    const games = state.previousGamesData || [];
    if (games.length === 0) {
        container.innerHTML = `<div class="duplicates-empty">📭 لا توجد مباريات منتهية</div>`;
        countSpan.textContent = '0';
        return;
    }

    const predictions = state.predictions || [];
    const archiveData = games.map(game => {
        const matchPredictions = predictions.filter(p => {
            const parts = p.match_id ? p.match_id.split('_') : [];
            if (parts.length < 3) return false;
            return (parts[1] === game.homeAr && parts[2] === game.awayAr) ||
                (parts[1] === game.awayAr && parts[2] === game.homeAr);
        });
        let correct = 0, wrong = 0;
        const result = findMatchResult(game.homeAr, game.awayAr);
        let winner = null;
        if (result) winner = determineWinner(result);
        for (let p of matchPredictions) {
            if (winner === null) {
                if (p.prediction === 'DRAW') correct++;
                else wrong++;
            } else if (winner) {
                if (p.prediction === winner) correct++;
                else wrong++;
            }
        }
        return { ...game, correct, wrong, total: matchPredictions.length, accuracy: matchPredictions.length > 0 ? Math.round((correct / matchPredictions.length) * 100) : 0 };
    });

    archiveData.sort((a, b) => (b.correct + b.wrong) - (a.correct + a.wrong));
    countSpan.textContent = archiveData.length;

    let html = `<div class="archive-summary">
        <span class="item">📊 إجمالي المباريات: <strong>${archiveData.length}</strong></span>
        <span class="item">✅ إجمالي التوقعات الصحيحة: <strong class="highlight">${archiveData.reduce((sum, m) => sum + m.correct, 0)}</strong></span>
        <span class="item">📈 متوسط الدقة: <strong class="highlight">${Math.round(archiveData.reduce((sum, m) => sum + m.accuracy, 0) / archiveData.length)}%</strong></span>
    </div><div class="archive-list">`;

    archiveData.forEach(m => {
        html += `
            <div class="archive-item" onclick="openPreviousMatchPredictions('${m.homeAr}', '${m.awayAr}', ${m.homeScore}, ${m.awayScore})">
                <div class="match-info">
                    <span class="flag">${getFlag(m.homeAr)}</span> ${m.homeAr}
                    <span class="score">${m.homeScore} - ${m.awayScore}</span>
                    <span class="flag">${getFlag(m.awayAr)}</span> ${m.awayAr}
                </div>
                <div class="stats">
                    <span class="correct">✅ ${m.correct}</span>
                    <span class="wrong">❌ ${m.wrong}</span>
                    <span class="accuracy">${m.accuracy}%</span>
                    <span style="color:var(--text-secondary);font-size:0.6rem;">${m.total} توقع</span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ===== الاختبارات =====
function runTests() {
    const modal = document.getElementById('testResultsModal');
    const content = document.getElementById('testResultsContent');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    content.innerHTML = `<div class="empty-state"><span class="icon">⏳</span> جاري تشغيل الاختبارات...</div>`;

    setTimeout(() => {
        const results = [];
        let pass = 0, fail = 0;

        try {
            const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
            const near = new Date(Date.now() + 2 * 60 * 1000).toISOString();
            const past = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            const r1 = canPredict(future) === true;
            const r2 = canPredict(near) === false;
            const r3 = canPredict(past) === false;
            if (r1 && r2 && r3) { pass++; results.push('✅ canPredict - صحيح'); } else { fail++; results.push('❌ canPredict - فشل'); }
        } catch (e) { fail++; results.push('❌ canPredict - استثناء: ' + e.message); }

        try {
            const t1 = translateToArabic('Argentina') === 'الأرجنتين';
            const t2 = translateToArabic('Germany') === 'ألمانيا';
            if (t1 && t2) { pass++; results.push('✅ translateToArabic - صحيح'); } else { fail++; results.push('❌ translateToArabic - فشل'); }
        } catch (e) { fail++; results.push('❌ translateToArabic - استثناء: ' + e.message); }

        const total = results.length;
        content.innerHTML = `
            <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:1.2rem;font-weight:800;color:var(--gold-light);">${pass} ✅ نجاح / ${fail} ❌ فشل</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);">من أصل ${total} اختبار</div>
            </div>
            <div style="max-height:300px;overflow-y:auto;text-align:right;">
                ${results.map(r => `<div style="padding:4px 8px;border-bottom:1px solid var(--border-subtle);font-size:0.8rem;">${r}</div>`).join('')}
            </div>
            <div style="text-align:center;margin-top:16px;">
                <button class="tab-btn" onclick="document.getElementById('testResultsModal').classList.remove('active');document.body.style.overflow='';" style="background:var(--gold-glow);border-color:var(--border-gold);color:var(--gold-light);">إغلاق</button>
            </div>
        `;
    }, 500);
}

document.getElementById('testResultsCloseBtn').addEventListener('click', function() {
    document.getElementById('testResultsModal').classList.remove('active');
    document.body.style.overflow = '';
});

// ===== التحليلات المتقدمة =====
function openAnalytics() {
    const modal = document.getElementById('analyticsModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    showCopyToast('📊 جاري تحميل التحليلات...');
    setTimeout(() => {
        generateAnalyticsCharts();
    }, 300);
}

function generateAnalyticsCharts() {
    const predictions = state.predictions || [];
    const games = state.previousGamesData || [];

    if (!predictions.length || !games.length) {
        document.getElementById('analyticsContent').innerHTML = `
            <div class="empty-state"><span class="icon">📊</span> لا توجد بيانات كافية للتحليل</div>
            <div style="text-align:center;margin-top:12px;">
                <button class="tab-btn" onclick="document.getElementById('analyticsModal').classList.remove('active');document.body.style.overflow='';" style="background:var(--gold-glow);border-color:var(--border-gold);color:var(--gold-light);">إغلاق</button>
            </div>
        `;
        return;
    }

    // بيانات اللاعبين
    const playerPredCount = {};
    for (let p of predictions) {
        if (!playerPredCount[p.user_name]) playerPredCount[p.user_name] = 0;
        playerPredCount[p.user_name]++;
    }
    const topPredPlayers = Object.entries(playerPredCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const predLabels = topPredPlayers.map(p => p[0]);
    const predData = topPredPlayers.map(p => p[1]);

    // تحديث واجهة التحليلات
    document.getElementById('analyticsContent').innerHTML = `
        <div class="analytics-grid">
            <div class="chart-box full-width">
                <div class="chart-title">📊 أكثر اللاعبين توقعاً</div>
                <canvas id="chartPlayerDistribution"></canvas>
            </div>
            <div class="chart-box full-width">
                <div class="chart-title">📈 تطور نقاط أفضل 5 لاعبين</div>
                <canvas id="chartPoints"></canvas>
            </div>
            <div class="chart-box full-width">
                <div class="chart-title">🔥 أكثر المباريات توقعاً</div>
                <canvas id="chartPopular"></canvas>
            </div>
            <div class="chart-box full-width">
                <div class="chart-title">🎯 نسبة التوقعات الصحيحة (أفضل 5)</div>
                <canvas id="chartAccuracy"></canvas>
            </div>
        </div>
        <div style="text-align:center;margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
            <button class="tab-btn" onclick="document.getElementById('analyticsModal').classList.remove('active');document.body.style.overflow='';" style="background:var(--gold-glow);border-color:var(--border-gold);color:var(--gold-light);">إغلاق</button>
        </div>
    `;

    // رسم المخططات
    setTimeout(() => {
        const ctx1 = document.getElementById('chartPlayerDistribution').getContext('2d');
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: predLabels,
                datasets: [{
                    label: 'عدد التوقعات',
                    data: predData,
                    backgroundColor: 'rgba(212, 167, 69, 0.6)',
                    borderColor: 'rgba(212, 167, 69, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#8a9bb5', font: { family: 'Cairo' } } }
                },
                scales: {
                    x: { ticks: { color: '#8a9bb5', font: { family: 'Cairo', size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
                    y: { ticks: { color: '#8a9bb5' }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true }
                }
            }
        });
    }, 100);
}

// ===== المقارنة =====
function openCompareModal(selectedPlayer) {
    const modal = document.getElementById('compareModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    const predictions = state.predictions || [];
    const players = [...new Set(predictions.map(p => p.user_name).filter(Boolean))];
    const select1 = document.getElementById('compareSelect1');
    const select2 = document.getElementById('compareSelect2');

    select1.innerHTML = '<option value="">اختر لاعباً</option>';
    select2.innerHTML = '<option value="">اختر لاعباً</option>';
    players.forEach(p => {
        select1.innerHTML += `<option value="${p}">${p}</option>`;
        select2.innerHTML += `<option value="${p}">${p}</option>`;
    });

    if (selectedPlayer) {
        select1.value = selectedPlayer;
        const other = players.find(p => p !== selectedPlayer) || '';
        select2.value = other;
    }

    renderCompare();
}

function closeCompareModal() {
    document.getElementById('compareModal').classList.remove('active');
    document.body.style.overflow = '';
}

function renderCompare() {
    const p1 = document.getElementById('compareSelect1').value;
    const p2 = document.getElementById('compareSelect2').value;
    const predictions = state.predictions || [];
    const games = state.previousGamesData || [];

    const getPlayerStats = (userName) => {
        const preds = predictions.filter(p => p.user_name === userName);
        let points = 0, correct = 0, wrong = 0, total = preds.length;
        for (let p of preds) {
            const parts = (p.match_id || "").split("_");
            if (parts.length < 3) continue;
            const team1 = parts[1], team2 = parts[2];
            const result = findMatchResult(team1, team2);
            let winner = null;
            if (result) winner = determineWinner(result);
            if (winner === null) {
                if (p.prediction === 'DRAW') { points++; correct++; }
                else { wrong++; }
            } else if (winner) {
                if (p.prediction === winner) { points++; correct++; }
                else { wrong++; }
            }
        }
        const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
        return { points, correct, wrong, total, acc };
    };

    const div1 = document.getElementById('compareStats1');
    const name1 = document.getElementById('compareName1');
    if (p1) {
        const s = getPlayerStats(p1);
        name1.innerHTML = `👤 ${p1}`;
        div1.innerHTML = `
            <div class="stat-row"><span class="label">🏆 النقاط</span><span class="value gold">${s.points}</span></div>
            <div class="stat-row"><span class="label">✅ صحيحة</span><span class="value green">${s.correct}</span></div>
            <div class="stat-row"><span class="label">❌ خاطئة</span><span class="value red">${s.wrong}</span></div>
            <div class="stat-row"><span class="label">📊 عدد التوقعات الكلي</span><span class="value">${s.total}</span></div>
            <div class="stat-row"><span class="label">🎯 نسبة النجاح</span><span class="value gold">${s.acc}%</span></div>
        `;
    } else {
        name1.innerHTML = '👤 لاعب 1';
        div1.innerHTML = `<div class="empty-state"><span class="icon">⏳</span> اختر لاعباً</div>`;
    }

    const div2 = document.getElementById('compareStats2');
    const name2 = document.getElementById('compareName2');
    if (p2) {
        const s = getPlayerStats(p2);
        name2.innerHTML = `👤 ${p2}`;
        div2.innerHTML = `
            <div class="stat-row"><span class="label">🏆 النقاط</span><span class="value gold">${s.points}</span></div>
            <div class="stat-row"><span class="label">✅ صحيحة</span><span class="value green">${s.correct}</span></div>
            <div class="stat-row"><span class="label">❌ خاطئة</span><span class="value red">${s.wrong}</span></div>
            <div class="stat-row"><span class="label">📊 عدد التوقعات الكلي</span><span class="value">${s.total}</span></div>
            <div class="stat-row"><span class="label">🎯 نسبة النجاح</span><span class="value gold">${s.acc}%</span></div>
        `;
    } else {
        name2.innerHTML = '👤 لاعب 2';
        div2.innerHTML = `<div class="empty-state"><span class="icon">⏳</span> اختر لاعباً</div>`;
    }
}

document.getElementById('compareModalCloseBtn').addEventListener('click', closeCompareModal);
document.getElementById('compareModal').addEventListener('click', function(e) { if (e.target === this) closeCompareModal(); });

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

// ===== الأحداث =====
document.getElementById('footerTrigger').addEventListener('click', function(e) {
    e.preventDefault();
    if (isAuthorized) {
        document.getElementById('shareAllContainer').classList.toggle('visible');
        document.getElementById('adminControls').classList.toggle('visible');
        if (document.getElementById('shareAllContainer').classList.contains('visible')) {
            updateShareAllCount();
            showCopyToast('🔓 تم إظهار لوحة الإدارة');
        } else {
            showCopyToast('🔒 تم إخفاء لوحة الإدارة');
        }
    } else {
        showPasswordOverlay();
    }
});

if (localStorage.getItem('theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    document.getElementById('themeToggleBtn').textContent = '☀️ الوضع الفاتح';
}

// ===== تصدير الدوال للاستخدام العام =====
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
window.closeCompareModal = closeCompareModal;
window.renderCompare = renderCompare;
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
window.showCopyToast = showCopyToast;
window.calculateStandings = calculateStandings;
window.renderScorers = renderScorers;
window.renderTeamStats = renderTeamStats;
window.renderAllPredictions = renderAllPredictions;
window.renderBracket = renderBracket;
window.initTabs = initTabs;
window.checkUrlForMatch = checkUrlForMatch;
window.startAutoUpdate = startAutoUpdate;
window.updateNewsTicker = updateNewsTicker;
window.renderPreviousGamesFiltered = renderPreviousGamesFiltered;
window.openPreviousMatchPredictions = openPreviousMatchPredictions;
window.updateScorers = updateScorers;
