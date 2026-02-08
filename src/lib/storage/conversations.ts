const STORAGE_KEY = 'okeyo_conversations';

export interface StoredConversation {
  id: string;
  title: string | null;
  first_message: string | null;
  messages: any[];
  created_at: string;
  updated_at: string;
}

export function getStoredConversations(): StoredConversation[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load stored conversations:', error);
    return [];
  }
}

export function saveConversation(conversation: StoredConversation): void {
  if (typeof window === 'undefined') return;

  try {
    const conversations = getStoredConversations();
    const existingIndex = conversations.findIndex((c) => c.id === conversation.id);

    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.unshift(conversation);
    }

    // Keep only last 50 conversations
    const trimmed = conversations.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
}

export function getStoredConversation(id: string): StoredConversation | null {
  const conversations = getStoredConversations();
  return conversations.find((c) => c.id === id) || null;
}

export function deleteStoredConversation(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const conversations = getStoredConversations();
    const filtered = conversations.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
}

export function clearStoredConversations(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
