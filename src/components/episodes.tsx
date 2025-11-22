import { Episode } from './types';
import { XMLParser } from 'fast-xml-parser';

export const fetchEpisodes = async (rssUrl: string): Promise<Episode[]> => {
  try {
    const res = await fetch(rssUrl);
    const text = await res.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });
    const result = parser.parse(text);

    // RSS feed structure: rss > channel > item[]
    const items = result.rss?.channel?.item || [];
    const episodes: Episode[] = items.map((item: any) => ({
      title: item.title,
      audioUrl: item.enclosure?.url || '', // audio file URL
    }));

    return episodes;
  } catch (err) {
    console.error("Failed to fetch episodes:", err);
    return [];
  }
};
