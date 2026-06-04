import { Video, BackendResponse, Quality } from '@/types';
import { logger } from './logger';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000';
const REQUEST_TIMEOUT = 30000;

class BackendService {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;

  constructor() {
    this.baseUrl = BACKEND_URL;
  }

  async analyzeVideo(url: string): Promise<Video> {
    logger.debug('Backend', `Analyzing video: ${url}`);

    const response = await fetch(`${this.baseUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const data: BackendResponse<Video> = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Analysis failed');
    }

    return data.data!;
  }

  async getQualities(url: string): Promise<Quality[]> {
    logger.debug('Backend', `Getting qualities for: ${url}`);

    const response = await fetch(`${this.baseUrl}/api/qualities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Failed to get qualities: ${response.statusText}`);
    }

    const data: BackendResponse<Quality[]> = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to get qualities');
    }

    return data.data || [];
  }

  async startDownload(
    url: string,
    quality: Quality,
    filename: string
  ): Promise<{ taskId: string }> {
    logger.info('Backend', `Starting download: ${filename}`);

    const response = await fetch(`${this.baseUrl}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, quality, filename }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Download start failed: ${response.statusText}`);
    }

    const data: BackendResponse<{ taskId: string }> = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Download start failed');
    }

    return data.data!;
  }

  async getDownloadStatus(taskId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/status/${taskId}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }

    const data: BackendResponse = await response.json();
    return data.data;
  }

  async cancelDownload(taskId: string): Promise<void> {
    logger.info('Backend', `Canceling download: ${taskId}`);

    const response = await fetch(`${this.baseUrl}/api/cancel/${taskId}`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(`Cancel failed: ${response.statusText}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      logger.error('Backend', 'Health check failed', error);
      return false;
    }
  }

  connectWebSocket(onMessage: (data: any) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.baseUrl.replace('http', 'ws');
        this.wsConnection = new WebSocket(`${wsUrl}/ws`);

        this.wsConnection.onopen = () => {
          logger.info('Backend', 'WebSocket connected');
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            logger.error('Backend', 'Failed to parse WebSocket message', error);
          }
        };

        this.wsConnection.onerror = (error) => {
          logger.error('Backend', 'WebSocket error', error);
          reject(error);
        };

        this.wsConnection.onclose = () => {
          logger.info('Backend', 'WebSocket disconnected');
        };
      } catch (error) {
        logger.error('Backend', 'WebSocket connection failed', error);
        reject(error);
      }
    });
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  sendWebSocketMessage(data: any): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(data));
    }
  }
}

export const backend = new BackendService();
