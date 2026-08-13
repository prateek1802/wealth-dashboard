import { ppfRepository } from "@/lib/database/repositories/ppf.repository";
import type { NewPPFAccount } from "@/types/domain/ppf";

export const ppfService = {
  async listAll() {
    return ppfRepository.findAll();
  },

  async totalValue(): Promise<number> {
    const accounts = await ppfRepository.findAll();
    return accounts.reduce((sum, a) => sum + a.currentBalance, 0);
  },

  async create(input: NewPPFAccount) {
    return ppfRepository.create(input);
  },

  async updateBalance(id: string, currentBalance: number, totalContributed: number) {
    return ppfRepository.updateBalance(id, currentBalance, totalContributed);
  },

  async withdraw(id: string, amount: number) {
    return ppfRepository.withdraw(id, amount);
  },

  async remove(id: string) {
    return ppfRepository.delete(id);
  },
};
