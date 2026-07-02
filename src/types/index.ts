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
  startDate?: string;
  endDate?: string;
  slug?: string;
  paymentMode: 'PREPAID_ONLY' | 'PREPAID_OR_ONSITE';
  logoUrl?: string;
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
  paymentStatus?: string;
  raceId: string;
  participantId: string;
  startTime?: string;
  finishTime?: string;
  participant?: Participant;
  race?: Race;
  distributions?: Distribution[];
}

export interface Volunteer {
  id: string;
  userId: string;
  eventId: string;
  permissions: string[];
  user?: User;
}

export type CheckpointType = 'TIMING' | 'EAU' | 'RAVITO' | 'TIMING_RAVITO';

export interface CheckpointAssignment {
  id: string;
  volunteerId: string;
  volunteer: Volunteer & { user: User };
}

export interface Checkpoint {
  id: string;
  raceId: string;
  name: string;
  order: number;
  type: CheckpointType;
  cutoffTime?: string;
  items: string[];
  latitude?: number;
  longitude?: number;
  assignments: CheckpointAssignment[];
  _count?: { scans: number };
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
