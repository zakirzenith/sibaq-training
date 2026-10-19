import { state, getProgressStatus } from '../services/state.js';
import { getIcon } from './icons.js';
import { openCandidateDossierModal } from './modals/candidateDossierModal.js';
import { openTrainerProfileModal } from './modals/trainerProfileModal.js';
import { openProgramQuickViewModal } from './modals/programQuickViewModal.js';
import { openTrainerAllProgramsModal, openTrainerMenteesBreakdownModal } from './modals/trainerReportsModals.js';
import { excelService } from '../services/excelService.js';
import { toast } from './toast.js';

function formatChestNo(cand) {
  if (cand.chestNo && cand.chestNo.trim()) return `#${cand.chestNo.trim()}`;
  const idStr = String(cand.id || '');
  if (idStr.includes('-')) {
    const parts = idStr.split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart && /^\d+$/.test(lastPart)) return `#${lastPart}`;
  }
  return `#C-${idStr.slice(-4).toUpperCase()}`;
}

/**
 * Harmonious, professional color styling for program readiness chips
 */
function getProgramChipStyle(pr) {
  if (!pr.isMet) {
    return {
      bg: '#f8fafc',
      border: '#e2e8f0',
      text: '#64748b',
      dot: '#94a3b8',
      scoreText: 'Pending'
    };
  }
  const score = pr.latestScore || 0;
  if (score >= 80) {
    return {
      bg: '#ecfdf5',
      border: '#a7f3d0',
      text: '#065f46',
      dot: '#10b981',
      scoreText: `${score}%`
    };
  } else if (score >= 60) {
    return {
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#1e40af',
      dot: '#3b82f6',
      scoreText: `${score}%`
    };
  } else {
    return {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#b45309',
      dot: '#f59e0b',
      scoreText: `${score}%`
    };
  }
}

/**
 * Enhanced Performance Reports & Dossiers View
 * Dual-tab central reports hub:
 * 1. Candidate Performance & Readiness Report with deep-dive dossier
 * 2. Trainer Mentorship & Evaluation Compliance Report
 * Complete with 1-click quick filter pills, expandable advanced filters,
 * compact uniform row heights, mobile cards, and high-fidelity printing.
 */
export function renderReportsView(container, navigateTo) {
  let activeTab = 'candidates'; // 'candidates' | 'trainers'
  let searchQuery = '';
  let quickFilter = 'ALL'; // 'ALL', 'READY', 'PREPARING', 'AT_RISK', 'FULLY_MET', 'PENDING'
  let filterCategory = 'ALL';
  let filterProgType = 'ALL';
  let filterReadiness = 'ALL';
  let filterMeetingRate = 'ALL';
  let filterMomentum = 'ALL';
  let filterProgramId = 'ALL';
  let filterTrainerId = 'ALL';
  let sortBy = 'chest-asc';
  let isAdvancedFiltersOpen = false;

  const allPrograms = state.getPrograms();
  const allTrainers = state.getTrainers();
  const categories = Array.from(new Set(state.getCandidates().map(c => c.category).filter(Boolean)));

  container.innerHTML = `
    <!-- Top View Header -->
    <div class="saas-view-header reports-view-header" style="margin-bottom: 16px;">
      <div class="svh-title-block">
        <h1 class="svh-title">Performance Reports & Dossiers</h1>
        <p class="svh-desc">
          Official candidate readiness tracking, multi-program meeting rates, trajectory momentum, and trainers' mentorship evaluation.
        </p>
      </div>

      <div class="saas-header-actions">
        <!-- Sub-section Tab Switcher -->
        <div class="reports-tab-capsule" style="display: flex; background: #f1f5f9; padding: 3px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <button type="button" class="reports-tab-btn active" id="tabBtnCandidates" style="display: flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 8px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; background: #ffffff; color: #4338ca; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.15s ease;">
            ${getIcon('award')} <span>Candidate Reports</span>
            <span id="tabBadgeCandidates" style="background: #e0e7ff; color: #4338ca; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 800;">${state.getCandidates().length}</span>
          </button>
          <button type="button" class="reports-tab-btn" id="tabBtnTrainers" style="display: flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 8px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; background: transparent; color: #64748b; transition: all 0.15s ease;">
            ${getIcon('trainers')} <span>Trainer Reports</span>
            <span id="tabBadgeTrainers" style="background: #e2e8f0; color: #64748b; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 800;">${state.getTrainers().length}</span>
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
  const tabBadgeCandidates = container.querySelector('#tabBadgeCandidates');
  const tabBadgeTrainers = container.querySelector('#tabBadgeTrainers');
  const btnPrint = container.querySelector('#btnPrintReportTable');
  const btnExport = container.querySelector('#btnExportReportExcel');

  const updateTabStyles = () => {
    if (activeTab === 'candidates') {
      tabBtnCandidates.style.background = '#ffffff';
      tabBtnCandidates.style.color = '#4338ca';
      tabBtnCandidates.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      if (tabBadgeCandidates) {
        tabBadgeCandidates.style.background = '#e0e7ff';
        tabBadgeCandidates.style.color = '#4338ca';
      }
      tabBtnTrainers.style.background = 'transparent';
      tabBtnTrainers.style.color = '#64748b';
      tabBtnTrainers.style.boxShadow = 'none';
      if (tabBadgeTrainers) {
        tabBadgeTrainers.style.background = '#e2e8f0';
        tabBadgeTrainers.style.color = '#64748b';
      }
    } else {
      tabBtnTrainers.style.background = '#ffffff';
      tabBtnTrainers.style.color = '#4338ca';
      tabBtnTrainers.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      if (tabBadgeTrainers) {
        tabBadgeTrainers.style.background = '#e0e7ff';
        tabBadgeTrainers.style.color = '#4338ca';
      }
      tabBtnCandidates.style.background = 'transparent';
      tabBtnCandidates.style.color = '#64748b';
      tabBtnCandidates.style.boxShadow = 'none';
      if (tabBadgeCandidates) {
        tabBadgeCandidates.style.background = '#e2e8f0';
        tabBadgeCandidates.style.color = '#64748b';
      }
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

    // Summary Counts for Quick Filter Pills
    const totalCount = allDossiers.length;
    const evaluatedDossiers = allDossiers.filter(d => d.hasEvaluation);
    const avgReadiness = evaluatedDossiers.length > 0
      ? Math.round(evaluatedDossiers.reduce((sum, d) => sum + d.overallReadiness, 0) / evaluatedDossiers.length)
      : 0;
    const avgStatus = getProgressStatus(avgReadiness);

    const readyCount = allDossiers.filter(d => d.hasEvaluation && d.overallReadiness >= 80).length;
    const preparingCount = allDossiers.filter(d => d.momentumKey === 'accelerating' || d.momentumKey === 'stage-ready').length;
    const atRiskCount = allDossiers.filter(
      d => d.momentumKey === 'at-risk' || d.momentumKey === 'stagnant' || d.momentumKey === 'not-started'
    ).length;
    const fullyMetCount = allDossiers.filter(d => d.totalPrograms > 0 && d.metProgramsCount === d.totalPrograms).length;
    const pendingCount = allDossiers.filter(d => d.metProgramsCount === 0).length;

    // Filter Logic
    let filtered = allDossiers.filter(d => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const cand = d.candidate;
        const matchesName = String(cand.name || '').toLowerCase().includes(q);
        const matchesChest = String(cand.chestNo || cand.id || '').toLowerCase().includes(q);
        const matchesPhone = String(cand.phone || '').includes(q);
        const matchesInst = String(cand.institution || '').toLowerCase().includes(q);
        if (!matchesName && !matchesChest && !matchesPhone && !matchesInst) return false;
      }

      // 2. 1-Click Quick Filter
      if (quickFilter === 'READY') {
        if (!d.hasEvaluation || d.overallReadiness < 80) return false;
      } else if (quickFilter === 'PREPARING') {
        if (d.momentumKey !== 'accelerating' && d.momentumKey !== 'stage-ready') return false;
      } else if (quickFilter === 'AT_RISK') {
        if (d.momentumKey !== 'at-risk' && d.momentumKey !== 'stagnant' && d.momentumKey !== 'not-started') return false;
      } else if (quickFilter === 'FULLY_MET') {
        if (d.totalPrograms === 0 || d.metProgramsCount !== d.totalPrograms) return false;
      } else if (quickFilter === 'PENDING') {
        if (d.metProgramsCount > 0) return false;
      }

      // 3. Category Filter
      if (filterCategory !== 'ALL' && d.candidate.category !== filterCategory) {
        return false;
      }

      // 4. Program Type (Stage / Non-Stage)
      if (filterProgType !== 'ALL') {
        const hasType = d.programs.some(p => p.type === filterProgType);
        if (!hasType) return false;
      }

      // 5. Readiness Status
      if (filterReadiness !== 'ALL') {
        if (filterReadiness === 'READY' && (!d.hasEvaluation || d.overallReadiness < 80)) return false;
        if (filterReadiness === 'ON_TRACK' && (!d.hasEvaluation || d.overallReadiness < 60 || d.overallReadiness >= 80)) return false;
        if (filterReadiness === 'ATTENTION' && (!d.hasEvaluation || d.overallReadiness >= 60)) return false;
        if (filterReadiness === 'NO_DATA' && d.hasEvaluation) return false;
      }

      // 6. Meeting Compliance
      if (filterMeetingRate !== 'ALL') {
        if (filterMeetingRate === 'FULLY_MET' && (d.totalPrograms === 0 || d.metProgramsCount !== d.totalPrograms)) return false;
        if (filterMeetingRate === 'PARTIAL' && (d.metProgramsCount === 0 || d.metProgramsCount >= d.totalPrograms)) return false;
        if (filterMeetingRate === 'ZERO' && d.metProgramsCount > 0) return false;
      }

      // 7. Preparation Momentum
      if (filterMomentum !== 'ALL' && d.momentumKey !== filterMomentum) {
        return false;
      }

      // 8. Specific Program
      if (filterProgramId !== 'ALL') {
        if (!d.programs.some(p => p.id === filterProgramId)) return false;
      }

      // 9. Specific Trainer
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

    const hasActiveDropdownFilters = filterCategory !== 'ALL' || filterProgType !== 'ALL' || filterReadiness !== 'ALL' ||
      filterMeetingRate !== 'ALL' || filterMomentum !== 'ALL' || filterProgramId !== 'ALL' || filterTrainerId !== 'ALL';

    contentWrapper.innerHTML = `
      <!-- Executive Summary KPI Row -->
      <div class="reports-stats-grid">
        
        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Total Candidates</span>
            <span class="rsc-icon-wrap" style="background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe;">${getIcon('candidates')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value">${totalCount}</span>
            <span class="badge badge-primary-subtle rsc-badge">${allPrograms.length} Total Programs</span>
          </div>
          <div class="rsc-footer">
            Enrolled across ${categories.length} competition divisions
          </div>
        </div>

        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Overall Readiness Avg</span>
            <span class="rsc-icon-wrap" style="background: #fef3c7; color: #d97706; border: 1px solid #fde68a;">${getIcon('award')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value" style="color: ${avgStatus.color};">${avgReadiness}%</span>
            <span class="badge ${avgStatus.badgeClass} rsc-badge">${avgStatus.label}</span>
          </div>
          <div class="rsc-footer">
            Evaluated across ${evaluatedDossiers.length} candidates
          </div>
        </div>

        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Fully Met Candidates</span>
            <span class="rsc-icon-wrap" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;">${getIcon('check')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value">${fullyMetCount}</span>
            <span class="badge badge-stage rsc-badge">${totalCount > 0 ? Math.round((fullyMetCount/totalCount)*100) : 0}% Complete</span>
          </div>
          <div class="rsc-footer">
            Checked in for all assigned programs
          </div>
        </div>

        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Follow-Up Required</span>
            <span class="rsc-icon-wrap" style="background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;">${getIcon('alertCircle')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value text-danger">${atRiskCount}</span>
            <span class="badge badge-danger rsc-badge">Needs Attention</span>
          </div>
          <div class="rsc-footer">
            Score &lt;55% or inactive &gt;7 days
          </div>
        </div>
      </div>

      <!-- Modern Quick Navigation & Search Command Bar -->
      <div class="reports-command-card">
        
        <!-- Search Row + Sorting + Advanced Toggle -->
        <div class="reports-command-row" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <div class="reports-search-box">
            <span class="search-icon">${getIcon('search')}</span>
            <input 
              type="text" 
              id="inpReportCandSearch" 
              class="search-input" 
              placeholder="Search by candidate name, chest no, phone, institution..." 
              value="${searchQuery}" 
            />
            ${searchQuery ? `<button type="button" id="btnClearCandSearch" class="search-clear-btn" title="Clear search">${getIcon('x')}</button>` : ''}
          </div>

          <div class="reports-command-actions" style="display: flex; align-items: center; gap: 8px;">
            <select id="selReportSort" class="form-input" style="height: 40px; font-size: 13px; padding: 0 12px; width: auto; font-weight: 600; border-radius: 10px;">
              <option value="chest-asc" ${sortBy === 'chest-asc' ? 'selected' : ''}>Sort: Chest No (Low → High)</option>
              <option value="chest-desc" ${sortBy === 'chest-desc' ? 'selected' : ''}>Sort: Chest No (High → Low)</option>
              <option value="readiness-desc" ${sortBy === 'readiness-desc' ? 'selected' : ''}>Sort: Readiness (Highest)</option>
              <option value="readiness-asc" ${sortBy === 'readiness-asc' ? 'selected' : ''}>Sort: Readiness (Lowest)</option>
              <option value="meets-desc" ${sortBy === 'meets-desc' ? 'selected' : ''}>Sort: Meeting Rate (Highest)</option>
              <option value="name-asc" ${sortBy === 'name-asc' ? 'selected' : ''}>Sort: Name (A → Z)</option>
            </select>

            <button type="button" id="btnToggleAdvancedFilters" class="btn ${isAdvancedFiltersOpen || hasActiveDropdownFilters ? 'btn-primary' : 'btn-outline'}" style="height: 40px; padding: 0 14px; font-size: 12.5px; font-weight: 700; gap: 6px; border-radius: 10px;">
              ${getIcon('filter')} <span>Filters</span> ${hasActiveDropdownFilters ? `<span style="background: rgba(255,255,255,0.3); border-radius: 999px; padding: 1px 6px; font-size: 10px;">Active</span>` : ''}
            </button>

            ${(searchQuery || quickFilter !== 'ALL' || hasActiveDropdownFilters) ? `
              <button type="button" id="btnResetCandFilters" class="btn btn-outline text-danger" style="height: 40px; padding: 0 12px; font-size: 12.5px; font-weight: 600; border-color: #fecaca; border-radius: 10px;" title="Reset all filters">
                ${getIcon('x')} <span>Clear</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 1-Click Quick Filter Pills -->
        <div class="reports-quick-pills">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; white-space: nowrap; margin-right: 2px;">
            Filter:
          </span>
          <button type="button" class="quick-pill-btn ${quickFilter === 'ALL' ? 'active' : ''}" data-qf="ALL">
            <span>All</span>
            <span class="qf-count">${totalCount}</span>
          </button>
          <button type="button" class="quick-pill-btn ${quickFilter === 'READY' ? 'active' : ''}" data-qf="READY">
            <span class="qf-dot" style="background: #10b981;"></span>
            <span>Stage Ready (80%+)</span>
            <span class="qf-count">${readyCount}</span>
          </button>
          <button type="button" class="quick-pill-btn ${quickFilter === 'PREPARING' ? 'active' : ''}" data-qf="PREPARING">
            <span class="qf-dot" style="background: #3b82f6;"></span>
            <span>Actively Preparing</span>
            <span class="qf-count">${preparingCount}</span>
          </button>
          <button type="button" class="quick-pill-btn ${quickFilter === 'AT_RISK' ? 'active' : ''}" data-qf="AT_RISK">
            <span class="qf-dot" style="background: #ef4444;"></span>
            <span>Follow-Up Needed</span>
            <span class="qf-count">${atRiskCount}</span>
          </button>
          <button type="button" class="quick-pill-btn ${quickFilter === 'FULLY_MET' ? 'active' : ''}" data-qf="FULLY_MET">
            <span style="display: inline-flex; align-items: center; width: 13px; height: 13px; color: #10b981;">${getIcon('check')}</span>
            <span>Fully Met (100%)</span>
            <span class="qf-count">${fullyMetCount}</span>
          </button>
          <button type="button" class="quick-pill-btn ${quickFilter === 'PENDING' ? 'active' : ''}" data-qf="PENDING">
            <span style="display: inline-flex; align-items: center; width: 13px; height: 13px; color: #f59e0b;">${getIcon('clock')}</span>
            <span>Pending Check-in</span>
            <span class="qf-count">${pendingCount}</span>
          </button>
        </div>

        <!-- Expandable Advanced Filters Drawer -->
        <div id="advancedFiltersDrawer" style="display: ${isAdvancedFiltersOpen ? 'grid' : 'none'}; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Category</label>
            <select id="selFilterCategory" class="form-input" style="height: 36px; font-size: 12px; padding: 0 8px; border-radius: 8px;">
              <option value="ALL">All Categories</option>
              ${categories.map(c => `<option value="${c}" ${filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Program Type</label>
            <select id="selFilterProgType" class="form-input" style="height: 36px; font-size: 12px; padding: 0 8px; border-radius: 8px;">
              <option value="ALL" ${filterProgType === 'ALL' ? 'selected' : ''}>Stage & Non-Stage</option>
              <option value="Stage" ${filterProgType === 'Stage' ? 'selected' : ''}>Stage Only</option>
              <option value="Non-Stage" ${filterProgType === 'Non-Stage' ? 'selected' : ''}>Non-Stage Only</option>
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Readiness Score</label>
            <select id="selFilterReadiness" class="form-input" style="height: 36px; font-size: 12px; padding: 0 8px; border-radius: 8px;">
              <option value="ALL" ${filterReadiness === 'ALL' ? 'selected' : ''}>All Readiness Levels</option>
              <option value="READY" ${filterReadiness === 'READY' ? 'selected' : ''}>Stage Ready (80%+)</option>
              <option value="ON_TRACK" ${filterReadiness === 'ON_TRACK' ? 'selected' : ''}>On Track (60–79%)</option>
              <option value="ATTENTION" ${filterReadiness === 'ATTENTION' ? 'selected' : ''}>Needs Attention (&lt;60%)</option>
              <option value="NO_DATA" ${filterReadiness === 'NO_DATA' ? 'selected' : ''}>Not Evaluated</option>
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Meeting Compliance</label>
            <select id="selFilterMeetingRate" class="form-input" style="height: 36px; font-size: 12px; padding: 0 8px; border-radius: 8px;">
              <option value="ALL" ${filterMeetingRate === 'ALL' ? 'selected' : ''}>All Meeting Rates</option>
              <option value="FULLY_MET" ${filterMeetingRate === 'FULLY_MET' ? 'selected' : ''}>100% Fully Met (All Progs)</option>
              <option value="PARTIAL" ${filterMeetingRate === 'PARTIAL' ? 'selected' : ''}>Partial Met (At least 1)</option>
              <option value="ZERO" ${filterMeetingRate === 'ZERO' ? 'selected' : ''}>0% No Meets (Pending)</option>
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Assigned Program</label>
            <select id="selFilterProgramId" class="form-input" style="height: 36px; font-size: 12px; padding: 0 8px; border-radius: 8px;">
              <option value="ALL">All Programs</option>
              ${allPrograms.map(p => `<option value="${p.id}" ${filterProgramId === p.id ? 'selected' : ''}>[${p.code}] ${p.name.slice(0, 20)}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="form-label text-xs" style="margin-bottom: 3px;">Assigned Mentor</label>
            <select id="selFilterTrainerId" class="form-input" style="height: 36px; font-size: 12px; padding: 0 8px; border-radius: 8px;">
              <option value="ALL">All Mentors</option>
              ${allTrainers.map(t => `<option value="${t.id}" ${filterTrainerId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select>
          </div>
        </div>

      </div>

      <!-- Results Count & Hint -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 2px;">
        <span class="text-xs font-semibold text-muted">
          Showing <strong>${filtered.length}</strong> of <strong>${totalCount}</strong> candidates
        </span>
        <span class="text-xs text-muted desktop-only-inline">
          Click on any candidate name or the <strong>Dossier</strong> button to inspect multi-session progress.
        </span>
      </div>

      <!-- Candidate Content: Empty State OR Desktop Table + Mobile Cards -->
      ${filtered.length === 0 ? `
        <div class="empty-state-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 48px 24px; text-align: center;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; margin-left: auto; margin-right: auto;">
            ${getIcon('search')}
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">No candidates match your filters</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0 auto 16px auto; max-width: 380px;">Try loosening your search terms or resetting filters to view all candidates.</p>
          <button type="button" id="btnResetEmptyFilters" class="btn btn-secondary btn-sm" style="font-weight: 700; height: 34px; padding: 0 16px;">
            Reset All Filters
          </button>
        </div>
      ` : `
        <!-- 1. Desktop Table View (>= 769px) -->
        <div class="desktop-table-view reports-table-container">
          <table class="saas-table reports-cand-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 860px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                <th style="padding: 11px 14px; width: 65px;">Chest</th>
                <th style="padding: 11px 14px; min-width: 180px;">Candidate</th>
                <th style="padding: 11px 14px; min-width: 220px;">Assigned Programs & Readiness</th>
                <th style="padding: 11px 14px; width: 140px;">Overall Readiness</th>
                <th style="padding: 11px 14px; width: 130px;">Meeting Rate</th>
                <th style="padding: 11px 14px; width: 145px;">Preparation Health</th>
                <th style="padding: 11px 14px; width: 120px; text-align: right;">Dossier</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(d => {
                const cand = d.candidate;
                const statusBadge = d.overallStatus;
                const cleanChest = formatChestNo(cand);
                const isMet = d.totalPrograms > 0 && d.metProgramsCount === d.totalPrograms;

                // Max 3 program chips to keep row uniform and compact
                const maxChips = 3;
                const visibleChips = d.programReports.slice(0, maxChips);
                const remainingChips = d.programReports.length - maxChips;

                return `
                  <tr class="report-candidate-tr" style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;">
                    
                    <!-- Clean Chest No -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <span class="badge badge-neutral" style="font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 6px;">
                        ${cleanChest}
                      </span>
                    </td>

                    <!-- Candidate Name & Meta -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column;">
                        <strong class="report-cand-name" style="font-size: 13.5px; color: #0f172a; cursor: pointer;" data-action="view-dossier" data-cid="${cand.id}" title="Click to view candidate performance dossier">
                          ${cand.name}
                        </strong>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                          <span class="badge badge-neutral" style="font-size: 9.5px; padding: 0 5px;">${cand.category}</span>
                          ${cand.phone ? `<span>• ${cand.phone}</span>` : ''}
                        </div>
                      </div>
                    </td>

                    <!-- Assigned Programs with individual readiness chips -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      ${d.programs.length === 0 ? `
                        <span class="text-xs text-muted">No programs assigned</span>
                      ` : `
                        <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; max-width: 290px;">
                          ${visibleChips.map(pr => {
                            const chipStyle = getProgramChipStyle(pr);
                            return `
                              <div class="prog-report-chip" data-action="view-program" data-pid="${pr.program.id}" data-cid="${cand.id}" style="display: inline-flex; align-items: center; gap: 4px; padding: 2.5px 7.5px; border-radius: 6px; font-size: 10.5px; font-weight: 700; background: ${chipStyle.bg}; border: 1px solid ${chipStyle.border}; color: ${chipStyle.text}; cursor: pointer; transition: all 0.15s ease;" title="${pr.program.name} | Readiness: ${chipStyle.scoreText} • Click to open program details & roster">
                                <span style="width: 5px; height: 5px; border-radius: 50%; background: ${chipStyle.dot}; flex-shrink: 0;"></span>
                                <span>[${pr.program.code}]</span>
                                <span>•</span>
                                <span style="font-weight: 800;">${chipStyle.scoreText}</span>
                              </div>
                            `;
                          }).join('')}
                          ${remainingChips > 0 ? `
                            <span class="badge badge-neutral" style="font-size: 10px; cursor: pointer; font-weight: 700; padding: 2.5px 6px;" data-action="view-dossier" data-cid="${cand.id}" title="Click to view all ${d.programs.length} programs in dossier">
                              +${remainingChips} more
                            </span>
                          ` : ''}
                        </div>
                      `}
                    </td>

                    <!-- Overall Readiness -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 3px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <strong style="font-size: 13.5px; color: ${d.hasEvaluation ? statusBadge.color : '#64748b'};">
                            ${d.hasEvaluation ? `${d.overallReadiness}%` : 'N/A'}
                          </strong>
                          <span class="badge ${statusBadge.badgeClass}" style="font-size: 9.5px; padding: 1px 6px;">
                            ${statusBadge.label}
                          </span>
                        </div>
                        <div class="progress-bar-bg" style="height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                          <div style="width: ${d.overallReadiness}%; height: 100%; background: ${d.hasEvaluation ? statusBadge.color : '#cbd5e1'};"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Meeting Rate & Segmented Bars -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 3px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span class="badge ${isMet ? 'badge-stage' : (d.metProgramsCount > 0 ? 'badge-amber' : 'badge-danger')}" style="font-size: 10.5px; font-weight: 800;">
                            ${d.meetingRateLabel}
                          </span>
                        </div>
                        <!-- Mini Segmented Rectangles -->
                        ${d.totalPrograms > 0 ? `
                          <div style="display: flex; gap: 2px; align-items: center; margin-top: 1px;">
                            ${d.programReports.map(pr => `
                              <span style="display: inline-block; width: 12px; height: 4px; border-radius: 1px; background: ${pr.isMet ? '#10b981' : '#fecaca'};" title="[${pr.program.code}]: ${pr.isMet ? 'Met' : 'Pending'}"></span>
                            `).join('')}
                          </div>
                        ` : ''}
                      </div>
                    </td>

                    <!-- Preparation Momentum / Health -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${d.momentumColor}; flex-shrink: 0;"></span>
                        <span class="badge ${d.momentumBadgeClass}" style="font-size: 10px; font-weight: 700;">
                          ${d.momentumLabel}
                        </span>
                      </div>
                      <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                        ${d.daysSinceLastMeet !== null ? (d.daysSinceLastMeet === 0 ? 'Active today' : `${d.daysSinceLastMeet}d ago`) : 'No check-ins'}
                      </div>
                    </td>

                    <!-- Actions -->
                    <td style="padding: 11px 14px; vertical-align: middle; text-align: right;">
                      <div style="display: inline-flex; align-items: center; gap: 5px;">
                        <button type="button" class="btn btn-sm btn-primary" data-action="view-dossier" data-cid="${cand.id}" style="font-size: 11px; height: 28px; padding: 0 9px; gap: 4px; font-weight: 700;" title="View candidate dossier">
                          ${getIcon('award')} <span>Dossier</span>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline desktop-only-btn" data-action="print-dossier" data-cid="${cand.id}" style="font-size: 11px; height: 28px; padding: 0 7px; border-color: #cbd5e1;" title="Print candidate dossier">
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

        <!-- 2. Mobile Touch Cards List (< 769px) -->
        <div class="mobile-cards-view">
          ${filtered.map(d => {
            const cand = d.candidate;
            const cleanChest = formatChestNo(cand);
            const statusBadge = d.overallStatus;
            const isMet = d.totalPrograms > 0 && d.metProgramsCount === d.totalPrograms;

            return `
              <div class="mobile-report-card">
                <div class="mrc-top">
                  <div class="mrc-cand-info">
                    <span class="badge badge-neutral" style="font-weight: 800; font-size: 11.5px; padding: 4px 8px; border-radius: 6px;">
                      ${cleanChest}
                    </span>
                    <div class="mrc-name-col">
                      <div class="mrc-name" data-action="view-dossier" data-cid="${cand.id}">
                        ${cand.name}
                      </div>
                      <div class="mrc-sub">
                        <span class="badge badge-neutral" style="font-size: 9.5px; padding: 1px 6px;">${cand.category}</span>
                        ${cand.phone ? `<span>• ${cand.phone}</span>` : ''}
                      </div>
                    </div>
                  </div>
                  <div style="text-align: right; flex-shrink: 0;">
                    <span class="badge ${statusBadge.badgeClass}" style="font-size: 10px; font-weight: 700;">
                      ${d.hasEvaluation ? `${d.overallReadiness}% ${statusBadge.label}` : 'Not Evaluated'}
                    </span>
                  </div>
                </div>

                <!-- Overall Readiness Progress Bar (Mobile) -->
                ${d.hasEvaluation ? `
                  <div style="display: flex; flex-direction: column; gap: 3px;">
                    <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #64748b;">
                      <span>Readiness Progress</span>
                      <span style="color: ${statusBadge.color};">${d.overallReadiness}%</span>
                    </div>
                    <div class="progress-bar-bg" style="height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden;">
                      <div style="width: ${d.overallReadiness}%; height: 100%; background: ${statusBadge.color}; border-radius: 999px;"></div>
                    </div>
                  </div>
                ` : ''}

                <div class="mrc-metrics-strip">
                  <div class="mrc-metric-item">
                    <span class="mrc-metric-label">Meeting Compliance</span>
                    <div class="mrc-metric-val">
                      <span style="color: ${isMet ? '#059669' : (d.metProgramsCount > 0 ? '#d97706' : '#dc2626')}; font-size: 12px;">
                        ${d.meetingRateLabel}
                      </span>
                      <div style="display: flex; gap: 2px; align-items: center; margin-left: 4px;">
                        ${d.programReports.map(pr => `
                          <span style="display: inline-block; width: 8px; height: 4px; border-radius: 1px; background: ${pr.isMet ? '#10b981' : '#fecaca'};"></span>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                  <div class="mrc-metric-item">
                    <span class="mrc-metric-label">Preparation Health</span>
                    <div class="mrc-metric-val">
                      <span style="width: 7px; height: 7px; border-radius: 50%; background: ${d.momentumColor}; flex-shrink: 0;"></span>
                      <span style="font-size: 11.5px;">${d.momentumLabel}</span>
                    </div>
                    <div style="font-size: 9.5px; color: #64748b;">
                      ${d.daysSinceLastMeet !== null ? (d.daysSinceLastMeet === 0 ? 'Active today' : `${d.daysSinceLastMeet}d ago`) : 'No check-ins'}
                    </div>
                  </div>
                </div>

                ${d.programs.length > 0 ? `
                  <div>
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 5px; letter-spacing: 0.03em;">
                      Assigned Programs (${d.programs.length})
                    </div>
                    <div class="mrc-programs-strip">
                      ${d.programReports.slice(0, 4).map(pr => {
                        const chipStyle = getProgramChipStyle(pr);
                        return `
                          <span class="prog-report-chip" data-action="view-program" data-pid="${pr.program.id}" data-cid="${cand.id}" style="font-size: 10.5px; font-weight: 700; padding: 2.5px 7.5px; border-radius: 6px; background: ${chipStyle.bg}; border: 1px solid ${chipStyle.border}; color: ${chipStyle.text}; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.15s ease;" title="${pr.program.name} | Readiness: ${chipStyle.scoreText} • Click to open program details">
                            <span style="width: 5px; height: 5px; border-radius: 50%; background: ${chipStyle.dot};"></span>
                            <span>[${pr.program.code}]</span>
                            <span>${chipStyle.scoreText}</span>
                          </span>
                        `;
                      }).join('')}
                      ${d.programReports.length > 4 ? `
                        <span class="badge badge-neutral" style="font-size: 10px; font-weight: 700; cursor: pointer;" data-action="view-dossier" data-cid="${cand.id}">
                          +${d.programReports.length - 4} more
                        </span>
                      ` : ''}
                    </div>
                  </div>
                ` : ''}

                <div style="display: flex; gap: 8px; margin-top: 2px;">
                  <button type="button" class="btn btn-primary mrc-action-btn" data-action="view-dossier" data-cid="${cand.id}">
                    ${getIcon('award')} <span>View Performance Dossier</span>
                  </button>
                  <button type="button" class="btn btn-outline" data-action="print-dossier" data-cid="${cand.id}" style="width: 42px; height: 38px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 9px; border-color: #cbd5e1;" title="Print Dossier">
                    ${getIcon('printer')}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
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

    const btnClearSearch = contentWrapper.querySelector('#btnClearCandSearch');
    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        searchQuery = '';
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

    // Quick Filter Buttons
    contentWrapper.querySelectorAll('.quick-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        quickFilter = btn.getAttribute('data-qf');
        renderCandidateReportSection();
      });
    });

    // Toggle Advanced Filters
    const btnAdvToggle = contentWrapper.querySelector('#btnToggleAdvancedFilters');
    if (btnAdvToggle) {
      btnAdvToggle.addEventListener('click', () => {
        isAdvancedFiltersOpen = !isAdvancedFiltersOpen;
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
      quickFilter = 'ALL';
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

    // Wire Program Quick View Modal from program chips
    contentWrapper.querySelectorAll('[data-action="view-program"]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const pid = el.getAttribute('data-pid');
        const cid = el.getAttribute('data-cid');
        if (pid) openProgramQuickViewModal(pid, cid);
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
      <div class="reports-stats-grid">
        
        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Specialized Mentors</span>
            <span class="rsc-icon-wrap" style="background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe;">${getIcon('trainers')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value">${totalTrainers}</span>
            <span class="badge badge-neutral rsc-badge">Active Faculty</span>
          </div>
          <div class="rsc-footer">
            Evaluating stage & non-stage categories
          </div>
        </div>

        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Average Mentee Score</span>
            <span class="rsc-icon-wrap" style="background: #fef3c7; color: #d97706; border: 1px solid #fde68a;">${getIcon('award')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value" style="color: ${avgStatus.color};">${avgMenteeReadiness}%</span>
            <span class="badge ${avgStatus.badgeClass} rsc-badge">${avgStatus.label}</span>
          </div>
          <div class="rsc-footer">
            Average across all mentored candidates
          </div>
        </div>

        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Mentee Assignments</span>
            <span class="rsc-icon-wrap" style="background: #ecfeff; color: #0891b2; border: 1px solid #a5f3fc;">${getIcon('users')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value">${totalMentorshipPairs}</span>
            <span class="badge badge-primary-subtle rsc-badge">Candidate Slots</span>
          </div>
          <div class="rsc-footer">
            Across all assigned programs
          </div>
        </div>

        <div class="report-stat-card">
          <div class="rsc-top">
            <span class="rsc-label">Meeting Compliance</span>
            <span class="rsc-icon-wrap" style="background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;">${getIcon('check')}</span>
          </div>
          <div class="rsc-main">
            <span class="rsc-value">${avgCompliance}%</span>
            <span class="badge ${avgCompliance >= 80 ? 'badge-stage' : (avgCompliance >= 50 ? 'badge-amber' : 'badge-danger')} rsc-badge">
              Evaluation Rate
            </span>
          </div>
          <div class="rsc-footer">
            Percentage of assigned mentees met
          </div>
        </div>
      </div>

      <!-- Search Toolbar -->
      <div class="reports-command-card" style="margin-bottom: 14px;">
        <div class="reports-command-row" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <div class="reports-search-box">
            <span class="search-icon">${getIcon('search')}</span>
            <input 
              type="text" 
              id="inpReportTrnSearch" 
              class="search-input" 
              placeholder="Search trainer by name, expertise, domain..." 
              value="${searchQuery}" 
            />
            ${searchQuery ? `<button type="button" id="btnClearTrnSearch" class="search-clear-btn" title="Clear search">${getIcon('x')}</button>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 12.5px; font-weight: 600; color: #64748b; white-space: nowrap;">
            <span>Showing <strong>${filtered.length}</strong> of <strong>${totalTrainers}</strong> trainers</span>
            ${searchQuery ? `
              <button type="button" id="btnResetTrnFilters" class="btn btn-outline text-danger btn-sm" style="height: 36px; padding: 0 12px; border-color: #fecaca; border-radius: 8px;" title="Reset search">
                ${getIcon('x')} <span>Clear</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Trainers Performance: Empty State OR Desktop Table + Mobile Cards -->
      ${filtered.length === 0 ? `
        <div class="empty-state-card" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 48px 24px; text-align: center;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: #f1f5f9; color: #64748b; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; margin-left: auto; margin-right: auto;">
            ${getIcon('search')}
          </div>
          <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0;">No trainers match your search</h3>
          <p style="font-size: 13px; color: #64748b; margin: 0 auto 16px auto; max-width: 380px;">Try searching with a different name or faculty specialization.</p>
        </div>
      ` : `
        <!-- 1. Desktop Table View (>= 769px) -->
        <div class="desktop-table-view reports-table-container">
          <table class="saas-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 860px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                <th style="padding: 11px 14px; width: 220px;">Trainer & Mentor</th>
                <th style="padding: 11px 14px; width: 140px;">Specialization</th>
                <th style="padding: 11px 14px; min-width: 200px;">Assigned Programs</th>
                <th style="padding: 11px 14px; width: 150px;">Meeting Compliance</th>
                <th style="padding: 11px 14px; width: 140px;">Avg Mentee Readiness</th>
                <th style="padding: 11px 14px; width: 140px;">Score Breakdown</th>
                <th style="padding: 11px 14px; width: 100px; text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(t => {
                const trn = t.trainer;
                const rStatus = getProgressStatus(t.averageReadiness);

                // Max 4 programs shown as badges, rest shown as +X more to prevent row stretching!
                const maxProgs = 4;
                const visibleProgs = t.assignedPrograms.slice(0, maxProgs);
                const remainingProgs = t.assignedPrograms.length - maxProgs;

                return `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <!-- Trainer Avatar & Name -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="trainer-avatar-mini" style="background: ${trn.color || '#6366f1'}; overflow: hidden; width: 38px; height: 38px; border-radius: 10px;">
                          ${trn.photo ? `<img src="${trn.photo}" alt="${trn.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : trn.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <strong style="font-size: 13.5px; color: #0f172a; cursor: pointer;" data-action="view-trn-profile" data-tid="${trn.id}" title="Click to view trainer profile">
                            ${trn.name}
                          </strong>
                          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            ${trn.phone ? `${trn.phone} • ` : ''}${t.menteeCount} Mentees
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Expertise -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <span class="badge badge-primary-subtle" style="font-size: 11px; font-weight: 700;">
                        ${trn.expertise}
                      </span>
                    </td>

                    <!-- Assigned Programs (compact uniform wrap) -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      ${t.assignedPrograms.length === 0 ? `
                        <span class="text-xs text-muted">No programs assigned</span>
                      ` : `
                        <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; max-width: 250px;">
                          ${visibleProgs.map(p => `
                            <span class="badge badge-neutral prog-report-chip" data-action="view-program" data-pid="${p.id}" style="font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;" title="${p.name} (${p.candidateIds ? p.candidateIds.length : 0} candidates) • Click to view program details & roster">
                              [${p.code}] ${p.candidateIds ? p.candidateIds.length : 0} cand
                            </span>
                          `).join('')}
                          ${remainingProgs > 0 ? `
                            <span class="badge badge-primary-subtle" style="font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;" data-action="view-trainer-all-progs" data-tid="${trn.id}" title="Click to view all ${t.assignedPrograms.length} assigned programs">
                              +${remainingProgs} more
                            </span>
                          ` : ''}
                        </div>
                      `}
                    </td>

                    <!-- Meeting Compliance with mini progress bar -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 3px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <span class="badge ${t.complianceRate === 100 ? 'badge-stage' : (t.complianceRate > 0 ? 'badge-amber' : 'badge-danger')}" style="font-size: 10.5px; font-weight: 800;">
                            ${t.complianceRate}% Compliance
                          </span>
                        </div>
                        <div class="progress-bar-bg" style="height: 4px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-top: 2px;">
                          <div style="width: ${t.complianceRate}%; height: 100%; background: ${t.complianceRate >= 80 ? '#10b981' : (t.complianceRate > 0 ? '#f59e0b' : '#ef4444')};"></div>
                        </div>
                        <span style="font-size: 10.5px; color: #64748b;">
                          ${t.uniqueMenteesMetCount} of ${t.menteeCount} met (${t.totalMeetsLogged} meets)
                        </span>
                      </div>
                    </td>

                    <!-- Average Mentee Score -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 3px;">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                          <strong style="font-size: 13.5px; color: ${t.readiness.hasData ? rStatus.color : '#64748b'};">
                            ${t.readiness.hasData ? `${t.averageReadiness}%` : 'N/A'}
                          </strong>
                          <span class="badge ${rStatus.badgeClass}" style="font-size: 9.5px; padding: 1px 6px;">
                            ${t.readiness.hasData ? rStatus.label : 'Pending'}
                          </span>
                        </div>
                        <div class="progress-bar-bg" style="height: 4px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin-top: 2px;">
                          <div style="width: ${t.averageReadiness}%; height: 100%; background: ${t.readiness.hasData ? rStatus.color : '#cbd5e1'};"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Score Distribution (Clickable breakdown pills) -->
                    <td style="padding: 11px 14px; vertical-align: middle;">
                      <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10.5px;">
                        <span class="badge badge-stage" style="padding: 2.5px 7px; font-size: 10px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: space-between; gap: 6px; transition: transform 0.1s ease;" data-action="view-trainer-mentees" data-tid="${trn.id}" data-type="READY" title="Click to view all ready candidates (&ge;80%)">
                          <span>${t.distribution.readyCount} Ready</span>
                          <span style="font-size: 9px; opacity: 0.85;">&rarr;</span>
                        </span>
                        <span class="badge badge-amber" style="padding: 2.5px 7px; font-size: 10px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; justify-content: space-between; gap: 6px; transition: transform 0.1s ease;" data-action="view-trainer-mentees" data-tid="${trn.id}" data-type="LAGGING" title="Click to view all lagging candidates (&lt;60%)">
                          <span>${t.distribution.needsAttentionCount} Lagging</span>
                          <span style="font-size: 9px; opacity: 0.85;">&rarr;</span>
                        </span>
                      </div>
                    </td>

                    <!-- Action -->
                    <td style="padding: 11px 14px; vertical-align: middle; text-align: right;">
                      <button type="button" class="btn btn-sm btn-secondary" data-action="view-trn-profile" data-tid="${trn.id}" style="font-size: 11px; height: 28px; padding: 0 10px;">
                        Profile
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- 2. Mobile Touch Cards List (< 769px) -->
        <div class="mobile-cards-view">
          ${filtered.map(t => {
            const trn = t.trainer;
            const rStatus = getProgressStatus(t.averageReadiness);

            return `
              <div class="mobile-report-card">
                <div class="mrc-top">
                  <div class="mrc-cand-info">
                    <div class="trainer-avatar-mini" style="background: ${trn.color || '#6366f1'}; overflow: hidden; width: 40px; height: 40px; border-radius: 10px; font-size: 13px;">
                      ${trn.photo ? `<img src="${trn.photo}" alt="${trn.name}" style="width: 100%; height: 100%; object-fit: cover;" />` : trn.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div class="mrc-name-col">
                      <div class="mrc-name" data-action="view-trn-profile" data-tid="${trn.id}">
                        ${trn.name}
                      </div>
                      <div class="mrc-sub">
                        <span class="badge badge-primary-subtle" style="font-size: 9.5px; padding: 1px 6px;">${trn.expertise}</span>
                      </div>
                    </div>
                  </div>
                  <div style="text-align: right; flex-shrink: 0;">
                    <span class="badge ${t.complianceRate >= 80 ? 'badge-stage' : (t.complianceRate > 0 ? 'badge-amber' : 'badge-danger')}" style="font-size: 10px; font-weight: 800;">
                      ${t.complianceRate}% Compliance
                    </span>
                  </div>
                </div>

                <div class="mrc-metrics-strip">
                  <div class="mrc-metric-item">
                    <span class="mrc-metric-label">Mentees Evaluated</span>
                    <div class="mrc-metric-val">
                      <span>${t.uniqueMenteesMetCount} of ${t.menteeCount} met</span>
                    </div>
                    <div style="font-size: 10px; color: #64748b;">${t.totalMeetsLogged} total check-ins</div>
                  </div>
                  <div class="mrc-metric-item">
                    <span class="mrc-metric-label">Average Mentee Score</span>
                    <div class="mrc-metric-val">
                      <span style="color: ${t.readiness.hasData ? rStatus.color : '#64748b'};">${t.readiness.hasData ? `${t.averageReadiness}%` : 'N/A'}</span>
                      <span class="badge ${rStatus.badgeClass}" style="font-size: 9.5px;">${t.readiness.hasData ? rStatus.label : 'Pending'}</span>
                    </div>
                  </div>
                </div>

                <!-- Score Breakdown Mobile Pills -->
                <div style="display: flex; gap: 6px; align-items: center; margin-top: 6px;">
                  <span class="badge badge-stage" style="padding: 4px 8px; font-size: 10.5px; font-weight: 700; cursor: pointer; flex: 1; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 4px;" data-action="view-trainer-mentees" data-tid="${trn.id}" data-type="READY" title="Click to view ready mentees (&ge;80%)">
                    <span>${t.distribution.readyCount} Ready</span>
                    <span style="font-size: 9px;">&rarr;</span>
                  </span>
                  <span class="badge badge-amber" style="padding: 4px 8px; font-size: 10.5px; font-weight: 700; cursor: pointer; flex: 1; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 4px;" data-action="view-trainer-mentees" data-tid="${trn.id}" data-type="LAGGING" title="Click to view lagging mentees (&lt;60%)">
                    <span>${t.distribution.needsAttentionCount} Lagging</span>
                    <span style="font-size: 9px;">&rarr;</span>
                  </span>
                </div>

                ${t.assignedPrograms.length > 0 ? `
                  <div style="margin-top: 6px;">
                    <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">
                      Assigned Programs (${t.assignedPrograms.length})
                    </div>
                    <div class="mrc-programs-strip">
                      ${t.assignedPrograms.slice(0, 4).map(p => `
                        <span class="badge badge-neutral prog-report-chip" data-action="view-program" data-pid="${p.id}" style="font-size: 10.5px; font-weight: 700; cursor: pointer;" title="Click to view program details & roster">
                          [${p.code}] ${p.candidateIds ? p.candidateIds.length : 0} cand
                        </span>
                      `).join('')}
                      ${t.assignedPrograms.length > 4 ? `
                        <span class="badge badge-primary-subtle" style="font-size: 10px; font-weight: 700; cursor: pointer;" data-action="view-trainer-all-progs" data-tid="${trn.id}" title="Click to view all ${t.assignedPrograms.length} assigned programs">
                          +${t.assignedPrograms.length - 4} more
                        </span>
                      ` : ''}
                    </div>
                  </div>
                ` : ''}

                <button type="button" class="btn btn-secondary mrc-action-btn" data-action="view-trn-profile" data-tid="${trn.id}">
                  <span>View Trainer Profile & Mentorship Roster</span>
                  <span>&rarr;</span>
                </button>
              </div>
            `;
          }).join('')}
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

    const btnClearTrnSearch = contentWrapper.querySelector('#btnClearTrnSearch');
    if (btnClearTrnSearch) {
      btnClearTrnSearch.addEventListener('click', () => {
        searchQuery = '';
        renderTrainerReportSection();
      });
    }

    const btnResetTrn = contentWrapper.querySelector('#btnResetTrnFilters');
    if (btnResetTrn) {
      btnResetTrn.addEventListener('click', () => {
        searchQuery = '';
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

    // Wire Program Quick View Modal from trainer report program chips
    contentWrapper.querySelectorAll('[data-action="view-program"]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const pid = el.getAttribute('data-pid');
        if (pid) openProgramQuickViewModal(pid);
      });
    });

    // Wire All Programs Modal from "+X more" chips
    contentWrapper.querySelectorAll('[data-action="view-trainer-all-progs"]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const tid = el.getAttribute('data-tid');
        const reportData = allTrainerReports.find(x => x.trainer.id === tid);
        if (reportData) {
          openTrainerAllProgramsModal({
            trainer: reportData.trainer,
            assignedPrograms: reportData.assignedPrograms
          });
        }
      });
    });

    // Wire Mentees Breakdown Modal from "0 Ready" and "2 Lagging" badges
    contentWrapper.querySelectorAll('[data-action="view-trainer-mentees"]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const tid = el.getAttribute('data-tid');
        const filterType = el.getAttribute('data-type'); // 'READY' or 'LAGGING'
        const reportData = allTrainerReports.find(x => x.trainer.id === tid);
        if (reportData) {
          const candidates = filterType === 'READY'
            ? (reportData.distribution.readyCandidates || [])
            : (reportData.distribution.needsAttentionCandidates || []);
          openTrainerMenteesBreakdownModal({
            trainer: reportData.trainer,
            filterType,
            candidates,
            totalMentees: reportData.menteeCount
          });
        }
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
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; font-size: 11.5px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
          h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; }
          .sub { font-size: 12px; color: #4338ca; font-weight: 700; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #334155; }
          td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 9.5px; font-weight: 700; }
          .badge-ready { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .badge-track { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
          .badge-attention { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
          .prog-tag { display: inline-block; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 3px; padding: 1px 4px; font-size: 9.5px; margin: 1px; font-weight: 600; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          @media print {
            body { margin: 8mm; }
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
              const cleanChest = formatChestNo(d.candidate);
              return `
                <tr>
                  <td><strong>${cleanChest}</strong></td>
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
                  <td style="font-size: 10.5px; color: #334155;">
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
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; font-size: 11.5px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
          h1 { margin: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; }
          .sub { font-size: 12px; color: #4338ca; font-weight: 700; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 800; color: #334155; }
          td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 9.5px; font-weight: 700; }
          .badge-stage { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          @media print {
            body { margin: 8mm; }
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
