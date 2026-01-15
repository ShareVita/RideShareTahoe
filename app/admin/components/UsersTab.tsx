'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';

interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  email: string; // Ensure this is available in your profiles selection or add it if missing
  is_banned: boolean;
  is_admin: boolean;
  profile_photo_url: string;
  created_at: string;
}

const PAGE_SIZE = 20;

/**
 * Admin tab for user management.
 * Allows searching for users and banning/unbanning them.
 */
export default function UsersTab() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.rpc('search_users', {
      search_term: searchTerm,
      page_number: page,
      page_size: PAGE_SIZE,
    });

    if (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } else {
      const usersData = data as (UserData & { total_count: number })[];
      setUsers(usersData);

      if (usersData && usersData.length > 0) {
        setTotalCount(usersData[0].total_count);
      } else {
        setTotalCount(0);
      }
    }
    setLoading(false);
  }, [page, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 0 && searchTerm) {
        setPage(0);
      } else {
        fetchUsers();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, page, fetchUsers]);

  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'UNBAN' : 'BAN'} this user?`)) return;

    setUpdating(userId);
    const supabase = createClient();

    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentStatus })
      .eq('id', userId);

    if (error) {
      toast.error(`Failed to ${currentStatus ? 'unban' : 'ban'} user`);
      console.error(error);
    } else {
      toast.success(`User ${currentStatus ? 'unbanned' : 'banned'} successfully`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentStatus } : u))
      );
    }
    setUpdating(null);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={4} className="px-6 py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </td>
        </tr>
      );
    }

    if (users.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
            No users found matching your search.
          </td>
        </tr>
      );
    }

    return users.map((user) => (
      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {user.profile_photo_url ? (
              <Image
                src={user.profile_photo_url}
                alt={`${user.first_name} ${user.last_name}`}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </div>
            )}
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {user.first_name} {user.last_name}
                {user.is_admin && (
                  <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {new Date(user.created_at).toLocaleDateString()}
        </td>
        <td className="px-6 py-4">
          {user.is_banned ? (
            <span className="inline-flex px-2 py-1 text-xs font-semibold leading-5 text-red-800 bg-red-100 rounded-full dark:bg-red-900/30 dark:text-red-300">
              BANNED
            </span>
          ) : (
            <span className="inline-flex px-2 py-1 text-xs font-semibold leading-5 text-green-800 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-300">
              Active
            </span>
          )}
        </td>
        <td className="px-6 py-4 text-right space-x-3">
          <Link
            href={`/profile/${user.id}`}
            className="text-gray-600 hover:text-purple-600 font-medium hover:underline text-xs sm:text-sm"
          >
            View
          </Link>
          {!user.is_admin && (
            <button
              onClick={() => handleToggleBan(user.id, user.is_banned)}
              disabled={updating === user.id}
              className={`text-xs sm:text-sm font-bold border px-3 py-1 rounded transition-colors ${
                user.is_banned
                  ? 'text-green-600 border-green-200 hover:bg-green-50'
                  : 'text-red-600 border-red-200 hover:bg-red-50'
              } ${updating === user.id ? 'opacity-50 cursor-wait' : ''}`}
            >
              {user.is_banned ? 'UNBAN' : 'BAN'}
            </button>
          )}
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
          />
          <svg
            className="w-5 h-5 absolute left-3 top-2.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total Users:{' '}
          <span className="font-semibold text-gray-900 dark:text-white">{totalCount}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {renderTableBody()}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
