"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, User, Star, Edit3, Trash2, Heart, MessageCircle, Package, Shield, ArrowLeft, Camera } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: number;
  title: string;
  price: number;
  category: string;
  image_url?: string;
  owner_id: number;
  status: string;
}

interface Review {
  id: number;
  reviewer_name: string;
  reviewer_image: string | null;
  rating: number;
  comment: string;
  timestamp: number;
}

interface ProfileData {
  user: {
    id: number;
    full_name: string;
    bio: string | null;
    profile_image_url: string | null;
    is_admin: boolean;
  };
  products: Product[];
  reviews: Review[];
  average_rating: number;
  review_count: number;
}

export default function MyProfilePage() {
  const { user, token, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ilanlar' | 'favoriler' | 'degerlendirmeler'>('ilanlar');
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Upload States
  const [uploadLoading, setUploadLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [user, token, authLoading]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const [profRes, favRes] = await Promise.all([
        fetch(`${API_URL}/users/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/me/favorites`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (profRes.ok) {
        const data = await profRes.json();
        setProfile(data);
        setEditFullName(data.user.full_name);
        setEditBio(data.user.bio || "");
        setEditAvatarUrl(data.user.profile_image_url || "");
      }
      if (favRes.ok) {
        setFavorites(await favRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Dosya boyutu 5MB'den büyük olamaz.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/users/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        updateUser({ profile_image_url: data.profile_image_url });
        setEditAvatarUrl(data.profile_image_url);
        if (profile) {
          setProfile({
            ...profile,
            user: { ...profile.user, profile_image_url: data.profile_image_url }
          });
        }
      } else {
        const err = await res.json();
        alert(err.detail || "Yükleme başarısız.");
      }
    } catch (err) {
      console.error(err);
      alert("Bağlantı hatası.");
    } finally {
      setUploadLoading(false);
      setImagePreview(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: editFullName,
          bio: editBio,
          profile_image_url: editAvatarUrl
        })
      });
      if (res.ok) {
        setIsEditing(false);
        fetchProfile(); // reload
      } else {
        alert("Profil güncellenirken bir hata oluştu");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteListing = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    if (!confirm("İlanı silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`${API_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
    ));
  };

  const renderProductCard = (product: Product, isFavTab = false) => (
    <Link href={`/products/${product.id}`} key={product.id} className={`glass block rounded-2xl overflow-hidden group hover:-translate-y-2 transition-transform duration-300 cursor-pointer relative ${product.status === 'sold' ? 'opacity-75' : ''}`}>
      {product.status === 'sold' && (
        <div className="absolute top-0 left-0 z-20 bg-red-500/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-br-xl shadow-lg border-b border-r border-white/20">
          SATILDI
        </div>
      )}
      <div className="h-44 overflow-hidden relative bg-[#1e293b]">
        {product.image_url ? (
          <img src={`${API_URL}${product.image_url}`} alt={product.title} className={`w-full h-full object-cover opacity-80 ${product.status === 'sold' ? 'grayscale-[0.5]' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">Görsel Yok</div>
        )}
        {!isFavTab && (
          <div className="absolute top-2 right-2 flex gap-2 z-20">
            <button 
              onClick={(e) => { e.preventDefault(); router.push(`/ilan-duzenle/${product.id}`); }}
              className="p-2 bg-blue-500/80 hover:bg-blue-600 text-white rounded-full transition-colors backdrop-blur-md"
              title="Düzenle"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => handleDeleteListing(e, product.id)}
              className="p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-md"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="text-xs text-primary font-medium mb-1 uppercase tracking-wider">{product.category}</div>
        <h4 className="font-semibold text-lg mb-2 line-clamp-1">{product.title}</h4>
        <div className="text-xl font-bold">{product.price.toLocaleString('tr-TR')} ₺</div>
      </div>
    </Link>
  );

  return (
    <main className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-5 h-5" /> Ana Sayfaya Dön
      </Link>

      {/* Profile Header */}
      <div className="glass rounded-3xl p-8 mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 z-10 relative">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full bg-primary/20 border-4 border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 relative shadow-2xl shadow-primary/20">
              {imagePreview || profile.user.profile_image_url ? (
                <img 
                  src={imagePreview || `${API_URL}${profile.user.profile_image_url}`} 
                  alt={profile.user.full_name} 
                  className={`w-full h-full object-cover transition-opacity duration-300 ${uploadLoading ? 'opacity-50' : 'opacity-100'}`} 
                />
              ) : (
                <User className="w-16 h-16 text-primary" />
              )}
              
              {uploadLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-full shadow-lg border-2 border-[#0f172a] hover:scale-110 active:scale-95 transition-all z-20 group-hover:shadow-primary/50"
              title="Fotoğrafı Değiştir"
            >
              <Camera className="w-5 h-5" />
            </button>
            
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-2">
              {profile.user.full_name}
              {profile.user.is_admin && <span title="Admin"><Shield className="w-5 h-5 text-purple-400" /></span>}
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-1 mb-4">
              {renderStars(Math.round(profile.average_rating))}
              <span className="ml-2 text-sm text-textMuted font-medium">{profile.average_rating.toFixed(1)} ({profile.review_count} Değerlendirme)</span>
            </div>
            <p className="text-textMuted text-lg max-w-2xl whitespace-pre-wrap">
              {profile.user.bio || "Henüz bir biyografi eklenmemiş."}
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full font-medium transition-colors border border-white/10 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Profili Düzenle
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 sm:gap-4 mb-8 overflow-x-auto pb-2">
        <button 
          onClick={() => setActiveTab('ilanlar')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap ${activeTab === 'ilanlar' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'}`}
        >
          <Package className="w-5 h-5" /> İlanlarım ({profile.products.length})
        </button>
        <button 
          onClick={() => setActiveTab('favoriler')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap ${activeTab === 'favoriler' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'}`}
        >
          <Heart className="w-5 h-5" /> Favorilerim ({favorites.length})
        </button>
        <button 
          onClick={() => setActiveTab('degerlendirmeler')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all whitespace-nowrap ${activeTab === 'degerlendirmeler' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'}`}
        >
          <Star className="w-5 h-5" /> Değerlendirmeler ({profile.review_count})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'ilanlar' && (
          <div>
            {profile.products.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center flex flex-col items-center">
                <Package className="w-12 h-12 text-textMuted mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Henüz ilanınız yok</h3>
                <Link href="/ilan-ver" className="text-primary hover:underline mt-2">İlk ilanınızı oluşturun</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.products.map(p => renderProductCard(p, false))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favoriler' && (
          <div>
            {favorites.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center flex flex-col items-center">
                <Heart className="w-12 h-12 text-textMuted mb-4 opacity-50" />
                <h3 className="text-xl font-bold text-white mb-2">Favori ilanınız bulunmuyor</h3>
                <Link href="/ilanlar" className="text-primary hover:underline mt-2">İlanları Keşfet</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map(p => renderProductCard(p, true))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'degerlendirmeler' && (
          <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
            {profile.reviews.length === 0 ? (
              <div className="text-center py-10 text-textMuted">Henüz değerlendirme yapılmamış.</div>
            ) : (
              profile.reviews.map(review => (
                <div key={review.id} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
                        {review.reviewer_image ? (
                          <img src={`${API_URL}${review.reviewer_image}`} alt={review.reviewer_name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{review.reviewer_name}</div>
                        <div className="text-xs text-textMuted">{new Date(review.timestamp * 1000).toLocaleDateString('tr-TR')}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-zinc-300 whitespace-pre-wrap">{review.comment}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-3xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Profili Düzenle</h2>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-textMuted mb-2">Ad Soyad</label>
                <input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-2">Hakkımda (Bio)</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary resize-none" placeholder="Kendinizden bahsedin..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-textMuted mb-2">Profil Fotoğrafı (URL)</label>
                <input type="text" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} placeholder="/static/uploads/..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary" />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2.5 rounded-xl font-medium bg-white/5 hover:bg-white/10 text-white transition-colors">İptal</button>
                <button type="submit" disabled={saveLoading} className="px-6 py-2.5 rounded-xl font-medium bg-primary hover:bg-blue-600 text-white transition-colors flex items-center gap-2">
                  {saveLoading && <Loader2 className="w-4 h-4 animate-spin" />} Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
