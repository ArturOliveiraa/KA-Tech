import axios from "axios";

export const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([^&?/\s]{11})/);
  return match ? match[1] : null;
};

export const youTubeThumb = (url: string) => {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
};

/** Duração do vídeo em minutos (3 quando não dá para descobrir). */
export async function fetchYoutubeDuration(url: string): Promise<number> {
  try {
    const videoId = getYouTubeId(url);
    if (!videoId) return 3;
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) return 3;

    const { data } = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`);
    if (!data.items?.length) return 3;

    const durationISO = data.items[0].contentDetails.duration;
    const hours = durationISO.match(/(\d+)H/)?.[1] || "0";
    const minutes = durationISO.match(/(\d+)M/)?.[1] || "0";
    const seconds = durationISO.match(/(\d+)S/)?.[1] || "0";
    return parseFloat((parseInt(hours) * 60 + parseInt(minutes) + parseInt(seconds) / 60).toFixed(2));
  } catch {
    return 3;
  }
}
