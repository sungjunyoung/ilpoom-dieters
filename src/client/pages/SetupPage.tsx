import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function SetupPage() {
  const { me, setMe } = useAuth();
  const navigate = useNavigate();
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [startWeight, setStartWeight] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!me) return null;
  const needsWeights = !me.isAdmin && me.startWeight == null;

  const onSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (pin1 !== pin2) {
      setError(me.isAdmin ? "패스워드가 서로 다릅니다." : "PIN 번호가 서로 다릅니다.");
      return;
    }
    setBusy(true);
    try {
      const body: { newPin: string; startWeight?: number; goalWeight?: number } = {
        newPin: pin1,
      };
      if (needsWeights) {
        body.startWeight = parseFloat(startWeight);
        body.goalWeight = parseFloat(goalWeight);
      }
      const updated = await api.setup(body);
      setMe(updated);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "설정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="setup-page">
      <div className="login-hero">
        <h1>처음 오셨네요, {me.name}님 👋</h1>
        <p>{me.isAdmin ? "새 패스워드를 설정해 주세요." : "PIN 번호를 새로 정해 주세요."}</p>
      </div>
      <form className="login-card" onSubmit={onSubmit}>
        <label className="field">
          <span>{me.isAdmin ? "새 패스워드" : "새 PIN (숫자 4자리)"}</span>
          <input
            className="input"
            type="password"
            inputMode={me.isAdmin ? "text" : "numeric"}
            maxLength={me.isAdmin ? 64 : 4}
            value={pin1}
            onChange={(e) => setPin1(e.target.value)}
            autoFocus
          />
        </label>
        <label className="field">
          <span>한 번 더</span>
          <input
            className="input"
            type="password"
            inputMode={me.isAdmin ? "text" : "numeric"}
            maxLength={me.isAdmin ? 64 : 4}
            value={pin2}
            onChange={(e) => setPin2(e.target.value)}
          />
        </label>

        {needsWeights && (
          <>
            <label className="field">
              <span>현재 몸무게 (kg)</span>
              <input
                className="input"
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="예: 72.5"
                value={startWeight}
                onChange={(e) => setStartWeight(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>목표 몸무게 (kg)</span>
              <input
                className="input"
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="예: 65.0"
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                required
              />
            </label>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy || pin1.length < 4}>
          {busy ? "저장 중…" : "시작하기"}
        </button>
      </form>
    </div>
  );
}
