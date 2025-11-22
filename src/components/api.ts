// api.ts
export interface Podcast {
  collectionId: number;
  collectionName: string;
  artistName: string;
  feedUrl: string;
  artworkUrl100: string;
}

export const fetchPodcasts = async (term: string): Promise<Podcast[]> => {
  try {
    const res = await fetch(`https://itunes.apple.com/search?media=podcast&term=${term}&limit=10`);
    const data = await res.json();
    return data.results.map((item: any) => ({
      collectionId: item.collectionId,
      collectionName: item.collectionName,
      artistName: item.artistName,
      feedUrl: item.feedUrl,
      artworkUrl100: item.artworkUrl100,
    }));
  } catch (error) {
    console.error("Failed to fetch podcasts:", error);
    return [];
  }
};
