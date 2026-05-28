"use client";

import React, { useState } from 'react';
import { Tag, AlignLeft, Coins, Package, ArrowLeft, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function AddProductPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    listing_type: 'product',
    item_condition: 'new',
    is_swappable: false,
    swap_description: '',
    is_bundle: false
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      setStatus('error');
      setErrorMessage('Lütfen ürün için bir görsel seçin.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      let image_url = null;
      
      // Resim yükleme adımı
      const uploadFormData = new FormData();
      uploadFormData.append('file', imageFile);
      
      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (!uploadRes.ok) {
        throw new Error('Resim yüklenirken bir sunucu hatası oluştu');
      }
      
      const uploadData = await uploadRes.json();
      image_url = uploadData.image_url;

      // Ürün oluşturma adımı
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price || '0'),
          category: formData.category,
          image_url: image_url,
          listing_type: formData.listing_type,
          item_condition: formData.item_condition,
          is_swappable: formData.is_swappable,
          swap_description: formData.is_swappable ? formData.swap_description : "",
          is_bundle: formData.is_bundle
        }),
      });

      if (!response.ok) {
        throw new Error('Ürün eklenirken bir hata oluştu');
      }

      setStatus('success');
      
      // Auto redirect to home page after success
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
    }
  };

  // Auth kalkanı
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 sm:p-12 max-w-4xl mx-auto flex items-center justify-center relative">
      <Link href="/" className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center gap-2 text-textMuted hover:text-white transition-colors">
        <ArrowLeft className="w-5 h-5" />
        Geri Dön
      </Link>
      
      <div className="glass rounded-3xl p-8 sm:p-12 w-full max-w-2xl relative overflow-hidden">
        {/* Subtle glow behind the form */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200 mb-2">
          Yeni İlan Ver
        </h1>
        <p className="text-textMuted mb-8">Ürününüzün veya hizmetinizin detaylarını girerek satmaya/dayanışmaya başlayın.</p>

        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>İlan başarıyla eklendi! Ana sayfaya yönlendiriliyorsunuz...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2 group">
            <label htmlFor="image" className="text-sm font-medium text-textMain/80 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-primary" /> Ürün/Hizmet Görseli
            </label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setImageFile(e.target.files[0]);
                }
              }}
              className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 text-textMuted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-blue-400 hover:file:bg-primary/30 file:cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="listing_type" className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                İlan Türü
              </label>
              <select
                id="listing_type"
                name="listing_type"
                required
                value={formData.listing_type}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-[#1e293b] [&>option]:text-white outline-none cursor-pointer"
              >
                <option value="product">Ürün (Fiziksel Eşya)</option>
                <option value="service">Hizmet (Özel Ders, Proje Desteği vb.)</option>
              </select>
            </div>

            {formData.listing_type === 'product' && (
              <div className="space-y-2">
                <label htmlFor="item_condition" className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                  Fiziksel Durum
                </label>
                <select
                  id="item_condition"
                  name="item_condition"
                  required
                  value={formData.item_condition}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-[#1e293b] [&>option]:text-white outline-none cursor-pointer"
                >
                  <option value="new">Yeni (Kutusu Açılmamış/Sıfır)</option>
                  <option value="very_good">Çok İyi (Az Kullanılmış)</option>
                  <option value="good">İyi (Kullanılmış)</option>
                  <option value="fair">Yıpranmış</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-2 group">
            <label htmlFor="title" className="text-sm font-medium text-textMain/80 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" /> İlan Başlığı
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="Örn: 10 Adımda Advanced Calculus Desteği"
              className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" /> Fiyat (₺ veya 0)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                placeholder="Örn: 45.99 (Ücretsiz/Takas için 0 girin)"
                className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-textMuted/50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium text-textMain/80 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Kategori
              </label>
              <select
                id="category"
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 [&>option]:bg-[#1e293b] [&>option]:text-white appearance-none"
              >
                <option value="" disabled>Kategori seçin</option>
                <option value="Elektronik">Elektronik</option>
                <option value="Ders Gereçleri">Ders Gereçleri</option>
                <option value="Ev Eşyası">Ev Eşyası</option>
                <option value="Kitap">Kitap</option>
                <option value="Özel Ders">Özel Ders</option>
                <option value="Proje Desteği">Proje Desteği</option>
                <option value="Freelance Hizmet">Freelance Hizmet</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-textMain/80 flex items-center gap-2">
              <AlignLeft className="w-4 h-4 text-primary" /> Açıklama (İsteğe bağlı)
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="İlanın durum, içerik, teslim koşulları vb. detayları..."
              className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-textMuted/50"
            />
          </div>

          <div className="space-y-4 border-t border-white/10 pt-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_swappable"
                name="is_swappable"
                checked={formData.is_swappable}
                onChange={handleChange}
                className="w-5 h-5 rounded bg-[#1e293b]/70 border border-white/10 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
              <label htmlFor="is_swappable" className="text-sm font-medium text-textMain/80 cursor-pointer">
                Takas Edilebilir (Bu ilanı başka bir eşya veya hizmetle takas etmek istiyorum)
              </label>
            </div>

            {formData.is_swappable && (
              <div className="space-y-2 pl-8 animate-fadeIn">
                <label htmlFor="swap_description" className="text-sm font-medium text-textMain/80">
                  Takas Açıklaması
                </label>
                <textarea
                  id="swap_description"
                  name="swap_description"
                  rows={2}
                  value={formData.swap_description}
                  onChange={handleChange}
                  placeholder="Hangi eşyalarla veya ne tür hizmetlerle takas etmek istediğinizi belirtin..."
                  className="w-full px-4 py-3 rounded-xl glass-input transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-textMuted/50"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_bundle"
                name="is_bundle"
                checked={formData.is_bundle}
                onChange={handleChange}
                className="w-5 h-5 rounded bg-[#1e293b]/70 border border-white/10 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
              <label htmlFor="is_bundle" className="text-sm font-medium text-textMain/80 cursor-pointer">
                Dayanışma Paketi (Toplu Paket / Mezuniyet Paketi olarak satmak/paylaşmak istiyorum)
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'İlanı Gönder'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
