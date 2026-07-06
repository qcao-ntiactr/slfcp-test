import { Box, Text, useDisclosure } from '@chakra-ui/react';
import { createContext, ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConfirmationModal } from '../components/RequestForm/ConfirmationModal';

interface ConfirmNavigationModalState {
  openConfirmNavigationModal: () => void;
  //eslint-disable-next-line no-unused-vars
  setNextRoute: (route: string) => void;
  //eslint-disable-next-line no-unused-vars
  setConfirmAction: (action: () => void) => void;
  //eslint-disable-next-line no-unused-vars
  shouldConfirmBeforeNavigating: (route: string) => boolean;
}

export const ConfirmNavigationModalContext =
  createContext<ConfirmNavigationModalState>({} as ConfirmNavigationModalState);

interface ConfirmNavigationModalProviderProps {
  children: ReactNode;
}

export const ConfirmNavigationModalProvider = ({
  children,
}: ConfirmNavigationModalProviderProps) => {
  const {
    isOpen: confirmNavigationModalIsOpen,
    onClose: confirmNavigationModalOnClose,
    onOpen: confirmNavigationModalOnOpen,
  } = useDisclosure();

  const [nextRouteToNav, setNextRouteToNav] = useState<string>('');
  const [onConfirmAction, setOnConfirmAction] = useState<(() => void) | null>(
    null
  );

  const navigate = useNavigate();
  const shouldConfirmBeforeNavigating = (route: string) => {
    return (
      route.includes('/create-request') ||
      route.includes('/revise-request') ||
      route.includes('/edit-draft')
    );
  };

  const continueNavigation = () => {
    confirmNavigationModalOnClose();
    if (onConfirmAction) {
      onConfirmAction();
      setOnConfirmAction(null);
    } else if (nextRouteToNav) {
      navigate(nextRouteToNav);
      setNextRouteToNav('');
    }
  };

  return (
    <ConfirmNavigationModalContext.Provider
      value={{
        openConfirmNavigationModal: confirmNavigationModalOnOpen,
        setNextRoute: (route: string) => {
          setNextRouteToNav(route);
          setOnConfirmAction(null);
        },
        setConfirmAction: (action: () => void) => {
          setOnConfirmAction(() => action);
          setNextRouteToNav('');
        },
        shouldConfirmBeforeNavigating: shouldConfirmBeforeNavigating,
      }}
    >
      {children}
      <ConfirmationModal
        isOpen={confirmNavigationModalIsOpen}
        onClose={confirmNavigationModalOnClose}
        includeCancel={true}
        handleContinueClick={continueNavigation}
        handleCancelClick={confirmNavigationModalOnClose}
        title="Confirm Navigation"
        continueBtnText="Leave Anyway"
        cancelBtnText="Stay On Page"
        bodyContent={
          <Box w="100">
            <Text>
              Any unsaved changes may be lost if you continue. Do you want to
              proceed?
            </Text>
          </Box>
        }
      />
    </ConfirmNavigationModalContext.Provider>
  );
};
