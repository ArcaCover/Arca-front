const PRODUCTS = [
  {
    name: "SLA",
    description:
      "Protection for when an AI service or model you depend on fails or goes down.",
  },
  {
    name: "Liability",
    description:
      "Protection for when an automated decision or AI output harms a client or third party.",
  },
];

export default function Products() {
  return (
    <section id="products" className="bg-bruma px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-heading text-3xl font-bold text-marino md:text-4xl">
          We insure next-generation services.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PRODUCTS.map((product) => (
            <div key={product.name} className="rounded-2xl bg-white p-8 shadow-sm">
              <h3 className="font-heading text-2xl font-bold text-marino">
                {product.name}
              </h3>
              <p className="mt-3 leading-relaxed text-marino/80">
                {product.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
