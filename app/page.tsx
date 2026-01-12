import Link from 'next/link';
import { Zap } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Welcome</h2>
          <p className="text-sm text-slate-400">A minimal, beautiful interface to migrate MySQL data.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-full text-white">
            <Zap size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/credentials" className="block p-4 rounded-lg bg-white/3 hover:bg-white/5 transition">
          <h3 className="font-semibold">Credentials</h3>
          <p className="text-sm text-slate-400 mt-2">Set source & destination DB credentials</p>
        </Link>
        <Link href="/tables" className="block p-4 rounded-lg bg-white/3 hover:bg-white/5 transition">
          <h3 className="font-semibold">Tables</h3>
          <p className="text-sm text-slate-400 mt-2">Discover and select tables to migrate</p>
        </Link>
        <Link href="/migration" className="block p-4 rounded-lg bg-white/3 hover:bg-white/5 transition">
          <h3 className="font-semibold">Migration</h3>
          <p className="text-sm text-slate-400 mt-2">Start and monitor migration progress</p>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;