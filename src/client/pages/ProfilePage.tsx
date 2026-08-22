import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import { useParams } from "react-router";
import { api, formatDateTime, formatKg, todayKST } from "../api";
import { useAuth } from "../AuthContext";
import WeightChart from "../components/WeightChart";
import type { ProfileResponse } from "../../shared/types";

export default function ProfilePage() {
  const { id } = useParams();
  const userId = Number(id);
  const { me } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  // 기록 폼
  const [date, setDate] = useState(todayKST());
  const [weight, setWeight] = useState("");
  const [recordError, setRecordError] = useState("");
  const [busy, setBusy] = useState(false);

  // 멘트 폼
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const [showRevisions, setShowRevisions] = useState(false);

  const isMine = me?.id === userId;

  const load = useCallback(() => {
    api
      .profile(userId)
      .then((p) => {
        setProfile(p);
        setNotFound(false);
      })
      .catch(() => setNotFound(true));
  }, [userId]);

  useEffect(load, [load]);

  const onRecord = async (e: SubmitEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRecordError("");
    try {
      await api.saveWeight(date, parseFloat(weight));
      setWeight("");
      load();
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : "기록에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (d: string) => {
    if (!window.confirm(`${d} 기록을 삭제하시겠습니까? 삭제 내역이 남습니다.`)) return;
    try {
      await api.deleteWeight(d);
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    }
  };

  const onEdit = async (d: string, current: number) => {
    const input = window.prompt(`${d} 몸무게 수정 (현재 ${current.toFixed(1)}kg)`, String(current));
    if (input == null) return;
    const value = parseFloat(input);
    if (!Number.isFinite(value)) {
      window.alert("숫자로 입력해 주십시오.");
      return;
    }
    try {
      await api.saveWeight(d, value);
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "수정에 실패했습니다.");
    }
  };

  const onComment = async (e: SubmitEvent) => {
    e.preventDefault();
    if (commentBusy) return;
    setCommentBusy(true);
    setCommentError("");
    try {
      await api.addComment(userId, comment);
      setComment("");
      load();
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "멘트 등록에 실패했습니다.");
    } finally {
      setCommentBusy(false);
    }
  };

  if (notFound) return <p className="muted">유저를 찾을 수 없습니다.</p>;
  if (!profile) return <div className="page-loading">불러오는 중</div>;

  const { user, weights, revisions, comments } = profile;
  const delta =
    user.startWeight != null && user.currentWeight != null
      ? user.currentWeight - user.startWeight
      : null;
  const sortedDesc = [...weights].reverse();
  // 운영 수칙 1번: 목표 체중은 미만 기준으로 적용한다
  const achieved =
    user.goalWeight != null && user.currentWeight != null && user.currentWeight < user.goalWeight;

  return (
    <div className="profile">
      <div className="card profile-head">
        <h2>
          {user.name}
          {isMine && <span className="badge badge-me">나</span>}
          {achieved && <span className="badge badge-done">목표 달성</span>}
        </h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">시작</span>
            <span className="stat-value">{formatKg(user.startWeight)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">현재</span>
            <span className="stat-value">{formatKg(user.currentWeight)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">목표</span>
            <span className="stat-value stat-goal">{formatKg(user.goalWeight)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">변화</span>
            <span
              className={`stat-value ${delta == null ? "" : delta <= 0 ? "delta-down" : "delta-up"}`}
            >
              {delta == null ? "-" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}kg`}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>몸무게 변화</h3>
        <WeightChart
          weights={weights}
          goalWeight={user.goalWeight}
          startWeight={user.startWeight}
        />
      </div>

      {isMine && (
        <form className="card" onSubmit={onRecord}>
          <h3>기록하기</h3>
          <div className="record-row">
            <input
              className="input"
              type="date"
              value={date}
              max={todayKST()}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <input
              className="input"
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="kg"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              required
            />
            <button className="btn btn-primary" disabled={busy}>
              저장
            </button>
          </div>
          {recordError && <p className="error small">{recordError}</p>}
          <p className="muted small">
            같은 날짜에 다시 저장하면 수정되며, 수정 내역이 남습니다. 하루 1kg을 초과하는 감량은
            기록할 수 없습니다.
          </p>
        </form>
      )}

      {weights.length > 0 && (
        <div className="card">
          <h3>기록 목록</h3>
          <table className="weight-table">
            <tbody>
              {sortedDesc.map((w) => (
                <tr key={w.date}>
                  <td>{w.date}</td>
                  <td className="weight-cell">{w.weight.toFixed(1)}kg</td>
                  {isMine && (
                    <td className="actions-cell">
                      <button className="btn-plain link" onClick={() => onEdit(w.date, w.weight)}>
                        수정
                      </button>
                      <button
                        className="btn-plain link link-danger"
                        onClick={() => onDelete(w.date)}
                      >
                        삭제
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {revisions.length > 0 && (
        <div className="card">
          <button className="btn-plain revisions-toggle" onClick={() => setShowRevisions(!showRevisions)}>
            <h3>수정 내역 ({revisions.length})</h3>
            <span>{showRevisions ? "접기" : "펼치기"}</span>
          </button>
          {showRevisions && (
            <ul className="revision-list">
              {revisions.map((r) => (
                <li key={r.id}>
                  <span className="revision-date">{r.date}</span>{" "}
                  {r.action === "delete" ? (
                    <span>
                      {r.oldWeight.toFixed(1)}kg 기록 <b className="link-danger">삭제</b>
                    </span>
                  ) : (
                    <span>
                      {r.oldWeight.toFixed(1)}kg → <b>{r.newWeight?.toFixed(1)}kg</b> 수정
                    </span>
                  )}
                  <span className="muted small"> · {formatDateTime(r.changedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card">
        <h3>멘트</h3>
        <form className="comment-form" onSubmit={onComment}>
          <input
            className="input"
            type="text"
            maxLength={500}
            placeholder={isMine ? "나에게 한마디" : `${user.name}님에게 한마디`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
          />
          <button className="btn btn-primary" disabled={commentBusy || !comment.trim()}>
            남기기
          </button>
        </form>
        {commentError && <p className="error small">{commentError}</p>}
        <div className="comment-list">
          {comments.map((c) => (
            <div className="feed-item" key={c.id}>
              <div className="feed-meta">
                <b>{c.fromName}</b> → {c.toName}
                <span className="muted"> · {formatDateTime(c.createdAt)}</span>
              </div>
              <div className="feed-content">{c.content}</div>
            </div>
          ))}
          {comments.length === 0 && <p className="muted small">아직 멘트가 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}
