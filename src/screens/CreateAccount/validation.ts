/**
 * Validação de cadastro (pura, sem UI) — usada pela tela `CreateAccount` e
 * coberta por testes unitários. O backend continua sendo a autoridade final;
 * aqui o objetivo é dar feedback imediato e barrar o que é obviamente inválido.
 *
 * A política de senha segue o NIST 800-63B: comprimento mínimo + bloqueio de
 * senhas comuns/triviais, sem regras de composição (maiúscula/símbolo), que
 * criam atrito sem melhorar a segurança real.
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Validação leve de formato de e-mail (o backend continua sendo a autoridade final). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Senhas mais usadas no Brasil/mundo com 8+ caracteres (fontes públicas de
 * vazamentos, ex.: NordPass/SecLists). Comparação em lowercase.
 */
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  '11223344',
  '12341234',
  '12345678910',
  'password',
  'password1',
  'password123',
  'passw0rd',
  'senha123',
  'senha1234',
  'senhasenha',
  'qwertyuiop',
  'qwerty123',
  'asdfghjkl',
  'iloveyou',
  'sunshine',
  'brasil123',
  'flamengo',
  'corinthians',
  'abc12345',
  'a1b2c3d4',
  '1q2w3e4r',
  '102030405060',
]);

/** Detecta padrões triviais: um caractere só repetido ou dígitos em sequência. */
function isTrivialPattern(password: string): boolean {
  if (/^(.)\1+$/.test(password)) return true;

  if (/^\d+$/.test(password)) {
    const digits = [...password].map(Number);
    const ascending = digits.every((digit, i) => i === 0 || digit === ((digits[i - 1] ?? 0) + 1) % 10);
    const descending = digits.every((digit, i) => i === 0 || digit === ((digits[i - 1] ?? 0) + 9) % 10);
    if (ascending || descending) return true;
  }

  return false;
}

/**
 * Valida a senha do cadastro. Retorna a mensagem de erro (pt-BR) ou `null`
 * quando aceitável. `email` é usado para impedir senha igual ao identificador.
 */
export function validatePassword(password: string, email = ''): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  const normalized = password.toLowerCase();
  if (COMMON_PASSWORDS.has(normalized) || isTrivialPattern(password)) {
    return 'Essa senha é muito comum. Escolha uma mais difícil de adivinhar.';
  }

  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split('@')[0] ?? '';
  if (normalizedEmail.length > 0 && (normalized === normalizedEmail || (localPart.length >= MIN_PASSWORD_LENGTH && normalized === localPart))) {
    return 'A senha não pode ser igual ao seu e-mail.';
  }

  return null;
}
