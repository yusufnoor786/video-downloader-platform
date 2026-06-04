// Background Service Worker
// Coordinates between content scripts, popup, and backend API

import { storage } from '@/services/storage';
import { backend } from '@/services/backend';
import { logger } from '@/services/logger';
import { Download } from '@/types';

class BackgroundWorker {
  private downloadTracker: Map<string, Download> = new Map();
  private wsConnected: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    logger.info('Background', 'Service worker initializing');

    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async responses
    });

    // Connect to backend WebSocket
    await this.connectBackend();

    logger.info('Background', 'Service worker ready');
  }

  private async connectBackend(): Promise<void> {
    try {
      const isHealthy = await backend.healthCheck();
      if (isHealthy) {
        logger.info('Background', 'Backend health check passed');
        
        await backend.connectWebSocket((data) => {
          this.handleBackendMessage(data);
        });
        
        this.wsConnected = true;
        this.notifyPopup({ action: 'backendConnected', status: true });
      } else {
        logger.warn('Background', 'Backend health check failed');
        this.notifyPopup({ action: 'backendConnected', status: false });
      }
    } catch (error) {
      logger.error('Background', 'Failed to connect backend', error);
      this.notifyPopup({ action: 'backendConnected', status: false });
    }
  }

  private async handleMessage(
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    logger.debug('Background', `Message received: ${message.action}`, { sender });

    try {
      switch (message.action) {
        case 'videosDetected':
          await this.handleVideosDetected(message.data, message.url);
          sendResponse({ status: 'ok' });
          break;

        case 'videoChanged':
          await this.handleVideoChanged(message.url);
          sendResponse({ status: 'ok' });
          break;

        case 'analyzeVideo':
          const analysis = await this.analyzeVideo(message.url);
          sendResponse(analysis);
          break;

        case 'startDownload':
          const downloadId = await this.startDownload(
            message.url,
            message.quality,
            message.filename
          );
          sendResponse({ downloadId });
          break;

        case 'cancelDownload':
          await this.cancelDownload(message.downloadId);
          sendResponse({ status: 'ok' });
          break;

        case 'getDownloads':
          const downloads = await storage.getDownloads();
          sendResponse({ downloads });
          break;

        case 'getSettings':
          const settings = await storage.getSettings();
          sendResponse({ settings });
          break;

        case 'updateSettings':
          await storage.updateSettings(message.settings);
          this.notifyPopup({ action: 'settingsUpdated' });
          sendResponse({ status: 'ok' });
          break;

        case 'getLogs':
          const logs = await storage.getLogs(message.filter);
          sendResponse({ logs });
          break;

        case 'clearLogs':
          await storage.clearLogs();
          sendResponse({ status: 'ok' });
          break;

        case 'exportData':
          const data = await storage.exportData();
          sendResponse(data);
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      logger.error('Background', `Error handling message: ${message.action}`, error);
      sendResponse({ error: String(error) });
    }
  }

  private async handleVideosDetected(videos: any[], pageUrl: string): Promise<void> {
    logger.info('Background', `Videos detected on page: ${videos.length}`);

    for (const video of videos) {
      try {
        const videoData = await this.analyzeVideo(video.url || pageUrl);
        await storage.addVideo(videoData);
      } catch (error) {
        logger.warn('Background', `Failed to analyze video`, error);
      }
    }

    this.notifyPopup({ action: 'videosUpdated', count: videos.length });
  }

  private async handleVideoChanged(url: string): Promise<void> {
    logger.info('Background', `Video changed: ${url}`);
    
    // Clear previous videos
    await storage.clearVideos();
    
    // Notify popup
    this.notifyPopup({ action: 'videoChanged', url });
  }

  private async analyzeVideo(url: string): Promise<any> {
    try {
      const video = await backend.analyzeVideo(url);
      logger.info('Background', `Video analyzed: ${video.title}`);
      return video;
    } catch (error) {
      logger.error('Background', `Failed to analyze video: ${url}`, error);
      throw error;
    }
  }

  private async startDownload(
    url: string,
    quality: any,
    filename: string
  ): Promise<string> {
    try {
      const downloadId = `download-${Date.now()}`;
      
      logger.info('Background', `Starting download: ${filename}`);

      // Create download record
      const download: Download = {
        id: downloadId,
        taskId: '',
        videoId: '',
        url,
        title: filename,
        quality,
        status: 'pending',
        progress: 0,
        startedAt: Date.now(),
      };

      await storage.addDownload(download);

      // Start backend download
      try {
        const result = await backend.startDownload(url, quality, filename);
        download.taskId = result.taskId;
        download.status = 'downloading';
        await storage.updateDownload(downloadId, { taskId: result.taskId, status: 'downloading' });
      } catch (error) {
        download.status = 'failed';
        download.error = String(error);
        await storage.updateDownload(downloadId, download);
        throw error;
      }

      this.notifyPopup({ action: 'downloadStarted', downloadId });
      return downloadId;
    } catch (error) {
      logger.error('Background', 'Failed to start download', error);
      throw error;
    }
  }

  private async cancelDownload(downloadId: string): Promise<void> {
    try {
      const downloads = await storage.getDownloads();
      const download = downloads.find((d) => d.id === downloadId);
      
      if (download && download.taskId) {
        await backend.cancelDownload(download.taskId);
        await storage.updateDownload(downloadId, { status: 'failed' });
        this.notifyPopup({ action: 'downloadCancelled', downloadId });
        logger.info('Background', `Download cancelled: ${downloadId}`);
      }
    } catch (error) {
      logger.error('Background', 'Failed to cancel download', error);
    }
  }

  private handleBackendMessage(data: any): void {
    logger.debug('Background', 'Backend message received', data);

    // Update download progress
    if (data.type === 'progress' && data.taskId) {
      const download = Array.from(this.downloadTracker.values()).find(
        (d) => d.taskId === data.taskId
      );

      if (download) {
        Object.assign(download, {
          progress: data.progress,
          speed: data.speed,
          eta: data.eta,
        });

        this.notifyPopup({ action: 'downloadProgress', download });
      }
    }

    // Handle download completion
    if (data.type === 'completed' && data.taskId) {
      const download = Array.from(this.downloadTracker.values()).find(
        (d) => d.taskId === data.taskId
      );

      if (download) {
        Object.assign(download, {
          status: 'completed',
          filePath: data.filePath,
          fileSize: data.fileSize,
          completedAt: Date.now(),
        });

        this.notifyPopup({ action: 'downloadCompleted', download });
      }
    }

    // Handle errors
    if (data.type === 'error' && data.taskId) {
      const download = Array.from(this.downloadTracker.values()).find(
        (d) => d.taskId === data.taskId
      );

      if (download) {
        Object.assign(download, {
          status: 'failed',
          error: data.error,
        });

        this.notifyPopup({ action: 'downloadError', download });
      }
    }
  }

  private notifyPopup(message: any): void {
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might not be open
    });
  }
}

// Initialize background worker
new BackgroundWorker();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.info('Background', 'Extension installed');
    chrome.runtime.openOptionsPage();
  }
});
