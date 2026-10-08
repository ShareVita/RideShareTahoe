/** @jest-environment node */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!['localhost', '127.0.0.1'].includes(new URL(url).hostname))
  throw new Error('Local fixtures only');
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const env = {
  NODE_ENV: 'test' as const,
  PATH: process.env.PATH,
  PGHOST: new URL(url).hostname,
  PGPORT: '54322',
  PGUSER: 'postgres',
  PGDATABASE: 'postgres',
  PGPASSWORD: 'postgres',
  PGSSLMODE: 'disable',
};
const args = ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'];
const users: string[] = [];
const processes: { child: ChildProcessWithoutNullStreams; exit: Promise<number | null> }[] = [];
const must = (result: { error: unknown }) => {
  if (result.error) throw result.error;
};
function sql(input: string) {
  const result = spawnSync('psql', args, { input, env, encoding: 'utf8', timeout: 5000 });
  if (result.status !== 0) throw new Error('Local SQL failed');
  return result.stdout.trim();
}
function session(input: string) {
  const child = spawn('psql', args, { env });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', () => {});
  const exit = new Promise<number | null>((resolve) => child.on('exit', resolve));
  child.stdin.write(`SELECT pg_backend_pid(); SET statement_timeout='15s'; ${input}\n`);
  const result = { child, exit, output: () => output, pid: () => Number(output.split('\n')[0]) };
  processes.push(result);
  return result;
}
async function until(check: () => boolean) {
  const deadline = Date.now() + 8000;
  while (!check()) {
    if (Date.now() >= deadline) throw new Error('Database barrier not reached');
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
async function fixture() {
  const email = `retention-race-${crypto.randomUUID()}@example.test`;
  const password = 'DisposableRetentionRacePassword123!';
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  must(created);
  const id = created.data.user!.id;
  users.push(id);
  const member = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  must(await member.auth.signInWithPassword({ email, password }));
  return { id, member };
}
function insert(sender: string, recipient: string) {
  // The real GoTrue member above supplies this identity. SET ROLE exercises
  // the same member RLS/trigger boundary while permitting deterministic barriers.
  return `BEGIN; SET LOCAL ROLE authenticated;
    SELECT set_config('request.jwt.claim.sub','${sender}',true),
      set_config('request.jwt.claim.role','authenticated',true),
      set_config('request.jwt.claims','{"sub":"${sender}","role":"authenticated"}',true);
    INSERT INTO public.messages(sender_id,recipient_id,content)
      VALUES('${sender}','${recipient}','Private in-flight authored text'); COMMIT;`;
}
afterEach(async () => {
  for (const process of processes) if (!process.child.stdin.destroyed) process.child.stdin.end();
  await Promise.all(processes.map((process) => process.exit));
  processes.length = 0;
  sql(
    'DROP TRIGGER IF EXISTS pause_retention_race_message ON public.messages; DROP FUNCTION IF EXISTS public.pause_retention_race_message();'
  );
  for (const id of users) {
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error?.code !== 'user_not_found') must(deleted);
    must(await admin.from('profiles').delete().eq('id', id));
  }
  users.length = 0;
});

it('real GoTrue deletion waits for an accepted in-flight write and then redacts it', async () => {
  const author = await fixture();
  const survivor = await fixture();
  const key = 729314;
  sql(`CREATE FUNCTION public.pause_retention_race_message() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.sender_id='${author.id}'::uuid THEN PERFORM pg_advisory_xact_lock(${key}); END IF; RETURN NEW; END $$;
    CREATE TRIGGER pause_retention_race_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.pause_retention_race_message();`);
  const holder = session(`SELECT pg_advisory_lock(${key}); SELECT 'held';`);
  await until(() => holder.output().includes('held'));
  const writer = session(insert(author.id, survivor.id));
  await until(
    () =>
      Number.isFinite(writer.pid()) &&
      sql(
        `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=${writer.pid()} AND wait_event='advisory');`
      ) === 't'
  );
  const deletion = admin.auth.admin.deleteUser(author.id);
  await until(
    () =>
      sql(
        `SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE usename='supabase_auth_admin' AND ${writer.pid()}=ANY(pg_blocking_pids(pid)));`
      ) === 't'
  );
  holder.child.stdin.end(`SELECT pg_advisory_unlock(${key});\n`);
  writer.child.stdin.end();
  expect(await writer.exit).toBe(0);
  must(await deletion);
  const messages = await survivor.member
    .from('messages')
    .select('content')
    .eq('sender_id', author.id);
  must(messages);
  expect(messages.data).toEqual([{ content: '[Message removed]' }]);
}, 20000);

it('a write whose live-account snapshot predates deletion cannot commit after deletion wins', async () => {
  const author = await fixture();
  const survivor = await fixture();
  const deletion = session(
    `BEGIN; DELETE FROM auth.users WHERE id='${author.id}'; SELECT 'deleted before commit';`
  );
  await until(() => deletion.output().includes('deleted before commit'));
  const writer = session(insert(author.id, survivor.id));
  await until(
    () =>
      Number.isFinite(writer.pid()) &&
      sql(`SELECT ${deletion.pid()}=ANY(pg_blocking_pids(${writer.pid()}));`) === 't'
  );
  deletion.child.stdin.end('COMMIT;\n');
  expect(await deletion.exit).toBe(0);
  writer.child.stdin.end();
  expect(await writer.exit).not.toBe(0);
  expect((await admin.from('messages').select('id').eq('sender_id', author.id)).data).toEqual([]);
}, 20000);
