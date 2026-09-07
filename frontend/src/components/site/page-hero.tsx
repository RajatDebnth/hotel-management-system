export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="hero-texture flex min-h-[430px] items-end bg-[#17352d] pb-16 pt-32 text-white"><div className="site-container"><p className="eyebrow text-[#e4c98f]">{eyebrow}</p><h1 className="mt-4 max-w-4xl font-heading text-5xl leading-[0.98] tracking-tight sm:text-7xl">{title}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{description}</p></div></section>;
}
