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
      kind: "paper_browse_setup";
      step: "grade" | "subject";
      /** Grade values queried from the DB (shown as numbered menu). */
      grades: string[];
      /** Populated once the user has chosen a grade. */
      selectedGrade?: string;
      /** Subject values for selectedGrade (populated at subject step). */
      subjects?: string[];
    }
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
      awaiting: "name" | "school" | "centre" | "candidate" | "grade" | "subject" | "title" | "outline";
      collected: {
        studentName?: string;
        schoolName?: string;
        centreNumber?: string;
        candidateNumber?: string;
        grade?: string;
        subject?: string;
        category?: string;
        title?: string;        // user-supplied title; empty string = "let AI choose"
        outline?: string;      // optional project outline/guide; empty string = none
      };
    }
  | {
      kind: "paper_action_choice";
      paperId: string;
      paperTitle: string;
    }
  | {
      // Brief is complete; waiting for the user to confirm before we kick off
      // the (slow) generation. Holds the fully-collected slots verbatim.
      kind: "project_confirm";
      slots: {
        studentName: string;
        schoolName: string;
        centreNumber: string;
        candidateNumber: string;
        grade: string;
        subject: string;
        category: string;
        title: string;
        outline: string;
      };
    }
  | { kind: "project_generating"; projectId: string }
  | { kind: "ai_chat" }
  | {
      kind: "signing_up";
      step: "email" | "name" | "password" | "referral_code";
      email?: string;
      name?: string;
      newUserId?: string;
    }
  | {
      kind: "signing_in";
      step: "email" | "password";
      email?: string;
    }
  | {
      kind: "upgrading";
      step: "choose_plan" | "choose_method" | "enter_phone" | "awaiting_payment";
      plan?: "STUDY" | "PASS";
      method?: "ecocash" | "onemoney";
      phone?: string;
      pollUrl?: string;
      transactionId?: string;
    };

export interface ConversationState {
  mode: ConversationMode;
  lastIntent?: string;
  lastMessageAt: string;           // ISO timestamp — for rate limiting
  messageCountThisMinute: number;
}

export type Intent =
  | { kind: "study_paper"; hints?: { subject?: string; year?: number; grade?: string } }
  | { kind: "generate_project"; hints?: { subject?: string; grade?: string } }
  | { kind: "ai_chat"; question: string }
  | { kind: "unclear" };

export const DEFAULT_STATE: ConversationState = {
  mode: { kind: "idle" },
  lastMessageAt: new Date(0).toISOString(),
  messageCountThisMinute: 0,
};
