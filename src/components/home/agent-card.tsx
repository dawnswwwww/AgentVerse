import React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/useSettings";
import { useAgentService } from "@/services/agent.service";

// 可复用的AgentCard组件，用于展示代理信息的Popover卡片
interface AgentCardProps {
  name: string;
  avatar: string;
  role?: string;
  expertise?: string[];
  description?: string;
  className?: string;
  agentId?: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  name,
  avatar,
  role,
  expertise = [],
  description,
  className,
  agentId,
}) => {
  // 确保头像URL是有效的
  const safeAvatar = avatar || "/avatars/default.png";
  
  // 获取全局设置和更新方法
  const { setSettings, getSettingValue } = useSettings();
  const agentService = useAgentService();
  
  // 处理精简模式切换
  const handleConciseModeToggle = async (checked: boolean) => {
    if (agentId) {
      // 如果有agent ID，则设置特定agent的精简模式
      await agentService.toggleAgentConciseMode(agentId, checked);
    } else {
      // 否则设置全局精简模式
      const conciseModeKey = "conciseMode";
      setSettings({
        [conciseModeKey]: { value: checked }
      });
    }
  };
  
  // 安全地获取设置值
  const conciseMode = getSettingValue<boolean>("conciseMode") || false;
  const conciseLimit = getSettingValue<number>("conciseLimit") || 100;
  
  return (
    <div className={cn("p-3 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
          <img 
            src={safeAvatar} 
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/avatars/default.png";
            }}
          />
        </div>
        <div>
          <h3 className="font-medium text-base">{name}</h3>
          {role && <p className="text-sm text-muted-foreground">{role}</p>}
        </div>
      </div>
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {expertise.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">专长领域</h4>
          <div className="flex flex-wrap gap-1">
            {expertise.map((skill, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <Label htmlFor="concise-mode" className="text-sm cursor-pointer">
            精简回复模式
          </Label>
          <Switch
            id="concise-mode"
            checked={conciseMode}
            onCheckedChange={handleConciseModeToggle}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {conciseMode 
            ? `已启用精简模式，回复将控制在${conciseLimit}字以内` 
            : "开启后AI回复将更加简短精炼"}
        </p>
      </div>
    </div>
  );
};