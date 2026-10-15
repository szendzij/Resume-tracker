import { describe, it, expect, vi, afterEach } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the resolved value on first success (no retries)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const isRetryable = vi.fn().mockReturnValue(true);

    const result = await withRetry(fn, { isRetryable });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('succeeds on the 3rd attempt when isRetryable returns true', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('retryable'))
      .mockRejectedValueOnce(new Error('retryable'))
      .mockResolvedValue('ok');
    const isRetryable = vi.fn().mockReturnValue(true);

    const promise = withRetry(fn, { isRetryable });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the LAST error after exhausting attempts', async () => {
    vi.useFakeTimers();
    const first = new Error('first');
    const last = new Error('last');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(first)
      .mockRejectedValueOnce(new Error('middle'))
      .mockRejectedValueOnce(last);

    const promise = withRetry(fn, { attempts: 3, isRetryable: () => true });
    // Attach the rejection assertion BEFORE advancing timers to avoid an
    // unhandled rejection while the fake timers run.
    const assertion = expect(promise).rejects.toBe(last);
    await vi.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry when isRetryable returns false', async () => {
    const boom = new Error('boom');
    const fn = vi.fn().mockRejectedValue(boom);

    await expect(withRetry(fn, { isRetryable: () => false })).rejects.toBe(boom);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('defaults isRetryable to false (single attempt on error)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(withRetry(fn)).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('grows the delay linearly: attempt * baseDelayMs', async () => {
    vi.useFakeTimers();
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { attempts: 3, baseDelayMs: 50, isRetryable: () => true });

    // First call happens immediately.
    await vi.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // First retry only after attempt(1) * 50ms = 50ms.
    await vi.advanceTimersByTimeAsync(49);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry only after attempt(2) * 50ms = 100ms.
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toBe('ok');
  });

  it('honors a custom baseDelayMs (e.g. 800 for gemini path)', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(new Error('503')).mockResolvedValue('ok');

    const promise = withRetry(fn, { attempts: 3, baseDelayMs: 800, isRetryable: () => true });

    await vi.advanceTimersByTimeAsync(799);
    expect(fn).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(2);

    await expect(promise).resolves.toBe('ok');
  });
});
