"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser, getMe } from "@/lib/api";

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (typeof window === "undefined") return;
      const savedToken = localStorage.getItem("buildsmart_token");
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        setToken(savedToken);
        const res = await getMe();
        if (res && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem("buildsmart_token");
          setToken(null);
        }
      } catch (err) {
        console.error("Session restoration failed:", err);
        localStorage.removeItem("buildsmart_token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.token && res.user) {
      localStorage.setItem("buildsmart_token", res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || "Login failed");
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    if (res.token && res.user) {
      localStorage.setItem("buildsmart_token", res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error(res.error || "Registration failed");
  };

  const logout = () => {
    localStorage.removeItem("buildsmart_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
