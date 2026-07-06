import { UserRole } from '../../../context/HybridAuthContext';

export const COMMON_CONDITIONS_ALLOWED_ROLES = [
  UserRole.ntia,
  UserRole.federal,
] as const;

export interface NavBarSettingsItem {
  label: string;
  path: string;
  allowedRoles: readonly UserRole[];
}

export const navBarSettingsItems: NavBarSettingsItem[] = [
  {
    label: 'Common Conditions Library',
    path: '/common-conditions',
    allowedRoles: COMMON_CONDITIONS_ALLOWED_ROLES,
  },
];

export const getVisibleNavBarSettingsItems = (role?: UserRole) => {
  if (!role) {
    return [];
  }

  return navBarSettingsItems.filter((item) => item.allowedRoles.includes(role));
};
