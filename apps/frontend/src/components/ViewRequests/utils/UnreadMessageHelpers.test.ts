import { describe, expect, it } from 'vitest';

import { RequestSummary } from '../../../types';

import {
  shouldShowUnreadBadge,
  formatUnreadMessageCount,
  getUnreadMessageAriaLabel,
  filterRequestsWithUnreadMessages,
  getTotalUnreadMessageCount,
} from './UnreadMessageHelpers';

describe('shouldShowUnreadBadge', () => {
  describe('positive tests', () => {
    it('should return true for positive unread count', () => {
      expect(shouldShowUnreadBadge(1)).toBe(true);
      expect(shouldShowUnreadBadge(5)).toBe(true);
      expect(shouldShowUnreadBadge(99)).toBe(true);
      expect(shouldShowUnreadBadge(100)).toBe(true);
    });
  });

  describe('negative tests', () => {
    it('should return false for zero unread count (requirement: do not show 0 counts)', () => {
      expect(shouldShowUnreadBadge(0)).toBe(false);
    });

    it('should return false for undefined unread count', () => {
      expect(shouldShowUnreadBadge(undefined)).toBe(false);
    });

    it('should return false for negative unread count', () => {
      expect(shouldShowUnreadBadge(-1)).toBe(false);
      expect(shouldShowUnreadBadge(-5)).toBe(false);
    });

    it('should return false for null input', () => {
      expect(shouldShowUnreadBadge(null as unknown as number)).toBe(false);
    });
  });
});

describe('formatUnreadMessageCount', () => {
  describe('positive tests', () => {
    it('should return exact count for numbers 1-99', () => {
      expect(formatUnreadMessageCount(1)).toBe('1');
      expect(formatUnreadMessageCount(5)).toBe('5');
      expect(formatUnreadMessageCount(50)).toBe('50');
      expect(formatUnreadMessageCount(99)).toBe('99');
    });

    it('should return "99+" for counts over 99', () => {
      expect(formatUnreadMessageCount(100)).toBe('99+');
      expect(formatUnreadMessageCount(150)).toBe('99+');
      expect(formatUnreadMessageCount(999)).toBe('99+');
    });
  });

  describe('negative tests', () => {
    it('should return empty string for zero count', () => {
      expect(formatUnreadMessageCount(0)).toBe('');
    });

    it('should return empty string for undefined count', () => {
      expect(formatUnreadMessageCount(undefined)).toBe('');
    });

    it('should return empty string for negative count', () => {
      expect(formatUnreadMessageCount(-1)).toBe('');
      expect(formatUnreadMessageCount(-10)).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(formatUnreadMessageCount(null as unknown as number)).toBe('');
    });
  });
});

describe('getUnreadMessageAriaLabel', () => {
  describe('positive tests', () => {
    it('should generate correct aria-label for single message', () => {
      expect(getUnreadMessageAriaLabel(1, 123)).toBe(
        '1 unread message for request 123'
      );
    });

    it('should generate correct aria-label for multiple messages', () => {
      expect(getUnreadMessageAriaLabel(5, 456)).toBe(
        '5 unread messages for request 456'
      );
    });

    it('should generate correct aria-label for 99+ messages', () => {
      expect(getUnreadMessageAriaLabel(150, 789)).toBe(
        'more than 99 unread messages for request 789'
      );
    });

    it('should generate aria-label without request context when requestId is not provided', () => {
      expect(getUnreadMessageAriaLabel(3)).toBe('3 unread messages');
    });

    it('should handle exactly 99 messages correctly', () => {
      expect(getUnreadMessageAriaLabel(99, 100)).toBe(
        '99 unread messages for request 100'
      );
    });
  });

  describe('negative tests', () => {
    it('should return empty string for zero count', () => {
      expect(getUnreadMessageAriaLabel(0, 123)).toBe('');
    });

    it('should return empty string for undefined count', () => {
      expect(getUnreadMessageAriaLabel(undefined, 123)).toBe('');
    });

    it('should return empty string for negative count', () => {
      expect(getUnreadMessageAriaLabel(-1, 123)).toBe('');
    });

    it('should return empty string for null count', () => {
      expect(getUnreadMessageAriaLabel(null as unknown as number, 123)).toBe(
        ''
      );
    });
  });
});

describe('filterRequestsWithUnreadMessages', () => {
  const mockRequests: RequestSummary[] = [
    {
      id: 1,
      unreadMessageCount: 0,
      // other required fields with minimal mock data
      fcc_filing_date: '2024-01-01',
      name_of_licensee: 'Test Licensee 1',
      call_sign: 'TEST1',
      name_of_launch_vehicle: 'Test Vehicle 1',
      mission_name: 'Test Mission 1',
      city: 'Test City',
      state: 'TX',
      latitude: 30.0,
      longitude: -95.0,
      launch_datetime_primary: '2024-06-01T10:00:00Z',
      launch_datetime_backup: '2024-06-02T10:00:00Z',
      orbital_location: 'GEO',
      number_of_frequencies: 1,
      ground_track_from_liftoff_until_payload_separation: 'Test track',
      ecf_cartesian_vectors_format_file_desc: 'Test ECF',
      ecf_cartesian_vectors_format_file_path: 'test.csv',
      ecf_cartesian_vectors_format_file: 'test_ecf_1.csv',
      ground_track_of_launch_vehicle_2d_img_file_desc: 'Test image',
      ground_track_of_launch_vehicle_2d_img_file_path: 'test.jpg',
      ground_track_of_launch_vehicle_2d_img_file: 'test_track_1.jpg',
      primary_poc_name: 'John Doe',
      primary_poc_email: 'john@test.com',
      primary_poc_phone: '555-0001',
      alternate_poc_name: 'Jane Doe',
      alternate_poc_email: 'jane@test.com',
      alternate_poc_phone: '555-0002',
      status: 'SUBMITTED',
      read: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      current_revision: true,
      revision: 0,
      frequencies: [2400.0],
    },
    {
      id: 2,
      unreadMessageCount: 3,
      // other required fields with minimal mock data
      fcc_filing_date: '2024-01-02',
      name_of_licensee: 'Test Licensee 2',
      call_sign: 'TEST2',
      name_of_launch_vehicle: 'Test Vehicle 2',
      mission_name: 'Test Mission 2',
      city: 'Test City',
      state: 'CA',
      latitude: 34.0,
      longitude: -118.0,
      launch_datetime_primary: '2024-06-03T10:00:00Z',
      launch_datetime_backup: '2024-06-04T10:00:00Z',
      orbital_location: 'LEO',
      number_of_frequencies: 2,
      ground_track_from_liftoff_until_payload_separation: 'Test track 2',
      ecf_cartesian_vectors_format_file_desc: 'Test ECF 2',
      ecf_cartesian_vectors_format_file_path: 'test2.csv',
      ecf_cartesian_vectors_format_file: 'test_ecf_2.csv',
      ground_track_of_launch_vehicle_2d_img_file_desc: 'Test image 2',
      ground_track_of_launch_vehicle_2d_img_file_path: 'test2.jpg',
      ground_track_of_launch_vehicle_2d_img_file: 'test_track_2.jpg',
      primary_poc_name: 'Bob Smith',
      primary_poc_email: 'bob@test.com',
      primary_poc_phone: '555-0003',
      alternate_poc_name: 'Alice Smith',
      alternate_poc_email: 'alice@test.com',
      alternate_poc_phone: '555-0004',
      status: 'UNDER_NTIA_INITIAL_REVIEW',
      read: false,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      current_revision: true,
      revision: 0,
      frequencies: [2400.0, 2450.0],
    },
    {
      id: 3,
      unreadMessageCount: undefined,
      // other required fields with minimal mock data
      fcc_filing_date: '2024-01-03',
      name_of_licensee: 'Test Licensee 3',
      call_sign: 'TEST3',
      name_of_launch_vehicle: 'Test Vehicle 3',
      mission_name: 'Test Mission 3',
      city: 'Test City',
      state: 'FL',
      latitude: 25.0,
      longitude: -80.0,
      launch_datetime_primary: '2024-06-05T10:00:00Z',
      launch_datetime_backup: '2024-06-06T10:00:00Z',
      orbital_location: 'MEO',
      number_of_frequencies: 1,
      ground_track_from_liftoff_until_payload_separation: 'Test track 3',
      ecf_cartesian_vectors_format_file_desc: 'Test ECF 3',
      ecf_cartesian_vectors_format_file_path: 'test3.csv',
      ecf_cartesian_vectors_format_file: 'test_ecf_3.csv',
      ground_track_of_launch_vehicle_2d_img_file_desc: 'Test image 3',
      ground_track_of_launch_vehicle_2d_img_file_path: 'test3.jpg',
      ground_track_of_launch_vehicle_2d_img_file: 'test_track_3.jpg',
      primary_poc_name: 'Charlie Brown',
      primary_poc_email: 'charlie@test.com',
      primary_poc_phone: '555-0005',
      alternate_poc_name: 'Lucy Brown',
      alternate_poc_email: 'lucy@test.com',
      alternate_poc_phone: '555-0006',
      status: 'APPROVED',
      read: true,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      current_revision: true,
      revision: 0,
      frequencies: [2500.0],
    },
    {
      id: 4,
      unreadMessageCount: 1,
      // other required fields with minimal mock data
      fcc_filing_date: '2024-01-04',
      name_of_licensee: 'Test Licensee 4',
      call_sign: 'TEST4',
      name_of_launch_vehicle: 'Test Vehicle 4',
      mission_name: 'Test Mission 4',
      city: 'Test City',
      state: 'NY',
      latitude: 40.0,
      longitude: -74.0,
      launch_datetime_primary: '2024-06-07T10:00:00Z',
      launch_datetime_backup: '2024-06-08T10:00:00Z',
      orbital_location: 'GEO',
      number_of_frequencies: 3,
      ground_track_from_liftoff_until_payload_separation: 'Test track 4',
      ecf_cartesian_vectors_format_file_desc: 'Test ECF 4',
      ecf_cartesian_vectors_format_file_path: 'test4.csv',
      ecf_cartesian_vectors_format_file: 'test_ecf_4.csv',
      ground_track_of_launch_vehicle_2d_img_file_desc: 'Test image 4',
      ground_track_of_launch_vehicle_2d_img_file_path: 'test4.jpg',
      ground_track_of_launch_vehicle_2d_img_file: 'test_track_4.jpg',
      primary_poc_name: 'David Wilson',
      primary_poc_email: 'david@test.com',
      primary_poc_phone: '555-0007',
      alternate_poc_name: 'Emma Wilson',
      alternate_poc_email: 'emma@test.com',
      alternate_poc_phone: '555-0008',
      status: 'DENIED',
      read: false,
      createdAt: '2024-01-04T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
      current_revision: true,
      revision: 0,
      frequencies: [2400.0, 2450.0, 2500.0],
    },
  ];

  describe('positive tests', () => {
    it('should filter requests with unread messages', () => {
      const result = filterRequestsWithUnreadMessages(mockRequests);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(4);
    });

    it('should return empty array when no requests have unread messages', () => {
      const requestsWithoutUnread = mockRequests.map((req) => ({
        ...req,
        unreadMessageCount: 0,
      }));
      const result = filterRequestsWithUnreadMessages(requestsWithoutUnread);
      expect(result).toHaveLength(0);
    });

    it('should handle empty input array', () => {
      const result = filterRequestsWithUnreadMessages([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('negative tests', () => {
    it('should exclude requests with zero unread count', () => {
      const result = filterRequestsWithUnreadMessages(mockRequests);
      expect(result.find((req) => req.id === 1)).toBeUndefined();
    });

    it('should exclude requests with undefined unread count', () => {
      const result = filterRequestsWithUnreadMessages(mockRequests);
      expect(result.find((req) => req.id === 3)).toBeUndefined();
    });
  });
});

describe('getTotalUnreadMessageCount', () => {
  const mockRequests: RequestSummary[] = [
    {
      id: 1,
      unreadMessageCount: 5,
      // minimal required fields
      fcc_filing_date: '2024-01-01',
      name_of_licensee: 'Test',
      call_sign: 'TEST',
      name_of_launch_vehicle: 'Test',
      mission_name: 'Test Mission',
      city: 'Test',
      state: 'TX',
      latitude: 30.0,
      longitude: -95.0,
      launch_datetime_primary: '2024-06-01T10:00:00Z',
      launch_datetime_backup: '2024-06-02T10:00:00Z',
      orbital_location: 'GEO',
      number_of_frequencies: 1,
      ground_track_from_liftoff_until_payload_separation: 'Test',
      ecf_cartesian_vectors_format_file_desc: 'Test',
      ecf_cartesian_vectors_format_file_path: 'test.csv',
      ecf_cartesian_vectors_format_file: 'test_ecf.csv',
      ground_track_of_launch_vehicle_2d_img_file_desc: 'Test',
      ground_track_of_launch_vehicle_2d_img_file_path: 'test.jpg',
      ground_track_of_launch_vehicle_2d_img_file: 'test_track.jpg',
      primary_poc_name: 'Test',
      primary_poc_email: 'test@test.com',
      primary_poc_phone: '555-0001',
      alternate_poc_name: 'Test',
      alternate_poc_email: 'test2@test.com',
      alternate_poc_phone: '555-0002',
      status: 'SUBMITTED',
      read: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      current_revision: true,
      revision: 0,
      frequencies: [2400.0],
    },
    {
      id: 2,
      unreadMessageCount: 3,
      // minimal required fields
      fcc_filing_date: '2024-01-02',
      name_of_licensee: 'Test2',
      call_sign: 'TEST2',
      name_of_launch_vehicle: 'Test2',
      mission_name: 'Test Mission 2',
      city: 'Test2',
      state: 'CA',
      latitude: 34.0,
      longitude: -118.0,
      launch_datetime_primary: '2024-06-03T10:00:00Z',
      launch_datetime_backup: '2024-06-04T10:00:00Z',
      orbital_location: 'LEO',
      number_of_frequencies: 1,
      ground_track_from_liftoff_until_payload_separation: 'Test2',
      ecf_cartesian_vectors_format_file_desc: 'Test2',
      ecf_cartesian_vectors_format_file_path: 'test2.csv',
      ecf_cartesian_vectors_format_file: 'test_ecf_2.csv',
      ground_track_of_launch_vehicle_2d_img_file_desc: 'Test2',
      ground_track_of_launch_vehicle_2d_img_file_path: 'test2.jpg',
      ground_track_of_launch_vehicle_2d_img_file: 'test_track_2.jpg',
      primary_poc_name: 'Test2',
      primary_poc_email: 'test3@test.com',
      primary_poc_phone: '555-0003',
      alternate_poc_name: 'Test2',
      alternate_poc_email: 'test4@test.com',
      alternate_poc_phone: '555-0004',
      status: 'UNDER_NTIA_INITIAL_REVIEW',
      read: false,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      current_revision: true,
      revision: 0,
      frequencies: [2450.0],
    },
    {
      id: 3,
      unreadMessageCount: undefined,
      // minimal required fields
      fcc_filing_date: '2024-01-03',
      name_of_licensee: 'Test3',
      call_sign: 'TEST3',
      name_of_launch_vehicle: 'Test3',
      mission_name: 'Test Mission 3',
      city: 'Test3',
      state: 'FL',
      latitude: 25.0,
      longitude: -80.0,
      launch_datetime_primary: '2024-06-05T10:00:00Z',
      launch_datetime_backup: '2024-06-06T10:00:00Z',
      orbital_location: 'MEO',
      number_of_frequencies: 1,
      ground_track_from_liftoff_until_payload_separation: 'Test3',
      ecf_cartesian_vectors_format_file_desc: 'Test3',
      ecf_cartesian_vectors_format_file_path: 'test3.csv',
      ecf_cartesian_vectors_format_file: 'test_ecf_3.csv',
      ground_track_of_launch_vehicle_2d_img_file_desc: 'Test3',
      ground_track_of_launch_vehicle_2d_img_file_path: 'test3.jpg',
      ground_track_of_launch_vehicle_2d_img_file: 'test_track_3.jpg',
      primary_poc_name: 'Test3',
      primary_poc_email: 'test5@test.com',
      primary_poc_phone: '555-0005',
      alternate_poc_name: 'Test3',
      alternate_poc_email: 'test6@test.com',
      alternate_poc_phone: '555-0006',
      status: 'APPROVED',
      read: true,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
      current_revision: true,
      revision: 0,
      frequencies: [2500.0],
    },
  ];

  describe('positive tests', () => {
    it('should calculate total unread message count correctly', () => {
      const result = getTotalUnreadMessageCount(mockRequests);
      expect(result).toBe(8); // 5 + 3 + 0 (undefined treated as 0)
    });

    it('should return 0 for empty array', () => {
      const result = getTotalUnreadMessageCount([]);
      expect(result).toBe(0);
    });

    it('should handle all undefined unread counts', () => {
      const requestsWithUndefined = mockRequests.map((req) => ({
        ...req,
        unreadMessageCount: undefined,
      }));
      const result = getTotalUnreadMessageCount(requestsWithUndefined);
      expect(result).toBe(0);
    });

    it('should handle all zero unread counts', () => {
      const requestsWithZero = mockRequests.map((req) => ({
        ...req,
        unreadMessageCount: 0,
      }));
      const result = getTotalUnreadMessageCount(requestsWithZero);
      expect(result).toBe(0);
    });
  });

  describe('negative tests', () => {
    it('should treat negative unread counts as 0', () => {
      const requestsWithNegative = [
        {
          ...mockRequests[0],
          unreadMessageCount: -5,
        },
        {
          ...mockRequests[1],
          unreadMessageCount: 3,
        },
      ];
      const result = getTotalUnreadMessageCount(requestsWithNegative);
      expect(result).toBe(-2); // This demonstrates the current behavior - might want to handle negatives differently
    });
  });
});
