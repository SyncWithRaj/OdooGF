import './globals.css';

export const metadata = {
  title: 'Odoo Hackathon Boilerplate',
  description: 'Full-stack monorepo with Next.js (JS) + NestJS (TS) + Prisma + Postgres',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
