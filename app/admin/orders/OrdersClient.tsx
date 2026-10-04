'use client';
import { useState } from 'react';

type Order = { id:string; customerName:string; customerPhone:string; wilaya:string; commune:string; address:string|null; status:string; total:number; deliveryFee:number; trackingNumber:string|null; createdAt:string; items:{quantity:number;price:number;productName:string}[] };
const labels:Record<string,string>={NEW:'جديد',CONFIRMED:'مؤكد',PROCESSING:'قيد المعالجة',SHIPPED:'تم الشحن',DELIVERED:'تم التسليم',CANCELLED:'ملغى',RETURNED:'مرتجع'};
const statuses=Object.keys(labels);
export default function OrdersClient({initialOrders}:{initialOrders:Order[]}){
 const [orders,setOrders]=useState(initialOrders); const [busy,setBusy]=useState<string|null>(null);
 async function update(orderId:string,status:string){setBusy(orderId);try{const r=await fetch('/api/orders/manage',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId,status})});const d=await r.json();if(!r.ok)throw new Error(d.error);setOrders(x=>x.map(o=>o.id===orderId?{...o,status}:o));}catch(e){alert(e instanceof Error?e.message:'حدث خطأ')}finally{setBusy(null)}}
 return <main className="main full-page"><div className="page-head"><div><h1>الطلبات</h1><p>إدارة ومتابعة طلبات متجرك.</p></div><a className="btn btn-blue" href="/admin">العودة للوحة التحكم</a></div><div className="card table-wrap"><table className="table"><thead><tr><th>الطلب</th><th>العميل</th><th>الموقع</th><th>المنتجات</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>{orders.map(o=><tr key={o.id}><td><strong>#{o.id.slice(-7).toUpperCase()}</strong><br/><small>{new Date(o.createdAt).toLocaleString('ar-DZ')}</small></td><td>{o.customerName}<br/><small>{o.customerPhone}</small></td><td>{o.wilaya} / {o.commune}<br/><small>{o.address||''}</small></td><td>{o.items.map((i,n)=><div key={n}>{i.productName} × {i.quantity}</div>)}</td><td><strong>{o.total.toLocaleString('ar-DZ')} دج</strong></td><td><select value={o.status} disabled={busy===o.id} onChange={e=>update(o.id,e.target.value)}>{statuses.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></td></tr>)}</tbody></table>{!orders.length&&<p>لا توجد طلبات بعد.</p>}</div></main>;
}
