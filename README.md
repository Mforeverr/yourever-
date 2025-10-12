## 🔐 Feature Flags

- `projects.detail` is enabled by default for non-production builds so you can explore the project detail experience locally.
- Set `NEXT_PUBLIC_FEATURE_PROJECT_DETAIL` in your environment (for example inside `.env.local`) to explicitly enable/disable the route in any deployment.
- The API-backed integration stays guarded by `NEXT_PUBLIC_FEATURE_PROJECT_DETAIL_API`. Leave this off until the FastAPI endpoints are online.
- Need a quick toggle while testing? Flip flags in the browser console:
  ```js
  localStorage.setItem('yourever:feature:projects.detail', 'true')
  localStorage.setItem('yourever:feature:projects.detail.api', 'true')
  ```
