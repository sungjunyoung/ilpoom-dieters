import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { api } from "./api";
import { AuthContext } from "./AuthContext";
import type { Me } from "../shared/types";
import LoginPage from "./pages/LoginPage";
import SetupPage from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import Header from "./components/Header";

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const refresh = useCallback(async () => {
    try {
      setMe(await api.me());
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  if (loading) {
    return <div className="page-loading">불러오는 중…</div>;
  }

  let guard: string | null = null;
  if (!me && location.pathname !== "/login") guard = "/login";
  else if (me && me.mustSetup && location.pathname !== "/setup") guard = "/setup";
  else if (me && !me.mustSetup && (location.pathname === "/login" || location.pathname === "/setup"))
    guard = "/";

  return (
    <AuthContext.Provider value={{ me, setMe, refresh }}>
      {guard ? (
        <Navigate to={guard} replace />
      ) : (
        <div className="app">
          {me && !me.mustSetup && <Header />}
          <main className="main">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/" element={<DashboardPage />} />
              <Route path="/u/:id" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      )}
    </AuthContext.Provider>
  );
}
