import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface SessionWarningProps {
  isVisible: boolean;
  timeRemaining: number; // in milliseconds
  onExtendSession: () => void;
  onLogout: () => void;
}

export const SessionWarning = ({
  isVisible,
  timeRemaining,
  onExtendSession,
  onLogout,
}: SessionWarningProps) => {
  const [countdown, setCountdown] = useState(Math.ceil(timeRemaining / 1000));

  // ✅ Call hooks unconditionally (before any early return)
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    if (!isVisible) return;

    // reset countdown whenever warning opens
    setCountdown(Math.ceil(timeRemaining / 1000));

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, timeRemaining, onLogout]);

  if (!isVisible) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Flex
      position="fixed"
      inset={0}
      bg="blackAlpha.600"
      align="center"
      justify="center"
      zIndex={9999}
    >
      <Box bg={cardBg} rounded="lg" shadow="xl" p={6} maxW="md" w="full" mx={4}>
        <HStack mb={4} spacing={3} align="start">
          <Icon as={FaExclamationTriangle} w={8} h={8} color="yellow.400" />
          <Text fontSize="lg" fontWeight="medium">
            Session Expiring Soon
          </Text>
        </HStack>

        <VStack spacing={4} align="stretch">
          <Box>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Your session will expire due to inactivity. You will be
              automatically logged out in:
            </Text>
            <Text
              fontSize="3xl"
              fontWeight="bold"
              color="red.500"
              textAlign="center"
            >
              {formatTime(countdown)}
            </Text>
          </Box>

          <HStack spacing={3}>
            <Button flex={1} colorScheme="blue" onClick={onExtendSession}>
              Stay Logged In
            </Button>
            <Button flex={1} colorScheme="gray" onClick={onLogout}>
              Logout Now
            </Button>
          </HStack>
        </VStack>

        <Text mt={3} fontSize="xs" color="gray.500" textAlign="center">
          Click anywhere or move your mouse to extend your session automatically
        </Text>
      </Box>
    </Flex>
  );
};
