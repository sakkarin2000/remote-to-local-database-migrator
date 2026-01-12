import '../styles/globals.css';
import Link from 'next/link';
import ToastProvider from './components/ToastProvider';
import Stepper from './components/Stepper';

export const metadata = {
  title: 'Database Migrator',
  description: 'Minimal, beautiful DB migration dashboard',
}

export default function RootLayout({ children, }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="py-6 border-b border-white/5 mb-8">
          <div className="container flex items-center justify-between">
            <div className="flex gap-[20px] items-center space-x-3">
              <div className="brand-logo">DB</div>
              <div>
                <h1 className="text-lg font-semibold">Database Migrator</h1>
                <p className="text-sm text-slate-400">Move data between MySQL instances safely</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/" className="nav-link">Home</Link>
              <Link href="/credentials" className="nav-link">Credentials</Link>
              <Link href="/tables" className="nav-link">Tables</Link>
              <Link href="/migration" className="nav-link">Migration</Link>
            </nav>
          </div>
        </header>
        <main className="container">
          <div className="card">
            <ToastProvider>
              <Stepper />
              {children}
            </ToastProvider>
          </div>
        </main>
      </body>
    </html>
  )
}
