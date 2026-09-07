import { Bath, BedDouble, Coffee, Dumbbell, Utensils, Wifi } from "lucide-react";

export const rooms = [
  {
    slug: "garden-king",
    name: "Garden King",
    eyebrow: "Quiet retreat",
    description: "A serene king room framed by courtyard greenery and soft morning light.",
    price: 185,
    guests: 2,
    size: "34 m²",
    tone: "from-[#56715c] via-[#879b7f] to-[#d6c5a5]",
    features: ["King bed", "Garden view", "Rain shower", "Breakfast included"],
  },
  {
    slug: "terrace-suite",
    name: "Terrace Suite",
    eyebrow: "Our signature stay",
    description: "An expansive suite with a private terrace made for unhurried evenings.",
    price: 295,
    guests: 3,
    size: "52 m²",
    tone: "from-[#263b35] via-[#607269] to-[#c7a66b]",
    features: ["Private terrace", "Separate lounge", "Deep soaking tub", "Evening turndown"],
  },
  {
    slug: "courtyard-twin",
    name: "Courtyard Twin",
    eyebrow: "Easy comfort",
    description: "A bright, flexible room overlooking the heart of our historic house.",
    price: 155,
    guests: 2,
    size: "30 m²",
    tone: "from-[#8b6c52] via-[#b29574] to-[#e8d8bc]",
    features: ["Twin beds", "Courtyard view", "Walk-in shower", "Reading nook"],
  },
] as const;

export const facilities = [
  { name: "Breakfast table", description: "Seasonal plates, local coffee, and slow mornings.", icon: Coffee },
  { name: "House restaurant", description: "Ingredient-led dining with a neighbourhood spirit.", icon: Utensils },
  { name: "Wellness room", description: "A calm space for movement, massage, and restoration.", icon: Dumbbell },
  { name: "Thoughtful essentials", description: "Fast Wi-Fi, luxurious linens, and considered details.", icon: Wifi },
] as const;

export const roomIcons = { BedDouble, Bath };
