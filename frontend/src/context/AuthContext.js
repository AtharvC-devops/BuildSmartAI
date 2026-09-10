"use client";

import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted auth from localStorage
    try {
      const savedUser = localStorage.getItem("buildsmart_user");
      const savedToken = localStorage.getItem("buildsmart_token");
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.error?.message || "Invalid credentials");
    }
    const { user: userProfile, token: userToken } = json.data;
    setUser(userProfile);
    setToken(userToken);
    localStorage.setItem("buildsmart_user", JSON.stringify(userProfile));
    localStorage.setItem("buildsmart_token", userToken);
    return userProfile;
  };

  const signup = async ({ email, password, name, builderScale, companyName, role, phone }) => {
    const userRole = role || (builderScale ? "builder" : "client");
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, builderScale: builderScale || "SMALL", companyName, role: userRole, phone })
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json?.error?.message || json?.message || "Registration failed");
    }
    const { user: userProfile, token: userToken } = json.data;
    setUser(userProfile);
    setToken(userToken);
    localStorage.setItem("buildsmart_user", JSON.stringify(userProfile));
    localStorage.setItem("buildsmart_token", userToken);
    return userProfile;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("buildsmart_user");
    localStorage.removeItem("buildsmart_token");
  };

  const canAccessFeature = (featureKey) => {
    if (!user || !user.tierConfig) return false;
    const allowed = user.tierConfig.allowedFeatures || [];
    return allowed.includes(featureKey) || user.builderScale === "LARGE";
  };

  const getHeaders = () => {
    const headers = { "Content-Type": "application/json" };
    if (user?.id) {
      headers["x-user-id"] = user.id.toString();
    }
    return headers;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        signup,
        register: signup,
        logout,
        canAccessFeature,
        getHeaders
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
