import { resolveHomeSubject } from '../homeSubject';
import type { Testee } from '@/store/testeeStore';
const now = new Date(2026, 8, 8, 12);
const subject = (dob: string, gender?: number) => ({ id: 'one', legalName: '示例', dob, gender } as Testee);

test.each([
  ['1990-01-01', 1, 'adult-male'], ['1990-01-01', 2, 'adult-female'],
  ['2020-01-01', 1, 'child-male'], ['2020-01-01', 2, 'child-female'],
  ['2008-09-08', 1, 'adult-male'], ['2008-09-09', 1, 'child-male'],
  ['', 1, 'neutral'], ['2027-01-01', 2, 'neutral'], ['2020-02-30', 1, 'neutral'],
  ['2020-01-01', 0, 'neutral'], ['not-a-date', 1, 'neutral'],
])('resolves %s / %s to %s without guessing', (dob, gender, expected) => {
  expect(resolveHomeSubject(subject(dob, gender), now).avatarKey).toBe(expected);
});

test('no selected subject uses neutral identity and general entry copy', () => {
  const result = resolveHomeSubject(null, now);
  expect(result.avatarKey).toBe('neutral');
  expect(result.age).toBeNull();
  expect(result.name).toBe('选择一位受试者');
});
