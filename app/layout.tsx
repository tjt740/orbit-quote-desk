import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'ORBIT · 报价工作台',description:'产品报价、子表格与中英文多币种报价管理工作台。',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN" data-theme="antd" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{const t=localStorage.getItem('orbit-theme');document.documentElement.dataset.theme=['light','dark','antd'].includes(t)?t:'antd'}catch{}"}}/></head><body>{children}</body></html>}
