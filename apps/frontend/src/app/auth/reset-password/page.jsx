'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { validatePasswordResetToken, verifyPasswordReset } = useAuth();

  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [token, setToken] = useState(tokenParam);
  const [email, setEmail] = useState(emailParam);

  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam);
    }
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [tokenParam, emailParam]);

  // Validate token on component mount
  useEffect(() => {
    let isMounted = true;

    async function checkToken() {
      if (!token) {
        if (isMounted) {
          setIsValidating(false);
          setTokenValid(false);
          setTokenError('No reset token provided. Please request a new password reset link.');
        }
        return;
      }

      setIsValidating(true);
      setTokenError('');

      try {
        const res = await validatePasswordResetToken(token, email);
        if (isMounted) {
          if (res?.valid) {
            setTokenValid(true);
            if (res.email) setEmail(res.email);
          } else {
            setTokenValid(false);
            setTokenError(res?.message || 'This password reset link is invalid or has expired.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setTokenValid(false);
          setTokenError('Could not validate reset link. Please request a new one.');
        }
      } finally {
        if (isMounted) {
          setIsValidating(false);
        }
      }
    }

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token, email, validatePasswordResetToken]);

  const hasMinLength = newPassword.length >= 6;
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!newPassword || newPassword.length < 6) {
      return setFormError('Password must be at least 6 characters.');
    }

    if (newPassword !== confirmPassword) {
      return setFormError('Passwords do not match.');
    }

    setSubmitting(true);
    try {
      await verifyPasswordReset({
        email,
        token,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(`/auth?resetEmail=${encodeURIComponent(email)}`);
      }, 2500);
    } catch (err) {
      setFormError(err?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 text-xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition shadow-2xs font-normal';

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black text-sm tracking-widest shadow-md">
          DF
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-zinc-900 text-base tracking-tight leading-tight">DealFlow360</span>
          <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase">Identity &amp; Access</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-md w-full p-8 text-zinc-900">
        {/* Loading State */}
        {isValidating && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-sm font-semibold text-zinc-900">Verifying Security Token</h3>
            <p className="text-xs text-zinc-500 mt-1">Validating your reset magic link...</p>
          </div>
        )}

        {/* Invalid or Expired Token */}
        {!isValidating && !tokenValid && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-zinc-900">Reset Link Expired or Invalid</h2>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              {tokenError || 'This password reset link is invalid, has expired, or has already been used.'}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/auth"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition shadow-xs text-center inline-block"
              >
                Request New Reset Link
              </Link>
              <Link
                href="/auth"
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-medium transition text-center inline-block"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* Success State */}
        {!isValidating && tokenValid && success && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-300 text-zinc-900 mx-auto flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-zinc-900">Password Updated Successfully</h2>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              Your account password has been updated. You can now log in using your new credentials.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 font-mono">
              Redirecting to sign in page...
            </div>
            <div className="mt-6">
              <Link
                href={`/auth?email=${encodeURIComponent(email)}`}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition shadow-xs text-center inline-block"
              >
                Sign In Now
              </Link>
            </div>
          </div>
        )}

        {/* Valid Token - Set New Password Form */}
        {!isValidating && tokenValid && !success && (
          <div>
            <div className="pb-4 border-b border-zinc-100 mb-5">
              <h2 className="text-base font-bold text-zinc-900">Set New Password</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Enter and confirm your new account password below.
              </p>
            </div>

            {email && (
              <div className="mb-5 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Account</span>
                  <span className="text-xs font-medium text-zinc-900 font-mono truncate max-w-[220px]">{email}</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200 text-zinc-800">
                  Verified Link
                </span>
              </div>
            )}

            {formError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist (matching signup constraints) */}
              <div className="py-2.5 px-3 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      hasMinLength ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'
                    }`}
                  >
                    {hasMinLength ? '✓' : '•'}
                  </span>
                  <span className={`text-[11px] ${hasMinLength ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
                    Minimum 6 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                      passwordsMatch ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'
                    }`}
                  >
                    {passwordsMatch ? '✓' : '•'}
                  </span>
                  <span className={`text-[11px] ${passwordsMatch ? 'text-zinc-900 font-medium' : 'text-zinc-500'}`}>
                    Passwords must match
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !hasMinLength || !passwordsMatch}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/auth"
                  className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline transition"
                >
                  Cancel and return to sign in
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
