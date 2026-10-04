export async function sendMerchantWelcomeEmail(input:{to:string;name:string;storeName:string;password:string;storeUrl:string}) {
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.EMAIL_FROM;
  if(!apiKey || !from) return {sent:false,reason:'EMAIL_PROVIDER_NOT_CONFIGURED'} as const;
  const subject='بيانات الدخول إلى متجر NIO Market';
  const html=`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>مرحباً ${escapeHtml(input.name)}</h2><p>تم تفعيل متجرك <strong>${escapeHtml(input.storeName)}</strong> على NIO Market.</p><p><strong>البريد:</strong> ${escapeHtml(input.to)}<br/><strong>كلمة المرور:</strong> ${escapeHtml(input.password)}</p><p><strong>رابط الإدارة:</strong> ${escapeHtml(input.storeUrl)}</p><p>يمكنك تغيير كلمة المرور من إعدادات الأمان بعد تسجيل الدخول.</p><p>احتفظ بهذه المعلومات ولا تشاركها مع أي شخص.</p></div>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[input.to],subject,html})});
  if(!r.ok) return {sent:false,reason:'EMAIL_SEND_FAILED'} as const;
  return {sent:true} as const;
}
function escapeHtml(v:string){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
