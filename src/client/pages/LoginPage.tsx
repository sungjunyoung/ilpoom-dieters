import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import type { LoginUser } from "../../shared/types";

export default function LoginPage() {
  const { setMe } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [selected, setSelected] = useState<LoginUser | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .loginUsers()
      .then(setUsers)
      .catch(() => setError("유저 목록을 불러오지 못했습니다."));
  }, []);

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const me = await api.login(selected.id, pin);
      setMe(me);
      navigate(me.mustSetup ? "/setup" : "/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1>일품 다이어터</h1>
        <Link to="/rules" className="hero-rules-link">
          운영 수칙
        </Link>
      </div>

      {!selected ? (
        <div className="login-card">
          <h2>본인을 선택하십시오</h2>
          <div className="login-user-grid">
            {users.map((u) => (
              <button
                key={u.id}
                className={`login-user ${u.isAdmin ? "login-user-admin" : ""}`}
                onClick={() => {
                  setSelected(u);
                  setPin("");
                  setError("");
                }}
              >
                {u.name}
                {u.isAdmin && <span className="badge">관리자</span>}
              </button>
            ))}
          </div>
          {users.length === 0 && !error && <p className="muted">불러오는 중</p>}
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <form className="login-card" onSubmit={onSubmit}>
          <h2>
            {selected.name}
            <button type="button" className="btn-plain link" onClick={() => setSelected(null)}>
              다른 사람 선택
            </button>
          </h2>
          <input
            className="input input-pin"
            type="password"
            inputMode={selected.isAdmin ? "text" : "numeric"}
            pattern={selected.isAdmin ? undefined : "\\d{4}"}
            maxLength={selected.isAdmin ? 64 : 4}
            placeholder={selected.isAdmin ? "패스워드" : "PIN 4자리"}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" disabled={busy || pin.length < 4}>
            {busy ? "확인 중" : "로그인"}
          </button>
          <p className="muted small">최초 로그인이라면 PIN은 0000입니다.</p>
        </form>
      )}
    </div>
  );
}
