'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type ValidationRule<T> = {
  validate: (value: T, formValues: Record<string, unknown>) => boolean;
  message: string;
};

type FieldValidators<T> = ValidationRule<T>[];

interface FieldState<T> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
}

interface UseFormOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validators?: Partial<Record<keyof T, FieldValidators<T[keyof T]>>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: T) => void | Promise<void>;
}

interface UseFormReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitCount: number;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string | null) => void;
  setFieldTouched: <K extends keyof T>(field: K, touched?: boolean) => void;
  setValues: (values: Partial<T>) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  validateField: <K extends keyof T>(field: K) => boolean;
  validateForm: () => boolean;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: (newValues?: Partial<T>) => void;
  getFieldProps: <K extends keyof T>(field: K) => {
    value: T[K];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    name: K;
    id: K;
  };
  getFieldMeta: <K extends keyof T>(field: K) => {
    error: string | null;
    touched: boolean;
    dirty: boolean;
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export const validators = {
  required: (message = 'This field is required'): ValidationRule<unknown> => ({
    validate: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    },
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length >= min,
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => !value || value.length <= max,
    message: message || `Must be at most ${max} characters`,
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value >= min,
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => value === undefined || value <= max,
    message: message || `Must be at most ${max}`,
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule<string> => ({
    validate: (value) => !value || regex.test(value),
    message,
  }),

  email: (message = 'Invalid email address'): ValidationRule<string> => ({
    validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message,
  }),

  url: (message = 'Invalid URL'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  numeric: (message = 'Must be a number'): ValidationRule<string> => ({
    validate: (value) => !value || !isNaN(Number(value)),
    message,
  }),

  integer: (message = 'Must be an integer'): ValidationRule<string> => ({
    validate: (value) => !value || Number.isInteger(Number(value)),
    message,
  }),

  positive: (message = 'Must be positive'): ValidationRule<number | string> => ({
    validate: (value) => {
      if (value === undefined || value === '') return true;
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return num > 0;
    },
    message,
  }),

  custom: <T>(
    fn: (value: T, formValues: Record<string, unknown>) => boolean,
    message: string
  ): ValidationRule<T> => ({
    validate: fn,
    message,
  }),
};

// =============================================================================
// USE FORM HOOK
// =============================================================================

export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const {
    initialValues,
    validators: fieldValidators = {},
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
  } = options;

  const initialValuesRef = useRef(initialValues);

  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrorsState] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouchedState] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      key => values[key as keyof T] !== initialValuesRef.current[key as keyof T]
    );
  }, [values]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const validateField = useCallback(
    <K extends keyof T>(field: K): boolean => {
      const validators = fieldValidators[field] as FieldValidators<T[K]> | undefined;
      if (!validators) return true;

      const value = values[field];
      for (const rule of validators) {
        if (!rule.validate(value, values)) {
          setErrorsState(prev => ({ ...prev, [field]: rule.message }));
          return false;
        }
      }

      setErrorsState(prev => {
        const { [field]: _, ...rest } = prev;
        return rest as Partial<Record<keyof T, string>>;
      });
      return true;
    },
    [fieldValidators, values]
  );

  const validateForm = useCallback((): boolean => {
    let isValid = true;
    const newErrors: Partial<Record<keyof T, string>> = {};

    for (const field of Object.keys(fieldValidators) as (keyof T)[]) {
      const validators = fieldValidators[field] as FieldValidators<T[keyof T]> | undefined;
      if (!validators) continue;

      const value = values[field];
      for (const rule of validators) {
        if (!rule.validate(value, values)) {
          newErrors[field] = rule.message;
          isValid = false;
          break;
        }
      }
    }

    setErrorsState(newErrors);
    return isValid;
  }, [fieldValidators, values]);

  const setFieldValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValuesState(prev => ({ ...prev, [field]: value }));
      if (validateOnChange) {
        // Defer validation to next tick to use updated value
        setTimeout(() => validateField(field), 0);
      }
    },
    [validateOnChange, validateField]
  );

  const setFieldError = useCallback(<K extends keyof T>(field: K, error: string | null) => {
    if (error) {
      setErrorsState(prev => ({ ...prev, [field]: error }));
    } else {
      setErrorsState(prev => {
        const { [field]: _, ...rest } = prev;
        return rest as Partial<Record<keyof T, string>>;
      });
    }
  }, []);

  const setFieldTouched = useCallback(
    <K extends keyof T>(field: K, touched: boolean = true) => {
      setTouchedState(prev => ({ ...prev, [field]: touched }));
      if (validateOnBlur && touched) {
        validateField(field);
      }
    },
    [validateOnBlur, validateField]
  );

  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  const setErrors = useCallback((newErrors: Partial<Record<keyof T, string>>) => {
    setErrorsState(newErrors);
  }, []);

  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { value, type } = e.target;
        const newValue = type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : type === 'number' 
            ? parseFloat(value) || 0
            : value;
        setFieldValue(field, newValue as T[keyof T]);
      },
    [setFieldValue]
  );

  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setFieldTouched(field, true);
    },
    [setFieldTouched]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setSubmitCount(prev => prev + 1);
      setIsSubmitted(true);

      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      );
      setTouchedState(allTouched);

      const isValid = validateForm();
      if (!isValid) return;

      if (onSubmit) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, validateForm, onSubmit]
  );

  const reset = useCallback(
    (newValues?: Partial<T>) => {
      const resetValues = newValues
        ? { ...initialValuesRef.current, ...newValues }
        : initialValuesRef.current;
      setValuesState(resetValues);
      setErrorsState({});
      setTouchedState({});
      setIsSubmitting(false);
      setIsSubmitted(false);
      setSubmitCount(0);
    },
    []
  );

  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => ({
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      name: field,
      id: field,
    }),
    [values, handleChange, handleBlur]
  );

  const getFieldMeta = useCallback(
    <K extends keyof T>(field: K) => ({
      error: errors[field] || null,
      touched: touched[field] || false,
      dirty: values[field] !== initialValuesRef.current[field],
    }),
    [values, errors, touched]
  );

  return {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
    isSubmitted,
    submitCount,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setValues,
    setErrors,
    validateField,
    validateForm,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    getFieldProps,
    getFieldMeta,
  };
}

// =============================================================================
// USE FIELD - Individual field hook
// =============================================================================

interface UseFieldOptions<T> {
  name: string;
  initialValue: T;
  validators?: FieldValidators<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface UseFieldReturn<T> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  setValue: (value: T) => void;
  setTouched: (touched?: boolean) => void;
  setError: (error: string | null) => void;
  validate: () => boolean;
  reset: () => void;
  inputProps: {
    value: T;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    name: string;
    id: string;
  };
}

export function useField<T>(options: UseFieldOptions<T>): UseFieldReturn<T> {
  const {
    name,
    initialValue,
    validators: fieldValidators = [],
    validateOnChange = true,
    validateOnBlur = true,
  } = options;

  const [value, setValueState] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouchedState] = useState(false);
  const initialRef = useRef(initialValue);

  const dirty = value !== initialRef.current;

  const validate = useCallback((): boolean => {
    for (const rule of fieldValidators) {
      if (!rule.validate(value, {})) {
        setError(rule.message);
        return false;
      }
    }
    setError(null);
    return true;
  }, [fieldValidators, value]);

  const setValue = useCallback(
    (newValue: T) => {
      setValueState(newValue);
      if (validateOnChange) {
        setTimeout(() => validate(), 0);
      }
    },
    [validateOnChange, validate]
  );

  const setTouched = useCallback(
    (t: boolean = true) => {
      setTouchedState(t);
      if (validateOnBlur && t) {
        validate();
      }
    },
    [validateOnBlur, validate]
  );

  const reset = useCallback(() => {
    setValueState(initialRef.current);
    setError(null);
    setTouchedState(false);
  }, []);

  const inputProps = useMemo(
    () => ({
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value as unknown as T);
      },
      onBlur: () => setTouched(true),
      name,
      id: name,
    }),
    [value, setValue, setTouched, name]
  );

  return {
    value,
    error,
    touched,
    dirty,
    setValue,
    setTouched,
    setError,
    validate,
    reset,
    inputProps,
  };
}

// =============================================================================
// TIMELOCK-SPECIFIC FORM HOOKS
// =============================================================================

/**
 * Form hook for creating a new timelock position.
 */
export interface CreatePositionFormValues {
  amount: string;
  token: string;
  lockDuration: number;
  lockUnit: 'hours' | 'days' | 'weeks' | 'months';
}

export function useCreatePositionForm(
  onSubmit: (values: CreatePositionFormValues) => Promise<void>
) {
  return useForm<CreatePositionFormValues>({
    initialValues: {
      amount: '',
      token: 'STX',
      lockDuration: 1,
      lockUnit: 'days',
    },
    validators: {
      amount: [
        validators.required('Amount is required'),
        validators.positive('Amount must be positive'),
      ],
      lockDuration: [
        validators.required('Lock duration is required'),
        validators.min(1, 'Lock duration must be at least 1'),
      ],
    },
    onSubmit,
  });
}

/**
 * Form hook for transfer position form.
 */
export interface TransferPositionFormValues {
  positionId: string;
  recipientAddress: string;
}

export function useTransferPositionForm(
  onSubmit: (values: TransferPositionFormValues) => Promise<void>
) {
  return useForm<TransferPositionFormValues>({
    initialValues: {
      positionId: '',
      recipientAddress: '',
    },
    validators: {
      positionId: [validators.required('Position ID is required')],
      recipientAddress: [
        validators.required('Recipient address is required'),
        validators.pattern(
          /^S[PM][A-Z0-9]{38,}$/,
          'Invalid Stacks address format'
        ),
      ],
    },
    onSubmit,
  });
}

/**
 * Validator for Stacks addresses.
 */
export const stacksAddressValidator = validators.pattern(
  /^S[PM][A-Z0-9]{38,}$/,
  'Invalid Stacks address'
);

/**
 * Validator for token amounts (positive numbers with decimals).
 */
export const tokenAmountValidator = validators.custom<string>(
  (value) => {
    if (!value) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num > 0 && /^\d*\.?\d*$/.test(value);
  },
  'Invalid token amount'
);

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default useForm;
