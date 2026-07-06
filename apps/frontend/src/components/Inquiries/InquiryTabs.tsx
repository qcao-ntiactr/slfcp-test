import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import {
  GetInquiriesResponse,
  EntityType,
  SelectedEntityPerTab,
} from './types';
import { TabPanelContent } from './InquiryTabPanelContent';
import { formatTabHeader } from './utils/InquiryHelpers';

interface InquiryTabsProps {
  groupedInquiries: GetInquiriesResponse;
  userEmail: string;
  setSelectedInquiryId: Dispatch<SetStateAction<number | undefined>>;
  setSelectedRecipientEntityId: Dispatch<SetStateAction<number | undefined>>;
  tabIndex: number;
  setTabIndex: Dispatch<SetStateAction<number>>;
  selectedEntityIdPerTab: SelectedEntityPerTab;
  setSelectedEntityIdPerTab: Dispatch<SetStateAction<SelectedEntityPerTab>>;
}

export const InquiryTabs = ({
  groupedInquiries,
  setSelectedInquiryId,
  setSelectedRecipientEntityId,
  tabIndex,
  setTabIndex,
  selectedEntityIdPerTab,
  setSelectedEntityIdPerTab,
}: InquiryTabsProps) => {
  const entityTypes = useMemo(
    () => Object.keys(groupedInquiries) as EntityType[],
    [groupedInquiries]
  );

  const currentTabType = useMemo(() => {
    const validIndex = Math.min(tabIndex, entityTypes.length - 1);
    return entityTypes[validIndex];
  }, [entityTypes, tabIndex]);

  /**
   * Centralized function to update the selected inquiry and recipient entity.
   * Finds the recipient by entity ID and updates both the inquiry ID and recipient entity ID
   * in the parent component state. Clears selections if no entity ID is provided.
   *
   * @param type - The entity type (COMMERCIAL, FEDERAL_AGENCY, or NTIA)
   * @param entityId - The ID of the entity to select, or undefined to clear selection
   */
  const updateSelection = useCallback(
    (type: EntityType, entityId: number | undefined) => {
      if (!entityId) {
        setSelectedInquiryId(undefined);
        setSelectedRecipientEntityId(undefined);
        return;
      }

      const recipients = groupedInquiries[type];
      const recipient = recipients?.find(
        (r) => r.recipientEntityId === entityId
      );

      setSelectedInquiryId(recipient?.inquiry?.id);
      setSelectedRecipientEntityId(entityId);
    },
    [groupedInquiries, setSelectedInquiryId, setSelectedRecipientEntityId]
  );

  /**
   * Gets the selected entity ID for a given entity type with fallback logic.
   * Returns the stored selection for the type, or defaults to the first recipient
   * if no selection exists. Returns undefined if no recipients are available.
   *
   * @param type - The entity type to get the selected ID for
   * @returns The selected entity ID or undefined if no recipients exist
   */
  const getSelectedEntityId = useCallback(
    (type: EntityType): number | undefined => {
      const recipients = groupedInquiries[type];
      if (!recipients || recipients.length === 0) return undefined;

      return selectedEntityIdPerTab?.[type] ?? recipients[0].recipientEntityId;
    },
    [groupedInquiries, selectedEntityIdPerTab]
  );

  // Initialize and maintain selections when data changes
  useEffect(() => {
    if (entityTypes.length === 0 || !currentTabType) return;

    const selectedId = getSelectedEntityId(currentTabType);

    // Always update the parent state with current selection
    updateSelection(currentTabType, selectedId);

    // Initialize local state if not already set
    if (selectedId && !selectedEntityIdPerTab?.[currentTabType]) {
      setSelectedEntityIdPerTab((prev) => ({
        ...prev,
        [currentTabType]: selectedId,
      }));
    }
  }, [
    entityTypes,
    currentTabType,
    getSelectedEntityId,
    updateSelection,
    selectedEntityIdPerTab,
  ]);

  // Separate effect to handle tab changes without interfering with data updates
  useEffect(() => {
    if (!currentTabType) return;

    const selectedId = getSelectedEntityId(currentTabType);
    updateSelection(currentTabType, selectedId);
  }, [tabIndex, currentTabType, getSelectedEntityId, updateSelection]);

  /**
   * Handles tab change events by updating the tab index in parent state.
   *
   * @param index - The index of the newly selected tab
   */
  const handleTabChange = (index: number) => {
    setTabIndex(index);
  };

  /**
   * Handles entity selection changes within a tab.
   * Updates the local state tracking selected entities per tab and triggers
   * the selection update in parent component.
   *
   * @param type - The entity type for the current tab
   * @param selectedEntityId - The ID of the newly selected entity
   */
  const handleSelectChange = (type: EntityType, selectedEntityId: number) => {
    setSelectedEntityIdPerTab((prev) => ({
      ...prev,
      [type]: selectedEntityId,
    }));
    updateSelection(type, selectedEntityId);
  };

  const TAB_HEADERS: Record<'COMMERCIAL' | 'FEDERAL_AGENCY' | 'NTIA', string> =
    useMemo(
      () => ({
        COMMERCIAL: 'To Commercial',
        FEDERAL_AGENCY: 'To Federal Agencies',
        NTIA: 'To NTIA',
      }),
      []
    );

  return (
    <Tabs index={tabIndex} onChange={handleTabChange} p={2}>
      <TabList w="100%" backgroundColor="#F2F2F2">
        {entityTypes.map((type) => (
          <Tab
            key={type}
            color="#343741"
            _selected={{
              color: '#0071C2',
              backgroundColor: '#EDF3F8',
              boxShadow: '0px 1px 1px rgb(24, 60, 122)',
            }}
            fontWeight="bold"
            w="100%"
            p={3}
            m={1}
            justifyContent="flex-start"
            borderRadius="10px 10px 10px 10px"
          >
            {formatTabHeader(type, TAB_HEADERS)}
          </Tab>
        ))}
      </TabList>

      <TabPanels minHeight="md">
        {entityTypes.map((type) => (
          <TabPanel key={type} px={0}>
            <TabPanelContent
              type={type}
              inquiriesForSelectedType={groupedInquiries[type]}
              selectedEntityId={getSelectedEntityId(type)}
              onSelectChange={handleSelectChange}
              tabIndex={tabIndex}
            />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
};
