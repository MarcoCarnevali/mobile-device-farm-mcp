import { describe, it, expect, vi } from 'vitest';
import { commandExists } from './utils.js';
import { execSync } from 'child_process';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

describe('utils', () => {
  describe('commandExists', () => {
    it('should return true if command exists', () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from('/usr/bin/adb'));
      expect(commandExists('adb')).toBe(true);
    });

    it('should return false if command does not exist', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('not found');
      });
      expect(commandExists('nonexistent')).toBe(false);
    });
  });
});
