import { STORAGE_CONFIG } from "@/config/storage";
import { MockHttpProvider } from "@/lib/storage";
import { Agent } from "@/types/agent";
import { AgentDataProvider } from "@/types/storage";

export class AgentService {
  constructor(private provider: AgentDataProvider) {}

  async listAgents(): Promise<Agent[]> {
    return this.provider.list();
  }

  async getAgent(id: string): Promise<Agent> {
    return this.provider.get(id);
  }

  async createAgent(data: Omit<Agent, "id">): Promise<Agent> {
    // 这里可以添加业务验证逻辑
    if (!data.name) {
      throw new Error("Agent name is required");
    }

    const result = await this.provider.create(data);
    return result;
  }

  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    const result = await this.provider.update(id, data);
    return result;
  }

  /**
   * 切换指定Agent的精简模式状态
   * @param id Agent ID
   * @param enabled 是否启用精简模式，不提供则切换当前状态
   * @returns 更新后的Agent对象
   */
  async toggleAgentConciseMode(id: string, enabled?: boolean): Promise<Agent> {
    // 获取当前agent
    const agent = await this.getAgent(id);
    
    // 确定新的精简模式状态
    const newConciseMode = enabled !== undefined ? enabled : !agent.conciseMode;
    
    // 更新agent的精简模式状态
    return this.updateAgent(id, {
      ...agent,
      conciseMode: newConciseMode
    });
  }

  /**
   * 批量更新多个Agent的精简模式状态
   * @param ids Agent ID数组
   * @param enabled 是否启用精简模式
   * @returns 更新的Agent数量
   */
  async updateAgentsConciseMode(ids: string[], enabled: boolean): Promise<number> {
    const updatePromises = ids.map(id => 
      this.toggleAgentConciseMode(id, enabled)
    );
    
    const results = await Promise.all(updatePromises);
    return results.length;
  }

  async deleteAgent(id: string): Promise<void> {
    await this.provider.delete(id);
  }
  // 工具方法
  createDefaultAgent(): Omit<Agent, "id"> {
    const seed = Date.now().toString();
    return {
      name: "新成员",
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c7f2a4,f4d4d4`,
      prompt: "请在编辑时设置该成员的具体职责和行为方式。",
      role: "participant",
      personality: "待设置",
      expertise: [],
      bias: "待设置",
      responseStyle: "待设置",
      conciseMode: false, // 默认不启用精简模式
    };
  }
}

export const agentService = new AgentService(
  new MockHttpProvider<Agent>(
    STORAGE_CONFIG.KEYS.AGENTS,
    { delay: STORAGE_CONFIG.MOCK_DELAY_MS }
  )
);

/**
 * 提供AgentService实例的React Hook
 * @returns AgentService实例
 */
export function useAgentService() {
  return agentService;
}