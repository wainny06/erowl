import { requirePageSession } from '@/lib/auth';
import DailyView from '@/components/daily-view';
export const dynamic='force-dynamic';
export default async function DailyPage(){await requirePageSession();return <DailyView/>;}
