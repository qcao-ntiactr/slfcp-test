import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner, Box, Flex } from '@chakra-ui/react';

import { useHybridAuth, UserRole } from '../context/HybridAuthContext';
import { InactiveUserPage } from '../pages/InactiveUserPage';

interface ProtectedRouteProps {
  children: React.JSX.Element;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
}) => {
  const { user, isLoading, authError } = useHybridAuth();

  if (isLoading) {
    return (
      <Box py={9}>
        <Flex
          flexDir="column"
          alignItems="center"
          maxWidth="773px"
          justifyContent="center"
          margin="0px auto"
        >
          <Spinner size="xl" />
        </Flex>
      </Box>
    );
  }

  if (authError) {
    return <InactiveUserPage />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
