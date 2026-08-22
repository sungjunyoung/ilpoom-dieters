import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import { api, formatDate, formatDateTime, formatKg, todayKST } from "../api";
import { useAuth } from "../AuthContext";
import type { CommentEntry, MemberSummary } from "../../shared/types";

function progressPercent(m: MemberSummary): number | null {
  if (m.startWeight == null || m.goalWeight == null || m.currentWeight == null) return null;
  const total = m.startWeight - m.goalWeight;
  if (total <= 0) return null;
  return Math.max(0, Math.min(100, ((m.startWeight - m.currentWeight) / total) * 100));
}

export default function DashboardPage() {
  const { me } = useAuth();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [feed, setFeed] = useState<CommentEntry[]>([]);
  const [weight, setWeight] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.members().then(setMembers).catch(() => {});
    api.recentComments().then(setFeed).catch(() => {});
  }, []);

  useEffect(load, [load]);

  const onQuickRecord = async (e: SubmitEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.saveWeight(todayKST(), parseFloat(weight));
      setMessage("오늘 몸무게를 기록했어요! 💪");
      setWeight("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "기록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dashboard">
      {me && !me.isAdmin && (
        <form className="card quick-record" onSubmit={onQuickRecord}>
          <div className="quick-record-title">오늘의 몸무게</div>
          <div className="quick-record-row">
            <input
              className="input"
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="예: 71.3"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
            <button className="btn btn-primary" disabled={busy || !weight}>
              기록
            </button>
          </div>
          {message && <p className="success small">{message}</p>}
          {error && <p className="error small">{error}</p>}
        </form>
      )}

      <h2 className="section-title">멤버 현황</h2>
      <div className="member-list">
        {members.map((m) => {
          const pct = progressPercent(m);
          const delta =
            m.startWeight != null && m.currentWeight != null
              ? m.currentWeight - m.startWeight
              : null;
          return (
            <Link to={`/u/${m.id}`} key={m.id} className="card member-card">
              <div className="member-head">
                <span className="member-name">
                  {m.name}
                  {me?.id === m.id && <span className="badge badge-me">나</span>}
                </span>
                <span className="member-current">{formatKg(m.currentWeight)}</span>
              </div>
              {m.startWeight == null ? (
                <p className="muted small">아직 시작 전이에요</p>
              ) : (
                <>
                  <div className="member-sub">
                    <span>
                      시작 {formatKg(m.startWeight)} → 목표 {formatKg(m.goalWeight)}
                    </span>
                    {delta != null && (
                      <span className={delta <= 0 ? "delta-down" : "delta-up"}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)}kg
                      </span>
                    )}
                  </div>
                  {pct != null && (
                    <div className="progress">
                      <div className="progress-bar" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {m.currentDate && (
                    <p className="muted small">마지막 기록 {formatDate(m.currentDate)}</p>
                  )}
                </>
              )}
            </Link>
          );
        })}
        {members.length === 0 && (
          <p className="muted">아직 멤버가 없어요. 어드민에게 등록을 요청하세요!</p>
        )}
      </div>

      {feed.length > 0 && (
        <>
          <h2 className="section-title">최근 응원 멘트</h2>
          <div className="card feed">
            {feed.map((c) => (
              <div className="feed-item" key={c.id}>
                <div className="feed-meta">
                  <b>{c.fromName}</b> → <Link to={`/u/${c.toId}`}>{c.toName}</Link>
                  <span className="muted small"> · {formatDateTime(c.createdAt)}</span>
                </div>
                <div className="feed-content">{c.content}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
