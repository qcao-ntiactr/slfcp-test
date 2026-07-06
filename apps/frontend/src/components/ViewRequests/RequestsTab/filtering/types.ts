import { ReactNode } from 'react';

import {
  RequestDateFilterField,
  RequestListFilterRule,
  RequestListFilters,
  RequestListSortDirection,
  RequestListSortKey,
  RequestNumberFilterField,
  RequestSerialNumberFilterField,
  RequestStatusGroup,
  RequestSummary,
  RequestTextFilterField,
} from '../../../../types';

export type RequestColumnFilterConfig =
  | {
      type: 'text';
      field: RequestTextFilterField;
    }
  | {
      type: 'date';
      field: RequestDateFilterField;
    }
  | {
      type: 'number';
      field: RequestNumberFilterField;
    }
  | {
      type: 'serialNumber';
      field: RequestSerialNumberFilterField;
    }
  | {
      type: 'status';
    };

export interface RequestColumnSortLabels {
  asc: string;
  desc: string;
}

export interface RequestTableColumn {
  header: string;
  key: string;
  render: (_request: RequestSummary) => ReactNode;
  sortKey?: RequestListSortKey;
  sortLabels?: RequestColumnSortLabels;
  filterConfig?: RequestColumnFilterConfig;
}

export interface RequestTableFilterDraftProps {
  filterRule?: RequestListFilterRule;
  onChange: (_filterRule?: RequestListFilterRule) => void;
}

export interface RequestColumnHeaderMenuProps {
  column: RequestTableColumn;
  filters: RequestListFilters;
  activeSortDirection?: RequestListSortDirection;
  selectedStatusGroupValues: RequestStatusGroup[];
  onSort: (
    _sortKey: RequestListSortKey,
    _direction: RequestListSortDirection
  ) => void;
  onClearSort: () => void;
  onApplyFilter: (_filterRule: RequestListFilterRule) => void;
  onClearFilter: (_field: RequestListFilterRule['field']) => void;
  onStatusGroupsChange: (_statusGroups: RequestStatusGroup[]) => void;
}
