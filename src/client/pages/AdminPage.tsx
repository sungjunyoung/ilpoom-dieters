import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { Navigate } from "react-router";
import { api, formatKg } from "../api";
import { useAuth } from "../AuthContext";
import type { MemberSummary } from "../../shared/types";
import { INITIAL_PIN } from "../../shared/types";

export default function AdminPage() {
  const { me } = useAuth();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.members().then(setMembers).catch(() => {});
  }, []);

  useEffect(load, [load]);

  if (!me?.isAdmin) return <Navigate to="/" replace />;

  const onCreate = async (e: SubmitEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const created = await api.createUser(name.trim());
      setMessage(`${created.name}님을 등록했습니다. 초기 PIN은 ${created.initialPin}입니다.`);
      setName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onResetPin = async (m: MemberSummary) => {
    if (!window.confirm(`${m.name}님의 PIN을 ${INITIAL_PIN}으로 초기화하시겠습니까?`)) return;
    try {
      await api.resetPin(m.id);
      setMessage(`${m.name}님의 PIN을 ${INITIAL_PIN}으로 초기화했습니다.`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "초기화에 실패했습니다.");
    }
  };

  return (
    <div className="admin">
      <form className="card" onSubmit={onCreate}>
        <h3>새 멤버 등록</h3>
        <div className="record-row">
          <input
            className="input"
            type="text"
            maxLength={20}
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={busy || !name.trim()}>
            등록
          </button>
        </div>
        <p className="muted small">
          등록된 멤버는 초기 PIN {INITIAL_PIN}으로 로그인한 뒤 PIN을 재설정합니다.
        </p>
        {message && <p className="success small">{message}</p>}
        {error && <p className="error small">{error}</p>}
      </form>

      <div className="card">
        <h3>멤버 목록</h3>
        <table className="weight-table">
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td className="weight-cell">{formatKg(m.currentWeight)}</td>
                <td className="actions-cell">
                  <button className="btn-plain link" onClick={() => onResetPin(m)}>
                    PIN 초기화
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <p className="muted small">아직 멤버가 없습니다.</p>}
      </div>
    </div>
  );
}
