export interface Agent {
  id: string;
  name: string;
  avatar: string;
  prompt: string;
  role: 'moderator' | 'participant';
  personality: string;
  expertise: string[];
  bias: string;
  responseStyle: string;
  conciseMode?: boolean; // 用于单独控制每个agent的精简模式
  _id?: string; // Optional ID field to support legacy code references
}

export interface CombinationParticipant {
  name: string;
  description?: string;
}

export interface AgentCombination {
  name: string;
  description: string;
  moderator: CombinationParticipant;
  participants: CombinationParticipant[];
}