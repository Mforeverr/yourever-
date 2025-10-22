export const buildOrgRoute = (orgId: string, path: string = '/dashboard') => {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`
  return `/${orgId}${sanitizedPath}`.replace(/\/+$/, '')
}

export const buildDivisionRoute = (orgId: string, divisionId: string, path: string = '/dashboard') => {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`
  return `/${orgId}/${divisionId}${sanitizedPath}`.replace(/\/+$/, '')
}

export const buildProjectRoute = (
  orgId: string,
  divisionId: string,
  projectId: string,
  view: string = 'board',
) => {
  const sanitizedView = view ? (view.startsWith('/') ? view : `/${view}`) : ''
  return `/${orgId}/${divisionId}/workspace/projects/${projectId}${sanitizedView}`.replace(/\/+$/, '')
}
