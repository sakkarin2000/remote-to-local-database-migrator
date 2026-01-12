"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const steps = [
  { id: 'credentials', title: 'Credentials', href: '/credentials' },
  { id: 'tables', title: 'Tables', href: '/tables' },
  { id: 'migration', title: 'Migration', href: '/migration' },
];

export default function Stepper() {
  const pathname = usePathname() || '/';
  const activeIndex = Math.max(0, steps.findIndex((s) => pathname.startsWith(s.href)));

  const prev = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const next = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;

  return (
    <div className="mb-4 stepper">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-[10px]">
          {steps.map((s, i) => {
            const completed = i < activeIndex;
            const active = i === activeIndex;
            return (
              <div key={s.id} className="flex items-center gap-[10px]">
                <Link
                  href={s.href}
                  aria-current={active ? 'step' : undefined}
                  className="flex items-center gap-[5px] no-underline group focus:outline-none rounded-md px-2 py-1"
                >
                  <div
                    className={`rounded-full inline-flex items-center justify-center text-base font-semibold transition-transform transform ${completed ? 'text-green-700' : 'text-slate-700'} group-focus:ring-2 group-focus:ring-offset-2 px-3 py-2 min-w-[44px] min-h-[44px]`}
                    style={
                      active
                        ? { background: '#ffffff', border: '2px solid var(--accent)', boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }
                        : completed
                        ? { background: '#dcfce7' }
                        : { background: '#ffffff', border: '1px solid rgba(15,23,42,0.06)' }
                    }
                  >
                    {completed && !active ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="pointer-events-none" style={active ? { color: 'var(--accent)' } : undefined}>{i + 1}</span>
                    )}
                  </div>
                  <div className={`text-sm ${active ? 'font-semibold text-slate-900' : 'text-slate-600'} group-hover:underline`}>{s.title}</div>
                </Link>
                {i < steps.length - 1 && (
                  <div
                    className="rounded-full mx-3"
                    style={{ width: 64, height: 6, background: i < activeIndex ? 'linear-gradient(90deg,var(--accent),var(--accent-600))' : 'rgba(15,23,42,0.04)', borderRadius: 999 }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {prev && (
            <Link
              href={prev.href}
              className="btn btn-secondary no-underline px-3 py-1 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/30"
            >
              Back
            </Link>
          )}
          {next && (
            <Link
              href={next.href}
              className="btn btn-primary no-underline px-3 py-1 rounded-md hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent/30"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
