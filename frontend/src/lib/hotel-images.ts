import { getPublicEnvironment } from "@/lib/env";

const photographs = [
  {
    file: "deluxe-king.png",
    alt: "Deluxe King room with a king bed, window seating, and natural light",
    caption: "Deluxe King · Calm, light-filled comfort",
  },
  {
    file: "garden-twin.png",
    alt: "Garden Twin room with two beds overlooking a leafy garden",
    caption: "Garden Twin · A green and quiet outlook",
  },
  {
    file: "family-suite.png",
    alt: "Family Suite with connected king and twin sleeping areas",
    caption: "Family Suite · Space to stay together",
  },
] as const;

export function getHotelPhotographs() {
  const apiUrl = getPublicEnvironment().apiUrl.replace(/\/$/, "");
  return photographs.map((photograph) => ({
    ...photograph,
    src: `${apiUrl}/media/demo/${photograph.file}`,
  }));
}
