# Cloudflare Agent SDK Architecture

This diagram illustrates the stateful agent architecture implemented for the Observation Copilot using the Cloudflare Agents SDK.

## Component Overview

```mermaid
graph TD
    subgraph Client ["Client Layer (UI)"]
        CP[CopilotPanel.tsx]
        ST[Store.ts / TanStack Store]
    end

    subgraph Edge ["Cloudflare Workers Layer"]
        SF[chatCompletion Server Function]
        BA[Briefing ai-client.ts]
    end

    subgraph AgentSDK ["Cloudflare Agents SDK (Stateful)"]
        CA[CopilotAgent Durable Object]
        DB[(SQLite Persistent Storage)]
        RPC[RPC Methods @callable]
    end

    subgraph AI ["AI & Tooling Infrastructure"]
        SDK[AI SDK / generateText]
        WAI[Workers AI Provider]
        CT[Copilot Tools / tools.ts]
        CONF[AI Config / config.ts]
        SAN[Sanitization / sanitization.ts]
    end

    subgraph External ["External Services"]
        ISS[ISS Tracking APIs]
        WX[Weather API]
        SEN[Sentry / Observability]
    end

    %% Interactions
    CP -->|POST| SF
    SF -->|getAgentByName| CA
    SF -->|RPC: chat| RPC
    CA -->|extends| AIChatAgent
    CA -->|manages| DB
    
    RPC --> SDK
    SDK --> WAI
    SDK --> CT
    CT --> ISS
    CT --> WX
    
    WAI --> CONF
    SDK --> SAN
    
    BA --> CONF
    
    CA --> SEN
    SF --> SEN
    CT --> SEN
```

## Request Lifecycle (Walkthrough)

The following sequence diagram shows the flow of a single chat message through the new architecture.

```mermaid
sequenceDiagram
    participant U as User (UI)
    participant SF as Server Function (Proxy)
    participant AGT as CopilotAgent (Durable Object)
    participant SAN as Sanitization Utility
    participant SDK as AI SDK (generateText)
    participant TOOLS as Copilot Tools
    participant WAI as Workers AI

    U->>SF: Send Message (ChatRequest)
    SF->>AGT: getAgentByName(id)
    SF->>AGT: agent.chat(message, history)
    
    activate AGT
    AGT->>SAN: sanitizeData(input)
    SAN-->>AGT: return redacted data
    
    AGT->>SDK: generateText(model, tools, messages)
    activate SDK
    
    SDK->>WAI: Inference Request
    WAI-->>SDK: Tool Call (e.g., get_iss_position)
    
    SDK->>TOOLS: Execute Tool
    TOOLS-->>SDK: Tool Result
    
    SDK->>WAI: Final Inference (with result)
    WAI-->>SDK: Response Text
    deactivate SDK
    
    AGT->>AGT: persistMessages(SQLite)
    AGT-->>SF: return { content, toolCalls }
    deactivate AGT
    
    SF-->>U: Return ChatResponse (Success)
```

## Key Architectural Principles

1.  **Stateful Identity**: Each conversation is mapped to a specific Durable Object instance, ensuring session persistence and server-side history.
2.  **Centralized Configuration**: All AI-related settings (models, retries, iterations) are managed in a single `config.ts` module.
3.  **Security by Default**: The `sanitization.ts` utility is applied at the agent level to ensure sensitive data never leaves the secure environment.
4.  **RPC Communication**: Communication between the stateless Server Functions and the stateful Agent is handled via high-performance RPC calls.
5.  **Standardized Tools**: Tools follow the modern AI SDK format, making them compatible with both the Agents SDK and standard Workers AI patterns.
