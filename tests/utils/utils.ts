import { base64url } from 'jose';

export function createFakeJwt(tenantUuid: string, userCognitoUuid: string): string {
  const header = base64url.encode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64url.encode(JSON.stringify({ tenantUuid, sub: userCognitoUuid }));
  return `${header}.${payload}.`;
}
