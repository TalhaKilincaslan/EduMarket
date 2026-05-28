"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNotifications, Notification } from "../context/NotificationContext";
import { 
  Bell, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  AlertTriangle, 
  MessageCircle,
  Check
} from "lucide-react";
import Link from "next/link";

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "NEW_OFFER":
        return <TrendingUp className="w-4 h-4 text-amber-400" />;
      case "OFFER_ACCEPTED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "OFFER_REJECTED":
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case "PRODUCT_SOLD":
        return <ShoppingBag className="w-4 h-4 text-teal-400" />;
      case "SYSTEM_BAN":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "NEW_MESSAGE":
        return <MessageCircle className="w-4 h-4 text-sky-400" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "NEW_OFFER":
        return "bg-amber-500/10 border-amber-500/20";
      case "OFFER_ACCEPTED":
        return "bg-emerald-500/10 border-emerald-500/20";
      case "OFFER_REJECTED":
        return "bg-rose-500/10 border-rose-500/20";
      case "PRODUCT_SOLD":
        return "bg-teal-500/10 border-teal-500/20";
      case "SYSTEM_BAN":
        return "bg-red-500/10 border-red-500/20";
      case "NEW_MESSAGE":
        return "bg-sky-500/10 border-sky-500/20";
      default:
        return "bg-white/5 border-white/10";
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-300 transform active:scale-95 flex items-center justify-center cursor-pointer group"
        title="Bildirimler"
      >
        <Bell className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-r from-red-500 to-rose-600 text-[10px] font-bold text-white items-center justify-center shadow-lg">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-white/10 shadow-2xl overflow-hidden z-50 text-left"
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-outfit">Bildirimler</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-primary hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
              >
                <Check className="w-3.5 h-3.5" /> Tümünü Okundu İşaretle
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-xs font-outfit">
                Bildiriminiz bulunmuyor.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 transition-all duration-300 cursor-pointer flex gap-3 ${
                    notif.is_read 
                      ? "hover:bg-white/5" 
                      : "bg-primary/5 hover:bg-primary/10 border-l-4 border-primary"
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${getBgColor(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-bold text-white truncate ${!notif.is_read && "text-blue-400"}`}>
                      {notif.title}
                    </h4>
                    <p className="text-[11px] text-white/70 mt-1 leading-normal break-words">
                      {notif.content}
                    </p>
                    <span className="text-[9px] text-white/40 block mt-1.5">
                      {new Date(notif.timestamp * 1000).toLocaleString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-white/5 text-center bg-white/5">
            <span className="text-[10px] text-white/40 font-outfit font-medium">
              EduMarket Anlık Bildirim Sistemi
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
