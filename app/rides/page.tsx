import { redirect } from 'next/navigation';

/** Keep the rides entry point aligned with the public ride browser. */
export default function RidesPage() {
  redirect('/rides/find');
}
