import { state, getProgressStatus } from '../services/state.js';
import { getIcon } from './icons.js';
import { openCandidateDossierModal } from './modals/candidateDossierModal.js';
import { openTrainerProfileModal } from './modals/trainerProfileModal.js';
import { excelService } from '../services/excelService.js';
import { toast } from './toast.js';

/**
 * Performance Reports & Dossiers View
 * Dual-tab central reports hub:
 * 1. Candidate Performance & Readiness Report with deep-dive dossier
 * 2. Trainer Mentorship & Evaluation Compliance Report
 * Complete with multi-filtering, sorting, print views, and Excel export.
 */
export function renderReportsView(container, navigateTo) {
  let activeTab = 'candidates'; // 'candidates' | 'trainers'
  let searchQuery = '';
  let filterCategory = 'ALL';
  let filterProgType = 'ALL';
  let filterReadiness = 'ALL';
  let filterMeetingRate = 'ALL';
  let filterMomentum = 'ALL';
  let filterProgramId = 'ALL';
  let filterTrainerId = 'ALL';
  let sortBy = 'chest-asc'; // 'chest-asc', 'chest-desc', 'readiness-desc', 'readiness-asc', 'meets-desc', 'name-asc'

  const allPrograms = state.getPrograms();
  const allTrainers = state.getTrainers();

  // Extract unique categories
  const categories = Array.from(new Set(state.getCandidates().map(c => c.category).filter(Boolean)));

  container.innerHTML = `
    <!-- Top View Header -->
    <div class="saas-view-header reports-view-header">
      <div class="svh-title-block">
        <h1 class="svh-title">Performance Reports & Dossiers</h1>
        <p class="svh-desc">
          Comprehensive candidate readiness tracking, program-by-program meeting rates, trajectory momentum, and trainers' mentorship evaluation.
        </p>
      </div>

      <div class="saas-header-actions">
        <!-- Sub-section Tab Switcher -->
        <div class="reports-tab-capsule" style="display: flex; background: #f1f5f9; padding: 3px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <button type="button" class="reports-tab-btn active" id="tabBtnCandidates" style="display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; background: #ffffff; color: #4338ca; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.15s ease;">
            ${getIcon('award')} <span>Candidate Reports</span>
          </button>
          <button type="button" class="reports-tab-btn" id="tabBtnTrainers" style="display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; background: transparent; color: #64748b; transition: all 0.15s ease;">
            ${getIcon('trainers')} <span>Trainer Reports</span>
          </button>
        </div>

        <!-- Global Action Buttons -->
        <button id="btnPrintReportTable" class="btn btn-outline btn-sm desktop-only-btn" style="gap: 6px; font-weight: 700; border-color: #cbd5e1; height: 36px;" title="Print Current Report Sheet">
          ${getIcon('printer')} <span>Print Report</span>
        </button>
        <button id="btnExportReportExcel" class="btn btn-primary btn-sm desktop-only-btn" style="gap: 6px; font-weight: 700; height: 36px;" title="Export Current Report to Excel Spreadsheet">
          ${getIcon('fileSpreadsheet')} <span>Export Excel</span>
        </button>
      </div>
    </div>

    <!-- Dynamic Reports Content Area -->
    <div id="reportsContentWrapper" class="reports-content-wrapper">
      <!-- Injected by renderSubView() -->
    </div>
  `;

  const contentWrapper = container.querySelector('#reportsContentWrapper');
  const tabBtnCandidates = container.querySelector('#tabBtnCandidates');
  const tabBtnTrainers = container.querySelector('#tabBtnTrainers');
  const btnPrint = container.querySelector('#btnPrintReportTable');
  const btnExport = container.querySelector('#btnExportReportExcel');

  const updateTabStyles = () => {
    if (activeTab === 'candidates') {
      tabBtnCandidates.style.background = '#ffffff';
      tabBtnCandidates.style.color = '#4338ca';
      tabBtnCandidates.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      tabBtnTrainers.style.background = 'transparent';
      tabBtnTrainers.style.color = '#64748b';
      tabBtnTrainers.style.boxShadow = 'none';
    } else {
      tabBtnTrainers.style.background = '#ffffff';
      tabBtnTrainers.style.color = '#4338ca';
      tabBtnTrainers.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      tabBtnCandidates.style.background = 'transparent';
      tabBtnCandidates.style.color = '#64748b';
      tabBtnCandidates.style.boxShadow = 'none';
    }
  };

  tabBtnCandidates.addEventListener('click', () => {
    if (activeTab !== 'candidates') {
      activeTab = 'candidates';
      updateTabStyles();
      renderSubView();
    }
  });

  tabBtnTrainers.addEventListener('click', () => {
    if (activeTab !== 'trainers') {
      activeTab = 'trainers';
      updateTabStyles();
      renderSubView();
    }
  });

  function renderSubView() {
    if (activeTab === 'candidates') {
      renderCandidateReportSection();
    } else {
      renderTrainerReportSection();
    }
  }

  // -------------------------------------------------------------
  // 1. CANDIDATE REPORT SUB-SECTION
  // -------------------------------------------------------------
  function renderCandidateReportSection() {
    const allDossiers = state.getAllCandidatesReportData();

    // Calculate Summary Stats
    const totalCount = allDossiers.length;
    const evaluatedDossiers = allDossiers.filter(d => d.hasEvaluation);
    const avgReadiness = evaluatedDossiers.length > 0
      ? Math.round(evaluatedDossiers.reduce((sum, d) => sum + d.overallReadiness, 0) / evaluatedDossiers.length)
      : 0;
    const avgStatus = getProgressStatus(avgReadiness);

    const fullyMetCount = allDossiers.filter(d => d.totalPrograms > 0 && d.metProgramsCount === d.totalPrograms).length;
    const fullyMetPct = totalCount > 0 ? Math.round((fullyMetCount / totalCount) * 100) : 0;

    const atRiskCount = allDossiers.filter(
      d => d.momentumKey === 'at-risk' || d.momentumKey === 'stagnant' || d.momentumKey === 'not-started'
    ).length;

    // Filter Logic
    let filtered = allDossiers.filter(d => {
      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const cand = d.candidate;
        const matchesName = String(cand.name || '').toLowerCase().includes(q);
        const matchesChest = String(cand.chestNo || cand.id || '').toLowerCase().includes(q);
        const matchesPhone = String(cand.phone || '').includes(q);
        const matchesInst = String(cand.institution || '').toLowerCase().includes(q);
        if (!matchesName && !matchesChest && !matchesPhone && !matchesInst) return false;
      }

      // Category
      if (filterCategory !== 'ALL' && d.candidate.category !== filterCategory) {
        return false;
      }

      // Program Type (Stage / Non-Stage)
      if (filterProgType !== 'ALL') {
        const hasType = d.programs.some(p => p.type === filterProgType);
        if (!hasType) return false;
      }

      // Readiness Status
      if (filterReadiness !== 'ALL') {
        if (filterReadiness === 'READY' && (!d.hasEvaluation || d.overallReadiness < 80)) return false;
        if (filterReadiness === 'ON_TRACK' && (!d.hasEvaluation || d.overallReadiness < 60 || d.overallReadiness >= 80)) return false;
        if (filterReadiness === 'ATTENTION' && (!d.hasEvaluation || d.overallReadiness >= 60)) return false;
        if (filterReadiness === 'NO_DATA' && d.hasEvaluation) return false;
      }

      // Meeting Rate
      if (filterMeetingRate !== 'ALL') {
        if (filterMeetingRate === 'FULLY_MET' && (d.totalPrograms === 0 || d.metProgramsCount !== d.totalPrograms)) return false;
        if (filterMeetingRate === 'PARTIAL' && (d.metProgramsCount === 0 || d.metProgramsCount >= d.totalPrograms)) return false;
        if (filterMeetingRate === 'ZERO' && d.metProgramsCount > 0) return false;
      }

      // Preparation Momentum
      if (filterMomentum !== 'ALL' && d.momentumKey !== filterMomentum) {
        return false;
      }

      // Specific Program
      if (filterProgramId !== 'ALL') {
        if (!d.programs.some(p => p.id === filterProgramId)) return false;
      }

      // Specific Trainer
      if (filterTrainerId !== 'ALL') {
        const hasTrainer = d.programs.some(p => String(p.trainerId || '').trim() === String(filterTrainerId).trim());
        if (!hasTrainer) return false;
      }

      return true;
    });

    // Sorting Logic
    filtered.sort((a, b) => {
      if (sortBy === 'chest-asc') {
        return (Number(a.candidate.chestNo) || 0) - (Number(b.candidate.chestNo) || 0);
      }
      if (sortBy === 'chest-desc') {
        return (Number(b.candidate.chestNo) || 0) - (Number(a.candidate.chestNo) || 0);
      }
      if (sortBy === 'readiness-desc') {
        return (b.overallReadiness || 0) - (a.overallReadiness || 0);
      }
      if (sortBy === 'readiness-asc') {
        return (a.overallReadiness || 0) - (b.overallReadiness || 0);
      }
      if (sortBy === 'meets-desc') {
        return (b.meetingRatePct || 0) - (a.meetingRatePct || 0);
      }
      if (sortBy === 'name-asc') {
        return a.candidate.name.localeCompare(b.candidate.name);
      }
      return 0;
    });

    contentWrapper.innerHTML = `
      <!-- Executive Summary KPI Row -->
      <div class="saas-stats-grid reports-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 18px;">
        
        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Total Candidates</span>
            <span class="ssc-icon-box p-stage">${getIcon('candidates')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value">${totalCount}</span>
            <span class="ssc-sub-badge badge-neutral">${allPrograms.length} Programs</span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Assigned to specialized mentors
          </div>
        </div>

        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Overall Readiness Avg</span>
            <span class="ssc-icon-box p-stage">${getIcon('award')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value" style="color: ${avgStatus.color};">${avgReadiness}%</span>
            <span class="badge ${avgStatus.badgeClass} text-xs font-semibold">${avgStatus.label}</span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Evaluated across ${evaluatedDossiers.length} candidates
          </div>
        </div>

        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Fully Met Candidates</span>
            <span class="ssc-icon-box p-stage">${getIcon('check')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value">${fullyMetCount}</span>
            <span class="badge badge-stage text-xs font-semibold">${fullyMetPct}% Complete</span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Met 100% of their assigned programs
          </div>
        </div>

        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Follow-Up Required</span>
            <span class="ssc-icon-box p-danger" style="background:#fee2e2; color:#ef4444;">${getIcon('alertCircle')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value text-danger">${atRiskCount}</span>
            <span class="badge badge-danger text-xs font-semibold">At Risk / Stagnant</span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Zero meets or inactive >7 days
          </div>
        </div>
      </div>

      <!-- Comprehensive Search & Filter Control Center -->
      <div class="reports-filter-panel" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        
        <!-- Search & Quick Actions -->
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px;">
          <div class="search-box" style="flex: 1; min-width: 240px; margin: 0;">
            <span class="search-icon">${getIcon('search')}</span>
            <input 
              type="text" 
              id="inpReportCandSearch" 
              class="search-input" 
              placeholder="Search candidate by name, chest number, phone, institution..." 
              value="${searchQuery}" 
            />
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <select id="selReportSort" class="form-input" style="height: 38px; font-size: 12.5px; padding: 0 10px; width: auto; font-weight: 600;">
              <option value="chest-asc" ${sortBy === 'chest-asc' ? 'selected' : ''}>Sort: Chest No (Low → High)</option>
              <option value="chest-desc" ${sortBy === 'chest-desc' ? 'selected' : ''}>Sort: Chest No (High → Low)</option>
              <option value="readiness-desc" ${sortBy === 'readiness-desc' ? 'selected' : ''}>Sort: Readiness (Highest)</option>
              <option value="readiness-asc" ${sortBy === 'readiness-asc' ? 'selected' : ''}>Sort: Readiness (Lowest)</option>
              <option value="meets-desc" ${sortBy === 'meets-desc' ? 'selected' : ''}>Sort: Meeting Rate (Highest)</option>
              <option value="name-asc" ${sortBy === 'name-asc' ? 'selected' : ''}>Sort: Name (A → Z)</option>
            </select>

            <button type="button" id="btnResetCandFilters" class="btn btn-sm btn-outline" style="height: 38px; padding: 0 12px; font-size: 12px; font-weight: 600; border-color: #cbd5e1;" title="Reset all filters">
              ${getIcon('refresh')} <span>Reset</span>
            </button>
          </div>
        </div>

        <!-- Filter Dropdowns Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px;">
          
          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Category</label>
            <select id="selFilterCategory" class="form-input" style="height: 34px; font-size: 12px; padding: 0 8px;">
              <option value="ALL">All Categories</option>
              ${categories.map(c => `<option value="${c}" ${filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Program Type</label>
            <select id="selFilterProgType" class="form-input" style="height: 34px; font-size: 12px; padding: 0 8px;">
              <option value="ALL" ${filterProgType === 'ALL' ? 'selected' : ''}>Stage & Non-Stage</option>
              <option value="Stage" ${filterProgType === 'Stage' ? 'selected' : ''}>Stage Only</option>
              <option value="Non-Stage" ${filterProgType === 'Non-Stage' ? 'selected' : ''}>Non-Stage Only</option>
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Readiness Score</label>
            <select id="selFilterReadiness" class="form-input" style="height: 34px; font-size: 12px; padding: 0 8px;">
              <option value="ALL" ${filterReadiness === 'ALL' ? 'selected' : ''}>All Readiness Levels</option>
              <option value="READY" ${filterReadiness === 'READY' ? 'selected' : ''}>Stage Ready (80%+)</option>
              <option value="ON_TRACK" ${filterReadiness === 'ON_TRACK' ? 'selected' : ''}>On Track (60–79%)</option>
              <option value="ATTENTION" ${filterReadiness === 'ATTENTION' ? 'selected' : ''}>Needs Attention (&lt;60%)</option>
              <option value="NO_DATA" ${filterReadiness === 'NO_DATA' ? 'selected' : ''}>Not Evaluated</option>
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Meeting Compliance</label>
            <select id="selFilterMeetingRate" class="form-input" style="height: 34px; font-size: 12px; padding: 0 8px;">
              <option value="ALL" ${filterMeetingRate === 'ALL' ? 'selected' : ''}>All Meeting Rates</option>
              <option value="FULLY_MET" ${filterMeetingRate === 'FULLY_MET' ? 'selected' : ''}>100% Fully Met (All Progs)</option>
              <option value="PARTIAL" ${filterMeetingRate === 'PARTIAL' ? 'selected' : ''}>Partial Met (At least 1)</option>
              <option value="ZERO" ${filterMeetingRate === 'ZERO' ? 'selected' : ''}>0% No Meets (Pending)</option>
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Preparation Health</label>
            <select id="selFilterMomentum" class="form-input" style="height: 34px; font-size: 12px; padding: 0 8px;">
              <option value="ALL" ${filterMomentum === 'ALL' ? 'selected' : ''}>All Trajectories</option>
              <option value="stage-ready" ${filterMomentum === 'stage-ready' ? 'selected' : ''}>Peak Ready & Active</option>
              <option value="accelerating" ${filterMomentum === 'accelerating' ? 'selected' : ''}>Actively Preparing</option>
              <option value="progressing" ${filterMomentum === 'progressing' ? 'selected' : ''}>Steady Progress</option>
              <option value="stagnant" ${filterMomentum === 'stagnant' ? 'selected' : ''}>Needs Intervention (&gt;7d)</option>
              <option value="at-risk" ${filterMomentum === 'at-risk' ? 'selected' : ''}>Lagging / At Risk</option>
              <option value="not-started" ${filterMomentum === 'not-started' ? 'selected' : ''}>Not Started</option>
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Assigned Program</label>
            <select id="selFilterProgramId" class="form-input" style="height: 34px; font-size: 12px; padding: 0 8px;">
              <option value="ALL">All Programs</option>
              ${allPrograms.map(p => `<option value="${p.id}" ${filterProgramId === p.id ? 'selected' : ''}>[${p.code}] ${p.name.slice(0, 20)}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Assigned Mentor</label>
            <select id="selFilterTrainerId" class="form-input" style="height: 34px; font-size: 12px; padding: 0 8px;">
              <option value="ALL">All Mentors</option>
              ${allTrainers.map(t => `<option value="${t.id}" ${filterTrainerId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select>
          </div>
        </div>

      </div>

      <!-- Results Count & Print Indicator Strip -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 2px;">
        <span class="text-xs font-semibold text-muted">
          Showing <strong>${filtered.length}</strong> of <strong>${totalCount}</strong> candidates
        </span>
        <span class="text-xs text-muted desktop-only-inline">
          Click <strong>View Dossier</strong> to analyze multi-session trajectories and trainer remarks.
        </span>
      </div>

      <!-- Candidate Report Table & Cards -->
      ${filtered.length === 0 ? `
        <div class="empty-state-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 40px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <strong style="font-size: 16px; color: #0f172a;">No candidates match your filters</strong>
          <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Try loosening your search terms or resetting filters.</p>
          <button type="button" id="btnResetEmptyFilters" class="btn btn-secondary btn-sm" style="margin-top: 12px;">
            Reset All Filters
          </button>
        </div>
      ` : `
        <div class="reports-table-container" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <table class="saas-table reports-cand-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 11.5px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                <th style="padding: 12px 14px; width: 60px;">Chest</th>
                <th style="padding: 12px 14px; width: 220px;">Candidate</th>
                <th style="padding: 12px 14px; min-width: 220px;">Assigned Programs (Status & Readiness)</th>
                <th style="padding: 12px 14px; width: 140px;">Overall Readiness</th>
                <th style="padding: 12px 14px; width: 130px;">Meeting Rate</th>
                <th style="padding: 12px 14px; width: 150px;">Preparation Health</th>
                <th style="padding: 12px 14px; width: 130px; text-align: right;">Dossier Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(d => {
                const cand = d.candidate;
                const statusBadge = d.overallStatus;
                const isMet = d.totalPrograms > 0 && d.metProgramsCount === d.totalPrograms;

                return `
                  <tr class="report-candidate-tr" style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                    
                    <!-- Chest No -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <span class="badge badge-neutral" style="font-weight: 800; font-size: 11.5px;">
                        #${cand.chestNo || cand.id}
                      </span>
                    </td>

                    <!-- Candidate Name & Meta -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column;">
                        <strong class="report-cand-name" style="font-size: 13.5px; color: #0f172a; cursor: pointer;" data-action="view-dossier" data-cid="${cand.id}" title="Click to view candidate performance dossier">
                          ${cand.name}
                        </strong>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                          <span>${cand.category}</span>
                          ${cand.phone ? `<span> • ${cand.phone}</span>` : ''}
                        </div>
                      </div>
                    </td>

                    <!-- Assigned Programs with individual readiness -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      ${d.programs.length === 0 ? `
                        <span class="text-xs text-muted">No programs assigned</span>
                      ` : `
                        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                          ${d.programReports.map(pr => {
                            const badgeBg = pr.isMet ? '#ecfdf5' : '#fef2f2';
                            const badgeBorder = pr.isMet ? '#a7f3d0' : '#fecaca';
                            const badgeText = pr.isMet ? '#065f46' : '#991b1b';
                            const scoreText = pr.isMet ? `${pr.latestScore}%` : 'Pending';

                            return `
                              <div class="prog-report-chip" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeText};" title="Program: ${pr.program.name} | Readiness: ${scoreText} | Mentor: ${pr.trainer ? pr.trainer.name : 'Unassigned'}">
                                <span>[${pr.program.code}]</span>
                                <span>•</span>
                                <span style="font-weight: 800;">${scoreText}</span>
                              </div>
                            `;
                          }).join('')}
                        </div>
                      `}
                    </td>

                    <!-- Overall Readiness -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <strong style="font-size: 14px; color: ${d.hasEvaluation ? statusBadge.color : '#64748b'};">
                            ${d.hasEvaluation ? `${d.overallReadiness}%` : 'N/A'}
                          </strong>
                          <span class="badge ${statusBadge.badgeClass}" style="font-size: 10px;">
                            ${statusBadge.label}
                          </span>
                        </div>
                        <div class="progress-bar-bg" style="height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                          <div style="width: ${d.overallReadiness}%; height: 100%; background: ${d.hasEvaluation ? statusBadge.color : '#cbd5e1'};"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Meeting Rate -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 2px;">
                        <span class="badge ${isMet ? 'badge-stage' : (d.metProgramsCount > 0 ? 'badge-amber' : 'badge-danger')}" style="font-size: 11px; font-weight: 700; width: fit-content;">
                          ${d.meetingRateLabel}
                        </span>
                        <span style="font-size: 10.5px; color: #64748b;">
                          ${d.totalMeets} check-ins logged
                        </span>
                      </div>
                    </td>

                    <!-- Preparation Trajectory / Health -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${d.momentumColor}; flex-shrink: 0;"></span>
                        <span class="badge ${d.momentumBadgeClass}" style="font-size: 10.5px; font-weight: 700;">
                          ${d.momentumLabel}
                        </span>
                      </div>
                      <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
                        ${d.daysSinceLastMeet !== null ? (d.daysSinceLastMeet === 0 ? 'Active today' : `${d.daysSinceLastMeet}d ago`) : 'No check-ins'}
                      </div>
                    </td>

                    <!-- Actions -->
                    <td style="padding: 12px 14px; vertical-align: middle; text-align: right;">
                      <div style="display: inline-flex; align-items: center; gap: 6px;">
                        <button type="button" class="btn btn-sm btn-primary" data-action="view-dossier" data-cid="${cand.id}" style="font-size: 11.5px; height: 30px; padding: 0 10px; gap: 4px; font-weight: 700;" title="View candidate dossier & trainer feedback">
                          ${getIcon('award')} <span>Dossier</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline desktop-only-btn" data-action="print-dossier" data-cid="${cand.id}" style="font-size: 11.5px; height: 30px; padding: 0 8px; border-color: #cbd5e1;" title="Print candidate dossier">
                          ${getIcon('printer')}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;

    // Bind Candidate Report events
    const inpSearch = contentWrapper.querySelector('#inpReportCandSearch');
    if (inpSearch) {
      inpSearch.addEventListener('input', e => {
        searchQuery = e.target.value.trim();
        renderCandidateReportSection();
      });
    }

    const selSort = contentWrapper.querySelector('#selReportSort');
    if (selSort) {
      selSort.addEventListener('change', e => {
        sortBy = e.target.value;
        renderCandidateReportSection();
      });
    }

    const selCategory = contentWrapper.querySelector('#selFilterCategory');
    if (selCategory) {
      selCategory.addEventListener('change', e => {
        filterCategory = e.target.value;
        renderCandidateReportSection();
      });
    }

    const selProgType = contentWrapper.querySelector('#selFilterProgType');
    if (selProgType) {
      selProgType.addEventListener('change', e => {
        filterProgType = e.target.value;
        renderCandidateReportSection();
      });
    }

    const selReadiness = contentWrapper.querySelector('#selFilterReadiness');
    if (selReadiness) {
      selReadiness.addEventListener('change', e => {
        filterReadiness = e.target.value;
        renderCandidateReportSection();
      });
    }

    const selMeetingRate = contentWrapper.querySelector('#selFilterMeetingRate');
    if (selMeetingRate) {
      selMeetingRate.addEventListener('change', e => {
        filterMeetingRate = e.target.value;
        renderCandidateReportSection();
      });
    }

    const selMomentum = contentWrapper.querySelector('#selFilterMomentum');
    if (selMomentum) {
      selMomentum.addEventListener('change', e => {
        filterMomentum = e.target.value;
        renderCandidateReportSection();
      });
    }

    const selProgram = contentWrapper.querySelector('#selFilterProgramId');
    if (selProgram) {
      selProgram.addEventListener('change', e => {
        filterProgramId = e.target.value;
        renderCandidateReportSection();
      });
    }

    const selTrainer = contentWrapper.querySelector('#selFilterTrainerId');
    if (selTrainer) {
      selTrainer.addEventListener('change', e => {
        filterTrainerId = e.target.value;
        renderCandidateReportSection();
      });
    }

    const resetFilters = () => {
      searchQuery = '';
      filterCategory = 'ALL';
      filterProgType = 'ALL';
      filterReadiness = 'ALL';
      filterMeetingRate = 'ALL';
      filterMomentum = 'ALL';
      filterProgramId = 'ALL';
      filterTrainerId = 'ALL';
      sortBy = 'chest-asc';
      renderCandidateReportSection();
    };

    const btnReset = contentWrapper.querySelector('#btnResetCandFilters');
    if (btnReset) btnReset.addEventListener('click', resetFilters);

    const btnResetEmpty = contentWrapper.querySelector('#btnResetEmptyFilters');
    if (btnResetEmpty) btnResetEmpty.addEventListener('click', resetFilters);

    // Open Dossier Modals
    contentWrapper.querySelectorAll('[data-action="view-dossier"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-cid');
        if (cid) openCandidateDossierModal(cid);
      });
    });

    contentWrapper.querySelectorAll('[data-action="print-dossier"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.getAttribute('data-cid');
        if (cid) {
          openCandidateDossierModal(cid);
          setTimeout(() => {
            const printBtn = document.querySelector('#btnDossierPrint');
            if (printBtn) printBtn.click();
          }, 300);
        }
      });
    });

    // Wire global print and excel for Candidate Report
    btnPrint.onclick = () => {
      printCandidateReportSheet(filtered);
    };

    btnExport.onclick = () => {
      excelService.exportCandidatePerformanceReport(filtered);
      toast.success(`Exported ${filtered.length} candidate reports to Excel.`);
    };
  }

  // -------------------------------------------------------------
  // 2. TRAINER REPORT SUB-SECTION
  // -------------------------------------------------------------
  function renderTrainerReportSection() {
    const allTrainerReports = state.getAllTrainersReportData();

    // Summary KPIs
    const totalTrainers = allTrainerReports.length;
    const evaluatedTrainers = allTrainerReports.filter(t => t.readiness.hasData);
    const avgMenteeReadiness = evaluatedTrainers.length > 0
      ? Math.round(evaluatedTrainers.reduce((sum, t) => sum + t.averageReadiness, 0) / evaluatedTrainers.length)
      : 0;
    const avgStatus = getProgressStatus(avgMenteeReadiness);

    const totalMentorshipPairs = allTrainerReports.reduce((sum, t) => sum + t.menteeCount, 0);
    const avgCompliance = totalTrainers > 0
      ? Math.round(allTrainerReports.reduce((sum, t) => sum + t.complianceRate, 0) / totalTrainers)
      : 0;

    let filtered = allTrainerReports.filter(t => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.trainer.name.toLowerCase().includes(q);
        const matchesExp = (t.trainer.expertise || '').toLowerCase().includes(q);
        if (!matchesName && !matchesExp) return false;
      }
      return true;
    });

    contentWrapper.innerHTML = `
      <!-- Executive Summary KPI Row -->
      <div class="saas-stats-grid reports-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 18px;">
        
        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Specialized Mentors</span>
            <span class="ssc-icon-box p-stage">${getIcon('trainers')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value">${totalTrainers}</span>
            <span class="badge badge-neutral text-xs font-semibold">Active Faculty</span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Evaluating stage & non-stage categories
          </div>
        </div>

        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Average Mentee Score</span>
            <span class="ssc-icon-box p-stage">${getIcon('award')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value" style="color: ${avgStatus.color};">${avgMenteeReadiness}%</span>
            <span class="badge ${avgStatus.badgeClass} text-xs font-semibold">${avgStatus.label}</span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Average across all mentored candidates
          </div>
        </div>

        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Mentee Assignments</span>
            <span class="ssc-icon-box p-stage">${getIcon('users')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value">${totalMentorshipPairs}</span>
            <span class="badge badge-primary-subtle text-xs font-semibold">Candidate Slots</span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Across all assigned programs
          </div>
        </div>

        <div class="saas-stat-card">
          <div class="ssc-top">
            <span class="ssc-label">Meeting Compliance</span>
            <span class="ssc-icon-box p-stage">${getIcon('check')}</span>
          </div>
          <div class="ssc-main">
            <span class="ssc-value">${avgCompliance}%</span>
            <span class="badge ${avgCompliance >= 80 ? 'badge-stage' : (avgCompliance >= 50 ? 'badge-amber' : 'badge-danger')} text-xs font-semibold">
              Evaluation Rate
            </span>
          </div>
          <div class="ssc-footer text-muted text-xs">
            Percentage of assigned mentees met
          </div>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 14px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 14px;">
        <div class="search-box" style="flex: 1; margin: 0;">
          <span class="search-icon">${getIcon('search')}</span>
          <input 
            type="text" 
            id="inpReportTrnSearch" 
            class="search-input" 
            placeholder="Search trainer by name, expertise, domain..." 
            value="${searchQuery}" 
          />
        </div>
        <span class="text-xs text-muted">
          Showing <strong>${filtered.length}</strong> of <strong>${totalTrainers}</strong> trainers
        </span>
      </div>

      <!-- Trainers Performance Table -->
      ${filtered.length === 0 ? `
        <div class="empty-state-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 40px; text-align: center;">
          <strong style="font-size: 15px; color: #0f172a;">No trainers match your search.</strong>
        </div>
      ` : `
        <div class="reports-table-container" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <table class="saas-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 11.5px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                <th style="padding: 12px 14px; width: 240px;">Trainer & Mentor</th>
                <th style="padding: 12px 14px; width: 140px;">Specialization</th>
                <th style="padding: 12px 14px; min-width: 180px;">Assigned Programs</th>
                <th style="padding: 12px 14px; width: 130px;">Meeting Compliance</th>
                <th style="padding: 12px 14px; width: 140px;">Avg Mentee Readiness</th>
                <th style="padding: 12px 14px; width: 150px;">Score Breakdown</th>
                <th style="padding: 12px 14px; width: 110px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(t => {
                const trn = t.trainer;
                const rStatus = getProgressStatus(t.averageReadiness);

                return `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <!-- Trainer Avatar & Name -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="trainer-avatar-mini" style="background: ${trn.color || '#6366f1'}; overflow: hidden; width: 38px; height: 38px;">
                          ${trn.photo ? `<img src="${trn.photo}" alt="${trn.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : trn.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <strong style="font-size: 13.5px; color: #0f172a; cursor: pointer;" data-action="view-trn-profile" data-tid="${trn.id}" title="Click to view trainer profile">
                            ${trn.name}
                          </strong>
                          <div style="font-size: 11px; color: #64748b;">
                            ${trn.phone ? `${trn.phone} • ` : ''}${t.menteeCount} Mentees
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Expertise -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <span class="badge badge-primary-subtle" style="font-size: 11px; font-weight: 700;">
                        ${trn.expertise}
                      </span>
                    </td>

                    <!-- Assigned Programs -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      ${t.assignedPrograms.length === 0 ? `
                        <span class="text-xs text-muted">No programs assigned</span>
                      ` : `
                        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                          ${t.assignedPrograms.map(p => `
                            <span class="badge badge-neutral" style="font-size: 10.5px; font-weight: 700;" title="${p.name} (${p.candidateIds ? p.candidateIds.length : 0} candidates)">
                              [${p.code}] ${p.candidateIds ? p.candidateIds.length : 0}c
                            </span>
                          `).join('')}
                        </div>
                      `}
                    </td>

                    <!-- Compliance -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 3px;">
                        <span class="badge ${t.complianceRate === 100 ? 'badge-stage' : (t.complianceRate > 0 ? 'badge-amber' : 'badge-danger')}" style="font-size: 11px; font-weight: 800; width: fit-content;">
                          ${t.complianceRate}% Compliance
                        </span>
                        <span style="font-size: 10.5px; color: #64748b;">
                          ${t.uniqueMenteesMetCount} of ${t.menteeCount} met (${t.totalMeetsLogged} meets)
                        </span>
                      </div>
                    </td>

                    <!-- Average Mentee Score -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 3px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <strong style="font-size: 14px; color: ${t.readiness.hasData ? rStatus.color : '#64748b'};">
                            ${t.readiness.hasData ? `${t.averageReadiness}%` : 'N/A'}
                          </strong>
                          <span class="badge ${rStatus.badgeClass}" style="font-size: 10px;">
                            ${t.readiness.hasData ? rStatus.label : 'Pending'}
                          </span>
                        </div>
                        <div class="progress-bar-bg" style="height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                          <div style="width: ${t.averageReadiness}%; height: 100%; background: ${t.readiness.hasData ? rStatus.color : '#cbd5e1'};"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Distribution -->
                    <td style="padding: 12px 14px; vertical-align: middle;">
                      <div style="display: flex; gap: 4px; font-size: 11px;">
                        <span class="badge badge-stage" style="padding: 2px 6px; font-size: 10px;" title="Stage Ready (80%+)">${t.distribution.readyCount} Ready</span>
                        <span class="badge badge-amber" style="padding: 2px 6px; font-size: 10px;" title="Needs Attention (<60%)">${t.distribution.needsAttentionCount} Lagging</span>
                      </div>
                    </td>

                    <!-- Action -->
                    <td style="padding: 12px 14px; vertical-align: middle; text-align: right;">
                      <button type="button" class="btn btn-sm btn-secondary" data-action="view-trn-profile" data-tid="${trn.id}" style="font-size: 11px; height: 30px; padding: 0 10px;">
                        Profile
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;

    const inpTrnSearch = contentWrapper.querySelector('#inpReportTrnSearch');
    if (inpTrnSearch) {
      inpTrnSearch.addEventListener('input', e => {
        searchQuery = e.target.value.trim();
        renderTrainerReportSection();
      });
    }

    contentWrapper.querySelectorAll('[data-action="view-trn-profile"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tid = btn.getAttribute('data-tid');
        const trn = state.getTrainerById(tid);
        if (trn) openTrainerProfileModal(trn);
      });
    });

    btnPrint.onclick = () => {
      printTrainerReportSheet(filtered);
    };

    btnExport.onclick = () => {
      excelService.exportTrainerPerformanceReport(filtered);
      toast.success(`Exported ${filtered.length} trainer reports to Excel.`);
    };
  }

  // -------------------------------------------------------------
  // PRINT HELPERS
  // -------------------------------------------------------------
  function printCandidateReportSheet(dossiers) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the candidate report.');
      return;
    }

    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DH BENGAL - Candidate Performance & Readiness Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; }
          .sub { font-size: 12px; color: #4338ca; font-weight: 700; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; font-size: 10.5px; text-transform: uppercase; font-weight: 800; color: #334155; }
          td { border: 1px solid #e2e8f0; padding: 7px 8px; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
          .badge-ready { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .badge-track { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .badge-attention { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
          .prog-tag { display: inline-block; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 5px; font-size: 10px; margin: 1px; font-weight: 600; }
          .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          @media print {
            body { margin: 10mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>DH BENGAL • SIBAQ TRAINING ACADEMY</h1>
            <div class="sub">Official Candidate Performance & Readiness Report</div>
          </div>
          <div style="text-align: right;">
            <div>Date: <strong>${todayFormatted}</strong></div>
            <div>Total Candidates: <strong>${dossiers.length}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px;">Chest</th>
              <th style="width: 140px;">Candidate Name</th>
              <th style="width: 75px;">Category</th>
              <th>Assigned Programs & Readiness</th>
              <th style="width: 85px;">Overall Readiness</th>
              <th style="width: 85px;">Meeting Rate</th>
              <th style="width: 95px;">Trajectory</th>
              <th>Latest Remark</th>
            </tr>
          </thead>
          <tbody>
            ${dossiers.map(d => {
              const statusClass = d.overallReadiness >= 80 ? 'badge-ready' : (d.overallReadiness >= 60 ? 'badge-track' : 'badge-attention');
              return `
                <tr>
                  <td><strong>#${d.candidate.chestNo || d.candidate.id}</strong></td>
                  <td><strong>${d.candidate.name}</strong></td>
                  <td>${d.candidate.category}</td>
                  <td>
                    ${d.programReports.map(pr => `
                      <span class="prog-tag">[${pr.program.code}] ${pr.isMet ? `${pr.latestScore}%` : 'Pending'}</span>
                    `).join(' ')}
                  </td>
                  <td>
                    <span class="badge ${statusClass}">
                      ${d.hasEvaluation ? `${d.overallReadiness}%` : 'N/A'} • ${d.overallStatus.label}
                    </span>
                  </td>
                  <td>
                    <strong>${d.meetingRateLabel}</strong>
                  </td>
                  <td>
                    ${d.momentumLabel}
                  </td>
                  <td style="font-size: 11px; color: #334155;">
                    ${d.latestRemark ? `"${d.latestRemark.text}" (${d.latestRemark.trainerName})` : '-'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Report generated via Sibaq Mentoring Hub</div>
          <div>Authorized Controller Verification: _______________________</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function printTrainerReportSheet(trainers) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print the trainer report.');
      return;
    }

    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DH BENGAL - Trainer Mentorship & Evaluation Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; font-size: 12px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; }
          .sub { font-size: 12px; color: #4338ca; font-weight: 700; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; font-size: 10.5px; text-transform: uppercase; font-weight: 800; color: #334155; }
          td { border: 1px solid #e2e8f0; padding: 7px 8px; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
          .badge-stage { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          @media print {
            body { margin: 10mm; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>DH BENGAL • SIBAQ TRAINING ACADEMY</h1>
            <div class="sub">Trainer Mentorship, Compliance & Evaluation Report</div>
          </div>
          <div style="text-align: right;">
            <div>Date: <strong>${todayFormatted}</strong></div>
            <div>Total Trainers: <strong>${trainers.length}</strong></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 140px;">Trainer Name</th>
              <th style="width: 120px;">Specialization</th>
              <th>Assigned Programs</th>
              <th style="width: 65px;">Mentees</th>
              <th style="width: 90px;">Compliance</th>
              <th style="width: 90px;">Avg Score</th>
              <th style="width: 110px;">Score Breakdown</th>
              <th style="width: 95px;">Last Active</th>
            </tr>
          </thead>
          <tbody>
            ${trainers.map(t => `
              <tr>
                <td><strong>${t.trainer.name}</strong></td>
                <td>${t.trainer.expertise}</td>
                <td>${t.assignedPrograms.map(p => `[${p.code}]`).join(', ') || 'None'}</td>
                <td><strong>${t.menteeCount}</strong></td>
                <td><strong>${t.complianceRate}%</strong> (${t.uniqueMenteesMetCount}/${t.menteeCount})</td>
                <td><strong>${t.readiness.hasData ? `${t.averageReadiness}%` : 'N/A'}</strong></td>
                <td>${t.distribution.readyCount} Ready / ${t.distribution.needsAttentionCount} Lagging</td>
                <td>${t.latestMeet ? t.latestMeet.date : 'No sessions'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Report generated via Sibaq Mentoring Hub</div>
          <div>Authorized Controller Verification: _______________________</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Render Initial View
  renderSubView();
}
