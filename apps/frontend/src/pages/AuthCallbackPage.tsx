import { Box, Flex, Spinner, Text, Button } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useHybridAuth } from '../context/HybridAuthContext';

import { InactiveUserPage } from './InactiveUserPage';

export const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { exchangeCodeForTokens, authError } = useHybridAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');

        if (!code && !errorParam) {
          // No code and no error - likely a post-logout redirect
          navigate('/login', { replace: true });
          return;
        }

        if (errorParam) {
          setError(`Authentication error: ${errorParam}`);
          return;
        }

        if (!code) {
          setError(
            'Authorization code not found. Please try logging in again.'
          );
          return;
        }

        // Exchange code for tokens
        const success = await exchangeCodeForTokens(code);

        if (success) {
          // Redirect to dashboard
          navigate('/view-requests', { replace: true });
        } else if (!authError) {
          // Only show generic error if authError wasn't set by context
          setError('Failed to authenticate. Please try again.');
        }
      } catch (err) {
        console.error('Callback error:', err);
        // If authError is set in context, we'll show InactiveUserPage instead of this local error
        if (!authError) {
          setError(
            err instanceof Error ? err.message : 'Authentication failed'
          );
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate, exchangeCodeForTokens, authError]);

  if (authError) {
    return <InactiveUserPage />;
  }

  return (
    <Box py={9}>
      <Flex
        flexDir="column"
        alignItems="center"
        maxWidth="773px"
        justifyContent="center"
        margin="0px auto"
        minH="100vh"
      >
        {error && (
          <Box
            p={6}
            backgroundColor="red.50"
            color="red.600"
            borderRadius="md"
            textAlign="center"
          >
            <Text fontWeight="bold" fontSize="lg" mb={2}>
              Authentication Error
            </Text>
            <Text mb={6}>{error}</Text>
            <Button colorScheme="blue" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </Box>
        )}
        {!error && !authError && (
          <>
            <Spinner size="xl" thickness="4px" speed="0.65s" />
            <Text mt={4} fontSize="lg">
              Authenticating...
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              Please wait while we process your login.
            </Text>
          </>
        )}
      </Flex>
    </Box>
  );
};
