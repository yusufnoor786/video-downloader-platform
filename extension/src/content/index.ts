// Content Script - Runs in page context
// Monitors for video elements and detects video availability

interface DetectedVideo {
  id: string;
  url: string;
  title: string;
  duration: number;
}

class ContentScriptManager {
  private videoElements: Map<string, HTMLVideoElement> = new Map();
  private observer: MutationObserver | null = null;
  private lastUrl: string = '';

  constructor() {
    this.init();
  }

  private init(): void {
    // Monitor for URL changes
    this.monitorUrlChanges();
    
    // Monitor DOM for video elements
    this.monitorVideoElements();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
    });
  }

  private monitorUrlChanges(): void {
    // Listen for History API changes
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = (...args) => {
      originalPushState.apply(window.history, args);
      this.onUrlChange();
      return undefined;
    };

    window.history.replaceState = (...args) => {
      originalReplaceState.apply(window.history, args);
      this.onUrlChange();
      return undefined;
    };

    // Listen for popstate events
    window.addEventListener('popstate', () => this.onUrlChange());
  }

  private onUrlChange(): void {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      this.notifyVideoChanged();
      this.scanForVideos();
    }
  }

  private monitorVideoElements(): void {
    // Initial scan
    this.scanForVideos();

    // Set up MutationObserver for DOM changes
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-src'],
    };

    this.observer = new MutationObserver(() => {
      // Debounce scanning
      clearTimeout((this as any).scanTimeout);
      (this as any).scanTimeout = setTimeout(() => {
        this.scanForVideos();
      }, 500);
    });

    this.observer.observe(document.documentElement, config);
  }

  private scanForVideos(): void {
    const videos = this.findAllVideos();
    if (videos.length > 0) {
      chrome.runtime.sendMessage({
        action: 'videosDetected',
        data: videos,
        url: window.location.href,
      }).catch(error => {
        console.debug('Failed to send message to background', error);
      });
    }
  }

  private findAllVideos(): DetectedVideo[] {
    const videos: DetectedVideo[] = [];
    
    // Find HTML5 video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach((video, index) => {
      if (video.src || video.querySelector('source')) {
        const src = video.src || video.querySelector('source')?.getAttribute('src') || '';
        if (src) {
          videos.push({
            id: `video-${index}`,
            url: src,
            title: document.title,
            duration: video.duration || 0,
          });
        }
      }
    });

    // Find platform-specific videos (YouTube, Facebook, etc.)
    const platformVideos = this.detectPlatformVideos();
    videos.push(...platformVideos);

    return videos;
  }

  private detectPlatformVideos(): DetectedVideo[] {
    const videos: DetectedVideo[] = [];
    const url = window.location.href;

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = this.extractYouTubeId(url);
      if (videoId) {
        videos.push({
          id: `youtube-${videoId}`,
          url: url,
          title: (document.querySelector('h1 yt-formatted-string') as HTMLElement)?.innerText || document.title,
          duration: 0,
        });
      }
    }

    // Facebook
    if (url.includes('facebook.com')) {
      const videoContainer = document.querySelector('[role="article"] video');
      if (videoContainer) {
        videos.push({
          id: `facebook-${Date.now()}`,
          url: url,
          title: 'Facebook Video',
          duration: 0,
        });
      }
    }

    // Instagram
    if (url.includes('instagram.com')) {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videos.push({
          id: `instagram-${Date.now()}`,
          url: url,
          title: 'Instagram Video',
          duration: 0,
        });
      }
    }

    return videos;
  }

  private extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? match[1] : null;
  }

  private notifyVideoChanged(): void {
    chrome.runtime.sendMessage({
      action: 'videoChanged',
      url: window.location.href,
    }).catch(error => {
      console.debug('Failed to send videoChanged message', error);
    });
  }

  private handleMessage(message: any, sendResponse: (response?: any) => void): void {
    switch (message.action) {
      case 'ping':
        sendResponse({ status: 'ok' });
        break;
      case 'getPageTitle':
        sendResponse({ title: document.title });
        break;
      case 'scanNow':
        this.scanForVideos();
        sendResponse({ scanned: true });
        break;
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
}

// Initialize content script
new ContentScriptManager();
