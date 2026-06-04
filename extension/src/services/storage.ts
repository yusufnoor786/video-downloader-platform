import { Video, Download, LogEntry, ExtensionSettings } from '@/types';

const LOG_MAX_SIZE = 10000;
const VIDEO_CACHE_DURATION = 5 * 60 * 1000;

class StorageManager {
  async getVideos(): Promise<Video[]> {
    const result = await chrome.storage.local.get('videos');
    return result.videos || [];
  }

  async setVideos(videos: Video[]): Promise<void> {
    await chrome.storage.local.set({ 
      videos, 
      videosUpdatedAt: Date.now() 
    });
  }

  async addVideo(video: Video): Promise<void> {
    const videos = await this.getVideos();
    const exists = videos.find((v) => v.id === video.id);
    if (!exists) {
      videos.push(video);
      await this.setVideos(videos);
    }
  }

  async updateVideo(videoId: string, updates: Partial<Video>): Promise<void> {
    const videos = await this.getVideos();
    const video = videos.find((v) => v.id === videoId);
    if (video) {
      Object.assign(video, updates);
      await this.setVideos(videos);
    }
  }

  async clearVideos(): Promise<void> {
    await chrome.storage.local.set({ videos: [], videosUpdatedAt: null });
  }

  async getDownloads(): Promise<Download[]> {
    const result = await chrome.storage.local.get('downloads');
    return result.downloads || [];
  }

  async addDownload(download: Download): Promise<void> {
    const downloads = await this.getDownloads();
    downloads.push(download);
    await chrome.storage.local.set({ downloads });
  }

  async updateDownload(
    downloadId: string,
    updates: Partial<Download>
  ): Promise<void> {
    const downloads = await this.getDownloads();
    const download = downloads.find((d) => d.id === downloadId);
    if (download) {
      Object.assign(download, updates);
      await chrome.storage.local.set({ downloads });
    }
  }

  async removeDownload(downloadId: string): Promise<void> {
    const downloads = await this.getDownloads();
    const filtered = downloads.filter((d) => d.id !== downloadId);
    await chrome.storage.local.set({ downloads: filtered });
  }

  async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.sync.get('settings');
    return (
      result.settings || {
        defaultQuality: 1080,
        preferredFormat: 'mp4',
        autoDownload: false,
        downloadLocation: 'Downloads',
        namingTemplate: '{title}.{ext}',
        detectorConfig: {
          enableYouTube: true,
          enableFacebook: true,
          enableInstagram: true,
          enableTikTok: true,
          enableTwitter: true,
          enableGeneric: true,
          deepScan: false,
          backgroundScan: true,
          autoRefresh: true,
        },
        developerMode: false,
        enableDebugLogs: false,
        theme: 'auto',
        compactMode: false,
      }
    );
  }

  async updateSettings(updates: Partial<ExtensionSettings>): Promise<void> {
    const settings = await this.getSettings();
    const merged = { ...settings, ...updates };
    await chrome.storage.sync.set({ settings: merged });
  }

  async addLog(entry: LogEntry): Promise<void> {
    const result = await chrome.storage.local.get('logs');
    const logs: LogEntry[] = result.logs || [];

    logs.push(entry);

    if (logs.length > LOG_MAX_SIZE) {
      logs.splice(0, logs.length - LOG_MAX_SIZE);
    }

    await chrome.storage.local.set({ logs });
  }

  async getLogs(filter?: { level?: string; module?: string }): Promise<LogEntry[]> {
    const result = await chrome.storage.local.get('logs');
    let logs: LogEntry[] = result.logs || [];

    if (filter?.level) {
      logs = logs.filter((l) => l.level === filter.level);
    }

    if (filter?.module) {
      logs = logs.filter((l) => l.module === filter.module);
    }

    return logs;
  }

  async clearLogs(): Promise<void> {
    await chrome.storage.local.set({ logs: [] });
  }

  async exportData(): Promise<{
    videos: Video[];
    downloads: Download[];
    logs: LogEntry[];
    settings: ExtensionSettings;
  }> {
    const [videos, downloads, logs, settings] = await Promise.all([
      this.getVideos(),
      this.getDownloads(),
      this.getLogs(),
      this.getSettings(),
    ]);

    return { videos, downloads, logs, settings };
  }

  async importData(data: {
    videos?: Video[];
    downloads?: Download[];
    settings?: ExtensionSettings;
  }): Promise<void> {
    if (data.videos) {
      await chrome.storage.local.set({ videos: data.videos });
    }
    if (data.downloads) {
      await chrome.storage.local.set({ downloads: data.downloads });
    }
    if (data.settings) {
      await chrome.storage.sync.set({ settings: data.settings });
    }
  }
}

export const storage = new StorageManager();
