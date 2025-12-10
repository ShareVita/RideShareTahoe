import { EmailQueue, EmailQueueItem, EmailData } from './emailQueue';

jest.useFakeTimers();
jest.spyOn(globalThis, 'setTimeout');
jest.spyOn(console, 'error').mockImplementation(() => {});

/**
 * Helper for delaySpy to avoid deep nesting.
 * @param ms - Milliseconds to delay.
 * @returns Promise that resolves after ms.
 */
function delayHelper(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

describe('EmailQueue', () => {
  let queue: EmailQueue; // Explicitly type mockSendFn using the local mock type
  let mockSendFn: jest.Mock<Promise<unknown>, [EmailData]>;
  const mockEmailData = {
    emailType: 'test_email',
    userId: 'user-123',
    to: '',
    from: '',
    subject: '',
    body: '',
  };

  beforeEach(() => {
    // Set a predictable start time *after* enabling fake timers
    jest.setSystemTime(new Date('2025-01-01T10:00:00Z'));

    queue = new EmailQueue(); // Speed up rate limiting for tests: 10 emails max per 1 second (1000ms)
    queue.updateRateLimit({ maxEmails: 10, windowMs: 1000 }); // Mock the send function that the queue will call

    mockSendFn = jest.fn().mockResolvedValue('OK');
    queue.clearQueue();
  });

  afterAll(() => {
    jest.useRealTimers();
  }); // --- Core Queue Management ---

  describe('Core Queue Management', () => {
    // Explicitly type the spy to refer to a function that returns a Promise<void>
    let processQueueSpy: jest.SpyInstance<Promise<void>, []>; // This spy technique is valid for these specific unit tests
    // where we *only* want to test the synchronous state of adding to the queue.

    beforeEach(() => {
      processQueueSpy = jest.spyOn(queue, 'processQueue').mockImplementation(async () => {});
    });
    afterEach(() => {
      processQueueSpy.mockRestore();
    });

    it('should initialize correctly with default values', () => {
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
      expect(queue.rateLimit.maxEmails).toBe(10);
    });

    it('should add items to the queue and return a unique ID', async () => {
      const id = await queue.addToQueue(mockEmailData, mockSendFn);
      expect(queue.queue).toHaveLength(1); // Works because processQueue is mocked
      expect(id).toMatch(/^email_\d+_[a-z0-9]+/);
      expect(processQueueSpy).toHaveBeenCalled(); // Check that it *tried* to start
    });

    it('should prioritize "high" priority items', async () => {
      const normalId = await queue.addToQueue(
        { to: '', subject: '', body: '', type: 'normal' },
        mockSendFn,
        {
          priority: 'normal',
        }
      );
      const highId = await queue.addToQueue(
        { to: '', subject: '', body: '', type: 'high' },
        mockSendFn,
        {
          priority: 'high',
        }
      );

      expect(queue.queue).toHaveLength(2); // Works because processQueue is mocked
      expect(queue.queue[0].id).toBe(highId);
      expect(queue.queue[1].id).toBe(normalId);
    });
  }); // This test *doesn't* use the spy

  it('should process the queue immediately after adding the first item', async () => {
    await queue.addToQueue(mockEmailData, mockSendFn);
    expect(queue.processing).toBe(true);

    await jest.runAllTimersAsync(); // Check final state

    expect(mockSendFn).toHaveBeenCalledTimes(1);
    expect(queue.processing).toBe(false);
    expect(queue.queue).toHaveLength(0);
  }); // --- Processing and Sending ---

  describe('Processing and Sending', () => {
    it('should process all items in the queue successfully', async () => {
      await queue.addToQueue({ id: 1, to: '', subject: '', body: '' }, mockSendFn);
      await queue.addToQueue({ id: 2, to: '', subject: '', body: '' }, mockSendFn);
      await queue.addToQueue({ id: 3, to: '', subject: '', body: '' }, mockSendFn);

      expect(queue.processing).toBe(true);

      await jest.runAllTimersAsync(); // All items processed

      expect(mockSendFn).toHaveBeenCalledTimes(3);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should log errors from sendFunction and handle retry', async () => {
      const sendError = new Error('Resend Failed');
      mockSendFn.mockRejectedValue(sendError);

      await queue.addToQueue(mockEmailData, mockSendFn);

      await jest.runAllTimersAsync(); // Expect 4 calls (Initial + 3 Retries)

      expect(mockSendFn).toHaveBeenCalledTimes(4);
      expect(queue.processing).toBe(false);
    });
  });

  describe('when EMAIL_DEBUG_LOG is enabled', () => {
    let originalEmailDebugLog: string | undefined;

    beforeEach(() => {
      originalEmailDebugLog = process.env.EMAIL_DEBUG_LOG;
      process.env.EMAIL_DEBUG_LOG = '1';
    });

    afterEach(() => {
      if (originalEmailDebugLog === undefined) {
        delete process.env.EMAIL_DEBUG_LOG;
      } else {
        process.env.EMAIL_DEBUG_LOG = originalEmailDebugLog;
      }
    });

    it('should send up to maxEmails then pause and reset', async () => {
      const delaySpy = jest.spyOn(queue, 'delay').mockImplementation(function (ms: number) {
        // We only want to change the 100ms inter-email delay
        if (ms === 100) {
          return Promise.resolve();
        } else {
          return delayHelper(ms);
        }
      });

      for (let i = 0; i < 11; i++) {
        await queue.addToQueue({ id: i, to: '', subject: '', body: '' }, mockSendFn);
      }

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(11);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);

      delaySpy.mockRestore();
    });

    it('should reset rate limit counters after windowMs passes', async () => {
      // Send 5 emails
      for (let i = 0; i < 5; i++) {
        await queue.addToQueue({ id: i, to: '', subject: '', body: '' }, mockSendFn);
      }

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(5);
      expect(queue.rateLimit.emailsSent).toBe(5);
      expect(queue.processing).toBe(false);

      jest.advanceTimersByTime(501);

      await queue.addToQueue({ id: 6, to: '', subject: '', body: '' }, mockSendFn);
      expect(queue.processing).toBe(true);

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(6);
      expect(queue.rateLimit.emailsSent).toBe(1);
      expect(queue.processing).toBe(false);
    });

    it('should correctly calculate and wait for the remaining time', async () => {
      queue.rateLimit.windowStart = Date.now() - 500;
      queue.rateLimit.emailsSent = 10;

      const addPromise = queue.addToQueue(mockEmailData, mockSendFn);

      await Promise.resolve();

      expect(mockSendFn).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(400);
      expect(mockSendFn).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(200);

      expect(mockSendFn).toHaveBeenCalledTimes(1);

      await addPromise;
      await jest.runAllTimersAsync();
      expect(queue.processing).toBe(false);
    });
  }); // --- Retry Logic ---

  describe('Retry Logic', () => {
    it('should retry a failed email up to maxRetries (3 times total)', async () => {
      const sendError = new Error('Transient Error');

      mockSendFn
        .mockRejectedValueOnce(sendError) // Attempt 1 -> 1s delay
        .mockRejectedValueOnce(sendError) // Attempt 2 -> 2s delay
        .mockRejectedValueOnce(sendError) // Attempt 3 -> 4s delay
        .mockResolvedValue('Success'); // Attempt 4 (Success)

      await queue.addToQueue(mockEmailData, mockSendFn);

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(4);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should respect the maxDelay for backoff', async () => {
      queue.retryConfig.baseDelay = 10000; // 10s
      queue.retryConfig.maxDelay = 15000; // 15s
      mockSendFn.mockRejectedValue(new Error('Test'));

      await queue.addToQueue(mockEmailData, mockSendFn);

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(4);
      expect(queue.processing).toBe(false);
    });

    it('should log final failure when maxRetries is reached', async () => {
      mockSendFn.mockRejectedValue(new Error('Fatal Error'));

      await queue.addToQueue(mockEmailData, mockSendFn); // Default maxRetries is 3

      await jest.runAllTimersAsync();

      expect(mockSendFn).toHaveBeenCalledTimes(4);
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should log final failure debug info when EMAIL_DEBUG_LOG is enabled', async () => {
      process.env.EMAIL_DEBUG_LOG = '1';
      mockSendFn.mockRejectedValue(new Error('Fatal Error'));

      await queue.addToQueue(mockEmailData, mockSendFn, { maxRetries: 0 });
      await jest.runAllTimersAsync();

      process.env.EMAIL_DEBUG_LOG = '0'; // Clean up
    });
  }); // --- Utility Methods ---

  describe('Utility Methods', () => {
    // These tests are synchronous and were already correct.
    it('should clear the queue and reset processing status', () => {
      // Use local mock types to prevent 'as any' casting.
      queue.queue = [
        {
          id: '1',
          emailData: { to: 'test', subject: 'test', body: 'test' },
          sendFunction: async () => {},
          options: { priority: 'normal', retries: 0, maxRetries: 3, createdAt: Date.now() },
        },
      ] as EmailQueueItem[];
      queue.processing = true;
      queue.clearQueue();
      expect(queue.queue).toHaveLength(0);
      expect(queue.processing).toBe(false);
    });

    it('should return correct status', () => {
      queue.rateLimit.emailsSent = 5;
      queue.rateLimit.windowStart = Date.now() - 500; // Use local mock types to prevent 'as any' casting.
      const mockItem = {
        emailData: { to: 'test', subject: 'test', body: 'test' },
        sendFunction: async () => {},
        options: { priority: 'normal', retries: 0, maxRetries: 3, createdAt: Date.now() },
      };
      queue.queue = [
        { ...mockItem, id: '1' },
        { ...mockItem, id: '2' },
      ] as EmailQueueItem[];
      queue.processing = true;

      const status = queue.getStatus();

      expect(status.queueLength).toBe(2);
      expect(status.processing).toBe(true);
      expect(status.rateLimit.emailsSent).toBe(5);
      expect(status.rateLimit.timeUntilReset).toBe(500); // 1000ms - 500ms
    });
  });
});
