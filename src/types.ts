export interface PartifulConfig {
  refreshToken: string;
  firebaseApiKey: string;
  userId?: string;
  configFilePath?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  id_token?: string;
  refresh_token?: string;
  error?: {
    message: string;
  };
}

export interface ApiRequestBody {
  data: {
    params: Record<string, unknown>;
    userId: string;
  };
}

export interface ApiResponse<T> {
  result: {
    data: T;
  };
}

export type RsvpStatus =
  | "GOING"
  | "MAYBE"
  | "DECLINED"
  | "SENT"
  | "INTERESTED"
  | "WAITLIST"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "WITHDRAWN"
  | "READY_TO_SEND"
  | "SENDING"
  | "SEND_ERROR"
  | "DELIVERY_ERROR"
  | "RESPONDED_TO_FIND_A_TIME"
  | "WAITLISTED_FOR_APPROVAL"
  | "REJECTED";
