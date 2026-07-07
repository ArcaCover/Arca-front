export default function Hero() {
  return (
    <section id="top" className="bg-white px-6 pb-24 pt-48 text-center md:pt-60">
      <h1 className="mx-auto max-w-3xl font-heading text-4xl font-bold leading-tight text-marino md:text-6xl">
        Insurance for businesses that rely on AI.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-marino/80">
        When your work depends on AI, new risks come with it — from model
        failures to liability for automated decisions. Arca covers them:
        simple, reliable, and fast.
      </p>
      <a
        href="#get-a-quote"
        className="mt-10 inline-block rounded-full bg-oro px-10 py-4 text-lg font-bold text-marino transition-colors hover:bg-oro-oscuro"
      >
        Get a quote
      </a>
    </section>
  );
}
