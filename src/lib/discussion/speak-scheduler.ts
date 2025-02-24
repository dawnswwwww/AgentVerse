import { AgentMessage } from "@/types/discussion";
import { RxEvent } from "@/lib/rx-event";
import { createNestedBean, createProxyBean } from "packages/rx-nested-bean/src";

export interface SpeakRequest {
  agentId: string;
  agentName: string;
  reason: SpeakReason;
  priority: number;
  timestamp: Date;
  message: AgentMessage;
  onGranted: () => Promise<void>;
}

export interface SpeakReason {
  type: "mentioned" | "auto_reply" | "follow_up" | "other";
  description: string;
  factors?: {
    isModerator?: boolean;
    isContextRelevant?: number; // 0-1
    timeSinceLastSpeak?: number;
  };
}

// 说话状态
export type SpeakingState = {
  agentId: string | null;
  startTime: Date | null;
  timeoutId: NodeJS.Timeout | null;
};

export class SpeakScheduler {
  private requests: SpeakRequest[] = [];
  private readonly MAX_MESSAGES = 20; // 最大消息数限制
  private readonly SPEAK_TIMEOUT = 30000; // 说话超时时间，30秒

  // 状态管理
  private store = createNestedBean({
    messageCounter: 0,
    speaking: {
      agentId: null as string | null,
      startTime: null as Date | null,
      timeoutId: null as NodeJS.Timeout | null
    } as SpeakingState,
    isPaused: false
  });

  // 代理访问器
  messageCounterBean = createProxyBean(this.store, "messageCounter");
  speakingStateBean = createProxyBean(this.store, "speaking");
  isPausedBean = createProxyBean(this.store, "isPaused");

  // 事件通知
  public onMessageProcessed$ = new RxEvent<number>();
  public onLimitReached$ = new RxEvent<void>();
  public onSpeakTimeout$ = new RxEvent<string>(); // 发送超时的 agentId

  constructor() {
    // 监听说话状态变化
    this.speakingStateBean.$.subscribe((state) => {
      if (state.agentId) {
        this.setupSpeakTimeout(state.agentId);
      }
    });
  }

  public setPaused(paused: boolean) {
    this.isPausedBean.set(paused);
    if (paused) {
      // 暂停时清空请求队列
      this.requests = [];
      // 清除当前说话状态
      this.clearSpeakingState();
    }
  }

  public getRoundLimit() {
    return this.MAX_MESSAGES;
  }

  public getCurrentSpeaker(): string | null {
    return this.speakingStateBean.get().agentId;
  }

  public submit(request: SpeakRequest): void {
    this.requests.push(request);
    this.processNextRequest();
  }

  public completeSpeaking(agentId: string): void {
    const currentState = this.speakingStateBean.get();
    if (currentState.agentId === agentId) {
      this.clearSpeakingState();
      this.processNextRequest();
    }
  }

  public clear(): void {
    this.requests = [];
    this.messageCounterBean.set(0);
    this.clearSpeakingState();
  }

  private async processNextRequest(): Promise<void> {
    // 如果讨论已暂停，不处理请求
    if (this.isPausedBean.get()) {
      return;
    }

    // 如果当前有人在说话，不处理
    if (this.speakingStateBean.get().agentId) {
      return;
    }

    // 如果没有请求，不处理
    if (this.requests.length === 0) {
      return;
    }

    // 检查是否达到限制
    if (this.messageCounterBean.get() >= this.MAX_MESSAGES) {
      this.onLimitReached$.next();
      this.messageCounterBean.set(0);
      return;
    }

    const nextSpeaker = this.selectNextSpeaker();
    if (!nextSpeaker) return;

    // 再次检查是否暂停（防止在处理过程中状态改变）
    if (this.isPausedBean.get()) {
      return;
    }

    // 设置说话状态
    this.speakingStateBean.set({
      agentId: nextSpeaker.agentId,
      startTime: new Date(),
      timeoutId: null
    });

    // 清除被选中 agent 的所有其他请求
    this.requests = this.requests.filter(
      (req) => req.agentId !== nextSpeaker.agentId
    );

    // 执行回调
    try {
      await nextSpeaker.onGranted();
      this.messageCounterBean.set(this.messageCounterBean.get() + 1);
      this.onMessageProcessed$.next(this.messageCounterBean.get());
    } catch (error) {
      console.error("Error executing speak callback:", error);
      this.clearSpeakingState();
    }
  }

  private setupSpeakTimeout(agentId: string): void {
    const currentState = this.speakingStateBean.get();
    if (currentState.timeoutId) {
      clearTimeout(currentState.timeoutId);
    }

    const timeoutId = setTimeout(() => {
      this.onSpeakTimeout$.next(agentId);
      this.clearSpeakingState();
      this.processNextRequest();
    }, this.SPEAK_TIMEOUT);

    this.speakingStateBean.set({
      ...currentState,
      timeoutId
    });
  }

  private clearSpeakingState(): void {
    const currentState = this.speakingStateBean.get();
    if (currentState.timeoutId) {
      clearTimeout(currentState.timeoutId);
    }
    
    this.speakingStateBean.set({
      agentId: null,
      startTime: null,
      timeoutId: null
    });
  }

  private selectNextSpeaker(): SpeakRequest | null {
    if (this.requests.length === 0) return null;

    return this.requests.reduce((highest, current) => {
      const currentScore = this.calculateScore(current);
      const highestScore = this.calculateScore(highest);

      return currentScore > highestScore ? current : highest;
    });
  }

  private calculateScore(request: SpeakRequest): number {
    let score = request.priority;

    // mention类型给予显著更高的优先级
    if (request.reason.type === "mentioned") {
      score += 100;
    }

    // 时间因素
    const timeWeight = 0.1;
    const timeDiff = Date.now() - request.timestamp.getTime();
    score += timeDiff * timeWeight;

    // 其他因素
    if (request.reason.factors) {
      if (request.reason.factors.isModerator) {
        score += 20;
      }
      if (request.reason.factors.isContextRelevant) {
        score += request.reason.factors.isContextRelevant * 30;
      }
      if (request.reason.factors.timeSinceLastSpeak) {
        score += Math.min(request.reason.factors.timeSinceLastSpeak / 1000, 50);
      }
    }

    return score;
  }

  public resetCounter(): void {
    this.messageCounterBean.set(0);
    this.onMessageProcessed$.next(this.messageCounterBean.get());
  }
}
