import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import DashboardView from '@/app/admin/DashboardView';
export default async function Dashboard(){ const user=await currentUser(); if(!user)redirect('/login'); if(user.role!=='MERCHANT')redirect('/admin'); return <DashboardView/>; }
