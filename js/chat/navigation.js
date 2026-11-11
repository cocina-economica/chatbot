/**
 * Universal Sales Chat Engine - Navigation & History State
 * Maintains traversed path, user choices, and history snapshots.
 */

export class NavigationManager {
  constructor(storageService = null) {
    this.storage = storageService;
    this.history = [];
    this.currentNodeId = null;
    this.userState = {};
  }

  setCurrentNode(nodeId) {
    this.currentNodeId = nodeId;
    this.history.push({
      nodeId,
      timestamp: new Date().toISOString()
    });
    this.persist();
  }

  updateUserState(key, value) {
    this.userState[key] = value;
    this.persist();
  }

  getUserState() {
    return { ...this.userState };
  }

  getHistory() {
    return [...this.history];
  }

  canGoBack() {
    return this.history.length > 1;
  }

  getPreviousNodeId() {
    if (this.history.length < 2) return null;
    return this.history[this.history.length - 2].nodeId;
  }

  reset() {
    this.history = [];
    this.currentNodeId = null;
    this.userState = {};
    if (this.storage) {
      this.storage.clearChatHistory();
      this.storage.clearUserState();
    }
  }

  persist() {
    if (this.storage) {
      this.storage.saveChatHistory(this.history);
      this.storage.saveUserState(this.userState);
    }
  }

  restore() {
    if (this.storage) {
      const savedHistory = this.storage.loadChatHistory();
      const savedState = this.storage.loadUserState();
      if (Array.isArray(savedHistory) && savedHistory.length > 0) {
        this.history = savedHistory;
        this.currentNodeId = savedHistory[savedHistory.length - 1].nodeId;
      }
      if (savedState && typeof savedState === 'object') {
        this.userState = savedState;
      }
    }
  }
}
