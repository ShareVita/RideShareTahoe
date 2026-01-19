import { validateUUID } from '@/libs/validation';

describe('libs/validation.js - Utility Functions', () => {
  describe('validateUUID', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    test('should return true for a valid UUID', () => {
      expect(validateUUID(validUuid, 'ID')).toBe(true);
    });

    test('should throw an error for an invalid UUID format', () => {
      expect(() => validateUUID('12345', 'ID')).toThrow('ID must be a valid UUID');
      expect(() => validateUUID('not-a-uuid-string', 'ID')).toThrow('ID must be a valid UUID');
    });
  });
});
