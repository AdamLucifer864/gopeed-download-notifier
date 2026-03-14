// Store for tracking active downloads
const activeDownloads = new Map();

// Register the resolve event handler
gopeed.events.onResolve((ctx) => {
  const url = ctx.req.url;
  const fileName = url.split('/').pop() || 'Unknown file';
  
  // Generate a unique ID for this download
  const downloadId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  // Store download information
  activeDownloads.set(downloadId, {
    id: downloadId,
    name: fileName,
    url: url,
    startTime: new Date(),
    status: 'starting',
    size: 0,
    progress: 0
  });
  
  // Add metadata to the download for tracking
  if (!ctx.res) {
    ctx.res = {
      name: fileName,
      resources: [{
        name: fileName,
        url: url,
        metadata: {
          downloadId: downloadId,
          trackCompletion: true
        }
      }]
    };
  } else if (ctx.res && ctx.res.resources) {
    // If resources already exist, add tracking metadata
    ctx.res.resources.forEach(resource => {
      resource.metadata = {
        ...resource.metadata,
        downloadId: downloadId,
        trackCompletion: true
      };
    });
  }
  
  console.log(`[Download Notifier] Tracking: ${fileName}`);
});

// Since there's no onComplete event in the docs,
// we need to periodically check download status
// This function would need to be called periodically
function checkDownloadStatus() {
  // This is a conceptual function - Gopeed would need to provide
  // an API to get current download statuses
  
  activeDownloads.forEach((download, id) => {
    // In a real implementation, you would:
    // 1. Query Gopeed for download status
    // 2. Check if it's complete
    // 3. Send notification if complete and not already notified
    
    /*
    gopeed.getDownloadStatus(id, (status) => {
      if (status === 'completed' && !download.notified) {
        sendNotification(download);
        download.notified = true;
      }
    });
    */
  });
}

// Send notification function
function sendNotification(download) {
  const settings = getSettings();
  
  if (!settings.notifyOnAll) return;
  
  // Check file size if minimum is set
  if (settings.minFileSize > 0 && download.size < settings.minFileSize * 1024 * 1024) {
    return;
  }
  
  // Create notification message
  const message = {
    title: 'Download Completed',
    body: `${download.name} has finished downloading`,
    icon: 'icon.png',
    silent: !settings.notifySound
  };
  
  // Try to send notification using available methods
  sendSystemNotification(message);
}

// Notification handler (`notifier.js`)
function sendSystemNotification(message) {
  // Attempt to use system notifications based on platform
  
  // For desktop environments, we might try different methods
  try {
    // Method 1: Use Notification API if available (browser-like)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(message.title, {
        body: message.body,
        icon: message.icon,
        silent: message.silent
      });
    }
    // Method 2: Use console output as fallback
    else {
      console.log(`🔔 NOTIFICATION: ${message.title} - ${message.body}`);
    }
  } catch (e) {
    // Method 3: Simple console log as last resort
    console.log(`[Download Complete] ${message.body}`);
  }
}

// Helper to get settings
function getSettings() {
  // This would need to access Gopeed's settings API
  // For now, return defaults
  return {
    notifyOnAll: true,
    notifySound: true,
    minFileSize: 0
  };
}

// Since we can't periodically check, we might need to
// hook into the download completion through other means
// This function would be called when a download resource is processed
function onDownloadResource(resource) {
  if (resource.metadata && resource.metadata.trackCompletion) {
    const downloadId = resource.metadata.downloadId;
    const download = activeDownloads.get(downloadId);
    
    if (download) {
      download.size = resource.size || 0;
      download.status = 'completed';
      download.endTime = new Date();
      
      // Calculate duration
      const duration = (download.endTime - download.startTime) / 1000;
      
      // Send notification
      sendNotification({
        ...download,
        duration: duration
      });
      
      // Clean up after 5 minutes
      setTimeout(() => {
        activeDownloads.delete(downloadId);
      }, 300000);
    }
  }
}
