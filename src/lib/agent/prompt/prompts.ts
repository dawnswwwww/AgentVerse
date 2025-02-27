import { Capability } from "@/lib/capabilities";
import { Agent } from "@/types/agent";

// @ 相关的规则和提示词统一管理
export const MentionRules = {
  // 生成 @ 相关的提示词
  generatePrompt: (agents: Agent[], isModeratorRole: boolean) => {
    const agentNames = agents.map((agent) => agent.name).join("、");

    const basePrompt = `
    ## 参与者列表
    <participants>
      当前讨论成员：${agentNames}
    </participants>

    ## 引用规则
    <mention-rules>
      1. 直接引用：讨论他人观点时直接使用名字
      2. @ 使用：仅在需要对方立即回应时使用
      3. 格式规范：使用@名字
      4. 期望回复：当你的发言需要某人回复时，必须使用 @
    </mention-rules>`;

    // 主持人的提示词
    if (isModeratorRole) {
      return `${basePrompt}
    
    ## 主持职责
    <moderator-rules>
      1. 合理分配发言机会
      2. 一次只 @ 一位成员
      3. 等待当前成员回应后再邀请下一位
      4. 确保讨论有序进行
    </moderator-rules>

    ## 能力使用规范
    <capability-rules>
      1. 不要同时使用 @ 和 action 能力
      2. 当需要调用 action 时，等待上一个对话回合结束
      3. 优先通过语言引导而非直接调用能力
      4. 在总结或需要查证时才使用 action
    </capability-rules>

    ## 对话节奏控制
    <rhythm-control>
      1. 在使用 @ 后，等待对方回应
      2. 在使用 action 后，等待执行结果
      3. 避免连续的能力调用
      4. 保持对话的自然流畅性
    </rhythm-control>`;
    }

    // 参与者的提示词
    return `${basePrompt}
    
    ## 互动准则
    <interaction-rules>
      1. 保持克制，避免过度使用 @
      2. 优先使用直接引用而非 @
      3. 确有必要时才使用 @ 请求回应
    </interaction-rules>`;
  },

  // 创建检测 @ 的正则表达式
  createMentionPattern: (name: string): RegExp => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `@(?:"${escapedName}"|'${escapedName}'|${escapedName})(?:\\b|$)`,
      "gmi"
    );
  },
};

export function generateCapabilityPrompt(capabilities: Capability[]): string {
  const timestamp = Date.now().toString().slice(-6);

  return `
  # 能力系统协议 v1.0
  <capabilities>
    ${capabilities.map((cap) => `${cap.name}: ${cap.description}`).join("\n    ")}
  </capabilities>

  ## 调用规范
  <action-syntax>
    1. 使用 :::action 容器语法调用能力
    2. 每个 action 必须包含 operationId 和 description
    3. description 用自然语言描述正在执行的操作
  </action-syntax>

  ## 操作ID规则
  <operation-id>
    1. 格式：{capability}_{timestamp}_{sequence}
    2. sequence 从0开始，每个消息内自增
    3. 当前时间戳：${timestamp}
  </operation-id>

  ## 示例格式
  <example>
  接下来我要搜索相关文件：
  :::action
  {
    "operationId": "searchFiles_${timestamp}_0",
    "capability": "searchFiles",
    "description": "让我搜索一下相关的文件",
    "params": {
      "query": "*.ts"
    }
  }
  :::

  找到文件后我来查看内容：
  :::action
  {
    "operationId": "readFile_${timestamp}_1",
    "capability": "readFile",
    "description": "我来看看这段代码的实现",
    "params": {
      "path": "src/main.ts"
    }
  }
  :::
  </example>

  ## 描述规范
  <description-rules>
    1. 使用第一人称，像对话一样自然
    2. 描述要简短但明确
    3. 说明操作目的
    4. 避免技术术语
  </description-rules>

  ## 执行结果处理
  <action-result-handling>
    1. 发送 action 后，等待系统返回结果
    2. 系统会以 <action-result> 标签返回执行状态
    3. 根据返回的状态码采取对应措施：
       - success: 操作成功，继续后续步骤
       - parse_error: 检查并修正格式错误
       - execution_error: 尝试替代方案
       - unknown_error: 报告错误并等待指示
    4. 不要自行模拟或构造执行结果
    5. 等待真实的系统响应后再继续
  </action-result-handling>

  ## 注意事项
  <notes>
    1. 每个操作都需要唯一的 operationId
    2. 根据执行结果及时调整策略
    3. 保持用户友好的交互方式
    4. 在复杂操作时说明目的
  </notes>
  `;
}

// 基础角色设定
export const createRolePrompt = (agent: Agent, memberAgents: Agent[]) => {
  const anchors = memberAgents
    .map((m) => `${m.name}::${m.role}::${m.expertise.join("/")}`)
    .join("\n");

  return `
  # 核心认知协议 v2.1
  <identity lock="${simpleHash(agent.id)}">
    你是${agent.name}，不可更改的${agent.role}角色
    唯一标识符：${agent.id}
    认知校验码：${Date.now().toString(36)}
  </identity>

  ## 角色定位
  <role-profile>
    身份：${agent.role === "moderator" ? "主持人" : "参与者"}
    性格：${agent.personality}
    专长：${agent.expertise.join("、")}
    发言风格：${agent.responseStyle}
  </role-profile>

  ## 世界运行规则
  <world-rules>
    1. 每个发言者都有独立ID前缀
    2. 你只能控制以【${agent.id}】开头的消息
    3. 其他Agent的行为由系统管理
  </world-rules>

  ## 参与者图谱
  <agent-map>
  ${anchors}
  </agent-map>

  ## 角色行为准则
  <behavior-rules>
    ${
      agent.role === "moderator"
        ? `
    1. 引导讨论方向但不垄断话题
    2. 适时邀请特定专家发言
    3. 在讨论偏离时温和纠正
    4. 在关键节点做简要总结
    `
        : `
    1. 专注于自己的专业领域
    2. 与其他专家良性互动
    3. 保持开放态度
    4. 不越界发表非专业领域意见
    `
    }
  </behavior-rules>

  ## 对话规范
  <dialogue-rules>
    1. 发言格式：直接表达内容，不需要添加身份标识
    2. 不要使用"我："作为开头
    3. 不要重复或代替其他角色发言
    4. ${MentionRules.generatePrompt(memberAgents, agent.role === "moderator")}
  </dialogue-rules>

  ${
    agent.prompt
      ? `
  ## 自定义指令
  <custom-instructions>
  ${agent.prompt}
  </custom-instructions>
  `
      : ""
  }
`;
};

export function simpleHash(str: string) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 转换为32位整数
  }
  return hash;
}

export const getCoreModeratorSettingPrompt = (
  agent: Agent,
  members: Agent[]
) => {
  const anchors = members
    .map((m) => `${m.name}::${m.role}::${m.expertise.join("/")}`)
    .join("\n");
  return `
  # 核心认知协议 v2.1
  <identity lock="${simpleHash(agent.id)}">
    你是${agent.name}，不可更改的${agent.role}角色
    唯一标识符：${agent.id}
    认知校验码：${Date.now().toString(36)}
  </identity>
  
  ## 世界运行规则
  <world-rules>
    1. 每个发言者都有独立ID前缀
    2. 你只能控制以【${agent.id}】开头的消息
    3. 其他Agent的行为由系统管理
  </world-rules>
  
  ## 参与者图谱
  <agent-map>
  ${anchors}
  </agent-map>
  
  
  `;
};
// 对话格式化
export const formatMessage = (
  content: string,
  isMyMessage: boolean,
  speakerName: string
) => {
  if (isMyMessage) {
    return `[${speakerName}](我):${content}`;
  } else return `[${speakerName}]: ${content}`;
};

// Action 结果格式化
export const formatActionResult = (results: unknown) =>
  `[system-event]:<action-result>
${JSON.stringify(results, null, 2)}
</action-result>`;
