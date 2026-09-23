'use client';

import React, { useState, useEffect } from 'react';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
} from '@/store/api/bandApi';
import { User, InstrumentSection, Role } from '@/types/band';
import {
  ALL_SECTIONS,
  ALL_18_ROLES,
  JAMAAT_SECTORS,
  SECTION_MAJOR_ALLOWED_ROLES,
  ROLE_DEFAULT_SECTION_MAP,
  isOverallMajor,
  getManagedSection,
  generateCredentialsFromFullName,
} from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import {
  User as UserIcon,
  Copy,
  Check,
  Key,
  Mail,
  Shield,
  MapPin,
  Phone,
  Building,
  Music,
  Lock,
} from 'lucide-react';

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  memberToEdit?: User | null;
  currentSection?: InstrumentSection;
  userRole?: Role;
}

export function MemberModal({
  isOpen,
  onClose,
  onSuccess,
  memberToEdit,
  currentSection: forcedSection,
  userRole = 'Overall Major',
}: MemberModalProps) {
  const isEditing = Boolean(memberToEdit);
  const isOverall = isOverallMajor(userRole);
  const managedSection = getManagedSection(userRole);
  const { toast } = useToast();

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const isSubmitting = isCreating || isUpdating;

  // Determine available roles
  const availableRoles: Role[] = React.useMemo(() => {
    if (isOverall) {
      return ALL_18_ROLES;
    }
    const sectionMajorRoles = SECTION_MAJOR_ALLOWED_ROLES[userRole] || [];
    return sectionMajorRoles.length > 0 ? sectionMajorRoles : ['Band Member / Player'];
  }, [isOverall, userRole]);

  // Form State
  const [itsNumber, setItsNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [jamaat, setJamaat] = useState<string>(JAMAAT_SECTORS[0]);
  const [role, setRole] = useState<Role>(availableRoles[0]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or reset form when modal opens or memberToEdit changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (memberToEdit) {
        setItsNumber(memberToEdit.itsNumber || '');
        setFullName(memberToEdit.name || '');
        setAddress(memberToEdit.address || '');
        setPhone(memberToEdit.phone || '');
        setJamaat(memberToEdit.jamaat || JAMAAT_SECTORS[0]);
        setRole(memberToEdit.role || availableRoles[0]);
        setUsername(memberToEdit.username || memberToEdit.email || '');
        setPassword(memberToEdit.password || '');
      } else {
        setItsNumber('');
        setFullName('');
        setAddress('');
        setPhone('');
        setJamaat(JAMAAT_SECTORS[0]);
        setRole(availableRoles[0]);
        setUsername('');
        setPassword('');
      }
    }
  }, [isOpen, memberToEdit, forcedSection, managedSection, availableRoles]);

  // Automatically generate username and password when Full Name changes (in Add mode, or if fields empty)
  const handleFullNameChange = (val: string) => {
    setFullName(val);
    if (!isEditing || !username || !password) {
      const creds = generateCredentialsFromFullName(val);
      setUsername(creds.username);
      setPassword(creds.password);
    }
  };

  const copyToClipboard = (text: string, field: 'username' | 'password') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    const creds = generateCredentialsFromFullName(fullName);
    const finalUsername = (username || creds.username).trim();
    const finalPassword = (password || creds.password).trim();
    const finalEmail = finalUsername;

    // Derive instrument section automatically from selected role
    const derivedSection: InstrumentSection =
      ROLE_DEFAULT_SECTION_MAP[role] ||
      forcedSection ||
      managedSection ||
      memberToEdit?.section ||
      'Trumpet';

    try {
      if (isEditing && memberToEdit) {
        await updateUser({
          id: memberToEdit.id,
          updates: {
            name: fullName.trim(),
            itsNumber: itsNumber.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            jamaat: jamaat.trim() || undefined,
            section: derivedSection,
            role,
            username: finalUsername,
            email: finalEmail,
            password: finalPassword,
            rank: role,
          },
        }).unwrap();

        if (role.endsWith('Major') && role !== 'Major' && role !== 'Overall Major' && role !== memberToEdit.role) {
          toast.warning(
            'Section Major Reassigned',
            `${fullName.trim()} is now appointed as ${role}. Prior section major transitioned to section member. Both synced to Google Sheets & local Excel.`
          );
        } else {
          toast.success(
            'Member Record Updated',
            `Official details for ${fullName.trim()} have been successfully saved and synced with Google Sheets & local Excel.`
          );
        }
      } else {
        await createUser({
          name: fullName.trim(),
          itsNumber: itsNumber.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          jamaat: jamaat.trim() || undefined,
          section: derivedSection,
          role,
          username: finalUsername,
          email: finalEmail,
          password: finalPassword,
          rank: role,
        }).unwrap();

        toast.success(
          'Member Registered Successfully',
          `${fullName.trim()} has been added to the official band directory and synced to Google Sheets.`
        );
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.message || 'Failed to save member details.';
      setErrorMsg(errMsg);
      toast.error('Registration / Update Error', errMsg);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={open => !open && onClose()}
      contentClassName="w-[calc(100vw-1.5rem)] sm:w-full max-w-xl sm:max-w-2xl md:max-w-3xl border-amber-500/30 bg-[#161311] shadow-2xl p-3.5 sm:p-6 md:p-7 max-h-[92vh] overflow-y-auto flex flex-col min-w-0 box-border"
    >
      <DialogHeader>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <UserIcon className="w-3 h-3 text-amber-400" />
            {isEditing ? 'Member Record Update' : 'Member Registration'}
          </span>
        </div>
        <DialogTitle className="text-xl sm:text-2xl font-serif font-black tracking-tight text-foreground">
          {isEditing ? 'Edit Band Member / Officer' : 'Add Band Member / Officer'}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground mt-0.5">
          {isEditing
            ? `Update official records and access credentials for ${memberToEdit?.name || 'this member'}.`
            : 'Register a new officer or musician into the official band directory and Google Drive sheet.'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-1 text-xs">
        {errorMsg && (
          <Alert variant="destructive" onDismiss={() => setErrorMsg(null)}>
            <AlertTitle>Action Failed</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {/* Row 1: ITS Number & Full Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="font-semibold text-muted-foreground mb-1 block">
              ITS Number
            </label>
            <Input
              value={itsNumber}
              onChange={e => setItsNumber(e.target.value)}
              placeholder="e.g. 40405751"
              maxLength={12}
              className="h-9"
            />
          </div>

          <div>
            <label className="font-semibold text-muted-foreground mb-1 block">
              Full Name <span className="text-amber-500">*</span>
            </label>
            <Input
              value={fullName}
              onChange={e => handleFullNameChange(e.target.value)}
              placeholder="e.g. Murtaza Bhai"
              required
              className="h-9"
            />
          </div>
        </div>

        {/* Row 2: Autogenerated Credentials Display Box */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-amber-500/30 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Autogenerated Band Portal Credentials
            </span>
            <span className="text-[10px] text-amber-200/60 font-mono">
              Format: &lt;firstnameLastname@tsgband.com&gt;
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
            {/* Username Preview */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100">
              <div className="flex items-center gap-2 truncate pr-2">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{username || 'firstnameLastname@tsgband.com'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(username, 'username')}
                className="text-muted-foreground hover:text-amber-400 p-1 shrink-0 transition-colors cursor-pointer"
                title="Copy Username"
              >
                {copiedField === 'username' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Password Preview */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100">
              <div className="flex items-center gap-2 truncate pr-2">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{password || 'firstnamelastname123'}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(password, 'password')}
                className="text-muted-foreground hover:text-amber-400 p-1 shrink-0 transition-colors cursor-pointer"
                title="Copy Password"
              >
                {copiedField === 'password' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Role & Jamaat Sector (Instrument Section removed as role specifies it) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="font-semibold text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" /> Role
            </label>
            <Select
              value={role}
              onChange={e => setRole(e.target.value as Role)}
              options={availableRoles.map(r => ({ value: r, label: r }))}
            />
          </div>

          <div>
            <label className="font-semibold text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" /> Jamaat Sector
            </label>
            <Select
              value={jamaat}
              onChange={e => setJamaat(e.target.value)}
              options={JAMAAT_SECTORS.map(j => ({ value: j, label: j }))}
            />
          </div>
        </div>

        {/* Row 4: Mobile Number & Residential Address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="font-semibold text-muted-foreground mb-1 block flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" /> Mobile Number
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 98200..."
              className="h-9"
            />
          </div>

          <div>
            <label className="font-semibold text-muted-foreground mb-1 block flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" /> Residential Address
            </label>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. Taiyabi Manzil, Thakkar Faliya, Dahod"
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/60 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="gold"
            disabled={isSubmitting}
            className="font-semibold text-xs gap-1.5"
          >
            {isSubmitting
              ? isEditing
                ? 'Saving Changes...'
                : 'Registering Member...'
              : isEditing
              ? 'Update Member'
              : 'Register Member'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
