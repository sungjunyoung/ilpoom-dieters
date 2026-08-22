import { Hono } from "hono";
import type { Context, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { hashPin, randomHex, verifyPin } from "./auth";
import { INITIAL_PIN } from "../shared/types";
import type {
  CommentEntry,
  LoginUser,
  Me,
  MemberSummary,
  ProfileResponse,
  WeightEntry,
  WeightRevision,
} from "../shared/types";

interface UserRow {
  id: number;
  name: string;
  pin_hash: string;
  pin_salt: string;
  is_admin: number;
  must_setup: number;
  start_weight: number | null;
  goal_weight: number | null;
}

type Vars = { user: UserRow };
type AppContext = Context<{ Bindings: Env; Variables: Vars }>;

const SESSION_COOKIE = "ilpoom_sid";
const SESSION_DAYS = 30;

const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath("/api");

// ---------- helpers ----------

function toMe(u: UserRow): Me {
  return {
    id: u.id,
    name: u.name,
    isAdmin: u.is_admin === 1,
    mustSetup: u.must_setup === 1,
    startWeight: u.start_weight,
    goalWeight: u.goal_weight,
  };
}

async function findSessionUser(c: AppContext): Promise<UserRow | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  const row = await c.env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?1 AND s.expires_at > ?2`,
  )
    .bind(token, new Date().toISOString())
    .first<UserRow>();
  return row ?? null;
}

const requireAuth = async (c: AppContext, next: Next) => {
  const user = await findSessionUser(c);
  if (!user) return c.json({ error: "로그인이 필요합니다." }, 401);
  c.set("user", user);
  await next();
};

const requireAdmin = async (c: AppContext, next: Next) => {
  const user = await findSessionUser(c);
  if (!user) return c.json({ error: "로그인이 필요합니다." }, 401);
  if (user.is_admin !== 1) return c.json({ error: "어드민 권한이 필요합니다." }, 403);
  c.set("user", user);
  await next();
};

function parseWeight(value: unknown): number | null {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 10) / 10;
  if (rounded < 20 || rounded > 300) return null;
  return rounded;
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// KST 기준 오늘 날짜
function todayKST(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return (
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) /
    86400000
  );
}

// 운영 수칙 3번(인위적 수분 감량 제한)에 따라 하루 1kg을 초과하는 감량은 기록하지 않는다.
const MAX_LOSS_PER_DAY = 1.0;
const EPSILON = 1e-9;

interface NeighborRow {
  date: string;
  weight: number;
}

// 앞뒤 기록과 비교해 하루 1kg 초과 감량이 되는지 검사한다. 위반이면 사유 문구를 돌려준다.
async function checkLossRate(
  c: AppContext,
  userId: number,
  date: string,
  weight: number,
): Promise<string | null> {
  const [prev, next] = await Promise.all([
    c.env.DB.prepare(
      `SELECT date, weight FROM weights
       WHERE user_id = ?1 AND date < ?2 ORDER BY date DESC LIMIT 1`,
    )
      .bind(userId, date)
      .first<NeighborRow>(),
    c.env.DB.prepare(
      `SELECT date, weight FROM weights
       WHERE user_id = ?1 AND date > ?2 ORDER BY date ASC LIMIT 1`,
    )
      .bind(userId, date)
      .first<NeighborRow>(),
  ]);

  const violations: [NeighborRow, string, number, number][] = [];
  if (prev) {
    const days = daysBetween(prev.date, date);
    violations.push([prev, "이전", days, prev.weight - weight]);
  }
  if (next) {
    const days = daysBetween(date, next.date);
    violations.push([next, "다음", days, weight - next.weight]);
  }

  for (const [row, label, days, loss] of violations) {
    const limit = days * MAX_LOSS_PER_DAY;
    if (loss > limit + EPSILON) {
      return (
        `하루 1kg을 초과하는 감량은 기록할 수 없습니다. ` +
        `${label} 기록(${row.date} ${row.weight.toFixed(1)}kg)과 비교하면 ` +
        `${days}일간 ${loss.toFixed(1)}kg 감량으로 계산됩니다.`
      );
    }
  }
  return null;
}

// ---------- auth ----------

app.get("/login-users", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, is_admin FROM users ORDER BY is_admin DESC, name",
  ).all<{ id: number; name: string; is_admin: number }>();
  const users: LoginUser[] = results.map((r) => ({
    id: r.id,
    name: r.name,
    isAdmin: r.is_admin === 1,
  }));
  return c.json(users);
});

app.post("/login", async (c) => {
  const body = await c.req.json<{ userId?: number; pin?: string }>().catch(() => null);
  const userId = body?.userId;
  const pin = body?.pin;
  if (typeof userId !== "number" || typeof pin !== "string" || pin.length < 4) {
    return c.json({ error: "유저와 PIN 번호를 입력해 주십시오." }, 400);
  }
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?1")
    .bind(userId)
    .first<UserRow>();
  if (!user || !(await verifyPin(pin, user.pin_salt, user.pin_hash))) {
    return c.json({ error: "PIN 번호가 올바르지 않습니다." }, 401);
  }

  const token = randomHex(32);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  await c.env.DB.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, ?3)",
  )
    .bind(token, user.id, expires.toISOString())
    .run();

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    expires,
  });
  return c.json(toMe(user));
});

app.post("/logout", requireAuth, async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(token).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.get("/me", async (c) => {
  const user = await findSessionUser(c);
  if (!user) return c.json({ error: "로그인이 필요합니다." }, 401);
  return c.json(toMe(user));
});

// 최초 로그인: PIN 재설정 (+ 최초/목표 몸무게 기록)
app.post("/setup", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.must_setup !== 1) {
    return c.json({ error: "이미 초기 설정을 완료했습니다." }, 400);
  }
  const body = await c.req
    .json<{ newPin?: string; startWeight?: unknown; goalWeight?: unknown }>()
    .catch(() => null);
  const newPin = body?.newPin;

  if (typeof newPin !== "string" || newPin.length < 4) {
    return c.json({ error: "새 PIN 번호는 4자리 이상이어야 합니다." }, 400);
  }
  if (user.is_admin !== 1 && !/^\d{4}$/.test(newPin)) {
    return c.json({ error: "PIN 번호는 숫자 4자리여야 합니다." }, 400);
  }
  if (newPin === INITIAL_PIN) {
    return c.json({ error: "초기 PIN(0000)은 사용할 수 없습니다." }, 400);
  }

  const salt = randomHex(16);
  const hash = await hashPin(newPin, salt);

  // 일반 유저는 최초 설정에서 시작/목표 몸무게 필수 (이미 있으면 유지 — 어드민이 PIN만 초기화한 경우)
  const needsWeights = user.is_admin !== 1 && user.start_weight == null;
  let startWeight = user.start_weight;
  let goalWeight = user.goal_weight;

  if (needsWeights) {
    const sw = parseWeight(body?.startWeight);
    const gw = parseWeight(body?.goalWeight);
    if (sw == null || gw == null) {
      return c.json({ error: "몸무게는 20~300kg 사이 숫자로 입력해 주십시오." }, 400);
    }
    startWeight = sw;
    goalWeight = gw;
  }

  const statements = [
    c.env.DB.prepare(
      `UPDATE users SET pin_hash = ?1, pin_salt = ?2, must_setup = 0,
       start_weight = ?3, goal_weight = ?4 WHERE id = ?5`,
    ).bind(hash, salt, startWeight, goalWeight, user.id),
  ];
  if (needsWeights && startWeight != null) {
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO weights (user_id, date, weight) VALUES (?1, ?2, ?3)
         ON CONFLICT (user_id, date) DO NOTHING`,
      ).bind(user.id, todayKST(), startWeight),
    );
  }
  await c.env.DB.batch(statements);

  const updated = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?1")
    .bind(user.id)
    .first<UserRow>();
  return c.json(toMe(updated!));
});

// ---------- users ----------

const memberSummarySQL = `
  SELECT u.id, u.name, u.is_admin, u.start_weight, u.goal_weight,
         w.weight AS current_weight, w.date AS current_date_,
         (SELECT COUNT(*) FROM weights x WHERE x.user_id = u.id) AS record_count
  FROM users u
  LEFT JOIN weights w ON w.user_id = u.id
    AND w.date = (SELECT MAX(date) FROM weights y WHERE y.user_id = u.id)
`;

interface SummaryRow {
  id: number;
  name: string;
  is_admin: number;
  start_weight: number | null;
  goal_weight: number | null;
  current_weight: number | null;
  current_date_: string | null;
  record_count: number;
}

function toSummary(r: SummaryRow): MemberSummary {
  return {
    id: r.id,
    name: r.name,
    startWeight: r.start_weight,
    goalWeight: r.goal_weight,
    currentWeight: r.current_weight,
    currentDate: r.current_date_,
    recordCount: r.record_count,
  };
}

app.get("/users", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `${memberSummarySQL} WHERE u.is_admin = 0 ORDER BY u.name`,
  ).all<SummaryRow>();
  return c.json(results.map(toSummary));
});

app.post("/users", requireAdmin, async (c) => {
  const body = await c.req.json<{ name?: string }>().catch(() => null);
  const name = body?.name?.trim();
  if (!name || name.length > 20) {
    return c.json({ error: "이름은 1~20자로 입력해 주십시오." }, 400);
  }
  const exists = await c.env.DB.prepare("SELECT id FROM users WHERE name = ?1")
    .bind(name)
    .first();
  if (exists) return c.json({ error: "이미 존재하는 이름입니다." }, 409);

  const salt = randomHex(16);
  const hash = await hashPin(INITIAL_PIN, salt);
  const result = await c.env.DB.prepare(
    "INSERT INTO users (name, pin_hash, pin_salt) VALUES (?1, ?2, ?3) RETURNING id",
  )
    .bind(name, hash, salt)
    .first<{ id: number }>();
  return c.json({ id: result!.id, name, initialPin: INITIAL_PIN }, 201);
});

// 어드민: PIN을 0000으로 초기화 (몸무게 기록은 유지)
app.post("/users/:id/reset-pin", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const target = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?1")
    .bind(id)
    .first<UserRow>();
  if (!target) return c.json({ error: "유저를 찾을 수 없습니다." }, 404);

  const salt = randomHex(16);
  const hash = await hashPin(INITIAL_PIN, salt);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE users SET pin_hash = ?1, pin_salt = ?2, must_setup = 1 WHERE id = ?3",
    ).bind(hash, salt, id),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(id),
  ]);
  return c.json({ ok: true, initialPin: INITIAL_PIN });
});

app.get("/users/:id", requireAuth, async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare(`${memberSummarySQL} WHERE u.id = ?1`)
    .bind(id)
    .first<SummaryRow>();
  if (!row) return c.json({ error: "유저를 찾을 수 없습니다." }, 404);

  const [weightsRes, revisionsRes, commentsRes] = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT date, weight, created_at, updated_at FROM weights
       WHERE user_id = ?1 ORDER BY date`,
    ).bind(id),
    c.env.DB.prepare(
      `SELECT id, date, action, old_weight, new_weight, changed_at
       FROM weight_revisions WHERE user_id = ?1 ORDER BY changed_at DESC LIMIT 100`,
    ).bind(id),
    c.env.DB.prepare(
      `SELECT c.id, c.content, c.created_at, c.from_user_id, f.name AS from_name,
              c.to_user_id, t.name AS to_name
       FROM comments c
       JOIN users f ON f.id = c.from_user_id
       JOIN users t ON t.id = c.to_user_id
       WHERE c.to_user_id = ?1 ORDER BY c.created_at DESC LIMIT 200`,
    ).bind(id),
  ]);

  const weights: WeightEntry[] = (
    weightsRes.results as {
      date: string;
      weight: number;
      created_at: string;
      updated_at: string;
    }[]
  ).map((w) => ({
    date: w.date,
    weight: w.weight,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  }));

  const revisions: WeightRevision[] = (
    revisionsRes.results as {
      id: number;
      date: string;
      action: "update" | "delete";
      old_weight: number;
      new_weight: number | null;
      changed_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    date: r.date,
    action: r.action,
    oldWeight: r.old_weight,
    newWeight: r.new_weight,
    changedAt: r.changed_at,
  }));

  const comments: CommentEntry[] = (
    commentsRes.results as {
      id: number;
      content: string;
      created_at: string;
      from_user_id: number;
      from_name: string;
      to_user_id: number;
      to_name: string;
    }[]
  ).map((cm) => ({
    id: cm.id,
    content: cm.content,
    createdAt: cm.created_at,
    fromId: cm.from_user_id,
    fromName: cm.from_name,
    toId: cm.to_user_id,
    toName: cm.to_name,
  }));

  const response: ProfileResponse = {
    user: { ...toSummary(row), isAdmin: row.is_admin === 1 },
    weights,
    revisions,
    comments,
  };
  return c.json(response);
});

// ---------- weights ----------

// 기록 추가/수정 (본인만). 기존 기록 수정 시 이력이 남는다.
app.post("/weights", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ date?: unknown; weight?: unknown }>().catch(() => null);
  const weight = parseWeight(body?.weight);
  const date = body?.date;

  if (!isValidDate(date)) return c.json({ error: "날짜 형식이 올바르지 않습니다." }, 400);
  if (date > todayKST()) return c.json({ error: "미래 날짜는 기록할 수 없습니다." }, 400);
  if (weight == null) {
    return c.json({ error: "몸무게는 20~300kg 사이 숫자로 입력해 주십시오." }, 400);
  }

  const existing = await c.env.DB.prepare(
    "SELECT weight FROM weights WHERE user_id = ?1 AND date = ?2",
  )
    .bind(user.id, date)
    .first<{ weight: number }>();

  if (existing?.weight === weight) return c.json({ ok: true, changed: false });

  const lossViolation = await checkLossRate(c, user.id, date, weight);
  if (lossViolation) return c.json({ error: lossViolation }, 400);

  if (existing) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE weights SET weight = ?1,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE user_id = ?2 AND date = ?3`,
      ).bind(weight, user.id, date),
      c.env.DB.prepare(
        `INSERT INTO weight_revisions (user_id, date, action, old_weight, new_weight)
         VALUES (?1, ?2, 'update', ?3, ?4)`,
      ).bind(user.id, date, existing.weight, weight),
    ]);
  } else {
    await c.env.DB.prepare(
      "INSERT INTO weights (user_id, date, weight) VALUES (?1, ?2, ?3)",
    )
      .bind(user.id, date, weight)
      .run();
  }
  return c.json({ ok: true, changed: true });
});

// 특정 날짜 기록 삭제 (본인만, 이력이 남는다)
app.delete("/weights/:date", requireAuth, async (c) => {
  const user = c.get("user");
  const date = c.req.param("date");
  if (!isValidDate(date)) return c.json({ error: "날짜 형식이 올바르지 않습니다." }, 400);

  const existing = await c.env.DB.prepare(
    "SELECT weight FROM weights WHERE user_id = ?1 AND date = ?2",
  )
    .bind(user.id, date)
    .first<{ weight: number }>();
  if (!existing) return c.json({ error: "해당 날짜의 기록이 없습니다." }, 404);

  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM weights WHERE user_id = ?1 AND date = ?2").bind(
      user.id,
      date,
    ),
    c.env.DB.prepare(
      `INSERT INTO weight_revisions (user_id, date, action, old_weight, new_weight)
       VALUES (?1, ?2, 'delete', ?3, NULL)`,
    ).bind(user.id, date, existing.weight),
  ]);
  return c.json({ ok: true });
});

// ---------- comments ----------

app.post("/users/:id/comments", requireAuth, async (c) => {
  const user = c.get("user");
  const toId = Number(c.req.param("id"));
  const body = await c.req.json<{ content?: string }>().catch(() => null);
  const content = body?.content?.trim();

  if (!content || content.length > 500) {
    return c.json({ error: "멘트는 1~500자로 입력해 주십시오." }, 400);
  }
  const target = await c.env.DB.prepare("SELECT id FROM users WHERE id = ?1")
    .bind(toId)
    .first();
  if (!target) return c.json({ error: "유저를 찾을 수 없습니다." }, 404);

  await c.env.DB.prepare(
    "INSERT INTO comments (from_user_id, to_user_id, content) VALUES (?1, ?2, ?3)",
  )
    .bind(user.id, toId, content)
    .run();
  return c.json({ ok: true }, 201);
});

// 전체 최근 멘트 피드 (누가 누구에게 보냈는지 표시)
app.get("/comments/recent", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.content, c.created_at, c.from_user_id, f.name AS from_name,
            c.to_user_id, t.name AS to_name
     FROM comments c
     JOIN users f ON f.id = c.from_user_id
     JOIN users t ON t.id = c.to_user_id
     ORDER BY c.created_at DESC LIMIT 30`,
  ).all<{
    id: number;
    content: string;
    created_at: string;
    from_user_id: number;
    from_name: string;
    to_user_id: number;
    to_name: string;
  }>();
  const comments: CommentEntry[] = results.map((cm) => ({
    id: cm.id,
    content: cm.content,
    createdAt: cm.created_at,
    fromId: cm.from_user_id,
    fromName: cm.from_name,
    toId: cm.to_user_id,
    toName: cm.to_name,
  }));
  return c.json(comments);
});

app.notFound((c) => c.json({ error: "Not Found" }, 404));

export default app;
