# Scheduler 设计方案

## 整体架构

### 核心职责划分

**Scheduler:**
- 发言权限的分配和回收
- 发言状态的监控
- 发言超时的处理
- 发言队列的管理

**Agent:**
- 提交发言请求
- 执行实际的发言
- 报告发言完成/失败

### 状态管理
```typescript
说话状态：
- IDLE: 无人说话
- SPEAKING: 某人正在说话
- PENDING: 等待说话确认
- TIMEOUT: 说话超时
```

### 关键事件
```typescript
- onSpeakRequested: Agent 请求发言
- onSpeakGranted: Scheduler 授权发言
- onSpeakStarted: Agent 开始发言
- onSpeakCompleted: Agent 完成发言
- onSpeakFailed: 发言失败
- onSpeakTimeout: 发言超时
```

### 安全机制
```typescript
- 心跳检测：定期检查发言状态
- 超时处理：自动回收超时的发言权限
- 状态恢复：处理异常情况下的状态恢复
```

### 扩展性考虑
```typescript
- 支持优先级队列
- 支持打断机制
- 支持并行发言（特殊场景）
- 支持发言预约
```

## 待讨论问题
1. 如何处理长时间发言的情况？
2. 是否需要支持发言的取消？
3. 如何处理系统消息这类特殊情况？
4. 是否需要支持发言的暂停和恢复？

## 阶段性实现计划

### 第一阶段：最小可行实现
核心目标：确保同一时间只能有一个 Agent 在发言，且发言状态能被正确管理和恢复

1. **核心状态管理**：
```typescript
Scheduler:
- currentSpeaker: string | null  // 当前发言者ID
- speakingStartTime: Date | null // 发言开始时间(用于超时检测)
```

2. **基础事件流**：
```typescript
Agent -> Scheduler: requestSpeak()
Scheduler -> Agent: grantSpeak()
Agent -> Scheduler: completeSpeak()
```

3. **安全保障**：
- 简单的超时检测
- 基础的状态恢复机制

### 后续阶段
- 优先级队列实现
- 打断机制
- 并行发言支持
- 发言预约系统
- 更完善的状态管理
- 更强大的监控和恢复机制 