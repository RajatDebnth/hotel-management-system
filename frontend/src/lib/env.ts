type PublicEnvironment = {
  apiUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
};

function requiredPublicValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  return value;
}

export function getPublicEnvironment(): PublicEnvironment {
  return {
    apiUrl: requiredPublicValue(
      "NEXT_PUBLIC_API_URL",
      process.env.NEXT_PUBLIC_API_URL,
    ),
    supabaseUrl: requiredPublicValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabasePublishableKey: requiredPublicValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

