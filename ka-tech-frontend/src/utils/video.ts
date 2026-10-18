import { fetchYoutubeDuration, getYouTubeId } from "./youtube";

/** Vídeos das aulas são do YouTube. Aceita links completos, youtu.be, /live/, /shorts/ e o ID puro. */
export const parseVideoUrl = (url: string | null | undefined): { id: string } | null => {
  if (!url) return null;
  const id = getYouTubeId(url) || (url.length === 11 && !url.includes("/") ? url : null);
  return id ? { id } : null;
};

/** Duração em minutos (3 quando não dá para descobrir). */
export const fetchVideoDuration = (url: string) => fetchYoutubeDuration(url);

export const videoThumbSync = (url: string | null | undefined) => {
  const parsed = parseVideoUrl(url);
  return parsed ? `https://i.ytimg.com/vi/${parsed.id}/mqdefault.jpg` : null;
};
