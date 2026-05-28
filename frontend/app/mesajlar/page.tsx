"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Send, User, MessageCircle } from 'lucide-react';
import Link from 'next/link';

interface ChatData {
  product_id: number;
  product_title: string;
  other_user_id: number;
  other_user_name: string;
  other_user_image: string | null;
  last_message: string;
  last_timestamp: number;
}

function MessagesContent() {
  const { user, token, loading: authLoading } = useAuth();
  const { messages, fetchHistory, sendMessage, markAsRead, setActiveChat, activeChat } = useChat();
  const router = useRouter();
  const searchParams = useSearchParams();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  const [chats, setChats] = useState<ChatData[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const initialProductId = searchParams.get('productId');
  const initialUserId = searchParams.get('userId');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadChats();
  }, [user, authLoading, token]);

  const loadChats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        
        if (initialProductId && initialUserId) {
          const pid = parseInt(initialProductId);
          const uid = parseInt(initialUserId);
          const existing = data.find((c: any) => c.product_id === pid && c.other_user_id === uid);
          if (existing) {
            handleSelectChat(existing);
          } else {
            handleSelectChat({
              product_id: pid,
              product_title: "Yeni Konuşma",
              other_user_id: uid,
              other_user_name: "Satıcı",
              other_user_image: null,
              last_message: "",
              last_timestamp: Date.now()
            });
          }
        } else if (data.length > 0 && !activeChat) {
          handleSelectChat(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoadingChats(false);
  };

  const handleSelectChat = async (chat: ChatData) => {
    setActiveChat({
      productId: chat.product_id,
      otherUserId: chat.other_user_id,
      otherUserName: chat.other_user_name,
      otherUserImage: chat.other_user_image
    });
    markAsRead(chat.product_id, chat.other_user_id);
    await fetchHistory(chat.product_id, chat.other_user_id);
  };

  const chatKey = activeChat ? `${activeChat.productId}_${activeChat.otherUserId}` : "";
  const currentMessages = messages[chatKey] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, activeChat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;
    
    sendMessage(activeChat.otherUserId, activeChat.productId, inputText.trim());
    setInputText("");
    
    setTimeout(() => {
      loadChats();
    }, 500);
  };

  if (authLoading || loadingChats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 sm:p-8 max-w-7xl mx-auto flex flex-col h-screen">
      <div className="mb-6 flex items-center justify-between flex-shrink-0">
        <Link href="/" className="inline-flex items-center gap-2 text-textMuted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Ana Sayfaya Dön
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" /> Mesaj Merkezi
        </h1>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden glass rounded-3xl border border-white/10 p-2 sm:p-4">
        {/* Left Sidebar - Chat List */}
        <div className="w-full sm:w-1/3 md:w-80 flex flex-col border-r border-white/10 pr-2 sm:pr-4 overflow-y-auto">
          <h2 className="text-lg font-semibold px-4 py-3 text-white/80">Konuşmalarım</h2>
          {chats.length === 0 ? (
            <div className="text-center py-10 text-textMuted text-sm">Henüz mesajınız bulunmuyor.</div>
          ) : (
            <div className="space-y-2">
              {chats.map(chat => (
                <button
                  key={`${chat.product_id}_${chat.other_user_id}`}
                  onClick={() => handleSelectChat(chat)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 ${activeChat?.productId === chat.product_id && activeChat?.otherUserId === chat.other_user_id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {chat.other_user_image ? (
                      <img src={`${API_URL}${chat.other_user_image}`} alt={chat.other_user_name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-blue-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{chat.other_user_name}</div>
                    <div className="text-xs text-primary truncate mb-1">{chat.product_title}</div>
                    <div className="text-xs text-textMuted truncate">{chat.last_message}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Chat Window */}
        <div className="flex-1 flex flex-col bg-black/20 rounded-2xl overflow-hidden relative">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white/5 border-b border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  {activeChat.otherUserImage ? (
                    <img src={`${API_URL}${activeChat.otherUserImage}`} alt={activeChat.otherUserName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <Link href={`/profil/${activeChat.otherUserId}`} className="font-bold text-white hover:text-primary transition-colors">
                    {activeChat.otherUserName}
                  </Link>
                  <Link href={`/products/${activeChat.productId}`} className="text-xs text-primary hover:underline block">
                    İlana Git
                  </Link>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-textMuted">
                    <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
                    <p>Sohbete başlayın!</p>
                  </div>
                ) : (
                  currentMessages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && (
                          <Link href={`/profil/${msg.sender_id}`} className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center mr-2 self-end hover:bg-white/20 transition-colors overflow-hidden">
                            {msg.sender_image ? (
                              <img src={`${API_URL}${msg.sender_image}`} alt={msg.sender_name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-white/40" />
                            )}
                          </Link>
                        )}
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white/10 text-zinc-200 rounded-bl-none border border-white/5'}`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className={`p-4 border-t border-white/10 bg-black/40 ${user?.is_chat_banned ? 'opacity-50' : ''}`}>
                <form onSubmit={handleSend} className="flex items-center gap-3">
                  <input
                    type="text"
                    disabled={!!user?.is_chat_banned}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={user?.is_chat_banned ? "Sohbet yetkiniz kısıtlanmıştır." : "Mesajınızı yazın..."}
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:cursor-not-allowed"
                  />
                  <button 
                    type="submit"
                    disabled={!!user?.is_chat_banned || !inputText.trim()}
                    className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-textMuted p-8 text-center">
              <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-white mb-2">Mesaj Merkezi</h3>
              <p>Geçmiş konuşmalarınızı sol taraftan seçebilir veya ilan sayfalarından yeni bir sohbet başlatabilirsiniz.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <MessagesContent />
    </Suspense>
  );
}
