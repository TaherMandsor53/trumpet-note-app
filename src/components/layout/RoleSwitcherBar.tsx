'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useLoginUserMutation } from '@/store/api/bandApi';
import { setCredentials, setActiveRole } from '@/store/authSlice';
import { Role } from '@/types/band';
import { Shield, Sparkles, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DEMO_PROFILES = [
  {
    label: 'Overall Major',
    role: 'Overall Major' as Role,
    email: 'overall.major@taheriscout.org',
    badge: 'Super Admin',
    color: 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30',
  },
  {
    label: 'Treasurer',
    role: 'Treasurer' as Role,
    email: 'treasurer@taheriscout.org',
    badge: 'Lavajam Finance',
    color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
  },
  {
    label: 'Trumpet Major',
    role: 'Trumpet Major' as Role,
    email: 'trumpet.major@taheriscout.org',
    badge: 'Trumpet Section',
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30',
  },
  {
    label: 'Saxophone Major',
    role: 'Saxophone Major' as Role,
    email: 'sax.major@taheriscout.org',
    badge: 'Sax Section',
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30',
  },
  {
    label: 'SideDrum/BaseDrum Major',
    role: 'SideDrum Major' as Role,
    email: 'sidedrum.major@taheriscout.org',
    badge: 'Drums Section',
    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30',
  },
  {
    label: 'Ali Asgar (Player - Paid)',
    role: 'Band Member / Player' as Role,
    email: 'aliasgar.trumpet@taheriscout.org',
    badge: 'Trumpeter (Paid)',
    color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30',
  },
  {
    label: 'Idris Bhai (Player - Pending)',
    role: 'Band Member / Player' as Role,
    email: 'idris.trumpet@taheriscout.org',
    badge: 'Trumpeter (Pending)',
    color: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30',
  },
];

export function RoleSwitcherBar() {
  const dispatch = useDispatch();
  const currentRole = useSelector((state: RootState) => state.auth.activeRole);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [loginUser, { isLoading }] = useLoginUserMutation();

  const handleSwitch = async (profile: typeof DEMO_PROFILES[0]) => {
    try {
      const res = await loginUser({ email: profile.email }).unwrap();
      dispatch(setCredentials({ user: res.user, token: res.token }));
      dispatch(setActiveRole(res.user.role));
    } catch (err) {
      console.error('Failed to switch demo profile:', err);
    }
  };

  return (
    <div className="w-full bg-card/90 backdrop-blur border-b border-border/80 px-3 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-muted-foreground">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">RBAC Role Switcher:</span>
          <span className="sm:hidden">Role:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full no-scrollbar">
          {DEMO_PROFILES.map((p) => {
            const isSelected =
              currentUser?.email === p.email ||
              (!currentUser && currentRole === p.role);

            return (
              <button
                key={p.email}
                onClick={() => handleSwitch(p)}
                disabled={isLoading}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all shrink-0',
                  p.color,
                  isSelected
                    ? 'ring-2 ring-primary ring-offset-1 font-bold scale-[1.02] shadow-sm'
                    : 'opacity-70 hover:opacity-100'
                )}
              >
                {isSelected && <UserCheck className="w-3 h-3 text-primary" />}
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
