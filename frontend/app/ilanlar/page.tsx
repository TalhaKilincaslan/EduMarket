"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ShoppingBag, Plus, Loader2, Image as ImageIcon, Filter, CheckCircle, ChevronRight, Tags, MessageCircle, Heart, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import NotificationBell from '../components/NotificationBell';

interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  owner_id: number;
  is_featured: boolean;
  status: string;
  is_swappable?: boolean;
  is_bundle?: boolean;
}
const CAMPUS_MAP: Record<string, string[]> = {
  "Boğaziçi Üniversitesi": ["Kuzey Kampüsü", "Güney Kampüsü", "Hisar Kampüsü", "Uçaksavar Kampüsü", "Kandilli Kampüsü"],
  "İstanbul Teknik Üniversitesi": ["Ayazağa Kampüsü", "Gümüşsuyu Kampüsü", "Maçka Kampüsü", "Taşkışla Kampüsü", "Tuzla Kampüsü"],
  "Orta Doğu Teknik Üniversitesi": ["Ankara Kampüsü", "Erdemli Kampüsü"],
  "Yıldız Teknik Üniversitesi": ["Davutpaşa Kampüsü", "Beşiktaş Kampüsü"],
  "Hacettepe Üniversitesi": ["Beytepe Kampüsü", "Sıhhiye Kampüsü"]
};
const CATEGORIES = ['Elektronik', 'Ders Gereçleri', 'Ev Eşyası', 'Kitap', 'Özel Ders', 'Proje Desteği', 'Freelance Hizmet', 'Diğer'];

function ListingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token, logout, loading: authLoading } = useAuth();
  const { hasUnreadMessages } = useChat();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Real-time filter states
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'en_yeni');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user?.university && user?.campus) {
      setSelectedUniversity(user.university);
      setSelectedCampus(user.campus);
    } else {
      setSelectedUniversity('');
      setSelectedCampus('');
    }
  }, [user]);

  useEffect(() => {
    if (user && token) {
      fetch(`${API_URL}/me/favorites/ids`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => setFavoriteIds(new Set(data)))
      .catch(console.error);
    } else {
      setFavoriteIds(new Set());
    }
  }, [user, token]);

  // Debounce search update
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeCategory, sortBy, selectedCampus]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (activeCategory) params.append('category', activeCategory);
      if (searchParams.get('is_featured') === 'true') params.append('is_featured', 'true');
      if (sortBy) params.append('sort_by', sortBy);
      if (selectedCampus) params.append('campus', selectedCampus);

      const res = await fetch(`${API_URL}/products?${params.toString()}`);
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveCategory('');
    setSortBy('en_yeni');
    setSelectedUniversity('');
    setSelectedCampus('');
    router.replace('/ilanlar');
  };

  const toggleFavorite = async (e: React.MouseEvent, productId: number) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    const isFav = favoriteIds.has(productId);
    try {
      const res = await fetch(`${API_URL}/products/${productId}/favorite`, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFavoriteIds(prev => {
          const next = new Set(prev);
          if (isFav) next.delete(productId);
          else next.add(productId);
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen p-8 sm:p-12 max-w-7xl mx-auto">
      {/* Header Strip - Simplified */}
      <header className="mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-8 w-full md:w-auto justify-center md:justify-start">
          <Link href="/" className="flex items-center gap-3 group px-2">
            <div className="relative w-16 h-16 md:w-20 md:h-20">
              <Image
                src="/logo.png"
                fill
                className="object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                alt="EduMarket Logo"
                priority
              />
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-textMuted hover:text-white transition-colors">Ana Sayfa</Link>
            <span className="text-primary font-bold">Tüm İlanlar</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {!authLoading && user ? (
            <>
              <div className="flex items-center gap-3">
              <Link href="/profil" className="flex items-center gap-2 group hidden sm:flex bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center">
                  {user.profile_image_url ? (
                    <img src={`${API_URL}${user.profile_image_url}`} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex flex-col items-start mr-1">
                  <span className="text-xs text-textMuted leading-tight">Profilim</span>
                  <span className="text-sm font-semibold text-white leading-tight">{user.full_name}</span>
                </div>
              </Link>
              <Link href="/mesajlar" className="relative p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors hidden sm:flex" title="Mesajlar">
                 <MessageCircle className="w-5 h-5" />
                 {hasUnreadMessages && (
                   <>
                     <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                     <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f172a]"></span>
                   </>
                 )}
              </Link>
              <NotificationBell />
              <Link href="/ilan-ver" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-blue-300 hover:text-white border border-primary/30 px-5 py-2.5 rounded-full font-medium transition-all whitespace-nowrap">
                <Plus className="w-5 h-5" /> İlan Ver
              </Link>
              </div>
            </>
          ) : !authLoading ? (
            <Link href="/login" className="text-sm font-medium text-textMuted hover:text-white">Giriş Yap</Link>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">

        {/* Left Sidebar Filter Panel */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="glass rounded-3xl p-6 sticky top-8">
            <div className="flex items-center gap-2 text-lg font-bold mb-6 pb-4 border-b border-white/5">
              <Filter className="w-5 h-5 text-primary" />
              Filtreler
              {(searchTerm || activeCategory) && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs font-normal text-textMuted hover:text-red-400"
                >
                  Temizle
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Search Box */}
              <div>
                <label className="text-sm font-medium text-textMuted mb-2 block">Kelime ile Ara</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-textMuted" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Örn: iPhone, Masa"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors hover:bg-white/10"
                  />
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="text-sm font-medium text-textMuted mb-3 flex items-center gap-2">
                  <Tags className="w-4 h-4" /> Kategori
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveCategory('')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === '' ? 'bg-primary border border-primary/50 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
                  >
                    Tüm Kategoriler
                  </button>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === cat ? 'bg-primary border border-primary/50 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-300'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sorting */}
              <div>
                <label className="text-sm font-medium text-textMuted mb-3 flex items-center gap-2">
                  Sıralama
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300 focus:border-primary focus:ring-1 focus:ring-primary transition-colors hover:bg-white/10 appearance-none outline-none"
                >
                  <option value="en_yeni" className="bg-[#0f172a]">En Yeni</option>
                  <option value="fiyat_artan" className="bg-[#0f172a]">Fiyat (Artan)</option>
                  <option value="fiyat_azalan" className="bg-[#0f172a]">Fiyat (Azalan)</option>
                </select>
              </div>

              {/* Kampüs Bazlı Lokalizasyon Filtresi */}
              <div className="border-t border-white/5 pt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-textMuted mb-2 block uppercase tracking-wider">
                    Üniversite Seçin
                  </label>
                  <select
                    value={selectedUniversity}
                    onChange={(e) => {
                      setSelectedUniversity(e.target.value);
                      setSelectedCampus(''); // Reset campus when university changes
                    }}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300 focus:border-primary focus:ring-1 focus:ring-primary transition-colors hover:bg-white/10 appearance-none outline-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0f172a]">Tüm Üniversiteler</option>
                    {Object.keys(CAMPUS_MAP).map(uni => (
                      <option key={uni} value={uni} className="bg-[#0f172a]">{uni}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-textMuted mb-2 block uppercase tracking-wider">
                    Kampüs Seçin
                  </label>
                  <select
                    value={selectedCampus}
                    disabled={!selectedUniversity}
                    onChange={(e) => setSelectedCampus(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-300 focus:border-primary focus:ring-1 focus:ring-primary transition-colors hover:bg-white/10 appearance-none outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-[#0f172a]">Tüm Kampüsler</option>
                    {selectedUniversity && CAMPUS_MAP[selectedUniversity]?.map(camp => (
                      <option key={camp} value={camp} className="bg-[#0f172a]">{camp}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">{activeCategory || 'Tüm İlanlar'}</h2>
            <div className="text-sm text-textMuted bg-white/5 px-3 py-1 rounded-full border border-white/10">
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Yükleniyor...</span>
              ) : (
                <span>{products.length} ürün bulundu</span>
              )}
            </div>
          </div>

          {products.length === 0 && !loading ? (
            <div className="glass rounded-3xl p-12 text-center flex flex-col items-center gap-4">
              <Search className="w-12 h-12 text-textMuted/50" />
              <h3 className="text-xl font-bold text-white mb-2">Sonuç Bulunamadı</h3>
              <p className="text-textMuted">Aradığınız kriterlere uygun ilan bulunmamaktadır. Lütfen filtreleri değiştirerek tekrar deneyin.</p>
              <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Link href={`/products/${product.id}`} key={product.id} className={`glass relative block rounded-2xl overflow-hidden group hover:-translate-y-2 transition-transform duration-300 cursor-pointer ${product.status === 'sold' ? 'opacity-75' : ''}`}>
                  {product.status === 'sold' && (
                    <div className="absolute top-0 left-0 z-20 bg-red-500/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-br-xl shadow-lg border-b border-r border-white/20">
                      SATILDI
                    </div>
                  )}
                  <button 
                    onClick={(e) => toggleFavorite(e, product.id)}
                    className="absolute top-3 right-3 z-20 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-md"
                  >
                    <Heart className={`w-5 h-5 ${favoriteIds.has(product.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                  <div className="h-44 overflow-hidden relative bg-[#1e293b]">
                    {product.image_url ? (
                      <>
                        <img
                          src={`${API_URL}${product.image_url}`}
                          alt={product.title}
                          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 ${product.status === 'sold' ? 'grayscale-[0.5]' : ''}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            e.currentTarget.nextElementSibling?.classList.add('flex');
                          }}
                        />
                        <div className="hidden absolute inset-0 w-full h-full flex-col items-center justify-center bg-primary/5 text-primary/40 transition-transform duration-500 group-hover:scale-105">
                          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                          <span className="text-xs font-medium">Görsel Yok</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-primary/5 text-primary/40 transition-transform duration-500 group-hover:scale-105">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium">Görsel Yok</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] bg-primary/20 text-blue-300 font-bold px-2 py-0.5 rounded uppercase tracking-wider">{product.category}</span>
                      {(product.price === 0 || product.is_swappable) && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-300 font-bold px-2 py-0.5 rounded uppercase tracking-wider">TAKASLIK</span>
                      )}
                      {product.is_bundle && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded uppercase tracking-wider">DAYANIŞMA</span>
                      )}
                    </div>
                    <h4 className="font-semibold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">{product.title}</h4>
                    <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                      {product.price === 0 ? "TAKASLIK" : `${product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <ListingsContent />
    </Suspense>
  );
}
