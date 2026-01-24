// src/utils/formatUrl.ts
export const formatSlug = (title: string) => {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-');
};