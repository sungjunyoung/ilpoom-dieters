import { createContext, useContext } from "react";
import type { Me } from "../shared/types";

export interface AuthState {
  me: Me | null;
  setMe: (me: Me | null) => void;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  me: null,
  setMe: () => {},
  refresh: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
