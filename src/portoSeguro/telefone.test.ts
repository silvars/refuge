import { normalizarTelefone } from './telefone';

describe('normalizarTelefone', () => {
  it('mantém um número já em E.164', () => {
    expect(normalizarTelefone('+5511987654321')).toBe('+5511987654321');
  });

  it('completa com o país padrão (BR) quando falta o +55', () => {
    expect(normalizarTelefone('11987654321')).toBe('+5511987654321');
  });

  it('aceita formatação com espaços e parênteses', () => {
    expect(normalizarTelefone('(11) 98765-4321')).toBe('+5511987654321');
  });

  it('retorna null para número inválido', () => {
    expect(normalizarTelefone('123')).toBeNull();
  });

  it('retorna null para texto que não é telefone', () => {
    expect(normalizarTelefone('não é um telefone')).toBeNull();
  });
});
