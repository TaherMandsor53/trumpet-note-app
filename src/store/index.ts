import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import themeReducer from './themeSlice';
import { bandApi } from './api/bandApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    theme: themeReducer,
    [bandApi.reducerPath]: bandApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(bandApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
