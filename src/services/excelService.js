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

    const parsedList = rawRows.map((row, index) => {
      let code = '';
      let name = '';
      let category = 'General';
      let type = 'Non-Stage';

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
        } else if (['type', 'programtype', 'stageornonstage', 'stageornonstageitem', 'stage', 'stagetype'].includes(cleaned)) {
          type = strVal;
        }
      }

      // Fallback by index if row keys were unusual
      if (!code && !name) {
        const values = Object.values(row);
        if (values.length >= 2) {
          code = String(values[0] || '').trim().toUpperCase();
          name = String(values[1] || '').trim();
          if (values[2]) category = String(values[2]).trim();
          if (values[3]) type = String(values[3]).trim();
        }
      }

      // Normalize Type
      const normalizedType = String(type || '').toLowerCase().includes('non') ? 'Non-Stage' : 'Stage';

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
