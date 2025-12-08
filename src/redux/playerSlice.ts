import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Episode, PlayerState } from '../types';

const initialState: PlayerState = {
  currentEpisode: null,
  episodes: [],
  currentIndex: 0,
  isPlaying: false,
  isLiked: false,
  isDownloaded: false,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setCurrentEpisode: (state, action: PayloadAction<Episode | null>) => {
      state.currentEpisode = action.payload;
    },
    setPlaylist: (
      state,
      action: PayloadAction<{ episodes: Episode[]; index: number }>,
    ) => {
      state.episodes = action.payload.episodes;
      state.currentIndex = action.payload.index;
      state.currentEpisode =
        action.payload.episodes[action.payload.index] || null;
    },
    setPlaybackState: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setCurrentIndex: (state, action: PayloadAction<number>) => {
      state.currentIndex = action.payload;
      state.currentEpisode = state.episodes[action.payload] || null;
    },
    setLikeStatus: (state, action: PayloadAction<boolean>) => {
      state.isLiked = action.payload;
    },
    setDownloadStatus: (state, action: PayloadAction<boolean>) => {
      state.isDownloaded = action.payload;
    },
    clearPlayer: state => {
      state.currentEpisode = null;
      state.episodes = [];
      state.currentIndex = 0;
      state.isPlaying = false;
      state.isLiked = false;
      state.isDownloaded = false;
    },
  },
});

export const {
  setCurrentEpisode,
  setPlaylist,
  setPlaybackState,
  setCurrentIndex,
  setLikeStatus,
  setDownloadStatus,
  clearPlayer,
} = playerSlice.actions;

export default playerSlice.reducer;
