"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Tag, Loader2, Trash2, Image as ImageIcon, Star, User as UserIcon, CheckCircle, Zap, Award, X, AlertTriangle, Handshake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

interface Product {
  id: number;
  title: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  owner_id: number;
  status: string;
  owner_name?: string;
  owner_image?: string;
  owner_created_at?: string;
  can_review?: boolean;
  owner_sales_count?: number;
  listing_type?: string;
  item_condition?: string;
  is_swappable?: boolean;
  swap_description?: string;
  is_bundle?: boolean;
}

interface PotentialBuyer {
  id: number;
  full_name: string;
  profile_image_url: string | null;
}

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [ownerName, setOwnerName] = useState<string>("Satıcı");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Sell Modal States
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [potentialBuyers, setPotentialBuyers] = useState<PotentialBuyer[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [sellingLoading, setSellingLoading] = useState(false);

  // Offer & Report States
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  
  const [offers, setOffers] = useState<any[]>([]);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<"product" | "user">("product");
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const REPORT_REASONS = [
    "Dolandırıcılık Şüphesi (IBAN isteme, şüpheli link vb.)",
    "Hatalı/Sahte Ürün Bilgisi",
    "Uygunsuz Dil/Taciz",
    "Fiyat Spekülasyonu",
    "Diğer"
  ];

  useEffect(() => {
    const headers: any = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    fetch(`http://localhost:8000/products/${id}`, { headers })
      .then(res => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then(data => {
        setProduct(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch product:", err);
        setError(true);
        setLoading(false);
      });
  }, [id, token]);

  const handleOpenChat = () => {
    if (!user) {
      alert("Mesajlaşmak için giriş yapmalısınız.");
      router.push("/login");
      return;
    }
    if (product) {
      router.push(`/mesajlar?productId=${product.id}&userId=${product.owner_id}`);
    }
  };

  const handleDelete = async () => {
    if (!token) {
      alert("Bu işlem için giriş yapmalısınız.");
      return;
    }
    if (window.confirm("Bu ilanı silmek istediğinize emin misiniz?")) {
      try {
        const res = await fetch(`http://localhost:8000/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          router.push('/');
        } else {
          alert('İlan silinirken bir hata oluştu.');
        }
      } catch (err) {
        console.error("Delete error:", err);
        alert('İlan silinirken bir bağlantı hatası oluştu.');
      }
    }
  };

  const handleMarkAsSold = async () => {
    if (!token || !product) return;
    setLoadingBuyers(true);
    setIsSellModalOpen(true);
    try {
      const res = await fetch(`http://localhost:8000/products/${id}/potential-buyers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setPotentialBuyers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBuyers(false);
    }
  };

  const handleConfirmSell = async (buyerId: number) => {
    setSellingLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/products/${id}/sell`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ buyer_id: buyerId })
      });
      if (res.ok) {
        const updated = await res.json();
        setProduct(updated);
        setIsSellModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSellingLoading(false);
    }
  };

  const calculateActiveSince = (dateStr?: string) => {
    if (!dateStr) return "Yeni Üye";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    
    if (diffMonths === 0) return "Bu ay katıldı";
    if (diffMonths < 12) return `${diffMonths} aydır aktif`;
    const years = Math.floor(diffMonths / 12);
    return `${years} yıldır aktif`;
  };

  useEffect(() => {
    if (user && product && user.id === product.owner_id && token) {
      fetch(`http://localhost:8000/products/${id}/offers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : [])
      .then(data => setOffers(data))
      .catch(console.error);
    }
  }, [product, user, id, token]);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmittingOffer(true);
    try {
      const res = await fetch(`http://localhost:8000/products/${id}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ offer_price: parseFloat(offerPrice) })
      });
      if (res.ok) {
        alert("Teklifiniz satıcıya iletildi!");
        setIsOfferModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.detail || "Teklif gönderilemedi.");
      }
    } catch (err) {
      alert("Bağlantı hatası.");
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/offers/${offerId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Teklif kabul edildi. Ürün satıldı.");
        router.push('/');
      } else {
        const err = await res.json();
        alert(err.detail || "İşlem başarısız.");
      }
    } catch (err) {
      alert("Bağlantı hatası.");
    }
  };

  const handleRejectOffer = async (offerId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/offers/${offerId}/reject`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setOffers(offers.map(o => o.id === offerId ? { ...o, status: 'rejected' } : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !product) return;
    setSubmittingReport(true);
    try {
      const res = await fetch(`http://localhost:8000/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          target_type: reportType,
          target_id: reportType === 'product' ? product.id : product.owner_id,
          reason: reportReason,
          description: reportDesc
        })
      });
      if (res.ok) {
        alert("Şikayetiniz başarıyla alındı ve incelenecektir.");
        setIsReportModalOpen(false);
        setReportReason("");
        setReportDesc("");
      } else {
        alert("Şikayet gönderilemedi.");
      }
    } catch (err) {
      alert("Bağlantı hatası.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !product) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`http://localhost:8000/users/${product.owner_id}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        alert("Değerlendirmeniz başarıyla gönderildi!");
        setRating(0);
        setComment("");
        // Refresh product data
        const updatedRes = await fetch(`http://localhost:8000/products/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const updatedData = await updatedRes.json();
        setProduct(updatedData);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Bir hata oluştu.");
      }
    } catch (err) {
      alert("Bağlantı hatası.");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-3xl font-bold text-red-500">Ürün Bulunamadı</h1>
        <p className="text-textMuted text-lg text-center max-w-md">Aradığınız ürün yayından kaldırılmış veya silinmiş olabilir.</p>
        <button 
          onClick={() => router.back()} 
          className="mt-4 flex items-center gap-2 bg-primary hover:bg-blue-600 px-6 py-3 rounded-xl transition-all text-white font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Geri Dön
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 sm:p-12 max-w-5xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-8 group w-max"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-medium">Geri Dön</span>
      </button>

      <div className="flex flex-col gap-8">
        <div className="glass rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/5 bg-black/20 backdrop-blur-xl relative">
          {product.status === 'sold' && (
            <div className="absolute top-6 left-6 z-10 bg-red-600 text-white px-6 py-2 rounded-full font-bold shadow-xl border-2 border-white/20 animate-pulse">
              SATILDI
            </div>
          )}

          {/* Product Image Area */}
          <div className="w-full md:w-1/2 min-h-[300px] md:min-h-[500px] bg-[#0f172a] relative group overflow-hidden">
            {product.image_url ? (
              <>
                <img 
                  src={`http://localhost:8000${product.image_url}`} 
                  alt={product.title}
                  className="w-full h-full object-cover absolute inset-0 opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    e.currentTarget.nextElementSibling?.classList.add('flex');
                  }}
                />
                <div className="hidden w-full h-full absolute inset-0 flex-col items-center justify-center bg-white/5 opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out">
                  <ImageIcon className="w-16 h-16 text-white/20 mb-4" />
                  <span className="text-white/40 font-medium">Görsel Yok</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-white/5 opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out">
                <ImageIcon className="w-16 h-16 text-white/20 mb-4" />
                <span className="text-white/40 font-medium">Görsel Yok</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0f172a]/90 to-transparent pointer-events-none" />
          </div>

          {/* Product Details Area */}
          <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col">
            <div className="flex flex-wrap gap-2 mb-6">
               <span className="bg-primary/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase border border-primary/30 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {product.category}
               </span>
               
               {product.listing_type === 'service' ? (
                 <span className="bg-cyan-500/20 text-cyan-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase border border-cyan-500/30 flex items-center gap-2">
                    HİZMET
                 </span>
               ) : (
                 <span className="bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase border border-indigo-500/30 flex items-center gap-2">
                    {product.item_condition === 'new' ? 'Sıfır' :
                     product.item_condition === 'very_good' ? 'Çok İyi' :
                     product.item_condition === 'good' ? 'İyi' : 'Yıpranmış'}
                 </span>
               )}

               {(product.price === 0 || product.is_swappable) && (
                 <span className="bg-orange-500/20 text-orange-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase border border-orange-500/30 flex items-center gap-2">
                    TAKASLIK
                 </span>
               )}

               {product.is_bundle && (
                 <span className="bg-purple-500/20 text-purple-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide uppercase border border-purple-500/30 flex items-center gap-2">
                    DAYANIŞMA
                 </span>
               )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight tracking-tight">
              {product.title}
            </h1>

            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 mb-2 inline-block">
              {product.price === 0 ? "ÜCRETSİZ / TAKASLIK" : `${product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`}
            </div>
            
            <div className="flex items-center gap-4 mb-8">
               <button 
                  onClick={() => { setReportType('product'); setIsReportModalOpen(true); }}
                  className="text-xs text-textMuted hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                 <AlertTriangle className="w-4 h-4" /> İlanı Şikayet Et
               </button>
            </div>

            <div className="flex-grow">
              <h3 className="text-xl font-semibold mb-3 text-gray-100 flex items-center gap-2">
                Açıklama
              </h3>
              <p className="text-textMuted leading-relaxed whitespace-pre-wrap text-lg mb-4">
                {product.description || "Bu ilan için detaylı bir açıklama girilmemiş."}
              </p>
              
              {product.is_swappable && product.swap_description && (
                <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <h4 className="text-orange-400 font-semibold text-sm mb-1 uppercase tracking-wide">TAKAS SEÇENEKLERİ</h4>
                  <p className="text-textMain/90 text-sm italic">{product.swap_description}</p>
                </div>
              )}
            </div>

            {/* Seller Information Card */}
            <div 
              onClick={() => router.push(`/profil/${product.owner_id}`)}
              className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-white/10 border-2 border-primary/30 group-hover:border-primary transition-colors">
                  {product.owner_image ? (
                    <img src={`http://localhost:8000${product.owner_image}`} alt={product.owner_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <UserIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{product.owner_name}</h4>
                  <p className="text-textMuted text-sm font-medium">{calculateActiveSince(product.owner_created_at)}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {product.owner_sales_count && product.owner_sales_count >= 5 && (
                      <span className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-yellow-500/20 uppercase tracking-wider">
                        <Award className="w-3 h-3" /> Başarılı Satıcı
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
                      <Zap className="w-3 h-3" /> Hızlı Yanıt
                    </span>
                  </div>
                  <button 
                     onClick={(e) => { e.stopPropagation(); setReportType('user'); setIsReportModalOpen(true); }}
                     className="mt-3 text-xs text-textMuted hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                     <AlertTriangle className="w-3 h-3" /> Satıcıyı Şikayet Et
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-4">
              <div className="flex flex-col gap-4 w-full">
                {(!user || user.id !== product.owner_id) && product.status === 'active' && (
                  <>
                  <button 
                    onClick={handleOpenChat}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-primary hover:from-blue-500 hover:to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 active:translate-y-0"
                  >
                    <MessageCircle className="w-6 h-6" />
                    Satıcıyla Sohbet Et
                  </button>
                  <button 
                    onClick={() => {
                       if (!user) return router.push("/login");
                       setIsOfferModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-lg border border-white/10 transition-all hover:-translate-y-1"
                  >
                    <Handshake className="w-6 h-6" />
                    Teklif Ver
                  </button>
                  </>
                )}
                
                {user && user.id === product.owner_id && (
                  <div className="flex flex-col gap-3">
                    {product.status === 'active' && (
                      <button 
                        onClick={handleMarkAsSold}
                        className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-emerald-500/30 hover:-translate-y-1"
                      >
                        <CheckCircle className="w-6 h-6" />
                        Satıldı Olarak İşaretle
                      </button>
                    )}
                    <button 
                      onClick={handleDelete}
                      className="w-full flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 px-8 py-4 rounded-2xl font-bold text-lg transition-all"
                    >
                      <Trash2 className="w-6 h-6" />
                      İlanı Sil
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Review Form */}
        {user && user.id !== product.owner_id && product.can_review && (
          <div className="glass p-8 rounded-3xl shadow-xl border border-white/5 bg-black/20 backdrop-blur-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              Satıcıyı Değerlendir
            </h3>
            <form onSubmit={handleSubmitReview} className="space-y-6">
              <div>
                <label className="block text-textMuted text-sm font-medium mb-3">Puanınız</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star 
                        className={`w-10 h-10 ${rating >= star ? 'text-yellow-400 fill-yellow-400 shadow-yellow-500/50' : 'text-white/20'} transition-colors`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-textMuted text-sm font-medium mb-3">Yorumunuz</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Satıcıyla olan deneyiminizi paylaşın..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview || rating === 0}
                className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {submittingReview ? <Loader2 className="animate-spin w-6 h-6 mx-auto" /> : "Değerlendirmeyi Gönder"}
              </button>
            </form>
          </div>
        )}

        {/* Received Offers Section for Seller */}
        {user && product && user.id === product.owner_id && offers.length > 0 && (
          <div className="glass p-8 rounded-3xl shadow-xl border border-white/5 bg-black/20 backdrop-blur-xl mt-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Handshake className="w-6 h-6 text-emerald-400" />
              Gelen Teklifler
            </h3>
            <div className="space-y-4">
               {offers.map(offer => (
                  <div key={offer.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                     <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden">
                           {offer.buyer_image ? <img src={`http://localhost:8000${offer.buyer_image}`} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 m-auto mt-2.5 text-white/50" />}
                        </div>
                        <div>
                           <div className="font-bold text-white">{offer.buyer_name}</div>
                           <div className="text-emerald-400 font-bold text-lg">{offer.offer_price.toLocaleString('tr-TR')} ₺</div>
                        </div>
                     </div>
                     <div className="flex gap-2 w-full sm:w-auto">
                        {offer.status === 'pending' ? (
                           <>
                           <button onClick={() => handleAcceptOffer(offer.id)} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors">Kabul Et</button>
                           <button onClick={() => handleRejectOffer(offer.id)} className="flex-1 sm:flex-none px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl font-bold text-sm transition-colors">Reddet</button>
                           </>
                        ) : (
                           <span className={`px-4 py-2 rounded-xl font-bold text-sm ${offer.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {offer.status === 'accepted' ? 'Kabul Edildi' : 'Reddedildi'}
                           </span>
                        )}
                     </div>
                  </div>
               ))}
            </div>
          </div>
        )}
      </div>

      {/* Sell Modal */}
      {isSellModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl relative">
            <button 
              onClick={() => setIsSellModalOpen(false)}
              className="absolute top-6 right-6 text-textMuted hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-2">Kime Satıldı?</h2>
            <p className="text-textMuted text-sm mb-8">Bu ürünü kime sattığınızı seçin. Sadece seçilen alıcı yorum yapabilecektir.</p>
            
            {loadingBuyers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : potentialBuyers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white font-medium mb-2">Potansiyel alıcı bulunamadı.</p>
                <p className="text-textMuted text-sm">Sadece bu ürün için sizinle mesajlaşmış kişiler alıcı olarak seçilebilir.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {potentialBuyers.map(buyer => (
                  <button
                    key={buyer.id}
                    onClick={() => handleConfirmSell(buyer.id)}
                    disabled={sellingLoading}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/20 border border-white/10">
                      {buyer.profile_image_url ? (
                        <img src={`http://localhost:8000${buyer.profile_image_url}`} alt={buyer.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="font-bold text-white group-hover:text-primary transition-colors">{buyer.full_name}</div>
                      <div className="text-xs text-textMuted">Seçmek için tıkla</div>
                    </div>
                    {sellingLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl relative">
            <button onClick={() => setIsOfferModalOpen(false)} className="absolute top-6 right-6 text-textMuted hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Teklif Ver</h2>
            <p className="text-textMuted text-sm mb-6">Satıcıya makul bir teklif sunun.</p>
            <form onSubmit={handleSubmitOffer} className="space-y-4">
              <div>
                 <label className="text-sm font-medium text-textMuted block mb-2">Teklifiniz (₺)</label>
                 <input type="number" min="0" step="0.01" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary" required />
              </div>
              <button type="submit" disabled={submittingOffer} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-all">
                 {submittingOffer ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Teklifi Gönder"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-2xl relative">
            <button onClick={() => setIsReportModalOpen(false)} className="absolute top-6 right-6 text-textMuted hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Şikayet Et</h2>
            <p className="text-textMuted text-sm mb-6">{reportType === 'product' ? 'Bu ilanı' : 'Bu satıcıyı'} neden şikayet ediyorsunuz?</p>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                 <label className="text-sm font-medium text-textMuted block mb-2">Sebep Seçin</label>
                 <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary appearance-none" required>
                    <option value="" disabled>Lütfen bir sebep seçin</option>
                    {REPORT_REASONS.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                 </select>
              </div>
              {reportReason === "Diğer" && (
                 <div>
                    <label className="text-sm font-medium text-textMuted block mb-2">Açıklama</label>
                    <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary min-h-[80px]" required placeholder="Lütfen detayları belirtin..."></textarea>
                 </div>
              )}
              <button type="submit" disabled={submittingReport} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all">
                 {submittingReport ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Şikayeti Gönder"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
