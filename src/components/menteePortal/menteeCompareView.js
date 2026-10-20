import { state, getProgressStatus } from '../../services/state.js';
import { getIcon } from '../icons.js';
import { openCandidateDossierModal } from '../modals/candidateDossierModal.js';

/**
 * Dedicated "Compare with Others" View for Mentee Portal
 * Allows candidate to benchmark their overall readiness, consistency, and
 * program-by-program scores against peers in their competition category.
 */
export function renderMenteeCompareView(container, navigate) {
  const session = state.getAuthSession();
  if (!session || session.role !== 'mentee' || !session.candidate) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 40px; text-align: center;">
        <div style="font-size: 32px; margin-bottom: 12px;">🔒</div>
        <h3>Mentee Access Required</h3>
        <p class="text-muted text-sm">Please log in to your candidate account with your Admission / Chest Number and Category.</p>
        <button class="btn btn-primary" id="btnMenteeCompareLogin" style="margin-top: 14px;">Return to Sign In</button>
      </div>
    `;
    const btn = container.querySelector('#btnMenteeCompareLogin');
    if (btn) btn.onclick = () => window.location.reload();
    return;
  }

  const candidateId = session.candidate.id;
  const compData = state.getCandidateComparisonData(candidateId);
  if (!compData) {
    container.innerHTML = `
      <div class="empty-state-card" style="padding: 40px; text-align: center;">
        <h3>Comparison data unavailable</h3>
        <p class="text-muted">Unable to calculate peer comparison for ID: ${candidateId}</p>
      </div>
    `;
    return;
  }

  const {
    candidate,
    myCategory,
    myRank,
    totalInCat,
    percentile,
    myReadiness,
    myTotalMeets,
    myStreak,
    catAvgReadiness,
    catTopReadiness,
    catAvgMeets,
    catTopMeets,
    catAvgStreak,
    catTopStreak,
    peerDossiers,
    programComparisons
  } = compData;

  const isAheadOfAvg = myReadiness >= catAvgReadiness;
  const readinessDelta = Math.abs(myReadiness - catAvgReadiness);
  const myReadinessStatus = getProgressStatus(myReadiness);

  container.innerHTML = `
    <div class="mentee-portal-wrapper">

      <!-- ================= TOP NAV HEADER ================= -->
      <div class="mentee-page-header">
        <div class="mph-left">
          <div class="icon-circle" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff;">
            ${getIcon('chart')}
          </div>
          <div>
            <div class="mph-badge-row">
              <span class="badge badge-category-pill">${myCategory}</span>
              <span class="badge badge-adno-pill">AD: ${candidate.adNo || candidate.chestNo || 'N/A'}</span>
              <span class="badge badge-portal-active">🏆 Category Competitor Arena</span>
            </div>
            <h1 class="mph-title">Peer Performance &amp; Category Standings</h1>
            <p class="mph-desc">
              Benchmark your readiness score, rehearsal attendance, and competition program performance against fellow competitors in ${myCategory}.
            </p>
          </div>
        </div>

        <div class="mph-actions">
          <button type="button" class="btn btn-outline mph-btn" id="btnCompareGoDashboard" title="Return to Mentee Overview Dashboard">
            ${getIcon('dashboard')}
            <span>Dashboard</span>
          </button>
          <button type="button" class="btn btn-outline mph-btn" id="btnCompareGoPractice" title="Open My Practice drills and date switcher">
            ${getIcon('calendar')}
            <span>My Practice</span>
          </button>
          <button type="button" class="btn btn-primary mph-btn" id="btnCompareOpenDossier" title="View official performance dossier">
            ${getIcon('award')}
            <span>Dossier</span>
          </button>
        </div>
      </div>

      <!-- ================= 🏆 HERO ARENA & RANK BANNER ================= -->
      <div class="compare-hero-card">
        <div class="chc-left">
          <div class="chc-rank-badge-wrap">
            <div class="chc-medal-icon">${myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '🎖️'}</div>
            <div class="chc-rank-text">
              <span class="chc-rank-label">Category Standing</span>
              <div class="chc-rank-val">Rank #${myRank} <span class="chc-rank-total">of ${totalInCat}</span></div>
            </div>
          </div>

          <div class="chc-summary-info">
            <div class="chc-pill-row">
              <span class="badge ${myRank === 1 ? 'badge-stage' : 'badge-neutral'}" style="font-size: 11.5px; font-weight: 800;">
                ${percentile >= 90 ? '🏆 Top 10% Contender' : (percentile >= 75 ? '🥈 Top 25% Contender' : `Top ${100 - percentile}% Standing`)}
              </span>
              <span class="badge ${myReadinessStatus.badgeClass}">
                ${myReadiness}% Readiness &bull; ${myReadinessStatus.label}
              </span>
            </div>
            <p class="chc-headline">
              ${isAheadOfAvg 
                ? `✨ Excellent dedication! You are performing <strong>${readinessDelta}% above</strong> the ${myCategory} category average.`
                : `🎯 You are currently <strong>${readinessDelta}% behind</strong> the category average. Attend daily mentor rehearsals to climb the standings!`}
            </p>
          </div>
        </div>

        <!-- Quick Head-to-Head Compare Stats -->
        <div class="chc-right">
          <div class="chc-h2h-box">
            <div class="chc-h2h-item you">
              <span class="chc-h2h-label">You (${candidate.name.split(' ')[0]})</span>
              <span class="chc-h2h-val" style="color: #10b981;">${myReadiness}%</span>
            </div>
            <div class="chc-h2h-divider">vs</div>
            <div class="chc-h2h-item avg">
              <span class="chc-h2h-label">Category Avg</span>
              <span class="chc-h2h-val" style="color: #64748b;">${catAvgReadiness}%</span>
            </div>
            <div class="chc-h2h-divider">vs</div>
            <div class="chc-h2h-item best">
              <span class="chc-h2h-label">Top Performer</span>
              <span class="chc-h2h-val" style="color: #4f46e5;">${catTopReadiness}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= 📊 3 SIDE-BY-SIDE COMPARISON METRIC CARDS ================= -->
      <div class="compare-metrics-grid">
        <!-- Metric 1: Overall Readiness -->
        <div class="compare-metric-card">
          <div class="cmc-header">
            <div>
              <span class="cmc-title">Overall Readiness Score</span>
              <span class="cmc-sub">Average readiness across all programs</span>
            </div>
            <div class="cmc-tag ${myReadiness > 0 && myReadiness >= catAvgReadiness ? 'tag-positive' : 'tag-neutral'}">
              ${myReadiness === 0 
                ? 'Awaiting Evaluation' 
                : (myReadiness >= catTopReadiness && catTopReadiness > 0 
                  ? '🏆 Category Leader' 
                  : (myReadiness >= catAvgReadiness 
                    ? `+${myReadiness - catAvgReadiness}% vs Avg` 
                    : `${myReadiness - catAvgReadiness}% vs Avg`))}
            </div>
          </div>

          <div class="cmc-bars-container">
            <!-- Your Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">You</span>
                <span class="cmc-bar-num" style="color: #10b981;">${myReadiness}%</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-you" style="width: ${myReadiness}%;"></div>
              </div>
            </div>

            <!-- Category Average Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">Category Avg</span>
                <span class="cmc-bar-num" style="color: #64748b;">${catAvgReadiness}%</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-avg" style="width: ${catAvgReadiness}%;"></div>
              </div>
            </div>

            <!-- Category Best Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">Category Best</span>
                <span class="cmc-bar-num" style="color: #4f46e5;">${catTopReadiness}%</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-best" style="width: ${catTopReadiness}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Metric 2: Attendance & Practice Sessions -->
        <div class="compare-metric-card">
          <div class="cmc-header">
            <div>
              <span class="cmc-title">Rehearsals Attended</span>
              <span class="cmc-sub">Total logged check-in sessions</span>
            </div>
            <div class="cmc-tag ${myTotalMeets > 0 && myTotalMeets >= catAvgMeets ? 'tag-positive' : 'tag-neutral'}">
              ${myTotalMeets === 0 
                ? 'No Sessions Yet' 
                : (myTotalMeets >= catTopMeets && catTopMeets > 0 
                  ? '🏆 Top Attendance' 
                  : (myTotalMeets >= catAvgMeets ? 'High Consistency' : 'Below Average'))}
            </div>
          </div>

          <div class="cmc-bars-container">
            <!-- Your Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">You</span>
                <span class="cmc-bar-num" style="color: #10b981;">${myTotalMeets} sessions</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-you" style="width: ${catTopMeets > 0 ? Math.min(100, Math.round((myTotalMeets / catTopMeets) * 100)) : (myTotalMeets > 0 ? 100 : 0)}%;"></div>
              </div>
            </div>

            <!-- Category Average Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">Category Avg</span>
                <span class="cmc-bar-num" style="color: #64748b;">${catAvgMeets} sessions</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-avg" style="width: ${catTopMeets > 0 ? Math.min(100, Math.round((catAvgMeets / catTopMeets) * 100)) : (catAvgMeets > 0 ? 100 : 0)}%;"></div>
              </div>
            </div>

            <!-- Category Best Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">Category Best</span>
                <span class="cmc-bar-num" style="color: #4f46e5;">${catTopMeets} sessions</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-best" style="width: 100%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Metric 3: Active Practice Streak -->
        <div class="compare-metric-card">
          <div class="cmc-header">
            <div>
              <span class="cmc-title">Daily Practice Streak</span>
              <span class="cmc-sub">Consecutive days checked in</span>
            </div>
            <div class="cmc-tag ${myStreak > 0 ? 'tag-positive' : 'tag-neutral'}">
              ${myStreak === 0 
                ? 'Start Today' 
                : (myStreak >= catTopStreak && catTopStreak > 0 
                  ? '🏆 Top Streak' 
                  : (myStreak > 1 ? '🔥 Active Streak' : '1 Day Active'))}
            </div>
          </div>

          <div class="cmc-bars-container">
            <!-- Your Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">You</span>
                <span class="cmc-bar-num" style="color: #ea580c;">${myStreak} ${myStreak === 1 ? 'day' : 'days'}</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-streak" style="width: ${catTopStreak > 0 ? Math.min(100, Math.round((myStreak / catTopStreak) * 100)) : (myStreak > 0 ? 100 : 0)}%;"></div>
              </div>
            </div>

            <!-- Category Average Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">Category Avg</span>
                <span class="cmc-bar-num" style="color: #64748b;">${catAvgStreak} days</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-avg" style="width: ${catTopStreak > 0 ? Math.min(100, Math.round((catAvgStreak / catTopStreak) * 100)) : (catAvgStreak > 0 ? 100 : 0)}%;"></div>
              </div>
            </div>

            <!-- Category Best Bar -->
            <div class="cmc-bar-row">
              <div class="cmc-bar-label-group">
                <span class="cmc-bar-name">Category Best</span>
                <span class="cmc-bar-num" style="color: #4f46e5;">${catTopStreak} days</span>
              </div>
              <div class="cmc-track">
                <div class="cmc-fill fill-best" style="width: 100%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= 🎭 PROGRAM-BY-PROGRAM PEER BREAKDOWN ================= -->
      <div class="mentee-section-card compare-programs-section">
        <div class="section-card-header">
          <div>
            <h3 class="sch-title">Program-by-Program Peer Comparison</h3>
            <p class="sch-desc">How your performance in each assigned competition program stacks up against peers.</p>
          </div>
          <span class="badge badge-neutral-xs">${programComparisons.length} Programs Evaluated</span>
        </div>

        <div class="compare-programs-list">
          ${programComparisons.length > 0 ? programComparisons.map(pc => {
            const prog = pc.program;
            const isStage = prog.type === 'Stage';
            const progStatus = getProgressStatus(pc.myScore);

            return `
              <div class="compare-prog-card ${pc.isLeader ? 'is-leader' : ''}">
                <div class="cpc-header">
                  <div class="cpc-prog-info">
                    <div class="cpc-badges">
                      <span class="badge badge-code-pill">${prog.code}</span>
                      <span class="badge ${isStage ? 'badge-stage' : 'badge-neutral'}">${isStage ? '🎭 Stage' : '📝 Non-Stage'}</span>
                      <span class="badge badge-category-subtle">${prog.category}</span>
                    </div>
                    <h4 class="cpc-prog-title">${prog.name}</h4>
                  </div>

                  <div class="cpc-standing-tag">
                    ${pc.isLeader ? `
                      <span class="badge badge-stage" style="font-size: 11.5px; font-weight: 800; padding: 5px 10px;">
                        🏆 Category Leader (#1)
                      </span>
                    ` : pc.deltaFromAvg >= 0 ? `
                      <span class="badge badge-primary-subtle" style="font-size: 11.5px; font-weight: 800; padding: 5px 10px;">
                        Rank #${pc.myProgRank} of ${pc.competitorCount} &bull; +${pc.deltaFromAvg}% vs Avg
                      </span>
                    ` : `
                      <span class="badge badge-amber" style="font-size: 11.5px; font-weight: 800; padding: 5px 10px;">
                        Rank #${pc.myProgRank} of ${pc.competitorCount} &bull; ${pc.deltaFromAvg}% vs Avg
                      </span>
                    `}
                  </div>
                </div>

                <!-- 3-Way Comparative Score Row -->
                <div class="cpc-scores-grid">
                  <div class="cpc-score-tile you">
                    <span class="cpc-st-label">Your Score</span>
                    <span class="cpc-st-val" style="color: ${pc.isMet ? progStatus.color : '#64748b'};">
                      ${pc.isMet ? `${pc.myScore}%` : 'Pending'}
                    </span>
                    <span class="badge ${pc.isMet ? progStatus.badgeClass : 'badge-neutral'}" style="font-size: 9.5px;">
                      ${pc.isMet ? progStatus.label : 'Not Evaluated'}
                    </span>
                  </div>

                  <div class="cpc-score-tile avg">
                    <span class="cpc-st-label">Program Avg</span>
                    <span class="cpc-st-val" style="color: #64748b;">${pc.progAvgScore}%</span>
                    <span class="cpc-st-sub">${pc.competitorCount} competitors</span>
                  </div>

                  <div class="cpc-score-tile best">
                    <span class="cpc-st-label">Highest Score</span>
                    <span class="cpc-st-val" style="color: #4f46e5;">${pc.progTopScore}%</span>
                    <span class="cpc-st-sub">${pc.isLeader ? 'Held by You 🏆' : 'Target Score'}</span>
                  </div>
                </div>

                <!-- Comparative Visual Progress Bar -->
                <div class="cpc-bar-wrap">
                  <div class="cpc-track">
                    <div class="cpc-fill" style="width: ${pc.myScore}%; background: ${pc.isLeader ? '#10b981' : (pc.deltaFromAvg >= 0 ? '#4f46e5' : '#f59e0b')};"></div>
                    <!-- Program Average Marker -->
                    <div class="cpc-marker avg-marker" style="left: ${pc.progAvgScore}%;" title="Category Average: ${pc.progAvgScore}%"></div>
                  </div>
                  <div class="cpc-bar-legend">
                    <span>0%</span>
                    <span style="left: ${pc.progAvgScore}%; transform: translateX(-50%); position: absolute; font-size: 10px; color: #64748b; font-weight: 700;">▲ Avg: ${pc.progAvgScore}%</span>
                    <span>100% Target</span>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div class="empty-state-card" style="padding: 24px; text-align: center;">
              <p class="text-muted">No programs enrolled yet.</p>
            </div>
          `}
        </div>
      </div>

      <!-- ================= 🏆 CATEGORY LEADERBOARD & STANDINGS ================= -->
      <div class="mentee-section-card compare-leaderboard-section">
        <div class="section-card-header">
          <div>
            <h3 class="sch-title">Sibaq 2026 &bull; ${myCategory} Category Standings</h3>
            <p class="sch-desc">Live performance standing across all registered candidates in your category.</p>
          </div>
          <span class="badge badge-neutral-xs">${totalInCat} Registered Competitors</span>
        </div>

        <div class="compare-table-wrapper">
          <table class="compare-table">
            <thead>
              <tr>
                <th style="width: 60px; text-align: center;">Rank</th>
                <th>Candidate &bull; Chest No</th>
                <th style="text-align: center;">Readiness</th>
                <th style="text-align: center;">Sessions</th>
                <th style="text-align: center;">Streak</th>
                <th style="text-align: right;">Status Tier</th>
              </tr>
            </thead>
            <tbody>
              ${peerDossiers.map(p => {
                const isMe = p.isCurrent;
                const status = getProgressStatus(p.overallReadiness);
                const chestDisplay = p.candidate.chestNo ? `#${p.candidate.chestNo}` : (p.candidate.adNo || `#${p.candidate.id.slice(-4)}`);

                return `
                  <tr class="compare-row ${isMe ? 'is-me' : ''}">
                    <td class="cr-rank" style="text-align: center;">
                      ${p.rank === 1 ? '<span class="rank-medal gold">🥇 1</span>' 
                        : p.rank === 2 ? '<span class="rank-medal silver">🥈 2</span>' 
                        : p.rank === 3 ? '<span class="rank-medal bronze">🥉 3</span>' 
                        : `<span class="rank-num">#${p.rank}</span>`}
                    </td>

                    <td class="cr-cand">
                      <div class="cr-cand-wrap">
                        <div class="cr-avatar" style="background: ${isMe ? '#10b981' : '#6366f1'};">
                          ${p.candidate.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div class="cr-info">
                          <div class="cr-name-row">
                            <span class="cr-name">${p.candidate.name}</span>
                            ${isMe ? `<span class="badge badge-stage cr-you-badge">⭐ YOU</span>` : ''}
                          </div>
                          <span class="cr-sub">${chestDisplay} &bull; ${p.programReports ? p.programReports.length : 0} Programs</span>
                        </div>
                      </div>
                    </td>

                    <td class="cr-readiness" style="text-align: center;">
                      <div class="cr-readiness-box">
                        <span class="cr-readiness-val" style="color: ${status.color};">${p.overallReadiness}%</span>
                        <div class="cr-mini-bar">
                          <div class="cr-mini-fill" style="width: ${p.overallReadiness}%; background: ${status.color};"></div>
                        </div>
                      </div>
                    </td>

                    <td class="cr-sessions" style="text-align: center;">
                      <span class="cr-session-pill">${p.totalMeets} logged</span>
                    </td>

                    <td class="cr-streak" style="text-align: center;">
                      <span class="cr-streak-pill ${p.streak > 0 ? 'active' : ''}">${p.streak > 0 ? `🔥 ${p.streak}d` : '—'}</span>
                    </td>

                    <td class="cr-tier" style="text-align: right;">
                      <span class="badge ${status.badgeClass}">${status.label}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ================= 💡 STRATEGIC PRACTICE ACTION PLAN ================= -->
      <div class="mentee-benchmark-card compare-action-card">
        <div class="mbc-header">
          <span class="mbc-icon">🚀</span>
          <div>
            <h4 class="mbc-title">Strategic Competitive Action Plan</h4>
            <p class="mbc-desc">Tips to elevate your performance ranking in ${myCategory}:</p>
          </div>
        </div>

        <div class="cac-points-grid">
          <div class="cac-point-item">
            <span class="cac-icon">🔥</span>
            <div>
              <strong>Maintain Active Practice Streak:</strong>
              <p>Daily check-ins give you consistent momentum and maximize retention.</p>
            </div>
          </div>

          <div class="cac-point-item">
            <span class="cac-icon">🎯</span>
            <div>
              <strong>Target Lagging Programs:</strong>
              <p>Schedule focused drills for any program scoring below the category average.</p>
            </div>
          </div>

          <div class="cac-point-item">
            <span class="cac-icon">💬</span>
            <div>
              <strong>Review Mentor Critiques:</strong>
              <p>Read your mentor's daily practice notes in My Practice to polish stage nuances.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  // Attach Top Actions
  const btnDashboard = container.querySelector('#btnCompareGoDashboard');
  if (btnDashboard) {
    btnDashboard.onclick = () => {
      if (typeof navigate === 'function') navigate('mentee-dashboard');
    };
  }

  const btnPractice = container.querySelector('#btnCompareGoPractice');
  if (btnPractice) {
    btnPractice.onclick = () => {
      if (typeof navigate === 'function') navigate('mentee-practice');
    };
  }

  const btnDossier = container.querySelector('#btnCompareOpenDossier');
  if (btnDossier) {
    btnDossier.onclick = () => {
      openCandidateDossierModal(candidate.id);
    };
  }
}
