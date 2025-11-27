import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { markAllAsRead, clearNotifications, NotificationItem } from '../../redux/notificationSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NotificationDatabaseService } from '../../services/NotificationDatabaseService';

const NotificationsScreen = () => {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<any>();
    const { notifications } = useAppSelector((state: any) => state.notifications);
    const { user } = useAppSelector((state: any) => state.auth);

    useEffect(() => {
        // Mark all as read when screen opens
        dispatch(markAllAsRead());

        // Also mark as read in Supabase
        if (user?.id) {
            NotificationDatabaseService.markAllAsRead(user.id);
        }
    }, [dispatch, user?.id]);

    const handleClearAll = () => {
        Alert.alert(
            "Clear Notifications",
            "Are you sure you want to clear all notifications?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        dispatch(clearNotifications());
                        // Also clear from Supabase
                        if (user?.id) {
                            await NotificationDatabaseService.clearAllNotifications(user.id);
                        }
                    }
                }
            ]
        );
    };

    const handleNotificationPress = (item: NotificationItem) => {
        console.log('🔔 Notification clicked:', item);
        console.log('📦 Notification data:', item.data);

        if (item.data && (item.data.type === 'new_episode' || item.data.episode_url)) {
            // Navigate to player if it's an episode notification
            const audioUrl = item.data.episode_url || item.data.audioUrl || '';
            const id = audioUrl ? (audioUrl.split('/').pop()?.split('?')[0] || `ep_${Date.now()}`) : `ep_${Date.now()}`;

            const episode = {
                id: id,
                title: item.data.episode_title || item.title,
                description: item.data.description || '',
                audioUrl: audioUrl,
                enclosure: {
                    url: audioUrl,
                    type: 'audio/mpeg',
                },
                image: item.data.image || 'https://via.placeholder.com/150',
                pubDate: item.data.pub_date || new Date().toISOString(),
                itunes: {
                    image: item.data.image || 'https://via.placeholder.com/150',
                    duration: item.data.duration || '0:00',
                },
            };

            console.log('🎵 Navigating to Player with episode:', episode);
            navigation.navigate('Player', { episode });
        } else {
            console.log('⚠️ Not an episode notification or missing data');
        }
    };

    const renderItem = ({ item }: { item: NotificationItem }) => (
        <TouchableOpacity
            style={[styles.itemContainer, !item.read && styles.unreadItem]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={24} color="#A637FF" />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.date}>
                    {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                </Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
                    <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No notifications yet</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    clearButton: { padding: 5 },
    clearText: { color: '#A637FF', fontWeight: '600' },
    listContent: { padding: 20 },
    itemContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        alignItems: 'center',
    },
    unreadItem: { backgroundColor: '#F9F0FF', borderColor: '#E0B0FF' },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5E6FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    contentContainer: { flex: 1 },
    title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    body: { fontSize: 14, color: '#666', marginBottom: 6 },
    date: { fontSize: 12, color: '#999' },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#A637FF', marginLeft: 10 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { marginTop: 20, fontSize: 16, color: '#999' },
});

export default NotificationsScreen;
