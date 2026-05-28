"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";

export interface ChatMessage {
  type?: string;
  id: number;
  sender_id: number;
  receiver_id: number;
  product_id: number;
  content: string;
  timestamp: number;
  sender_name?: string;
  sender_image?: string;
  product_title?: string;
  offer_price?: number;
}

export interface ActiveChat {
  productId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserImage: string | null;
}

interface ChatContextType {
  messages: Record<string, ChatMessage[]>;
  unreadCount: number;
  hasUnreadMessages: boolean;
  setHasUnreadMessages: (val: boolean) => void;
  activeChat: ActiveChat | null;
  setActiveChat: (chat: ActiveChat | null) => void;
  sendMessage: (receiverId: number, productId: number, content: string) => void;
  markAsRead: (productId: number, otherUserId: number) => void;
  fetchHistory: (productId: number, otherUserId: number) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (token && user) {
      // Connect to WebSocket
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const WS_URL = API_URL.replace(/^http/, "ws");
      ws.current = new WebSocket(`${WS_URL}/ws/chat/${token}`);
      
      ws.current.onopen = () => {
        if (activeChat) {
          ws.current?.send(JSON.stringify({
            type: "SET_ACTIVE_CHAT",
            product_id: activeChat.productId,
            other_user_id: activeChat.otherUserId
          }));
        }
      };

      ws.current.onmessage = (event) => {
        const message: any = JSON.parse(event.data);
        
        if (message.type === 'NEW_NOTIFICATION') {
          window.dispatchEvent(new CustomEvent('new-notification', { detail: message.notification }));
          return;
        }

        const chatKey = `${message.product_id}_${message.sender_id === user.id ? message.receiver_id : message.sender_id}`;
        
        setMessages(prev => {
          const currentChatMessages = prev[chatKey] || [];
          // Prevent duplicates
          if (currentChatMessages.some(m => m.id === message.id)) return prev;
          return { ...prev, [chatKey]: [...currentChatMessages, message] };
        });

        // Increase unread count if message is received
        if (message.type === 'NEW_MESSAGE') {
          console.log("Bildirim sinyali alındı");
        }

        if (message.sender_id !== user.id) {
          setActiveChat(currentActive => {
            if (!currentActive || currentActive.productId !== message.product_id || currentActive.otherUserId !== message.sender_id) {
              setUnreadCounts(prev => ({ ...prev, [chatKey]: (prev[chatKey] || 0) + 1 }));
              if (message.type === 'NEW_MESSAGE') {
                setHasUnreadMessages(true);
              }
            }
            return currentActive;
          });
        }
      };

      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
      };

      return () => {
        if (ws.current) ws.current.close();
      };
    } else {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      setMessages({});
      setUnreadCounts({});
      setActiveChat(null);
    }
  }, [token, user]);

  useEffect(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      if (activeChat) {
        ws.current.send(JSON.stringify({
          type: "SET_ACTIVE_CHAT",
          product_id: activeChat.productId,
          other_user_id: activeChat.otherUserId
        }));
      } else {
        ws.current.send(JSON.stringify({
          type: "CLEAR_ACTIVE_CHAT"
        }));
      }
    }
  }, [activeChat]);

  const sendMessage = (receiverId: number, productId: number, content: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        receiver_id: receiverId,
        product_id: productId,
        content: content
      }));
    } else {
      console.error("WebSocket is not connected.");
    }
  };

  const fetchHistory = async (productId: number, otherUserId: number) => {
    if (!token) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/chat/history/${productId}/${otherUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const history: ChatMessage[] = await res.json();
        const chatKey = `${productId}_${otherUserId}`;
        setMessages(prev => ({ ...prev, [chatKey]: history }));
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  };

  const markAsRead = (productId: number, otherUserId: number) => {
    const chatKey = `${productId}_${otherUserId}`;
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[chatKey];
      if (Object.keys(newCounts).length === 0) {
        setHasUnreadMessages(false);
      }
      return newCounts;
    });
  };

  const totalUnreadCount = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <ChatContext.Provider value={{
      messages,
      unreadCount: totalUnreadCount,
      hasUnreadMessages,
      setHasUnreadMessages,
      activeChat,
      setActiveChat,
      sendMessage,
      markAsRead,
      fetchHistory
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
