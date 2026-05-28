"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Upload, ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['Elektronik', 'Ders Gereçleri', 'Ev Eşyası', 'Kitap', 'Özel Ders', 'Proje Desteği', 'Freelance Hizmet', 'Diğer'];

export default function EditProductPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [listingType, setListingType] = useState('product');
  const [itemCondition, setItemCondition] = useState('new');
  const [isSwappable, setIsSwappable] = useState(false);
  const [swapDescription, setSwapDescription] = useState('');
  const [isBundle, setIsBundle] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchProduct();
  }, [user, authLoading, id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`http://localhost:8000/products/${id}`);
      if (res.ok) {
        const product = await res.json();
        if (product.owner_id !== user?.id && !user?.is_admin) {
          router.push('/profil');
          return;
        }
        setTitle(product.title);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setCategory(product.category);
        setListingType(product.listing_type || 'product');
        setItemCondition(product.item_condition || 'new');
        setIsSwappable(product.is_swappable || false);
        setSwapDescription(product.swap_description || '');
        setIsBundle(product.is_bundle || false);

        if (product.image_url) {
          setImagePreview(`http://localhost:8000${product.image_url}`);
        }
      } else {
        router.push('/profil');
      }
    } catch (err) {
      console.error(err);
      router.push('/profil');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    
    try {
      let image_url = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const uploadRes = await fetch('http://localhost:8000/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error('Görsel yüklenemedi');
        }
        const uploadData = await uploadRes.json();
        image_url = uploadData.image_url;
      }
      
      const payload: any = {
        title,
        description,
        price: parseFloat(price || '0'),
        category,
        listing_type: listingType,
        item_condition: itemCondition,
        is_swappable: isSwappable,
        swap_description: isSwappable ? swapDescription : "",
        is_bundle: isBundle
      };
      if (image_url) {
        payload.image_url = image_url;
      }
      
      const res = await fetch(`http://localhost:8000/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        router.push('/profil');
      } else {
        const data = await res.json();
        setError(data.detail || 'Bir hata oluştu');
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Link href="/profil" className="inline-flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Profile Dön
        </Link>
        
        <div className="glass rounded-3xl p-8 sm:p-12 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          
          <h1 className="text-3xl font-bold text-white mb-2">İlanı Düzenle</h1>
          <p className="text-textMuted mb-8">İlan bilgilerini aşağıdan güncelleyebilirsiniz.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-zinc-300">İlan Başlığı</label>
                <input 
                  type="text" 
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="Örn: Temiz iPhone 13"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">İlan Türü</label>
                <select 
                  value={listingType}
                  onChange={(e) => setListingType(e.target.value)}
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="product">Ürün (Fiziksel Eşya)</option>
                  <option value="service">Hizmet (Özel Ders, Proje vb.)</option>
                </select>
              </div>

              {listingType === 'product' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Fiziksel Durum</label>
                  <select 
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="new">Yeni (Kutusu Açılmamış/Sıfır)</option>
                    <option value="very_good">Çok İyi (Az Kullanılmış)</option>
                    <option value="good">İyi (Kullanılmış)</option>
                    <option value="fair">Yıpranmış</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Kategori</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Fiyat (₺ veya 0)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Açıklama</label>
              <textarea 
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
                placeholder="İlanınız hakkında detaylı bilgi verin..."
              />
            </div>

            <div className="space-y-4 border-t border-white/10 pt-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_swappable"
                  checked={isSwappable}
                  onChange={(e) => setIsSwappable(e.target.checked)}
                  className="w-5 h-5 rounded bg-[#1e293b]/70 border border-white/10 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <label htmlFor="is_swappable" className="text-sm font-medium text-textMain/80 cursor-pointer">
                  Takas Edilebilir (Bu ilanı başka bir eşya veya hizmetle takas etmek istiyorum)
                </label>
              </div>

              {isSwappable && (
                <div className="space-y-2 pl-8 animate-fadeIn">
                  <label htmlFor="swap_description" className="text-sm font-medium text-textMain/80">
                    Takas Açıklaması
                  </label>
                  <textarea
                    id="swap_description"
                    rows={2}
                    value={swapDescription}
                    onChange={(e) => setSwapDescription(e.target.value)}
                    placeholder="Hangi eşyalarla veya ne tür hizmetlerle takas etmek istediğinizi belirtin..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none placeholder:text-textMuted/50"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_bundle"
                  checked={isBundle}
                  onChange={(e) => setIsBundle(e.target.checked)}
                  className="w-5 h-5 rounded bg-[#1e293b]/70 border border-white/10 text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                />
                <label htmlFor="is_bundle" className="text-sm font-medium text-textMain/80 cursor-pointer">
                  Dayanışma Paketi (Toplu Paket / Mezuniyet Paketi olarak satmak/paylaşmak istiyorum)
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Görsel (İsteğe Bağlı - Yeni görsel seçilmezse eski görsel kalır)</label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-colors ${imagePreview ? 'border-primary/50 bg-primary/5' : 'border-white/10 bg-white/5 group-hover:border-primary/30 group-hover:bg-white/10'}`}>
                  {imagePreview ? (
                    <div className="relative w-full max-w-[200px] aspect-video rounded-lg overflow-hidden border border-white/10">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <Upload className="w-6 h-6 text-textMuted" />
                      </div>
                      <span className="text-sm text-textMuted text-center">Görsel yüklemek için tıklayın veya sürükleyin</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-primary hover:bg-blue-600 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 mt-8 disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
