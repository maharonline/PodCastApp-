// ==========EPISODE TYPES================

export interface Episode {
  title: string;
  description?: string;
  pubDate?: string;
  audioUrl: string | null;
  image: string;
  id?: string;
  artist?: string;
  artwork?: string;
  pub_date?: string;
  image_url?: string;
  audio_url?: string;
  duration?: string;
  episode?: Episode; // For nested episode data
}

export interface EpisodeMetadata {
  title: string;
  image: string;
  audioUrl?: string;
  pubDate?: string;
}

// =========USER & AUTH TYPES================

export interface User {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  display_name?: string;
  // Supabase User compatibility
  app_metadata?: Record<string, unknown>;
  aud?: string;
  created_at?: string;
  updated_at?: string;
  phone?: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  phone_confirmed_at?: string;
  last_sign_in_at?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  theme: 'light' | 'dark';
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  liked_count?: number;
  history_count?: number;
}

export interface LibraryItem {
  id: string;
  user_id: string;
  episode_id: string;
  status: 'queue' | 'liked' | 'history' | 'downloaded';
  created_at: string;
  episode?: Episode;
}

// =========PLAYER TYPES================

export interface PlayerState {
  currentEpisode: Episode | null;
  episodes: Episode[];
  currentIndex: number;
  isPlaying: boolean;
  isLiked: boolean;
  isDownloaded: boolean;
}

// =========DOWNLOAD TYPES================

export interface DownloadProgress {
  episodeId: string;
  progress: number; // 0-1 or 0-100 depending on context
  bytesWritten: number;
  totalBytes: number;
  contentLength: number; // For RNFS compatibility
}

export interface DownloadedEpisode {
  id: string;
  user_id: string;
  episode_id: string;
  local_path: string;
  file_size: number;
  downloaded_at: string;
}

export interface DownloadState {
  activeDownloads: Record<string, DownloadProgress>;
  downloadedEpisodes: DownloadedEpisode[];
  totalCacheSize: number;
  error: string | null;
}

// =========NOTIFICATION TYPES================

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  date: number;
  read: boolean;
  data?: NotificationData;
}

export interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
}

export interface NotificationData {
  type?: string;
  episode_url?: string;
  episode_title?: string;
  episode_image?: string;
  episode_duration?: string;
  [key: string]: unknown;
}

// =========NAVIGATION TYPES================

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  MyLibrary: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Main: undefined;
  Player: { episodes: Episode[]; index: number; episode?: Episode };
  AllEpisodes: { episodes: Episode[] };
  Notifications: undefined;
};

export type StackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainApp: undefined;
};

// =========COMPONENT PROPS================

export interface PodcastCardProps {
  item: Episode;
  onPlay: () => void;
  onDownloadComplete?: () => void;
  isDownloaded: boolean;
  userId?: string;
}

export interface ScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
    [key: string]: unknown;
  };
  route?: {
    params?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// =========REDUX STORE TYPES================

export interface RootState {
  auth: AuthState;
  player: PlayerState;
  download: DownloadState;
  notifications: NotificationState;
}

export type AppDispatch = unknown; // Will be properly typed by store
