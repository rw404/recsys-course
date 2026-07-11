export type MovieGenre =
  | 'Action'
  | 'Adventure'
  | 'Animation'
  | 'Comedy'
  | 'Crime'
  | 'Documentary'
  | 'Drama'
  | 'Family'
  | 'Mystery'
  | 'Romance'
  | 'Sci-Fi'
  | 'Thriller'

export interface SandboxMovie {
  id: string
  title: string
  year: number
  genres: MovieGenre[]
  tone: string
  mark: string
}

export interface SandboxViewer {
  id: string
  name: string
  cohort: string
  favoriteGenres: MovieGenre[]
  note: string
}

export interface SandboxRating {
  viewerId: string
  movieId: string
  rating: number
}

export const SANDBOX_MOVIES: SandboxMovie[] = [
  { id: 'm01', title: 'Neon Harbor', year: 1998, genres: ['Sci-Fi', 'Mystery'], tone: '#2eb6b0', mark: 'NH' },
  { id: 'm02', title: 'Paper Moons', year: 1995, genres: ['Drama', 'Romance'], tone: '#ef7c86', mark: 'PM' },
  { id: 'm03', title: 'Static Summer', year: 1997, genres: ['Comedy', 'Romance'], tone: '#f2b84b', mark: 'SS' },
  { id: 'm04', title: 'Midnight Circuit', year: 1999, genres: ['Action', 'Sci-Fi'], tone: '#536ccf', mark: 'MC' },
  { id: 'm05', title: 'The Last Frequency', year: 1996, genres: ['Drama', 'Mystery'], tone: '#8d70ca', mark: 'LF' },
  { id: 'm06', title: 'Little Atlas', year: 1995, genres: ['Animation', 'Adventure'], tone: '#5eb87d', mark: 'LA' },
  { id: 'm07', title: 'Northern Line', year: 1998, genres: ['Thriller', 'Crime'], tone: '#54798c', mark: 'NL' },
  { id: 'm08', title: 'Second Breakfast', year: 1996, genres: ['Comedy', 'Family'], tone: '#dc8f4f', mark: 'SB' },
  { id: 'm09', title: 'Glass Horizon', year: 2000, genres: ['Sci-Fi', 'Drama'], tone: '#39a2c0', mark: 'GH' },
  { id: 'm10', title: 'Soft Focus', year: 1994, genres: ['Romance', 'Drama'], tone: '#d56f9e', mark: 'SF' },
  { id: 'm11', title: 'Deep Signal', year: 1999, genres: ['Mystery', 'Thriller'], tone: '#4963a8', mark: 'DS' },
  { id: 'm12', title: 'City of Kites', year: 1997, genres: ['Adventure', 'Drama'], tone: '#4fa996', mark: 'CK' },
  { id: 'm13', title: 'Analog Hearts', year: 2001, genres: ['Romance', 'Comedy'], tone: '#ed6b72', mark: 'AH' },
  { id: 'm14', title: 'One More Level', year: 1998, genres: ['Action', 'Comedy'], tone: '#eb9a3d', mark: 'OL' },
  { id: 'm15', title: 'Quiet Machines', year: 2000, genres: ['Documentary', 'Sci-Fi'], tone: '#628f95', mark: 'QM' },
  { id: 'm16', title: 'Orchard Road', year: 1995, genres: ['Family', 'Drama'], tone: '#78a85a', mark: 'OR' },
  { id: 'm17', title: 'Parallel Nights', year: 1996, genres: ['Crime', 'Mystery'], tone: '#6b668f', mark: 'PN' },
  { id: 'm18', title: 'Weekend Orbit', year: 2001, genres: ['Comedy', 'Sci-Fi'], tone: '#dc6e57', mark: 'WO' },
]

export const SANDBOX_VIEWERS: SandboxViewer[] = [
  {
    id: 'u104',
    name: 'Maya',
    cohort: 'Sci-fi explorer',
    favoriteGenres: ['Sci-Fi', 'Mystery'],
    note: 'Likes speculative worlds, precise mysteries and a little action.',
  },
  {
    id: 'u219',
    name: 'Anton',
    cohort: 'Weekend optimist',
    favoriteGenres: ['Comedy', 'Adventure'],
    note: 'Looks for light, energetic films that work for a group.',
  },
  {
    id: 'u337',
    name: 'Leila',
    cohort: 'Character reader',
    favoriteGenres: ['Drama', 'Romance'],
    note: 'Prefers intimate stories, relationships and slower pacing.',
  },
  {
    id: 'u512',
    name: 'Ken',
    cohort: 'Night investigator',
    favoriteGenres: ['Crime', 'Thriller'],
    note: 'Follows tension, mysteries and tightly plotted crime stories.',
  },
  {
    id: 'u608',
    name: 'Rina',
    cohort: 'Family curator',
    favoriteGenres: ['Family', 'Animation'],
    note: 'Balances warm family films with playful visual storytelling.',
  },
  {
    id: 'u731',
    name: 'Omar',
    cohort: 'Genre omnivore',
    favoriteGenres: ['Action', 'Drama'],
    note: 'Moves between spectacle and grounded, emotional stories.',
  },
  {
    id: 'u845',
    name: 'Noa',
    cohort: 'Curious observer',
    favoriteGenres: ['Documentary', 'Mystery'],
    note: 'Enjoys unfamiliar topics and films that reward close attention.',
  },
  {
    id: 'u916',
    name: 'Iris',
    cohort: 'Rom-com loyalist',
    favoriteGenres: ['Romance', 'Comedy'],
    note: 'Returns to optimistic relationships and quick dialogue.',
  },
]

const RATING_ROWS: Record<string, Record<string, number>> = {
  u104: { m01: 5, m04: 4.5, m05: 4, m07: 3, m11: 4.5, m15: 4 },
  u219: { m03: 4.5, m06: 4, m08: 5, m12: 4, m14: 4.5, m18: 4 },
  u337: { m02: 5, m03: 3.5, m05: 4.5, m09: 4, m10: 4.5, m13: 4, m16: 4 },
  u512: { m01: 3.5, m05: 4, m07: 5, m11: 4.5, m14: 3, m17: 4.5 },
  u608: { m03: 4, m06: 5, m08: 4.5, m12: 3.5, m14: 3.5, m16: 4.5 },
  u731: { m02: 3.5, m04: 5, m07: 4, m09: 4.5, m12: 4, m14: 4.5, m17: 3.5 },
  u845: { m01: 4.5, m05: 4, m09: 4, m11: 5, m15: 4.5, m17: 4 },
  u916: { m02: 4.5, m03: 5, m08: 4, m10: 4.5, m13: 5, m18: 4 },
}

export const SANDBOX_RATINGS: SandboxRating[] = Object.entries(RATING_ROWS).flatMap(
  ([viewerId, ratings]) => Object.entries(ratings).map(([movieId, rating]) => ({ viewerId, movieId, rating })),
)

export const SANDBOX_MOVIE_BY_ID = Object.fromEntries(
  SANDBOX_MOVIES.map((movie) => [movie.id, movie]),
) as Record<string, SandboxMovie>

export const SANDBOX_VIEWER_BY_ID = Object.fromEntries(
  SANDBOX_VIEWERS.map((viewer) => [viewer.id, viewer]),
) as Record<string, SandboxViewer>

