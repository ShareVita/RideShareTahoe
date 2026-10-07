'use client';

import { useState, useEffect, useCallback } from 'react';

interface DeletionRequest {
  status: 'pending' | 'processing';
  daysRemaining: number;
  scheduled_deletion_date: string;
  reason?: string;
}

interface DeletionRequestStatusProps {
  readonly userId: string;
}

export default function DeletionRequestStatus({ userId }: DeletionRequestStatusProps) {
  const [deletionRequest, setDeletionRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchDeletionStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/account/deletion-request');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deletion status');
      }

      setDeletionRequest(data.hasPendingRequest ? data.deletionRequest : null);
    } catch (err: unknown) {
      console.error('Error fetching deletion status:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      void fetchDeletionStatus();
    }
    const refresh = () => {
      void fetchDeletionStatus();
    };
    window.addEventListener('account-deletion-changed', refresh);
    return () => window.removeEventListener('account-deletion-changed', refresh);
  }, [userId, fetchDeletionStatus]);

  const handleCancelDeletion = async () => {
    if (!confirm('Are you sure you want to cancel your account deletion request?')) {
      return;
    }

    setIsCancelling(true);
    setError(null);
    try {
      const response = await fetch('/api/account/deletion-request', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel deletion request');
      }

      setDeletionRequest(null);
    } catch (err: unknown) {
      console.error('Error cancelling deletion request:', err);
      setError((err as Error).message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 p-3 rounded-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded-sm w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded-sm w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-sm">
        <p className="text-sm">Error loading deletion status: {error}</p>
      </div>
    );
  }

  if (deletionRequest) {
    const { daysRemaining, scheduled_deletion_date, reason } = deletionRequest;
    const isUrgent = daysRemaining <= 7;
    const isVeryUrgent = daysRemaining <= 3;

    const getUrgencyStyles = () => {
      if (isVeryUrgent) {
        return {
          container: 'bg-red-50 border-red-200',
          title: 'text-red-800',
          text: 'text-red-700',
          subText: 'text-red-600',
          warningBox: 'bg-red-100 border-red-300',
          warningText: 'text-red-800',
          button: 'bg-red-600 text-white hover:bg-red-700',
        };
      }
      if (isUrgent) {
        return {
          container: 'bg-orange-50 border-orange-200',
          title: 'text-orange-800',
          text: 'text-orange-700',
          subText: 'text-orange-600',
          warningBox: 'bg-orange-100 border-orange-300',
          warningText: 'text-orange-800',
          button: 'bg-orange-600 text-white hover:bg-orange-700',
        };
      }
      return {
        container: 'bg-yellow-50 border-yellow-200',
        title: 'text-yellow-800',
        text: 'text-yellow-700',
        subText: 'text-yellow-600',
        warningBox: 'bg-yellow-100 border-yellow-300',
        warningText: 'text-yellow-800',
        button: 'bg-yellow-600 text-white hover:bg-yellow-700',
      };
    };

    const styles = getUrgencyStyles();

    return (
      <div className={`p-4 rounded border ${styles.container}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className={`font-semibold mb-2 ${styles.title}`}>⚠️ Account Deletion Scheduled</h3>

            <div className="space-y-2 text-sm">
              <p className={styles.text}>
                <strong>Days remaining:</strong> {daysRemaining} day{daysRemaining === 1 ? '' : 's'}
              </p>

              <p className={styles.subText}>
                <strong>Scheduled deletion:</strong>{' '}
                {new Date(scheduled_deletion_date).toLocaleDateString()}
              </p>

              {reason && (
                <p className={styles.subText}>
                  <strong>Reason:</strong> {reason}
                </p>
              )}

              <div className={`mt-3 p-2 rounded border ${styles.warningBox}`}>
                <p className={`text-xs font-medium ${styles.warningText}`}>
                  ⚠️ <strong>Important:</strong> After deletion, you will not be able to recreate an
                  account with the same email address.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleCancelDeletion}
            disabled={isCancelling || deletionRequest.status === 'processing'}
            className={`px-3 py-1 text-sm rounded font-medium transition-colors ${styles.button} disabled:opacity-50`}
          >
            {deletionRequest.status === 'processing'
              ? 'Deletion in progress'
              : isCancelling
                ? 'Cancelling...'
                : 'Cancel Deletion'}
          </button>
        </div>

        {isVeryUrgent && (
          <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded-sm">
            <p className="text-xs text-red-800 font-medium">
              🚨 Your account will be deleted very soon! If you want to keep your account, cancel
              the deletion request now.
            </p>
          </div>
        )}
      </div>
    );
  }

  return null; // No pending deletion request
}
