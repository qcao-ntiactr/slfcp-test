import { StateType } from './components/RequestForm/utils/StateOptions';

export enum RequestStatusGroup {
  //eslint-disable-next-line no-unused-vars
  Submitted = 'SUBMITTED',
  //eslint-disable-next-line no-unused-vars
  Approved = 'APPROVED',
  //eslint-disable-next-line no-unused-vars
  Denied = 'DENIED',
  //eslint-disable-next-line no-unused-vars
  ApprovedWithConditions = 'APPROVED_WITH_CONDITIONS',
  //eslint-disable-next-line no-unused-vars
  RevisionsRequested = 'REVISIONS_REQUESTED',
  //eslint-disable-next-line no-unused-vars
  UnderReview = 'UNDER_REVIEW',
}

export const BackendRequestStatuses = [
  'SUBMITTED',
  'UNDER_NTIA_INITIAL_REVIEW',
  'UNDER_INITIAL_REVISION_PER_NTIA',
  'UNDER_FEDERAL_AGENCIES_REVIEW',
  'UNDER_NTIA_FINAL_REVIEW',
  'UNDER_FINAL_REVISION_PER_NTIA',
  'DENIED',
  'APPROVED',
  'APPROVED_WITH_CONDITIONS',
] as const;

export type BackendRequestStatus = (typeof BackendRequestStatuses)[number];

export const BackendCommonConditionStatuses = [
  'DRAFT',
  'SUBMITTED',
  'REJECTED',
  'PUBLISHED',
] as const;

export type BackendCommonConditionStatus =
  (typeof BackendCommonConditionStatuses)[number];

// View Requests
export interface ApiResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Filters as they are passed from the frontend (nullable fields allowed)
export interface PaginationFilters {
  page: number;
  pageSize: number;
}

export type RequestDraftFilters = PaginationFilters;

export type RequestListSortDirection = 'asc' | 'desc';

export type RequestListSortKey =
  | 'createdAt'
  | 'daysToOperation'
  | 'mission_name'
  | 'id'
  | 'launch_datetime_primary'
  | 'name_of_licensee'
  | 'primary_poc_email';

export type RequestTextFilterOperator =
  | 'contains'
  | 'doesNotContain'
  | 'equals'
  | 'startsWith'
  | 'endsWith';

export type RequestDateFilterOperator =
  | 'today'
  | 'yesterday'
  | 'last7Days'
  | 'last30Days'
  | 'olderThan30Days'
  | 'equals'
  | 'before'
  | 'after'
  | 'between';

export type RequestNumberFilterOperator =
  | 'equals'
  | 'greaterThan'
  | 'lessThan'
  | 'between';

export type RequestSerialNumberFilterOperator = 'equals';

export type RequestTextFilterField =
  | 'mission_name'
  | 'name_of_licensee'
  | 'primary_poc_email';

export type RequestDateFilterField = 'createdAt' | 'launch_datetime_primary';

export type RequestNumberFilterField = 'daysToOperation';

export type RequestSerialNumberFilterField = 'id';

export type RequestListFilterRule =
  | {
      field: RequestTextFilterField;
      type: 'text';
      operator: RequestTextFilterOperator;
      value?: string;
    }
  | {
      field: RequestDateFilterField;
      type: 'date';
      operator: RequestDateFilterOperator;
      value?: string;
      from?: string;
      to?: string;
    }
  | {
      field: RequestNumberFilterField;
      type: 'number';
      operator: RequestNumberFilterOperator;
      value?: number;
      from?: number;
      to?: number;
    }
  | {
      field: RequestSerialNumberFilterField;
      type: 'serialNumber';
      operator: RequestSerialNumberFilterOperator;
      value?: string;
    };

export interface RequestListFilters extends PaginationFilters {
  statuses?: BackendRequestStatus[] | null;
  search?: string | null;
  unread?: boolean | null;
  sortBy?: RequestListSortKey | null;
  sortDirection?: RequestListSortDirection | null;
  timezone?: string | null;
  referenceDate?: string | null;
  filterRules?: RequestListFilterRule[];
}

export interface CommonConditionFilters {
  statuses?: BackendCommonConditionStatus[] | null;
  page: number;
  pageSize: number;
}

export type RequestBase = {
  id: number;
  mission_name: string;
  name_of_licensee: string;
  call_sign: string;
  name_of_launch_vehicle: string;
  city: string;
  state: StateType;
  latitude: number;
  longitude: number;
  launch_datetime_primary: string;
  launch_datetime_backup: string;
  orbital_location: string | null;

  primary_poc_name: string;
  primary_poc_email: string;
  primary_poc_phone: string;

  alternate_poc_name: string;
  alternate_poc_email: string;
  alternate_poc_phone: string;

  fcc_filing_date?: string;
  number_of_frequencies: number;

  ecf_cartesian_vectors_format_file: string;
  ecf_cartesian_vectors_format_file_desc: string;
  ecf_cartesian_vectors_format_file_path: string;

  ground_track_from_liftoff_until_payload_separation: string;
  ground_track_of_launch_vehicle_2d_img_file: string;
  ground_track_of_launch_vehicle_2d_img_file_desc: string;
  ground_track_of_launch_vehicle_2d_img_file_path: string;

  read?: boolean;
  status: BackendRequestStatus;

  createdAt?: string;
  updatedAt?: string;

  current_revision?: boolean;
  root_request_id?: number;
  revision: number;
};

export type Receiver = {
  transmission_start: string;
  transmission_end: string;
  antenna_type: string;
  antenna_gain: number;
  antenna_beamwidth: number;
  antenna_altitude: number;
  antenna_altitude_unit: 'ft' | 'm' | 'km';
  location_of_receiving_ground_station:
    | 'ground'
    | 'first_stage'
    | 'second_stage';
  longitude_of_receiving_antenna: number;
  latitude_of_receiving_antenna: number;
};

// Full frequency object
export type Frequency = {
  id: number;
  request_id: number;
  frequency: number;
  location_of_transmitter_on_vehicle_or_platform:
    | 'first_stage'
    | 'second_stage'
    | 'ground';
  eirp: number;
  eirp_unit: 'Watts' | 'dBW' | 'milliWatts' | 'dBm';
  transmitted_bandwidth: number;
  transmitted_bandwidth_is_signal_filtered: 'filtered' | 'not_filtered';
  transmitted_bandwidth_justification: string;
  minus_3db_bandwidth: number;
  minus_3db_bandwidth_before_or_after_filtering:
    | 'before_filtering'
    | 'after_filtering';
  minus_20db_bandwidth: number;
  minus_20db_bandwidth_before_or_after_filtering:
    | 'before_filtering'
    | 'after_filtering';
  minus_60db_bandwidth: number;
  minus_60db_bandwidth_before_or_after_filtering:
    | 'before_filtering'
    | 'after_filtering';
  nature_of_modulating_signals: string;
  emission_designator: string;
  tx_transmission_start: string;
  tx_transmission_end: string;
  tx_antenna_type: string;
  tx_antenna_gain: number;
  tx_antenna_beamwidth: number;
  tx_antenna_altitude: number;
  tx_antenna_altitude_unit: 'ft' | 'm' | 'km';
  receivers: Receiver[];

  createdAt: string;
  updatedAt: string;
};

// View Requests
export type RequestSummary = RequestBase & {
  frequencies: number[];
  unreadMessageCount?: number;
};

// View Details
export type RequestDetails = RequestBase & {
  frequencies: Frequency[];
};
export interface DecisionOutcome {
  id: number;
  request_id: number;
  date_approved: string;
  condition: string;
  unread: boolean;
}

export interface RequestsByCommercialEntityData {
  entity_id: number;
  entity_name: string;
  total_submissions: string;
}

export interface RequestsByStatusData {
  status_group: RequestStatusGroup;
  request_count: string;
}

export interface CommonConditionListItem {
  id: number;
  title: string;
  content: string;
  status: BackendCommonConditionStatus;
  createdAt: string;
  publishedAt?: string | null;
  submittedBy: string | null;
  isOwnedByCurrentUser: boolean;
  rejectionReason: string | null;
}
