"use client";

import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ChatProvider } from "./context/ChatContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>{children}</ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
