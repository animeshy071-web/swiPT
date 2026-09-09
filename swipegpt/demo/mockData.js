/**
 * SwipeGPT - Mock Data for Demo Mode
 * Realistic ChatGPT response representations for list, pros/cons, steps, and recommendations.
 */

const MOCK_DATASETS = {
  projectIdeas: {
    name: "5 AI SaaS Project Ideas",
    category: "Product Ideas",
    description: "Sample ChatGPT response for 'Suggest 5 profitable AI SaaS ideas for solo founders'",
    cards: [
      {
        id: "idea-1",
        title: "Voiceflow to Code Engine",
        type: "idea",
        badge: "Hot Trend",
        content: `
          <p><strong>Overview:</strong> An AI copilot that listens to user interviews, customer support calls, or product specs, and automatically generates functional React prototypes.</p>
          <p><strong>Target Audience:</strong> Product managers, startup founders, and rapid design agencies.</p>
          <p><strong>Monetization:</strong> $29/mo tiered subscription based on audio processing hours.</p>
        `,
        plainText: "Voiceflow to Code Engine: An AI copilot that listens to user interviews and generates functional React prototypes.",
        createdAt: Date.now()
      },
      {
        id: "idea-2",
        title: "Automated Compliance Auditor",
        type: "idea",
        badge: "B2B Enterprise",
        content: `
          <p><strong>Overview:</strong> Continuous AI agent that monitors GitHub repositories and AWS infra against SOC2, HIPAA, and GDPR standards in real time.</p>
          <p><strong>Target Audience:</strong> Early-to-mid stage startups preparing for enterprise pilots.</p>
          <p><strong>Monetization:</strong> $199/mo per connected infrastructure repository.</p>
        `,
        plainText: "Automated Compliance Auditor: Continuous AI agent monitoring GitHub repos and AWS against SOC2/HIPAA.",
        createdAt: Date.now()
      },
      {
        id: "idea-3",
        title: "Micro-SaaS SEO Programmatic Engine",
        type: "idea",
        badge: "High Growth",
        content: `
          <p><strong>Overview:</strong> Takes your core product keyword cluster and builds high-quality, research-backed programmatic comparison landing pages with dynamic schema markup.</p>
          <p><strong>Target Audience:</strong> Indie hackers and bootstrapped SaaS founders.</p>
          <p><strong>Monetization:</strong> Usage credits or $49/mo flat unlimited plan.</p>
        `,
        plainText: "Micro-SaaS SEO Programmatic Engine: High-quality programmatic comparison landing pages with schema markup.",
        createdAt: Date.now()
      },
      {
        id: "idea-4",
        title: "AI Meeting Memory & Action Sync",
        type: "idea",
        badge: "Productivity",
        content: `
          <p><strong>Overview:</strong> Extracts commitments, dates, and PR review blockers from Slack and Google Meet transcripts, syncing them directly to Jira, Linear, or GitHub Issues.</p>
          <p><strong>Target Audience:</strong> Distributed engineering teams and project coordinators.</p>
          <p><strong>Monetization:</strong> $12/user/month with team workspaces.</p>
        `,
        plainText: "AI Meeting Memory & Action Sync: Extracts commitments from calls and syncs directly to Linear/Jira.",
        createdAt: Date.now()
      },
      {
        id: "idea-5",
        title: "Smart SQL Query Optimizer & Explain",
        type: "idea",
        badge: "Dev Tool",
        content: `
          <p><strong>Overview:</strong> Chrome/VS Code extension that intercepts slow PostgreSQL/MySQL queries, visually graphs the explain analyze plan, and proposes indexed rewrites.</p>
          <p><strong>Target Audience:</strong> Backend developers and database administrators.</p>
          <p><strong>Monetization:</strong> Freemium with $19/mo pro features (index simulator).</p>
        `,
        plainText: "Smart SQL Query Optimizer: Intercepts slow SQL queries, graphs explain plan, and proposes indexed rewrites.",
        createdAt: Date.now()
      }
    ]
  },

  prosCons: {
    name: "Microservices vs Monolith",
    category: "Architecture Review",
    description: "Sample ChatGPT response evaluating architectural trade-offs",
    cards: [
      {
        id: "arch-1",
        title: "Pro: Independent Scalability & Deployment",
        type: "pros-cons",
        badge: "Advantage",
        content: `
          <p><strong>Details:</strong> Teams can scale high-traffic components (e.g. payment processing, analytics ingestion) horizontally without over-provisioning resource-heavy monolithic nodes.</p>
          <p><strong>Impact:</strong> Better cost efficiency under unpredictable traffic spikes.</p>
        `,
        plainText: "Pro: Independent Scalability & Deployment for high-traffic components without over-provisioning.",
        createdAt: Date.now()
      },
      {
        id: "arch-2",
        title: "Pro: Autonomous Feature Velocity",
        type: "pros-cons",
        badge: "Advantage",
        content: `
          <p><strong>Details:</strong> Separate engineering squads own decoupled services, enabling independent CI/CD pipelines, distinct technology choices, and zero deployment blockage.</p>
          <p><strong>Impact:</strong> Reduces release coordination friction across large organizations.</p>
        `,
        plainText: "Pro: Autonomous Feature Velocity with decoupled CI/CD pipelines and independent release schedules.",
        createdAt: Date.now()
      },
      {
        id: "arch-3",
        title: "Con: Distributed Tracing & Debugging Overhead",
        type: "pros-cons",
        badge: "Disadvantage",
        content: `
          <p><strong>Details:</strong> Tracing requests across 15+ network hops requires OpenTelemetry, Jaeger, and structured log correlation. Root-cause isolation becomes complex.</p>
          <p><strong>Impact:</strong> Increased mean-time-to-resolution (MTTR) during cascade outages.</p>
        `,
        plainText: "Con: Distributed Tracing & Debugging Overhead across network hops requiring OpenTelemetry.",
        createdAt: Date.now()
      },
      {
        id: "arch-4",
        title: "Con: Data Consistency & Distributed Transactions",
        type: "pros-cons",
        badge: "Disadvantage",
        content: `
          <p><strong>Details:</strong> Abandoning ACID guarantees forces systems to implement Saga patterns, outbox patterns, and eventual consistency reconciliations.</p>
          <p><strong>Impact:</strong> Higher cognitive burden on application developers.</p>
        `,
        plainText: "Con: Data Consistency & Distributed Transactions requiring Saga and outbox patterns.",
        createdAt: Date.now()
      }
    ]
  },

  tutorials: {
    name: "Building Chrome Extensions (MV3)",
    category: "Tutorial Steps",
    description: "Step-by-step tutorial cards generated by ChatGPT",
    cards: [
      {
        id: "step-1",
        title: "Step 1: Declare Manifest V3",
        type: "steps",
        badge: "Foundation",
        content: `
          <p>Configure <code>manifest.json</code> with <code>manifest_version: 3</code>, specify permissions (<code>storage</code>, <code>activeTab</code>), and declare host permissions.</p>
          <p><em>Tip:</em> In MV3, background scripts are now modern service workers.</p>
        `,
        plainText: "Step 1: Declare Manifest V3 with permissions, host permissions, and background service worker.",
        createdAt: Date.now()
      },
      {
        id: "step-2",
        title: "Step 2: Inject Content Scripts & Styles",
        type: "steps",
        badge: "DOM Manipulation",
        content: `
          <p>Register content scripts targeting specific URL patterns. Inject overlay containers without polluting the host page's global stylesheet or scope.</p>
          <p><em>Best Practice:</em> Use prefixing or Shadow DOM to prevent host style collisions.</p>
        `,
        plainText: "Step 2: Inject Content Scripts & Styles targeting host patterns cleanly.",
        createdAt: Date.now()
      },
      {
        id: "step-3",
        title: "Step 3: Setup Pointer & Touch Gestures",
        type: "steps",
        badge: "Interactivity",
        content: `
          <p>Implement unified pointer listeners (<code>pointerdown</code>, <code>pointermove</code>, <code>pointerup</code>) with pointer capture to ensure gestures don't drop off screen.</p>
          <p><em>Performance:</em> Use CSS 3D transforms for 60fps hardware acceleration.</p>
        `,
        plainText: "Step 3: Setup Pointer & Touch Gestures with pointer capture and hardware-accelerated transforms.",
        createdAt: Date.now()
      },
      {
        id: "step-4",
        title: "Step 4: Persist User State via chrome.storage",
        type: "steps",
        badge: "Persistence",
        content: `
          <p>Store saved items, counters, and user preferences in <code>chrome.storage.local</code>. Listen for storage change events to keep popup and content scripts in sync.</p>
        `,
        plainText: "Step 4: Persist User State via chrome.storage.local and listen for change events.",
        createdAt: Date.now()
      }
    ]
  },

  productivityTools: {
    name: "Top Developer Tools 2026",
    category: "Tool Picks",
    description: "Product recommendations list from ChatGPT",
    cards: [
      {
        id: "tool-1",
        title: "Antigravity IDE & Agent Framework",
        type: "product",
        badge: "Editor",
        content: `
          <p><strong>Category:</strong> Next-gen Agentic IDE.</p>
          <p><strong>Highlights:</strong> Seamless pair programming with deep tool execution, subagent orchestration, and workspace knowledge integration.</p>
        `,
        plainText: "Antigravity IDE: Next-gen Agentic IDE with subagent orchestration and workspace knowledge.",
        createdAt: Date.now()
      },
      {
        id: "tool-2",
        title: "Turborepo & Biome",
        type: "product",
        badge: "Toolchain",
        content: `
          <p><strong>Category:</strong> Build & Formatting Stack.</p>
          <p><strong>Highlights:</strong> Ultra-fast Rust-based linter and formatter that replaces ESLint and Prettier with instant feedback.</p>
        `,
        plainText: "Turborepo & Biome: Ultra-fast Rust-based linter and formatter replacing ESLint/Prettier.",
        createdAt: Date.now()
      },
      {
        id: "tool-3",
        title: "Tailwind CSS v4 Oxide",
        type: "product",
        badge: "CSS Engine",
        content: `
          <p><strong>Category:</strong> Styling Engine.</p>
          <p><strong>Highlights:</strong> Zero-config Rust engine with unified cascade layers and 10x faster compile times.</p>
        `,
        plainText: "Tailwind CSS v4 Oxide: Zero-config Rust styling engine with instant compile times.",
        createdAt: Date.now()
      }
    ]
  }
};

if (typeof window !== 'undefined') {
  window.MOCK_DATASETS = MOCK_DATASETS;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MOCK_DATASETS;
}
