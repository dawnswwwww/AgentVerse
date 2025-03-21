/* eslint-disable @typescript-eslint/no-explicit-any */
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { BreakpointProvider } from "@/contexts/breakpoint-context.tsx";
import {
  discussionMembersResource,
  discussionsResource,
  messagesResource,
} from "@/resources/index.ts";
import { discussionControlService } from "@/services/discussion-control.service.ts";
import { discussionMemberService } from "@/services/discussion-member.service.ts";
import { discussionService } from "@/services/discussion.service.ts";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.tsx";
import { AppLoading } from "./components/app/app-loading.tsx";
import "./index.css";
import "./styles/theme.css";

(window as any).discussionService = discussionService;
(window as any).discussionControlService = discussionControlService;
(window as any).discussionMemberService = discussionMemberService;
(window as any).discussionsResource = discussionsResource;
(window as any).discussionMembersResource = discussionMembersResource;
(window as any).messagesResource = messagesResource;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<AppLoading />}>
      <TooltipProvider>
        <BreakpointProvider>
          <App />
        </BreakpointProvider>
      </TooltipProvider>
    </Suspense>
  </React.StrictMode>
);
