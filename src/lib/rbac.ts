import { Role, InstrumentSection, User } from '@/types/band';

/**
 * Mapping of Instrument Major roles to their respective sections
 */
export const MAJOR_TO_SECTION_MAP: Record<string, InstrumentSection> = {
  'Trumpet Major': 'Trumpet',
  'Saxophone Major': 'Saxophone',
  'Euphonium Major': 'Euphonium',
  'Dish Major': 'Dish',
  'SideDrum Major': 'SideDrum',
  'SideDrum/BaseDrum Major': 'SideDrum',
  'Trombone Major': 'Trombone',
};

export const ALL_SECTIONS: InstrumentSection[] = [
  'Trumpet',
  'Saxophone',
  'Euphonium',
  'Trombone',
  'Dish',
  'SideDrum',
];

export const ALL_ROLES: Role[] = [
  'Overall Major',
  'Treasurer',
  'Trumpet Major',
  'Saxophone Major',
  'Euphonium Major',
  'Trombone Major',
  'Dish Major',
  'SideDrum Major',
  'SideDrum/BaseDrum Major',
  'Instrument Maintainer',
  'Band Member / Player',
];

/**
 * Checks if the role is the Overall Major (Super Admin)
 */
export function isOverallMajor(role: Role): boolean {
  return role === 'Overall Major';
}

/**
 * Checks if the role is Treasurer
 */
export function isTreasurer(role: Role): boolean {
  return role === 'Treasurer';
}

/**
 * Checks if the role is any Instrument Major
 */
export function isInstrumentMajor(role: Role): boolean {
  return role.endsWith('Major') && role !== 'Overall Major';
}

/**
 * Returns the section managed by the role, or null
 */
export function getManagedSection(role: Role): InstrumentSection | null {
  return MAJOR_TO_SECTION_MAP[role] || null;
}

/**
 * Permission: Can manage (add/edit/delete) users across ALL sections
 */
export function canManageAllUsers(role: Role): boolean {
  return role === 'Overall Major';
}

/**
 * Permission: Can manage players in a specific section
 */
export function canManageSectionUsers(role: Role, targetSection: InstrumentSection, targetRole: Role): boolean {
  if (role === 'Overall Major') return true;
  
  // Instrument Major can ONLY add/edit/delete 'Band Member / Player' in their own section
  const managedSection = getManagedSection(role);
  if (managedSection && managedSection === targetSection && targetRole === 'Band Member / Player') {
    return true;
  }
  
  return false;
}

/**
 * Permission: Full CRUD access to Lavajam contribution ledger and stats
 */
export function canAccessFullFinancials(role: Role): boolean {
  return role === 'Overall Major' || role === 'Treasurer';
}

/**
 * Permission: Mark practice attendance
 * Exclusively restricted to Overall Major.
 * All other members (including Section Majors) have view-only access.
 */
export function canMarkAttendance(role: Role): boolean {
  return role === 'Overall Major';
}

/**
 * Permission: View attendance of all members
 * Exclusively restricted to Overall Major.
 * All other members (including Section Majors) can only view their own particular attendance record.
 */
export function canViewAllAttendance(role: Role): boolean {
  return role === 'Overall Major';
}

/**
 * Permission: View full band attendance analytics reports
 * Exclusively restricted to Overall Major.
 */
export function canViewAttendanceReports(role: Role): boolean {
  return role === 'Overall Major';
}

/**
 * Permission: Can assign tunes to players
 */
export function canAssignTunes(role: Role, targetSection: InstrumentSection): boolean {
  if (role === 'Overall Major') return true;
  const managedSection = getManagedSection(role);
  return managedSection === targetSection;
}

/**
 * Permission: Can sync Google Drive
 */
export function canSyncDrive(role: Role): boolean {
  return role === 'Overall Major' || isInstrumentMajor(role);
}

/**
 * Permission: Can import/export Excel rosters
 */
export function canImportExportExcel(role: Role): boolean {
  return role === 'Overall Major' || role === 'Treasurer' || isInstrumentMajor(role);
}
