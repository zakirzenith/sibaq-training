import * as XLSX from 'xlsx';

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

  // 1. Explicit cell value matched
  if (['stage', 'on stage', 'on-stage', 'onstage', 's', 'yes', 'true', '1', 'stg'].includes(cleanVal)) {
    return 'Stage';
  }
  if (cleanVal.includes('non') || cleanVal.includes('off') || ['no', 'false', '0', 'ns', 'nn'].includes(cleanVal)) {
    return 'Non-Stage';
  }
  if (cleanVal === 'stage' || (cleanVal.includes('stage') && !cleanVal.includes('non') && !cleanVal.includes('off'))) {
    return 'Stage';
  }

  // 2. Sibaq Code Prefix Heuristic
  const c = String(code || '').trim().toUpperCase();
  // Bidaya Stage: BS, BST; Ula Stage: US, UST; Thanawiyyah Stage: TS, TST; Aliyah Stage: AS, AST
  if (/^(BS|UST|US|TST|TS|AST|AS|BST)\d+/i.test(c) || c.includes('STG') || c.includes('STAGE') || c.includes('ONSTAGE')) {
    return 'Stage';
  }
  // Bidaya Non-Stage: BNN, BN; Ula Non-Stage: UNN, UN; etc.
  if (/^(BNN|UNN|TNN|ANN|BN|UN|TN|AN|NST)\d+/i.test(c) || c.includes('NON') || c.includes('OFF') || c.includes('NN')) {
    return 'Non-Stage';
  }

  // 3. Program Title / Name Heuristics
  const n = String(name || '').trim().toLowerCase();
  const stageKeywords = [
    'speech', 'elocution', 'debate', 'qira', 'qirat', 'qur\'an', 'quran', 'hifz', 'hifdh',
    'nasheed', 'song', 'duff', 'quiz', 'extempore', 'public address', 'mono act', 'mime',
    'choral', 'ghazal', 'gazal', 'recitation', 'anchor', 'anchoring', 'mushaira', 'drama',
    'skit', 'talk', 'presentation', 'story telling', 'story-telling', 'vocal', 'anthem'
  ];
  if (stageKeywords.some(kw => n.includes(kw))) {
    return 'Stage';
  }

  const nonStageKeywords = [
    'writing', 'essay', 'story writing', 'paragraph', 'diary', 'drawing', 'pencil', 'painting',
    'calligraphy', 'poster', 'versification', 'translation', 'review', 'caption', 'water color',
    'watercolour', 'embroidery', 'origami', 'collage', 'scrap book'
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
        }
      }

      const isValid = Boolean(adNo && name);
      const errors = [];
      if (!adNo) errors.push('Missing Admission No');
      if (!name) errors.push('Missing Candidate Name');

      return {
        rowNumber: index + 2, // 1-indexed row in Excel
        adNo,
        name,
        category: category || 'General',
        class: studentClass,
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

    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded spreadsheet appears to be empty.');
    }

    const allowedStageHeaders = [
      'type', 'programtype', 'stageornonstage', 'stagenonstage', 'stageornonstageitem',
      'stage', 'stagetype', 'itemtype', 'eventtype', 'nature', 'venue', 'mode',
      'stageoffstage', 'stageoroffstage', 'stageitem', 'isstage', 'stagecategory',
      'type(stageornonstage)', 'typestageornonstage', 'typestagenonstage'
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

        if (['code', 'programcode', 'prgcode', 'progcode', 'itemcode', 'eventcode', 'id'].includes(cleaned)) {
          code = strVal.toUpperCase();
        } else if (['programname', 'programprogramname', 'name', 'program', 'event', 'title', 'eventname'].includes(cleaned)) {
          name = strVal;
        } else if (['category', 'cat', 'group', 'division'].includes(cleaned)) {
          category = strVal || 'General';
        } else if (allowedStageHeaders.includes(cleaned) || cleaned.includes('stage')) {
          rawType = strVal;
        }
      }

      // Check all cell values in row if rawType not identified yet
      if (!rawType) {
        for (const val of Object.values(row)) {
          const s = String(val).trim().toLowerCase();
          if (['stage', 'non-stage', 'non stage', 'off-stage', 'off stage', 'on stage'].includes(s)) {
            rawType = s;
            break;
          }
        }
      }

      // Fallback by index if row keys were unusual
      if (!code && !name) {
        const values = Object.values(row);
        if (values.length >= 2) {
          code = String(values[0] || '').trim().toUpperCase();
          name = String(values[1] || '').trim();
          if (values[2]) category = String(values[2]).trim();
          if (values[3]) rawType = String(values[3]).trim();
        }
      }

      // Intelligently infer Stage vs Non-Stage
      const normalizedType = inferProgramType(rawType, code, name);

      const isValid = Boolean(code && name);
      const errors = [];
      if (!code) errors.push('Missing Program Code');
      if (!name) errors.push('Missing Program Name');

      return {
        rowNumber: index + 2,
        code,
        name,
        category: category || 'General',
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
        'Admission No': 'AD-2026-101',
        'Candidate Name': 'Liam Vance',
        'Category': 'Senior',
        'Class': 'Grade 11-A'
      },
      {
        'Admission No': 'AD-2026-102',
        'Candidate Name': 'Sarah Connor',
        'Category': 'Senior',
        'Class': 'Grade 12-B'
      },
      {
        'Admission No': 'AD-2026-103',
        'Candidate Name': 'Devin Patel',
        'Category': 'Junior',
        'Class': 'Grade 9-C'
      },
      {
        'Admission No': 'AD-2026-104',
        'Candidate Name': 'Maya Rodriguez',
        'Category': 'Sub-Junior',
        'Class': 'Grade 7-A'
      },
      {
        'Admission No': 'AD-2026-105',
        'Candidate Name': 'Kenji Sato',
        'Category': 'General',
        'Class': 'Grade 10-B'
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
        'Program Code': 'STG-101',
        'Program Name': 'Classical Solo Dance',
        'Category': 'Senior',
        'Type (Stage or Non Stage)': 'Stage'
      },
      {
        'Program Code': 'NST-201',
        'Program Name': 'Extempore Public Speech',
        'Category': 'Senior',
        'Type (Stage or Non Stage)': 'Non-Stage'
      },
      {
        'Program Code': 'STG-102',
        'Program Name': 'Symphony Choir & Vocals',
        'Category': 'Junior',
        'Type (Stage or Non Stage)': 'Stage'
      },
      {
        'Program Code': 'NST-202',
        'Program Name': 'Creative Script & Story Writing',
        'Category': 'Junior',
        'Type (Stage or Non Stage)': 'Non-Stage'
      },
      {
        'Program Code': 'STG-103',
        'Program Name': 'Theatrical Skit & Pantomime',
        'Category': 'Sub-Junior',
        'Type (Stage or Non Stage)': 'Stage'
      },
      {
        'Program Code': 'NST-203',
        'Program Name': 'Inter-House General Quiz',
        'Category': 'General',
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
  }
};
