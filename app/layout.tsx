import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
export const metadata: Metadata={title:'NIO Market — منصة إنشاء وإدارة المتاجر — E-commerce Platform',description:'منصة NIO Market — منصة إنشاء وإدارة المتاجر لإنشاء وإدارة المتاجر الإلكترونية'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="ar" dir="rtl"><body>{children}</body></html>}
