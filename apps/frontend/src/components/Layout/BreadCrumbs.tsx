import { Box, Breadcrumb, BreadcrumbItem } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';

import { formatRequestDraftId, formatRequestId } from '../utils/Helpers';

interface BreadCrumbsInterface {
  openConfirmModal: () => void;
  // eslint-disable-next-line no-unused-vars
  setNextRoute: (route: string) => void;
  shouldConfirmBeforeNavigating: boolean;
}

export const BreadCrumbs = ({
  openConfirmModal,
  setNextRoute,
  shouldConfirmBeforeNavigating,
}: BreadCrumbsInterface) => {
  const location = useLocation();
  const navigate = useNavigate();

  const rawSegments = location.pathname.split('/').filter(Boolean);

  const pathsThatBranchFromViewRequests = [
    'revise-request',
    'view-details',
    'inquiries',
    'edit-draft',
  ];

  let pathSegments = [...rawSegments];
  if (
    pathsThatBranchFromViewRequests.includes(rawSegments?.[0]) &&
    rawSegments.length === 2
  ) {
    pathSegments = ['view-requests', rawSegments[1]];
  }

  const humanizeLabel = (segment: string) =>
    segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const getLabel = (segment: string, isLast: boolean) => {
    if (isLast && /^\d+$/.test(segment)) {
      if (rawSegments?.[0] === 'edit-draft') {
        return formatRequestDraftId(Number(segment));
      } else {
        return formatRequestId(Number(segment));
      }
    }
    return humanizeLabel(segment);
  };

  if (pathSegments.length === 0) return <div />;

  const handleHomeClick = () => {
    if (shouldConfirmBeforeNavigating) {
      setNextRoute('/');
      openConfirmModal();
    } else {
      navigate('/');
    }
  };

  return (
    <Box p={2}>
      <Breadcrumb separator="">
        {/* Home breadcrumb */}
        <BreadcrumbItem>
          <Box
            as="button"
            onClick={handleHomeClick}
            px={4}
            py={1}
            bg="#006DE433"
            color="#005EC4"
            fontSize="12px"
            fontWeight="bold"
            _hover={{ textDecoration: 'underline' }}
            clipPath="polygon(85% 0, 100% 50%, 85% 100%, 0 100%, 0 0)"
            mr="-19px"
            zIndex={2}
            position="relative"
          >
            Home
          </Box>
        </BreadcrumbItem>

        {pathSegments.map((segment, index) => {
          const isLast = index === pathSegments.length - 1;
          const url = `/${pathSegments.slice(0, index + 1).join('/')}`;

          const clipPath = isLast
            ? 'polygon(100% 0, 100% 100%, 0% 100%, 7% 50%, 0% 0)' // Final segment
            : 'polygon(85% 0, 92% 50%, 85% 100%, 0% 100%, 7% 50%, 0% 0)'; // Middle segment

          return (
            <BreadcrumbItem key={url} zIndex={10 - index}>
              <Box
                as="button"
                onClick={() => {
                  if (shouldConfirmBeforeNavigating) {
                    setNextRoute(url);
                    openConfirmModal();
                  } else {
                    navigate(url);
                  }
                }}
                px={5}
                py={1}
                textAlign="center"
                bg={isLast ? '#69707D33' : '#006DE433'}
                color={isLast ? '#5A606B' : '#005EC4'}
                fontSize="12px"
                fontWeight="bold"
                clipPath={clipPath}
                mr="-26px"
                minWidth="70px"
                zIndex={10 - index}
                position="relative"
                _hover={isLast ? undefined : { textDecoration: 'underline' }}
                pointerEvents={isLast ? 'none' : 'auto'}
                aria-current={isLast ? 'page' : undefined}
              >
                {getLabel(segment, isLast)}
              </Box>
            </BreadcrumbItem>
          );
        })}
      </Breadcrumb>
    </Box>
  );
};
