"use client";

import { PointsCard } from "@/components/points-card";
import { BusinessList } from "@/components/business-list";
import { CitySelect } from "@/components/city-select";
import { CustomerHeader } from "@/components/customer-header";
import { PageTour } from "@/components/page-tour";
import { getBusinesses, getPoints } from "@/lib/demo/actions";
import { useAsyncData } from "@/lib/demo/hooks";
import { useSelectedCity } from "@/lib/preferences/city-store";

export default function MainHomePage() {
  const selectedCity = useSelectedCity();
  const points = useAsyncData(() => getPoints(), []);
  const businesses = useAsyncData(() => getBusinesses({ size: 3, city: selectedCity, page: 0 }), [selectedCity]);

  const businessItems = businesses.result?.ok ? businesses.result.data.items : [];

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-107.5 overflow-hidden bg-background sm:border-x sm:border-border">
      <CustomerHeader />

      <PointsCard
        points={points.result?.ok ? points.result.data : null}
        error={points.result !== null && !points.result.ok}
        onRetry={points.retry}
      />

      <section className="relative px-5 mb-3.75 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold tracking-[0.08em] text-foreground/75 uppercase">Explorá cerca tuyo</span>
          <h2 className="m-0 truncate text-[21px] tracking-[-0.8px] text-foreground">{selectedCity ? `Ahora en ${selectedCity}` : "Descubrí negocios"}</h2>
        </div>
        <CitySelect />
      </section>

      <BusinessList
        businesses={businessItems}
        loading={businesses.result === null}
        error={businesses.result !== null && !businesses.result.ok}
        emptyMessage={selectedCity ? "No encontramos negocios en esta ciudad todavía." : "Todavía no hay negocios cargados."}
      />

      <PageTour
        id="customer-home"
        ready={points.result !== null && businesses.result !== null}
        steps={[
          {
            target: "points-card",
            title: "Tus puntos, negocio por negocio",
            body: (
              <>
                <p>En este apartado tus clientes ven cuántos puntos tienen en cada negocio. Deslizá en el teléfono (o usá las flechas la computadora) para ver tu saldo en cada programa al que estás afiliado.</p>
                <p>
                  Fijate que <strong>&apos;Tu negocio&apos;</strong> aparece dos veces: cada sucursal tiene su propio programa (puntos en Centro, granos en Palermo), así
                  que los saldos no se mezclan. En el panel administrativo podes aprender qué son los programas de puntos.
                </p>
              </>
            ),
          },
          {
            target: "rewards-carousel",
            title: "Un vistazo a las recompensas",
            body: <p>Cada negocio muestra sus recompensas en un carrusel. En el celular las podés arrastrar con el dedo, como en la app real.</p>,
          },
          {
            target: "business-join",
            title: "Sumarse a un negocio",
            body: (
              <p>
                Con <strong>Unirse</strong> te afiliás al programa de un local. Si ya sos parte, te lleva directo a su espacio con tus puntos, recompensas e
                historial.
              </p>
            ),
          },
          {
            target: "city-select",
            title: "Filtrá por ciudad",
            body: <p>Elegí una zona para ver solo los negocios cercanos. Hay uno de ejemplo en Rosario al que todavía no te sumaste.</p>,
          },
          {
            target: "bottom-nav",
            title: "Moverte por la app",
            body: <p>Desde acá vas a tus canjes, tu perfil y, en <strong>Más</strong>, al explorador de negocios y otras configuraciones.</p>,
          },
        ]}
      />
    </main>
  );
}
