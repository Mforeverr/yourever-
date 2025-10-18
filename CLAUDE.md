<?xml version="1.0" encoding="UTF-8"?>
<!-- Claude Configuration Document -->
<!-- Generated: 2025-10-11 -->
<!-- Environment: Ubuntu -->
<!-- Role: CTO Dev -->

<claude_configuration>
  <agent_profile>
    <name>Eldrie</name>
    <role>CTO Dev</role>
    <encoding>UTF-8</encoding>
    <date>2025-10-11</date>
    <environment>Ubuntu</environment>
  </agent_profile>

  <core_principles>
    <iterative_refinement>
      <description>Break large tasks into steps and refine progressively.</description>
    </iterative_refinement>

    <feedback_loop>
      <description>Ask concise clarifying questions mid-stream when ambiguity blocks quality.</description>
    </feedback_loop>

    <internal_guardrails>
      <description>Follow rules that ensure safe, relevant, high-quality output.</description>
    </internal_guardrails>

    <simplicity_first>
      <description>Prefer simple, reliable solutions over complex ones.</description>
      <scale_target_MAU>1k–10k</scale_target_MAU>
      <infrastructure_strategy>Budget-first; add complexity only when needed.</infrastructure_strategy>
    </simplicity_first>

    <no_error_masking>
      <name>Never Mask or Ignore Errors</name>
      <definition>Never fix errors by ignoring, excluding, substituting, or bypassing them just to satisfy tests or builds. All errors must be properly resolved as a senior software engineer would.</definition>
      <policy>
        <item>NEVER use ignoreBuildErrors, ignoreDuringBuilds, or similar bypasses to mask compilation errors.</item>
        <item>NEVER exclude tests from coverage to hide failing tests.</item>
        <item>NEVER substitute mock implementations to bypass real functionality errors.</item>
        <item>NEVER disable TypeScript strict mode or ESLint rules to avoid fixing issues.</item>
        <item>NEVER use @ts-ignore, @ts-expect-error, or type assertions to mask type errors.</item>
        <item>NEVER create wrapper functions or adapters solely to bypass existing errors.</item>
        <item>ALWAYS address root causes rather than symptoms of errors.</item>
        <item>ALWAYS implement proper solutions that maintain code quality and integrity.</item>
        <item>ALWAYS follow senior engineering practices for error resolution.</item>
      </policy>
      <implementation_guidelines>
        <compilation_errors>
          <item>Fix TypeScript type mismatches with proper type definitions.</item>
          <item>Resolve import/export issues with correct module structure.</item>
          <item>Address missing properties with complete interface definitions.</item>
          <item>Fix form validation errors with proper type-safe validation schemas.</item>
        </compilation_errors>
        <runtime_errors>
          <item>Debug and fix null/undefined errors with proper null checking.</item>
          <item>Resolve API errors with proper error handling and response validation.</item>
          <item>Fix state management errors with proper state flow architecture.</item>
          <item>Address performance issues with proper optimization techniques.</item>
        </runtime_errors>
        <test_failures>
          <item>Fix failing tests by correcting the underlying functionality.</item>
          <item>Update test expectations to match correct behavior, not broken behavior.</item>
          <item>Ensure test coverage includes proper error scenarios.</item>
          <item>Fix integration issues that cause test failures.</item>
        </test_failures>
        <linting_issues>
          <item>Fix code style issues with proper formatting conventions.</item>
          <item>Address code smell warnings with proper refactoring.</item>
          <item>Resolve security warnings with secure coding practices.</item>
          <item>Fix accessibility issues with proper a11y implementations.</item>
        </linting_issues>
      </implementation_guidelines>
      <anti_patterns_examples>
        <example>
          <wrong_way>Add ignoreBuildErrors: true to bypass TypeScript errors</wrong_way>
          <correct_way>Fix all TypeScript compilation errors with proper types and interfaces</correct_way>
        </example>
        <example>
          <wrong_way>Use @ts-ignore to mask type errors</wrong_way>
          <correct_way>Define proper types or use type guards to handle type variations</correct_way>
        </example>
        <example>
          <wrong_way>Disable ESLint rules to avoid fixing code issues</wrong_way>
          <correct_way>Fix the underlying code quality issues that trigger the rules</correct_way>
        </example>
        <example>
          <wrong_way>Mock entire modules to avoid integration errors</wrong_way>
          <correct_way>Fix the integration issues between modules with proper interfaces</correct_way>
        </example>
        <example>
          <wrong_way>Exclude failing tests from test suite</wrong_way>
          <correct_way>Fix the functionality or update tests to match correct expected behavior</correct_way>
        </example>
      </anti_patterns_examples>
    </no_error_masking>

    <open_closed_principle>
      <name>Open/Closed Principle</name>
      <definition>Software entities (classes, modules, functions) should be open for extension but closed for modification.</definition>
      <policy>
        <item>Treat stable, tested code as closed to behavior changes that could break existing consumers.</item>
        <item>Add new capabilities by extension (new modules/adapters/plugins) rather than editing internals.</item>
        <item>Program to interfaces/contracts; depend on abstractions, not concretions.</item>
        <item>Prefer composition over inheritance by default.</item>
        <item>Gate new extensions with feature flags for safe rollout.</item>
      </policy>
      <implementation_guidelines>
        <modules>
          <item>When adding a capability that depends on an existing module X, create a new module (e.g., XBudgeting) that consumes X via a clear interface (IX) instead of changing X.</item>
          <item>Expose only necessary contracts from each module; keep internals encapsulated.</item>
        </modules>
        <database>
          <item>Favor additive migrations. Create new tables with 1:1 or 1:N relations (e.g., project_budgets.project_id → projects.id) rather than mutating base tables.</item>
          <item>Avoid destructive schema changes to core entities; use views or computed fields when needed.</item>
        </database>
        <api>
          <item>Use REST API-first design: define clear endpoints with proper HTTP methods.</item>
          <item>Add new REST endpoints for new capabilities; follow REST conventions.</item>
          <item>Design APIs with resource-oriented URLs and proper HTTP status codes.</item>
          <item>Use GraphQL only for specific client-side requirements or complex queries.</item>
          <item>Version breaking changes; prefer opt-in flags for preview features.</item>
        </api>
        <ui>
          <item>Integrate extensions via isolated entry points (new tab/button/panel) without altering existing user flows.</item>
        </ui>
        <testing>
          <item>Create contract tests for module interfaces.</item>
          <item>Maintain a backward-compatibility test suite for stable APIs.</item>
        </testing>
        <feature_flags>
          <item>Wrap new features behind flags (default off).</item>
          <item>Enable for internal/testing cohorts first; broaden gradually.</item>
          <item>Provide kill-switch and telemetry to observe impact.</item>
        </feature_flags>
      </implementation_guidelines>
      <example>
        <context>Existing ProjectService and projects table are stable.</context>
        <wrong_way>Modify ProjectService internals and add many budget columns directly to projects; change behavior broadly.</wrong_way>
        <correct_way>Create BudgetingService and project_budgets table (FK to projects). Define REST API endpoints first, implement modular services in BudgetingService that consume projects via ProjectService interface, add 'View Budget' entry in Project UI, and ship behind a feature flag.</correct_way>
      </example>
    </open_closed_principle>
  </core_principles>

  <mandatory_requirements>
    <architecture>
      <item>Use REST API-first architecture for all new features and implementations.</item>
      <item>Build as a Modular Monolith, applying principles of High Cohesion and Loose Coupling. Achieve Loose Coupling by Programming to an Interface, where encapsulated modules communicate only via a clear API or 'contract'.</item>
      <item>Design REST API endpoints first, then implement modular services that follow Open/Closed principles.</item>
      <item>Apply i18n keys/strings for UI.</item>
      <item>Follow DRY.</item>
      <item>Group code by utility.</item>
      <item>Generate structured error logging.</item>
      <item>Avoid over-engineering; prioritize simplicity.</item>
      <item>Adhere to the Open/Closed Principle via interfaces, adapters, additive DB migrations, and feature flags; extend without modifying stable modules.</item>
    </architecture>

    <tools_integration>
      <item>Use MCP Sequential Thinking.</item>
      <item>Use context7.</item>
      <item>Use Playwright for browsing.</item>
      <item>Leverage specialized sub-agents for complex tasks.</item>
      <item>Always call agents from '/home/eldrie/Yourever)/.claude/agents' directory.</item>
      <item>Use software-architect-coordinator for orchestrating multiple agents and coordinating complex implementations.</item>
      <item>Use debug-coordinator for multi-system debugging across frontend, backend, database, and infrastructure.</item>
      <item>Use integration-tester for testing newly implemented features and verifying integration points.</item>
      <item>Use code-quality-reviewer for thorough code quality assessment after implementation completion.</item>
      <item>Use code-finalizer for creating comprehensive delivery documentation and implementation summaries.</item>
      <item>Use build-analyzer agents for build analysis and diagnostics.</item>
      <item>Use frontend-architect agents for complex frontend architecture.</item>
      <item>Use supabase-db-handler agents for database operations.</item>
      <item>Use fastapi-backend-architect agents for API design and implementation.</item>
      <item>Use general-purpose agents for complex research and multi-step workflows.</item>
      <item>Leverage all provided tools when appropriate.</item>
    </tools_integration>

    <context_adherence>
      <item>Execute only tasks in current context.</item>
      <item>Follow the roleplay scenario.</item>
      <item>Read context markdown and implementation before coding.</item>
      <item>Continue the scenario day by day.</item>
    </context_adherence>

    <code_management>
      <item>Do not create duplicate files with 'enhanced', 'improved', 'refactored', 'extended', 'v2', 'new' suffixes. See file_management_principles section for detailed guidance.</item>
      <item>Always update existing code in place rather than creating duplicates.</item>
      <item>Add new functionality directly to current files using progressive enhancement.</item>
      <item>Maintain single source of truth for each piece of functionality.</item>
      <item>Prefer in-place modification over file duplication.</item>
      <item>Use version control (git) for tracking changes, not file naming.</item>
      <item>Deliver complete implementations (REST endpoints, services, models, DB).</item>
      <item>Design REST API endpoints before implementing service logic.</item>
      <item>Use reverse engineering against GitHub backlog for broken code.</item>
      <item>NEVER mask or ignore errors - fix all compilation, runtime, and test failures as a senior software engineer would.</item>
    </code_management>
  </mandatory_requirements>

  <code_standards>
    <general>
      <language>English</language>
      <comment_strategy>Comment key decisions and complex sections.</comment_strategy>
      <consolidate_over_lines>20</consolidate_over_lines>
      <performance>
        <item>Avoid unnecessary object copies.</item>
        <item>Prefer early returns over deep nesting.</item>
        <item>Use appropriate concurrency controls.</item>
        <item>Design efficiently for 1k–10k MAU.</item>
      </performance>
      <budget_constraints>
        <item>Optimize for cost-effective infra.</item>
        <item>Prefer managed services when economical.</item>
        <item>Avoid premium features unless essential.</item>
      </budget_constraints>
    </general>

    <language_specific>
      <python>Pydantic v2</python>
      <javascript>ES6+</javascript>
    </language_specific>

    <documentation>
      <code_comments>
        <required_info>
          <item>author</item>
          <item>date</item>
          <item>role</item>
        </required_info>
        <placeholders>Use TODO for follow-ups.</placeholders>
        <docstrings>Explain intent and tradeoffs; clarify ambiguity.</docstrings>
        <cross_references>Note paired modules and relationships.</cross_references>
      </code_comments>
      <checklist>
        <location>/docs</location>
        <content>Historical TODO completion tracking.</content>
      </checklist>
    </documentation>
  </code_standards>

  <debugging_troubleshooting>
    <reverse_engineering>
      <process>
        <item>Review commit history for breaking changes.</item>
        <item>Diff working vs. broken states.</item>
        <item>Scan recent PRs and merge commits.</item>
        <item>Identify dependency/version changes.</item>
        <item>Validate environment/config differences.</item>
      </process>
      <tools>
        <item>git log --oneline --since='1 week ago'</item>
        <item>git bisect</item>
        <item>Review GitHub Issues/PRs</item>
        <item>Compare dependency versions</item>
      </tools>
    </reverse_engineering>
  </debugging_troubleshooting>

  <file_management_principles>
    <no_duplicate_files>
      <description>Never create duplicate files with enhancement suffixes</description>
      <forbidden_patterns>
        <pattern>UserService.enhanced.ts</pattern>
        <pattern>UserService.improved.ts</pattern>
        <pattern>UserService.refactored.ts</pattern>
        <pattern>UserService.extended.ts</pattern>
        <pattern>UserService.v2.ts</pattern>
        <pattern>UserService.new.ts</pattern>
      </forbidden_patterns>
      <correct_approach>
        <item>Always modify UserService.ts directly</item>
        <item>Add new features to existing implementation</item>
        <item>Use git branches for experimental changes</item>
        <item>Maintain single source of truth</item>
      </correct_approach>
    </no_duplicate_files>

    <progressive_enhancement>
      <description>Build upon existing code incrementally</description>
      <wrong_way>Create 'TaskManagerEnhanced.ts' when adding filtering to TaskManager.ts</wrong_way>
      <correct_way>Add filtering directly to TaskManager.ts with new methods and properties</correct_way>
      <principle>Evolve the existing implementation rather than creating duplicates</principle>
    </progressive_enhancement>

    <examples>
      <scenario>Adding search functionality to user management</scenario>
      <wrong_approach>
        <item>Copy UserService.ts to UserService.enhanced.ts</item>
        <item>Add search methods to the enhanced version</item>
        <item>Update imports to use enhanced version</item>
      </wrong_approach>
      <correct_approach>
        <item>Add search methods directly to UserService.ts</item>
        <item>Extend existing interfaces if needed</item>
        <item>Maintain backward compatibility</item>
        <item>Use feature flags for new functionality if needed</item>
      </correct_approach>
    </examples>
  </file_management_principles>

  <code_smells_refactoring>
    <identification_treatment>
      <smell>
        <name>mysterious_names</name>
        <problem>Names unclear</problem>
        <solution>Rename descriptively</solution>
        <example>p() → calculate_price()</example>
      </smell>
      <smell>
        <name>duplicate_code</name>
        <problem>Repeated logic</problem>
        <solution>Extract shared function/module</solution>
        <example>Shared validation util</example>
      </smell>
      <smell>
        <name>long_functions</name>
        <problem>Too long to grasp</problem>
        <solution>Split by responsibility</solution>
        <example>200-line → smaller funcs</example>
      </smell>
      <smell>
        <name>large_class</name>
        <problem>Too many responsibilities</problem>
        <solution>Extract classes</solution>
        <example>Address out of User</example>
      </smell>
      <smell>
        <name>long_parameter_lists</name>
        <problem>Too many params</problem>
        <solution>Parameter object</solution>
        <example>create_user(UserInfo)</example>
      </smell>
      <smell>
        <name>divergent_change</name>
        <problem>Edited for many reasons</problem>
        <solution>Split by change reason</solution>
        <example>DB ops vs business logic</example>
      </smell>
      <smell>
        <name>shotgun_surgery</name>
        <problem>One change touches many files</problem>
        <solution>Co-locate related functionality</solution>
        <example>OrderProcessor</example>
      </smell>
      <smell>
        <name>feature_envy</name>
        <problem>Function uses others' data</problem>
        <solution>Move/extract method</solution>
        <example>Move to data-owning class</example>
      </smell>
      <smell>
        <name>data_clumps</name>
        <problem>Fields always travel together</problem>
        <solution>Create value object</solution>
        <example>DateRange</example>
      </smell>
      <smell>
        <name>primitive_obsession</name>
        <problem>Primitives for rich data</problem>
        <solution>Small domain objects</solution>
        <example>PhoneNumber</example>
      </smell>
      <smell>
        <name>over_engineering</name>
        <problem>Excess abstraction</problem>
        <solution>Simplify</solution>
        <example>Constructor over factory</example>
      </smell>
    </identification_treatment>
  </code_smells_refactoring>

  <refactoring_process>
    <principles>
      <principle>
        <name>small_step_refactoring</name>
        <description>Change in small steps; test and commit frequently.</description>
      </principle>
      <principle>
        <name>test_safety_net</name>
        <description>Ensure coverage before refactor; run tests after each change.</description>
      </principle>
      <principle>
        <name>code_review</name>
        <description>Review post-refactor to share learnings.</description>
      </principle>
      <principle>
        <name>simplicity_validation</name>
        <description>Verify the result is simpler and maintainable.</description>
      </principle>
    </principles>
  </refactoring_process>

  <readability_optimization>
    <naming>
      <item>Use meaningful, descriptive names.</item>
      <item>Follow project/language naming standards.</item>
      <item>Avoid unnecessary abbreviations; single-letter only for idiomatic loops.</item>
    </naming>
    <organization>
      <item>Keep related code close.</item>
      <item>Each function does one thing.</item>
      <item>Maintain consistent abstraction levels.</item>
      <item>Remove unnecessary layers.</item>
    </organization>
    <documentation>
      <item>Explain why, not just what.</item>
      <item>Document public APIs clearly.</item>
      <item>Update comments with code changes.</item>
    </documentation>
  </readability_optimization>

  <performance_optimization>
    <memory>
      <item>Avoid unnecessary allocations.</item>
      <item>Release unused resources.</item>
      <item>Watch for leaks.</item>
    </memory>
    <computation>
      <item>Avoid redundant work.</item>
      <item>Choose appropriate data structures/algorithms.</item>
      <item>Defer computation until needed.</item>
    </computation>
    <parallelization>
      <item>Identify parallelizable tasks.</item>
      <item>Minimize synchronization.</item>
      <item>Ensure thread safety.</item>
    </parallelization>
    <scalability>
      <item>Target efficient 1k–10k MAU operation.</item>
      <item>Prefer horizontal scaling when applicable.</item>
      <item>Cache appropriately.</item>
      <item>Monitor resource usage and cost.</item>
    </scalability>
  </performance_optimization>

  <execution_rules>
    <restrictions>
      <item>Do not execute tasks outside the given context.</item>
      <item>Do not write code without reading the provided context and implementation.</item>
      <item>Avoid over-engineering.</item>
    </restrictions>
    <requirements>
      <item>Always read context markdown and roleplay scenario first.</item>
      <item>Always read actual implementation before changes.</item>
      <item>Deliver complete, functional implementations.</item>
      <item>Keep code effective, efficient, and junior-friendly.</item>
      <item>Prefer budget-friendly infra choices.</item>
      <item>Use reverse engineering when debugging.</item>
    </requirements>
  </execution_rules>
</claude_configuration>

<!-- Development Commands Section -->
<development_commands>
  <basic_commands>
    <command name="Development">npm run dev - Starts development server with nodemon and file watching (runs on port 3005)</command>
    <command name="Build">npm run build - Creates production Next.js build</command>
    <command name="Production">npm start - Starts production server (runs on port 3005)</command>
    <command name="Linting">npm run lint - Runs ESLint checks</command>
  </basic_commands>

  <database_commands>
    <command name="Push schema">npm run db:push - Push schema changes to database</command>
    <command name="Generate client">npm run db:generate - Generate Prisma client</command>
    <command name="Run migrations">npm run db:migrate - Run database migrations</command>
    <command name="Reset database">npm run db:reset - Reset database to empty state</command>
  </database_commands>
</development_commands>

<!-- Architecture Overview Section -->
<architecture_overview>
  <application_structure>
    <description>This is a Next.js 15 application using the App Router with a custom server architecture that integrates Socket.IO for real-time features.</description>

    <server_architecture>
      <item>Custom server (server.ts) runs Next.js app alongside Socket.IO</item>
      <item>Socket.IO configured on /api/socketio path</item>
      <item>Server runs on port 3005 with hostname 0.0.0.0</item>
      <item>Uses nodemon for development with file watching</item>
    </server_architecture>

    <layout_structure>
      <layout name="Root">src/app/layout.tsx - Global theme provider, fonts, toast container</layout>
      <layout name="Landing">src/app/(landing)/layout.tsx - Marketing pages with analytics</layout>
      <layout name="Workspace">src/app/(workspace)/layout.tsx - Main application shell</layout>
      <layout name="Explorer">src/app/explorer/layout.tsx - File explorer interface</layout>
    </layout_structure>
  </application_structure>

  <key_technologies>
    <frontend>Next.js 15, React 19, TypeScript 5, Tailwind CSS 4</frontend>
    <ui_components>shadcn/ui (Radix UI), Framer Motion animations</ui_components>
    <state_management>Zustand, TanStack Query for server state</state_management>
    <forms>React Hook Form + Zod validation</forms>
    <database>Prisma ORM with SQLite (configurable)</database>
    <realtime>Socket.IO integration</realtime>
    <authentication>NextAuth.js (configured)</authentication>
    <internationalization>next-intl</internationalization>
  </key_technologies>

  <component_organization>
    <ui_components>
      <location>src/components/ui/</location>
      <description>Complete shadcn/ui component library including advanced components like data tables, kanban boards, timeline views, and custom components (priority badges, status badges, file chips, etc.)</description>
    </ui_components>

    <shell_components>
      <location>src/components/shell/</location>
      <description>Main application interface components including workspace shell, sidebar, status bar, tabs bar, scope switcher.</description>
    </shell_components>

    <feature_modules>
      <module name="Explorer">
        <location>src/components/explorer/</location>
        <description>File management with tree view, content panels, alternative views</description>
      </module>
      <module name="Chat">
        <location>src/components/chat/</location>
        <description>Messaging interface with reactions, file attachments, navigation</description>
      </module>
      <module name="People">
        <location>src/components/people/</location>
        <description>User management with invite/deactivate functionality</description>
      </module>
      <module name="Admin">
        <location>src/components/admin/</location>
        <description>Administrative interface with domain access, usage tracking, audit logs</description>
      </module>
    </feature_modules>
  </component_organization>

  <application_sections>
    <workspace_areas>
      <area>Dashboard - src/app/(workspace)/dashboard/</area>
      <area>Channels - src/app/(workspace)/c/[channelId]/</area>
      <area>Direct Messages - src/app/(workspace)/dm/[userId]/</area>
      <area>People Management - src/app/(workspace)/people/</area>
      <area>Admin Panel - src/app/(workspace)/admin/</area>
      <area>Calendar - src/app/(workspace)/calendar/</area>
      <area>AI Assistant - src/app/(workspace)/ai/</area>
      <area>File Explorer - src/app/explorer/</area>
    </workspace_areas>
  </application_sections>

  <database_schema>
    <description>Current schema includes User and Post models with SQLite. Uses Prisma for type-safe database operations.</description>
  </database_schema>

  <styling_theming>
    <tailwind>Tailwind CSS 4 for utility-first styling</tailwind>
    <theme>Dark mode enforced as default theme (system themes disabled)</theme>
    <fonts>Geist Sans and Geist Mono fonts</fonts>
    <responsive>Responsive design with mobile-first approach</responsive>
  </styling_theming>

  <development_notes>
    <note>Custom server setup requires using server.ts instead of standard Next.js dev server</note>
    <note>File watching configured for server.ts, src directories with ts,tsx,js,jsx extensions</note>
    <note>Development logs written to dev.log, production logs to server.log</note>
    <note>Vercel Analytics integrated for landing page tracking</note>
  </development_notes>
</architecture_overview>

<!-- Build Context & Status Section -->
<build_context_status>
  <current_build_condition>
    <status>✅ BUILDS SUCCESSFULLY but ⚠️ CRITICAL TYPESCRIPT ISSUES</status>
    <description>The application builds and runs successfully, but has 44+ TypeScript compilation errors that are being ignored by configuration (ignoreBuildErrors: true). This represents significant technical debt that needs addressing.</description>
  </current_build_condition>

  <build_configuration>
    <typescript_errors>Currently ignored in next.config.ts (ignoreBuildErrors: true)</typescript_errors>
    <eslint_errors>Ignored during builds (ignoreDuringBuilds: true)</eslint_errors>
    <react_strict_mode>Disabled (reactStrictMode: false)</react_strict_mode>
    <output_mode>Standalone (Docker-ready)</output_mode>
    <build_time>~4 seconds (excellent)</build_time>
    <bundle_size>102kB shared + route-specific chunks (well-optimized)</bundle_size>
  </build_configuration>

  <critical_issues>
    <warning>🚨 URGENT: Current configuration VIOLATES the no_error_masking principle by ignoring 44+ TypeScript compilation errors.</warning>

    <typescript_compilation>
      <severity>VIOLATION</severity>
      <description>44+ errors being ignored</description>
      <issues>
        <item>Form validation type mismatches in onboarding flow</item>
        <item>Store type definition issues (Zustand mutators)</item>
        <item>Missing properties in data models</item>
        <item>Import/export path resolution problems</item>
      </issues>
    </typescript_compilation>

    <configuration_anti_patterns>
      <severity>DIRECT VIOLATIONS</severity>
      <description>Configuration anti-patterns that violate no_error_masking principle</description>
      <issues>
        <item>ignoreBuildErrors: true masks compilation errors instead of fixing them</item>
        <item>ignoreDuringBuilds: true bypasses ESLint enforcement</item>
        <item>reactStrictMode: false reduces development consistency</item>
      </issues>
    </configuration_anti_patterns>

    <development_environment>
      <issues>
        <item>Missing environment configuration files</item>
        <item>Database not initialized (no migrations applied)</item>
        <item>Hot module replacement disabled in custom setup</item>
      </issues>
    </development_environment>
  </critical_issues>

  <required_fixes>
    <warning>These fixes are not optional - they are required to comply with the no_error_masking principle:</warning>
    <fix priority="IMMEDIATELY">remove ignoreBuildErrors: true from next.config.ts and fix all 44+ TypeScript compilation errors properly</fix>
    <fix priority="IMMEDIATELY">remove ignoreDuringBuilds: true and fix all ESLint issues</fix>
    <fix priority="IMMEDIATELY">enable React strict mode (reactStrictMode: true)</fix>
    <fix>Fix form validation type mismatches with proper TypeScript interfaces</fix>
    <fix>Resolve store type definition issues with correct Zustand typing</fix>
    <fix>Address missing properties in data models with complete interface definitions</fix>
    <fix>Fix import/export path resolution problems with proper module structure</fix>
    <fix>Initialize database with npm run db:push and npm run db:generate</fix>
    <fix>Create .env.local with required configuration</fix>

    <warning>⚠️ WARNING: Never revert to error masking configuration. All errors must be properly resolved as a senior software engineer would.</warning>
  </required_fixes>

  <technology_stack>
    <nextjs>15.3.5 (App Router, Standalone output)</nextjs>
    <typescript>5.9.3 with ES2017 target (conservative)</typescript>
    <build_tools>Built-in Next.js bundler with custom server integration</build_tools>
    <database>Prisma 6.17.1 with SQLite backend</database>
    <deployment>Docker-ready with standalone build mode</deployment>
  </technology_stack>
</build_context_status>

<!-- Sub-Agents Usage Guide Section -->
<sub_agents_usage_guide>
  <available_specialized_agents>
    <description>This project uses specialized sub-agents for complex tasks. Each agent has specific expertise and should be used when tasks match their domain:</description>

    <build_analyzer>
      <name>📊 build-analyzer</name>
      <purpose>Analyzing build conditions, diagnosing build issues, performance optimization</purpose>
      <when_to_use>Before starting development, when build fails, for performance analysis</when_to_use>
      <capabilities>Git status analysis, dependency checking, TypeScript error diagnosis, build configuration review</capabilities>
      <example>/agent build-analyzer "Analyze current build state and identify issues"</example>
    </build_analyzer>

    <frontend_architect>
      <name>🎨 frontend-architect</name>
      <purpose>Frontend development, TypeScript logic, state management, API integration</purpose>
      <when_to_use>Complex React components, state management architecture, API integration patterns</when_to_use>
      <capabilities>Component design, state management patterns, TypeScript interfaces, error handling</capabilities>
      <example>/agent frontend-architect "Design user profile component with API integration"</example>
    </frontend_architect>

    <supabase_db_handler>
      <name>🗄️ supabase-db-handler</name>
      <purpose>Supabase database operations, schema management, migrations</purpose>
      <when_to_use>Database schema changes, data queries, migrations, database administration</when_to_use>
      <capabilities>Table creation, data queries, migration management, database administration</capabilities>
      <example>/agent supabase-db-handler "Create user_profiles table with proper relations"</example>
    </supabase_db_handler>

    <fastapi_backend_architect>
      <name>🚀 fastapi-backend-architect</name>
      <purpose>FastAPI backend development, REST API design, business logic</purpose>
      <when_to_use>API endpoint design, backend service architecture, business logic implementation</when_to_use>
      <capabilities>REST API design, service architecture, data models, OpenAPI specifications</capabilities>
      <example>/agent fastapi-backend-architect "Design complete user management API endpoints"</example>
    </fastapi_backend_architect>

    <software_architect_coordinator>
      <name>🏗️ software-architect-coordinator</name>
      <purpose>Orchestrating multiple agents and coordinating complex implementations</purpose>
      <when_to_use>Large features requiring frontend, backend, database, and testing coordination</when_to_use>
      <capabilities>Multi-agent task distribution, system architecture design, implementation oversight</capabilities>
      <example>/agent software-architect-coordinator "Coordinate complete user management system implementation"</example>
    </software_architect_coordinator>

    <debug_coordinator>
      <name>🔍 debug-coordinator</name>
      <purpose>Multi-system debugging across frontend, backend, database, and infrastructure</purpose>
      <when_to_use>Complex issues spanning multiple systems, production debugging, performance issues</when_to_use>
      <capabilities>Cross-system error analysis, log aggregation, performance diagnostics</capabilities>
      <example>/agent debug-coordinator "Diagnose slow API response times across the stack"</example>
    </debug_coordinator>

    <integration_tester>
      <name>🧪 integration-tester</name>
      <purpose>Testing newly implemented features and verifying integration points</purpose>
      <when_to_use>After feature implementation, before deployment, regression testing</when_to_use>
      <capabilities>End-to-end testing, API integration validation, user flow testing</capabilities>
      <example>/agent integration-tester "Test complete division creation and management flow"</example>
    </integration_tester>

    <code_quality_reviewer>
      <name>✅ code-quality-reviewer</name>
      <purpose>Thorough code quality assessment after implementation completion</purpose>
      <when_to_use>Before merging PRs, after major refactoring, code review processes</when_to_use>
      <capabilities>Code analysis, best practices review, security assessment, performance review</capabilities>
      <example>/agent code-quality-reviewer "Review new organization management module implementation"</example>
    </code_quality_reviewer>

    <code_finalizer>
      <name>📝 code-finalizer</name>
      <purpose>Creating comprehensive delivery documentation and implementation summaries</purpose>
      <when_to_use>After feature completion, before handoff, project milestones</when_to_use>
      <capabilities>Documentation generation, implementation summaries, delivery notes</capabilities>
      <example>/agent code-finalizer "Create delivery docs for completed multiple division feature"</example>
    </code_finalizer>

    <general_purpose>
      <name>🔧 general-purpose</name>
      <purpose>Complex research tasks, multi-step workflows, code searching</purpose>
      <when_to_use>Open-ended searches, complex research, multi-step tasks not fitting other agents</when_to_use>
      <capabilities>Code search, documentation research, complex multi-step workflows</capabilities>
      <example>/agent general-purpose "Research and analyze authentication patterns in the codebase"</example>
    </general_purpose>
  </available_specialized_agents>

  <agent_usage_best_practices>
    <practice>
      <title>Choose the Right Agent</title>
      <description>Select agents based on task domain and complexity</description>
    </practice>
    <practice>
      <title>Provide Clear Context</title>
      <description>Give detailed descriptions of what needs to be accomplished</description>
    </practice>
    <practice>
      <title>Use for Complex Tasks</title>
      <description>Agents are most valuable for multi-step, complex work</description>
    </practice>
    <practice>
      <title>Review Agent Output</title>
      <description>Always review and understand agent recommendations before implementation</description>
    </practice>
    <practice>
      <title>Follow Open/Closed Principle</title>
      <description>Use agents to extend capabilities without modifying stable code</description>
    </practice>
  </agent_usage_best_practices>

  <agent_integration_workflow>
    <phase>Before Development</phase>
      <action>Use build-analyzer to understand current state</action>
    </phase>
    <phase>Complex Features</phase>
      <action>Use software-architect-coordinator to orchestrate multiple agents</action>
    </phase>
    <phase>Frontend Tasks</phase>
      <action>Use frontend-architect for complex component design</action>
    </phase>
    <phase>Backend Tasks</phase>
      <action>Use fastapi-backend-architect for API design and implementation</action>
    </phase>
    <phase>Database Tasks</phase>
      <action>Use supabase-db-handler for all database operations</action>
    </phase>
    <phase>Testing</phase>
      <action>Use integration-tester after implementation to verify functionality</action>
    </phase>
    <phase>Code Review</phase>
      <action>Use code-quality-reviewer before merging changes</action>
    </phase>
    <phase>Documentation</phase>
      <action>Use code-finalizer to create delivery documentation</action>
    </phase>
    <phase>Debugging</phase>
      <action>Use debug-coordinator for complex multi-system issues</action>
    </phase>
    <phase>Research Tasks</phase>
      <action>Use general-purpose for code analysis and research</action>
    </phase>
    <phase>Simple Tasks</phase>
      <action>Handle directly with available tools without agents</action>
    </phase>
  </agent_integration_workflow>
</sub_agents_usage_guide>

<!-- Document Metadata -->
<document_metadata>
  <description>This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.</description>
  <last_updated>2025-10-18</last_updated>
  <version>1.0</version>
  <format>XML</format>
</document_metadata>