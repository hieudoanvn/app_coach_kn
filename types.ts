
export enum SenderType {
  User = 'user',
  AI = 'ai',
}

export interface Message {
  id: string;
  text: string;
  sender: SenderType;
  timestamp: Date;
  isLoading?: boolean; // For streaming AI responses
}
