'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { UserProfile } from '@/hooks/useProfile';

interface Report {
  id: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reporter: {
    first_name: string;
    last_name: string;
  };
  reported: {
    id: string;
    first_name: string;
    last_name: string;
    is_banned: boolean;
  };
}

interface ReportsTabProps {
  readonly profile?: UserProfile | null;
}

/**
 * Admin tab for managing user reports.
 * Displays a list of reports with actions to dismiss or resolve them (including banning users).
 */
export default function ReportsTab({ profile }: ReportsTabProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.is_admin) return;

    const fetchReports = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('reports')
        .select(
          `
          *,
          reporter:reporter_id(first_name, last_name),
          reported:reported_id(id, first_name, last_name, is_banned)
        `
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
      } else {
        setReports(data as unknown as Report[]);
      }
      setLoading(false);
    };

    fetchReports();
  }, [profile]);

  const handleDismiss = async (reportId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId);

    if (error) {
      toast.error('Failed to dismiss report');
    } else {
      toast.success('Report dismissed');
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'dismissed' } : r))
      );
    }
  };

  const handleBanUser = async (reportId: string, userId: string) => {
    if (!confirm('Are you sure you want to BAN this user? This will restrict their access.'))
      return;

    const supabase = createClient();

    const { error: banError } = await supabase
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', userId);

    if (banError) {
      toast.error('Failed to ban user');
      console.error(banError);
      return;
    }

    const { error: reportError } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);

    if (reportError) {
      toast.error('User banned, but failed to update report status');
    } else {
      toast.success('User BANNED and report resolved');
      setReports((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            return { ...r, status: 'resolved', reported: { ...r.reported, is_banned: true } };
          }
          if (r.reported.id === userId) {
            return { ...r, reported: { ...r.reported, is_banned: true } };
          }
          return r;
        })
      );
    }
  };

  const getStatusBadgeClasses = (status: Report['status']): string => {
    if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (status === 'resolved') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Reports</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-700 dark:text-gray-300">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Reporter</th>
              <th className="px-6 py-3">Reported User</th>
              <th className="px-6 py-3">Reason</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No reports found. Good job! 🎉
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {report.reporter?.first_name} {report.reporter?.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/profile/${report.reported?.id}`}
                      className="hover:underline font-medium text-blue-600"
                    >
                      {report.reported?.first_name} {report.reported?.last_name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 max-w-xl wrap-break-word text-sm text-gray-600 dark:text-gray-300">
                    {report.reason || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${getStatusBadgeClasses(
                        report.status
                      )}`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {report.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDismiss(report.id)}
                          className="text-gray-600 hover:text-gray-900 dark:hover:text-white font-medium hover:underline"
                        >
                          Dismiss
                        </button>
                        {!report.reported?.is_banned && (
                          <button
                            onClick={() => handleBanUser(report.id, report.reported?.id)}
                            className="text-red-600 hover:text-red-900 dark:hover:text-red-400 font-bold bg-white border border-red-200 px-3 py-1 rounded hover:bg-red-50"
                          >
                            BAN USER
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
