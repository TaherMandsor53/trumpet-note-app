import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AppTheme = 'dark' | 'light' | 'monochrome';

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
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      if (state.theme === 'dark') state.theme = 'light';
      else if (state.theme === 'light') state.theme = 'monochrome';
      else state.theme = 'dark';
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
