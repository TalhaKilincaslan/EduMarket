"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Loader2, User, Star, ArrowLeft, MessageCircle, Package, Shield, Send } from 'lucide-react';
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

export default function PublicProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'ilanlar' | 'degerlendirmeler'>('ilanlar');
  
  // Add Review State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    // If the user tries to view their own profile via ID, redirect to /profil
    if (user && user.id === parseInt(id as string)) {
      router.replace('/profil');
      return;
    }
    
    fetchProfile();
  }, [id, user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${id}`);
      if (res.ok) {
        setProfile(await res.json());
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/login');
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        setShowReviewModal(false);
        fetchProfile(); // reload reviews
      } else {
        const data = await res.json();
        alert(data.detail || "Yorum eklenirken bir hata oluştu");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-3xl font-bold text-red-500">Kullanıcı Bulunamadı</h1>
        <p className="text-textMuted text-lg text-center max-w-md">Aradığınız profil mevcut değil veya silinmiş.</p>
        <button onClick={() => router.back()} className="mt-4 flex items-center gap-2 bg-primary hover:bg-blue-600 px-6 py-3 rounded-xl transition-all text-white font-medium">
          <ArrowLeft className="w-5 h-5" /> Geri Dön
        </button>
      </div>
    );
  }

  const renderStars = (score: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < score ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
    ));
  };

  const renderProductCard = (product: Product) => (
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
      </div>
      <div className="p-4">
        <div className="text-xs text-primary font-medium mb-1 uppercase tracking-wider">{product.category}</div>
        <h4 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{product.title}</h4>
        <div className="text-xl font-bold">{product.price.toLocaleString('tr-TR')} ₺</div>
      </div>
    </Link>
  );

  return (
    <main className="min-h-screen p-6 sm:p-12 max-w-6xl mx-auto">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-6 group">
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Geri Dön
      </button>

      {/* Profile Header */}
      <div className="glass rounded-3xl p-8 mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 z-10 relative">
          <div className="w-32 h-32 rounded-full bg-primary/20 border-4 border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.user.profile_image_url ? (
              <img src={`${API_URL}${profile.user.profile_image_url}`} alt={profile.user.full_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-primary" />
            )}
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
              {profile.user.bio || "Kullanıcı henüz bir biyografi eklememiş."}
            </p>
          </div>
          
          {user && (
            <div className="flex-shrink-0">
              <button 
                onClick={() => setShowReviewModal(true)}
                className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-lg shadow-blue-500/25 flex items-center gap-2"
              >
                <Star className="w-4 h-4 fill-current" /> Değerlendir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 sm:gap-4 mb-8 border-b border-white/10 pb-4">
        <button 
          onClick={() => setActiveTab('ilanlar')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${activeTab === 'ilanlar' ? 'bg-primary text-white' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
        >
          <Package className="w-5 h-5" /> İlanlar ({profile.products.length})
        </button>
        <button 
          onClick={() => setActiveTab('degerlendirmeler')}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${activeTab === 'degerlendirmeler' ? 'bg-primary text-white' : 'text-textMuted hover:bg-white/5 hover:text-white'}`}
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
                <h3 className="text-xl font-bold text-white mb-2">Henüz ilan eklenmemiş</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.products.map(p => renderProductCard(p))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'degerlendirmeler' && (
          <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
            {profile.reviews.length === 0 ? (
              <div className="text-center py-10 text-textMuted">Henüz değerlendirme yapılmamış. İlk değerlendiren siz olun!</div>
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

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-3xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-2">Değerlendir: {profile.user.full_name}</h2>
            <p className="text-textMuted text-sm mb-6">Kullanıcı ile olan deneyiminizi puanlayın.</p>
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-3">Puanınız</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star className={`w-8 h-8 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Yorumunuz</label>
                <textarea 
                  value={comment} 
                  onChange={e => setComment(e.target.value)} 
                  rows={4} 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary resize-none" 
                  placeholder="Deneyiminizi anlatın..."
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowReviewModal(false)} className="px-6 py-2.5 rounded-xl font-medium bg-white/5 hover:bg-white/10 text-white transition-colors">İptal</button>
                <button type="submit" disabled={reviewLoading} className="px-6 py-2.5 rounded-xl font-medium bg-primary hover:bg-blue-600 text-white transition-colors flex items-center gap-2 shadow-lg shadow-primary/25">
                  {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
