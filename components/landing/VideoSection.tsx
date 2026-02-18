/**
 * "See How It Works" section — Google Drive video embed + 3-step walkthrough.
 */
export default function VideoSection() {
  const steps = [
    {
      number: 1,
      title: 'Create your free account',
      description: 'Sign up with Google or email in seconds — no credit card needed.',
    },
    {
      number: 2,
      title: 'Browse or post a ride',
      description: 'Find a carpool heading your way, or post your own for others to join.',
    },
    {
      number: 3,
      title: 'Carpool to the mountains',
      description: 'Split gas, meet fellow mountain lovers, and enjoy the ride.',
    },
  ];

  return (
    <section className="bg-slate-50 py-20">
      <div className="max-w-6xl mx-auto px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold font-display tracking-tight text-slate-900">
            See How It Works
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Watch the walkthrough, then hit the slopes.
          </p>
        </div>

        {/* Video embed */}
        <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl">
          <iframe
            src="https://drive.google.com/file/d/1nU3MNDIvSYrcFMCS8rYSHRGox1TuUmXY/preview"
            title="How to use RideShareTahoe"
            className="w-full h-full"
            allow="autoplay"
            allowFullScreen
          />
        </div>

        {/* 3-step how it works */}
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center text-white font-black text-lg shadow-lg">
                {step.number}
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900">{step.title}</h3>
              <p className="text-base text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
