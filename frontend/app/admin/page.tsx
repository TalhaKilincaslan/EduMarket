"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Shield, Users, Package, Trash2, ArrowLeft, CheckCircle, AlertCircle, Star, MessageCircle, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

interface ChatData {
  product_id: number;
  product_title: string;
  user1_id: number;
  user1_name: string;
  user2_id: number;
  user2_name: string;
  last_message: string;
  last_timestamp: number;
}

interface UserData {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface ProductData {
  id: number;
  title: string;
  price: number;
  category: string;
  owner_id: number;
  is_featured: boolean;
}

export default function AdminDashboard() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'chats' | 'reports'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [chats, setChats] = useState<ChatData[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [selectedChat, setSelectedChat] = useState<{product_id: number, user1_id: number, user2_id: number, product_title: string, user1_name: string, user2_name: string} | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Aksiyon Al Modalı Durumları
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'chat_ban' | 'global_ban' | 'warning'>('chat_ban');
  const [actionReason, setActionReason] = useState('');
  const [actionDurationMinutes, setActionDurationMinutes] = useState<string>('60');
  const [actionLoading, setActionLoading] = useState(false);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !token) return;
    setActionLoading(true);
    try {
      const targetUserId = selectedReport.target_user_id;
      const res = await fetch(`http://localhost:8000/admin/users/${targetUserId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action_type: actionType,
          duration_minutes: actionType === 'warning' ? 0 : parseInt(actionDurationMinutes || '0'),
          reason: actionReason,
          report_id: selectedReport.id
        })
      });

      if (res.ok) {
        showNotification('success', 'Kullanıcıya başarıyla aksiyon uygulandı ve rapor çözüldü.');
        fetchData();
        setSelectedReport(null);
        setActionReason('');
        setActionDurationMinutes('60');
      } else {
        const errorData = await res.json();
        showNotification('error', errorData.detail || 'Aksiyon uygulanırken hata oluştu.');
      }
    } catch (err) {
      showNotification('error', 'Bağlantı hatası oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.is_admin) {
        router.push('/');
      } else {
        fetchData();
      }
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!token) return;
    setDataLoading(true);
    try {
      const [usersRes, productsRes, chatsRes, reportsRes] = await Promise.all([
        fetch('http://localhost:8000/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/products'),
        fetch('http://localhost:8000/admin/chats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/admin/reports', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (chatsRes.ok) setChats(await chatsRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
    } catch (error) {
      console.error("Failed to fetch admin data", error);
    }
    setDataLoading(false);
  };

  const loadChatHistory = async (chat: ChatData) => {
    setSelectedChat(chat);
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/admin/chats/${chat.product_id}/${chat.user1_id}/${chat.user2_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setChatHistory(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
    setHistoryLoading(false);
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm('Bu mesajı kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`http://localhost:8000/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('success', 'Mesaj başarıyla silindi.');
        setChatHistory(prev => prev.filter(m => m.id !== messageId));
      } else {
        showNotification('error', 'Mesaj silinemedi.');
      }
    } catch (err) {
      showNotification('error', 'Bağlantı hatası.');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (userId === user?.id) {
      showNotification('error', 'Kendi hesabınızı silemezsiniz.');
      return;
    }
    if (!window.confirm('Bu kullanıcıyı ve tüm ilanlarını silmek istediğinize emin misiniz?')) return;
    
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
        // Also remove their products from local state to reflect UI instantly
        setProducts(products.filter(p => p.owner_id !== userId));
        showNotification('success', 'Kullanıcı ve ilanları başarıyla silindi.');
      } else {
        showNotification('error', 'Kullanıcı silinemedi.');
      }
    } catch (err) {
      showNotification('error', 'Bağlantı hatası.');
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
    
    try {
      const res = await fetch(`http://localhost:8000/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== productId));
        showNotification('success', 'İlan başarıyla silindi.');
      } else {
        showNotification('error', 'İlan silinemedi.');
      }
    } catch (err) {
      showNotification('error', 'Bağlantı hatası.');
    }
  };

  const handleResolveReport = async (reportId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/admin/reports/${reportId}/resolve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showNotification('success', 'Rapor çözüldü olarak işaretlendi.');
        setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      } else {
        showNotification('error', 'İşlem başarısız oldu.');
      }
    } catch (err) {
      showNotification('error', 'Bağlantı hatası.');
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleFeature = async (productId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/admin/products/${productId}/feature`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(products.map(p => p.id === productId ? { ...p, is_featured: data.is_featured } : p));
        showNotification('success', data.is_featured ? 'İlan öne çıkarıldı!' : 'İlan öne çıkarılanlardan kaldırıldı.');
      } else {
        showNotification('error', 'İşlem başarısız oldu.');
      }
    } catch (err) {
      showNotification('error', 'Bağlantı hatası.');
    }
  };

  if (authLoading || dataLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 sm:p-12 max-w-7xl mx-auto relative">
      <Link href="/" className="inline-flex items-center gap-2 text-textMuted hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-5 h-5" />
        Ana Sayfaya Dön
      </Link>

      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 bg-purple-600/20 rounded-2xl border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          <Shield className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
            Yönetim Paneli
          </h1>
          <p className="text-textMuted">EduMarket sistemini ve içeriklerini yönetin</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'users' 
            ? 'bg-purple-600/30 border border-purple-500/40 text-white shadow-lg shadow-purple-500/20' 
            : 'bg-primary/5 hover:bg-primary/10 border border-primary/10 text-textMuted hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          Kullanıcılar ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'products' 
            ? 'bg-purple-600/30 border border-purple-500/40 text-white shadow-lg shadow-purple-500/20' 
            : 'bg-primary/5 hover:bg-primary/10 border border-primary/10 text-textMuted hover:text-white'
          }`}
        >
          <Package className="w-5 h-5" />
          Tüm İlanlar ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('chats')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'chats' 
            ? 'bg-purple-600/30 border border-purple-500/40 text-white shadow-lg shadow-purple-500/20' 
            : 'bg-primary/5 hover:bg-primary/10 border border-primary/10 text-textMuted hover:text-white'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          Mesaj Denetimi ({chats.length})
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'reports' 
            ? 'bg-purple-600/30 border border-purple-500/40 text-white shadow-lg shadow-purple-500/20' 
            : 'bg-primary/5 hover:bg-primary/10 border border-primary/10 text-textMuted hover:text-white'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          Raporlar ({reports.filter(r => r.status === 'pending').length})
        </button>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
          notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p>{notification.message}</p>
        </div>
      )}

      {/* Data Container */}
      <div className="glass rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        {activeTab === 'users' && (
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-textMuted">
                  <th className="pb-4 font-medium">ID</th>
                  <th className="pb-4 font-medium">Ad Soyad</th>
                  <th className="pb-4 font-medium">E-posta</th>
                  <th className="pb-4 font-medium">Rol</th>
                  <th className="pb-4 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 text-textMuted">#{u.id}</td>
                    <td className="py-4 font-medium">{u.full_name}</td>
                    <td className="py-4 text-textMuted">{u.email}</td>
                    <td className="py-4">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/30">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 text-xs font-medium border border-blue-500/20">
                          <Users className="w-3 h-3" /> Üye
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {u.id !== user.id && (
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors inline-block"
                          title="Kullanıcıyı Sil"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <div className="text-center py-10 text-textMuted">Sistemde kullanıcı bulunmuyor.</div>}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-textMuted">
                  <th className="pb-4 font-medium">ID</th>
                  <th className="pb-4 font-medium">İlan Başlığı</th>
                  <th className="pb-4 font-medium">Kategori</th>
                  <th className="pb-4 font-medium">Fiyat</th>
                  <th className="pb-4 font-medium">Sahibi (ID)</th>
                  <th className="pb-4 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 text-textMuted">#{p.id}</td>
                    <td className="py-4 font-medium">{p.title}</td>
                    <td className="py-4 text-textMuted">{p.category}</td>
                    <td className="py-4 font-bold text-white">{p.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                    <td className="py-4 text-textMuted">#{p.owner_id}</td>
                    <td className="py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleToggleFeature(p.id)}
                          className={`p-2 rounded-lg transition-colors inline-block ${p.is_featured ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : 'bg-white/5 text-textMuted hover:bg-white/10 hover:text-white'}`}
                          title={p.is_featured ? "Öne Çıkarılanlardan Kaldır" : "Öne Çıkar"}
                        >
                          <Star className="w-5 h-5" fill={p.is_featured ? "currentColor" : "none"} />
                        </button>
                        <button 
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors inline-block"
                          title="İlanı Sil"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.length === 0 && <div className="text-center py-10 text-textMuted">Sistemde ilan bulunmuyor.</div>}
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="relative z-10 flex flex-col md:flex-row gap-6">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-textMuted">
                    <th className="pb-4 font-medium">İlan</th>
                    <th className="pb-4 font-medium">Kullanıcılar</th>
                    <th className="pb-4 font-medium">Son Mesaj</th>
                    <th className="pb-4 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {chats.map(c => (
                    <tr key={`${c.product_id}_${c.user1_id}_${c.user2_id}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 font-medium text-blue-300">{c.product_title}</td>
                      <td className="py-4">
                        <span className="text-white">{c.user1_name}</span>
                        <span className="text-textMuted mx-2">↔</span>
                        <span className="text-white">{c.user2_name}</span>
                      </td>
                      <td className="py-4 text-textMuted text-sm max-w-[200px] truncate">{c.last_message}</td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => loadChatHistory(c)}
                          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-lg transition-colors text-sm font-medium"
                        >
                          İncele
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {chats.length === 0 && <div className="text-center py-10 text-textMuted">Kayıtlı mesajlaşma bulunmuyor.</div>}
            </div>

            {selectedChat && (
              <div className="w-full md:w-96 glass border border-white/10 rounded-2xl flex flex-col h-[500px] shadow-2xl">
                <div className="p-4 border-b border-white/10 bg-purple-600/10 flex justify-between items-center rounded-t-2xl">
                  <div>
                    <div className="font-semibold text-white">Mesaj Geçmişi</div>
                    <div className="text-xs text-purple-300">{selectedChat.product_title}</div>
                  </div>
                  <button onClick={() => setSelectedChat(null)} className="text-white/50 hover:text-white">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {historyLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
                  ) : chatHistory.length === 0 ? (
                    <div className="text-center text-textMuted py-10 text-sm">Geçmiş bulunamadı.</div>
                  ) : (
                    chatHistory.map((msg, i) => {
                      const isUser1 = msg.sender_id === selectedChat.user1_id;
                      const senderName = isUser1 ? selectedChat.user1_name : selectedChat.user2_name;
                      return (
                        <div key={i} className={`flex flex-col ${isUser1 ? 'items-start' : 'items-end'} group`}>
                          <span className="text-[10px] text-textMuted mb-1">{senderName}</span>
                          <div className="flex items-center gap-2">
                            {isUser1 && (
                              <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/20 rounded-md transition-all" title="Mesajı Sil">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <div className={`px-3 py-2 rounded-xl text-sm ${isUser1 ? 'bg-white/10 text-white rounded-tl-sm' : 'bg-purple-500/20 text-purple-100 rounded-tr-sm border border-purple-500/30'}`}>
                              {msg.content}
                            </div>
                            {!isUser1 && (
                              <button onClick={() => handleDeleteMessage(msg.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-500/20 rounded-md transition-all" title="Mesajı Sil">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-textMuted">
                  <th className="pb-4 font-medium">Şikayet Eden</th>
                  <th className="pb-4 font-medium">Hedef Detayı</th>
                  <th className="pb-4 font-medium">Sebep</th>
                  <th className="pb-4 font-medium">Açıklama</th>
                  <th className="pb-4 font-medium">Durum</th>
                  <th className="pb-4 font-medium text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 font-medium">{r.reporter_name}</td>
                    <td className="py-4">
                      {r.target_type === 'product' ? (
                        <div className="flex flex-col">
                          <span className="text-blue-400 font-semibold">{r.target_product_title || `İlan #${r.target_id}`}</span>
                          <span className="text-[11px] text-textMuted">Sahibi: {r.target_user_name || `Kullanıcı #${r.target_user_id}`}</span>
                        </div>
                      ) : (
                        <span className="text-purple-400 font-semibold">{r.target_user_name || `Kullanıcı #${r.target_id}`}</span>
                      )}
                    </td>
                    <td className="py-4 text-textMuted font-medium">{r.reason}</td>
                    <td className="py-4 text-textMuted text-sm max-w-xs truncate" title={r.description}>{r.description || '-'}</td>
                    <td className="py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        r.status === 'resolved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {r.status === 'resolved' ? 'Çözüldü' : 'Bekliyor'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {r.target_type === 'product' && (
                           <Link href={`/products/${r.target_id}`} target="_blank" className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors inline-block" title="İlanı Görüntüle">
                              <Package className="w-4 h-4" />
                           </Link>
                        )}
                        {r.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => { setSelectedReport(r); setActionType('chat_ban'); }}
                              className="px-3 py-1.5 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 rounded-lg transition-colors text-xs font-semibold"
                              title="Aksiyon Al (Uyarı/Ban)"
                            >
                              Aksiyon Al
                            </button>
                            <button 
                              onClick={() => handleResolveReport(r.id)}
                              className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors inline-block"
                              title="Çözüldü Olarak İşaretle"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reports.length === 0 && <div className="text-center py-10 text-textMuted">Bekleyen şikayet bulunmuyor.</div>}
          </div>
        )}
      </div>

      {/* Aksiyon Al Modalı */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="glass rounded-3xl p-6 sm:p-8 w-full max-w-md border border-white/10 relative overflow-hidden shadow-2xl">
            <button 
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-textMuted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" /> Aksiyon Al
            </h3>
            <p className="text-xs text-textMuted mb-6">
              Şikayet edilen kullanıcıya uygulanacak yaptırımı ve ceza süresini seçin.
            </p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Hedef Kullanıcı</label>
                <input 
                  type="text" 
                  disabled
                  value={selectedReport.target_user_name || `Kullanıcı #${selectedReport.target_user_id}`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white/60 text-sm outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Aksiyon Tipi</label>
                <select 
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="chat_ban">Chat Banı (Geçici/Kalıcı Mesajlaşma Yasağı)</option>
                  <option value="global_ban">Genel Hesap Dondurma (Sisteme Giriş Yasağı)</option>
                  <option value="warning">Uyarı Gönder</option>
                </select>
              </div>

              {actionType !== 'warning' && (
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">
                    Süre (Dakika) - <span className="text-primary font-bold">0 = Kalıcı</span>
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    required
                    value={actionDurationMinutes}
                    onChange={(e) => setActionDurationMinutes(e.target.value)}
                    placeholder="Örn: 60 (1 saat)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-[10px] text-textMuted mt-1">
                    Süre dolduğunda kullanıcının cezası otomatik olarak kalkacaktır.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Açıklama / Ceza Nedeni</label>
                <textarea 
                  required
                  rows={3}
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Kullanıcıya iletilecek ve admin loglarında görünecek açıklama..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors resize-none text-sm placeholder:text-textMuted/50"
                />
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-sm transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-[#0f172a] rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Cezayı Uygula'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
