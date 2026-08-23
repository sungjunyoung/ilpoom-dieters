import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import { api, formatDate, formatDateTime, formatKg, todayKST } from "../api";
import { useAuth } from "../AuthContext";
import type { CommentEntry, MemberSummary } from "../../shared/types";

interface Progress {
  /** 막대 채움 비율 (0~100) */
  fill: number;
  /** 시작 몸무게보다 늘어난 상태 — 막대를 반대 방향(경고색)으로 표시한다 */
  over: boolean;
  /** 막대 위에 붙는 설명 (막대만으로는 100%가 무엇인지 알 수 없다) */
  label: string;
}

function progressOf(m: MemberSummary): Progress | null {
  if (m.startWeight == null || m.goalWeight == null || m.currentWeight == null) return null;
  const total = m.startWeight - m.goalWeight;
  if (total <= 0) return null;

  const ratio = ((m.startWeight - m.currentWeight) / total) * 100;
  const remaining = m.currentWeight - m.goalWeight;

  if (isAchieved(m)) {
    return { fill: 100, over: false, label: `목표 달성 · 목표보다 ${(-remaining).toFixed(1)}kg 아래` };
  }
  if (ratio < 0) {
    // 시작보다 늘어난 구간 — 0%로 접으면 "이제 막 시작한 사람"과 구분되지 않는다
    const gained = m.currentWeight - m.startWeight;
    return {
      fill: Math.min(100, -ratio),
      over: true,
      label: `시작보다 ${gained.toFixed(1)}kg 늘었습니다 · 목표까지 ${remaining.toFixed(1)}kg`,
    };
  }
  const fill = Math.min(100, ratio);
  return { fill, over: false, label: `목표까지 ${remaining.toFixed(1)}kg · ${Math.round(fill)}%` };
}

// 운영 수칙 1번: 목표 체중은 미만 기준으로 적용한다
function isAchieved(m: MemberSummary): boolean {
  return m.goalWeight != null && m.currentWeight != null && m.currentWeight < m.goalWeight;
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
      setMessage("오늘 몸무게를 기록했습니다.");
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
          const progress = progressOf(m);
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
                  {isAchieved(m) && <span className="badge badge-done">목표 달성</span>}
                </span>
                <span className="member-current">{formatKg(m.currentWeight)}</span>
              </div>
              {m.startWeight == null ? (
                <p className="muted small">아직 기록이 없습니다.</p>
              ) : (
                <>
                  <div className="member-sub">
                    <span>
                      시작 {formatKg(m.startWeight)} · 목표 {formatKg(m.goalWeight)}
                    </span>
                    {delta != null && (
                      <span className={delta <= 0 ? "delta-down" : "delta-up"}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)}kg
                      </span>
                    )}
                  </div>
                  {progress && (
                    <div className="progress-block">
                      <div className="progress">
                        <div
                          className={progress.over ? "progress-bar is-over" : "progress-bar"}
                          style={{ width: `${progress.fill}%` }}
                        />
                      </div>
                      <p className={progress.over ? "progress-label is-over" : "progress-label"}>
                        {progress.label}
                      </p>
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
          <p className="muted">아직 멤버가 없습니다. 관리자에게 등록을 요청하십시오.</p>
        )}
      </div>

      {feed.length > 0 && (
        <>
          <h2 className="section-title">최근 멘트</h2>
          <div className="card feed">
            {feed.map((c) => (
              <div className="feed-item" key={c.id}>
                <div className="feed-meta">
                  <b>{c.fromName}</b> → <Link to={`/u/${c.toId}`}>{c.toName}</Link>
                  <span className="muted"> · {formatDateTime(c.createdAt)}</span>
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
