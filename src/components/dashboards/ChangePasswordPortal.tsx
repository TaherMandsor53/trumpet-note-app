'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  useVerifyCurrentPasswordMutation,
  useChangePasswordMutation,
} from '@/store/api/bandApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Check,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export function ChangePasswordPortal() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { toast } = useToast();

  const [verifyCurrentPassword, { isLoading: isVerifying }] = useVerifyCurrentPasswordMutation();
  const [changePassword, { isLoading: isUpdating }] = useChangePasswordMutation();

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [isCurrentVerified, setIsCurrentVerified] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status and feedback
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState('');

  // Step 1: Verify Current Password against Member Details sheet
  const handleVerifyCurrent = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);

    if (!currentPassword || !currentPassword.trim()) {
      setVerifyError('Please enter your current password.');
      return;
    }

    try {
      const res = await verifyCurrentPassword({ currentPassword: currentPassword.trim() }).unwrap();
      if (res.verified) {
        setIsCurrentVerified(true);
        setVerifiedMessage(res.message || 'Current password verified from Member Details sheet.');
        toast.success('Identity Verified', 'Current password matches Member Details records.');
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.error ||
        'Current password does not match Member Details sheet records. Please try again.';
      setVerifyError(errorMsg);
      toast.error('Verification Failed', errorMsg);
    }
  };

  // Step 2: Submit New Password & Confirm Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);

    if (!newPassword || newPassword.length < 4) {
      const msg = 'New password must be at least 4 characters long.';
      setUpdateError(msg);
      toast.warning('Password Too Short', msg);
      return;
    }

    if (newPassword.trim() === currentPassword.trim()) {
      const msg = 'New password cannot be identical to your current password.';
      setUpdateError(msg);
      toast.warning('Password Unchanged', msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'New password and confirmation password do not match.';
      setUpdateError(msg);
      toast.warning('Password Mismatch', msg);
      return;
    }

    try {
      const res = await changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      }).unwrap();

      const detailMsg =
        res.message ||
        'Password successfully updated in Member Details sheet in Password column.';
      setIsSuccess(true);
      setSuccessDetails(detailMsg);
      toast.success('Password Updated', detailMsg);
    } catch (err: any) {
      const errorMsg =
        err?.data?.error ||
        err?.message ||
        'Failed to update password in Member Details. Please try again.';
      setUpdateError(errorMsg);
      toast.error('Update Failed', errorMsg);
    }
  };

  const handleResetForm = () => {
    setCurrentPassword('');
    setIsCurrentVerified(false);
    setVerifiedMessage('');
    setNewPassword('');
    setConfirmPassword('');
    setVerifyError(null);
    setUpdateError(null);
    setIsSuccess(false);
    setSuccessDetails('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome & Security Banner */}
      <div className="bg-gradient-to-r from-card via-card to-amber-500/10 border border-border p-6 rounded-xl relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Band Credential Security
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground">
              Change Password Portal
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Logged in as: <span className="font-semibold text-foreground">{currentUser?.name}</span> • ITS: <span className="font-mono text-primary font-bold">{currentUser?.itsNumber || '—'}</span> • Role: <span className="font-semibold text-foreground">{currentUser?.role}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs py-1 px-3 border-amber-500/40 text-amber-500 bg-amber-500/10">
              <KeyRound className="w-3.5 h-3.5 mr-1 inline" />
              Member Details Sync
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Password Change Flow */}
      {isSuccess ? (
        /* Success State */
        <Card className="border-2 border-emerald-500/40 bg-emerald-500/5 shadow-md">
          <CardHeader className="text-center pb-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-serif font-bold text-foreground">
              Password Successfully Updated!
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              {successDetails}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md mx-auto text-center text-xs">
            <div className="p-4 rounded-lg bg-card/80 border border-border/80 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Member:</span>
                <span className="font-semibold text-foreground">{currentUser?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target Sheet:</span>
                <span className="font-mono text-primary font-bold">Member Details (Password column)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sync Status:</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Synced to Excel & Google Sheet
                </span>
              </div>
            </div>

            <Button
              onClick={handleResetForm}
              variant="outline"
              className="w-full text-xs font-semibold py-2"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Change Password Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Two-Step Verification & Update Form */
        <div className="grid grid-cols-1 gap-6">
          {/* STEP 1: Verify Current Password Card */}
          <Card className={`border-2 transition-all ${isCurrentVerified ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border shadow-sm'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                    1
                  </span>
                  Verify Current Password
                </CardTitle>
                {isCurrentVerified && (
                  <Badge variant="emerald" className="text-xs py-0.5 px-2.5">
                    <Check className="w-3 h-3 mr-1 inline" /> Verified
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                {isCurrentVerified
                  ? 'Your identity has been authenticated against the Member Details sheet record.'
                  : 'Enter your existing password to verify your account from the Member Details sheet before changing it.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCurrentVerified ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-emerald-500/30 text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Current Password Verified</p>
                      <p className="text-[11px] text-muted-foreground">{verifiedMessage}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                    onClick={() => {
                      setIsCurrentVerified(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleVerifyCurrent} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Current Password</span>
                      <span className="text-[10px] text-muted-foreground">Required</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrent ? 'text' : 'password'}
                        placeholder="Enter current password..."
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (verifyError) setVerifyError(null);
                        }}
                        className="pr-10 text-xs"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {verifyError && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{verifyError}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isVerifying || !currentPassword.trim()}
                    className="w-full text-xs font-semibold py-2"
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Verifying from Member Details...
                      </>
                    ) : (
                      <>
                        Verify Current Password <ArrowRight className="w-3.5 h-3.5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* STEP 2: New Password & Confirm Password Card (Unlocked only after Step 1) */}
          <Card className={`border-2 transition-all ${isCurrentVerified ? 'border-primary/50 shadow-md' : 'border-border/50 opacity-60'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${isCurrentVerified ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    2
                  </span>
                  Set New Password &amp; Confirm
                </CardTitle>
                <Badge variant={isCurrentVerified ? 'outline' : 'secondary'} className="text-xs py-0.5">
                  {isCurrentVerified ? 'Unlocked' : 'Locked (Verify Step 1 First)'}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Once submitted, your new password will be accurately saved to the Password column in the Member Details sheet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isCurrentVerified ? (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>New Password</span>
                      <span className="text-[10px] text-muted-foreground">Min. 4 characters</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showNew ? 'text' : 'password'}
                        placeholder="Enter your new password..."
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (updateError) setUpdateError(null);
                        }}
                        className="pr-10 text-xs"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Confirm New Password</span>
                      {confirmPassword && (
                        <span className={`text-[10px] font-semibold ${newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter your new password..."
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (updateError) setUpdateError(null);
                        }}
                        className="pr-10 text-xs"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {updateError && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{updateError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      type="submit"
                      disabled={isUpdating || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 4}
                      className="flex-1 text-xs font-semibold py-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                          Saving to Member Details Sheet...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5 mr-2" />
                          Update Password in Member Details
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetForm}
                      disabled={isUpdating}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                  <Lock className="w-8 h-8 mx-auto text-muted-foreground/40 mb-1" />
                  <p className="font-semibold text-foreground">Step 2 Locked</p>
                  <p>Please enter and verify your current password in Step 1 above to unlock this section.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
