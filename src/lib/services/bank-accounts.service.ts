import { bankAccountsRepository } from "@/lib/database/repositories/bank-accounts.repository";
import type { NewBankAccount } from "@/types/domain/bank-account";

export const bankAccountsService = {
  async listAll() {
    return bankAccountsRepository.findAll();
  },

  async totalValue(): Promise<number> {
    const accounts = await bankAccountsRepository.findAll();
    return accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  },

  async create(input: NewBankAccount) {
    return bankAccountsRepository.create(input);
  },

  async updateBalance(id: string, currentBalance: number) {
    return bankAccountsRepository.updateBalance(id, currentBalance);
  },

  async remove(id: string) {
    return bankAccountsRepository.delete(id);
  },
};
