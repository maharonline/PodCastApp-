import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { supabase } from "../supabase";

interface User { id?: string; email?: string; user_metadata?: any;[key: string]: any }
interface AuthState { user: User | null; isAuthenticated: boolean; loading: boolean; theme: "light" | "dark"; }

const initialState: AuthState = { user: null, isAuthenticated: false, loading: true, theme: "light" };

// Async fetch user (Supabase session)
export const fetchUser = createAsyncThunk("auth/fetchUser", async () => {
  const { data } = await supabase.auth.getSession();

  return data.session?.user || null;
});

// Extra helper to login via Google (or other OAuth)
export const loginWithOAuth = createAsyncThunk(
  "auth/loginWithOAuth",
  async (user: User, { dispatch }) => {
    dispatch(setLoggedIn(user));
    return user;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoggedIn: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    },
    setLoggedOut: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
  },
  extraReducers: builder => {
    builder.addCase(fetchUser.pending, (state) => { state.loading = true; });
    builder.addCase(fetchUser.fulfilled, (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false;
    });
    builder.addCase(fetchUser.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
    });
  }
});

export const { setLoggedIn, setLoggedOut, toggleTheme } = authSlice.actions;
export default authSlice.reducer;
