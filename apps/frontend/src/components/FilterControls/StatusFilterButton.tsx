import { Button } from '@chakra-ui/react';

interface StatusFilterButtonProps {
  label: string;
  backgroundColor: string;
  ariaLabel: string;
  onClick?: () => void;
  isSelected?: boolean;
}

export const StatusFilterButton = ({
  label,
  backgroundColor,
  ariaLabel,
  onClick,
  isSelected = false,
}: StatusFilterButtonProps) => {
  const border = isSelected
    ? '2px solid blue'
    : backgroundColor === 'white'
      ? 'solid gray 1px'
      : 'none';

  return (
    <Button
      aria-label={ariaLabel}
      aria-pressed={isSelected}
      className="filter-button"
      backgroundColor={backgroundColor}
      onClick={onClick || undefined}
      cursor={onClick ? 'pointer' : 'inherit'}
      whiteSpace="normal"
      _hover={{}}
      minHeight="fit-content"
      size="sm"
      border={border}
    >
      {label}
    </Button>
  );
};
