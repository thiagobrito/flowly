import { isValidEmail, MIN_PASSWORD_LENGTH, validatePassword } from './validation';

describe('isValidEmail', () => {
  it('accepts well-formed addresses', () => {
    expect(isValidEmail('ana@example.com')).toBe(true);
    expect(isValidEmail('ana.silva+tag@sub.example.com.br')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('ana')).toBe(false);
    expect(isValidEmail('ana@')).toBe(false);
    expect(isValidEmail('ana@example')).toBe(false);
    expect(isValidEmail('ana example@mail.com')).toBe(false);
    expect(isValidEmail('ana@example.c')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('rejects passwords shorter than the minimum', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toMatch(/pelo menos/);
    expect(validatePassword('')).toMatch(/pelo menos/);
  });

  it('rejects common passwords regardless of case', () => {
    expect(validatePassword('12345678')).toMatch(/muito comum/);
    expect(validatePassword('Password123')).toMatch(/muito comum/);
    expect(validatePassword('SENHA123')).toMatch(/muito comum/);
  });

  it('rejects trivial patterns (repeated or sequential characters)', () => {
    expect(validatePassword('aaaaaaaa')).toMatch(/muito comum/);
    expect(validatePassword('00000000')).toMatch(/muito comum/);
    expect(validatePassword('23456789')).toMatch(/muito comum/);
    expect(validatePassword('98765432')).toMatch(/muito comum/);
  });

  it('rejects passwords equal to the e-mail or its local part', () => {
    expect(validatePassword('ana.silva@mail.com', 'Ana.Silva@mail.com')).toMatch(/igual ao seu e-mail/);
    expect(validatePassword('ana.silva', 'ana.silva@mail.com')).toMatch(/igual ao seu e-mail/);
  });

  it('accepts reasonable passwords', () => {
    // NU_TEST_ prefixed literals: NOT VALID — test data only.
    expect(validatePassword('NU_TEST_correto-cavalo-bateria', 'ana@mail.com')).toBeNull();
    expect(validatePassword('NU_TEST_x91!kz#42', 'ana@mail.com')).toBeNull();
  });

  it('does not flag short local parts as e-mail collisions', () => {
    // "ana" tem menos que o mínimo; uma senha diferente que contenha "ana" é válida.
    expect(validatePassword('bananas-42-verdes', 'ana@mail.com')).toBeNull();
  });
});
