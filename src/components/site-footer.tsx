export function SiteFooter() {
  return (
    <footer className="mt-auto w-full border-t border-border/60 bg-background/80 backdrop-blur-md">
      <div className="flex w-full items-center justify-center px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <p className="max-w-4xl text-center text-xs leading-relaxed text-muted-foreground">
          Předběžný návrh — finální dimenzování ověřit dle výrobce a projektových
          standardů. Model U·A·LMTD s kalibrací L40 a dvoufaktorovou námrazou
          (η_time × η_T × f_RH). Limity: T_out &lt; −20 °C (CS) = NO-GO · O₂ &lt;
          −15 °C advisory · impingement dle EIGA Doc 13 / 20 m/s inerty.
        </p>
      </div>
    </footer>
  );
}
