"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type: string; // NEW_OFFER, OFFER_ACCEPTED, OFFER_REJECTED, PRODUCT_SOLD, SYSTEM_BAN, NEW_MESSAGE
  is_read: boolean;
  timestamp: number;
}

export interface Toast {
  id: string;
  title: string;
  content: string;
  type: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: Toast[];
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  showToast: (title: string, content: string, type: string) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8000/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data: Notification[] = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:8000/notifications/read-all", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const showToast = (title: string, content: string, type: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, content, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (token && user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setToasts([]);
    }
  }, [token, user]);

  // Listen to custom DOM events fired by the WebSocket in ChatContext
  useEffect(() => {
    const handleNewNotification = (e: Event) => {
      const notif = (e as CustomEvent).detail as Notification;
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      showToast(notif.title, notif.content, notif.type);
    };

    window.addEventListener("new-notification", handleNewNotification);
    return () => window.removeEventListener("new-notification", handleNewNotification);
  }, []);

  const Provider = NotificationContext.Provider;

  return (
    <Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        showToast,
        removeToast,
      }}
    >
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="glass rounded-2xl border border-white/10 shadow-2xl p-4 cursor-pointer transition-all duration-300 transform translate-y-0 hover:scale-[1.02] active:scale-[0.98] animate-slide-in"
            style={{
              background: "rgba(15, 23, 42, 0.8)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {toast.type === "NEW_OFFER" && (
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    📈
                  </div>
                )}
                {toast.type === "OFFER_ACCEPTED" && (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    ✅
                  </div>
                )}
                {toast.type === "OFFER_REJECTED" && (
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    ❌
                  </div>
                )}
                {toast.type === "PRODUCT_SOLD" && (
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                    🛍️
                  </div>
                )}
                {toast.type === "SYSTEM_BAN" && (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                    ⚠️
                  </div>
                )}
                {toast.type === "NEW_MESSAGE" && (
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                    💬
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white leading-tight">
                  {toast.title}
                </h4>
                <p className="text-xs text-white/70 mt-1 leading-normal">
                  {toast.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
