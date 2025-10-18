export const buildOrgRoute = (orgId: string, path: string = '/dashboard') => {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`
  return `/${orgId}${sanitizedPath}`.replace(/\/+$/, '')
}

export const buildDivisionRoute = (orgId: string, divisionId: string, path: string = '/dashboard') => {
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`
  return `/${orgId}/${divisionId}${sanitizedPath}`.replace(/\/+$/, '')
}
