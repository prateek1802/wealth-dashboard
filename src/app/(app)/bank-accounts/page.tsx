import { TopBar } from "@/components/layout/top-bar";
import { bankAccountsService } from "@/lib/services/bank-accounts.service";
import { BankAccountsView } from "@/features/bank-accounts/components/bank-accounts-view";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const accounts = await bankAccountsService.listAll();
  return (
    <div>
      <TopBar title="Bank Accounts" subtitle="Cash across savings, current, and salary accounts" />
      <BankAccountsView accounts={accounts} />
    </div>
  );
}
