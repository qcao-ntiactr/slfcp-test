import {
  Box,
  Button,
  Flex,
  Heading,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState } from 'react-hook-form';
import { PortalFormDefaults, portalFormSchema } from '@slfcp/validation';
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestDetails } from 'apps/frontend/src/types.ts';

import { defaultValues } from '../utils/DefaultValues.ts';
import { getNonRequiredErrors, EntityType } from '../utils/Helpers.ts';
import { LaunchSiteTab } from '../TabContents/LaunchSiteTab';
import { AdditionalInformationTab } from '../TabContents/AdditionalInformationTab';
import {
  additionalInfoFields,
  frequenciesTabFields,
  frequencyFields,
  KeySubset,
  launchSiteFields,
  tabNames,
} from '../utils/TabFields';
import { FormNavButton } from '../Buttons/FormNavButton';
import { ConfirmNavigationModalContext } from '../../../context/ConfirmNavigationModalContext.tsx';
import { TabHeader, FrequenciesTab, SummaryTab } from '../TabContents/index.ts';
import {
  submitDraft,
  updateDraft,
  RequestDraftHeaders,
} from '../../../api/RequestDrafts.ts';
import { useHybridAuth, UserRole } from '../../../context/HybridAuthContext';
import { ConfirmationModal } from '../ConfirmationModal.tsx';
import { InvalidFieldsWarning } from '../InvalidFieldsWarning/InvalidFieldsWarning.tsx';

export interface FormContainerProps {
  request?: Partial<RequestDetails>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  headerText: string;
  // eslint-disable-next-line no-unused-vars
  onSubmitHandler: (data: PortalFormDefaults) => Promise<void>;
  // Draft editing props
  draftId?: number;
  isEditingDraft?: boolean;
}
export const FormContainer = ({
  request,
  isLoading,
  setIsLoading,
  headerText,
  onSubmitHandler,
  draftId,
  isEditingDraft = false,
}: FormContainerProps) => {
  const methods = useForm<PortalFormDefaults>({
    resolver: zodResolver(portalFormSchema),
    defaultValues: request ?? defaultValues,
    mode: 'all',
    reValidateMode: 'onChange',
  });

  const [tabIndex, setTabIndex] = useState(0);

  const [visitedTabs, setVisitedTabs] = useState<{ [key: number]: boolean }>({
    0: true, // The first tab is always visited
  });

  const [isEditingFrequency, setIsEditingFrequency] = useState(false);

  const { handleSubmit, trigger, control, watch, reset } = methods;

  const { errors } = useFormState({ control: control });

  const { openConfirmNavigationModal, setNextRoute } = useContext(
    ConfirmNavigationModalContext
  );

  const data = watch();

  const navigate = useNavigate();

  const { user } = useHybridAuth();

  useEffect(() => {
    if (request) {
      reset(request);

      // Trigger validation for the active tab
      switch (tabIndex) {
        case 0:
          trigger(launchSiteFields);
          break;
        case 1:
          trigger(frequenciesTabFields);
          break;
        case 2:
          trigger(additionalInfoFields);
          break;
      }
    }
  }, [request]);

  /** Validates the currently active tab */
  useEffect(() => {
    const validate = async () => {
      switch (tabIndex) {
        case 0:
          await trigger(launchSiteFields);
          break;
        case 1:
          await trigger(frequenciesTabFields);
          break;
        case 2:
          await trigger(additionalInfoFields);
          break;
      }
    };
    validate();
  }, [tabIndex, trigger]);

  const {
    isOpen: saveDraftModalIsOpen,
    onClose: saveDraftModalOnClose,
    onOpen: saveDraftModalOnOpen,
  } = useDisclosure();

  const {
    isOpen: validationFailedModalIsOpen,
    onClose: validationFailedModalOnClose,
    onOpen: validationFailedModalOnOpen,
  } = useDisclosure();

  const allInvalidFields = getNonRequiredErrors(errors);

  const invalidFieldsExist = allInvalidFields.some((f) => {
    if (launchSiteFields.includes(f.fieldKey as keyof PortalFormDefaults))
      return visitedTabs[0];
    if (
      (frequenciesTabFields as string[]).includes(f.fieldKey) ||
      f.fieldKey.startsWith('frequencies')
    )
      return visitedTabs[1];
    if (additionalInfoFields.includes(f.fieldKey as keyof PortalFormDefaults))
      return visitedTabs[2];
    return true;
  });

  const toast = useToast();

  /**  Object of boolean values that determine whether or not a tab's header
   * should show error styling (tab fields have errors and tab has been visited) */
  const tabErrors = {
    launchSite: launchSiteFields.some((field) => errors[field]),
    frequenciesTab:
      visitedTabs[1] &&
      (frequenciesTabFields.some((field) => errors[field]) ||
        frequencyFields.some((field) => errors[field as keyof typeof errors]) ||
        !!errors.number_of_frequencies),
    additionalInfo:
      visitedTabs[2] && additionalInfoFields.some((field) => errors[field]),
    entireForm: Object.keys(errors).length > 0,
  };

  /** Whether or not the next tab can be accessed by nav-button */
  const canNavForward = () => {
    switch (tabIndex) {
      case 0:
        return !tabErrors.launchSite;
      case 1:
        return !tabErrors.launchSite && !tabErrors.frequenciesTab;
      case 2:
        return !tabErrors.entireForm;
      case 3:
        return true;
      default:
        console.log('Something went wrong in tab errors');
        return false;
    }
  };

  /**
   * Handles navigation to the next tab while validating the required fields for the current tab.
   * If validation fails, it prevents navigation.
   * @async
   * @returns {Promise<void>}
   */
  const handleNext = async () => {
    let fieldsToValidate: KeySubset<PortalFormDefaults>;
    switch (tabIndex) {
      case 0:
        fieldsToValidate = launchSiteFields;
        break;
      case 1:
        fieldsToValidate = frequenciesTabFields;
        break;
      case 2:
        fieldsToValidate = additionalInfoFields;
        break;
      default:
        fieldsToValidate = [];
    }

    const isValid = await trigger(fieldsToValidate);

    //Don't allow navigation if the upcoming tab cannot be validated
    if (!isValid) {
      return;
    }

    setVisitedTabs((prev) => ({ ...prev, [tabIndex + 1]: true }));
    setTabIndex((prevIndex) => prevIndex + 1);
  };

  /**
   * Handles form cancel button press
   */
  const handleCancelButtonClick = () => {
    setNextRoute('/');
    openConfirmNavigationModal();
  };

  /**
   * Navigates back to the previous tab in the form.
   */
  const handleBack = () => {
    setTabIndex((prevIndex) => prevIndex - 1);
  };

  /**
   * Handles tab changes by updating the current tab index and marking the tab as visited.
   * @param {number} index - The index of the tab to switch to.
   */
  const handleTabsChange = (index: number) => {
    setTabIndex(index);
    setVisitedTabs((prev) => ({ ...prev, [index]: true }));
  };

  const convertUserRoleToEntityType = (userRole: UserRole): EntityType => {
    switch (userRole) {
      case UserRole.commercial:
        return 'COMMERCIAL';
      case UserRole.federal:
        return 'FEDERAL_AGENCY';
      case UserRole.ntia:
        return 'NTIA';
    }
  };

  const handleSaveDraft = async (data: PortalFormDefaults) => {
    if (!user) return;

    const headers: RequestDraftHeaders = {
      userId: user.id,
      userName: user.displayName,
      userType: convertUserRoleToEntityType(user.role),
    };

    // Fields that should not be included in draft updates
    const excludeFields = ['id', 'createdAt', 'updatedAt', 'user'];

    const newFormData = new FormData();

    Object.entries(data)
      .filter(([key, value]) => {
        const isClearedFccFilingDate =
          key === 'fcc_filing_date' && value === '';

        return (
          isClearedFccFilingDate ||
          (value !== undefined &&
            value !== null &&
            value !== '' &&
            String(value) !== 'null' &&
            !excludeFields.includes(key))
        );
      })
      .forEach(([key, value]) => {
        if (value instanceof File || value instanceof Blob) {
          // Handles file fields
          newFormData.append(key, value);
        } else if (Array.isArray(value)) {
          // Handles the frequencies array
          newFormData.append(key, JSON.stringify(value));
        } else if (key === 'fcc_filing_date' && value === '') {
          // Keep explicit clears when updating drafts.
          newFormData.append(key, 'null');
        } else {
          // Handles the rest of the fields
          newFormData.append(key, String(value));
        }
      });

    setIsLoading(true);

    try {
      if (isEditingDraft && draftId !== undefined) {
        // Update existing draft
        await updateDraft(draftId, newFormData, headers);
        toast({
          status: 'success',
          title: 'Draft Updated',
          description: 'Your draft has been updated successfully.',
          position: 'top-left',
          isClosable: true,
        });
      } else {
        // Create new draft
        await submitDraft(newFormData, headers);
        toast({
          status: 'success',
          title: 'Draft Saved',
          description:
            'You request has been saved as a draft. You can return to complete and submit it at any time.',
          position: 'top-left',
          isClosable: true,
        });
      }
      navigate('/');
    } catch (error) {
      console.error('Something went wrong with the draft operation', error);
      toast({
        status: 'error',
        title: 'Draft Save Failed',
        description:
          'There was a problem saving your draft. Please try again or contact your system administrator.',
        position: 'top',
        isClosable: true,
      });
      saveDraftModalOnClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <Box w="100%" borderRadius="6px 6px 0 0" border="solid 1px #1322951A">
        <Heading
          backgroundColor="gray.100"
          textAlign="left"
          borderRadius="inherit"
          fontSize="22px"
          padding="16px"
        >
          {headerText}
        </Heading>
        <form
          onSubmit={handleSubmit(onSubmitHandler)}
          method="post"
          encType="multipart/form-data"
        >
          <Tabs index={tabIndex} onChange={handleTabsChange} isFitted={true}>
            <TabList justifyContent="space-evenly">
              <TabHeader
                tabName="Launch Site"
                isInvalid={tabErrors.launchSite}
                disabled={isEditingFrequency}
              />
              <TabHeader
                tabName="Frequencies"
                isInvalid={tabErrors.frequenciesTab}
                disabled={
                  isEditingFrequency || (tabIndex === 0 && !canNavForward())
                }
              />
              <TabHeader
                tabName="Additional Information"
                isInvalid={tabErrors.additionalInfo}
                disabled={
                  isEditingFrequency ||
                  !visitedTabs[1] || // Frequencies tab must be visited
                  tabErrors.frequenciesTab || // Frequencies tab must be valid
                  (tabIndex === 0 && !canNavForward()) // Ensure progression is correct
                }
              />
              <TabHeader
                tabName="Summary"
                isInvalid={false}
                disabled={
                  isEditingFrequency ||
                  !!tabErrors.entireForm ||
                  !visitedTabs[2]
                }
              />
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                <LaunchSiteTab />
              </TabPanel>
              <TabPanel p={0}>
                <FrequenciesTab
                  isEditingFrequency={isEditingFrequency}
                  setIsEditingFrequency={setIsEditingFrequency}
                />
              </TabPanel>
              <TabPanel p={0}>
                <AdditionalInformationTab />
              </TabPanel>
              <TabPanel>
                <SummaryTab />
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Flex flexDir="row" justifyContent="space-between" padding="18px">
            <FormNavButton
              clickHandler={
                tabIndex === 0 ? handleCancelButtonClick : handleBack
              }
              label={tabIndex === 0 ? 'Cancel' : 'Back'}
              backgroundColor="white"
              disabled={isEditingFrequency}
            />
            <Flex gap={3}>
              {(draftId !== undefined || !request?.id) && (
                <FormNavButton
                  clickHandler={() => {
                    return invalidFieldsExist && tabIndex !== 1
                      ? validationFailedModalOnOpen()
                      : saveDraftModalOnOpen();
                  }}
                  label={'Save Draft'}
                  backgroundColor="white"
                  border="1px #4a5568 solid"
                />
              )}

              {tabIndex < 3 ? (
                <FormNavButton
                  className="forward-submit-btn"
                  disabled={isEditingFrequency || !canNavForward()}
                  clickHandler={handleNext}
                  label={tabNames[tabIndex + 1]}
                  backgroundColor="#4a5568"
                  _hover={{ bg: 'blackAlpha.700' }}
                  color="white"
                />
              ) : (
                <Button
                  type="submit"
                  _hover={{ bg: 'blackAlpha.700' }}
                  className="forward-submit-btn"
                  isDisabled={tabErrors.entireForm || isLoading}
                  w="sm"
                >
                  {isLoading ? 'Submitting...' : 'Submit'}
                </Button>
              )}
            </Flex>
          </Flex>
        </form>
      </Box>
      {/* <ConfirmationModal
        includeCancel={false}
        isOpen={validationFailedModalIsOpen}
        onClose={validationFailedModalOnClose}
        continueBtnText="OK"
        title="Please correct invalid values"
        bodyContent={
          <Box>
            <Text mb={3}>
              Please ensure that any non-empty fields are valid.
            </Text>

            {getNonRequiredErrors(errors).map((field) => (
              <Text>
                <span
                  style={{ fontWeight: '700' }}
                >{`${field.fieldName}: `}</span>
                {`${field.message}`}
              </Text>
            ))}
          </Box>
        }
      /> */}
      <InvalidFieldsWarning
        isOpen={validationFailedModalIsOpen}
        onClose={validationFailedModalOnClose}
        invalidFields={allInvalidFields}
        visitedTabs={visitedTabs}
      />
      <ConfirmationModal
        includeCancel={true}
        isOpen={saveDraftModalIsOpen}
        onClose={saveDraftModalOnClose}
        continueBtnText="Save Draft"
        continueDisabled={isLoading}
        title="Save Draft?"
        bodyContent={
          <Box>
            <Text mb="3">
              Are you sure you want to save this request as a draft? You'll be
              able to return later to complete and submit it.
            </Text>
            {tabIndex === 1 && (
              <Text fontSize="sm" color="gray.600">
                <strong>Note:</strong> For a frequency's metadata to be stored
                in the draft, all fields for that frequency must be completed.
                Frequencies with incomplete metadata will not be saved. Click
                "Add Frequency" for the metadata to be stored in the draft.
              </Text>
            )}
          </Box>
        }
        handleContinueClick={() => {
          handleSaveDraft(data);
        }}
      />
    </FormProvider>
  );
};
