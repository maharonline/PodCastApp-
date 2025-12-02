# NCAST - Podcast Streaming App

## 📱 About
A cross-platform podcast streaming app built with React Native and Supabase. Stream podcasts, download for offline listening, manage your library, and receive notifications for new episodes.

## ✨ Features

### ✅ Implemented
- **Authentication:** Email, Google, and Apple Sign-In
- **Browse & Search:** Discover trending and new podcast episodes
- **Player:** Full-featured audio player with background playback
- **Mini-Player:** Persistent mini-player across screens
- **Library:** Like episodes, download for offline, view history
- **Profile:** Edit avatar, bio, username, view recently played
- **Notifications:** Push notifications for new episodes (OneSignal)
- **Offline Support:** Download episodes for offline listening
- **UI Design:** Matches Figma design with custom fonts

## 🛠️ Tech Stack

- **Framework:** React Native (CLI) v0.82.1
- **Language:** TypeScript
- **State Management:** Redux Toolkit
- **Backend:** Supabase (Auth, Postgres, Storage)
- **Audio Player:** react-native-track-player
- **Notifications:** OneSignal
- **Storage:** react-native-fs for offline downloads
- **Styling:** StyleSheet with custom fonts (Inter, Manrope, PublicSans)

## 📂 Project Structure

```
src/
├── Appnavigation/      # Navigation setup
├── Screen/             # All screens (Auth, Dashboard)
│   ├── Auth/          # Login, Register screens
│   └── Dashboard/     # Home, Player, Library, Profile, etc.
├── components/         # Reusable components (MiniPlayer, etc.)
├── redux/              # Redux slices and store
├── services/           # API services (Database, Download, Notification)
├── assets/             # Images and custom fonts
└── types/              # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20
- React Native development environment setup
- Android Studio (for Android)
- Xcode (for iOS, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/bootcampwise/Project2-PodCastApp.git
   cd Project2-PodCastApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   
   Create `.env` file in root:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ONESIGNAL_APP_ID=your_onesignal_app_id
   GOOGLE_WEB_CLIENT_ID=your_google_client_id
   ```

4. **Link custom fonts**
   ```bash
   npx react-native-asset
   ```

### Running the App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
cd ios && pod install && cd ..
npm run ios
```

## 📦 Building APK

### Debug APK
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK
1. Generate signing key:
   ```bash
   cd android/app
   keytool -genkeypair -v -storetype PKCS12 -keystore podapp-release-key.keystore -alias podapp-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure `android/gradle.properties`
3. Build:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

## 🗄️ Database Schema

### Tables (Supabase)
- **profiles:** User profiles
- **episodes:** Podcast episodes
- **user_library:** User's library (liked, downloaded, history)
- **user_notifications:** Notification history
- **app_settings:** App configuration

### Storage Buckets
- **avatars:** User profile pictures

## 🔔 Notifications

Powered by OneSignal and Supabase Edge Functions:
- `check-new-episodes`: Scheduled function to check RSS feed and send push notifications

## 📸 Screenshots

[Add your screenshots here]

## 🎨 Design

UI designed to match Figma specifications with:
- Custom color scheme (#A637FF primary)
- Custom fonts (Inter, Manrope, PublicSans)
- Responsive layouts for all screen sizes

## 🧪 Testing

Run tests:
```bash
npm test
```

## 📝 License

This project is for educational purposes.

## 👤 Author

**Hamza Ahmad Mahar**
- GitHub: [@maharonline](https://github.com/maharonline)
- Organization: [BootCampWise](https://github.com/bootcampwise)

## 🙏 Acknowledgments

- BBC Podcasts for RSS feed
- Supabase for backend services
- OneSignal for push notifications
