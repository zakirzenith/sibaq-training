import { 
  INITIAL_CANDIDATES, 
  INITIAL_PROGRAMS, 
  INITIAL_TRAINERS, 
  INITIAL_DAILY_MEETS,
  SAMPLE_DEMO_CANDIDATES,
  SAMPLE_DEMO_PROGRAMS,
  SAMPLE_DEMO_TRAINERS 
} from '../data/initialData.js';
import { firebaseService } from './firebase.js';
import { inferProgramType } from './excelService.js';
import { verifyControllerPassword } from './security.js';

// Clear legacy demo storage key to wipe default mock records
try {
  localStorage.removeItem('mentorflow_controller_db_v1');
} catch (e) {}

const STORAGE_KEY = 'mentorflow_controller_db_v2';

/**
 * Maps percentage to defined operational progress status range:
 * - 90% - 100%: Event Ready
 * - 75% - 89%:  Proficient
 * - 60% - 74%:  Progressing
 * - 40% - 59%:  Need Improvement
 * - 0% - 39%:   Need Focus
 */
export function getProgressStatus(percentage) {
  const p = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
  if (p >= 90) {
    return {
      label: 'Event Ready',
      key: 'event-ready',
      color: '#10b981',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      badgeClass: 'badge-event-ready',
      desc: 'Stage & performance ready. Peak execution.'
    };
  }
  if (p >= 75) {
    return {
      label: 'Proficient',
      key: 'proficient',
      color: '#06b6d4',
      bg: '#ecfeff',
      border: '#a5f3fc',
      badgeClass: 'badge-proficient',
      desc: 'Solid execution, consistent and confident.'
    };
  }
  if (p >= 60) {
    return {
      label: 'Progressing',
      key: 'progressing',
      color: '#3b82f6',
      bg: '#eff6ff',
      border: '#bfdbfe',
      badgeClass: 'badge-progressing',
      desc: 'Good pace, developing consistency & skill.'
    };
  }
  if (p >= 40) {
    return {
      label: 'Need Improvement',
      key: 'need-improvement',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
      badgeClass: 'badge-need-improvement',
      desc: 'Fair attempt, requires regular practice & rhythm.'
    };
  }
  return {
    label: 'Need Focus',
    key: 'need-focus',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    badgeClass: 'badge-need-focus',
    desc: 'Critical trainer guidance & dedicated drills required.'
  };
}

/**
 * 4 Canonical Competition Categories for Sibaq
 * (BIDĀYA, ŪLĀ, THĀNAWIYYAH, ʿĀLIYAH)
 */
export const CANONICAL_CATEGORIES = ['BIDĀYA', 'ŪLĀ', 'THĀNAWIYYAH', 'ʿĀLIYAH'];

/**
 * Normalizes any category string or spelling variant to one of the 4 canonical categories:
 * - 'BIDĀYAH', 'BIDAYA', etc. -> 'BIDĀYA'
 * - 'ULA', 'OOLA', etc. -> 'ŪLĀ'
 * - 'THANAWIYAH', 'THANAWIYYAH', etc. -> 'THĀNAWIYYAH'
 * - '‘ĀLIYAH', 'ALIYAH', 'AALIYAH', etc. -> 'ʿĀLIYAH'
 */
export function normalizeCategory(cat) {
  if (!cat) return '';
  const s = String(cat).trim();
  if (!s) return '';

  // Canonical exact matches
  if (s === 'BIDĀYA' || s === 'ŪLĀ' || s === 'THĀNAWIYYAH' || s === 'ʿĀLIYAH') {
    return s;
  }

  // Strip all variations of quotes, ayn (ʿ / ‘ / ’ / ` / etc.) and diacritics
  const clean = s
    .replace(/[\u02BF\u02BE\u02BC\u2018\u2019\u201A\u201B\u2032\u2035'`"״]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (clean === 'BIDAYA' || clean === 'BIDAYAH' || clean.startsWith('BIDAY')) {
    return 'BIDĀYA';
  }
  if (clean === 'ULA' || clean === 'OOLA') {
    return 'ŪLĀ';
  }
  if (clean.startsWith('THANAW') || clean.startsWith('SANAW')) {
    return 'THĀNAWIYYAH';
  }
  if (clean === 'ALIYAH' || clean === 'ALIYA' || clean === 'AALIYAH' || clean === 'AALIYA') {
    return 'ʿĀLIYAH';
  }

  // Filter out legacy non-competition groupings if matched
  if (['SENIOR', 'JUNIOR', 'SUB-JUNIOR', 'GENERAL'].includes(clean)) {
    return 'BIDĀYA';
  }

  return s;
}

class StateService {
  constructor() {
    this.subscribers = new Set();
    this.cloudUnsubscribers = [];
    this.isCloudSyncActive = false;

    this.loadState();
    this.initCloudSync();
  }

  loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.candidates = (Array.isArray(parsed.candidates) ? parsed.candidates : []).map(c => ({
          ...c,
          category: normalizeCategory(c.category || 'BIDĀYA')
        }));
        this.programs = (Array.isArray(parsed.programs) ? parsed.programs : []).map(p => ({
          ...p,
          category: normalizeCategory(p.category || 'BIDĀYA'),
          id: String(p.id || '').trim(),
          trainerId: p.trainerId && String(p.trainerId).trim() ? String(p.trainerId).trim() : null,
          candidateIds: Array.isArray(p.candidateIds) ? p.candidateIds.map(id => String(id).trim()).filter(Boolean) : []
        }));
        this.trainers = Array.isArray(parsed.trainers) ? parsed.trainers : [];
        this.dailyMeets = Array.isArray(parsed.dailyMeets) ? parsed.dailyMeets : [];

        // Ensure accurate Stage vs Non-Stage classification on startup
        if (this.programs.length > 0) {
          this.reclassifyProgramsStageType(false);
        }
        return;
      }
    } catch (e) {
      console.warn('Failed to parse stored state, initializing clean.', e);
    }

    // Default starting state: completely clean for real data uploads
    this.candidates = [];
    this.programs = [];
    this.trainers = [];
    this.dailyMeets = [];
    this.saveState();
  }

  saveState(triggerNotify = true) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          candidates: this.candidates,
          programs: this.programs,
          trainers: this.trainers,
          dailyMeets: this.dailyMeets,
          lastUpdated: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Failed to save state to localStorage:', e);
    }
    if (triggerNotify) {
      this.notify();
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const callback of this.subscribers) {
      try {
        callback(this);
      } catch (err) {
        console.error('Error in state subscriber:', err);
      }
    }
  }

  // --- CLOUD FIRESTORE SYNCHRONIZATION ---
  initCloudSync() {
    // Clean up previous listeners
    this.cloudUnsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) {}
    });
    this.cloudUnsubscribers = [];

    if (!firebaseService.isInitialized) {
      // Re-check when connection status changes
      firebaseService.onStatusChange((status) => {
        if (status.status === 'connected' && !this.isCloudSyncActive) {
          this.initCloudSync();
        } else if (status.status !== 'connected') {
          this.isCloudSyncActive = false;
        }
      });
      return;
    }

    this.isCloudSyncActive = true;

    // Real-time snapshot listeners for each collection
    const unsubCandidates = firebaseService.subscribe('candidates', (items) => {
      this.candidates = items.map(c => ({
        ...c,
        id: String(c.id || '').trim(),
        category: normalizeCategory(c.category || 'BIDĀYA')
      }));
      this.saveState();
    });

    const unsubPrograms = firebaseService.subscribe('programs', (items) => {
      this.programs = items.map(p => ({
        ...p,
        id: String(p.id || '').trim(),
        category: normalizeCategory(p.category || 'BIDĀYA'),
        trainerId: p.trainerId && String(p.trainerId).trim() ? String(p.trainerId).trim() : null,
        candidateIds: Array.isArray(p.candidateIds) ? p.candidateIds.map(id => String(id).trim()).filter(Boolean) : []
      }));
      this.saveState();
    });

    const unsubTrainers = firebaseService.subscribe('trainers', (items) => {
      this.trainers = items.map(t => ({
        ...t,
        id: String(t.id || '').trim()
      }));
      this.saveState();
    });

    const unsubMeets = firebaseService.subscribe('dailyMeets', (items) => {
      this.dailyMeets = items.map(m => ({
        ...m,
        id: String(m.id || '').trim()
      }));
      this.saveState();
    });

    this.cloudUnsubscribers.push(unsubCandidates, unsubPrograms, unsubTrainers, unsubMeets);
  }

  async syncAllLocalToCloud() {
    if (!firebaseService.isInitialized) {
      throw new Error('Firebase Firestore is not connected. Please connect your credentials first.');
    }

    if (this.candidates.length > 0) {
      await firebaseService.batchSync('candidates', this.candidates);
    }
    if (this.programs.length > 0) {
      await firebaseService.batchSync('programs', this.programs);
    }
    if (this.trainers.length > 0) {
      await firebaseService.batchSync('trainers', this.trainers);
    }
    if (this.dailyMeets.length > 0) {
      await firebaseService.batchSync('dailyMeets', this.dailyMeets);
    }
    return true;
  }

  async fetchFromCloud() {
    if (!firebaseService.isInitialized) {
      throw new Error('Firebase Firestore is not connected.');
    }

    const [cand, prog, trn, meets] = await Promise.all([
      firebaseService.fetchAll('candidates'),
      firebaseService.fetchAll('programs'),
      firebaseService.fetchAll('trainers'),
      firebaseService.fetchAll('dailyMeets')
    ]);

    this.candidates = cand;
    this.programs = prog;
    this.trainers = trn;
    this.dailyMeets = meets;
    this.saveState();
    return true;
  }

  // --- CANDIDATE METHODS ---
  getCandidates() {
    return [...this.candidates];
  }

  getCandidateById(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    return this.candidates.find(
      c => String(c.id).trim().toLowerCase() === cleanId || 
           String(c.adNo).trim().toLowerCase() === cleanId
    ) || null;
  }

  getCandidateByAdNo(adNo) {
    if (!adNo) return null;
    const cleanAdNo = String(adNo).trim().toLowerCase();
    const stripped = cleanAdNo.replace(/^#+/, '').trim();
    if (!cleanAdNo) return null;

    return this.candidates.find(c => {
      const candAd = String(c.adNo || '').trim().toLowerCase();
      const candChest = String(c.chestNo || '').trim().toLowerCase();
      const candId = String(c.id || '').trim().toLowerCase();

      if (candAd && (candAd === cleanAdNo || (stripped && candAd.replace(/^#+/, '').trim() === stripped))) return true;
      if (candChest && (candChest === cleanAdNo || (stripped && candChest.replace(/^#+/, '').trim() === stripped))) return true;
      if (candId && candId === cleanAdNo) return true;
      return false;
    }) || null;
  }

  getAvailableCategories() {
    // Return strictly the 4 canonical competition categories without duplicates:
    // (BIDĀYA, ŪLĀ, THĀNAWIYYAH, ʿĀLIYAH)
    return [...CANONICAL_CATEGORIES];
  }

  addCandidate(candidateData) {
    const rawAdNo = String(candidateData.adNo || candidateData.chestNo || '').trim();
    if (rawAdNo) {
      const existing = this.getCandidateByAdNo(rawAdNo);
      if (existing) {
        console.warn(`[state.addCandidate] Duplicate rejected: "${rawAdNo}" already belongs to ${existing.name} (id: ${existing.id})`);
        return null;
      }
    }

    const newCandidate = {
      id: candidateData.id ? String(candidateData.id).trim() : `cnd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adNo: String(candidateData.adNo || candidateData.chestNo || '').trim(),
      chestNo: String(candidateData.chestNo || candidateData.adNo || '').trim(),
      name: String(candidateData.name || '').trim(),
      category: normalizeCategory(candidateData.category || 'BIDĀYA'),
      class: String(candidateData.class || '').trim(),
      createdAt: candidateData.createdAt || new Date().toISOString()
    };

    this.candidates.unshift(newCandidate);
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('candidates', newCandidate.id, newCandidate).catch(e => console.warn(e));
    }

    if (Array.isArray(candidateData.programIds)) {
      this.setCandidatePrograms(newCandidate.id, candidateData.programIds);
    }

    return newCandidate;
  }

  updateCandidate(id, updateData) {
    const cleanId = String(id).trim();
    const index = this.candidates.findIndex(c => String(c.id).trim() === cleanId);
    if (index === -1) return null;

    if (updateData.adNo !== undefined || updateData.chestNo !== undefined) {
      const newAd = String(updateData.adNo ?? updateData.chestNo ?? '').trim();
      if (newAd) {
        const existing = this.getCandidateByAdNo(newAd);
        if (existing && String(existing.id).trim() !== cleanId) {
          console.warn(`[state.updateCandidate] Duplicate rejected: "${newAd}" already belongs to ${existing.name}`);
          return null;
        }
      }
    }

    this.candidates[index] = {
      ...this.candidates[index],
      ...updateData,
      adNo: String(updateData.adNo ?? this.candidates[index].adNo ?? '').trim(),
      chestNo: String(updateData.chestNo ?? updateData.adNo ?? this.candidates[index].chestNo ?? this.candidates[index].adNo ?? '').trim(),
      name: String(updateData.name ?? this.candidates[index].name).trim(),
      category: normalizeCategory(updateData.category ?? this.candidates[index].category ?? 'BIDĀYA'),
      class: String(updateData.class ?? this.candidates[index].class).trim()
    };

    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('candidates', cleanId, this.candidates[index]).catch(e => console.warn(e));
    }

    if (Array.isArray(updateData.programIds)) {
      this.setCandidatePrograms(cleanId, updateData.programIds);
    }

    return this.candidates[index];
  }

  deleteCandidate(id) {
    if (!id) return;
    const cleanId = String(id).trim();
    this.candidates = this.candidates.filter(c => String(c.id).trim() !== cleanId);
    
    // Remove candidate from any assigned programs and sync those programs
    const affectedPrograms = [];
    this.programs = this.programs.map(prg => {
      if (Array.isArray(prg.candidateIds) && prg.candidateIds.some(cId => String(cId).trim() === cleanId)) {
        const updated = {
          ...prg,
          candidateIds: prg.candidateIds.filter(cId => String(cId).trim() !== cleanId)
        };
        affectedPrograms.push(updated);
        return updated;
      }
      return prg;
    });
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.deleteDoc('candidates', cleanId).catch(e => console.warn(e));
      affectedPrograms.forEach(p => {
        firebaseService.setDoc('programs', p.id, p).catch(e => console.warn(e));
      });
    }
  }

  addCandidatesBulk(list, overwriteExisting = false) {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const newOrUpdated = [];

    list.forEach(item => {
      const adNo = String(item.adNo || '').trim();
      const name = String(item.name || '').trim();
      if (!adNo || !name) {
        skippedCount++;
        return;
      }

      const existingIndex = this.candidates.findIndex(
        c => c.adNo.toLowerCase() === adNo.toLowerCase()
      );

      if (existingIndex >= 0) {
        if (overwriteExisting) {
          this.candidates[existingIndex] = {
            ...this.candidates[existingIndex],
            name: name,
            category: normalizeCategory(item.category || this.candidates[existingIndex].category || 'BIDĀYA'),
            class: String(item.class || this.candidates[existingIndex].class || '').trim()
          };
          newOrUpdated.push(this.candidates[existingIndex]);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const newObj = {
          id: `cnd-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          adNo,
          name,
          category: normalizeCategory(item.category || 'BIDĀYA'),
          class: String(item.class || '').trim(),
          createdAt: new Date().toISOString()
        };
        this.candidates.push(newObj);
        newOrUpdated.push(newObj);
        addedCount++;
      }

      const candidateId = existingIndex >= 0 ? this.candidates[existingIndex].id : newObj.id;
      if (Array.isArray(item.programIds) && item.programIds.length > 0) {
        this.setCandidatePrograms(candidateId, item.programIds);
      } else if (Array.isArray(item.programCodes) && item.programCodes.length > 0) {
        const resolvedPids = item.programCodes
          .map(c => this.getProgramByCode(c)?.id)
          .filter(Boolean);
        if (resolvedPids.length > 0) {
          this.setCandidatePrograms(candidateId, resolvedPids);
        }
      }
    });

    this.saveState();

    if (firebaseService.isInitialized && newOrUpdated.length > 0) {
      firebaseService.batchSync('candidates', newOrUpdated).catch(e => console.warn(e));
    }

    return { addedCount, updatedCount, skippedCount, totalProcessed: list.length };
  }

  // --- PROGRAM METHODS ---
  getPrograms() {
    return [...this.programs];
  }

  getProgramById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();
    return this.programs.find(p => String(p.id).trim() === cleanId) || null;
  }

  getProgramByCode(code) {
    if (!code) return null;
    const cleanCode = String(code).trim().toLowerCase();
    return this.programs.find(p => String(p.code).trim().toLowerCase() === cleanCode) || null;
  }

  addProgram(programData) {
    const typeNormalized = String(programData.type || 'Non-Stage').toLowerCase().includes('non')
      ? 'Non-Stage'
      : 'Stage';

    const newProgram = {
      id: programData.id ? String(programData.id).trim() : `prg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: String(programData.code || '').trim().toUpperCase(),
      name: String(programData.name || '').trim(),
      category: normalizeCategory(programData.category || 'BIDĀYA'),
      type: typeNormalized,
      trainerId: programData.trainerId && String(programData.trainerId).trim() ? String(programData.trainerId).trim() : null,
      candidateIds: Array.isArray(programData.candidateIds) ? programData.candidateIds.map(id => String(id).trim()).filter(Boolean) : [],
      createdAt: programData.createdAt || new Date().toISOString()
    };

    this.programs.unshift(newProgram);
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('programs', newProgram.id, newProgram).catch(e => console.warn(e));
    }

    return newProgram;
  }

  updateProgram(id, updateData) {
    const cleanId = String(id).trim();
    const index = this.programs.findIndex(p => String(p.id).trim() === cleanId);
    if (index === -1) return null;

    let typeNormalized = this.programs[index].type;
    if (updateData.type) {
      typeNormalized = String(updateData.type).toLowerCase().includes('non')
        ? 'Non-Stage'
        : 'Stage';
    }

    let updatedTrainerId = this.programs[index].trainerId;
    if (updateData.trainerId !== undefined) {
      updatedTrainerId = updateData.trainerId && String(updateData.trainerId).trim() ? String(updateData.trainerId).trim() : null;
    }

    this.programs[index] = {
      ...this.programs[index],
      ...updateData,
      type: typeNormalized,
      trainerId: updatedTrainerId,
      code: updateData.code ? String(updateData.code).trim().toUpperCase() : this.programs[index].code,
      name: updateData.name ? String(updateData.name).trim() : this.programs[index].name,
      category: updateData.category ? normalizeCategory(updateData.category) : this.programs[index].category
    };

    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('programs', cleanId, this.programs[index]).catch(e => console.warn(e));
    }

    return this.programs[index];
  }

  deleteProgram(id) {
    if (!id) return 0;
    return this.deleteProgramsBulk([id]);
  }

  deleteProgramsBulk(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const cleanIdSet = new Set(ids.map(id => String(id).trim()).filter(Boolean));
    if (cleanIdSet.size === 0) return 0;

    const initialCount = this.programs.length;
    
    // Find codes of deleting programs for candidate program cleanup
    const deletingCodes = new Set(
      this.programs
        .filter(p => cleanIdSet.has(String(p.id).trim()))
        .map(p => String(p.code || '').trim().toLowerCase())
        .filter(Boolean)
    );

    // Filter out programs
    this.programs = this.programs.filter(p => !cleanIdSet.has(String(p.id).trim()));

    // Clean up candidates
    this.candidates.forEach(c => {
      if (Array.isArray(c.programs)) {
        c.programs = c.programs.filter(pRef => {
          const cleanRef = String(pRef || '').trim().toLowerCase();
          return !cleanIdSet.has(pRef) && !deletingCodes.has(cleanRef);
        });
      }
    });

    // Clean up trainers
    this.trainers.forEach(t => {
      if (Array.isArray(t.assignedProgramIds)) {
        t.assignedProgramIds = t.assignedProgramIds.filter(pid => !cleanIdSet.has(String(pid).trim()));
      }
    });

    this.saveState();

    if (firebaseService.isInitialized) {
      cleanIdSet.forEach(cleanId => {
        firebaseService.deleteDoc('programs', cleanId).catch(e => console.warn(e));
      });
      this.candidates.forEach(c => {
        firebaseService.setDoc('candidates', c.id, c).catch(() => {});
      });
      this.trainers.forEach(t => {
        firebaseService.setDoc('trainers', t.id, t).catch(() => {});
      });
    }

    this.notifyListeners('programs_deleted', { deletedIds: Array.from(cleanIdSet) });
    return initialCount - this.programs.length;
  }

  addProgramsBulk(list, overwriteExisting = false) {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const newOrUpdated = [];

    list.forEach(item => {
      const code = String(item.code || '').trim().toUpperCase();
      const name = String(item.name || '').trim();
      if (!code || !name) {
        skippedCount++;
        return;
      }

      const typeNormalized = String(item.type || 'Non-Stage').toLowerCase().includes('non')
        ? 'Non-Stage'
        : 'Stage';

      const existingIndex = this.programs.findIndex(
        p => p.code.toLowerCase() === code.toLowerCase()
      );

      if (existingIndex >= 0) {
        if (overwriteExisting) {
          this.programs[existingIndex] = {
            ...this.programs[existingIndex],
            name,
            category: normalizeCategory(item.category || this.programs[existingIndex].category || 'BIDĀYA'),
            type: typeNormalized
          };
          newOrUpdated.push(this.programs[existingIndex]);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const newObj = {
          id: `prg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          code,
          name,
          category: normalizeCategory(item.category || 'BIDĀYA'),
          type: typeNormalized,
          trainerId: null,
          candidateIds: [],
          createdAt: new Date().toISOString()
        };
        this.programs.push(newObj);
        newOrUpdated.push(newObj);
        addedCount++;
      }
    });

    this.saveState();

    if (firebaseService.isInitialized && newOrUpdated.length > 0) {
      firebaseService.batchSync('programs', newOrUpdated).catch(e => console.warn(e));
    }

    return { addedCount, updatedCount, skippedCount, totalProcessed: list.length };
  }

  reclassifyProgramsStageType(triggerNotify = true) {
    let reclassifiedCount = 0;
    const updatedPrograms = [];

    this.programs.forEach(p => {
      const currentType = p.type;
      const detectedType = inferProgramType('', p.code, p.name);
      if (detectedType && detectedType !== currentType) {
        p.type = detectedType;
        updatedPrograms.push(p);
        reclassifiedCount++;
      }
    });

    if (reclassifiedCount > 0) {
      this.saveState(triggerNotify);
      if (firebaseService.isInitialized) {
        firebaseService.batchSync('programs', updatedPrograms).catch(e => console.warn(e));
      }
    }
    return { reclassifiedCount, total: this.programs.length };
  }

  assignTrainerToProgram(programId, trainerId) {
    if (!programId) return false;
    const cleanPid = String(programId).trim();
    const program = this.programs.find(p => String(p.id).trim() === cleanPid);
    if (!program) return false;

    const cleanTid = trainerId && String(trainerId).trim() ? String(trainerId).trim() : null;
    program.trainerId = cleanTid;
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('programs', program.id, {
        ...program,
        trainerId: cleanTid
      }).catch(e => console.warn(e));
    }

    return true;
  }

  assignCandidatesToProgram(programId, candidateIds) {
    if (!programId) return false;
    const cleanPid = String(programId).trim();
    const program = this.programs.find(p => String(p.id).trim() === cleanPid);
    if (!program) return false;

    program.candidateIds = Array.from(new Set((candidateIds || []).map(id => String(id).trim()).filter(Boolean)));
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('programs', program.id, program).catch(e => console.warn(e));
    }

    return true;
  }

  assignProgramRoster(programId, { candidateIds, trainerId }) {
    if (!programId) return false;
    const cleanPid = String(programId).trim();
    const program = this.programs.find(p => String(p.id).trim() === cleanPid);
    if (!program) return false;

    if (candidateIds !== undefined) {
      program.candidateIds = Array.from(new Set((candidateIds || []).map(id => String(id).trim()).filter(Boolean)));
    }
    if (trainerId !== undefined) {
      program.trainerId = trainerId && String(trainerId).trim() ? String(trainerId).trim() : null;
    }

    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('programs', program.id, program).catch(e => console.warn(e));
    }

    return true;
  }

  addCandidateToProgram(programId, candidateId) {
    const session = this.getAuthSession();
    if (session && session.role === 'trainer') {
      console.warn('Unauthorized: Trainers cannot modify program enrollments.');
      return false;
    }
    if (!programId || !candidateId) return false;
    const cleanPid = String(programId).trim();
    const cleanCid = String(candidateId).trim();
    const program = this.programs.find(p => String(p.id).trim() === cleanPid);
    if (!program) return false;

    if (!Array.isArray(program.candidateIds)) program.candidateIds = [];
    if (!program.candidateIds.some(id => String(id).trim() === cleanCid)) {
      program.candidateIds.push(cleanCid);
      this.saveState();
      if (firebaseService.isInitialized) {
        firebaseService.setDoc('programs', program.id, program).catch(e => console.warn(e));
      }
    }
    return true;
  }

  removeCandidateFromProgram(programId, candidateId) {
    const session = this.getAuthSession();
    if (session && session.role === 'trainer') {
      console.warn('Unauthorized: Trainers cannot unenroll candidates from programs.');
      return false;
    }
    if (!programId || !candidateId) return false;
    const cleanPid = String(programId).trim();
    const cleanCid = String(candidateId).trim();
    const program = this.programs.find(p => String(p.id).trim() === cleanPid);
    if (!program) return false;

    if (Array.isArray(program.candidateIds)) {
      program.candidateIds = program.candidateIds.filter(id => String(id).trim() !== cleanCid);
      this.saveState();
      if (firebaseService.isInitialized) {
        firebaseService.setDoc('programs', program.id, program).catch(e => console.warn(e));
      }
    }

    return true;
  }

  setCandidatePrograms(candidateId, targetProgramIds) {
    const session = this.getAuthSession();
    if (session && session.role === 'trainer') {
      console.warn('Unauthorized: Trainers cannot modify program enrollments.');
      return false;
    }
    if (!candidateId) return false;
    const cleanCid = String(candidateId).trim();
    const cand = this.getCandidateById(cleanCid);
    const targetSet = new Set((targetProgramIds || []).map(id => String(id).trim()).filter(Boolean));
    const updatedPrograms = [];

    this.programs.forEach(program => {
      if (!Array.isArray(program.candidateIds)) program.candidateIds = [];
      const hasCand = program.candidateIds.some(id => {
        const c = String(id).trim();
        return c === cleanCid || (cand && (c === String(cand.id).trim() || c === String(cand.adNo).trim()));
      });
      const shouldHave = targetSet.has(String(program.id).trim()) || targetSet.has(String(program.code).trim().toUpperCase());

      if (shouldHave && !hasCand) {
        program.candidateIds.push(cleanCid);
        updatedPrograms.push(program);
      } else if (!shouldHave && hasCand) {
        program.candidateIds = program.candidateIds.filter(id => {
          const c = String(id).trim();
          return c !== cleanCid && (!cand || (c !== String(cand.id).trim() && c !== String(cand.adNo).trim()));
        });
        updatedPrograms.push(program);
      }
    });

    if (updatedPrograms.length > 0) {
      this.saveState();
      if (firebaseService.isInitialized) {
        firebaseService.batchSync('programs', updatedPrograms).catch(e => console.warn(e));
      }
    }
    return true;
  }

  // --- TRAINER METHODS ---
  getTrainers() {
    return [...this.trainers];
  }

  getTrainerById(id) {
    if (!id) return null;
    const cleanId = String(id).trim().toLowerCase();
    return this.trainers.find(
      t => String(t.id).trim().toLowerCase() === cleanId || 
           String(t.name).trim().toLowerCase() === cleanId
    ) || null;
  }

  addTrainer(trainerData) {
    const palette = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
    const randomColor = palette[Math.floor(Math.random() * palette.length)];

    const name = String(trainerData.name || '').trim();
    const defaultUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const newTrainer = {
      id: trainerData.id ? String(trainerData.id).trim() : `trn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      expertise: String(trainerData.expertise || 'General Coach').trim(),
      experience: String(trainerData.experience || '3+ Years').trim(),
      username: String(trainerData.username || defaultUsername).trim().toLowerCase(),
      password: String(trainerData.password || '123456').trim(),
      phone: String(trainerData.phone || '').trim(),
      email: String(trainerData.email || '').trim(),
      status: trainerData.status || 'Active',
      color: trainerData.color || randomColor,
      photo: trainerData.photo !== undefined ? trainerData.photo : null,
      createdAt: trainerData.createdAt || new Date().toISOString()
    };

    this.trainers.unshift(newTrainer);
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('trainers', newTrainer.id, newTrainer).catch(e => console.warn(e));
    }

    return newTrainer;
  }

  updateTrainer(id, updateData) {
    const cleanId = String(id).trim();
    const session = this.getAuthSession();
    if (session && session.role === 'trainer') {
      if (!session.trainer || String(session.trainer.id).trim() !== cleanId) {
        console.warn('Unauthorized: Trainers cannot modify other trainers.');
        return null;
      }
    }
    const index = this.trainers.findIndex(t => String(t.id).trim() === cleanId);
    if (index === -1) return null;

    const current = this.trainers[index];
    this.trainers[index] = {
      ...current,
      ...updateData,
      name: updateData.name ? String(updateData.name).trim() : current.name,
      expertise: updateData.expertise ? String(updateData.expertise).trim() : current.expertise,
      experience: updateData.experience ? String(updateData.experience).trim() : current.experience,
      username: updateData.username !== undefined ? String(updateData.username).trim().toLowerCase() : (current.username || current.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
      password: updateData.password !== undefined ? String(updateData.password).trim() : (current.password || '123456'),
      phone: updateData.phone !== undefined ? String(updateData.phone).trim() : (current.phone || ''),
      email: updateData.email !== undefined ? String(updateData.email).trim() : (current.email || ''),
      photo: updateData.photo !== undefined ? updateData.photo : (current.photo || null)
    };

    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('trainers', cleanId, this.trainers[index]).catch(e => console.warn(e));
    }

    return this.trainers[index];
  }

  // --- TRAINER AUTHENTICATION & SESSION ---
  authenticateTrainer(usernameOrEmail, password) {
    const query = String(usernameOrEmail || '').trim().toLowerCase();
    const pwd = String(password || '').trim();

    if (!query || !pwd) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    const trainer = this.trainers.find(t => {
      const u = String(t.username || t.name.toLowerCase().replace(/[^a-z0-9]/g, '')).toLowerCase();
      const em = String(t.email || '').toLowerCase();
      const nm = String(t.name || '').toLowerCase();
      return u === query || em === query || nm === query;
    });

    if (!trainer) {
      return { success: false, error: 'Trainer account not found with this username.' };
    }

    const validPassword = String(trainer.password || '123456').trim();
    if (validPassword !== pwd) {
      return { success: false, error: 'Incorrect password. Please verify credentials.' };
    }

    localStorage.setItem('mentorflow_auth_role', 'trainer');
    localStorage.setItem('mentorflow_auth_trainer_id', trainer.id);
    localStorage.setItem('mentorflow_active_portal', 'trainer');
    this.setActiveTrainer(trainer.id);
    return { success: true, trainer };
  }

  // --- CONTROLLER AUTHENTICATION ---
  authenticateController(username, password) {
    const u = String(username || '').trim().toLowerCase();
    const p = String(password || '').trim();

    if (!u || !p) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    if (u === 'sibaq' && verifyControllerPassword(p)) {
      localStorage.setItem('mentorflow_auth_role', 'controller');
      localStorage.setItem('mentorflow_controller_user', 'sibaq');
      localStorage.setItem('mentorflow_active_portal', 'controller');
      this.clearActiveTrainer();
      return { success: true };
    }

    return { success: false, error: 'Incorrect username or password. Please verify controller credentials.' };
  }

  // --- MENTEE AUTHENTICATION ---
  authenticateMentee(adNo, category) {
    const rawAd = String(adNo || '').trim();
    const rawCat = normalizeCategory(category);

    if (!rawAd) {
      return { success: false, error: 'Please enter your Admission / Chest Number.' };
    }
    if (!rawCat) {
      return { success: false, error: 'Please select your competition Category.' };
    }

    const candidate = this.getCandidateByAdNo(rawAd);
    if (!candidate) {
      return { 
        success: false, 
        error: `No candidate found with Admission / Chest No "${rawAd}". Please verify your number.` 
      };
    }

    // Verify category matches using normalized forms
    const candCat = normalizeCategory(candidate.category);
    if (candCat !== rawCat && candCat.toLowerCase() !== rawCat.toLowerCase()) {
      return { 
        success: false, 
        error: `Category mismatch for ${candidate.name}. You are registered under "${candCat || candidate.category}", but "${category}" was selected.` 
      };
    }

    localStorage.setItem('mentorflow_auth_role', 'mentee');
    localStorage.setItem('mentorflow_auth_mentee_id', candidate.id);
    localStorage.setItem('mentorflow_active_portal', 'mentee');
    this.clearActiveTrainer();
    return { success: true, candidate };
  }

  getAuthSession() {
    const role = localStorage.getItem('mentorflow_auth_role');
    if (role === 'controller') {
      return { role: 'controller', user: 'sibaq' };
    }
    if (role === 'trainer') {
      const authId = localStorage.getItem('mentorflow_auth_trainer_id');
      const trainer = authId ? this.getTrainerById(authId) : null;
      if (trainer) {
        return { role: 'trainer', trainer };
      }
    }
    if (role === 'mentee') {
      const authId = localStorage.getItem('mentorflow_auth_mentee_id');
      const candidate = authId ? this.getCandidateById(authId) : null;
      if (candidate) {
        return { role: 'mentee', candidate };
      }
    }
    return null;
  }

  logout() {
    localStorage.removeItem('mentorflow_auth_role');
    localStorage.removeItem('mentorflow_auth_trainer_id');
    localStorage.removeItem('mentorflow_auth_mentee_id');
    localStorage.removeItem('mentorflow_controller_user');
    this.clearActiveTrainer();
    localStorage.removeItem('mentorflow_active_portal');
  }

  getActiveTrainer() {
    const role = localStorage.getItem('mentorflow_auth_role');
    if (role === 'trainer') {
      const authId = localStorage.getItem('mentorflow_auth_trainer_id');
      if (authId) {
        return this.getTrainerById(authId);
      }
    }
    const tid = localStorage.getItem('mentorflow_active_trainer_id');
    if (!tid) return null;
    return this.getTrainerById(tid);
  }

  setActiveTrainer(trainerId) {
    const role = localStorage.getItem('mentorflow_auth_role');
    if (role === 'trainer') {
      const authId = localStorage.getItem('mentorflow_auth_trainer_id');
      if (authId) {
        localStorage.setItem('mentorflow_active_trainer_id', authId);
        return;
      }
    }
    if (trainerId) {
      localStorage.setItem('mentorflow_active_trainer_id', String(trainerId).trim());
    } else {
      localStorage.removeItem('mentorflow_active_trainer_id');
    }
  }

  clearActiveTrainer() {
    localStorage.removeItem('mentorflow_active_trainer_id');
  }

  getTrainerDetailedRoster(trainerId) {
    if (!trainerId) return [];
    const cleanTid = String(trainerId).trim();
    const programs = this.getTrainerPrograms(cleanTid);
    const candidateMap = new Map();

    programs.forEach(prg => {
      (prg.candidateIds || []).forEach(cid => {
        const cleanCid = String(cid).trim();
        const cand = this.getCandidateById(cleanCid);
        if (!cand) return;

        if (!candidateMap.has(cand.id)) {
          candidateMap.set(cand.id, {
            candidate: cand,
            programs: [],
            meets: [],
            latestMeet: null,
            readiness: 0,
            hasEvaluation: false,
            readinessStatus: null
          });
        }

        const entry = candidateMap.get(cand.id);
        if (!entry.programs.some(p => p.id === prg.id)) {
          entry.programs.push(prg);
        }
      });
    });

    candidateMap.forEach(entry => {
      const allMeets = this.getCandidateMeets(entry.candidate.id);
      const progIds = new Set(entry.programs.map(p => p.id));
      entry.meets = allMeets.filter(
        m => (m.trainerId && String(m.trainerId).trim() === cleanTid) || (m.programId && progIds.has(m.programId))
      );

      if (entry.meets.length > 0) {
        entry.latestMeet = entry.meets[entry.meets.length - 1];
        entry.readiness = entry.latestMeet.percentage;
        entry.hasEvaluation = true;
        entry.readinessStatus = getProgressStatus(entry.readiness);
      } else {
        entry.readiness = 0;
        entry.hasEvaluation = false;
        entry.readinessStatus = {
          label: 'Not Evaluated',
          key: 'not-evaluated',
          color: '#64748b',
          badgeClass: 'badge-neutral'
        };
      }
    });

    return Array.from(candidateMap.values());
  }

  deleteTrainer(id) {
    if (!id) return;
    const session = this.getAuthSession();
    if (session && session.role === 'trainer') {
      console.warn('Unauthorized: Trainers cannot delete trainer accounts.');
      return;
    }
    const cleanId = String(id).trim();
    this.trainers = this.trainers.filter(t => String(t.id).trim() !== cleanId);
    
    // Unassign trainer from programs in memory AND update in Firestore
    const affectedPrograms = [];
    this.programs = this.programs.map(p => {
      if (p.trainerId && String(p.trainerId).trim() === cleanId) {
        const updated = { ...p, trainerId: null };
        affectedPrograms.push(updated);
        return updated;
      }
      return p;
    });
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.deleteDoc('trainers', cleanId).catch(e => console.warn(e));
      affectedPrograms.forEach(p => {
        firebaseService.setDoc('programs', p.id, p).catch(e => console.warn(e));
      });
    }
  }

  addTrainersBulk(list, overwriteExisting = false) {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const newOrUpdated = [];
    const palette = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

    list.forEach(item => {
      const name = String(item.name || '').trim();
      if (!name) {
        skippedCount++;
        return;
      }

      const existingIndex = this.trainers.findIndex(
        t => t.name.toLowerCase() === name.toLowerCase()
      );

      if (existingIndex >= 0) {
        if (overwriteExisting) {
          this.trainers[existingIndex] = {
            ...this.trainers[existingIndex],
            expertise: String(item.expertise || this.trainers[existingIndex].expertise || 'General Mentor').trim(),
            experience: String(item.experience || this.trainers[existingIndex].experience || '3+ Years').trim()
          };
          newOrUpdated.push(this.trainers[existingIndex]);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        const randomColor = palette[Math.floor(Math.random() * palette.length)];
        const newObj = {
          id: `trn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name,
          expertise: String(item.expertise || 'General Mentor').trim(),
          experience: String(item.experience || '3+ Years').trim(),
          status: 'Active',
          color: randomColor,
          createdAt: new Date().toISOString()
        };
        this.trainers.push(newObj);
        newOrUpdated.push(newObj);
        addedCount++;
      }
    });

    this.saveState();

    if (firebaseService.isInitialized && newOrUpdated.length > 0) {
      firebaseService.batchSync('trainers', newOrUpdated).catch(e => console.warn(e));
    }

    return { addedCount, updatedCount, skippedCount, totalProcessed: list.length };
  }

  // --- COMPUTED & RELATIONSHIPS ---
  getProgramCandidates(programId) {
    const program = this.getProgramById(programId);
    if (!program || !program.candidateIds) return [];
    return program.candidateIds
      .map(id => this.getCandidateById(id))
      .filter(Boolean);
  }

  getCandidatePrograms(candidateId) {
    if (!candidateId) return [];
    const cand = this.getCandidateById(candidateId);
    const validMatches = new Set();
    validMatches.add(String(candidateId).trim().toLowerCase());
    if (cand) {
      if (cand.id) validMatches.add(String(cand.id).trim().toLowerCase());
      if (cand.adNo) validMatches.add(String(cand.adNo).trim().toLowerCase());
    }
    return this.programs.filter(
      p => Array.isArray(p.candidateIds) && p.candidateIds.some(cid => {
        const clean = String(cid).trim().toLowerCase();
        return validMatches.has(clean);
      })
    );
  }

  getTrainerPrograms(trainerId) {
    if (!trainerId) return [];
    const trn = this.getTrainerById(trainerId);
    const validMatches = new Set();
    validMatches.add(String(trainerId).trim().toLowerCase());
    if (trn) {
      if (trn.id) validMatches.add(String(trn.id).trim().toLowerCase());
      if (trn.name) validMatches.add(String(trn.name).trim().toLowerCase());
    }
    return this.programs.filter(p => {
      if (!p.trainerId) return false;
      const clean = String(p.trainerId).trim().toLowerCase();
      return validMatches.has(clean);
    });
  }

  getTrainerMentees(trainerId) {
    const programs = this.getTrainerPrograms(trainerId);
    const candidateMatches = new Set();
    programs.forEach(prg => {
      (prg.candidateIds || []).forEach(id => candidateMatches.add(String(id).trim()));
    });

    return Array.from(candidateMatches)
      .map(id => this.getCandidateById(id))
      .filter(Boolean);
  }

  getTrainerReadiness(trainerId) {
    if (!trainerId) return { percentage: 0, evaluatedCount: 0, totalCount: 0, hasData: false };
    const cleanTid = String(trainerId).trim();
    const mentees = this.getTrainerMentees(cleanTid);

    // If no mentees, check if trainer logged any meets directly
    if (!mentees || mentees.length === 0) {
      const directMeets = this.dailyMeets.filter(m => String(m.trainerId || '').trim() === cleanTid);
      if (directMeets.length === 0) {
        return { percentage: 0, evaluatedCount: 0, totalCount: 0, hasData: false };
      }
      const avg = Math.round(directMeets.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0) / directMeets.length);
      return { percentage: avg, evaluatedCount: directMeets.length, totalCount: directMeets.length, hasData: true };
    }

    // For each candidate in mentees, find their latest meet score
    let totalScore = 0;
    let evaluatedCount = 0;

    mentees.forEach(cand => {
      const meets = this.getCandidateMeets(cand.id);
      if (meets && meets.length > 0) {
        // Find latest meet with this trainer if possible, otherwise latest meet
        const trainerMeet = meets.slice().reverse().find(m => String(m.trainerId || '').trim() === cleanTid);
        const latestMeet = trainerMeet || meets[meets.length - 1];
        totalScore += Number(latestMeet.percentage) || 0;
        evaluatedCount++;
      }
    });

    if (evaluatedCount === 0) {
      return { percentage: 0, evaluatedCount: 0, totalCount: mentees.length, hasData: false };
    }

    const percentage = Math.round(totalScore / evaluatedCount);
    return {
      percentage,
      evaluatedCount,
      totalCount: mentees.length,
      hasData: true
    };
  }

  getMetrics() {
    const totalCandidates = this.candidates.length;
    const totalPrograms = this.programs.length;
    const totalTrainers = this.trainers.length;

    const stagePrograms = this.programs.filter(p => p.type === 'Stage').length;
    const nonStagePrograms = this.programs.filter(p => p.type === 'Non-Stage').length;

    const assignedProgramCount = this.programs.filter(p => Boolean(p.trainerId && this.getTrainerById(p.trainerId))).length;
    const unassignedProgramCount = totalPrograms - assignedProgramCount;

    const totalEnrollments = this.programs.reduce(
      (sum, p) => sum + (p.candidateIds ? p.candidateIds.length : 0),
      0
    );

    const enrolledCandidatesSet = new Set();
    this.programs.forEach(p => {
      (p.candidateIds || []).forEach(id => enrolledCandidatesSet.add(id));
    });
    const uniqueEnrolledCandidates = enrolledCandidatesSet.size;

    const categoriesMap = {};
    this.candidates.forEach(c => {
      categoriesMap[c.category] = (categoriesMap[c.category] || 0) + 1;
    });

    return {
      totalCandidates,
      totalPrograms,
      totalTrainers,
      stagePrograms,
      nonStagePrograms,
      assignedProgramCount,
      unassignedProgramCount,
      totalEnrollments,
      uniqueEnrolledCandidates,
      categoriesMap
    };
  }

  // --- DAILY MEET & PROGRESS METHODS ---
  getDailyMeets(dateStr = null) {
    if (!dateStr) return [...this.dailyMeets];
    return this.dailyMeets.filter(m => m.date === dateStr);
  }

  getCandidateMeets(candidateId, dateStr = null) {
    let list = this.dailyMeets.filter(m => m.candidateId === candidateId);
    if (dateStr) {
      list = list.filter(m => m.date === dateStr);
    }
    return list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  recordDailyMeet({ candidateId, trainerId, programId, percentage, remark, dateStr, timeStr }) {
    const session = this.getAuthSession();
    let finalTrainerId = trainerId || null;

    // Strict role-based permission enforcement for trainers
    if (session && session.role === 'trainer') {
      const activeTrainer = session.trainer;
      if (!activeTrainer) {
        throw new Error('Active trainer session not found. Please log in again.');
      }

      // 1. Evaluating trainer is strictly locked to the logged-in trainer
      finalTrainerId = activeTrainer.id;

      // 2. Program selection is mandatory
      if (!programId) {
        throw new Error('Please select an assigned program to record this evaluation.');
      }

      // 3. Program must be assigned to this trainer
      const prog = this.getProgramById(programId);
      if (!prog) {
        throw new Error('Selected program does not exist.');
      }
      if (String(prog.trainerId || '').trim() !== String(activeTrainer.id).trim()) {
        throw new Error(`Unauthorized: Program [${prog.code}] is mentored by another trainer. You only have authority to record meets for programs assigned to you.`);
      }

      // 4. Candidate must be enrolled in this program
      if (!(prog.candidateIds || []).map(id => String(id).trim()).includes(String(candidateId).trim())) {
        throw new Error(`Unauthorized: Candidate is not enrolled in your program [${prog.code}].`);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const targetDate = dateStr || today;

    const existing = this.dailyMeets.filter(
      m => m.candidateId === candidateId && m.date === targetDate
    );
    const meetNumber = existing.length + 1;

    const p = Math.max(0, Math.min(100, Math.round(Number(percentage) || 0)));
    const statusObj = getProgressStatus(p);

    const now = new Date();
    const formattedTime = timeStr || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMeet = {
      id: `meet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      candidateId,
      trainerId: finalTrainerId,
      programId: programId || null,
      date: targetDate,
      meetNumber,
      time: formattedTime,
      timestamp: now.toISOString(),
      percentage: p,
      status: statusObj.label,
      statusKey: statusObj.key,
      remark: String(remark || '').trim()
    };

    this.dailyMeets.unshift(newMeet);
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('dailyMeets', newMeet.id, newMeet).catch(e => console.warn(e));
    }

    return newMeet;
  }

  deleteDailyMeet(id) {
    console.warn(`[Audit Protection] Meeting report ${id} is locked.`);
    return false;
  }

  getCandidateDailyStatus(candidateId, dateStr = null) {
    const candidate = this.getCandidateById(candidateId);
    if (!candidate) return null;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const targetDate = dateStr || todayStr;

    const programs = this.getCandidatePrograms(candidateId);
    const trainerIds = Array.from(new Set(programs.map(p => p.trainerId).filter(Boolean)));
    const trainers = trainerIds.map(tId => this.getTrainerById(tId)).filter(Boolean);

    const meets = this.dailyMeets
      .filter(m => m.candidateId === candidateId && m.date === targetDate)
      .sort((a, b) => a.meetNumber - b.meetNumber);

    // Calculate per-program meeting status
    const programBreakdown = programs.map(prog => {
      const progMeets = meets.filter(m => m.programId === prog.id);
      const isMet = progMeets.length > 0;
      const latestMeet = isMet ? progMeets[progMeets.length - 1] : null;
      const trainer = prog.trainerId ? this.getTrainerById(prog.trainerId) : null;
      return {
        program: prog,
        trainer,
        isMet,
        meets: progMeets,
        meetCount: progMeets.length,
        latestMeet
      };
    });

    const totalPrograms = programs.length;
    const metProgramsCount = programBreakdown.filter(pb => pb.isMet).length;
    const pendingProgramsCount = totalPrograms - metProgramsCount;

    let overallStatus = 'PENDING';
    let statusLabel = 'Pending';
    let statusClass = 'badge-warning';

    const launchDateStr = '2026-10-19'; // System operations officially started yesterday
    const isBeforeLaunch = targetDate < launchDateStr;

    if (totalPrograms === 0) {
      if (meets.length > 0) {
        overallStatus = 'MET';
        statusLabel = `Met (Meet #${meets.length})`;
        statusClass = 'badge-stage';
      } else if (isBeforeLaunch) {
        overallStatus = 'BEFORE_LAUNCH';
        statusLabel = 'Before Launch';
        statusClass = 'badge-neutral';
      } else if (targetDate < todayStr) {
        overallStatus = 'MISSED';
        statusLabel = 'Missed';
        statusClass = 'badge-danger';
      } else {
        overallStatus = 'PENDING';
        statusLabel = 'Pending Check-in';
        statusClass = 'badge-warning';
      }
    } else if (metProgramsCount === totalPrograms) {
      overallStatus = 'MET';
      statusLabel = totalPrograms === 1 ? 'Fully Met (1/1)' : `Fully Met (${metProgramsCount}/${totalPrograms})`;
      statusClass = 'badge-stage';
    } else if (metProgramsCount > 0 && metProgramsCount < totalPrograms) {
      overallStatus = 'PARTIAL';
      statusLabel = `Partial (${metProgramsCount}/${totalPrograms} Met)`;
      statusClass = 'badge-amber';
    } else {
      if (isBeforeLaunch) {
        overallStatus = 'BEFORE_LAUNCH';
        statusLabel = 'Before Launch';
        statusClass = 'badge-neutral';
      } else if (targetDate < todayStr) {
        overallStatus = 'MISSED';
        statusLabel = `Missed (${totalPrograms} Programs)`;
        statusClass = 'badge-danger';
      } else {
        overallStatus = 'PENDING';
        statusLabel = totalPrograms === 1 ? 'Pending Check-in' : `Pending (0/${totalPrograms} Met)`;
        statusClass = 'badge-warning';
      }
    }

    const latestMeet = meets.length > 0 ? meets[meets.length - 1] : null;

    return {
      candidate,
      programs,
      trainers,
      meets,
      meetCount: meets.length,
      programBreakdown,
      totalPrograms,
      metProgramsCount,
      pendingProgramsCount,
      isMet: overallStatus === 'MET',
      isPartiallyMet: overallStatus === 'PARTIAL',
      isPending: overallStatus === 'PENDING',
      isMissed: overallStatus === 'MISSED',
      isBeforeLaunch,
      overallStatus,
      statusLabel,
      statusClass,
      latestMeet,
      targetDate
    };
  }

  getCandidateMenteeDashboardData(candidateId) {
    const candidate = this.getCandidateById(candidateId);
    if (!candidate) return null;

    const dossier = this.getCandidatePerformanceDossier(candidateId);
    const todayStatus = this.getCandidateDailyStatus(candidateId);

    const now = new Date();
    const launchDateStr = '2026-10-19'; // Website operations started from yesterday

    // Build tracking history starting from launch date up to today (up to max 7 days)
    const daysHistory = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      // Only show dates from when the website officially started operations
      if (dStr < launchDateStr) {
        break;
      }

      const statusObj = this.getCandidateDailyStatus(candidateId, dStr);

      let displayDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (i === 0) displayDate = 'Today';
      else if (i === 1) displayDate = 'Yesterday';

      daysHistory.push({
        dateStr: dStr,
        displayDate,
        dayIndex: i,
        isToday: i === 0,
        statusObj
      });
    }

    // Calculate active meeting streak (capped by launch date)
    let streak = 0;
    const startIdx = todayStatus && todayStatus.isMet ? 0 : 1;
    for (let i = startIdx; i < 60; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dStr < launchDateStr) break;
      const hasMeet = this.dailyMeets.some(m => m.candidateId === candidate.id && m.date === dStr);
      if (hasMeet) {
        streak++;
      } else {
        break;
      }
    }

    // Past operational days stats (excluding today)
    const pastDays = daysHistory.slice(1);
    const totalPastDays = pastDays.length;
    const pastMetCount = pastDays.filter(d => d.statusObj && d.statusObj.isMet).length;
    const pastMissedCount = pastDays.filter(d => d.statusObj && d.statusObj.isMissed).length;

    return {
      candidate,
      dossier,
      todayStatus,
      daysHistory,
      streak,
      totalPastDays,
      pastMetCount,
      pastMissedCount,
      launchDateStr
    };
  }

  getDailySummary(dateStr = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = dateStr || todayStr;

    const enrolledSet = new Set();
    this.programs.forEach(p => {
      (p.candidateIds || []).forEach(id => enrolledSet.add(id));
    });
    const enrolledCandidates = Array.from(enrolledSet)
      .map(id => this.getCandidateById(id))
      .filter(Boolean);

    const candidateStatuses = enrolledCandidates.map(c => this.getCandidateDailyStatus(c.id, targetDate));

    const totalScheduled = enrolledCandidates.length;
    const metCandidates = candidateStatuses.filter(s => s && s.isMet);
    const partialCandidates = candidateStatuses.filter(s => s && s.isPartiallyMet);
    const pendingCandidates = candidateStatuses.filter(s => s && s.isPending);
    const missedCandidates = candidateStatuses.filter(s => s && s.isMissed);

    const multiMeetCandidates = candidateStatuses.filter(s => s && s.meetCount > 1);
    const allMeetsForDate = this.getDailyMeets(targetDate);

    const avgScore = allMeetsForDate.length > 0
      ? Math.round(allMeetsForDate.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0) / allMeetsForDate.length)
      : 0;

    return {
      targetDate,
      totalScheduled,
      metCount: metCandidates.length,
      partialCount: partialCandidates.length,
      pendingCount: pendingCandidates.length,
      missedCount: missedCandidates.length,
      multiMeetCount: multiMeetCandidates.length,
      totalMeetsLogged: allMeetsForDate.length,
      avgScore,
      candidateStatuses
    };
  }

  getTrainersDailyReport(dateStr = null) {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = dateStr || todayStr;
    const allTrainers = this.getTrainers();
    const allMeetsForDate = this.getDailyMeets(targetDate);

    const trainerReports = allTrainers.map(trainer => {
      const cleanTid = String(trainer.id).trim();
      const assignedPrograms = this.getTrainerPrograms(cleanTid);

      // Build unique mentee list assigned to this trainer
      const menteeMap = new Map();
      assignedPrograms.forEach(prg => {
        (prg.candidateIds || []).forEach(cid => {
          const cleanCid = String(cid).trim();
          const cand = this.getCandidateById(cleanCid);
          if (cand) {
            if (!menteeMap.has(cleanCid)) {
              menteeMap.set(cleanCid, { candidate: cand, programs: [] });
            }
            menteeMap.get(cleanCid).programs.push(prg);
          }
        });
      });

      // Meets logged by this trainer on targetDate
      const trainerMeetsOnDate = allMeetsForDate.filter(m => 
        String(m.trainerId || '').trim() === cleanTid
      );

      // Mentee-by-mentee status breakdown
      const menteeBreakdown = Array.from(menteeMap.values()).map(item => {
        const c = item.candidate;
        const meetsWithTrainer = trainerMeetsOnDate.filter(m => String(m.candidateId).trim() === String(c.id).trim());
        const isMet = meetsWithTrainer.length > 0;
        const latestMeet = isMet ? meetsWithTrainer[meetsWithTrainer.length - 1] : null;

        return {
          candidate: c,
          programs: item.programs,
          isMet,
          meets: meetsWithTrainer,
          meetCount: meetsWithTrainer.length,
          latestMeet
        };
      });

      const totalMentees = menteeBreakdown.length;
      const metMenteesCount = menteeBreakdown.filter(m => m.isMet).length;
      const pendingMenteesCount = totalMentees - metMenteesCount;
      const totalMeetsLogged = trainerMeetsOnDate.length;
      const avgScore = totalMeetsLogged > 0
        ? Math.round(trainerMeetsOnDate.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0) / totalMeetsLogged)
        : 0;

      // Status determination:
      // Fully Met if all mentees met.
      // Partially Met if some met, some remaining.
      // If 0 met: Missed if after 11:59 pm (targetDate < todayStr), else Pending.
      let status = 'PENDING';
      let statusLabel = 'Pending Check-in';
      let badgeClass = 'badge-warning';

      if (totalMentees === 0) {
        if (totalMeetsLogged > 0) {
          status = 'MET';
          statusLabel = `Active (${totalMeetsLogged} Meets)`;
          badgeClass = 'badge-stage';
        } else {
          status = 'NO_MENTEES';
          statusLabel = 'No Mentees Assigned';
          badgeClass = 'badge-neutral';
        }
      } else if (metMenteesCount === totalMentees) {
        status = 'MET';
        statusLabel = totalMentees === 1 ? 'Fully Met (1/1)' : `Fully Met (${metMenteesCount}/${totalMentees})`;
        badgeClass = 'badge-stage';
      } else if (metMenteesCount > 0 && metMenteesCount < totalMentees) {
        status = 'PARTIAL';
        statusLabel = `Partially Met (${metMenteesCount}/${totalMentees})`;
        badgeClass = 'badge-amber';
      } else {
        if (targetDate < todayStr) {
          status = 'MISSED';
          statusLabel = `Missed (0/${totalMentees} Met)`;
          badgeClass = 'badge-danger';
        } else {
          status = 'PENDING';
          statusLabel = `Pending (0/${totalMentees} Met)`;
          badgeClass = 'badge-warning';
        }
      }

      return {
        trainer,
        programs: assignedPrograms,
        totalPrograms: assignedPrograms.length,
        menteeBreakdown,
        totalMentees,
        metMenteesCount,
        pendingMenteesCount,
        trainerMeetsOnDate,
        totalMeetsLogged,
        avgScore,
        status,
        statusLabel,
        badgeClass,
        isMet: status === 'MET',
        isPartial: status === 'PARTIAL',
        isPending: status === 'PENDING',
        isMissed: status === 'MISSED',
        hasNoMentees: status === 'NO_MENTEES',
        targetDate
      };
    });

    const trainersWithMentees = trainerReports.filter(tr => tr.totalMentees > 0);
    const fullyMetCount = trainerReports.filter(tr => tr.isMet).length;
    const partiallyMetCount = trainerReports.filter(tr => tr.isPartial).length;
    const pendingCount = trainerReports.filter(tr => tr.isPending).length;
    const missedCount = trainerReports.filter(tr => tr.isMissed).length;
    const noMenteesCount = trainerReports.filter(tr => tr.hasNoMentees).length;
    const totalMeetsLogged = allMeetsForDate.length;

    const compliancePct = trainersWithMentees.length > 0
      ? Math.round(((fullyMetCount + partiallyMetCount * 0.5) / trainersWithMentees.length) * 100)
      : 0;

    return {
      targetDate,
      totalTrainers: allTrainers.length,
      trainersWithMenteesCount: trainersWithMentees.length,
      fullyMetCount,
      partiallyMetCount,
      pendingCount,
      missedCount,
      noMenteesCount,
      totalMeetsLogged,
      compliancePct,
      trainerReports
    };
  }

  // --- BACKUP & RESTORE ---
  loadSampleDemoData() {
    this.candidates = [...SAMPLE_DEMO_CANDIDATES];
    this.programs = [...SAMPLE_DEMO_PROGRAMS];
    this.trainers = [...SAMPLE_DEMO_TRAINERS];
    this.dailyMeets = [];
    this.saveState();
  }

  resetToDefaults() {
    this.candidates = [];
    this.programs = [];
    this.trainers = [];
    this.dailyMeets = [];
    this.saveState();
  }

  clearAll() {
    this.candidates = [];
    this.programs = [];
    this.trainers = [];
    this.dailyMeets = [];
    this.saveState();
  }

  exportDataJson() {
    return JSON.stringify(
      {
        candidates: this.candidates,
        programs: this.programs,
        trainers: this.trainers,
        dailyMeets: this.dailyMeets,
        exportDate: new Date().toISOString(),
        version: '2.0'
      },
      null,
      2
    );
  }

  importDataJson(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!Array.isArray(data.candidates) || !Array.isArray(data.programs) || !Array.isArray(data.trainers)) {
        throw new Error('Invalid schema: Missing candidates, programs, or trainers arrays.');
      }
      this.candidates = data.candidates;
      this.programs = data.programs;
      this.trainers = data.trainers;
      this.dailyMeets = Array.isArray(data.dailyMeets) ? data.dailyMeets : [];
      this.saveState();

      if (firebaseService.isInitialized) {
        this.syncAllLocalToCloud().catch(e => console.warn(e));
      }

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- REPORTING & PERFORMANCE DOSSIER METHODS ---
  getCandidatePerformanceDossier(candidateId) {
    const candidate = this.getCandidateById(candidateId);
    if (!candidate) return null;

    const programs = this.getCandidatePrograms(candidateId);
    const allMeets = this.getCandidateMeets(candidateId);

    // Group meets by program
    const programReports = programs.map(prog => {
      const progMeets = allMeets.filter(m => String(m.programId || '').trim() === String(prog.id).trim());
      const trainer = prog.trainerId ? this.getTrainerById(prog.trainerId) : null;
      const meetCount = progMeets.length;
      const isMet = meetCount > 0;
      const latestMeet = isMet ? progMeets[progMeets.length - 1] : null;
      const firstMeet = isMet ? progMeets[0] : null;

      const latestScore = latestMeet ? (Number(latestMeet.percentage) || 0) : 0;
      const firstScore = firstMeet ? (Number(firstMeet.percentage) || 0) : 0;
      const scoreDelta = isMet && progMeets.length > 1 ? latestScore - firstScore : 0;

      const avgScore = isMet
        ? Math.round(progMeets.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0) / meetCount)
        : 0;

      const status = isMet 
        ? getProgressStatus(latestScore) 
        : { label: 'Not Evaluated', key: 'not-evaluated', color: '#64748b', badgeClass: 'badge-neutral' };

      const remarks = progMeets
        .filter(m => m.remark && m.remark.trim())
        .map(m => ({
          text: m.remark.trim(),
          date: m.date,
          time: m.time,
          trainerName: m.trainerId ? (this.getTrainerById(m.trainerId)?.name || 'Trainer') : 'Trainer',
          percentage: m.percentage
        }));

      return {
        program: prog,
        trainer,
        meets: progMeets,
        meetCount,
        isMet,
        latestMeet,
        firstMeet,
        latestScore,
        firstScore,
        scoreDelta,
        avgScore,
        status,
        remarks
      };
    });

    const unassociatedMeets = allMeets.filter(m => !m.programId || !programs.some(p => p.id === m.programId));

    const totalPrograms = programs.length;
    const metProgramsCount = programReports.filter(pr => pr.isMet).length;
    const evaluatedPrograms = programReports.filter(pr => pr.isMet);

    // Overall readiness score
    let overallReadiness = 0;
    let hasEvaluation = false;
    if (evaluatedPrograms.length > 0) {
      overallReadiness = Math.round(
        evaluatedPrograms.reduce((sum, pr) => sum + pr.latestScore, 0) / evaluatedPrograms.length
      );
      hasEvaluation = true;
    } else if (allMeets.length > 0) {
      overallReadiness = Math.round(
        allMeets.reduce((sum, m) => sum + (Number(m.percentage) || 0), 0) / allMeets.length
      );
      hasEvaluation = true;
    }

    const overallStatus = hasEvaluation 
      ? getProgressStatus(overallReadiness)
      : { label: 'Not Evaluated', key: 'not-evaluated', color: '#64748b', badgeClass: 'badge-neutral' };

    const meetingRatePct = totalPrograms > 0 
      ? Math.round((metProgramsCount / totalPrograms) * 100) 
      : (allMeets.length > 0 ? 100 : 0);

    let meetingRateLabel = '0% (No Meets)';
    if (totalPrograms === 0) {
      meetingRateLabel = allMeets.length > 0 ? `${allMeets.length} Meets` : 'No Programs';
    } else if (metProgramsCount === totalPrograms) {
      meetingRateLabel = `100% (${metProgramsCount}/${totalPrograms} All Met)`;
    } else if (metProgramsCount > 0) {
      meetingRateLabel = `${meetingRatePct}% (${metProgramsCount}/${totalPrograms} Partial)`;
    } else {
      meetingRateLabel = `0% (0/${totalPrograms} Met)`;
    }

    // Trajectory & Preparation Momentum
    const latestMeetEver = allMeets.length > 0 ? allMeets[allMeets.length - 1] : null;
    let daysSinceLastMeet = null;
    if (latestMeetEver && latestMeetEver.date) {
      const lastDate = new Date(latestMeetEver.date);
      const diffMs = Date.now() - lastDate.getTime();
      daysSinceLastMeet = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    let momentumKey = 'not-started';
    let momentumLabel = 'Not Started';
    let momentumColor = '#64748b';
    let momentumBadgeClass = 'badge-neutral';
    let momentumDesc = 'No training meets recorded yet.';

    if (allMeets.length === 0) {
      momentumKey = 'not-started';
      momentumLabel = 'Not Started';
      momentumColor = '#64748b';
      momentumBadgeClass = 'badge-neutral';
      momentumDesc = 'Candidate has not checked in for any training session yet.';
    } else if (overallReadiness >= 80 && (daysSinceLastMeet === null || daysSinceLastMeet <= 7)) {
      momentumKey = 'stage-ready';
      momentumLabel = 'Peak Ready & Active';
      momentumColor = '#10b981';
      momentumBadgeClass = 'badge-stage';
      momentumDesc = 'High readiness score with recent check-ins. Well prepared for competition.';
    } else if (overallReadiness >= 65 && (daysSinceLastMeet === null || daysSinceLastMeet <= 7)) {
      momentumKey = 'accelerating';
      momentumLabel = 'Actively Preparing';
      momentumColor = '#3b82f6';
      momentumBadgeClass = 'badge-primary-subtle';
      momentumDesc = 'Consistent attendance and positive scoring trend. Good preparation momentum.';
    } else if (daysSinceLastMeet !== null && daysSinceLastMeet > 7) {
      momentumKey = 'stagnant';
      momentumLabel = 'Needs Intervention';
      momentumColor = '#f59e0b';
      momentumBadgeClass = 'badge-amber';
      momentumDesc = `No check-in recorded for ${daysSinceLastMeet} days. Trainer follow-up needed.`;
    } else if (overallReadiness < 55) {
      momentumKey = 'at-risk';
      momentumLabel = 'Lagging / At Risk';
      momentumColor = '#ef4444';
      momentumBadgeClass = 'badge-danger';
      momentumDesc = 'Readiness score is below benchmark (<55%). Needs focused mentorship.';
    } else {
      momentumKey = 'progressing';
      momentumLabel = 'Steady Progress';
      momentumColor = '#6366f1';
      momentumBadgeClass = 'badge-primary-subtle';
      momentumDesc = 'Candidate is progressing steadily through assigned modules.';
    }

    const allRemarks = allMeets
      .filter(m => m.remark && m.remark.trim())
      .map(m => {
        const prog = m.programId ? this.getProgramById(m.programId) : null;
        const trn = m.trainerId ? this.getTrainerById(m.trainerId) : null;
        return {
          id: m.id,
          text: m.remark.trim(),
          date: m.date,
          time: m.time,
          timestamp: m.timestamp,
          percentage: m.percentage,
          programCode: prog ? prog.code : null,
          programName: prog ? prog.name : 'General',
          trainerName: trn ? trn.name : 'Assigned Trainer',
          trainerPhoto: trn ? trn.photo : null
        };
      })
      .reverse();

    return {
      candidate,
      programs,
      allMeets,
      totalMeets: allMeets.length,
      programReports,
      unassociatedMeets,
      totalPrograms,
      metProgramsCount,
      overallReadiness,
      hasEvaluation,
      overallStatus,
      meetingRatePct,
      meetingRateLabel,
      daysSinceLastMeet,
      latestMeetEver,
      momentumKey,
      momentumLabel,
      momentumColor,
      momentumBadgeClass,
      momentumDesc,
      allRemarks,
      latestRemark: allRemarks.length > 0 ? allRemarks[0] : null
    };
  }

  getCandidateComparisonData(candidateId) {
    const candidate = this.getCandidateById(candidateId);
    if (!candidate) return null;

    const myCategory = normalizeCategory(candidate.category || 'BIDĀYA');
    const myDossier = this.getCandidatePerformanceDossier(candidateId);
    if (!myDossier) return null;

    // All candidates in the same category
    const categoryPeers = this.candidates.filter(c => normalizeCategory(c.category) === myCategory);

    // Calculate performance dossiers for all peers in category
    const now = new Date();
    const launchDateStr = '2026-10-19';

    const peerDossiers = categoryPeers.map(c => {
      const dos = this.getCandidatePerformanceDossier(c.id);
      if (!dos) return null;

      // Compute streak for peer
      let streak = 0;
      for (let i = 0; i < 60; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dStr < launchDateStr) break;
        const hasMeet = this.dailyMeets.some(m => m.candidateId === c.id && m.date === dStr);
        if (hasMeet) streak++;
        else if (i > 0) break;
      }

      return {
        candidate: c,
        dossier: dos,
        overallReadiness: dos.overallReadiness || 0,
        totalMeets: dos.totalMeets || 0,
        programReports: dos.programReports || [],
        streak,
        isCurrent: c.id === candidateId
      };
    }).filter(Boolean);

    // Sort leaderboard by overall readiness desc, then meets desc, then name asc
    peerDossiers.sort((a, b) => {
      if (b.overallReadiness !== a.overallReadiness) {
        return b.overallReadiness - a.overallReadiness;
      }
      if (b.totalMeets !== a.totalMeets) {
        return b.totalMeets - a.totalMeets;
      }
      return a.candidate.name.localeCompare(b.candidate.name);
    });

    // Assign rank to each peer
    peerDossiers.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    const totalInCat = peerDossiers.length;
    const myPeerData = peerDossiers.find(p => p.candidate.id === candidateId) || {
      candidate,
      dossier: myDossier,
      overallReadiness: myDossier.overallReadiness || 0,
      totalMeets: myDossier.totalMeets || 0,
      programReports: myDossier.programReports || [],
      streak: 0,
      rank: 1,
      isCurrent: true
    };

    const myRank = myPeerData.rank;
    const percentile = totalInCat > 1 
      ? Math.round(((totalInCat - myRank) / (totalInCat - 1)) * 100) 
      : 100;

    // Category aggregate metrics
    const catTotalReadiness = peerDossiers.reduce((acc, p) => acc + p.overallReadiness, 0);
    const catAvgReadiness = totalInCat > 0 ? Math.round(catTotalReadiness / totalInCat) : 0;
    const catTopReadiness = peerDossiers.length > 0 ? peerDossiers[0].overallReadiness : 0;

    const catTotalMeets = peerDossiers.reduce((acc, p) => acc + p.totalMeets, 0);
    const catAvgMeets = totalInCat > 0 ? +(catTotalMeets / totalInCat).toFixed(1) : 0;
    const catTopMeets = peerDossiers.length > 0 ? Math.max(...peerDossiers.map(p => p.totalMeets)) : 0;

    const catTotalStreak = peerDossiers.reduce((acc, p) => acc + p.streak, 0);
    const catAvgStreak = totalInCat > 0 ? +(catTotalStreak / totalInCat).toFixed(1) : 0;
    const catTopStreak = peerDossiers.length > 0 ? Math.max(...peerDossiers.map(p => p.streak)) : 0;

    // Program-by-program comparison for all programs enrolled by the candidate
    const programComparisons = myDossier.programReports.map(pr => {
      const prog = pr.program;
      const myScore = pr.latestScore || 0;
      const isMet = pr.isMet;

      // Find all competitor reports for this program across category peers
      const competitors = [];
      peerDossiers.forEach(pd => {
        const match = pd.programReports.find(r => r.program.id === prog.id);
        if (match) {
          competitors.push({
            candidate: pd.candidate,
            score: match.latestScore || 0,
            meets: match.meetCount || 0,
            isMet: match.isMet,
            isCurrent: pd.isCurrent
          });
        }
      });

      const evaluatedCompetitors = competitors.filter(c => c.isMet && c.score > 0);
      const progCompetitorCount = competitors.length;
      const progAvgScore = evaluatedCompetitors.length > 0 
        ? Math.round(evaluatedCompetitors.reduce((acc, c) => acc + c.score, 0) / evaluatedCompetitors.length)
        : (isMet ? myScore : 0);
      const progTopScore = evaluatedCompetitors.length > 0 
        ? Math.max(...evaluatedCompetitors.map(c => c.score))
        : (isMet ? myScore : 0);

      // Rank in program
      competitors.sort((a, b) => b.score - a.score);
      const myProgRank = competitors.findIndex(c => c.isCurrent) + 1;

      const deltaFromAvg = myScore - progAvgScore;
      const isLeader = isMet && myScore >= progTopScore && progTopScore > 0;

      return {
        program: prog,
        myScore,
        myProgRank: myProgRank || 1,
        competitorCount: progCompetitorCount,
        progAvgScore,
        progTopScore,
        deltaFromAvg,
        isLeader,
        isMet,
        status: pr.status
      };
    });

    return {
      candidate,
      myCategory,
      myRank,
      totalInCat,
      percentile,
      myDossier,
      myReadiness: myDossier.overallReadiness || 0,
      myTotalMeets: myDossier.totalMeets || 0,
      myStreak: myPeerData.streak || 0,
      catAvgReadiness,
      catTopReadiness,
      catAvgMeets,
      catTopMeets,
      catAvgStreak,
      catTopStreak,
      peerDossiers,
      programComparisons
    };
  }

  getAllCandidatesReportData() {
    return this.candidates.map(cand => this.getCandidatePerformanceDossier(cand.id)).filter(Boolean);
  }

  getAllTrainersReportData() {
    return this.trainers.map(trn => {
      const assignedPrograms = this.getTrainerPrograms(trn.id);
      const mentees = this.getTrainerMentees(trn.id);
      const readiness = this.getTrainerReadiness(trn.id);

      const allMeets = this.dailyMeets.filter(m => String(m.trainerId || '').trim() === String(trn.id).trim());

      const metMenteeIds = new Set(allMeets.map(m => String(m.candidateId).trim()));
      const uniqueMenteesMetCount = mentees.filter(m => metMenteeIds.has(String(m.id).trim())).length;

      const complianceRate = mentees.length > 0 
        ? Math.round((uniqueMenteesMetCount / mentees.length) * 100) 
        : (allMeets.length > 0 ? 100 : 0);

      const sortedMeets = allMeets.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const latestMeet = sortedMeets.length > 0 ? sortedMeets[0] : null;

      let readyCount = 0;
      let onTrackCount = 0;
      let needsAttentionCount = 0;
      let notEvaluatedCount = 0;

      const readyCandidates = [];
      const onTrackCandidates = [];
      const needsAttentionCandidates = [];
      const notEvaluatedCandidates = [];

      mentees.forEach(cand => {
        const cMeets = this.getCandidateMeets(cand.id);
        const sharedPrograms = assignedPrograms.filter(p => (p.candidateIds || []).some(cid => String(cid).trim() === String(cand.id).trim()));

        if (cMeets && cMeets.length > 0) {
          const trainerMeet = cMeets.slice().reverse().find(m => String(m.trainerId || '').trim() === String(trn.id).trim());
          const latestMeet = trainerMeet || cMeets[cMeets.length - 1];
          const lastScore = Number(latestMeet.percentage) || 0;

          const candInfo = {
            candidate: cand,
            latestScore: lastScore,
            status: getProgressStatus(lastScore),
            latestMeet,
            meetsCount: cMeets.length,
            sharedPrograms
          };

          if (lastScore >= 80) {
            readyCount++;
            readyCandidates.push(candInfo);
          } else if (lastScore >= 60) {
            onTrackCount++;
            onTrackCandidates.push(candInfo);
          } else {
            needsAttentionCount++;
            needsAttentionCandidates.push(candInfo);
          }
        } else {
          notEvaluatedCount++;
          notEvaluatedCandidates.push({
            candidate: cand,
            latestScore: null,
            status: { label: 'Not Evaluated', color: '#64748b', badgeClass: 'badge-neutral' },
            latestMeet: null,
            meetsCount: 0,
            sharedPrograms
          });
        }
      });

      return {
        trainer: trn,
        assignedPrograms,
        programCount: assignedPrograms.length,
        mentees,
        menteeCount: mentees.length,
        allMeets,
        totalMeetsLogged: allMeets.length,
        uniqueMenteesMetCount,
        complianceRate,
        readiness,
        averageReadiness: readiness.hasData ? readiness.percentage : 0,
        latestMeet,
        distribution: {
          readyCount,
          onTrackCount,
          needsAttentionCount,
          notEvaluatedCount,
          readyCandidates,
          onTrackCandidates,
          needsAttentionCandidates,
          notEvaluatedCandidates
        }
      };
    });
  }
}

export const state = new StateService();
