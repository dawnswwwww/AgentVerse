import { Button } from "@/components/ui/button";
import { ScrollableLayout } from "@/layouts/scrollable-layout";
import { cn } from "@/lib/utils";
import { AgentMessage } from "@/types/discussion";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { forwardRef, useImperativeHandle } from "react";
import { MessageCapture } from "./message-capture";
import { MessageItem } from "./message-item";
import { useMessageList, type MessageListRef } from "@/hooks/useMessageList";

/**
 * 移动端消息列表设计：
 * - 适应移动设备的紧凑布局
 * - 消息气泡靠左/靠右对齐
 * - 自己的消息在右侧
 * - 对方的消息在左侧
 * - 优化触摸交互
 */

interface MessageListMobileProps {
  discussionId?: string;
  messages: AgentMessage[];
  agentInfo: {
    getName: (agentId: string) => string;
    getAvatar: (agentId: string) => string;
  };
  className?: string;
  scrollButtonThreshold?: number;
}

export const MessageListMobile = forwardRef<MessageListRef, MessageListMobileProps>(
  function MessageListMobile(
    {
      messages,
      agentInfo,
      className,
      scrollButtonThreshold = 200,
      discussionId,
    },
    ref
  ) {
    const {
      scrollableLayoutRef,
      messagesContainerRef,
      showScrollButton,
      reorganizedMessages,
      handleScroll,
      scrollToBottom
    } = useMessageList({
      messages,
      discussionId,
      scrollButtonThreshold,
    });

    // 将ref暴露给父组件
    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }));

    return (
      <ScrollableLayout
        ref={scrollableLayoutRef}
        onScroll={handleScroll}
        className={cn("relative bg-gray-50 dark:bg-gray-900", className)}
      >
        {/* 消息列表 */}
        <div
          ref={messagesContainerRef}
          className="flex flex-col min-h-full pb-4 pt-2"
        >
          <AnimatePresence initial={false}>
            {reorganizedMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageItem
                  message={message}
                  agentInfo={agentInfo}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 浮动按钮组 */}
        <div className="fixed right-3 bottom-16 flex flex-col gap-2 z-10">
          {/* 消息捕获按钮 */}
          <MessageCapture
            containerRef={messagesContainerRef}
            className="rounded-full shadow-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
          />

          {/* 滚动到底部按钮 */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full shadow-md bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => scrollToBottom()}
                >
                  <ArrowDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollableLayout>
    );
  }
); 