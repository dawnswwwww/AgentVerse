import { useAddAgentDialog } from "@/components/agent/add-agent-dialog/use-add-agent-dialog";
import { useSettingsDialog } from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Github, MessageSquare, Settings, Users } from "lucide-react";
import { ThemeToggle } from "@/components/common/theme";

interface ActivityBarProps {
  className?: string;
}

export function ActivityBar({ className }: ActivityBarProps) {
  const { openAddAgentDialog } = useAddAgentDialog();
  const { openSettingsDialog } = useSettingsDialog();

  const handleGithubClick = () => {
    window.open("https://github.com/Peiiii/AgentVerse", "_blank");
  };

  return (
    <div className={cn(
      "w-14 flex-none bg-card border-r border-border",
      "flex flex-col items-center py-4 gap-2",
      className
    )}>
      {/* Logo */}
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
      </div>

      {/* 主要功能按钮 */}
      <div className="flex-1 flex flex-col items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="w-10 h-10 rounded-xl"
          onClick={openAddAgentDialog}
        >
          <Users className="w-5 h-5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon"
          className="w-10 h-10 rounded-xl"
          onClick={openSettingsDialog}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* 底部功能按钮 */}
      <div className="flex flex-col items-center gap-1">
        <ThemeToggle className="w-10 h-10 rounded-xl" />
        
        <Button 
          variant="ghost" 
          size="icon"
          className="w-10 h-10 rounded-xl"
          onClick={handleGithubClick}
          title="访问 GitHub 仓库"
        >
          <Github className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
} 