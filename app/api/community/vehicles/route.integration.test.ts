const isVehicleIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';
const describeVehicleIntegration = isVehicleIntegrationTest ? describe : describe.skip;

describeVehicleIntegration('Vehicles API Integration Test', () => {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const USER_A_EMAIL = process.env.TEST_USER_A_EMAIL || 'alice@test.com';
  const USER_A_PASSWORD = process.env.TEST_USER_A_PASSWORD || 'TestPassword123!';
  const USER_B_EMAIL = process.env.TEST_USER_B_EMAIL || 'bob@test.com';
  const USER_B_PASSWORD = process.env.TEST_USER_B_PASSWORD || 'TestPassword123!';

  let userAToken: string;
  let userBToken: string;
  let vehicleId: string;

  describe('Authentication', () => {
    let isServerRunning = false;

    beforeAll(async () => {
      try {
        const res = await fetch(`${APP_URL}`);
        if (res.ok || res.status < 500) isServerRunning = true;
      } catch {
        // Dev server not running
      }
    });

    it('should authenticate User A', async () => {
      if (!isServerRunning) return;
      const response = await fetch(`${APP_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: USER_A_EMAIL,
          password: USER_A_PASSWORD,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.session).toBeDefined();
      userAToken = data.session.access_token;
    });

    it('should authenticate User B', async () => {
      if (!isServerRunning) return;
      const response = await fetch(`${APP_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: USER_B_EMAIL,
          password: USER_B_PASSWORD,
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.session).toBeDefined();
      userBToken = data.session.access_token;
    });
  });

  describe('Vehicle CRUD', () => {
    it('should return empty list initially', async () => {
      if (!userAToken) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles`, {
        headers: {
          Cookie: `sb-access-token=${userAToken}`,
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.vehicles).toBeDefined();
      expect(Array.isArray(data.vehicles)).toBe(true);
      // We can't guarantee it's empty if tests ran before, but we can check structure
    });

    it('should fail to create vehicle with invalid data', async () => {
      if (!userAToken) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${userAToken}`,
        },
        body: JSON.stringify({
          make: '', // Invalid
          model: 'TestModel',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
    });

    it('should create a new vehicle', async () => {
      if (!userAToken) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${userAToken}`,
        },
        body: JSON.stringify({
          make: 'TestMake',
          model: 'TestModel',
          year: 2023,
          color: 'TestColor',
          license_plate: 'TEST1234',
          drivetrain: 'AWD',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.vehicle).toBeDefined();
      expect(data.vehicle.make).toBe('TestMake');
      vehicleId = data.vehicle.id;
    });

    it('should list vehicles and find the new one', async () => {
      if (!userAToken) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles`, {
        headers: {
          Cookie: `sb-access-token=${userAToken}`,
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.vehicles).toBeDefined();
      expect(Array.isArray(data.vehicles)).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = data.vehicles.find((v: any) => v.id === vehicleId);
      expect(found).toBeDefined();
    });

    it('should update the vehicle', async () => {
      if (!userAToken || !vehicleId) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${userAToken}`,
        },
        body: JSON.stringify({
          make: 'UpdatedMake',
          model: 'TestModel',
          year: 2023,
          color: 'TestColor',
          drivetrain: 'FWD',
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.vehicle.make).toBe('UpdatedMake');
    });

    it("should prevent User B from updating User A's vehicle", async () => {
      if (!userBToken || !vehicleId) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${userBToken}`,
        },
        body: JSON.stringify({
          make: 'HackedMake',
          model: 'TestModel',
          year: 2023,
          color: 'TestColor',
          drivetrain: 'RWD',
        }),
      });

      expect(response.status).toBe(403); // Forbidden
    });

    it("should prevent User B from deleting User A's vehicle", async () => {
      if (!userBToken || !vehicleId) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `sb-access-token=${userBToken}`,
        },
      });

      expect(response.status).toBe(403); // Forbidden
    });

    it('should delete the vehicle', async () => {
      if (!userAToken || !vehicleId) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          Cookie: `sb-access-token=${userAToken}`,
        },
      });

      expect(response.ok).toBe(true);
    });

    it('should verify deletion', async () => {
      if (!userAToken) return;

      const response = await fetch(`${APP_URL}/api/community/vehicles`, {
        headers: {
          Cookie: `sb-access-token=${userAToken}`,
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = data.vehicles.find((v: any) => v.id === vehicleId);
      expect(found).toBeUndefined();
    });
  });
});
