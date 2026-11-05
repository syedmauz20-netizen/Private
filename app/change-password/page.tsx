import AuthForm from '../auth-form';
import {session} from '../../lib/session';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Page(){if(!await session())redirect('/login');return <AuthForm mode="change_password"/>}
