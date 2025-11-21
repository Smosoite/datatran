import { supabase } from './supabase';

type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTOCK' | 'REMOVE' | 'COUNT_UPDATE';

interface LogParams {
  workgroup_id: string;
  item_id?: string;
  item_name: string;
  action: LogAction;
  change_amount?: number;
  final_quantity?: number;
}

export const logActivity = async (params: LogParams) => {
  try {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('activity_logs').insert({
      workgroup_id: params.workgroup_id,
      user_id: session.user.id,
      item_id: params.item_id,
      item_name: params.item_name,
      action: params.action,
      change_amount: params.change_amount,
      final_quantity: params.final_quantity,
    });

    if (error) throw error;
  } catch (error) {
    // We fail silently in the UI for logs, but log to console
    console.error('Logging failed:', error);
  }
};