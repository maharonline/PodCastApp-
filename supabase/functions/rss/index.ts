// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { XMLParser } from "npm:fast-xml-parser@4.3.2";
// const RSS_URL = "https://podcasts.files.bbci.co.uk/p01plr2p.rss";
// serve(async (req)=>{
//   try {
//     const response = await fetch(RSS_URL);
//     const xmlText = await response.text();
//     const parser = new XMLParser({
//       ignoreAttributes: false,
//       attributeNamePrefix: ""
//     });
//     const json = parser.parse(xmlText);
//     const channel = json?.rss?.channel;
//     if (!channel) {
//       return new Response(JSON.stringify({
//         episodes: []
//       }), {
//         status: 200,
//         headers: {
//           "Content-Type": "application/json"
//         }
//       });
//     }
//     const mainImage = channel["itunes:image"]?.href || channel?.image?.url || "https://via.placeholder.com/400";
//     const rawItems = channel.item;
//     const itemsArray = rawItems ? Array.isArray(rawItems) ? rawItems : [
//       rawItems
//     ] : [];
//     const episodes = itemsArray.filter((item)=>!!(item && (item.enclosure?.url || item["enclosure"]?.url))).map((item)=>({
//         title: item?.title || "No Title",
//         description: item?.description || "",
//         pubDate: item?.pubDate || "",
//         audioUrl: item?.enclosure?.url || item?.["enclosure"]?.url || null,
//         image: mainImage
//       }));
//     return new Response(JSON.stringify({
//       episodes
//     }), {
//       status: 200,
//       headers: {
//         "Content-Type": "application/json"
//       }
//     });
//   } catch (err) {
//     console.error("RSS Fetch Error:", err);
//     return new Response(JSON.stringify({
//       error: "Failed to fetch RSS"
//     }), {
//       status: 500,
//       headers: {
//         "Content-Type": "application/json"
//       }
//     });
//   }
// });


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { XMLParser } from "npm:fast-xml-parser@4.3.2";

const RSS_URL = "https://podcasts.files.bbci.co.uk/p01plr2p.rss";

// Simple in-memory cache
let cachedData: any = null;
let lastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
    try {
        const now = Date.now();

        // Return cached data if not expired
        if (cachedData && now - lastFetched < CACHE_DURATION) {
            return new Response(JSON.stringify(cachedData), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Fetch RSS from BBC
        const response = await fetch(RSS_URL);
        const xmlText = await response.text();

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "",
        });

        const json = parser.parse(xmlText);
        const channel = json?.rss?.channel;

        if (!channel) {
            return new Response(JSON.stringify({ episodes: [] }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const mainImage =
            channel["itunes:image"]?.href ||
            channel?.image?.url ||
            "https://via.placeholder.com/400";

        const rawItems = channel.item;
        const itemsArray = rawItems
            ? Array.isArray(rawItems)
                ? rawItems
                : [rawItems]
            : [];

        const episodes = itemsArray
            .filter((item) => !!(item && (item.enclosure?.url || item["enclosure"]?.url)))
            .map((item) => ({
                title: item?.title || "No Title",
                description: item?.description || "",
                pubDate: item?.pubDate || "",
                audioUrl: item?.enclosure?.url || item?.["enclosure"]?.url || null,
                image: mainImage,
            }));

        // Update cache
        cachedData = { episodes };
        lastFetched = now;

        return new Response(JSON.stringify({ episodes }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("RSS Fetch Error:", err);
        return new Response(JSON.stringify({ error: "Failed to fetch RSS" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
