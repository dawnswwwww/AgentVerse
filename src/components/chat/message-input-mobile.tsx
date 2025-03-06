import { Button } from "@/components/ui/button";
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea";
import { cn } from "@/lib/utils";
import { Loader2, Send } from "lucide-react";
import { forwardRef } from "react";
import { useMessageInput, type MessageInputRef } from "@/hooks/useMessageInput";

interface MessageInputProps {
  onSendMessage: (content: string, agentId: string) => Promise<void>;
  className?: string;
}

export const MessageInputMobile = forwardRef<MessageInputRef, MessageInputProps>(
  function MessageInputMobile({ onSendMessage, className }, ref) {
    const {
      input,
      setInput,
      isLoading,
      inputRef,
      canSubmit,
      inputPlaceholder,
      handleSubmit,
      handleKeyDown
    } = useMessageInput({
      onSendMessage,
      forwardedRef: ref
    });

    return (
      <div className={cn(className)}>
        <div className="p-4 space-y-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <AutoResizeTextarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={inputPlaceholder}
              className="flex-1 min-h-[2.25rem] text-sm"
              disabled={isLoading}
              minRows={1}
              maxRows={8}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!canSubmit}
              className={cn(
                "transition-all px-2 h-9 min-w-[36px] self-end",
                canSubmit
                  ? "bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }
); 