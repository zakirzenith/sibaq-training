import * as XLSX from 'xlsx';
import { normalizeCategory } from './state.js';

/**
 * Excel Parsing and Export Service for MentorFlow Controller
 * Handles bulk parsing for Candidates and Programs, template generation, and export.
 */

// Helper to normalize header keys
function cleanKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Helper to intelligently classify Stage vs Non-Stage
export function inferProgramType(rawType = '', code = '', name = '') {
  const cleanVal = String(rawType || '').trim().toLowerCase();

  // 1. Explicit cell value matched (Priority #1)
  if (
    cleanVal.includes('non') ||
    cleanVal.includes('off') ||
    ['ns', 'nn', 'no', 'false', '0', 'off-stage', 'off stage', 'non stage', 'non-stage'].includes(cleanVal)
  ) {
    return 'Non-Stage';
  }
  if (
    cleanVal.includes('stage') ||
    ['stage', 'on stage', 'on-stage', 'onstage', 's', 'yes', 'true', '1', 'stg'].includes(cleanVal)
  ) {
    return 'Stage';
  }

  // 2. Sibaq Code Prefix Heuristic
  const c = String(code || '').trim().toUpperCase();
  // Bidaya Stage: BS, BST; Ula Stage: US, UST; Thanawiyyah Stage: TS, TST; Aliyah Stage: AS, AST
  if (/^(BS|BST|UST|US|TST|TS|AST|AS)\d+/i.test(c) || c.includes('STG') || c.includes('STAGE') || c.includes('ONSTAGE')) {
    return 'Stage';
  }
  // Bidaya Non-Stage: BNN; Ula Non-Stage: UNN; Thanawiyyah Non-Stage: TNN; Aliyah Non-Stage: ANN
  if (/^(BNN|UNN|TNN|ANN|NST)\d+/i.test(c) || c.includes('NON') || c.includes('OFF')) {
    return 'Non-Stage';
  }

  // 3. Program Title / Name Heuristics (Expanded for Sibaq Arts & Islamic competitions)
  const n = String(name || '').trim().toLowerCase();
  const stageKeywords = [
    'speech', 'elocution', 'debate', 'qira', 'qirat', 'qur\'an', 'quran', 'hifz', 'hifdh',
    'nasheed', 'song', 'duff', 'quiz', 'extempore', 'public address', 'mono act', 'mime',
    'choral', 'ghazal', 'gazal', 'recitation', 'anchor', 'anchoring', 'mushaira', 'drama',
    'skit', 'talk', 'presentation', 'story telling', 'story-telling', 'vocal', 'anthem',
    'adhan', 'azan', 'kadhaprasangam', 'mappilappattu', 'mappila pattu', 'arabana', 'burdah',
    'mouleed', 'madh geetham', 'thilawath', 'thilawat', 'tarteel', 'haddad', 'lecture',
    'announcement', 'reading', 'reciting'
  ];
  if (stageKeywords.some(kw => n.includes(kw))) {
    return 'Stage';
  }

  const nonStageKeywords = [
    'writing', 'essay', 'story writing', 'paragraph', 'diary', 'drawing', 'pencil', 'painting',
    'calligraphy', 'poster', 'versification', 'translation', 'review', 'caption', 'water color',
    'watercolour', 'embroidery', 'origami', 'collage', 'scrap book', 'caption writing',
    'calligraphic', 'doodle', 'cartoon', 'illustration'
  ];
  if (nonStageKeywords.some(kw => n.includes(kw))) {
    return 'Non-Stage';
  }

  // Default fallback
  return cleanVal.includes('stage') ? 'Stage' : 'Non-Stage';
}

export const excelService = {
  /**
   * Parse Candidates Excel/CSV File
   * Accepts File object and returns parsed & validated rows
   */
  async parseCandidatesFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded spreadsheet appears to be empty.');
    }

    const parsedList = rawRows.map((row, index) => {
      let adNo = '';
      let name = '';
      let category = 'General';
      let studentClass = '';
      let programsStr = '';

      // Match columns dynamically
      for (const [key, val] of Object.entries(row)) {
        const cleaned = cleanKey(key);
        const strVal = String(val).trim();

        if (['adno', 'admissionno', 'admno', 'rollno', 'roll', 'admissionnumber', 'regno', 'id', 'ad'].includes(cleaned)) {
          adNo = strVal;
        } else if (['name', 'candidatename', 'studentname', 'fullname'].includes(cleaned)) {
          name = strVal;
        } else if (['category', 'cat', 'group', 'division'].includes(cleaned)) {
          category = strVal || 'General';
        } else if (['class', 'grade', 'standard', 'sec', 'section', 'std'].includes(cleaned)) {
          studentClass = strVal;
        } else if (['programs', 'program', 'assignedprograms', 'item', 'items', 'event', 'events', 'code', 'codes', 'enrolledprograms'].includes(cleaned)) {
          programsStr = strVal;
        }
      }

      // Fallback: If headers didn't match, check by position if row has array keys
      if (!adNo && !name) {
        const values = Object.values(row);
        if (values.length >= 2) {
          adNo = String(values[0] || '').trim();
          name = String(values[1] || '').trim();
          if (values[2]) category = String(values[2]).trim();
          if (values[3]) studentClass = String(values[3]).trim();
          if (values[4]) programsStr = String(values[4]).trim();
        }
      }

      const isValid = Boolean(adNo && name);
      const errors = [];
      if (!adNo) errors.push('Missing Admission No');
      if (!name) errors.push('Missing Candidate Name');

      const programCodes = programsStr
        ? programsStr.split(/[,;|\n]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
        : [];

      return {
        rowNumber: index + 2, // 1-indexed row in Excel
        adNo,
        name,
        category: normalizeCategory(category || 'BIDĀYA'),
        class: studentClass,
        programCodes,
        isValid,
        error: errors.join(', ')
      };
    });

    return parsedList;
  },

  /**
   * Parse Programs Excel/CSV File
   */
  async parseProgramsFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Intelligently scan first 10 rows to detect the true header row
    const rawMatrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    let headerRowIdx = 0;
    if (rawMatrix && rawMatrix.length > 0) {
      for (let r = 0; r < Math.min(rawMatrix.length, 10); r++) {
        const rowArr = rawMatrix[r] || [];
        const joined = rowArr.map(c => cleanKey(c)).join(' ');
        if (
          (joined.includes('code') || joined.includes('item') || joined.includes('prog') || joined.includes('slno')) &&
          (joined.includes('name') || joined.includes('title') || joined.includes('stage') || joined.includes('cat'))
        ) {
          headerRowIdx = r;
          break;
        }
      }
    }

    const rawRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIdx, defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded spreadsheet appears to be empty.');
    }

    const allowedStageHeaders = [
      'type', 'programtype', 'stageornonstage', 'stagenonstage', 'stageornonstageitem',
      'stage', 'stagetype', 'itemtype', 'eventtype', 'nature', 'venue', 'mode',
      'stageoffstage', 'stageoroffstage', 'stageitem', 'isstage', 'stagecategory',
      'type(stageornonstage)', 'typestageornonstage', 'typestagenonstage', 'format',
      'itemnature', 'eventnature', 'programmode', 'eventmode'
    ];

    const parsedList = rawRows.map((row, index) => {
      let code = '';
      let name = '';
      let category = 'General';
      let rawType = '';

      // Match columns dynamically
      for (const [key, val] of Object.entries(row)) {
        const cleaned = cleanKey(key);
        const strVal = String(val).trim();

        if (['code', 'programcode', 'prgcode', 'progcode', 'itemcode', 'eventcode', 'id', 'slno', 'itemno'].includes(cleaned)) {
          if (!code && strVal) code = strVal.toUpperCase();
        } else if (['programname', 'programprogramname', 'name', 'program', 'event', 'title', 'eventname', 'itemname'].includes(cleaned)) {
          if (!name && strVal) name = strVal;
        } else if (['category', 'cat', 'group', 'division', 'section'].includes(cleaned)) {
          if (strVal) category = strVal;
        } else if (
          (allowedStageHeaders.includes(cleaned) ||
            cleaned.endsWith('stage') ||
            cleaned.includes('stagenonstage') ||
            cleaned.includes('stageor') ||
            cleaned.includes('offstage')) &&
          strVal
        ) {
          // Only assign if strVal is not empty so subsequent empty columns don't wipe it out!
          rawType = strVal;
        }
      }

      // Check all cell values in row if rawType not identified yet or if it was ambiguous
      if (!rawType) {
        for (const val of Object.values(row)) {
          const s = String(val).trim().toLowerCase();
          if (['stage', 'on stage', 'on-stage', 'onstage', 'stage item', 'stage program'].includes(s)) {
            rawType = 'Stage';
            break;
          }
          if (['non-stage', 'non stage', 'off-stage', 'off stage', 'nonstage', 'non-stage item', 'offstage'].includes(s)) {
            rawType = 'Non-Stage';
            break;
          }
        }
      }

      // Fallback by index if row keys were unusual
      if (!code && !name) {
        const values = Object.values(row).map(v => String(v || '').trim());
        if (values.length >= 2) {
          code = (values[0] || '').toUpperCase();
          name = values[1] || '';
          if (values[2]) category = values[2];
          if (values[3] && !rawType) rawType = values[3];
          if (values[4] && !rawType) rawType = values[4];
        }
      }

      // Intelligently infer Stage vs Non-Stage
      const normalizedType = inferProgramType(rawType, code, name);

      const isValid = Boolean(code && name);
      const errors = [];
      if (!code) errors.push('Missing Program Code');
      if (!name) errors.push('Missing Program Name');

      return {
        rowNumber: headerRowIdx + index + 2,
        code,
        name,
        category: normalizeCategory(category || 'BIDĀYA'),
        type: normalizedType,
        isValid,
        error: errors.join(', ')
      };
    });

    return parsedList;
  },

  /**
   * Parse Trainers Excel/CSV File
   * Accepts File object and returns parsed & validated rows
   */
  async parseTrainersFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded spreadsheet appears to be empty.');
    }

    const parsedList = rawRows.map((row, index) => {
      let name = '';
      let expertise = 'General Mentor';
      let experience = '3+ Years';

      for (const [key, val] of Object.entries(row)) {
        const cleaned = cleanKey(key);
        const strVal = String(val).trim();

        if (['name', 'trainername', 'fullname', 'mentor', 'trainer', 'mentorname'].includes(cleaned)) {
          name = strVal;
        } else if (['expertise', 'department', 'subject', 'specialization', 'field', 'role', 'domain', 'skill'].includes(cleaned)) {
          expertise = strVal || 'General Mentor';
        } else if (['experience', 'exp', 'years', 'duration', 'trackrecord'].includes(cleaned)) {
          experience = strVal || '3+ Years';
        }
      }

      if (!name) {
        const values = Object.values(row);
        if (values.length >= 1) {
          name = String(values[0] || '').trim();
          if (values[1]) expertise = String(values[1]).trim();
          if (values[2]) experience = String(values[2]).trim();
        }
      }

      const isValid = Boolean(name);
      const errors = [];
      if (!name) errors.push('Missing Trainer Name');

      return {
        rowNumber: index + 2,
        name,
        expertise: expertise || 'General Mentor',
        experience: experience || '3+ Years',
        isValid,
        error: errors.join(', ')
      };
    });

    return parsedList;
  },

  /**
   * Generate & Download Candidates Sample Excel Template
   */
  downloadCandidatesTemplate() {
    const sampleData = [
      {
        'Admission No': '1081',
        'Candidate Name': 'Golam Ahmad SK',
        'Category': 'BIDĀYA',
        'Class': '1'
      },
      {
        'Admission No': '1082',
        'Candidate Name': 'Tohid Reza Mondal',
        'Category': 'BIDĀYA',
        'Class': '2'
      },
      {
        'Admission No': '1083',
        'Candidate Name': 'Muslim Reza',
        'Category': 'ŪLĀ',
        'Class': '3'
      },
      {
        'Admission No': '1084',
        'Candidate Name': 'Amanullah Khan',
        'Category': 'THĀNAWIYYAH',
        'Class': '5'
      },
      {
        'Admission No': '1085',
        'Candidate Name': 'Rafiul Islam',
        'Category': 'ʿĀLIYAH',
        'Class': '7'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 16 },
      { wch: 16 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
    XLSX.writeFile(workbook, 'candidates_sample_template.xlsx');
  },

  /**
   * Generate & Download Programs Sample Excel Template
   */
  downloadProgramsTemplate() {
    const sampleData = [
      {
        'Program Code': 'BS01',
        'Program Name': 'Qur\'an Thilawath',
        'Category': 'BIDĀYA',
        'Type (Stage or Non Stage)': 'Stage'
      },
      {
        'Program Code': 'BNN02',
        'Program Name': 'Pencil Drawing',
        'Category': 'BIDĀYA',
        'Type (Stage or Non Stage)': 'Non-Stage'
      },
      {
        'Program Code': 'US05',
        'Program Name': 'Elocution Arabic',
        'Category': 'ŪLĀ',
        'Type (Stage or Non Stage)': 'Stage'
      },
      {
        'Program Code': 'UNN10',
        'Program Name': 'Essay Writing Arabic',
        'Category': 'ŪLĀ',
        'Type (Stage or Non Stage)': 'Non-Stage'
      },
      {
        'Program Code': 'TS08',
        'Program Name': 'Public Address Urdu',
        'Category': 'THĀNAWIYYAH',
        'Type (Stage or Non Stage)': 'Stage'
      },
      {
        'Program Code': 'ANN14',
        'Program Name': 'Calligraphy English',
        'Category': '‘ĀLIYAH',
        'Type (Stage or Non Stage)': 'Non-Stage'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    worksheet['!cols'] = [
      { wch: 16 },
      { wch: 32 },
      { wch: 16 },
      { wch: 26 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programs');
    XLSX.writeFile(workbook, 'programs_sample_template.xlsx');
  },

  /**
   * Generate & Download Trainers Sample Excel Template
   */
  downloadTrainersTemplate() {
    const sampleData = [
      {
        'Trainer Name': 'JANISH NEHYAN HUDAWI',
        'Expertise / Field': 'Technical & Presentation',
        'Experience': '5+ Years'
      },
      {
        'Trainer Name': 'RSHID AT HUDAWI',
        'Expertise / Field': 'English & Speech',
        'Experience': '4+ Years'
      },
      {
        'Trainer Name': 'ALI REZA HUDAWI',
        'Expertise / Field': 'Writing & Literature',
        'Experience': '3+ Years'
      },
      {
        'Trainer Name': 'ALTAF RAZA AMJADI',
        'Expertise / Field': 'Fiqh & Urdu Expert',
        'Experience': '6+ Years'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trainers Template');
    XLSX.writeFile(workbook, 'trainers_sample_template.xlsx');
  },

  /**
   * Export all Trainers to formatted Excel
   */
  exportTrainers(trainers, state) {
    const data = trainers.map(t => {
      const assigned = state ? state.getTrainerPrograms(t.id) : [];
      const mentees = state ? state.getTrainerMentees(t.id) : [];
      return {
        'Trainer Name': t.name,
        'Expertise': t.expertise,
        'Experience': t.experience,
        'Status': t.status || 'Active',
        'Assigned Programs Count': assigned.length,
        'Assigned Programs': assigned.map(p => `[${p.code}] ${p.name}`).join('; '),
        'Total Mentees Count': mentees.length
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [{ wch: 26 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 40 }, { wch: 18 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trainers Roster');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Trainers_Roster_${today}.xlsx`);
  },

  /**
   * Export all Candidates to formatted Excel
   */
  exportCandidates(candidates, state) {
    const data = candidates.map(c => {
      const programs = state ? state.getCandidatePrograms(c.id) : [];
      return {
        'Admission No': c.adNo,
        'Name': c.name,
        'Category': c.category,
        'Class': c.class,
        'Enrolled Programs Count': programs.length,
        'Enrolled Programs': programs.map(p => `[${p.code}] ${p.name}`).join('; ')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [{ wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates Roster');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Candidates_Roster_${today}.xlsx`);
  },

  /**
   * Export all Programs to formatted Excel
   */
  exportPrograms(programs, state) {
    const data = programs.map(p => {
      const trainer = state && p.trainerId ? state.getTrainerById(p.trainerId) : null;
      const candidates = state ? state.getProgramCandidates(p.id) : [];

      return {
        'Program Code': p.code,
        'Program Name': p.name,
        'Category': p.category,
        'Type': p.type,
        'Assigned Trainer': trainer ? `${trainer.name} (${trainer.expertise})` : 'Unassigned',
        'Enrolled Candidates Count': candidates.length,
        'Assigned Candidates': candidates.map(c => `${c.name} (${c.adNo})`).join('; ')
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 28 },
      { wch: 24 },
      { wch: 45 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Programs List');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Programs_Registry_${today}.xlsx`);
  },

  /**
   * Export a single program's roster (candidates + trainer)
   */
  exportSingleProgram(program, candidates, trainer) {
    const rows = candidates.map((c, i) => ({
      'SL No': i + 1,
      'Admission No': c.adNo,
      'Candidate Name': c.name,
      'Category': c.category,
      'Class': c.class,
      'Program Code': program.code,
      'Program Name': program.name,
      'Trainer': trainer ? trainer.name : 'Unassigned'
    }));

    if (rows.length === 0) {
      rows.push({
        'SL No': '-',
        'Admission No': '-',
        'Candidate Name': 'No candidates assigned yet',
        'Category': program.category,
        'Class': '-',
        'Program Code': program.code,
        'Program Name': program.name,
        'Trainer': trainer ? trainer.name : 'Unassigned'
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 8 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 30 },
      { wch: 22 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, program.code || 'Program');
    XLSX.writeFile(workbook, `Roster_${program.code}_${program.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  },

  /**
   * Export Full Candidate Performance & Readiness Report
   */
  exportCandidatePerformanceReport(dossiers) {
    const rows = dossiers.map(d => ({
      'Chest No': d.candidate.chestNo || d.candidate.id,
      'Candidate Name': d.candidate.name,
      'Category': d.candidate.category,
      'Phone': d.candidate.phone || '-',
      'Institution': d.candidate.institution || 'DH BENGAL',
      'Assigned Programs': d.programs.map(p => `[${p.code}] ${p.name}`).join('; '),
      'Total Programs': d.totalPrograms,
      'Programs Met': d.metProgramsCount,
      'Meeting Rate (%)': `${d.meetingRatePct}%`,
      'Meeting Status': d.meetingRateLabel,
      'Overall Readiness (%)': d.hasEvaluation ? `${d.overallReadiness}%` : 'Not Evaluated',
      'Readiness Status': d.overallStatus.label,
      'Total Sessions Logged': d.totalMeets,
      'Last Session Date': d.latestMeetEver ? `${d.latestMeetEver.date} ${d.latestMeetEver.time || ''}` : 'No Sessions',
      'Preparation Momentum': d.momentumLabel,
      'Latest Trainer Remark': d.latestRemark ? d.latestRemark.text : '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 36 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 24 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 38 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidate Performance');
    XLSX.writeFile(workbook, `Candidate_Performance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  /**
   * Export Full Trainer Mentorship & Performance Report
   */
  exportTrainerPerformanceReport(trainerReports) {
    const rows = trainerReports.map(t => ({
      'Trainer Name': t.trainer.name,
      'Field of Expertise': t.trainer.expertise,
      'Username': t.trainer.username || '-',
      'Phone': t.trainer.phone || '-',
      'Assigned Programs Count': t.programCount,
      'Assigned Program Codes': t.assignedPrograms.map(p => p.code).join(', '),
      'Total Mentees': t.menteeCount,
      'Mentees Met': t.uniqueMenteesMetCount,
      'Meeting Compliance (%)': `${t.complianceRate}%`,
      'Average Readiness (%)': t.readiness.hasData ? `${t.averageReadiness}%` : '0%',
      'Total Sessions Logged': t.totalMeetsLogged,
      'Last Active Date': t.latestMeet ? `${t.latestMeet.date} ${t.latestMeet.time || ''}` : 'No Sessions Logged'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 24 },
      { wch: 26 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 20 },
      { wch: 22 },
      { wch: 24 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trainer Mentorship');
    XLSX.writeFile(workbook, `Trainer_Mentorship_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  /**
   * Download pre-filled template for bulk trainer credentials update
   */
  downloadTrainersCredentialsTemplate(trainers = []) {
    const data = (trainers.length > 0 ? trainers : [
      { id: 'trn-sample-1', name: 'Mufti Mutheeur Hudawi', username: 'muftimutheer' },
      { id: 'trn-sample-2', name: 'Kajimaddin Hudawi', username: 'kajimaddin' }
    ]).map(t => ({
      'Trainer ID': t.id,
      'Trainer Name': t.name,
      'Current Username': t.username || t.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      'New Username': t.username || t.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      'New Password': ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 22 }, // Trainer ID
      { wch: 28 }, // Trainer Name
      { wch: 22 }, // Current Username
      { wch: 22 }, // New Username
      { wch: 20 }  // New Password
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trainer Credentials');
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Trainers_Credentials_Template_${today}.xlsx`);
  },

  /**
   * Parse bulk trainer credentials spreadsheet
   */
  async parseTrainersCredentialsFile(file, existingTrainers = []) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded spreadsheet appears to be empty.');
    }

    const seenNewUsernames = new Map();

    const results = rawRows.map((row, index) => {
      let rawId = '';
      let rawName = '';
      let rawCurrentUsername = '';
      let rawNewUsername = '';
      let rawNewPassword = '';

      for (const [key, val] of Object.entries(row)) {
        const cleanedKey = cleanKey(key);
        const strVal = String(val !== undefined && val !== null ? val : '').trim();

        if (['trainerid', 'id', 'trainer_id', 'tid'].includes(cleanedKey)) {
          rawId = strVal;
        } else if (['trainername', 'name', 'trainer', 'fullname'].includes(cleanedKey)) {
          rawName = strVal;
        } else if (['currentusername', 'oldusername', 'currentuser', 'existingusername'].includes(cleanedKey)) {
          rawCurrentUsername = strVal;
        } else if (['newusername', 'newuser', 'updatedusername'].includes(cleanedKey)) {
          rawNewUsername = strVal;
        } else if (['newpassword', 'password', 'pass', 'pwd', 'newpass'].includes(cleanedKey)) {
          rawNewPassword = strVal;
        } else if (cleanedKey === 'username' && !rawNewUsername) {
          rawNewUsername = strVal;
        }
      }

      // Match trainer
      let matchedTrainer = null;
      if (rawId) {
        matchedTrainer = existingTrainers.find(t => String(t.id).trim().toLowerCase() === rawId.toLowerCase());
      }
      if (!matchedTrainer && rawName) {
        matchedTrainer = existingTrainers.find(t => String(t.name).trim().toLowerCase() === rawName.toLowerCase());
      }
      if (!matchedTrainer && rawCurrentUsername) {
        matchedTrainer = existingTrainers.find(t => {
          const u = String(t.username || '').trim().toLowerCase();
          return u === rawCurrentUsername.toLowerCase();
        });
      }

      if (!matchedTrainer) {
        return {
          rowIndex: index + 2,
          trainerId: rawId,
          trainerName: rawName || 'Unknown Trainer',
          trainer: null,
          oldUsername: rawCurrentUsername || '-',
          newUsername: rawNewUsername,
          newPassword: rawNewPassword,
          status: 'error',
          message: 'Trainer not found in database'
        };
      }

      const currentUsername = String(matchedTrainer.username || matchedTrainer.name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim().toLowerCase();
      const currentPassword = String(matchedTrainer.password || '123456').trim();

      // Finalize target username
      let finalUsername = currentUsername;
      if (rawNewUsername) {
        finalUsername = rawNewUsername.toLowerCase().replace(/\s+/g, '');
      }

      // Finalize target password
      const finalPassword = rawNewPassword !== '' ? rawNewPassword.trim() : currentPassword;

      const usernameChanged = finalUsername !== currentUsername;
      const passwordChanged = rawNewPassword !== '' && rawNewPassword.trim() !== currentPassword;

      // Check duplicate usernames within this uploaded batch
      if (seenNewUsernames.has(finalUsername) && seenNewUsernames.get(finalUsername) !== matchedTrainer.id) {
        return {
          rowIndex: index + 2,
          trainerId: matchedTrainer.id,
          trainerName: matchedTrainer.name,
          trainer: matchedTrainer,
          oldUsername: currentUsername,
          newUsername: finalUsername,
          newPassword: rawNewPassword,
          status: 'error',
          message: `Duplicate username "@${finalUsername}" in spreadsheet`
        };
      }
      seenNewUsernames.set(finalUsername, matchedTrainer.id);

      // Check if another trainer in the system already uses this username
      const conflictTrainer = existingTrainers.find(t => 
        String(t.id).trim() !== String(matchedTrainer.id).trim() &&
        String(t.username || t.name.toLowerCase().replace(/[^a-z0-9]/g, '')).trim().toLowerCase() === finalUsername
      );
      if (conflictTrainer) {
        return {
          rowIndex: index + 2,
          trainerId: matchedTrainer.id,
          trainerName: matchedTrainer.name,
          trainer: matchedTrainer,
          oldUsername: currentUsername,
          newUsername: finalUsername,
          newPassword: rawNewPassword,
          status: 'error',
          message: `Username "@${finalUsername}" is already used by ${conflictTrainer.name}`
        };
      }

      if (!usernameChanged && !passwordChanged) {
        return {
          rowIndex: index + 2,
          trainerId: matchedTrainer.id,
          trainerName: matchedTrainer.name,
          trainer: matchedTrainer,
          oldUsername: currentUsername,
          newUsername: currentUsername,
          newPassword: '',
          usernameChanged: false,
          passwordChanged: false,
          status: 'unchanged',
          message: 'No changes detected'
        };
      }

      return {
        rowIndex: index + 2,
        trainerId: matchedTrainer.id,
        trainerName: matchedTrainer.name,
        trainer: matchedTrainer,
        oldUsername: currentUsername,
        newUsername: finalUsername,
        newPassword: finalPassword,
        rawPasswordGiven: rawNewPassword !== '',
        usernameChanged,
        passwordChanged,
        status: 'valid',
        message: [
          usernameChanged ? `Username: @${currentUsername} → @${finalUsername}` : null,
          passwordChanged ? 'Password changed' : null
        ].filter(Boolean).join(' • ')
      };
    });

    const validRows = results.filter(r => r.status === 'valid');
    const unchangedRows = results.filter(r => r.status === 'unchanged');
    const errorRows = results.filter(r => r.status === 'error');

    return {
      allRows: results,
      validRows,
      unchangedRows,
      errorRows
    };
  }
};
