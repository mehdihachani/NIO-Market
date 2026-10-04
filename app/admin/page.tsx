import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import DashboardView from './DashboardView';
export default async function Admin(){ const user=await currentUser(); if(!user)redirect('/login'); if(user.role==='MERCHANT')redirect('/dashboard'); return <DashboardView staffOnly/>; }
