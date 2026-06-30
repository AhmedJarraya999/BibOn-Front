export type UserRole = 'ADMIN' | 'ORGANIZER' | 'VOLUNTEER' | 'PARTICIPANT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
}

export interface Event {
  id: string;
  name: string;
  location: string;
  date: string;
  paymentMode: 'PREPAID_ONLY' | 'PREPAID_OR_ONSITE';
  organizationId: string;
}

export interface Race {
  id: string;
  name: string;
  distance: number;
  startTime: string;
  fee?: number | string;
  eventId: string;
}


export interface Participant {
  id: string;
  fullName: string;
  email: string;
  birthdate: string;
  gender: string;
}

export interface Registration {
  id: string;
  bibNumber: string;
  status: string;
  raceId: string;
  participantId: string;
  startTime?: string;
  finishTime?: string;
  participant?: Participant;
  race?: Race;
}

export interface Volunteer {
  id: string;
  userId: string;
  eventId: string;
  permissions: string[];
  user?: User;
}

export interface Distribution {
  id: string;
  itemType: string;
  issuedAt: string;
  registrationId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
