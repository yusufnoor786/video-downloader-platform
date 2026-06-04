// Extension Types

export interface Video {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  duration: number;
  resolution: string;
  platform: string;
  qualities: Quality[];
  metadata?: VideoMetadata;
  detectedAt: number;
}

export interface Quality {
  label: string;
  value: number;
  format: string;
  codec?: string;
  fps?: number;
  bitrate?: number;
  size?: number;
}

export interface VideoMetadata {
  title: string;
  description?: string;
  author?: string;
  uploadDate?: string;
  thumbnail: string;
  duration: number;
}

export interface Download {
  id: string;
  taskId: string;
  videoId: string;
  url: string;
  title: string;
  quality: Quality;
  status: 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';
  progress: number;
  speed?: number;
  eta?: number;
  fileSize?: number;
  filePath?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface ExtensionMessage {
  action: string;
  payload?: any;
  id?: string;
}

export interface BackendResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DetectorConfig {
  enableYouTube: boolean;
  enableFacebook: boolean;
  enableInstagram: boolean;
  enableTikTok: boolean;
  enableTwitter: boolean;
  enableGeneric: boolean;
  deepScan: boolean;
  backgroundScan: boolean;
  autoRefresh: boolean;
}

export interface ExtensionSettings {
  defaultQuality: number;
  preferredFormat: string;
  autoDownload: boolean;
  downloadLocation: string;
  namingTemplate: string;
  detectorConfig: DetectorConfig;
  developerMode: boolean;
  enableDebugLogs: boolean;
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  module: string;
  message: string;
  context?: any;
}
