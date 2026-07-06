import {
  Box,
  Button,
  Flex,
  FormLabel,
  Heading,
  Image,
  Input,
  Text,
  VStack,
  Spinner,
  Alert,
  AlertIcon,
  Link,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import Logo from '../assets/slfcp-logo.png';
import { useHybridAuth } from '../context/HybridAuthContext';
import { EntraLoginButton } from '../components/Auth/EntraLoginButton';
import { LoginGovLoginButton } from '../components/Auth/LoginGovLoginButton';

export const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const {
    user,
    login,
    loginWithEntra,
    loginWithLoginGov,
    isLoading,
    authMode,
    isEntraConfigured,
    isLoginGovConfigured,
  } = useHybridAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/view-requests');
    }
  }, [user, navigate]);

  const handleMockLogin = async () => {
    setError('');
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/view-requests');
      } else {
        setError('Invalid credentials!');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  const handleEntraLogin = async () => {
    setError('');
    try {
      await loginWithEntra();
      // Navigation will happen automatically after successful login
    } catch {
      setError('Microsoft login failed. Please try again.');
    }
  };

  const handleLoginGovLogin = async () => {
    setError('');
    try {
      await loginWithLoginGov();
      // Redirection will happen automatically to Login.gov
    } catch {
      setError('Login.gov login failed. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Box minH="100vh" px={4} py={{ base: 12, md: 20 }}>
        <Flex
          flexDir="column"
          alignItems="center"
          maxWidth="773px"
          justifyContent="center"
          margin="0px auto"
        >
          <Image src={Logo} w="xs" mb={5} alt="SLFCP logo" />
          <Spinner size="xl" />
          <Text mt={4}>Loading...</Text>
        </Flex>
      </Box>
    );
  }

  return (
    <Box minH="100vh" px={4} py={{ base: 12, md: 20 }}>
      <Flex
        flexDir="column"
        alignItems="center"
        maxWidth="960px"
        justifyContent="center"
        margin="0px auto"
      >
        <Image
          src={Logo}
          w={{ base: '240px', md: '280px' }}
          mb={{ base: 8, md: 10 }}
          alt="SLFCP logo"
        />
        <VStack
          spacing={4}
          backgroundColor="#F4F7FB"
          border="1px solid"
          borderColor="#E2E8F0"
          padding={{ base: 6, md: 8 }}
          w={{ base: '100%', md: '452px' }}
        >
          <Box w="100%">
            <Heading
              fontSize={27}
              lineHeight="1.1"
              margin="0px auto"
              textAlign="center"
              mb={3}
            >
              Sign In
            </Heading>
            <Text
              color="#1A202C"
              fontSize="16px"
              fontWeight="700"
              lineHeight="1.3"
              mb={7}
              textAlign="center"
            >
              Space Launch Frequency Coordination Portal
            </Text>

            {error && (
              <Alert status="error" mb={4}>
                <AlertIcon />
                {error}
              </Alert>
            )}

            {/* Show authentication buttons if configured */}
            {(authMode === 'entra' && isEntraConfigured) ||
            (authMode === 'login-gov' && isLoginGovConfigured) ? (
              <VStack spacing={4} w="100%">
                {authMode === 'entra' && isEntraConfigured && (
                  <EntraLoginButton onClick={handleEntraLogin} />
                )}
                {authMode === 'login-gov' && isLoginGovConfigured && (
                  <VStack gap={5}>
                    <LoginGovLoginButton onClick={handleLoginGovLogin} />
                    <Text fontSize="14px" fontWeight="400" textAlign="center">
                      Need access?{' '}
                      <Link
                        aria-label="Read registration and login instructions"
                        href="/user-instructions"
                        textDecoration="underline"
                      >
                        Read registration and login instructions.
                      </Link>
                    </Text>
                  </VStack>
                )}
              </VStack>
            ) : authMode === 'mock' ? (
              /* Show mock login form */
              <>
                <FormLabel htmlFor="email" fontSize="12px">
                  Email Address
                </FormLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  backgroundColor="white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') {
                      handleMockLogin();
                    }
                  }}
                />
                <Box w="100%" mt={4}>
                  <FormLabel htmlFor="password" fontSize="12px">
                    Password
                  </FormLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    backgroundColor="white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => {
                      if (e.key === 'Enter') {
                        handleMockLogin();
                      }
                    }}
                  />
                  <Flex justifyContent="flex-end">
                    <Button
                      variant="unstyled"
                      fontWeight="normal"
                      textDecoration="underline"
                      fontSize="12px"
                    >
                      Forgot password
                    </Button>
                  </Flex>
                </Box>
                <Button
                  color="white"
                  backgroundColor="#5A606B"
                  _hover={{ textDecoration: 'underline' }}
                  w="100%"
                  mt={4}
                  onClick={handleMockLogin}
                >
                  Sign In
                </Button>
                <Button
                  variant="unstyled"
                  fontWeight="normal"
                  fontSize={'14px'}
                  flexDirection="row"
                >
                  Don't have an account?{' '}
                  <span style={{ textDecoration: 'underline' }}>
                    Create account
                  </span>
                </Button>
              </>
            ) : (
              /* Show error if configured mode is not available */
              <VStack spacing={4} w="100%">
                <Alert status="error" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Authentication Error</Text>
                    <Text fontSize="sm">
                      {authMode === 'login-gov'
                        ? 'Login.gov is not properly configured.'
                        : authMode === 'entra'
                          ? 'Microsoft Entra ID is not properly configured.'
                          : 'No authentication provider is configured.'}
                    </Text>
                  </Box>
                </Alert>
                <Text fontSize="xs" textAlign="center" color="gray.500">
                  Please contact your system administrator.
                </Text>
              </VStack>
            )}
          </Box>
        </VStack>
        <Box mt={8} maxW="773px">
          <Text w="100%" textAlign="left" mb={1} fontSize="0.8em">
            NOTICE TO USERS:
          </Text>
          <Text w="100%" textAlign="left" m="0 auto" fontSize="0.7em">
            You are accessing a U.S. Government information system, which
            includes: 1) this computer, 2) this computer network, 3) all
            Government-furnished computers connected to this network, and 4) all
            Government-furnished devices and storage media attached to this
            network or to a computer on this network. You understand and consent
            to the following: you may access this information system for
            authorized use only; unauthorized use of the system is prohibited
            and subject to criminal and civil penalties; you have no reasonable
            expectation of privacy regarding any communication or data
            transiting or stored on this information system at any time and for
            any lawful Government purpose, the Government may monitor,
            intercept, audit, and search and seize any communication or data
            transiting or stored on this information system; and any
            communications or data transiting or stored on this information
            system may be disclosed or used for any lawful Government purpose.
            This information system may contain Controlled Unclassified
            Information (CUI) that is subject to safeguarding or dissemination
            controls in accordance with law, regulation, or Government-wide
            policy. Accessing and using this system indicates your understanding
            of this warning. NTIA employees and contractors are reminded that
            all official NTIA email communications must be made using their
            assigned NTIA email account. Use of personal e-mail accounts for
            official communications is prohibited.{' '}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};
