"use client";

import { useMemo, useState } from "react";
import { Field, Input } from "@/components/ui/input";
import { fetchProvincias, fetchLocalidades, fetchCalles, type GeorefItem } from "@/lib/georef";
import { Autocomplete } from "./autocomplete-input";

export function AddressSelector({
  initialProvince,
  initialCity,
  initialAddress,
}: {
  initialProvince?: string;
  initialCity?: string;
  initialAddress?: string;
}) {
  const [province, setProvince] = useState<GeorefItem | null>(initialProvince ? { id: "", nombre: initialProvince } : null);
  const [city, setCity] = useState<GeorefItem | null>(initialCity ? { id: "", nombre: initialCity } : null);
  const [street, setStreet] = useState<GeorefItem | null>(null);
  const [streetNumber, setStreetNumber] = useState("");

  const fetchLocalidadesFn = useMemo(() => (province ? fetchLocalidades(province.nombre) : null), [province]);
  const fetchCallesFn = useMemo(() => (province && city ? fetchCalles(province.nombre, city.nombre) : null), [province, city]);

  const addressValue = street ? `${street.nombre} ${streetNumber}`.trim() : (initialAddress ?? "");

  function selectProvince(item: GeorefItem) {
    setProvince(item);
    setCity(null);
    setStreet(null);
    setStreetNumber("");
  }

  function clearProvince() {
    setProvince(null);
    setCity(null);
    setStreet(null);
    setStreetNumber("");
  }

  function selectCity(item: GeorefItem) {
    setCity(item);
    setStreet(null);
    setStreetNumber("");
  }

  function clearCity() {
    setCity(null);
    setStreet(null);
    setStreetNumber("");
  }

  return (
    <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-card p-3">
      <input type="hidden" name="province" value={province?.nombre ?? ""} />
      <input type="hidden" name="city" value={city?.nombre ?? ""} />
      <input type="hidden" name="address" value={addressValue} />

      <div className="flex flex-col sm:flex-row justify-between gap-3 items-stretch">
        <Field className="w-full" label="Provincia" htmlFor="sf-province" required>
          <Autocomplete<GeorefItem>
            inputId="sf-province"
            selected={province}
            onSelect={selectProvince}
            onClear={clearProvince}
            fetchFn={fetchProvincias}
            getId={(item) => item.id}
            displayKeys={["nombre"]}
            placeholder="Santa Fe"
            showPicture={false}
          />
        </Field>

        <Field className="w-full" label="Localidad" htmlFor="sf-city" required>
          {province ? (
            <Autocomplete<GeorefItem>
              key={province.nombre}
              inputId="sf-city"
              selected={city}
              onSelect={selectCity}
              onClear={clearCity}
              fetchFn={fetchLocalidadesFn!}
              getId={(item) => item.id}
              displayKeys={["nombre"]}
              placeholder="Rosario"
              showPicture={false}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-sm text-muted">Elegí una provincia primero.</p>
          )}
        </Field>
      </div>

      <div className="min-w-0">
        <Field label="Calle" htmlFor="sf-street" required>
          {city ? (
            <Autocomplete<GeorefItem>
              key={`${province?.nombre}-${city.nombre}`}
              inputId="sf-street"
              selected={street}
              onSelect={setStreet}
              onClear={() => setStreet(null)}
              fetchFn={fetchCallesFn!}
              getId={(item) => item.id}
              displayKeys={["nombre"]}
              placeholder="Urquiza"
              showPicture={false}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3.5 py-2.5 text-sm text-muted">Elegí una localidad primero.</p>
          )}
        </Field>
      </div>

      {street && (
        <div className="sm:col-span-3">
          <Field label="Altura" htmlFor="sf-street-number">
            <Input
              id="sf-street-number"
              value={streetNumber}
              onChange={(e) => setStreetNumber(e.target.value)}
              placeholder="742"
              inputMode="numeric"
            />
          </Field>
        </div>
      )}

      {!street && initialAddress && (
        <p className="text-xs text-muted sm:col-span-3">
          Dirección actual: <span className="text-primary">{initialAddress}</span>. Buscá y seleccioná una calle para reemplazarla.
        </p>
      )}
    </div>
  );
}
