import { Box, Button, Flex, Image, Text } from '@chakra-ui/react';
import { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Logo from '../../../assets/slfcp-logo.png';
import { useHybridAuth, UserRole } from '../../../context/HybridAuthContext';
import { ConfirmNavigationModalContext } from '../../../context/ConfirmNavigationModalContext';
import { BreadCrumbs } from '../BreadCrumbs';

import { NavBarMenuButton } from './NavBarMenuButton';
import { getVisibleNavBarSettingsItems } from './navbarConfig';

export const NavBar = () => {
  const { user, logout } = useHybridAuth();

  const {
    openConfirmNavigationModal,
    setNextRoute,
    setConfirmAction,
    shouldConfirmBeforeNavigating,
  } = useContext(ConfirmNavigationModalContext);
  const currentPath = useLocation().pathname;

  const navigate = useNavigate();
  const settingsItems = getVisibleNavBarSettingsItems(user?.role);

  const handleRouteClick = (targetPath: string) => {
    if (currentPath === targetPath) {
      if (shouldConfirmBeforeNavigating(currentPath)) {
        setConfirmAction(() => window.location.reload());
        openConfirmNavigationModal();
        return;
      }

      window.location.reload();
      return;
    }

    if (shouldConfirmBeforeNavigating(currentPath)) {
      setNextRoute(targetPath);
      openConfirmNavigationModal();
      return;
    }

    navigate(targetPath);
  };

  return (
    <Box w="100%">
      <Flex flexDir="row" justifyContent="space-between" px={5}>
        <Image
          src={Logo}
          alt="SLFCP logo"
          width={24}
          cursor="pointer"
          onClick={() => handleRouteClick('/')}
        />
        <Flex
          flexDir="row"
          justifyContent="flex-end"
          gap={3}
          alignItems="center"
          padding={3}
        >
          <Box mx={2}>
            <Text fontSize="sm" fontWeight="bold" textAlign="center">
              {user?.displayName}
            </Text>
            <Text fontSize="xs" textAlign="center">
              {user?.role ? `${user.role} User` : ''}
            </Text>
          </Box>
          {settingsItems.length > 0 && (
            <NavBarMenuButton
              items={settingsItems}
              onItemClick={(item) => handleRouteClick(item.path)}
            />
          )}
          <Button
            variant="unstyled"
            fontWeight={'normal'}
            fontSize={12}
            onClick={() => {
              if (shouldConfirmBeforeNavigating(currentPath)) {
                setConfirmAction(logout);
                openConfirmNavigationModal();
              } else {
                logout();
              }
            }}
          >
            Log Out
          </Button>
          <Button
            variant="unstyled"
            fontWeight={'normal'}
            fontSize={12}
            alignContent="center"
            onClick={() => handleRouteClick('/help')}
          >
            Help
          </Button>
        </Flex>
      </Flex>
      <Flex
        flexDir="row"
        shadow="0px 3px 5px 0px rgb(206, 206, 206)"
        m={'5px auto'}
        w="97%"
        justifyContent="space-between"
        padding={2}
        alignItems="center"
      >
        <BreadCrumbs
          openConfirmModal={openConfirmNavigationModal}
          setNextRoute={setNextRoute}
          shouldConfirmBeforeNavigating={shouldConfirmBeforeNavigating(
            currentPath
          )}
        />
        <Flex flexDir="row" gap={5} alignItems="center">
          {user?.role === UserRole.ntia && (
            <>
              <Button
                onClick={() => handleRouteClick('/dashboard')}
                alignContent="center"
                variant="unstyled"
                fontWeight={'normal'}
                fontSize={12}
              >
                Dashboard
              </Button>
            </>
          )}
          <Button
            onClick={() => handleRouteClick('/view-requests')}
            alignContent="center"
            variant="unstyled"
            fontWeight={'normal'}
            fontSize={12}
          >
            View Requests
          </Button>
          {user?.role === UserRole.commercial && (
            <>
              <Button
                onClick={() => handleRouteClick('/create-request')}
                color="white"
                fontWeight={'bold'}
                _hover={{ textDecoration: 'underline' }}
                backgroundColor="#5A606B"
                fontSize={12}
                height={30}
              >
                New Request
              </Button>
            </>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};
