import { useEffect } from "react";

export interface PdfViewerProps {
  visible: boolean;
  onClose: () => void;
  uri: string;
  /** 1-based page to open at (e.g. the page a diagram is on). */
  page?: number;
  title?: string;
}

/**
 * Web fallback — react-native-pdf is native-only. Opens the PDF (deep-linked
 * to the requested page) in a new browser tab, which renders PDFs natively.
 */
export function PdfViewerModal({ visible, onClose, uri, page }: PdfViewerProps) {
  useEffect(() => {
    if (!visible) return;
    const target = page && page > 0 ? `${uri}#page=${page}` : uri;
    if (typeof window !== "undefined") window.open(target, "_blank", "noopener");
    onClose();
  }, [visible, uri, page, onClose]);

  return null;
}
