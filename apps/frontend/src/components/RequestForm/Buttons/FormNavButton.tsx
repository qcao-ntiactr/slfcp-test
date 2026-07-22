import { Button, ButtonProps } from '@chakra-ui/react';

interface FormNavButtonProps extends ButtonProps {
  label: string;
  clickHandler: () => void;
}

export const FormNavButton = ({
  disabled,
  label,
  clickHandler,
  className,
  ...props
}: FormNavButtonProps) => {
  return (
    <Button
      type="button"
      className={className}
      disabled={disabled}
      onClick={clickHandler}
      w="2xs"
      {...props}
    >
      {label}
    </Button>
  );
};
