/**
 * 为模型提示添加精简模式相关指令
 * @param conciseMode - 精简模式开关状态
 * @param conciseLimit - 精简模式字数限制
 * @returns 用于添加到提示中的精简模式指令
 */
export function addConciseModeToPrompt(
  conciseMode: boolean,
  conciseLimit: number
): string {
  if (!conciseMode) {
    return "";
  }

  return `请保持回复简洁精炼，控制在${conciseLimit}字以内。优先保留核心观点，删减冗余细节和修饰性语言，使用更紧凑的语言结构。`;
}

/**
 * 获取精简模式提示附加信息
 * 通过在提示中添加指令而非后处理回复的方式实现精简功能
 * @param conciseMode - 精简模式状态
 * @param conciseLimit - 精简字数限制
 * @returns 包含精简模式指令的结构化对象
 */
export function getConciseModePromptExtension(
  conciseMode: boolean,
  conciseLimit: number
): {
  enabled: boolean;
  instructions: string;
  limit: number;
} {
  return {
    enabled: conciseMode,
    instructions: addConciseModeToPrompt(conciseMode, conciseLimit),
    limit: conciseLimit
  };
}

/**
 * 估算文本中的字符数（适用于多语言场景）
 * @param text - 输入文本
 * @returns 估算的字符数
 */
export function estimateCharacterCount(text: string): number {
  // 对于中文等CJK字符，每个字符算一个字
  // 对于英文单词，每个单词算一个字
  
  // 匹配CJK字符
  const cjkChars = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/g) || []).length;
  
  // 匹配英文单词
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  
  // 匹配数字
  const numbers = (text.match(/[0-9]+/g) || []).length;
  
  return cjkChars + englishWords + numbers;
}