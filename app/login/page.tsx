'use client';
import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
const logo='https://i.ibb.co/rR8bLz68/20260928-000116.png';
export default function Login(){const router=useRouter(); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();setLoading(true);setError('');const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});const d=await r.json();if(!r.ok){setError(d.error||'تعذر تسجيل الدخول');setLoading(false);return}router.push(d.role==='MERCHANT'?'/dashboard':'/admin');}
 return <main className="auth-page"><form className="auth-card card" onSubmit={submit}><Image src={logo} alt="NIO Market" width={170} height={65} unoptimized/><h1>تسجيل الدخول</h1><p>إدارة متجرك على NIO Market</p><label>البريد الإلكتروني<input className="input" value={email} onChange={e=>setEmail(e.target.value)} type="email" required/></label><label>كلمة المرور<input className="input" value={password} onChange={e=>setPassword(e.target.value)} type="password" required/></label>{error&&<div className="error">{error}</div>}<button className="btn btn-blue" disabled={loading}>{loading?'جارٍ الدخول...':'دخول'}</button><a className="btn btn-green" href="/buy">شراء متجر جديد</a></form></main>}
