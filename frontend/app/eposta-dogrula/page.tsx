"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

function EpostaDogrulaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Geçersiz doğrulama bağlantısı. Lütfen geçerli bir doğrulama bağlantısı kullanın.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/verify-email?token=${token}`, {
          method: 'POST',
        });
        if (res.ok) {
          setStatus('success');
          // Start countdown redirect
          const interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                router.push('/login');
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          const data = await res.json();
          setStatus('error');
          setErrorMessage(data.detail || 'E-posta doğrulanırken bir hata oluştu.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-lg relative overflow-hidden text-center">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

      {status === 'loading' && (
        <div className="py-8 space-y-6">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
            E-posta Adresiniz Doğrulanıyor...
          </h1>
          <p className="text-textMuted max-w-sm mx-auto leading-relaxed">
            Lütfen bekleyin, hesabınız doğrulanıp aktif ediliyor.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="py-8 space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-12 h-12 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-400">
            E-posta Onaylandı!
          </h1>
          <p className="text-textMuted max-w-sm mx-auto leading-relaxed">
            Hesabınız başarıyla doğrulandı! Giriş yapabilir ve EduMarket ekosistemini kullanmaya başlayabilirsiniz.
          </p>
          <div className="pt-6">
            <p className="text-sm text-textMuted animate-pulse mb-4">
              {countdown} saniye içinde Giriş Yap sayfasına yönlendiriliyorsunuz...
            </p>
            <Link href="/login" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-emerald-600/20 inline-block">
              Hemen Giriş Yap
            </Link>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="py-8 space-y-6">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <AlertTriangle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-red-500">
            Doğrulama Başarısız
          </h1>
          <p className="text-red-400/80 max-w-sm mx-auto leading-relaxed text-sm bg-red-500/5 border border-red-500/10 p-4 rounded-2xl">
            {errorMessage}
          </p>
          <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20">
              Yeniden Kaydol
            </Link>
            <Link href="/" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3 rounded-xl font-medium transition-colors">
              Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EpostaDogrulaPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <Suspense fallback={
        <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-lg text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        </div>
      }>
        <EpostaDogrulaContent />
      </Suspense>
    </main>
  );
}
