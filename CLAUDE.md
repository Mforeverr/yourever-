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