import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AppTheme = 'dark' | 'monochrome';

interface ThemeState {
  theme: AppTheme;
}

const initialState: ThemeState = {
  theme: 'dark',
};

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<AppTheme>) => {
      state.theme = action.payload === 'monochrome' ? 'monochrome' : 'dark';
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'monochrome' : 'dark';
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
