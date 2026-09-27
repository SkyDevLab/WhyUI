import { MESSAGE_TYPES, ExtensionMessage } from '../shared/messages';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[WhyUI] Extension installed successfully. Published by SkyDevLab.');
});

// Relay messages if needed and maintain state in storage
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === MESSAGE_TYPES.ELEMENT_SELECTED) {
    chrome.storage.local.set({ whyui_current_analysis: message.payload });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === MESSAGE_TYPES.GET_CURRENT_ANALYSIS) {
    chrome.storage.local.get(['whyui_current_analysis'], (res) => {
      sendResponse({ payload: res.whyui_current_analysis || null });
    });
    return true;
  }

  return true;
});
