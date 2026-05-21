/**
 * Type definitions for the WhatsApp conversation state machine.
 *
 * State is serialised to JSON and stored in WhatsappConversation.state
 * so multi-turn conversations survive server restarts.
 */

export interface PaperFilter {
  subject?: string;
  grade?: string;
  year?: number;
}

export type ConversationMode =
  | { kind: "idle" }
  | { kind: "linking"; awaiting: "code" }
  | {
      kind: "browsing_papers";
      filter: PaperFilter;
      page: number;
    }
  | {
      kind: "paper_study";
      sessionId: string;
      resourceId: string;
      paperTitle: string;
      questionNumber: number;           // current question index (1-based)
      totalQuestions: number;
      skippedDiagramQuestions: number[];
      totalSkippedMarks: number;
      awaitingAnswer: boolean;
      lastEvaluation?: {
        score: number;
        maxScore: number;
        feedback: string;
        isCorrect: boolean;
      };
    }
  | {
      kind: "project_brief";
      awaiting: "topic" | "grade";
      collected: {
        subject?: string;
        grade?: string;
        topic?: string;
      };
    }
  | { kind: "project_generating"; projectId: string }
  | { kind: "ai_chat" };

export interface ConversationState {
  mode: ConversationMode;
  lastIntent?: string;
  lastMessageAt: string;           // ISO timestamp — for rate limiting
  messageCountThisMinute: number;
}

export type Intent =
  | { kind: "study_paper"; hints?: { subject?: string; year?: number; grade?: string } }
  | { kind: "generate_project"; hints?: { subject?: string; grade?: string; topic?: string } }
  | { kind: "ai_chat"; question: string }
  | { kind: "unclear" };

export const DEFAULT_STATE: ConversationState = {
  mode: { kind: "idle" },
  lastMessageAt: new Date(0).toISOString(),
  messageCountThisMinute: 0,
};
