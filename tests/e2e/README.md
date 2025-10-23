# Workspace Components E2E Tests

This directory contains comprehensive end-to-end tests for the workspace components using Playwright.

## Test Coverage

### Main Test Suites

1. **Workspace Components (`workspace.spec.ts`)**
   - Authentication flow with test credentials
   - Workspace hub navigation and functionality
   - Organization selection and division navigation
   - Division switching functionality
   - Complete scope switching flow
   - Real API data verification
   - Error handling and resilience

2. **Divisions Page (`divisions-page.spec.ts`)**
   - Divisions page loading and structure
   - Division search and filtering
   - Division card interaction
   - Breadcrumb navigation
   - API integration verification
   - Error handling for invalid URLs
   - Responsive design testing

## Test Configuration

### Environment Setup

- **Base URL**: `http://localhost:3000` (configurable via `TEST_BASE_URL`)
- **Test User**: `alyssa@yourever.com` / `DemoPass123!`
- **Timeout**: 60 seconds (configurable via `TEST_TIMEOUT`)

### Browser Support

- Chromium (Chrome)
- Firefox
- WebKit (Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Running Tests

### Prerequisites

1. Ensure the application is running:
   ```bash
   npm run dev
   ```

2. Install Playwright browsers (first time only):
   ```bash
   npm run playwright:install
   ```

### Test Commands

```bash
# Run all tests on Chromium (default)
npm run test:e2e

# Run tests with visible browser (useful for debugging)
npm run test:e2e:headed

# Run tests on all browsers
npm run test:e2e:all

# Run tests on specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run tests in debug mode
npm run test:e2e:debug

# Direct Playwright commands
npm run playwright:test
npm run playwright:report
```

### Environment Variables

```bash
# Override base URL
TEST_BASE_URL=http://localhost:3001 npm run test:e2e

# Run in headed mode
HEADED=true npm run test:e2e

# Specify browser
BROWSER=firefox npm run test:e2e

# Adjust timeout
TEST_TIMEOUT=120000 npm run test:e2e
```

## Test Structure

### Files

- `playwright.config.ts` - Main Playwright configuration
- `global-setup.ts` - Global test setup and environment verification
- `test-utils.ts` - Shared test utilities and helper functions
- `workspace.spec.ts` - Main workspace functionality tests
- `divisions-page.spec.ts` - Divisions page specific tests
- `run-tests.sh` - Test runner script with environment checks
- `README.md` - This documentation

### Test Utilities

The `test-utils.ts` file provides:

- Authentication helpers
- Navigation helpers
- API monitoring
- Error monitoring
- Screenshot utilities
- Responsive testing helpers
- Test report generation

## Test Features

### Authentication Testing

- Automatic login with test credentials
- Session management verification
- Protected route testing

### Navigation Testing

- Workspace hub to divisions page navigation
- Division switching workflows
- Breadcrumb navigation testing
- Invalid URL handling

### API Integration Testing

- Real API call verification
- Mock data detection
- Network request monitoring
- Response validation

### UI Testing

- Component interaction testing
- Search and filter functionality
- Responsive design verification
- Loading state testing

### Error Handling

- Invalid URL navigation
- Network error simulation
- Error message display verification
- Graceful degradation testing

## Test Reports

### Artifacts Generated

- **Screenshots**: Automatic screenshots on failures and key test steps
- **Videos**: Video recordings of test runs (on failure)
- **Traces**: Detailed execution traces for debugging
- **HTML Report**: Interactive test results report

### Report Locations

- Test artifacts: `./test-results/`
- HTML report: `./playwright-report/index.html`

## Debugging

### Debug Mode

Run tests with debug mode for step-by-step execution:

```bash
npm run test:e2e:debug
```

### Headed Mode

Run tests with visible browser:

```bash
npm run test:e2e:headed
```

### VS Code Integration

Install the Playwright extension for VS Code for enhanced debugging:

1. Install Playwright Extension
2. Use the Test Explorer to run individual tests
3. Set breakpoints directly in test files

## Best Practices

### Test Writing

1. **Use descriptive test names** that clearly explain what is being tested
2. **Follow the Arrange-Act-Assert pattern** for test structure
3. **Use page object patterns** for complex interactions
4. **Add proper assertions** with meaningful error messages
5. **Clean up test state** in `afterEach` hooks

### Test Data

1. **Use consistent test data** across all tests
2. **Avoid hard-coded values** that might change
3. **Use environment-specific configurations** for different environments

### Error Handling

1. **Monitor console errors** and warnings during tests
2. **Take screenshots** at key points for debugging
3. **Log detailed information** for troubleshooting
4. **Use proper timeout values** for different operations

## Troubleshooting

### Common Issues

1. **Application not running**: Ensure `npm run dev` is active
2. **Authentication failures**: Verify test user credentials are valid
3. **Network timeouts**: Check network connectivity and API availability
4. **Browser installation**: Run `npm run playwright:install`

### Debug Steps

1. Check application is accessible at the configured URL
2. Verify test user can log in manually
3. Run tests in headed mode to see what's happening
4. Check console logs for errors
5. Review generated screenshots and traces

## Contributing

### Adding New Tests

1. Create new test files in the `tests/e2e/` directory
2. Follow the existing test patterns and utilities
3. Add appropriate test descriptions and documentation
4. Update this README file for new test coverage

### Test Maintenance

1. Regularly update test selectors to match UI changes
2. Keep test data and configurations up to date
3. Monitor test results and fix flaky tests
4. Update documentation as test coverage evolves

## Test Metrics

### Coverage Areas

- ✅ Authentication flow
- ✅ Workspace hub functionality
- ✅ Organization navigation
- ✅ Division switching
- ✅ Scope management
- ✅ API integration
- ✅ Error handling
- ✅ Responsive design
- ✅ Real data verification

### Success Criteria

- All tests should pass consistently
- No console errors or warnings during tests
- Proper error handling for edge cases
- Real API data usage (no mocks)
- Responsive design across viewport sizes