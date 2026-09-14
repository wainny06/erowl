import archive from '@/data/archive.json';
import InventoryDashboard from '@/components/inventory-dashboard';
import { requirePageSession } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  await requirePageSession();
  return <InventoryDashboard archive={archive} />;
}
