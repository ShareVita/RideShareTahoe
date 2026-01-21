// API request validation utilities

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
