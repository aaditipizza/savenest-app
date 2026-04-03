import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jzmwljbgnaygdpzuxgy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4eZxRpJZOErYVIx6rlNpYA_VMaO5aUJ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface SavingsData {
  savings_amount: number;
  goal_amount: number;
}

/**
 * Inserts savings data into the "Savings" table in Supabase.
 * @param data The savings data to insert.
 * @returns A promise that resolves to the response from Supabase.
 */
export const insertSavingsData = async (data: SavingsData) => {
  try {
    const { data: result, error } = await supabase
      .from('Savings')
      .insert([data])
      .select();

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log('Savings data successfully stored in Supabase:', result);
    
    // Optional: Trigger Zapier Webhook
    // If you have a Zapier webhook URL, you can call it here.
    // triggerZapierWebhook(data);

    return result;
  } catch (error) {
    console.error('Failed to store savings data in Supabase:', error);
    throw error;
  }
};

/**
 * Optional: Triggers a Zapier Webhook.
 * @param data The data to send to Zapier.
 */
export const triggerZapierWebhook = async (data: SavingsData) => {
  const ZAPIER_WEBHOOK_URL = import.meta.env.VITE_ZAPIER_WEBHOOK_URL;
  
  if (!ZAPIER_WEBHOOK_URL) {
    console.warn('Zapier Webhook URL is not configured. Skipping Zapier trigger.');
    return;
  }

  try {
    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Zapier webhook triggered:', response.status);
  } catch (error) {
    console.error('Failed to trigger Zapier webhook:', error);
  }
};
