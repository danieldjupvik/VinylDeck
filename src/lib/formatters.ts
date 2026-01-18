export function getLimitedGenreParts(genres: string[], limit = 2): string[] {
  return genres
    .flatMap((genre) => genre.split(',').map((part) => part.trim()))
    .filter(Boolean)
    .slice(0, limit)
}
