import { liabilitiesRepository } from "@/lib/database/repositories/liabilities.repository";
import type { NewLiability } from "@/types/domain/liability";

export const liabilitiesService = {
  async listAll() {
    return liabilitiesRepository.findAll();
  },

  async totalOwed(): Promise<number> {
    const liabilities = await liabilitiesRepository.findAll();
    return liabilities.reduce((sum, l) => sum + l.amountOwed, 0);
  },

  async create(input: NewLiability) {
    return liabilitiesRepository.create(input);
  },

  async update(id: string, input: NewLiability) {
    return liabilitiesRepository.update(id, input);
  },

  async remove(id: string) {
    return liabilitiesRepository.delete(id);
  },
};
