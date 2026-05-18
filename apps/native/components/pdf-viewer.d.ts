import type { ReactElement } from "react";

/**
 * Type surface for the platform-split PdfViewerModal.
 * Metro resolves pdf-viewer.native.tsx / pdf-viewer.web.tsx at bundle time;
 * this declaration lets TypeScript resolve `@/components/pdf-viewer`.
 */
export interface PdfViewerProps {
  visible: boolean;
  onClose: () => void;
  uri: string;
  /** 1-based page to open at (e.g. the page a diagram is on). */
  page?: number;
  title?: string;
}

export function PdfViewerModal(props: PdfViewerProps): ReactElement | null;
