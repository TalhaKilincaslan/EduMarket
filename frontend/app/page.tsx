"use client";

import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, TrendingUp, Plus, Loader2, Trash2, Image as ImageIcon, LogOut, Shield, Star, ChevronRight, MessageCircle, Heart, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from './context/AuthContext';
import { useChat } from './context/ChatContext';
import NotificationBell from './components/NotificationBell';

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

export default function Home() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const { hasUnreadMessages } = useChat();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [searchTerm, setSearchTerm] = useState('');
  
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featRes, recRes, bundleRes] = await Promise.all([
          fetch(`${API_URL}/products?is_featured=true`),
          fetch(`${API_URL}/products/recent`),
          fetch(`${API_URL}/products?is_bundle=true`)
        ]);
        if (featRes.ok) setFeaturedProducts(await featRes.json());
        if (recRes.ok) setRecentProducts(await recRes.json());
        if (bundleRes.ok) setBundleProducts(await bundleRes.json());
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/ilanlar?search=${encodeURIComponent(searchTerm)}`);
    } else {
      router.push(`/ilanlar`);
    }
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

  const renderProductCard = (product: Product, featuredStyle = false) => {
    return (
      <Link href={`/products/${product.id}`} key={product.id} className={`block rounded-2xl overflow-hidden group hover:-translate-y-2 transition-transform duration-300 cursor-pointer ${featuredStyle ? 'bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.15)] hover:shadow-[0_0_25px_rgba(234,179,8,0.3)] relative' : 'glass relative'} ${product.status === 'sold' ? 'opacity-75' : ''}`}>
        {featuredStyle && product.status !== 'sold' && (
          <div className="absolute top-0 left-0 z-10 bg-yellow-500 text-black text-xs font-bold px-3 py-1.5 rounded-br-xl flex items-center gap-1">
            <Star className="w-3 h-3 fill-black" /> Öne Çıkan
          </div>
        )}
        {product.status === 'sold' && (
          <div className="absolute top-0 left-0 z-20 bg-red-500/80 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-br-xl shadow-lg border-b border-r border-white/20">
            SATILDI
          </div>
        )}
        <button 
          onClick={(e) => toggleFavorite(e, product.id)}
          className="absolute top-3 right-3 z-20 p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors backdrop-blur-md"
        >
          <Heart className={`w-5 h-5 ${favoriteIds.has(product.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
        <div className="h-48 overflow-hidden relative bg-[#1e293b]">
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
                <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-sm font-medium">Görsel Yok</span>
              </div>
            </>
          ) : (
            <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-primary/5 text-primary/40 transition-transform duration-500 group-hover:scale-105">
              <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
              <span className="text-sm font-medium">Görsel Yok</span>
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${featuredStyle ? 'bg-yellow-500/20 text-yellow-400' : 'bg-primary/20 text-primary'}`}>{product.category}</span>
            {(product.price === 0 || product.is_swappable) && (
              <span className="text-[10px] bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">TAKASLIK</span>
            )}
            {product.is_bundle && (
              <span className="text-[10px] bg-purple-500/20 text-purple-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">DAYANIŞMA</span>
            )}
          </div>
          <h4 className={`font-semibold text-lg mb-2 line-clamp-1 transition-colors ${featuredStyle ? 'group-hover:text-yellow-300' : 'group-hover:text-primary'}`}>{product.title}</h4>
          <div className="flex items-center justify-between mt-4">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
              {product.price === 0 ? "TAKASLIK" : `${product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <main className="min-h-screen p-8 sm:p-12 max-w-7xl mx-auto">
      
      {/* Header & Search */}
      <header className="mb-14 flex flex-col md:flex-row items-center justify-between gap-6">
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

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            <Link href="/ilanlar" className="text-textMuted hover:text-white transition-colors">Tüm İlanlar</Link>
          </nav>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-textMuted group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              className="w-full pl-12 pr-4 py-2.5 rounded-full glass-input transition-all"
              placeholder="İlanlarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          
          {!authLoading && user ? (
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
              <Link href="/mesajlar" className="relative p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-full transition-colors hidden sm:flex" title="Mesajlar">
                 <MessageCircle className="w-5 h-5" />
                 {hasUnreadMessages && (
                   <>
                     <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                     <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f172a]"></span>
                   </>
                 )}
              </Link>
              <NotificationBell />
              <button onClick={logout} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-colors hidden sm:flex" title="Çıkış Yap">
                 <LogOut className="w-5 h-5" />
              </button>
              {user.is_admin && (
                <Link href="/admin" className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white border border-purple-500/30 px-5 py-2.5 rounded-full font-medium transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] whitespace-nowrap hidden md:flex">
                  <Shield className="w-5 h-5" />
                  Admin
                </Link>
              )}
              <Link href="/ilan-ver" className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-blue-300 hover:text-white border border-primary/30 px-6 py-2.5 rounded-full font-medium transition-all whitespace-nowrap hidden md:flex">
                <Plus className="w-5 h-5" />
                İlan Ver
              </Link>
            </div>
          ) : !authLoading ? (
             <div className="flex items-center gap-3">
               <Link href="/login" className="flex items-center gap-2 text-textMuted hover:text-white font-medium transition-colors px-4 py-2">
                 Giriş Yap
               </Link>
               <Link href="/register" className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium shadow-lg shadow-blue-500/25 transition-all whitespace-nowrap hidden sm:flex">
                 Kayıt Ol
               </Link>
             </div>
          ) : (
             <div className="flex items-center gap-3 w-32 justify-center hidden sm:flex">
                 <Loader2 className="w-6 h-6 animate-spin text-primary" />
             </div>
          )}
        </div>
      </header>

      {/* Hero / Banner */}
      <div className="glass rounded-3xl p-8 sm:p-12 mb-14 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-6">
            <TrendingUp className="w-4 h-4" />
            Öğrencilerin Pazaryeri
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
            Kampüsün <span className="text-primary">en iyi fiyatları</span> burada!
          </h2>
          <p className="text-textMuted text-lg mb-8">
            Ders kitapları, elektronik eşyalar ve daha fazlası. Aradığın her şey tek bir platformda.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/ilan-ver" className="inline-block bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-full font-medium transition-colors shadow-lg shadow-blue-500/25">
              Hemen Satışa Başla
            </Link>
            <Link href="/ilanlar" className="inline-block bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3 rounded-full font-medium transition-colors">
              İlanlara Göz At
            </Link>
          </div>
        </div>
        <div className="hidden lg:block w-72 h-72 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 opacity-20 blur-3xl absolute right-12"></div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Dayanışma Paketleri */}
          {bundleProducts.length > 0 && (
            <div className="mb-16 animate-fadeIn">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-semibold flex items-center gap-2 text-purple-400 mb-1">
                    <ShoppingBag className="w-6 h-6 text-purple-400" /> Dayanışma ve Mezuniyet Paketleri
                  </h3>
                  <p className="text-textMuted text-sm">Toplu paketler ve mezuniyet setleri ile öğrenci dayanışmasına destek olun</p>
                </div>
                <Link href="/ilanlar" className="text-sm font-medium text-purple-400 hover:text-purple-300 flex items-center">
                  Tümünü Gör <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {bundleProducts.slice(0, 4).map(product => renderProductCard(product))}
              </div>
            </div>
          )}

          {/* Featured Section */}
          {featuredProducts.length > 0 && (
            <div className="mb-16">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-semibold flex items-center gap-2 text-yellow-500 mb-1">
                    <Star className="w-6 h-6 fill-yellow-500" /> Özel Seçimler
                  </h3>
                  <p className="text-textMuted text-sm">Sizin için öne çıkarılmış en iyi fırsatlar</p>
                </div>
                <Link href="/ilanlar?is_featured=true" className="text-sm font-medium text-yellow-500 hover:text-yellow-400 flex items-center">
                  Tümünü Gör <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.slice(0, 4).map(product => renderProductCard(product, true))}
              </div>
            </div>
          )}

          {/* Recent Products */}
          <div>
            <div className="flex items-end justify-between mb-8">
              <div>
                <h3 className="text-2xl font-semibold mb-1">Son Eklenenler</h3>
                <p className="text-textMuted text-sm">Platforma yeni düşen ilanlar</p>
              </div>
              <Link href="/ilanlar" className="text-sm font-medium text-primary hover:text-blue-400 flex items-center">
                Keşfet <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentProducts.map(product => renderProductCard(product, false))}
            </div>

            {recentProducts.length === 0 && (
              <div className="glass rounded-2xl p-12 text-center flex flex-col items-center gap-4">
                <ShoppingBag className="w-12 h-12 text-textMuted/50" />
                <p className="text-textMuted text-lg font-medium">Henüz ilan eklenmemiş, ilk ilanı sen ver!</p>
                <Link href="/ilan-ver" className="mt-4 bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25">
                  İlan Ekle
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
