type MusicKitPlaybackState = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type MusicKitSongAttributes = {
  name?: string;
  artistName?: string;
  albumName?: string;
  artwork?: {
    url?: string;
    width?: number;
    height?: number;
  };
  durationInMillis?: number;
};

type MusicKitSong = {
  id: string;
  type: string;
  attributes?: MusicKitSongAttributes;
};

type MusicKitSearchResults = {
  results?: {
    songs?: {
      data?: MusicKitSong[];
    };
  };
};

type MusicKitAuthorizeResponse = string | null;

interface MusicKitInstance {
  authorize(): Promise<MusicKitAuthorizeResponse>;
  setQueue(payload: { song: string } | { songs: string[] }): Promise<unknown>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  readonly isAuthorized: boolean;
  readonly musicUserToken?: string | null;
  readonly nowPlayingItem?: MusicKitSong | null;
  readonly playbackState?: MusicKitPlaybackState;
}

interface MusicKitConstructor {
  configure(options: {
    developerToken: string;
    app: {
      name: string;
      build: string;
    };
  }): MusicKitInstance | Promise<MusicKitInstance>;
  getInstance(): MusicKitInstance | undefined;
}

interface Window {
  MusicKit?: MusicKitConstructor;
}
