import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';

import { App } from './App';
import MaintenancePage from './pages/MaintenancePage';

const isUnavailable = import.meta.env.VITE_UNDER_MAINTENANCE === 'true';

const root = createRoot(document.getElementById('root')!);

root.render(
  <ChakraProvider>
    {isUnavailable ? (
      <MaintenancePage />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </ChakraProvider>
);
