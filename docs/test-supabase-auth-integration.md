# Comprehensive Test Plan: Supabase Auth Integration with Org/Division Scoping

## Overview

This document outlines comprehensive testing scenarios for validating the Supabase authentication integration with organization and division scoping functionality. The plan covers login flows, JWT token enrichment, scope snapshots, API endpoint protection, Edge Functions, and database migrations.

## Test Environment Setup

### Prerequisites
- Supabase project configured with custom JWT claims
- FastAPI backend running with auth dependencies
- Next.js frontend with Supabase client integration
- Test user account: `alyssa@yourever.com` / `DemoPass123!`
- Database migrations applied (`20251018_create_user_scope_snapshots.sql`)
- Environment variables configured:
  - `SUPABASE_JWT_SECRET`
  - `SUPABASE_JWT_AUDIENCE` (optional)
  - Supabase URL and anon key

### Test Data Preparation
- Test user with multiple organization memberships
- Test organizations with divisions
- Cross-tenant test data for isolation validation

## Test Scenarios

### 1. Login Flow Authentication Tests

#### 1.1 Valid Credentials Login
**Objective**: Verify successful authentication with valid credentials

**Test Steps**:
1. Navigate to login page
2. Enter email: `alyssa@yourever.com`
3. Enter password: `DemoPass123!`
4. Click sign in button
5. Verify successful authentication
6. Check session persistence
7. Validate user profile loading

**Expected Results**:
- Successful authentication response
- JWT access token received
- User redirected to workspace
- Session persisted in localStorage
- User profile data loaded correctly
- Onboarding status retrieved

**Playwright Implementation**:
```typescript
test('valid credentials login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid=email-input]', 'alyssa@yourever.com');
  await page.fill('[data-testid=password-input]', 'DemoPass123!');
  await page.click('[data-testid=sign-in-button]');

  // Verify authentication success
  await expect(page).toHaveURL(/workspace/);
  await expect(page.locator('[data-testid=user-avatar]')).toBeVisible();

  // Check session persistence
  const localStorage = await page.evaluate(() => window.localStorage);
  expect(localStorage).toHaveProperty('supabase.auth.token');
});
```

#### 1.2 Invalid Credentials Login
**Objective**: Verify proper error handling for invalid credentials

**Test Steps**:
1. Navigate to login page
2. Enter invalid email/password
3. Attempt sign in
4. Verify error message display
5. Ensure no session created

#### 1.3 Token Refresh Flow
**Objective**: Verify automatic token refresh functionality

**Test Steps**:
1. Login with valid credentials
2. Wait for token to approach expiration
3. Make API call
4. Verify token refresh occurs
5. Confirm session remains valid

### 2. JWT Token Enrichment Validation Tests

#### 2.1 Scope Claims Structure Validation
**Objective**: Verify JWT contains proper org/division scope claims

**Test Steps**:
1. Complete authentication flow
2. Extract JWT access token
3. Decode and validate token payload
4. Verify required scope claims present:
   - `org_id` or `orgId`
   - `division_id` or `divisionId`
   - `org_ids` or `orgIds`
   - `division_ids` or `divisionIds`

**Expected Results**:
```json
{
  "sub": "user-uuid",
  "email": "alyssa@yourever.com",
  "app_metadata": {
    "yourever_scope": {
      "org_id": "org-uuid",
      "division_id": "div-uuid",
      "org_ids": ["org-uuid-1", "org-uuid-2"],
      "division_ids": {
        "org-uuid-1": ["div-uuid-1", "div-uuid-2"],
        "org-uuid-2": ["div-uuid-3"]
      }
    }
  }
}
```

**Playwright Implementation**:
```typescript
test('JWT token enrichment validation', async ({ page }) => {
  // Complete login
  await completeLogin(page);

  // Extract and validate token
  const token = await page.evaluate(() => {
    const authData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    return authData.access_token;
  });

  const payload = decodeJWT(token);
  expect(payload).toHaveProperty('app_metadata.yourever_scope');
  expect(payload.app_metadata.yourever_scope).toHaveProperty('org_id');
  expect(payload.app_metadata.yourever_scope).toHaveProperty('division_id');
});
```

#### 2.2 Multiple Organization Support
**Objective**: Verify JWT includes all accessible organizations

**Test Steps**:
1. Use user with multiple org memberships
2. Authenticate and extract JWT
3. Verify `org_ids` array contains all orgs
4. Verify `division_ids` mapping is correct

#### 2.3 Claim Location Flexibility
**Objective**: Verify claims work from different payload locations

**Test Steps**:
1. Test claims in root payload
2. Test claims in `app_metadata.yourever`
3. Test claims in `yourever_scope`
4. Verify backend normalizes all formats

### 3. User Scope Snapshots Tests

#### 3.1 Snapshot Creation on Login
**Objective**: Verify scope snapshot is created/updated on authentication

**Test Steps**:
1. Authenticate with test user
2. Check database for user_scope_snapshots record
3. Verify snapshot contains correct scope data
4. Validate updated_at timestamp

**Database Verification**:
```sql
SELECT user_id, active_org_id, active_division_id, claims, updated_at
FROM public.user_scope_snapshots
WHERE user_id = 'test-user-uuid';
```

#### 3.2 Snapshot Updates on Scope Change
**Objective**: Verify snapshot updates when user changes active org/division

**Test Steps**:
1. Authenticate and verify initial snapshot
2. Change active organization in UI
3. Verify database snapshot updated
4. Confirm new org_id reflected in snapshot

#### 3.3 Claims JSON Serialization
**Objective**: Verify scope claims are properly serialized to JSON

**Test Steps**:
1. Use user with complex scope hierarchy
2. Trigger snapshot creation
3. Verify JSON structure in database
4. Test deserialization integrity

### 4. API Endpoint Scoping Tests

#### 4.1 Protected Endpoint Access
**Objective**: Verify API endpoints enforce scope requirements

**Test Steps**:
1. Make unauthenticated request to protected endpoint
2. Verify 401 response
3. Make authenticated request with valid token
4. Verify 200 response with scoped data

**Test Implementation**:
```typescript
test('API endpoint scoping', async ({ request }) => {
  // Test unauthenticated access
  const unauthResponse = await request.get('/api/users/me');
  expect(unauthResponse.status()).toBe(401);

  // Test authenticated access
  const authResponse = await request.get('/api/users/me', {
    headers: { 'Authorization': `Bearer ${validToken}` }
  });
  expect(authResponse.status()).toBe(200);

  const userData = await authResponse.json();
  expect(userData).toHaveProperty('organizations');
});
```

#### 4.2 Cross-Tenant Access Prevention
**Objective**: Verify users cannot access other organizations' data

**Test Steps**:
1. Authenticate as user from Org A
2. Attempt to access Org B resources
3. Verify 403 Forbidden response
4. Check audit logs for access denial

#### 4.3 Token Validation Edge Cases
**Objective**: Test various token validation scenarios

**Test Steps**:
1. Test expired token
2. Test malformed token
3. Test token with invalid signature
4. Test token without required claims
5. Verify appropriate error responses

### 5. Edge Function Behavior Tests

#### 5.1 JWT Claim Enrichment Hook
**Objective**: Verify Supabase Edge Function properly enriches JWT claims

**Test Steps**:
1. Trigger user sign-in
2. Intercept JWT before and after enrichment
3. Verify org/division claims added
4. Test claim updates on membership changes

#### 5.2 Membership Change Propagation
**Objective**: Verify claim updates when user memberships change

**Test Steps**:
1. User authenticates with initial memberships
2. Admin adds/removes user from organization
3. User re-authenticates
4. Verify updated claims in new JWT

#### 5.3 Edge Function Error Handling
**Objective**: Verify Edge Function handles errors gracefully

**Test Steps**:
1. Test claim enrichment with database errors
2. Test timeout scenarios
3. Verify fallback behavior
4. Check error logging

### 6. Database Migration Tests

#### 6.1 Migration Application
**Objective**: Verify database migration applies correctly

**Test Steps**:
1. Start with clean database
2. Apply migration `20251018_create_user_scope_snapshots.sql`
3. Verify table created with correct schema
4. Check indexes created properly

**Schema Verification**:
```sql
-- Table structure
\d public.user_scope_snapshots

-- Index verification
SELECT indexname FROM pg_indexes
WHERE tablename = 'user_scope_snapshots';

-- Constraints verification
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'public.user_scope_snapshots'::regclass;
```

#### 6.2 Migration Rollback
**Objective**: Verify migration can be safely rolled back

**Test Steps**:
1. Apply migration
2. Insert test data
3. Rollback migration
4. Verify clean state or safe migration data preservation

#### 6.3 Data Integrity Validation
**Objective**: Verify migration maintains data integrity

**Test Steps**:
1. Migrate database with existing user data
2. Verify user scope snapshots created for existing users
3. Test foreign key constraints
4. Validate data types and constraints

### 7. End-to-End Integration Tests

#### 7.1 Complete Authentication Flow
**Objective**: Test complete authentication and authorization flow

**Test Steps**:
1. User visits application
2. Completes sign-in process
3. JWT enriched with scope claims
4. Scope snapshot created
5. User can access scoped resources
6. Token refresh works properly
7. Logout clears session

#### 7.2 Multi-Organization Workspace
**Objective**: Test user experience with multiple organizations

**Test Steps**:
1. User with multiple org memberships authenticates
2. Verify organization switcher functionality
3. Test division switching within organizations
4. Confirm data isolation between orgs
5. Verify scope snapshots update correctly

#### 7.3 Error Recovery Scenarios
**Objective**: Test application behavior under error conditions

**Test Steps**:
1. Network connectivity issues during auth
2. Supabase service unavailability
3. Database connection failures
4. Invalid security configurations
5. Verify graceful degradation and user feedback

## Test Execution Plan

### Phase 1: Core Authentication (Days 1-2)
- Login flow tests
- JWT token validation
- Basic scope snapshot functionality

### Phase 2: Scope Enforcement (Days 3-4)
- API endpoint scoping
- Cross-tenant isolation
- Token validation edge cases

### Phase 3: Advanced Features (Days 5-6)
- Edge Function behavior
- Membership change propagation
- Multi-organization scenarios

### Phase 4: Integration & Performance (Days 7-8)
- End-to-end flows
- Performance testing
- Security validation

### Phase 5: Database & Migration (Days 9-10)
- Migration testing
- Data integrity validation
- Backup/restore scenarios

## Test Automation Implementation

### Playwright Test Suite Structure
```
tests/
├── auth/
│   ├── login-flow.spec.ts
│   ├── token-enrichment.spec.ts
│   └── session-management.spec.ts
├── api/
│   ├── endpoint-scoping.spec.ts
│   ├── cross-tenant.spec.ts
│   └── token-validation.spec.ts
├── database/
│   ├── migrations.spec.ts
│   ├── scope-snapshots.spec.ts
│   └── data-integrity.spec.ts
└── integration/
    ├── end-to-end.spec.ts
    ├── multi-org.spec.ts
    └── error-recovery.spec.ts
```

### Test Configuration
```typescript
// playwright.config.ts
export default {
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3005',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  webServer: {
    command: 'npm run dev',
    port: 3005,
  },
};
```

### Test Data Management
```typescript
// tests/fixtures/auth.ts
export const testUsers = {
  alyssa: {
    email: 'alyssa@yourever.com',
    password: 'DemoPass123!',
    expectedOrgs: ['org-1', 'org-2'],
    expectedDivisions: {
      'org-1': ['div-1', 'div-2'],
      'org-2': ['div-3']
    }
  }
};
```

## Success Criteria

### Functional Requirements
- ✅ All authentication flows work correctly
- ✅ JWT tokens properly enriched with scope claims
- ✅ User scope snapshots created and updated accurately
- ✅ API endpoints enforce scope restrictions
- ✅ Cross-tenant access prevented
- ✅ Edge Functions behave as expected

### Security Requirements
- ✅ No unauthorized data access
- ✅ Proper token validation and refresh
- ✅ Secure handling of sensitive claims
- ✅ Audit trail for access attempts

### Performance Requirements
- ✅ Authentication completes within 2 seconds
- ✅ Token refresh occurs seamlessly
- ✅ Database queries optimized with proper indexes
- ✅ API response times under 500ms for scoped requests

### Reliability Requirements
- ✅ 99.9% authentication success rate
- ✅ Graceful error handling and recovery
- ✅ Consistent behavior across browsers
- ✅ Proper session management and cleanup

## Monitoring and Reporting

### Test Execution Metrics
- Test pass/fail rates
- Execution time trends
- Coverage metrics
- Defect density

### Automated Reporting
- Daily test execution summaries
- Failure analysis and categorization
- Performance regression detection
- Security vulnerability scanning

### Continuous Integration
- Automated test execution on PRs
- Deployment pipeline integration
- Environmental promotion testing
- Production smoke tests

## Risk Mitigation

### Technical Risks
- **Token validation failures**: Implement comprehensive error handling
- **Database migration issues**: Create rollback procedures
- **Edge Function failures**: Add retry mechanisms and fallbacks
- **Performance degradation**: Implement caching and optimization

### Operational Risks
- **Environment inconsistencies**: Use infrastructure-as-code
- **Test data management**: Implement automated cleanup
- **Credential management**: Secure secrets handling
- **Service dependencies**: Mock external services appropriately

## Conclusion

This comprehensive test plan ensures the Supabase auth integration with org/division scoping is thoroughly validated across all components. The combination of automated Playwright tests, database validations, and security testing provides confidence in the implementation's reliability, security, and performance.

Regular execution of these tests will help maintain the integrity of the authentication system as it evolves and prevent regressions that could compromise tenant isolation or user experience.