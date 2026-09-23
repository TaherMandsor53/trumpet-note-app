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
  'Major',
  'Treasurer',
  'Trumpet Major',
  'Saxophone Major',
  'Euphonium Major',
  'Trombone Major',
  'Dish Major',
  'SideDrum Major',
  'SideDrum/BaseDrum Major',
  'Instrument Maintainer',
  'Trumpet Member',
  'Euphonium Member',
  'Saxophone Member',
  'Ghugara Member',
  'Trombone Member',
  'Dish Member',
  'Triangle Member',
  'Khanjari Member',
  'BaseDrum Member',
  'SideDrum Member',
  'Band Member / Player',
];

export const ALL_18_ROLES: Role[] = [
  'SideDrum Major',
  'Trumpet Member',
  'Treasurer',
  'Major',
  'Euphonium Member',
  'Saxophone Member',
  'Ghugara Member',
  'Trombone Member',
  'Trombone Major',
  'Dish Major',
  'Instrument Maintainer',
  'BaseDrum Member',
  'Khanjari Member',
  'Euphonium Major',
  'Saxophone Major',
  'Dish Member',
  'Triangle Member',
  'Trumpet Major',
];

export const JAMAAT_SECTORS = [
  'BADRI SECTOR',
  'QUTBI SECTOR',
  'SHUJAI SECTOR',
  'NAJMI SECTOR',
  'EZZY SECTOR',
  'SAIFEE BURHANI SECTOR',
] as const;

export const SECTION_MAJOR_ALLOWED_ROLES: Record<string, Role[]> = {
  'Trumpet Major': ['Trumpet Member'],
  'Saxophone Major': ['Saxophone Member'],
  'Euphonium Major': ['Euphonium Member'],
  'Trombone Major': ['Trombone Member'],
  'Dish Major': ['Dish Member', 'Ghugara Member', 'Triangle Member', 'Khanjari Member'],
  'SideDrum Major': ['SideDrum Member', 'BaseDrum Member'],
  'SideDrum/BaseDrum Major': ['SideDrum Member', 'BaseDrum Member'],
};

export const ROLE_DEFAULT_SECTION_MAP: Partial<Record<Role, InstrumentSection>> = {
  'Trumpet Major': 'Trumpet',
  'Trumpet Member': 'Trumpet',
  'Saxophone Major': 'Saxophone',
  'Saxophone Member': 'Saxophone',
  'Euphonium Major': 'Euphonium',
  'Euphonium Member': 'Euphonium',
  'Trombone Major': 'Trombone',
  'Trombone Member': 'Trombone',
  'Dish Major': 'Dish',
  'Dish Member': 'Dish',
  'Ghugara Member': 'Dish',
  'Triangle Member': 'Dish',
  'Khanjari Member': 'Dish',
  'SideDrum Major': 'SideDrum',
  'SideDrum Member': 'SideDrum',
  'BaseDrum Member': 'SideDrum',
};

export function getSectionMajorRoles(role: Role): Role[] {
  if (isOverallMajor(role)) {
    return ALL_18_ROLES;
  }
  return SECTION_MAJOR_ALLOWED_ROLES[role] || [];
}

/**
 * Autogenerates username and password based on FullName
 * username format: <firstnameLastname@tsgband.com>
 * password format: <firstnamelastname123>
 */
export function generateCredentialsFromFullName(fullName: string): { username: string; password: string } {
  const clean = (fullName || '').trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return { username: '', password: '' };

  const firstName = words[0].toLowerCase();
  let lastName = '';
  if (words.length > 1) {
    const rawLast = words[words.length - 1].toLowerCase();
    lastName = rawLast.charAt(0).toUpperCase() + rawLast.slice(1);
  }

  const username = `${firstName}${lastName}@tsgband.com`;
  const password = `${firstName}${lastName.toLowerCase()}123`;
  return { username, password };
}

/**
 * Checks if the role is the Overall Major (Super Admin)
 */
export function isOverallMajor(role: Role): boolean {
  return role === 'Overall Major' || role === 'Major' || (role as string) === 'Overall Major / Band Commander';
}

/**
 * Checks if the role is Treasurer
 */
export function isTreasurer(role: Role, user?: { name?: string; rank?: string; role?: string } | null): boolean {
  if (role === 'Treasurer') return true;
  if (user) {
    const rankStr = String(user.rank || '').toLowerCase();
    const roleStr = String(user.role || '').toLowerCase();
    const nameStr = String(user.name || '').toUpperCase();
    if (rankStr.includes('treasurer') || roleStr.includes('treasurer')) return true;
    if (nameStr.includes('TAHA MAZHARBHAI KUNDAWALA') || nameStr.includes('HUSAIN JUJARBHAI KUNDAWALA')) return true;
  }
  return false;
}

/**
 * Checks if the role is any Instrument Major
 */
export function isInstrumentMajor(role: Role): boolean {
  return role.endsWith('Major') && !isOverallMajor(role);
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
  return isOverallMajor(role);
}

/**
 * Permission: Can manage players in a specific section
 */
export function canManageSectionUsers(role: Role, targetSection: InstrumentSection, targetRole: Role): boolean {
  if (isOverallMajor(role)) return true;
  
  // Instrument Major can ONLY add/edit/delete allowed roles in their own section
  const managedSection = getManagedSection(role);
  if (managedSection && managedSection === targetSection) {
    const allowedRoles = SECTION_MAJOR_ALLOWED_ROLES[role] || [];
    return allowedRoles.includes(targetRole) || targetRole === 'Band Member / Player';
  }
  
  return false;
}

/**
 * Permission: Lavajam Management access
 * Exclusively restricted to Major (including Overall Major) and Treasurer roles only.
 */
export function canAccessLavajam(role: Role, user?: { name?: string; rank?: string; role?: string } | null): boolean {
  return isOverallMajor(role) || isTreasurer(role, user);
}

/**
 * Permission: Full CRUD access to Lavajam contribution ledger and stats
 */
export function canAccessFullFinancials(role: Role, user?: { name?: string; rank?: string; role?: string } | null): boolean {
  return canAccessLavajam(role, user);
}

/**
 * Permission: Mark practice attendance
 * Exclusively restricted to Overall Major and Majors.
 * All other members (including Section Majors) have view-only access.
 */
export function canMarkAttendance(role: Role): boolean {
  return isOverallMajor(role);
}

/**
 * Permission: View attendance of all members
 * Exclusively restricted to Overall Major and Majors.
 * All other members (including Section Majors) can only view their own particular attendance record.
 */
export function canViewAllAttendance(role: Role): boolean {
  return isOverallMajor(role);
}

/**
 * Permission: View full band attendance analytics reports
 * Exclusively restricted to Overall Major and Majors.
 */
export function canViewAttendanceReports(role: Role): boolean {
  return isOverallMajor(role);
}

/**
 * Permission: Can assign tunes to players
 */
export function canAssignTunes(role: Role, targetSection: InstrumentSection): boolean {
  if (isOverallMajor(role)) return true;
  const managedSection = getManagedSection(role);
  return managedSection === targetSection;
}

/**
 * Permission: Can sync Google Drive
 */
export function canSyncDrive(role: Role): boolean {
  return isOverallMajor(role) || isInstrumentMajor(role);
}

/**
 * Permission: Can import/export Excel rosters
 */
export function canImportExportExcel(role: Role): boolean {
  return isOverallMajor(role) || role === 'Treasurer' || isInstrumentMajor(role);
}

