"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Giriş yapılamadı.');
      }

      const data = await res.json();
      login(data.access_token);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Bilinmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <Link href="/" className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center gap-2 text-textMuted hover:text-white transition-colors group">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Geri Dön
      </Link>

      <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative w-48 h-48 mx-auto mb-4 z-10">
          <Image
            src="/logo.png"
            alt="EduMarket Logo"
            fill
            priority
            className="object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
          />
        </div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 mb-2">
            Giriş Yap
          </h1>
          <p className="text-textMuted">EduMarket hesabınıza giriş yapın.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 relative z-10">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div className="space-y-2 group">
            <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> E-posta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
              className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
            />
          </div>

          <div className="space-y-2 group">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Şifre
              </label>
              <Link href="/sifremi-unuttum" className="text-xs font-medium text-primary hover:text-blue-400 transition-colors">
                Şifremi Unuttum
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-textMuted text-sm relative z-10">
          Hesabınız yok mu?{' '}
          <Link href="/register" className="text-primary hover:text-blue-400 font-medium transition-colors">
            Kayıt Olun
          </Link>
        </p>
      </div>
    </main>
  );
}
