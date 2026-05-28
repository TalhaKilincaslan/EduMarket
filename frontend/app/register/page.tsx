"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const CAMPUS_MAP: Record<string, string[]> = {
    "Boğaziçi Üniversitesi": ["Kuzey Kampüsü", "Güney Kampüsü", "Hisar Kampüsü", "Uçaksavar Kampüsü", "Kandilli Kampüsü"],
    "İstanbul Teknik Üniversitesi": ["Ayazağa Kampüsü", "Gümüşsuyu Kampüsü", "Maçka Kampüsü", "Taşkışla Kampüsü", "Tuzla Kampüsü"],
    "Orta Doğu Teknik Üniversitesi": ["Ankara Kampüsü", "Erdemli Kampüsü"],
    "Yıldız Teknik Üniversitesi": ["Davutpaşa Kampüsü", "Beşiktaş Kampüsü"],
    "Hacettepe Üniversitesi": ["Beytepe Kampüsü", "Sıhhiye Kampüsü"]
  };

  const [university, setUniversity] = useState('Boğaziçi Üniversitesi');
  const [campus, setCampus] = useState('Kuzey Kampüsü');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUniversityChange = (u: string) => {
    setUniversity(u);
    setCampus(CAMPUS_MAP[u]?.[0] || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith('.edu') && !emailLower.endsWith('.edu.tr')) {
      setError('Yalnızca geçerli bir üniversite (.edu / .edu.tr) e-posta adresi ile kayıt olunabilir.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
          university: university,
          campus: campus
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Kayıt işlemi başarısız oldu.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/onay-bekliyor?email=${encodeURIComponent(email)}`);
      }, 1500);
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
            Hesap Oluştur
          </h1>
          <p className="text-textMuted">EduMarket ailesine katılın.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 relative z-10">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 relative z-10">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
           <div className="space-y-2 group">
            <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Ad Soyad
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Adınız Soyadınız"
              className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
            />
          </div>

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
            <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Şifre
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 group">
              <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                Üniversite
              </label>
              <select
                value={university}
                onChange={(e) => handleUniversityChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b]/70 border border-white/10 text-white transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                {Object.keys(CAMPUS_MAP).map(uni => (
                  <option key={uni} value={uni} className="bg-[#0f172a]">{uni}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 group">
              <label className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                Kampüs
              </label>
              <select
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#1e293b]/70 border border-white/10 text-white transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                {CAMPUS_MAP[university]?.map(c => (
                  <option key={c} value={c} className="bg-[#0f172a]">{c}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-primary hover:bg-blue-600 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kayıt Ol'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-textMuted text-sm relative z-10">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="text-primary hover:text-blue-400 font-medium transition-colors">
            Giriş Yapın
          </Link>
        </p>
      </div>
    </main>
  );
}
