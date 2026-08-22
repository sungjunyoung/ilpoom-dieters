import { Link, useNavigate } from "react-router";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { DEADLINE } from "../../shared/types";

export function dday(): number {
  const now = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const diff =
    (new Date(`${DEADLINE}T00:00:00Z`).getTime() - new Date(`${now}T00:00:00Z`).getTime()) /
    86400000;
  return Math.round(diff);
}

export default function Header() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const d = dday();

  const onLogout = async () => {
    try {
      await api.logout();
    } finally {
      setMe(null);
      navigate("/login");
    }
  };

  return (
    <header className="header">
      <Link to="/" className="header-logo">
        일품 다이어트
      </Link>
      <span className={`dday ${d >= 0 ? "" : "dday-passed"}`}>
        {d > 0 ? `D-${d}` : d === 0 ? "D-DAY" : `종료 +${-d}일`}
      </span>
      <nav className="header-nav">
        {me?.isAdmin && (
          <Link to="/admin" className="header-link">
            회원 관리
          </Link>
        )}
        {me && !me.isAdmin && (
          <Link to={`/u/${me.id}`} className="header-link">
            내 프로필
          </Link>
        )}
        <button className="header-link btn-plain" onClick={onLogout}>
          로그아웃
        </button>
      </nav>
    </header>
  );
}
