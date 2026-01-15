import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ReportsTab from '@/app/admin/components/ReportsTab';
import UsersTab from '@/app/admin/components/UsersTab';

type Tab = 'reports' | 'users';

interface AdminPageProps {
  searchParams: Promise<{ view?: string }>;
}

/**
 * The main admin dashboard page.
 * Restricts access to admins only and provides tabs for managing reports and users.
 */
export default async function AdminPage({ searchParams }: Readonly<AdminPageProps>) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch Profile to check admin status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    redirect('/community');
  }

  const resolvedSearchParams = await searchParams;
  const activeTab: Tab = (resolvedSearchParams?.view as Tab) || 'reports';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-gray-500">Manage reports, users, and safety</p>
          </div>
          <Link
            href="/community"
            className="text-purple-600 hover:text-purple-700 font-medium hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>&larr;</span> Back to Community
          </Link>
        </header>

        {/* Tab Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:flex sm:space-x-1 bg-white/60 dark:bg-slate-900/60 rounded-xl p-2 sm:p-1 shadow-md border border-white/20 dark:border-slate-700/30 gap-2 sm:gap-0 backdrop-blur-md">
            {[
              { id: 'reports', label: 'Reports', icon: '⚠️' },
              { id: 'users', label: 'Users Management', icon: '👥' },
            ].map((tab) => (
              <Link
                key={tab.id}
                href={`/admin?view=${tab.id}`}
                className={`w-full sm:flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base text-center block ${
                  activeTab === tab.id
                    ? 'bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'reports' ? <ReportsTab profile={profile} /> : <UsersTab />}
        </div>
      </div>
    </div>
  );
}
