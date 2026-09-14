import { authConfigured, hasSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/login-form';
export const dynamic='force-dynamic';
export default async function Login() {
  if(await hasSession()) redirect('/');
  return <main className="login-shell"><section className="login-card"><div className="login-mark">KM</div><h1>한의원 재고관리</h1><p>공용 비밀번호를 입력해 주세요.</p><LoginForm configured={authConfigured()}/></section></main>;
}
