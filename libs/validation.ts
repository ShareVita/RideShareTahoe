// API request validation utilities

// eslint-disable-next-line no-unused-vars
type Validator = (_: unknown) => unknown;
type ValidationSchema = Record<string, Validator>;

export const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string) => {
  const phoneRegex = /^\+?[1-9]\d{0,15}$/;
  return phoneRegex.test(phone.replaceAll(/[()\s-]/g, ''));
};

export const validateRequired = (value: unknown, fieldName: string) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new Error(`${fieldName} is required`);
  }
  return true;
};

export const validateStringLength = (
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 255
) => {
  if (typeof value !== 'string') {
    throw new TypeError(`${fieldName} must be a string`);
  }
  if (value.length < minLength) {
    throw new TypeError(`${fieldName} must be at least ${minLength} characters long`);
  }
  if (value.length > maxLength) {
    throw new TypeError(`${fieldName} must be no more than ${maxLength} characters long`);
  }
  return true;
};

export const validateDate = (date: string | Date, fieldName: string) => {
  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    throw new TypeError(`${fieldName} must be a valid date`);
  }
  return dateObj;
};

export const validateFutureDate = (date: string | Date, fieldName: string) => {
  const dateObj = validateDate(date, fieldName);
  if (dateObj < new Date()) {
    throw new Error(`${fieldName} must be in the future`);
  }
  return dateObj;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUUID = (uuid: unknown): uuid is string => {
  return typeof uuid === 'string' && UUID_REGEX.test(uuid);
};

export const validateUUID = (uuid: string, fieldName: string) => {
  if (!isValidUUID(uuid)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }
  return true;
};

export const validateEnum = (
  value: unknown,
  fieldName: string,
  allowedValues: readonly unknown[]
) => {
  if (!allowedValues.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
  return true;
};

export const validateNumber = (
  value: unknown,
  fieldName: string,
  min: number | null = null,
  max: number | null = null
) => {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new TypeError(`${fieldName} must be a number`);
  }
  if (min !== null && num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }
  if (max !== null && num > max) {
    throw new Error(`${fieldName} must be no more than ${max}`);
  }
  return num;
};

export const validateArray = (
  value: unknown,
  fieldName: string,
  minLength = 0,
  maxLength: number | null = null
) => {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array`);
  }
  if (value.length < minLength) {
    throw new TypeError(`${fieldName} must have at least ${minLength} items`);
  }
  if (maxLength !== null && value.length > maxLength) {
    throw new TypeError(`${fieldName} must have no more than ${maxLength} items`);
  }
  return true;
};

// Common validation schemas
export const meetingValidationSchema: ValidationSchema = {
  recipient_id: (value: unknown) => validateUUID(value as string, 'recipient_id'),
  title: (value: unknown) => {
    validateRequired(value, 'title');
    validateStringLength(value, 'title', 1, 255);
  },
  meeting_place: (value: unknown) => {
    validateRequired(value, 'meeting_place');
    validateStringLength(value, 'meeting_place', 1, 255);
  },
  start_datetime: (value: unknown) => validateFutureDate(value as string | Date, 'start_datetime'),
  end_datetime: (value: unknown) => validateFutureDate(value as string | Date, 'end_datetime'),
};

export const reviewValidationSchema: ValidationSchema = {
  meeting_id: (value: unknown) => validateUUID(value as string, 'meeting_id'),
  rating: (value: unknown) => validateNumber(value, 'rating', 1, 5),
  comment: (value: unknown) => validateStringLength(value, 'comment', 0, 1000),
};

export const profileValidationSchema: ValidationSchema = {
  first_name: (value: unknown) => {
    validateRequired(value, 'first_name');
    validateStringLength(value, 'first_name', 1, 50);
  },
  last_name: (value: unknown) => {
    validateRequired(value, 'last_name');
    validateStringLength(value, 'last_name', 1, 50);
  },
  phone_number: (value: unknown) => {
    if (value) validatePhoneNumber(value as string);
  },
};

// Validate request body against schema
export const validateRequestBody = (body: Record<string, unknown>, schema: ValidationSchema) => {
  const errors: string[] = [];

  for (const [field, validator] of Object.entries(schema)) {
    try {
      validator(body[field]);
    } catch (error: unknown) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push(String(error));
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
};
