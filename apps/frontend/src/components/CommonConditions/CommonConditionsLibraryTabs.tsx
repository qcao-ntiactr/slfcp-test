import {
  Box,
  Button,
  Flex,
  Heading,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';

import {
  useCreateCommonConditionDraft,
  useSubmitCommonConditionDraft,
} from '../../hooks/UseCommonConditions';
import { useHybridAuth, UserRole } from '../../context/HybridAuthContext';
import { TabHeader } from '../RequestForm/TabContents';

import { CommonConditionFormModal } from './CommonConditionFormModal';
import { CommonConditionsPublishedTable } from './CommonConditionsPublishedTable';
import { CommonConditionsSubmissionsTable } from './CommonConditionsSubmissionsTable';

export const CommonConditionsLibraryTabs = () => {
  const { user } = useHybridAuth();
  const toast = useToast();
  const createModal = useDisclosure();
  const [activeCreateAction, setActiveCreateAction] = useState<
    'save' | 'submit' | null
  >(null);
  const createDraftMutation = useCreateCommonConditionDraft();
  const submitDraftMutation = useSubmitCommonConditionDraft();
  const isNtia = user?.role === UserRole.ntia;

  const getErrorMessage = (error: unknown) =>
    error instanceof Error && error.message
      ? error.message
      : 'There was a problem saving this common condition.';

  const handleSaveDraft = async (values: {
    title: string;
    content: string;
  }) => {
    setActiveCreateAction('save');
    try {
      await createDraftMutation.mutateAsync(values);

      toast({
        status: 'success',
        title: 'Draft Saved',
        description: 'The common condition draft was created successfully.',
        position: 'top',
      });
      createModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: 'Unable to Save Draft',
        description: getErrorMessage(error),
        position: 'top',
      });
    } finally {
      setActiveCreateAction(null);
    }
  };

  const handleSubmit = async (values: { title: string; content: string }) => {
    setActiveCreateAction('submit');
    try {
      const createdCondition = await createDraftMutation.mutateAsync(values);

      if (!isNtia) {
        await submitDraftMutation.mutateAsync(createdCondition.id);
      }

      toast({
        status: 'success',
        title: isNtia ? 'Condition Published' : 'Condition Submitted',
        description: isNtia
          ? 'The common condition was published successfully.'
          : 'The common condition was submitted for review.',
        position: 'top',
      });
      createModal.onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: isNtia
          ? 'Unable to Publish Condition'
          : 'Unable to Submit Condition',
        description:
          error instanceof Error && error.message
            ? error.message
            : isNtia
              ? 'There was a problem publishing this common condition.'
              : 'There was a problem submitting this common condition.',
        position: 'top',
      });
    } finally {
      setActiveCreateAction(null);
    }
  };

  return (
    <Box py={3} px={5}>
      <Flex alignItems="center" mb={2} gap={4}>
        <Heading size="xl">Common Conditions Library</Heading>
        <Button
          color="white"
          backgroundColor="#004a82"
          _hover={{ backgroundColor: '#003a5a' }}
          onClick={createModal.onOpen}
          aria-label="Add new common condition"
        >
          Add New Condition
        </Button>
      </Flex>

      <Tabs>
        <TabList>
          <TabHeader
            tabName="Published"
            flexGrow={1}
            justifyContent="flex-start"
          />
          <TabHeader
            tabName="Submissions"
            flexGrow={1}
            justifyContent="flex-start"
          />
        </TabList>
        <TabPanels>
          <TabPanel>
            <CommonConditionsPublishedTable />
          </TabPanel>
          <TabPanel>
            <CommonConditionsSubmissionsTable />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <CommonConditionFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.onClose}
        mode="create"
        onSaveDraft={handleSaveDraft}
        onSubmitCondition={handleSubmit}
        showSaveDraftButton={!isNtia}
        submitButtonLabel={isNtia ? 'Publish' : 'Submit'}
        isSavingDraft={
          activeCreateAction === 'save' && createDraftMutation.isPending
        }
        isSubmitting={activeCreateAction === 'submit'}
      />
    </Box>
  );
};
