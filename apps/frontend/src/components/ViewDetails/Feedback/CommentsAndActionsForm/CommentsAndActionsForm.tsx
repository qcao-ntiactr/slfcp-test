import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Select,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { formatISO } from 'date-fns';
import { ActionOption } from '@slfcp/role-actions-access-control';
import { BackendRequestStatus } from 'apps/frontend/src/types';

import { User, UserRole } from '../../../../context/HybridAuthContext';
import {
  GetConcurrencesByRequestIdResponse,
  UserTypeT,
} from '../../../../api/types';
import { getConcurrencesByRequestId } from '../../../../api/Concurrences';
import { actionsT } from '../../../../api/types.ts';
import {
  CommonConditionsEditor,
  type CommonConditionsEditorHandle,
} from '../FeedbackTable/CommonConditions/CommonConditionsEditor.tsx';
import { CommonConditionsDropDown } from '../FeedbackTable/CommonConditions/CommonConditionsDropDown.tsx';

import { CommentsAndActionsFormValues } from './CommentsAndActionsT.ts';
import { actionsRequiringJustificationText } from './utils/Actions.ts';
import {
  SubmissionContext,
  submitCommentIfPresent,
  submitDecisionIfPresent,
} from './utils/SubmitHandlers.ts';

interface CommentsAndActionsFormProps {
  user: User;
  status: BackendRequestStatus;
  requestId: number;
  rootRequestId?: number;
  actionOptions?: ActionOption[];
  canAddComments?: boolean;
}

export const CommentsAndActionsForm = ({
  user,
  status,
  actionOptions,
  requestId,
  rootRequestId,
  canAddComments = true,
}: CommentsAndActionsFormProps) => {
  const methods = useForm<CommentsAndActionsFormValues>({
    mode: 'onChange',
    defaultValues: {
      is_internal: true,
      comment: '',
      action: undefined,
      justificationText: '',
    },
  });

  const role = user?.role;
  const userEntityId = user.federalAgencyId;
  const isEntityActive = user.isEntityActive ?? true;

  const {
    handleSubmit,
    register,
    watch,
    trigger,
    setValue,
    getValues,
    formState: { isSubmitting, errors },
  } = methods;

  const [concurrences, setConcurrences] = useState<
    GetConcurrencesByRequestIdResponse[] | null
  >(null);
  const [commonConditionsMarkdown, setCommonConditionsMarkdown] = useState('');
  const commonConditionsEditorRef = useRef<CommonConditionsEditorHandle | null>(
    null
  );

  const watchSelectedAction = watch('action');

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!requestId || role !== UserRole.federal || !isEntityActive) return;

    const fetchConcurrences = async () => {
      try {
        const data = await getConcurrencesByRequestId(requestId);
        setConcurrences(data);
      } catch (err) {
        console.error('Error fetching concurrences:', err);
      }
    };

    fetchConcurrences();
  }, [requestId, role, isEntityActive]);

  const hasConcurred =
    concurrences?.some((c) => Number(c.entity_id) === Number(userEntityId)) ??
    false;

  const shouldShowActions =
    !!actionOptions &&
    (role !== UserRole.federal || (!hasConcurred && isEntityActive));

  const validateCommentOrAction = () => {
    const { comment, action } = getValues();
    const trimmedComment = comment?.trim() ?? '';
    const hasAction = Boolean(action);

    if (!trimmedComment && !hasAction) {
      return 'Comment or Action required.';
    }
    return true;
  };

  /**
   * Handles the full submission process for the comments and actions form.
   *
   * This function:
   * 1. Validates that the form contains at least a comment or an action.
   * 2. Submits a comment if present.
   * 3. Submits a decision (approval, denial, or concurrence) if an action is selected.
   * 4. Submits the corresponding action record if the decision was successful.
   * 5. Resets the form and navigates the user upon full success.
   *
   * If any step fails:
   * - The submission halts and the error is logged.
   * - If a comment was successfully submitted but a later step failed, the user is notified
   *   that their comment was saved, but the action submission failed. Comment fields are cleared.
   * - If the comment was not submitted, a generic failure message is shown.
   *
   * @param {CommentsAndActionsFormValues} data - The form data submitted by the user.
   */
  const onSubmit = async (data: CommentsAndActionsFormValues) => {
    const userType: UserTypeT =
      role === UserRole.federal ? 'FEDERAL_AGENCY' : 'NTIA';
    const now = formatISO(new Date(), { representation: 'complete' });

    data.justificationText = data.justificationText?.trim() ?? '';
    data.comment = data.comment?.trim() ?? '';

    if (!data.comment && !data.action) {
      toast({
        status: 'error',
        title: 'Form Is Empty',
        description: 'The form is empty. Please enter an action or a comment.',
        position: 'top',
      });
      return;
    }

    const recordContext: SubmissionContext = {
      data,
      user,
      userType,
      requestId: rootRequestId || requestId,
      now,
      status,
    };

    const decisionContext: SubmissionContext = {
      data,
      user,
      userType,
      requestId,
      now,
      status,
    };

    let commentSucceeded = false;

    try {
      await submitCommentIfPresent(recordContext);
      commentSucceeded = true;

      await submitDecisionIfPresent(decisionContext);
      // Action records are now automatically created by the backend

      methods.reset();
      setCommonConditionsMarkdown('');
      navigate('/view-requests');
    } catch (error) {
      console.error('Submission failed:', error);

      if (data?.comment?.trim() && commentSucceeded) {
        toast({
          status: 'warning',
          title: 'Comment Submitted without Action',
          description:
            'Comment was submitted, without action. Please contact your system administrator.',
          position: 'top',
        });
        methods.reset({
          comment: '',
          justificationText: '',
          is_internal: true,
        });
        setCommonConditionsMarkdown('');
      } else {
        toast({
          status: 'error',
          title: 'Submission Failed',
          description:
            'There was a problem submitting the form. Please contact your system administrator.',
          position: 'top',
        });
      }
    }
  };

  const getJustificationTextHeader = (action: actionsT | undefined) => {
    if (!action) return null;
    if (actionsRequiringJustificationText.conditions.includes(action)) {
      return 'Conditions';
    }
    if (actionsRequiringJustificationText.reason.includes(action)) {
      return 'Reason';
    }
    if (actionsRequiringJustificationText.requested_changes.includes(action)) {
      return 'Requested Changes';
    }
    return null;
  };

  const shouldRenderJustificationTextField =
    getJustificationTextHeader(watchSelectedAction);
  const shouldUseCommonConditionsEditor =
    watchSelectedAction != null &&
    actionsRequiringJustificationText.conditions.includes(watchSelectedAction);
  const shouldShowJustificationLabel =
    getJustificationTextHeader(watchSelectedAction) !== 'Conditions';

  const updateJustificationText = (nextValue: string) => {
    setCommonConditionsMarkdown(nextValue);
    setValue('justificationText', nextValue, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const appendCondition = (conditionMarkdown: string) => {
    const nextValue = commonConditionsMarkdown.trim()
      ? `${commonConditionsMarkdown.trimEnd()}\n\n${conditionMarkdown}`
      : conditionMarkdown;

    updateJustificationText(nextValue);
  };

  useEffect(() => {
    trigger(['comment', 'action']);
  }, []);

  useEffect(() => {
    trigger('justificationText');
  }, [shouldRenderJustificationTextField, trigger]);

  return (
    <Box pb={5} w="100%" maxW="1600px" m="0px auto">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex flexDir="column" gap={5}>
          <Heading size="md">{`${role} Feedback`}</Heading>
          {!isEntityActive && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              Your entity is currently inactive. You cannot submit comments or
              actions.
            </Alert>
          )}
          {canAddComments && (
            <>
              <Box>
                <FormControl isInvalid={!!errors?.comment}>
                  <FormLabel htmlFor="comment" fontWeight="bold">
                    Request Information Comments
                  </FormLabel>
                  <Textarea
                    id="comment"
                    minHeight="150px"
                    backgroundColor="white"
                    isDisabled={!isEntityActive}
                    {...register('comment', {
                      validate: validateCommentOrAction,
                    })}
                    onChange={(e) => {
                      setValue('comment', e.target.value);
                      trigger(['action', 'comment']);
                    }}
                  />
                  <FormErrorMessage color="red.600">
                    {`${errors?.comment?.message}`}
                  </FormErrorMessage>
                </FormControl>
              </Box>
              <Flex flexDir="row" align="center" gap={3}>
                <Checkbox
                  id="is_internal"
                  isDisabled={!isEntityActive}
                  {...register('is_internal')}
                >
                  Internal to FED/NTIA only
                </Checkbox>
              </Flex>
            </>
          )}
          <Flex flexDir="column" gap={4}>
            <Flex flexDir="row" gap={4} align="flex-start">
              {shouldShowActions && (
                <Box flex="1">
                  <FormControl isInvalid={!!errors.action}>
                    <FormLabel htmlFor="action" fontWeight="bold">
                      Request Action
                    </FormLabel>

                    <Select
                      id="action"
                      isDisabled={!isEntityActive}
                      {...register('action', {
                        validate: validateCommentOrAction,
                      })}
                      placeholder="Select"
                      backgroundColor="white"
                      onChange={(e) => {
                        setValue('action', e.target.value as actionsT);
                        trigger(['action', 'comment']);
                      }}
                    >
                      {actionOptions?.map((action) => (
                        <option value={action.value} key={action.value}>
                          {action.label}
                        </option>
                      ))}
                    </Select>
                    <FormErrorMessage color="red.600">
                      {`${errors?.action?.message}`}
                    </FormErrorMessage>
                  </FormControl>
                </Box>
              )}
              {shouldUseCommonConditionsEditor && (
                <Box flex="1">
                  <CommonConditionsDropDown
                    isDisabled={!isEntityActive}
                    onAddCondition={(conditionMarkdown) => {
                      const inserted =
                        commonConditionsEditorRef.current?.insertCondition(
                          conditionMarkdown
                        );
                      if (inserted) return;

                      appendCondition(conditionMarkdown);
                    }}
                  />
                </Box>
              )}
            </Flex>

            {shouldRenderJustificationTextField && (
              <Flex justifyContent="center">
                <Box w="100%">
                  <FormControl isInvalid={!!errors.justificationText}>
                    {shouldShowJustificationLabel ? (
                      <FormLabel
                        htmlFor={
                          shouldUseCommonConditionsEditor
                            ? 'justificationText'
                            : 'justificationTextVisible'
                        }
                        fontWeight="bold"
                      >
                        {getJustificationTextHeader(watchSelectedAction)}
                      </FormLabel>
                    ) : null}
                    <input
                      id="justificationText"
                      type="hidden"
                      {...register('justificationText', {
                        validate: (value) => {
                          if (
                            shouldRenderJustificationTextField &&
                            !(value?.trim() ?? '')
                          ) {
                            return 'Required.';
                          }
                          return true;
                        },
                      })}
                    />
                    {shouldUseCommonConditionsEditor ? (
                      <CommonConditionsEditor
                        ref={commonConditionsEditorRef}
                        value={commonConditionsMarkdown}
                        onChange={updateJustificationText}
                        isDisabled={!isEntityActive}
                        descriptionText="Common Conditions selected on the right will appear below. Use the editor to modify or delete them."
                      />
                    ) : (
                      <Textarea
                        id="justificationTextVisible"
                        minHeight="150px"
                        backgroundColor="white"
                        isDisabled={!isEntityActive}
                        value={commonConditionsMarkdown}
                        onChange={(e) => {
                          updateJustificationText(e.target.value);
                        }}
                      />
                    )}
                    <FormErrorMessage color="red.600">
                      {`${errors?.justificationText?.message}`}
                    </FormErrorMessage>
                  </FormControl>
                </Box>
              </Flex>
            )}
          </Flex>
          <Flex justifyContent="flex-end" gap={3} mt={5}>
            <Button
              color="#005EC4"
              minWidth="115px"
              isDisabled={!isEntityActive}
              _hover={{ border: '1px solid #005EC4' }}
              onClick={() => {
                methods.reset();
                setCommonConditionsMarkdown('');
                setTimeout(() => {
                  methods.trigger([
                    'comment',
                    'action',
                    'justificationText',
                    'is_internal',
                  ]);
                }, 0);
              }}
            >
              Clear form
            </Button>
            <Button
              type="submit"
              color="white"
              backgroundColor="#004a82"
              minWidth="115px"
              _hover={{ backgroundColor: '#003a5a' }}
              isDisabled={
                isSubmitting ||
                Object.keys(errors).length !== 0 ||
                !isEntityActive
              }
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Box>
  );
};
