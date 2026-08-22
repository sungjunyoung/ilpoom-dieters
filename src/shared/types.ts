// 워커와 클라이언트가 공유하는 API 타입

export const DEADLINE = "2026-12-12";
export const INITIAL_PIN = "0000";

export interface Me {
  id: number;
  name: string;
  isAdmin: boolean;
  mustSetup: boolean;
  startWeight: number | null;
  goalWeight: number | null;
}

export interface LoginUser {
  id: number;
  name: string;
  isAdmin: boolean;
}

export interface MemberSummary {
  id: number;
  name: string;
  startWeight: number | null;
  goalWeight: number | null;
  currentWeight: number | null;
  currentDate: string | null;
  recordCount: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeightRevision {
  id: number;
  date: string;
  action: "update" | "delete";
  oldWeight: number;
  newWeight: number | null;
  changedAt: string;
}

export interface CommentEntry {
  id: number;
  content: string;
  createdAt: string;
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
}

export interface ProfileResponse {
  user: MemberSummary & { isAdmin: boolean };
  weights: WeightEntry[];
  revisions: WeightRevision[];
  comments: CommentEntry[];
}

export interface ApiError {
  error: string;
}
