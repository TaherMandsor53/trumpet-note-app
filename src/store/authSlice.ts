import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, Role } from '@/types/band';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  activeRole: Role;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  activeRole: 'Overall Major',
  isLoading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.activeRole = action.payload.user.role;
    },
    setActiveRole: (state, action: PayloadAction<Role>) => {
      state.activeRole = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.activeRole = 'Band Member / Player';
    },
  },
});

export const { setCredentials, setActiveRole, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
