"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  profile_image_url?: string;
  bio?: string;
  university?: string;
  campus?: string;
  is_chat_banned?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Sayfa yenilendiğinde localStorage'dan token oku
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      try {
        const decoded = decodeToken(storedToken);
        // Token süresinin bitip bitmediğini kontrol et
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setToken(storedToken);
          setUser({
            id: decoded.id,
            email: decoded.sub,
            full_name: decoded.full_name,
            is_admin: decoded.is_admin || false,
            profile_image_url: decoded.profile_image_url,
            bio: decoded.bio,
            university: decoded.university,
            campus: decoded.campus,
            is_chat_banned: decoded.is_chat_banned || false,
          });
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const decodeToken = (t: string) => {
    const base64Url = t.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  };

  const login = (newToken: string) => {
    localStorage.setItem("access_token", newToken);
    setToken(newToken);
    const decoded = decodeToken(newToken);
    setUser({
      id: decoded.id,
      email: decoded.sub,
      full_name: decoded.full_name,
      is_admin: decoded.is_admin || false,
      profile_image_url: decoded.profile_image_url,
      bio: decoded.bio,
      university: decoded.university,
      campus: decoded.campus,
      is_chat_banned: decoded.is_chat_banned || false,
    });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
    router.push("/");
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
