import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'DealFlow360',
  description: 'Self-governing sales operations platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}