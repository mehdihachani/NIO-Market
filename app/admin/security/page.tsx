import {redirect} from 'next/navigation'; import {currentUser} from '@/lib/auth'; import SecurityClient from './SecurityClient';
export default async function SecurityPage(){const user=await currentUser();if(!user)redirect('/login');return <SecurityClient/>}
