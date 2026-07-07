import { ArrowRight } from "lucide-react";

const PRODUCTS = [
  {
    name: "SLA",
    description:
      "Protection for when an AI service or model you depend on fails or goes down.",
    dark: false,
  },
  {
    name: "Liability",
    description:
      "Protection for when an automated decision or AI output harms a client or third party.",
    dark: true,
  },
];

export default function Products() {
  return (
    <section id="products" className="bg-white px-6 py-20 md:py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-heading text-3xl font-medium tracking-tight text-marino md:text-5xl">
          We insure next-generation services.
        </h2>
        <div className="mt-14 grid items-start gap-6 md:grid-cols-2">
          {PRODUCTS.map((product, index) => (
            <div
              key={product.name}
              className={`rounded-[2rem] p-10 ${
                product.dark ? "bg-marino md:mt-12" : "bg-bruma"
              }`}
            >
              <p
                className={`font-heading text-sm font-medium ${
                  product.dark ? "text-white/40" : "text-marino/40"
                }`}
              >
                0{index + 1}
              </p>
              <h3
                className={`mt-6 font-heading text-3xl font-medium tracking-tight md:text-4xl ${
                  product.dark ? "text-white" : "text-marino"
                }`}
              >
                {product.name}
              </h3>
              <p
                className={`mt-4 leading-relaxed ${
                  product.dark ? "text-white/70" : "text-marino/80"
                }`}
              >
                {product.description}
              </p>
              <span
                aria-hidden="true"
                className={`mt-10 flex h-11 w-11 items-center justify-center rounded-full ${
                  product.dark ? "bg-white/10 text-white" : "bg-white text-marino"
                }`}
              >
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
