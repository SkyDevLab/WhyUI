import { ElementPicker } from './elementPicker';
import { InPageHud } from './inPageHud';
import { analyzeElement } from '../analyzer';
import { getLastBlockingElement } from '../analyzer/overlayAnalyzer';
import { ElementWatcher } from '../analyzer/watcher';
import { MESSAGE_TYPES, ExtensionMessage } from '../shared/messages';
import { ElementAnalysis, StateChangeEvent } from '../shared/types';

let picker: ElementPicker | null = null;
let hud: InPageHud | null = null;
let watcher: ElementWatcher | null = null;
let currentSelectedElement: HTMLElement | null = null;
let currentAnalysis: ElementAnalysis | null = null;

function getHud(): InPageHud {
  if (!hud) {
    hud = new InPageHud();
    hud.setPickHandler(() => {
      startPicker();
    });
    hud.setWatchToggleHandler((watching) => {
      if (watching && currentSelectedElement) {
        startWatcher(currentSelectedElement);
      } else {
        stopWatcher();
      }
    });
    hud.setInspectBlockingHandler(() => {
      inspectBlockingElement();
    });
  }
  return hud;
}

function safeSendRuntimeMessage(message: any) {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(message, () => {
        // Consume lastError to avoid "Unchecked runtime.lastError: Could not establish connection"
        void chrome.runtime.lastError;
      });
    }
  } catch {
    // Ignore runtime disconnected exceptions
  }
}

function startWatcher(element: HTMLElement) {
  if (!watcher) {
    watcher = new ElementWatcher((event: StateChangeEvent) => {
      // Notify HUD
      hud?.addStateChange(event);

      // Notify popup if open
      safeSendRuntimeMessage({
        type: MESSAGE_TYPES.STATE_CHANGE_EVENT,
        payload: event,
      });
    });
  }
  watcher.start(element);
}

function stopWatcher() {
  if (watcher) {
    watcher.stop();
    watcher = null;
  }
}

function inspectBlockingElement(): boolean {
  const blockingEl = getLastBlockingElement();
  if (!blockingEl || !blockingEl.isConnected) {
    return false;
  }

  currentSelectedElement = blockingEl;
  currentAnalysis = analyzeElement(blockingEl);

  try {
    chrome.storage.local.set({ whyui_current_analysis: currentAnalysis });
  } catch {
    // storage fallback
  }

  const h = getHud();
  h.showAnalysis(currentAnalysis);

  safeSendRuntimeMessage({
    type: MESSAGE_TYPES.ELEMENT_SELECTED,
    payload: currentAnalysis,
  });

  return true;
}

function startPicker() {
  if (!picker) {
    picker = new ElementPicker();
  }

  // Temporarily minimize HUD during picking
  hud?.hide();

  picker.start({
    onSelect: (el: HTMLElement) => {
      currentSelectedElement = el;
      currentAnalysis = analyzeElement(el);

      // Save to chrome storage for popup access
      try {
        chrome.storage.local.set({ whyui_current_analysis: currentAnalysis });
      } catch {
        // storage fallback
      }

      // Show in in-page HUD
      const h = getHud();
      h.showAnalysis(currentAnalysis);

      // Send to extension popup / background
      safeSendRuntimeMessage({
        type: MESSAGE_TYPES.ELEMENT_SELECTED,
        payload: currentAnalysis,
      });
    },
    onCancel: () => {
      // Re-show HUD if there was an analysis
      if (currentAnalysis) {
        hud?.showAnalysis(currentAnalysis);
      }
    },
  });
}

function stopPicker() {
  if (picker) {
    picker.stop();
  }
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case MESSAGE_TYPES.START_SELECTION: {
      startPicker();
      sendResponse({ success: true });
      break;
    }

    case MESSAGE_TYPES.CANCEL_SELECTION: {
      stopPicker();
      sendResponse({ success: true });
      break;
    }

    case MESSAGE_TYPES.GET_CURRENT_ANALYSIS: {
      sendResponse({ payload: currentAnalysis });
      break;
    }

    case MESSAGE_TYPES.INSPECT_BLOCKING_ELEMENT: {
      const ok = inspectBlockingElement();
      sendResponse({ success: ok, payload: currentAnalysis });
      break;
    }

    case MESSAGE_TYPES.START_WATCHER: {
      if (currentSelectedElement) {
        startWatcher(currentSelectedElement);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No element selected to watch' });
      }
      break;
    }

    case MESSAGE_TYPES.STOP_WATCHER: {
      stopWatcher();
      sendResponse({ success: true });
      break;
    }

    case MESSAGE_TYPES.TOGGLE_IN_PAGE_HUD: {
      const h = getHud();
      if (currentAnalysis) {
        h.showAnalysis(currentAnalysis);
      }
      sendResponse({ success: true });
      break;
    }
  }

  return true;
});
