import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice"; // Auth slice import
import downloadReducer from "./downloadSlice"; // Download slice import

import notificationReducer from "./notificationSlice"; // Notification slice import

export const store = configureStore({
  reducer: {
    auth: authReducer,
    download: downloadReducer,
    notifications: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
