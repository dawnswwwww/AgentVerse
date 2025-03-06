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
      isTransitioning,
      reorganizedMessages,
      handleScroll,
      scrollToBottom
    } = useMessageList({
      messages,
      discussionId,
      scrollButtonThreshold
    });

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      scrollToBottom: (instant?: boolean) => scrollToBottom(instant),
    }));

    return (
      <div className="relative h-full">
        <div className="absolute inset-0">
          <ScrollableLayout
            ref={scrollableLayoutRef}
            className={cn("h-full overflow-x-hidden", className)}
            initialAlignment="bottom"
            unpinThreshold={1}
            pinThreshold={30}
            onScroll={handleScroll}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={discussionId}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.2 },
                }}
                exit={{ opacity: 0 }}
                className={cn(
                  "py-3 transition-opacity duration-200",
                  isTransitioning && "opacity-0"
                )}
                ref={messagesContainerRef}
              >
                <div className="space-y-3 px-3">
                  {reorganizedMessages.map((message) => (
                    <MessageItem
                      key={message.id}
                      message={message}
                      agentInfo={agentInfo}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </ScrollableLayout>
        </div>

        {/* 浮动按钮组 */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2">
          <MessageCapture
            containerRef={messagesContainerRef}
            className="rounded-full shadow-lg bg-background/80 backdrop-blur hover:bg-background"
          />

          {showScrollButton && (
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-background/80 backdrop-blur hover:bg-background"
              onClick={() => scrollToBottom()}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }
); 