export type Confidence = 'confirmed' | 'likely' | 'possible';
export type Severity = 'error' | 'warning' | 'info';
export type ExplanationCategory = 'html' | 'css' | 'parent' | 'form' | 'overlay' | 'javascript' | 'interaction';

export interface Explanation {
  id: string;
  severity: Severity;
  confidence: Confidence;
  category: ExplanationCategory;
  title: string;
  description: string;
  evidence: string[];
}

export interface HtmlAnalysis {
  tagName: string;
  id: string;
  classes: string[];
  disabledAttr: boolean;
  disabledProp: boolean;
  ariaDisabled: string | null;
  readonlyAttr: boolean;
  hiddenAttr: boolean;
  inertAttr: boolean;
  isStandardFormControl: boolean;
  typeAttr: string | null;
  roleAttr: string | null;
  allAttributes: Record<string, string>;
}

export interface CssAnalysis {
  pointerEvents: string;
  display: string;
  visibility: string;
  opacity: string;
  cursor: string;
  userSelect: string;
  isZeroSized: boolean;
  isOffScreen: boolean;
  rect: {
    width: number;
    height: number;
    top: number;
    left: number;
    bottom: number;
    right: number;
  };
}

export interface AncestorIssue {
  tagName: string;
  id?: string;
  classes: string[];
  issueType: 'disabled-fieldset' | 'inert' | 'hidden' | 'pointer-events-none';
  description: string;
}

export interface AncestorChainNode {
  tagName: string;
  selector: string;
  isBlocking: boolean;
  blockingReason?: string;
}

export interface ParentAnalysis {
  inDisabledFieldset: boolean;
  inLegendException: boolean;
  inertAncestor: boolean;
  hiddenAncestor: boolean;
  pointerEventsAncestor: boolean;
  ancestorIssues: AncestorIssue[];
  parentChain: string[];
  interactionChain: AncestorChainNode[];
}

export interface FormFieldDetail {
  id: string;
  name: string;
  tagName: string;
  type: string;
  label: string;
  required: boolean;
  valid: boolean;
  valueMissing: boolean;
  typeMismatch: boolean;
  patternMismatch: boolean;
  tooShort: boolean;
  tooLong: boolean;
  customError: boolean;
  validationMessage: string;
  statusSummary: string;
}

export interface FormAnalysis {
  hasForm: boolean;
  formId?: string;
  formName?: string;
  isFormValid: boolean;
  totalFields: number;
  invalidFieldsCount: number;
  requiredFieldsCount: number;
  fields: FormFieldDetail[];
}

export interface BoundingBoxInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoveringElementInfo {
  tagName: string;
  id?: string;
  classes: string[];
  role?: string;
  selector: string;
  outerHTMLSnippet?: string;
  rect?: BoundingBoxInfo;
  zIndex?: string;
  pointerEvents?: string;
}

export interface OverlayAnalysis {
  isCovered: boolean;
  targetRect?: BoundingBoxInfo;
  targetZIndex?: string;
  coveringElement?: CoveringElementInfo;
  intersectedPoints: string[];
  totalSampledPoints: number;
  details?: string;
}

export interface PointerEventsInfo {
  value: string;
  isBlocked: boolean;
  source: 'self' | 'ancestor' | 'none';
  blockingElementSelector?: string;
  blockingTagName?: string;
}

export interface VisibilityInfo {
  display: string;
  visibility: string;
  opacity: string;
  isZeroSized: boolean;
  isOffScreen: boolean;
  visualState: 'visible' | 'hidden_display_none' | 'invisible_visibility_hidden' | 'transparent_opacity_zero' | 'zero_sized' | 'off_screen';
  visualDescription: string;
  canReceivePointerEvents: boolean;
}

export type InteractionState = 'interactive' | 'potentially_blocked' | 'not_interactive';

export interface CategoricalInteractionReason {
  name: string;
  status: string; // "Confirmed" | "Likely" | "Possible" | "No"
  confidence: 'confirmed' | 'likely' | 'possible' | 'none';
  detail: string;
}

export interface InteractionAnalysis {
  state: InteractionState;
  statusLabel: string; // "🟢 Interactive" | "🟡 Potentially blocked" | "🔴 Not clickable"
  primaryReason: string;
  canClick: boolean;
  pointerEvents: PointerEventsInfo;
  visibility: VisibilityInfo;
  overlay: OverlayAnalysis;
  ancestorBlock: {
    isBlocked: boolean;
    ancestorSelector?: string;
    reason?: string;
  };
  interactionChain: AncestorChainNode[];
  eventListeners: {
    hasInlineClick: boolean;
    observableFrameworkHandlers: string[];
    statusText: string;
  };
  categoricalReasons: CategoricalInteractionReason[];
}

export interface EventAnalysis {
  hasInlineHandlers: boolean;
  hasDynamicMutation: boolean;
  dynamicallyControlled: boolean;
  details: string[];
}

export interface FrameworkDetection {
  detected: boolean;
  name?: 'React' | 'Angular' | 'Vue' | 'jQuery' | 'Unknown';
  version?: string;
  details?: string;
  deepInspectionAvailable: boolean;
}

export interface ElementSummary {
  tagName: string;
  id: string;
  classes: string[];
  role: string | null;
  attributes: Record<string, string>;
  outerHTML: string;
  textPreview: string;
  selector: string;
}

export type PrimaryStatus = 'disabled' | 'aria-disabled' | 'non-interactive' | 'not-clickable' | 'hidden' | 'covered' | 'enabled';

export interface ElementAnalysis {
  target: ElementSummary;
  isInteractive: boolean;
  primaryStatus: PrimaryStatus;
  interaction: InteractionAnalysis;
  html: HtmlAnalysis;
  css: CssAnalysis;
  parent: ParentAnalysis;
  form: FormAnalysis;
  overlay: OverlayAnalysis;
  events: EventAnalysis;
  framework: FrameworkDetection;
  explanations: Explanation[];
  url: string;
  timestamp: string;
}

export interface StateChangeEvent {
  timestamp: string;
  type: 'attribute' | 'property' | 'interaction';
  attributeName: string;
  oldValue: string | null;
  newValue: string | null;
  trigger: string;
}
