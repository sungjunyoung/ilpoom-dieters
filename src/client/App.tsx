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
import RulesPage from "./pages/RulesPage";
import Header from "./components/Header";
import Footer from "./components/Footer";

// 운영 수칙은 로그인 여부와 무관하게 언제든 볼 수 있다
const PUBLIC_PATHS = ["/login", "/rules"];

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
    return <div className="page-loading">불러오는 중</div>;
  }

  const path = location.pathname;
  let guard: string | null = null;
  if (!me && !PUBLIC_PATHS.includes(path)) guard = "/login";
  else if (me && me.mustSetup && path !== "/setup" && path !== "/rules") guard = "/setup";
  else if (me && !me.mustSetup && (path === "/login" || path === "/setup")) guard = "/";

  const showChrome = !!me && !me.mustSetup;

  return (
    <AuthContext.Provider value={{ me, setMe, refresh }}>
      {guard ? (
        <Navigate to={guard} replace />
      ) : (
        <div className="app">
          {showChrome && <Header />}
          <main className="main">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/" element={<DashboardPage />} />
              <Route path="/u/:id" element={<ProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      )}
    </AuthContext.Provider>
  );
}
