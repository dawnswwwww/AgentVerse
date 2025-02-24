import { DEFAULT_SETTINGS } from "@/config/settings";
import { BaseAgent, ChatAgent } from "@/lib/agent";
import { CapabilityRegistry } from "@/lib/capabilities";
import {
  DiscussionEnvBus,
  DiscussionKeys,
} from "@/lib/discussion/discussion-env";
import { RxEvent } from "@/lib/rx-event";
import {
  agentListResource,
  discussionMembersResource,
  messagesResource,
} from "@/resources";
import { discussionCapabilitiesResource } from "@/resources/discussion-capabilities.resource";
import { discussionMemberService } from "@/services/discussion-member.service";
import { messageService } from "@/services/message.service";
import { typingIndicatorService } from "@/services/typing-indicator.service";
import { AgentMessage, NormalMessage } from "@/types/discussion";
import { DiscussionMember } from "@/types/discussion-member";
import { createNestedBean, createProxyBean } from "rx-nested-bean";
import { agentSelector } from "./agent-selector.service";
import {
  DiscussionError,
  DiscussionErrorType,
  handleDiscussionError,
} from "./discussion-error.util";

class TimeoutManager {
  private timeouts = new Set<NodeJS.Timeout>();

  schedule(fn: () => void, delay: number) {
    const timeout = setTimeout(() => {
      fn();
      this.timeouts.delete(timeout);
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  clearAll() {
    this.timeouts.forEach(clearTimeout);
    this.timeouts.clear();
  }
}

export class DiscussionControlService {
  store = createNestedBean({
    messages: [] as AgentMessage[],
    isPaused: true,
    currentDiscussionId: null as string | null,
    settings: DEFAULT_SETTINGS,
    currentRound: 0,
    currentSpeakerIndex: -1,
    members: [] as DiscussionMember[],
    topic: "",
  });

  onError$ = new RxEvent<Error>();
  onCurrentDiscussionIdChange$ = new RxEvent<string | null>();

  private messagesBean = createProxyBean(this.store, "messages");
  isPausedBean = createProxyBean(this.store, "isPaused");
  private settingsBean = createProxyBean(this.store, "settings");
  currentDiscussionIdBean = createProxyBean(this.store, "currentDiscussionId");
  private currentRoundBean = createProxyBean(this.store, "currentRound");
  private currentSpeakerIndexBean = createProxyBean(
    this.store,
    "currentSpeakerIndex"
  );
  private membersBean = createProxyBean(this.store, "members");
  private topicBean = createProxyBean(this.store, "topic");

  private timeoutManager = new TimeoutManager();
  private agents: Map<string, BaseAgent> = new Map();
  env: DiscussionEnvBus;

  // 生命周期管理
  private serviceCleanupHandlers: Array<() => void> = []; // 服务级清理
  private discussionCleanupHandlers: Array<() => void> = []; // 讨论级清理
  private runtimeCleanupHandlers: Array<() => void> = []; // 运行时清理

  constructor() {
    this.env = new DiscussionEnvBus();
    this.initializeService();
  }

  // 服务级初始化
  private initializeService() {
    // 1. 注册能力
    discussionCapabilitiesResource.whenReady().then((data) => {
      CapabilityRegistry.getInstance().registerAll(data);
    });

    // 2. 监听成员变化
    const membersSub = this.membersBean.$.subscribe((members) => {
      this.syncAgentsWithMembers(members);
    });
    this.serviceCleanupHandlers.push(() => membersSub.unsubscribe());
  }

  private syncAgentsWithMembers(members: DiscussionMember[]) {
    // 移除不在 members 中的 agents
    for (const [agentId, agent] of this.agents) {
      if (!members.find((m) => m.agentId === agentId)) {
        agent.leaveEnv();
        this.agents.delete(agentId);
      }
    }

    // 更新或添加 agents
    for (const member of members) {
      const agentData = agentListResource
        .read()
        .data.find((agent) => agent.id === member.agentId)!;
      const existingAgent = this.agents.get(member.agentId);
      if (existingAgent) {
        // 更新现有 agent 的配置
        existingAgent.updateConfig({
          ...agentData,
        });
        // 更新状态
        existingAgent.updateState({
          autoReply: member.isAutoReply,
        });
      } else {
        // 创建新的 agent
        const agent = new ChatAgent(
          {
            ...agentData,
            agentId: member.agentId,
          },
          { autoReply: member.isAutoReply }
        );
        this.agents.set(member.agentId, agent);
        agent.enterEnv(this.env);
      }
    }
  }

  getCurrentDiscussionId(): string | null {
    return this.currentDiscussionIdBean.get();
  }

  getCurrentDiscussionId$() {
    return this.currentDiscussionIdBean.$;
  }

  setCurrentDiscussionId(id: string | null) {
    const oldId = this.currentDiscussionIdBean.get();
    if (oldId !== id) {
      // 1. 先清理当前讨论的所有状态
      this.cleanupCurrentDiscussion();

      // 2. 再设置新的讨论 ID
      this.currentDiscussionIdBean.set(id);
      this.onCurrentDiscussionIdChange$.next(id);
    }
  }

  private cleanupCurrentDiscussion() {
    // 1. 暂停当前讨论
    this.pause();

    // 2. 清理所有指示器
    typingIndicatorService.clearAll();

    // 3. 重置环境状态
    this.env.reset();
    this.env.speakScheduler.resetCounter();

    // 4. 清理所有代理状态
    for (const agent of this.agents.values()) {
      agent.pause();
      // agent.resetState();
    }

    // 5. 重置讨论相关状态
    this.currentRoundBean.set(0);
    this.currentSpeakerIndexBean.set(-1);
    this.isPausedBean.set(true);

    // 6. 执行讨论级清理
    this.discussionCleanupHandlers.forEach((cleanup) => cleanup());
    this.discussionCleanupHandlers = [];

    // 7. 清理运行时资源
    this.cleanupRuntime();
  }

  setMembers(members: DiscussionMember[]) {
    this.membersBean.set(members);
  }

  setMessages(messages: AgentMessage[]) {
    this.messagesBean.set(messages);
  }

  removeMember(memberId: string) {
    const members = this.membersBean.get();
    this.membersBean.set(members.filter((m) => m.agentId !== memberId));
  }

  setTopic(topic: string) {
    this.topicBean.set(topic);
  }

  getTopic() {
    return this.topicBean.get();
  }

  getRoundMessageCount() {
    return this.env.speakScheduler.messageCounterBean.get();
  }

  onMessage(message: AgentMessage) {
    this.env.eventBus.emit(DiscussionKeys.Events.message, message);
  }

  // 讨论级初始化
  private initializeDiscussion(topic: string): Promise<string[]> {
    // if (!topic) {
    //   throw new DiscussionError(DiscussionErrorType.NO_TOPIC, "未设置讨论主题");
    // }

    // 添加讨论级事件监听
    const thinkingOff = this.env.eventBus.on(
      DiscussionKeys.Events.thinking,
      (state) => {
        const { agentId, isThinking } = state;
        typingIndicatorService.updateStatus(
          agentId,
          isThinking ? "thinking" : null
        );
      }
    );
    this.discussionCleanupHandlers.push(thinkingOff);

    // 添加消息限制监听
    const scheduler = this.env.speakScheduler;
    const limitReachedOff = scheduler.onLimitReached$.listen(() => {
      // 添加系统消息
      const warningMessage: NormalMessage = {
        agentId: "system",
        content: `由于本轮消息数量达到限制（${scheduler.getRoundLimit()}条），讨论已自动暂停。这是为了避免自动对话消耗过多资源，您可手动重启对话。此为临时解决方案，后续会努力提供更合理的自动终止策略。`,
        type: "text",
        id: `system-${Date.now()}`,
        discussionId: this.getCurrentDiscussionId()!,
        timestamp: new Date(),
      };
      messageService.addMessage(
        this.currentDiscussionIdBean.get()!,
        warningMessage
      );
      messagesResource.current.reload();
      // 暂停讨论
      this.pause();
    });

    this.discussionCleanupHandlers.push(limitReachedOff);
    return this.selectParticipants(topic);
  }

  // 运行时控制
  pause() {
    // 1. 设置暂停状态
    this.isPausedBean.set(true);

    // 2. 暂停所有 agents
    for (const agent of this.agents.values()) {
      agent.pause();
    }

    // 3. 暂停调度器
    this.env.speakScheduler.setPaused(true);

    // 4. 发送讨论暂停事件
    this.env.eventBus.emit(DiscussionKeys.Events.discussionPause, null);

    // 5. 清理运行时资源
    this.cleanupRuntime();

    // 6. 重置计数器
    this.env.speakScheduler.resetCounter();
  }

  resume() {
    // 1. 设置恢复状态
    this.isPausedBean.set(false);

    // 2. 恢复调度器
    this.env.speakScheduler.setPaused(false);
    this.env.speakScheduler.resetCounter();

    // 3. 恢复所有 agents
    for (const agent of this.agents.values()) {
      agent.resume();
    }

    // 4. 发送讨论恢复事件
    this.env.eventBus.emit(DiscussionKeys.Events.discussionResume, null);
  }

  // 清理方法分层
  private cleanupRuntime() {
    // 清理运行时资源（定时器等）
    this.timeoutManager.clearAll();
    this.runtimeCleanupHandlers.forEach((cleanup) => cleanup());
    this.runtimeCleanupHandlers = [];
  }

  private cleanupDiscussion() {
    // 清理讨论级资源
    this.discussionCleanupHandlers.forEach((cleanup) => cleanup());
    this.discussionCleanupHandlers = [];
    this.cleanupRuntime(); // 同时清理运行时资源
  }

  private cleanupService() {
    // 清理服务级资源
    this.serviceCleanupHandlers.forEach((cleanup) => cleanup());
    this.serviceCleanupHandlers = [];
    this.cleanupDiscussion(); // 同时清理讨论级资源
  }

  // 完全销毁服务
  destroy() {
    // 1. 清理所有代理
    for (const agent of this.agents.values()) {
      agent.leaveEnv();
    }
    this.agents.clear();

    // 2. 清理环境
    this.env.destroy();

    // 3. 清理所有级别的资源
    this.cleanupService();

    // 4. 重置所有状态
    this.resetState();
  }

  // 状态重置
  private resetState() {
    this.messagesBean.set([]);
    this.isPausedBean.set(true);
    this.currentDiscussionIdBean.set(null);
    this.settingsBean.set(DEFAULT_SETTINGS);
    this.currentRoundBean.set(0);
    this.currentSpeakerIndexBean.set(-1);
    this.membersBean.set([]);
    this.topicBean.set("");
  }

  // 辅助方法：选择参与者
  private async selectParticipants(topic: string): Promise<string[]> {
    const currentMembers = this.membersBean.get();
    if (currentMembers.length > 0) {
      return currentMembers.map((member) => member.agentId);
    }

    const availableAgents = agentListResource.read().data;
    const selectedIds = await agentSelector.selectAgents(
      topic,
      availableAgents
    );
    if (selectedIds.length === 0) {
      throw new DiscussionError(
        DiscussionErrorType.NO_PARTICIPANTS,
        "没有合适的参与者"
      );
    }

    await this.updateDiscussionMembers(selectedIds);
    return selectedIds;
  }

  private async updateDiscussionMembers(agentIds: string[]) {
    const discussionId = this.getCurrentDiscussionId();
    if (!discussionId) return;

    // 1. 获取当前已存在的成员
    const existingMembers = this.membersBean.get();
    const existingAgentIds = new Set(existingMembers.map((m) => m.agentId));

    // 2. 过滤出需要新增的成员
    const newAgentIds = agentIds.filter((id) => !existingAgentIds.has(id));

    if (newAgentIds.length === 0) {
      console.log("[DiscussionControl] No new members to add");
      return;
    }

    // 3. 创建新成员
    const members: Omit<
      DiscussionMember,
      "id" | "joinedAt" | "discussionId"
    >[] = newAgentIds.map((id) => ({
      agentId: id,
      isAutoReply: true,
    }));

    // 4. 添加新成员并刷新资源
    console.log("[DiscussionControl] Adding new members:", newAgentIds);
    await discussionMemberService.createMany(discussionId, members);
    await discussionMembersResource.current.reload();
  }

  private handleError(
    error: unknown,
    message: string,
    context?: Record<string, unknown>
  ) {
    const discussionError =
      error instanceof DiscussionError
        ? error
        : new DiscussionError(
            DiscussionErrorType.GENERATE_RESPONSE,
            message,
            error,
            context
          );

    const { shouldPause } = handleDiscussionError(discussionError);
    if (shouldPause) {
      this.isPausedBean.set(true);
    }

    this.onError$.next(discussionError);
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  // 恢复已有讨论
  private async resumeExistingDiscussion(): Promise<void> {
    const messages = this.messagesBean.get();
    const lastMessage = messages[messages.length - 1];

    if (lastMessage) {
      // 1. 初始化讨论级资源
      await this.initializeDiscussion(this.topicBean.get());

      // 2. 恢复运行时状态
      await this.resumeAndWaitReady();

      // 3. 重放最后一条消息以触发响应
      if (lastMessage.type === 'text') {
        // 延迟一小段时间确保所有状态都已经准备就绪
        await new Promise(resolve => setTimeout(resolve, 100));
        // 重放消息
        this.onMessage(lastMessage);
        console.log("[DiscussionControl] Replayed last message:", lastMessage);
      }
    }
  }

  // 等待所有组件就绪
  private async resumeAndWaitReady(): Promise<void> {
    // 创建所有 agent 就绪的 Promise 数组
    const agentReadyPromises = Array.from(this.agents.values()).map(
      agent => new Promise<void>(resolve => {
        // 监听 agent 的状态变化
        const off = agent.onStateChange$.listen(state => {
          if (!state.isPaused && !state.isThinking) {
            off();
            resolve();
          }
        });
      })
    );

    // 创建一个 Promise 来等待调度器就绪
    const schedulerReadyPromise = new Promise<void>(resolve => {
      const off = this.env.speakScheduler.isPausedBean.$.subscribe(isPaused => {
        if (!isPaused) {
          off.unsubscribe();
          resolve();
        }
      });
    });

    // 先恢复状态
    this.resume();

    // 等待所有组件就绪
    await Promise.all([
      ...agentReadyPromises,
      schedulerReadyPromise
    ]);
  }

  // 开始新讨论
  private async startNewDiscussion(selectedIds: string[]): Promise<void> {
    const topic = this.topicBean.get();

    // 1. 恢复运行时状态
    this.resume();

    // 2. 发送讨论开始事件
    this.env.eventBus.emit(DiscussionKeys.Events.discussionStart, { topic });

    // 3. 发送初始消息
    const moderator = this.agents.get(selectedIds[0]);
    if (moderator) {
      const initialMessage: NormalMessage = {
        agentId: "system",
        content: `用户：${topic}`,
        type: "text",
        id: "system",
        discussionId: this.getCurrentDiscussionId()!,
        timestamp: new Date(),
      };
      this.env.eventBus.emit(DiscussionKeys.Events.message, initialMessage);
    }
  }

  // 主入口方法
  async run(): Promise<void> {
    try {
      // 1. 检查是否已经在运行
      if (!this.isPausedBean.get()) {
        console.log("[DiscussionControl] Discussion is already running");
        return;
      }

      console.log(
        "[DiscussionControl] messagesBean.get()",
        this.messagesBean.get(),
        "membersBean.get()",
        this.membersBean.get()
      );

      // 2. 检查是否有历史消息和成员
      if (
        this.messagesBean.get().length > 0 &&
        this.membersBean.get().length > 0
      ) {
        console.log("[DiscussionControl] Resuming existing discussion");
        await this.resumeExistingDiscussion();
        return;
      }

      // 3. 初始化新讨论
      console.log("[DiscussionControl] Initializing new discussion");
      const selectedIds = await this.initializeDiscussion(
        this.topicBean.get() || "一个用户启动了讨论，但不知道用户的意图是什么"
      );

      // 4. 启动讨论
      console.log("[DiscussionControl] Starting new discussion");
      await this.startNewDiscussion(selectedIds);
    } catch (error) {
      console.error("[DiscussionControl] Failed to run discussion:", error);
      this.handleError(error, "讨论运行失败");
      this.pause();
    }
  }
}

export const discussionControlService = new DiscussionControlService();
