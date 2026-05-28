"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Geçersiz veya eksik şifre sıfırlama bağlantısı.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Şifre sıfırlanamadı.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Bilinmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 relative">
        <Link href="/login" className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center gap-2 text-textMuted hover:text-white transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Giriş Sayfasına Dön
        </Link>
        <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Geçersiz Bağlantı</h1>
          <p className="text-textMuted mb-6">Şifre sıfırlama tokeni bulunamadı. Lütfen e-postanızdaki bağlantıya tekrar tıklayın.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <Link href="/login" className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center gap-2 text-textMuted hover:text-white transition-colors group">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Giriş Sayfasına Dön
      </Link>

      <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 mb-2">
            Yeni Şifre Belirle
          </h1>
          <p className="text-textMuted">Lütfen hesabınız için yeni bir şifre girin.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 relative z-10">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success ? (
          <div className="text-center relative z-10 space-y-4">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
              <CheckCircle className="w-8 h-8" />
            </div>
            <p className="text-white text-lg font-medium">Şifreniz Başarıyla Sıfırlandı!</p>
            <p className="text-textMuted text-sm">
              Giriş sayfasına yönlendiriliyorsunuz...
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-4" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div className="space-y-2 group">
              <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Yeni Şifre
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Yeni Şifre (Tekrar)
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-primary hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sıfırlanıyor...
                </>
              ) : (
                'Şifreyi Güncelle'
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
