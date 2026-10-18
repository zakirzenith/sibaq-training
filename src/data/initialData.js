/**
 * Initial Seed Data for MentorFlow Controller Panel
 * Default starting state is completely clean (empty) for real data entry.
 * Demo sample data is preserved separately if user ever chooses "Load Demo Data".
 */

export const INITIAL_TRAINERS = [];
export const INITIAL_CANDIDATES = [];
export const INITIAL_PROGRAMS = [];
export const INITIAL_DAILY_MEETS = [];

export const SAMPLE_DEMO_TRAINERS = [
  {
    id: 'trn-001',
    name: 'Dr. Marcus Vance',
    expertise: 'Classical Performing Arts & Stage Presence',
    experience: '12 Years',
    username: 'marcus',
    password: 'champion2023',
    status: 'Active',
    color: '#8b5cf6',
    createdAt: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 'trn-002',
    name: 'Elena Rostova',
    expertise: 'Elocution, Debate & Public Oratory',
    experience: '9 Years',
    username: 'elena',
    password: 'champion2023',
    status: 'Active',
    color: '#06b6d4',
    createdAt: '2026-09-02T11:30:00.000Z'
  },
  {
    id: 'trn-003',
    name: 'Sarah Jenkins',
    expertise: 'Choral Music, Vocal Acoustics & Symphony',
    experience: '7 Years',
    username: 'sarah',
    password: 'champion2023',
    status: 'Active',
    color: '#ec4899',
    createdAt: '2026-09-05T09:15:00.000Z'
  }
];

export const SAMPLE_DEMO_CANDIDATES = [
  {
    id: 'cnd-101',
    adNo: 'AD-2026-01',
    name: 'Aarav Sharma',
    category: 'Senior',
    class: 'Grade 11-A',
    createdAt: '2026-09-10T08:00:00.000Z'
  },
  {
    id: 'cnd-102',
    adNo: 'AD-2026-02',
    name: 'Chloe Dubois',
    category: 'Senior',
    class: 'Grade 12-B',
    createdAt: '2026-09-10T08:15:00.000Z'
  }
];

export const SAMPLE_DEMO_PROGRAMS = [
  {
    id: 'prg-201',
    code: 'STG-101',
    name: 'Classical Solo Bharatanatyam',
    category: 'Senior',
    type: 'Stage',
    trainerId: 'trn-001',
    candidateIds: ['cnd-101', 'cnd-102'],
    createdAt: '2026-09-12T10:00:00.000Z'
  }
];
