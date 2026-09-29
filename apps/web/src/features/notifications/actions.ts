'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { requireViewer } from '@/server/viewer';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marca un aviso como visto. RLS solo deja tocar los propios; la fecha la pone la base. */
export async function markNoticeRead(noticeId: string): Promise<void> {
  await requireViewer('/clientes');
  if (!UUID.test(noticeId)) return;
  const supabase = await createClient();
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', noticeId)
    .is('read_at', null);
  revalidatePath('/clientes');
}
