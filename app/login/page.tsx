import AuthForm from '../auth-form';
import {adminExists} from '../../lib/session';
export const dynamic='force-dynamic';
export default async function Page(){return <AuthForm mode="login" showSetup={!await adminExists()}/>}
