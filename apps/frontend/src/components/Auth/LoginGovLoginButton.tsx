import React from 'react';
import { Button, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { RiShieldKeyholeFill } from 'react-icons/ri';

import { useHybridAuth } from '../../context/HybridAuthContext';

interface LoginGovLoginButtonProps {
  onClick?: () => void;
}

export const LoginGovLoginButton: React.FC<LoginGovLoginButtonProps> = ({
  onClick,
}) => {
  const { loginWithLoginGov, isLoginGovConfigured, isLoading } =
    useHybridAuth();

  const handleLogin = async () => {
    if (onClick) {
      onClick();
      return;
    }

    try {
      await loginWithLoginGov();
    } catch (error) {
      console.error('Login.gov login failed:', error);
    }
  };

  if (!isLoginGovConfigured) {
    return null;
  }

  return (
    <VStack spacing={4} align="stretch">
      <Button
        backgroundColor="#112E51"
        borderRadius="6px"
        color="white"
        fontSize="14px"
        fontWeight="500"
        h="42px"
        onClick={handleLogin}
        isLoading={isLoading}
        justifyContent="center"
        loadingText="Signing in..."
        px={5}
        _active={{ backgroundColor: '#0E2F4E' }}
        _hover={{ backgroundColor: '#0E2F4E' }}
        _disabled={{ opacity: 0.8, cursor: 'not-allowed' }}
        disabled={isLoading}
      >
        <HStack spacing={2}>
          <Text as="span">Sign in with</Text>
          <Icon
            as={RiShieldKeyholeFill}
            aria-hidden="true"
            color="#B51E23"
            fontSize="16px"
          />
          <Text
            as="span"
            fontSize="13px"
            fontWeight="700"
            letterSpacing="0.04em"
          >
            LOGIN.GOV
          </Text>
        </HStack>
      </Button>
    </VStack>
  );
};
