import { useRef } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';

import type { FormWizardStep } from './TabbedFormWizard.tsx';

export class WizardStepValidationError extends Error {
  constructor() {
    super('Step validation failed');
    this.name = 'WizardStepValidationError';
  }
}

export const useWizardStepValidation = <TValues extends FieldValues>(
  step: FormWizardStep<TValues>
) => {
  const { clearErrors, getValues, setError, trigger } =
    useFormContext<TValues>();
  const schemaErrorPaths = useRef<FieldPath<TValues>[]>([]);

  return async () => {
    if (!step.validation) return;

    clearErrors(schemaErrorPaths.current);
    clearErrors(`root.wizardStepValidation.${step.id}`);
    schemaErrorPaths.current = [];

    const fieldsAreValid = await trigger([...step.validation.fields], {
      shouldFocus: true,
    });
    const schemaResult = step.validation.schema.safeParse(getValues());

    if (!schemaResult.success) {
      const rootMessages: string[] = [];

      schemaResult.error.issues.forEach((issue) => {
        if (issue.path.length === 0) {
          rootMessages.push(issue.message);
          return;
        }

        const fieldPath = issue.path.join('.') as FieldPath<TValues>;
        setError(fieldPath, {
          type: 'validation',
          message: issue.message,
        });
        schemaErrorPaths.current.push(fieldPath);
      });

      if (rootMessages.length > 0) {
        const rootErrorPath = `root.wizardStepValidation.${step.id}` as const;
        setError(rootErrorPath, {
          type: 'validation',
          message: rootMessages.join(' '),
        });
      }
    }

    if (!fieldsAreValid || !schemaResult.success) {
      throw new WizardStepValidationError();
    }
  };
};
