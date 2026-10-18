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
        this.candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
        this.programs = (Array.isArray(parsed.programs) ? parsed.programs : []).map(p => ({
          ...p,
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
        id: String(c.id || '').trim()
      }));
      this.saveState();
    });

    const unsubPrograms = firebaseService.subscribe('programs', (items) => {
      this.programs = items.map(p => ({
        ...p,
        id: String(p.id || '').trim(),
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

  getAvailableCategories() {
    const defaultCategories = ['BIDĀYAH', 'ŪLĀ', 'THĀNAWIYYAH', '‘ĀLIYAH', 'KULLIYYAH', 'BIDĀYAH & ŪLĀ'];
    const existing = new Set(defaultCategories);

    (this.programs || []).forEach(p => {
      const cat = String(p.category || '').trim();
      if (cat && !['Senior', 'Junior', 'Sub-Junior', 'General'].includes(cat)) {
        existing.add(cat);
      }
    });

    (this.candidates || []).forEach(c => {
      const cat = String(c.category || '').trim();
      if (cat && !['Senior', 'Junior', 'Sub-Junior', 'General'].includes(cat)) {
        existing.add(cat);
      }
    });

    return Array.from(existing);
  }

  addCandidate(candidateData) {
    const newCandidate = {
      id: candidateData.id ? String(candidateData.id).trim() : `cnd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adNo: String(candidateData.adNo || '').trim(),
      name: String(candidateData.name || '').trim(),
      category: String(candidateData.category || 'General').trim(),
      class: String(candidateData.class || '').trim(),
      createdAt: candidateData.createdAt || new Date().toISOString()
    };

    this.candidates.unshift(newCandidate);
    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('candidates', newCandidate.id, newCandidate).catch(e => console.warn(e));
    }

    return newCandidate;
  }

  updateCandidate(id, updateData) {
    const cleanId = String(id).trim();
    const index = this.candidates.findIndex(c => String(c.id).trim() === cleanId);
    if (index === -1) return null;

    this.candidates[index] = {
      ...this.candidates[index],
      ...updateData,
      adNo: String(updateData.adNo ?? this.candidates[index].adNo).trim(),
      name: String(updateData.name ?? this.candidates[index].name).trim(),
      category: String(updateData.category ?? this.candidates[index].category).trim(),
      class: String(updateData.class ?? this.candidates[index].class).trim()
    };

    this.saveState();

    if (firebaseService.isInitialized) {
      firebaseService.setDoc('candidates', cleanId, this.candidates[index]).catch(e => console.warn(e));
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
            category: String(item.category || this.candidates[existingIndex].category || 'General').trim(),
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
          category: String(item.category || 'General').trim(),
          class: String(item.class || '').trim(),
          createdAt: new Date().toISOString()
        };
        this.candidates.push(newObj);
        newOrUpdated.push(newObj);
        addedCount++;
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
      category: String(programData.category || 'General').trim(),
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
      category: updateData.category ? String(updateData.category).trim() : this.programs[index].category
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
            category: String(item.category || this.programs[existingIndex].category || 'General').trim(),
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
          category: String(item.category || 'General').trim(),
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
      email: updateData.email !== undefined ? String(updateData.email).trim() : (current.email || '')
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

    if (u === 'sibaq' && p === 'champion2023') {
      localStorage.setItem('mentorflow_auth_role', 'controller');
      localStorage.setItem('mentorflow_controller_user', 'sibaq');
      localStorage.setItem('mentorflow_active_portal', 'controller');
      this.clearActiveTrainer();
      return { success: true };
    }

    return { success: false, error: 'Incorrect username or password. Please verify controller credentials.' };
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
    return null;
  }

  logout() {
    localStorage.removeItem('mentorflow_auth_role');
    localStorage.removeItem('mentorflow_auth_trainer_id');
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
      trainerId: trainerId || null,
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

    const todayStr = new Date().toISOString().split('T')[0];
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

    if (totalPrograms === 0) {
      if (meets.length > 0) {
        overallStatus = 'MET';
        statusLabel = `Met (Meet #${meets.length})`;
        statusClass = 'badge-stage';
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
      if (targetDate < todayStr) {
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
      overallStatus,
      statusLabel,
      statusClass,
      latestMeet,
      targetDate
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
}

export const state = new StateService();
