import { PinIcon } from './Icons'

const SERVE_AREAS = ['North Lamar', 'The Domain', 'North Burnet', 'Allandale', 'Crestview', 'Hyde Park']

export default function VisitUs() {
  return (
    <section className="border-t border-black/10 bg-[#f6f5f1] px-5 py-14 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] items-start gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#3c6e35]">Visit Us</p>
          <h2 className="mt-2 text-2xl font-bold text-[#1a1a17]">
            Double Apple Smoke &amp; Vape &mdash; Austin
          </h2>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-[#4a4a43]">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#3c6e35]" />
            11220 N Lamar Blvd B202, Austin, TX 78753
          </p>
          <p className="mt-3 text-sm text-[#4a4a43]">Open Daily, 8:00 AM &ndash; 12:00 AM</p>
          <p className="mt-1 text-sm text-[#4a4a43]">
            <a href="tel:+15123518012" className="text-[#3c6e35] hover:underline">
              (512) 351-8012
            </a>{' '}
            &bull;{' '}
            <a href="mailto:doubleappless@gmail.com" className="text-[#3c6e35] hover:underline">
              doubleappless@gmail.com
            </a>
          </p>

          <p className="mt-6 text-sm font-bold text-[#1a1a17]">Areas we serve</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SERVE_AREAS.map((area) => (
              <span
                key={area}
                className="rounded-full border border-[#3c6e35]/40 px-3 py-1 text-xs font-medium text-[#3c6e35]"
              >
                {area}
              </span>
            ))}
          </div>
        </div>

        <iframe
          title="Double Apple Smoke & Vape location map"
          className="h-[320px] w-full rounded-xl border border-black/10"
          loading="lazy"
          src="https://www.google.com/maps?q=Double+Apple+Smoke+Shop,+11220+N+Lamar+Blvd+B202,+Austin,+TX+78753&output=embed"
        />
      </div>
    </section>
  )
}
