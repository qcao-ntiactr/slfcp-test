import React from 'react';
import { Button, Icon, Text, VStack } from '@chakra-ui/react';
import { FaMicrosoft } from 'react-icons/fa';

import { useHybridAuth } from '../../context/HybridAuthContext';

interface EntraLoginButtonProps {
  onMockLogin?: () => void;
  onClick?: () => void;
}

export const EntraLoginButton: React.FC<EntraLoginButtonProps> = ({
  onMockLogin,
  onClick,
}) => {
  const { loginWithEntra, authMode, isEntraConfigured, isLoading } =
    useHybridAuth();

  const handleLogin = async () => {
    if (onClick) {
      onClick();
      return;
    }

    if (authMode === 'mock' || !isEntraConfigured) {
      // Fallback to mock login
      if (onMockLogin) {
        onMockLogin();
      }
      return;
    }

    try {
      await loginWithEntra();
    } catch (error) {
      console.error('Login failed:', error);
      // Fallback to mock login if available
      if (onMockLogin) {
        onMockLogin();
      }
    }
  };

  const getButtonText = () => {
    if (authMode === 'mock') {
      return 'Sign In (Mock Mode)';
    }
    if (isEntraConfigured) {
      return 'Sign in with Microsoft';
    }
    return 'Sign In';
  };

  const getButtonIcon = () => {
    if (authMode === 'mock' || !isEntraConfigured) {
      return undefined;
    }
    return <Icon as={FaMicrosoft} />;
  };

  return (
    <VStack spacing={4} align="stretch">
      <Button
        leftIcon={getButtonIcon()}
        colorScheme="blue"
        size="lg"
        onClick={handleLogin}
        isLoading={isLoading}
        loadingText="Signing in..."
        disabled={isLoading}
      >
        {getButtonText()}
      </Button>

      {authMode === 'hybrid' && (
        <Text fontSize="sm" color="gray.600" textAlign="center">
          Supports both Microsoft and mock authentication
        </Text>
      )}

      {authMode === 'mock' && (
        <Text fontSize="sm" color="orange.600" textAlign="center">
          Running in mock authentication mode
        </Text>
      )}
    </VStack>
  );
};
