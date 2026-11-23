"use client";

import { AMERICAS_COUNTRIES, STORE_COUNTRY, STORE_COUNTRY_NAME } from "@/domain/shipping";

/**
 * Selector de país del checkout. Al cambiarlo se recarga el resumen con ese país (y sin los datos del país anterior),
 * porque los campos de dirección y la tarifa dependen del país.
 */
export function CountrySelect({ value, action, className }: { value: string; action: string; className: string }) {
  return (
    <select
      name="pais"
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        window.location.assign(next === STORE_COUNTRY ? action : `${action}?pais=${encodeURIComponent(next)}`);
      }}
      className={className}
    >
      {value === "" && <option value="" disabled>Elegí tu país</option>}
      <option value={STORE_COUNTRY}>{STORE_COUNTRY_NAME}</option>
      <optgroup label="América (solo merch)">
        {AMERICAS_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
      </optgroup>
    </select>
  );
}
