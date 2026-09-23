type PublicEnvironment = {
  apiUrl: string;
};

export function getPublicEnvironment(): PublicEnvironment {
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  };
}
