import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Agent } from "@/types/agent";
import { cn } from "@/lib/utils";
import { Loader2, Settings, Trash2 } from "lucide-react";

interface AgentListProps {
  agents: Agent[];
  loading?: boolean;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
  listClassName?: string;
}

export function AgentList({
  agents,
  loading,
  onEditAgent,
  onDeleteAgent,
  listClassName
}: AgentListProps) {
  return (
    <div className={cn("space-y-3", listClassName)}>
        {agents.map((agent) => (
          <Card
            key={agent.id}
          className="p-4 flex items-center gap-3"
          >
            <img
              src={agent.avatar}
              alt={agent.name}
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-medium truncate">
                    {agent.name}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ID: {agent.id}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground capitalize">
                  {agent.role}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {agent.personality}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onEditAgent(agent)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onDeleteAgent(agent.id)}
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      {!loading && agents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          暂无 Agent，点击上方按钮添加
        </div>
      )}
    </div>
  );
} 