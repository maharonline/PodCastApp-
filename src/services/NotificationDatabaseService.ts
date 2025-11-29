import { supabase } from "../supabase";
import { NotificationItem } from "../redux/notificationSlice";

export const NotificationDatabaseService = {
    /**
     * Save a notification to Supabase
     */
    async saveNotification(userId: string, notification: Omit<NotificationItem, 'read' | 'date'> & { read?: boolean; date?: number }) {
        try {
            const { error } = await supabase
                .from('user_notifications')
                .upsert({
                    id: notification.id,
                    user_id: userId,
                    title: notification.title,
                    body: notification.body,
                    data: notification.data || null,
                    read: notification.read ?? false,
                    created_at: notification.date ? new Date(notification.date).toISOString() : new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) {
                console.error('Error saving notification to Supabase:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Exception saving notification:', error);
            return false;
        }
    },

    /**
     * Load all notifications for a user
     */
    async loadNotifications(userId: string): Promise<NotificationItem[]> {
        try {
            const { data, error } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading notifications from Supabase:', error);
                return [];
            }

            // Transform database format to NotificationItem format
            return (data || []).map(item => ({
                id: item.id,
                title: item.title,
                body: item.body,
                data: item.data,
                read: item.read,
                date: new Date(item.created_at).getTime()
            }));
        } catch (error) {
            console.error('Exception loading notifications:', error);
            return [];
        }
    },

    /**
     * Mark a notification as read
     */
    async markAsRead(userId: string, notificationId: string) {
        try {
            const { error } = await supabase
                .from('user_notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('id', notificationId);

            if (error) {
                console.error('Error marking notification as read:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Exception marking notification as read:', error);
            return false;
        }
    },

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        try {
            const { error } = await supabase
                .from('user_notifications')
                .update({ read: true })
                .eq('user_id', userId);

            if (error) {
                console.error('Error marking all notifications as read:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Exception marking all notifications as read:', error);
            return false;
        }
    },

    /**
     * Clear all notifications for a user
     */
    async clearAllNotifications(userId: string) {
        try {
            const { error } = await supabase
                .from('user_notifications')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error('Error clearing notifications:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Exception clearing notifications:', error);
            return false;
        }
    },

    /**
     * Delete notifications older than 7 days
     */
    async clearOldNotifications(userId: string) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { error } = await supabase
                .from('user_notifications')
                .delete()
                .eq('user_id', userId)
                .lt('created_at', sevenDaysAgo.toISOString());

            if (error) {
                console.error('Error clearing old notifications:', error);
                return false;
            }
            return true;
        } catch (error) {
            console.error('Exception clearing old notifications:', error);
            return false;
        }
    }
};
