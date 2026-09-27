import { ElementAnalysis, StateChangeEvent } from './types';

export const MESSAGE_TYPES = {
  START_SELECTION: 'WHYUI_START_SELECTION',
  CANCEL_SELECTION: 'WHYUI_CANCEL_SELECTION',
  ELEMENT_SELECTED: 'WHYUI_ELEMENT_SELECTED',
  GET_CURRENT_ANALYSIS: 'WHYUI_GET_CURRENT_ANALYSIS',
  SET_CURRENT_ANALYSIS: 'WHYUI_SET_CURRENT_ANALYSIS',
  START_WATCHER: 'WHYUI_START_WATCHER',
  STOP_WATCHER: 'WHYUI_STOP_WATCHER',
  STATE_CHANGE_EVENT: 'WHYUI_STATE_CHANGE_EVENT',
  TOGGLE_IN_PAGE_HUD: 'WHYUI_TOGGLE_IN_PAGE_HUD',
  INSPECT_BLOCKING_ELEMENT: 'WHYUI_INSPECT_BLOCKING_ELEMENT',
} as const;

export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

export interface BaseMessage {
  type: MessageType;
}

export interface StartSelectionMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.START_SELECTION;
}

export interface CancelSelectionMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.CANCEL_SELECTION;
}

export interface ElementSelectedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.ELEMENT_SELECTED;
  payload: ElementAnalysis;
}

export interface GetCurrentAnalysisMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.GET_CURRENT_ANALYSIS;
}

export interface SetCurrentAnalysisMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.SET_CURRENT_ANALYSIS;
  payload: ElementAnalysis;
}

export interface StartWatcherMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.START_WATCHER;
}

export interface StopWatcherMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.STOP_WATCHER;
}

export interface StateChangeNotifyMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.STATE_CHANGE_EVENT;
  payload: StateChangeEvent;
}

export interface ToggleInPageHudMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.TOGGLE_IN_PAGE_HUD;
  show?: boolean;
}

export interface InspectBlockingElementMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.INSPECT_BLOCKING_ELEMENT;
}

export type ExtensionMessage =
  | StartSelectionMessage
  | CancelSelectionMessage
  | ElementSelectedMessage
  | GetCurrentAnalysisMessage
  | SetCurrentAnalysisMessage
  | StartWatcherMessage
  | StopWatcherMessage
  | StateChangeNotifyMessage
  | ToggleInPageHudMessage
  | InspectBlockingElementMessage;
