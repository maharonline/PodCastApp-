import { OneSignal, LogLevel } from 'react-native-onesignal';
import { navigationRef } from '../Appnavigation/Appnavigator';
import { ONESIGNAL_APP_ID } from '@env';
import { store } from '../redux/store';
import { addNotification } from '../redux/notificationSlice';
import { NotificationDatabaseService } from './NotificationDatabaseService';

import { Episode, NotificationData } from '../types';

class NotificationService {
  initialize() {


    if (!ONESIGNAL_APP_ID) {
      console.error('OneSignal App ID missing!');
      return;
    }

    console.log(
      'NotificationService: Initializing OneSignal with ID:',
      ONESIGNAL_APP_ID,
    );

    // Enable verbose logging for debugging
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);

    // Initialize OneSignal with App ID (v5 API)
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Request notification permission
    OneSignal.Notifications.requestPermission(true);

    // Handle notification opened/clicked
    OneSignal.Notifications.addEventListener('click', (event: any) => {
      const notificationData = {
        id: event.notification.notificationId,
        title: event.notification.title || 'New Notification',
        body: event.notification.body || '',
        data: event.notification.additionalData,
      };

      // Add to Redux store
      store.dispatch(addNotification(notificationData));

      // Save to Supabase
      const userId = store.getState().auth.user?.id;
      if (userId) {
        NotificationDatabaseService.saveNotification(userId, notificationData);
      }

      const data = event.notification.additionalData as
        | NotificationData
        | undefined;


      if (data && (data.type === 'new_episode' || data.episode_url)) {
        this.navigateToPlayer(data);
      } else {

        // Navigate to Notifications screen for generic notifications
        if (navigationRef.isReady()) {
          navigationRef.navigate('Root', { screen: 'Notifications' });
        }
      }
    });

    // Handle foreground notifications
    OneSignal.Notifications.addEventListener(
      'foregroundWillDisplay',
      (event: any) => {


        const notification = event.getNotification();

        const notificationData = {
          id: notification.notificationId,
          title: notification.title || 'New Notification',
          body: notification.body || '',
          data: notification.additionalData,
        };

        // Add to Redux store
        store.dispatch(addNotification(notificationData));

        // Save to Supabase
        const userId = store.getState().auth.user?.id;
        if (userId) {
          NotificationDatabaseService.saveNotification(
            userId,
            notificationData,
          );
        }


      },
    );

    // Log subscription status
    setTimeout(async () => {
      const subscription = OneSignal.User.pushSubscription as any;
      const userId = await subscription?.getIdAsync();
      const token = await subscription?.getTokenAsync();


      if (!userId || !token) {
        console.warn(
          '⚠️ Device not registered with OneSignal. This is normal on emulators without Google Play Services.',
        );
        console.warn(
          '💡 Try testing on a real device or send a test notification from OneSignal Dashboard.',
        );
      } else {

      }
    }, 3000);
  }

  navigateToPlayer(data: NotificationData) {
    if (!navigationRef.isReady()) {
      console.warn('NavigationRef not ready');
      return;
    }

    const audioUrl = data.episode_url || data.audioUrl || '';
    // Generate a safe ID similar to Home.tsx
    const id = audioUrl
      ? audioUrl.split('/').pop()?.split('?')[0] || `ep_${Date.now()}`
      : `ep_${Date.now()}`;

    const episode: any = {
      // Use 'any' or update interface to include id/audioUrl
      id: id,
      title: data.episode_title || data.title || 'New Episode',
      description: data.description || '',
      audioUrl: audioUrl,
      enclosure: {
        url: audioUrl,
        type: 'audio/mpeg',
      },
      image: data.image || 'https://via.placeholder.com/150', // Add top-level image
      pubDate: new Date().toISOString(), // Add pubDate
      itunes: {
        image: data.image || 'https://via.placeholder.com/150',
        duration: data.duration || '0:00',
      },
    };


    navigationRef.navigate('Root', { screen: 'Player', params: { episode } });
  }
}

export default new NotificationService();
