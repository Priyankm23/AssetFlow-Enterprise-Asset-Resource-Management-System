import { useState, useEffect, useCallback } from 'react';

export type Route =
  | 'login'
  | 'dashboard'
  | 'org-setup'
  | 'assets'
  | 'asset-detail'
  | 'allocation'
  | 'booking'
  | 'maintenance'
  | 'audit'
  | 'reports'
  | 'notifications';

export interface RouteState {
  route: Route;
  params: Record<string, string>;
}

function parseHash(): RouteState {
  const hash = window.location.hash.slice(1) || '/dashboard';
  const [path, queryString] = hash.split('?');
  const segments = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  if (queryString) {
    for (const pair of queryString.split('&')) {
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  }

  const first = segments[0] ?? 'dashboard';
  const routeMap: Record<string, Route> = {
    dashboard: 'dashboard',
    'org-setup': 'org-setup',
    assets: 'assets',
    'asset-detail': 'asset-detail',
    allocation: 'allocation',
    booking: 'booking',
    maintenance: 'maintenance',
    audit: 'audit',
    reports: 'reports',
    notifications: 'notifications',
    login: 'login',
  };

  const route = routeMap[first] ?? 'dashboard';
  if (segments[1]) params.id = segments[1];

  return { route, params };
}

export function useRouter() {
  const [state, setState] = useState<RouteState>(parseHash);

  useEffect(() => {
    const handler = () => setState(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((route: Route, params?: Record<string, string>) => {
    let path = '/' + route;
    if (params?.id) path += '/' + params.id;
    const query = params
      ? Object.entries(params)
          .filter(([k]) => k !== 'id')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&')
      : '';
    window.location.hash = path + (query ? '?' + query : '');
  }, []);

  return { ...state, navigate };
}
