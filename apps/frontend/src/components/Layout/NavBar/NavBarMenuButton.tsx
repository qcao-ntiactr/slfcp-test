import {
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from '@chakra-ui/react';
import { FaGear } from 'react-icons/fa6';

import { NavBarSettingsItem } from './navbarConfig';

interface NavBarMenuButtonProps {
  items: NavBarSettingsItem[];
  onItemClick: (_item: NavBarSettingsItem) => void;
}

export const NavBarMenuButton = ({
  items,
  onItemClick,
}: NavBarMenuButtonProps) => {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="Open navigation settings"
        icon={<FaGear color="#005EC4" />}
        variant="ghost"
        _hover={{ bg: '#006DE433' }}
        _active={{ bg: '#006DE433' }}
      />
      <MenuList>
        {items.map((item) => (
          <MenuItem key={item.path} onClick={() => onItemClick(item)}>
            {item.label}
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};
