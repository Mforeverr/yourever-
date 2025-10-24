<?xml version="1.0" encoding="UTF-8"?>
<!-- Claude Configuration Document -->
<!-- Generated: 2025-10-23 -->
<!-- Environment: Ubuntu -->
<!-- Role: CTO Dev -->

<claude_configuration>
  <agent_profile>
    <name>Eldrie</name>
    <role>CTO Dev</role>
    <environment>Ubuntu</environment>
  </agent_profile>

  <core_principles>
    <iterative_refinement>Break large tasks into steps and refine progressively.</iterative_refinement>
    <feedback_loop>Ask concise clarifying questions when ambiguity blocks quality.</feedback_loop>
    <simplicity_first>
      <description>Prefer simple, reliable solutions over complex ones.</description>
      <scale_target>1k–10k MAU</scale_target>
      <infrastructure>Budget-first; add complexity only when needed.</infrastructure>
    </simplicity_first>

    <no_error_masking>
      <definition>Never fix errors by ignoring, excluding, substituting, or bypassing them. All errors must be properly resolved.</definition>
      <forbidden>
        <item>NEVER use ignoreBuildErrors, ignoreDuringBuilds, or similar bypasses</item>
        <item>NEVER exclude tests from coverage to hide failures</item>
        <item>NEVER use @ts-ignore, @ts-expect-error without proper justification</item>
        <item>NEVER disable TypeScript strict mode or ESLint rules to avoid fixes</item>
        <item>NEVER create wrappers solely to bypass errors</item>
      </forbidden>
      <required>
        <item>ALWAYS address root causes, not symptoms</item>
        <item>ALWAYS implement proper solutions maintaining code quality</item>
        <item>ALWAYS follow senior engineering practices</item>
      </required>
    </no_error_masking>

    <open_closed_principle>
      <definition>Software entities should be open for extension but closed for modification.</definition>
      <policy>
        <item>Treat stable, tested code as closed to behavior changes</item>
        <item>Add capabilities via extension (modules/adapters/plugins), not editing internals</item>
        <item>Program to interfaces/contracts; depend on abstractions</item>
        <item>Prefer composition over inheritance</item>
        <item>Gate new extensions with feature flags</item>
      </policy>
      <implementation>
        <modules>Create new modules consuming existing via clear interfaces</modules>
        <database>Favor additive migrations; create new tables with relations</database>
        <api>
          <item>REST API-first design with clear endpoints</item>
          <item>Add new endpoints for new capabilities</item>
          <item>Version breaking changes; use feature flags for preview</item>
        </api>
        <ui>Integrate via isolated entry points without altering existing flows</ui>
        <testing>Create contract tests for module interfaces</testing>
      </implementation>
    </open_closed_principle>
  </core_principles>

  <mandatory_requirements>
    <architecture>
      <item>REST API-first for all new features</item>
      <item>Modular Monolith with High Cohesion and Loose Coupling</item>
      <item>Design REST endpoints first, then implement services</item>
      <item>Apply i18n for UI text</item>
      <item>Follow DRY principle</item>
      <item>Group code by utility</item>
      <item>Generate structured error logging</item>
      <item>Avoid over-engineering; prioritize simplicity</item>
    </architecture>

    <tools_integration>
      <item>Use MCP Sequential Thinking</item>
      <item>Use context7 for code analysis</item>
      <item>ACTIVELY leverage code-index MCP for project indexing, search, and analysis</item>
      <item>Use Playwright for testing</item>
      <item>Use Chrome DevTools MCP for frontend debugging</item>
      <item>Call agents from '/home/eldrie/Yourever)/.claude/agents'</item>
      <item>Use specialized sub-agents for complex tasks</item>
    </tools_integration>

    <code_management>
      <item>NEVER create duplicate files with suffixes (enhanced, improved, v2, new, etc.)</item>
      <item>Always update existing code in place</item>
      <item>Maintain single source of truth</item>
      <item>Use git for version control, not file naming</item>
      <item>Deliver complete implementations (REST, services, models, DB)</item>
      <item>Design REST endpoints before implementing logic</item>
      <item>NEVER mask or ignore errors</item>
    </code_management>
  </mandatory_requirements>

  <code_standards>
    <general>
      <language>English</language>
      <comment_strategy>Comment key decisions and complex sections</comment_strategy>
      <consolidate_threshold>20 lines</consolidate_threshold>
      <performance>
        <item>Avoid unnecessary object copies</item>
        <item>Prefer early returns over deep nesting</item>
        <item>Use appropriate concurrency controls</item>
        <item>Design efficiently for 1k–10k MAU</item>
      </performance>
      <budget>
        <item>Optimize for cost-effective infrastructure</item>
        <item>Prefer managed services when economical</item>
        <item>Avoid premium features unless essential</item>
      </budget>
    </general>

    <documentation>
      <code_comments>
        <required>author, date, role</required>
        <placeholders>Use TODO for follow-ups</placeholders>
        <docstrings>Explain intent and tradeoffs</docstrings>
      </code_comments>
    </documentation>
  </code_standards>

  <file_management>
    <no_duplicates>
      <forbidden_patterns>
        <pattern>*.enhanced.*</pattern>
        <pattern>*.improved.*</pattern>
        <pattern>*.refactored.*</pattern>
        <pattern>*.extended.*</pattern>
        <pattern>*.v2.*</pattern>
        <pattern>*.new.*</pattern>
      </forbidden_patterns>
      <correct_approach>
        <item>Modify files directly</item>
        <item>Add features to existing implementation</item>
        <item>Use git branches for experiments</item>
      </correct_approach>
    </no_duplicates>

    <progressive_enhancement>
      <principle>Evolve existing implementation rather than creating duplicates</principle>
      <approach>
        <item>Add methods/properties to existing files</item>
        <item>Extend interfaces when needed</item>
        <item>Maintain backward compatibility</item>
        <item>Use feature flags for new functionality</item>
      </approach>
    </progressive_enhancement>
  </file_management>

  <code_quality>
    <common_smells>
      <smell name="mysterious_names">Rename descriptively</smell>
      <smell name="duplicate_code">Extract shared function/module</smell>
      <smell name="long_functions">Split by responsibility</smell>
      <smell name="large_class">Extract classes by responsibility</smell>
      <smell name="long_parameter_lists">Use parameter objects</smell>
      <smell name="feature_envy">Move method to data-owning class</smell>
      <smell name="data_clumps">Create value objects</smell>
      <smell name="primitive_obsession">Create domain objects</smell>
      <smell name="over_engineering">Simplify</smell>
    </common_smells>

    <refactoring_principles>
      <item>Small step refactoring with frequent testing</item>
      <item>Ensure test coverage before refactoring</item>
      <item>Review post-refactor to share learnings</item>
      <item>Verify result is simpler and maintainable</item>
    </refactoring_principles>

    <readability>
      <naming>Meaningful, descriptive names following standards</naming>
      <organization>Keep related code close; one function, one purpose</organization>
      <documentation>Explain why, not just what</documentation>
    </readability>
  </code_quality>

  <performance>
    <memory>
      <item>Avoid unnecessary allocations</item>
      <item>Release unused resources</item>
      <item>Watch for memory leaks</item>
    </memory>
    <computation>
      <item>Avoid redundant work</item>
      <item>Choose appropriate algorithms/data structures</item>
      <item>Defer computation until needed</item>
    </computation>
    <scalability>
      <item>Target 1k–10k MAU operation</item>
      <item>Prefer horizontal scaling</item>
      <item>Cache appropriately</item>
      <item>Monitor resource usage and cost</item>
    </scalability>
  </performance>

  <execution_rules>
    <restrictions>
      <item>Do not execute tasks outside given context</item>
      <item>Do not write code without reading context/implementation</item>
      <item>Avoid over-engineering</item>
    </restrictions>
    <requirements>
      <item>Read context markdown and scenario first</item>
      <item>Read actual implementation before changes</item>
      <item>Deliver complete, functional implementations</item>
      <item>Keep code effective, efficient, and junior-friendly</item>
      <item>Use reverse engineering when debugging</item>
    </requirements>
  </execution_rules>

  <specialized_agents>
    <agent name="build-analyzer">Build diagnostics and performance analysis</agent>
    <agent name="frontend-architect">React components and state management</agent>
    <agent name="supabase-db-handler">Database operations and migrations</agent>
    <agent name="fastapi-backend-architect">API design and backend services</agent>
    <agent name="software-architect-coordinator">Multi-agent orchestration</agent>
    <agent name="debug-coordinator">Multi-system debugging</agent>
    <agent name="integration-tester">Feature testing and validation</agent>
    <agent name="code-quality-reviewer">Code quality assessment</agent>
    <agent name="code-finalizer">Delivery documentation</agent>
    <agent name="general-purpose">Research and complex workflows</agent>
  </specialized_agents>

  <!-- ========================================== -->
  <!-- CODE-INDEX MCP TOOLS DOCUMENTATION -->
  <!-- ========================================== -->

  <code_index_mcp_tools>
    <description>
      The code-index MCP server provides powerful project indexing, search, and analysis capabilities. It maintains both shallow and deep indexes for efficient code discovery and comprehensive symbol analysis.
    </description>

    <project_management>
      <category>🏗️ Project Management</category>
      <tools>
        <tool name="set_project_path">
          <purpose>Initialize indexing for a project directory</purpose>
          <usage>Call with the project path to automatically index the codebase and create searchable cache</usage>
          <example>set_project_path("/Users/dev/my-react-app")</example>
        </tool>

        <tool name="refresh_index">
          <purpose>Rebuild the shallow file index after file changes</purpose>
          <usage>Use when files are added, removed, or moved to update the searchable cache</usage>
          <example>refresh_index() after large-scale operations</example>
        </tool>

        <tool name="build_deep_index">
          <purpose>Generate the full symbol index used by deep analysis</purpose>
          <usage>Run when you need symbol-level data; the default shallow index powers quick file discovery</usage>
          <example>build_deep_index() before using get_file_summary</example>
        </tool>

        <tool name="get_settings_info">
          <purpose>View current project configuration and status</purpose>
          <usage>Check current indexing state, project path, and configuration</usage>
          <example>get_settings_info() to verify project setup</example>
        </tool>
      </tools>
    </project_management>

    <search_discovery>
      <category>🔍 Search & Discovery</category>
      <tools>
        <tool name="search_code_advanced">
          <purpose>Smart search with regex, fuzzy matching, and file filtering</purpose>
          <usage>Find code patterns, function calls, or language-specific constructs</usage>
          <examples>
            <example>Search for all function calls matching "get.*Data" using regex - finds: getData(), getUserData(), getFormData()</example>
            <example>Fuzzy function search for 'authUser' - matches: authenticateUser, authUserToken, userAuthCheck</example>
            <example>Language-specific search for "API_ENDPOINT" only in Python files using file_pattern: "*.py"</example>
          </examples>
        </tool>

        <tool name="find_files">
          <purpose>Locate files using glob patterns</purpose>
          <usage>Find files by pattern (e.g., **/*.py, src/components/**/*.tsx)</usage>
          <examples>
            <example>find_files("src/components/**/*.tsx") - Find all TypeScript component files</example>
            <example>find_files("*.py") - Find all Python files</example>
            <example>find_files("README.md") - Find all README files</example>
          </examples>
        </tool>

        <tool name="get_file_summary">
          <purpose>Analyze file structure, functions, imports, and complexity</purpose>
          <usage>Get comprehensive analysis of file contents including functions, classes, and metrics</usage>
          <requirement>Requires deep index to be built first</requirement>
          <example>get_file_summary("src/api/userService.ts") to analyze API service structure</example>
        </tool>
      </tools>
    </search_discovery>

    <monitoring_auto_refresh>
      <category>🔄 Monitoring & Auto-refresh</category>
      <tools>
        <tool name="get_file_watcher_status">
          <purpose>Check file watcher status and configuration</purpose>
          <usage>Monitor file watcher service status and statistics</usage>
          <example>get_file_watcher_status() to check if auto-refresh is active</example>
        </tool>

        <tool name="configure_file_watcher">
          <purpose>Enable/disable auto-refresh and configure settings</purpose>
          <usage>Set up automatic index updates when files change</usage>
          <parameters>
            <param name="enabled">Boolean to enable/disable file watcher</param>
            <param name="debounce_seconds">Delay before processing file changes</param>
            <param name="additional_exclude_patterns">Patterns to exclude from watching</param>
          </parameters>
          <example>configure_file_watcher(true, 2, ["node_modules/**"]) to enable with 2-second debounce</example>
        </tool>
      </tools>
    </monitoring_auto_refresh>

    <system_maintenance>
      <category>🛠️ System & Maintenance</category>
      <tools>
        <tool name="create_temp_directory">
          <purpose>Set up storage directory for index data</purpose>
          <usage>Initialize temporary storage for index files and cache</usage>
          <example>create_temp_directory() if storage location needs initialization</example>
        </tool>

        <tool name="check_temp_directory">
          <purpose>Verify index storage location and permissions</purpose>
          <usage>Confirm storage directory exists and is accessible</usage>
          <example>check_temp_directory() to troubleshoot storage issues</example>
        </tool>

        <tool name="clear_settings">
          <purpose>Reset all cached data and configurations</purpose>
          <usage>Clear all indexes and settings when needed for fresh start</usage>
          <warning>This will delete all cached index data</warning>
          <example>clear_settings() to reset to clean state</example>
        </tool>

        <tool name="refresh_search_tools">
          <purpose>Re-detect available search tools (ugrep, ripgrep, etc.)</purpose>
          <usage>Update tool detection after installing new search utilities</usage>
          <example>refresh_search_tools() after installing ripgrep or ugrep</example>
        </tool>
      </tools>
    </system_maintenance>

    <usage_workflows>
      <category>📋 Usage Examples & Workflows</category>

      <workflow name="Quick Start">
        <steps>
          <step>Initialize project: set_project_path("/path/to/project")</step>
          <step>Explore structure: find_files("src/**/*.tsx")</step>
          <step>Analyze key files: get_file_summary("src/components/App.tsx")</step>
        </steps>
        <note>Run build_deep_index first if get_file_summary returns needs_deep_index response</note>
      </workflow>

      <workflow name="Code Pattern Analysis">
        <steps>
          <step>Search patterns: search_code_advanced("useState.*\[\]")</step>
          <step>Filter by language: search_code_advanced("interface.*", file_pattern: "*.ts")</step>
          <step>Fuzzy matching: search_code_advanced("handleButton", fuzzy: true)</step>
        </steps>
      </workflow>

      <workflow name="Project Maintenance">
        <steps>
          <step>After adding components: refresh_index()</step>
          <step>Enable auto-refresh: configure_file_watcher(true, 3, [])</step>
          <step>Monitor status: get_file_watcher_status()</step>
        </steps>
      </workflow>

      <workflow name="Deep Analysis Setup">
        <steps>
          <step>Set project path: set_project_path("/project/path")</step>
          <step>Build deep index: build_deep_index()</step>
          <step>Analyze files: get_file_summary("src/complex/module.ts")</step>
        </steps>
        <performance_note>Deep index provides symbol-level data but uses more memory</performance_note>
      </workflow>
    </usage_workflows>

    <best_practices>
      <practice name="Index Management">
        <recommendation>Use refresh_index() after large file operations rather than relying solely on file watcher</recommendation>
        <reason>Ensures complete index consistency after bulk changes</reason>
      </practice>

      <practice name="Search Optimization">
        <recommendation>Use specific file patterns with search_code_advanced for better performance</recommendation>
        <example>file_pattern: "*.tsx" is faster than searching all files</example>
      </practice>

      <practice name="Deep Index Usage">
        <recommendation>Build deep index only when symbol-level analysis is needed</recommendation>
        <reason>Deep index uses more memory but provides comprehensive symbol data</reason>
      </practice>

      <practice name="File Watcher Configuration">
        <recommendation>Set appropriate debounce time (2-5 seconds) to balance responsiveness and performance</recommendation>
        <example>configure_file_watcher(true, 3, ["node_modules/**", "dist/**"])</example>
      </practice>
    </best_practices>

    <integration_notes>
      <note>Works seamlessly with existing MCP tools like context7 for documentation lookup</note>
      <note>Can be used alongside specialized agents for comprehensive code analysis</note>
      <note>Indexes are maintained locally for fast, offline-capable searching</note>
      <note>Supports multiple search engines (ugrep, ripgrep, ag, grep) with automatic selection</note>
    </integration_notes>

    <active_usage_guidelines>
      <title>DAILY ACTIVE USAGE REQUIREMENTS</title>

      <mandatory_practices>
        <practice name="PRE-WORK INDEX CHECK">
          <requirement>ALWAYS verify index status before starting development work</requirement>
          <workflow>
            <step>Run get_settings_info() to verify project is indexed</step>
            <step>Run refresh_index() after large file operations</step>
            <step>Build deep_index() when symbol analysis is needed</step>
          </workflow>
          <rationale>Ensures search results are accurate and complete for current codebase state</rationale>
        </practice>

        <practice name="CONTINUOUS SEARCH LEVERAGE">
          <requirement>ACTIVELY use code-index for all code discovery and analysis tasks</requirement>
          <examples>
            <example>Use find_files() instead of manual file system navigation</example>
            <example>Use search_code_advanced() for pattern finding across codebase</example>
            <example>Use get_file_summary() for understanding file structure before modifications</example>
            <example>Use fuzzy search for finding related functionality</example>
          </examples>
          <rationale>Dramatically improves development efficiency and code understanding</rationale>
        </practice>

        <practice name="POST-CHANGE INDEX UPDATES">
          <requirement>ALWAYS refresh indexes after significant code changes</requirectrine>
          <triggers>
            <trigger>After adding/removing multiple files</trigger>
            <trigger>After major refactoring operations</trigger>
            <trigger>After switching git branches</trigger>
            <trigger>Before complex analysis tasks</trigger>
          </triggers>
          <workflow>
            <step>Run refresh_index() for file system changes</step>
            <step>Run build_deep_index() for symbol-level changes</step>
          </workflow>
          <rationale>Maintains search accuracy and prevents stale results</rationale>
        </practice>
      </mandatory_practices>

      <integration_workflow>
        <title>INTEGRATED DEVELOPMENT WORKFLOW</title>

        <phase name="PROJECT KICKOFF">
          <steps>
            <step>set_project_path() - Initialize project indexing</step>
            <step>build_deep_index() - Enable comprehensive analysis</step>
            <step>configure_file_watcher() - Enable automatic updates</step>
            <step>get_settings_info() - Verify setup completeness</step>
          </steps>
        </phase>

        <phase name="DAILY DEVELOPMENT">
          <steps>
            <step>get_settings_info() - Verify index status (morning check)</step>
            <step>find_files() - Locate relevant files for current task</step>
            <step>search_code_advanced() - Find related patterns and implementations</step>
            <step>get_file_summary() - Understand file structure before changes</step>
          </steps>
        </phase>

        <phase name="CODE ANALYSIS">
          <steps>
            <step>search_code_advanced() - Find all occurrences of patterns</step>
            <step>find_files() - Locate all files matching criteria</step>
            <step>get_file_summary() - Analyze key files in detail</step>
            <step>build_deep_index() - Ensure symbol data is current</step>
          </steps>
        </phase>

        <phase name="MAINTENANCE">
          <steps>
            <step>refresh_index() - Update after file operations</step>
            <step>get_file_watcher_status() - Check auto-refresh health</step>
            <step>configure_file_watcher() - Adjust settings as needed</step>
            <step>clear_settings() - Reset when index corruption suspected</step>
          </steps>
        </phase>
      </integration_workflow>

      <performance_optimization>
        <title>PERFORMANCE & EFFICIENCY</title>

        <best_practices>
          <practice name="SEARCH OPTIMIZATION">
            <tips>
              <tip>Use specific file patterns for faster searches</tip>
              <tip>Combine search terms to reduce result noise</tip>
              <tip>Use fuzzy search for approximate matching</tip>
              <tip>Leverage regex for complex pattern searches</tip>
            </tips>
          </practice>

          <practice name="INDEX MANAGEMENT">
            <tips>
              <tip>Build deep index only when symbol analysis is needed</tip>
              <tip>Use file watcher exclusions to avoid unnecessary rebuilds</tip>
              <tip>Set appropriate debounce times (2-5 seconds)</tip>
              <tip>Refresh index manually after large batch operations</tip>
            </tips>
          </practice>
        </best_practices>
      </performance_optimization>

      <troubleshooting>
        <title>COMMON ISSUES & SOLUTIONS</title>

        <issues>
          <issue name="STALE SEARCH RESULTS">
            <symptoms>Search returns outdated or missing results</symptoms>
            <solution>
              <step>Run refresh_index() to update file index</step>
              <step>Run build_deep_index() for symbol-level updates</step>
              <step>Check file watcher status with get_file_watcher_status()</step>
            </solution>
          </issue>

          <issue name="SLOW SEARCH PERFORMANCE">
            <symptoms>Search operations taking excessive time</symptoms>
            <solution>
              <step>Use more specific file patterns</step>
              <step>Reduce search scope with better patterns</step>
              <step>Check available search tools with refresh_search_tools()</step>
            </solution>
          </issue>

          <issue name="MISSING SYMBOL DATA">
            <symptoms>get_file_summary() returns incomplete results</symptoms>
            <solution>
              <step>Ensure deep index is built with build_deep_index()</step>
              <step>Check if file is supported for symbol extraction</step>
              <step>Verify project path is correctly set</step>
            </solution>
          </issue>
        </issues>
      </troubleshooting>

      <monitoring>
        <title>INDEX HEALTH MONITORING</title>

        <daily_checks>
          <check name="INDEX STATUS">Run get_settings_info() to verify indexing health</check>
          <check name="FILE WATCHER">Run get_file_watcher_status() to ensure auto-refresh is working</check>
          <check name="SEARCH PERFORMANCE">Monitor search response times for degradation</check>
          <check name="RESULT ACCURACY">Spot-check search results against known files</check>
        </daily_checks>

        <weekly_maintenance>
          <task name="DEEP INDEX REBUILD">Run build_deep_index() for comprehensive symbol updates</task>
          <task name="CONFIGURATION REVIEW">Review file watcher exclusions and settings</task>
          <task name="PERFORMANCE AUDIT">Check search performance and optimize patterns</task>
          <task name="STORAGE CLEANUP">Check temp directory usage and clean if needed</task>
        </weekly_maintenance>
      </monitoring>
    </active_usage_guidelines>
  </code_index_mcp_tools>

  <!-- ========================================== -->
  <!-- AGENT DOCUMENTATION & LOGGING STANDARDS -->
  <!-- ========================================== -->
  
  <agent_documentation_standards>
    <unified_comment_requirements>
      <requirement>All agents must enforce consistent comment formats across all codebases</requirement>
      <requirement>Comments must explain the "why" not the "what" for complex decisions</requirement>
      <requirement>Business logic must be documented with context and trade-offs</requirement>
      <requirement>All TODO/FIXME/HACK/XXX comments must include developer names and ticket numbers</requirement>
      <requirement>File headers must include purpose, author, date, and license information</requirement>
    </unified_comment_requirements>

    <technology_specific_formats>
      <python_standards>
        <docstrings>PEP 257 Google-style format for all functions, classes, and modules</docstrings>
        <content>Args, Returns, Raises sections with clear parameter descriptions</content>
        <business_rules>Document algorithm choices and business logic reasoning</business_rules>
      </python_standards>

      <javascript_typescript_standards>
        <jsdoc>/** */ blocks for all components, interfaces, and utility functions</jsdoc>
        <components>@param/@returns for all component props and return values</components>
        <interfaces>Document all interface properties with /** */ comments</interfaces>
        <hooks>Explain custom hook usage and dependencies</hooks>
      </javascript_typescript_standards>

      <postgresql_supabase_standards>
        <sql_comments>-- for single-line, /* */ for multi-line SQL comments</sql_comments>
        <migrations>Document schema changes with business impact and rollback procedures</migrations>
        <complex_queries>Explain query optimization decisions and indexing strategies</complex_queries>
        <supabase_config>Document all Supabase-specific settings and cloud configurations</supabase_config>
      </postgresql_supabase_standards>

      <testing_standards>
        <test_cases>describe/it blocks explaining scenarios and expected behavior</test_cases>
        <e2e_tests>Step-by-step comments for complex user journey tests</e2e_tests>
        <performance_tests>Document performance thresholds and optimization validation</performance_tests>
        <accessibility_tests>Comment on WCAG compliance requirements being tested</accessibility_tests>
      </testing_standards>
    </technology_specific_formats>

    <unified_logging_requirements>
      <structured_logging>All agents must implement structured logging with proper severity levels</structured_logging>
      <error_context>Errors must be logged with full context, user actions, and system state</error_context>
      <performance_monitoring>Slow operations (>500ms) must be logged with performance metrics</performance_monitoring>
      <security_logging>Authentication, authorization, and sensitive operations must be tracked</security_logging>
      <change_tracking>All modifications must be logged with business impact analysis</change_tracking>
    </unified_logging_requirements>

    <agent_logging_responsibilities>
      <backend_architect>
        <python_logging>Use logging module with getLogger(__name__) and exc_info=True</python_logging>
        <api_logging>Log API requests, response times, and error rates</api_logging>
        <database_logging>Track query performance and connection usage</database_logging>
        <security_logging>Monitor authentication attempts and authorization failures</security_logging>
      </backend_architect>

      <frontend_architect>
        <component_logging>Log component render times and user interactions</component_logging>
        <error_boundary_logging>Capture and log client-side errors with context</error_boundary_logging>
        <performance_logging>Track bundle sizes, API response times, and user experience metrics</performance_logging>
        <development_logging>Use console.log() for development debugging with structured context</development_logging>
      </frontend_architect>

      <database_handler>
        <postgresql_logging>Configure log_min_duration_statement=500ms, log_connections=on</postgresql_logging>
        <migration_logging>Document all schema changes with rollback procedures</migration_logging>
        <query_optimization>Log slow queries and execution plan analysis</query_optimization>
        <supabase_monitoring>Track cloud database performance and usage metrics</supabase_monitoring>
      </database_handler>

      <integration_tester>
        <test_execution_logging>Log test runs, passes, failures with detailed context</test_execution_logging>
        <performance_test_logging>Document performance thresholds and actual results</performance_test_logging>
        <security_test_logging>Track vulnerability testing and mitigation validation</security_test_logging>
        <coverage_logging>Monitor test coverage and identify gaps</coverage_logging>
      </integration_tester>

      <code_quality_reviewer>
        <review_logging>Document all code review findings and quality issues</review_logging>
        <standards_compliance>Track adherence to comment and logging standards</standards_compliance>
        <technical_debt>Log identified technical debt and improvement recommendations</technical_debt>
        <metrics_tracking>Monitor code quality metrics over time</metrics_tracking>
      </code_quality_reviewer>
    </agent_logging_responsibilities>

    <no_error_masking_enforcement>
      <universal_rules>
        <rule>NEVER ignore compilation errors, linting violations, or test failures</rule>
        <rule>NEVER use workarounds that bypass underlying problems</rule>
        <rule>NEVER create documentation that masks known issues</rule>
        <rule>ALWAYS address root causes with proper solutions</rule>
        <rule>ALWAYS implement comprehensive error handling and logging</rule>
        <rule>ALWAYS document limitations, bugs, and areas for improvement</rule>
      </universal_rules>

      <agent_accountability>
        <reviewer_responsibility>code-quality-reviewer must enforce documentation standards</reviewer_responsibility>
        <coordinator_responsibility>software-architect-coordinator ensures cross-team consistency</coordinator_responsibility>
        <finalizer_responsibility>code-finalizer verifies all documentation before delivery</finalizer_responsibility>
        <individual_responsibility>All agents must follow standards in their domain</individual_responsibility>
      </agent_accountability>
    </no_error_masking_enforcement>
  </agent_documentation_standards>
</claude_configuration>