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

export interface EventImage {
  url: string;
  contentType: string;
  blurHash?: string;
  width?: number;
  height?: number;
}

export interface DisplaySettings {
  effect?: string;
  theme?: string;
  titleFont?: string;
}

export interface GuestStatusCounts {
  GOING?: number;
  MAYBE?: number;
  DECLINED?: number;
  SENT?: number;
  WAITLIST?: number;
  INTERESTED?: number;
  PENDING_APPROVAL?: number;
}

export interface Guest {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
}

export interface PartifulEvent {
  id: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  timezone?: string;
  location?: string;
  locationDisplayText?: string;
  ownerIds?: string[];
  image?: EventImage;
  displaySettings?: DisplaySettings;
  showHostList?: boolean;
  showGuestList?: boolean;
  showGuestCount?: boolean;
  allowGuestPhotoUpload?: boolean;
  attendedGuestCount?: number;
  guestStatusCounts?: GuestStatusCounts;
  calendarFile?: string;
  guest?: Guest;
}

export interface MyRsvpsData {
  events: PartifulEvent[];
}

export interface User {
  id: string;
  name?: string;
  displayName?: string;
  username?: string;
  profileImageUrl?: string;
}

export interface Mutual {
  id?: string;
  name?: string;
  displayName?: string;
  username?: string;
}
