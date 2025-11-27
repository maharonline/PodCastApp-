import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationItem {
    id: string;
    title: string;
    body: string;
    date: number;
    read: boolean;
    data?: any;
}

interface NotificationState {
    notifications: NotificationItem[];
    unreadCount: number;
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
};

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<Omit<NotificationItem, 'read' | 'date'>>) => {
            const newNotification: NotificationItem = {
                ...action.payload,
                date: Date.now(),
                read: false,
            };
            state.notifications.unshift(newNotification);
            state.unreadCount += 1;
        },
        markAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAllAsRead: (state) => {
            state.notifications.forEach(n => {
                n.read = true;
            });
            state.unreadCount = 0;
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        },
        loadNotifications: (state, action: PayloadAction<NotificationItem[]>) => {
            state.notifications = action.payload;
            state.unreadCount = action.payload.filter(n => !n.read).length;
        },
    },
});

export const { addNotification, markAsRead, markAllAsRead, clearNotifications, loadNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
