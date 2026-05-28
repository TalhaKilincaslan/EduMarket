"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowRight, Server } from 'lucide-react';

function OnayBekliyorContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || 'e-posta adresiniz';

  return (
    <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-lg relative overflow-hidden text-center">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="w-20 h-20 bg-primary/10 border border-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
        <Mail className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 mb-4">
        Doğrulama E-postası Gönderildi!
      </h1>
      
      <p className="text-textMuted mb-6 text-lg leading-relaxed">
        Kayıt işleminin tamamlanması için akademik e-posta adresinizi doğrulamanız gerekmektedir.
      </p>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 text-left">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1">Gönderilen Adres:</span>
        <span className="text-white font-medium text-lg break-all">{email}</span>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 text-left flex gap-3 text-amber-400">
        <Server className="w-6 h-6 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm mb-1">Geliştirici Notu (Terminal Simülasyonu)</h4>
          <p className="text-xs leading-relaxed opacity-90">
            Gerçek bir SMTP e-posta sunucusu kurmak yerine doğrulama bağlantısı **backend terminal loglarına** yazdırılmıştır. Hesabınızı onaylamak için terminaldeki aktivasyon bağlantısına tıklayın veya kopyalayın.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/login" className="bg-primary hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2">
          Giriş Sayfasına Git <ArrowRight className="w-5 h-5" />
        </Link>
        <Link href="/" className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3.5 rounded-xl font-medium transition-all flex items-center justify-center">
          Ana Sayfa
        </Link>
      </div>
    </div>
  );
}

export default function OnayBekliyorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <Suspense fallback={
        <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-lg text-center">
          <div className="animate-pulse text-white/50">Yükleniyor...</div>
        </div>
      }>
        <OnayBekliyorContent />
      </Suspense>
    </main>
  );
}
