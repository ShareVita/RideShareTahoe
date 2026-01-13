'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/libs/supabase';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { validateUUID } from '@/libs/validation';

import ReportModal from '@/components/ReportModal';
import toast from 'react-hot-toast';

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string | null;
}

interface Ride {
  id: string;
  title?: string | null;
  start_location: string;
  end_location: string;
  departure_date: string;
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  participant1?: Participant | null;
  participant2?: Participant | null;
  ride?: Ride | null;
  last_message_at?: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
}

interface BookingRequest {
  id: string;
  ride_id: string;
  driver_id: string;
  passenger_id: string;
  status: 'pending' | 'invited';
  pickup_location?: string | null;
  pickup_time?: string | null;
  driver?: Participant | null;
  passenger?: Participant | null;
  booking_id?: string | null;
}

/**
 * Safely constructs a PostgREST .or() filter string with validated UUID parameters.
 * This prevents injection attacks by validating that all IDs are proper UUIDs before interpolation.
 *
 * @param userId - The authenticated user's ID (must be a valid UUID)
 * @param otherId - The other participant's ID (must be a valid UUID)
 * @param field1 - The first field name for the filter (e.g., 'sender_id', 'driver_id')
 * @param field2 - The second field name for the filter (e.g., 'recipient_id', 'passenger_id')
 * @returns A validated filter string safe for use in .or()
 * @throws Error if either ID fails UUID validation
 */
function buildSafeOrFilter(
  userId: string,
  otherId: string,
  field1: string,
  field2: string
): string {
  // Validate both IDs are proper UUIDs before using them in the query
  validateUUID(userId, 'userId');
  validateUUID(otherId, 'otherId');

  // After validation, we can safely interpolate the UUIDs
  return `and(${field1}.eq.${userId},${field2}.eq.${otherId}),and(${field1}.eq.${otherId},${field2}.eq.${userId})`;
}

/**
 * Displays the authenticated user's messaging dashboard, including conversations and the thread view.
 */
export default function MessagesPage() {
  const { user, isLoading: authLoading } = useProtectedRoute();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<null | string>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [bookingRequestsLoading, setBookingRequestsLoading] = useState(false);
  const [bookingActionLoadingIds, setBookingActionLoadingIds] = useState<string[]>([]);
  const [rideRequestsExpanded, setRideRequestsExpanded] = useState(true);
  const requestCountLabel =
    bookingRequests.length === 1 ? '1 request' : `${bookingRequests.length} requests`;
  const rideRequestToggleLabel = rideRequestsExpanded ? 'Hide ride requests' : 'Show ride requests';
  const rideRequestDetailsToggleText = `${rideRequestToggleLabel} (${requestCountLabel})`;

  const currentConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  const otherParticipant = useMemo<Participant | null>(() => {
    if (!currentConversation || !user) {
      return null;
    }

    if (currentConversation.participant1_id === user.id) {
      return currentConversation.participant2 ?? null;
    }

    return currentConversation.participant1 ?? null;
  }, [currentConversation, user]);

  const otherParticipantName = useMemo(() => {
    if (!otherParticipant) {
      return 'Conversation';
    }
    return `${otherParticipant.first_name} ${otherParticipant.last_name}`;
  }, [otherParticipant]);

const hasActiveOrPendingTrip = true; // Allow messaging without booking
  
  const loadConversations = useCallback(async () => {
    if (!user) {
      return;
    }

    setConversationsLoading(true);
    setFetchError(null);

    try {
      // Validate user ID before using it in the query
      validateUUID(user.id, 'user.id');

      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          participant1:profiles!conversations_participant1_id_fkey(id, first_name, last_name, profile_photo_url),
          participant2:profiles!conversations_participant2_id_fkey(id, first_name, last_name, profile_photo_url),
          ride:rides(id, title, start_location, end_location, departure_date)
        `
        )
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        throw error;
      }

      const safeData = (Array.isArray(data) ? data : []) as unknown as Conversation[];
      setConversations(safeData);
      setSelectedConversationId((previous) => previous ?? safeData[0]?.id ?? null);
    } catch (error) {
      console.error('Unable to load conversations', error);
      setFetchError('Unable to load conversations right now.');
    } finally {
      setConversationsLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!currentConversation || !user) {
      setMessages([]);
      return;
    }

    const otherId =
      currentConversation.participant1_id === user.id
        ? currentConversation.participant2_id
        : currentConversation.participant1_id;

    if (!otherId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);

    try {
      // Build a safe filter with validated UUIDs
      const filter = buildSafeOrFilter(user.id, otherId, 'sender_id', 'recipient_id');

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(filter)
        .eq('conversation_id', currentConversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Unable to load messages', error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [currentConversation, user]);

  const fetchBookingRequests = useCallback(async () => {
    if (!currentConversation || !user) {
      setBookingRequests([]);
      return;
    }

    const otherId =
      currentConversation.participant1_id === user.id
        ? currentConversation.participant2_id
        : currentConversation.participant1_id;

    if (!otherId) {
      setBookingRequests([]);
      return;
    }

    setBookingRequestsLoading(true);

    try {
      // Build a safe filter with validated UUIDs
      const filter = buildSafeOrFilter(user.id, otherId, 'driver_id', 'passenger_id');

      let requestQuery = supabase
        .from('trip_bookings')
        .select(
          `id, ride_id, status, pickup_location, pickup_time, driver_id, passenger_id,
          driver:profiles!trip_bookings_driver_id_fkey(id, first_name, last_name),
          passenger:profiles!trip_bookings_passenger_id_fkey(id, first_name, last_name)`
        )
        .or(filter)
        .in('status', ['pending', 'invited']);

      if (currentConversation.ride?.id) {
        requestQuery = requestQuery.eq('ride_id', currentConversation.ride.id);
      } else {
        requestQuery = requestQuery.is('ride_id', null);
      }

      const { data, error } = await requestQuery.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setBookingRequests(
        Array.isArray(data)
          ? data.map((item) => {
              const bookingIdFromRow = (item as { booking_id?: string | null }).booking_id;
              return {
                ...item,
                booking_id: bookingIdFromRow ?? item.id ?? null,
                driver: Array.isArray(item.driver)
                  ? (item.driver[0] ?? null)
                  : (item.driver ?? null),
                passenger: Array.isArray(item.passenger)
                  ? (item.passenger[0] ?? null)
                  : (item.passenger ?? null),
              };
            })
          : []
      );
    } catch (error) {
      console.error('Unable to load booking requests', error);
      setBookingRequests([]);
    } finally {
      setBookingRequestsLoading(false);
    }
  }, [currentConversation, user]);

  useEffect(() => {
    if (!user || authLoading) {
      return;
    }
    loadConversations();
  }, [authLoading, loadConversations, user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setRideRequestsExpanded(window.innerWidth >= 768);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    fetchBookingRequests();
  }, [fetchBookingRequests]);

  useEffect(() => {
    if (!user || authLoading) return;

    const markAllMessagesRead = async () => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all messages as read:', error);
      }
    };

    markAllMessagesRead();
  }, [authLoading, user]);

  const markMessagesAsRead = useCallback(async () => {
    if (!currentConversation || !user) {
      return;
    }

    const unreadMessages = messages.filter((m) => !m.is_read && m.sender_id !== user.id);

    if (unreadMessages.length === 0) {
      return;
    }

    // Optimistically mark as read locally to prevent loop
    setMessages((prev) => prev.map((m) => (m.sender_id === user.id ? m : { ...m, is_read: true })));

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', currentConversation.id)
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [currentConversation, user, messages]);

  useEffect(() => {
    if (user && messages.some((m) => !m.is_read && m.sender_id !== user.id)) {
      markMessagesAsRead();
    }
  }, [markMessagesAsRead, messages, user]);

  useEffect(() => {
    if (!currentConversation) {
      return;
    }

    const channel = supabase.channel('messages-page');
    const listener = channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      () => {
        loadMessages();
      }
    );
    const subscription = listener.subscribe();

    return () => {
      subscription?.unsubscribe?.();
      supabase.removeChannel(channel);
    };
  }, [currentConversation, loadMessages]);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasActiveOrPendingTrip || !messageInput.trim() || !user || !currentConversation) {
      return;
    }

    const content = messageInput.trim();
    const tempId = `local-${Date.now()}`;

    // Optimistic update
    setMessages((existing) => [
      ...existing,
      {
        id: tempId,
        sender_id: user.id,
        recipient_id: otherParticipant?.id ?? '',
        content: content,
        created_at: new Date().toISOString(),
      },
    ]);
    setMessageInput('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: otherParticipant?.id,
          content: content,
          ride_post_id: currentConversation.ride?.id, // Pass ride_id to associate message
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Refresh messages to get the real ID and any other updates
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      // Revert optimistic update or show error
      // For now, we just log it. In a real app, we'd show a toast or retry.
    }
  };

  const handleBookingAction = useCallback(
    async (bookingId: string, action: 'approve' | 'deny' | 'cancel') => {
      if (!bookingId) {
        console.error('Booking ID is required to update booking request');
        return;
      }

      setBookingActionLoadingIds((prev) => [...prev, bookingId]);

      try {
        const response = await fetch(`/api/trips/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        const payload = await response.json();

        if (!response.ok) {
          const failureMessage = payload.error || 'Unable to update booking request';
          throw new Error(failureMessage);
        }

        await fetchBookingRequests();
        await loadMessages();
        if (action === 'cancel') {
          toast.success('Ride request canceled.');
        }
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        }
        console.error('Error responding to booking request:', error);
      } finally {
        setBookingActionLoadingIds((prev) => prev.filter((id) => id !== bookingId));
      }
    },
    [fetchBookingRequests, loadMessages]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-4 border-blue-600 border-b-transparent animate-spin" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
        <aside className="w-full space-y-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 p-5 shadow-xl lg:w-80 border border-white/20 dark:border-slate-800">
          <header>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Conversations</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(() => {
                if (conversations.length === 0 && !conversationsLoading) {
                  return 'Start a conversation to stay in touch.';
                }
                const pluralSuffix = conversations.length === 1 ? '' : 's';
                return `${conversations.length} conversation${pluralSuffix}`;
              })()}
            </p>
          </header>

          {conversationsLoading && (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading conversations...</div>
          )}

          {fetchError && <div className="text-sm text-red-600 dark:text-red-400">{fetchError}</div>}

          {!conversationsLoading && conversations.length === 0 && (
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              No conversations yet
            </p>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {conversations.map((conversation) => {
                const other =
                  conversation.participant1_id === user?.id
                    ? conversation.participant2
                    : conversation.participant1;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`text-left rounded-2xl border px-4 py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${
                      conversation.id === selectedConversationId
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'border-transparent bg-white dark:bg-slate-800 hover:border-blue-100 dark:hover:border-slate-700 hover:bg-blue-50/60 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {other ? `${other.first_name} ${other.last_name}` : 'Conversation'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {conversation.ride?.title ||
                        (conversation.ride
                          ? `${conversation.ride.start_location} to ${conversation.ride.end_location}`
                          : 'Community chat')}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 p-6 shadow-xl border border-white/20 dark:border-slate-800">
          {currentConversation ? (
            <>
              <header className="flex flex-col gap-4 border-b border-gray-100 dark:border-slate-800 pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">
                      Conversation
                    </p>
                    <div className="space-y-1">
                      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {otherParticipantName}
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {currentConversation.ride?.title ||
                          (currentConversation.ride
                            ? `${currentConversation.ride.start_location} to ${currentConversation.ride.end_location}`
                            : 'Closed-loop message thread')}
                      </p>
                    </div>
                  </div>
                  {otherParticipant && (
                    <div className="flex flex-col items-end gap-2">
                      <a
                        href={`/profile/${otherParticipant.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        View Profile
                      </a>
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                      >
                        Report
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pb-4 w-full">
                  <div className="space-y-2 w-full">
                    <div className="flex flex-col gap-2 w-full">
                      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        Ride requests
                      </h2>
                      {bookingRequests.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setRideRequestsExpanded((prev) => !prev)}
                          aria-pressed={rideRequestsExpanded}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/80 px-4 py-3 text-left text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-blue-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/60 dark:focus-visible:ring-offset-slate-900"
                        >
                          <span className="flex-1 pr-3">{rideRequestDetailsToggleText}</span>
                          <span className="text-xs font-normal text-blue-600 dark:text-blue-200">
                            {rideRequestsExpanded ? 'Collapse' : 'Expand'}
                          </span>
                        </button>
                      )}
                    </div>

                    {bookingRequestsLoading && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Loading ride requests…
                      </p>
                    )}
                    {!bookingRequestsLoading &&
                      bookingRequests.length > 0 &&
                      rideRequestsExpanded && (
                        <div className="space-y-3">
                          {bookingRequests.map((request) => {
                            const bookingId = request.id ?? request.booking_id;
                            const isUserDriver = request.driver_id === user?.id;
                            const canAct = isUserDriver
                              ? request.status === 'pending'
                              : request.status === 'invited';
                            const canCancelRequest = !isUserDriver && request.status === 'pending';
                            const otherPersonName = isUserDriver
                              ? `${request.passenger?.first_name ?? 'Passenger'} ${request.passenger?.last_name ?? ''}`.trim()
                              : `${request.driver?.first_name ?? 'Driver'} ${request.driver?.last_name ?? ''}`.trim();
                            const pickupTime = request.pickup_time
                              ? new Date(request.pickup_time).toLocaleTimeString([], {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'TBD';
                            const actionInProgress = bookingId
                              ? bookingActionLoadingIds.includes(bookingId)
                              : false;

                            return (
                              <div
                                key={
                                  bookingId ??
                                  request.ride_id ??
                                  `${request.driver_id}-${request.passenger_id}`
                                }
                                className="w-fit max-w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-4 shadow-sm"
                              >
                                <div className="flex items-center">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {otherPersonName || 'Passenger'} •{' '}
                                    {request.status === 'pending' ? 'Pending' : 'Invited'}
                                  </p>
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  Pickup: {request.pickup_location ?? 'TBD'} at {pickupTime}
                                </p>
                                {canAct && bookingId && (
                                  <div className="mt-3 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleBookingAction(bookingId, 'approve')}
                                      disabled={actionInProgress}
                                      className="flex-1 rounded-2xl border border-blue-400 bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 transition disabled:opacity-70"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleBookingAction(bookingId, 'deny')}
                                      disabled={actionInProgress}
                                      className="flex-1 rounded-2xl border border-red-400 bg-red-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-600 transition disabled:opacity-70"
                                    >
                                      Deny
                                    </button>
                                  </div>
                                )}
                                {canCancelRequest && bookingId && (
                                  <div className="mt-3">
                                    <button
                                      type="button"
                                      onClick={() => handleBookingAction(bookingId, 'cancel')}
                                      disabled={actionInProgress}
                                      className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition disabled:opacity-70"
                                    >
                                      Cancel request
                                    </button>
                                  </div>
                                )}
                                {!bookingId && (
                                  <p className="mt-2 text-xs text-red-600">
                                    Booking ID missing for this request.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    {!bookingRequestsLoading &&
                      bookingRequests.length > 0 &&
                      !rideRequestsExpanded && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ride requests are hidden.
                        </p>
                      )}
                    {!bookingRequestsLoading && bookingRequests.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No pending ride requests.
                      </p>
                    )}
                  </div>
                </div>
              </header>

              <div className="flex flex-col gap-4" aria-live="polite">
                {messagesLoading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages…</p>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet</p>
                )}

                <div className="flex max-h-[55vh] min-h-[180px] flex-col gap-3 overflow-y-auto px-1 sm:max-h-[420px] lg:max-h-[480px]">
                  {messages.map((message) => {
                    const isCurrentUser = message.sender_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`message-bubble max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
                          ${
                            isCurrentUser
                              ? 'self-end bg-blue-600 text-white'
                              : 'self-start bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100'
                          }`}
                      >
                        <p className="wrap-break-words">{message.content}</p>
                        <p className="mt-2 text-xs text-white/70 dark:text-gray-400">
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form
                className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={handleSendMessage}
              >
                <textarea
                  rows={2}
                  className="flex-1 min-h-[120px] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Type your message..."
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  disabled={!hasActiveOrPendingTrip}
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={!messageInput.trim() || !hasActiveOrPendingTrip}
                >
                  Send
                </button>
              </form>
            
            </>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3 py-12">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Select a conversation
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pick a conversation from the list to open the thread.
              </p>
            </div>
          )}
        </section>

        {otherParticipant && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            reportedUserId={otherParticipant.id}
            reportedUserName={`${otherParticipant.first_name} ${otherParticipant.last_name}`}
          />
        )}
      </div>
    </div>
  );
}
