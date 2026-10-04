import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import OrdersClient from './OrdersClient';
export default async function OrdersPage() {
  const user=await currentUser(); if(!user)redirect('/login');
  const staff=user.role==='OWNER'||user.role==='ADMIN';
  if(!staff&&!user.merchant)redirect('/admin');
  const orders=await db.order.findMany({where:staff?{}:{store:{merchantId:user.merchant!.id}},include:{items:{include:{product:true}},store:true},orderBy:{createdAt:'desc'},take:200});
  return <OrdersClient initialOrders={orders.map(o=>({...o,createdAt:o.createdAt.toISOString(),items:o.items.map(i=>({quantity:i.quantity,price:i.price,productName:i.product.name}))}))} />;
}
