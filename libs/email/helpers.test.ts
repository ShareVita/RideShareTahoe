import type { createAdminClient } from '@/lib/supabase/server';
import { getEmailsByUserId, getUsersWithEmails } from './helpers';

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * A minimal stand-in for the two PostgREST reads the helpers make: a paged
 * profiles listing and `user_private_info` lookups by id.
 */
const emailFromId = (userId: string): string | null => `${userId}@example.test`;

function fakeAdminClient(profileCount: number, emailFor: typeof emailFromId) {
  const profiles = Array.from({ length: profileCount }, (_, index) => ({
    id: `user-${String(index).padStart(5, '0')}`,
    first_name: `First${index}`,
    last_name: null,
  }));
  const privateInfoRequests: string[][] = [];

  const client = {
    from(table: string) {
      if (table === 'profiles') {
        const query = {
          select: () => query,
          eq: () => query,
          order: () => query,
          range: async (from: number, to: number) => ({
            data: profiles.slice(from, to + 1),
            error: null,
          }),
        };
        return query;
      }
      return {
        select: () => ({
          in: async (_column: string, ids: string[]) => {
            privateInfoRequests.push(ids);
            return { data: ids.map((id) => ({ id, email: emailFor(id) })), error: null };
          },
        }),
      };
    },
  } as unknown as AdminClient;

  return { client, privateInfoRequests };
}

describe('email lookups', () => {
  it('returns every member past the 1000-row page limit', async () => {
    const { client } = fakeAdminClient(1182, emailFromId);

    const users = await getUsersWithEmails(client, { excludeBanned: true });

    expect(users).toHaveLength(1182);
    expect(users[1181]).toEqual({
      id: 'user-01181',
      first_name: 'First1181',
      last_name: null,
      email: 'user-01181@example.test',
    });
  });

  it('skips members without a usable email', async () => {
    const { client } = fakeAdminClient(3, (id) => (id === 'user-00001' ? '   ' : null));

    expect(await getUsersWithEmails(client)).toEqual([]);
  });

  it('looks up ids in bounded chunks', async () => {
    const { client, privateInfoRequests } = fakeAdminClient(0, emailFromId);
    const ids = Array.from({ length: 250 }, (_, index) => `id-${index}`);

    const emails = await getEmailsByUserId(client, ids);

    expect(emails.size).toBe(250);
    expect(privateInfoRequests.map((chunk) => chunk.length)).toEqual([100, 100, 50]);
  });
});
