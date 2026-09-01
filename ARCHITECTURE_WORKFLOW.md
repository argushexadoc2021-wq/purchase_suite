# Invoice Processing Workflow

This diagram illustrates how the Ledgerly application currently processes invoices using the Lovable AI Gateway and Supabase.

```mermaid
sequenceDiagram
    autonumber
    
    actor User as Authenticated User
    participant Frontend as Frontend<br/>(React / Vite)
    participant ServerFn as Backend API<br/>(TanStack Server Function)
    participant DB as Supabase<br/>(Database & Storage)
    participant Lovable as Lovable AI Gateway<br/>(@lovable/ai proxy)
    participant LLM as Underlying AI<br/>(Gemini/OpenAI)

    %% Upload Phase
    User->>Frontend: Drag & Drop Invoice (PDF/PNG file)
    Frontend->>ServerFn: POST file via uploadInvoice
    
    %% Storage & Initial DB Entry
    ServerFn->>ServerFn: Verify User Auth Context
    ServerFn->>DB: Upload raw file to `invoices` Storage Bucket
    DB-->>ServerFn: Returns file URL path
    ServerFn->>DB: Create Invoice Row (Status: 'pending')
    DB-->>ServerFn: Returns created Invoice ID

    %% AI Extraction Phase
    alt LOVABLE_API_KEY is configured
        ServerFn->>Lovable: Request generation via lovable.ai.generateObject()<br/>(Includes file buffer + strict TypeScript schema)
        Lovable->>LLM: Routes prompt to underlying AI model (e.g., Gemini)
        Note right of Lovable: Deducts credits from Lovable Account
        LLM-->>Lovable: Returns extracted unstructured text/json
        Lovable-->>ServerFn: Forces output to match your ExtractionResult format
    else Currently Local (No API Key)
        ServerFn->>ServerFn: Simulates a 3-second network delay
        Note left of ServerFn: ⚠️ Uses Hardcoded Mock Fallback Data
    end

    %% Database Update & UI Navigation
    ServerFn->>DB: Update Invoice Row<br/>(Status: 'extracted', saves line_items & totals)
    DB-->>ServerFn: Confirms Update
    
    ServerFn-->>Frontend: Returns success & Invoice ID
    Frontend-->>User: Redirects user to /invoices/[id] for final review
```

### Breakdown of Key Steps:

1. **Upload & Storage (Steps 1-5):** Rather than passing gigantic files directly to the database, your app smartly saves the raw document into **Supabase Storage** first. It immediately creates a "pending" database row so if the AI fails, you don't lose the file record.
2. **The Lovable Routing (Steps 6-9):** The `lovable.ai` package acts as a proxy. It takes your instructions, passes them through Lovable's servers (where they monitor token usage/billing), and then hands it off to an LLM. Because you provided a TypeScript schema, Lovable guarantees the LLM's response won't break your app's frontend forms.
3. **The Mock Engine (Step 10):** Because we didn't want to use up your real credits continuously testing the UI locally, the backend gracefully catches missing API keys and provides dummy data (like "Mock Vendor Inc.") so the development loop never breaks.
