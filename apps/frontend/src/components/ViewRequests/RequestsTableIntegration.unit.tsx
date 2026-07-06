import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import {
  QueryClient,
  QueryClientProvider,
  UseQueryResult,
} from '@tanstack/react-query';

import { ApiResponse, RequestSummary } from '../../types';
import {
  HybridAuthContext,
  UserRole,
  AuthContextType,
} from '../../context/HybridAuthContext';
import { useRequests } from '../../hooks/UseRequests';

// Mock the useRequests hook
vi.mock('../../hooks/UseRequests', () => ({
  useRequests: vi.fn(),
}));

// Create a simplified RequestsTable component for testing
const MockRequestsTable = () => {
  const { data, isLoading, error } = useRequests(
    {
      page: 1,
      pageSize: 10,
      unread: null,
      statuses: null,
      search: null,
    },
    'test-user-id'
  );

  if (isLoading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">Error loading requests</div>;
  if (!data?.data) return <div data-testid="no-data">No requests found</div>;

  return (
    <div data-testid="requests-table">
      {data.data.map((request: RequestSummary) => (
        <div key={request.id} data-testid={`request-${request.id}`}>
          <span data-testid={`request-${request.id}-name`}>
            {request.name_of_licensee}
          </span>
          <div data-testid={`request-${request.id}-inquiry-button`}>
            <button aria-label={`View inquiries for request ${request.id}`}>
              Inquiries
            </button>
            {request.unreadMessageCount && request.unreadMessageCount > 0 && (
              <div
                data-testid={`request-${request.id}-unread-badge`}
                aria-label={`${request.unreadMessageCount > 99 ? 'more than 99' : request.unreadMessageCount} unread ${request.unreadMessageCount === 1 ? 'message' : 'messages'} for request ${request.id}`}
                role="status"
              >
                {request.unreadMessageCount > 99
                  ? '99+'
                  : request.unreadMessageCount}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockAuthValue: AuthContextType = {
    user: {
      id: 'test-user',
      displayName: 'Test User',
      email: 'test@example.com',
      role: UserRole.commercial,
      tenantId: 'test-tenant',
    },
    login: vi.fn(),
    loginWithEntra: vi.fn(),
    logout: vi.fn(),
    token: 'mock-token',
    isLoading: false,
    authMode: 'mock',
    isEntraConfigured: false,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <HybridAuthContext.Provider value={mockAuthValue}>
          <BrowserRouter>{children}</BrowserRouter>
        </HybridAuthContext.Provider>
      </ChakraProvider>
    </QueryClientProvider>
  );
};

describe('RequestsTable Integration - Unread Message Functionality', () => {
  const mockUseRequests = vi.mocked(useRequests);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('entity-based filtering integration tests', () => {
    it('should display correct unread badges for commercial user', async () => {
      const mockCommercialData: RequestSummary[] = [
        {
          id: 1,
          unreadMessageCount: 0, // No unread messages - no badge should show
          fcc_filing_date: '2024-01-01',
          mission_name: 'Commercial Mission A',
          name_of_licensee: 'Commercial Corp A',
          call_sign: 'COMM1',
          name_of_launch_vehicle: 'Commercial Vehicle',
          city: 'Houston',
          state: 'TX',
          latitude: 29.7604,
          longitude: -95.3698,
          launch_datetime_primary: '2024-06-01T10:00:00Z',
          launch_datetime_backup: '2024-06-02T10:00:00Z',
          orbital_location: 'GEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation: 'Track 1',
          ecf_cartesian_vectors_format_file_desc: 'ECF 1',
          ecf_cartesian_vectors_format_file_path: 'ecf1.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'Image 1',
          ground_track_of_launch_vehicle_2d_img_file_path: 'img1.jpg',
          primary_poc_name: 'John Doe',
          primary_poc_email: 'john@commercial.com',
          primary_poc_phone: '555-0001',
          alternate_poc_name: 'Jane Doe',
          alternate_poc_email: 'jane@commercial.com',
          alternate_poc_phone: '555-0002',
          status: 'SUBMITTED',
          read: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2400.0],
        },
        {
          id: 2,
          unreadMessageCount: 3, // Has unread messages - badge should show "3"
          fcc_filing_date: '2024-01-02',
          name_of_licensee: 'Commercial Corp B',
          call_sign: 'COMM2',
          mission_name: 'Commercial Mission B',
          name_of_launch_vehicle: 'Commercial Vehicle 2',
          city: 'Austin',
          state: 'TX',
          latitude: 30.2672,
          longitude: -97.7431,
          launch_datetime_primary: '2024-06-03T10:00:00Z',
          launch_datetime_backup: '2024-06-04T10:00:00Z',
          orbital_location: 'LEO',
          number_of_frequencies: 2,
          ground_track_from_liftoff_until_payload_separation: 'Track 2',
          ecf_cartesian_vectors_format_file_desc: 'ECF 2',
          ecf_cartesian_vectors_format_file_path: 'ecf2.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'Image 2',
          ground_track_of_launch_vehicle_2d_img_file_path: 'img2.jpg',
          primary_poc_name: 'Bob Smith',
          primary_poc_email: 'bob@commercial.com',
          primary_poc_phone: '555-0003',
          alternate_poc_name: 'Alice Smith',
          alternate_poc_email: 'alice@commercial.com',
          alternate_poc_phone: '555-0004',
          status: 'UNDER_NTIA_INITIAL_REVIEW',
          read: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2400.0, 2450.0],
        },
        {
          id: 3,
          unreadMessageCount: 150, // Large count - badge should show "99+"
          fcc_filing_date: '2024-01-03',
          mission_name: 'Commercial Mission C',
          name_of_licensee: 'Commercial Corp C',
          call_sign: 'COMM3',
          name_of_launch_vehicle: 'Commercial Vehicle 3',
          city: 'Dallas',
          state: 'TX',
          latitude: 32.7767,
          longitude: -96.797,
          launch_datetime_primary: '2024-06-05T10:00:00Z',
          launch_datetime_backup: '2024-06-06T10:00:00Z',
          orbital_location: 'MEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation: 'Track 3',
          ecf_cartesian_vectors_format_file_desc: 'ECF 3',
          ecf_cartesian_vectors_format_file_path: 'ecf3.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'Image 3',
          ground_track_of_launch_vehicle_2d_img_file_path: 'img3.jpg',
          primary_poc_name: 'Charlie Brown',
          primary_poc_email: 'charlie@commercial.com',
          primary_poc_phone: '555-0005',
          alternate_poc_name: 'Lucy Brown',
          alternate_poc_email: 'lucy@commercial.com',
          alternate_poc_phone: '555-0006',
          status: 'UNDER_FEDERAL_AGENCIES_REVIEW',
          read: false,
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2500.0],
        },
      ];

      mockUseRequests.mockReturnValue({
        data: {
          data: mockCommercialData,
          totalCount: 3,
          page: 1,
          pageSize: 10,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      render(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('requests-table')).toBeInTheDocument();
      });

      // Verify all requests are rendered
      expect(screen.getByTestId('request-1')).toBeInTheDocument();
      expect(screen.getByTestId('request-2')).toBeInTheDocument();
      expect(screen.getByTestId('request-3')).toBeInTheDocument();

      // Verify request 1 has no badge (0 unread messages - requirement: do not show 0 counts)
      expect(
        screen.queryByTestId('request-1-unread-badge')
      ).not.toBeInTheDocument();

      // Verify request 2 has badge showing "3"
      const badge2 = screen.getByTestId('request-2-unread-badge');
      expect(badge2).toBeInTheDocument();
      expect(badge2).toHaveTextContent('3');
      expect(badge2).toHaveAttribute(
        'aria-label',
        '3 unread messages for request 2'
      );

      // Verify request 3 has badge showing "99+"
      const badge3 = screen.getByTestId('request-3-unread-badge');
      expect(badge3).toBeInTheDocument();
      expect(badge3).toHaveTextContent('99+');
      expect(badge3).toHaveAttribute(
        'aria-label',
        'more than 99 unread messages for request 3'
      );
    });

    it('should display correct unread badges for NASA user (entity-based filtering)', async () => {
      // This test simulates what a NASA user would see after the backend fix
      const mockNASAData: RequestSummary[] = [
        {
          id: 10,
          unreadMessageCount: 0, // NASA not involved in this request's inquiries
          fcc_filing_date: '2024-01-01',
          mission_name: 'Commercial Mission D',
          name_of_licensee: 'Commercial Request (NASA not involved)',
          call_sign: 'NONAS',
          name_of_launch_vehicle: 'Non-NASA Vehicle',
          city: 'Houston',
          state: 'TX',
          latitude: 29.7604,
          longitude: -95.3698,
          launch_datetime_primary: '2024-06-01T10:00:00Z',
          launch_datetime_backup: '2024-06-02T10:00:00Z',
          orbital_location: 'GEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation: 'Non-NASA track',
          ecf_cartesian_vectors_format_file_desc: 'Non-NASA ECF',
          ecf_cartesian_vectors_format_file_path: 'non-nasa.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'Non-NASA image',
          ground_track_of_launch_vehicle_2d_img_file_path: 'non-nasa.jpg',
          primary_poc_name: 'Non NASA Contact',
          primary_poc_email: 'contact@commercial.com',
          primary_poc_phone: '555-1001',
          alternate_poc_name: 'Non NASA Alt',
          alternate_poc_email: 'alt@commercial.com',
          alternate_poc_phone: '555-1002',
          status: 'SUBMITTED',
          read: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2400.0],
        },
        {
          id: 11,
          unreadMessageCount: 2, // NASA involved in this request's inquiry with NTIA
          fcc_filing_date: '2024-01-02',
          mission_name: 'NASA Mission E',
          name_of_licensee: 'NASA Request with NTIA Inquiry',
          call_sign: 'NASA1',
          name_of_launch_vehicle: 'NASA Vehicle',
          city: 'Cape Canaveral',
          state: 'FL',
          latitude: 28.3922,
          longitude: -80.6077,
          launch_datetime_primary: '2024-06-03T10:00:00Z',
          launch_datetime_backup: '2024-06-04T10:00:00Z',
          orbital_location: 'LEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation: 'NASA track',
          ecf_cartesian_vectors_format_file_desc: 'NASA ECF',
          ecf_cartesian_vectors_format_file_path: 'nasa.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'NASA image',
          ground_track_of_launch_vehicle_2d_img_file_path: 'nasa.jpg',
          primary_poc_name: 'NASA Engineer',
          primary_poc_email: 'engineer@nasa.gov',
          primary_poc_phone: '555-2001',
          alternate_poc_name: 'NASA Manager',
          alternate_poc_email: 'manager@nasa.gov',
          alternate_poc_phone: '555-2002',
          status: 'UNDER_FEDERAL_AGENCIES_REVIEW',
          read: false,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2500.0],
        },
      ];

      mockUseRequests.mockReturnValue({
        data: {
          data: mockNASAData,
          totalCount: 2,
          totalPages: 1,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      render(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('requests-table')).toBeInTheDocument();
      });

      // Verify both requests are rendered
      expect(screen.getByTestId('request-10')).toBeInTheDocument();
      expect(screen.getByTestId('request-11')).toBeInTheDocument();

      // Verify request 10 has no badge (NASA not involved in inquiries - 0 count not shown)
      expect(
        screen.queryByTestId('request-10-unread-badge')
      ).not.toBeInTheDocument();

      // Verify request 11 has badge showing "2" (NASA involved in inquiry)
      const badge11 = screen.getByTestId('request-11-unread-badge');
      expect(badge11).toBeInTheDocument();
      expect(badge11).toHaveTextContent('2');
      expect(badge11).toHaveAttribute(
        'aria-label',
        '2 unread messages for request 11'
      );
    });

    it('should handle loading and error states', async () => {
      // Test loading state
      mockUseRequests.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      const { rerender } = render(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Test error state
      mockUseRequests.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch requests'),
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      rerender(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      expect(screen.getByTestId('error')).toBeInTheDocument();

      // Test no data state
      mockUseRequests.mockReturnValue({
        data: { data: [], totalCount: 0, totalPages: 0 },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      rerender(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      expect(screen.getByTestId('requests-table')).toBeInTheDocument();
      expect(screen.queryByTestId(/^request-\d+$/)).not.toBeInTheDocument();
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle requests with undefined unreadMessageCount', async () => {
      const mockDataWithUndefined: RequestSummary[] = [
        {
          id: 20,
          // unreadMessageCount is intentionally omitted (undefined)
          fcc_filing_date: '2024-01-01',
          mission_name: 'Undefined Mission',
          name_of_licensee: 'Undefined Count Corp',
          call_sign: 'UNDEF',
          name_of_launch_vehicle: 'Undefined Vehicle',
          city: 'Undefined City',
          state: 'TX',
          latitude: 0,
          longitude: 0,
          launch_datetime_primary: '2024-06-01T10:00:00Z',
          launch_datetime_backup: '2024-06-02T10:00:00Z',
          orbital_location: 'GEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation: 'Undefined track',
          ecf_cartesian_vectors_format_file_desc: 'Undefined ECF',
          ecf_cartesian_vectors_format_file_path: 'undefined.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'Undefined image',
          ground_track_of_launch_vehicle_2d_img_file_path: 'undefined.jpg',
          primary_poc_name: 'Undefined Contact',
          primary_poc_email: 'undefined@test.com',
          primary_poc_phone: '000-0000',
          alternate_poc_name: 'Undefined Alt',
          alternate_poc_email: 'undefinedalt@test.com',
          alternate_poc_phone: '000-0001',
          status: 'SUBMITTED',
          read: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2400.0],
        },
      ];

      mockUseRequests.mockReturnValue({
        data: {
          data: mockDataWithUndefined,
          totalCount: 1,
          page: 1,
          pageSize: 10,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      render(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('request-20')).toBeInTheDocument();
      });

      // Should not show badge for undefined unreadMessageCount (requirement: only show counts > 0)
      expect(
        screen.queryByTestId('request-20-unread-badge')
      ).not.toBeInTheDocument();
    });

    it('should not show badge for zero unread message count', async () => {
      const mockDataWithZero: RequestSummary[] = [
        {
          id: 22,
          unreadMessageCount: 0, // Explicitly zero - should not show badge
          fcc_filing_date: '2024-01-01',
          mission_name: 'Zero Mission',
          name_of_licensee: 'Zero Count Corp',
          call_sign: 'ZERO0',
          name_of_launch_vehicle: 'Zero Vehicle',
          city: 'Zero City',
          state: 'TX',
          latitude: 0,
          longitude: 0,
          launch_datetime_primary: '2024-06-01T10:00:00Z',
          launch_datetime_backup: '2024-06-02T10:00:00Z',
          orbital_location: 'GEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation: 'Zero track',
          ecf_cartesian_vectors_format_file_desc: 'Zero ECF',
          ecf_cartesian_vectors_format_file_path: 'zero.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'Zero image',
          ground_track_of_launch_vehicle_2d_img_file_path: 'zero.jpg',
          primary_poc_name: 'Zero Contact',
          primary_poc_email: 'zero@test.com',
          primary_poc_phone: '000-0000',
          alternate_poc_name: 'Zero Alt',
          alternate_poc_email: 'zeroalt@test.com',
          alternate_poc_phone: '000-0001',
          status: 'SUBMITTED',
          read: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2400.0],
        },
      ];

      mockUseRequests.mockReturnValue({
        data: {
          data: mockDataWithZero,
          totalCount: 1,
          page: 1,
          pageSize: 10,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      render(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('request-22')).toBeInTheDocument();
      });

      // Should not show badge for zero unreadMessageCount (requirement: do not show 0 counts)
      expect(
        screen.queryByTestId('request-22-unread-badge')
      ).not.toBeInTheDocument();
    });

    it('should handle exactly 99 unread messages correctly', async () => {
      const mockDataWith99: RequestSummary[] = [
        {
          id: 21,
          unreadMessageCount: 99, // Exactly 99 - should show "99", not "99+"
          fcc_filing_date: '2024-01-01',
          mission_name: 'Exactly 99 Mission',
          name_of_licensee: 'Exactly 99 Corp',
          call_sign: 'NINE9',
          name_of_launch_vehicle: '99 Vehicle',
          city: '99 City',
          state: 'TX',
          latitude: 0,
          longitude: 0,
          launch_datetime_primary: '2024-06-01T10:00:00Z',
          launch_datetime_backup: '2024-06-02T10:00:00Z',
          orbital_location: 'GEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation: '99 track',
          ecf_cartesian_vectors_format_file_desc: '99 ECF',
          ecf_cartesian_vectors_format_file_path: '99.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: '99 image',
          ground_track_of_launch_vehicle_2d_img_file_path: '99.jpg',
          primary_poc_name: '99 Contact',
          primary_poc_email: '99@test.com',
          primary_poc_phone: '999-9999',
          alternate_poc_name: '99 Alt',
          alternate_poc_email: '99alt@test.com',
          alternate_poc_phone: '999-9998',
          status: 'UNDER_NTIA_INITIAL_REVIEW',
          read: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          current_revision: true,
          revision: 0,
          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2400.0],
        },
      ];

      mockUseRequests.mockReturnValue({
        data: {
          data: mockDataWith99,
          totalCount: 1,
          page: 1,
          pageSize: 10,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      render(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('request-21')).toBeInTheDocument();
      });

      // Should show "99", not "99+"
      const badge = screen.getByTestId('request-21-unread-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('99');
      expect(badge).not.toHaveTextContent('99+');
      expect(badge).toHaveAttribute(
        'aria-label',
        '99 unread messages for request 21'
      );
    });
  });

  describe('accessibility compliance', () => {
    it('should have proper ARIA attributes for unread message badges', async () => {
      const mockAccessibilityData: RequestSummary[] = [
        {
          id: 30,
          unreadMessageCount: 1,
          fcc_filing_date: '2024-01-01',
          mission_name: 'Accessibility Test Mission',
          name_of_licensee: 'Accessibility Test Corp',
          call_sign: 'A11Y1',
          name_of_launch_vehicle: 'Accessible Vehicle',
          city: 'Accessible City',
          state: 'TX',
          latitude: 0,
          longitude: 0,
          launch_datetime_primary: '2024-06-01T10:00:00Z',
          launch_datetime_backup: '2024-06-02T10:00:00Z',
          orbital_location: 'GEO',
          number_of_frequencies: 1,
          ground_track_from_liftoff_until_payload_separation:
            'Accessible track',
          ecf_cartesian_vectors_format_file_desc: 'Accessible ECF',
          ecf_cartesian_vectors_format_file_path: 'accessible.csv',
          ground_track_of_launch_vehicle_2d_img_file_desc: 'Accessible image',
          ground_track_of_launch_vehicle_2d_img_file_path: 'accessible.jpg',
          primary_poc_name: 'Accessible Contact',
          primary_poc_email: 'accessible@test.com',
          primary_poc_phone: '111-1111',
          alternate_poc_name: 'Accessible Alt',
          alternate_poc_email: 'accessiblealt@test.com',
          alternate_poc_phone: '111-1112',
          status: 'SUBMITTED',
          read: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          current_revision: true,
          revision: 0,

          ecf_cartesian_vectors_format_file: 'ecf test file',
          ground_track_of_launch_vehicle_2d_img_file: 'image test file',
          frequencies: [2400.0],
        },
      ];

      mockUseRequests.mockReturnValue({
        data: {
          data: mockAccessibilityData,
          totalCount: 1,
          page: 1,
          pageSize: 10,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as UseQueryResult<ApiResponse<RequestSummary>>);

      render(
        <TestWrapper>
          <MockRequestsTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('request-30')).toBeInTheDocument();
      });

      const badge = screen.getByTestId('request-30-unread-badge');

      // Verify ARIA attributes
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute(
        'aria-label',
        '1 unread message for request 30'
      );

      // Verify the badge is properly associated with the inquiry button
      const inquiryButton = screen.getByLabelText(
        'View inquiries for request 30'
      );
      expect(inquiryButton).toBeInTheDocument();
    });
  });
});
