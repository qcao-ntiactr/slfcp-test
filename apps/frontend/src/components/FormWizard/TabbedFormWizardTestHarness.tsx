import { ChakraProvider } from '@chakra-ui/react';
import type { FormEvent } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import { vi } from 'vitest';
import { z } from 'zod';

import type { FormWizardStep } from './TabbedFormWizard.tsx';
import { TabbedFormWizard } from './TabbedFormWizard.tsx';

export interface TestFormValues {
  mission_name?: string;
  optional?: string;
  items?: { value?: string }[];
}

export interface TabbedFormWizardTestHarnessProps {
  defaultValues?: TestFormValues;
  isSubmitting?: boolean;
  navigationBlocked?: boolean;
  onCancel?: () => void;
  onProgressChange?: (progress: {
    activeStep: number;
    highestVisitedStep: number;
  }) => void;
  onSubmit?: (values: TestFormValues) => void;
  secondaryAction?: {
    label: string;
    onClick: () => void;
    isVisible?: boolean;
    isDisabled?: boolean;
  };
  submitLabel?: string;
  wizardSteps?: readonly FormWizardStep<TestFormValues>[];
}

export const LaunchContent = () => {
  const {
    formState: { errors },
    register,
  } = useFormContext<TestFormValues>();

  return (
    <label>
      Mission name
      <input
        {...register('mission_name')}
        aria-invalid={Boolean(errors.mission_name)}
      />
    </label>
  );
};

const FrequencyContent = () => {
  const {
    formState: { errors },
    register,
  } = useFormContext<TestFormValues>();

  return (
    <>
      <label>
        Optional value
        <input
          {...register('optional')}
          aria-invalid={Boolean(errors.optional)}
        />
      </label>
      <label>
        Item value
        <input
          {...register('items.0.value')}
          aria-invalid={Boolean(errors.items?.[0]?.value)}
        />
      </label>
    </>
  );
};

const requiredOptionalSchema = z.object({
  optional: z.string().min(1, 'Required'),
});

const testWizardSteps: readonly FormWizardStep<TestFormValues>[] = [
  {
    id: 'launch',
    title: 'Launch Site',
    content: <LaunchContent />,
    validation: {
      fields: ['mission_name'],
      schema: z.object({
        mission_name: z.string().min(1, 'Required'),
      }),
    },
  },
  {
    id: 'radio-details',
    title: 'Frequencies',
    content: <FrequencyContent />,
    validation: {
      fields: ['optional'],
      schema: requiredOptionalSchema,
    },
  },
  {
    id: 'additional',
    title: 'Additional Information',
    content: <div>Additional content</div>,
    validation: {
      fields: ['optional'],
      schema: requiredOptionalSchema,
    },
  },
  {
    id: 'summary',
    title: 'Summary',
    content: <div>Summary content</div>,
  },
];

export const nestedErrorWizardSteps: readonly FormWizardStep<TestFormValues>[] =
  [
    testWizardSteps[0],
    {
      ...testWizardSteps[1],
      validation: {
        fields: ['optional', 'items'],
        schema: z
          .object({
            optional: z.string().min(1, 'Required'),
            items: z
              .array(z.object({ value: z.string().optional() }))
              .optional(),
          })
          .superRefine((values, context) => {
            if (values.items?.[0]?.value !== 'valid') {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid item',
                path: ['items', 0, 'value'],
              });
            }
          }),
      },
    },
    testWizardSteps[2],
  ];

export const rootErrorWizardSteps: readonly FormWizardStep<TestFormValues>[] = [
  {
    id: 'launch',
    title: 'Launch Site',
    content: <LaunchContent />,
    validation: {
      fields: ['mission_name'],
      schema: z
        .object({ mission_name: z.string().optional() })
        .refine(({ mission_name }) => mission_name === 'valid', {
          message: 'The step values are incompatible.',
        }),
    },
  },
  testWizardSteps[1],
];

export const TabbedFormWizardTestHarness = ({
  defaultValues,
  isSubmitting = false,
  navigationBlocked = false,
  onCancel = vi.fn(),
  onProgressChange,
  onSubmit = vi.fn(),
  secondaryAction,
  submitLabel,
  wizardSteps = testWizardSteps,
}: TabbedFormWizardTestHarnessProps) => {
  const methods = useForm<TestFormValues>({ defaultValues });

  return (
    <ChakraProvider>
      <FormProvider {...methods}>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void methods.handleSubmit(onSubmit)(event);
          }}
        >
          <TabbedFormWizard
            headerText="Request"
            steps={wizardSteps}
            isSubmitting={isSubmitting}
            navigationBlocked={navigationBlocked}
            onCancel={onCancel}
            onProgressChange={onProgressChange}
            secondaryAction={secondaryAction}
            submitLabel={submitLabel}
          />
        </form>
      </FormProvider>
    </ChakraProvider>
  );
};
