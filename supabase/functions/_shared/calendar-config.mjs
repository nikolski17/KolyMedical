function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolveCalendarOAuthConfig(env) {
  return {
    clientId: nonEmpty(env.GOOGLE_OAUTH_CLIENT_ID) ?? nonEmpty(env.GOOGLE_CLIENT_ID),
    clientSecret: nonEmpty(env.GOOGLE_OAUTH_CLIENT_SECRET) ?? nonEmpty(env.GOOGLE_CLIENT_SECRET),
    redirectUri: nonEmpty(env.GOOGLE_CALENDAR_REDIRECT_URI),
  };
}

